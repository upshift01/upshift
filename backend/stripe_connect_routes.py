"""
Stripe Connect Routes - API endpoints for contractor payouts via Stripe Connect
Handles contractor onboarding, account management, and direct payouts
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging
import os
import stripe

logger = logging.getLogger(__name__)

stripe_connect_router = APIRouter(prefix="/api/stripe-connect", tags=["Stripe Connect"])


class OnboardingRequest(BaseModel):
    return_url: str
    refresh_url: str


class PayoutRequest(BaseModel):
    contract_id: str
    milestone_id: str
    amount: float
    currency: str = "USD"


def get_stripe_connect_routes(db, get_current_user):
    """Factory function to create Stripe Connect routes with dependencies"""
    
    async def get_stripe_key():
        """Get Stripe API key from database or env"""
        admin_settings = await db.admin_settings.find_one({"type": "payment_settings"})
        if admin_settings and admin_settings.get("stripe_secret_key"):
            return admin_settings.get("stripe_secret_key")
        return os.environ.get("STRIPE_API_KEY")
    
    async def validate_stripe_key(api_key: str):
        """Validate that Stripe key is valid for Connect"""
        if not api_key or api_key == "sk_test_emergent" or not api_key.startswith("sk_"):
            raise HTTPException(
                status_code=500,
                detail="Stripe Connect is not configured. Please add a valid Stripe API key in Admin Settings."
            )
        return api_key
    
    @stripe_connect_router.get("/status")
    async def get_connect_status(current_user = Depends(get_current_user)):
        """Get contractor's Stripe Connect account status"""
        try:
            user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            stripe_connect = user.get("stripe_connect", {})
            
            if not stripe_connect.get("account_id"):
                return {
                    "success": True,
                    "connected": False,
                    "status": "not_connected",
                    "message": "You need to connect your Stripe account to receive payouts."
                }
            
            # Get latest status from Stripe
            api_key = await get_stripe_key()
            api_key = await validate_stripe_key(api_key)
            stripe.api_key = api_key
            
            try:
                account = stripe.Account.retrieve(stripe_connect.get("account_id"))
                
                # Update local status
                charges_enabled = account.charges_enabled
                payouts_enabled = account.payouts_enabled
                details_submitted = account.details_submitted
                
                await db.users.update_one(
                    {"id": current_user.id},
                    {"$set": {
                        "stripe_connect.charges_enabled": charges_enabled,
                        "stripe_connect.payouts_enabled": payouts_enabled,
                        "stripe_connect.details_submitted": details_submitted,
                        "stripe_connect.updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                if not details_submitted:
                    status = "incomplete"
                    message = "Please complete your Stripe account setup to receive payouts."
                elif not payouts_enabled:
                    status = "pending_verification"
                    message = "Your account is pending verification. This usually takes 1-2 business days."
                else:
                    status = "active"
                    message = "Your Stripe account is active and ready to receive payouts."
                
                return {
                    "success": True,
                    "connected": True,
                    "account_id": stripe_connect.get("account_id"),
                    "status": status,
                    "charges_enabled": charges_enabled,
                    "payouts_enabled": payouts_enabled,
                    "details_submitted": details_submitted,
                    "message": message
                }
                
            except stripe.error.StripeError as e:
                logger.error(f"Stripe error checking account: {e}")
                return {
                    "success": True,
                    "connected": True,
                    "account_id": stripe_connect.get("account_id"),
                    "status": "error",
                    "message": "Unable to verify account status. Please try again."
                }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting connect status: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @stripe_connect_router.post("/onboard")
    async def create_onboarding_link(
        data: OnboardingRequest,
        current_user = Depends(get_current_user)
    ):
        """Create Stripe Connect account and onboarding link for contractor"""
        try:
            api_key = await get_stripe_key()
            api_key = await validate_stripe_key(api_key)
            stripe.api_key = api_key
            
            user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            stripe_connect = user.get("stripe_connect", {})
            
            # Create account if not exists
            if not stripe_connect.get("account_id"):
                # Create Express account for simpler onboarding
                account = stripe.Account.create(
                    type="express",
                    country="US",  # Default, will be updated during onboarding
                    email=current_user.email,
                    capabilities={
                        "transfers": {"requested": True}
                    },
                    metadata={
                        "user_id": current_user.id,
                        "platform": "upshift"
                    }
                )
                
                # Save account ID
                await db.users.update_one(
                    {"id": current_user.id},
                    {"$set": {
                        "stripe_connect": {
                            "account_id": account.id,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "charges_enabled": False,
                            "payouts_enabled": False,
                            "details_submitted": False
                        }
                    }}
                )
                
                account_id = account.id
                logger.info(f"Created Stripe Connect account {account_id} for user {current_user.email}")
            else:
                account_id = stripe_connect.get("account_id")
            
            # Create onboarding link
            account_link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=data.refresh_url,
                return_url=data.return_url,
                type="account_onboarding"
            )
            
            return {
                "success": True,
                "url": account_link.url,
                "account_id": account_id
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error during onboarding: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating onboarding link: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @stripe_connect_router.post("/dashboard-link")
    async def create_dashboard_link(current_user = Depends(get_current_user)):
        """Create a link to the Stripe Express dashboard for the contractor"""
        try:
            api_key = await get_stripe_key()
            api_key = await validate_stripe_key(api_key)
            stripe.api_key = api_key
            
            user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            stripe_connect = user.get("stripe_connect", {})
            if not stripe_connect.get("account_id"):
                raise HTTPException(status_code=400, detail="No Stripe Connect account found")
            
            login_link = stripe.Account.create_login_link(
                stripe_connect.get("account_id")
            )
            
            return {
                "success": True,
                "url": login_link.url
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating dashboard link: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating dashboard link: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @stripe_connect_router.post("/payout")
    async def create_payout(
        data: PayoutRequest,
        current_user = Depends(get_current_user)
    ):
        """Create a payout to contractor (employer releases milestone payment)"""
        try:
            api_key = await get_stripe_key()
            api_key = await validate_stripe_key(api_key)
            stripe.api_key = api_key
            
            # Get contract
            contract = await db.contracts.find_one({"id": data.contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Verify employer is releasing
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can release payments")
            
            # Get contractor's Stripe Connect account
            contractor = await db.users.find_one(
                {"id": contract.get("contractor_id")},
                {"_id": 0}
            )
            if not contractor:
                raise HTTPException(status_code=404, detail="Contractor not found")
            
            stripe_connect = contractor.get("stripe_connect", {})
            if not stripe_connect.get("account_id"):
                raise HTTPException(
                    status_code=400,
                    detail="Contractor has not connected their Stripe account for payouts"
                )
            
            if not stripe_connect.get("payouts_enabled"):
                raise HTTPException(
                    status_code=400,
                    detail="Contractor's Stripe account is not yet enabled for payouts"
                )
            
            # Find milestone
            milestones = contract.get("milestones", [])
            milestone = next((m for m in milestones if m.get("id") == data.milestone_id), None)
            if not milestone:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestone.get("status") != "approved":
                raise HTTPException(status_code=400, detail="Milestone must be approved before payout")
            
            if milestone.get("escrow_status") != "funded":
                raise HTTPException(status_code=400, detail="Milestone is not funded")
            
            # Calculate platform fee (e.g., 5%)
            platform_fee_percent = 5
            amount_cents = int(data.amount * 100)
            platform_fee = int(amount_cents * platform_fee_percent / 100)
            contractor_amount = amount_cents - platform_fee
            
            # Create transfer to connected account
            try:
                transfer = stripe.Transfer.create(
                    amount=contractor_amount,
                    currency=data.currency.lower(),
                    destination=stripe_connect.get("account_id"),
                    metadata={
                        "contract_id": data.contract_id,
                        "milestone_id": data.milestone_id,
                        "employer_id": current_user.id,
                        "contractor_id": contract.get("contractor_id"),
                        "platform_fee": platform_fee
                    }
                )
                
                # Update milestone status
                for m in milestones:
                    if m.get("id") == data.milestone_id:
                        m["status"] = "paid"
                        m["paid_at"] = datetime.now(timezone.utc).isoformat()
                        m["escrow_status"] = "released"
                        m["transfer_id"] = transfer.id
                        break
                
                # Update contract
                total_paid = contract.get("total_paid", 0) + data.amount
                await db.contracts.update_one(
                    {"id": data.contract_id},
                    {"$set": {
                        "milestones": milestones,
                        "total_paid": total_paid,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Record transaction
                transaction = {
                    "id": str(uuid.uuid4()),
                    "type": "connect_payout",
                    "transfer_id": transfer.id,
                    "contract_id": data.contract_id,
                    "milestone_id": data.milestone_id,
                    "employer_id": current_user.id,
                    "contractor_id": contract.get("contractor_id"),
                    "gross_amount": data.amount,
                    "platform_fee": platform_fee / 100,
                    "net_amount": contractor_amount / 100,
                    "currency": data.currency,
                    "status": "completed",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.payment_transactions.insert_one(transaction)
                
                logger.info(f"Payout created: {transfer.id} for milestone {data.milestone_id}")
                
                return {
                    "success": True,
                    "transfer_id": transfer.id,
                    "gross_amount": data.amount,
                    "platform_fee": platform_fee / 100,
                    "net_amount": contractor_amount / 100,
                    "message": f"Payment of ${contractor_amount/100:.2f} sent to contractor"
                }
                
            except stripe.error.StripeError as e:
                logger.error(f"Stripe transfer error: {e}")
                raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating payout: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @stripe_connect_router.get("/earnings")
    async def get_contractor_earnings(current_user = Depends(get_current_user)):
        """Get contractor's earnings summary"""
        try:
            # Get all payouts to this contractor
            transactions = await db.payment_transactions.find({
                "contractor_id": current_user.id,
                "type": "connect_payout",
                "status": "completed"
            }, {"_id": 0}).to_list(length=1000)
            
            total_gross = sum(t.get("gross_amount", 0) for t in transactions)
            total_fees = sum(t.get("platform_fee", 0) for t in transactions)
            total_net = sum(t.get("net_amount", 0) for t in transactions)
            
            # Get pending milestones
            pending_milestones = await db.contracts.aggregate([
                {"$match": {"contractor_id": current_user.id, "status": "active"}},
                {"$unwind": "$milestones"},
                {"$match": {"milestones.status": {"$in": ["approved", "funded"]}}},
                {"$group": {
                    "_id": None,
                    "pending_amount": {"$sum": "$milestones.amount"},
                    "count": {"$sum": 1}
                }}
            ]).to_list(1)
            
            pending_amount = pending_milestones[0]["pending_amount"] if pending_milestones else 0
            pending_count = pending_milestones[0]["count"] if pending_milestones else 0
            
            return {
                "success": True,
                "earnings": {
                    "total_gross": total_gross,
                    "total_fees": total_fees,
                    "total_net": total_net,
                    "transaction_count": len(transactions)
                },
                "pending": {
                    "amount": pending_amount,
                    "milestone_count": pending_count
                },
                "recent_payouts": transactions[:10]
            }
            
        except Exception as e:
            logger.error(f"Error getting contractor earnings: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return stripe_connect_router
