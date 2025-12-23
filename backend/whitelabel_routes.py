from fastapi import APIRouter, HTTPException, Request, Response
from typing import Optional
import logging

from reseller_models import WhiteLabelConfig, ResellerPricing

logger = logging.getLogger(__name__)

whitelabel_router = APIRouter(prefix="/api/white-label", tags=["White Label"])

# Dependency to get DB - will be set from server.py
db = None

def set_db(database):
    global db
    db = database


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
        
        # Check if this is a custom domain request
        if host in ["localhost", "127.0.0.1"] or host.endswith(".preview.emergentagent.com"):
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
                "contact_address": contact.get("address", "123 Main Street, Sandton, Johannesburg, 2196, South Africa"),
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
                "contact_address": "123 Main Street, Sandton, Johannesburg, 2196, South Africa",
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
        
        # Default plans if not configured
        default_plans = {
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
            formatted_plans.append({
                "key": "starter",
                "name": starter.get("name", "Starter"),
                "price": starter.get("price", 249900),
                "price_display": f"R{starter.get('price', 249900) / 100:,.0f}",
                "period": "/month",
                "description": "Perfect for small agencies and coaches starting out",
                "active_users_limit": starter.get("active_users_limit", 50),
                "features": [
                    f"Up to {starter.get('active_users_limit', 50)} active clients",
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
            pro_features = [
                f"Up to {professional.get('active_users_limit', 200)} active clients",
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
                "price": professional.get("price", 499900),
                "price_display": f"R{professional.get('price', 499900) / 100:,.0f}",
                "period": "/month",
                "description": "For growing businesses with higher volume needs",
                "active_users_limit": professional.get("active_users_limit", 200),
                "features": [f for f in pro_features if f],
                "cta": "Start Free Trial",
                "popular": True
            })
        
        # Enterprise Plan
        enterprise = plans.get("custom", default_plans["custom"])
        if enterprise.get("enabled", True):
            users_text = "Unlimited clients" if enterprise.get("active_users_limit", -1) == -1 else f"Up to {enterprise.get('active_users_limit')} clients"
            formatted_plans.append({
                "key": "enterprise",
                "name": enterprise.get("name", "Enterprise"),
                "price": 0,
                "price_display": "Custom",
                "period": "",
                "description": "For large organizations with custom requirements",
                "active_users_limit": enterprise.get("active_users_limit", -1),
                "features": [
                    users_text,
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
