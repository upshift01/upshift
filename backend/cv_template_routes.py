"""
CV Template Routes - API endpoints for managing .docx CV templates
Supports upload, listing, and document generation
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.responses import FileResponse
from typing import Optional, List
import logging
import os

from auth import get_current_user, oauth2_scheme
from cv_template_service import (
    CVTemplateService, 
    get_template_categories,
    get_placeholder_documentation,
    TEMPLATE_CATEGORIES
)

logger = logging.getLogger(__name__)

cv_template_router = APIRouter(prefix="/api/cv-templates", tags=["CV Templates"])

# Database reference
db = None

def set_db(database):
    global db
    db = database


async def get_current_user_with_db(token: str = Depends(oauth2_scheme)):
    """Get current user with database access"""
    return await get_current_user(token, db)


async def get_super_admin(token: str = Depends(oauth2_scheme)):
    """Verify user is a super admin"""
    user = await get_current_user(token, db)
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


async def get_reseller_admin(token: str = Depends(oauth2_scheme)):
    """Verify user is a reseller admin"""
    user = await get_current_user(token, db)
    if user.role not in ["reseller_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Reseller admin access required")
    return user


# ==================== Template Categories ====================

@cv_template_router.get("/categories")
async def get_categories():
    """Get available template categories"""
    return {
        "success": True,
        "categories": TEMPLATE_CATEGORIES
    }


@cv_template_router.get("/placeholders")
async def get_placeholders():
    """Get documentation of available placeholders for templates"""
    return {
        "success": True,
        "placeholders": get_placeholder_documentation()
    }


# ==================== Template Upload (Admin) ====================

@cv_template_router.post("/upload")
async def upload_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(""),
    preview: Optional[UploadFile] = File(None),
    admin = Depends(get_super_admin)
):
    """
    Upload a new CV template (Super Admin only)
    The template should be a .docx file with placeholders
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.docx'):
            raise HTTPException(
                status_code=400, 
                detail="Only .docx files are allowed"
            )
        
        # Validate category
        valid_categories = [c["id"] for c in TEMPLATE_CATEGORIES]
        if category not in valid_categories:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Read preview image if provided
        preview_content = None
        if preview:
            preview_content = await preview.read()
        
        # Upload template
        service = CVTemplateService(db)
        result = await service.upload_template(
            file_content=file_content,
            filename=file.filename,
            template_name=name,
            category=category,
            description=description,
            uploaded_by=admin.email,
            preview_image=preview_content
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_template_router.post("/reseller/upload")
async def upload_reseller_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(""),
    preview: Optional[UploadFile] = File(None),
    user = Depends(get_reseller_admin)
):
    """
    Upload a new CV template (Reseller Admin)
    Templates uploaded by resellers are only visible to their customers
    """
    try:
        if not file.filename.lower().endswith('.docx'):
            raise HTTPException(status_code=400, detail="Only .docx files are allowed")
        
        # Get reseller ID
        reseller_id = user.reseller_id
        if not reseller_id:
            raise HTTPException(status_code=400, detail="Reseller ID not found")
        
        file_content = await file.read()
        preview_content = None
        if preview:
            preview_content = await preview.read()
        
        service = CVTemplateService(db)
        result = await service.upload_template(
            file_content=file_content,
            filename=file.filename,
            template_name=name,
            category=category,
            description=description,
            uploaded_by=user.email,
            reseller_id=reseller_id,
            preview_image=preview_content
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading reseller template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Template Listing ====================

@cv_template_router.get("/list")
async def list_templates(
    category: Optional[str] = None,
    user = Depends(get_current_user_with_db)
):
    """
    Get available CV templates
    - Returns platform templates for all users
    - Includes reseller-specific templates for reseller customers
    """
    try:
        service = CVTemplateService(db)
        
        # Determine reseller context
        reseller_id = getattr(user, 'reseller_id', None)
        
        templates = await service.get_templates(
            category=category,
            reseller_id=reseller_id,
            include_platform=True
        )
        
        # Group by category
        by_category = {}
        for template in templates:
            cat = template.get("category", "other")
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(template)
        
        return {
            "success": True,
            "templates": templates,
            "by_category": by_category,
            "total": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Error listing templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_template_router.get("/admin/list")
async def list_all_templates(
    category: Optional[str] = None,
    include_inactive: bool = False,
    admin = Depends(get_super_admin)
):
    """Get all templates (admin view with inactive)"""
    try:
        query = {}
        if category:
            query["category"] = category
        if not include_inactive:
            query["is_active"] = True
        
        templates = await db.cv_templates.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
        
        return {
            "success": True,
            "templates": templates,
            "total": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Error listing admin templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_template_router.get("/reseller/list")
async def list_reseller_templates(
    category: Optional[str] = None,
    include_inactive: bool = True,
    user = Depends(get_reseller_admin)
):
    """Get templates for the reseller's organization"""
    try:
        reseller_id = user.reseller_id
        if not reseller_id:
            raise HTTPException(status_code=400, detail="Reseller ID not found")
        
        query = {"reseller_id": reseller_id}
        if category:
            query["category"] = category
        if not include_inactive:
            query["is_active"] = True
        
        templates = await db.cv_templates.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        return {
            "success": True,
            "templates": templates,
            "total": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Error listing reseller templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_template_router.get("/{template_id}")
async def get_template(
    template_id: str,
    user = Depends(get_current_user_with_db)
):
    """Get a specific template by ID"""
    try:
        service = CVTemplateService(db)
        template = await service.get_template_by_id(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "success": True,
            "template": template
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Template Management ====================

@cv_template_router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    admin = Depends(get_super_admin)
):
    """Delete a template (soft delete)"""
    try:
        service = CVTemplateService(db)
        success = await service.delete_template(template_id, admin.email)
        
        if not success:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "success": True,
            "message": "Template deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_template_router.put("/{template_id}")
async def update_template(
    template_id: str,
    data: dict,
    admin = Depends(get_super_admin)
):
    """Update template metadata"""
    try:
        update_data = {}
        
        if "name" in data:
            update_data["name"] = data["name"]
        if "category" in data:
            update_data["category"] = data["category"]
        if "description" in data:
            update_data["description"] = data["description"]
        if "is_active" in data:
            update_data["is_active"] = data["is_active"]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        from datetime import datetime, timezone
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        result = await db.cv_templates.update_one(
            {"id": template_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "success": True,
            "message": "Template updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Document Generation ====================

@cv_template_router.post("/generate")
async def generate_cv(
    data: dict,
    user = Depends(get_current_user_with_db)
):
    """
    Generate a CV from a template with user data
    
    Request body:
    {
        "template_id": "uuid",
        "cv_data": { ... },
        "output_format": "pdf" | "docx",
        "save_to_documents": true
    }
    """
    try:
        template_id = data.get("template_id")
        cv_data = data.get("cv_data", {})
        output_format = data.get("output_format", "pdf")
        save_to_documents = data.get("save_to_documents", True)
        
        if not template_id:
            raise HTTPException(status_code=400, detail="template_id is required")
        
        if output_format not in ["pdf", "docx"]:
            raise HTTPException(status_code=400, detail="output_format must be 'pdf' or 'docx'")
        
        service = CVTemplateService(db)
        result = await service.generate_cv_from_template(
            template_id=template_id,
            cv_data=cv_data,
            output_format=output_format,
            user_id=user.id
        )
        
        # Save to documents if requested
        if save_to_documents and result.get("success"):
            from datetime import datetime, timezone
            from uuid import uuid4
            
            document = {
                "id": result.get("document_id", str(uuid4())),
                "user_id": user.id,
                "reseller_id": getattr(user, 'reseller_id', None),
                "document_type": "cv",
                "name": f"CV - {cv_data.get('full_name', 'Untitled')}",
                "file_url": result.get("file_url"),
                "file_path": result.get("file_path"),
                "format": output_format,
                "template_id": template_id,
                "template_name": result.get("template_used"),
                "cv_data": cv_data,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            await db.documents.insert_one(document)
            result["saved_document_id"] = document["id"]
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating CV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@cv_template_router.get("/download/{document_id}")
async def download_document(
    document_id: str,
    user = Depends(get_current_user_with_db)
):
    """Download a generated CV document"""
    try:
        # Find the document
        document = await db.documents.find_one({
            "id": document_id,
            "user_id": user.id
        })
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path = document.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        filename = document.get("name", "CV") + f".{document.get('format', 'pdf')}"
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/octet-stream"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
