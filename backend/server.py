from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, status, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime, timezone, timedelta
import uuid

from models import Resume, ResumeCreate, CoverLetter, CoverLetterCreate, ResumeAnalysisResult
from ai_service import ai_service
from odoo_integration import odoo_integration
from auth import (
    Token, UserRegister, UserLogin, UserResponse, UserInDB,
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_active_user, check_user_has_tier,
    oauth2_scheme
)
from yoco_service import yoco_service
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from activity_service import get_activity_service

# Import reseller and admin routers
from reseller_routes import reseller_router, set_db as set_reseller_db
from admin_routes import admin_router, set_db as set_admin_db
from whitelabel_routes import whitelabel_router, set_db as set_whitelabel_db
from booking_routes import booking_router, set_db as set_booking_db
from scheduler_routes import scheduler_router, set_db as set_scheduler_db
from ai_assistant_routes import ai_assistant_router, set_db as set_ai_assistant_db
from cv_processing_routes import cv_processing_router, set_db as set_cv_processing_db
from ai_content_routes import ai_content_router, set_db as set_ai_content_db
from email_service import email_service
from linkedin_routes import router as linkedin_router, set_db as set_linkedin_db
from customer_routes import router as customer_router, set_db as set_customer_db
from content_routes import content_router, set_db as set_content_db
from cv_template_routes import cv_template_router, set_db as set_cv_template_db
from help_routes import help_router, set_db as set_help_db
from talent_pool_routes import get_talent_pool_routes
from remote_jobs_routes import get_remote_jobs_routes, remote_jobs_router
from proposals_routes import get_proposals_routes
from contracts_routes import get_contracts_routes
from payments_routes import get_payments_routes
from admin_settings_routes import get_admin_settings_routes
from employer_routes import get_employer_routes

# Initialize scheduler
scheduler = AsyncIOScheduler()

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Set DB for route modules
set_reseller_db(db)
set_admin_db(db)
set_whitelabel_db(db)
set_booking_db(db)
set_scheduler_db(db)
set_ai_assistant_db(db)
set_cv_processing_db(db)
set_ai_content_db(db)
set_linkedin_db(db)
set_customer_db(db)
set_content_db(db)
set_cv_template_db(db)
set_help_db(db)

# Create the main app without a prefix
app = FastAPI(title="UpShift API", description="AI-Powered Resume and Cover Letter Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Dependency to get current user with db access
async def get_current_user_dep(token: str = Depends(oauth2_scheme)):
    """Dependency to get current user"""
    return await get_current_user(token, db)


# Dependency to check tier with db access
def check_tier_dep(required_tiers: list):
    """Dependency factory to check user tier"""
    async def verify_tier(current_user: UserResponse = Depends(get_current_user_dep)):
        if not current_user.active_tier:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This feature requires a paid plan. Please upgrade to access AI features."
            )
        if current_user.active_tier not in required_tiers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your current plan does not include this feature. Please upgrade."
            )
        return current_user
    return verify_tier


