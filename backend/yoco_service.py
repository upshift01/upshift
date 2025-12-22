import httpx
from typing import Dict, Optional
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class YocoService:
    """Service for interacting with Yoco Payment Gateway API."""
    
    def __init__(self, secret_key: Optional[str] = None, public_key: Optional[str] = None):
        self.base_url = "https://payments.yoco.com/api/checkouts"
        self.public_key = public_key or os.environ.get('YOCO_PUBLIC_KEY')
        self.secret_key = secret_key or os.environ.get('YOCO_SECRET_KEY')
        
        if not self.secret_key:
            logger.warning("YOCO_SECRET_KEY not configured")
    
    def is_configured(self) -> bool:
        """Check if Yoco is properly configured"""
        return bool(self.secret_key and self.public_key)
    
    async def create_checkout(
        self, 
        amount_cents: int, 
        email: str, 
        metadata: dict,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
        failure_url: Optional[str] = None
    ) -> Dict:
        """
        Create a Yoco checkout session.
        
        Args:
            amount_cents: Amount in cents (R100 = 10000 cents)
            email: Customer email
            metadata: Additional data to store with payment
            success_url: Custom success redirect URL
            cancel_url: Custom cancel redirect URL
            failure_url: Custom failure redirect URL
            
        Returns:
            Checkout response with redirectUrl and id
        """
        if not self.secret_key:
            raise Exception("Yoco secret key not configured")
            
        try:
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
            
            async with httpx.AsyncClient() as client:
                payload = {
                    "amount": amount_cents,
                    "currency": "ZAR",
                    "cancelUrl": cancel_url or f"{frontend_url}/payment/cancel",
                    "successUrl": success_url or f"{frontend_url}/payment/success",
                    "failureUrl": failure_url or f"{frontend_url}/payment/failure",
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
                
                # Yoco API returns 200 or 201 for successful checkout creation
                if response.status_code in [200, 201]:
                    result = response.json()
                    # Verify we got a valid checkout response
                    if result.get('id') and result.get('redirectUrl'):
                        logger.info(f"Yoco checkout created: {result.get('id')}")
                        return result
                    else:
                        logger.error(f"Invalid Yoco checkout response: {result}")
                        raise Exception("Invalid checkout response from Yoco")
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
        if not self.secret_key:
            raise Exception("Yoco secret key not configured")
            
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
    
    async def test_connection(self) -> Dict:
        """
        Test the Yoco API connection with current credentials.
        
        Returns:
            Dict with success status and message
        """
        if not self.secret_key:
            return {"success": False, "error": "Secret key not configured"}
        
        try:
            # Create a minimal test checkout request
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.secret_key}",
                    "Content-Type": "application/json"
                }
                
                # Try to access the API - we'll use a GET request that should work
                # We're testing with a deliberately small amount
                payload = {
                    "amount": 100,  # R1.00 in cents
                    "currency": "ZAR",
                    "cancelUrl": "https://example.com/cancel",
                    "successUrl": "https://example.com/success",
                    "failureUrl": "https://example.com/failure",
                    "metadata": {"test": True}
                }
                
                response = await client.post(
                    self.base_url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 201:
                    return {"success": True, "message": "Yoco API connection successful"}
                elif response.status_code == 401:
                    return {"success": False, "error": "Invalid API credentials"}
                elif response.status_code == 400:
                    # Bad request might mean keys are valid but request is wrong
                    error_data = response.json()
                    if "authentication" in str(error_data).lower():
                        return {"success": False, "error": "Invalid API credentials"}
                    return {"success": True, "message": "Yoco API credentials validated"}
                else:
                    return {"success": False, "error": f"API error: {response.status_code}"}
                    
        except httpx.TimeoutException:
            return {"success": False, "error": "Connection timeout"}
        except Exception as e:
            logger.error(f"Error testing Yoco connection: {str(e)}")
            return {"success": False, "error": str(e)}


# Helper function to get Yoco service with reseller credentials
async def get_yoco_service_for_reseller(db, reseller_id: Optional[str] = None) -> YocoService:
    """
    Get a YocoService instance with reseller-specific credentials if available.
    Falls back to platform default credentials from database, then environment.
    """
    # First, check for reseller-specific keys
    if reseller_id:
        reseller_yoco = await db.reseller_yoco_settings.find_one(
            {"reseller_id": reseller_id, "use_custom_keys": True},
            {"_id": 0}
        )
        if reseller_yoco and reseller_yoco.get("yoco_secret_key"):
            return YocoService(
                secret_key=reseller_yoco["yoco_secret_key"],
                public_key=reseller_yoco.get("yoco_public_key")
            )
    
    # Check for platform-level Yoco settings in database
    platform_settings = await db.platform_settings.find_one({"key": "yoco"}, {"_id": 0})
    if platform_settings and platform_settings.get("secret_key"):
        return YocoService(
            secret_key=platform_settings["secret_key"],
            public_key=platform_settings.get("public_key")
        )
    
    # Return default service (uses environment variables)
    return YocoService()


# Default service instance
yoco_service = YocoService()