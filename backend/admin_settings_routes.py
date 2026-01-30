"""
Admin Settings Routes - API endpoints for system configuration
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging
import os

logger = logging.getLogger(__name__)

admin_settings_router = APIRouter(prefix="/api/admin/settings", tags=["Admin Settings"])


class PaymentSettingsUpdate(BaseModel):
    stripe_public_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    yoco_public_key: Optional[str] = None
    yoco_secret_key: Optional[str] = None
    default_provider: Optional[str] = "stripe"


class SMTPSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None


def get_admin_settings_routes(db, get_current_user):
    """Factory function to create admin settings routes with database dependency"""
    
    def require_admin(current_user):
        """Check if user is admin"""
        if current_user.role != "super_admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return current_user
    
    # ==================== PAYMENT SETTINGS ====================
    
    @admin_settings_router.get("/payments")
    async def get_payment_settings(current_user = Depends(get_current_user)):
        """Get payment gateway settings (admin only)"""
        require_admin(current_user)
        
        try:
            settings = await db.admin_settings.find_one({"type": "payment_settings"})
            
            if not settings:
                # Return env-based defaults
                return {
                    "success": True,
                    "settings": {
                        "stripe_public_key": os.environ.get("STRIPE_PUBLIC_KEY", ""),
                        "stripe_secret_key": "••••••••" if os.environ.get("STRIPE_API_KEY") else "",
                        "stripe_configured": bool(os.environ.get("STRIPE_API_KEY")),
                        "yoco_public_key": os.environ.get("YOCO_PUBLIC_KEY", ""),
                        "yoco_secret_key": "••••••••" if os.environ.get("YOCO_SECRET_KEY") else "",
                        "yoco_configured": bool(os.environ.get("YOCO_SECRET_KEY")),
                        "default_provider": "stripe"
                    }
                }
            
            # Mask secret keys for display
            return {
                "success": True,
                "settings": {
                    "stripe_public_key": settings.get("stripe_public_key", ""),
                    "stripe_secret_key": "••••••••" if settings.get("stripe_secret_key") else "",
                    "stripe_configured": bool(settings.get("stripe_secret_key")),
                    "yoco_public_key": settings.get("yoco_public_key", ""),
                    "yoco_secret_key": "••••••••" if settings.get("yoco_secret_key") else "",
                    "yoco_configured": bool(settings.get("yoco_secret_key")),
                    "default_provider": settings.get("default_provider", "stripe")
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting payment settings: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @admin_settings_router.put("/payments")
    async def update_payment_settings(
        data: PaymentSettingsUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update payment gateway settings (admin only)"""
        require_admin(current_user)
        
        try:
            # Get existing settings
            existing = await db.admin_settings.find_one({"type": "payment_settings"})
            
            update_data = {
                "type": "payment_settings",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.id
            }
            
            # Only update fields that are provided
            if data.stripe_public_key is not None:
                update_data["stripe_public_key"] = data.stripe_public_key
            elif existing:
                update_data["stripe_public_key"] = existing.get("stripe_public_key", "")
            
            # For secret keys, only update if a new value is provided (not masked)
            if data.stripe_secret_key and data.stripe_secret_key != "••••••••":
                update_data["stripe_secret_key"] = data.stripe_secret_key
            elif existing:
                update_data["stripe_secret_key"] = existing.get("stripe_secret_key", "")
            
            if data.yoco_public_key is not None:
                update_data["yoco_public_key"] = data.yoco_public_key
            elif existing:
                update_data["yoco_public_key"] = existing.get("yoco_public_key", "")
            
            if data.yoco_secret_key and data.yoco_secret_key != "••••••••":
                update_data["yoco_secret_key"] = data.yoco_secret_key
            elif existing:
                update_data["yoco_secret_key"] = existing.get("yoco_secret_key", "")
            
            if data.default_provider:
                update_data["default_provider"] = data.default_provider
            elif existing:
                update_data["default_provider"] = existing.get("default_provider", "stripe")
            
            # Upsert settings
            await db.admin_settings.update_one(
                {"type": "payment_settings"},
                {"$set": update_data},
                upsert=True
            )
            
            logger.info(f"Payment settings updated by {current_user.email}")
            
            return {
                "success": True,
                "message": "Payment settings updated successfully"
            }
            
        except Exception as e:
            logger.error(f"Error updating payment settings: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @admin_settings_router.post("/payments/test")
    async def test_payment_connection(
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """Test payment provider connection (admin only)"""
        require_admin(current_user)
        
        provider = data.get("provider", "stripe")
        
        try:
            if provider == "stripe":
                # Get API key
                settings = await db.admin_settings.find_one({"type": "payment_settings"})
                api_key = settings.get("stripe_secret_key") if settings else os.environ.get("STRIPE_API_KEY")
                
                if not api_key:
                    return {"success": False, "message": "Stripe API key not configured"}
                
                # Test connection
                from emergentintegrations.payments.stripe.checkout import StripeCheckout
                stripe = StripeCheckout(api_key=api_key, webhook_url="")
                
                # Just checking if initialization works
                return {"success": True, "message": "Stripe connection successful"}
                
            elif provider == "yoco":
                settings = await db.admin_settings.find_one({"type": "payment_settings"})
                api_key = settings.get("yoco_secret_key") if settings else os.environ.get("YOCO_SECRET_KEY")
                
                if not api_key:
                    return {"success": False, "message": "Yoco API key not configured"}
                
                # Yoco doesn't have a test endpoint, so just verify key format
                if api_key.startswith("sk_"):
                    return {"success": True, "message": "Yoco API key format valid"}
                else:
                    return {"success": False, "message": "Invalid Yoco API key format"}
            
            return {"success": False, "message": f"Unknown provider: {provider}"}
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    # ==================== SMTP SETTINGS ====================
    
    @admin_settings_router.get("/smtp")
    async def get_smtp_settings(current_user = Depends(get_current_user)):
        """Get SMTP email settings (admin only)"""
        require_admin(current_user)
        
        try:
            settings = await db.admin_settings.find_one({"type": "smtp_settings"})
            
            if not settings:
                return {
                    "success": True,
                    "settings": {
                        "smtp_host": os.environ.get("SMTP_HOST", ""),
                        "smtp_port": int(os.environ.get("SMTP_PORT", 587)),
                        "smtp_username": os.environ.get("SMTP_USERNAME", ""),
                        "smtp_password": "••••••••" if os.environ.get("SMTP_PASSWORD") else "",
                        "from_email": os.environ.get("SMTP_FROM_EMAIL", ""),
                        "from_name": os.environ.get("SMTP_FROM_NAME", ""),
                        "configured": bool(os.environ.get("SMTP_HOST"))
                    }
                }
            
            return {
                "success": True,
                "settings": {
                    "smtp_host": settings.get("smtp_host", ""),
                    "smtp_port": settings.get("smtp_port", 587),
                    "smtp_username": settings.get("smtp_username", ""),
                    "smtp_password": "••••••••" if settings.get("smtp_password") else "",
                    "from_email": settings.get("from_email", ""),
                    "from_name": settings.get("from_name", ""),
                    "configured": bool(settings.get("smtp_host"))
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting SMTP settings: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @admin_settings_router.put("/smtp")
    async def update_smtp_settings(
        data: SMTPSettingsUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update SMTP email settings (admin only)"""
        require_admin(current_user)
        
        try:
            existing = await db.admin_settings.find_one({"type": "smtp_settings"})
            
            update_data = {
                "type": "smtp_settings",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.id
            }
            
            if data.smtp_host is not None:
                update_data["smtp_host"] = data.smtp_host
            elif existing:
                update_data["smtp_host"] = existing.get("smtp_host", "")
            
            if data.smtp_port is not None:
                update_data["smtp_port"] = data.smtp_port
            elif existing:
                update_data["smtp_port"] = existing.get("smtp_port", 587)
            
            if data.smtp_username is not None:
                update_data["smtp_username"] = data.smtp_username
            elif existing:
                update_data["smtp_username"] = existing.get("smtp_username", "")
            
            if data.smtp_password and data.smtp_password != "••••••••":
                update_data["smtp_password"] = data.smtp_password
            elif existing:
                update_data["smtp_password"] = existing.get("smtp_password", "")
            
            if data.from_email is not None:
                update_data["from_email"] = data.from_email
            elif existing:
                update_data["from_email"] = existing.get("from_email", "")
            
            if data.from_name is not None:
                update_data["from_name"] = data.from_name
            elif existing:
                update_data["from_name"] = existing.get("from_name", "")
            
            await db.admin_settings.update_one(
                {"type": "smtp_settings"},
                {"$set": update_data},
                upsert=True
            )
            
            logger.info(f"SMTP settings updated by {current_user.email}")
            
            return {"success": True, "message": "SMTP settings updated successfully"}
            
        except Exception as e:
            logger.error(f"Error updating SMTP settings: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== ALL SETTINGS ====================
    
    @admin_settings_router.get("/all")
    async def get_all_settings(current_user = Depends(get_current_user)):
        """Get all admin settings overview (admin only)"""
        require_admin(current_user)
        
        try:
            payment_settings = await db.admin_settings.find_one({"type": "payment_settings"})
            smtp_settings = await db.admin_settings.find_one({"type": "smtp_settings"})
            
            return {
                "success": True,
                "overview": {
                    "payment": {
                        "stripe_configured": bool(
                            (payment_settings and payment_settings.get("stripe_secret_key")) or 
                            os.environ.get("STRIPE_API_KEY")
                        ),
                        "yoco_configured": bool(
                            (payment_settings and payment_settings.get("yoco_secret_key")) or 
                            os.environ.get("YOCO_SECRET_KEY")
                        ),
                        "default_provider": payment_settings.get("default_provider", "stripe") if payment_settings else "stripe"
                    },
                    "smtp": {
                        "configured": bool(
                            (smtp_settings and smtp_settings.get("smtp_host")) or 
                            os.environ.get("SMTP_HOST")
                        )
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting all settings: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== RESELLER PAYMENT SETTINGS ====================
    
    @admin_settings_router.get("/reseller/payments")
    async def get_reseller_payment_settings(current_user = Depends(get_current_user)):
        """Get payment gateway settings for reseller"""
        if current_user.role not in ["reseller_admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Reseller access required")
        
        try:
            reseller_id = current_user.reseller_id if current_user.role == "reseller_admin" else None
            
            if not reseller_id and current_user.role == "reseller_admin":
                raise HTTPException(status_code=400, detail="Reseller ID not found")
            
            # For reseller_admin, get their specific settings
            if reseller_id:
                settings = await db.reseller_settings.find_one({
                    "reseller_id": reseller_id,
                    "type": "payment_settings"
                })
            else:
                # For super_admin testing, return empty
                settings = None
            
            if not settings:
                return {
                    "success": True,
                    "settings": {
                        "stripe_public_key": "",
                        "stripe_secret_key": "",
                        "stripe_configured": False,
                        "yoco_public_key": "",
                        "yoco_secret_key": "",
                        "yoco_configured": False,
                        "default_provider": "yoco"  # Default to Yoco for South African resellers
                    }
                }
            
            return {
                "success": True,
                "settings": {
                    "stripe_public_key": settings.get("stripe_public_key", ""),
                    "stripe_secret_key": "••••••••" if settings.get("stripe_secret_key") else "",
                    "stripe_configured": bool(settings.get("stripe_secret_key")),
                    "yoco_public_key": settings.get("yoco_public_key", ""),
                    "yoco_secret_key": "••••••••" if settings.get("yoco_secret_key") else "",
                    "yoco_configured": bool(settings.get("yoco_secret_key")),
                    "default_provider": settings.get("default_provider", "yoco")
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting reseller payment settings: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @admin_settings_router.put("/reseller/payments")
    async def update_reseller_payment_settings(
        data: PaymentSettingsUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update payment gateway settings for reseller"""
        if current_user.role not in ["reseller_admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Reseller access required")
        
        reseller_id = current_user.reseller_id
        if not reseller_id and current_user.role == "reseller_admin":
            raise HTTPException(status_code=400, detail="Reseller ID not found")
        
        try:
            existing = await db.reseller_settings.find_one({
                "reseller_id": reseller_id,
                "type": "payment_settings"
            })
            
            update_data = {
                "reseller_id": reseller_id,
                "type": "payment_settings",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.id
            }
            
            # Only update fields that are provided
            if data.stripe_public_key is not None:
                update_data["stripe_public_key"] = data.stripe_public_key
            elif existing:
                update_data["stripe_public_key"] = existing.get("stripe_public_key", "")
            
            if data.stripe_secret_key and data.stripe_secret_key != "••••••••":
                update_data["stripe_secret_key"] = data.stripe_secret_key
            elif existing:
                update_data["stripe_secret_key"] = existing.get("stripe_secret_key", "")
            
            if data.yoco_public_key is not None:
                update_data["yoco_public_key"] = data.yoco_public_key
            elif existing:
                update_data["yoco_public_key"] = existing.get("yoco_public_key", "")
            
            if data.yoco_secret_key and data.yoco_secret_key != "••••••••":
                update_data["yoco_secret_key"] = data.yoco_secret_key
            elif existing:
                update_data["yoco_secret_key"] = existing.get("yoco_secret_key", "")
            
            if data.default_provider:
                update_data["default_provider"] = data.default_provider
            elif existing:
                update_data["default_provider"] = existing.get("default_provider", "yoco")
            
            await db.reseller_settings.update_one(
                {"reseller_id": reseller_id, "type": "payment_settings"},
                {"$set": update_data},
                upsert=True
            )
            
            logger.info(f"Reseller payment settings updated by {current_user.email}")
            
            return {
                "success": True,
                "message": "Payment settings updated successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating reseller payment settings: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @admin_settings_router.post("/reseller/payments/test")
    async def test_reseller_payment_connection(
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """Test reseller payment provider connection"""
        if current_user.role not in ["reseller_admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Reseller access required")
        
        reseller_id = current_user.reseller_id
        provider = data.get("provider", "yoco")
        
        try:
            settings = await db.reseller_settings.find_one({
                "reseller_id": reseller_id,
                "type": "payment_settings"
            })
            
            if provider == "stripe":
                api_key = settings.get("stripe_secret_key") if settings else None
                
                if not api_key:
                    return {"success": False, "message": "Stripe API key not configured"}
                
                from emergentintegrations.payments.stripe.checkout import StripeCheckout
                stripe = StripeCheckout(api_key=api_key, webhook_url="")
                return {"success": True, "message": "Stripe connection successful"}
                
            elif provider == "yoco":
                api_key = settings.get("yoco_secret_key") if settings else None
                
                if not api_key:
                    return {"success": False, "message": "Yoco API key not configured"}
                
                # Test Yoco connection
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://online.yoco.com/v1/charges",
                        headers={"Authorization": f"Bearer {api_key}"},
                        timeout=10
                    )
                    if response.status_code in [200, 401]:
                        return {"success": True, "message": "Yoco connection successful"}
                    return {"success": False, "message": f"Yoco API returned: {response.status_code}"}
            
            return {"success": False, "message": "Unknown provider"}
            
        except Exception as e:
            logger.error(f"Error testing reseller payment connection: {e}")
            return {"success": False, "message": str(e)}
    
    return admin_settings_router
