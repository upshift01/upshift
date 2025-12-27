"""
CV Processing Routes - Upload, Extract, Analyze, and Enhance CVs
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
import os
import logging
import io
import re
from dotenv import load_dotenv

load_dotenv()

# PDF and DOCX processing
try:
    import PyPDF2
    from docx import Document
except ImportError:
    PyPDF2 = None
    Document = None

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

cv_processing_router = APIRouter(prefix="/api/cv", tags=["CV Processing"])

# Database reference
db = None

def set_db(database):
    global db
    db = database

# Pydantic Models
class CVAnalysisResponse(BaseModel):
    success: bool
    overall_score: int
    ats_score: int
    impact_score: int
    clarity_score: int
    keyword_score: int
    improvements: List[Dict[str, Any]]
    extracted_text: Optional[str] = None

class CVExtractResponse(BaseModel):
    success: bool
    extracted_data: Dict[str, Any]
    enhanced_data: Dict[str, Any]
    suggestions: List[str]


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = Document(io.BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting DOCX text: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Could not read DOCX: {str(e)}")


@cv_processing_router.post("/analyze")
async def analyze_cv(file: UploadFile = File(...)):
    """
    Analyze an uploaded CV and provide improvement suggestions.
    Returns scores and detailed recommendations.
    """
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_ext = file.filename.lower().split('.')[-1]
        if file_ext not in ['pdf', 'docx', 'doc', 'txt']:
            raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported")
        
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        if file_ext == 'pdf':
            extracted_text = extract_text_from_pdf(content)
        elif file_ext == 'txt':
            # Handle TXT files directly
            try:
                extracted_text = content.decode('utf-8')
            except UnicodeDecodeError:
                extracted_text = content.decode('latin-1')
        else:
            extracted_text = extract_text_from_docx(content)
        
        if not extracted_text or len(extracted_text) < 50:
            raise HTTPException(status_code=400, detail="Could not extract sufficient text from the CV")
        
        # Use AI to analyze the CV
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        analysis_prompt = f"""Analyze this CV/Resume and provide detailed feedback. Return your response in the following JSON format ONLY (no markdown, no explanation, just valid JSON):

{{
    "overall_score": <number 0-100>,
    "ats_score": <number 0-100 - how well it passes ATS systems>,
    "impact_score": <number 0-100 - strength of achievements>,
    "clarity_score": <number 0-100 - readability and structure>,
    "keyword_score": <number 0-100 - industry keyword presence>,
    "improvements": [
        {{
            "category": "<Keywords|Achievements|Formatting|Summary|Skills|Experience|Education>",
            "severity": "<high|medium|low>",
            "issue": "<brief description of the issue>",
            "suggestion": "<specific actionable suggestion>",
            "impact": "<expected improvement, e.g. '+15% ATS Score'>"
        }}
    ]
}}

Provide 5-8 specific, actionable improvements. Focus on South African job market context.

