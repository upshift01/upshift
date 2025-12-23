"""
Content Routes - Serves dynamic content from MongoDB database
Includes CV templates, cover letter templates, testimonials, features, industries, etc.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import logging

logger = logging.getLogger(__name__)

content_router = APIRouter(prefix="/api/content", tags=["Content"])

# Database reference - set from server.py
db = None

def set_db(database):
    global db
    db = database


# ==================== Pydantic Models ====================

class CVTemplate(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    image: str
    category: str
    industry: str
    is_active: bool = True


class CoverLetterTemplate(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    image: str
    category: str
    industry: str
    tone: str
    is_active: bool = True


class Testimonial(BaseModel):
    id: Optional[str] = None
    name: str
    role: str
    location: str
    content: str
    rating: int = 5
    avatar: str
    is_active: bool = True


class Feature(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    icon: str
    color: str
    order: int = 0
    is_active: bool = True


class SampleImprovement(BaseModel):
    id: Optional[str] = None
    original: str
    improved: str
    category: str
    is_active: bool = True


class Industry(BaseModel):
    id: Optional[str] = None
    name: str
    order: int = 0
    is_active: bool = True


# ==================== CV Templates ====================

@content_router.get("/cv-templates", response_model=dict)
async def get_cv_templates(
    category: Optional[str] = None,
    industry: Optional[str] = None
):
    """Get all active CV templates"""
    try:
        query = {"is_active": True}
        if category:
            query["category"] = category
        if industry:
            query["industry"] = industry
        
        templates = await db.cv_templates.find(query, {"_id": 0}).to_list(100)
        
        # If no templates in DB, return empty list (frontend will handle fallback)
        return {"templates": templates, "total": len(templates)}
    except Exception as e:
        logger.error(f"Error fetching CV templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@content_router.get("/cv-templates/{template_id}", response_model=dict)
async def get_cv_template(template_id: str):
    """Get a specific CV template"""
    try:
        template = await db.cv_templates.find_one(
            {"id": template_id, "is_active": True},
            {"_id": 0}
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching CV template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Cover Letter Templates ====================

@content_router.get("/cover-letter-templates", response_model=dict)
async def get_cover_letter_templates(
    category: Optional[str] = None,
    industry: Optional[str] = None
):
    """Get all active cover letter templates"""
    try:
        query = {"is_active": True}
        if category:
            query["category"] = category
        if industry:
            query["industry"] = industry
        
        templates = await db.cover_letter_templates.find(query, {"_id": 0}).to_list(100)
        return {"templates": templates, "total": len(templates)}
    except Exception as e:
        logger.error(f"Error fetching cover letter templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Testimonials ====================

@content_router.get("/testimonials", response_model=dict)
async def get_testimonials(limit: int = 12):
    """Get active testimonials"""
    try:
        testimonials = await db.testimonials.find(
            {"is_active": True},
            {"_id": 0}
        ).limit(limit).to_list(limit)
        return {"testimonials": testimonials, "total": len(testimonials)}
    except Exception as e:
        logger.error(f"Error fetching testimonials: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Features ====================

@content_router.get("/features", response_model=dict)
async def get_features():
    """Get active features for homepage"""
    try:
        features = await db.features.find(
            {"is_active": True},
            {"_id": 0}
        ).sort("order", 1).to_list(20)
        return {"features": features, "total": len(features)}
    except Exception as e:
        logger.error(f"Error fetching features: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Sample Improvements ====================

@content_router.get("/sample-improvements", response_model=dict)
async def get_sample_improvements():
    """Get sample CV improvements for homepage"""
    try:
        improvements = await db.sample_improvements.find(
            {"is_active": True},
            {"_id": 0}
        ).to_list(20)
        return {"improvements": improvements, "total": len(improvements)}
    except Exception as e:
        logger.error(f"Error fetching sample improvements: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Industries ====================

@content_router.get("/industries", response_model=dict)
async def get_industries():
    """Get list of industries"""
    try:
        industries = await db.industries.find(
            {"is_active": True},
            {"_id": 0}
        ).sort("order", 1).to_list(50)
        
        # Return just names for backward compatibility
        industry_names = [ind["name"] for ind in industries]
        return {"industries": industry_names, "total": len(industry_names)}
    except Exception as e:
        logger.error(f"Error fetching industries: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Seed Data Endpoint (Admin Only) ====================

@content_router.post("/seed", response_model=dict)
async def seed_content_data():
    """
    Seed initial content data if collections are empty.
    This is an internal endpoint for initial data population.
    """
    try:
        results = {}
        
        # Check and seed CV templates
        cv_count = await db.cv_templates.count_documents({})
        if cv_count == 0:
            cv_templates = get_initial_cv_templates()
            if cv_templates:
                await db.cv_templates.insert_many(cv_templates)
                results["cv_templates"] = len(cv_templates)
        else:
            results["cv_templates"] = f"Already has {cv_count} templates"
        
        # Check and seed cover letter templates
        cl_count = await db.cover_letter_templates.count_documents({})
        if cl_count == 0:
            cl_templates = get_initial_cover_letter_templates()
            if cl_templates:
                await db.cover_letter_templates.insert_many(cl_templates)
                results["cover_letter_templates"] = len(cl_templates)
        else:
            results["cover_letter_templates"] = f"Already has {cl_count} templates"
        
        # Check and seed testimonials
        test_count = await db.testimonials.count_documents({})
        if test_count == 0:
            testimonials = get_initial_testimonials()
            if testimonials:
                await db.testimonials.insert_many(testimonials)
                results["testimonials"] = len(testimonials)
        else:
            results["testimonials"] = f"Already has {test_count} testimonials"
        
        # Check and seed features
        feat_count = await db.features.count_documents({})
        if feat_count == 0:
            features = get_initial_features()
            if features:
                await db.features.insert_many(features)
                results["features"] = len(features)
        else:
            results["features"] = f"Already has {feat_count} features"
        
        # Check and seed sample improvements
        imp_count = await db.sample_improvements.count_documents({})
        if imp_count == 0:
            improvements = get_initial_sample_improvements()
            if improvements:
                await db.sample_improvements.insert_many(improvements)
                results["sample_improvements"] = len(improvements)
        else:
            results["sample_improvements"] = f"Already has {imp_count} improvements"
        
        # Check and seed industries
        ind_count = await db.industries.count_documents({})
        if ind_count == 0:
            industries = get_initial_industries()
            if industries:
                await db.industries.insert_many(industries)
                results["industries"] = len(industries)
        else:
            results["industries"] = f"Already has {ind_count} industries"
        
        logger.info(f"Content seed completed: {results}")
        return {"success": True, "seeded": results}
        
    except Exception as e:
        logger.error(f"Error seeding content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Initial Data Functions ====================

def get_initial_cv_templates():
    """Return initial CV templates data"""
    return [
        {"id": str(uuid.uuid4()), "name": "ATS Classic Professional", "description": "Clean, ATS-friendly format with clear section headers. Perfect for corporate roles and passing automated screening systems.", "image": "https://images.unsplash.com/photo-1698047681432-006d2449c631?w=400&h=500&fit=crop", "category": "ats", "industry": "Corporate", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Simple & Clean", "description": "Minimalist ATS-optimised design with standard fonts and clear hierarchy. Ideal for all industries.", "image": "https://images.unsplash.com/photo-1758518730327-98070967caab?w=400&h=500&fit=crop", "category": "ats", "industry": "Any", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Executive Format", "description": "Professional ATS-compatible template for senior management positions. Clear formatting with achievement focus.", "image": "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?w=400&h=500&fit=crop", "category": "ats", "industry": "Executive", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Tech Professional", "description": "Technical skills-focused ATS template for IT and software roles. Clean sections for certifications and projects.", "image": "https://images.pexels.com/photos/5989926/pexels-photo-5989926.jpeg?w=400&h=500&fit=crop", "category": "ats", "industry": "Technology", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Finance & Banking", "description": "Conservative ATS-friendly format for financial services. Emphasizes qualifications and achievements.", "image": "https://images.unsplash.com/photo-1562564055-71e051d33c19?w=400&h=500&fit=crop", "category": "ats", "industry": "Finance", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Healthcare Professional", "description": "Medical and healthcare optimised ATS template with sections for licences and certifications.", "image": "https://images.unsplash.com/photo-1763729805496-b5dbf7f00c79?w=400&h=500&fit=crop", "category": "ats", "industry": "Healthcare", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Engineering Format", "description": "Perfect for engineers and technical professionals. ATS-compliant with clear project sections.", "image": "https://images.pexels.com/photos/7688374/pexels-photo-7688374.jpeg?w=400&h=500&fit=crop", "category": "ats", "industry": "Engineering", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Education & Training", "description": "ATS-friendly template for educators and trainers with emphasis on qualifications and experience.", "image": "https://images.pexels.com/photos/7641842/pexels-photo-7641842.jpeg?w=400&h=500&fit=crop", "category": "ats", "industry": "Education", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Legal Professional", "description": "Professional ATS template for legal sector with sections for bar admissions and case highlights.", "image": "https://images.unsplash.com/photo-1700887937204-69f8b8400ace?w=400&h=500&fit=crop", "category": "ats", "industry": "Legal", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Sales & Marketing", "description": "Results-focused ATS template highlighting achievements and metrics. Perfect for sales professionals.", "image": "https://images.unsplash.com/photo-1700887944225-f148dd124305?w=400&h=500&fit=crop", "category": "ats", "industry": "Sales", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Entry Level", "description": "Perfect for graduates and entry-level positions. ATS-optimised with education and skills focus.", "image": "https://images.pexels.com/photos/5705982/pexels-photo-5705982.jpeg?w=400&h=500&fit=crop", "category": "ats", "industry": "Entry Level", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Manufacturing & Operations", "description": "Industrial and operations-focused ATS template. Clear sections for safety certifications.", "image": "https://images.pexels.com/photos/6373048/pexels-photo-6373048.jpeg?w=400&h=500&fit=crop", "category": "ats", "industry": "Manufacturing", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Mining Professional", "description": "Specialized ATS template for South Africa's mining sector with safety and certification sections.", "image": "https://images.unsplash.com/photo-1653038417332-6db0ff9d4bfb?w=400&h=500&fit=crop", "category": "ats", "industry": "Mining", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Project Manager", "description": "Project management focused ATS template highlighting methodologies, certifications, and deliverables.", "image": "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=500&fit=crop", "category": "ats", "industry": "Project Management", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "ATS Retail & Hospitality", "description": "Customer service focused ATS template for retail and hospitality professionals.", "image": "https://images.pexels.com/photos/3760072/pexels-photo-3760072.jpeg?w=400&h=500&fit=crop", "category": "ats", "industry": "Retail", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Professional Executive", "description": "Conservative professional format perfect for senior management and executive positions in South African corporates.", "image": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=500&fit=crop", "category": "professional", "industry": "Executive", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Professional Finance", "description": "Traditional professional design ideal for banking, accounting, and financial services roles.", "image": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=500&fit=crop", "category": "professional", "industry": "Finance", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Professional Corporate", "description": "Classic professional template for corporate environments and traditional industries.", "image": "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=500&fit=crop", "category": "professional", "industry": "Corporate", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Modern Professional", "description": "Contemporary design with subtle color accents while maintaining ATS compatibility.", "image": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=500&fit=crop", "category": "modern", "industry": "Any", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Modern Tech", "description": "Ideal for IT professionals with modern styling and ATS-safe formatting.", "image": "https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=400&h=500&fit=crop", "category": "modern", "industry": "Technology", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Creative Designer", "description": "Stand out in creative industries with unique design while staying ATS-friendly.", "image": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=500&fit=crop", "category": "creative", "industry": "Creative", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Creative Marketing", "description": "Bold and innovative design for marketing professionals and creative roles.", "image": "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=400&h=500&fit=crop", "category": "creative", "industry": "Marketing", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]


def get_initial_cover_letter_templates():
    """Return initial cover letter templates data"""
    return [
        {"id": str(uuid.uuid4()), "name": "Professional Corporate", "description": "Formal and polished cover letter template ideal for corporate and executive positions. Clean structure with professional tone.", "image": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=500&fit=crop", "category": "professional", "industry": "Corporate", "tone": "Formal", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Modern Professional", "description": "Contemporary design with a fresh approach while maintaining professionalism. Perfect for modern companies.", "image": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=500&fit=crop", "category": "modern", "industry": "Any", "tone": "Professional", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Tech Industry", "description": "Tailored for IT and tech roles with emphasis on skills and innovation. Direct and results-focused.", "image": "https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=400&h=500&fit=crop", "category": "professional", "industry": "Technology", "tone": "Direct", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Finance & Banking", "description": "Conservative and trustworthy format for financial services. Emphasizes reliability and achievements.", "image": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=500&fit=crop", "category": "professional", "industry": "Finance", "tone": "Formal", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Creative Professional", "description": "Stand out in creative industries with a unique yet professional approach. Shows personality.", "image": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=500&fit=crop", "category": "creative", "industry": "Creative", "tone": "Engaging", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Entry Level / Graduate", "description": "Perfect for fresh graduates and career starters. Highlights education, potential, and enthusiasm.", "image": "https://images.pexels.com/photos/5705982/pexels-photo-5705982.jpeg?w=400&h=500&fit=crop", "category": "modern", "industry": "Entry Level", "tone": "Enthusiastic", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sales & Marketing", "description": "Results-driven template that showcases achievements and persuasive communication skills.", "image": "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=400&h=500&fit=crop", "category": "modern", "industry": "Sales", "tone": "Persuasive", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Healthcare Professional", "description": "Compassionate yet professional format for medical and healthcare positions.", "image": "https://images.unsplash.com/photo-1763729805496-b5dbf7f00c79?w=400&h=500&fit=crop", "category": "professional", "industry": "Healthcare", "tone": "Compassionate", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Engineering & Technical", "description": "Clear and structured format for engineering and technical roles. Focus on projects and skills.", "image": "https://images.pexels.com/photos/7688374/pexels-photo-7688374.jpeg?w=400&h=500&fit=crop", "category": "professional", "industry": "Engineering", "tone": "Technical", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Executive Leadership", "description": "Premium template for C-suite and senior management positions. Emphasizes strategic vision and leadership.", "image": "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?w=400&h=500&fit=crop", "category": "professional", "industry": "Executive", "tone": "Strategic", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Mining & Resources", "description": "Industry-specific template for South Africa's mining sector. Highlights safety and certifications.", "image": "https://images.unsplash.com/photo-1653038417332-6db0ff9d4bfb?w=400&h=500&fit=crop", "category": "professional", "industry": "Mining", "tone": "Professional", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Education & Training", "description": "Warm and knowledgeable tone perfect for educators and trainers.", "image": "https://images.pexels.com/photos/7641842/pexels-photo-7641842.jpeg?w=400&h=500&fit=crop", "category": "professional", "industry": "Education", "tone": "Warm", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]


def get_initial_testimonials():
    """Return initial testimonials data"""
    return [
        {"id": str(uuid.uuid4()), "name": "Thabo Makena", "role": "Software Developer", "location": "Johannesburg", "content": "UpShift's AI helped me land interviews at 3 major tech companies in Sandton. The suggestions were spot-on for the SA market!", "rating": 5, "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sarah van der Merwe", "role": "Marketing Manager", "location": "Cape Town", "content": "The cover letter generator saved me hours. I got a response within 2 days from my dream company!", "rating": 5, "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sizwe Dlamini", "role": "Financial Analyst", "location": "Durban", "content": "As a recent graduate, UpShift helped me create a professional CV that got me noticed. Highly recommend!", "rating": 5, "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Lerato Molefe", "role": "HR Director", "location": "Pretoria", "content": "After 6 months of job hunting, I used UpShift and got 5 interview calls in 2 weeks! The ATS optimization really works.", "rating": 5, "avatar": "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Johan Pretorius", "role": "Civil Engineer", "location": "Bloemfontein", "content": "The Executive Elite package was worth every cent. The strategy call helped me negotiate a 30% higher salary!", "rating": 5, "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Nomvula Khumalo", "role": "Registered Nurse", "location": "East London", "content": "I was struggling to get past the ATS filters. UpShift's checker identified all the issues - now I'm working at my dream hospital!", "rating": 5, "avatar": "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Ahmed Patel", "role": "Chartered Accountant", "location": "Sandton", "content": "Switched from Big 4 to industry in just 3 weeks using UpShift. The LinkedIn optimization tips were game-changing.", "rating": 5, "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Blessing Moyo", "role": "Data Scientist", "location": "Midrand", "content": "From Zimbabwe to landing a job at a top SA fintech - UpShift made my international experience shine on my CV.", "rating": 5, "avatar": "https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Chantel du Plessis", "role": "Operations Manager", "location": "Stellenbosch", "content": "The AI suggestions transformed my 5-page CV into a powerful 2-page document. Got promoted within 3 months of using it!", "rating": 5, "avatar": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Mpho Tau", "role": "Sales Executive", "location": "Polokwane", "content": "I was retrenched during COVID. UpShift helped me pivot my career - now earning 40% more in tech sales!", "rating": 5, "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Fatima Abrahams", "role": "UX Designer", "location": "Sea Point, Cape Town", "content": "The cover letter AI understood exactly what creative roles need. Landed a remote position at an international agency!", "rating": 5, "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Andile Nkosi", "role": "Project Manager (PMP)", "location": "Umhlanga, Durban", "content": "12 years experience but my CV was outdated. UpShift modernized it - hired as Senior PM at a construction giant!", "rating": 5, "avatar": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]


def get_initial_features():
    """Return initial features data"""
    return [
        {"id": str(uuid.uuid4()), "title": "AI Resume Improvement", "description": "Upload your existing CV and get AI-powered suggestions to make it stand out in the South African job market.", "icon": "Sparkles", "color": "blue", "order": 1, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Smart Resume Builder", "description": "Create a professional CV from scratch with real-time AI assistance tailored for SA employers.", "icon": "FileText", "color": "green", "order": 2, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Cover Letter Generator", "description": "Generate compelling, personalized cover letters that match job descriptions perfectly.", "icon": "Mail", "color": "purple", "order": 3, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Job Matching", "description": "Match your resume to job descriptions and get optimization suggestions for better results.", "icon": "Target", "color": "orange", "order": 4, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "ATS Optimization", "description": "Ensure your CV passes Applicant Tracking Systems used by major South African companies.", "icon": "CheckCircle", "color": "teal", "order": 5, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Multiple Formats", "description": "Export your CV in PDF or Word format, ready to send to potential employers.", "icon": "Download", "color": "pink", "order": 6, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]


def get_initial_sample_improvements():
    """Return initial sample improvements data"""
    return [
        {"id": str(uuid.uuid4()), "original": "Worked on various projects", "improved": "Led 5+ cross-functional projects, delivering results 20% ahead of schedule and 15% under budget", "category": "Achievement Quantification", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "original": "Good communication skills", "improved": "Presented quarterly reports to C-suite executives, facilitating data-driven decisions that increased operational efficiency by 25%", "category": "Specific Examples", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "original": "Team player", "improved": "Collaborated with 8-member diverse team to implement agile methodology, reducing project delivery time by 30%", "category": "Impact & Results", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]


def get_initial_industries():
    """Return initial industries data"""
    industries = [
        "Technology", "Finance", "Mining", "Engineering", "Healthcare", "Education",
        "Retail", "Manufacturing", "Telecommunications", "Hospitality", "Legal", "Marketing"
    ]
    return [
        {"id": str(uuid.uuid4()), "name": ind, "order": idx, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
        for idx, ind in enumerate(industries)
    ]
