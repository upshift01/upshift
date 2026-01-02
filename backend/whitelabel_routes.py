from fastapi import APIRouter, HTTPException, Request, Response, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import logging
import uuid

from reseller_models import WhiteLabelConfig, ResellerPricing

logger = logging.getLogger(__name__)

whitelabel_router = APIRouter(prefix="/api/white-label", tags=["White Label"])

# Dependency to get DB - will be set from server.py
db = None

def set_db(database):
    global db
    db = database


# Background task for sending contact form email notification
async def send_contact_notification_email(name: str, email: str, subject: str, message: str, host: str):
    """Send email notification for contact form in background"""
    try:
        from email_service import email_service
        
        # Get platform settings for email
        site_settings = await db.platform_settings.find_one({"key": "site_settings"}, {"_id": 0})
        admin_email = site_settings.get("contact", {}).get("email", "support@upshift.works") if site_settings else "support@upshift.works"
        
        # Send notification to admin
        email_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">New Contact Form Submission</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb;">
                <p><strong>From:</strong> {name} ({email})</p>
                <p><strong>Subject:</strong> {subject}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                <p><strong>Message:</strong></p>
                <p style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                    {message.replace(chr(10), '<br>')}
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                <p style="color: #6b7280; font-size: 12px;">
                    Received at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}<br>
                    Source: {host}
                </p>
            </div>
        </body>
        </html>
        """
        
        await email_service.send_email(
            to_email=admin_email,
            subject=f"[Contact Form] {subject}",
            html_body=email_content,
            raise_exceptions=False
        )
        logger.info(f"Contact form notification sent to {admin_email}")
    except Exception as email_error:
        logger.warning(f"Could not send contact form notification email: {str(email_error)}")


@whitelabel_router.get("/config", response_model=dict)
async def get_whitelabel_config(request: Request, response: Response):
    """
    Get white-label configuration for the current domain.
    Returns branding, pricing, and legal info based on the request host.
    """
    # Prevent caching to ensure fresh config
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    try:
        host = request.headers.get("host", "").split(":")[0]
        
        # Check if this is a main platform request (not a reseller subdomain/custom domain)
        is_main_platform = (
            host in ["localhost", "127.0.0.1"] or 
            host.endswith(".preview.emergentagent.com") or
            host in ["upshift.works", "www.upshift.works"]
        )
        
        if is_main_platform:
            # Fetch platform site settings from database
            site_settings = await db.platform_settings.find_one({"key": "site_settings"}, {"_id": 0})
            
            contact = site_settings.get("contact", {}) if site_settings else {}
            social_media = site_settings.get("social_media", {}) if site_settings else {}
            business_hours = site_settings.get("business_hours", "") if site_settings else ""
            
            # Return default/main platform config with database settings
            return {
                "is_white_label": False,
                "brand_name": "UpShift",
                "logo_url": None,
                "primary_color": "#1e40af",
                "secondary_color": "#7c3aed",
                "favicon_url": None,
                "contact_email": contact.get("email", "support@upshift.works"),
                "contact_phone": contact.get("phone", "+27 (0) 11 234 5678"),
                "contact_address": contact.get("address", "81 Botterklapper Street, The Willows, Pretoria"),
                "contact_whatsapp": contact.get("whatsapp", ""),
                "business_hours": business_hours,
                "social_media": {
                    "facebook": social_media.get("facebook", ""),
                    "twitter": social_media.get("twitter", ""),
                    "linkedin": social_media.get("linkedin", ""),
                    "instagram": social_media.get("instagram", ""),
                    "youtube": social_media.get("youtube", ""),
                    "tiktok": social_media.get("tiktok", "")
                },
                "terms_url": "/terms",
                "privacy_url": "/privacy",
                "pricing": {
                    "tier_1_price": 89900,
                    "tier_2_price": 150000,
                    "tier_3_price": 300000,
                    "currency": "ZAR"
                }
            }
        
        # Look up reseller by custom domain
        reseller = await db.resellers.find_one(
            {"custom_domain": host, "status": "active"},
            {"_id": 0}
        )
        
        if not reseller:
            # Check by subdomain pattern (e.g., acme.upshift.works)
            if host.endswith(".upshift.works"):
                subdomain = host.replace(".upshift.works", "")
                reseller = await db.resellers.find_one(
                    {"subdomain": subdomain, "status": "active"},
                    {"_id": 0}
                )
        
        if not reseller:
            # Return default config if no reseller found
            return {
                "is_white_label": False,
                "brand_name": "UpShift",
                "logo_url": None,
                "primary_color": "#1e40af",
                "secondary_color": "#7c3aed",
                "favicon_url": None,
                "contact_email": "support@upshift.works",
                "contact_phone": "+27 (0) 11 234 5678",
                "contact_address": "81 Botterklapper Street, The Willows, Pretoria",
                "terms_url": "/terms",
                "privacy_url": "/privacy",
                "pricing": {
                    "tier_1_price": 89900,
                    "tier_2_price": 150000,
                    "tier_3_price": 300000,
                    "currency": "ZAR"
                }
            }
        
        # Fetch reseller's site settings
        reseller_site_settings = await db.reseller_site_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        # Return reseller's white-label config
        branding = reseller.get("branding", {})
        pricing = reseller.get("pricing", {})
        legal = reseller.get("legal", {})
        contact = reseller.get("contact_info", {})
        
        # Override with site settings if available
        if reseller_site_settings:
            site_contact = reseller_site_settings.get("contact", {})
            site_social = reseller_site_settings.get("social_media", {})
            business_hours = reseller_site_settings.get("business_hours", "")
        else:
            site_contact = {}
            site_social = {}
            business_hours = ""
        
        return {
            "is_white_label": True,
            "reseller_id": reseller["id"],
            "brand_name": reseller["brand_name"],
            "logo_url": branding.get("logo_url"),
            "primary_color": branding.get("primary_color", "#1e40af"),
            "secondary_color": branding.get("secondary_color", "#7c3aed"),
            "favicon_url": branding.get("favicon_url"),
            "contact_email": site_contact.get("email") or contact.get("email", ""),
            "contact_phone": site_contact.get("phone") or contact.get("phone", ""),
            "contact_address": site_contact.get("address") or contact.get("address", ""),
            "contact_whatsapp": site_contact.get("whatsapp", ""),
            "business_hours": business_hours,
            "social_media": {
                "facebook": site_social.get("facebook", ""),
                "twitter": site_social.get("twitter", ""),
                "linkedin": site_social.get("linkedin", ""),
                "instagram": site_social.get("instagram", ""),
                "youtube": site_social.get("youtube", ""),
                "tiktok": site_social.get("tiktok", "")
            },
            "terms_url": legal.get("terms_url", "/terms"),
            "privacy_url": legal.get("privacy_url", "/privacy"),
            "pricing": {
                "tier_1_price": pricing.get("tier_1_price", 89900),
                "tier_2_price": pricing.get("tier_2_price", 150000),
                "tier_3_price": pricing.get("tier_3_price", 300000),
                "currency": pricing.get("currency", "ZAR")
            }
        }
    except Exception as e:
        logger.error(f"Error getting white-label config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whitelabel_router.get("/verify-domain/{domain}", response_model=dict)
async def verify_domain(domain: str):
    """
    Verify if a domain is configured for a reseller.
    Used for domain setup validation.
    """
    try:
        reseller = await db.resellers.find_one(
            {"custom_domain": domain},
            {"_id": 0, "id": 1, "brand_name": 1, "status": 1}
        )
        
        if reseller:
            return {
                "configured": True,
                "reseller_id": reseller["id"],
                "brand_name": reseller["brand_name"],
                "status": reseller["status"]
            }
        
        return {
            "configured": False,
            "message": "Domain not configured"
        }
    except Exception as e:
        logger.error(f"Error verifying domain: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whitelabel_router.get("/plans", response_model=dict)
async def get_whitelabel_plans():
    """
    Get white-label pricing plans for the public marketing page.
    Returns Starter, Professional, and Enterprise plan configurations.
    """
    try:
        # Fetch platform pricing config from database
        pricing_config = await db.platform_settings.find_one(
            {"key": "platform_pricing"},
            {"_id": 0}
        )
        
        # Default plans if not configured (prices in normal ZAR amounts, not cents)
        default_plans = {
            "starter": {
                "name": "Starter",
                "price": 2499,
                "active_users_limit": 50,
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
                "active_users_limit": 200,
                "monthly_cv_limit": 3500,
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
        
        # Get plans from config or use defaults
        if pricing_config and pricing_config.get("value", {}).get("whitelabel_plans"):
            plans = pricing_config["value"]["whitelabel_plans"]
        else:
            plans = default_plans
        
        # Format plans for frontend consumption
        formatted_plans = []
        
        # Starter Plan
        starter = plans.get("starter", default_plans["starter"])
        if starter.get("enabled", True):
            starter_cv_limit = starter.get("monthly_cv_limit", 1000)
            starter_cv_text = f"{starter_cv_limit:,} CVs per month" if starter_cv_limit > 0 else "Unlimited CVs per month"
            formatted_plans.append({
                "key": "starter",
                "name": starter.get("name", "Starter"),
                "price": starter.get("price", 2499),
                "price_display": f"R{starter.get('price', 2499):,.0f}",
                "period": "/month",
                "description": "Perfect for small agencies and coaches starting out",
                "monthly_cv_limit": starter_cv_limit,
                "cv_limit": starter_cv_text,
                "features": [
                    starter_cv_text,
                    "White-label branding",
                    "Custom subdomain" if starter.get("custom_subdomain", True) else None,
                    "Email support",
                    f"{starter.get('analytics', 'basic').capitalize()} analytics",
                    f"{starter.get('templates', 'standard').capitalize()} templates"
                ],
                "cta": "Start Free Trial",
                "popular": False
            })
        
        # Professional Plan
        professional = plans.get("professional", default_plans["professional"])
        if professional.get("enabled", True):
            pro_cv_limit = professional.get("monthly_cv_limit", 3500)
            pro_cv_text = f"{pro_cv_limit:,} CVs per month" if pro_cv_limit > 0 else "Unlimited CVs per month"
            pro_features = [
                pro_cv_text,
                "Full white-label branding",
                "Custom domain support" if professional.get("custom_domain", True) else "Custom subdomain",
                "Priority email & chat support" if professional.get("priority_support", True) else "Email support",
                f"{professional.get('analytics', 'advanced').capitalize()} analytics",
                f"All {professional.get('templates', 'premium')} templates",
            ]
            if professional.get("api_access", True):
                pro_features.append("API access")
            pro_features.append("Custom email templates")
            
            formatted_plans.append({
                "key": "professional",
                "name": professional.get("name", "Professional"),
                "price": professional.get("price", 4999),
                "price_display": f"R{professional.get('price', 4999):,.0f}",
                "period": "/month",
                "description": "For growing businesses with higher volume needs",
                "monthly_cv_limit": pro_cv_limit,
                "cv_limit": pro_cv_text,
                "features": [f for f in pro_features if f],
                "cta": "Start Free Trial",
                "popular": True
            })
        
        # Enterprise Plan
        enterprise = plans.get("custom", default_plans["custom"])
        if enterprise.get("enabled", True):
            users_text = "Unlimited clients" if enterprise.get("active_users_limit", -1) == -1 else f"Up to {enterprise.get('active_users_limit')} clients"
            enterprise_cv_limit = enterprise.get("monthly_cv_limit", -1)
            enterprise_cv_text = "Unlimited CVs per month" if enterprise_cv_limit == -1 else f"{enterprise_cv_limit:,} CVs per month"
            formatted_plans.append({
                "key": "enterprise",
                "name": enterprise.get("name", "Enterprise"),
                "price": 0,
                "price_display": "Custom",
                "period": "",
                "description": "For large organizations with custom requirements",
                "active_users_limit": enterprise.get("active_users_limit", -1),
                "monthly_cv_limit": enterprise_cv_limit,
                "cv_limit": enterprise_cv_text,
                "features": [
                    users_text,
                    enterprise_cv_text,
                    "Multiple brand instances",
                    "Dedicated account manager",
                    "Phone & video support",
                    "Custom integrations",
                    "SLA guarantees",
                    "On-boarding training",
                    "Custom development"
                ],
                "cta": "Contact Sales",
                "popular": False,
                "contact_sales": True
            })
        
        return {
            "success": True,
            "plans": formatted_plans,
            "currency": "ZAR"
        }
        
    except Exception as e:
        logger.error(f"Error fetching white-label plans: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class ContactFormSubmission(BaseModel):
    name: str
    email: str
    subject: str
    message: str


@whitelabel_router.post("/contact", response_model=dict)
async def submit_contact_form(data: ContactFormSubmission, request: Request, background_tasks: BackgroundTasks):
    """
    Submit a contact form message.
    Stores the message in the database and optionally sends an email notification.
    """
    try:
        host = request.headers.get("host", "").split(":")[0]
        
        # Determine if this is from a reseller site
        reseller_id = None
        if not (host in ["localhost", "127.0.0.1"] or host.endswith(".preview.emergentagent.com")):
            reseller = await db.resellers.find_one(
                {"custom_domain": host, "status": "active"},
                {"_id": 0, "id": 1}
            )
            if reseller:
                reseller_id = reseller["id"]
        
        # Create contact submission record
        submission = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "email": data.email,
            "subject": data.subject,
            "message": data.message,
            "reseller_id": reseller_id,
            "source_host": host,
            "status": "new",
            "created_at": datetime.now(timezone.utc),
            "read_at": None,
            "replied_at": None
        }
        
        await db.contact_submissions.insert_one(submission)
        
        logger.info(f"Contact form submission received from {data.email}: {data.subject}")
        
        # Send email notification in background (non-blocking)
        background_tasks.add_task(
            send_contact_notification_email,
            data.name, data.email, data.subject, data.message, host
        )
        
        return {
            "success": True,
            "message": "Your message has been sent successfully. We'll get back to you soon!"
        }
        
    except Exception as e:
        logger.error(f"Error submitting contact form: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit contact form. Please try again.")


# ==================== URL-Based Partner/Subdomain Routing ====================

@whitelabel_router.get("/partner/{subdomain}", response_model=dict)
async def get_partner_config(subdomain: str):
    """
    Get white-label configuration for a partner by subdomain.
    Used for URL-based routing (e.g., /partner/yottanet)
    This is an alternative to actual subdomain routing when DNS wildcards are not available.
    """
    try:
        # Clean the subdomain
        subdomain = subdomain.lower().strip()
        
        # Look up reseller by subdomain
        reseller = await db.resellers.find_one(
            {"subdomain": subdomain},
            {"_id": 0}
        )
        
        if not reseller:
            raise HTTPException(status_code=404, detail=f"Partner '{subdomain}' not found")
        
        # Check if reseller is active or in trial
        if reseller.get("status") not in ["active", "trial"]:
            raise HTTPException(status_code=403, detail="This partner account is not currently active")
        
        # Check trial expiry
        if reseller.get("status") == "trial":
            subscription = reseller.get("subscription", {})
            trial_end = subscription.get("trial_end_date")
            if trial_end:
                from datetime import datetime, timezone
                if isinstance(trial_end, str):
                    trial_end = datetime.fromisoformat(trial_end.replace('Z', '+00:00'))
                if trial_end < datetime.now(timezone.utc):
                    raise HTTPException(status_code=403, detail="This partner's trial has expired")
        
        # Fetch reseller's site settings
        reseller_site_settings = await db.reseller_site_settings.find_one(
            {"reseller_id": reseller["id"]},
            {"_id": 0}
        )
        
        # Build the config
        branding = reseller.get("branding", {})
        reseller_pricing = reseller.get("pricing", {})
        legal = reseller.get("legal", {})
        contact = reseller.get("contact_info", {})
        
        # Override with site settings if available
        if reseller_site_settings:
            site_contact = reseller_site_settings.get("contact", {})
            site_social = reseller_site_settings.get("social_media", {})
            business_hours = reseller_site_settings.get("business_hours", "")
            site_seo = reseller_site_settings.get("seo", {})
        else:
            site_contact = {}
            site_social = {}
            business_hours = ""
            site_seo = {}
        
        # Get pricing - prefer reseller pricing, fallback to platform pricing
        tier_1_price = reseller_pricing.get("tier1_price") or reseller_pricing.get("tier_1_price")
        tier_2_price = reseller_pricing.get("tier2_price") or reseller_pricing.get("tier_2_price")
        tier_3_price = reseller_pricing.get("tier3_price") or reseller_pricing.get("tier_3_price")
        
        # If reseller doesn't have custom pricing, fetch platform defaults
        if not tier_1_price or not tier_2_price or not tier_3_price:
            platform_pricing = await db.platform_settings.find_one(
                {"key": "platform_pricing"},
                {"_id": 0}
            )
            if platform_pricing and platform_pricing.get("value"):
                platform_tier_pricing = platform_pricing["value"].get("default_tier_pricing", {})
                if not tier_1_price:
                    tier_1_price = platform_tier_pricing.get("tier_1_price", 499)
                if not tier_2_price:
                    tier_2_price = platform_tier_pricing.get("tier_2_price", 899)
                if not tier_3_price:
                    tier_3_price = platform_tier_pricing.get("tier_3_price", 2999)
            else:
                # Absolute defaults if nothing is configured
                tier_1_price = tier_1_price or 499
                tier_2_price = tier_2_price or 899
                tier_3_price = tier_3_price or 2999
        
        return {
            "success": True,
            "is_white_label": True,
            "reseller_id": reseller["id"],
            "subdomain": subdomain,
            "brand_name": reseller.get("brand_name", reseller.get("company_name")),
            "company_name": reseller.get("company_name"),
            "tagline": site_seo.get("tagline", "Professional Career Services"),
            "logo_url": branding.get("logo_url"),
            "primary_color": branding.get("primary_color", "#1e40af"),
            "secondary_color": branding.get("secondary_color", "#7c3aed"),
            "favicon_url": branding.get("favicon_url"),
            "contact_email": site_contact.get("email") or contact.get("email", ""),
            "contact_phone": site_contact.get("phone") or contact.get("phone", ""),
            "contact_address": site_contact.get("address", ""),
            "contact_whatsapp": site_contact.get("whatsapp", ""),
            "business_hours": business_hours,
            "social_media": {
                "facebook": site_social.get("facebook", ""),
                "twitter": site_social.get("twitter", ""),
                "linkedin": site_social.get("linkedin", ""),
                "instagram": site_social.get("instagram", ""),
                "youtube": site_social.get("youtube", ""),
                "tiktok": site_social.get("tiktok", "")
            },
            "terms_url": legal.get("terms_url", "/terms"),
            "privacy_url": legal.get("privacy_url", "/privacy"),
            "pricing": {
                "tier_1_price": tier_1_price,
                "tier_2_price": tier_2_price,
                "tier_3_price": tier_3_price,
                "currency": "ZAR"
            },
            "status": reseller.get("status"),
            "base_url": f"/partner/{subdomain}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting partner config for {subdomain}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whitelabel_router.get("/partners", response_model=dict)
async def list_active_partners():
    """
    List all active partner subdomains (for directory/discovery purposes).
    Only returns basic public info.
    """
    try:
        resellers = await db.resellers.find(
            {"status": {"$in": ["active", "trial"]}},
            {"_id": 0, "subdomain": 1, "brand_name": 1, "company_name": 1, "branding.logo_url": 1}
        ).to_list(100)
        
        partners = []
        for r in resellers:
            if r.get("subdomain"):
                partners.append({
                    "subdomain": r["subdomain"],
                    "brand_name": r.get("brand_name", r.get("company_name")),
                    "logo_url": r.get("branding", {}).get("logo_url"),
                    "url": f"/partner/{r['subdomain']}"
                })
        
        return {
            "success": True,
            "partners": partners,
            "count": len(partners)
        }
    except Exception as e:
        logger.error(f"Error listing partners: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Demo Account Endpoints ====================

@whitelabel_router.get("/demo/credentials", response_model=dict)
async def get_demo_credentials():
    """
    Get the demo account login credentials for the white-label demo.
    This is a public endpoint for the "See Live Demo" button.
    """
    try:
        from demo_reseller_service import create_demo_service, DEMO_RESELLER_SUBDOMAIN, DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD
        
        demo_service = create_demo_service(db)
        
        # Check if demo account exists
        from demo_reseller_service import DEMO_RESELLER_ID
        demo_reseller = await db.resellers.find_one({"id": DEMO_RESELLER_ID}, {"_id": 0})
        
        if not demo_reseller:
            # Initialize demo account if it doesn't exist
            await demo_service.initialize_demo_account()
        
        return {
            "success": True,
            "demo": {
                "brand_name": "TalentHub",
                "tagline": "Your Career, Elevated",
                "login_url": f"/partner/{DEMO_RESELLER_SUBDOMAIN}/login",
                "dashboard_url": f"/partner/{DEMO_RESELLER_SUBDOMAIN}",
                "email": DEMO_OWNER_EMAIL,
                "password": DEMO_OWNER_PASSWORD,
                "description": "Experience the full white-label reseller dashboard with sample customers, transactions, and analytics.",
                "note": "This demo resets daily at midnight (SAST). Any data you add will be cleared."
            }
        }
    except Exception as e:
        logger.error(f"Error getting demo credentials: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whitelabel_router.post("/demo/initialize", response_model=dict)
async def initialize_demo_account():
    """
    Initialize or re-seed the demo account.
    This can be called manually or during system startup.
    """
    try:
        from demo_reseller_service import create_demo_service
        
        demo_service = create_demo_service(db)
        result = await demo_service.initialize_demo_account()
        
        return result
    except Exception as e:
        logger.error(f"Error initializing demo account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whitelabel_router.post("/demo/reset", response_model=dict)
async def reset_demo_data():
    """
    Reset the demo account data (removes user-added data, keeps base config).
    This is called by the nightly scheduled job.
    """
    try:
        from demo_reseller_service import create_demo_service
        
        demo_service = create_demo_service(db)
        result = await demo_service.reset_demo_data()
        
        return result
    except Exception as e:
        logger.error(f"Error resetting demo data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
