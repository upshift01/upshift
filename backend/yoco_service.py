import httpx
from typing import Dict, Optional
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class YocoService:
    """Service for interacting with Yoco Payment Gateway API."""
    
    def __init__(self):
        self.base_url = "https://payments.yoco.com/api/checkouts"
        self.public_key = os.environ.get('YOCO_PUBLIC_KEY')
        self.secret_key = os.environ.get('YOCO_SECRET_KEY')
        
        if not self.secret_key:
            logger.warning("YOCO_SECRET_KEY not configured")
    
    async def create_checkout(self, amount_cents: int, email: str, metadata: dict) -> Dict:
        """
        Create a Yoco checkout session.
        
        Args:
            amount_cents: Amount in cents (R100 = 10000 cents)
            email: Customer email
            metadata: Additional data to store with payment
            
        Returns:
            Checkout response with redirectUrl and id
        """
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "amount": amount_cents,
                    "currency": "ZAR",
                    "cancelUrl": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/cancel",
                    "successUrl": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/success",
                    "failureUrl": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/failure",
                    "metadata": metadata
                }
                
                headers = {
                    "Authorization": f"Bearer {self.secret_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    self.base_url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 201:
                    return response.json()
                else:
                    logger.error(f"Yoco checkout creation failed: {response.status_code} - {response.text}")
                    raise Exception(f"Failed to create checkout: {response.text}")
                    
        except Exception as e:
            logger.error(f"Error creating Yoco checkout: {str(e)}")
            raise
    
    async def get_checkout(self, checkout_id: str) -> Dict:
        """
        Get checkout details by ID.
        
        Args:
            checkout_id: The Yoco checkout ID
            
        Returns:
            Checkout details including status
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.secret_key}"
                }
                
                response = await client.get(
                    f"{self.base_url}/{checkout_id}",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get checkout: {response.status_code} - {response.text}")
                    raise Exception(f"Failed to get checkout: {response.text}")
                    
        except Exception as e:
            logger.error(f"Error getting Yoco checkout: {str(e)}")
            raise
    
    async def verify_payment(self, checkout_id: str) -> bool:
        """
        Verify if a payment was successful.
        
        Args:
            checkout_id: The Yoco checkout ID
            
        Returns:
            True if payment succeeded, False otherwise
        """
        try:
            checkout = await self.get_checkout(checkout_id)
            status = checkout.get('status', '').upper()
            return status == 'SUCCESSFUL' or status == 'COMPLETED'
        except Exception as e:
            logger.error(f"Error verifying payment: {str(e)}")
            return False

yoco_service = YocoService()