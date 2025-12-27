from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

ai_content_router = APIRouter(prefix="/api/ai-content", tags=["AI Content"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Database reference - will be set by server.py
db = None

def set_db(database):
    global db
    db = database


async def get_current_user_with_db(token: str = Depends(oauth2_scheme)):
    """Get current user with db access"""
    from auth import get_current_user
    return await get_current_user(token, db)


# ==================== COVER LETTER GENERATION ====================

class CoverLetterRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = ""
    recipient_name: Optional[str] = "Hiring Manager"
    company_name: str
    job_title: str
    job_description: Optional[str] = ""
    key_skills: Optional[str] = ""
    why_interested: Optional[str] = ""


@ai_content_router.post("/generate-cover-letter")
async def generate_cover_letter(data: CoverLetterRequest, current_user = Depends(get_current_user_with_db)):
    """Generate a professional cover letter using AI"""
    try:
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Check if user has active tier
        if not current_user.active_tier:
            raise HTTPException(status_code=403, detail="Please purchase a plan to use AI features")
        
        session_id = f"cover-letter-{current_user.id}-{uuid.uuid4()}"
        
        system_message = """You are an expert career coach and professional cover letter writer specialising in the South African job market. 
Write compelling, personalised cover letters that:
- Use UK English spelling (e.g., organisation, specialise, colour)
- Are tailored to South African companies and culture
- Highlight relevant skills and experience
- Show genuine enthusiasm for the role
- Are professional yet personable
- Include specific details from the job description when provided
- Are concise (max 400 words)
- Format with proper paragraphs (no bullet points)"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o")

        prompt = f"""Write a professional cover letter for the following:

Applicant: {data.full_name}
Email: {data.email}
Phone: {data.phone or 'Not provided'}

Position: {data.job_title}
Company: {data.company_name}
Recipient: {data.recipient_name or 'Hiring Manager'}

Key Skills & Experience:
{data.key_skills or 'Not specified - use general professional skills'}

Why interested in this role:
{data.why_interested or 'Not specified - express general enthusiasm'}

Job Description:
{data.job_description or 'Not provided - write a general but professional letter'}

Write a complete, ready-to-send cover letter. Start with "Dear {data.recipient_name or 'Hiring Manager'}," and end with the applicant's name and contact details."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Log the generation
        await db.ai_generations.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "type": "cover_letter",
            "input": data.dict(),
            "output": response,
            "created_at": datetime.now(timezone.utc)
        })
        
        return {
            "success": True,
            "cover_letter": response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating cover letter: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate cover letter: {str(e)}")


# ==================== CV AI SUGGESTIONS ====================

class CVSuggestionRequest(BaseModel):
    field: str  # e.g., "summary", "experience", "skills"
    current_value: Optional[str] = ""
    job_title: Optional[str] = ""
    industry: Optional[str] = ""
    context: Optional[str] = ""


@ai_content_router.post("/cv-suggestion")
async def get_cv_suggestion(data: CVSuggestionRequest, current_user = Depends(get_current_user_with_db)):
    """Get AI suggestions for CV fields"""
    try:
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        session_id = f"cv-suggestion-{current_user.id}-{uuid.uuid4()}"
        
        system_message = """You are an expert CV writer and career coach specialising in the South African job market.
Provide specific, actionable suggestions to improve CV content.
- Use UK English spelling
- Be concise and practical
- Focus on ATS optimisation
- Include industry-specific keywords when relevant
- Suggest quantifiable achievements where possible"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o")

        field_prompts = {
            "summary": f"""Suggest an improved professional summary for a CV.
Current summary: {data.current_value or 'None provided'}
Job title/role: {data.job_title or 'Not specified'}
Industry: {data.industry or 'Not specified'}

Provide a compelling 2-3 sentence professional summary that highlights key strengths and is ATS-friendly.""",

            "experience": f"""Suggest improvements for this work experience description:
Current description: {data.current_value or 'None provided'}
Job title: {data.job_title or 'Not specified'}
Industry: {data.industry or 'Not specified'}

Provide 3-4 bullet points with quantifiable achievements and action verbs.""",

            "skills": f"""Suggest relevant skills to add to a CV.
Current skills: {data.current_value or 'None provided'}
Job title: {data.job_title or 'Not specified'}
Industry: {data.industry or 'Not specified'}

List 5-8 relevant hard and soft skills that are ATS-friendly for this role.""",

            "achievements": f"""Suggest achievement statements for a CV.
Context: {data.context or data.current_value or 'Not specified'}
Job title: {data.job_title or 'Not specified'}
Industry: {data.industry or 'Not specified'}

Provide 3 strong achievement statements with metrics where possible."""
        }

        prompt = field_prompts.get(data.field, f"""Provide suggestions to improve this CV section:
Field: {data.field}
Current content: {data.current_value or 'None provided'}
Job title: {data.job_title or 'Not specified'}

Provide specific, actionable improvements.""")

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "suggestion": response,
            "field": data.field
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting CV suggestion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get suggestion: {str(e)}")


# ==================== CV GENERATION ====================

class CVGenerationRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = ""
    id_number: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    province: Optional[str] = ""
    postal_code: Optional[str] = ""
    industry: Optional[str] = ""
    summary: Optional[str] = ""
    experience: Optional[List[dict]] = []
    education: Optional[List[dict]] = []
    skills: Optional[List[str]] = []
    languages: Optional[List[dict]] = []
    references: Optional[List[dict]] = []
    template_id: Optional[str] = "professional"


@ai_content_router.post("/generate-cv")
async def generate_cv(data: CVGenerationRequest, current_user = Depends(get_current_user_with_db)):
    """Generate/enhance a CV using AI"""
    try:
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Check if user has active tier
        if not current_user.active_tier:
            raise HTTPException(status_code=403, detail="Please purchase a plan to generate CVs")
        
        session_id = f"cv-gen-{current_user.id}-{uuid.uuid4()}"
        
        # If summary is empty or minimal, generate one
        enhanced_summary = data.summary
        if not data.summary or len(data.summary) < 50:
            system_message = """You are an expert CV writer. Generate a professional summary for a CV.
Use UK English. Be concise (2-3 sentences). Focus on key strengths and career objectives."""
            
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=system_message
            ).with_model("openai", "gpt-4o")
            
            experience_text = ""
            if data.experience:
                for exp in data.experience[:2]:
                    experience_text += f"- {exp.get('title', '')} at {exp.get('company', '')}\n"
            
            prompt = f"""Generate a professional summary for:
Name: {data.full_name}
Industry: {data.industry or 'Not specified'}
Recent Experience:
{experience_text or 'Not provided'}
Skills: {', '.join(data.skills[:5]) if data.skills else 'Not provided'}

Write a 2-3 sentence professional summary."""
            
            user_message = UserMessage(text=prompt)
            enhanced_summary = await chat.send_message(user_message)
        
        # Save CV to database
        cv_data = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "full_name": data.full_name,
            "email": data.email,
            "phone": data.phone,
            "id_number": data.id_number,
            "address": data.address,
            "city": data.city,
            "province": data.province,
            "postal_code": data.postal_code,
            "industry": data.industry,
            "summary": enhanced_summary,
            "experience": data.experience,
            "education": data.education,
            "skills": data.skills,
            "languages": data.languages,
            "references": data.references,
            "template_id": data.template_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.user_cvs.insert_one(cv_data)
        
        return {
            "success": True,
            "message": "CV generated successfully",
            "cv_id": cv_data["id"],
            "enhanced_summary": enhanced_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating CV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate CV: {str(e)}")


# ==================== PARTNER ENQUIRY (White-Label Page) ====================

class PartnerEnquiryRequest(BaseModel):
    company: str
    name: str
    email: str
    phone: Optional[str] = ""
    type: str  # recruitment, career_coach, hr_consultancy, other
    message: str


@ai_content_router.post("/partner-enquiry")
async def submit_partner_enquiry(data: PartnerEnquiryRequest):
    """Submit a partner/reseller enquiry"""
    try:
        enquiry = {
            "id": str(uuid.uuid4()),
            "company": data.company,
            "name": data.name,
            "email": data.email,
            "phone": data.phone,
            "business_type": data.type,
            "message": data.message,
            "status": "new",
            "created_at": datetime.now(timezone.utc),
            "followed_up_at": None
        }
        
        await db.partner_enquiries.insert_one(enquiry)
        
        logger.info(f"Partner enquiry received from {data.company} ({data.email})")
        
        # Try to send notification email
        try:
            from email_service import email_service
            
            # Get admin notification email from platform settings
            site_settings = await db.platform_settings.find_one({"key": "site_settings"}, {"_id": 0})
            admin_email = "support@upshift.works"  # Default fallback
            if site_settings and site_settings.get("contact", {}).get("email"):
                admin_email = site_settings["contact"]["email"]
            
            email_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">New Partner Enquiry</h1>
                </div>
                <div style="padding: 20px; background: #f9fafb;">
                    <p><strong>Company:</strong> {data.company}</p>
                    <p><strong>Contact:</strong> {data.name}</p>
                    <p><strong>Email:</strong> {data.email}</p>
                    <p><strong>Phone:</strong> {data.phone or 'Not provided'}</p>
                    <p><strong>Business Type:</strong> {data.type}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                    <p><strong>Message:</strong></p>
                    <p style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        {data.message.replace(chr(10), '<br>') if data.message else 'No message provided'}
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                    <p style="color: #6b7280; font-size: 12px;">
                        Received at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
                    </p>
                </div>
            </body>
            </html>
            """
            
            await email_service.send_email(
                to_email=admin_email,
                subject=f"[Partner Enquiry] {data.company} - {data.type}",
                html_body=email_content,
                raise_exceptions=False
            )
            logger.info(f"Partner enquiry notification sent to {admin_email}")
            
            # Send confirmation email to the enquirer
            confirmation_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Thank You for Your Interest!</h1>
                </div>
                <div style="padding: 20px; background: #f9fafb;">
                    <p>Dear {data.name},</p>
                    <p>Thank you for your interest in partnering with UpShift! We've received your enquiry and our partnership team will review it shortly.</p>
                    <p><strong>What happens next?</strong></p>
                    <ul>
                        <li>Our team will review your enquiry within 24-48 hours</li>
                        <li>We'll reach out to schedule a discovery call</li>
                        <li>You'll receive a personalised proposal based on your needs</li>
                    </ul>
                    <p>In the meantime, feel free to explore our <a href="https://www.upshift.works/white-label" style="color: #1e40af;">white-label solutions</a> or contact us if you have any questions.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                    <p style="color: #6b7280; font-size: 12px;">
                        This is an automated confirmation email. Please do not reply directly to this message.
                    </p>
                </div>
            </body>
            </html>
            """
            
            await email_service.send_email(
                to_email=data.email,
                subject="We've Received Your Partnership Enquiry - UpShift",
                html_body=confirmation_content,
                raise_exceptions=False
            )
            logger.info(f"Partner enquiry confirmation sent to {data.email}")
        except Exception as email_error:
            logger.warning(f"Could not send partner enquiry notification: {str(email_error)}")
        
        return {
            "success": True,
            "message": "Thank you for your interest! Our partnership team will contact you within 24-48 hours."
        }
        
    except Exception as e:
        logger.error(f"Error submitting partner enquiry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit enquiry. Please try again.")



# ==================== RESUME SKILLS GENERATOR ====================

class SkillsGeneratorRequest(BaseModel):
    industry: str
    job_title: str
    experience_level: str  # student, entry_level, team_lead, manager, executive, freelancer
    soft_skills: bool = True
    hard_skills: bool = True
    transferable_skills: bool = True
    job_description: Optional[str] = None


@ai_content_router.post("/generate-skills", response_model=dict)
async def generate_resume_skills(request: SkillsGeneratorRequest):
    """
    Generate AI-powered resume skills based on industry, job title, and experience level.
    This is a FREE tool - no authentication required.
    """
    try:
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Build skill types string
        skill_types = []
        if request.soft_skills:
            skill_types.append("Soft Skills (communication, teamwork, leadership, problem-solving, adaptability)")
        if request.hard_skills:
            skill_types.append("Hard Skills (technical abilities, tools, software, certifications)")
        if request.transferable_skills:
            skill_types.append("Transferable Skills (skills applicable across industries)")
        
        skill_types_str = ", ".join(skill_types) if skill_types else "all types of skills"
        
        # Experience level descriptions
        experience_descriptions = {
            "student": "a student or recent graduate with limited work experience",
            "entry_level": "an entry-level professional just starting their career",
            "team_lead": "a team lead with experience managing small teams",
            "manager": "a manager with experience overseeing departments or projects",
            "executive": "an executive with senior leadership experience",
            "freelancer": "a freelancer or independent contractor"
        }
        
        experience_desc = experience_descriptions.get(
            request.experience_level, 
            f"a professional at {request.experience_level} level"
        )
        
        # Build prompt
        prompt = f"""You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist. 
Generate a comprehensive list of resume skills for the following profile:

**Industry:** {request.industry}
**Job Title:** {request.job_title}
**Experience Level:** {experience_desc}
**Skill Types Requested:** {skill_types_str}
"""

        if request.job_description:
            prompt += f"""
**Target Job Description:** 
{request.job_description}

Analyze the job description and ensure the skills generated match the keywords and requirements mentioned.
"""

        prompt += """

**Instructions:**
1. Generate 15-20 highly relevant skills for this role
2. Use strong action verbs where appropriate (e.g., "Proficient in...", "Experienced with...", "Expert at...")
3. Make skills ATS-friendly by including industry-standard keywords
4. Format each skill as a bullet point
5. Group skills by category if multiple skill types are requested
6. Tailor skills to the experience level - more advanced skills for senior roles
7. Include specific tools, technologies, or methodologies relevant to the industry

**Output Format:**
Provide skills in clear bullet points grouped by category. Each skill should be concise but descriptive enough to pass ATS screening.

Generate the skills now:"""

        # Initialize LLM
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"skills-{uuid.uuid4()}",
            system_message="You are an expert resume writer and ATS optimization specialist."
        ).with_model("openai", "gpt-4o")
        
        # Generate skills
        user_message = UserMessage(prompt)
        response = await chat.send_message(user_message)
        
        # Handle response - could be string or object with content attribute
        if hasattr(response, 'content'):
            generated_skills = response.content
        else:
            generated_skills = str(response)
        
        logger.info(f"Skills generated for {request.job_title} in {request.industry}")
        
        return {
            "success": True,
            "skills": generated_skills,
            "job_title": request.job_title,
            "industry": request.industry,
            "experience_level": request.experience_level
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating skills: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate skills. Please try again.")


# ==================== CV BUILDER SKILL SUGGESTIONS ====================

class CVBuilderSkillsRequest(BaseModel):
    job_titles: Optional[str] = ""
    experience: Optional[str] = ""
    summary: Optional[str] = ""
    current_skills: Optional[List[str]] = []


@ai_content_router.post("/cv-builder-skills", response_model=dict)
async def generate_cv_builder_skills(request: CVBuilderSkillsRequest):
    """
    Generate AI-powered skill suggestions for CV Builder based on user's experience and job titles.
    """
    try:
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Build context from the request
        context_parts = []
        if request.job_titles:
            context_parts.append(f"Job Titles: {request.job_titles}")
        if request.experience:
            context_parts.append(f"Experience: {request.experience[:500]}")  # Limit length
        if request.summary:
            context_parts.append(f"Summary: {request.summary[:300]}")
        
        current_skills_str = ", ".join(request.current_skills) if request.current_skills else "None"
        
        prompt = f"""You are an expert resume writer and career coach.
Based on the following professional profile, suggest 10 relevant skills that would strengthen their resume.

{chr(10).join(context_parts)}

Current Skills: {current_skills_str}

Instructions:
1. Suggest 10 skills that are DIFFERENT from the current skills
2. Include a mix of technical/hard skills and soft skills
3. Make skills ATS-friendly and industry-relevant
4. Use concise, professional terminology
5. Return ONLY a JSON array of skill strings, nothing else

Example output format:
["Project Management", "Data Analysis", "Team Leadership", "Python", "Agile Methodology"]

Generate skills now:"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            model="anthropic/claude-sonnet-4-20250514"
        )
        
        response = chat.send_message(UserMessage(text=prompt))
        response_text = response.text.strip()
        
        # Parse the JSON array from response
        import json
        import re
        
        # Try to extract JSON array from response
        json_match = re.search(r'\[.*?\]', response_text, re.DOTALL)
        if json_match:
            skills = json.loads(json_match.group())
        else:
            # Fallback: split by newlines or commas
            skills = [s.strip().strip('"\'- ') for s in response_text.split('\n') if s.strip()]
            skills = [s for s in skills if s and len(s) < 50][:10]
        
        # Filter out duplicates and current skills
        current_lower = [s.lower() for s in request.current_skills] if request.current_skills else []
        unique_skills = []
        seen = set(current_lower)
        for skill in skills:
            skill_lower = skill.lower()
            if skill_lower not in seen and skill:
                unique_skills.append(skill)
                seen.add(skill_lower)
        
        return {
            "success": True,
            "skills": unique_skills[:10],
            "suggested_skills": unique_skills[:10]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating CV builder skills: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate skills. Please try again.")


# ==================== CV DATA EXTRACTION FROM FILE ====================

from fastapi import UploadFile, File

@ai_content_router.post("/extract-cv-data")
async def extract_cv_data(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user_with_db)
):
    """
    Extract structured CV data from an uploaded PDF or text file.
    Requires any paid tier.
    """
    try:
        import PyPDF2
        import io
        import json
        import re
        
        # Check if user has active tier
        if not current_user.active_tier:
            raise HTTPException(status_code=403, detail="Please purchase a plan to use this feature")
        
        # Read file content
        content = await file.read()
        resume_text = ""
        
        # Extract text based on file type
        if file.filename.lower().endswith('.pdf'):
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                for page in pdf_reader.pages:
                    resume_text += page.extract_text() or ""
            except Exception as pdf_error:
                logger.warning(f"PDF extraction failed: {pdf_error}, trying as text")
                resume_text = content.decode('utf-8', errors='ignore')
        elif file.filename.lower().endswith(('.txt', '.doc', '.docx')):
            resume_text = content.decode('utf-8', errors='ignore')
        else:
            resume_text = content.decode('utf-8', errors='ignore')
        
        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(
                status_code=400, 
                detail="Could not extract text from the uploaded file. Please ensure the file contains readable text."
            )
        
        # Use AI to extract structured data from the resume
        session_id = f"cv-extract-{current_user.id}-{uuid.uuid4()}"
        
        system_message = """You are an expert CV parser. Extract structured data from the resume text provided.
Return ONLY a valid JSON object with the following structure (use null for missing fields):

{
    "fullName": "string",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null",
    "summary": "string or null - professional summary if present",
    "experiences": [
        {
            "title": "job title",
            "company": "company name",
            "duration": "date range e.g. Jan 2020 - Present",
            "description": "job responsibilities and achievements"
        }
    ],
    "education": [
        {
            "degree": "degree name",
            "institution": "school/university name",
            "year": "graduation year or date range"
        }
    ],
    "skills": ["skill1", "skill2", "skill3"]
}

Be accurate and extract real data. Do not make up information."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Parse this resume and extract the structured data:

{resume_text[:8000]}

Return ONLY the JSON object, no explanation."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        response_text = response.text.strip()
        
        # Parse JSON from response
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = re.sub(r'^```(?:json)?\n?', '', response_text)
            response_text = re.sub(r'\n?```$', '', response_text)
        
        try:
            extracted_data = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                extracted_data = json.loads(json_match.group())
            else:
                raise HTTPException(status_code=500, detail="Failed to parse CV data. Please try again.")
        
        logger.info(f"CV data extracted for user {current_user.email}")
        
        return {
            "success": True,
            "data": extracted_data,
            "raw_text": resume_text[:2000]  # Return first 2000 chars for reference
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting CV data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to extract CV data. Please try again.")


# ==================== CV PROFESSIONAL SUMMARY GENERATION ====================

class CVSummaryRequest(BaseModel):
    full_name: Optional[str] = ""
    job_titles: Optional[str] = ""
    companies: Optional[str] = ""
    experience_descriptions: Optional[str] = ""
    skills: Optional[str] = ""
    education: Optional[str] = ""

@ai_content_router.post("/generate-cv-summary")
async def generate_cv_summary(
    request: CVSummaryRequest,
    current_user = Depends(get_current_user_with_db)
):
    """
    Generate a professional summary for a CV based on user's experience and skills.
    Requires any paid tier.
    """
    try:
        # Check if user has active tier
        if not current_user.active_tier:
            raise HTTPException(status_code=403, detail="Please purchase a plan to use AI features")
        
        if not request.job_titles and not request.experience_descriptions:
            raise HTTPException(status_code=400, detail="Please provide job titles or experience descriptions")
        
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        prompt = f"""You are an expert CV writer specializing in creating compelling professional summaries for the South African job market.

