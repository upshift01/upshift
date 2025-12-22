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
    get_current_user, get_current_active_user, check_user_has_tier,
    oauth2_scheme
)
from yoco_service import yoco_service

# Import reseller and admin routers
from reseller_routes import reseller_router, set_db as set_reseller_db
from admin_routes import admin_router, set_db as set_admin_db
from whitelabel_routes import whitelabel_router, set_db as set_whitelabel_db
from booking_routes import booking_router, set_db as set_booking_db
from scheduler_routes import scheduler_router, set_db as set_scheduler_db

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Set DB for route modules
set_reseller_db(db)
set_admin_db(db)
set_whitelabel_db(db)
set_booking_db(db)
set_scheduler_db(db)

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


# Dependency to get current user with db access
async def get_current_user_dep(token: str = Depends(oauth2_scheme)):
    """Dependency to get current user"""
    return await get_current_user(token, db)


# Dependency to check tier with db access
def check_tier_dep(required_tiers: list):
    """Dependency factory to check user tier"""
    async def verify_tier(current_user: UserResponse = Depends(get_current_user_dep)):
        if not current_user.active_tier:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This feature requires a paid plan. Please upgrade to access AI features."
            )
        if current_user.active_tier not in required_tiers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your current plan does not include this feature. Please upgrade."
            )
        return current_user
    return verify_tier


