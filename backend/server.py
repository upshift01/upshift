from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, status
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime
import uuid

from models import Resume, ResumeCreate, CoverLetter, CoverLetterCreate, ResumeAnalysisResult
from ai_service import ai_service
from odoo_integration import odoo_integration
from auth import (
    Token, UserRegister, UserLogin, UserResponse, UserInDB,
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_active_user, check_user_has_tier
)
from yoco_service import yoco_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="UpShift API", description="AI-Powered Resume and Cover Letter Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== Resume Endpoints ====================

@api_router.post("/resumes", response_model=Resume)
async def create_resume(resume_data: ResumeCreate):
    """Create a new resume"""
    try:
        resume = Resume(**resume_data.dict())
        
        # Save to MongoDB
        result = await db.resumes.insert_one(resume.dict())
        logger.info(f"Resume created with ID: {resume.id}")
        
        # Placeholder: Sync to Odoo
        odoo_id = await odoo_integration.create_resume_record(resume.dict())
        if odoo_id:
            resume.odoo_record_id = odoo_id
            await db.resumes.update_one(
                {"id": resume.id},
                {"$set": {"odoo_record_id": odoo_id}}
            )
        
        return resume
    except Exception as e:
        logger.error(f"Error creating resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/resumes/{resume_id}", response_model=Resume)
async def get_resume(resume_id: str):
    """Get a specific resume by ID"""
    resume = await db.resumes.find_one({"id": resume_id})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return Resume(**resume)


@api_router.get("/resumes", response_model=List[Resume])
async def get_all_resumes(user_id: str = None):
    """Get all resumes, optionally filtered by user_id"""
    query = {"user_id": user_id} if user_id else {}
    resumes = await db.resumes.find(query).to_list(100)
    return [Resume(**resume) for resume in resumes]


