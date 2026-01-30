"""
Payments Routes - API endpoints for Stripe payment integration
Handles escrow-style milestone payments for contracts
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timezone
from dotenv import load_dotenv
import uuid
import logging
import os

load_dotenv()

logger = logging.getLogger(__name__)

payments_router = APIRouter(prefix="/api/payments", tags=["Payments"])

# Pydantic Models
class FundContractRequest(BaseModel):
    contract_id: str
    origin_url: str  # Frontend origin for redirect URLs

class FundMilestoneRequest(BaseModel):
    contract_id: str
    milestone_id: str
    origin_url: str

class PaymentStatusRequest(BaseModel):
    session_id: str


def get_payments_routes(db, get_current_user):
    """Factory function to create payments routes with database dependency"""
    
    STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")
    
    if not STRIPE_API_KEY:
        logger.warning("STRIPE_API_KEY not configured. Payment features will be limited.")
    
    # ==================== FUND CONTRACT ====================
    
    @payments_router.post("/fund-contract")
    async def fund_contract(
        request: Request,
        data: FundContractRequest,
        current_user = Depends(get_current_user)
    ):
        """Create a Stripe checkout session to fund an entire contract"""
        try:
            if not STRIPE_API_KEY:
                raise HTTPException(status_code=500, detail="Payment service not configured")
            
            from emergentintegrations.payments.stripe.checkout import (
                StripeCheckout, CheckoutSessionRequest
            )
            
            # Get contract
            contract = await db.contracts.find_one({"id": data.contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Only employer can fund
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can fund this contract")
            
            # Check contract status
            if contract.get("status") not in ["draft", "active"]:
                raise HTTPException(status_code=400, detail="Cannot fund a completed or cancelled contract")
            
            # Calculate amount to fund (total - already funded)
            total_amount = contract.get("payment_amount", 0)
            already_funded = contract.get("escrow_funded", 0)
            amount_to_fund = total_amount - already_funded
            
            if amount_to_fund <= 0:
                raise HTTPException(status_code=400, detail="Contract is already fully funded")
            
            # Determine currency (default to USD, Stripe needs lowercase)
            currency = contract.get("payment_currency", "USD").lower()
            if currency == "zar":
                currency = "zar"
            else:
                currency = "usd"
            
            # Build URLs
            success_url = f"{data.origin_url}/contracts/{data.contract_id}?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{data.origin_url}/contracts/{data.contract_id}?payment=cancelled"
            
            # Initialize Stripe
            host_url = str(request.base_url).rstrip('/')
            webhook_url = f"{host_url}/api/payments/webhook/stripe"
            stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
            
            # Create checkout session
            checkout_request = CheckoutSessionRequest(
                amount=float(amount_to_fund),
                currency=currency,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "type": "contract_funding",
                    "contract_id": data.contract_id,
                    "employer_id": current_user.id,
                    "employer_email": current_user.email
                }
            )
            
            session = await stripe_checkout.create_checkout_session(checkout_request)
            
            # Create payment transaction record
            transaction = {
                "id": str(uuid.uuid4()),
                "session_id": session.session_id,
                "type": "contract_funding",
                "contract_id": data.contract_id,
                "milestone_id": None,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "amount": amount_to_fund,
                "currency": currency.upper(),
                "payment_status": "pending",
                "status": "initiated",
                "metadata": {
                    "contract_title": contract.get("title"),
                    "contractor_name": contract.get("contractor_name")
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(transaction)
            
            logger.info(f"Payment session created for contract {data.contract_id}: {session.session_id}")
            
            return {
                "success": True,
                "checkout_url": session.url,
                "session_id": session.session_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating payment session: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @payments_router.post("/fund-milestone")
    async def fund_milestone(
        request: Request,
        data: FundMilestoneRequest,
        current_user = Depends(get_current_user)
    ):
        """Create a Stripe checkout session to fund a specific milestone"""
        try:
            if not STRIPE_API_KEY:
                raise HTTPException(status_code=500, detail="Payment service not configured")
            
            from emergentintegrations.payments.stripe.checkout import (
                StripeCheckout, CheckoutSessionRequest
            )
            
            # Get contract
            contract = await db.contracts.find_one({"id": data.contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Only employer can fund
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can fund milestones")
            
            # Find milestone
            milestones = contract.get("milestones", [])
            milestone = next((m for m in milestones if m.get("id") == data.milestone_id), None)
            if not milestone:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            # Check if already funded
            if milestone.get("escrow_status") == "funded":
                raise HTTPException(status_code=400, detail="Milestone is already funded")
            
            amount = milestone.get("amount", 0)
            if amount <= 0:
                raise HTTPException(status_code=400, detail="Invalid milestone amount")
            
            currency = contract.get("payment_currency", "USD").lower()
            if currency == "zar":
                currency = "zar"
            else:
                currency = "usd"
            
            # Build URLs
            success_url = f"{data.origin_url}/contracts/{data.contract_id}?payment=success&milestone={data.milestone_id}&session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{data.origin_url}/contracts/{data.contract_id}?payment=cancelled"
            
            # Initialize Stripe
            host_url = str(request.base_url).rstrip('/')
            webhook_url = f"{host_url}/api/payments/webhook/stripe"
            stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
            
            # Create checkout session
            checkout_request = CheckoutSessionRequest(
                amount=float(amount),
                currency=currency,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "type": "milestone_funding",
                    "contract_id": data.contract_id,
                    "milestone_id": data.milestone_id,
                    "employer_id": current_user.id,
                    "employer_email": current_user.email
                }
            )
            
            session = await stripe_checkout.create_checkout_session(checkout_request)
            
            # Create payment transaction record
            transaction = {
                "id": str(uuid.uuid4()),
                "session_id": session.session_id,
                "type": "milestone_funding",
                "contract_id": data.contract_id,
                "milestone_id": data.milestone_id,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "amount": amount,
                "currency": currency.upper(),
                "payment_status": "pending",
                "status": "initiated",
                "metadata": {
                    "milestone_title": milestone.get("title"),
                    "contract_title": contract.get("title")
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(transaction)
            
            logger.info(f"Milestone payment session created: {session.session_id}")
            
            return {
                "success": True,
                "checkout_url": session.url,
                "session_id": session.session_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating milestone payment session: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== PAYMENT STATUS ====================
    
    @payments_router.get("/status/{session_id}")
    async def get_payment_status(
        session_id: str,
        current_user = Depends(get_current_user)
    ):
        """Check payment status and update contract/milestone accordingly"""
        try:
            if not STRIPE_API_KEY:
                raise HTTPException(status_code=500, detail="Payment service not configured")
            
            from emergentintegrations.payments.stripe.checkout import StripeCheckout
            
            # Find the transaction
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if not transaction:
                raise HTTPException(status_code=404, detail="Transaction not found")
            
            # Check if already processed
            if transaction.get("payment_status") == "paid":
                return {
                    "success": True,
                    "status": "paid",
                    "payment_status": "paid",
                    "already_processed": True
                }
            
            # Get status from Stripe
            stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
            status = await stripe_checkout.get_checkout_status(session_id)
            
            # Update transaction
            update_data = {
                "status": status.status,
                "payment_status": status.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": update_data}
            )
            
            # If payment successful, update contract/milestone
            if status.payment_status == "paid":
                contract_id = transaction.get("contract_id")
                milestone_id = transaction.get("milestone_id")
                payment_type = transaction.get("type")
                amount = transaction.get("amount", 0)
                
                if payment_type == "contract_funding":
                    # Update contract escrow
                    await db.contracts.update_one(
                        {"id": contract_id},
                        {
                            "$inc": {"escrow_funded": amount},
                            "$set": {
                                "escrow_status": "funded",
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    logger.info(f"Contract {contract_id} funded with ${amount}")
                    
                elif payment_type == "milestone_funding" and milestone_id:
                    # Update milestone escrow status
                    contract = await db.contracts.find_one({"id": contract_id})
                    if contract:
                        milestones = contract.get("milestones", [])
                        for m in milestones:
                            if m.get("id") == milestone_id:
                                m["escrow_status"] = "funded"
                                m["funded_at"] = datetime.now(timezone.utc).isoformat()
                                break
                        
                        await db.contracts.update_one(
                            {"id": contract_id},
                            {
                                "$set": {
                                    "milestones": milestones,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                },
                                "$inc": {"escrow_funded": amount}
                            }
                        )
                    logger.info(f"Milestone {milestone_id} funded with ${amount}")
            
            return {
                "success": True,
                "status": status.status,
                "payment_status": status.payment_status,
                "amount_total": status.amount_total,
                "currency": status.currency
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking payment status: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== RELEASE PAYMENT ====================
    
    @payments_router.post("/release-milestone/{contract_id}/{milestone_id}")
    async def release_milestone_payment(
        contract_id: str,
        milestone_id: str,
        current_user = Depends(get_current_user)
    ):
        """
        Release escrowed funds for an approved milestone.
        Note: In a full implementation, this would transfer to contractor's bank/Stripe Connect account.
        For now, this marks the milestone as paid and updates the contract totals.
        """
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Only employer can release
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can release payments")
            
            # Find milestone
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            milestone = milestones[milestone_idx]
            
            # Check milestone is approved
            if milestone.get("status") != "approved":
                raise HTTPException(status_code=400, detail="Milestone must be approved before payment release")
            
            # Check if milestone is funded
            if milestone.get("escrow_status") != "funded":
                raise HTTPException(status_code=400, detail="Milestone is not funded yet")
            
            # Mark as paid
            amount = milestone.get("amount", 0)
            milestones[milestone_idx]["status"] = "paid"
            milestones[milestone_idx]["paid_at"] = datetime.now(timezone.utc).isoformat()
            milestones[milestone_idx]["escrow_status"] = "released"
            
            # Update contract
            total_paid = contract.get("total_paid", 0) + amount
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "total_paid": total_paid,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Create release transaction record
            release_transaction = {
                "id": str(uuid.uuid4()),
                "session_id": None,
                "type": "milestone_release",
                "contract_id": contract_id,
                "milestone_id": milestone_id,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "recipient_id": contract.get("contractor_id"),
                "recipient_email": contract.get("contractor_email"),
                "amount": amount,
                "currency": contract.get("payment_currency", "USD"),
                "payment_status": "released",
                "status": "completed",
                "metadata": {
                    "milestone_title": milestone.get("title"),
                    "contract_title": contract.get("title")
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(release_transaction)
            
            logger.info(f"Milestone payment released: ${amount} for milestone {milestone_id}")
            
            return {
                "success": True,
                "message": "Payment released to contractor",
                "amount": amount,
                "total_paid": total_paid
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error releasing payment: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== WEBHOOK ====================
    
    @payments_router.post("/webhook/stripe")
    async def stripe_webhook(request: Request):
        """Handle Stripe webhook events"""
        try:
            if not STRIPE_API_KEY:
                raise HTTPException(status_code=500, detail="Payment service not configured")
            
            from emergentintegrations.payments.stripe.checkout import StripeCheckout
            
            body = await request.body()
            signature = request.headers.get("Stripe-Signature")
            
            stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
            webhook_response = await stripe_checkout.handle_webhook(body, signature)
            
            logger.info(f"Webhook received: {webhook_response.event_type} for session {webhook_response.session_id}")
            
            # Update transaction based on webhook
            if webhook_response.session_id:
                transaction = await db.payment_transactions.find_one(
                    {"session_id": webhook_response.session_id}
                )
                
                if transaction and transaction.get("payment_status") != "paid":
                    update_data = {
                        "payment_status": webhook_response.payment_status,
                        "webhook_event_id": webhook_response.event_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    await db.payment_transactions.update_one(
                        {"session_id": webhook_response.session_id},
                        {"$set": update_data}
                    )
                    
                    # If successful, update contract/milestone
                    if webhook_response.payment_status == "paid":
                        contract_id = transaction.get("contract_id")
                        milestone_id = transaction.get("milestone_id")
                        amount = transaction.get("amount", 0)
                        
                        if transaction.get("type") == "contract_funding":
                            await db.contracts.update_one(
                                {"id": contract_id},
                                {
                                    "$inc": {"escrow_funded": amount},
                                    "$set": {"escrow_status": "funded"}
                                }
                            )
                        elif transaction.get("type") == "milestone_funding" and milestone_id:
                            contract = await db.contracts.find_one({"id": contract_id})
                            if contract:
                                milestones = contract.get("milestones", [])
                                for m in milestones:
                                    if m.get("id") == milestone_id:
                                        m["escrow_status"] = "funded"
                                        break
                                await db.contracts.update_one(
                                    {"id": contract_id},
                                    {
                                        "$set": {"milestones": milestones},
                                        "$inc": {"escrow_funded": amount}
                                    }
                                )
            
            return {"success": True, "received": True}
            
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            # Return 200 to acknowledge receipt even on error
            return {"success": False, "error": str(e)}
    
    # ==================== TRANSACTION HISTORY ====================
    
    @payments_router.get("/transactions")
    async def get_my_transactions(
        current_user = Depends(get_current_user),
        contract_id: Optional[str] = None
    ):
        """Get payment transactions for current user"""
        try:
            query = {
                "$or": [
                    {"user_id": current_user.id},
                    {"recipient_id": current_user.id}
                ]
            }
            
            if contract_id:
                query["contract_id"] = contract_id
            
            transactions = await db.payment_transactions.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=100)
            
            return {"success": True, "transactions": transactions}
            
        except Exception as e:
            logger.error(f"Error getting transactions: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return payments_router
