from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import logging
import asyncio

from auth import UserResponse
from email_service import email_service

logger = logging.getLogger(__name__)

scheduler_router = APIRouter(prefix="/api/scheduler", tags=["Scheduler"])

# DB reference
db = None

def set_db(database):
    global db
    db = database


class EmailSettings(BaseModel):
    smtp_host: str = "smtp.office365.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    from_email: Optional[str] = None
    from_name: str = "UpShift"


class ReminderSchedule(BaseModel):
    name: str
    days_before_due: int  # e.g., 7, 3, 1, 0 (on due date), -1 (1 day overdue)
    is_active: bool = True
    email_subject_prefix: Optional[str] = None


async def get_current_super_admin(request):
    """Get current super admin from auth"""
    from auth import get_current_user, oauth2_scheme
    token = await oauth2_scheme(request)
    user = await get_current_user(token, db)
    
    user_doc = await db.users.find_one({"id": user.id})
    if not user_doc or user_doc.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    return user


# ==================== Email Settings ====================

@scheduler_router.get("/email-settings")
async def get_email_settings(request, admin = Depends(get_current_super_admin)):
    """Get current email settings (password masked)"""
    settings = await db.platform_settings.find_one({"type": "email"}, {"_id": 0})
    
    if settings:
        # Mask password
        if settings.get("smtp_password"):
            settings["smtp_password"] = "********"
        return settings
    
    return {
        "type": "email",
        "smtp_host": "smtp.office365.com",
        "smtp_port": 587,
        "smtp_user": "",
        "smtp_password": "",
        "from_email": "",
        "from_name": "UpShift",
        "is_configured": False
    }


