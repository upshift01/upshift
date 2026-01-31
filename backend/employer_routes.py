"""
Employer Routes - API endpoints for Employer subscription and dashboard
Handles employer plans, subscriptions, and job posting limits
Supports both Stripe (USD/International) and Yoco (ZAR/South Africa)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import logging
import os

logger = logging.getLogger(__name__)

employer_router = APIRouter(prefix="/api/employer", tags=["Employer"])

# Employer subscription plans - with both ZAR and USD pricing
EMPLOYER_PLANS = {
    "employer-starter": {
        "id": "employer-starter",
        "name": "Starter",
        "price_zar": 299,
        "price_usd": 16,  # Approximately R299 / 18
        "duration_days": 30,
        "jobs_limit": 10,
        "features": [
            "Post up to 10 jobs",
            "View all proposals",
            "Basic analytics",
            "Email support"
        ]
    },
    "employer-professional": {
        "id": "employer-professional",
        "name": "Professional",
        "price_zar": 599,
        "price_usd": 33,  # Approximately R599 / 18
        "duration_days": 30,
        "jobs_limit": 50,
        "popular": True,
        "features": [
            "Post up to 50 jobs",
            "View all proposals",
            "Advanced analytics",
            "Priority support",
            "Featured job listings"
        ]
    },
    "employer-enterprise": {
        "id": "employer-enterprise",
        "name": "Enterprise",
        "price_zar": 1999,
        "price_usd": 111,  # Approximately R1999 / 18
        "duration_days": 30,
        "jobs_limit": -1,  # Unlimited
        "features": [
            "Unlimited job postings",
            "View all proposals",
            "Full analytics dashboard",
            "Dedicated support",
            "Featured job listings",
            "Company branding"
        ]
    }
}


def get_employer_routes(db, get_current_user, yoco_client=None):
    """Factory function to create employer routes with dependencies"""
    
    @employer_router.get("/plans")
    async def get_employer_plans(currency: str = "ZAR"):
        """Get available employer subscription plans with pricing in specified currency"""
        plans = []
        for plan_id, plan in EMPLOYER_PLANS.items():
            plan_data = {
                "id": plan["id"],
                "name": plan["name"],
                "duration_days": plan["duration_days"],
                "jobs_limit": plan["jobs_limit"],
                "features": plan["features"],
                "popular": plan.get("popular", False),
                # Include both prices for frontend flexibility
                "price_zar": plan["price_zar"],
                "price_usd": plan["price_usd"],
                # Set primary price based on requested currency
                "price": plan["price_zar"] if currency == "ZAR" else plan["price_usd"],
                "currency": currency
            }
            plans.append(plan_data)
        
        return {
            "success": True,
            "plans": plans,
            "payment_methods": {
                "ZAR": {"provider": "yoco", "name": "Yoco", "description": "South African Rand payments"},
                "USD": {"provider": "stripe", "name": "Stripe", "description": "International USD payments"}
            }
        }
    
    @employer_router.get("/subscription")
    async def get_employer_subscription(current_user = Depends(get_current_user)):
        """Get current employer's subscription status"""
        if current_user.role != "employer":
            raise HTTPException(status_code=403, detail="Employer access required")
        
        user = await db.users.find_one({"id": current_user.id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        subscription = user.get("employer_subscription", {})
        
        # Check if trial/subscription has expired
        if subscription:
            expires_at = subscription.get("expires_at")
            if expires_at:
                try:
                    exp_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                    if exp_date < datetime.now(timezone.utc):
                        subscription["status"] = "expired"
                except ValueError:
                    pass
        
        # Get jobs posted count
        jobs_posted = await db.remote_jobs.count_documents({"employer_id": current_user.id})
        
        return {
            "success": True,
            "subscription": subscription,
            "jobs_posted": jobs_posted,
            "can_post_jobs": can_employer_post_jobs(subscription, jobs_posted)
        }
    
    @employer_router.get("/dashboard-stats")
    async def get_employer_dashboard_stats(current_user = Depends(get_current_user)):
        """Get employer dashboard statistics"""
        if current_user.role != "employer":
            raise HTTPException(status_code=403, detail="Employer access required")
        
        # Get job counts
        total_jobs = await db.remote_jobs.count_documents({"employer_id": current_user.id})
        active_jobs = await db.remote_jobs.count_documents({
            "employer_id": current_user.id,
            "status": "active"
        })
        
        # Get proposal counts
        job_ids = await db.remote_jobs.distinct("id", {"employer_id": current_user.id})
        total_proposals = await db.proposals.count_documents({"job_id": {"$in": job_ids}})
        pending_proposals = await db.proposals.count_documents({
            "job_id": {"$in": job_ids},
            "status": "pending"
        })
        
        # Get contract counts
        total_contracts = await db.contracts.count_documents({"employer_id": current_user.id})
        active_contracts = await db.contracts.count_documents({
            "employer_id": current_user.id,
            "status": "active"
        })
        
        return {
            "success": True,
            "stats": {
                "total_jobs": total_jobs,
                "active_jobs": active_jobs,
                "total_proposals": total_proposals,
                "pending_proposals": pending_proposals,
                "total_contracts": total_contracts,
                "active_contracts": active_contracts
            }
        }
    
    @employer_router.post("/subscribe/{plan_id}")
    async def subscribe_employer(
        plan_id: str, 
        data: dict = None,
        current_user = Depends(get_current_user)
    ):
        """Subscribe to an employer plan using Stripe (USD) or Yoco (ZAR)"""
        if current_user.role != "employer":
            raise HTTPException(status_code=403, detail="Employer access required")
        
        if plan_id not in EMPLOYER_PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan ID")
        
        plan = EMPLOYER_PLANS[plan_id]
        
        # Get payment provider preference (default to Yoco/ZAR for South African market)
        provider = (data or {}).get("provider", "yoco")
        currency = "USD" if provider == "stripe" else "ZAR"
        amount = plan["price_usd"] if provider == "stripe" else plan["price_zar"]
        
        frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
        success_url = f"{frontend_url}/employer?subscription=success&provider={provider}"
        cancel_url = f"{frontend_url}/employer?subscription=cancelled"
        
        try:
            if provider == "stripe":
                # Use Stripe for USD payments
                stripe_key = os.environ.get("STRIPE_API_KEY")
                if not stripe_key or stripe_key == "sk_test_emergent":
                    raise HTTPException(status_code=500, detail="Valid Stripe API key not configured. Please add your Stripe secret key in the Payment Settings.")
                
                import stripe
                stripe.api_key = stripe_key
                
                # Create Stripe checkout session
                checkout_session = stripe.checkout.Session.create(
                    payment_method_types=["card"],
                    line_items=[{
                        "price_data": {
                            "currency": "usd",
                            "unit_amount": amount * 100,  # Stripe uses cents
                            "product_data": {
                                "name": f"Employer {plan['name']} Plan",
                                "description": f"{plan['jobs_limit'] if plan['jobs_limit'] != -1 else 'Unlimited'} job postings per month"
                            }
                        },
                        "quantity": 1
                    }],
                    mode="payment",
                    success_url=success_url + "&session_id={CHECKOUT_SESSION_ID}",
                    cancel_url=cancel_url,
                    metadata={
                        "user_id": current_user.id,
                        "plan_id": plan_id,
                        "type": "employer_subscription"
                    }
                )
                
                checkout_id = checkout_session.id
                checkout_url = checkout_session.url
                
            else:
                # Use Yoco for ZAR payments
                from yoco_service import YocoService
                
                yoco_secret = os.environ.get("YOCO_SECRET_KEY")
                yoco_public = os.environ.get("YOCO_PUBLIC_KEY")
                
                if not yoco_secret:
                    raise HTTPException(status_code=500, detail="Yoco payment gateway not configured")
                
                yoco = YocoService(secret_key=yoco_secret, public_key=yoco_public)
                
                if not yoco.is_configured():
                    raise HTTPException(status_code=500, detail="Yoco payment gateway not fully configured")
                
                checkout = await yoco.create_checkout(
                    amount_cents=amount * 100,
                    email=current_user.email,
                    metadata={
                        "user_id": current_user.id,
                        "plan_id": plan_id,
                        "type": "employer_subscription"
                    },
                    success_url=success_url,
                    cancel_url=cancel_url
                )
                
                checkout_id = checkout.get("id")
                checkout_url = checkout.get("redirectUrl")
            
            # Store pending subscription
            subscription_id = str(uuid.uuid4())
            await db.employer_subscriptions.insert_one({
                "id": subscription_id,
                "user_id": current_user.id,
                "plan_id": plan_id,
                "plan_name": plan["name"],
                "amount": amount,
                "currency": currency,
                "provider": provider,
                "checkout_id": checkout_id,
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Employer subscription checkout created: {current_user.email} - {plan['name']} via {provider}")
            
            return {
                "success": True,
                "checkout_url": checkout_url,
                "checkout_id": checkout_id,
                "subscription_id": subscription_id,
                "provider": provider
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating employer subscription checkout: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_router.post("/verify-payment")
    async def verify_employer_payment(
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """Verify employer subscription payment for both Stripe and Yoco"""
        if current_user.role != "employer":
            raise HTTPException(status_code=403, detail="Employer access required")
        
        checkout_id = data.get("checkout_id") or data.get("session_id")
        provider = data.get("provider", "yoco")
        
        if not checkout_id:
            raise HTTPException(status_code=400, detail="Checkout/Session ID required")
        
        try:
            # Find pending subscription
            pending = await db.employer_subscriptions.find_one({
                "user_id": current_user.id,
                "checkout_id": checkout_id,
                "status": "pending"
            })
            
            if not pending:
                raise HTTPException(status_code=404, detail="Subscription not found")
            
            is_paid = False
            provider = pending.get("provider", "yoco")
            
            if provider == "stripe":
                # Verify with Stripe
                stripe_key = os.environ.get("STRIPE_API_KEY")
                if stripe_key:
                    import stripe
                    stripe.api_key = stripe_key
                    session = stripe.checkout.Session.retrieve(checkout_id)
                    is_paid = session.payment_status == "paid"
            else:
                # Verify with Yoco
                yoco_secret = os.environ.get("YOCO_SECRET_KEY")
                if yoco_secret:
                    from emergentintegrations.payments.yoco import YocoClient
                    yoco = YocoClient(secret_key=yoco_secret)
                    is_paid = await yoco.verify_payment(checkout_id)
            
            if is_paid:
                plan = EMPLOYER_PLANS.get(pending["plan_id"])
                expires_at = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])
                
                # Update user subscription
                await db.users.update_one(
                    {"id": current_user.id},
                    {"$set": {
                        "employer_subscription": {
                            "status": "active",
                            "plan_id": pending["plan_id"],
                            "plan_name": pending["plan_name"],
                            "jobs_limit": plan["jobs_limit"],
                            "jobs_posted": 0,
                            "activated_at": datetime.now(timezone.utc).isoformat(),
                            "expires_at": expires_at.isoformat(),
                            "provider": provider,
                            "currency": pending.get("currency", "ZAR")
                        }
                    }}
                )
                
                # Update subscription record
                await db.employer_subscriptions.update_one(
                    {"id": pending["id"]},
                    {"$set": {
                        "status": "active",
                        "activated_at": datetime.now(timezone.utc).isoformat(),
                        "expires_at": expires_at.isoformat()
                    }}
                )
                
                logger.info(f"Employer subscription activated for {current_user.email} via {provider}")
                
                return {
                    "success": True,
                    "message": "Subscription activated",
                    "plan": pending["plan_name"],
                    "provider": provider
                }
            else:
                return {
                    "success": False,
                    "message": "Payment not verified yet"
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying employer payment: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_router.get("/can-post-job")
    async def check_can_post_job(current_user = Depends(get_current_user)):
        """Check if employer can post a new job"""
        if current_user.role != "employer":
            raise HTTPException(status_code=403, detail="Employer access required")
        
        user = await db.users.find_one({"id": current_user.id})
        subscription = user.get("employer_subscription", {})
        jobs_posted = await db.remote_jobs.count_documents({"employer_id": current_user.id})
        
        can_post = can_employer_post_jobs(subscription, jobs_posted)
        
        return {
            "success": True,
            "can_post": can_post,
            "jobs_posted": jobs_posted,
            "jobs_limit": subscription.get("jobs_limit", 0),
            "subscription_status": subscription.get("status", "none"),
            "message": get_posting_limit_message(subscription, jobs_posted)
        }
    
    return employer_router


def can_employer_post_jobs(subscription: dict, jobs_posted: int) -> bool:
    """Check if employer can post more jobs based on subscription"""
    if not subscription:
        return False
    
    status = subscription.get("status")
    if status not in ["active", "trial"]:
        return False
    
    # Check expiry
    expires_at_str = subscription.get("expires_at")
    if expires_at_str:
        try:
            exp_date = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
            if exp_date < datetime.now(timezone.utc):
                return False
        except ValueError:
            pass
    
    # Check job limit
    jobs_limit = subscription.get("jobs_limit", 0)
    if jobs_limit == -1:  # Unlimited
        return True
    
    return jobs_posted < jobs_limit


def get_posting_limit_message(subscription: dict, jobs_posted: int) -> str:
    """Get a user-friendly message about posting limits"""
    if not subscription:
        return "Subscribe to start posting jobs"
    
    status = subscription.get("status")
    if status == "expired":
        return "Your subscription has expired. Please renew to post jobs."
    
    if status == "trial":
        expires_at = subscription.get("expires_at", "")
        return f"Trial active. You can post up to {subscription.get('jobs_limit', 3)} jobs."
    
    if status != "active":
        return "Subscribe to start posting jobs"
    
    jobs_limit = subscription.get("jobs_limit", 0)
    if jobs_limit == -1:
        return "Unlimited job postings available"
    
    remaining = jobs_limit - jobs_posted
    if remaining <= 0:
        return f"You've reached your limit of {jobs_limit} jobs. Upgrade your plan for more."
    
    return f"You can post {remaining} more jobs ({jobs_posted}/{jobs_limit} used)"
