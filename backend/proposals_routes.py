"""
Proposals/Bid Routes - API endpoints for the Job Proposal System
Allows job seekers to submit proposals for remote jobs
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import logging
import os

from email_service import email_service
from websocket_service import create_notification

logger = logging.getLogger(__name__)

proposals_router = APIRouter(prefix="/api/proposals", tags=["Proposals"])

# Pydantic Models
class ProposalCreate(BaseModel):
    job_id: str
    cover_letter: str
    proposed_rate: Optional[float] = None
    rate_type: str = "monthly"  # hourly, monthly, fixed
    currency: str = "USD"
    availability: str = "immediate"  # immediate, 1-week, 2-weeks, 1-month
    estimated_duration: Optional[str] = None
    portfolio_links: List[str] = []
    additional_notes: Optional[str] = None

class ProposalUpdate(BaseModel):
    cover_letter: Optional[str] = None
    proposed_rate: Optional[float] = None
    rate_type: Optional[str] = None
    availability: Optional[str] = None
    estimated_duration: Optional[str] = None
    portfolio_links: Optional[List[str]] = None
    additional_notes: Optional[str] = None

class AIProposalRequest(BaseModel):
    job_title: str
    job_description: str
    required_skills: List[str] = []
    user_skills: List[str] = []
    user_experience: str = ""
    user_bio: str = ""
    tone: str = "professional"  # professional, friendly, confident


def get_proposals_routes(db, get_current_user):
    """Factory function to create proposals routes with database dependency"""
    
    # ==================== AI ENDPOINTS ====================
    
    @proposals_router.post("/ai/generate-proposal")
    async def ai_generate_proposal(
        data: AIProposalRequest,
        current_user = Depends(get_current_user)
    ):
        """AI-powered proposal/cover letter generator"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
            if not EMERGENT_LLM_KEY:
                raise HTTPException(status_code=500, detail="AI service not configured")
            
            job_skills_str = ", ".join(data.required_skills) if data.required_skills else "Not specified"
            user_skills_str = ", ".join(data.user_skills) if data.user_skills else "Not specified"
            
            prompt = f"""You are an expert career coach helping a job seeker write a compelling proposal for a remote job.

Job Information:
- Title: {data.job_title}
- Description: {data.job_description[:1000]}
- Required Skills: {job_skills_str}

Candidate Information:
- Skills: {user_skills_str}
- Experience: {data.user_experience or 'Not provided'}
- Bio: {data.user_bio or 'Not provided'}

Tone: {data.tone}

Instructions:
1. Write a compelling cover letter/proposal (200-350 words)
2. Highlight how the candidate's skills match the job requirements
3. Show genuine interest in the role
4. Include a brief mention of relevant experience
5. End with a call to action
6. Be {data.tone} in tone
7. Make it personal and engaging, not generic
8. Focus on value the candidate can bring

Write ONLY the proposal text, no additional commentary or headers."""

            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"proposal-gen-{current_user.id}",
                system_message="You are an expert career coach specializing in remote job applications."
            ).with_model("openai", "gpt-4o")
            
            response = await chat.send_message(UserMessage(text=prompt))
            
            if hasattr(response, 'text'):
                proposal = response.text.strip()
            else:
                proposal = str(response).strip()
            
            logger.info(f"AI proposal generated for user {current_user.email}")
            
            return {"success": True, "proposal": proposal}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating AI proposal: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate proposal. Please try again.")
    
    @proposals_router.post("/ai/improve-proposal")
    async def ai_improve_proposal(
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """AI-powered proposal improvement"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
            if not EMERGENT_LLM_KEY:
                raise HTTPException(status_code=500, detail="AI service not configured")
            
            current_proposal = data.get("current_proposal", "")
            job_title = data.get("job_title", "")
            improvement_focus = data.get("focus", "general")  # general, persuasive, concise, professional
            
            prompt = f"""You are an expert career coach. Improve this job proposal.

Job Title: {job_title}

Current Proposal:
{current_proposal}

Improvement Focus: {improvement_focus}

Instructions:
- Make the proposal more {improvement_focus}
- Keep the core message intact
- Improve clarity and impact
- Make it more compelling
- Keep it around the same length

Return ONLY the improved proposal text."""

            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"proposal-improve-{current_user.id}",
                system_message="You are an expert career coach."
            ).with_model("openai", "gpt-4o")
            
            response = await chat.send_message(UserMessage(text=prompt))
            
            if hasattr(response, 'text'):
                improved = response.text.strip()
            else:
                improved = str(response).strip()
            
            return {"success": True, "improved_proposal": improved}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error improving proposal: {e}")
            raise HTTPException(status_code=500, detail="Failed to improve proposal.")
    
    # ==================== PROPOSAL CRUD ====================
    
    @proposals_router.get("/check/{job_id}")
    async def check_existing_proposal(
        job_id: str,
        current_user = Depends(get_current_user)
    ):
        """Check if the current user has already submitted a proposal for a job"""
        try:
            proposal = await db.proposals.find_one(
                {
                    "job_id": job_id,
                    "applicant_id": current_user.id
                },
                {"_id": 0, "id": 1, "status": 1, "created_at": 1, "updated_at": 1}
            )
            
            return {
                "has_proposal": proposal is not None,
                "proposal": proposal
            }
            
        except Exception as e:
            logger.error(f"Error checking existing proposal: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @proposals_router.post("")
    async def submit_proposal(
        data: ProposalCreate,
        current_user = Depends(get_current_user)
    ):
        """Submit a proposal for a job"""
        try:
            # Only job seekers (customers) can submit proposals
            allowed_roles = ['customer', 'job_seeker', None]  # None is default for regular users
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=403, 
                    detail="Only job seekers can submit proposals. Employers and recruiters cannot apply for jobs."
                )
            
            # Check if job exists and is active
            job = await db.remote_jobs.find_one({"id": data.job_id, "status": "active"})
            if not job:
                raise HTTPException(status_code=404, detail="Job not found or no longer active")
            
            # Check if the job already has an awarded contract
            existing_contract = await db.contracts.find_one({
                "job_id": data.job_id,
                "status": {"$in": ["draft", "active"]}
            })
            if existing_contract:
                raise HTTPException(status_code=400, detail="This job has already been awarded to another candidate")
            
            # Check if there's already an accepted proposal for this job
            accepted_proposal = await db.proposals.find_one({
                "job_id": data.job_id,
                "status": "accepted"
            })
            if accepted_proposal:
                raise HTTPException(status_code=400, detail="This job has already been awarded to another candidate")
            
            # Check if user already submitted a proposal for this job
            existing = await db.proposals.find_one({
                "job_id": data.job_id,
                "applicant_id": current_user.id
            })
            if existing:
                # Allow re-submission only if the previous proposal was rejected
                if existing.get("status") == "rejected":
                    # Delete the old rejected proposal to allow new submission
                    await db.proposals.delete_one({"id": existing["id"]})
                    logger.info(f"Deleted rejected proposal {existing['id']} to allow re-submission")
                else:
                    raise HTTPException(status_code=400, detail="You have already submitted a proposal for this job")
            
            # Check if user is trying to apply to their own job
            if job.get("poster_id") == current_user.id:
                raise HTTPException(status_code=400, detail="You cannot submit a proposal for your own job")
            
            # Get user's talent pool profile for additional info
            profile = await db.talent_pool_profiles.find_one(
                {"user_id": current_user.id},
                {"_id": 0}
            )
            
            proposal = {
                "id": str(uuid.uuid4()),
                "job_id": data.job_id,
                "job_title": job.get("title"),
                "company_name": job.get("company_name"),
                "employer_id": job.get("poster_id"),
                "applicant_id": current_user.id,
                "applicant_email": current_user.email,
                "applicant_name": current_user.full_name or current_user.email,
                "cover_letter": data.cover_letter,
                "proposed_rate": data.proposed_rate,
                "rate_type": data.rate_type,
                "currency": data.currency,
                "availability": data.availability,
                "estimated_duration": data.estimated_duration,
                "portfolio_links": data.portfolio_links,
                "additional_notes": data.additional_notes,
                # Include profile summary
                "profile_snapshot": {
                    "skills": profile.get("skills", []) if profile else [],
                    "experience_level": profile.get("experience_level") if profile else None,
                    "bio": profile.get("bio") if profile else None,
                    "cv_url": profile.get("cv_url") if profile else None,
                    "profile_picture_url": profile.get("profile_picture_url") if profile else None,
                    "is_remote_worker": profile.get("is_remote_worker", False) if profile else False
                },
                "status": "pending",  # pending, shortlisted, rejected, accepted, withdrawn
                "employer_notes": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.proposals.insert_one(proposal)
            
            # Increment applications count on job
            await db.remote_jobs.update_one(
                {"id": data.job_id},
                {"$inc": {"applications_count": 1}}
            )
            
            # Remove _id for response
            proposal.pop("_id", None)
            proposal.pop("applicant_email", None)
            
            logger.info(f"Proposal submitted by {current_user.email} for job {data.job_id}")
            
            # Send email notification to employer about new proposal
            try:
                # Get employer details
                employer = await db.users.find_one(
                    {"id": job.get("poster_id")},
                    {"_id": 0, "id": 1, "email": 1, "full_name": 1}
                )
                if employer and employer.get("email"):
                    # Get total proposal count for this job
                    total_proposals = await db.proposals.count_documents({"job_id": data.job_id})
                    
                    # Format rate for display
                    rate_display = f"{data.currency} {data.proposed_rate}" if data.proposed_rate else "Not specified"
                    if data.rate_type:
                        rate_display += f" ({data.rate_type})"
                    
                    # Get frontend URL for proposals link
                    frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "")
                    if not frontend_url:
                        frontend_url = "https://upshift.works"
                    proposals_url = f"{frontend_url}/remote-jobs/{data.job_id}/proposals"
                    
                    await email_service.send_new_proposal_notification_email(
                        to_email=employer.get("email"),
                        employer_name=employer.get("full_name") or "Employer",
                        job_title=job.get("title"),
                        applicant_name=current_user.full_name or current_user.email,
                        applicant_rate=rate_display,
                        cover_letter_preview=data.cover_letter[:200] if data.cover_letter else "",
                        proposals_url=proposals_url,
                        total_proposals=total_proposals
                    )
                    logger.info(f"New proposal notification sent to {employer.get('email')} for job {data.job_id}")
                    
                    # Send real-time notification via WebSocket
                    await create_notification(
                        db=db,
                        user_id=employer.get("id"),
                        notification_type="new_proposal",
                        title="New Proposal Received",
                        message=f"{current_user.full_name or 'A candidate'} applied for {job.get('title')}",
                        link=f"/remote-jobs/{data.job_id}/proposals",
                        metadata={
                            "job_id": data.job_id,
                            "job_title": job.get("title"),
                            "applicant_name": current_user.full_name or current_user.email,
                            "proposed_rate": rate_display,
                            "total_proposals": total_proposals
                        }
                    )
            except Exception as email_err:
                logger.warning(f"Failed to send new proposal notification: {email_err}")
            
            return {"success": True, "message": "Proposal submitted successfully", "proposal": proposal}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error submitting proposal: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @proposals_router.get("/my-proposals")
    async def get_my_proposals(
        current_user = Depends(get_current_user),
        status: Optional[str] = None
    ):
        """Get all proposals submitted by the current user"""
        try:
            query = {"applicant_id": current_user.id}
            if status:
                query["status"] = status
            
            proposals = await db.proposals.find(
                query,
                {"_id": 0, "employer_notes": 0}
            ).sort("created_at", -1).to_list(length=100)
            
            return {"success": True, "proposals": proposals}
            
        except Exception as e:
            logger.error(f"Error getting user's proposals: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @proposals_router.get("/job/{job_id}")
    async def get_job_proposals(
        job_id: str,
        current_user = Depends(get_current_user),
        status: Optional[str] = None
    ):
        """Get all proposals for a specific job (only for job owner)"""
        try:
            # Verify job ownership
            job = await db.remote_jobs.find_one({"id": job_id, "poster_id": current_user.id})
            if not job:
                raise HTTPException(status_code=404, detail="Job not found or you don't have permission")
            
            query = {"job_id": job_id}
            if status:
                query["status"] = status
            
            proposals = await db.proposals.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=100)
            
            # Get counts by status
            status_counts = {
                "total": len(proposals),
                "pending": sum(1 for p in proposals if p.get("status") == "pending"),
                "shortlisted": sum(1 for p in proposals if p.get("status") == "shortlisted"),
                "rejected": sum(1 for p in proposals if p.get("status") == "rejected"),
                "accepted": sum(1 for p in proposals if p.get("status") == "accepted")
            }
            
            return {
                "success": True, 
                "job": {
                    "id": job["id"],
                    "title": job["title"],
                    "company_name": job.get("company_name")
                },
                "proposals": proposals,
                "status_counts": status_counts
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting job proposals: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @proposals_router.get("/{proposal_id}")
    async def get_proposal_details(
        proposal_id: str,
        current_user = Depends(get_current_user)
    ):
        """Get details of a specific proposal"""
        try:
            proposal = await db.proposals.find_one(
                {"id": proposal_id},
                {"_id": 0}
            )
            
            if not proposal:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            # Check access - either applicant or employer
            is_applicant = proposal.get("applicant_id") == current_user.id
            is_employer = proposal.get("employer_id") == current_user.id
            
            if not is_applicant and not is_employer:
                raise HTTPException(status_code=403, detail="You don't have permission to view this proposal")
            
            # Hide employer notes from applicant
            if is_applicant and not is_employer:
                proposal.pop("employer_notes", None)
            
            return {"success": True, "proposal": proposal, "is_owner": is_applicant}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting proposal details: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @proposals_router.put("/{proposal_id}")
    async def update_proposal(
        proposal_id: str,
        data: ProposalUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update a proposal (only by applicant, and only if pending)"""
        try:
            proposal = await db.proposals.find_one({
                "id": proposal_id,
                "applicant_id": current_user.id
            })
            
            if not proposal:
                raise HTTPException(status_code=404, detail="Proposal not found or you don't have permission")
            
            if proposal.get("status") != "pending":
                raise HTTPException(status_code=400, detail="Can only edit pending proposals")
            
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.proposals.update_one(
                {"id": proposal_id},
                {"$set": update_data}
            )
            
            updated = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
            
            return {"success": True, "message": "Proposal updated", "proposal": updated}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating proposal: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @proposals_router.post("/{proposal_id}/withdraw")
    async def withdraw_proposal(
        proposal_id: str,
        current_user = Depends(get_current_user)
    ):
        """Withdraw a proposal (only by applicant)"""
        try:
            proposal = await db.proposals.find_one({
                "id": proposal_id,
                "applicant_id": current_user.id
            })
            
            if not proposal:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            if proposal.get("status") == "withdrawn":
                raise HTTPException(status_code=400, detail="Proposal already withdrawn")
            
            await db.proposals.update_one(
                {"id": proposal_id},
                {"$set": {
                    "status": "withdrawn",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Decrement applications count
            await db.remote_jobs.update_one(
                {"id": proposal.get("job_id")},
                {"$inc": {"applications_count": -1}}
            )
            
            return {"success": True, "message": "Proposal withdrawn"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error withdrawing proposal: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @proposals_router.post("/{proposal_id}/status")
    async def update_proposal_status(
        proposal_id: str,
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """Update proposal status (only by employer)"""
        try:
            new_status = data.get("status")
            notes = data.get("notes")
            
            valid_statuses = ["pending", "shortlisted", "rejected", "accepted"]
            if new_status not in valid_statuses:
                raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
            
            proposal = await db.proposals.find_one({
                "id": proposal_id,
                "employer_id": current_user.id
            })
            
            if not proposal:
                raise HTTPException(status_code=404, detail="Proposal not found or you don't have permission")
            
            update_data = {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if notes:
                update_data["employer_notes"] = notes
            
            await db.proposals.update_one(
                {"id": proposal_id},
                {"$set": update_data}
            )
            
            logger.info(f"Proposal {proposal_id} status updated to {new_status} by {current_user.email}")
            
            # Send email notification when proposal is accepted
            if new_status == "accepted":
                try:
                    await email_service.send_proposal_accepted_email(
                        to_email=proposal.get("applicant_email"),
                        applicant_name=proposal.get("applicant_name"),
                        job_title=proposal.get("job_title"),
                        company_name=proposal.get("company_name") or "Company",
                        employer_name=current_user.full_name or current_user.email,
                        next_steps="The employer will create a contract for you to review and sign."
                    )
                    logger.info(f"Proposal accepted email sent to {proposal.get('applicant_email')}")
                except Exception as email_err:
                    logger.warning(f"Failed to send proposal accepted email: {email_err}")
            
            return {"success": True, "message": f"Proposal {new_status}", "status": new_status}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating proposal status: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== STATS & DASHBOARD ====================
    
    @proposals_router.get("/stats/employer")
    async def get_employer_proposal_stats(
        current_user = Depends(get_current_user)
    ):
        """Get proposal statistics for employer dashboard"""
        try:
            # Get all proposals for user's jobs
            proposals = await db.proposals.find(
                {"employer_id": current_user.id},
                {"_id": 0, "status": 1, "job_id": 1, "created_at": 1}
            ).to_list(length=1000)
            
            total = len(proposals)
            pending = sum(1 for p in proposals if p.get("status") == "pending")
            shortlisted = sum(1 for p in proposals if p.get("status") == "shortlisted")
            
            # Count unique jobs with proposals
            jobs_with_proposals = len(set(p.get("job_id") for p in proposals))
            
            return {
                "success": True,
                "stats": {
                    "total_proposals": total,
                    "pending": pending,
                    "shortlisted": shortlisted,
                    "jobs_with_proposals": jobs_with_proposals
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting employer stats: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return proposals_router
