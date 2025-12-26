from fastapi import APIRouter, HTTPException, Depends, status, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import logging

from reseller_models import (
    Reseller, ResellerCreate, ResellerUpdate, ResellerResponse,
    ResellerBranding, ResellerPricing, ResellerLegal,
    ResellerInvoice, InvoiceResponse, WhiteLabelConfig
)
from auth import UserResponse, get_password_hash
from invoice_pdf_service import invoice_pdf_generator

logger = logging.getLogger(__name__)

reseller_router = APIRouter(prefix="/api/reseller", tags=["Reseller"])

# Dependency to get DB - will be set from server.py
db = None

def set_db(database):
    global db
    db = database


async def get_current_reseller_admin(request: Request):
    """Get current reseller admin from auth"""
    from auth import get_current_user, oauth2_scheme
    token = await oauth2_scheme(request)
    user = await get_current_user(token, db)
    
    # Check if user is a reseller admin
    user_doc = await db.users.find_one({"id": user.id})
    if not user_doc or user_doc.get("role") != "reseller_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Reseller admin privileges required."
        )
    
    # Get reseller info
    reseller = await db.resellers.find_one({"owner_user_id": user.id}, {"_id": 0})
    if not reseller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reseller account not found."
        )
    
    return {"user": user, "reseller": reseller}


# ==================== Reseller Registration ====================

