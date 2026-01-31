"""
Email Templates Routes - API endpoints for managing customizable email templates
Allows admins to customize email notifications sent by the platform
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

email_templates_router = APIRouter(prefix="/api/email-templates", tags=["Email Templates"])


# Default email templates
DEFAULT_TEMPLATES = {
    "employer_welcome": {
        "name": "Employer Welcome",
        "description": "Sent when a new employer account is created",
        "subject": "Welcome to {{platform_name}} - Your Employer Account",
        "variables": ["platform_name", "employer_name", "email", "password", "login_url", "created_by"],
        "category": "employer"
    },
    "employer_password_reset": {
        "name": "Employer Password Reset",
        "description": "Sent when an admin resets an employer's password",
        "subject": "{{platform_name}} - Your Password Has Been Reset",
        "variables": ["platform_name", "employer_name", "new_password", "reset_by"],
        "category": "employer"
    },
    "employer_suspended": {
        "name": "Account Suspended",
        "description": "Sent when an employer account is suspended",
        "subject": "{{platform_name}} - Account Suspended",
        "variables": ["platform_name", "employer_name", "reason", "suspended_by"],
        "category": "employer"
    },
    "employer_reactivated": {
        "name": "Account Reactivated",
        "description": "Sent when an employer account is reactivated",
        "subject": "{{platform_name}} - Account Reactivated",
        "variables": ["platform_name", "employer_name", "reactivated_by"],
        "category": "employer"
    },
    "employer_subscription_update": {
        "name": "Subscription Updated",
        "description": "Sent when an employer's subscription is updated",
        "subject": "{{platform_name}} - Subscription Updated",
        "variables": ["platform_name", "employer_name", "plan_name", "status", "expires_at", "jobs_limit"],
        "category": "employer"
    },
    "new_proposal": {
        "name": "New Proposal Received",
        "description": "Sent to employers when a candidate submits a proposal",
        "subject": "New Proposal for {{job_title}} - {{platform_name}}",
        "variables": ["platform_name", "employer_name", "job_title", "applicant_name", "applicant_rate", "cover_letter_preview", "proposals_url", "total_proposals"],
        "category": "jobs"
    },
    "contract_created": {
        "name": "Contract Created",
        "description": "Sent to contractors when offered a new contract",
        "subject": "New Contract Offer - {{contract_title}}",
        "variables": ["platform_name", "contractor_name", "contract_title", "employer_name", "company_name", "contract_value", "start_date", "contract_url"],
        "category": "contracts"
    },
    "contract_signed": {
        "name": "Contract Signed",
        "description": "Sent to both parties when a contract is signed",
        "subject": "Contract Signed - {{contract_title}}",
        "variables": ["platform_name", "recipient_name", "contract_title", "other_party_name", "contract_url"],
        "category": "contracts"
    },
    "milestone_funded": {
        "name": "Milestone Funded",
        "description": "Sent when a milestone receives funding",
        "subject": "Milestone Funded - {{milestone_title}}",
        "variables": ["platform_name", "recipient_name", "milestone_title", "contract_title", "amount", "currency", "contract_url"],
        "category": "payments"
    },
    "payment_released": {
        "name": "Payment Released",
        "description": "Sent to contractors when payment is released",
        "subject": "Payment Released - {{amount}}",
        "variables": ["platform_name", "contractor_name", "amount", "currency", "milestone_title", "contract_title"],
        "category": "payments"
    }
}


class TemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body_html: Optional[str] = None
    is_active: Optional[bool] = None


def get_email_templates_routes(db, get_current_user):
    """Factory function to create email template routes with dependencies"""
    
    async def check_super_admin(current_user):
        """Check if user is super admin"""
        if current_user.role != 'super_admin':
            raise HTTPException(status_code=403, detail="Super Admin access required")
        return current_user
    
    @email_templates_router.get("/")
    async def list_email_templates(
        category: Optional[str] = None,
        current_user = Depends(get_current_user)
    ):
        """List all email templates with their customizations"""
        await check_super_admin(current_user)
        
        try:
            # Get all customized templates from database
            query = {}
            if category:
                query["category"] = category
            
            customized = await db.email_templates.find(
                query,
                {"_id": 0}
            ).to_list(length=100)
            
            customized_map = {t["template_id"]: t for t in customized}
            
            # Merge with defaults
            templates = []
            for template_id, default in DEFAULT_TEMPLATES.items():
                if category and default.get("category") != category:
                    continue
                    
                template = {
                    "id": template_id,
                    "name": default["name"],
                    "description": default["description"],
                    "default_subject": default["subject"],
                    "variables": default["variables"],
                    "category": default.get("category", "general"),
                    "is_customized": template_id in customized_map,
                    "is_active": True
                }
                
                if template_id in customized_map:
                    custom = customized_map[template_id]
                    template["custom_subject"] = custom.get("subject")
                    template["custom_body_html"] = custom.get("body_html")
                    template["is_active"] = custom.get("is_active", True)
                    template["updated_at"] = custom.get("updated_at")
                    template["updated_by"] = custom.get("updated_by")
                
                templates.append(template)
            
            # Group by category
            categories = {}
            for t in templates:
                cat = t.get("category", "general")
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(t)
            
            return {
                "success": True,
                "templates": templates,
                "categories": categories,
                "total": len(templates)
            }
            
        except Exception as e:
            logger.error(f"Error listing email templates: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @email_templates_router.get("/{template_id}")
    async def get_email_template(
        template_id: str,
        current_user = Depends(get_current_user)
    ):
        """Get a specific email template with its customizations"""
        await check_super_admin(current_user)
        
        try:
            if template_id not in DEFAULT_TEMPLATES:
                raise HTTPException(status_code=404, detail="Template not found")
            
            default = DEFAULT_TEMPLATES[template_id]
            
            # Get customization from database
            custom = await db.email_templates.find_one(
                {"template_id": template_id},
                {"_id": 0}
            )
            
            template = {
                "id": template_id,
                "name": default["name"],
                "description": default["description"],
                "default_subject": default["subject"],
                "variables": default["variables"],
                "category": default.get("category", "general"),
                "is_customized": custom is not None,
                "custom_subject": custom.get("subject") if custom else None,
                "custom_body_html": custom.get("body_html") if custom else None,
                "is_active": custom.get("is_active", True) if custom else True,
                "updated_at": custom.get("updated_at") if custom else None,
                "preview_data": get_preview_data(template_id)
            }
            
            return {"success": True, "template": template}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting email template: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @email_templates_router.put("/{template_id}")
    async def update_email_template(
        template_id: str,
        data: TemplateUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update an email template customization"""
        await check_super_admin(current_user)
        
        try:
            if template_id not in DEFAULT_TEMPLATES:
                raise HTTPException(status_code=404, detail="Template not found")
            
            # Build update data
            update_data = {
                "template_id": template_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.id,
                "category": DEFAULT_TEMPLATES[template_id].get("category", "general")
            }
            
            if data.subject is not None:
                update_data["subject"] = data.subject
            if data.body_html is not None:
                update_data["body_html"] = data.body_html
            if data.is_active is not None:
                update_data["is_active"] = data.is_active
            
            # Upsert the template customization
            await db.email_templates.update_one(
                {"template_id": template_id},
                {"$set": update_data},
                upsert=True
            )
            
            logger.info(f"Email template {template_id} updated by {current_user.email}")
            
            return {"success": True, "message": "Template updated successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating email template: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @email_templates_router.delete("/{template_id}")
    async def reset_email_template(
        template_id: str,
        current_user = Depends(get_current_user)
    ):
        """Reset an email template to its default"""
        await check_super_admin(current_user)
        
        try:
            if template_id not in DEFAULT_TEMPLATES:
                raise HTTPException(status_code=404, detail="Template not found")
            
            result = await db.email_templates.delete_one({"template_id": template_id})
            
            if result.deleted_count == 0:
                return {"success": True, "message": "Template was already using defaults"}
            
            logger.info(f"Email template {template_id} reset to default by {current_user.email}")
            
            return {"success": True, "message": "Template reset to default"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error resetting email template: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @email_templates_router.post("/{template_id}/preview")
    async def preview_email_template(
        template_id: str,
        current_user = Depends(get_current_user)
    ):
        """Generate a preview of an email template with sample data"""
        await check_super_admin(current_user)
        
        try:
            if template_id not in DEFAULT_TEMPLATES:
                raise HTTPException(status_code=404, detail="Template not found")
            
            default = DEFAULT_TEMPLATES[template_id]
            
            # Get customization
            custom = await db.email_templates.find_one(
                {"template_id": template_id},
                {"_id": 0}
            )
            
            # Use custom subject if available, otherwise default
            subject = custom.get("subject") if custom else default["subject"]
            
            # Get preview data
            preview_data = get_preview_data(template_id)
            
            # Replace variables in subject
            for var, value in preview_data.items():
                subject = subject.replace(f"{{{{{var}}}}}", str(value))
            
            # If custom body exists, use it
            body_html = custom.get("body_html") if custom else None
            if body_html:
                for var, value in preview_data.items():
                    body_html = body_html.replace(f"{{{{{var}}}}}", str(value))
            
            return {
                "success": True,
                "preview": {
                    "subject": subject,
                    "body_html": body_html,
                    "has_custom_body": body_html is not None,
                    "preview_data": preview_data
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error previewing email template: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @email_templates_router.post("/{template_id}/test")
    async def send_test_email(
        template_id: str,
        current_user = Depends(get_current_user)
    ):
        """Send a test email to the current admin user"""
        await check_super_admin(current_user)
        
        try:
            from email_service import email_service
            
            if template_id not in DEFAULT_TEMPLATES:
                raise HTTPException(status_code=404, detail="Template not found")
            
            default = DEFAULT_TEMPLATES[template_id]
            
            # Get customization
            custom = await db.email_templates.find_one(
                {"template_id": template_id},
                {"_id": 0}
            )
            
            # Use custom subject if available
            subject = custom.get("subject") if custom else default["subject"]
            
            # Get preview data and replace variables
            preview_data = get_preview_data(template_id)
            for var, value in preview_data.items():
                subject = subject.replace(f"{{{{{var}}}}}", str(value))
            
            subject = f"[TEST] {subject}"
            
            # Generate body
            body_html = custom.get("body_html") if custom else generate_default_body(template_id, preview_data)
            if body_html:
                for var, value in preview_data.items():
                    body_html = body_html.replace(f"{{{{{var}}}}}", str(value))
            
            # Send test email
            result = await email_service.send_email(
                to_email=current_user.email,
                subject=subject,
                html_body=body_html,
                raise_exceptions=True
            )
            
            logger.info(f"Test email for {template_id} sent to {current_user.email}")
            
            return {"success": True, "message": f"Test email sent to {current_user.email}"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error sending test email: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return email_templates_router


def get_preview_data(template_id: str) -> dict:
    """Get sample data for template preview"""
    common = {
        "platform_name": "UpShift",
    }
    
    samples = {
        "employer_welcome": {
            **common,
            "employer_name": "John Smith",
            "email": "john@company.com",
            "password": "SecurePass123!",
            "login_url": "https://upshift.works/login",
            "created_by": "Admin User"
        },
        "employer_password_reset": {
            **common,
            "employer_name": "John Smith",
            "new_password": "NewSecure456!",
            "reset_by": "Admin User"
        },
        "employer_suspended": {
            **common,
            "employer_name": "John Smith",
            "reason": "Terms of service violation",
            "suspended_by": "Admin User"
        },
        "employer_reactivated": {
            **common,
            "employer_name": "John Smith",
            "reactivated_by": "Admin User"
        },
        "employer_subscription_update": {
            **common,
            "employer_name": "John Smith",
            "plan_name": "Professional",
            "status": "active",
            "expires_at": "March 15, 2025",
            "jobs_limit": 10
        },
        "new_proposal": {
            **common,
            "employer_name": "John Smith",
            "job_title": "Senior React Developer",
            "applicant_name": "Jane Doe",
            "applicant_rate": "USD 5,000 (monthly)",
            "cover_letter_preview": "I am excited to apply for this position...",
            "proposals_url": "https://upshift.works/jobs/123/proposals",
            "total_proposals": 5
        },
        "contract_created": {
            **common,
            "contractor_name": "Jane Doe",
            "contract_title": "Web Development Project",
            "employer_name": "John Smith",
            "company_name": "Tech Corp",
            "contract_value": "USD 10,000",
            "start_date": "January 15, 2025",
            "contract_url": "https://upshift.works/contracts/123"
        },
        "contract_signed": {
            **common,
            "recipient_name": "John Smith",
            "contract_title": "Web Development Project",
            "other_party_name": "Jane Doe",
            "contract_url": "https://upshift.works/contracts/123"
        },
        "milestone_funded": {
            **common,
            "recipient_name": "Jane Doe",
            "milestone_title": "Phase 1 - Design",
            "contract_title": "Web Development Project",
            "amount": "2,500",
            "currency": "USD",
            "contract_url": "https://upshift.works/contracts/123"
        },
        "payment_released": {
            **common,
            "contractor_name": "Jane Doe",
            "amount": "2,500",
            "currency": "USD",
            "milestone_title": "Phase 1 - Design",
            "contract_title": "Web Development Project"
        }
    }
    
    return samples.get(template_id, common)


def generate_default_body(template_id: str, preview_data: dict) -> str:
    """Generate a default HTML body for preview"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{{{{platform_name}}}}</h1>
            </div>
            <div class="content">
                <p>This is the default email template for: <strong>{template_id}</strong></p>
                <p>Customize this template in the Email Templates settings.</p>
                <hr>
                <p><small>Available variables: {', '.join(preview_data.keys())}</small></p>
            </div>
        </div>
    </body>
    </html>
    """