Create a professional summary for this person's CV:

Name: {request.full_name or 'Not provided'}
Job Titles: {request.job_titles or 'Not provided'}
Companies: {request.companies or 'Not provided'}
Experience: {request.experience_descriptions[:1500] if request.experience_descriptions else 'Not provided'}
Skills: {request.skills or 'Not provided'}
Education: {request.education or 'Not provided'}

Instructions:
- Write 3-4 sentences (50-80 words)
- Be achievement-focused and impactful
- Write in first person without using "I" (e.g., "Results-driven professional..." not "I am a results-driven...")
- Include relevant keywords for ATS systems
- Use professional and confident tone
- Tailor to the person's experience level

Write ONLY the summary text, no introduction, explanation, or quotes."""

        system_message = """You are an expert CV writer specializing in creating compelling professional summaries for the South African job market."""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"cv-summary-{current_user.id}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Handle response - could be string or object with text attribute
        if hasattr(response, 'text'):
            summary_text = response.text.strip()
        else:
            summary_text = str(response).strip()
        
        # Clean up the response if it has quotes or extra formatting
        summary_text = summary_text.strip('"\'')
        
        logger.info(f"CV summary generated for user {current_user.email}")
        
        return {
            "success": True,
            "summary": summary_text
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating CV summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate summary. Please try again.")


# ==================== CV SKILLS GENERATION ====================

class CVSkillsRequest(BaseModel):
    job_titles: Optional[str] = ""
    experience_descriptions: Optional[str] = ""

@ai_content_router.post("/generate-cv-skills")
async def generate_cv_skills(
    request: CVSkillsRequest,
    current_user = Depends(get_current_user_with_db)
):
    """
    Generate relevant skills for a CV based on job titles and experience descriptions.
    Requires any paid tier.
    """
    try:
        # Check if user has active tier
        if not current_user.active_tier:
            raise HTTPException(status_code=403, detail="Please purchase a plan to use AI features")
        
        if not request.job_titles and not request.experience_descriptions:
            raise HTTPException(status_code=400, detail="Please provide job titles or experience descriptions")
        
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        prompt = f"""You are an expert CV writer and ATS optimization specialist.
Based on the following professional profile, suggest 8-12 relevant skills for their CV.