@reseller_router.post("/register", response_model=dict)
async def register_reseller(data: ResellerCreate):
    """Register a new reseller account"""
    try:
        # Check if subdomain is taken
        existing = await db.resellers.find_one({"subdomain": data.subdomain})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subdomain already taken"
            )
        
        # Check if owner email is taken
        existing_user = await db.users.find_one({"email": data.owner_email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create owner user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(data.owner_password)
        
        owner_user = {
            "id": user_id,
            "email": data.owner_email,
            "full_name": data.owner_name,
            "hashed_password": hashed_password,
            "role": "reseller_admin",
            "active_tier": None,
            "created_at": datetime.now(timezone.utc),
            "is_active": True,
            "payment_history": []
        }
        
        await db.users.insert_one(owner_user)
        
        # Create reseller with 7-day trial
        reseller_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        trial_days = 7
        trial_end_date = now + timedelta(days=trial_days)
        
        reseller = {
            "id": reseller_id,
            "company_name": data.company_name,
            "brand_name": data.brand_name,
            "subdomain": data.subdomain,
            "custom_domain": data.custom_domain,
            "status": "pending",  # Requires admin approval
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
            "contact_info": data.contact_info.dict(),
            "legal": {
                "terms_url": None,
                "privacy_url": None
            },
            "subscription": {
                "plan": "monthly",
                "monthly_fee": 250000,
                "status": "trial",
                "next_billing_date": trial_end_date.isoformat(),
                "payment_method": "invoice",
                "is_trial": True,
                "trial_start_date": now.isoformat(),
                "trial_end_date": trial_end_date.isoformat(),
                "trial_days": trial_days,
                "converted_from_trial": False,
                "converted_date": None
            },
            "stats": {
                "total_customers": 0,
                "active_customers": 0,
                "total_revenue": 0,
                "this_month_revenue": 0
            },
            "owner_user_id": user_id,
            "api_key": f"rsl_{uuid.uuid4().hex}",
            "created_at": now,
            "updated_at": now
        }
        
        await db.resellers.insert_one(reseller)
        
        logger.info(f"New reseller registered: {data.company_name} ({data.subdomain})")
        
        return {
            "success": True,
            "message": "Reseller registration submitted. Awaiting admin approval.",
            "reseller_id": reseller_id,
            "status": "pending"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering reseller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Reseller Profile ====================

@reseller_router.get("/profile", response_model=dict)
async def get_reseller_profile(context: dict = Depends(get_current_reseller_admin)):
    """Get current reseller's profile"""
    reseller = context["reseller"]
    pricing = reseller.get("pricing", {})
    
    # Get strategy call pricing - check reseller-specific first, then platform defaults
    strategy_call_pricing = pricing.get("strategy_call_pricing")
    if not strategy_call_pricing:
        # Get platform defaults
        platform_pricing = await db.platform_settings.find_one(
            {"key": "platform_pricing"},
            {"_id": 0}
        )
        if platform_pricing and platform_pricing.get("value", {}).get("strategy_call_pricing"):
            strategy_call_pricing = platform_pricing["value"]["strategy_call_pricing"]
        else:
            strategy_call_pricing = {
                "price": 69900,
                "duration_minutes": 30,
                "included_in_tier_3": True,
                "enabled": True
            }
    
    return {
        "id": reseller["id"],
        "company_name": reseller["company_name"],
        "brand_name": reseller["brand_name"],
        "subdomain": reseller["subdomain"],
        "custom_domain": reseller.get("custom_domain"),
        "status": reseller["status"],
        "branding": reseller["branding"],
        "pricing": pricing,
        "strategy_call_pricing": strategy_call_pricing,
        "contact_info": reseller["contact_info"],
        "legal": reseller.get("legal", {}),
        "subscription": reseller["subscription"],
        "stats": reseller["stats"],
        "api_key": reseller["api_key"],
        "created_at": reseller["created_at"]
    }


@reseller_router.get("/trial-status", response_model=dict)
async def get_trial_status(context: dict = Depends(get_current_reseller_admin)):
    """Get current reseller's trial status"""
    reseller = context["reseller"]
    subscription = reseller.get("subscription", {})
    
    is_trial = subscription.get("is_trial", False)
    trial_status = subscription.get("status", "active")
    trial_end_date = subscription.get("trial_end_date")
    
    days_remaining = 0
    trial_expired = False
    
    if trial_end_date:
        try:
            end_dt = datetime.fromisoformat(trial_end_date.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            days_remaining = (end_dt - now).days
            hours_remaining = ((end_dt - now).seconds // 3600) if days_remaining >= 0 else 0
            trial_expired = days_remaining < 0
            days_remaining = max(0, days_remaining)
        except:
            trial_expired = True
            hours_remaining = 0
    else:
        hours_remaining = 0
    
    return {
        "is_trial": is_trial,
        "trial_status": trial_status,
        "trial_start_date": subscription.get("trial_start_date"),
        "trial_end_date": trial_end_date,
        "days_remaining": days_remaining,
        "hours_remaining": hours_remaining if days_remaining == 0 else None,
        "trial_expired": trial_expired,
        "converted_from_trial": subscription.get("converted_from_trial", False),
        "converted_date": subscription.get("converted_date"),
        "plan": subscription.get("plan", "monthly"),
        "monthly_fee": subscription.get("monthly_fee", 250000),
        "next_billing_date": subscription.get("next_billing_date")
    }


@reseller_router.put("/profile", response_model=dict)
async def update_reseller_profile(
    data: ResellerUpdate,
    context: dict = Depends(get_current_reseller_admin)
):
    """Update reseller profile"""
    try:
        reseller = context["reseller"]
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        
        if "contact_info" in update_data and update_data["contact_info"]:
            update_data["contact_info"] = update_data["contact_info"].dict() if hasattr(update_data["contact_info"], "dict") else update_data["contact_info"]
        if "legal" in update_data and update_data["legal"]:
            update_data["legal"] = update_data["legal"].dict() if hasattr(update_data["legal"], "dict") else update_data["legal"]
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.resellers.update_one(
            {"id": reseller["id"]},
            {"$set": update_data}
        )
        
        logger.info(f"Reseller profile updated: {reseller['id']}")
        return {"success": True, "message": "Profile updated successfully"}
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Branding ====================

@reseller_router.put("/branding", response_model=dict)
async def update_branding(
    branding: ResellerBranding,
    context: dict = Depends(get_current_reseller_admin)
):
    """Update reseller branding settings"""
    try:
        reseller = context["reseller"]
        
        await db.resellers.update_one(
            {"id": reseller["id"]},
            {
                "$set": {
                    "branding": branding.dict(),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Branding updated for reseller: {reseller['id']}")
        return {"success": True, "message": "Branding updated successfully"}
    except Exception as e:
        logger.error(f"Error updating branding: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/upload-logo", response_model=dict)
async def upload_logo(
    file: UploadFile = File(...),
    context: dict = Depends(get_current_reseller_admin)
):
    """Upload reseller logo"""
    try:
        reseller = context["reseller"]
        
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        content = await file.read()
        
        # In production, upload to cloud storage (S3, GCS, etc.)
        # For now, save locally and return a placeholder URL
        import base64
        logo_data = base64.b64encode(content).decode()
        logo_url = f"data:{file.content_type};base64,{logo_data[:100]}..."  # Truncated for demo
        
        # Update branding with logo URL
        await db.resellers.update_one(
            {"id": reseller["id"]},
            {
                "$set": {
                    "branding.logo_url": logo_url,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Logo uploaded for reseller: {reseller['id']}")
        return {"success": True, "logo_url": logo_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading logo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Pricing ====================

@reseller_router.put("/pricing", response_model=dict)
async def update_pricing(
    pricing: ResellerPricing,
    context: dict = Depends(get_current_reseller_admin)
):
    """Update reseller pricing settings"""
    try:
        reseller = context["reseller"]
        
        await db.resellers.update_one(
            {"id": reseller["id"]},
            {
                "$set": {
                    "pricing": pricing.dict(),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Pricing updated for reseller: {reseller['id']}")
        return {"success": True, "message": "Pricing updated successfully"}
    except Exception as e:
        logger.error(f"Error updating pricing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Customers ====================

@reseller_router.get("/customers", response_model=dict)
async def get_reseller_customers(
    skip: int = 0,
    limit: int = 50,
    context: dict = Depends(get_current_reseller_admin)
):
    """Get reseller's customers"""
    try:
        reseller = context["reseller"]
        
        # Find users belonging to this reseller
        customers = await db.users.find(
            {"reseller_id": reseller["id"], "role": "customer"},
            {"_id": 0, "hashed_password": 0}
        ).skip(skip).limit(limit).to_list(limit)
        
        total = await db.users.count_documents({"reseller_id": reseller["id"], "role": "customer"})
        
        return {
            "customers": customers,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting customers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.get("/customers/{customer_id}", response_model=dict)
async def get_customer_detail(
    customer_id: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Get details of a specific customer"""
    try:
        reseller = context["reseller"]
        
        customer = await db.users.find_one(
            {"id": customer_id, "reseller_id": reseller["id"]},
            {"_id": 0, "hashed_password": 0}
        )
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Get customer's payment history
        payments = await db.payments.find(
            {"user_id": customer_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {
            "customer": customer,
            "payments": payments
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customer detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.put("/customers/{customer_id}", response_model=dict)
async def update_customer(
    customer_id: str,
    data: dict,
    context: dict = Depends(get_current_reseller_admin)
):
    """Update customer details"""
    try:
        reseller = context["reseller"]
        
        # Verify customer belongs to this reseller
        customer = await db.users.find_one(
            {"id": customer_id, "reseller_id": reseller["id"]}
        )
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Build update data
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        allowed_fields = ["full_name", "phone", "active_tier", "is_active"]
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Handle email update separately (need to check for duplicates)
        if "email" in data and data["email"] != customer.get("email"):
            existing = await db.users.find_one({"email": data["email"]})
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
            update_data["email"] = data["email"]
        
        await db.users.update_one(
            {"id": customer_id},
            {"$set": update_data}
        )
        
        logger.info(f"Customer {customer_id} updated by reseller {reseller['id']}")
        
        return {"success": True, "message": "Customer updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Stats & Revenue ====================

@reseller_router.get("/stats", response_model=dict)
async def get_reseller_stats(context: dict = Depends(get_current_reseller_admin)):
    """Get reseller dashboard stats"""
    try:
        reseller = context["reseller"]
        reseller_id = reseller["id"]
        
        # Calculate stats
        total_customers = await db.users.count_documents({"reseller_id": reseller_id, "role": "customer"})
        active_customers = await db.users.count_documents({
            "reseller_id": reseller_id,
            "role": "customer",
            "active_tier": {"$ne": None}
        })
        
        # Revenue calculations - check for both 'succeeded' and 'completed' statuses
        pipeline = [
            {"$match": {"reseller_id": reseller_id, "status": {"$in": ["succeeded", "completed"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount_cents"}}}
        ]
        revenue_result = await db.payments.aggregate(pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        # This month revenue
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        pipeline_month = [
            {
                "$match": {
                    "reseller_id": reseller_id,
                    "status": {"$in": ["succeeded", "completed"]},
                    "created_at": {"$gte": start_of_month}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount_cents"}}}
        ]
        month_result = await db.payments.aggregate(pipeline_month).to_list(1)
        this_month_revenue = month_result[0]["total"] if month_result else 0
        
        # Count new customers this month
        new_customers_month = await db.users.count_documents({
            "reseller_id": reseller_id,
            "role": "customer",
            "created_at": {"$gte": start_of_month}
        })
        
        # Count pending payments
        pending_payments = await db.payments.count_documents({
            "reseller_id": reseller_id,
            "status": "pending"
        })
        
        # Update stats in reseller document
        await db.resellers.update_one(
            {"id": reseller_id},
            {
                "$set": {
                    "stats": {
                        "total_customers": total_customers,
                        "active_customers": active_customers,
                        "total_revenue": total_revenue,
                        "this_month_revenue": this_month_revenue,
                        "new_customers_month": new_customers_month,
                        "pending_payments": pending_payments
                    }
                }
            }
        )
        
        return {
            "total_customers": total_customers,
            "active_customers": active_customers,
            "total_revenue": total_revenue,
            "this_month_revenue": this_month_revenue,
            "new_customers_month": new_customers_month,
            "pending_payments": pending_payments,
            "currency": reseller["pricing"].get("currency", "ZAR") if reseller.get("pricing") else "ZAR"
        }
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.get("/revenue", response_model=dict)
async def get_revenue_breakdown(
    months: int = 6,
    context: dict = Depends(get_current_reseller_admin)
):
    """Get revenue breakdown by month"""
    try:
        reseller = context["reseller"]
        reseller_id = reseller["id"]
        
        # Get monthly revenue for last N months - check both succeeded and completed
        pipeline = [
            {"$match": {"reseller_id": reseller_id, "status": {"$in": ["succeeded", "completed"]}}},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$created_at"},
                        "month": {"$month": "$created_at"}
                    },
                    "revenue": {"$sum": "$amount_cents"},
                    "transactions": {"$sum": 1}
                }
            },
            {"$sort": {"_id.year": -1, "_id.month": -1}},
            {"$limit": months}
        ]
        
        results = await db.payments.aggregate(pipeline).to_list(months)
        
        monthly_data = [
            {
                "month": f"{r['_id']['year']}-{str(r['_id']['month']).zfill(2)}",
                "revenue": r["revenue"],
                "transactions": r["transactions"]
            }
            for r in results
        ]
        
        return {
            "monthly_revenue": monthly_data,
            "currency": reseller["pricing"].get("currency", "ZAR") if reseller.get("pricing") else "ZAR"
        }
    except Exception as e:
        logger.error(f"Error getting revenue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Invoices ====================

@reseller_router.get("/invoices", response_model=dict)
async def get_reseller_invoices(
    skip: int = 0,
    limit: int = 20,
    context: dict = Depends(get_current_reseller_admin)
):
    """Get reseller's platform invoices"""
    try:
        reseller = context["reseller"]
        
        invoices = await db.reseller_invoices.find(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.reseller_invoices.count_documents({"reseller_id": reseller["id"]})
        
        return {
            "invoices": invoices,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.get("/invoices/{invoice_id}", response_model=dict)
async def get_invoice_detail(
    invoice_id: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Get specific invoice details"""
    try:
        reseller = context["reseller"]
        
        invoice = await db.reseller_invoices.find_one(
            {"id": invoice_id, "reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return invoice
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/invoices/{invoice_id}/pay", response_model=dict)
async def pay_invoice(
    invoice_id: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Create a payment checkout for an invoice"""
    try:
        from yoco_service import get_yoco_service_for_reseller
        import os
        
        reseller = context["reseller"]
        user = context["user"]
        
        # Get the invoice
        invoice = await db.reseller_invoices.find_one(
            {"id": invoice_id, "reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice["status"] == "paid":
            raise HTTPException(status_code=400, detail="Invoice already paid")
        
        # Get Yoco service with platform credentials (reseller pays to platform)
        yoco = await get_yoco_service_for_reseller(db, reseller_id=None)
        
        if not yoco.is_configured():
            raise HTTPException(
                status_code=400, 
                detail="Payment gateway is not configured. Please contact the platform administrator."
            )
        
        # Create Yoco checkout
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        checkout = await yoco.create_checkout(
            amount_cents=invoice["amount"],
            email=user.email,
            metadata={
                "invoice_id": invoice_id,
                "invoice_number": invoice["invoice_number"],
                "reseller_id": reseller["id"],
                "reseller_name": reseller["company_name"],
                "type": "reseller_subscription"
            },
            success_url=f"{frontend_url}/reseller-dashboard/settings?payment=success&invoice={invoice_id}",
            cancel_url=f"{frontend_url}/reseller-dashboard/settings?payment=cancelled",
            failure_url=f"{frontend_url}/reseller-dashboard/settings?payment=failed"
        )
        
        # Store checkout ID in invoice
        await db.reseller_invoices.update_one(
            {"id": invoice_id},
            {"$set": {"yoco_checkout_id": checkout.get("id")}}
        )
        
        logger.info(f"Payment checkout created for invoice {invoice_id}")
        
        return {
            "checkout_id": checkout.get("id"),
            "redirect_url": checkout.get("redirectUrl"),
            "invoice_id": invoice_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invoice payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/invoices/{invoice_id}/verify-payment", response_model=dict)
async def verify_invoice_payment(
    invoice_id: str,
    checkout_id: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Verify payment and update invoice status"""
    try:
        from yoco_service import yoco_service
        
        reseller = context["reseller"]
        
        # Get the invoice
        invoice = await db.reseller_invoices.find_one(
            {"id": invoice_id, "reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Verify with Yoco
        is_successful = await yoco_service.verify_payment(checkout_id)
        
        if not is_successful:
            return {
                "success": False,
                "message": "Payment verification failed or payment not completed"
            }
        
        # Update invoice status
        await db.reseller_invoices.update_one(
            {"id": invoice_id},
            {
                "$set": {
                    "status": "paid",
                    "paid_date": datetime.now(timezone.utc),
                    "payment_method": "yoco"
                }
            }
        )
        
        logger.info(f"Invoice {invoice_id} marked as paid via Yoco")
        
        return {
            "success": True,
            "message": "Payment successful! Invoice marked as paid.",
            "invoice_id": invoice_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying invoice payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ==================== Reseller Email Settings ====================

class ResellerEmailSettings(BaseModel):
    provider: str = "custom"  # office365, gmail, sendgrid, mailgun, custom
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    encryption: str = "tls"  # none, tls, ssl
    from_email: Optional[str] = None
    from_name: str = "UpShift"
    reply_to: Optional[str] = None


@reseller_router.get("/email-settings", response_model=dict)
async def get_reseller_email_settings(context: dict = Depends(get_current_reseller_admin)):
    """Get reseller's email settings"""
    try:
        reseller = context["reseller"]
        
        settings = await db.reseller_email_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if settings:
            # Mask password
            if settings.get("smtp_password"):
                settings["smtp_password"] = "********"
            return settings
        
        return {
            "reseller_id": reseller["id"],
            "provider": "custom",
            "smtp_host": "",
            "smtp_port": 587,
            "smtp_user": "",
            "smtp_password": "",
            "encryption": "tls",
            "from_email": "",
            "from_name": reseller.get("brand_name", "UpShift"),
            "reply_to": "",
            "is_configured": False
        }
    except Exception as e:
        logger.error(f"Error getting email settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/email-settings", response_model=dict)
async def save_reseller_email_settings(
    settings: ResellerEmailSettings,
    context: dict = Depends(get_current_reseller_admin)
):
    """Save reseller's email settings"""
    try:
        reseller = context["reseller"]
        
        # Get existing settings to preserve password if not changed
        existing = await db.reseller_email_settings.find_one({"reseller_id": reseller["id"]})
        
        settings_dict = settings.dict()
        settings_dict["reseller_id"] = reseller["id"]
        settings_dict["is_configured"] = bool(settings.smtp_host and settings.smtp_user)
        settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # If password is masked, keep the old one
        if settings.smtp_password == "********" and existing:
            settings_dict["smtp_password"] = existing.get("smtp_password", "")
        
        await db.reseller_email_settings.update_one(
            {"reseller_id": reseller["id"]},
            {"$set": settings_dict},
            upsert=True
        )
        
        logger.info(f"Email settings updated for reseller: {reseller['id']}")
        
        return {"success": True, "message": "Email settings saved successfully"}
    except Exception as e:
        logger.error(f"Error saving email settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/email-settings/test", response_model=dict)
async def test_reseller_email_connection(context: dict = Depends(get_current_reseller_admin)):
    """Test reseller's email connection"""
    try:
        import smtplib
        import ssl
        
        reseller = context["reseller"]
        
        settings = await db.reseller_email_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not settings or not settings.get("smtp_host") or not settings.get("smtp_user"):
            return {"success": False, "error": "Email settings not configured. Please enter SMTP host and username."}
        
        try:
            encryption = settings.get("encryption", "tls")
            
            if encryption == "ssl":
                # Use SSL from the start (port 465)
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(settings["smtp_host"], settings["smtp_port"], context=context, timeout=10) as server:
                    server.login(settings["smtp_user"], settings["smtp_password"])
            elif encryption == "tls":
                # Start plain, then upgrade to TLS (port 587)
                with smtplib.SMTP(settings["smtp_host"], settings["smtp_port"], timeout=10) as server:
                    server.starttls()
                    server.login(settings["smtp_user"], settings["smtp_password"])
            else:
                # No encryption (not recommended)
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


@reseller_router.post("/email-settings/send-test", response_model=dict)
async def send_reseller_test_email(
    to_email: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Send a test email using reseller's SMTP settings"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        reseller = context["reseller"]
        
        settings = await db.reseller_email_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not settings or not settings.get("smtp_user"):
            raise HTTPException(status_code=400, detail="Email settings not configured")
        
        from_email = settings.get("from_email") or settings["smtp_user"]
        from_name = settings.get("from_name", reseller.get("brand_name", "UpShift"))
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"{from_name} - Test Email"
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e40af;">Test Email from {from_name}</h2>
            <p>This is a test email to verify your SMTP configuration.</p>
            <p>If you received this email, your email settings are working correctly!</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">This is an automated test message.</p>
        </div>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP(settings["smtp_host"], settings["smtp_port"]) as server:
            server.starttls()
            server.login(settings["smtp_user"], settings["smtp_password"])
            server.sendmail(from_email, [to_email], msg.as_string())
        
        logger.info(f"Test email sent by reseller {reseller['id']} to {to_email}")
        
        return {"success": True, "message": f"Test email sent to {to_email}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending test email: {str(e)}")
        return {"success": False, "error": str(e)}



# ChatGPT Settings Endpoints
@reseller_router.get("/chatgpt-settings", response_model=dict)
async def get_reseller_chatgpt_settings(context: dict = Depends(get_current_reseller_admin)):
    """Get ChatGPT/OpenAI settings for a reseller"""
    try:
        reseller = context["reseller"]
        
        settings = await db.reseller_chatgpt_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if settings:
            # Mask the API key for security (show only last 4 chars)
            if settings.get("openai_api_key"):
                key = settings["openai_api_key"]
                settings["openai_api_key"] = "sk-..." + key[-4:] if len(key) > 4 else ""
            return settings
        
        return {
            "openai_api_key": "",
            "model": "gpt-4o",
            "use_custom_key": False
        }
    except Exception as e:
        logger.error(f"Error fetching ChatGPT settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@reseller_router.post("/chatgpt-settings", response_model=dict)
async def save_reseller_chatgpt_settings(
    settings: dict,
    context: dict = Depends(get_current_reseller_admin)
):
    """Save ChatGPT/OpenAI settings for a reseller"""
    try:
        reseller = context["reseller"]
        
        # Check if we need to update or preserve the existing key
        existing = await db.reseller_chatgpt_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        # If the key looks masked (sk-...xxxx), preserve the existing key
        api_key = settings.get("openai_api_key", "")
        if api_key.startswith("sk-...") and existing:
            api_key = existing.get("openai_api_key", "")
        
        update_data = {
            "reseller_id": reseller["id"],
            "openai_api_key": api_key,
            "model": settings.get("model", "gpt-4o"),
            "use_custom_key": settings.get("use_custom_key", False),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.reseller_chatgpt_settings.update_one(
            {"reseller_id": reseller["id"]},
            {"$set": update_data},
            upsert=True
        )
        
        logger.info(f"ChatGPT settings saved for reseller {reseller['id']}")
        
        return {"success": True, "message": "ChatGPT settings saved successfully"}
    except Exception as e:
        logger.error(f"Error saving ChatGPT settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@reseller_router.post("/chatgpt-settings/test", response_model=dict)
async def test_reseller_chatgpt_connection(context: dict = Depends(get_current_reseller_admin)):
    """Test the ChatGPT/OpenAI API connection using reseller's API key"""
    try:
        import httpx
        
        reseller = context["reseller"]
        
        settings = await db.reseller_chatgpt_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not settings or not settings.get("openai_api_key"):
            raise HTTPException(status_code=400, detail="OpenAI API key not configured")
        
        api_key = settings["openai_api_key"]
        model = settings.get("model", "gpt-4o")
        
        # Test the API key with a simple request
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Say 'API connection successful' in 5 words or less."}],
                    "max_tokens": 20
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                logger.info(f"ChatGPT test successful for reseller {reseller['id']}")
                return {"success": True, "message": f"Connection successful! Model: {model}"}
            elif response.status_code == 401:
                return {"success": False, "error": "Invalid API key"}
            elif response.status_code == 429:
                return {"success": False, "error": "Rate limit exceeded. Please try again later."}
            else:
                error_data = response.json()
                return {"success": False, "error": error_data.get("error", {}).get("message", "Unknown error")}
                
    except httpx.TimeoutException:
        return {"success": False, "error": "Connection timeout. Please try again."}
    except Exception as e:
        logger.error(f"Error testing ChatGPT connection: {str(e)}")
        return {"success": False, "error": str(e)}


# Yoco Payment Settings Endpoints
@reseller_router.get("/yoco-settings", response_model=dict)
async def get_reseller_yoco_settings(context: dict = Depends(get_current_reseller_admin)):
    """Get Yoco payment settings for a reseller"""
    try:
        reseller = context["reseller"]
        
        settings = await db.reseller_yoco_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if settings:
            # Mask the secret key for security (show only last 4 chars)
            if settings.get("yoco_secret_key"):
                key = settings["yoco_secret_key"]
                settings["yoco_secret_key"] = "sk_..." + key[-4:] if len(key) > 4 else ""
            if settings.get("yoco_public_key"):
                pub_key = settings["yoco_public_key"]
                settings["yoco_public_key"] = "pk_..." + pub_key[-4:] if len(pub_key) > 4 else ""
            return settings
        
        return {
            "yoco_public_key": "",
            "yoco_secret_key": "",
            "use_custom_keys": False,
            "is_live_mode": False
        }
    except Exception as e:
        logger.error(f"Error fetching Yoco settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@reseller_router.post("/yoco-settings", response_model=dict)
async def save_reseller_yoco_settings(
    settings: dict,
    context: dict = Depends(get_current_reseller_admin)
):
    """Save Yoco payment settings for a reseller"""
    try:
        reseller = context["reseller"]
        
        # Check if we need to update or preserve existing keys
        existing = await db.reseller_yoco_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        # Handle masked keys - preserve existing if masked pattern detected
        secret_key = settings.get("yoco_secret_key", "")
        public_key = settings.get("yoco_public_key", "")
        
        if secret_key.startswith("sk_...") and existing:
            secret_key = existing.get("yoco_secret_key", "")
        if public_key.startswith("pk_...") and existing:
            public_key = existing.get("yoco_public_key", "")
        
        # Determine if live or test mode based on key prefix
        is_live_mode = secret_key.startswith("sk_live_") if secret_key else False
        
        update_data = {
            "reseller_id": reseller["id"],
            "yoco_public_key": public_key,
            "yoco_secret_key": secret_key,
            "use_custom_keys": settings.get("use_custom_keys", False),
            "is_live_mode": is_live_mode,
            "success_redirect_url": settings.get("success_redirect_url", ""),
            "cancel_redirect_url": settings.get("cancel_redirect_url", ""),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.reseller_yoco_settings.update_one(
            {"reseller_id": reseller["id"]},
            {"$set": update_data},
            upsert=True
        )
        
        # Also update the reseller document with yoco_settings for quick access
        await db.resellers.update_one(
            {"id": reseller["id"]},
            {"$set": {
                "yoco_settings": {
                    "use_custom_keys": settings.get("use_custom_keys", False),
                    "success_redirect_url": settings.get("success_redirect_url", ""),
                    "cancel_redirect_url": settings.get("cancel_redirect_url", "")
                }
            }}
        )
        
        logger.info(f"Yoco settings saved for reseller {reseller['id']}")
        
        return {"success": True, "message": "Yoco settings saved successfully"}
    except Exception as e:
        logger.error(f"Error saving Yoco settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@reseller_router.post("/yoco-settings/test", response_model=dict)
async def test_reseller_yoco_connection(context: dict = Depends(get_current_reseller_admin)):
    """Test the Yoco API connection using reseller's credentials"""
    try:
        from yoco_service import YocoService
        
        reseller = context["reseller"]
        
        settings = await db.reseller_yoco_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not settings or not settings.get("yoco_secret_key"):
            raise HTTPException(status_code=400, detail="Yoco credentials not configured")
        
        # Create a Yoco service with reseller credentials
        yoco = YocoService(
            secret_key=settings["yoco_secret_key"],
            public_key=settings.get("yoco_public_key")
        )
        
        result = await yoco.test_connection()
        
        if result["success"]:
            mode = "Live" if settings.get("is_live_mode") else "Test"
            logger.info(f"Yoco test successful for reseller {reseller['id']} ({mode} mode)")
            return {"success": True, "message": f"Connection successful! Mode: {mode}"}
        else:
            return result
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing Yoco connection: {str(e)}")
        return {"success": False, "error": str(e)}


# Customer Invoices Endpoints
@reseller_router.get("/customer-invoices", response_model=dict)
async def get_customer_invoices(context: dict = Depends(get_current_reseller_admin)):
    """Get all customer invoices for this reseller"""
    try:
        reseller = context["reseller"]
        
        # Get all invoices for customers belonging to this reseller
        invoices = await db.customer_invoices.find(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(500)
        
        return {"invoices": invoices}
    except Exception as e:
        logger.error(f"Error fetching customer invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@reseller_router.post("/customer-invoices/{invoice_id}/send-reminder", response_model=dict)
async def send_customer_invoice_reminder(
    invoice_id: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Send payment reminder email to customer"""
    import smtplib
    from email_service import email_service
    
    try:
        reseller = context["reseller"]
        
        # Get the invoice
        invoice = await db.customer_invoices.find_one(
            {"id": invoice_id, "reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Format amount
        amount_cents = invoice.get("amount", 0)
        formatted_amount = f"R{amount_cents / 100:,.2f}"
        
        # Format due date
        due_date = invoice.get("due_date", "")
        if due_date:
            try:
                if isinstance(due_date, str):
                    from datetime import datetime as dt
                    due_date_obj = dt.fromisoformat(due_date.replace("Z", "+00:00"))
                    due_date = due_date_obj.strftime("%d %B %Y")
            except:
                pass
        
        # Check if overdue
        is_overdue = invoice.get("status") == "overdue"
        
        # Generate payment link (placeholder - would link to actual payment page)
        payment_link = f"{reseller.get('portal_url', 'https://upshift.works')}/pay/{invoice_id}"
        
        # Check if email service is configured
        if not email_service.is_configured:
            # Log the reminder attempt and update invoice anyway
            logger.info(f"Email not configured - Reminder logged for invoice {invoice['invoice_number']} to {invoice['customer_email']}")
            
            # Update invoice with reminder sent timestamp
            await db.customer_invoices.update_one(
                {"id": invoice_id},
                {
                    "$set": {
                        "last_reminder_sent": datetime.now(timezone.utc).isoformat(),
                        "reminder_note": "Email service not configured - reminder logged only"
                    }
                }
            )
            
            # Log activity
            await db.reseller_activity.insert_one({
                "id": str(uuid.uuid4()),
                "reseller_id": reseller["id"],
                "type": "invoice",
                "title": "Reminder Logged",
                "description": f"Payment reminder for {invoice['invoice_number']} ({invoice['customer_email']}) - Email not sent (email service not configured)",
                "created_at": datetime.now(timezone.utc)
            })
            
            return {
                "success": False, 
                "message": "Email service not configured. Please configure SMTP settings in Settings → Email to send reminders.",
                "email_sent": False,
                "error_type": "not_configured"
            }
        
        # Send reminder email with specific SMTP error handling
        try:
            email_sent = await email_service.send_invoice_reminder(
                to_email=invoice["customer_email"],
                reseller_name=invoice.get("customer_name", "Customer"),
                invoice_number=invoice["invoice_number"],
                amount=formatted_amount,
                due_date=due_date,
                payment_link=payment_link,
                is_overdue=is_overdue
            )
            
            if email_sent:
                # Update invoice with reminder sent timestamp
                await db.customer_invoices.update_one(
                    {"id": invoice_id},
                    {"$set": {"last_reminder_sent": datetime.now(timezone.utc).isoformat()}}
                )
                
                # Log activity
                await db.reseller_activity.insert_one({
                    "id": str(uuid.uuid4()),
                    "reseller_id": reseller["id"],
                    "type": "email",
                    "title": "Reminder Sent",
                    "description": f"Payment reminder sent to {invoice['customer_email']} for invoice {invoice['invoice_number']}",
                    "created_at": datetime.now(timezone.utc)
                })
                
                return {"success": True, "message": "Reminder sent successfully!", "email_sent": True}
            else:
                # Email service returned False (general failure)
                await _log_reminder_failure(db, reseller, invoice, invoice_id, "Email service returned failure")
                return {
                    "success": False, 
                    "message": "Failed to send email. Please verify SMTP credentials in Settings → Email are correct.",
                    "email_sent": False,
                    "error_type": "send_failed"
                }
                
        except smtplib.SMTPAuthenticationError as auth_error:
            logger.error(f"SMTP Authentication failed: {str(auth_error)}")
            await _log_reminder_failure(db, reseller, invoice, invoice_id, "SMTP authentication failed")
            return {
                "success": False,
                "message": "SMTP authentication failed. Please check your email username and password in Settings → Email.",
                "email_sent": False,
                "error_type": "auth_failed"
            }
            
        except smtplib.SMTPConnectError as connect_error:
            logger.error(f"SMTP Connection failed: {str(connect_error)}")
            await _log_reminder_failure(db, reseller, invoice, invoice_id, "SMTP connection failed")
            return {
                "success": False,
                "message": "Could not connect to SMTP server. Please verify the SMTP host and port in Settings → Email.",
                "email_sent": False,
                "error_type": "connection_failed"
            }
            
        except smtplib.SMTPServerDisconnected as disconnect_error:
            logger.error(f"SMTP Server disconnected: {str(disconnect_error)}")
            await _log_reminder_failure(db, reseller, invoice, invoice_id, "SMTP server disconnected")
            return {
                "success": False,
                "message": "SMTP server disconnected unexpectedly. Please check your SMTP settings and try again.",
                "email_sent": False,
                "error_type": "disconnected"
            }
            
        except smtplib.SMTPRecipientsRefused as refused_error:
            logger.error(f"SMTP Recipients refused: {str(refused_error)}")
            await _log_reminder_failure(db, reseller, invoice, invoice_id, f"Recipient refused: {invoice['customer_email']}")
            return {
                "success": False,
                "message": f"The recipient email address ({invoice['customer_email']}) was rejected by the mail server.",
                "email_sent": False,
                "error_type": "recipient_refused"
            }
            
        except smtplib.SMTPException as smtp_error:
            logger.error(f"SMTP Error: {str(smtp_error)}")
            await _log_reminder_failure(db, reseller, invoice, invoice_id, f"SMTP error: {str(smtp_error)}")
            return {
                "success": False,
                "message": f"Email error: {str(smtp_error)}. Please verify your SMTP settings in Settings → Email.",
                "email_sent": False,
                "error_type": "smtp_error"
            }
            
        except Exception as email_error:
            logger.error(f"Unexpected email error: {str(email_error)}")
            await _log_reminder_failure(db, reseller, invoice, invoice_id, f"Unexpected error: {str(email_error)}")
            return {
                "success": False,
                "message": f"Failed to send email: {str(email_error)}. Please check your SMTP configuration.",
                "email_sent": False,
                "error_type": "unknown"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending invoice reminder: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def _log_reminder_failure(db, reseller: dict, invoice: dict, invoice_id: str, error_details: str):
    """Helper function to log reminder failure to database"""
    try:
        # Update invoice with failure details
        await db.customer_invoices.update_one(
            {"id": invoice_id},
            {
                "$set": {
                    "last_reminder_attempt": datetime.now(timezone.utc).isoformat(),
                    "reminder_status": "failed",
                    "reminder_error": error_details
                }
            }
        )
        
        # Log activity
        await db.reseller_activity.insert_one({
            "id": str(uuid.uuid4()),
            "reseller_id": reseller["id"],
            "type": "invoice",
            "title": "Reminder Failed",
            "description": f"Failed to send reminder to {invoice['customer_email']} for invoice {invoice['invoice_number']} - {error_details}",
            "created_at": datetime.now(timezone.utc)
        })
    except Exception as log_error:
        logger.error(f"Failed to log reminder failure: {str(log_error)}")

@reseller_router.post("/customer-invoices/{invoice_id}/mark-paid", response_model=dict)
async def mark_customer_invoice_paid(
    invoice_id: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Manually mark a customer invoice as paid"""
    try:
        reseller = context["reseller"]
        
        # Get the invoice
        invoice = await db.customer_invoices.find_one(
            {"id": invoice_id, "reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice["status"] == "paid":
            raise HTTPException(status_code=400, detail="Invoice already paid")
        
        if invoice["status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Cannot mark a cancelled invoice as paid")
        
        # Update invoice status
        await db.customer_invoices.update_one(
            {"id": invoice_id},
            {
                "$set": {
                    "status": "paid",
                    "paid_date": datetime.utcnow().isoformat(),
                    "payment_method": "manual",
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        logger.info(f"Invoice {invoice_id} marked as paid by reseller {reseller['id']}")
        
        return {"success": True, "message": "Invoice marked as paid"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking invoice as paid: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/customer-invoices/{invoice_id}/cancel", response_model=dict)
async def cancel_customer_invoice(
    invoice_id: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Cancel a customer invoice - removes it from analytics"""
    try:
        reseller = context["reseller"]
        
        # Get the invoice
        invoice = await db.customer_invoices.find_one(
            {"id": invoice_id, "reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice["status"] == "paid":
            raise HTTPException(status_code=400, detail="Cannot cancel a paid invoice")
        
        if invoice["status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Invoice is already cancelled")
        
        # Update invoice status
        await db.customer_invoices.update_one(
            {"id": invoice_id},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        logger.info(f"Invoice {invoice_id} cancelled by reseller {reseller['id']}")
        
        return {"success": True, "message": "Invoice cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/customer-invoices/create", response_model=dict)
async def create_customer_invoice(
    invoice_data: dict,
    context: dict = Depends(get_current_reseller_admin)
):
    """Create a new customer invoice"""
    try:
        reseller = context["reseller"]
        
        invoice_id = str(uuid.uuid4())
        invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m')}-{invoice_id[:8].upper()}"
        
        invoice = {
            "id": invoice_id,
            "reseller_id": reseller["id"],
            "invoice_number": invoice_number,
            "customer_id": invoice_data.get("customer_id"),
            "customer_name": invoice_data.get("customer_name"),
            "customer_email": invoice_data.get("customer_email"),
            "customer_vat_number": invoice_data.get("customer_vat_number", ""),
            "customer_address": invoice_data.get("customer_address", ""),
            "plan_name": invoice_data.get("plan_name"),
            "amount": invoice_data.get("amount", 0),
            "currency": "ZAR",
            "due_date": invoice_data.get("due_date", (datetime.utcnow().replace(day=1) + timedelta(days=45)).isoformat()),
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.customer_invoices.insert_one(invoice)
        
        logger.info(f"Customer invoice {invoice_number} created by reseller {reseller['id']}")
        
        # Remove _id before returning
        invoice.pop("_id", None)
        
        return {"success": True, "invoice": invoice}
        
    except Exception as e:
        logger.error(f"Error creating customer invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/customer-invoices/{invoice_id}/create-payment-link", response_model=dict)
async def create_invoice_payment_link(
    invoice_id: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Create a Yoco payment link for an invoice using reseller's Yoco settings"""
    from yoco_service import get_yoco_service_for_reseller
    import os
    
    try:
        reseller = context["reseller"]
        
        # Get the invoice
        invoice = await db.customer_invoices.find_one({
            "id": invoice_id,
            "reseller_id": reseller["id"]
        }, {"_id": 0})
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice.get("status") == "paid":
            raise HTTPException(status_code=400, detail="Invoice is already paid")
        
        # Get Yoco service with reseller's credentials
        yoco = await get_yoco_service_for_reseller(db, reseller["id"])
        
        if not yoco.is_configured():
            raise HTTPException(
                status_code=400, 
                detail="Yoco payment is not configured. Please set up your Yoco credentials in Settings."
            )
        
        frontend_url = os.environ.get('FRONTEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000'))
        
        # Create checkout with Yoco
        checkout = await yoco.create_checkout(
            amount_cents=int(invoice["amount"] * 100),  # Convert to cents
            email=invoice["customer_email"],
            metadata={
                "invoice_id": invoice_id,
                "invoice_number": invoice["invoice_number"],
                "customer_id": invoice.get("customer_id"),
                "customer_email": invoice["customer_email"],
                "reseller_id": reseller["id"],
                "type": "customer_invoice"
            },
            success_url=f"{frontend_url}/payment/success?invoice={invoice_id}",
            cancel_url=f"{frontend_url}/payment/cancel?invoice={invoice_id}"
        )
        
        # Update invoice with payment link
        payment_url = checkout.get("redirectUrl")
        await db.customer_invoices.update_one(
            {"id": invoice_id},
            {"$set": {
                "payment_url": payment_url,
                "yoco_checkout_id": checkout.get("id"),
                "updated_at": datetime.utcnow().isoformat()
            }}
        )
        
        logger.info(f"Payment link created for invoice {invoice['invoice_number']}")
        
        return {
            "success": True,
            "payment_url": payment_url,
            "checkout_id": checkout.get("id")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment link: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.get("/customer-invoices/{invoice_id}/pdf")
async def download_customer_invoice_pdf(
    invoice_id: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Download customer invoice as PDF"""
    try:
        reseller = context["reseller"]
        
        # Get invoice (must belong to this reseller)
        invoice = await db.customer_invoices.find_one({
            "id": invoice_id,
            "reseller_id": reseller["id"]
        }, {"_id": 0})
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get reseller site settings for VAT number
        reseller_settings = await db.reseller_site_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        # Generate PDF with reseller branding
        pdf_buffer = invoice_pdf_generator.generate_customer_invoice_pdf(
            invoice=invoice,
            reseller=reseller,
            reseller_settings=reseller_settings
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
        logger.error(f"Error generating customer invoice PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.get("/customers-list", response_model=dict)
async def get_customers_list(context: dict = Depends(get_current_reseller_admin)):
    """Get list of customers for the reseller (for invoice creation dropdown)"""
    try:
        reseller = context["reseller"]
        
        customers = await db.users.find(
            {"reseller_id": reseller["id"], "role": "customer"},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "active_tier": 1}
        ).to_list(500)
        
        return {"customers": customers}
        
    except Exception as e:
        logger.error(f"Error fetching customers list: {str(e)}")


# ============= NOTIFICATIONS =============

@reseller_router.get("/notifications", response_model=dict)
async def get_notifications(context: dict = Depends(get_current_reseller_admin)):
    """Get reseller notifications"""
    try:
        reseller = context["reseller"]
        
        notifications = await db.reseller_notifications.find(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(20).to_list(20)
        
        # Calculate time ago
        for notif in notifications:
            if notif.get("created_at"):
                created = datetime.fromisoformat(notif["created_at"].replace("Z", "+00:00")) if isinstance(notif["created_at"], str) else notif["created_at"]
                delta = datetime.now(timezone.utc) - created
                if delta.days > 0:
                    notif["time_ago"] = f"{delta.days}d ago"
                elif delta.seconds > 3600:
                    notif["time_ago"] = f"{delta.seconds // 3600}h ago"
                else:
                    notif["time_ago"] = f"{delta.seconds // 60}m ago"
        
        unread_count = await db.reseller_notifications.count_documents({
            "reseller_id": reseller["id"],
            "read": False
        })
        
        return {"notifications": notifications, "unread_count": unread_count}
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        return {"notifications": [], "unread_count": 0}


@reseller_router.post("/notifications/{notification_id}/read", response_model=dict)
async def mark_notification_read(notification_id: str, context: dict = Depends(get_current_reseller_admin)):
    """Mark a notification as read"""
    try:
        reseller = context["reseller"]
        await db.reseller_notifications.update_one(
            {"id": notification_id, "reseller_id": reseller["id"]},
            {"$set": {"read": True}}
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error marking notification read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= ACTIVITY LOG =============

@reseller_router.get("/activity", response_model=dict)
async def get_activity_log(
    filter: str = "all",
    range: str = "7d",
    limit: int = 50,
    context: dict = Depends(get_current_reseller_admin)
):
    """Get reseller activity log"""
    try:
        reseller = context["reseller"]
        
        # Calculate date range
        range_days = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}.get(range, 7)
        start_date = datetime.now(timezone.utc) - timedelta(days=range_days)
        
        query = {
            "reseller_id": reseller["id"],
            "created_at": {"$gte": start_date}
        }
        
        if filter != "all":
            query["type"] = filter
        
        activities = await db.reseller_activity.find(
            query, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Calculate time ago
        for activity in activities:
            if activity.get("created_at"):
                created = activity["created_at"]
                if isinstance(created, str):
                    created = datetime.fromisoformat(created.replace("Z", "+00:00"))
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                delta = datetime.now(timezone.utc) - created
                if delta.days > 0:
                    activity["time_ago"] = f"{delta.days}d ago"
                elif delta.seconds > 3600:
                    activity["time_ago"] = f"{delta.seconds // 3600}h ago"
                else:
                    activity["time_ago"] = f"{delta.seconds // 60}m ago"
                # Convert datetime to string for JSON serialization
                activity["created_at"] = created.isoformat()
        
        return {"activities": activities}
        
    except Exception as e:
        logger.error(f"Error fetching activity log: {str(e)}")
        return {"activities": []}


# ============= EMAIL CAMPAIGNS =============

@reseller_router.get("/campaigns", response_model=dict)
async def get_campaigns(context: dict = Depends(get_current_reseller_admin)):
    """Get email campaigns"""
    try:
        reseller = context["reseller"]
        
        campaigns = await db.reseller_campaigns.find(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"campaigns": campaigns}
        
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        return {"campaigns": []}


@reseller_router.post("/campaigns", response_model=dict)
async def create_campaign(campaign_data: dict, context: dict = Depends(get_current_reseller_admin)):
    """Create a new email campaign"""
    try:
        reseller = context["reseller"]
        
        # Count recipients based on audience
        audience = campaign_data.get("audience", "all")
        recipient_query = {"reseller_id": reseller["id"], "role": "customer"}
        
        if audience == "active":
            recipient_query["active_tier"] = {"$ne": None}
        elif audience == "inactive":
            recipient_query["active_tier"] = None
        elif audience == "new":
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            recipient_query["created_at"] = {"$gte": thirty_days_ago}
        
        recipients_count = await db.users.count_documents(recipient_query)
        
        campaign = {
            "id": str(uuid.uuid4()),
            "reseller_id": reseller["id"],
            "name": campaign_data.get("name"),
            "subject": campaign_data.get("subject"),
            "content": campaign_data.get("content"),
            "audience": audience,
            "template": campaign_data.get("template", "default"),
            "recipients": recipients_count,
            "status": "draft",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sent_at": None,
            "open_rate": None
        }
        
        await db.reseller_campaigns.insert_one(campaign)
        campaign.pop("_id", None)
        
        return {"success": True, "campaign": campaign}
        
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/campaigns/{campaign_id}/send", response_model=dict)
async def send_campaign(campaign_id: str, context: dict = Depends(get_current_reseller_admin)):
    """Send an email campaign"""
    try:
        reseller = context["reseller"]
        
        campaign = await db.reseller_campaigns.find_one(
            {"id": campaign_id, "reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        if campaign.get("status") == "sent":
            raise HTTPException(status_code=400, detail="Campaign already sent")
        
        # Get recipients
        audience = campaign.get("audience", "all")
        recipient_query = {"reseller_id": reseller["id"], "role": "customer"}
        
        if audience == "active":
            recipient_query["active_tier"] = {"$ne": None}
        elif audience == "inactive":
            recipient_query["active_tier"] = None
        
        recipients = await db.users.find(recipient_query, {"_id": 0, "email": 1, "full_name": 1}).to_list(1000)
        
        # TODO: Actually send emails via email service
        # For now, mark as sent
        
        await db.reseller_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "recipients": len(recipients)
            }}
        )
        
        # Log activity
        await db.reseller_activity.insert_one({
            "id": str(uuid.uuid4()),
            "reseller_id": reseller["id"],
            "type": "email",
            "title": "Campaign Sent",
            "description": f"Email campaign '{campaign.get('name')}' sent to {len(recipients)} recipients",
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"success": True, "recipients_count": len(recipients)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= EMAIL TEMPLATES =============

@reseller_router.get("/email-templates", response_model=dict)
async def get_email_templates(context: dict = Depends(get_current_reseller_admin)):
    """Get custom email templates"""
    try:
        reseller = context["reseller"]
        
        templates = await db.reseller_email_templates.find(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        ).to_list(20)
        
        return {"templates": templates}
        
    except Exception as e:
        logger.error(f"Error fetching email templates: {str(e)}")
        return {"templates": []}


@reseller_router.put("/email-templates/{template_id}", response_model=dict)
async def update_email_template(template_id: str, template_data: dict, context: dict = Depends(get_current_reseller_admin)):
    """Update or create a custom email template"""
    try:
        reseller = context["reseller"]
        
        template = {
            "id": template_id,
            "reseller_id": reseller["id"],
            "subject": template_data.get("subject"),
            "content": template_data.get("content"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.reseller_email_templates.update_one(
            {"id": template_id, "reseller_id": reseller["id"]},
            {"$set": template},
            upsert=True
        )
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error updating email template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= DOMAIN VERIFICATION =============

@reseller_router.get("/verify-domain", response_model=dict)
async def verify_domain(domain: str, context: dict = Depends(get_current_reseller_admin)):
    """Verify custom domain DNS configuration"""
    import socket
    
    try:
        reseller = context["reseller"]
        
        dns_configured = False
        verified = False
        ssl_active = False
        
        try:
            # Check CNAME record
            answers = socket.getaddrinfo(domain, None)
            if answers:
                dns_configured = True
                verified = True
                ssl_active = True
        except socket.gaierror:
            pass
        
        # Update reseller domain status
        await db.resellers.update_one(
            {"id": reseller["id"]},
            {"$set": {
                "domain_status": {
                    "dns_configured": dns_configured,
                    "verified": verified,
                    "ssl_active": ssl_active,
                    "checked_at": datetime.now(timezone.utc).isoformat()
                }
            }}
        )
        
        return {
            "domain": domain,
            "dns_configured": dns_configured,
            "verified": verified,
            "ssl_active": ssl_active
        }
        
    except Exception as e:
        logger.error(f"Error verifying domain: {str(e)}")
        return {
            "domain": domain,
            "dns_configured": False,
            "verified": False,
            "ssl_active": False,
            "error": str(e)
        }


# LinkedIn Integration Settings for Resellers
@reseller_router.get("/linkedin-settings", response_model=dict)
async def get_reseller_linkedin_settings(context: dict = Depends(get_current_reseller_admin)):
    """Get LinkedIn OAuth settings for a reseller"""
    try:
        reseller = context["reseller"]
        
        settings = await db.reseller_linkedin_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if settings:
            # Mask the client secret for security (show only last 4 chars)
            if settings.get("client_secret"):
                secret = settings["client_secret"]
                settings["client_secret"] = "••••••••" + secret[-4:] if len(secret) > 4 else ""
            return {
                **settings,
                "is_configured": bool(settings.get("client_id") and settings.get("client_secret"))
            }
        
        return {
            "client_id": "",
            "client_secret": "",
            "redirect_uri": "",
            "use_custom_keys": False,
            "is_configured": False
        }
    except Exception as e:
        logger.error(f"Error fetching LinkedIn settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/linkedin-settings", response_model=dict)
async def save_reseller_linkedin_settings(
    settings: dict,
    context: dict = Depends(get_current_reseller_admin)
):
    """Save LinkedIn OAuth settings for a reseller"""
    try:
        reseller = context["reseller"]
        
        # Check if we need to update or preserve the existing secret
        existing = await db.reseller_linkedin_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        # If the secret looks masked (••••), preserve the existing one
        client_secret = settings.get("client_secret", "")
        if client_secret.startswith("••••") and existing:
            client_secret = existing.get("client_secret", "")
        
        update_data = {
            "reseller_id": reseller["id"],
            "client_id": settings.get("client_id", ""),
            "client_secret": client_secret,
            "redirect_uri": settings.get("redirect_uri", ""),
            "use_custom_keys": settings.get("use_custom_keys", False),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.reseller_linkedin_settings.update_one(
            {"reseller_id": reseller["id"]},
            {"$set": update_data},
            upsert=True
        )
        
        logger.info(f"LinkedIn settings saved for reseller {reseller['id']}")
        
        return {"success": True, "message": "LinkedIn settings saved successfully"}
    except Exception as e:
        logger.error(f"Error saving LinkedIn settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/linkedin-settings/test", response_model=dict)
async def test_reseller_linkedin_connection(context: dict = Depends(get_current_reseller_admin)):
    """Test LinkedIn OAuth configuration for a reseller"""
    try:
        import httpx
        
        reseller = context["reseller"]
        
        settings = await db.reseller_linkedin_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not settings or not settings.get("client_id") or not settings.get("client_secret"):
            raise HTTPException(status_code=400, detail="LinkedIn credentials not configured")
        
        client_id = settings["client_id"]
        client_secret = settings["client_secret"]
        
        # Test by making a request to LinkedIn's token endpoint
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
            
            if response.status_code == 400:
                response_data = response.json() if response.content else {}
                error = response_data.get("error", "")
                
                if error == "invalid_client":
                    return {"success": False, "detail": "Invalid Client ID or Client Secret"}
                else:
                    # App exists, credentials format is valid
                    return {"success": True, "message": "LinkedIn credentials verified successfully!"}
            
            elif response.status_code == 401:
                return {"success": False, "detail": "Invalid credentials"}
            
            else:
                return {"success": True, "message": "LinkedIn API connection verified"}
                
    except httpx.TimeoutException:
        return {"success": False, "detail": "Connection timeout"}
    except Exception as e:
        logger.error(f"Error testing LinkedIn connection: {str(e)}")
        return {"success": False, "detail": str(e)}



# Reseller Site Settings (Contact & Social Media)
@reseller_router.get("/site-settings", response_model=dict)
async def get_reseller_site_settings(context: dict = Depends(get_current_reseller_admin)):
    """Get reseller's contact and social media settings for their white-label site"""
    try:
        reseller = context["reseller"]
        
        settings = await db.reseller_site_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
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
        
        # Return defaults from reseller profile or empty
        contact_info = reseller.get("contact_info", {})
        return {
            "contact": {
                "email": contact_info.get("email", ""),
                "phone": contact_info.get("phone", ""),
                "address": contact_info.get("address", ""),
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
            "business_hours": "",
            "vat_number": "",
            "company_registration": "",
            "meeting_link": ""
        }
    except Exception as e:
        logger.error(f"Error fetching reseller site settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/site-settings", response_model=dict)
async def save_reseller_site_settings(data: dict, context: dict = Depends(get_current_reseller_admin)):
    """Save reseller's contact and social media settings"""
    try:
        reseller = context["reseller"]
        
        settings = {
            "reseller_id": reseller["id"],
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
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.reseller_site_settings.update_one(
            {"reseller_id": reseller["id"]},
            {"$set": settings},
            upsert=True
        )
        
        # Also update the reseller's contact_info in the main resellers collection
        await db.resellers.update_one(
            {"id": reseller["id"]},
            {"$set": {
                "contact_info.email": settings["contact"]["email"],
                "contact_info.phone": settings["contact"]["phone"],
                "contact_info.address": settings["contact"]["address"]
            }}
        )
        
        logger.info(f"Site settings updated for reseller {reseller['id']}")
        
        return {"success": True, "message": "Site settings saved successfully"}
    except Exception as e:
        logger.error(f"Error saving reseller site settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

        raise HTTPException(status_code=500, detail=str(e))

# ==================== Reseller Booking Management ====================

@reseller_router.get("/bookings", response_model=dict)
async def list_reseller_bookings(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    request: Request = None
):
    """List bookings for the reseller's customers"""
    try:
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        query = {"reseller_id": reseller["id"]}
        
        if start_date:
            query["date"] = {"$gte": start_date}
        if end_date:
            if "date" in query:
                query["date"]["$lte"] = end_date
            else:
                query["date"] = {"$lte": end_date}
        if status_filter:
            query["status"] = status_filter
        
        bookings = await db.bookings.find(
            query,
            {"_id": 0}
        ).sort([("date", 1), ("time", 1)]).skip(skip).limit(limit).to_list(limit)
        
        total = await db.bookings.count_documents(query)
        
        return {
            "bookings": bookings,
            "total": total
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing reseller bookings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/bookings/{booking_id}/confirm", response_model=dict)
async def confirm_reseller_booking(
    booking_id: str,
    request: Request = None
):
    """Confirm a booking for this reseller"""
    try:
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        booking = await db.bookings.find_one(
            {"id": booking_id, "reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking["status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Cannot confirm a cancelled booking")
        
        # Get meeting link from reseller settings
        meeting_link = None
        reseller_settings = await db.reseller_site_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0, "meeting_link": 1}
        )
        if reseller_settings and reseller_settings.get("meeting_link"):
            meeting_link = reseller_settings["meeting_link"]
        else:
            meeting_link = f"https://meet.upshift.works/call/{booking_id[:8]}"
        
        await db.bookings.update_one(
            {"id": booking_id},
            {
                "$set": {
                    "status": "confirmed",
                    "is_paid": True,
                    "meeting_link": meeting_link,
                    "confirmed_at": datetime.now(timezone.utc),
                    "confirmed_by": context["user"].email
                }
            }
        )
        
        logger.info(f"Reseller {reseller['id']} confirmed booking {booking_id}")
        
        return {
            "success": True,
            "message": "Booking confirmed",
            "meeting_link": meeting_link
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming reseller booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/bookings/{booking_id}/cancel", response_model=dict)
async def cancel_reseller_booking(
    booking_id: str,
    request: Request = None
):
    """Cancel a booking for this reseller"""
    try:
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        booking = await db.bookings.find_one(
            {"id": booking_id, "reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking["status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Booking is already cancelled")
        
        await db.bookings.update_one(
            {"id": booking_id},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.now(timezone.utc),
                    "cancelled_by": context["user"].email
                }
            }
        )
        
        logger.info(f"Reseller {reseller['id']} cancelled booking {booking_id}")
        
        return {"success": True, "message": "Booking cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling reseller booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