# ==================== Authentication Endpoints ====================

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserRegister):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Validate reseller_id if provided
        reseller_id = user_data.reseller_id
        reseller = None
        if reseller_id:
            reseller = await db.resellers.find_one({"id": reseller_id, "status": "active"})
            if not reseller:
                logger.warning(f"Invalid reseller_id during registration: {reseller_id}")
                reseller_id = None  # Fall back to platform if invalid reseller
        
        # Create user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(user_data.password)
        
        # Determine role based on account_type
        if user_data.account_type == "recruiter":
            user_role = "recruiter"
        elif user_data.account_type == "employer":
            user_role = "employer"
        else:
            user_role = "customer"
        
        # Set up trial for employers (2-day trial)
        employer_trial_data = {}
        if user_role == "employer":
            trial_end = datetime.now(timezone.utc) + timedelta(days=2)
            employer_trial_data = {
                "employer_subscription": {
                    "status": "trial",
                    "plan_id": "employer-trial",
                    "plan_name": "Free Trial",
                    "jobs_limit": 3,  # Limited jobs during trial
                    "jobs_posted": 0,
                    "trial_start": datetime.now(timezone.utc).isoformat(),
                    "trial_end": trial_end.isoformat(),
                    "expires_at": trial_end.isoformat()
                }
            }
        
        new_user = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "hashed_password": hashed_password,
            "role": user_role,
            "reseller_id": reseller_id,
            "company_name": user_data.company_name if user_data.account_type in ["recruiter", "employer"] else None,
            "active_tier": None,
            "tier_activation_date": None,
            "created_at": datetime.utcnow(),
            "is_active": True,
            "payment_history": [],
            **employer_trial_data
        }
        
        await db.users.insert_one(new_user)
        logger.info(f"User registered: {user_data.email} (reseller: {reseller_id or 'platform'})")
        
        # Log activity for reseller
        if reseller_id:
            await db.reseller_activity.insert_one({
                "id": str(uuid.uuid4()),
                "reseller_id": reseller_id,
                "type": "signup",
                "title": "New Customer Signup",
                "description": f"{user_data.full_name} ({user_data.email}) registered",
                "customer_name": user_data.full_name,
                "customer_email": user_data.email,
                "created_at": datetime.now(timezone.utc)
            })
        
        # Send welcome email
        try:
            platform_name = "UpShift"
            login_url = os.environ.get("REACT_APP_FRONTEND_URL", "https://upshift.works") + "/login"
            
            # If reseller registration, get partner site URL and branding
            if reseller and reseller.get("partner_site_url"):
                platform_name = reseller.get("company_name", "UpShift Partner")
                login_url = f"{reseller['partner_site_url']}/login"
            
            await email_service.send_welcome_email(
                to_email=user_data.email,
                user_name=user_data.full_name.split()[0],  # First name only
                platform_name=platform_name,
                login_url=login_url
            )
            logger.info(f"Welcome email sent to: {user_data.email}")
        except Exception as email_error:
            logger.warning(f"Failed to send welcome email to {user_data.email}: {str(email_error)}")
            # Don't fail registration if email fails
        
        # Create access token
        access_token = create_access_token(data={"sub": user_data.email})
        
        # Sync to Odoo (placeholder)
        odoo_id = await odoo_integration.create_or_update_contact({
            "email": user_data.email,
            "name": user_data.full_name
        })
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(
                id=user_id,
                email=user_data.email,
                full_name=user_data.full_name,
                phone=user_data.phone,
                role=user_role,
                reseller_id=reseller_id,
                active_tier=None,
                tier_activation_date=None,
                subscription_expires_at=None,
                status="active",
                created_at=new_user["created_at"]
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/auth/login", response_model=dict)
async def login(user_data: UserLogin):
    """Login user"""
    try:
        # Find user
        user = await db.users.find_one({"email": user_data.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Verify password
        if not verify_password(user_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Check if account is suspended
        user_status = user.get("status", "active")
        subscription_expires_at = user.get("subscription_expires_at")
        
        # Auto-check and suspend if subscription has expired
        if subscription_expires_at and user_status == "active":
            # Handle different datetime formats
            if isinstance(subscription_expires_at, str):
                subscription_expires_at = datetime.fromisoformat(subscription_expires_at.replace('Z', '+00:00'))
            
            # Make timezone-aware if naive
            if subscription_expires_at.tzinfo is None:
                subscription_expires_at = subscription_expires_at.replace(tzinfo=timezone.utc)
            
            now = datetime.now(timezone.utc)
            if subscription_expires_at < now:
                # Subscription has expired - suspend the account
                await db.users.update_one(
                    {"id": user["id"]},
                    {
                        "$set": {
                            "status": "suspended",
                            "active_tier": None,
                            "suspended_at": now,
                            "suspension_reason": "subscription_expired"
                        }
                    }
                )
                user_status = "suspended"
                user["status"] = "suspended"
                user["active_tier"] = None
                logger.info(f"Account suspended due to expired subscription: {user_data.email}")
        
        # Create access token
        access_token = create_access_token(data={"sub": user_data.email})
        
        logger.info(f"User logged in: {user_data.email} (status: {user_status})")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user["full_name"],
                phone=user.get("phone"),
                role=user.get("role", "customer"),
                reseller_id=user.get("reseller_id"),
                active_tier=user.get("active_tier"),
                tier_activation_date=user.get("tier_activation_date"),
                subscription_expires_at=user.get("subscription_expires_at"),
                status=user_status,
                created_at=user["created_at"]
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Emergency Super Admin Reset ====================
@api_router.post("/auth/emergency-admin-reset")
async def emergency_admin_reset(data: dict):
    """
    Emergency endpoint to reset super admin password.
    Requires a secret key for security.
    """
    try:
        secret_key = data.get("secret_key")
        new_password = data.get("new_password", "Admin@2025!")
        
        # Security check - must provide correct secret
        if secret_key != "UPSHIFT-EMERGENCY-RESET-2025":
            raise HTTPException(status_code=403, detail="Invalid secret key")
        
        # Find or create super admin
        admin = await db.users.find_one({"email": "admin@upshift.works"})
        
        if admin:
            # Update password
            hashed = get_password_hash(new_password)
            await db.users.update_one(
                {"email": "admin@upshift.works"},
                {
                    "$set": {
                        "hashed_password": hashed,
                        "status": "active",
                        "role": "super_admin"
                    }
                }
            )
            logger.info("Super admin password reset via emergency endpoint")
            return {"success": True, "message": "Password reset successfully", "email": "admin@upshift.works"}
        else:
            # Create super admin
            from uuid import uuid4
            new_admin = {
                "id": str(uuid4()),
                "email": "admin@upshift.works",
                "full_name": "Super Admin",
                "hashed_password": get_password_hash(new_password),
                "role": "super_admin",
                "status": "active",
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(new_admin)
            logger.info("Super admin created via emergency endpoint")
            return {"success": True, "message": "Super admin created", "email": "admin@upshift.works"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Emergency admin reset error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Emergency User Subscription Activation ====================
@api_router.post("/auth/emergency-activate-subscription")
async def emergency_activate_subscription(data: dict):
    """
    Emergency endpoint to manually activate a user's subscription.
    Use this when payment was successful but subscription wasn't activated.
    """
    try:
        secret_key = data.get("secret_key")
        user_email = data.get("email")
        tier_id = data.get("tier_id", "tier-2")
        days = data.get("days", 30)
        
        # Security check
        if secret_key != "UPSHIFT-EMERGENCY-RESET-2025":
            raise HTTPException(status_code=403, detail="Invalid secret key")
        
        if not user_email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Find user
        user = await db.users.find_one({"email": user_email.lower().strip()})
        if not user:
            raise HTTPException(status_code=404, detail=f"User not found: {user_email}")
        
        # Activate subscription
        await db.users.update_one(
            {"email": user_email.lower().strip()},
            {
                "$set": {
                    "active_tier": tier_id,
                    "tier_activation_date": datetime.now(timezone.utc),
                    "subscription_expires_at": datetime.now(timezone.utc) + timedelta(days=days),
                    "status": "active"
                }
            }
        )
        
        logger.info(f"Emergency subscription activation: {user_email} -> {tier_id} for {days} days")
        
        return {
            "success": True,
            "message": f"Subscription activated for {user_email}",
            "tier": tier_id,
            "expires_in_days": days
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Emergency subscription activation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ==================== Payment Debug/Diagnostic Endpoint ====================
@api_router.post("/admin/diagnose-payment")
async def diagnose_payment(data: dict):
    """
    Diagnostic endpoint to check payment status for troubleshooting.
    Use this to investigate why a payment didn't activate.
    """
    try:
        secret_key = data.get("secret_key")
        user_email = data.get("email")
        
        # Security check
        if secret_key != "UPSHIFT-EMERGENCY-RESET-2025":
            raise HTTPException(status_code=403, detail="Invalid secret key")
        
        if not user_email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        user_email = user_email.lower().strip()
        
        # Get user info
        user = await db.users.find_one({"email": user_email}, {"_id": 0})
        if not user:
            return {"error": f"User not found: {user_email}"}
        
        # Get all payments for this user
        payments = await db.payments.find(
            {"user_email": user_email},
            {"_id": 0}
        ).sort("created_at", -1).to_list(20)
        
        # Get tier-3 specific payments
        tier3_payments = [p for p in payments if p.get("tier_id") == "tier-3"]
        
        result = {
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
                "active_tier": user.get("active_tier"),
                "tier_activation_date": str(user.get("tier_activation_date")) if user.get("tier_activation_date") else None,
                "subscription_expires_at": str(user.get("subscription_expires_at")) if user.get("subscription_expires_at") else None,
                "status": user.get("status"),
                "reseller_id": user.get("reseller_id")
            },
            "total_payments": len(payments),
            "tier3_payments": len(tier3_payments),
            "recent_payments": [
                {
                    "id": p.get("id"),
                    "tier_id": p.get("tier_id"),
                    "status": p.get("status"),
                    "amount_cents": p.get("amount_cents"),
                    "yoco_checkout_id": p.get("yoco_checkout_id"),
                    "created_at": str(p.get("created_at")) if p.get("created_at") else None,
                    "verified_at": str(p.get("verified_at")) if p.get("verified_at") else None
                }
                for p in payments[:5]
            ]
        }
        
        # If there are tier-3 payments, check if any were successful but user doesn't have tier-3
        if tier3_payments and user.get("active_tier") != "tier-3":
            for p in tier3_payments:
                if p.get("status") == "succeeded":
                    result["issue_detected"] = f"Tier-3 payment {p.get('id')} succeeded but user doesn't have tier-3 active"
                    result["suggested_fix"] = f"Call /api/auth/emergency-activate-subscription with email={user_email} and tier_id=tier-3"
                    break
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Diagnose payment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user_dep)):
    """Get current user information"""
    return current_user


# ==================== Password Reset Endpoints ====================

@api_router.post("/auth/forgot-password")
async def forgot_password(data: dict):
    """Request a password reset email"""
    import secrets
    from datetime import timedelta
    
    try:
        email = data.get("email", "").lower().strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Find user
        user = await db.users.find_one({"email": email})
        
        # Always return success to prevent email enumeration
        if not user:
            logger.info(f"Password reset requested for non-existent email: {email}")
            return {"message": "If an account exists with this email, you will receive a password reset link."}
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        reset_expiry = datetime.now(timezone.utc) + timedelta(hours=24)
        
        # Store reset token in database
        await db.password_resets.update_one(
            {"email": email},
            {
                "$set": {
                    "email": email,
                    "token": reset_token,
                    "expires_at": reset_expiry,
                    "used": False,
                    "created_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        # Build reset URL
        frontend_url = os.environ.get('FRONTEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000')).rstrip('/')
        
        # Check if user belongs to a reseller for correct redirect URL
        reseller_subdomain = None
        if user.get("reseller_id"):
            reseller = await db.resellers.find_one({"id": user["reseller_id"]}, {"_id": 0, "subdomain": 1})
            if reseller:
                reseller_subdomain = reseller.get("subdomain")
        
        if reseller_subdomain:
            reset_url = f"{frontend_url}/partner/{reseller_subdomain}/reset-password?token={reset_token}"
        else:
            reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Check if email service is configured
        email_sent = False
        email_error = None
        
        if email_service.is_configured:
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1e40af;">Password Reset Request</h1>
                </div>
                <p>Hi {user.get('full_name', 'there')},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666; font-size: 14px;">{reset_url}</p>
                <p><strong>This link will expire in 24 hours.</strong></p>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px;">This email was sent by UpShift. If you have any questions, please contact support.</p>
            </body>
            </html>
            """
            
            try:
                email_sent = await email_service.send_email(
                    to_email=email,
                    subject="Reset Your Password - UpShift",
                    html_body=html_body,
                    text_body=f"Reset your password by visiting: {reset_url}\n\nThis link expires in 24 hours.",
                    raise_exceptions=False
                )
                if email_sent:
                    logger.info(f"Password reset email sent to: {email}")
                else:
                    email_error = "SMTP authentication or delivery failed"
                    logger.warning(f"Password reset email failed for {email}: {email_error}")
            except Exception as email_err:
                email_error = str(email_err)
                logger.error(f"Failed to send password reset email: {email_error}")
        else:
            email_error = "Email service not configured"
            logger.warning(f"Email not configured. Reset URL for {email}: {reset_url}")
        
        # Store the email status for potential admin review
        await db.password_resets.update_one(
            {"email": email, "token": reset_token},
            {
                "$set": {
                    "email_sent": email_sent,
                    "email_error": email_error,
                    "reset_url": reset_url  # Store for manual recovery if needed
                }
            }
        )
        
        # Return success message (don't reveal if email failed to prevent enumeration)
        return {"message": "If an account exists with this email, you will receive a password reset link."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in forgot password: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred. Please try again.")


@api_router.post("/auth/reset-password")
async def reset_password(data: dict):
    """Reset password using token"""
    try:
        token = data.get("token", "").strip()
        new_password = data.get("password", "")
        
        if not token:
            raise HTTPException(status_code=400, detail="Reset token is required")
        
        if not new_password or len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        # Find valid reset token
        reset_record = await db.password_resets.find_one({
            "token": token,
            "used": False,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not reset_record:
            raise HTTPException(status_code=400, detail="Invalid or expired reset link. Please request a new password reset.")
        
        email = reset_record["email"]
        
        # Update user password
        hashed_password = get_password_hash(new_password)
        result = await db.users.update_one(
            {"email": email},
            {"$set": {"hashed_password": hashed_password}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Unable to update password. Please try again.")
        
        # Mark token as used
        await db.password_resets.update_one(
            {"token": token},
            {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}}
        )
        
        logger.info(f"Password reset successful for: {email}")
        
        return {"message": "Your password has been reset successfully. You can now log in with your new password."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in reset password: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred. Please try again.")


@api_router.get("/auth/verify-reset-token")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    try:
        reset_record = await db.password_resets.find_one({
            "token": token,
            "used": False,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not reset_record:
            return {"valid": False, "message": "Invalid or expired reset link."}
        
        return {"valid": True, "email": reset_record["email"]}
        
    except Exception as e:
        logger.error(f"Error verifying reset token: {str(e)}")
        return {"valid": False, "message": "An error occurred."}


# ==================== Public Pricing Endpoint ====================

@api_router.get("/pricing")
async def get_public_pricing():
    """Get public pricing for the website - no authentication required
    ALL PRICES ARE RETURNED IN CENTS (e.g., 89900 = R899)
    """
    try:
        # Get pricing from platform settings
        pricing_config = await db.platform_settings.find_one(
            {"key": "platform_pricing"},
            {"_id": 0}
        )
        
        # Default pricing (ALL IN CENTS)
        default_pricing = {
            "tier_1": {
                "id": "tier-1",
                "name": "ATS Optimise",
                "price": 89900,  # R899 in cents
                "description": "Perfect for job seekers who already have a CV",
                "features": [
                    "ATS-optimised CV review",
                    "AI-powered CV cleanup and enhancement",
                    "Keyword optimisation for South African market",
                    "Professional formatting",
                    "ATS compatibility check",
                    "PDF download",
                    "One revision included"
                ],
                "turnaround": "24 hours",
                "support": "Email support"
            },
            "tier_2": {
                "id": "tier-2",
                "name": "Professional Package",
                "price": 150000,  # R1500 in cents
                "description": "Complete career toolkit for serious job seekers",
                "features": [
                    "Everything in ATS Optimise",
                    "AI-driven CV creation from scratch",
                    "Professional cover letter generation",
                    "LinkedIn profile optimisation suggestions",
                    "Industry-specific keyword targeting",
                    "Multiple CV format options",
                    "Unlimited revisions (7 days)",
                    "Priority processing"
                ],
                "turnaround": "48 hours",
                "support": "Email & WhatsApp support",
                "popular": True,
                "badge": "Most Popular"
            },
            "tier_3": {
                "id": "tier-3",
                "name": "Executive Elite",
                "price": 300000,  # R3000 in cents
                "description": "Premium service with personalised career strategy",
                "features": [
                    "Everything in Professional Package",
                    "30-minute career strategy call with expert",
                    "12-hour turnaround time",
                    "30 days of dedicated support",
                    "Job application strategy guidance",
                    "Interview preparation tips",
                    "LinkedIn profile rewrite",
                    "Unlimited revisions (30 days)",
                    "Priority WhatsApp support line"
                ],
                "turnaround": "12 hours",
                "support": "Priority WhatsApp & Phone support",
                "badge": "Best Value"
            },
            "strategy_call": {
                "price": 69900,  # R699 in cents
                "duration_minutes": 30
            }
        }
        
        # If we have pricing config in the database, use it (prices are in cents)
        if pricing_config and pricing_config.get("value"):
            config = pricing_config["value"]
            tier_pricing = config.get("default_tier_pricing", {})
            strategy_pricing = config.get("strategy_call_pricing", {})
            
            # Update prices from database (all stored in cents)
            if tier_pricing.get("tier_1_price"):
                default_pricing["tier_1"]["price"] = tier_pricing["tier_1_price"]
            if tier_pricing.get("tier_2_price"):
                default_pricing["tier_2"]["price"] = tier_pricing["tier_2_price"]
            if tier_pricing.get("tier_3_price"):
                default_pricing["tier_3"]["price"] = tier_pricing["tier_3_price"]
            if strategy_pricing.get("price"):
                default_pricing["strategy_call"]["price"] = strategy_pricing["price"]
            if strategy_pricing.get("duration_minutes"):
                default_pricing["strategy_call"]["duration_minutes"] = strategy_pricing["duration_minutes"]
        
        # Return as array for easier frontend use
        return {
            "tiers": [
                default_pricing["tier_1"],
                default_pricing["tier_2"],
                default_pricing["tier_3"]
            ],
            "strategy_call": default_pricing["strategy_call"],
            "currency": "ZAR"
        }
        
    except Exception as e:
        logger.error(f"Error fetching public pricing: {str(e)}")
        # Return defaults on error (in cents)
        return {
            "tiers": [
                {"id": "tier-1", "name": "ATS Optimise", "price": 89900},
                {"id": "tier-2", "name": "Professional Package", "price": 150000, "popular": True},
                {"id": "tier-3", "name": "Executive Elite", "price": 300000}
            ],
            "currency": "ZAR"
        }


# ==================== Payment Endpoints ====================

@api_router.post("/payments/create-checkout")
async def create_payment_checkout(
    tier_id: str,
    current_user: UserResponse = Depends(get_current_user_dep)
):
    """Create a Yoco checkout session for payment using reseller's Yoco settings if available"""
    from yoco_service import get_yoco_service_for_reseller
    
    try:
        # Get user's reseller_id to use their Yoco settings
        user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0, "reseller_id": 1})
        reseller_id = user_doc.get("reseller_id") if user_doc else None
        
        # Get Yoco service with reseller credentials if available
        yoco = await get_yoco_service_for_reseller(db, reseller_id)
        
        # Get reseller subdomain for redirect URLs
        reseller_subdomain = None
        if reseller_id:
            reseller = await db.resellers.find_one({"id": reseller_id}, {"_id": 0, "subdomain": 1, "pricing": 1, "yoco_settings": 1})
            if reseller:
                reseller_subdomain = reseller.get("subdomain")
        
        # Build redirect URLs - use reseller's custom URLs if configured, otherwise default to partner path
        frontend_url = os.environ.get('FRONTEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000')).rstrip('/')
        
        # Check if reseller has custom redirect URLs in their Yoco settings
        custom_success_url = None
        custom_cancel_url = None
        
        if reseller_id and reseller:
            yoco_settings = reseller.get("yoco_settings", {})
            custom_success_url = yoco_settings.get("success_redirect_url")
            custom_cancel_url = yoco_settings.get("cancel_redirect_url")
        
        # Determine final redirect URLs
        if custom_success_url:
            success_url = custom_success_url
        elif reseller_subdomain:
            success_url = f"{frontend_url}/partner/{reseller_subdomain}/payment/success"
        else:
            success_url = f"{frontend_url}/payment/success"
            
        if custom_cancel_url:
            cancel_url = custom_cancel_url
        elif reseller_subdomain:
            cancel_url = f"{frontend_url}/partner/{reseller_subdomain}/payment/cancel"
        else:
            cancel_url = f"{frontend_url}/payment/cancel"
        
        # Get pricing from platform settings or reseller
        # First, set defaults
        tiers = {
            "tier-1": {"name": "ATS Optimize", "price_cents": 89900},
            "tier-2": {"name": "Professional Package", "price_cents": 150000},
            "tier-3": {"name": "Executive Elite", "price_cents": 300000}
        }
        
        if reseller_id:
            # User belongs to a reseller - use reseller's pricing
            reseller = await db.resellers.find_one({"id": reseller_id}, {"_id": 0, "pricing": 1})
            if reseller and reseller.get("pricing"):
                pricing = reseller["pricing"]
                # Check for tier_1_price format (cents) or tier_config format
                if pricing.get("tier_1_price"):
                    tiers["tier-1"]["price_cents"] = int(pricing["tier_1_price"])
                if pricing.get("tier_2_price"):
                    tiers["tier-2"]["price_cents"] = int(pricing["tier_2_price"])
                if pricing.get("tier_3_price"):
                    tiers["tier-3"]["price_cents"] = int(pricing["tier_3_price"])
                # Also check tier_config format
                tier_config = pricing.get("tier_config", {})
                if tier_config.get("tier_1", {}).get("price"):
                    tiers["tier-1"]["price_cents"] = int(tier_config["tier_1"]["price"])
                if tier_config.get("tier_2", {}).get("price"):
                    tiers["tier-2"]["price_cents"] = int(tier_config["tier_2"]["price"])
                if tier_config.get("tier_3", {}).get("price"):
                    tiers["tier-3"]["price_cents"] = int(tier_config["tier_3"]["price"])
        else:
            # Main platform user - read from platform_settings
            pricing_config = await db.platform_settings.find_one(
                {"key": "platform_pricing"},
                {"_id": 0}
            )
            if pricing_config and pricing_config.get("value"):
                config = pricing_config["value"]
                tier_pricing = config.get("default_tier_pricing", {})
                # Prices in platform_settings are now stored in CENTS (standardized)
                if tier_pricing.get("tier_1_price"):
                    tiers["tier-1"]["price_cents"] = int(tier_pricing["tier_1_price"])
                if tier_pricing.get("tier_2_price"):
                    tiers["tier-2"]["price_cents"] = int(tier_pricing["tier_2_price"])
                if tier_pricing.get("tier_3_price"):
                    tiers["tier-3"]["price_cents"] = int(tier_pricing["tier_3_price"])
        
        if tier_id not in tiers:
            raise HTTPException(status_code=400, detail="Invalid tier ID")
        
        tier = tiers[tier_id]
        
        # Log the price being charged for debugging
        logger.info(f"Payment checkout: {tier_id} at {tier['price_cents']} cents (R{tier['price_cents']/100:.2f}) for user {current_user.email} (reseller: {reseller_id or 'platform'})")
        
        # Create payment record FIRST so we have the payment_id for the success URL
        payment_id = str(uuid.uuid4())
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        # Build success URL with our payment_id
        if reseller_subdomain:
            success_url_with_id = f"{frontend_url}/partner/{reseller_subdomain}/payment/success?payment_id={payment_id}"
            cancel_url_final = f"{frontend_url}/partner/{reseller_subdomain}/payment/cancel"
        else:
            success_url_with_id = f"{frontend_url}/payment/success?payment_id={payment_id}"
            cancel_url_final = f"{frontend_url}/payment/cancel"
        
        # Create checkout with Yoco (using reseller's credentials if configured)
        checkout = await yoco.create_checkout(
            amount_cents=tier["price_cents"],
            email=current_user.email,
            metadata={
                "user_id": current_user.id,
                "user_email": current_user.email,
                "user_name": current_user.full_name,
                "tier_id": tier_id,
                "tier_name": tier["name"],
                "reseller_id": reseller_id or "platform",
                "reseller_subdomain": reseller_subdomain or "",
                "payment_id": payment_id
            },
            success_url=success_url_with_id,
            cancel_url=cancel_url_final
        )
        
        # Save pending payment to database with yoco_checkout_id
        await db.payments.insert_one({
            "id": payment_id,
            "user_id": current_user.id,
            "user_email": current_user.email,
            "reseller_id": reseller_id,
            "tier_id": tier_id,
            "tier_name": tier["name"],
            "amount_cents": tier["price_cents"],
            "currency": "ZAR",
            "yoco_checkout_id": checkout.get("id"),
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        logger.info(f"Checkout created for user {current_user.email}: {tier_id} (reseller: {reseller_id or 'platform'})")
        
        return {
            "checkout_id": checkout.get("id"),
            "redirect_url": checkout.get("redirectUrl"),
            "payment_id": payment_id
        }
    except Exception as e:
        logger.error(f"Error creating checkout: {str(e)}")
        error_msg = str(e)
        if "403" in error_msg or "Forbidden" in error_msg or "key is required" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(
                status_code=400, 
                detail="Yoco payment gateway is not properly configured. The API keys may be invalid or expired. Please contact the administrator to configure valid Yoco credentials in Settings → Yoco Settings."
            )
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")


@api_router.post("/payments/verify-by-payment-id/{payment_id}")
async def verify_payment_by_payment_id(
    payment_id: str,
    current_user: UserResponse = Depends(get_current_user_dep)
):
    """
    Verify payment using our internal payment_id.
    This is used when Yoco redirects back to our success URL with ?payment_id=xxx
    """
    from yoco_service import get_yoco_service_for_reseller
    
    try:
        logger.info(f"Payment verification started for payment_id: {payment_id}")
        
        # Find our payment record
        payment = await db.payments.find_one({"id": payment_id})
        if not payment:
            logger.error(f"Payment not found: {payment_id}")
            raise HTTPException(status_code=404, detail="Payment record not found")
        
        logger.info(f"Payment record found: tier={payment.get('tier_id')}, user={payment.get('user_email')}, status={payment.get('status')}, reseller={payment.get('reseller_id')}")
        
        # Check if already processed
        if payment.get("status") == "succeeded":
            logger.info(f"Payment {payment_id} already succeeded, returning cached result")
            return {
                "status": "success",
                "message": "Payment already verified",
                "tier_id": payment.get("tier_id"),
                "tier_name": payment.get("tier_name")
            }
        
        # Get the yoco_checkout_id from our record
        yoco_checkout_id = payment.get("yoco_checkout_id")
        if not yoco_checkout_id:
            logger.error(f"No Yoco checkout ID for payment: {payment_id}")
            raise HTTPException(status_code=400, detail="Payment record is incomplete")
        
        # Get Yoco service with reseller credentials if available (critical for proper verification)
        reseller_id = payment.get("reseller_id")
        yoco = await get_yoco_service_for_reseller(db, reseller_id if reseller_id != "platform" else None)
        
        logger.info(f"Verifying with Yoco checkout_id: {yoco_checkout_id} (reseller: {reseller_id})")
        
        # Verify with Yoco using the appropriate credentials
        is_successful = await yoco.verify_payment(yoco_checkout_id)
        
        if not is_successful:
            logger.warning(f"Yoco verification failed for payment: {payment_id}, checkout_id: {yoco_checkout_id}")
            return {
                "status": "failed",
                "message": "Payment verification failed with Yoco. The payment may still be processing - please wait a moment and try again."
            }
        
        logger.info(f"Yoco verification successful for payment: {payment_id}")
        
        # Update payment status
        await db.payments.update_one(
            {"id": payment_id},
            {
                "$set": {
                    "status": "succeeded",
                    "verified_at": datetime.now(timezone.utc),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Calculate subscription expiry (30 days from now)
        subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Activate tier for user
        user_update_result = await db.users.update_one(
            {"id": payment["user_id"]},
            {
                "$set": {
                    "active_tier": payment["tier_id"],
                    "tier_activation_date": datetime.now(timezone.utc),
                    "subscription_expires_at": subscription_expires_at,
                    "status": "active"
                },
                "$push": {
                    "payment_history": payment_id
                }
            }
        )
        
        logger.info(f"User update result: matched={user_update_result.matched_count}, modified={user_update_result.modified_count}")
        
        if user_update_result.modified_count == 0:
            # User might not exist with this ID - try updating by email as backup
            logger.warning(f"User update by ID failed, trying by email: {payment['user_email']}")
            user_update_result = await db.users.update_one(
                {"email": payment["user_email"]},
                {
                    "$set": {
                        "active_tier": payment["tier_id"],
                        "tier_activation_date": datetime.now(timezone.utc),
                        "subscription_expires_at": subscription_expires_at,
                        "status": "active"
                    },
                    "$push": {
                        "payment_history": payment_id
                    }
                }
            )
            logger.info(f"User update by email result: matched={user_update_result.matched_count}, modified={user_update_result.modified_count}")
        
        logger.info(f"Payment verified via payment_id: {payment_id}, tier {payment['tier_id']} activated for user {payment['user_email']}")
        
        # Log activity for reseller
        if payment.get("reseller_id"):
            try:
                from activity_service import log_activity
                await log_activity(
                    db=db,
                    user_id=payment["user_id"],
                    reseller_id=payment.get("reseller_id"),
                    activity_type="subscription",
                    description=f"Subscribed to {payment['tier_name']}"
                )
            except:
                pass
        
        return {
            "status": "success",
            "message": "Payment verified successfully",
            "tier_id": payment["tier_id"],
            "tier_name": payment.get("tier_name")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment by payment_id: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/payments/verify/{checkout_id}")
async def verify_payment_status(
    checkout_id: str,
    current_user: UserResponse = Depends(get_current_user_dep)
):
    """Verify payment status and activate tier"""
    try:
        # Verify with Yoco
        is_successful = await yoco_service.verify_payment(checkout_id)
        
        if not is_successful:
            return {
                "status": "failed",
                "message": "Payment verification failed"
            }
        
        # Get payment record
        payment = await db.payments.find_one({"yoco_checkout_id": checkout_id})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment record not found")
        
        # Update payment status
        await db.payments.update_one(
            {"yoco_checkout_id": checkout_id},
            {
                "$set": {
                    "status": "succeeded",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Calculate subscription expiry (30 days from now)
        subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Activate tier for user with subscription expiry
        await db.users.update_one(
            {"id": current_user.id},
            {
                "$set": {
                    "active_tier": payment["tier_id"],
                    "tier_activation_date": datetime.now(timezone.utc),
                    "subscription_expires_at": subscription_expires_at,
                    "status": "active"  # Reactivate if was suspended
                },
                "$push": {
                    "payment_history": payment["id"]
                }
            }
        )
        
        logger.info(f"Tier {payment['tier_id']} activated for user {current_user.email}, expires: {subscription_expires_at}")
        
        # Log activity for reseller if payment was through reseller
        if payment.get("reseller_id"):
            await db.reseller_activity.insert_one({
                "id": str(uuid.uuid4()),
                "reseller_id": payment["reseller_id"],
                "type": "payment",
                "title": "Payment Received",
                "description": f"{current_user.full_name} purchased {payment['tier_name']} for R{payment['amount_cents']/100:.2f}",
                "customer_name": current_user.full_name,
                "customer_email": current_user.email,
                "amount": payment["amount_cents"],
                "tier": payment["tier_name"],
                "created_at": datetime.now(timezone.utc)
            })
        
        # Sync to Odoo (placeholder)
        await odoo_integration.create_resume_record({
            "user_email": current_user.email,
            "tier": payment["tier_name"],
            "amount": payment["amount_cents"]
        })
        
        return {
            "status": "success",
            "message": f"Payment successful! {payment['tier_name']} activated.",
            "tier_id": payment["tier_id"],
            "tier_name": payment["tier_name"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/payments/history")
async def get_payment_history(
    current_user: UserResponse = Depends(get_current_user_dep)
):
    """Get user's payment history"""
    try:
        payments = await db.payments.find(
            {"user_id": current_user.id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {
            "payments": payments,
            "total_count": len(payments)
        }
    except Exception as e:
        logger.error(f"Error getting payment history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Resume Endpoints ====================

@api_router.post("/resumes", response_model=Resume)
async def create_resume(resume_data: ResumeCreate):
    """Create a new resume"""
    try:
        resume = Resume(**resume_data.dict())
        
        # Save to MongoDB
        result = await db.resumes.insert_one(resume.dict())
        logger.info(f"Resume created with ID: {resume.id}")
        
        # Placeholder: Sync to Odoo
        odoo_id = await odoo_integration.create_resume_record(resume.dict())
        if odoo_id:
            resume.odoo_record_id = odoo_id
            await db.resumes.update_one(
                {"id": resume.id},
                {"$set": {"odoo_record_id": odoo_id}}
            )
        
        return resume
    except Exception as e:
        logger.error(f"Error creating resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/resumes/{resume_id}", response_model=Resume)
async def get_resume(resume_id: str):
    """Get a specific resume by ID"""
    resume = await db.resumes.find_one({"id": resume_id})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return Resume(**resume)


@api_router.get("/resumes", response_model=List[Resume])
async def get_all_resumes(user_id: str = None):
    """Get all resumes, optionally filtered by user_id"""
    query = {"user_id": user_id} if user_id else {}
    resumes = await db.resumes.find(query).to_list(100)
    return [Resume(**resume) for resume in resumes]


@api_router.post("/resumes/generate-pdf")
async def generate_resume_pdf(resume_data: ResumeCreate):
    """Generate PDF from resume data"""
    try:
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor='#2563eb',
            spaceAfter=12
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor='#1e40af',
            spaceAfter=6,
            spaceBefore=12
        )
        
        # Name
        story.append(Paragraph(resume_data.fullName, title_style))
        
        # Contact info
        contact = f"{resume_data.email} | {resume_data.phone}"
        if resume_data.city and resume_data.province:
            contact += f" | {resume_data.city}, {resume_data.province}"
        story.append(Paragraph(contact, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Summary
        if resume_data.summary:
            story.append(Paragraph("PROFESSIONAL SUMMARY", heading_style))
            story.append(Paragraph(resume_data.summary, styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Work Experience
        if resume_data.experiences:
            story.append(Paragraph("WORK EXPERIENCE", heading_style))
            for exp in resume_data.experiences:
                story.append(Paragraph(f"<b>{exp.title}</b> at {exp.company}", styles['Normal']))
                story.append(Paragraph(exp.duration, styles['Normal']))
                story.append(Paragraph(exp.description, styles['Normal']))
                if exp.achievements:
                    story.append(Paragraph("<b>Key Achievements:</b>", styles['Normal']))
                    story.append(Paragraph(exp.achievements, styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
        
        # Education
        if resume_data.education:
            story.append(Paragraph("EDUCATION", heading_style))
            for edu in resume_data.education:
                story.append(Paragraph(f"<b>{edu.degree}</b>", styles['Normal']))
                story.append(Paragraph(f"{edu.institution}, {edu.year}", styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
        
        # Skills
        if resume_data.skills:
            story.append(Paragraph("SKILLS", heading_style))
            skills_text = " • ".join([skill for skill in resume_data.skills if skill])
            story.append(Paragraph(skills_text, styles['Normal']))
        
        # Languages
        if resume_data.languages:
            story.append(Spacer(1, 0.1*inch))
            story.append(Paragraph("LANGUAGES", heading_style))
            for lang in resume_data.languages:
                if lang.language:
                    story.append(Paragraph(f"{lang.language}: {lang.proficiency}", styles['Normal']))
        
        # References
        if hasattr(resume_data, 'references') and resume_data.references:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph("REFERENCES", heading_style))
            for ref in resume_data.references:
                if ref.name:
                    ref_text = f"<b>{ref.name}</b>"
                    if ref.title:
                        ref_text += f", {ref.title}"
                    if ref.company:
                        ref_text += f" at {ref.company}"
                    story.append(Paragraph(ref_text, styles['Normal']))
                    
                    contact_info = []
                    if ref.email:
                        contact_info.append(f"Email: {ref.email}")
                    if ref.phone:
                        contact_info.append(f"Phone: {ref.phone}")
                    
                    if contact_info:
                        story.append(Paragraph(" | ".join(contact_info), styles['Normal']))
                    story.append(Spacer(1, 0.1*inch))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={resume_data.fullName}_Resume.pdf"}
        )
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AI Endpoints ====================

@api_router.post("/ai/improve-section")
async def improve_resume_section(
    data: dict,
    current_user: UserResponse = Depends(check_tier_dep(['tier-1', 'tier-2', 'tier-3']))
):
    """Improve a specific section of resume using AI (Requires paid tier)"""
    try:
        section = data.get("section", "")
        content = data.get("content", "")
        context = data.get("context", "")
        
        if not section or not content:
            raise HTTPException(status_code=400, detail="Section and content are required")
        
        improved_text = await ai_service.improve_resume_section(section, content, context)
        
        logger.info(f"AI improvement requested by user {current_user.email}")
        
        return {"improved_text": improved_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error improving section: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ai/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(check_tier_dep(['tier-1', 'tier-2', 'tier-3']))
):
    """Analyze uploaded resume and provide feedback (Requires paid tier)"""
    try:
        # Read file content
        content = await file.read()
        resume_text = content.decode('utf-8', errors='ignore')
        
        # If PDF, extract text (simplified - real implementation would use pypdf or similar)
        if file.filename.endswith('.pdf'):
            # Placeholder: In production, use pypdf2 or pdfplumber to extract text
            resume_text = "PDF text extraction would go here"
        
        # Analyze with AI
        analysis = await ai_service.analyze_resume(resume_text)
        
        logger.info(f"Resume analysis requested by user {current_user.email}")
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ai/job-match")
async def calculate_job_match(
    data: dict,
    current_user: UserResponse = Depends(check_tier_dep(['tier-2', 'tier-3']))
):
    """Calculate how well resume matches job description (Requires Professional or Elite tier)"""
    try:
        resume_text = data.get("resume_text", "")
        job_description = data.get("job_description", "")
        
        if not resume_text or not job_description:
            raise HTTPException(status_code=400, detail="Both resume text and job description are required")
        
        match_result = await ai_service.get_job_match_score(resume_text, job_description)
        
        logger.info(f"Job match analysis requested by user {current_user.email}")
        
        return match_result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating job match: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ATS Resume Checker (FREE) ====================

@api_router.post("/ats-check")
async def ats_resume_check(
    file: UploadFile = File(...),
    request: Request = None
):
    """
    FREE ATS Resume Checker - Analyzes resume for ATS compliance
    No authentication required - available to all users
    Results are saved to history if user is logged in
    Features:
    - Caching: Similar resumes use cached results to reduce API calls
    - Fallback: Basic rule-based analysis when AI quota is exceeded
    """
    try:
        import PyPDF2
        import io
        import hashlib
        from datetime import timezone
        from ai_service import QuotaExceededError, AIServiceError, fallback_ats_analysis
        
        # Try to get current user (optional - for saving history)
        current_user_id = None
        try:
            auth_header = request.headers.get("Authorization", "") if request else ""
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                from jose import jwt
                from auth import SECRET_KEY, ALGORITHM
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                if payload:
                    email = payload.get("sub")
                    # Fetch the actual user ID from the database using email
                    if email:
                        user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1})
                        if user:
                            current_user_id = user["id"]
                            logger.info(f"ATS check for authenticated user: {email} (id: {current_user_id})")
        except Exception as auth_error:
            logger.debug(f"ATS check: User not authenticated - {auth_error}")
            pass  # User not logged in, that's fine
        
        # Read file content
        content = await file.read()
        resume_text = ""
        
        # Extract text based on file type
        if file.filename.lower().endswith('.pdf'):
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                for page in pdf_reader.pages:
                    resume_text += page.extract_text() or ""
            except Exception as pdf_error:
                logger.warning(f"PDF extraction failed: {pdf_error}, trying as text")
                resume_text = content.decode('utf-8', errors='ignore')
        elif file.filename.lower().endswith(('.txt', '.doc', '.docx')):
            resume_text = content.decode('utf-8', errors='ignore')
        else:
            # Try to decode as text
            resume_text = content.decode('utf-8', errors='ignore')
        
        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(
                status_code=400, 
                detail="Could not extract text from the uploaded file. Please ensure the file contains readable text."
            )
        
        # Generate hash for caching
        resume_hash = hashlib.md5(resume_text.encode()).hexdigest()
        
        # Check cache first (results valid for 24 hours)
        cached_result = await db.ats_cache.find_one({
            "resume_hash": resume_hash,
            "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(hours=24)}
        }, {"_id": 0})
        
        analysis = None
        used_cache = False
        used_fallback = False
        error_message = None
        
        if cached_result:
            analysis = cached_result.get("analysis")
            used_cache = True
            logger.info(f"ATS check using cached result for hash: {resume_hash[:8]}")
        else:
            # Try AI analysis, fall back to basic analysis if quota exceeded
            try:
                analysis = await ai_service.ats_resume_check(resume_text)
                
                # Cache the successful result
                await db.ats_cache.update_one(
                    {"resume_hash": resume_hash},
                    {
                        "$set": {
                            "resume_hash": resume_hash,
                            "analysis": analysis,
                            "created_at": datetime.now(timezone.utc)
                        }
                    },
                    upsert=True
                )
                logger.info(f"ATS check result cached for hash: {resume_hash[:8]}")
                
            except QuotaExceededError as qe:
                logger.warning(f"ATS quota exceeded, using fallback analysis: {str(qe)}")
                analysis = fallback_ats_analysis(resume_text)
                used_fallback = True
                error_message = "AI service temporarily unavailable. Showing basic analysis results."
                
            except AIServiceError as ae:
                logger.warning(f"AI service error, using fallback analysis: {str(ae)}")
                analysis = fallback_ats_analysis(resume_text)
                used_fallback = True
                error_message = str(ae)
                
            except Exception as e:
                logger.error(f"Unexpected error in ATS check, using fallback: {str(e)}")
                analysis = fallback_ats_analysis(resume_text)
                used_fallback = True
                error_message = "Unable to perform full AI analysis. Showing basic analysis results."
        
        # Save to history if user is logged in
        if current_user_id:
            try:
                # Extract score - AI may return it as 'overall_score' or 'score'
                score = analysis.get("overall_score", analysis.get("score", 0))
                ats_result = {
                    "id": str(uuid.uuid4()),
                    "user_id": current_user_id,
                    "filename": file.filename,
                    "score": score,
                    "analysis": analysis,
                    "used_fallback": used_fallback,
                    "created_at": datetime.now(timezone.utc)
                }
                await db.ats_results.insert_one(ats_result)
                logger.info(f"ATS result saved for user: {current_user_id}, score: {score}")
                
                # Log activity
                try:
                    activity_service = get_activity_service(db)
                    user = await db.users.find_one({"id": current_user_id}, {"_id": 0, "reseller_id": 1})
                    reseller_id = user.get("reseller_id") if user else None
                    await activity_service.log_activity(
                        user_id=current_user_id,
                        activity_type="ats_check",
                        description=f"ATS Check Score: {score}% for {file.filename}",
                        metadata={"score": score, "filename": file.filename},
                        reseller_id=reseller_id
                    )
                except Exception as log_error:
                    logger.warning(f"Failed to log ATS activity: {log_error}")
                    
            except Exception as save_error:
                logger.warning(f"Failed to save ATS result: {save_error}")
        
        logger.info(f"ATS check performed for file: {file.filename} (cache: {used_cache}, fallback: {used_fallback})")
        
        response_data = {
            "success": True,
            "filename": file.filename,
            "analysis": analysis,
            "saved_to_history": current_user_id is not None,
            "used_cache": used_cache,
            "used_fallback": used_fallback
        }
        
        if error_message:
            response_data["notice"] = error_message
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing ATS check: {str(e)}")
        
        # Provide user-friendly error messages
        error_str = str(e).lower()
        if 'quota' in error_str or 'exceeded' in error_str or 'rate limit' in error_str:
            raise HTTPException(
                status_code=503,
                detail="Our AI service is currently experiencing high demand. Please try again in a few minutes, or your analysis will use our basic checker."
            )
        elif 'timeout' in error_str:
            raise HTTPException(
                status_code=504,
                detail="The analysis is taking longer than expected. Please try again with a shorter document."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="We encountered an issue analysing your CV. Please try again or contact support if the problem persists."
            )


# ==================== Cover Letter Endpoints ====================

@api_router.post("/cover-letters/generate", response_model=CoverLetter)
async def generate_cover_letter(
    data: CoverLetterCreate,
    current_user: UserResponse = Depends(check_tier_dep(['tier-2', 'tier-3']))
):
    """Generate AI cover letter (Requires Professional or Elite tier)"""
    try:
        # Generate cover letter with AI
        generated_content = await ai_service.generate_cover_letter(data.dict())
        
        # Create cover letter object
        cover_letter = CoverLetter(
            **data.dict(),
            generated_content=generated_content
        )
        cover_letter.user_id = current_user.id
        
        # Save to MongoDB
        await db.cover_letters.insert_one(cover_letter.dict())
        logger.info(f"Cover letter created for user {current_user.email}")
        
        # Placeholder: Sync to Odoo
        odoo_id = await odoo_integration.create_cover_letter_record(cover_letter.dict())
        if odoo_id:
            cover_letter.odoo_record_id = odoo_id
            await db.cover_letters.update_one(
                {"id": cover_letter.id},
                {"$set": {"odoo_record_id": odoo_id}}
            )
        
        return cover_letter
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating cover letter: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/cover-letters/{letter_id}", response_model=CoverLetter)
async def get_cover_letter(letter_id: str):
    """Get a specific cover letter by ID"""
    letter = await db.cover_letters.find_one({"id": letter_id})
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return CoverLetter(**letter)


@api_router.get("/cover-letters", response_model=List[CoverLetter])
async def get_all_cover_letters(user_id: str = None):
    """Get all cover letters, optionally filtered by user_id"""
    query = {"user_id": user_id} if user_id else {}
    letters = await db.cover_letters.find(query).to_list(100)
    return [CoverLetter(**letter) for letter in letters]


# ==================== Templates Endpoint ====================

@api_router.get("/templates")
async def get_templates():
    """Get all available resume templates"""
    # This could be from DB in future, for now return static data
    templates = [
        {
            "id": 1,
            "name": "ATS Classic Professional",
            "category": "ats",
            "description": "Clean, ATS-friendly format with clear section headers. Perfect for corporate roles and passing automated screening systems.",
            "image": "https://images.unsplash.com/photo-1698047681432-006d2449c631?w=400&h=500&fit=crop",
            "industry": "Corporate"
        },
        {
            "id": 2,
            "name": "ATS Simple & Clean",
            "category": "ats",
            "description": "Minimalist ATS-optimized design with standard fonts and clear hierarchy. Ideal for all industries.",
            "image": "https://images.unsplash.com/photo-1758518730327-98070967caab?w=400&h=500&fit=crop",
            "industry": "Any"
        },
        {
            "id": 3,
            "name": "ATS Executive Format",
            "category": "ats",
            "description": "Professional ATS-compatible template for senior management positions. Clear formatting with achievement focus.",
            "image": "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?w=400&h=500&fit=crop",
            "industry": "Executive"
        },
        {
            "id": 4,
            "name": "ATS Tech Professional",
            "category": "ats",
            "description": "Technical skills-focused ATS template for IT and software roles. Clean sections for certifications and projects.",
            "image": "https://images.pexels.com/photos/5989926/pexels-photo-5989926.jpeg?w=400&h=500&fit=crop",
            "industry": "Technology"
        },
        {
            "id": 5,
            "name": "ATS Finance & Banking",
            "category": "ats",
            "description": "Conservative ATS-friendly format for financial services. Emphasizes qualifications and achievements.",
            "image": "https://images.unsplash.com/photo-1562564055-71e051d33c19?w=400&h=500&fit=crop",
            "industry": "Finance"
        },
        {
            "id": 6,
            "name": "ATS Healthcare Professional",
            "category": "ats",
            "description": "Medical and healthcare optimized ATS template with sections for licenses and certifications.",
            "image": "https://images.unsplash.com/photo-1763729805496-b5dbf7f00c79?w=400&h=500&fit=crop",
            "industry": "Healthcare"
        }
    ]
    return templates


# Include the router in the main app
app.include_router(api_router)

# Mount static files for uploads
uploads_path = ROOT_DIR / "uploads"
if not uploads_path.exists():
    uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Mount public uploads (CV templates and generated CVs)
public_uploads_path = Path("/app/public/uploads")
if not public_uploads_path.exists():
    public_uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(public_uploads_path)), name="public_uploads")

# Include reseller and admin routers
app.include_router(reseller_router)
app.include_router(admin_router)
app.include_router(whitelabel_router)
app.include_router(booking_router)
app.include_router(scheduler_router)
app.include_router(ai_assistant_router)
app.include_router(cv_processing_router)
app.include_router(ai_content_router)
app.include_router(linkedin_router)
app.include_router(customer_router)
app.include_router(content_router)
app.include_router(cv_template_router)
app.include_router(help_router)

# Initialize and include talent pool router
talent_pool_router = get_talent_pool_routes(db, get_current_user_dep)
app.include_router(talent_pool_router)

# Initialize and include remote jobs router
remote_jobs_router_instance = get_remote_jobs_routes(db, get_current_user_dep)
app.include_router(remote_jobs_router_instance)

# Initialize and include proposals router
proposals_router_instance = get_proposals_routes(db, get_current_user_dep)
app.include_router(proposals_router_instance)

# Initialize and include contracts router
contracts_router_instance = get_contracts_routes(db, get_current_user_dep)
app.include_router(contracts_router_instance)

# Initialize and include payments router
payments_router_instance = get_payments_routes(db, get_current_user_dep)
app.include_router(payments_router_instance)

# Initialize and include admin settings router
admin_settings_router_instance = get_admin_settings_routes(db, get_current_user_dep)
app.include_router(admin_settings_router_instance)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()


@app.on_event("startup")
async def startup_event():
    """Initialize database and create default super admin if not exists"""
    try:
        # Create indexes for better performance
        await db.users.create_index("email", unique=True)
        await db.users.create_index("role")
        await db.resellers.create_index("subdomain", unique=True)
        await db.resellers.create_index("custom_domain", sparse=True)
        await db.reseller_invoices.create_index([("reseller_id", 1), ("period", 1)])
        
        # Create default super admin if not exists
        default_admin_email = "admin@upshift.works"
        existing_admin = await db.users.find_one({"email": default_admin_email})
        
        if not existing_admin:
            admin_id = str(uuid.uuid4())
            hashed_password = get_password_hash("admin123")  # Change in production!
            
            admin_user = {
                "id": admin_id,
                "email": default_admin_email,
                "full_name": "Super Admin",
                "hashed_password": hashed_password,
                "role": "super_admin",
                "active_tier": None,
                "created_at": datetime.utcnow(),
                "is_active": True,
                "payment_history": []
            }
            
            await db.users.insert_one(admin_user)
            logger.info(f"Default super admin created: {default_admin_email}")
        
        # Load email settings for service
        email_settings = await db.platform_settings.find_one({"key": "email"}, {"_id": 0})
        if email_settings:
            email_service.configure(email_settings)
            logger.info("Email service configured from database settings")
        
        # Start the scheduler
        scheduler.add_job(
            auto_generate_monthly_invoices,
            CronTrigger(day=1, hour=0, minute=0),  # Run at midnight on the 1st of every month
            id='monthly_invoice_generation',
            replace_existing=True
        )
        
        scheduler.add_job(
            auto_send_payment_reminders,
            CronTrigger(hour=9, minute=0),  # Run daily at 9 AM
            id='daily_payment_reminders',
            replace_existing=True
        )
        
        scheduler.add_job(
            auto_suspend_expired_subscriptions,
            CronTrigger(hour=0, minute=30),  # Run daily at 00:30 AM
            id='daily_subscription_check',
            replace_existing=True
        )
        
        # Add demo reseller nightly reset job (midnight SAST = 22:00 UTC)
        scheduler.add_job(
            auto_reset_demo_reseller,
            CronTrigger(hour=22, minute=0),  # Run at 22:00 UTC = 00:00 SAST
            id='demo_reseller_nightly_reset',
            replace_existing=True
        )
        
        # Add reseller trial expiry reminder job (runs daily at 8 AM)
        scheduler.add_job(
            auto_send_reseller_trial_reminders,
            CronTrigger(hour=8, minute=0),
            id='reseller_trial_reminders',
            replace_existing=True
        )
        
        # Add reseller trial suspension job (runs daily at 1 AM)
        scheduler.add_job(
            auto_suspend_expired_reseller_trials,
            CronTrigger(hour=1, minute=0),
            id='reseller_trial_suspension',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Background scheduler started with invoice, reminder, subscription check, demo reset, and reseller trial jobs")
        
        # Initialize demo reseller account on startup
        await initialize_demo_account_on_startup()
        
        logger.info("Database startup complete")
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")


async def auto_generate_monthly_invoices():
    """Automatically generate monthly invoices for all active resellers"""
    try:
        from datetime import timedelta, timezone
        
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
        settings = await db.platform_settings.find_one({"key": "email"}, {"_id": 0})
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
                    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
                    payment_link = f"{frontend_url}/reseller-dashboard/invoices"
                    
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
                        # Log the email
                        await db.email_logs.insert_one({
                            "id": str(uuid.uuid4()),
                            "type": "invoice_created",
                            "invoice_id": invoice["id"],
                            "reseller_id": reseller["id"],
                            "to_email": contact_email,
                            "status": "sent",
                            "sent_at": now,
                            "sent_by": "system"
                        })
        
        logger.info(f"[AUTO] Monthly invoices generated: {invoices_created}, emails sent: {emails_sent}")
        
    except Exception as e:
        logger.error(f"[AUTO] Error generating monthly invoices: {str(e)}")


async def auto_send_payment_reminders():
    """Automatically send payment reminders based on configured schedules"""
    try:
        from datetime import timedelta, timezone
        
        now = datetime.now(timezone.utc)
        
        # Load email settings
        settings = await db.platform_settings.find_one({"type": "email"}, {"_id": 0})
        if not settings or not settings.get("smtp_user"):
            logger.info("[AUTO] Email not configured, skipping payment reminders")
            return
        
        email_service.configure(settings)
        
        # Get active reminder schedules
        schedules = await db.reminder_schedules.find(
            {"is_active": True},
            {"_id": 0}
        ).to_list(100)
        
        if not schedules:
            return
        
        # Get all pending invoices
        pending_invoices = await db.reseller_invoices.find(
            {"status": "pending"},
            {"_id": 0}
        ).to_list(1000)
        
        sent_count = 0
        
        for invoice in pending_invoices:
            # Parse due date
            due_date = invoice["due_date"]
            if isinstance(due_date, str):
                due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
            
            days_until_due = (due_date - now).days
            
            # Check if any schedule matches
            for schedule in schedules:
                if schedule["days_before_due"] == days_until_due:
                    # Check if we already sent a reminder today for this invoice/schedule
                    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    existing_log = await db.email_logs.find_one({
                        "invoice_id": invoice["id"],
                        "type": "invoice_reminder",
                        "sent_at": {"$gte": today_start}
                    })
                    
                    if existing_log:
                        continue
                    
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
                    
                    is_overdue = days_until_due < 0
                    amount = f"R {invoice['amount'] / 100:,.2f}"
                    due_date_str = due_date.strftime("%d %B %Y")
                    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
                    payment_link = f"{frontend_url}/reseller-dashboard/invoices"
                    
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
                        await db.email_logs.insert_one({
                            "id": str(uuid.uuid4()),
                            "type": "invoice_reminder",
                            "invoice_id": invoice["id"],
                            "reseller_id": reseller["id"],
                            "to_email": contact_email,
                            "schedule_name": schedule["name"],
                            "status": "sent",
                            "sent_at": now,
                            "sent_by": "system"
                        })
                    
                    break  # Only send one reminder per invoice per day
        
        if sent_count > 0:
            logger.info(f"[AUTO] Payment reminders sent: {sent_count}")
        
    except Exception as e:
        logger.error(f"[AUTO] Error sending payment reminders: {str(e)}")


async def auto_suspend_expired_subscriptions():
    """Automatically suspend accounts with expired subscriptions"""
    try:
        now = datetime.now(timezone.utc)
        
        # Find all active users with expired subscriptions
        expired_users = await db.users.find({
            "status": "active",
            "active_tier": {"$ne": None},
            "subscription_expires_at": {"$lt": now},
            "role": "customer"  # Only suspend customer accounts, not admins
        }).to_list(None)
        
        suspended_count = 0
        email_sent_count = 0
        
        for user in expired_users:
            try:
                # Suspend the account
                await db.users.update_one(
                    {"id": user["id"]},
                    {
                        "$set": {
                            "status": "suspended",
                            "active_tier": None,
                            "suspended_at": now,
                            "suspension_reason": "subscription_expired"
                        }
                    }
                )
                suspended_count += 1
                
                # Send suspension notification email
                if email_service.is_configured:
                    try:
                        # Get reseller subdomain for correct resubscribe link
                        reseller_path = ""
                        if user.get("reseller_id"):
                            reseller = await db.resellers.find_one(
                                {"id": user["reseller_id"]},
                                {"_id": 0, "subdomain": 1}
                            )
                            if reseller and reseller.get("subdomain"):
                                reseller_path = f"/partner/{reseller['subdomain']}"
                        
                        frontend_url = os.environ.get('FRONTEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000')).rstrip('/')
                        pricing_link = f"{frontend_url}{reseller_path}/pricing"
                        
                        html_body = f'''
                        <html>
                        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #dc2626;">Subscription Expired</h1>
                            </div>
                            <p>Hi {user.get('full_name', 'there').split()[0]},</p>
                            <p>Your subscription has expired and your account access has been temporarily suspended.</p>
                            <p><strong>What this means:</strong></p>
                            <ul>
                                <li>You can still log in to view your account</li>
                                <li>Premium features (CV Builder, AI tools, etc.) are now disabled</li>
                                <li>Your saved documents remain safe</li>
                            </ul>
                            <p><strong>To reactivate your account:</strong></p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{pricing_link}" style="background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                    Resubscribe Now
                                </a>
                            </div>
                            <p>If you have any questions, please don't hesitate to contact our support team.</p>
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                            <p style="color: #888; font-size: 12px;">This email was sent by UpShift.</p>
                        </body>
                        </html>
                        '''
                        
                        email_sent = await email_service.send_email(
                            to_email=user["email"],
                            subject="Your Subscription Has Expired - Action Required",
                            html_body=html_body,
                            text_body=f"Hi {user.get('full_name', 'there')}, your subscription has expired. Visit {pricing_link} to resubscribe.",
                            raise_exceptions=False
                        )
                        
                        if email_sent:
                            email_sent_count += 1
                            
                    except Exception as email_error:
                        logger.warning(f"Failed to send suspension email to {user['email']}: {email_error}")
                
                logger.info(f"[AUTO] Suspended account: {user['email']} (subscription expired)")
                
            except Exception as user_error:
                logger.error(f"[AUTO] Failed to suspend user {user.get('email')}: {user_error}")
        
        if suspended_count > 0:
            logger.info(f"[AUTO] Suspended {suspended_count} expired subscriptions, {email_sent_count} emails sent")
        
    except Exception as e:
        logger.error(f"[AUTO] Error suspending expired subscriptions: {str(e)}")


async def auto_reset_demo_reseller():
    """
    Automatically reset the TalentHub demo reseller data at midnight SAST.
    This removes user-added data while keeping the base demo configuration.
    """
    try:
        from demo_reseller_service import create_demo_service
        
        logger.info("[AUTO] Starting nightly demo reseller reset (midnight SAST)")
        
        demo_service = create_demo_service(db)
        result = await demo_service.reset_demo_data()
        
        if result.get("success"):
            deleted = result.get("deleted", {})
            logger.info(f"[AUTO] Demo reset complete - Removed: {deleted.get('users', 0)} users, "
                       f"{deleted.get('payments', 0)} payments, {deleted.get('cvs', 0)} CVs")
        else:
            logger.error(f"[AUTO] Demo reset failed: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"[AUTO] Error resetting demo reseller: {str(e)}")


async def initialize_demo_account_on_startup():
    """Initialize the TalentHub demo account on server startup."""
    try:
        from demo_reseller_service import create_demo_service, DEMO_RESELLER_ID
        
        # Check if demo account exists
        existing = await db.resellers.find_one({"id": DEMO_RESELLER_ID})
        
        if not existing:
            logger.info("Initializing TalentHub demo account on startup...")
            demo_service = create_demo_service(db)
            result = await demo_service.initialize_demo_account()
            
            if result.get("success"):
                logger.info("TalentHub demo account initialized successfully")
            else:
                logger.error(f"Failed to initialize demo account: {result.get('error')}")
        else:
            logger.info("TalentHub demo account already exists")
            
    except Exception as e:
        logger.error(f"Error initializing demo account on startup: {str(e)}")


async def auto_send_reseller_trial_reminders():
    """Send email reminders to resellers 3 days before trial expiry."""
    try:
        from email_service import send_email
        
        logger.info("[AUTO] Checking for reseller trial expiry reminders...")
        now = datetime.now(timezone.utc)
        
        # Find resellers with trials expiring in 3 days
        three_days_later = now + timedelta(days=3)
        
        # Get all resellers in trial status
        trial_resellers = await db.resellers.find({
            "status": "trial",
            "is_demo_account": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        reminder_count = 0
        
        for reseller in trial_resellers:
            try:
                subscription = reseller.get("subscription", {})
                trial_end = subscription.get("trial_end_date")
                
                if not trial_end:
                    continue
                
                # Parse trial end date
                if isinstance(trial_end, str):
                    trial_end_dt = datetime.fromisoformat(trial_end.replace('Z', '+00:00'))
                else:
                    trial_end_dt = trial_end
                
                # Check if trial ends in approximately 3 days (between 2.5 and 3.5 days)
                days_until_expiry = (trial_end_dt - now).total_seconds() / 86400
                
                if 2.5 <= days_until_expiry <= 3.5:
                    # Check if we already sent this reminder
                    reminder_key = f"trial_reminder_3day_{reseller['id']}"
                    existing_reminder = await db.notifications.find_one({"key": reminder_key})
                    
                    if existing_reminder:
                        continue
                    
                    # Get owner user
                    owner = await db.users.find_one({"id": reseller.get("owner_user_id")}, {"_id": 0})
                    if not owner:
                        continue
                    
                    # Send reminder email
                    upgrade_url = f"{os.environ.get('REACT_APP_BACKEND_URL', '')}/reseller-dashboard/subscription"
                    
                    email_html = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Trial Ending Soon</h1>
                        </div>
                        <div style="padding: 30px; background: #f9fafb;">
                            <p>Hi {owner.get('full_name', 'there')},</p>
                            
                            <p>Your <strong>{reseller.get('brand_name', reseller.get('company_name'))}</strong> reseller trial ends in <strong>3 days</strong>.</p>
                            
                            <p>To continue using your white-label platform without interruption:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{upgrade_url}" style="background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                    Upgrade Now
                                </a>
                            </div>
                            
                            <p>After your trial ends:</p>
                            <ul>
                                <li>Your partner portal will be temporarily disabled</li>
                                <li>Your customers won't be able to access the platform</li>
                                <li>All your data will be preserved</li>
                            </ul>
                            
                            <p>Questions? Reply to this email or contact our support team.</p>
                            
                            <p>Best regards,<br>The UpShift Team</p>
                        </div>
                    </div>
                    """
                    
                    await send_email(
                        to_email=owner['email'],
                        subject=f"Your {reseller.get('brand_name', 'reseller')} trial ends in 3 days",
                        html_body=email_html,
                        text_body=f"Hi {owner.get('full_name', 'there')}, your reseller trial ends in 3 days. Visit {upgrade_url} to upgrade and continue using your white-label platform."
                    )
                    
                    # Record that we sent this reminder
                    await db.notifications.insert_one({
                        "key": reminder_key,
                        "reseller_id": reseller['id'],
                        "type": "trial_reminder",
                        "sent_at": now,
                        "days_before_expiry": 3
                    })
                    
                    reminder_count += 1
                    logger.info(f"[AUTO] Sent trial reminder to reseller: {reseller.get('company_name')}")
                    
            except Exception as e:
                logger.error(f"[AUTO] Error processing reseller {reseller.get('id')}: {str(e)}")
        
        if reminder_count > 0:
            logger.info(f"[AUTO] Sent {reminder_count} reseller trial reminders")
            
    except Exception as e:
        logger.error(f"[AUTO] Error sending reseller trial reminders: {str(e)}")


async def auto_suspend_expired_reseller_trials():
    """Suspend reseller accounts with expired trials."""
    try:
        from email_service import send_email
        
        logger.info("[AUTO] Checking for expired reseller trials...")
        now = datetime.now(timezone.utc)
        
        # Get all resellers in trial status
        trial_resellers = await db.resellers.find({
            "status": "trial",
            "is_demo_account": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        suspended_count = 0
        
        for reseller in trial_resellers:
            try:
                subscription = reseller.get("subscription", {})
                trial_end = subscription.get("trial_end_date")
                
                if not trial_end:
                    continue
                
                # Parse trial end date
                if isinstance(trial_end, str):
                    trial_end_dt = datetime.fromisoformat(trial_end.replace('Z', '+00:00'))
                else:
                    trial_end_dt = trial_end
                
                # Check if trial has expired
                if trial_end_dt < now:
                    # Suspend the reseller
                    await db.resellers.update_one(
                        {"id": reseller['id']},
                        {
                            "$set": {
                                "status": "suspended",
                                "subscription.status": "trial_expired",
                                "subscription.suspended_at": now.isoformat(),
                                "subscription.suspension_reason": "trial_expired",
                                "updated_at": now
                            }
                        }
                    )
                    
                    # Get owner user
                    owner = await db.users.find_one({"id": reseller.get("owner_user_id")}, {"_id": 0})
                    
                    if owner:
                        # Send suspension notification email
                        upgrade_url = f"{os.environ.get('REACT_APP_BACKEND_URL', '')}/reseller-dashboard/subscription"
                        
                        email_html = f"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: #dc2626; padding: 30px; text-align: center;">
                                <h1 style="color: white; margin: 0;">Trial Period Ended</h1>
                            </div>
                            <div style="padding: 30px; background: #f9fafb;">
                                <p>Hi {owner.get('full_name', 'there')},</p>
                                
                                <p>Your free trial for <strong>{reseller.get('brand_name', reseller.get('company_name'))}</strong> has ended.</p>
                                
                                <p>Your reseller account has been temporarily suspended. This means:</p>
                                <ul>
                                    <li>Your partner portal is currently offline</li>
                                    <li>Your customers cannot access the platform</li>
                                    <li>All your data is safely preserved</li>
                                </ul>
                                
                                <p>To reactivate your account immediately:</p>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="{upgrade_url}" style="background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                        Subscribe Now
                                    </a>
                                </div>
                                
                                <p>Choose from our plans:</p>
                                <ul>
                                    <li><strong>Starter</strong> - R2,499/month (1,000 CVs)</li>
                                    <li><strong>Professional</strong> - R4,999/month (3,500 CVs)</li>
                                    <li><strong>Enterprise</strong> - Custom pricing (Unlimited)</li>
                                </ul>
                                
                                <p>Questions? Reply to this email or contact our support team.</p>
                                
                                <p>Best regards,<br>The UpShift Team</p>
                            </div>
                        </div>
                        """
                        
                        await send_email(
                            to_email=owner['email'],
                            subject=f"Your {reseller.get('brand_name', 'reseller')} trial has ended - Account suspended",
                            html_body=email_html,
                            text_body=f"Hi {owner.get('full_name', 'there')}, your reseller trial has ended and your account has been suspended. Visit {upgrade_url} to subscribe and reactivate your platform."
                        )
                    
                    suspended_count += 1
                    logger.info(f"[AUTO] Suspended reseller due to expired trial: {reseller.get('company_name')}")
                    
            except Exception as e:
                logger.error(f"[AUTO] Error suspending reseller {reseller.get('id')}: {str(e)}")
        
        if suspended_count > 0:
            logger.info(f"[AUTO] Suspended {suspended_count} resellers with expired trials")
            
    except Exception as e:
        logger.error(f"[AUTO] Error suspending expired reseller trials: {str(e)}")
