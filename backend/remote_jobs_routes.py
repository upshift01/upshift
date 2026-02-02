"""
Remote Jobs Routes - API endpoints for the Remote Work Space
Allows any registered user to post and manage remote job listings
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import logging
import os

logger = logging.getLogger(__name__)

remote_jobs_router = APIRouter(prefix="/api/remote-jobs", tags=["Remote Jobs"])

# Pydantic Models
class JobPostingCreate(BaseModel):
    title: str
    company_name: str
    description: str
    job_type: str  # full-time, contract, gig
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    experience_level: str  # entry, mid, senior, executive
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    currency: str = "USD"  # USD or ZAR
    budget_type: str = "monthly"  # hourly, monthly, fixed
    timeline: str = "ongoing"  # ongoing, 1-3 months, 3-6 months, one-off
    location_preference: str = "worldwide"  # worldwide, specific regions
    preferred_regions: List[str] = []  # e.g., ["South Africa", "Africa", "Europe"]
    timezone_overlap: Optional[str] = None  # e.g., "GMT+2 (4 hours overlap)"
    language_requirements: List[str] = ["English"]
    remote_type: str = "fully-remote"  # fully-remote, hybrid, flexible
    application_deadline: Optional[str] = None
    
class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    job_type: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    currency: Optional[str] = None
    budget_type: Optional[str] = None
    timeline: Optional[str] = None
    location_preference: Optional[str] = None
    preferred_regions: Optional[List[str]] = None
    timezone_overlap: Optional[str] = None
    language_requirements: Optional[List[str]] = None
    remote_type: Optional[str] = None
    application_deadline: Optional[str] = None
    status: Optional[str] = None

class AIJobDescriptionRequest(BaseModel):
    title: str
    bullet_points: List[str] = []
    job_type: str = "full-time"
    industry: str = ""
    required_skills: List[str] = []

class AISkillsSuggestionRequest(BaseModel):
    title: str
    description: str = ""
    industry: str = ""


def get_remote_jobs_routes(db, get_current_user):
    """Factory function to create remote jobs routes with database dependency"""
    
    # ==================== AI ENDPOINTS ====================
    
    @remote_jobs_router.post("/ai/generate-description")
    async def ai_generate_job_description(
        data: AIJobDescriptionRequest,
        current_user = Depends(get_current_user)
    ):
        """AI-powered job description generator from bullet points"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
            if not EMERGENT_LLM_KEY:
                raise HTTPException(status_code=500, detail="AI service not configured")
            
            bullet_points_str = "\n".join([f"• {bp}" for bp in data.bullet_points]) if data.bullet_points else "No specific details provided"
            skills_str = ", ".join(data.required_skills) if data.required_skills else "Not specified"
            
            prompt = f"""You are an expert HR professional and job description writer specializing in remote work positions.

Create a compelling, professional job description based on:

Job Title: {data.title}
Job Type: {data.job_type}
Industry: {data.industry or 'Not specified'}
Key Skills: {skills_str}

Key Points from Employer:
{bullet_points_str}

Instructions:
- Write a clear, engaging job description (250-400 words)
- Structure with sections: About the Role, Responsibilities, Requirements, Nice to Have, What We Offer
- Use professional but approachable language
- Highlight remote work benefits
- Include relevant keywords for the role
- Make it attractive to top remote talent
- Be specific about expectations and deliverables

Write ONLY the job description, no additional commentary."""

            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"job-desc-{current_user.id}",
                system_message="You are an expert HR professional specializing in remote job postings."
            ).with_model("openai", "gpt-4o")
            
            response = await chat.send_message(UserMessage(text=prompt))
            
            if hasattr(response, 'text'):
                description = response.text.strip()
            else:
                description = str(response).strip()
            
            logger.info(f"AI job description generated for user {current_user.email}")
            
            return {"success": True, "description": description}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating AI job description: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate description. Please try again.")
    
    @remote_jobs_router.post("/ai/suggest-skills")
    async def ai_suggest_skills(
        data: AISkillsSuggestionRequest,
        current_user = Depends(get_current_user)
    ):
        """AI-powered skill suggestions based on job title and description"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
            if not EMERGENT_LLM_KEY:
                raise HTTPException(status_code=500, detail="AI service not configured")
            
            prompt = f"""You are an expert HR professional and recruiter specializing in remote work.

Based on this job posting, suggest relevant skills:

Job Title: {data.title}
Industry: {data.industry or 'Not specified'}
Description: {data.description or 'Not provided'}

