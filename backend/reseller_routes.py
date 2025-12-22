from fastapi import APIRouter, HTTPException, Depends, status, Request, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from reseller_models import (
    Reseller, ResellerCreate, ResellerUpdate, ResellerResponse,
    ResellerBranding, ResellerPricing, ResellerLegal,
    ResellerInvoice, InvoiceResponse, WhiteLabelConfig
)
from auth import UserResponse, get_password_hash

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
        
        # Create reseller
        reseller_id = str(uuid.uuid4())
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
                "status": "pending",
                "next_billing_date": None,
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
    return {
        "id": reseller["id"],
        "company_name": reseller["company_name"],
        "brand_name": reseller["brand_name"],
        "subdomain": reseller["subdomain"],
        "custom_domain": reseller.get("custom_domain"),
        "status": reseller["status"],
        "branding": reseller["branding"],
        "pricing": reseller["pricing"],
        "contact_info": reseller["contact_info"],
        "legal": reseller.get("legal", {}),
        "subscription": reseller["subscription"],
        "stats": reseller["stats"],
        "api_key": reseller["api_key"],
        "created_at": reseller["created_at"]
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
        
        # Revenue calculations
        pipeline = [
            {"$match": {"reseller_id": reseller_id, "status": "succeeded"}},
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
                    "status": "succeeded",
                    "created_at": {"$gte": start_of_month}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount_cents"}}}
        ]
        month_result = await db.payments.aggregate(pipeline_month).to_list(1)
        this_month_revenue = month_result[0]["total"] if month_result else 0
        
        # Update stats in reseller document
        await db.resellers.update_one(
            {"id": reseller_id},
            {
                "$set": {
                    "stats": {
                        "total_customers": total_customers,
                        "active_customers": active_customers,
                        "total_revenue": total_revenue,
                        "this_month_revenue": this_month_revenue
                    }
                }
            }
        )
        
        return {
            "total_customers": total_customers,
            "active_customers": active_customers,
            "total_revenue": total_revenue,
            "this_month_revenue": this_month_revenue,
            "currency": reseller["pricing"].get("currency", "ZAR")
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
        
        # Get monthly revenue for last N months
        pipeline = [
            {"$match": {"reseller_id": reseller_id, "status": "succeeded"}},
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
            "currency": reseller["pricing"].get("currency", "ZAR")
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