Job Titles: {request.job_titles or 'Not provided'}
Experience Descriptions: {request.experience_descriptions[:1500] if request.experience_descriptions else 'Not provided'}

Instructions:
- Generate 8-12 skills that are relevant to the job titles and experience
- Include a mix of technical/hard skills and soft skills
- Make skills ATS-friendly and industry-relevant
- Use concise, professional terminology
- Return ONLY a JSON array of skill strings, nothing else

Example output format:
["Project Management", "Data Analysis", "Team Leadership", "Python", "Agile Methodology"]

Generate skills now:"""

        system_message = """You are an expert CV writer and ATS optimization specialist."""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"cv-skills-{current_user.id}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Handle response - could be string or object with text attribute
        if hasattr(response, 'text'):
            response_text = response.text.strip()
        else:
            response_text = str(response).strip()
        
        # Parse the JSON array from response
        import json
        import re
        
        # Try to extract JSON array from response
        json_match = re.search(r'\[.*?\]', response_text, re.DOTALL)
        if json_match:
            skills = json.loads(json_match.group())
        else:
            # Fallback: split by newlines or commas
            skills = [s.strip().strip('"\'- ') for s in response_text.split('\n') if s.strip()]
            skills = [s for s in skills if s and len(s) < 50][:12]
        
        # Clean up skills
        clean_skills = []
        for skill in skills:
            if isinstance(skill, str) and skill.strip():
                clean_skills.append(skill.strip())
        
        logger.info(f"CV skills generated for user {current_user.email}")
        
        return {
            "success": True,
            "skills": clean_skills[:12]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating CV skills: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate skills. Please try again.")