Instructions:
- Suggest 8-12 highly relevant skills for this role
- Divide into "required" (must-have) and "preferred" (nice-to-have) skills
- Include both technical/hard skills and soft skills
- Focus on skills that are particularly important for remote work
- Use industry-standard terminology

Return as JSON in this exact format:
{{"required": ["skill1", "skill2", ...], "preferred": ["skill1", "skill2", ...]}}"""

            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"job-skills-{current_user.id}",
                system_message="You are an expert recruiter specializing in remote positions."
            ).with_model("openai", "gpt-4o")
            
            response = await chat.send_message(UserMessage(text=prompt))
            
            if hasattr(response, 'text'):
                response_text = response.text.strip()
            else:
                response_text = str(response).strip()
            
            # Parse JSON response
            import json
            import re
            
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                skills_data = json.loads(json_match.group())
            else:
                skills_data = {"required": [], "preferred": []}
            
            logger.info(f"AI skills suggested for user {current_user.email}")
            
            return {
                "success": True, 
                "required_skills": skills_data.get("required", []),
                "preferred_skills": skills_data.get("preferred", [])
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error suggesting AI skills: {e}")
            raise HTTPException(status_code=500, detail="Failed to suggest skills. Please try again.")
    
    # ==================== JOB POSTING CRUD ====================
    
    @remote_jobs_router.post("/jobs")
    async def create_job_posting(
        data: JobPostingCreate,
        current_user = Depends(get_current_user)
    ):
        """Create a new job posting - Employers only with active subscription"""
        try:
            # Check if user is an employer
            if current_user.role != "employer":
                raise HTTPException(
                    status_code=403, 
                    detail="Only employers can post jobs. Please register as an employer."
                )
            
            # Get user's subscription status
            user = await db.users.find_one({"id": current_user.id})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            subscription = user.get("employer_subscription", {})
            
            # Check subscription status
            if not subscription or subscription.get("status") not in ["active", "trial"]:
                raise HTTPException(
                    status_code=403,
                    detail="Active subscription required to post jobs. Please subscribe to an employer plan."
                )
            
            # Check if subscription has expired
            expires_at = subscription.get("expires_at")
            if expires_at:
                try:
                    exp_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                    if exp_date < datetime.now(timezone.utc):
                        raise HTTPException(
                            status_code=403,
                            detail="Your subscription has expired. Please renew to post jobs."
                        )
                except ValueError:
                    pass
            
            # Check job posting limit
            jobs_limit = subscription.get("jobs_limit", 0)
            jobs_posted = await db.remote_jobs.count_documents({"poster_id": current_user.id})
            
            if jobs_limit != -1 and jobs_posted >= jobs_limit:  # -1 means unlimited
                plan_name = subscription.get("plan_name", "current plan")
                raise HTTPException(
                    status_code=403,
                    detail=f"You've reached your limit of {jobs_limit} job postings on the {plan_name}. Please upgrade your plan to post more jobs."
                )
            
            # Get company logo from user profile
            company_logo = user.get("company_logo")
            
            # Create the job posting
            job = {
                "id": str(uuid.uuid4()),
                "poster_id": current_user.id,
                "employer_id": current_user.id,  # Also store as employer_id for consistency
                "poster_email": current_user.email,
                "poster_name": current_user.full_name or current_user.email,
                "title": data.title,
                "company_name": data.company_name,
                "company_logo": company_logo,  # Include company logo in job posting
                "description": data.description,
                "job_type": data.job_type,
                "required_skills": data.required_skills,
                "preferred_skills": data.preferred_skills,
                "experience_level": data.experience_level,
                "budget_min": data.budget_min,
                "budget_max": data.budget_max,
                "currency": data.currency,
                "budget_type": data.budget_type,
                "timeline": data.timeline,
                "location_preference": data.location_preference,
                "preferred_regions": data.preferred_regions,
                "timezone_overlap": data.timezone_overlap,
                "language_requirements": data.language_requirements,
                "remote_type": data.remote_type,
                "application_deadline": data.application_deadline,
                "status": "active",  # active, paused, closed, filled
                "views": 0,
                "applications_count": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.remote_jobs.insert_one(job)
            
            # Remove internal fields for response (including _id added by MongoDB)
            job.pop("_id", None)
            job.pop("poster_email", None)
            
            logger.info(f"Job posting created by employer {current_user.email}: {data.title} ({jobs_posted + 1}/{jobs_limit if jobs_limit != -1 else 'unlimited'})")
            
            return {
                "success": True, 
                "message": "Job posted successfully", 
                "job": job,
                "jobs_posted": jobs_posted + 1,
                "jobs_limit": jobs_limit
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating job posting: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @remote_jobs_router.get("/jobs")
    async def list_jobs(
        page: int = Query(1, ge=1),
        limit: int = Query(12, ge=1, le=50),
        job_type: Optional[str] = None,
        experience_level: Optional[str] = None,
        currency: Optional[str] = None,
        location: Optional[str] = None,
        search: Optional[str] = None,
        remote_only: bool = True
    ):
        """List all active job postings (public endpoint)"""
        try:
            query = {"status": "active"}
            
            if job_type:
                query["job_type"] = job_type
            if experience_level:
                query["experience_level"] = experience_level
            if currency:
                query["currency"] = currency
            if location and location != "worldwide":
                query["$or"] = [
                    {"location_preference": "worldwide"},
                    {"preferred_regions": {"$in": [location]}}
                ]
            if search:
                query["$or"] = [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                    {"required_skills": {"$in": [search]}},
                    {"company_name": {"$regex": search, "$options": "i"}}
                ]
            
            skip = (page - 1) * limit
            
            jobs = await db.remote_jobs.find(
                query,
                {"_id": 0, "poster_email": 0}
            ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
            
            total = await db.remote_jobs.count_documents(query)
            
            # Fetch company logos for jobs that don't have them stored
            # This handles older jobs created before the logo feature
            jobs_without_logos = [j for j in jobs if not j.get("company_logo")]
            if jobs_without_logos:
                poster_ids = list(set(j.get("poster_id") for j in jobs_without_logos if j.get("poster_id")))
                if poster_ids:
                    employers = await db.users.find(
                        {"id": {"$in": poster_ids}},
                        {"_id": 0, "id": 1, "company_logo": 1}
                    ).to_list(length=100)
                    logo_map = {e["id"]: e.get("company_logo") for e in employers}
                    for job in jobs:
                        if not job.get("company_logo") and job.get("poster_id") in logo_map:
                            job["company_logo"] = logo_map[job["poster_id"]]
            
            return {
                "success": True,
                "jobs": jobs,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "totalPages": (total + limit - 1) // limit
                }
            }
            
        except Exception as e:
            logger.error(f"Error listing jobs: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @remote_jobs_router.get("/jobs/{job_id}")
    async def get_job_details(job_id: str):
        """Get details of a specific job posting (public endpoint)"""
        try:
            job = await db.remote_jobs.find_one(
                {"id": job_id},
                {"_id": 0, "poster_email": 0}
            )
            
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")
            
            # Increment view count
            await db.remote_jobs.update_one(
                {"id": job_id},
                {"$inc": {"views": 1}}
            )
            
            return {"success": True, "job": job}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting job details: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @remote_jobs_router.get("/my-jobs")
    async def get_my_job_postings(
        current_user = Depends(get_current_user),
        status: Optional[str] = None
    ):
        """Get all job postings created by the current user"""
        try:
            query = {"poster_id": current_user.id}
            if status:
                query["status"] = status
            
            jobs = await db.remote_jobs.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=100)
            
            return {"success": True, "jobs": jobs}
            
        except Exception as e:
            logger.error(f"Error getting user's jobs: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @remote_jobs_router.put("/jobs/{job_id}")
    async def update_job_posting(
        job_id: str,
        data: JobPostingUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update a job posting (only by the poster)"""
        try:
            # Check ownership
            job = await db.remote_jobs.find_one({"id": job_id, "poster_id": current_user.id})
            if not job:
                raise HTTPException(status_code=404, detail="Job not found or you don't have permission")
            
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.remote_jobs.update_one(
                {"id": job_id},
                {"$set": update_data}
            )
            
            updated_job = await db.remote_jobs.find_one({"id": job_id}, {"_id": 0})
            
            return {"success": True, "message": "Job updated successfully", "job": updated_job}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating job posting: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @remote_jobs_router.delete("/jobs/{job_id}")
    async def delete_job_posting(
        job_id: str,
        current_user = Depends(get_current_user)
    ):
        """Delete a job posting (only by the poster)"""
        try:
            result = await db.remote_jobs.delete_one({"id": job_id, "poster_id": current_user.id})
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Job not found or you don't have permission")
            
            return {"success": True, "message": "Job deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting job posting: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @remote_jobs_router.post("/jobs/{job_id}/toggle-status")
    async def toggle_job_status(
        job_id: str,
        current_user = Depends(get_current_user)
    ):
        """Toggle job status between active and paused"""
        try:
            job = await db.remote_jobs.find_one({"id": job_id, "poster_id": current_user.id})
            if not job:
                raise HTTPException(status_code=404, detail="Job not found or you don't have permission")
            
            new_status = "paused" if job["status"] == "active" else "active"
            
            await db.remote_jobs.update_one(
                {"id": job_id},
                {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            return {"success": True, "message": f"Job {new_status}", "status": new_status}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error toggling job status: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== REFERENCE DATA ====================
    
    @remote_jobs_router.get("/options")
    async def get_job_options():
        """Get reference data for job posting form"""
        return {
            "success": True,
            "job_types": [
                {"id": "full-time", "name": "Full-time Remote"},
                {"id": "contract", "name": "Contract / Project-based"},
                {"id": "gig", "name": "Gig / Micro-task"}
            ],
            "experience_levels": [
                {"id": "entry", "name": "Entry Level (0-2 years)"},
                {"id": "mid", "name": "Mid Level (3-5 years)"},
                {"id": "senior", "name": "Senior Level (6-10 years)"},
                {"id": "executive", "name": "Executive (10+ years)"}
            ],
            "currencies": [
                {"id": "USD", "name": "USD ($)", "symbol": "$"},
                {"id": "ZAR", "name": "ZAR (R)", "symbol": "R"}
            ],
            "budget_types": [
                {"id": "hourly", "name": "Per Hour"},
                {"id": "monthly", "name": "Per Month"},
                {"id": "fixed", "name": "Fixed Project Price"}
            ],
            "timelines": [
                {"id": "ongoing", "name": "Ongoing / Permanent"},
                {"id": "1-3-months", "name": "1-3 Months"},
                {"id": "3-6-months", "name": "3-6 Months"},
                {"id": "6-12-months", "name": "6-12 Months"},
                {"id": "one-off", "name": "One-off Task"}
            ],
            "regions": [
                "Worldwide",
                "South Africa",
                "Africa",
                "Europe",
                "North America",
                "South America",
                "Asia",
                "Australia/Oceania",
                "Middle East"
            ],
            "remote_types": [
                {"id": "fully-remote", "name": "Fully Remote"},
                {"id": "hybrid", "name": "Hybrid (Some office time)"},
                {"id": "flexible", "name": "Flexible"}
            ],
            "languages": [
                "English",
                "Afrikaans",
                "Zulu",
                "Spanish",
                "French",
                "German",
                "Portuguese",
                "Mandarin",
                "Hindi",
                "Arabic"
            ]
        }
    
    # ==================== MATCHING & RECOMMENDATIONS ====================
    
    @remote_jobs_router.get("/recommendations")
    async def get_job_recommendations(
        current_user = Depends(get_current_user),
        limit: int = Query(10, ge=1, le=50)
    ):
        """Get AI-powered job recommendations based on user's Talent Pool profile"""
        try:
            # Get user's talent pool profile
            profile = await db.talent_pool_profiles.find_one(
                {"user_id": current_user.id},
                {"_id": 0}
            )
            
            if not profile:
                # Return general active jobs if no profile
                jobs = await db.remote_jobs.find(
                    {"status": "active"},
                    {"_id": 0, "poster_email": 0}
                ).sort("created_at", -1).limit(limit).to_list(length=limit)
                
                return {
                    "success": True,
                    "has_profile": False,
                    "message": "Create a Talent Pool profile to get personalized recommendations",
                    "jobs": jobs
                }
            
            # Build matching query based on profile
            user_skills = profile.get("skills", [])
            user_industry = profile.get("industry", "")
            user_experience = profile.get("experience_level", "")
            user_location = profile.get("location", "")
            is_remote_worker = profile.get("is_remote_worker", False)
            
            # Calculate match scores for jobs
            all_jobs = await db.remote_jobs.find(
                {"status": "active"},
                {"_id": 0, "poster_email": 0}
            ).to_list(length=100)
            
            scored_jobs = []
            for job in all_jobs:
                score = 0
                match_reasons = []
                
                # Skill matching (highest weight)
                job_skills = set(s.lower() for s in job.get("required_skills", []))
                user_skills_lower = set(s.lower() for s in user_skills)
                matching_skills = job_skills.intersection(user_skills_lower)
                
                if matching_skills:
                    skill_score = len(matching_skills) / max(len(job_skills), 1) * 40
                    score += skill_score
                    match_reasons.append(f"{len(matching_skills)} matching skills")
                
                # Experience level matching
                if job.get("experience_level") == user_experience:
                    score += 25
                    match_reasons.append("Experience level match")
                elif _experience_compatible(user_experience, job.get("experience_level", "")):
                    score += 15
                    match_reasons.append("Compatible experience")
                
                # Industry matching
                if user_industry and user_industry.lower() in job.get("description", "").lower():
                    score += 15
                    match_reasons.append("Industry match")
                
                # Remote worker preference
                if is_remote_worker and job.get("remote_type") == "fully-remote":
                    score += 10
                    match_reasons.append("Fully remote")
                
                # Location/region matching
                if job.get("location_preference") == "worldwide":
                    score += 5
                elif user_location:
                    regions = job.get("preferred_regions", [])
                    for region in regions:
                        if region.lower() in user_location.lower():
                            score += 10
                            match_reasons.append(f"Location: {region}")
                            break
                
                if score > 0:
                    job["match_score"] = round(score, 1)
                    job["match_reasons"] = match_reasons
                    scored_jobs.append(job)
            
            # Sort by match score
            scored_jobs.sort(key=lambda x: x.get("match_score", 0), reverse=True)
            
            return {
                "success": True,
                "has_profile": True,
                "profile_summary": {
                    "skills": user_skills[:5],
                    "experience": user_experience,
                    "industry": user_industry,
                    "is_remote_worker": is_remote_worker
                },
                "jobs": scored_jobs[:limit]
            }
            
        except Exception as e:
            logger.error(f"Error getting job recommendations: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @remote_jobs_router.get("/jobs/{job_id}/matches")
    async def get_candidate_matches(
        job_id: str,
        current_user = Depends(get_current_user),
        limit: int = Query(20, ge=1, le=50),
        region: Optional[str] = None
    ):
        """Get matched candidates from Talent Pool for a specific job"""
        try:
            # Verify job ownership
            job = await db.remote_jobs.find_one({"id": job_id, "poster_id": current_user.id})
            if not job:
                raise HTTPException(status_code=404, detail="Job not found or you don't have permission")
            
            # Build candidate query
            candidate_query = {"is_visible": True}
            
            # Filter by region if specified
            if region and region != "all":
                candidate_query["location"] = {"$regex": region, "$options": "i"}
            
            # Get all visible candidates
            candidates = await db.talent_pool_profiles.find(
                candidate_query,
                {"_id": 0, "contact_email": 0, "contact_phone": 0}
            ).to_list(length=200)
            
            # Calculate match scores
            job_skills = set(s.lower() for s in job.get("required_skills", []))
            job_preferred_skills = set(s.lower() for s in job.get("preferred_skills", []))
            job_experience = job.get("experience_level", "")
            
            scored_candidates = []
            for candidate in candidates:
                score = 0
                match_reasons = []
                
                # Skill matching
                candidate_skills = set(s.lower() for s in candidate.get("skills", []))
                required_matches = job_skills.intersection(candidate_skills)
                preferred_matches = job_preferred_skills.intersection(candidate_skills)
                
                if required_matches:
                    skill_score = len(required_matches) / max(len(job_skills), 1) * 50
                    score += skill_score
                    match_reasons.append(f"{len(required_matches)}/{len(job_skills)} required skills")
                
                if preferred_matches:
                    score += len(preferred_matches) * 3
                    match_reasons.append(f"{len(preferred_matches)} preferred skills")
                
                # Experience matching
                if candidate.get("experience_level") == job_experience:
                    score += 25
                    match_reasons.append("Experience match")
                elif _experience_compatible(candidate.get("experience_level", ""), job_experience):
                    score += 15
                    match_reasons.append("Compatible experience")
                
                # Remote worker bonus
                if candidate.get("is_remote_worker") and job.get("remote_type") == "fully-remote":
                    score += 10
                    match_reasons.append("Remote worker")
                
                # Has CV bonus
                if candidate.get("cv_url"):
                    score += 5
                    match_reasons.append("CV available")
                
                if score > 0:
                    candidate["match_score"] = round(score, 1)
                    candidate["match_reasons"] = match_reasons
                    scored_candidates.append(candidate)
            
            # Sort by match score
            scored_candidates.sort(key=lambda x: x.get("match_score", 0), reverse=True)
            
            return {
                "success": True,
                "job": {
                    "id": job["id"],
                    "title": job["title"],
                    "required_skills": job.get("required_skills", []),
                    "experience_level": job.get("experience_level")
                },
                "candidates": scored_candidates[:limit],
                "total_matches": len(scored_candidates)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting candidate matches: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return remote_jobs_router


def _experience_compatible(candidate_exp: str, job_exp: str) -> bool:
    """Check if candidate experience is compatible with job requirement"""
    levels = ["entry", "mid", "senior", "executive"]
    try:
        candidate_idx = levels.index(candidate_exp)
        job_idx = levels.index(job_exp)
        # Candidate can be same level or one level higher
        return candidate_idx >= job_idx and candidate_idx <= job_idx + 1
    except ValueError:
        return False
