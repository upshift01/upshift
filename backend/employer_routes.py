"""
Employer Routes - API endpoints for Employer subscription and dashboard
Handles employer plans, subscriptions, and job posting limits
Supports both Stripe (USD/International) and Yoco (ZAR/South Africa)
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import logging
import os
import shutil

logger = logging.getLogger(__name__)

COMPANY_LOGO_PATH = "/app/public/uploads/company_logos"

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
        
        # Get frontend URL for redirects
        frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
        if not frontend_url:
            # Fallback to REACT_APP_BACKEND_URL with /api removed
            frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
        
        if not frontend_url or not frontend_url.startswith("http"):
            raise HTTPException(status_code=500, detail="Frontend URL not configured")
        
        success_url = f"{frontend_url}/employer?subscription=success&provider={provider}"
        cancel_url = f"{frontend_url}/employer?subscription=cancelled"
        
        try:
            if provider == "stripe":
                # Use Stripe for USD payments - check database settings first, then env
                stripe_key = None
                
                # Check admin settings in database
                admin_settings = await db.admin_settings.find_one({"type": "payment_settings"})
                if admin_settings and admin_settings.get("stripe_api_key"):
                    stripe_key = admin_settings.get("stripe_api_key")
                
                # Fallback to environment variable
                if not stripe_key:
                    stripe_key = os.environ.get("STRIPE_API_KEY")
                
                # Check if we have a valid key (not the placeholder)
                if not stripe_key or stripe_key == "sk_test_emergent" or not stripe_key.startswith("sk_"):
                    raise HTTPException(
                        status_code=500, 
                        detail="Stripe is not configured. Please add a valid Stripe API key in the Admin Payment Settings, or choose Yoco for payment."
                    )
                
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
                from yoco_service import get_yoco_service_for_reseller
                
                # Get Yoco service (may use reseller-specific keys or platform defaults)
                yoco = await get_yoco_service_for_reseller(db, current_user.reseller_id if hasattr(current_user, 'reseller_id') else None)
                
                if not yoco.is_configured():
                    raise HTTPException(status_code=500, detail="Yoco payment gateway not configured. Please contact support.")
                
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
                if stripe_key and stripe_key != "sk_test_emergent":
                    import stripe
                    stripe.api_key = stripe_key
                    session = stripe.checkout.Session.retrieve(checkout_id)
                    is_paid = session.payment_status == "paid"
            else:
                # Verify with Yoco
                from yoco_service import get_yoco_service_for_reseller
                
                yoco = await get_yoco_service_for_reseller(db, None)
                if yoco.is_configured():
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
    
    # ==================== JOB ANALYTICS ====================
    
    @employer_router.get("/analytics")
    async def get_job_analytics(current_user = Depends(get_current_user)):
        """Get comprehensive job analytics for employer dashboard"""
        if current_user.role != "employer":
            raise HTTPException(status_code=403, detail="Employer access required")
        
        try:
            # Get all jobs for this employer
            jobs = await db.remote_jobs.find(
                {"employer_id": current_user.id},
                {"_id": 0}
            ).to_list(length=1000)
            
            job_ids = [j["id"] for j in jobs]
            
            # Get all proposals for these jobs
            proposals = await db.proposals.find(
                {"job_id": {"$in": job_ids}},
                {"_id": 0, "job_id": 1, "status": 1, "created_at": 1}
            ).to_list(length=10000)
            
            # Get all contracts for this employer
            contracts = await db.contracts.find(
                {"employer_id": current_user.id},
                {"_id": 0, "job_id": 1, "status": 1, "payment_amount": 1, "total_paid": 1}
            ).to_list(length=1000)
            
            # Build per-job analytics
            job_analytics = []
            for job in jobs:
                job_id = job["id"]
                job_proposals = [p for p in proposals if p.get("job_id") == job_id]
                job_contracts = [c for c in contracts if c.get("job_id") == job_id]
                
                # Calculate proposal stats
                total_proposals = len(job_proposals)
                pending_proposals = sum(1 for p in job_proposals if p.get("status") == "pending")
                shortlisted_proposals = sum(1 for p in job_proposals if p.get("status") == "shortlisted")
                accepted_proposals = sum(1 for p in job_proposals if p.get("status") == "accepted")
                
                # Calculate contract stats
                total_contracts = len(job_contracts)
                active_contracts = sum(1 for c in job_contracts if c.get("status") == "active")
                completed_contracts = sum(1 for c in job_contracts if c.get("status") == "completed")
                total_contract_value = sum(c.get("payment_amount", 0) for c in job_contracts)
                total_paid = sum(c.get("total_paid", 0) for c in job_contracts)
                
                # Calculate engagement rate (proposals / views, approximate with applications_count)
                views = job.get("views", job.get("applications_count", 0) * 10)  # Rough estimate
                engagement_rate = (total_proposals / max(views, 1)) * 100 if views > 0 else 0
                
                job_analytics.append({
                    "job_id": job_id,
                    "title": job.get("title"),
                    "status": job.get("status"),
                    "created_at": job.get("created_at"),
                    "proposals": {
                        "total": total_proposals,
                        "pending": pending_proposals,
                        "shortlisted": shortlisted_proposals,
                        "accepted": accepted_proposals
                    },
                    "contracts": {
                        "total": total_contracts,
                        "active": active_contracts,
                        "completed": completed_contracts,
                        "total_value": total_contract_value,
                        "total_paid": total_paid
                    },
                    "metrics": {
                        "views": views,
                        "engagement_rate": round(engagement_rate, 2),
                        "conversion_rate": round((accepted_proposals / max(total_proposals, 1)) * 100, 2)
                    }
                })
            
            # Calculate overall stats
            overall_stats = {
                "total_jobs": len(jobs),
                "active_jobs": sum(1 for j in jobs if j.get("status") == "active"),
                "paused_jobs": sum(1 for j in jobs if j.get("status") == "paused"),
                "total_proposals": len(proposals),
                "pending_proposals": sum(1 for p in proposals if p.get("status") == "pending"),
                "total_contracts": len(contracts),
                "active_contracts": sum(1 for c in contracts if c.get("status") == "active"),
                "total_contract_value": sum(c.get("payment_amount", 0) for c in contracts),
                "total_paid": sum(c.get("total_paid", 0) for c in contracts),
                "avg_proposals_per_job": round(len(proposals) / max(len(jobs), 1), 1),
                "overall_conversion_rate": round(
                    (sum(1 for p in proposals if p.get("status") == "accepted") / max(len(proposals), 1)) * 100, 2
                )
            }
            
            # Get proposal trends (last 30 days)
            from datetime import timedelta
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            recent_proposals = [p for p in proposals if p.get("created_at", "") >= thirty_days_ago]
            
            # Group by day
            proposal_trends = {}
            for p in recent_proposals:
                created = p.get("created_at", "")[:10]  # Get date part only
                proposal_trends[created] = proposal_trends.get(created, 0) + 1
            
            # Sort by date
            sorted_trends = [{"date": k, "count": v} for k, v in sorted(proposal_trends.items())]
            
            return {
                "success": True,
                "overall": overall_stats,
                "jobs": job_analytics,
                "trends": {
                    "proposals_last_30_days": sorted_trends,
                    "total_proposals_last_30_days": len(recent_proposals)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting job analytics: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @employer_router.get("/analytics/{job_id}")
    async def get_single_job_analytics(
        job_id: str,
        current_user = Depends(get_current_user)
    ):
        """Get detailed analytics for a specific job"""
        if current_user.role != "employer":
            raise HTTPException(status_code=403, detail="Employer access required")
        
        try:
            # Get the job
            job = await db.remote_jobs.find_one(
                {"id": job_id, "employer_id": current_user.id},
                {"_id": 0}
            )
            
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")
            
            # Get proposals for this job
            proposals = await db.proposals.find(
                {"job_id": job_id},
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=1000)
            
            # Get contracts for this job
            contracts = await db.contracts.find(
                {"job_id": job_id, "employer_id": current_user.id},
                {"_id": 0}
            ).to_list(length=100)
            
            # Proposal breakdown
            proposal_stats = {
                "total": len(proposals),
                "by_status": {
                    "pending": sum(1 for p in proposals if p.get("status") == "pending"),
                    "shortlisted": sum(1 for p in proposals if p.get("status") == "shortlisted"),
                    "accepted": sum(1 for p in proposals if p.get("status") == "accepted"),
                    "rejected": sum(1 for p in proposals if p.get("status") == "rejected"),
                    "withdrawn": sum(1 for p in proposals if p.get("status") == "withdrawn")
                },
                "by_availability": {},
                "avg_proposed_rate": 0
            }
            
            # Calculate availability distribution and average rate
            rates = []
            for p in proposals:
                avail = p.get("availability", "unknown")
                proposal_stats["by_availability"][avail] = proposal_stats["by_availability"].get(avail, 0) + 1
                if p.get("proposed_rate"):
                    rates.append(p["proposed_rate"])
            
            if rates:
                proposal_stats["avg_proposed_rate"] = round(sum(rates) / len(rates), 2)
            
            # Contract stats
            contract_stats = {
                "total": len(contracts),
                "active": sum(1 for c in contracts if c.get("status") == "active"),
                "completed": sum(1 for c in contracts if c.get("status") == "completed"),
                "total_value": sum(c.get("payment_amount", 0) for c in contracts),
                "total_paid": sum(c.get("total_paid", 0) for c in contracts)
            }
            
            # Proposal timeline
            from datetime import timedelta
            proposal_timeline = []
            for p in proposals[:20]:  # Last 20 proposals
                proposal_timeline.append({
                    "id": p.get("id"),
                    "applicant_name": p.get("applicant_name"),
                    "status": p.get("status"),
                    "proposed_rate": p.get("proposed_rate"),
                    "rate_type": p.get("rate_type"),
                    "availability": p.get("availability"),
                    "created_at": p.get("created_at")
                })
            
            return {
                "success": True,
                "job": {
                    "id": job["id"],
                    "title": job.get("title"),
                    "status": job.get("status"),
                    "created_at": job.get("created_at"),
                    "views": job.get("views", job.get("applications_count", 0) * 10)
                },
                "proposals": proposal_stats,
                "contracts": contract_stats,
                "recent_proposals": proposal_timeline
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting job analytics: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
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
