from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from reseller_models import (
    Reseller, ResellerResponse, PlatformAnalytics,
    ResellerInvoice, InvoiceItem
)
from auth import UserResponse
from invoice_pdf_service import invoice_pdf_generator

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Dependency to get DB - will be set from server.py
db = None

def set_db(database):
    global db
    db = database


async def get_current_super_admin(request: Request):
    """Get current super admin from auth"""
    from auth import get_current_user, oauth2_scheme
    token = await oauth2_scheme(request)
    user = await get_current_user(token, db)
    
    # Check if user is super admin
    user_doc = await db.users.find_one({"id": user.id})
    if not user_doc or user_doc.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Super admin privileges required."
        )
    
    return user


# ==================== Reseller Management ====================

@admin_router.get("/resellers", response_model=dict)
async def list_resellers(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """List all resellers"""
    try:
        query = {}
        if status_filter:
            query["status"] = status_filter
        
        resellers = await db.resellers.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.resellers.count_documents(query)
        
        return {
            "resellers": resellers,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error listing resellers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.get("/resellers/{reseller_id}", response_model=dict)
async def get_reseller(
    reseller_id: str,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Get specific reseller details"""
    try:
        reseller = await db.resellers.find_one(
            {"id": reseller_id},
            {"_id": 0}
        )
        
        if not reseller:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        # Get owner details
        owner = await db.users.find_one(
            {"id": reseller["owner_user_id"]},
            {"_id": 0, "hashed_password": 0}
        )
        
        # Get customer count
        customer_count = await db.users.count_documents({"reseller_id": reseller_id})
        
        return {
            "reseller": reseller,
            "owner": owner,
            "customer_count": customer_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reseller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/resellers", response_model=dict)
async def create_reseller(
    data: dict,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Create a new reseller (admin-initiated)"""
    try:
        from auth import get_password_hash
        
        # Check if subdomain is taken
        existing = await db.resellers.find_one({"subdomain": data["subdomain"]})
        if existing:
            raise HTTPException(status_code=400, detail="Subdomain already taken")
        
        # Create owner user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(data.get("owner_password", "temp123"))
        
        owner_user = {
            "id": user_id,
            "email": data["owner_email"],
            "full_name": data["owner_name"],
            "hashed_password": hashed_password,
            "role": "reseller_admin",
            "active_tier": None,
            "created_at": datetime.now(timezone.utc),
            "is_active": True,
            "payment_history": []
        }
        
        await db.users.insert_one(owner_user)
        
        # Create reseller
        reseller_id = str(uuid.uuid4())
        reseller = {
            "id": reseller_id,
            "company_name": data["company_name"],
            "brand_name": data["brand_name"],
            "subdomain": data["subdomain"],
            "custom_domain": data.get("custom_domain"),
            "status": "active",  # Admin-created resellers are auto-approved
            "branding": {
                "logo_url": None,
                "primary_color": "#1e40af",
                "secondary_color": "#7c3aed",
                "favicon_url": None
            },
            "pricing": {
                "tier_1_price": 89900,
                "tier_2_price": 150000,
                "tier_3_price": 300000,
                "currency": "ZAR"
            },
            "contact_info": data.get("contact_info", {
                "email": data["owner_email"],
                "phone": "",
                "address": ""
            }),
            "legal": {"terms_url": None, "privacy_url": None},
            "subscription": {
                "plan": "monthly",
                "monthly_fee": 250000,
                "status": "active",
                "next_billing_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "payment_method": "invoice"
            },
            "stats": {
                "total_customers": 0,
                "active_customers": 0,
                "total_revenue": 0,
                "this_month_revenue": 0
            },
            "owner_user_id": user_id,
            "api_key": f"rsl_{uuid.uuid4().hex}",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.resellers.insert_one(reseller)
        
        logger.info(f"Reseller created by admin: {data['company_name']}")
        
        return {
            "success": True,
            "reseller_id": reseller_id,
            "message": "Reseller created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating reseller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.put("/resellers/{reseller_id}", response_model=dict)
async def update_reseller(
    reseller_id: str,
    data: dict,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Update reseller details"""
    try:
        reseller = await db.resellers.find_one({"id": reseller_id})
        if not reseller:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        # Build update
        update_data = {}
        allowed_fields = [
            "company_name", "brand_name", "custom_domain", "status",
            "branding", "pricing", "contact_info", "legal", "subscription"
        ]
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.resellers.update_one(
            {"id": reseller_id},
            {"$set": update_data}
        )
        
        logger.info(f"Reseller updated by admin: {reseller_id}")
        
        return {"success": True, "message": "Reseller updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating reseller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.delete("/resellers/{reseller_id}", response_model=dict)
async def delete_reseller(
    reseller_id: str,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Delete a reseller (soft delete by setting status to 'deleted')"""
    try:
        reseller = await db.resellers.find_one({"id": reseller_id})
        if not reseller:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        await db.resellers.update_one(
            {"id": reseller_id},
            {
                "$set": {
                    "status": "deleted",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Deactivate owner user
        await db.users.update_one(
            {"id": reseller["owner_user_id"]},
            {"$set": {"is_active": False}}
        )
        
        logger.info(f"Reseller deleted by admin: {reseller_id}")
        
        return {"success": True, "message": "Reseller deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting reseller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Reseller Actions ====================

@admin_router.post("/resellers/{reseller_id}/approve", response_model=dict)
async def approve_reseller(
    reseller_id: str,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Approve a pending reseller"""
    try:
        reseller = await db.resellers.find_one({"id": reseller_id})
        if not reseller:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        if reseller["status"] != "pending":
            raise HTTPException(status_code=400, detail="Reseller is not pending approval")
        
        await db.resellers.update_one(
            {"id": reseller_id},
            {
                "$set": {
                    "status": "active",
                    "subscription.status": "active",
                    "subscription.next_billing_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Reseller approved: {reseller_id}")
        
        return {"success": True, "message": "Reseller approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving reseller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/resellers/{reseller_id}/suspend", response_model=dict)
async def suspend_reseller(
    reseller_id: str,
    reason: Optional[str] = None,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Suspend a reseller"""
    try:
        reseller = await db.resellers.find_one({"id": reseller_id})
        if not reseller:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        await db.resellers.update_one(
            {"id": reseller_id},
            {
                "$set": {
                    "status": "suspended",
                    "suspension_reason": reason,
                    "suspended_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Reseller suspended: {reseller_id}")
        
        return {"success": True, "message": "Reseller suspended successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suspending reseller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/resellers/{reseller_id}/activate", response_model=dict)
async def activate_reseller(
    reseller_id: str,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Activate a suspended reseller"""
    try:
        reseller = await db.resellers.find_one({"id": reseller_id})
        if not reseller:
            raise HTTPException(status_code=404, detail="Reseller not found")
        
        await db.resellers.update_one(
            {"id": reseller_id},
            {
                "$set": {
                    "status": "active",
                    "suspension_reason": None,
                    "suspended_at": None,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$unset": {"suspension_reason": "", "suspended_at": ""}
            }
        )
        
        logger.info(f"Reseller activated: {reseller_id}")
        
        return {"success": True, "message": "Reseller activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating reseller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Analytics ====================

@admin_router.get("/analytics", response_model=dict)
async def get_platform_analytics(
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Get platform-wide analytics"""
    try:
        # Reseller counts
        total_resellers = await db.resellers.count_documents({})
        active_resellers = await db.resellers.count_documents({"status": "active"})
        pending_resellers = await db.resellers.count_documents({"status": "pending"})
        suspended_resellers = await db.resellers.count_documents({"status": "suspended"})
        
        # Customer counts
        total_customers = await db.users.count_documents({"role": "customer"})
        paying_customers = await db.users.count_documents({"role": "customer", "active_tier": {"$ne": None}})
        
        # Revenue from reseller invoices (platform fees)
        pipeline = [
            {"$match": {"status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        revenue_result = await db.reseller_invoices.aggregate(pipeline).to_list(1)
        reseller_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        # Revenue from customer payments (service fees)
        customer_pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount_cents"}}}
        ]
        customer_revenue_result = await db.payments.aggregate(customer_pipeline).to_list(1)
        customer_revenue = customer_revenue_result[0]["total"] if customer_revenue_result else 0
        
        # Total revenue (platform fees + customer payments)
        total_revenue = reseller_revenue + customer_revenue
        
        # This month revenue
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Reseller invoices this month
        pipeline_month = [
            {
                "$match": {
                    "status": "paid",
                    "paid_date": {"$gte": start_of_month}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        month_result = await db.reseller_invoices.aggregate(pipeline_month).to_list(1)
        reseller_month_revenue = month_result[0]["total"] if month_result else 0
        
        # Customer payments this month
        customer_month_pipeline = [
            {
                "$match": {
                    "status": "completed",
                    "created_at": {"$gte": start_of_month}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount_cents"}}}
        ]
        customer_month_result = await db.payments.aggregate(customer_month_pipeline).to_list(1)
        customer_month_revenue = customer_month_result[0]["total"] if customer_month_result else 0
        
        this_month_revenue = reseller_month_revenue + customer_month_revenue
        
        # Invoice counts
        pending_invoices = await db.reseller_invoices.count_documents({"status": "pending"})
        overdue_invoices = await db.reseller_invoices.count_documents({"status": "overdue"})
        
        # Pending customer payments
        pending_customer_payments = await db.payments.count_documents({"status": "pending"})
        
        # CV and Cover Letter counts
        total_cvs = await db.user_cvs.count_documents({})
        total_cover_letters = await db.cover_letters.count_documents({})
        
        return {
            "resellers": {
                "total": total_resellers,
                "active": active_resellers,
                "pending": pending_resellers,
                "suspended": suspended_resellers
            },
            "customers": {
                "total": total_customers,
                "paying": paying_customers,
                "free": total_customers - paying_customers
            },
            "revenue": {
                "total": total_revenue,
                "this_month": this_month_revenue,
                "reseller_fees": reseller_revenue,
                "customer_payments": customer_revenue,
                "currency": "ZAR"
            },
            "invoices": {
                "pending": pending_invoices,
                "overdue": overdue_invoices
            },
            "payments": {
                "pending": pending_customer_payments
            },
            "content": {
                "cvs_generated": total_cvs,
                "cover_letters_generated": total_cover_letters
            }
        }
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.get("/analytics/revenue", response_model=dict)
async def get_revenue_analytics(
    months: int = 12,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Get revenue analytics by month"""
    try:
        pipeline = [
            {"$match": {"status": "paid"}},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$paid_date"},
                        "month": {"$month": "$paid_date"}
                    },
                    "revenue": {"$sum": "$amount"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.year": -1, "_id.month": -1}},
            {"$limit": months}
        ]
        
        results = await db.reseller_invoices.aggregate(pipeline).to_list(months)
        
        monthly_data = [
            {
                "month": f"{r['_id']['year']}-{str(r['_id']['month']).zfill(2)}",
                "revenue": r["revenue"],
                "invoices_paid": r["count"]
            }
            for r in results
        ]
        
        return {
            "monthly_revenue": monthly_data,
            "currency": "ZAR"
        }
    except Exception as e:
        logger.error(f"Error getting revenue analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Invoice Management ====================

@admin_router.get("/invoices", response_model=dict)
async def list_invoices(
    status_filter: Optional[str] = None,
    reseller_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """List all reseller invoices"""
    try:
        query = {}
        if status_filter:
            query["status"] = status_filter
        if reseller_id:
            query["reseller_id"] = reseller_id
        
        invoices = await db.reseller_invoices.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        # Add reseller info to each invoice
        for invoice in invoices:
            reseller = await db.resellers.find_one(
                {"id": invoice["reseller_id"]},
                {"_id": 0, "company_name": 1, "brand_name": 1}
            )
            invoice["reseller_name"] = reseller["company_name"] if reseller else "Unknown"
        
        total = await db.reseller_invoices.count_documents(query)
        
        return {
            "invoices": invoices,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error listing invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/generate-invoices", response_model=dict)
async def generate_monthly_invoices(
    period: Optional[str] = None,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Generate monthly invoices for all active resellers"""
    try:
        now = datetime.now(timezone.utc)
        if not period:
            period = f"{now.year}-{str(now.month).zfill(2)}"
        
        # Get all active resellers
        resellers = await db.resellers.find(
            {"status": "active"},
            {"_id": 0}
        ).to_list(None)
        
        invoices_created = 0
        
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
            monthly_fee = reseller["subscription"].get("monthly_fee", 250000)
            
            invoice = {
                "id": str(uuid.uuid4()),
                "reseller_id": reseller["id"],
                "invoice_number": invoice_number,
                "amount": monthly_fee,
                "period": period,
                "due_date": (now + timedelta(days=15)).isoformat(),
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
        
        logger.info(f"Generated {invoices_created} invoices for period {period}")
        
        return {
            "success": True,
            "invoices_created": invoices_created,
            "period": period
        }
    except Exception as e:
        logger.error(f"Error generating invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/invoices/{invoice_id}/mark-paid", response_model=dict)
async def mark_invoice_paid(
    invoice_id: str,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Mark an invoice as paid"""
    try:
        invoice = await db.reseller_invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        await db.reseller_invoices.update_one(
            {"id": invoice_id},
            {
                "$set": {
                    "status": "paid",
                    "paid_date": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Invoice marked as paid: {invoice_id}")
        
        return {"success": True, "message": "Invoice marked as paid"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking invoice paid: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: str,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Download invoice as PDF"""
    try:
        # Get invoice
        invoice = await db.reseller_invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get reseller details
        reseller = await db.resellers.find_one(
            {"id": invoice["reseller_id"]},
            {"_id": 0}
        )
        
        # Get platform settings for header info
        site_settings = await db.platform_settings.find_one({"key": "site_settings"}, {"_id": 0})
        platform_settings = {
            "platform_name": "UpShift",
            "contact": site_settings.get("contact", {}) if site_settings else {},
            "vat_number": site_settings.get("vat_number", "") if site_settings else ""
        }
        
        # Generate PDF
        pdf_buffer = invoice_pdf_generator.generate_reseller_invoice_pdf(
            invoice=invoice,
            reseller=reseller,
            platform_settings=platform_settings
        )
        
        filename = f"invoice_{invoice.get('invoice_number', invoice_id)}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating invoice PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== User Management ====================

@admin_router.get("/users", response_model=dict)
async def list_users(
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """List all platform users"""
    try:
        query = {}
        if role:
            query["role"] = role
        
        users = await db.users.find(
            query,
            {"_id": 0, "hashed_password": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.users.count_documents(query)
        
        return {
            "users": users,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/create-admin", response_model=dict)
async def create_super_admin(
    data: dict,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Create a new super admin user"""
    try:
        from auth import get_password_hash
        
        # Check if email exists
        existing = await db.users.find_one({"email": data["email"]})
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(data["password"])
        
        new_admin = {
            "id": user_id,
            "email": data["email"],
            "full_name": data["full_name"],
            "hashed_password": hashed_password,
            "role": "super_admin",
            "active_tier": None,
            "created_at": datetime.now(timezone.utc),
            "is_active": True,
            "payment_history": []
        }
        
        await db.users.insert_one(new_admin)
        
        logger.info(f"Super admin created: {data['email']}")
        
        return {
            "success": True,
            "user_id": user_id,
            "message": "Super admin created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating admin: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= YOCO PAYMENT SETTINGS =============

@admin_router.get("/yoco-settings", response_model=dict)
async def get_yoco_settings(admin: UserResponse = Depends(get_current_super_admin)):
    """Get platform Yoco payment settings"""
    try:
        import os
        
        # Get from database or environment
        settings = await db.platform_settings.find_one({"key": "yoco"}, {"_id": 0})
        
        if settings:
            return {
                "public_key": settings.get("public_key", ""),
                "secret_key": "••••••••" + settings.get("secret_key", "")[-8:] if settings.get("secret_key") else "",
                "webhook_secret": "••••••••" if settings.get("webhook_secret") else "",
                "is_test_mode": settings.get("is_test_mode", True),
                "status": settings.get("status", {"connected": False})
            }
        
        # Fall back to environment variables
        public_key = os.environ.get("YOCO_PUBLIC_KEY", "")
        secret_key = os.environ.get("YOCO_SECRET_KEY", "")
        
        return {
            "public_key": public_key,
            "secret_key": "••••••••" + secret_key[-8:] if secret_key else "",
            "webhook_secret": "",
            "is_test_mode": public_key.startswith("pk_test") if public_key else True,
            "status": {"connected": bool(public_key and secret_key)}
        }
        
    except Exception as e:
        logger.error(f"Error fetching Yoco settings: {str(e)}")
        return {"public_key": "", "secret_key": "", "webhook_secret": "", "is_test_mode": True, "status": None}


@admin_router.post("/yoco-settings", response_model=dict)
async def save_yoco_settings(data: dict, admin: UserResponse = Depends(get_current_super_admin)):
    """Save platform Yoco payment settings"""
    try:
        import os
        
        # Get existing settings to preserve secret if masked
        existing = await db.platform_settings.find_one({"key": "yoco"}, {"_id": 0})
        
        secret_key = data.get("secret_key", "")
        webhook_secret = data.get("webhook_secret", "")
        
        # If secret is masked (••••), keep the existing one
        if secret_key.startswith("••••") and existing:
            secret_key = existing.get("secret_key", "")
        if webhook_secret.startswith("••••") and existing:
            webhook_secret = existing.get("webhook_secret", "")
        
        settings = {
            "key": "yoco",
            "public_key": data.get("public_key", ""),
            "secret_key": secret_key,
            "webhook_secret": webhook_secret,
            "is_test_mode": data.get("is_test_mode", True),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.id
        }
        
        await db.platform_settings.update_one(
            {"key": "yoco"},
            {"$set": settings},
            upsert=True
        )
        
        # Also update environment variables for immediate use
        if settings["public_key"]:
            os.environ["YOCO_PUBLIC_KEY"] = settings["public_key"]
        if secret_key:
            os.environ["YOCO_SECRET_KEY"] = secret_key
        
        logger.info(f"Yoco settings updated by admin {admin.email}")
        
        return {"success": True, "message": "Yoco settings saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving Yoco settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/yoco-settings/test", response_model=dict)
async def test_yoco_connection(admin: UserResponse = Depends(get_current_super_admin)):
    """Test Yoco API connection by attempting to create a minimal checkout"""
    try:
        import os
        import httpx
        
        # Get settings from database or environment
        settings = await db.platform_settings.find_one({"key": "yoco"}, {"_id": 0})
        
        if settings and settings.get("secret_key"):
            secret_key = settings.get("secret_key", "")
        else:
            secret_key = os.environ.get("YOCO_SECRET_KEY", "")
        
        if not secret_key:
            return {"success": False, "detail": "Yoco secret key not configured. Please save your API keys first."}
        
        logger.info(f"Testing Yoco connection with key: {secret_key[:10]}...{secret_key[-5:]}")
        
        # Test API by creating a minimal checkout request
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://payments.yoco.com/api/checkouts",
                headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "amount": 200,  # Minimum R2.00 required by Yoco
                    "currency": "ZAR"
                },
                timeout=15
            )
            
            logger.info(f"Yoco test response: {response.status_code} - {response.text[:200]}")
            
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {}
            
            error_msg = response_data.get("message", response_data.get("error", ""))
            
            # Check for successful checkout creation (200 or 201)
            if response.status_code in [200, 201]:
                await db.platform_settings.update_one(
                    {"key": "yoco"},
                    {"$set": {
                        "status": {
                            "connected": True,
                            "last_checked": datetime.now(timezone.utc).isoformat()
                        }
                    }}
                )
                return {"success": True, "message": "Yoco API key is valid! Connection successful."}
            
            # Check for authentication errors (401, 403)
            elif response.status_code in [401, 403]:
                await db.platform_settings.update_one(
                    {"key": "yoco"},
                    {"$set": {
                        "status": {
                            "connected": False,
                            "error": "Invalid API key",
                            "last_checked": datetime.now(timezone.utc).isoformat()
                        }
                    }}
                )
                
                if "key is required" in error_msg.lower() or "not been specified" in error_msg.lower():
                    return {"success": False, "detail": "API key is not recognized by Yoco. The key may be invalid, expired, or revoked. Please generate new keys from your Yoco portal."}
                elif "forbidden" in error_msg.lower():
                    return {"success": False, "detail": "API key is forbidden. Please check that you're using the correct key type (test vs live)."}
                return {"success": False, "detail": f"Authentication failed: {error_msg or 'Invalid API key'}"}
            
            # Handle other errors
            else:
                return {"success": False, "detail": f"Yoco API returned status {response.status_code}: {error_msg or 'Unknown error'}"}
                
    except httpx.TimeoutException:
        return {"success": False, "detail": "Connection timeout - Yoco API is not responding. Please try again."}
    except Exception as e:
        logger.error(f"Error testing Yoco connection: {str(e)}")
        return {"success": False, "detail": f"Error: {str(e)}"}



# LinkedIn Integration Settings
@admin_router.get("/linkedin-settings", response_model=dict)
async def get_linkedin_settings(admin: UserResponse = Depends(get_current_super_admin)):
    """Get platform LinkedIn OAuth settings"""
    try:
        import os
        
        # Get from database or environment
        settings = await db.platform_settings.find_one({"key": "linkedin"}, {"_id": 0})
        
        if settings:
            return {
                "client_id": settings.get("client_id", ""),
                "client_secret": "••••••••" + settings.get("client_secret", "")[-4:] if settings.get("client_secret") else "",
                "redirect_uri": settings.get("redirect_uri", ""),
                "is_configured": bool(settings.get("client_id") and settings.get("client_secret")),
                "status": settings.get("status", {"connected": False})
            }
        
        # Fall back to environment variables
        client_id = os.environ.get("LINKEDIN_CLIENT_ID", "")
        client_secret = os.environ.get("LINKEDIN_CLIENT_SECRET", "")
        
        return {
            "client_id": client_id,
            "client_secret": "••••••••" + client_secret[-4:] if client_secret else "",
            "redirect_uri": os.environ.get("LINKEDIN_REDIRECT_URI", ""),
            "is_configured": bool(client_id and client_secret),
            "status": {"connected": bool(client_id and client_secret)}
        }
        
    except Exception as e:
        logger.error(f"Error fetching LinkedIn settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/linkedin-settings", response_model=dict)
async def save_linkedin_settings(data: dict, admin: UserResponse = Depends(get_current_super_admin)):
    """Save platform LinkedIn OAuth settings"""
    try:
        import os
        
        # Get existing settings to preserve secret if masked
        existing = await db.platform_settings.find_one({"key": "linkedin"}, {"_id": 0})
        
        client_secret = data.get("client_secret", "")
        
        # If secret is masked (••••), keep the existing one
        if client_secret.startswith("••••") and existing:
            client_secret = existing.get("client_secret", "")
        
        settings = {
            "key": "linkedin",
            "client_id": data.get("client_id", ""),
            "client_secret": client_secret,
            "redirect_uri": data.get("redirect_uri", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.id
        }
        
        await db.platform_settings.update_one(
            {"key": "linkedin"},
            {"$set": settings},
            upsert=True
        )
        
        # Also update environment variables for immediate use
        if settings["client_id"]:
            os.environ["LINKEDIN_CLIENT_ID"] = settings["client_id"]
        if client_secret:
            os.environ["LINKEDIN_CLIENT_SECRET"] = client_secret
        if settings["redirect_uri"]:
            os.environ["LINKEDIN_REDIRECT_URI"] = settings["redirect_uri"]
        
        logger.info(f"LinkedIn settings updated by admin {admin.email}")
        
        return {"success": True, "message": "LinkedIn settings saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving LinkedIn settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/linkedin-settings/test", response_model=dict)
async def test_linkedin_connection(admin: UserResponse = Depends(get_current_super_admin)):
    """Test LinkedIn OAuth configuration by verifying credentials"""
    try:
        import os
        import httpx
        
        # Get settings from database or environment
        settings = await db.platform_settings.find_one({"key": "linkedin"}, {"_id": 0})
        
        if settings and settings.get("client_id"):
            client_id = settings.get("client_id", "")
            client_secret = settings.get("client_secret", "")
        else:
            client_id = os.environ.get("LINKEDIN_CLIENT_ID", "")
            client_secret = os.environ.get("LINKEDIN_CLIENT_SECRET", "")
        
        if not client_id or not client_secret:
            return {"success": False, "detail": "LinkedIn credentials not configured. Please save your Client ID and Client Secret first."}
        
        # Test by making a request to LinkedIn's token endpoint with invalid grant
        # This will fail but will tell us if the credentials format is valid
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret
                },
                timeout=15
            )
            
            # LinkedIn doesn't support client_credentials grant, but a 400 error 
            # with specific message indicates credentials are recognized
            if response.status_code == 400:
                response_data = response.json() if response.content else {}
                error = response_data.get("error", "")
                
                # If we get "unauthorized_client" it means the app exists but doesn't support this grant
                # If we get "invalid_client" it means credentials are wrong
                if error == "invalid_client":
                    await db.platform_settings.update_one(
                        {"key": "linkedin"},
                        {"$set": {"status": {"connected": False, "error": "Invalid credentials"}}}
                    )
                    return {"success": False, "detail": "Invalid Client ID or Client Secret. Please verify your LinkedIn App credentials."}
                else:
                    # App exists, credentials are valid
                    await db.platform_settings.update_one(
                        {"key": "linkedin"},
                        {"$set": {"status": {"connected": True, "last_checked": datetime.now(timezone.utc).isoformat()}}}
                    )
                    return {"success": True, "message": "LinkedIn credentials are valid! OAuth is ready to use."}
            
            elif response.status_code == 401:
                await db.platform_settings.update_one(
                    {"key": "linkedin"},
                    {"$set": {"status": {"connected": False, "error": "Invalid credentials"}}}
                )
                return {"success": False, "detail": "Invalid credentials. Please check your Client ID and Client Secret."}
            
            else:
                # Unexpected response, but if we got here the API is responding
                await db.platform_settings.update_one(
                    {"key": "linkedin"},
                    {"$set": {"status": {"connected": True, "last_checked": datetime.now(timezone.utc).isoformat()}}}
                )
                return {"success": True, "message": "LinkedIn API is responding. Configuration appears valid."}
                
    except httpx.TimeoutException:
        return {"success": False, "detail": "Connection timeout - LinkedIn API is not responding. Please try again."}
    except Exception as e:
        logger.error(f"Error testing LinkedIn connection: {str(e)}")


# Platform Contact & Social Media Settings
@admin_router.get("/site-settings", response_model=dict)
async def get_site_settings(admin: UserResponse = Depends(get_current_super_admin)):
    """Get platform contact and social media settings"""
    try:
        settings = await db.platform_settings.find_one({"key": "site_settings"}, {"_id": 0})
        
        if settings:
            return {
                "contact": settings.get("contact", {}),
                "social_media": settings.get("social_media", {}),
                "business_hours": settings.get("business_hours", ""),
                "vat_number": settings.get("vat_number", ""),
                "company_registration": settings.get("company_registration", ""),
                "meeting_link": settings.get("meeting_link", ""),
                "updated_at": settings.get("updated_at")
            }
        
        # Return defaults
        return {
            "contact": {
                "email": "support@upshift.works",
                "phone": "+27 (0) 11 234 5678",
                "address": "123 Main Street, Sandton, Johannesburg, 2196, South Africa",
                "whatsapp": ""
            },
            "social_media": {
                "facebook": "",
                "twitter": "",
                "linkedin": "",
                "instagram": "",
                "youtube": "",
                "tiktok": ""
            },
            "business_hours": "Monday - Friday: 8:00 AM - 5:00 PM",
            "vat_number": "",
            "company_registration": "",
            "meeting_link": ""
        }
    except Exception as e:
        logger.error(f"Error fetching site settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/site-settings", response_model=dict)
async def save_site_settings(data: dict, admin: UserResponse = Depends(get_current_super_admin)):
    """Save platform contact and social media settings"""
    try:
        settings = {
            "key": "site_settings",
            "contact": {
                "email": data.get("contact", {}).get("email", ""),
                "phone": data.get("contact", {}).get("phone", ""),
                "address": data.get("contact", {}).get("address", ""),
                "whatsapp": data.get("contact", {}).get("whatsapp", "")
            },
            "social_media": {
                "facebook": data.get("social_media", {}).get("facebook", ""),
                "twitter": data.get("social_media", {}).get("twitter", ""),
                "linkedin": data.get("social_media", {}).get("linkedin", ""),
                "instagram": data.get("social_media", {}).get("instagram", ""),
                "youtube": data.get("social_media", {}).get("youtube", ""),
                "tiktok": data.get("social_media", {}).get("tiktok", "")
            },
            "business_hours": data.get("business_hours", ""),
            "vat_number": data.get("vat_number", ""),
            "company_registration": data.get("company_registration", ""),
            "meeting_link": data.get("meeting_link", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.id
        }
        
        await db.platform_settings.update_one(
            {"key": "site_settings"},
            {"$set": settings},
            upsert=True
        )
        
        logger.info(f"Site settings updated by admin {admin.email}")
        
        return {"success": True, "message": "Site settings saved successfully"}
    except Exception as e:
        logger.error(f"Error saving site settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Platform Email/SMTP Settings
class PlatformEmailSettings(BaseModel):
    provider: str = "custom"  # office365, gmail, sendgrid, mailgun, custom
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    encryption: str = "tls"  # none, tls, ssl
    from_email: str = ""
    from_name: str = "UpShift"
    reply_to: Optional[str] = None


@admin_router.get("/email-settings", response_model=dict)
async def get_admin_email_settings(admin: UserResponse = Depends(get_current_super_admin)):
    """Get platform email/SMTP settings"""
    try:
        settings = await db.platform_settings.find_one({"key": "email"}, {"_id": 0})
        
        if settings:
            # Mask password
            if settings.get("smtp_password"):
                settings["smtp_password"] = "********"
            return {
                "provider": settings.get("provider", "custom"),
                "smtp_host": settings.get("smtp_host", ""),
                "smtp_port": settings.get("smtp_port", 587),
                "smtp_user": settings.get("smtp_user", ""),
                "smtp_password": settings.get("smtp_password", ""),
                "encryption": settings.get("encryption", "tls"),
                "from_email": settings.get("from_email", ""),
                "from_name": settings.get("from_name", "UpShift"),
                "reply_to": settings.get("reply_to", ""),
                "is_configured": settings.get("is_configured", False)
            }
        
        return {
            "provider": "custom",
            "smtp_host": "",
            "smtp_port": 587,
            "smtp_user": "",
            "smtp_password": "",
            "encryption": "tls",
            "from_email": "",
            "from_name": "UpShift",
            "reply_to": "",
            "is_configured": False
        }
    except Exception as e:
        logger.error(f"Error fetching email settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/email-settings", response_model=dict)
async def save_admin_email_settings(settings: PlatformEmailSettings, admin: UserResponse = Depends(get_current_super_admin)):
    """Save platform email/SMTP settings"""
    try:
        # Get existing to preserve password if masked
        existing = await db.platform_settings.find_one({"key": "email"}, {"_id": 0})
        
        settings_dict = settings.dict()
        settings_dict["key"] = "email"
        settings_dict["is_configured"] = bool(settings.smtp_host and settings.smtp_user)
        settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        settings_dict["updated_by"] = admin.id
        
        # If password is masked, keep the old one
        if settings.smtp_password == "********" and existing:
            settings_dict["smtp_password"] = existing.get("smtp_password", "")
        
        await db.platform_settings.update_one(
            {"key": "email"},
            {"$set": settings_dict},
            upsert=True
        )
        
        logger.info(f"Email settings updated by admin {admin.email}")
        
        return {"success": True, "message": "Email settings saved successfully"}
    except Exception as e:
        logger.error(f"Error saving email settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/email-settings/test", response_model=dict)
async def test_admin_email_connection(admin: UserResponse = Depends(get_current_super_admin)):
    """Test platform SMTP connection"""
    try:
        import smtplib
        import ssl
        
        settings = await db.platform_settings.find_one({"key": "email"}, {"_id": 0})
        
        if not settings or not settings.get("smtp_host") or not settings.get("smtp_user"):
            return {"success": False, "error": "Email settings not configured. Please enter SMTP host and username."}
        
        try:
            encryption = settings.get("encryption", "tls")
            
            if encryption == "ssl":
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(settings["smtp_host"], settings["smtp_port"], context=context, timeout=10) as server:
                    server.login(settings["smtp_user"], settings["smtp_password"])
            elif encryption == "tls":
                with smtplib.SMTP(settings["smtp_host"], settings["smtp_port"], timeout=10) as server:
                    server.starttls()
                    server.login(settings["smtp_user"], settings["smtp_password"])
            else:
                with smtplib.SMTP(settings["smtp_host"], settings["smtp_port"], timeout=10) as server:
                    server.login(settings["smtp_user"], settings["smtp_password"])
            
            return {"success": True, "message": "SMTP connection successful! Your email settings are working."}
        except smtplib.SMTPAuthenticationError:
            return {"success": False, "error": "Authentication failed. Please check your username and password."}
        except smtplib.SMTPConnectError:
            return {"success": False, "error": "Could not connect to SMTP server. Check host and port."}
        except Exception as e:
            return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@admin_router.post("/email-settings/send-test", response_model=dict)
async def send_admin_test_email(to_email: str, admin: UserResponse = Depends(get_current_super_admin)):
    """Send a test email using platform SMTP settings"""
    try:
        import smtplib
        import ssl
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        settings = await db.platform_settings.find_one({"key": "email"}, {"_id": 0})
        
        if not settings or not settings.get("smtp_host"):
            return {"success": False, "error": "Email settings not configured"}
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'UpShift - Test Email'
        from_email = settings.get('from_email') or settings['smtp_user']
        msg['From'] = f"{settings.get('from_name', 'UpShift')} <{from_email}>"
        msg['To'] = to_email
        
        if settings.get('reply_to'):
            msg['Reply-To'] = settings['reply_to']
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">UpShift</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937;">Test Email Successful! ✓</h2>
                <p style="color: #4b5563;">
                    Congratulations! Your SMTP settings are configured correctly.
                </p>
                <p style="color: #4b5563;">
                    This test email was sent from your UpShift platform to verify that emails are working properly.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #9ca3af; font-size: 12px;">
                    SMTP Server: {settings.get('smtp_host')}<br>
                    From: {from_email}
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_content, 'html'))
        
        encryption = settings.get("encryption", "tls")
        error_message = None
        
        try:
            if encryption == "ssl":
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(settings["smtp_host"], settings["smtp_port"], context=context, timeout=15) as server:
                    server.login(settings["smtp_user"], settings["smtp_password"])
                    server.send_message(msg)
            elif encryption == "tls":
                with smtplib.SMTP(settings["smtp_host"], settings["smtp_port"], timeout=15) as server:
                    server.starttls()
                    server.login(settings["smtp_user"], settings["smtp_password"])
                    server.send_message(msg)
            else:
                with smtplib.SMTP(settings["smtp_host"], settings["smtp_port"], timeout=15) as server:
                    server.login(settings["smtp_user"], settings["smtp_password"])
                    server.send_message(msg)
            
            # Log successful email to email_logs collection
            await db.email_logs.insert_one({
                "id": str(uuid.uuid4()),
                "type": "test_email",
                "to_email": to_email,
                "from_email": from_email,
                "subject": "UpShift - Test Email",
                "status": "sent",
                "sent_at": datetime.now(timezone.utc),
                "sent_by": admin.id,
                "smtp_host": settings.get("smtp_host"),
                "provider": settings.get("provider", "custom")
            })
            
            logger.info(f"Test email sent to {to_email} by admin {admin.email}")
            return {"success": True, "message": f"Test email sent successfully to {to_email}"}
            
        except smtplib.SMTPAuthenticationError as e:
            error_message = f"Authentication failed: Invalid username or password. Please verify your SMTP credentials."
            logger.error(f"SMTP Auth Error: {str(e)}")
        except smtplib.SMTPConnectError as e:
            error_message = f"Could not connect to SMTP server at {settings['smtp_host']}:{settings['smtp_port']}. Please verify host and port."
            logger.error(f"SMTP Connect Error: {str(e)}")
        except smtplib.SMTPRecipientsRefused as e:
            error_message = f"Recipient address rejected: {to_email}. The mail server refused this recipient."
            logger.error(f"SMTP Recipients Refused: {str(e)}")
        except smtplib.SMTPSenderRefused as e:
            error_message = f"Sender address rejected: {from_email}. The mail server refused this sender."
            logger.error(f"SMTP Sender Refused: {str(e)}")
        except smtplib.SMTPDataError as e:
            error_message = f"SMTP data error: The server rejected the email content. Error code: {e.smtp_code}"
            logger.error(f"SMTP Data Error: {str(e)}")
        except smtplib.SMTPException as e:
            error_message = f"SMTP error: {str(e)}"
            logger.error(f"SMTP Exception: {str(e)}")
        except TimeoutError:
            error_message = f"Connection timed out. The SMTP server at {settings['smtp_host']}:{settings['smtp_port']} did not respond."
            logger.error(f"SMTP Timeout for {settings['smtp_host']}")
        except Exception as e:
            error_message = f"Unexpected error: {str(e)}"
            logger.error(f"Unexpected SMTP error: {str(e)}")
        
        # Log failed email attempt to email_logs collection
        if error_message:
            await db.email_logs.insert_one({
                "id": str(uuid.uuid4()),
                "type": "test_email",
                "to_email": to_email,
                "from_email": from_email,
                "subject": "UpShift - Test Email",
                "status": "failed",
                "error": error_message,
                "sent_at": datetime.now(timezone.utc),
                "sent_by": admin.id,
                "smtp_host": settings.get("smtp_host"),
                "provider": settings.get("provider", "custom")
            })
            return {"success": False, "error": error_message}
            
    except Exception as e:
        logger.error(f"Error in send_admin_test_email: {str(e)}")
        return {"success": False, "error": str(e)}



# ==================== Platform Pricing Routes ====================

@admin_router.get("/platform-pricing", response_model=dict)
async def get_platform_pricing(admin: UserResponse = Depends(get_current_super_admin)):
    """Get all platform pricing configuration"""
    try:
        pricing_config = await db.platform_settings.find_one(
            {"key": "platform_pricing"},
            {"_id": 0}
        )
        
        # Default values
        default_config = {
            "whitelabel_plans": {
                "starter": {
                    "name": "Starter",
                    "price": 249900,
                    "active_users_limit": 50,
                    "custom_subdomain": True,
                    "custom_domain": False,
                    "api_access": False,
                    "priority_support": False,
                    "analytics": "basic",
                    "templates": "standard",
                    "enabled": True
                },
                "professional": {
                    "name": "Professional",
                    "price": 499900,
                    "active_users_limit": 200,
                    "custom_subdomain": True,
                    "custom_domain": True,
                    "api_access": True,
                    "priority_support": True,
                    "analytics": "advanced",
                    "templates": "premium",
                    "enabled": True
                },
                "custom": {
                    "name": "Enterprise",
                    "price": 0,
                    "active_users_limit": -1,
                    "custom_subdomain": True,
                    "custom_domain": True,
                    "api_access": True,
                    "priority_support": True,
                    "analytics": "enterprise",
                    "templates": "all",
                    "enabled": True,
                    "contact_sales": True
                }
            },
            "whitelabel_pricing": {
                "monthly_subscription": 250000,
                "setup_fee": 0,
                "per_transaction_fee": 0,
                "minimum_commitment_months": 1
            },
            "default_tier_pricing": {
                "tier_1_price": 89900,
                "tier_2_price": 150000,
                "tier_3_price": 300000,
                "currency": "ZAR"
            },
            "strategy_call_pricing": {
                "price": 69900,
                "duration_minutes": 30,
                "included_in_tier_3": True,
                "enabled": True
            }
        }
        
        if pricing_config and pricing_config.get("value"):
            return {**default_config, **pricing_config["value"]}
        
        return default_config
        
    except Exception as e:
        logger.error(f"Error fetching platform pricing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.put("/platform-pricing", response_model=dict)
async def update_platform_pricing(
    data: dict,
    admin: UserResponse = Depends(get_current_super_admin)
):
    """Update platform pricing configuration"""
    try:
        pricing_data = {
            "key": "platform_pricing",
            "value": {
                "whitelabel_plans": data.get("whitelabel_plans", {}),
                "whitelabel_pricing": data.get("whitelabel_pricing", {}),
                "default_tier_pricing": data.get("default_tier_pricing", {}),
                "strategy_call_pricing": data.get("strategy_call_pricing", {})
            },
            "updated_at": datetime.now(timezone.utc),
            "updated_by": admin.id
        }
        
        await db.platform_settings.update_one(
            {"key": "platform_pricing"},
            {"$set": pricing_data},
            upsert=True
        )
        
        logger.info(f"Platform pricing updated by admin {admin.email}")
        
        return {"success": True, "message": "Platform pricing updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating platform pricing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ==================== OpenAI/ChatGPT Settings ====================

@admin_router.get("/openai-settings", response_model=dict)
async def get_openai_settings(admin: UserResponse = Depends(get_current_super_admin)):
    """Get OpenAI/ChatGPT configuration"""
    try:
        import os
        settings = await db.platform_settings.find_one({"key": "openai_settings"}, {"_id": 0})
        
        # Check if Emergent key is configured in environment
        emergent_key = os.environ.get("EMERGENT_LLM_KEY")
        
        if settings:
            return {
                "api_key": "********" if settings.get("api_key") else "",
                "model": settings.get("model", "gpt-4o"),
                "is_emergent_key": settings.get("is_emergent_key", True),
                "is_configured": bool(settings.get("api_key")) or bool(emergent_key),
                "updated_at": settings.get("updated_at")
            }
        
        # Return defaults - using Emergent key
        return {
            "api_key": "",
            "model": "gpt-4o",
            "is_emergent_key": True,
            "is_configured": bool(emergent_key)
        }
    except Exception as e:
        logger.error(f"Error fetching OpenAI settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/openai-settings", response_model=dict)
async def save_openai_settings(data: dict, admin: UserResponse = Depends(get_current_super_admin)):
    """Save OpenAI/ChatGPT configuration"""
    try:
        settings = {
            "key": "openai_settings",
            "model": data.get("model", "gpt-4o"),
            "is_emergent_key": data.get("is_emergent_key", True),
            "updated_at": datetime.now(timezone.utc),
            "updated_by": admin.id
        }
        
        # Only update API key if provided and not using Emergent key
        if not data.get("is_emergent_key") and data.get("api_key") and data.get("api_key") != "********":
            settings["api_key"] = data.get("api_key")
        
        await db.platform_settings.update_one(
            {"key": "openai_settings"},
            {"$set": settings},
            upsert=True
        )
        
        logger.info(f"OpenAI settings updated by admin {admin.email}")
        
        return {"success": True, "message": "OpenAI settings saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving OpenAI settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/openai-settings/test", response_model=dict)
async def test_openai_connection(admin: UserResponse = Depends(get_current_super_admin)):
    """Test OpenAI API connection"""
    try:
        import os
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get settings
        settings = await db.platform_settings.find_one({"key": "openai_settings"}, {"_id": 0})
        
        # Determine which key to use
        if settings and not settings.get("is_emergent_key", True) and settings.get("api_key"):
            api_key = settings["api_key"]
        else:
            api_key = os.environ.get("EMERGENT_LLM_KEY")
        
        if not api_key:
            return {"success": False, "detail": "No API key configured"}
        
        model = settings.get("model", "gpt-4o") if settings else "gpt-4o"
        
        # Test with a simple request
        chat = LlmChat(
            api_key=api_key,
            session_id=f"test-{admin.id}",
            system_message="You are a helpful assistant."
        ).with_model("openai", model)
        
        user_message = UserMessage(text="Say 'Connection successful!' and nothing else.")
        response = await chat.send_message(user_message)
        
        if response and "successful" in response.lower():
            return {
                "success": True,
                "message": "OpenAI connection successful!",
                "model": model,
                "response": response
            }
        else:
            return {
                "success": True,
                "message": "OpenAI connection working",
                "model": model,
                "response": response[:100] if response else "No response"
            }
            
    except Exception as e:
        logger.error(f"Error testing OpenAI connection: {str(e)}")
        return {"success": False, "detail": str(e)}
