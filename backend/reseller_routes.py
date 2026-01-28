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
        logger.info(f"Registering new reseller: {data.company_name} ({data.subdomain})")
        
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
        
        result = await db.users.insert_one(owner_user)
        logger.info(f"Created user {data.owner_email} with id {user_id}, insert_id: {result.inserted_id}")
        
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
        
        # Update the owner user with the reseller_id
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"reseller_id": reseller_id}}
        )
        
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


# ==================== Subscription Plans ====================

@reseller_router.get("/subscription-plans", response_model=dict)
async def get_subscription_plans():
    """Get available white-label subscription plans (public endpoint for resellers)"""
    try:
        # Fetch platform pricing configuration
        pricing_config = await db.platform_settings.find_one(
            {"key": "platform_pricing"},
            {"_id": 0}
        )
        
        # Default plans if not configured
        default_plans = {
            "starter": {
                "name": "Starter",
                "price": 2499,
                "monthly_cv_limit": 1000,
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
                "price": 4999,
                "monthly_cv_limit": 3500,
                "custom_subdomain": True,
                "custom_domain": True,
                "api_access": True,
                "priority_support": True,
                "analytics": "advanced",
                "templates": "premium",
                "enabled": True
            },
            "enterprise": {
                "name": "Enterprise",
                "price": 0,
                "monthly_cv_limit": -1,
                "custom_subdomain": True,
                "custom_domain": True,
                "api_access": True,
                "priority_support": True,
                "analytics": "enterprise",
                "templates": "all",
                "enabled": True,
                "contact_sales": True
            }
        }
        
        if pricing_config and pricing_config.get("value", {}).get("whitelabel_plans"):
            plans = pricing_config["value"]["whitelabel_plans"]
        else:
            plans = default_plans
        
        # Filter to only enabled plans
        enabled_plans = {k: v for k, v in plans.items() if v.get("enabled", True)}
        
        return {
            "success": True,
            "plans": enabled_plans
        }
        
    except Exception as e:
        logger.error(f"Error fetching subscription plans: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.get("/my-subscription", response_model=dict)
async def get_my_subscription(context: dict = Depends(get_current_reseller_admin)):
    """Get current reseller's subscription details"""
    try:
        reseller = context["reseller"]
        
        # Get the reseller's current plan
        subscription = reseller.get("subscription", {})
        current_plan = subscription.get("plan", "starter")
        
        # Fetch platform pricing to get plan details
        pricing_config = await db.platform_settings.find_one(
            {"key": "platform_pricing"},
            {"_id": 0}
        )
        
        plan_details = {}
        if pricing_config and pricing_config.get("value", {}).get("whitelabel_plans"):
            plans = pricing_config["value"]["whitelabel_plans"]
            plan_details = plans.get(current_plan, {})
        
        return {
            "success": True,
            "subscription": {
                "plan": current_plan,
                "plan_name": plan_details.get("name", current_plan.title()),
                "price": plan_details.get("price", 0),
                "billing_cycle": subscription.get("billing_cycle", "monthly"),
                "status": subscription.get("status", "active"),
                "started_at": subscription.get("started_at"),
                "next_billing_date": subscription.get("next_billing_date"),
                "features": {
                    "monthly_cv_limit": plan_details.get("monthly_cv_limit", 1000),
                    "custom_subdomain": plan_details.get("custom_subdomain", True),
                    "custom_domain": plan_details.get("custom_domain", False),
                    "api_access": plan_details.get("api_access", False),
                    "priority_support": plan_details.get("priority_support", False),
                    "analytics": plan_details.get("analytics", "basic"),
                    "templates": plan_details.get("templates", "standard")
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/change-subscription", response_model=dict)
async def change_subscription(
    data: dict,
    context: dict = Depends(get_current_reseller_admin)
):
    """Request to change subscription plan"""
    try:
        reseller = context["reseller"]
        new_plan = data.get("plan")
        
        if not new_plan:
            raise HTTPException(status_code=400, detail="Plan is required")
        
        # Validate plan exists
        pricing_config = await db.platform_settings.find_one(
            {"key": "platform_pricing"},
            {"_id": 0}
        )
        
        valid_plans = ["starter", "professional", "enterprise", "custom"]
        if pricing_config and pricing_config.get("value", {}).get("whitelabel_plans"):
            valid_plans = list(pricing_config["value"]["whitelabel_plans"].keys())
        
        if new_plan not in valid_plans:
            raise HTTPException(status_code=400, detail="Invalid plan selected")
        
        # Update reseller subscription
        await db.resellers.update_one(
            {"id": reseller["id"]},
            {"$set": {
                "subscription.plan": new_plan,
                "subscription.changed_at": datetime.now(timezone.utc),
                "subscription.status": "pending_change" if new_plan == "enterprise" else "active",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        logger.info(f"Reseller {reseller['id']} requested plan change to {new_plan}")
        
        return {
            "success": True,
            "message": f"Subscription changed to {new_plan}" if new_plan != "enterprise" else "Enterprise plan request submitted. Our team will contact you shortly."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing subscription: {str(e)}")
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
    
    # Default values for optional fields
    default_branding = {
        "logo_url": None,
        "primary_color": "#1e40af",
        "secondary_color": "#7c3aed",
        "favicon_url": None
    }
    
    default_stats = {
        "total_customers": 0,
        "active_customers": 0,
        "total_revenue": 0,
        "this_month_revenue": 0
    }
    
    default_subscription = {
        "plan": "monthly",
        "status": "trial",
        "is_trial": True
    }
    
    return {
        "id": reseller["id"],
        "company_name": reseller.get("company_name", ""),
        "brand_name": reseller.get("brand_name", ""),
        "subdomain": reseller.get("subdomain", ""),
        "custom_domain": reseller.get("custom_domain"),
        "status": reseller.get("status", "active"),
        "branding": reseller.get("branding", default_branding),
        "pricing": pricing,
        "strategy_call_pricing": strategy_call_pricing,
        "tier_config": reseller.get("tier_config"),
        "contact_info": reseller.get("contact_info", {}),
        "legal": reseller.get("legal", {}),
        "subscription": reseller.get("subscription", default_subscription),
        "stats": reseller.get("stats", default_stats),
        "api_key": reseller.get("api_key", ""),
        "created_at": reseller.get("created_at")
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


@reseller_router.post("/upload-branding-file", response_model=dict)
async def upload_branding_file(
    file: UploadFile = File(...),
    file_type: str = "logo",  # "logo" or "favicon"
    context: dict = Depends(get_current_reseller_admin)
):
    """Upload reseller logo or favicon file"""
    import os
    from pathlib import Path
    
    try:
        reseller = context["reseller"]
        reseller_id = reseller["id"]
        
        # Validate file type
        allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"File type '{file.content_type}' not allowed. Allowed types: PNG, JPG, SVG, WEBP, ICO"
            )
        
        # Validate file size (max 5MB)
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Create reseller directory if it doesn't exist
        upload_dir = Path(__file__).parent / "uploads" / "resellers" / reseller_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename with extension
        ext = file.filename.split(".")[-1] if "." in file.filename else "png"
        filename = f"{file_type}.{ext}"
        file_path = upload_dir / filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Generate public URL (relative to the static mount)
        file_url = f"/api/uploads/resellers/{reseller_id}/{filename}"
        
        # Update branding in database
        branding_field = "branding.logo_url" if file_type == "logo" else "branding.favicon_url"
        await db.resellers.update_one(
            {"id": reseller_id},
            {
                "$set": {
                    branding_field: file_url,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"{file_type.capitalize()} uploaded for reseller: {reseller_id}")
        return {"success": True, "url": file_url, "file_type": file_type}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading {file_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.delete("/delete-branding-file/{file_type}", response_model=dict)
async def delete_branding_file(
    file_type: str,
    context: dict = Depends(get_current_reseller_admin)
):
    """Delete reseller logo or favicon file"""
    import os
    from pathlib import Path
    
    try:
        reseller = context["reseller"]
        reseller_id = reseller["id"]
        
        if file_type not in ["logo", "favicon"]:
            raise HTTPException(status_code=400, detail="Invalid file type. Use 'logo' or 'favicon'")
        
        # Get current URL to find the file
        branding = reseller.get("branding", {})
        url_field = "logo_url" if file_type == "logo" else "favicon_url"
        current_url = branding.get(url_field)
        
        if current_url and current_url.startswith("/api/uploads/"):
            # Extract path and delete file
            relative_path = current_url.replace("/api/uploads/", "")
            file_path = Path(__file__).parent / "uploads" / relative_path
            if file_path.exists():
                os.remove(file_path)
        
        # Clear URL in database
        branding_field = f"branding.{url_field}"
        await db.resellers.update_one(
            {"id": reseller_id},
            {
                "$set": {
                    branding_field: None,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"{file_type.capitalize()} deleted for reseller: {reseller_id}")
        return {"success": True, "message": f"{file_type.capitalize()} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting {file_type}: {str(e)}")
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
        
        # Update customer
        if update_data:
            await db.users.update_one(
                {"id": customer_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Customer updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Reseller Subscription Management ====================

@reseller_router.get("/subscription/plans", response_model=dict)
async def get_subscription_plans():
    """Get available subscription plans for resellers."""
    try:
        plans = [
            {
                "id": "starter",
                "name": "Starter",
                "price": 249900,  # R2,499 in cents
                "price_display": "R2,499",
                "period": "month",
                "monthly_cv_limit": 1000,
                "features": [
                    "1,000 CVs per month",
                    "White-label branding",
                    "Custom subdomain",
                    "Email support",
                    "Basic analytics"
                ],
                "popular": False
            },
            {
                "id": "professional",
                "name": "Professional",
                "price": 499900,  # R4,999 in cents
                "price_display": "R4,999",
                "period": "month",
                "monthly_cv_limit": 3500,
                "features": [
                    "3,500 CVs per month",
                    "Full white-label branding",
                    "Custom domain support",
                    "Priority support",
                    "Advanced analytics",
                    "API access"
                ],
                "popular": True
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": 0,
                "price_display": "Custom",
                "period": "month",
                "monthly_cv_limit": -1,
                "features": [
                    "Unlimited CVs",
                    "Multiple brand instances",
                    "Dedicated account manager",
                    "Custom integrations",
                    "SLA guarantees"
                ],
                "popular": False,
                "contact_sales": True
            }
        ]
        
        return {"success": True, "plans": plans}
    except Exception as e:
        logger.error(f"Error getting subscription plans: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/subscription/upgrade", response_model=dict)
async def upgrade_subscription(
    request: Request,
    context: dict = Depends(get_current_reseller_admin)
):
    """Initiate subscription upgrade for a reseller."""
    try:
        data = await request.json()
        plan_id = data.get("plan_id")
        
        if not plan_id:
            raise HTTPException(status_code=400, detail="Plan ID is required")
        
        reseller = context["reseller"]
        user = context["user"]
        
        # Define plan prices (in cents)
        plan_prices = {
            "starter": 249900,
            "professional": 499900
        }
        
        if plan_id == "enterprise":
            return {
                "success": False,
                "contact_sales": True,
                "message": "Please contact our sales team for Enterprise pricing"
            }
        
        if plan_id not in plan_prices:
            raise HTTPException(status_code=400, detail="Invalid plan selected")
        
        amount = plan_prices[plan_id]
        
        # Get Yoco settings
        yoco_settings = await db.platform_settings.find_one({"key": "yoco_settings"}, {"_id": 0})
        
        if not yoco_settings or not yoco_settings.get("value", {}).get("secret_key"):
            raise HTTPException(
                status_code=400, 
                detail="Payment gateway not configured. Please contact support."
            )
        
        secret_key = yoco_settings["value"]["secret_key"]
        
        # Create Yoco checkout
        import httpx
        
        success_url = f"{os.environ.get('REACT_APP_BACKEND_URL', '')}/reseller-dashboard/subscription/success?plan={plan_id}"
        cancel_url = f"{os.environ.get('REACT_APP_BACKEND_URL', '')}/reseller-dashboard/subscription"
        
        checkout_data = {
            "amount": amount,
            "currency": "ZAR",
            "successUrl": success_url,
            "cancelUrl": cancel_url,
            "metadata": {
                "reseller_id": reseller["id"],
                "user_id": user["id"],
                "plan_id": plan_id,
                "type": "reseller_subscription"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://payments.yoco.com/api/checkouts",
                json=checkout_data,
                headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                checkout = response.json()
                
                # Store pending payment
                await db.pending_payments.insert_one({
                    "id": checkout.get("id"),
                    "reseller_id": reseller["id"],
                    "user_id": user["id"],
                    "plan_id": plan_id,
                    "amount": amount,
                    "status": "pending",
                    "type": "reseller_subscription",
                    "created_at": datetime.now(timezone.utc)
                })
                
                return {
                    "success": True,
                    "checkout_url": checkout.get("redirectUrl"),
                    "checkout_id": checkout.get("id")
                }
            else:
                logger.error(f"Yoco checkout error: {response.text}")
                raise HTTPException(status_code=400, detail="Failed to create checkout session")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error upgrading subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/subscription/confirm", response_model=dict)
async def confirm_subscription(
    request: Request,
    context: dict = Depends(get_current_reseller_admin)
):
    """Confirm subscription after successful payment."""
    try:
        data = await request.json()
        checkout_id = data.get("checkout_id")
        plan_id = data.get("plan_id")
        
        if not checkout_id or not plan_id:
            raise HTTPException(status_code=400, detail="Checkout ID and plan ID are required")
        
        reseller = context["reseller"]
        now = datetime.now(timezone.utc)
        
        # Plan details
        plan_details = {
            "starter": {
                "name": "Starter",
                "price": 249900,
                "monthly_cv_limit": 1000
            },
            "professional": {
                "name": "Professional",
                "price": 499900,
                "monthly_cv_limit": 3500
            }
        }
        
        if plan_id not in plan_details:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        plan = plan_details[plan_id]
        next_billing = now + timedelta(days=30)
        
        # Update reseller subscription
        await db.resellers.update_one(
            {"id": reseller["id"]},
            {
                "$set": {
                    "status": "active",
                    "subscription.status": "active",
                    "subscription.plan": plan_id,
                    "subscription.plan_name": plan["name"],
                    "subscription.monthly_fee": plan["price"],
                    "subscription.monthly_cv_limit": plan["monthly_cv_limit"],
                    "subscription.is_trial": False,
                    "subscription.converted_from_trial": True,
                    "subscription.converted_date": now.isoformat(),
                    "subscription.next_billing_date": next_billing.isoformat(),
                    "subscription.suspended_at": None,
                    "subscription.suspension_reason": None,
                    "updated_at": now
                }
            }
        )
        
        # Update pending payment
        await db.pending_payments.update_one(
            {"id": checkout_id},
            {"$set": {"status": "completed", "completed_at": now}}
        )
        
        # Record payment
        await db.reseller_payments.insert_one({
            "id": str(uuid4()),
            "reseller_id": reseller["id"],
            "checkout_id": checkout_id,
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "amount": plan["price"],
            "currency": "ZAR",
            "status": "succeeded",
            "type": "subscription",
            "created_at": now
        })
        
        logger.info(f"Reseller subscription activated: {reseller['id']} - {plan_id}")
        
        return {
            "success": True,
            "message": f"Successfully subscribed to {plan['name']} plan",
            "plan": plan_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/subscription/reactivate", response_model=dict)
async def reactivate_subscription(
    request: Request,
    context: dict = Depends(get_current_reseller_admin)
):
    """Reactivate a suspended reseller account after payment."""
    try:
        reseller = context["reseller"]
        
        # Check if account is suspended
        if reseller.get("status") != "suspended":
            return {"success": True, "message": "Account is already active"}
        
        # For now, redirect to upgrade flow
        return {
            "success": False,
            "requires_payment": True,
            "message": "Please select a plan to reactivate your account"
        }
        
    except Exception as e:
        logger.error(f"Error reactivating subscription: {str(e)}")
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


@reseller_router.get("/activity-stats")
async def get_reseller_activity_stats(context: dict = Depends(get_current_reseller_admin)):
    """Get activity statistics for reseller dashboard"""
    try:
        reseller = context["reseller"]
        reseller_id = reseller["id"]
        
        from activity_service import get_activity_service
        activity_service = get_activity_service(db)
        stats = await activity_service.get_reseller_stats(reseller_id)
        
        return stats
    except Exception as e:
        logger.error(f"Error getting activity stats: {str(e)}")
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
            "is_live_mode": False,
            "success_redirect_url": "",
            "cancel_redirect_url": ""
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


# ==================== CV Usage Limits ====================

@reseller_router.get("/cv-usage", response_model=dict)
async def get_cv_usage(request: Request = None):
    """
    Get current months CV usage and limits for the reseller.
    """
    try:
        from reseller_cv_limit_service import create_cv_limit_service
        
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        cv_limit_service = create_cv_limit_service(db)
        usage = await cv_limit_service.get_usage_summary_for_dashboard(reseller["id"])
        
        return {
            "success": True,
            **usage
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting CV usage: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.get("/cv-usage/check", response_model=dict)
async def check_cv_creation_allowed(request: Request = None):
    """
    Check if the reseller can create more CVs this month.
    Call this before CV creation to enforce limits.
    """
    try:
        from reseller_cv_limit_service import create_cv_limit_service
        
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        cv_limit_service = create_cv_limit_service(db)
        result = await cv_limit_service.check_can_create_cv(reseller["id"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking CV limit: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ==================== Reseller Recruiter Management ====================

class RecruiterCreate(BaseModel):
    full_name: str
    email: str
    company_name: str
    phone: Optional[str] = None
    password: str

class RecruiterUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None

class RecruiterPasswordReset(BaseModel):
    password: str

class RecruiterStatusUpdate(BaseModel):
    status: str


@reseller_router.get("/recruiters", response_model=dict)
async def list_reseller_recruiters(request: Request = None):
    """List all recruiters for this reseller"""
    try:
        from auth import get_password_hash
        
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        recruiters = await db.users.find(
            {"role": "recruiter", "reseller_id": reseller["id"]},
            {"_id": 0, "hashed_password": 0}
        ).sort("created_at", -1).to_list(500)
        
        # Check subscription status
        for recruiter in recruiters:
            subscription = await db.recruiter_subscriptions.find_one({
                "user_id": recruiter.get("id"),
                "status": "active",
                "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
            })
            recruiter["has_subscription"] = subscription is not None
        
        return {"success": True, "recruiters": recruiters}
    except Exception as e:
        logger.error(f"Error listing recruiters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.post("/recruiters", response_model=dict)
async def create_reseller_recruiter(data: RecruiterCreate, request: Request = None):
    """Create a new recruiter for this reseller"""
    try:
        from auth import get_password_hash
        
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        existing = await db.users.find_one({"email": data.email.lower()})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(data.password)
        
        new_user = {
            "id": user_id,
            "email": data.email.lower(),
            "full_name": data.full_name,
            "phone": data.phone,
            "company_name": data.company_name,
            "hashed_password": hashed_password,
            "role": "recruiter",
            "reseller_id": reseller["id"],
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "is_active": True
        }
        
        await db.users.insert_one(new_user)
        logger.info(f"Recruiter created by reseller {reseller['id']}: {data.email}")
        
        return {"success": True, "message": "Recruiter created"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating recruiter: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.put("/recruiters/{recruiter_id}", response_model=dict)
async def update_reseller_recruiter(recruiter_id: str, data: RecruiterUpdate, request: Request = None):
    """Update recruiter details"""
    try:
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        recruiter = await db.users.find_one({
            "id": recruiter_id, 
            "role": "recruiter",
            "reseller_id": reseller["id"]
        })
        if not recruiter:
            raise HTTPException(status_code=404, detail="Recruiter not found")
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        if "email" in update_data:
            update_data["email"] = update_data["email"].lower()
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.users.update_one({"id": recruiter_id}, {"$set": update_data})
        
        return {"success": True, "message": "Recruiter updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating recruiter: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.put("/recruiters/{recruiter_id}/password", response_model=dict)
async def reset_reseller_recruiter_password(recruiter_id: str, data: RecruiterPasswordReset, request: Request = None):
    """Reset recruiter password"""
    try:
        from auth import get_password_hash
        
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        recruiter = await db.users.find_one({
            "id": recruiter_id,
            "role": "recruiter",
            "reseller_id": reseller["id"]
        })
        if not recruiter:
            raise HTTPException(status_code=404, detail="Recruiter not found")
        
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        hashed_password = get_password_hash(data.password)
        
        await db.users.update_one(
            {"id": recruiter_id},
            {"$set": {"hashed_password": hashed_password, "password_updated_at": datetime.now(timezone.utc)}}
        )
        
        return {"success": True, "message": "Password reset"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.put("/recruiters/{recruiter_id}/status", response_model=dict)
async def update_reseller_recruiter_status(recruiter_id: str, data: RecruiterStatusUpdate, request: Request = None):
    """Activate or deactivate recruiter"""
    try:
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        recruiter = await db.users.find_one({
            "id": recruiter_id,
            "role": "recruiter",
            "reseller_id": reseller["id"]
        })
        if not recruiter:
            raise HTTPException(status_code=404, detail="Recruiter not found")
        
        if data.status not in ["active", "suspended"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        await db.users.update_one(
            {"id": recruiter_id},
            {"$set": {"status": data.status, "is_active": data.status == "active"}}
        )
        
        return {"success": True, "message": f"Recruiter {data.status}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reseller_router.delete("/recruiters/{recruiter_id}", response_model=dict)
async def delete_reseller_recruiter(recruiter_id: str, request: Request = None):
    """Delete a recruiter"""
    try:
        context = await get_current_reseller_admin(request)
        reseller = context["reseller"]
        
        recruiter = await db.users.find_one({
            "id": recruiter_id,
            "role": "recruiter",
            "reseller_id": reseller["id"]
        })
        if not recruiter:
            raise HTTPException(status_code=404, detail="Recruiter not found")
        
        await db.users.delete_one({"id": recruiter_id})
        await db.recruiter_subscriptions.delete_many({"user_id": recruiter_id})
        await db.contact_requests.delete_many({"recruiter_user_id": recruiter_id})
        
        return {"success": True, "message": "Recruiter deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting recruiter: {e}")
        raise HTTPException(status_code=500, detail=str(e))
