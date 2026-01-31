"""
Employer Management Routes - API endpoints for Super Admin and Reseller to manage employers
Handles CRUD operations, password reset, and account suspension for employer accounts
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import uuid
import logging
import secrets
import string

from email_service import email_service

logger = logging.getLogger(__name__)

employer_management_router = APIRouter(prefix="/api/employer-management", tags=["Employer Management"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class EmployerCreate(BaseModel):
    email: EmailStr
    full_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None  # If not provided, generate random password


class EmployerUpdate(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None  # active, suspended


class PasswordReset(BaseModel):
    new_password: Optional[str] = None  # If not provided, generate random password


class SubscriptionUpdate(BaseModel):
    plan_id: str  # employer-starter, employer-professional, employer-enterprise
    status: str  # active, trial, expired
    duration_days: int = 30


def get_employer_management_routes(db, get_current_user):
    """Factory function to create employer management routes with dependencies"""
    
    def generate_password(length=12):
        """Generate a random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    async def check_admin_or_reseller(current_user):
        """Check if user is super admin or reseller"""
        if current_user.role not in ['super_admin', 'reseller', 'reseller_admin']:
            raise HTTPException(status_code=403, detail="Admin or Reseller access required")
        return current_user
    
    async def get_accessible_employers_query(current_user):
        """Get query filter based on user role"""
        query = {"role": "employer"}
        if current_user.role in ['reseller', 'reseller_admin']:
            # Resellers can only manage employers they created
            query["created_by_reseller"] = current_user.id
        return query
    
    @employer_management_router.get("/employers")
    async def list_employers(
        search: Optional[str] = None,
        status: Optional[str] = None,
        subscription_status: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        current_user = Depends(get_current_user)
    ):
        """List all employers (filtered by reseller if applicable)"""
        await check_admin_or_reseller(current_user)
        
        try:
            query = await get_accessible_employers_query(current_user)
            
            # Apply filters
            if search:
                query["$or"] = [
                    {"email": {"$regex": search, "$options": "i"}},
                    {"full_name": {"$regex": search, "$options": "i"}},
                    {"company_name": {"$regex": search, "$options": "i"}}
                ]
            
            if status:
                query["status"] = status
            
            if subscription_status:
                query["employer_subscription.status"] = subscription_status
            
            # Get total count
            total = await db.users.count_documents(query)
            
            # Get paginated results
            skip = (page - 1) * limit
            employers = await db.users.find(
                query,
                {
                    "_id": 0,
                    "password": 0  # Exclude password
                }
            ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
            
            # Calculate stats
            all_employers = await db.users.find(
                await get_accessible_employers_query(current_user),
                {"_id": 0, "status": 1, "employer_subscription.status": 1}
            ).to_list(length=10000)
            
            stats = {
                "total": len(all_employers),
                "active": sum(1 for e in all_employers if e.get("status") == "active"),
                "suspended": sum(1 for e in all_employers if e.get("status") == "suspended"),
                "trial": sum(1 for e in all_employers if e.get("employer_subscription", {}).get("status") == "trial"),
                "subscribed": sum(1 for e in all_employers if e.get("employer_subscription", {}).get("status") == "active")
            }
            
            return {
                "success": True,
                "employers": employers,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit,
                "stats": stats
            }
            
        except Exception as e:
            logger.error(f"Error listing employers: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_management_router.get("/employers/{employer_id}")
    async def get_employer(
        employer_id: str,
        current_user = Depends(get_current_user)
    ):
        """Get a specific employer's details"""
        await check_admin_or_reseller(current_user)
        
        try:
            query = {"id": employer_id, "role": "employer"}
            if current_user.role in ['reseller', 'reseller_admin']:
                query["created_by_reseller"] = current_user.id
            
            employer = await db.users.find_one(query, {"_id": 0, "password": 0})
            
            if not employer:
                raise HTTPException(status_code=404, detail="Employer not found")
            
            # Get additional stats
            jobs_count = await db.remote_jobs.count_documents({"employer_id": employer_id})
            contracts_count = await db.contracts.count_documents({"employer_id": employer_id})
            active_contracts = await db.contracts.count_documents({"employer_id": employer_id, "status": "active"})
            
            employer["stats"] = {
                "jobs_posted": jobs_count,
                "total_contracts": contracts_count,
                "active_contracts": active_contracts
            }
            
            return {"success": True, "employer": employer}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting employer: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_management_router.post("/employers")
    async def create_employer(
        data: EmployerCreate,
        current_user = Depends(get_current_user)
    ):
        """Create a new employer account"""
        await check_admin_or_reseller(current_user)
        
        try:
            # Check if email already exists
            existing = await db.users.find_one({"email": data.email.lower()})
            if existing:
                raise HTTPException(status_code=400, detail="Email already registered")
            
            # Generate password if not provided
            password = data.password or generate_password()
            hashed_password = pwd_context.hash(password)
            
            # Set up trial subscription
            trial_end = datetime.now(timezone.utc) + timedelta(days=2)
            
            employer = {
                "id": str(uuid.uuid4()),
                "email": data.email.lower(),
                "password": hashed_password,
                "full_name": data.full_name,
                "company_name": data.company_name,
                "phone": data.phone,
                "role": "employer",
                "status": "active",
                "employer_subscription": {
                    "plan_id": "employer-starter",
                    "status": "trial",
                    "trial_start": datetime.now(timezone.utc).isoformat(),
                    "expires_at": trial_end.isoformat(),
                    "jobs_posted": 0,
                    "jobs_limit": 3
                },
                "created_by": current_user.id,
                "created_by_reseller": current_user.id if current_user.role in ["reseller", "reseller_admin"] else None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.users.insert_one(employer)
            
            # Remove sensitive data for response
            employer.pop("password", None)
            employer.pop("_id", None)
            
            logger.info(f"Employer created by {current_user.email}: {data.email}")
            
            # Send welcome email to the new employer
            try:
                import os
                frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
                login_url = f"{frontend_url}/login" if frontend_url else "https://upshift.works/login"
                
                await email_service.send_employer_welcome_email(
                    to_email=data.email.lower(),
                    employer_name=data.full_name,
                    password=password,
                    login_url=login_url,
                    created_by=current_user.full_name or current_user.email
                )
                logger.info(f"Welcome email sent to new employer: {data.email}")
            except Exception as email_err:
                logger.warning(f"Failed to send welcome email: {email_err}")
            
            return {
                "success": True,
                "message": "Employer created successfully",
                "employer": employer,
                "generated_password": password if not data.password else None
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating employer: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_management_router.put("/employers/{employer_id}")
    async def update_employer(
        employer_id: str,
        data: EmployerUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update an employer's details"""
        await check_admin_or_reseller(current_user)
        
        try:
            query = {"id": employer_id, "role": "employer"}
            if current_user.role in ['reseller', 'reseller_admin']:
                query["created_by_reseller"] = current_user.id
            
            employer = await db.users.find_one(query)
            if not employer:
                raise HTTPException(status_code=404, detail="Employer not found")
            
            # Build update
            update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
            
            if data.full_name is not None:
                update_data["full_name"] = data.full_name
            if data.company_name is not None:
                update_data["company_name"] = data.company_name
            if data.phone is not None:
                update_data["phone"] = data.phone
            if data.status is not None:
                if data.status not in ["active", "suspended"]:
                    raise HTTPException(status_code=400, detail="Invalid status")
                update_data["status"] = data.status
            
            await db.users.update_one({"id": employer_id}, {"$set": update_data})
            
            logger.info(f"Employer {employer_id} updated by {current_user.email}")
            
            return {"success": True, "message": "Employer updated successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating employer: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_management_router.post("/employers/{employer_id}/reset-password")
    async def reset_employer_password(
        employer_id: str,
        data: PasswordReset,
        current_user = Depends(get_current_user)
    ):
        """Reset an employer's password"""
        await check_admin_or_reseller(current_user)
        
        try:
            query = {"id": employer_id, "role": "employer"}
            if current_user.role in ['reseller', 'reseller_admin']:
                query["created_by_reseller"] = current_user.id
            
            employer = await db.users.find_one(query)
            if not employer:
                raise HTTPException(status_code=404, detail="Employer not found")
            
            # Generate new password if not provided
            new_password = data.new_password or generate_password()
            hashed_password = pwd_context.hash(new_password)
            
            await db.users.update_one(
                {"id": employer_id},
                {"$set": {
                    "password": hashed_password,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Password reset for employer {employer_id} by {current_user.email}")
            
            # Send password reset email
            try:
                await email_service.send_employer_password_reset_email(
                    to_email=employer.get("email"),
                    employer_name=employer.get("full_name") or "Employer",
                    new_password=new_password,
                    reset_by=current_user.full_name or current_user.email
                )
                logger.info(f"Password reset email sent to employer: {employer.get('email')}")
            except Exception as email_err:
                logger.warning(f"Failed to send password reset email: {email_err}")
            
            return {
                "success": True,
                "message": "Password reset successfully",
                "new_password": new_password if not data.new_password else None
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error resetting password: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_management_router.post("/employers/{employer_id}/suspend")
    async def suspend_employer(
        employer_id: str,
        current_user = Depends(get_current_user)
    ):
        """Suspend an employer account"""
        await check_admin_or_reseller(current_user)
        
        try:
            query = {"id": employer_id, "role": "employer"}
            if current_user.role in ['reseller', 'reseller_admin']:
                query["created_by_reseller"] = current_user.id
            
            employer = await db.users.find_one(query)
            if not employer:
                raise HTTPException(status_code=404, detail="Employer not found")
            
            if employer.get("status") == "suspended":
                raise HTTPException(status_code=400, detail="Employer is already suspended")
            
            await db.users.update_one(
                {"id": employer_id},
                {"$set": {
                    "status": "suspended",
                    "suspended_at": datetime.now(timezone.utc).isoformat(),
                    "suspended_by": current_user.id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Also pause all their active jobs
            await db.remote_jobs.update_many(
                {"employer_id": employer_id, "status": "active"},
                {"$set": {"status": "paused", "paused_reason": "employer_suspended"}}
            )
            
            logger.info(f"Employer {employer_id} suspended by {current_user.email}")
            
            # Send suspension email
            try:
                await email_service.send_employer_suspended_email(
                    to_email=employer.get("email"),
                    employer_name=employer.get("full_name") or "Employer",
                    suspended_by=current_user.full_name or current_user.email
                )
                logger.info(f"Suspension email sent to employer: {employer.get('email')}")
            except Exception as email_err:
                logger.warning(f"Failed to send suspension email: {email_err}")
            
            return {"success": True, "message": "Employer suspended successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error suspending employer: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_management_router.post("/employers/{employer_id}/reactivate")
    async def reactivate_employer(
        employer_id: str,
        current_user = Depends(get_current_user)
    ):
        """Reactivate a suspended employer account"""
        await check_admin_or_reseller(current_user)
        
        try:
            query = {"id": employer_id, "role": "employer"}
            if current_user.role in ['reseller', 'reseller_admin']:
                query["created_by_reseller"] = current_user.id
            
            employer = await db.users.find_one(query)
            if not employer:
                raise HTTPException(status_code=404, detail="Employer not found")
            
            if employer.get("status") != "suspended":
                raise HTTPException(status_code=400, detail="Employer is not suspended")
            
            await db.users.update_one(
                {"id": employer_id},
                {
                    "$set": {
                        "status": "active",
                        "reactivated_at": datetime.now(timezone.utc).isoformat(),
                        "reactivated_by": current_user.id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$unset": {
                        "suspended_at": "",
                        "suspended_by": ""
                    }
                }
            )
            
            logger.info(f"Employer {employer_id} reactivated by {current_user.email}")
            
            # Send reactivation email
            try:
                await email_service.send_employer_reactivated_email(
                    to_email=employer.get("email"),
                    employer_name=employer.get("full_name") or "Employer",
                    reactivated_by=current_user.full_name or current_user.email
                )
                logger.info(f"Reactivation email sent to employer: {employer.get('email')}")
            except Exception as email_err:
                logger.warning(f"Failed to send reactivation email: {email_err}")
            
            return {"success": True, "message": "Employer reactivated successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error reactivating employer: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_management_router.put("/employers/{employer_id}/subscription")
    async def update_employer_subscription(
        employer_id: str,
        data: SubscriptionUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update an employer's subscription (admin override)"""
        await check_admin_or_reseller(current_user)
        
        try:
            query = {"id": employer_id, "role": "employer"}
            if current_user.role in ['reseller', 'reseller_admin']:
                query["created_by_reseller"] = current_user.id
            
            employer = await db.users.find_one(query)
            if not employer:
                raise HTTPException(status_code=404, detail="Employer not found")
            
            # Define plan limits
            plan_limits = {
                "employer-starter": 3,
                "employer-professional": 10,
                "employer-enterprise": 999
            }
            
            if data.plan_id not in plan_limits:
                raise HTTPException(status_code=400, detail="Invalid plan ID")
            
            if data.status not in ["active", "trial", "expired"]:
                raise HTTPException(status_code=400, detail="Invalid status")
            
            expires_at = datetime.now(timezone.utc) + timedelta(days=data.duration_days)
            
            subscription_update = {
                "employer_subscription.plan_id": data.plan_id,
                "employer_subscription.status": data.status,
                "employer_subscription.jobs_limit": plan_limits[data.plan_id],
                "employer_subscription.expires_at": expires_at.isoformat(),
                "employer_subscription.updated_by": current_user.id,
                "employer_subscription.updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.users.update_one({"id": employer_id}, {"$set": subscription_update})
            
            logger.info(f"Subscription updated for employer {employer_id} by {current_user.email}")
            
            # Send subscription update email
            try:
                plan_names = {
                    "employer-starter": "Starter",
                    "employer-professional": "Professional",
                    "employer-enterprise": "Enterprise"
                }
                await email_service.send_employer_subscription_update_email(
                    to_email=employer.get("email"),
                    employer_name=employer.get("full_name") or "Employer",
                    plan_name=plan_names.get(data.plan_id, data.plan_id),
                    status=data.status,
                    expires_at=expires_at.strftime("%B %d, %Y"),
                    jobs_limit=plan_limits[data.plan_id]
                )
                logger.info(f"Subscription update email sent to employer: {employer.get('email')}")
            except Exception as email_err:
                logger.warning(f"Failed to send subscription update email: {email_err}")
            
            return {
                "success": True,
                "message": f"Subscription updated to {data.plan_id} ({data.status})",
                "expires_at": expires_at.isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating subscription: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_management_router.delete("/employers/{employer_id}")
    async def delete_employer(
        employer_id: str,
        current_user = Depends(get_current_user)
    ):
        """Delete an employer account (super admin only)"""
        if current_user.role != 'super_admin':
            raise HTTPException(status_code=403, detail="Super Admin access required")
        
        try:
            employer = await db.users.find_one({"id": employer_id, "role": "employer"})
            if not employer:
                raise HTTPException(status_code=404, detail="Employer not found")
            
            # Delete user
            await db.users.delete_one({"id": employer_id})
            
            # Optionally: Also delete their jobs, contracts, etc.
            # await db.remote_jobs.delete_many({"employer_id": employer_id})
            # await db.contracts.delete_many({"employer_id": employer_id})
            
            logger.info(f"Employer {employer_id} deleted by {current_user.email}")
            
            return {"success": True, "message": "Employer deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting employer: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return employer_management_router
