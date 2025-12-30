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

# Auth dependency - import early for use in endpoints
from auth import get_current_user, oauth2_scheme

async def get_current_user_with_db(token: str = Depends(oauth2_scheme)):
    """Get current user with database access"""
    return await get_current_user(token, db)


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


class EnhanceSectionRequest(BaseModel):
    section: str
    content: str
    context: Optional[str] = None

@cv_processing_router.post("/enhance-section")
async def enhance_cv_section(
    request: EnhanceSectionRequest,
    current_user = Depends(get_current_user_with_db)
):
    """
    Enhance a specific section of the CV with AI.
    Useful for improving individual fields.
    """
    try:
        if not current_user.active_tier:
            raise HTTPException(status_code=403, detail="Please purchase a plan to use AI features")
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        prompts = {
            "summary": f"Enhance this professional summary to be more compelling and impactful. Keep it 2-3 sentences. Context: {request.context or 'General professional'}. Current summary: {request.content}",
            "experience": f"Enhance this job description with action verbs and quantifiable achievements. Make it ATS-friendly. Current: {request.content}",
            "achievements": f"Improve these achievements with specific metrics and impact statements. Current: {request.content}",
            "skills": f"Suggest additional relevant skills based on this list and industry context. Current skills: {request.content}. Industry: {request.context or 'General'}"
        }
        
        prompt = prompts.get(request.section, f"Enhance this CV content professionally: {request.content}")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"cv-enhance-{uuid4()}",
            system_message="You are an expert CV writer. Provide enhanced content only, no explanations."
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Handle response - could be string or object with text attribute
        if hasattr(response, 'text'):
            enhanced_text = response.text.strip()
        elif hasattr(response, 'content'):
            enhanced_text = response.content.strip()
        else:
            enhanced_text = str(response).strip()
        
        logger.info(f"Section '{request.section}' enhanced for user {current_user.email}")
        
        return {
            "success": True,
            "original": request.content,
            "enhanced": enhanced_text
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Section enhancement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


# Import the PDF service
from cv_pdf_service import generate_cv_pdf, TEMPLATES


class CVGenerateRequest(BaseModel):
    template_id: str = "professional"
    cv_data: Dict[str, Any]
    save_to_documents: bool = True
    document_name: Optional[str] = None


@cv_processing_router.get("/templates")
async def get_cv_templates():
    """Get available CV templates"""
    templates_list = []
    for tid, tdata in TEMPLATES.items():
        templates_list.append({
            "id": tid,
            "name": tdata['name'],
            "primary_color": str(tdata['primary_color']),
            "preview_url": f"/api/cv/template-preview/{tid}"
        })
    return {"templates": templates_list}


@cv_processing_router.post("/generate-pdf")
async def generate_cv_pdf_endpoint(
    request: CVGenerateRequest,
    current_user = Depends(get_current_user_with_db)
):
    """
    Generate a CV PDF using the specified template and optionally save to user's documents.
    """
    try:
        # Check if user has active tier
        if not current_user.active_tier:
            raise HTTPException(status_code=403, detail="Please purchase a plan to generate CVs")
        
        # Generate PDF
        pdf_bytes = generate_cv_pdf(request.cv_data, request.template_id)
        
        # Save to documents if requested
        doc_id = None
        if request.save_to_documents:
            import base64
            doc_id = str(uuid4())
            doc_name = request.document_name or f"CV - {request.cv_data.get('full_name', 'Untitled')}"
            
            # Store document metadata and PDF content
            await db.user_documents.insert_one({
                "id": doc_id,
                "user_id": current_user.id,
                "name": doc_name,
                "type": "cv",
                "template_id": request.template_id,
                "cv_data": request.cv_data,
                "pdf_content": base64.b64encode(pdf_bytes).decode('utf-8'),
                "file_size": len(pdf_bytes),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
            
            logger.info(f"CV saved to documents for user {current_user.id}: {doc_id}")
        
        # Log activity
        try:
            from activity_service import get_activity_service
            activity_service = get_activity_service(db)
            await activity_service.log_activity(
                user_id=current_user.id,
                activity_type="cv_created" if request.save_to_documents else "cv_downloaded",
                description=f"Generated CV using {request.template_id} template",
                metadata={
                    "template_id": request.template_id,
                    "document_id": doc_id,
                    "file_size": len(pdf_bytes)
                },
                reseller_id=current_user.reseller_id
            )
        except Exception as log_error:
            logger.warning(f"Failed to log activity: {str(log_error)}")
        
        # Return PDF as base64 for download
        import base64
        return {
            "success": True,
            "pdf_base64": base64.b64encode(pdf_bytes).decode('utf-8'),
            "filename": f"{request.cv_data.get('full_name', 'CV').replace(' ', '_')}_CV.pdf",
            "document_id": doc_id,
            "message": "CV generated successfully" + (" and saved to documents" if request.save_to_documents else "")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@cv_processing_router.get("/documents")
async def get_user_documents(
    current_user = Depends(get_current_user_with_db),
    doc_type: Optional[str] = None
):
    """Get user's saved documents"""
    try:
        query = {"user_id": current_user.id}
        if doc_type:
            query["type"] = doc_type
        
        documents = await db.user_documents.find(
            query,
            {"_id": 0, "pdf_content": 0}  # Exclude large PDF content
        ).sort("updated_at", -1).to_list(100)
        
        return {"documents": documents}
        
    except Exception as e:
        logger.error(f"Error fetching documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_processing_router.get("/documents/{doc_id}")
async def get_document(
    doc_id: str,
    current_user = Depends(get_current_user_with_db)
):
    """Get a specific document with its data for editing"""
    try:
        document = await db.user_documents.find_one(
            {"id": doc_id, "user_id": current_user.id},
            {"_id": 0}
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return document
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_processing_router.put("/documents/{doc_id}")
async def update_document(
    doc_id: str,
    request: CVGenerateRequest,
    current_user = Depends(get_current_user_with_db)
):
    """Update an existing document and regenerate PDF"""
    try:
        # Verify ownership
        existing = await db.user_documents.find_one(
            {"id": doc_id, "user_id": current_user.id}
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Generate new PDF
        pdf_bytes = generate_cv_pdf(request.cv_data, request.template_id)
        
        import base64
        doc_name = request.document_name or existing.get("name", f"CV - {request.cv_data.get('full_name', 'Untitled')}")
        
        # Update document
        await db.user_documents.update_one(
            {"id": doc_id},
            {
                "$set": {
                    "name": doc_name,
                    "template_id": request.template_id,
                    "cv_data": request.cv_data,
                    "pdf_content": base64.b64encode(pdf_bytes).decode('utf-8'),
                    "file_size": len(pdf_bytes),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Document updated: {doc_id}")
        
        return {
            "success": True,
            "pdf_base64": base64.b64encode(pdf_bytes).decode('utf-8'),
            "filename": f"{request.cv_data.get('full_name', 'CV').replace(' ', '_')}_CV.pdf",
            "document_id": doc_id,
            "message": "Document updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_processing_router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user = Depends(get_current_user_with_db)
):
    """Delete a document"""
    try:
        result = await db.user_documents.delete_one(
            {"id": doc_id, "user_id": current_user.id}
        )
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"success": True, "message": "Document deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_processing_router.get("/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    current_user = Depends(get_current_user_with_db)
):
    """Download document PDF"""
    from fastapi.responses import Response
    import base64
    
    try:
        document = await db.user_documents.find_one(
            {"id": doc_id, "user_id": current_user.id}
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        pdf_content = base64.b64decode(document["pdf_content"])
        filename = f"{document.get('name', 'CV').replace(' ', '_')}.pdf"
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_processing_router.post("/ai-enhance-all")
async def ai_enhance_all_sections(
    cv_data: Dict[str, Any],
    current_user = Depends(get_current_user_with_db)
):
    """
    AI enhance all sections of the CV at once.
    Improves summary, descriptions, achievements, and suggests skills.
    """
    try:
        if not current_user.active_tier:
            raise HTTPException(status_code=403, detail="Please purchase a plan to use AI features")
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Build context from existing data
        job_titles = [exp.get('title', '') for exp in cv_data.get('experiences', []) if exp.get('title')]
        companies = [exp.get('company', '') for exp in cv_data.get('experiences', []) if exp.get('company')]
        existing_skills = [s for s in cv_data.get('skills', []) if s and s.strip()]
        
        enhance_prompt = f"""Enhance this CV data professionally. Return ONLY valid JSON with the same structure but improved content.

Current CV Data:
- Name: {cv_data.get('full_name', 'Professional')}
- Current Summary: {cv_data.get('summary', 'No summary provided')}
- Job Titles: {', '.join(job_titles) if job_titles else 'Not specified'}
- Companies: {', '.join(companies) if companies else 'Not specified'}
- Current Skills: {', '.join(existing_skills) if existing_skills else 'None listed'}

Experiences to enhance:
{cv_data.get('experiences', [])}

Return JSON with:
{{
    "summary": "<enhanced 2-3 sentence professional summary>",
    "experiences": [
        {{
            "title": "<job title>",
            "company": "<company>",
            "duration": "<duration>",
            "description": "<enhanced description with action verbs and metrics>",
            "achievements": "<3-5 key achievements with quantifiable results>"
        }}
    ],
    "skills": ["<enhanced skill 1>", "<skill 2>", "...", "<suggest 3-5 additional relevant skills>"]
}}

Focus on South African job market context. Use UK English spelling."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"cv-enhance-all-{uuid4()}",
            system_message="You are an expert CV writer specializing in South African job market. Return only valid JSON."
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=enhance_prompt))
        
        # Parse response
        import json
        try:
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            enhanced_data = json.loads(clean_response)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse enhancement response: {response[:500]}")
            raise HTTPException(status_code=500, detail="Failed to process AI enhancement")
        
        return {
            "success": True,
            "enhanced_summary": enhanced_data.get("summary", cv_data.get("summary", "")),
            "enhanced_experiences": enhanced_data.get("experiences", cv_data.get("experiences", [])),
            "enhanced_skills": enhanced_data.get("skills", cv_data.get("skills", []))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI enhance all error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")