# ==================== Authentication Endpoints ====================

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserRegister):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(user_data.password)
        
        new_user = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "hashed_password": hashed_password,
            "role": "customer",
            "reseller_id": None,
            "active_tier": None,
            "tier_activation_date": None,
            "created_at": datetime.utcnow(),
            "is_active": True,
            "payment_history": []
        }
        
        await db.users.insert_one(new_user)
        logger.info(f"User registered: {user_data.email}")
        
        # Create access token
        access_token = create_access_token(data={"sub": user_data.email})
        
        # Sync to Odoo (placeholder)
        odoo_id = await odoo_integration.create_or_update_contact({
            "email": user_data.email,
            "name": user_data.full_name
        })
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(
                id=user_id,
                email=user_data.email,
                full_name=user_data.full_name,
                phone=user_data.phone,
                role="customer",
                reseller_id=None,
                active_tier=None,
                tier_activation_date=None,
                created_at=new_user["created_at"]
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/auth/login", response_model=dict)
async def login(user_data: UserLogin):
    """Login user"""
    try:
        # Find user
        user = await db.users.find_one({"email": user_data.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Verify password
        if not verify_password(user_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": user_data.email})
        
        logger.info(f"User logged in: {user_data.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user["full_name"],
                phone=user.get("phone"),
                role=user.get("role", "customer"),
                reseller_id=user.get("reseller_id"),
                active_tier=user.get("active_tier"),
                tier_activation_date=user.get("tier_activation_date"),
                created_at=user["created_at"]
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user_dep)):
    """Get current user information"""
    return current_user


# ==================== Payment Endpoints ====================

@api_router.post("/payments/create-checkout")
async def create_payment_checkout(
    tier_id: str,
    current_user: UserResponse = Depends(get_current_user_dep)
):
    """Create a Yoco checkout session for payment"""
    try:
        # Define tiers
        tiers = {
            "tier-1": {"name": "ATS Optimize", "price_cents": 89900},
            "tier-2": {"name": "Professional Package", "price_cents": 150000},
            "tier-3": {"name": "Executive Elite", "price_cents": 300000}
        }
        
        if tier_id not in tiers:
            raise HTTPException(status_code=400, detail="Invalid tier ID")
        
        tier = tiers[tier_id]
        
        # Create checkout with Yoco
        checkout = await yoco_service.create_checkout(
            amount_cents=tier["price_cents"],
            email=current_user.email,
            metadata={
                "user_id": current_user.id,
                "user_email": current_user.email,
                "user_name": current_user.full_name,
                "tier_id": tier_id,
                "tier_name": tier["name"]
            }
        )
        
        # Save pending payment to database
        payment_id = str(uuid.uuid4())
        await db.payments.insert_one({
            "id": payment_id,
            "user_id": current_user.id,
            "user_email": current_user.email,
            "tier_id": tier_id,
            "tier_name": tier["name"],
            "amount_cents": tier["price_cents"],
            "currency": "ZAR",
            "yoco_checkout_id": checkout.get("id"),
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        logger.info(f"Checkout created for user {current_user.email}: {tier_id}")
        
        return {
            "checkout_id": checkout.get("id"),
            "redirect_url": checkout.get("redirectUrl"),
            "payment_id": payment_id
        }
    except Exception as e:
        logger.error(f"Error creating checkout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/payments/verify/{checkout_id}")
async def verify_payment_status(
    checkout_id: str,
    current_user: UserResponse = Depends(get_current_user_dep)
):
    """Verify payment status and activate tier"""
    try:
        # Verify with Yoco
        is_successful = await yoco_service.verify_payment(checkout_id)
        
        if not is_successful:
            return {
                "status": "failed",
                "message": "Payment verification failed"
            }
        
        # Get payment record
        payment = await db.payments.find_one({"yoco_checkout_id": checkout_id})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment record not found")
        
        # Update payment status
        await db.payments.update_one(
            {"yoco_checkout_id": checkout_id},
            {
                "$set": {
                    "status": "succeeded",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Activate tier for user
        await db.users.update_one(
            {"id": current_user.id},
            {
                "$set": {
                    "active_tier": payment["tier_id"],
                    "tier_activation_date": datetime.utcnow()
                },
                "$push": {
                    "payment_history": payment["id"]
                }
            }
        )
        
        logger.info(f"Tier {payment['tier_id']} activated for user {current_user.email}")
        
        # Sync to Odoo (placeholder)
        await odoo_integration.create_resume_record({
            "user_email": current_user.email,
            "tier": payment["tier_name"],
            "amount": payment["amount_cents"]
        })
        
        return {
            "status": "success",
            "message": f"Payment successful! {payment['tier_name']} activated.",
            "tier_id": payment["tier_id"],
            "tier_name": payment["tier_name"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/payments/history")
async def get_payment_history(
    current_user: UserResponse = Depends(get_current_user_dep)
):
    """Get user's payment history"""
    try:
        payments = await db.payments.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).to_list(None)
        
        return {
            "payments": payments,
            "total_count": len(payments)
        }
    except Exception as e:
        logger.error(f"Error getting payment history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
async def improve_resume_section(
    data: dict,
    current_user: UserResponse = Depends(check_tier_dep(['tier-1', 'tier-2', 'tier-3']))
):
    """Improve a specific section of resume using AI (Requires paid tier)"""
    try:
        section = data.get("section", "")
        content = data.get("content", "")
        context = data.get("context", "")
        
        if not section or not content:
            raise HTTPException(status_code=400, detail="Section and content are required")
        
        improved_text = await ai_service.improve_resume_section(section, content, context)
        
        logger.info(f"AI improvement requested by user {current_user.email}")
        
        return {"improved_text": improved_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error improving section: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ai/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(check_tier_dep(['tier-1', 'tier-2', 'tier-3']))
):
    """Analyze uploaded resume and provide feedback (Requires paid tier)"""
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
        
        logger.info(f"Resume analysis requested by user {current_user.email}")
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ai/job-match")
async def calculate_job_match(
    data: dict,
    current_user: UserResponse = Depends(check_tier_dep(['tier-2', 'tier-3']))
):
    """Calculate how well resume matches job description (Requires Professional or Elite tier)"""
    try:
        resume_text = data.get("resume_text", "")
        job_description = data.get("job_description", "")
        
        if not resume_text or not job_description:
            raise HTTPException(status_code=400, detail="Both resume text and job description are required")
        
        match_result = await ai_service.get_job_match_score(resume_text, job_description)
        
        logger.info(f"Job match analysis requested by user {current_user.email}")
        
        return match_result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating job match: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Cover Letter Endpoints ====================

@api_router.post("/cover-letters/generate", response_model=CoverLetter)
async def generate_cover_letter(
    data: CoverLetterCreate,
    current_user: UserResponse = Depends(check_tier_dep(['tier-2', 'tier-3']))
):
    """Generate AI cover letter (Requires Professional or Elite tier)"""
    try:
        # Generate cover letter with AI
        generated_content = await ai_service.generate_cover_letter(data.dict())
        
        # Create cover letter object
        cover_letter = CoverLetter(
            **data.dict(),
            generated_content=generated_content
        )
        cover_letter.user_id = current_user.id
        
        # Save to MongoDB
        await db.cover_letters.insert_one(cover_letter.dict())
        logger.info(f"Cover letter created for user {current_user.email}")
        
        # Placeholder: Sync to Odoo
        odoo_id = await odoo_integration.create_cover_letter_record(cover_letter.dict())
        if odoo_id:
            cover_letter.odoo_record_id = odoo_id
            await db.cover_letters.update_one(
                {"id": cover_letter.id},
                {"$set": {"odoo_record_id": odoo_id}}
            )
        
        return cover_letter
    except HTTPException:
        raise
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
            "name": "ATS Classic Professional",
            "category": "ats",
            "description": "Clean, ATS-friendly format with clear section headers. Perfect for corporate roles and passing automated screening systems.",
            "image": "https://images.unsplash.com/photo-1698047681432-006d2449c631?w=400&h=500&fit=crop",
            "industry": "Corporate"
        },
        {
            "id": 2,
            "name": "ATS Simple & Clean",
            "category": "ats",
            "description": "Minimalist ATS-optimized design with standard fonts and clear hierarchy. Ideal for all industries.",
            "image": "https://images.unsplash.com/photo-1758518730327-98070967caab?w=400&h=500&fit=crop",
            "industry": "Any"
        },
        {
            "id": 3,
            "name": "ATS Executive Format",
            "category": "ats",
            "description": "Professional ATS-compatible template for senior management positions. Clear formatting with achievement focus.",
            "image": "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?w=400&h=500&fit=crop",
            "industry": "Executive"
        },
        {
            "id": 4,
            "name": "ATS Tech Professional",
            "category": "ats",
            "description": "Technical skills-focused ATS template for IT and software roles. Clean sections for certifications and projects.",
            "image": "https://images.pexels.com/photos/5989926/pexels-photo-5989926.jpeg?w=400&h=500&fit=crop",
            "industry": "Technology"
        },
        {
            "id": 5,
            "name": "ATS Finance & Banking",
            "category": "ats",
            "description": "Conservative ATS-friendly format for financial services. Emphasizes qualifications and achievements.",
            "image": "https://images.unsplash.com/photo-1562564055-71e051d33c19?w=400&h=500&fit=crop",
            "industry": "Finance"
        },
        {
            "id": 6,
            "name": "ATS Healthcare Professional",
            "category": "ats",
            "description": "Medical and healthcare optimized ATS template with sections for licenses and certifications.",
            "image": "https://images.unsplash.com/photo-1763729805496-b5dbf7f00c79?w=400&h=500&fit=crop",
            "industry": "Healthcare"
        }
    ]
    return templates


# Include the router in the main app
app.include_router(api_router)

# Include reseller and admin routers
app.include_router(reseller_router)
app.include_router(admin_router)
app.include_router(whitelabel_router)
app.include_router(booking_router)
app.include_router(scheduler_router)

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


@app.on_event("startup")
async def startup_event():
    """Initialize database and create default super admin if not exists"""
    try:
        # Create indexes for better performance
        await db.users.create_index("email", unique=True)
        await db.users.create_index("role")
        await db.resellers.create_index("subdomain", unique=True)
        await db.resellers.create_index("custom_domain", sparse=True)
        await db.reseller_invoices.create_index([("reseller_id", 1), ("period", 1)])
        
        # Create default super admin if not exists
        default_admin_email = "admin@upshift.co.za"
        existing_admin = await db.users.find_one({"email": default_admin_email})
        
        if not existing_admin:
            admin_id = str(uuid.uuid4())
            hashed_password = get_password_hash("admin123")  # Change in production!
            
            admin_user = {
                "id": admin_id,
                "email": default_admin_email,
                "full_name": "Super Admin",
                "hashed_password": hashed_password,
                "role": "super_admin",
                "active_tier": None,
                "created_at": datetime.utcnow(),
                "is_active": True,
                "payment_history": []
            }
            
            await db.users.insert_one(admin_user)
            logger.info(f"Default super admin created: {default_admin_email}")
        
        logger.info("Database startup complete")
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