@api_router.post("/resumes/generate-pdf")
async def generate_resume_pdf(resume_data: ResumeCreate):
    """Generate PDF from resume data"""
    try:
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor='#2563eb',
            spaceAfter=12
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor='#1e40af',
            spaceAfter=6,
            spaceBefore=12
        )
        
        # Name
        story.append(Paragraph(resume_data.fullName, title_style))
        
        # Contact info
        contact = f"{resume_data.email} | {resume_data.phone}"
        if resume_data.city and resume_data.province:
            contact += f" | {resume_data.city}, {resume_data.province}"
        story.append(Paragraph(contact, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Summary
        if resume_data.summary:
            story.append(Paragraph("PROFESSIONAL SUMMARY", heading_style))
            story.append(Paragraph(resume_data.summary, styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Work Experience
        if resume_data.experiences:
            story.append(Paragraph("WORK EXPERIENCE", heading_style))
            for exp in resume_data.experiences:
                story.append(Paragraph(f"<b>{exp.title}</b> at {exp.company}", styles['Normal']))
                story.append(Paragraph(exp.duration, styles['Normal']))
                story.append(Paragraph(exp.description, styles['Normal']))
                if exp.achievements:
                    story.append(Paragraph(f"<b>Key Achievements:</b>", styles['Normal']))
                    story.append(Paragraph(exp.achievements, styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
        
        # Education
        if resume_data.education:
            story.append(Paragraph("EDUCATION", heading_style))
            for edu in resume_data.education:
                story.append(Paragraph(f"<b>{edu.degree}</b>", styles['Normal']))
                story.append(Paragraph(f"{edu.institution}, {edu.year}", styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
        
        # Skills
        if resume_data.skills:
            story.append(Paragraph("SKILLS", heading_style))
            skills_text = " • ".join([skill for skill in resume_data.skills if skill])
            story.append(Paragraph(skills_text, styles['Normal']))
        
        # Languages
        if resume_data.languages:
            story.append(Spacer(1, 0.1*inch))
            story.append(Paragraph("LANGUAGES", heading_style))
            for lang in resume_data.languages:
                if lang.language:
                    story.append(Paragraph(f"{lang.language}: {lang.proficiency}", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={resume_data.fullName}_Resume.pdf"}
        )
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AI Endpoints ====================

@api_router.post("/ai/improve-section")
async def improve_resume_section(data: dict):
    """Improve a specific section of resume using AI"""
    try:
        section = data.get("section", "")
        content = data.get("content", "")
        context = data.get("context", "")
        
        if not section or not content:
            raise HTTPException(status_code=400, detail="Section and content are required")
        
        improved_text = await ai_service.improve_resume_section(section, content, context)
        
        return {"improved_text": improved_text}
    except Exception as e:
        logger.error(f"Error improving section: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ai/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    """Analyze uploaded resume and provide feedback"""
    try:
        # Read file content
        content = await file.read()
        resume_text = content.decode('utf-8', errors='ignore')
        
        # If PDF, extract text (simplified - real implementation would use pypdf or similar)
        if file.filename.endswith('.pdf'):
            # Placeholder: In production, use pypdf2 or pdfplumber to extract text
            resume_text = "PDF text extraction would go here"
        
        # Analyze with AI
        analysis = await ai_service.analyze_resume(resume_text)
        
        return analysis
    except Exception as e:
        logger.error(f"Error analyzing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ai/job-match")
async def calculate_job_match(data: dict):
    """Calculate how well resume matches job description"""
    try:
        resume_text = data.get("resume_text", "")
        job_description = data.get("job_description", "")
        
        if not resume_text or not job_description:
            raise HTTPException(status_code=400, detail="Both resume text and job description are required")
        
        match_result = await ai_service.get_job_match_score(resume_text, job_description)
        
        return match_result
    except Exception as e:
        logger.error(f"Error calculating job match: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Cover Letter Endpoints ====================

@api_router.post("/cover-letters/generate", response_model=CoverLetter)
async def generate_cover_letter(data: CoverLetterCreate):
    """Generate AI cover letter"""
    try:
        # Generate cover letter with AI
        generated_content = await ai_service.generate_cover_letter(data.dict())
        
        # Create cover letter object
        cover_letter = CoverLetter(
            **data.dict(),
            generated_content=generated_content
        )
        
        # Save to MongoDB
        await db.cover_letters.insert_one(cover_letter.dict())
        logger.info(f"Cover letter created with ID: {cover_letter.id}")
        
        # Placeholder: Sync to Odoo
        odoo_id = await odoo_integration.create_cover_letter_record(cover_letter.dict())
        if odoo_id:
            cover_letter.odoo_record_id = odoo_id
            await db.cover_letters.update_one(
                {"id": cover_letter.id},
                {"$set": {"odoo_record_id": odoo_id}}
            )
        
        return cover_letter
    except Exception as e:
        logger.error(f"Error generating cover letter: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/cover-letters/{letter_id}", response_model=CoverLetter)
async def get_cover_letter(letter_id: str):
    """Get a specific cover letter by ID"""
    letter = await db.cover_letters.find_one({"id": letter_id})
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return CoverLetter(**letter)


@api_router.get("/cover-letters", response_model=List[CoverLetter])
async def get_all_cover_letters(user_id: str = None):
    """Get all cover letters, optionally filtered by user_id"""
    query = {"user_id": user_id} if user_id else {}
    letters = await db.cover_letters.find(query).to_list(100)
    return [CoverLetter(**letter) for letter in letters]


# ==================== Templates Endpoint ====================

@api_router.get("/templates")
async def get_templates():
    """Get all available resume templates"""
    # This could be from DB in future, for now return static data
    templates = [
        {
            "id": 1,
            "name": "Professional Executive",
            "category": "professional",
            "description": "Perfect for senior management and executive positions in South African corporates.",
            "thumbnail": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=500&fit=crop",
            "industry": "Corporate"
        },
        {
            "id": 2,
            "name": "Modern Tech",
            "category": "modern",
            "description": "Ideal for IT professionals, developers, and tech industry roles.",
            "thumbnail": "https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=400&h=500&fit=crop",
            "industry": "Technology"
        },
        {
            "id": 3,
            "name": "Creative Designer",
            "category": "creative",
            "description": "Stand out in creative industries like design, marketing, and media.",
            "thumbnail": "https://images.unsplash.com/photo-1554224311-beee460ae6fb?w=400&h=500&fit=crop",
            "industry": "Creative"
        },
        {
            "id": 4,
            "name": "ATS Optimized",
            "category": "ats",
            "description": "Designed to pass Applicant Tracking Systems used by major SA companies.",
            "thumbnail": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=500&fit=crop",
            "industry": "Any"
        },
        {
            "id": 5,
            "name": "Mining & Engineering",
            "category": "professional",
            "description": "Tailored for South Africa's mining and engineering sectors.",
            "thumbnail": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=500&fit=crop",
            "industry": "Mining"
        },
        {
            "id": 6,
            "name": "Finance Professional",
            "category": "professional",
            "description": "Perfect for banking, accounting, and financial services roles.",
            "thumbnail": "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=500&fit=crop",
            "industry": "Finance"
        }
    ]
    return templates


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
