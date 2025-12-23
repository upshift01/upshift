from fastapi import APIRouter, HTTPException, Request
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