@scheduler_router.post("/email-settings")
async def save_email_settings(
    settings: EmailSettings,
    request,
    admin = Depends(get_current_super_admin)
):
    """Save email settings"""
    try:
        # Get existing settings to preserve password if not changed
        existing = await db.platform_settings.find_one({"type": "email"})
        
        settings_dict = settings.dict()
        settings_dict["type"] = "email"
        settings_dict["is_configured"] = True
        settings_dict["updated_at"] = datetime.now(timezone.utc)
        settings_dict["updated_by"] = admin.id
        
        # If password is masked, keep the old one
        if settings.smtp_password == "********" and existing:
            settings_dict["smtp_password"] = existing.get("smtp_password", "")
        
        await db.platform_settings.update_one(
            {"type": "email"},
            {"$set": settings_dict},
            upsert=True
        )
        
        # Configure email service
        email_service.configure(settings_dict)
        
        logger.info(f"Email settings updated by {admin.email}")
        
        return {"success": True, "message": "Email settings saved successfully"}
    except Exception as e:
        logger.error(f"Error saving email settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@scheduler_router.post("/email-settings/test")
async def test_email_settings(request, admin = Depends(get_current_super_admin)):
    """Test email connection"""
    try:
        # Load settings from DB
        settings = await db.platform_settings.find_one({"type": "email"}, {"_id": 0})
        
        if not settings or not settings.get("smtp_user"):
            return {"success": False, "error": "Email settings not configured"}
        
        email_service.configure(settings)
        result = await email_service.test_connection()
        
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


@scheduler_router.post("/email-settings/send-test")
async def send_test_email(
    request,
    to_email: str,
    admin = Depends(get_current_super_admin)
):
    """Send a test email"""
    try:
        settings = await db.platform_settings.find_one({"type": "email"}, {"_id": 0})
        if not settings:
            raise HTTPException(status_code=400, detail="Email not configured")
        
        email_service.configure(settings)
        
        success = await email_service.send_email(
            to_email=to_email,
            subject="UpShift - Test Email",
            html_body="""
            <h2>Test Email</h2>
            <p>This is a test email from UpShift platform.</p>
            <p>If you received this, your email settings are working correctly!</p>
            """
        )
        
        if success:
            return {"success": True, "message": f"Test email sent to {to_email}"}
        else:
            return {"success": False, "error": "Failed to send email"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Reminder Schedules ====================

@scheduler_router.get("/reminder-schedules")
async def get_reminder_schedules(request, admin = Depends(get_current_super_admin)):
    """Get all reminder schedules"""
    schedules = await db.reminder_schedules.find({}, {"_id": 0}).to_list(100)
    
    if not schedules:
        # Return default schedules
        default_schedules = [
            {"id": str(uuid.uuid4()), "name": "7 Days Before Due", "days_before_due": 7, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "3 Days Before Due", "days_before_due": 3, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "1 Day Before Due", "days_before_due": 1, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "On Due Date", "days_before_due": 0, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "1 Day Overdue", "days_before_due": -1, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "3 Days Overdue", "days_before_due": -3, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "7 Days Overdue", "days_before_due": -7, "is_active": True},
        ]
        # Save defaults
        for schedule in default_schedules:
            schedule["created_at"] = datetime.now(timezone.utc)
            await db.reminder_schedules.insert_one(schedule)
        
        return default_schedules
    
    return schedules


@scheduler_router.post("/reminder-schedules")
async def create_reminder_schedule(
    schedule: ReminderSchedule,
    request,
    admin = Depends(get_current_super_admin)
):
    """Create a new reminder schedule"""
    try:
        schedule_doc = schedule.dict()
        schedule_doc["id"] = str(uuid.uuid4())
        schedule_doc["created_at"] = datetime.now(timezone.utc)
        schedule_doc["created_by"] = admin.id
        
        await db.reminder_schedules.insert_one(schedule_doc)
        
        return {"success": True, "schedule_id": schedule_doc["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@scheduler_router.put("/reminder-schedules/{schedule_id}")
async def update_reminder_schedule(
    schedule_id: str,
    schedule: ReminderSchedule,
    request,
    admin = Depends(get_current_super_admin)
):
    """Update a reminder schedule"""
    try:
        result = await db.reminder_schedules.update_one(
            {"id": schedule_id},
            {"$set": {
                "name": schedule.name,
                "days_before_due": schedule.days_before_due,
                "is_active": schedule.is_active,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@scheduler_router.delete("/reminder-schedules/{schedule_id}")
async def delete_reminder_schedule(
    schedule_id: str,
    request,
    admin = Depends(get_current_super_admin)
):
    """Delete a reminder schedule"""
    try:
        result = await db.reminder_schedules.delete_one({"id": schedule_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Manual Actions ====================

@scheduler_router.post("/send-reminders")
async def send_payment_reminders(
    request,
    background_tasks: BackgroundTasks,
    admin = Depends(get_current_super_admin)
):
    """Manually trigger sending payment reminders for all pending invoices"""
    try:
        # Load email settings
        settings = await db.platform_settings.find_one({"type": "email"}, {"_id": 0})
        if not settings or not settings.get("smtp_user"):
            raise HTTPException(status_code=400, detail="Email settings not configured")
        
        email_service.configure(settings)
        
        # Get all pending invoices
        pending_invoices = await db.reseller_invoices.find(
            {"status": "pending"},
            {"_id": 0}
        ).to_list(1000)
        
        sent_count = 0
        failed_count = 0
        
        for invoice in pending_invoices:
            # Get reseller info
            reseller = await db.resellers.find_one(
                {"id": invoice["reseller_id"]},
                {"_id": 0}
            )
            
            if not reseller:
                continue
            
            contact_email = reseller.get("contact_info", {}).get("email")
            if not contact_email:
                continue
            
            # Check if overdue
            due_date = datetime.fromisoformat(invoice["due_date"].replace("Z", "+00:00")) if isinstance(invoice["due_date"], str) else invoice["due_date"]
            is_overdue = due_date < datetime.now(timezone.utc)
            
            # Format amount
            amount = f"R {invoice['amount'] / 100:,.2f}"
            due_date_str = due_date.strftime("%d %B %Y")
            
            # Payment link
            payment_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reseller-dashboard/invoices"
            
            success = await email_service.send_invoice_reminder(
                to_email=contact_email,
                reseller_name=reseller["company_name"],
                invoice_number=invoice["invoice_number"],
                amount=amount,
                due_date=due_date_str,
                payment_link=payment_link,
                is_overdue=is_overdue
            )
            
            if success:
                sent_count += 1
                # Log the reminder
                await db.email_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "type": "invoice_reminder",
                    "invoice_id": invoice["id"],
                    "reseller_id": reseller["id"],
                    "to_email": contact_email,
                    "status": "sent",
                    "sent_at": datetime.now(timezone.utc),
                    "sent_by": admin.id
                })
            else:
                failed_count += 1
        
        logger.info(f"Payment reminders sent: {sent_count} success, {failed_count} failed")
        
        return {
            "success": True,
            "sent": sent_count,
            "failed": failed_count,
            "total_pending": len(pending_invoices)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending reminders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@scheduler_router.post("/send-reminder/{invoice_id}")
async def send_single_reminder(
    invoice_id: str,
    request,
    admin = Depends(get_current_super_admin)
):
    """Send reminder for a specific invoice"""
    try:
        import os
        
        settings = await db.platform_settings.find_one({"type": "email"}, {"_id": 0})
        if not settings or not settings.get("smtp_user"):
            raise HTTPException(status_code=400, detail="Email settings not configured")
        
        email_service.configure(settings)
        
        invoice = await db.reseller_invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        reseller = await db.resellers.find_one({"id": invoice["reseller_id"]}, {"_id": 0})
        if not reseller:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        contact_email = reseller.get("contact_info", {}).get("email")
        if not contact_email:
            raise HTTPException(status_code=400, detail="Reseller has no contact email")
        
        due_date = datetime.fromisoformat(invoice["due_date"].replace("Z", "+00:00")) if isinstance(invoice["due_date"], str) else invoice["due_date"]
        is_overdue = due_date < datetime.now(timezone.utc)
        
        amount = f"R {invoice['amount'] / 100:,.2f}"
        due_date_str = due_date.strftime("%d %B %Y")
        payment_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reseller-dashboard/invoices"
        
        success = await email_service.send_invoice_reminder(
            to_email=contact_email,
            reseller_name=reseller["company_name"],
            invoice_number=invoice["invoice_number"],
            amount=amount,
            due_date=due_date_str,
            payment_link=payment_link,
            is_overdue=is_overdue
        )
        
        if success:
            await db.email_logs.insert_one({
                "id": str(uuid.uuid4()),
                "type": "invoice_reminder",
                "invoice_id": invoice["id"],
                "reseller_id": reseller["id"],
                "to_email": contact_email,
                "status": "sent",
                "sent_at": datetime.now(timezone.utc),
                "sent_by": admin.id
            })
            return {"success": True, "message": f"Reminder sent to {contact_email}"}
        else:
            return {"success": False, "error": "Failed to send email"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@scheduler_router.post("/generate-monthly-invoices")
async def generate_monthly_invoices_job(
    request,
    admin = Depends(get_current_super_admin)
):
    """Generate monthly invoices and send notifications"""
    try:
        import os
        
        now = datetime.now(timezone.utc)
        period = f"{now.year}-{str(now.month).zfill(2)}"
        
        # Get all active resellers
        resellers = await db.resellers.find(
            {"status": "active"},
            {"_id": 0}
        ).to_list(None)
        
        invoices_created = 0
        emails_sent = 0
        
        # Load email settings
        settings = await db.platform_settings.find_one({"type": "email"}, {"_id": 0})
        if settings:
            email_service.configure(settings)
        
        for reseller in resellers:
            # Check if invoice already exists for this period
            existing = await db.reseller_invoices.find_one({
                "reseller_id": reseller["id"],
                "period": period
            })
            
            if existing:
                continue
            
            # Create invoice
            invoice_number = f"INV-{period}-{str(invoices_created + 1).zfill(4)}"
            monthly_fee = reseller.get("subscription", {}).get("monthly_fee", 250000)
            due_date = now + timedelta(days=15)
            
            invoice = {
                "id": str(uuid.uuid4()),
                "reseller_id": reseller["id"],
                "invoice_number": invoice_number,
                "amount": monthly_fee,
                "period": period,
                "due_date": due_date.isoformat(),
                "paid_date": None,
                "status": "pending",
                "items": [
                    {
                        "description": f"Monthly SaaS Subscription - {period}",
                        "amount": monthly_fee
                    }
                ],
                "created_at": now
            }
            
            await db.reseller_invoices.insert_one(invoice)
            invoices_created += 1
            
            # Send email notification if email is configured
            if email_service.is_configured:
                contact_email = reseller.get("contact_info", {}).get("email")
                if contact_email:
                    amount = f"R {monthly_fee / 100:,.2f}"
                    payment_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reseller-dashboard/invoices"
                    
                    success = await email_service.send_invoice_created(
                        to_email=contact_email,
                        reseller_name=reseller["company_name"],
                        invoice_number=invoice_number,
                        amount=amount,
                        period=period,
                        due_date=due_date.strftime("%d %B %Y"),
                        payment_link=payment_link
                    )
                    
                    if success:
                        emails_sent += 1
        
        logger.info(f"Monthly invoices generated: {invoices_created}, emails sent: {emails_sent}")
        
        return {
            "success": True,
            "period": period,
            "invoices_created": invoices_created,
            "emails_sent": emails_sent
        }
    except Exception as e:
        logger.error(f"Error generating monthly invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@scheduler_router.get("/email-logs")
async def get_email_logs(
    request,
    limit: int = 50,
    admin = Depends(get_current_super_admin)
):
    """Get email sending history"""
    logs = await db.email_logs.find(
        {},
        {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)
    
    return {"logs": logs, "total": len(logs)}


# Import os at the top for environment variables
import os
