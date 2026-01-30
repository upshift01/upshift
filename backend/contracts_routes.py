"""
Contracts Routes - API endpoints for Contract Management
Handles contract creation, management, and milestone tracking
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import logging
import os

from email_service import email_service

logger = logging.getLogger(__name__)

contracts_router = APIRouter(prefix="/api/contracts", tags=["Contracts"])

# Pydantic Models
class ContractCreate(BaseModel):
    proposal_id: str
    title: str
    description: Optional[str] = None
    start_date: str  # ISO format
    end_date: Optional[str] = None  # ISO format, None for ongoing
    payment_amount: float
    payment_currency: str = "USD"
    payment_type: str = "fixed"  # fixed, hourly, monthly
    payment_schedule: str = "on_completion"  # on_completion, weekly, bi-weekly, monthly
    milestones: List[dict] = []  # [{title, description, amount, due_date}]
    terms: Optional[str] = None

class ContractUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    terms: Optional[str] = None
    status: Optional[str] = None

class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    due_date: Optional[str] = None

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    status: Optional[str] = None  # pending, in_progress, submitted, approved, paid


def get_contracts_routes(db, get_current_user):
    """Factory function to create contracts routes with database dependency"""
    
    # ==================== CONTRACT CRUD ====================
    
    @contracts_router.post("")
    async def create_contract(
        data: ContractCreate,
        current_user = Depends(get_current_user)
    ):
        """Create a contract from an accepted proposal (employer only)"""
        try:
            # Get the proposal
            proposal = await db.proposals.find_one({"id": data.proposal_id})
            if not proposal:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            # Verify current user is the employer
            if proposal.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can create a contract")
            
            # Check proposal status
            if proposal.get("status") != "accepted":
                raise HTTPException(status_code=400, detail="Can only create contract for accepted proposals")
            
            # Check if contract already exists for this proposal
            existing = await db.contracts.find_one({"proposal_id": data.proposal_id})
            if existing:
                raise HTTPException(status_code=400, detail="Contract already exists for this proposal")
            
            # Get job details
            job = await db.remote_jobs.find_one({"id": proposal.get("job_id")})
            
            # Create milestones if provided
            milestones = []
            for i, m in enumerate(data.milestones):
                milestones.append({
                    "id": str(uuid.uuid4()),
                    "order": i + 1,
                    "title": m.get("title"),
                    "description": m.get("description"),
                    "amount": m.get("amount", 0),
                    "due_date": m.get("due_date"),
                    "status": "pending",
                    "submitted_at": None,
                    "approved_at": None,
                    "paid_at": None
                })
            
            contract = {
                "id": str(uuid.uuid4()),
                "proposal_id": data.proposal_id,
                "job_id": proposal.get("job_id"),
                "job_title": proposal.get("job_title") or job.get("title") if job else "Unknown",
                
                # Parties
                "employer_id": current_user.id,
                "employer_name": current_user.full_name or current_user.email,
                "employer_email": current_user.email,
                "company_name": job.get("company_name") if job else None,
                
                "contractor_id": proposal.get("applicant_id"),
                "contractor_name": proposal.get("applicant_name"),
                "contractor_email": proposal.get("applicant_email"),
                
                # Contract details
                "title": data.title,
                "description": data.description,
                "start_date": data.start_date,
                "end_date": data.end_date,
                
                # Payment
                "payment_amount": data.payment_amount,
                "payment_currency": data.payment_currency,
                "payment_type": data.payment_type,
                "payment_schedule": data.payment_schedule,
                "total_paid": 0,
                
                # Milestones
                "milestones": milestones,
                "has_milestones": len(milestones) > 0,
                
                # Terms
                "terms": data.terms,
                
                # Status
                "status": "draft",  # draft, active, completed, cancelled, disputed
                "contractor_signed": False,
                "employer_signed": True,  # Employer creates it, so they've agreed
                
                # Timestamps
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "activated_at": None,
                "completed_at": None
            }
            
            await db.contracts.insert_one(contract)
            contract.pop("_id", None)
            
            logger.info(f"Contract created: {contract['id']} for proposal {data.proposal_id}")
            
            # Send email notification to contractor
            try:
                frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
                if frontend_url:
                    contract_url = f"{frontend_url}/contracts/{contract['id']}"
                else:
                    contract_url = f"/contracts/{contract['id']}"
                
                await email_service.send_contract_created_email(
                    to_email=contract["contractor_email"],
                    contractor_name=contract["contractor_name"],
                    contract_title=contract["title"],
                    employer_name=contract["employer_name"],
                    company_name=contract.get("company_name") or "Not specified",
                    contract_value=f"{contract['payment_currency']} {contract['payment_amount']:,.2f}",
                    start_date=contract["start_date"][:10] if contract["start_date"] else "TBD",
                    contract_url=contract_url
                )
                logger.info(f"Contract creation email sent to {contract['contractor_email']}")
            except Exception as email_err:
                logger.warning(f"Failed to send contract creation email: {email_err}")
            
            return {"success": True, "message": "Contract created", "contract": contract}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.get("/my-contracts")
    async def get_my_contracts(
        current_user = Depends(get_current_user),
        role: Optional[str] = Query(None),  # employer, contractor
        status: Optional[str] = Query(None)
    ):
        """Get contracts where user is employer or contractor"""
        try:
            # Build query - user can be either party
            if role == "employer":
                query = {"employer_id": current_user.id}
            elif role == "contractor":
                query = {"contractor_id": current_user.id}
            else:
                query = {
                    "$or": [
                        {"employer_id": current_user.id},
                        {"contractor_id": current_user.id}
                    ]
                }
            
            if status:
                query["status"] = status
            
            contracts = await db.contracts.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=100)
            
            # Add role info to each contract
            for c in contracts:
                c["user_role"] = "employer" if c.get("employer_id") == current_user.id else "contractor"
            
            return {"success": True, "contracts": contracts}
            
        except Exception as e:
            logger.error(f"Error getting contracts: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.get("/{contract_id}")
    async def get_contract_details(
        contract_id: str,
        current_user = Depends(get_current_user)
    ):
        """Get contract details"""
        try:
            contract = await db.contracts.find_one(
                {"id": contract_id},
                {"_id": 0}
            )
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Check access
            is_employer = contract.get("employer_id") == current_user.id
            is_contractor = contract.get("contractor_id") == current_user.id
            
            if not is_employer and not is_contractor:
                raise HTTPException(status_code=403, detail="Access denied")
            
            contract["user_role"] = "employer" if is_employer else "contractor"
            
            return {"success": True, "contract": contract}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.put("/{contract_id}")
    async def update_contract(
        contract_id: str,
        data: ContractUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update contract (employer only, draft status only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can update contract")
            
            if contract.get("status") != "draft":
                raise HTTPException(status_code=400, detail="Can only update draft contracts")
            
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": update_data}
            )
            
            updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
            
            return {"success": True, "contract": updated}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== CONTRACT ACTIONS ====================
    
    @contracts_router.post("/{contract_id}/sign")
    async def sign_contract(
        contract_id: str,
        current_user = Depends(get_current_user)
    ):
        """Sign/accept contract (contractor only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("contractor_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only contractor can sign")
            
            if contract.get("status") != "draft":
                raise HTTPException(status_code=400, detail="Contract is not in draft status")
            
            if contract.get("contractor_signed"):
                raise HTTPException(status_code=400, detail="Already signed")
            
            # Sign and activate contract
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "contractor_signed": True,
                    "status": "active",
                    "activated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Contract {contract_id} signed by contractor {current_user.email}")
            
            # Send email notifications to both parties
            try:
                frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
                contract_url = f"{frontend_url}/contracts/{contract_id}" if frontend_url else f"/contracts/{contract_id}"
                
                # Notify employer
                await email_service.send_contract_signed_email(
                    to_email=contract.get("employer_email"),
                    recipient_name=contract.get("employer_name"),
                    contract_title=contract.get("title"),
                    other_party_name=contract.get("contractor_name"),
                    contract_url=contract_url
                )
                
                # Notify contractor (confirmation)
                await email_service.send_contract_signed_email(
                    to_email=contract.get("contractor_email"),
                    recipient_name=contract.get("contractor_name"),
                    contract_title=contract.get("title"),
                    other_party_name=contract.get("employer_name"),
                    contract_url=contract_url
                )
                logger.info(f"Contract signed emails sent for contract {contract_id}")
            except Exception as email_err:
                logger.warning(f"Failed to send contract signed emails: {email_err}")
            
            return {"success": True, "message": "Contract signed and activated"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error signing contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/complete")
    async def complete_contract(
        contract_id: str,
        current_user = Depends(get_current_user)
    ):
        """Mark contract as completed (employer only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can complete contract")
            
            if contract.get("status") != "active":
                raise HTTPException(status_code=400, detail="Contract must be active to complete")
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "message": "Contract marked as completed"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error completing contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/cancel")
    async def cancel_contract(
        contract_id: str,
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """Cancel contract (either party, with reason)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            is_employer = contract.get("employer_id") == current_user.id
            is_contractor = contract.get("contractor_id") == current_user.id
            
            if not is_employer and not is_contractor:
                raise HTTPException(status_code=403, detail="Access denied")
            
            if contract.get("status") in ["completed", "cancelled"]:
                raise HTTPException(status_code=400, detail="Contract already finalized")
            
            reason = data.get("reason", "No reason provided")
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "status": "cancelled",
                    "cancelled_by": current_user.id,
                    "cancellation_reason": reason,
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "message": "Contract cancelled"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cancelling contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== MILESTONE MANAGEMENT ====================
    
    @contracts_router.post("/{contract_id}/milestones")
    async def add_milestone(
        contract_id: str,
        data: MilestoneCreate,
        current_user = Depends(get_current_user)
    ):
        """Add milestone to contract (employer only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can add milestones")
            
            if contract.get("status") not in ["draft", "active"]:
                raise HTTPException(status_code=400, detail="Cannot modify finalized contract")
            
            milestones = contract.get("milestones", [])
            new_milestone = {
                "id": str(uuid.uuid4()),
                "order": len(milestones) + 1,
                "title": data.title,
                "description": data.description,
                "amount": data.amount,
                "due_date": data.due_date,
                "status": "pending",
                "submitted_at": None,
                "approved_at": None,
                "paid_at": None
            }
            
            milestones.append(new_milestone)
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "has_milestones": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "milestone": new_milestone}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error adding milestone: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/milestones/{milestone_id}/submit")
    async def submit_milestone(
        contract_id: str,
        milestone_id: str,
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """Submit milestone for review (contractor only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("contractor_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only contractor can submit milestones")
            
            if contract.get("status") != "active":
                raise HTTPException(status_code=400, detail="Contract must be active")
            
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestones[milestone_idx].get("status") not in ["pending", "in_progress"]:
                raise HTTPException(status_code=400, detail="Milestone cannot be submitted")
            
            milestones[milestone_idx]["status"] = "submitted"
            milestones[milestone_idx]["submitted_at"] = datetime.now(timezone.utc).isoformat()
            milestones[milestone_idx]["submission_notes"] = data.get("notes", "")
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "message": "Milestone submitted for review"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error submitting milestone: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/milestones/{milestone_id}/approve")
    async def approve_milestone(
        contract_id: str,
        milestone_id: str,
        current_user = Depends(get_current_user)
    ):
        """Approve submitted milestone (employer only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can approve milestones")
            
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestones[milestone_idx].get("status") != "submitted":
                raise HTTPException(status_code=400, detail="Milestone not submitted for review")
            
            milestones[milestone_idx]["status"] = "approved"
            milestones[milestone_idx]["approved_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "message": "Milestone approved"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error approving milestone: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/milestones/{milestone_id}/pay")
    async def mark_milestone_paid(
        contract_id: str,
        milestone_id: str,
        current_user = Depends(get_current_user)
    ):
        """Mark milestone as paid (employer only) - manual tracking"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can mark as paid")
            
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestones[milestone_idx].get("status") != "approved":
                raise HTTPException(status_code=400, detail="Milestone must be approved first")
            
            milestone_amount = milestones[milestone_idx].get("amount", 0)
            milestones[milestone_idx]["status"] = "paid"
            milestones[milestone_idx]["paid_at"] = datetime.now(timezone.utc).isoformat()
            
            # Update total paid
            total_paid = contract.get("total_paid", 0) + milestone_amount
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "total_paid": total_paid,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "message": "Milestone marked as paid", "total_paid": total_paid}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error marking milestone paid: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== STATS ====================
    
    @contracts_router.get("/stats/overview")
    async def get_contract_stats(
        current_user = Depends(get_current_user)
    ):
        """Get contract statistics for current user"""
        try:
            # Get all contracts where user is a party
            contracts = await db.contracts.find({
                "$or": [
                    {"employer_id": current_user.id},
                    {"contractor_id": current_user.id}
                ]
            }, {"_id": 0}).to_list(length=1000)
            
            as_employer = [c for c in contracts if c.get("employer_id") == current_user.id]
            as_contractor = [c for c in contracts if c.get("contractor_id") == current_user.id]
            
            stats = {
                "total_contracts": len(contracts),
                "as_employer": {
                    "total": len(as_employer),
                    "active": sum(1 for c in as_employer if c.get("status") == "active"),
                    "completed": sum(1 for c in as_employer if c.get("status") == "completed"),
                    "total_value": sum(c.get("payment_amount", 0) for c in as_employer),
                    "total_paid": sum(c.get("total_paid", 0) for c in as_employer)
                },
                "as_contractor": {
                    "total": len(as_contractor),
                    "active": sum(1 for c in as_contractor if c.get("status") == "active"),
                    "completed": sum(1 for c in as_contractor if c.get("status") == "completed"),
                    "total_value": sum(c.get("payment_amount", 0) for c in as_contractor),
                    "total_earned": sum(c.get("total_paid", 0) for c in as_contractor)
                }
            }
            
            return {"success": True, "stats": stats}
            
        except Exception as e:
            logger.error(f"Error getting contract stats: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return contracts_router