CV Content:
{extracted_text[:8000]}"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"cv-analysis-{uuid4()}",
            system_message="You are an expert CV analyst specializing in South African job market. Always respond with valid JSON only."
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=analysis_prompt))
        
        # Parse the AI response
        import json
        try:
            # Clean the response - remove any markdown formatting
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            analysis_data = json.loads(clean_response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {response[:500]}")
            # Return default scores if parsing fails
            analysis_data = {
                "overall_score": 70,
                "ats_score": 65,
                "impact_score": 68,
                "clarity_score": 72,
                "keyword_score": 60,
                "improvements": [
                    {
                        "category": "Keywords",
                        "severity": "high",
                        "issue": "CV analysis completed but detailed parsing failed",
                        "suggestion": "Please try uploading again or contact support",
                        "impact": "N/A"
                    }
                ]
            }
        
        # Save analysis to database
        await db.cv_analyses.insert_one({
            "id": str(uuid4()),
            "filename": file.filename,
            "analysis": analysis_data,
            "created_at": datetime.now(timezone.utc)
        })
        
        return {
            "success": True,
            "overall_score": analysis_data.get("overall_score", 70),
            "ats_score": analysis_data.get("ats_score", 65),
            "impact_score": analysis_data.get("impact_score", 68),
            "clarity_score": analysis_data.get("clarity_score", 72),
            "keyword_score": analysis_data.get("keyword_score", 60),
            "improvements": analysis_data.get("improvements", []),
            "extracted_text": extracted_text[:2000]  # Return first 2000 chars for reference
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CV analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@cv_processing_router.post("/extract-and-enhance")
async def extract_and_enhance_cv(file: UploadFile = File(...)):
    """
    Extract content from uploaded CV and enhance it with AI.
    Returns structured data ready to populate the CV builder form.
    """
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_ext = file.filename.lower().split('.')[-1]
        if file_ext not in ['pdf', 'docx', 'doc']:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
        
        # Read file content
        content = await file.read()
        
        # Extract text
        if file_ext == 'pdf':
            extracted_text = extract_text_from_pdf(content)
        else:
            extracted_text = extract_text_from_docx(content)
        
        if not extracted_text or len(extracted_text) < 50:
            raise HTTPException(status_code=400, detail="Could not extract sufficient text from the CV")
        
        # Use AI to extract and enhance
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        extraction_prompt = f"""Extract information from this CV and enhance it professionally. Return ONLY valid JSON (no markdown, no explanation):

{{
    "fullName": "<extracted full name>",
    "email": "<extracted email or empty string>",
    "phone": "<extracted phone or empty string>",
    "address": "<extracted address or empty string>",
    "city": "<extracted city or empty string>",
    "province": "<extracted province/state or empty string>",
    "industry": "<detected industry, e.g. Information Technology, Finance, Healthcare>",
    "summary": "<enhanced professional summary - make it compelling, 2-3 sentences>",
    "experiences": [
        {{
            "title": "<job title>",
            "company": "<company name>",
            "duration": "<duration, e.g. Jan 2020 - Present>",
            "description": "<enhanced job description - make it impactful>",
            "achievements": "<key achievements with metrics where possible>"
        }}
    ],
    "education": [
        {{
            "degree": "<degree/qualification>",
            "institution": "<institution name>",
            "year": "<graduation year>",
            "location": "<location>"
        }}
    ],
    "skills": ["<skill1>", "<skill2>", "<skill3>"],
    "languages": [
        {{
            "language": "<language>",
            "proficiency": "<Native|Fluent|Intermediate|Basic>"
        }}
    ],
    "suggestions": [
        "<suggestion 1 for improvement>",
        "<suggestion 2 for improvement>",
        "<suggestion 3 for improvement>"
    ]
}}

Important:
- Enhance weak descriptions with action verbs and metrics
- Make the summary compelling and professional
- Add industry-relevant keywords to skills
- Format dates consistently
- Focus on South African job market context

CV Content:
{extracted_text[:8000]}"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"cv-extract-{uuid4()}",
            system_message="You are an expert CV writer specializing in South African job market. Extract and enhance CV content. Always respond with valid JSON only."
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=extraction_prompt))
        
        # Parse the AI response
        import json
        try:
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            extracted_data = json.loads(clean_response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse extraction response: {response[:500]}")
            raise HTTPException(status_code=500, detail="Failed to process CV content")
        
        # Separate suggestions from data
        suggestions = extracted_data.pop("suggestions", [])
        
        return {
            "success": True,
            "extracted_data": extracted_data,
            "enhanced_data": extracted_data,  # Already enhanced by AI
            "suggestions": suggestions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CV extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@cv_processing_router.post("/enhance-section")
async def enhance_cv_section(section: str, content: str, context: Optional[str] = None):
    """
    Enhance a specific section of the CV with AI.
    Useful for improving individual fields.
    """
    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        prompts = {
            "summary": f"Enhance this professional summary to be more compelling and impactful. Keep it 2-3 sentences. Context: {context or 'General professional'}. Current summary: {content}",
            "experience": f"Enhance this job description with action verbs and quantifiable achievements. Make it ATS-friendly. Current: {content}",
            "achievements": f"Improve these achievements with specific metrics and impact statements. Current: {content}",
            "skills": f"Suggest additional relevant skills based on this list and industry context. Current skills: {content}. Industry: {context or 'General'}"
        }
        
        prompt = prompts.get(section, f"Enhance this CV content professionally: {content}")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"cv-enhance-{uuid4()}",
            system_message="You are an expert CV writer. Provide enhanced content only, no explanations."
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "success": True,
            "original": content,
            "enhanced": response.strip()
        }
        
    except Exception as e:
        logger.error(f"Section enhancement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")
