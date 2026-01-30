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
                "description": "International payments (USD, ZAR)",
                "public_key": settings.get("stripe_public_key"),
                "currencies": ["USD", "ZAR"]
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
        """Fund contract using Yoco - returns payment details for frontend SDK"""
        YOCO_SECRET_KEY = settings.get("yoco_secret_key")
        YOCO_PUBLIC_KEY = settings.get("yoco_public_key")
        
        if not YOCO_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Yoco not configured")
        
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
                raise HTTPException(status_code=400, detail="Yoco only supports ZAR currency")
            
            total_amount = contract.get("payment_amount", 0)
            already_funded = contract.get("escrow_funded", 0)
            amount_to_fund = total_amount - already_funded
            
            if amount_to_fund <= 0:
                raise HTTPException(status_code=400, detail="Contract is already fully funded")
            
            # Create payment record for Yoco
            payment_id = str(uuid.uuid4())
            
            transaction = {
                "id": payment_id,
                "session_id": payment_id,  # Use payment_id as session_id for Yoco
                "type": "contract_funding",
                "provider": "yoco",
                "contract_id": data.contract_id,
                "milestone_id": None,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "amount": amount_to_fund,
                "amount_cents": int(amount_to_fund * 100),  # Yoco uses cents
                "currency": "ZAR",
                "payment_status": "pending",
                "status": "initiated",
                "idempotency_key": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(transaction)
            
            # Return payment details for frontend to use with Yoco SDK
            return {
                "success": True,
                "provider": "yoco",
                "payment_id": payment_id,
                "public_key": YOCO_PUBLIC_KEY,
                "amount_cents": int(amount_to_fund * 100),
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
        """Fund milestone using Yoco"""
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
                raise HTTPException(status_code=400, detail="Yoco only supports ZAR currency")
            
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
            
            transaction = {
                "id": payment_id,
                "session_id": payment_id,
                "type": "milestone_funding",
                "provider": "yoco",
                "contract_id": data.contract_id,
                "milestone_id": data.milestone_id,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "amount": amount,
                "amount_cents": int(amount * 100),
                "currency": "ZAR",
                "payment_status": "pending",
                "status": "initiated",
                "idempotency_key": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.insert_one(transaction)
            
            return {
                "success": True,
                "provider": "yoco",
                "payment_id": payment_id,
                "public_key": YOCO_PUBLIC_KEY,
                "amount_cents": int(amount * 100),
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
    
    return payments_router
