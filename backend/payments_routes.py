"""
Payments Routes - API endpoints for Stripe and Yoco payment integration
Handles escrow-style milestone payments for contracts
Supports both Stripe (international) and Yoco (South Africa) payment providers
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timezone
from dotenv import load_dotenv
import uuid
import logging
import os
import httpx

from email_service import email_service

load_dotenv()

logger = logging.getLogger(__name__)

payments_router = APIRouter(prefix="/api/payments", tags=["Payments"])

# Pydantic Models
class FundContractRequest(BaseModel):
    contract_id: str
    origin_url: str
    provider: str = "stripe"  # "stripe" or "yoco"

class FundMilestoneRequest(BaseModel):
    contract_id: str
    milestone_id: str
    origin_url: str
    provider: str = "stripe"  # "stripe" or "yoco"

class YocoChargeRequest(BaseModel):
    payment_id: str
    token: str  # Token from Yoco frontend SDK

class PaymentStatusRequest(BaseModel):
    session_id: str


def get_payments_routes(db, get_current_user):
    """Factory function to create payments routes with database dependency"""
    
    async def get_payment_settings():
        """Get payment settings from database or env"""
        settings = await db.admin_settings.find_one({"type": "payment_settings"})
        if settings:
            return {
                "stripe_api_key": settings.get("stripe_secret_key") or os.environ.get("STRIPE_API_KEY"),
                "stripe_public_key": settings.get("stripe_public_key"),
                "yoco_secret_key": settings.get("yoco_secret_key") or os.environ.get("YOCO_SECRET_KEY"),
                "yoco_public_key": settings.get("yoco_public_key") or os.environ.get("YOCO_PUBLIC_KEY"),
                "default_provider": settings.get("default_provider", "stripe")
            }
        return {
            "stripe_api_key": os.environ.get("STRIPE_API_KEY"),
            "stripe_public_key": os.environ.get("STRIPE_PUBLIC_KEY"),
            "yoco_secret_key": os.environ.get("YOCO_SECRET_KEY"),
            "yoco_public_key": os.environ.get("YOCO_PUBLIC_KEY"),
            "default_provider": "stripe"
        }
    
    # ==================== PAYMENT CONFIG ====================
    
    @payments_router.get("/config")
    async def get_payment_config(current_user = Depends(get_current_user)):
        """Get payment provider configuration for frontend"""
        settings = await get_payment_settings()
        
        providers = []
        if settings.get("stripe_api_key"):
            providers.append({
                "id": "stripe",
                "name": "Stripe",
                "description": "International payments (USD)",
                "public_key": settings.get("stripe_public_key"),
                "currencies": ["USD"]
            })
        if settings.get("yoco_secret_key"):
            providers.append({
                "id": "yoco",
                "name": "Yoco",
                "description": "South African payments (ZAR only)",
                "public_key": settings.get("yoco_public_key"),
                "currencies": ["ZAR"]
            })
        
        return {
            "success": True,
            "providers": providers,
            "default_provider": settings.get("default_provider", "stripe")
        }
    
    # ==================== STRIPE ENDPOINTS ====================
    
    @payments_router.post("/fund-contract")
    async def fund_contract(
        request: Request,
        data: FundContractRequest,
        current_user = Depends(get_current_user)
    ):
        """Create a checkout session to fund an entire contract"""
        settings = await get_payment_settings()
        
        if data.provider == "stripe":
            return await fund_contract_stripe(request, data, current_user, settings, db)
        elif data.provider == "yoco":
            return await fund_contract_yoco(request, data, current_user, settings, db)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown payment provider: {data.provider}")
    
    async def fund_contract_stripe(request, data, current_user, settings, db):
        """Fund contract using Stripe"""
        STRIPE_API_KEY = settings.get("stripe_api_key")
        if not STRIPE_API_KEY:
            raise HTTPException(status_code=500, detail="Stripe not configured")
        
        try:
            from emergentintegrations.payments.stripe.checkout import (
                StripeCheckout, CheckoutSessionRequest
            )
            
            contract = await db.contracts.find_one({"id": data.contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can fund this contract")
            
            if contract.get("status") not in ["draft", "active"]:
                raise HTTPException(status_code=400, detail="Cannot fund a completed or cancelled contract")
            
            total_amount = contract.get("payment_amount", 0)
            already_funded = contract.get("escrow_funded", 0)
            amount_to_fund = total_amount - already_funded
            
            if amount_to_fund <= 0:
                raise HTTPException(status_code=400, detail="Contract is already fully funded")
            
            currency = contract.get("payment_currency", "USD").lower()
            
            success_url = f"{data.origin_url}/contracts/{data.contract_id}?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{data.origin_url}/contracts/{data.contract_id}?payment=cancelled"
            
            host_url = str(request.base_url).rstrip('/')
            webhook_url = f"{host_url}/api/payments/webhook/stripe"
            stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
            
            checkout_request = CheckoutSessionRequest(
                amount=float(amount_to_fund),
                currency=currency,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "type": "contract_funding",
                    "contract_id": data.contract_id,
                    "employer_id": current_user.id,
                    "provider": "stripe"
                }
            )
            
            session = await stripe_checkout.create_checkout_session(checkout_request)
            
            transaction = {
                "id": str(uuid.uuid4()),
                "session_id": session.session_id,
                "type": "contract_funding",
                "provider": "stripe",
                "contract_id": data.contract_id,
                "milestone_id": None,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "amount": amount_to_fund,
                "currency": currency.upper(),
                "payment_status": "pending",
                "status": "initiated",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(transaction)
            
            return {
                "success": True,
                "provider": "stripe",
                "checkout_url": session.url,
                "session_id": session.session_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Stripe error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def fund_contract_yoco(request, data, current_user, settings, db):
        """Fund contract using Yoco - creates checkout session"""
        import httpx
        
        # Try admin settings first, then fall back to env vars
        YOCO_SECRET_KEY = settings.get("yoco_secret_key") or os.environ.get("YOCO_SECRET_KEY")
        YOCO_PUBLIC_KEY = settings.get("yoco_public_key") or os.environ.get("YOCO_PUBLIC_KEY")
        
        if not YOCO_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Yoco not configured. Please add Yoco API keys in admin settings.")
        
        try:
            contract = await db.contracts.find_one({"id": data.contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can fund this contract")
            
            if contract.get("status") not in ["draft", "active"]:
                raise HTTPException(status_code=400, detail="Cannot fund a completed or cancelled contract")
            
            # Yoco only supports ZAR
            if contract.get("payment_currency", "USD").upper() != "ZAR":
                raise HTTPException(status_code=400, detail="Yoco only supports ZAR currency. Please use Stripe for USD payments.")
            
            total_amount = contract.get("payment_amount", 0)
            already_funded = contract.get("escrow_funded", 0)
            amount_to_fund = total_amount - already_funded
            
            if amount_to_fund <= 0:
                raise HTTPException(status_code=400, detail="Contract is already fully funded")
            
            # Create payment record
            payment_id = str(uuid.uuid4())
            amount_cents = int(amount_to_fund * 100)  # Yoco uses cents
            
            # Build return URLs
            origin_url = data.origin_url or str(request.base_url).rstrip('/')
            success_url = f"{origin_url}/contracts/{data.contract_id}?payment=success&session_id={payment_id}"
            cancel_url = f"{origin_url}/contracts/{data.contract_id}?payment=cancelled"
            failure_url = f"{origin_url}/contracts/{data.contract_id}?payment=failed"
            
            # Create Yoco checkout session
            async with httpx.AsyncClient() as client:
                yoco_response = await client.post(
                    "https://payments.yoco.com/api/checkouts",
                    headers={
                        "Authorization": f"Bearer {YOCO_SECRET_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "amount": amount_cents,
                        "currency": "ZAR",
                        "successUrl": success_url,
                        "cancelUrl": cancel_url,
                        "failureUrl": failure_url,
                        "metadata": {
                            "payment_id": payment_id,
                            "contract_id": data.contract_id,
                            "type": "contract_funding",
                            "user_id": current_user.id
                        }
                    },
                    timeout=30
                )
                
                logger.info(f"Yoco checkout response: {yoco_response.status_code}")
                
                if yoco_response.status_code not in [200, 201]:
                    error_data = yoco_response.json() if yoco_response.content else {}
                    error_msg = error_data.get("message", error_data.get("error", "Unknown error"))
                    logger.error(f"Yoco checkout error: {error_msg}")
                    raise HTTPException(status_code=500, detail=f"Yoco payment error: {error_msg}")
                
                yoco_data = yoco_response.json()
                checkout_id = yoco_data.get("id")
                checkout_url = yoco_data.get("redirectUrl")
                
                if not checkout_url:
                    raise HTTPException(status_code=500, detail="Yoco did not return a checkout URL")
            
            # Save transaction record
            transaction = {
                "id": payment_id,
                "session_id": checkout_id,
                "type": "contract_funding",
                "provider": "yoco",
                "contract_id": data.contract_id,
                "milestone_id": None,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "amount": amount_to_fund,
                "amount_cents": amount_cents,
                "currency": "ZAR",
                "payment_status": "pending",
                "status": "initiated",
                "checkout_id": checkout_id,
                "checkout_url": checkout_url,
                "success_url": success_url,
                "cancel_url": cancel_url,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(transaction)
            
            return {
                "success": True,
                "provider": "yoco",
                "payment_id": payment_id,
                "checkout_id": checkout_id,
                "checkout_url": checkout_url,
                "public_key": YOCO_PUBLIC_KEY,
                "amount_cents": amount_cents,
                "currency": "ZAR",
                "description": f"Contract funding: {contract.get('title', 'Contract')}"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Yoco error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @payments_router.post("/fund-milestone")
    async def fund_milestone(
        request: Request,
        data: FundMilestoneRequest,
        current_user = Depends(get_current_user)
    ):
        """Create a checkout session to fund a specific milestone"""
        settings = await get_payment_settings()
        
        if data.provider == "stripe":
            return await fund_milestone_stripe(request, data, current_user, settings, db)
        elif data.provider == "yoco":
            return await fund_milestone_yoco(request, data, current_user, settings, db)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown payment provider: {data.provider}")
    
    async def fund_milestone_stripe(request, data, current_user, settings, db):
        """Fund milestone using Stripe"""
        STRIPE_API_KEY = settings.get("stripe_api_key")
        if not STRIPE_API_KEY:
            raise HTTPException(status_code=500, detail="Stripe not configured")
        
        try:
            from emergentintegrations.payments.stripe.checkout import (
                StripeCheckout, CheckoutSessionRequest
            )
            
            contract = await db.contracts.find_one({"id": data.contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can fund milestones")
            
            milestones = contract.get("milestones", [])
            milestone = next((m for m in milestones if m.get("id") == data.milestone_id), None)
            if not milestone:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestone.get("escrow_status") == "funded":
                raise HTTPException(status_code=400, detail="Milestone is already funded")
            
            amount = milestone.get("amount", 0)
            if amount <= 0:
                raise HTTPException(status_code=400, detail="Invalid milestone amount")
            
            currency = contract.get("payment_currency", "USD").lower()
            
            success_url = f"{data.origin_url}/contracts/{data.contract_id}?payment=success&milestone={data.milestone_id}&session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{data.origin_url}/contracts/{data.contract_id}?payment=cancelled"
            
            host_url = str(request.base_url).rstrip('/')
            webhook_url = f"{host_url}/api/payments/webhook/stripe"
            stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
            
            checkout_request = CheckoutSessionRequest(
                amount=float(amount),
                currency=currency,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "type": "milestone_funding",
                    "contract_id": data.contract_id,
                    "milestone_id": data.milestone_id,
                    "provider": "stripe"
                }
            )
            
            session = await stripe_checkout.create_checkout_session(checkout_request)
            
            transaction = {
                "id": str(uuid.uuid4()),
                "session_id": session.session_id,
                "type": "milestone_funding",
                "provider": "stripe",
                "contract_id": data.contract_id,
                "milestone_id": data.milestone_id,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "amount": amount,
                "currency": currency.upper(),
                "payment_status": "pending",
                "status": "initiated",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(transaction)
            
            return {
                "success": True,
                "provider": "stripe",
                "checkout_url": session.url,
                "session_id": session.session_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Stripe milestone error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def fund_milestone_yoco(request, data, current_user, settings, db):
        """Fund milestone using Yoco - creates checkout session"""
        import httpx
        
        YOCO_SECRET_KEY = settings.get("yoco_secret_key")
        YOCO_PUBLIC_KEY = settings.get("yoco_public_key")
        
        if not YOCO_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Yoco not configured")
        
        try:
            contract = await db.contracts.find_one({"id": data.contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can fund milestones")
            
            # Yoco only supports ZAR
            if contract.get("payment_currency", "USD").upper() != "ZAR":
                raise HTTPException(status_code=400, detail="Yoco only supports ZAR currency. Please use Stripe for USD payments.")
            
            milestones = contract.get("milestones", [])
            milestone = next((m for m in milestones if m.get("id") == data.milestone_id), None)
            if not milestone:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestone.get("escrow_status") == "funded":
                raise HTTPException(status_code=400, detail="Milestone is already funded")
            
            amount = milestone.get("amount", 0)
            if amount <= 0:
                raise HTTPException(status_code=400, detail="Invalid milestone amount")
            
            payment_id = str(uuid.uuid4())
            amount_cents = int(amount * 100)  # Yoco uses cents
            
            # Build return URLs
            origin_url = data.origin_url or str(request.base_url).rstrip('/')
            success_url = f"{origin_url}/contracts/{data.contract_id}?payment=success&session_id={payment_id}&milestone_id={data.milestone_id}"
            cancel_url = f"{origin_url}/contracts/{data.contract_id}?payment=cancelled"
            failure_url = f"{origin_url}/contracts/{data.contract_id}?payment=failed"
            
            # Create Yoco checkout session
            async with httpx.AsyncClient() as client:
                yoco_response = await client.post(
                    "https://payments.yoco.com/api/checkouts",
                    headers={
                        "Authorization": f"Bearer {YOCO_SECRET_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "amount": amount_cents,
                        "currency": "ZAR",
                        "successUrl": success_url,
                        "cancelUrl": cancel_url,
                        "failureUrl": failure_url,
                        "metadata": {
                            "payment_id": payment_id,
                            "contract_id": data.contract_id,
                            "milestone_id": data.milestone_id,
                            "type": "milestone_funding",
                            "user_id": current_user.id
                        }
                    },
                    timeout=30
                )
                
                logger.info(f"Yoco milestone checkout response: {yoco_response.status_code}")
                
                if yoco_response.status_code not in [200, 201]:
                    error_data = yoco_response.json() if yoco_response.content else {}
                    error_msg = error_data.get("message", error_data.get("error", "Unknown error"))
                    logger.error(f"Yoco milestone checkout error: {error_msg}")
                    raise HTTPException(status_code=500, detail=f"Yoco payment error: {error_msg}")
                
                yoco_data = yoco_response.json()
                checkout_id = yoco_data.get("id")
                checkout_url = yoco_data.get("redirectUrl")
                
                if not checkout_url:
                    raise HTTPException(status_code=500, detail="Yoco did not return a checkout URL")
            
            # Save transaction record
            transaction = {
                "id": payment_id,
                "session_id": checkout_id,
                "type": "milestone_funding",
                "provider": "yoco",
                "contract_id": data.contract_id,
                "milestone_id": data.milestone_id,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "amount": amount,
                "amount_cents": amount_cents,
                "currency": "ZAR",
                "payment_status": "pending",
                "status": "initiated",
                "checkout_id": checkout_id,
                "checkout_url": checkout_url,
                "success_url": success_url,
                "cancel_url": cancel_url,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(transaction)
            
            return {
                "success": True,
                "provider": "yoco",
                "payment_id": payment_id,
                "checkout_id": checkout_id,
                "checkout_url": checkout_url,
                "public_key": YOCO_PUBLIC_KEY,
                "amount_cents": amount_cents,
                "currency": "ZAR",
                "description": f"Milestone: {milestone.get('title', 'Milestone')}"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Yoco milestone error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== YOCO CHARGE PROCESSING ====================
    
    @payments_router.post("/yoco/charge")
    async def process_yoco_charge(
        data: YocoChargeRequest,
        current_user = Depends(get_current_user)
    ):
        """Process a Yoco charge using token from frontend SDK"""
        settings = await get_payment_settings()
        YOCO_SECRET_KEY = settings.get("yoco_secret_key")
        
        if not YOCO_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Yoco not configured")
        
        try:
            # Get payment record
            transaction = await db.payment_transactions.find_one({
                "id": data.payment_id,
                "provider": "yoco",
                "payment_status": "pending"
            })
            
            if not transaction:
                raise HTTPException(status_code=404, detail="Payment not found or already processed")
            
            # Process charge with Yoco API
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://online.yoco.com/v1/charges/",
                    headers={
                        "X-Auth-Secret-Key": YOCO_SECRET_KEY,
                        "Content-Type": "application/json"
                    },
                    json={
                        "token": data.token,
                        "amountInCents": transaction.get("amount_cents"),
                        "currency": "ZAR",
                        "metadata": {
                            "payment_id": data.payment_id,
                            "contract_id": transaction.get("contract_id"),
                            "milestone_id": transaction.get("milestone_id")
                        }
                    }
                )
                
                result = response.json()
                
                if response.status_code in [200, 201] and result.get("status") == "successful":
                    # Update transaction
                    await db.payment_transactions.update_one(
                        {"id": data.payment_id},
                        {"$set": {
                            "payment_status": "paid",
                            "status": "completed",
                            "yoco_charge_id": result.get("id"),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    # Update contract escrow
                    contract_id = transaction.get("contract_id")
                    milestone_id = transaction.get("milestone_id")
                    amount = transaction.get("amount", 0)
                    
                    if transaction.get("type") == "contract_funding":
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
                    elif transaction.get("type") == "milestone_funding" and milestone_id:
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
                                    "$set": {"milestones": milestones},
                                    "$inc": {"escrow_funded": amount}
                                }
                            )
                    
                    return {
                        "success": True,
                        "message": "Payment successful",
                        "charge_id": result.get("id")
                    }
                else:
                    # Payment failed
                    error_msg = result.get("errorMessage", "Payment failed")
                    await db.payment_transactions.update_one(
                        {"id": data.payment_id},
                        {"$set": {
                            "payment_status": "failed",
                            "status": "failed",
                            "error_message": error_msg,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    raise HTTPException(status_code=400, detail=error_msg)
                    
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Yoco charge error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== PAYMENT STATUS ====================
    
    @payments_router.get("/status/{session_id}")
    async def get_payment_status(
        session_id: str,
        current_user = Depends(get_current_user)
    ):
        """Check payment status and update contract/milestone accordingly"""
        try:
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if not transaction:
                raise HTTPException(status_code=404, detail="Transaction not found")
            
            # If already processed
            if transaction.get("payment_status") == "paid":
                return {
                    "success": True,
                    "status": "paid",
                    "payment_status": "paid",
                    "already_processed": True
                }
            
            provider = transaction.get("provider", "stripe")
            
            if provider == "stripe":
                return await check_stripe_status(session_id, transaction, db)
            elif provider == "yoco":
                # Yoco status is updated via charge endpoint
                return {
                    "success": True,
                    "status": transaction.get("status"),
                    "payment_status": transaction.get("payment_status")
                }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking payment status: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def check_stripe_status(session_id, transaction, db):
        """Check Stripe payment status"""
        settings = await get_payment_settings()
        STRIPE_API_KEY = settings.get("stripe_api_key")
        
        if not STRIPE_API_KEY:
            raise HTTPException(status_code=500, detail="Stripe not configured")
        
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
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
            
            # Get contract details for email
            contract = await db.contracts.find_one({"id": contract_id})
            
            if payment_type == "contract_funding":
                await db.contracts.update_one(
                    {"id": contract_id},
                    {
                        "$inc": {"escrow_funded": amount},
                        "$set": {"escrow_status": "funded"}
                    }
                )
                
                # Send email notifications for full contract funding
                if contract:
                    try:
                        frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
                        contract_url = f"{frontend_url}/contracts/{contract_id}" if frontend_url else f"/contracts/{contract_id}"
                        currency = contract.get("payment_currency", "USD")
                        
                        # Notify contractor
                        await email_service.send_milestone_funded_email(
                            to_email=contract.get("contractor_email"),
                            recipient_name=contract.get("contractor_name"),
                            contract_title=contract.get("title"),
                            milestone_title="Full Contract",
                            amount=f"{currency} {amount:,.2f}",
                            contract_url=contract_url,
                            is_contractor=True
                        )
                        
                        # Notify employer (confirmation)
                        await email_service.send_milestone_funded_email(
                            to_email=contract.get("employer_email"),
                            recipient_name=contract.get("employer_name"),
                            contract_title=contract.get("title"),
                            milestone_title="Full Contract",
                            amount=f"{currency} {amount:,.2f}",
                            contract_url=contract_url,
                            is_contractor=False
                        )
                        logger.info(f"Contract funding emails sent for {contract_id}")
                    except Exception as email_err:
                        logger.warning(f"Failed to send contract funding emails: {email_err}")
                        
            elif payment_type == "milestone_funding" and milestone_id:
                if contract:
                    milestones = contract.get("milestones", [])
                    milestone_title = "Milestone"
                    for m in milestones:
                        if m.get("id") == milestone_id:
                            m["escrow_status"] = "funded"
                            m["funded_at"] = datetime.now(timezone.utc).isoformat()
                            milestone_title = m.get("title", "Milestone")
                            break
                    
                    await db.contracts.update_one(
                        {"id": contract_id},
                        {
                            "$set": {"milestones": milestones},
                            "$inc": {"escrow_funded": amount}
                        }
                    )
                    
                    # Send email notifications for milestone funding
                    try:
                        frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
                        contract_url = f"{frontend_url}/contracts/{contract_id}" if frontend_url else f"/contracts/{contract_id}"
                        currency = contract.get("payment_currency", "USD")
                        
                        # Notify contractor
                        await email_service.send_milestone_funded_email(
                            to_email=contract.get("contractor_email"),
                            recipient_name=contract.get("contractor_name"),
                            contract_title=contract.get("title"),
                            milestone_title=milestone_title,
                            amount=f"{currency} {amount:,.2f}",
                            contract_url=contract_url,
                            is_contractor=True
                        )
                        
                        # Notify employer (confirmation)
                        await email_service.send_milestone_funded_email(
                            to_email=contract.get("employer_email"),
                            recipient_name=contract.get("employer_name"),
                            contract_title=contract.get("title"),
                            milestone_title=milestone_title,
                            amount=f"{currency} {amount:,.2f}",
                            contract_url=contract_url,
                            is_contractor=False
                        )
                        logger.info(f"Milestone funding emails sent for {contract_id}/{milestone_id}")
                    except Exception as email_err:
                        logger.warning(f"Failed to send milestone funding emails: {email_err}")
        
        return {
            "success": True,
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
    
    # ==================== RELEASE PAYMENT ====================
    
    @payments_router.post("/release-milestone/{contract_id}/{milestone_id}")
    async def release_milestone_payment(
        contract_id: str,
        milestone_id: str,
        current_user = Depends(get_current_user)
    ):
        """Release escrowed funds for an approved milestone"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can release payments")
            
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            milestone = milestones[milestone_idx]
            
            if milestone.get("status") != "approved":
                raise HTTPException(status_code=400, detail="Milestone must be approved before payment release")
            
            if milestone.get("escrow_status") != "funded":
                raise HTTPException(status_code=400, detail="Milestone is not funded yet")
            
            amount = milestone.get("amount", 0)
            milestones[milestone_idx]["status"] = "paid"
            milestones[milestone_idx]["paid_at"] = datetime.now(timezone.utc).isoformat()
            milestones[milestone_idx]["escrow_status"] = "released"
            
            total_paid = contract.get("total_paid", 0) + amount
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "total_paid": total_paid,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            release_transaction = {
                "id": str(uuid.uuid4()),
                "session_id": None,
                "type": "milestone_release",
                "contract_id": contract_id,
                "milestone_id": milestone_id,
                "user_id": current_user.id,
                "recipient_id": contract.get("contractor_id"),
                "amount": amount,
                "currency": contract.get("payment_currency", "USD"),
                "payment_status": "released",
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(release_transaction)
            
            # Send email notification to contractor about payment release
            try:
                frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
                contract_url = f"{frontend_url}/contracts/{contract_id}" if frontend_url else f"/contracts/{contract_id}"
                currency = contract.get("payment_currency", "USD")
                
                await email_service.send_payment_released_email(
                    to_email=contract.get("contractor_email"),
                    contractor_name=contract.get("contractor_name"),
                    contract_title=contract.get("title"),
                    milestone_title=milestone.get("title", "Milestone"),
                    amount=f"{currency} {amount:,.2f}",
                    contract_url=contract_url
                )
                logger.info(f"Payment release email sent to {contract.get('contractor_email')}")
            except Exception as email_err:
                logger.warning(f"Failed to send payment release email: {email_err}")
            
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
    
    # ==================== WEBHOOKS ====================
    
    @payments_router.post("/webhook/stripe")
    async def stripe_webhook(request: Request):
        """Handle Stripe webhook events"""
        settings = await get_payment_settings()
        STRIPE_API_KEY = settings.get("stripe_api_key")
        
        if not STRIPE_API_KEY:
            return {"success": False, "error": "Stripe not configured"}
        
        try:
            from emergentintegrations.payments.stripe.checkout import StripeCheckout
            
            body = await request.body()
            signature = request.headers.get("Stripe-Signature")
            
            stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
            webhook_response = await stripe_checkout.handle_webhook(body, signature)
            
            if webhook_response.session_id:
                transaction = await db.payment_transactions.find_one(
                    {"session_id": webhook_response.session_id}
                )
                
                if transaction and transaction.get("payment_status") != "paid":
                    await db.payment_transactions.update_one(
                        {"session_id": webhook_response.session_id},
                        {"$set": {
                            "payment_status": webhook_response.payment_status,
                            "webhook_event_id": webhook_response.event_id,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
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
            return {"success": False, "error": str(e)}
    
    @payments_router.post("/webhook/yoco")
    async def yoco_webhook(request: Request):
        """Handle Yoco webhook events"""
        try:
            payload = await request.json()
            
            charge_id = payload.get("id")
            status = payload.get("status")
            metadata = payload.get("metadata", {})
            payment_id = metadata.get("payment_id")
            
            if payment_id:
                transaction = await db.payment_transactions.find_one({"id": payment_id})
                
                if transaction and status == "successful":
                    await db.payment_transactions.update_one(
                        {"id": payment_id},
                        {"$set": {
                            "payment_status": "paid",
                            "yoco_charge_id": charge_id,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
            
            return {"success": True, "received": True}
            
        except Exception as e:
            logger.error(f"Yoco webhook error: {e}")
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
    
    # ==================== ESCROW DASHBOARD & MANAGEMENT ====================
    
    @payments_router.get("/escrow/dashboard")
    async def get_escrow_dashboard(
        current_user = Depends(get_current_user)
    ):
        """Get comprehensive escrow dashboard for user"""
        try:
            # Get all contracts where user is employer or contractor
            contracts = await db.contracts.find({
                "$or": [
                    {"employer_id": current_user.id},
                    {"contractor_id": current_user.id}
                ]
            }, {"_id": 0}).to_list(length=500)
            
            # Calculate escrow statistics
            as_employer = [c for c in contracts if c.get("employer_id") == current_user.id]
            as_contractor = [c for c in contracts if c.get("contractor_id") == current_user.id]
            
            # Employer stats
            total_funded_as_employer = sum(c.get("escrow_funded", 0) for c in as_employer)
            total_released_as_employer = sum(c.get("total_paid", 0) for c in as_employer)
            pending_release_as_employer = max(0, total_funded_as_employer - total_released_as_employer)
            
            # Contractor stats (funds held for them)
            total_funded_for_contractor = sum(c.get("escrow_funded", 0) for c in as_contractor)
            total_received_as_contractor = sum(c.get("total_paid", 0) for c in as_contractor)
            pending_for_contractor = max(0, total_funded_for_contractor - total_received_as_contractor)
            
            # Get pending approvals (milestones submitted but not approved)
            pending_approvals = []
            for c in as_employer:
                for m in c.get("milestones", []):
                    if m.get("status") == "submitted" and m.get("escrow_status") == "funded":
                        pending_approvals.append({
                            "contract_id": c.get("id"),
                            "contract_title": c.get("title"),
                            "milestone_id": m.get("id"),
                            "milestone_title": m.get("title"),
                            "amount": m.get("amount"),
                            "currency": c.get("payment_currency", "USD"),
                            "submitted_at": m.get("submitted_at"),
                            "contractor_name": c.get("contractor_name")
                        })
            
            # Get milestones awaiting payment (contractor view)
            awaiting_payment = []
            for c in as_contractor:
                for m in c.get("milestones", []):
                    if m.get("status") == "approved" and m.get("escrow_status") == "funded":
                        awaiting_payment.append({
                            "contract_id": c.get("id"),
                            "contract_title": c.get("title"),
                            "milestone_id": m.get("id"),
                            "milestone_title": m.get("title"),
                            "amount": m.get("amount"),
                            "currency": c.get("payment_currency", "USD"),
                            "approved_at": m.get("approved_at"),
                            "employer_name": c.get("employer_name")
                        })
            
            # Get unfunded milestones
            unfunded_milestones = []
            for c in as_employer:
                if c.get("status") == "active":
                    for m in c.get("milestones", []):
                        if not m.get("escrow_status") and m.get("status") not in ["paid", "cancelled"]:
                            unfunded_milestones.append({
                                "contract_id": c.get("id"),
                                "contract_title": c.get("title"),
                                "milestone_id": m.get("id"),
                                "milestone_title": m.get("title"),
                                "amount": m.get("amount"),
                                "currency": c.get("payment_currency", "USD"),
                                "due_date": m.get("due_date")
                            })
            
            return {
                "success": True,
                "dashboard": {
                    "as_employer": {
                        "total_funded": total_funded_as_employer,
                        "total_released": total_released_as_employer,
                        "pending_release": pending_release_as_employer,
                        "active_contracts": len([c for c in as_employer if c.get("status") == "active"]),
                        "pending_approvals": len(pending_approvals),
                        "unfunded_milestones": len(unfunded_milestones)
                    },
                    "as_contractor": {
                        "total_funded_for_you": total_funded_for_contractor,
                        "total_received": total_received_as_contractor,
                        "pending_release": pending_for_contractor,
                        "active_contracts": len([c for c in as_contractor if c.get("status") == "active"]),
                        "awaiting_payment": len(awaiting_payment)
                    },
                    "pending_approvals": pending_approvals[:10],  # Latest 10
                    "awaiting_payment": awaiting_payment[:10],
                    "unfunded_milestones": unfunded_milestones[:10]
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting escrow dashboard: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @payments_router.get("/escrow/contract/{contract_id}")
    async def get_contract_escrow_details(
        contract_id: str,
        current_user = Depends(get_current_user)
    ):
        """Get detailed escrow information for a specific contract"""
        try:
            contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Verify access
            if contract.get("employer_id") != current_user.id and contract.get("contractor_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Get all transactions for this contract
            transactions = await db.payment_transactions.find(
                {"contract_id": contract_id},
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=100)
            
            # Calculate escrow breakdown by milestone
            milestones_escrow = []
            for m in contract.get("milestones", []):
                milestone_transactions = [t for t in transactions if t.get("milestone_id") == m.get("id")]
                funded_amount = sum(t.get("amount", 0) for t in milestone_transactions if t.get("type") == "milestone_funding" and t.get("status") == "completed")
                released_amount = sum(t.get("amount", 0) for t in milestone_transactions if t.get("type") == "milestone_release")
                
                milestones_escrow.append({
                    "milestone_id": m.get("id"),
                    "title": m.get("title"),
                    "amount": m.get("amount"),
                    "status": m.get("status"),
                    "escrow_status": m.get("escrow_status"),
                    "funded_amount": funded_amount,
                    "released_amount": released_amount,
                    "held_amount": funded_amount - released_amount,
                    "due_date": m.get("due_date"),
                    "submitted_at": m.get("submitted_at"),
                    "approved_at": m.get("approved_at"),
                    "paid_at": m.get("paid_at")
                })
            
            return {
                "success": True,
                "contract": {
                    "id": contract.get("id"),
                    "title": contract.get("title"),
                    "status": contract.get("status"),
                    "total_value": contract.get("payment_amount"),
                    "currency": contract.get("payment_currency", "USD"),
                    "total_funded": contract.get("escrow_funded", 0),
                    "total_paid": contract.get("total_paid", 0),
                    "escrow_balance": contract.get("escrow_funded", 0) - contract.get("total_paid", 0),
                    "employer_name": contract.get("employer_name"),
                    "contractor_name": contract.get("contractor_name")
                },
                "milestones": milestones_escrow,
                "transactions": transactions
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting contract escrow details: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== ESCROW PROTECTION POLICIES ====================
    
    class DisputeRequest(BaseModel):
        reason: str
        description: str
        evidence_urls: List[str] = []
    
    class DisputeResolution(BaseModel):
        resolution: str  # "release_to_contractor", "refund_to_employer", "partial_release"
        contractor_amount: Optional[float] = None  # For partial release
        notes: str = ""
    
    @payments_router.post("/escrow/dispute/{contract_id}/{milestone_id}")
    async def create_escrow_dispute(
        contract_id: str,
        milestone_id: str,
        data: DisputeRequest,
        current_user = Depends(get_current_user)
    ):
        """Create a dispute for a funded milestone"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Only contractor can dispute (employer controls release)
            if contract.get("contractor_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only contractors can create disputes")
            
            milestones = contract.get("milestones", [])
            milestone = next((m for m in milestones if m.get("id") == milestone_id), None)
            
            if not milestone:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestone.get("escrow_status") != "funded":
                raise HTTPException(status_code=400, detail="Can only dispute funded milestones")
            
            if milestone.get("status") not in ["submitted", "approved"]:
                raise HTTPException(status_code=400, detail="Can only dispute submitted or approved milestones")
            
            # Create dispute record
            dispute = {
                "id": str(uuid.uuid4()),
                "contract_id": contract_id,
                "milestone_id": milestone_id,
                "created_by": current_user.id,
                "created_by_name": current_user.full_name,
                "created_by_role": "contractor",
                "employer_id": contract.get("employer_id"),
                "contractor_id": contract.get("contractor_id"),
                "reason": data.reason,
                "description": data.description,
                "evidence_urls": data.evidence_urls,
                "amount": milestone.get("amount"),
                "currency": contract.get("payment_currency", "USD"),
                "status": "open",  # open, under_review, resolved
                "resolution": None,
                "resolution_notes": None,
                "resolved_at": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.escrow_disputes.insert_one(dispute)
            
            # Update milestone with dispute info
            milestone_idx = next(i for i, m in enumerate(milestones) if m.get("id") == milestone_id)
            milestones[milestone_idx]["has_dispute"] = True
            milestones[milestone_idx]["dispute_id"] = dispute["id"]
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {"milestones": milestones, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Send notification to employer
            try:
                await email_service.send_generic_email(
                    to_email=contract.get("employer_email"),
                    subject=f"Dispute Created for {contract.get('title')}",
                    message=f"""
                    <p>A dispute has been created by {current_user.full_name} for milestone <strong>{milestone.get('title')}</strong>.</p>
                    <p><strong>Reason:</strong> {data.reason}</p>
                    <p><strong>Description:</strong> {data.description}</p>
                    <p>Please review and resolve this dispute as soon as possible.</p>
                    """
                )
            except Exception as email_err:
                logger.warning(f"Failed to send dispute notification: {email_err}")
            
            return {
                "success": True,
                "message": "Dispute created successfully",
                "dispute_id": dispute["id"]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating dispute: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @payments_router.get("/escrow/disputes")
    async def get_my_disputes(
        current_user = Depends(get_current_user),
        status: Optional[str] = None
    ):
        """Get disputes for current user"""
        try:
            query = {
                "$or": [
                    {"employer_id": current_user.id},
                    {"contractor_id": current_user.id}
                ]
            }
            if status:
                query["status"] = status
            
            disputes = await db.escrow_disputes.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=100)
            
            return {"success": True, "disputes": disputes}
            
        except Exception as e:
            logger.error(f"Error getting disputes: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @payments_router.post("/escrow/dispute/{dispute_id}/resolve")
    async def resolve_dispute(
        dispute_id: str,
        data: DisputeResolution,
        current_user = Depends(get_current_user)
    ):
        """Resolve a dispute (admin or employer only)"""
        try:
            dispute = await db.escrow_disputes.find_one({"id": dispute_id})
            if not dispute:
                raise HTTPException(status_code=404, detail="Dispute not found")
            
            # Only employer or admin can resolve
            if dispute.get("employer_id") != current_user.id and current_user.role != "super_admin":
                raise HTTPException(status_code=403, detail="Only employer or admin can resolve disputes")
            
            if dispute.get("status") == "resolved":
                raise HTTPException(status_code=400, detail="Dispute already resolved")
            
            contract = await db.contracts.find_one({"id": dispute.get("contract_id")})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            milestone_id = dispute.get("milestone_id")
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            amount = dispute.get("amount", 0)
            
            # Process resolution
            if data.resolution == "release_to_contractor":
                # Release full amount to contractor
                milestones[milestone_idx]["status"] = "paid"
                milestones[milestone_idx]["escrow_status"] = "released"
                milestones[milestone_idx]["paid_at"] = datetime.now(timezone.utc).isoformat()
                milestones[milestone_idx]["has_dispute"] = False
                
                total_paid = contract.get("total_paid", 0) + amount
                
                await db.contracts.update_one(
                    {"id": contract.get("id")},
                    {"$set": {
                        "milestones": milestones,
                        "total_paid": total_paid,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
            elif data.resolution == "refund_to_employer":
                # Refund to employer (mark as refunded)
                milestones[milestone_idx]["status"] = "refunded"
                milestones[milestone_idx]["escrow_status"] = "refunded"
                milestones[milestone_idx]["has_dispute"] = False
                
                escrow_funded = max(0, contract.get("escrow_funded", 0) - amount)
                
                await db.contracts.update_one(
                    {"id": contract.get("id")},
                    {"$set": {
                        "milestones": milestones,
                        "escrow_funded": escrow_funded,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
            elif data.resolution == "partial_release":
                # Partial release
                contractor_amount = data.contractor_amount or 0
                employer_refund = amount - contractor_amount
                
                milestones[milestone_idx]["status"] = "paid"
                milestones[milestone_idx]["escrow_status"] = "released"
                milestones[milestone_idx]["paid_at"] = datetime.now(timezone.utc).isoformat()
                milestones[milestone_idx]["has_dispute"] = False
                milestones[milestone_idx]["partial_payment"] = {
                    "contractor_received": contractor_amount,
                    "employer_refunded": employer_refund
                }
                
                total_paid = contract.get("total_paid", 0) + contractor_amount
                escrow_funded = max(0, contract.get("escrow_funded", 0) - employer_refund)
                
                await db.contracts.update_one(
                    {"id": contract.get("id")},
                    {"$set": {
                        "milestones": milestones,
                        "total_paid": total_paid,
                        "escrow_funded": escrow_funded,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            
            # Update dispute
            await db.escrow_disputes.update_one(
                {"id": dispute_id},
                {"$set": {
                    "status": "resolved",
                    "resolution": data.resolution,
                    "resolution_notes": data.notes,
                    "resolved_by": current_user.id,
                    "resolved_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Notify contractor
            try:
                await email_service.send_generic_email(
                    to_email=contract.get("contractor_email"),
                    subject=f"Dispute Resolved - {contract.get('title')}",
                    message=f"""
                    <p>The dispute for milestone <strong>{milestones[milestone_idx].get('title')}</strong> has been resolved.</p>
                    <p><strong>Resolution:</strong> {data.resolution.replace('_', ' ').title()}</p>
                    <p><strong>Notes:</strong> {data.notes or 'No additional notes'}</p>
                    """
                )
            except Exception as email_err:
                logger.warning(f"Failed to send dispute resolution email: {email_err}")
            
            return {
                "success": True,
                "message": f"Dispute resolved: {data.resolution.replace('_', ' ').title()}"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error resolving dispute: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @payments_router.post("/escrow/refund/{contract_id}/{milestone_id}")
    async def request_escrow_refund(
        contract_id: str,
        milestone_id: str,
        current_user = Depends(get_current_user)
    ):
        """Request refund for a funded milestone (before work starts)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can request refunds")
            
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            milestone = milestones[milestone_idx]
            
            if milestone.get("escrow_status") != "funded":
                raise HTTPException(status_code=400, detail="Milestone is not funded")
            
            # Can only refund if work hasn't started
            if milestone.get("status") in ["submitted", "approved", "paid"]:
                raise HTTPException(status_code=400, detail="Cannot refund after work has been submitted. Use dispute process instead.")
            
            amount = milestone.get("amount", 0)
            
            # Process refund
            milestones[milestone_idx]["escrow_status"] = "refunded"
            milestones[milestone_idx]["refunded_at"] = datetime.now(timezone.utc).isoformat()
            
            escrow_funded = max(0, contract.get("escrow_funded", 0) - amount)
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "escrow_funded": escrow_funded,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Record refund transaction
            refund_transaction = {
                "id": str(uuid.uuid4()),
                "type": "escrow_refund",
                "contract_id": contract_id,
                "milestone_id": milestone_id,
                "user_id": current_user.id,
                "amount": amount,
                "currency": contract.get("payment_currency", "USD"),
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.payment_transactions.insert_one(refund_transaction)
            
            return {
                "success": True,
                "message": f"Refund processed for {contract.get('payment_currency', 'USD')} {amount:,.2f}"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing refund: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== AUTO-RELEASE SETTINGS ====================
    
    class AutoReleaseSettings(BaseModel):
        enabled: bool = True
        days_after_submission: int = 14  # Auto-release after X days if no response
    
    @payments_router.post("/escrow/auto-release-settings/{contract_id}")
    async def update_auto_release_settings(
        contract_id: str,
        data: AutoReleaseSettings,
        current_user = Depends(get_current_user)
    ):
        """Update auto-release settings for a contract"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Both parties must agree to auto-release settings
            if contract.get("employer_id") != current_user.id and contract.get("contractor_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "auto_release_settings": {
                        "enabled": data.enabled,
                        "days_after_submission": data.days_after_submission,
                        "updated_by": current_user.id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "success": True,
                "message": f"Auto-release {'enabled' if data.enabled else 'disabled'} ({data.days_after_submission} days)"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating auto-release settings: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @payments_router.get("/escrow/check-auto-release")
    async def check_auto_release_milestones(
        current_user = Depends(get_current_user)
    ):
        """Check for milestones that should be auto-released (admin/system use)"""
        try:
            if current_user.role != "super_admin":
                raise HTTPException(status_code=403, detail="Admin only")
            
            # Find contracts with auto-release enabled
            contracts = await db.contracts.find({
                "auto_release_settings.enabled": True,
                "status": "active"
            }, {"_id": 0}).to_list(length=1000)
            
            auto_release_candidates = []
            now = datetime.now(timezone.utc)
            
            for contract in contracts:
                days_limit = contract.get("auto_release_settings", {}).get("days_after_submission", 14)
                
                for m in contract.get("milestones", []):
                    if m.get("status") == "submitted" and m.get("escrow_status") == "funded":
                        submitted_at = m.get("submitted_at")
                        if submitted_at:
                            submitted_date = datetime.fromisoformat(submitted_at.replace("Z", "+00:00"))
                            days_since = (now - submitted_date).days
                            
                            if days_since >= days_limit:
                                auto_release_candidates.append({
                                    "contract_id": contract.get("id"),
                                    "contract_title": contract.get("title"),
                                    "milestone_id": m.get("id"),
                                    "milestone_title": m.get("title"),
                                    "amount": m.get("amount"),
                                    "currency": contract.get("payment_currency", "USD"),
                                    "days_since_submission": days_since,
                                    "auto_release_limit": days_limit,
                                    "contractor_id": contract.get("contractor_id"),
                                    "employer_id": contract.get("employer_id")
                                })
            
            return {
                "success": True,
                "candidates": auto_release_candidates,
                "count": len(auto_release_candidates)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking auto-release: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== ESCROW STATEMENTS ====================
    
    @payments_router.get("/escrow/statement/{contract_id}")
    async def generate_escrow_statement(
        contract_id: str,
        current_user = Depends(get_current_user)
    ):
        """Generate escrow statement data for a contract"""
        try:
            contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id and contract.get("contractor_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            transactions = await db.payment_transactions.find(
                {"contract_id": contract_id},
                {"_id": 0}
            ).sort("created_at", 1).to_list(length=500)
            
            # Build statement
            statement_entries = []
            running_balance = 0
            
            for t in transactions:
                if t.get("type") in ["contract_funding", "milestone_funding"] and t.get("status") == "completed":
                    running_balance += t.get("amount", 0)
                    statement_entries.append({
                        "date": t.get("created_at"),
                        "type": "DEPOSIT",
                        "description": f"Funding: {t.get('type').replace('_', ' ').title()}",
                        "milestone": t.get("milestone_id"),
                        "credit": t.get("amount"),
                        "debit": 0,
                        "balance": running_balance
                    })
                elif t.get("type") == "milestone_release":
                    running_balance -= t.get("amount", 0)
                    statement_entries.append({
                        "date": t.get("created_at"),
                        "type": "RELEASE",
                        "description": "Payment released to contractor",
                        "milestone": t.get("milestone_id"),
                        "credit": 0,
                        "debit": t.get("amount"),
                        "balance": running_balance
                    })
                elif t.get("type") == "escrow_refund":
                    running_balance -= t.get("amount", 0)
                    statement_entries.append({
                        "date": t.get("created_at"),
                        "type": "REFUND",
                        "description": "Refund to employer",
                        "milestone": t.get("milestone_id"),
                        "credit": 0,
                        "debit": t.get("amount"),
                        "balance": running_balance
                    })
            
            return {
                "success": True,
                "statement": {
                    "contract": {
                        "id": contract.get("id"),
                        "title": contract.get("title"),
                        "employer": contract.get("employer_name"),
                        "contractor": contract.get("contractor_name"),
                        "currency": contract.get("payment_currency", "USD"),
                        "total_value": contract.get("payment_amount"),
                        "status": contract.get("status")
                    },
                    "summary": {
                        "total_funded": contract.get("escrow_funded", 0),
                        "total_released": contract.get("total_paid", 0),
                        "current_balance": running_balance
                    },
                    "entries": statement_entries,
                    "generated_at": datetime.now(timezone.utc).isoformat()
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating statement: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return payments_router
