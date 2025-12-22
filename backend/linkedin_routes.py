from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
from auth import get_current_user, oauth2_scheme
from linkedin_service import linkedin_oauth_service
from linkedin_ai_service import linkedin_ai_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/linkedin", tags=["linkedin"])

# Database will be set by the main server
db = None

def set_db(database):
    """Set the database connection"""
    global db
    db = database

# Dependency to get current user with db access
async def get_current_user_dep(token: str = Depends(oauth2_scheme)):
    """Dependency to get current user"""
    return await get_current_user(token, db)

# Request Models
class LinkedInProfileData(BaseModel):
    full_name: str
    email: Optional[str] = None
    headline: Optional[str] = None
    summary: Optional[str] = None
    location: Optional[str] = None
    work_experience: Optional[List[Dict]] = []
    education: Optional[List[Dict]] = []
    skills: Optional[List[str]] = []
    certifications: Optional[List[str]] = []

class CreateProfileRequest(BaseModel):
    full_name: str
    current_title: str
    target_role: Optional[str] = None
    industry: str
    years_experience: int
    key_skills: List[str]
    achievements: Optional[List[str]] = []
    education: Optional[List[Dict]] = []
    work_history: Optional[List[Dict]] = []
    career_goals: Optional[str] = None

class EnhanceProfileRequest(BaseModel):
    headline: Optional[str] = None
    about: Optional[str] = None
    experience: Optional[List[Dict]] = []
    skills: Optional[List[str]] = []
    target_role: Optional[str] = None

class GenerateSectionRequest(BaseModel):
    section_type: str  # headline, about, experience
    current_title: Optional[str] = None
    target_role: Optional[str] = None
    industry: Optional[str] = None
    key_skills: Optional[List[str]] = []
    achievements: Optional[List[str]] = []
    company: Optional[str] = None
    job_description: Optional[str] = None

# OAuth Routes
@router.get("/oauth/status")
async def get_oauth_status():
    """Check if LinkedIn OAuth is configured"""
    return {
        "configured": linkedin_oauth_service.is_configured(),
        "message": "LinkedIn OAuth is configured" if linkedin_oauth_service.is_configured() else "LinkedIn OAuth credentials not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to .env"
    }

@router.get("/oauth/authorize")
async def authorize_linkedin(current_user: dict = Depends(get_current_user)):
    """Initiate LinkedIn OAuth flow"""
    if not linkedin_oauth_service.is_configured():
        raise HTTPException(
            status_code=503, 
            detail="LinkedIn OAuth not configured. Please contact support."
        )
    
    result = linkedin_oauth_service.get_authorization_url(current_user["id"])
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    
    return result

@router.get("/oauth/callback")
async def linkedin_callback(
    code: str = Query(...),
    state: str = Query(...)
):
    """Handle LinkedIn OAuth callback"""
    try:
        token_data = await linkedin_oauth_service.exchange_code_for_token(code, state)
        access_token = token_data.get("access_token")
        
        # Fetch profile data
        profile = await linkedin_oauth_service.get_profile(access_token)
        
        # Redirect to frontend with success
        frontend_url = f"http://localhost:3000/dashboard?linkedin_connected=true"
        return RedirectResponse(url=frontend_url)
        
    except ValueError as e:
        logger.error(f"OAuth callback error: {str(e)}")
        return RedirectResponse(url="http://localhost:3000/dashboard?linkedin_error=true")
    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
        return RedirectResponse(url="http://localhost:3000/dashboard?linkedin_error=true")

# AI-Powered LinkedIn Tools Routes
@router.post("/convert-to-resume")
async def convert_linkedin_to_resume(
    profile_data: LinkedInProfileData,
    current_user: dict = Depends(get_current_user)
):
    """
    Convert LinkedIn profile data to a professional resume.
    Can be used with manually entered data or OAuth-fetched data.
    """
    try:
        linkedin_dict = profile_data.dict()
        result = await linkedin_ai_service.convert_linkedin_to_resume(linkedin_dict)
        return {
            "success": True,
            "resume": result
        }
    except Exception as e:
        logger.error(f"Error converting LinkedIn to resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-profile")
async def create_linkedin_profile(
    request: CreateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new LinkedIn profile from scratch based on user's background.
    """
    try:
        user_data = request.dict()
        result = await linkedin_ai_service.create_linkedin_profile(user_data)
        return {
            "success": True,
            "profile": result
        }
    except Exception as e:
        logger.error(f"Error creating LinkedIn profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enhance-profile")
async def enhance_linkedin_profile(
    request: EnhanceProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze and enhance existing LinkedIn profile sections.
    """
    try:
        profile_data = {
            "headline": request.headline,
            "about": request.about,
            "experience": request.experience,
            "skills": request.skills
        }
        result = await linkedin_ai_service.enhance_linkedin_profile(
            profile_data, 
            request.target_role
        )
        return {
            "success": True,
            "analysis": result
        }
    except Exception as e:
        logger.error(f"Error enhancing LinkedIn profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-section")
async def generate_linkedin_section(
    request: GenerateSectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a specific LinkedIn section (headline, about, experience).
    """
    valid_sections = ["headline", "about", "experience"]
    if request.section_type not in valid_sections:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid section type. Must be one of: {valid_sections}"
        )
    
    try:
        user_info = request.dict()
        result = await linkedin_ai_service.generate_linkedin_section(
            request.section_type,
            user_info
        )
        return {
            "success": True,
            "section_type": request.section_type,
            "content": result
        }
    except Exception as e:
        logger.error(f"Error generating LinkedIn section: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
