"""
Talent Pool Routes - API endpoints for the Talent Pool / CV Directory feature
Allows customers to opt-in to be visible to recruiters, and recruiters to browse and request contact
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import logging

logger = logging.getLogger(__name__)

talent_pool_router = APIRouter(prefix="/api/talent-pool", tags=["Talent Pool"])

# Pydantic Models
class TalentPoolProfile(BaseModel):
    full_name: str
    job_title: str
    industry: str
    experience_level: str  # entry, mid, senior, executive
    location: str
    skills: List[str]
    summary: str
    cv_url: Optional[str] = None
    is_visible: bool = True
    
class TalentPoolOptIn(BaseModel):
    full_name: str
    job_title: str
    industry: str
    experience_level: str
    location: str
    skills: List[str]
    summary: str
    cv_document_id: Optional[str] = None  # Reference to user's CV document

class TalentPoolUpdate(BaseModel):
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    industry: Optional[str] = None
    experience_level: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[List[str]] = None
    summary: Optional[str] = None
    cv_document_id: Optional[str] = None
    is_visible: Optional[bool] = None

class ContactRequest(BaseModel):
    message: str

class ContactRequestResponse(BaseModel):
    approved: bool
    message: Optional[str] = None


def get_talent_pool_routes(db, get_current_user):
    """Factory function to create talent pool routes with database dependency"""
    
    @talent_pool_router.post("/opt-in")
    async def opt_in_talent_pool(data: TalentPoolOptIn, current_user = Depends(get_current_user)):
        """Customer opts into the talent pool"""
        try:
            user_id = current_user.id
            
            # Check if already opted in
            existing = await db.talent_pool_profiles.find_one({"user_id": user_id})
            if existing:
                raise HTTPException(status_code=400, detail="Already opted into talent pool")
            
            # Get CV URL if document ID provided
            cv_url = None
            if data.cv_document_id:
                cv_doc = await db.user_cvs.find_one({"id": data.cv_document_id, "user_id": user_id})
                if cv_doc and cv_doc.get("pdf_url"):
                    cv_url = cv_doc["pdf_url"]
            
            profile = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "full_name": data.full_name,
                "job_title": data.job_title,
                "industry": data.industry,
                "experience_level": data.experience_level,
                "location": data.location,
                "skills": data.skills,
                "summary": data.summary,
                "cv_document_id": data.cv_document_id,
                "cv_url": cv_url,
                "is_visible": True,
                "contact_email": current_user.email,
                "contact_phone": current_user.phone or "",
                "reseller_id": current_user.reseller_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.talent_pool_profiles.insert_one(profile)
            
            # Remove sensitive fields for response
            profile.pop("contact_email", None)
            profile.pop("contact_phone", None)
            
            return {"success": True, "message": "Successfully opted into talent pool", "profile": profile}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error opting into talent pool: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.get("/my-profile")
    async def get_my_talent_profile(current_user = Depends(get_current_user)):
        """Get current user's talent pool profile"""
        try:
            user_id = current_user.id
            
            profile = await db.talent_pool_profiles.find_one({"user_id": user_id}, {"_id": 0})
            
            if not profile:
                return {"opted_in": False, "profile": None}
            
            return {"opted_in": True, "profile": profile}
            
        except Exception as e:
            logger.error(f"Error getting talent profile: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.put("/my-profile")
    async def update_talent_profile(data: TalentPoolUpdate, current_user = Depends(get_current_user)):
        """Update talent pool profile"""
        try:
            user_id = current_user.id
            
            profile = await db.talent_pool_profiles.find_one({"user_id": user_id})
            if not profile:
                raise HTTPException(status_code=404, detail="Not opted into talent pool")
            
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            
            # Update CV URL if document ID changed
            if data.cv_document_id:
                cv_doc = await db.user_cvs.find_one({"id": data.cv_document_id, "user_id": user_id})
                if cv_doc and cv_doc.get("pdf_url"):
                    update_data["cv_url"] = cv_doc["pdf_url"]
            
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.talent_pool_profiles.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
            
            updated_profile = await db.talent_pool_profiles.find_one({"user_id": user_id}, {"_id": 0})
            
            return {"success": True, "profile": updated_profile}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating talent profile: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.delete("/opt-out")
    async def opt_out_talent_pool(current_user = Depends(get_current_user)):
        """Remove from talent pool"""
        try:
            user_id = current_user.id
            
            result = await db.talent_pool_profiles.delete_one({"user_id": user_id})
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Not in talent pool")
            
            # Also delete any pending contact requests
            await db.contact_requests.delete_many({"candidate_user_id": user_id})
            
            return {"success": True, "message": "Successfully removed from talent pool"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error opting out of talent pool: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.get("/browse")
    async def browse_talent_pool(
        industry: Optional[str] = Query(None),
        experience_level: Optional[str] = Query(None),
        location: Optional[str] = Query(None),
        skills: Optional[str] = Query(None),  # Comma-separated
        search: Optional[str] = Query(None),
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=50),
        reseller_id: Optional[str] = Query(None),
        current_user = Depends(get_current_user)
    ):
        """Browse talent pool - requires recruiter access (paid)"""
        try:
            # Check if user has recruiter access
            user_id = current_user.id
            
            recruiter_access = await db.recruiter_subscriptions.find_one({
                "user_id": user_id,
                "status": "active",
                "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
            })
            
            if not recruiter_access and current_user.role != "super_admin":
                raise HTTPException(
                    status_code=403, 
                    detail="Recruiter subscription required to browse talent pool"
                )
            
            # Build query
            query = {"is_visible": True}
            
            if reseller_id:
                query["reseller_id"] = reseller_id
            
            if industry:
                query["industry"] = {"$regex": industry, "$options": "i"}
            
            if experience_level:
                query["experience_level"] = experience_level
            
            if location:
                query["location"] = {"$regex": location, "$options": "i"}
            
            if skills:
                skills_list = [s.strip() for s in skills.split(",")]
                query["skills"] = {"$in": skills_list}
            
            if search:
                query["$or"] = [
                    {"full_name": {"$regex": search, "$options": "i"}},
                    {"job_title": {"$regex": search, "$options": "i"}},
                    {"summary": {"$regex": search, "$options": "i"}},
                    {"skills": {"$regex": search, "$options": "i"}}
                ]
            
            # Get total count
            total = await db.talent_pool_profiles.count_documents(query)
            
            # Get paginated results
            skip = (page - 1) * limit
            profiles = await db.talent_pool_profiles.find(
                query,
                {
                    "_id": 0,
                    "contact_email": 0,  # Hide contact details
                    "contact_phone": 0,
                    "user_id": 0
                }
            ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
            
            return {
                "success": True,
                "candidates": profiles,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error browsing talent pool: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.get("/candidate/{profile_id}")
    async def get_candidate_profile(profile_id: str, current_user = Depends(get_current_user)):
        """Get single candidate profile - requires recruiter access"""
        try:
            user_id = current_user.id
            
            # Check recruiter access
            recruiter_access = await db.recruiter_subscriptions.find_one({
                "user_id": user_id,
                "status": "active",
                "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
            })
            
            if not recruiter_access and current_user.role != "super_admin":
                raise HTTPException(status_code=403, detail="Recruiter subscription required")
            
            profile = await db.talent_pool_profiles.find_one(
                {"id": profile_id, "is_visible": True},
                {"_id": 0, "contact_email": 0, "contact_phone": 0}
            )
            
            if not profile:
                raise HTTPException(status_code=404, detail="Candidate not found")
            
            # Check if there's an approved contact request
            contact_approved = await db.contact_requests.find_one({
                "profile_id": profile_id,
                "recruiter_user_id": user_id,
                "status": "approved"
            })
            
            # If contact approved, include contact details
            if contact_approved:
                full_profile = await db.talent_pool_profiles.find_one(
                    {"id": profile_id},
                    {"_id": 0}
                )
                profile["contact_email"] = full_profile.get("contact_email")
                profile["contact_phone"] = full_profile.get("contact_phone")
                profile["contact_approved"] = True
            else:
                profile["contact_approved"] = False
            
            # Check if there's a pending request
            pending_request = await db.contact_requests.find_one({
                "profile_id": profile_id,
                "recruiter_user_id": user_id,
                "status": "pending"
            })
            profile["contact_request_pending"] = pending_request is not None
            
            return {"success": True, "candidate": profile}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting candidate profile: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.post("/request-contact/{profile_id}")
    async def request_contact(profile_id: str, data: ContactRequest, current_user = Depends(get_current_user)):
        """Recruiter requests contact with a candidate"""
        try:
            user_id = current_user.id
            
            # Check recruiter access
            recruiter_access = await db.recruiter_subscriptions.find_one({
                "user_id": user_id,
                "status": "active",
                "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
            })
            
            if not recruiter_access and current_user.role != "super_admin":
                raise HTTPException(status_code=403, detail="Recruiter subscription required")
            
            # Get candidate profile
            profile = await db.talent_pool_profiles.find_one({"id": profile_id, "is_visible": True})
            if not profile:
                raise HTTPException(status_code=404, detail="Candidate not found")
            
            # Check if already requested
            existing = await db.contact_requests.find_one({
                "profile_id": profile_id,
                "recruiter_user_id": user_id,
                "status": {"$in": ["pending", "approved"]}
            })
            
            if existing:
                if existing["status"] == "approved":
                    raise HTTPException(status_code=400, detail="Contact already approved")
                raise HTTPException(status_code=400, detail="Contact request already pending")
            
            # Get recruiter info
            recruiter = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1, "email": 1})
            
            contact_request = {
                "id": str(uuid.uuid4()),
                "profile_id": profile_id,
                "candidate_user_id": profile["user_id"],
                "candidate_name": profile["full_name"],
                "recruiter_user_id": user_id,
                "recruiter_name": recruiter.get("full_name", "Recruiter") if recruiter else "Recruiter",
                "recruiter_email": recruiter.get("email", "") if recruiter else "",
                "message": data.message,
                "status": "pending",  # pending, approved, rejected
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.contact_requests.insert_one(contact_request)
            
            # TODO: Send notification email to candidate
            
            return {"success": True, "message": "Contact request sent", "request_id": contact_request["id"]}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error requesting contact: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.get("/contact-requests")
    async def get_contact_requests(current_user = Depends(get_current_user)):
        """Get contact requests for current user (as candidate)"""
        try:
            user_id = current_user.id
            
            requests = await db.contact_requests.find(
                {"candidate_user_id": user_id},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
            
            return {"success": True, "requests": requests}
            
        except Exception as e:
            logger.error(f"Error getting contact requests: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.put("/contact-requests/{request_id}/respond")
    async def respond_to_contact_request(
        request_id: str, 
        data: ContactRequestResponse, 
        current_user: dict = Depends(get_current_user)
    ):
        """Candidate approves or rejects contact request"""
        try:
            user_id = current_user.get("id") or current_user.get("user_id")
            
            request = await db.contact_requests.find_one({
                "id": request_id,
                "candidate_user_id": user_id
            })
            
            if not request:
                raise HTTPException(status_code=404, detail="Contact request not found")
            
            if request["status"] != "pending":
                raise HTTPException(status_code=400, detail="Request already processed")
            
            status = "approved" if data.approved else "rejected"
            
            await db.contact_requests.update_one(
                {"id": request_id},
                {"$set": {
                    "status": status,
                    "response_message": data.message,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # TODO: Send notification email to recruiter
            
            return {"success": True, "message": f"Contact request {status}"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error responding to contact request: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # Recruiter subscription endpoints
    @talent_pool_router.get("/recruiter/subscription")
    async def get_recruiter_subscription(current_user: dict = Depends(get_current_user)):
        """Get current user's recruiter subscription status"""
        try:
            user_id = current_user.get("id") or current_user.get("user_id")
            
            subscription = await db.recruiter_subscriptions.find_one(
                {"user_id": user_id},
                {"_id": 0}
            )
            
            if not subscription:
                return {"has_subscription": False, "subscription": None}
            
            # Check if expired
            is_active = (
                subscription.get("status") == "active" and
                subscription.get("expires_at", "") > datetime.now(timezone.utc).isoformat()
            )
            
            return {
                "has_subscription": is_active,
                "subscription": subscription
            }
            
        except Exception as e:
            logger.error(f"Error getting recruiter subscription: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.get("/recruiter/plans")
    async def get_recruiter_plans():
        """Get available recruiter subscription plans"""
        plans = [
            {
                "id": "recruiter-monthly",
                "name": "Monthly Access",
                "price": 99900,  # R999 in cents
                "duration_days": 30,
                "description": "Full access to talent pool for 30 days",
                "features": [
                    "Browse unlimited candidates",
                    "View full profiles and CVs",
                    "Send contact requests",
                    "Filter by skills, experience, location"
                ]
            },
            {
                "id": "recruiter-quarterly",
                "name": "Quarterly Access",
                "price": 249900,  # R2499 in cents
                "duration_days": 90,
                "description": "Full access to talent pool for 90 days",
                "features": [
                    "Browse unlimited candidates",
                    "View full profiles and CVs",
                    "Send contact requests",
                    "Filter by skills, experience, location",
                    "Save 17% vs monthly"
                ],
                "popular": True
            },
            {
                "id": "recruiter-annual",
                "name": "Annual Access",
                "price": 799900,  # R7999 in cents
                "duration_days": 365,
                "description": "Full access to talent pool for 12 months",
                "features": [
                    "Browse unlimited candidates",
                    "View full profiles and CVs",
                    "Send contact requests",
                    "Filter by skills, experience, location",
                    "Save 33% vs monthly",
                    "Priority support"
                ]
            }
        ]
        
        return {"success": True, "plans": plans}
    
    @talent_pool_router.get("/industries")
    async def get_industries():
        """Get list of industries for filtering"""
        industries = [
            "Technology", "Healthcare", "Finance", "Education", "Marketing",
            "Sales", "Engineering", "Human Resources", "Legal", "Retail",
            "Manufacturing", "Hospitality", "Construction", "Media", "Nonprofit",
            "Consulting", "Real Estate", "Transportation", "Energy", "Agriculture",
            "Mining", "Telecommunications", "Pharmaceuticals", "Insurance", "Banking"
        ]
        return {"success": True, "industries": sorted(industries)}
    
    @talent_pool_router.get("/experience-levels")
    async def get_experience_levels():
        """Get experience level options"""
        levels = [
            {"id": "entry", "name": "Entry Level (0-2 years)"},
            {"id": "mid", "name": "Mid Level (3-5 years)"},
            {"id": "senior", "name": "Senior (6-10 years)"},
            {"id": "executive", "name": "Executive (10+ years)"}
        ]
        return {"success": True, "levels": levels}
    
    return talent_pool_router
