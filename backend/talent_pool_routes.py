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
    profile_picture: Optional[str] = None  # Base64 or URL of profile picture

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
            from email_service import email_service
            import os
            
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
            
            # Send notification email to candidate
            if email_service.is_configured and profile.get("contact_email"):
                try:
                    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
                    recruiter_name = contact_request["recruiter_name"]
                    candidate_name = profile["full_name"]
                    
                    html_body = f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                            .header {{ background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                            .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                            .message-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }}
                            .btn {{ display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; }}
                            .btn-outline {{ background: white; color: #1e40af; border: 2px solid #1e40af; }}
                            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>New Contact Request!</h1>
                            </div>
                            <div class="content">
                                <p>Hi {candidate_name},</p>
                                
                                <p>Great news! A recruiter is interested in connecting with you through the UpShift Talent Pool.</p>
                                
                                <h3>Recruiter Details</h3>
                                <p><strong>Name:</strong> {recruiter_name}</p>
                                
                                <h3>Their Message</h3>
                                <div class="message-box">
                                    <p>{data.message}</p>
                                </div>
                                
                                <p>Log in to your dashboard to review and respond to this request:</p>
                                
                                <p style="text-align: center;">
                                    <a href="{frontend_url}/dashboard/talent-pool" class="btn">View Request</a>
                                </p>
                                
                                <p style="color: #6b7280; font-size: 14px;">
                                    When you approve a contact request, the recruiter will receive your contact details to reach out directly.
                                </p>
                            </div>
                            <div class="footer">
                                <p>This email was sent because you opted into the UpShift Talent Pool.</p>
                                <p>&copy; {datetime.now().year} UpShift. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    """
                    
                    await email_service.send_email(
                        to_email=profile["contact_email"],
                        subject=f"New Contact Request from {recruiter_name} - UpShift Talent Pool",
                        html_body=html_body,
                        raise_exceptions=False
                    )
                    logger.info(f"Contact request notification sent to {profile['contact_email']}")
                except Exception as email_error:
                    logger.error(f"Failed to send contact request email: {email_error}")
            
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
        current_user = Depends(get_current_user)
    ):
        """Candidate approves or rejects contact request"""
        try:
            from email_service import email_service
            import os
            
            user_id = current_user.id
            
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
            
            # Send notification email to recruiter
            if email_service.is_configured and request.get("recruiter_email"):
                try:
                    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
                    recruiter_name = request.get("recruiter_name", "Recruiter")
                    candidate_name = request.get("candidate_name", "Candidate")
                    
                    if status == "approved":
                        # Get candidate's contact details
                        profile = await db.talent_pool_profiles.find_one(
                            {"id": request["profile_id"]},
                            {"_id": 0, "contact_email": 1, "contact_phone": 1}
                        )
                        
                        contact_email = profile.get("contact_email", "Not provided") if profile else "Not provided"
                        contact_phone = profile.get("contact_phone", "Not provided") if profile else "Not provided"
                        
                        html_body = f"""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                                .header {{ background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                                .contact-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #059669; }}
                                .contact-item {{ padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
                                .contact-item:last-child {{ border-bottom: none; }}
                                .label {{ color: #6b7280; font-size: 14px; }}
                                .value {{ font-size: 18px; font-weight: bold; color: #1f2937; }}
                                .message-box {{ background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }}
                                .btn {{ display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>Contact Request Approved!</h1>
                                </div>
                                <div class="content">
                                    <p>Hi {recruiter_name},</p>
                                    
                                    <p>Great news! <strong>{candidate_name}</strong> has approved your contact request.</p>
                                    
                                    <h3>Candidate Contact Details</h3>
                                    <div class="contact-box">
                                        <div class="contact-item">
                                            <div class="label">Email</div>
                                            <div class="value"><a href="mailto:{contact_email}">{contact_email}</a></div>
                                        </div>
                                        <div class="contact-item">
                                            <div class="label">Phone</div>
                                            <div class="value">{contact_phone}</div>
                                        </div>
                                    </div>
                                    
                                    {f'<h3>Message from {candidate_name}</h3><div class="message-box"><p>{data.message}</p></div>' if data.message else ''}
                                    
                                    <p>You can now reach out directly to discuss opportunities. Good luck!</p>
                                    
                                    <p style="text-align: center;">
                                        <a href="{frontend_url}/talent-pool" class="btn">Browse More Candidates</a>
                                    </p>
                                </div>
                                <div class="footer">
                                    <p>&copy; {datetime.now().year} UpShift. All rights reserved.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """
                        
                        subject = f"Contact Approved: {candidate_name} - UpShift Talent Pool"
                    else:
                        # Rejected
                        html_body = f"""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                                .header {{ background: linear-gradient(135deg, #6b7280, #9ca3af); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                                .message-box {{ background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280; }}
                                .btn {{ display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>Contact Request Update</h1>
                                </div>
                                <div class="content">
                                    <p>Hi {recruiter_name},</p>
                                    
                                    <p>Unfortunately, <strong>{candidate_name}</strong> has declined your contact request at this time.</p>
                                    
                                    {f'<h3>Their Response</h3><div class="message-box"><p>{data.message}</p></div>' if data.message else ''}
                                    
                                    <p>Don't be discouraged! There are many other talented candidates in the pool. Keep exploring to find the perfect match for your opportunity.</p>
                                    
                                    <p style="text-align: center;">
                                        <a href="{frontend_url}/talent-pool" class="btn">Browse More Candidates</a>
                                    </p>
                                </div>
                                <div class="footer">
                                    <p>&copy; {datetime.now().year} UpShift. All rights reserved.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """
                        
                        subject = f"Contact Request Update: {candidate_name} - UpShift Talent Pool"
                    
                    await email_service.send_email(
                        to_email=request["recruiter_email"],
                        subject=subject,
                        html_body=html_body,
                        raise_exceptions=False
                    )
                    logger.info(f"Contact response notification sent to {request['recruiter_email']}")
                except Exception as email_error:
                    logger.error(f"Failed to send contact response email: {email_error}")
            
            return {"success": True, "message": f"Contact request {status}"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error responding to contact request: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # Recruiter subscription endpoints
    @talent_pool_router.get("/recruiter/subscription")
    async def get_recruiter_subscription(current_user = Depends(get_current_user)):
        """Get current user's recruiter subscription status"""
        try:
            user_id = current_user.id
            
            # First, check for an active subscription
            subscription = await db.recruiter_subscriptions.find_one(
                {"user_id": user_id, "status": "active"},
                {"_id": 0},
                sort=[("created_at", -1)]  # Most recent first
            )
            
            if subscription:
                # Check if expired
                is_active = subscription.get("expires_at", "") > datetime.now(timezone.utc).isoformat()
                
                if is_active:
                    return {
                        "has_subscription": True,
                        "subscription": subscription
                    }
            
            # If no active subscription, get the most recent one (could be pending)
            subscription = await db.recruiter_subscriptions.find_one(
                {"user_id": user_id},
                {"_id": 0},
                sort=[("created_at", -1)]
            )
            
            return {
                "has_subscription": False,
                "subscription": subscription
            }
            
        except Exception as e:
            logger.error(f"Error getting recruiter subscription: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.get("/recruiter/plans")
    async def get_recruiter_plans(reseller_id: Optional[str] = Query(None)):
        """Get available recruiter subscription plans with dynamic pricing"""
        # Default prices (in cents)
        default_pricing = {
            "monthly": 99900,
            "quarterly": 249900,
            "annual": 799900
        }
        
        # Fetch custom pricing from database
        pricing_key = "talent_pool_pricing"
        if reseller_id:
            pricing_key = f"talent_pool_pricing_{reseller_id}"
        
        custom_pricing = await db.platform_settings.find_one({"key": pricing_key}, {"_id": 0})
        
        # Use custom pricing if available, otherwise defaults
        pricing = default_pricing.copy()
        if custom_pricing and custom_pricing.get("value"):
            if custom_pricing["value"].get("monthly"):
                pricing["monthly"] = custom_pricing["value"]["monthly"]
            if custom_pricing["value"].get("quarterly"):
                pricing["quarterly"] = custom_pricing["value"]["quarterly"]
            if custom_pricing["value"].get("annual"):
                pricing["annual"] = custom_pricing["value"]["annual"]
        
        plans = [
            {
                "id": "recruiter-monthly",
                "name": "Monthly Access",
                "price": pricing["monthly"],
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
                "price": pricing["quarterly"],
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
                "price": pricing["annual"],
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
    
    # ==============================================
    # ADMIN ENDPOINTS
    # ==============================================
    
    @talent_pool_router.get("/admin/candidates")
    async def admin_get_all_candidates(current_user = Depends(get_current_user)):
        """Admin: Get all talent pool candidates (including hidden and pending)"""
        try:
            if current_user.role not in ["super_admin", "admin", "reseller_admin"]:
                raise HTTPException(status_code=403, detail="Admin access required")
            
            query = {}
            # Resellers can only see their own candidates
            if current_user.role == "reseller_admin":
                query["reseller_id"] = current_user.id
            
            candidates = await db.talent_pool_profiles.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).to_list(500)
            
            return {"success": True, "candidates": candidates}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting admin candidates: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.post("/admin/candidates")
    async def admin_add_candidate(data: dict, current_user = Depends(get_current_user)):
        """Admin: Manually add a candidate to the talent pool"""
        try:
            if current_user.role not in ["super_admin", "admin", "reseller_admin"]:
                raise HTTPException(status_code=403, detail="Admin access required")
            
            # Create the profile
            profile = {
                "id": str(uuid.uuid4()),
                "user_id": None,  # Manual addition, no associated user
                "full_name": data.get("full_name"),
                "job_title": data.get("job_title"),
                "industry": data.get("industry", ""),
                "experience_level": data.get("experience_level", ""),
                "location": data.get("location", ""),
                "skills": data.get("skills", []),
                "summary": data.get("summary", ""),
                "cv_url": data.get("cv_url"),
                "is_visible": data.get("is_visible", True),
                "status": data.get("status", "approved"),
                "contact_email": data.get("email", ""),
                "contact_phone": data.get("phone", ""),
                "reseller_id": current_user.id if current_user.role == "reseller_admin" else data.get("reseller_id"),
                "added_by_admin": True,
                "added_by_user_id": current_user.id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.talent_pool_profiles.insert_one(profile)
            
            return {"success": True, "profile": {k: v for k, v in profile.items() if k != "_id"}}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error adding admin candidate: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.put("/admin/candidates/{candidate_id}/status")
    async def admin_update_candidate_status(
        candidate_id: str, 
        data: dict, 
        current_user = Depends(get_current_user)
    ):
        """Admin: Approve or reject a candidate"""
        try:
            if current_user.role not in ["super_admin", "admin", "reseller_admin"]:
                raise HTTPException(status_code=403, detail="Admin access required")
            
            query = {"id": candidate_id}
            if current_user.role == "reseller_admin":
                query["reseller_id"] = current_user.id
            
            candidate = await db.talent_pool_profiles.find_one(query)
            if not candidate:
                raise HTTPException(status_code=404, detail="Candidate not found")
            
            status = data.get("status", "pending")
            if status not in ["pending", "approved", "rejected"]:
                raise HTTPException(status_code=400, detail="Invalid status")
            
            update_data = {
                "status": status,
                "is_visible": status == "approved",  # Only approved profiles are visible
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.talent_pool_profiles.update_one(
                {"id": candidate_id},
                {"$set": update_data}
            )
            
            return {"success": True, "message": f"Candidate {status}"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating candidate status: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.delete("/admin/candidates/{candidate_id}")
    async def admin_delete_candidate(candidate_id: str, current_user = Depends(get_current_user)):
        """Admin: Remove a candidate from the talent pool"""
        try:
            if current_user.role not in ["super_admin", "admin", "reseller_admin"]:
                raise HTTPException(status_code=403, detail="Admin access required")
            
            query = {"id": candidate_id}
            if current_user.role == "reseller_admin":
                query["reseller_id"] = current_user.id
            
            result = await db.talent_pool_profiles.delete_one(query)
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Candidate not found")
            
            # Also delete any related contact requests
            await db.contact_requests.delete_many({"profile_id": candidate_id})
            
            return {"success": True, "message": "Candidate removed"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting candidate: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.get("/admin/subscriptions")
    async def admin_get_subscriptions(current_user = Depends(get_current_user)):
        """Admin: Get all recruiter subscriptions"""
        try:
            if current_user.role not in ["super_admin", "admin", "reseller_admin"]:
                raise HTTPException(status_code=403, detail="Admin access required")
            
            query = {}
            if current_user.role == "reseller_admin":
                query["reseller_id"] = current_user.id
            
            subscriptions = await db.recruiter_subscriptions.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).to_list(500)
            
            return {"success": True, "subscriptions": subscriptions}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting subscriptions: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.get("/admin/pricing")
    async def admin_get_pricing(current_user = Depends(get_current_user)):
        """Admin: Get talent pool subscription pricing"""
        try:
            if current_user.role not in ["super_admin", "admin", "reseller_admin"]:
                raise HTTPException(status_code=403, detail="Admin access required")
            
            key = "talent_pool_pricing"
            if current_user.role == "reseller_admin":
                key = f"talent_pool_pricing_{current_user.id}"
            
            settings = await db.platform_settings.find_one({"key": key}, {"_id": 0})
            
            if settings and settings.get("value"):
                return {"success": True, "pricing": settings["value"]}
            
            # Return default pricing
            return {
                "success": True,
                "pricing": {
                    "monthly": 99900,
                    "quarterly": 249900,
                    "annual": 799900
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting pricing: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.put("/admin/pricing")
    async def admin_update_pricing(data: dict, current_user = Depends(get_current_user)):
        """Admin: Update talent pool subscription pricing"""
        try:
            if current_user.role not in ["super_admin", "admin", "reseller_admin"]:
                raise HTTPException(status_code=403, detail="Admin access required")
            
            pricing = data.get("pricing", {})
            if not pricing:
                raise HTTPException(status_code=400, detail="Pricing data required")
            
            key = "talent_pool_pricing"
            if current_user.role == "reseller_admin":
                key = f"talent_pool_pricing_{current_user.id}"
            
            await db.platform_settings.update_one(
                {"key": key},
                {"$set": {
                    "key": key,
                    "value": pricing,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            
            return {"success": True, "message": "Pricing updated"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating pricing: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==============================================
    # YOCO PAYMENT ENDPOINTS FOR RECRUITER SUBSCRIPTIONS
    # ==============================================
    
    @talent_pool_router.post("/subscribe/{plan_id}")
    async def subscribe_to_recruiter_plan(plan_id: str, current_user = Depends(get_current_user)):
        """Create a Yoco checkout for recruiter subscription"""
        try:
            from yoco_service import get_yoco_service_for_reseller
            import os
            
            # Get plan details
            plans = {
                "recruiter-monthly": {"name": "Monthly Access", "price": 99900, "days": 30},
                "recruiter-quarterly": {"name": "Quarterly Access", "price": 249900, "days": 90},
                "recruiter-annual": {"name": "Annual Access", "price": 799900, "days": 365}
            }
            
            # Check for custom pricing
            pricing_key = "talent_pool_pricing"
            if current_user.reseller_id:
                pricing_key = f"talent_pool_pricing_{current_user.reseller_id}"
            
            custom_pricing = await db.platform_settings.find_one({"key": pricing_key}, {"_id": 0})
            if custom_pricing and custom_pricing.get("value"):
                if plan_id == "recruiter-monthly" and custom_pricing["value"].get("monthly"):
                    plans["recruiter-monthly"]["price"] = custom_pricing["value"]["monthly"]
                if plan_id == "recruiter-quarterly" and custom_pricing["value"].get("quarterly"):
                    plans["recruiter-quarterly"]["price"] = custom_pricing["value"]["quarterly"]
                if plan_id == "recruiter-annual" and custom_pricing["value"].get("annual"):
                    plans["recruiter-annual"]["price"] = custom_pricing["value"]["annual"]
            
            if plan_id not in plans:
                raise HTTPException(status_code=400, detail="Invalid plan ID")
            
            plan = plans[plan_id]
            
            # Get Yoco service (with reseller-specific keys if applicable)
            yoco = await get_yoco_service_for_reseller(db, current_user.reseller_id)
            
            if not yoco.is_configured():
                raise HTTPException(status_code=503, detail="Payment service not configured")
            
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
            
            # Create subscription record (pending)
            subscription_id = str(uuid.uuid4())
            
            # Create checkout
            checkout = await yoco.create_checkout(
                amount_cents=plan["price"],
                email=current_user.email,
                metadata={
                    "type": "talent_pool_subscription",
                    "plan_id": plan_id,
                    "plan_name": plan["name"],
                    "subscription_id": subscription_id,
                    "user_id": current_user.id,
                    "user_email": current_user.email,
                    "reseller_id": current_user.reseller_id
                },
                success_url=f"{frontend_url}/talent-pool?payment=success&subscription_id={subscription_id}",
                cancel_url=f"{frontend_url}/talent-pool?payment=cancelled",
                failure_url=f"{frontend_url}/talent-pool?payment=failed"
            )
            
            # Store pending subscription
            await db.recruiter_subscriptions.insert_one({
                "id": subscription_id,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "user_name": current_user.full_name,
                "plan_id": plan_id,
                "plan_name": plan["name"],
                "amount_cents": plan["price"],
                "duration_days": plan["days"],
                "status": "pending",
                "checkout_id": checkout.get("id"),
                "reseller_id": current_user.reseller_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "success": True,
                "checkout_url": checkout.get("redirectUrl"),
                "checkout_id": checkout.get("id"),
                "subscription_id": subscription_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating subscription checkout: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @talent_pool_router.post("/verify-payment/{subscription_id}")
    async def verify_subscription_payment(subscription_id: str):
        """Verify payment and activate subscription - no auth required as subscription_id is secure"""
        try:
            from yoco_service import get_yoco_service_for_reseller
            from datetime import timedelta
            
            logger.info(f"Verifying payment for subscription: {subscription_id}")
            
            # Get pending subscription by ID only (no user check - subscription_id is secure UUID)
            subscription = await db.recruiter_subscriptions.find_one({"id": subscription_id})
            
            if not subscription:
                logger.error(f"Subscription not found: {subscription_id}")
                raise HTTPException(status_code=404, detail="Subscription not found")
            
            if subscription.get("status") == "active":
                logger.info(f"Subscription already active: {subscription_id}")
                sub_copy = {k: v for k, v in subscription.items() if k != '_id'}
                return {"success": True, "message": "Subscription already active", "subscription": sub_copy}
            
            # Verify payment with Yoco
            reseller_id = subscription.get("reseller_id")
            yoco = await get_yoco_service_for_reseller(db, reseller_id)
            checkout_id = subscription.get("checkout_id")
            
            logger.info(f"Checking Yoco payment for checkout: {checkout_id}")
            
            if checkout_id:
                is_paid = await yoco.verify_payment(checkout_id)
                logger.info(f"Yoco verification result: {is_paid}")
                
                if is_paid:
                    # Calculate expiry
                    duration_days = subscription.get("duration_days", 30)
                    expires_at = datetime.now(timezone.utc) + timedelta(days=duration_days)
                    
                    # Activate subscription
                    await db.recruiter_subscriptions.update_one(
                        {"id": subscription_id},
                        {"$set": {
                            "status": "active",
                            "activated_at": datetime.now(timezone.utc).isoformat(),
                            "expires_at": expires_at.isoformat()
                        }}
                    )
                    
                    # Get updated subscription
                    updated = await db.recruiter_subscriptions.find_one(
                        {"id": subscription_id},
                        {"_id": 0}
                    )
                    
                    logger.info(f"Subscription activated: {subscription_id}")
                    return {"success": True, "message": "Subscription activated", "subscription": updated}
                else:
                    return {"success": False, "message": "Payment not verified"}
            
            return {"success": False, "message": "No checkout found"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying payment: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==============================================
    # RECRUITER DASHBOARD ENDPOINTS
    # ==============================================
    
    @talent_pool_router.get("/recruiter/my-requests")
    async def get_my_contact_requests(current_user = Depends(get_current_user)):
        """Get all contact requests sent by the current recruiter"""
        try:
            requests = await db.contact_requests.find(
                {"recruiter_user_id": current_user.id},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
            
            # For approved requests, include candidate contact details
            for req in requests:
                if req.get("status") == "approved":
                    profile = await db.talent_pool_profiles.find_one(
                        {"id": req.get("profile_id")},
                        {"_id": 0, "contact_email": 1, "contact_phone": 1}
                    )
                    if profile:
                        req["candidate_email"] = profile.get("contact_email")
                        req["candidate_phone"] = profile.get("contact_phone")
            
            return {"success": True, "requests": requests}
            
        except Exception as e:
            logger.error(f"Error getting recruiter requests: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return talent_pool_router
