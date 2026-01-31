"""
Push Notifications Routes - API endpoints for Web Push Notifications
Handles push subscription management and notification sending
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging
import json
import os

logger = logging.getLogger(__name__)

push_router = APIRouter(prefix="/api/push", tags=["Push Notifications"])


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # {p256dh, auth}
    expirationTime: Optional[int] = None


class PushNotification(BaseModel):
    user_id: str
    title: str
    body: str
    icon: Optional[str] = None
    link: Optional[str] = None
    data: Optional[dict] = None


def get_push_routes(db, get_current_user):
    """Factory function to create push notification routes with dependencies"""
    
    @push_router.post("/subscribe")
    async def subscribe_push(
        subscription: PushSubscription,
        current_user = Depends(get_current_user)
    ):
        """Subscribe a device for push notifications"""
        try:
            # Check if subscription already exists
            existing = await db.push_subscriptions.find_one({
                "user_id": current_user.id,
                "endpoint": subscription.endpoint
            })
            
            if existing:
                # Update existing subscription
                await db.push_subscriptions.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "keys": subscription.keys,
                        "expiration_time": subscription.expirationTime,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return {"success": True, "message": "Subscription updated"}
            
            # Create new subscription
            sub_doc = {
                "id": str(uuid.uuid4()),
                "user_id": current_user.id,
                "endpoint": subscription.endpoint,
                "keys": subscription.keys,
                "expiration_time": subscription.expirationTime,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.push_subscriptions.insert_one(sub_doc)
            
            logger.info(f"Push subscription created for user {current_user.email}")
            
            return {"success": True, "message": "Subscription created"}
            
        except Exception as e:
            logger.error(f"Error subscribing to push: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @push_router.delete("/subscribe")
    async def unsubscribe_push(
        endpoint: str,
        current_user = Depends(get_current_user)
    ):
        """Unsubscribe a device from push notifications"""
        try:
            result = await db.push_subscriptions.delete_one({
                "user_id": current_user.id,
                "endpoint": endpoint
            })
            
            if result.deleted_count == 0:
                return {"success": True, "message": "Subscription not found"}
            
            logger.info(f"Push subscription removed for user {current_user.email}")
            
            return {"success": True, "message": "Unsubscribed successfully"}
            
        except Exception as e:
            logger.error(f"Error unsubscribing from push: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @push_router.get("/status")
    async def get_push_status(current_user = Depends(get_current_user)):
        """Get push notification subscription status for current user"""
        try:
            subscriptions = await db.push_subscriptions.find(
                {"user_id": current_user.id},
                {"_id": 0, "endpoint": 1, "created_at": 1}
            ).to_list(length=10)
            
            return {
                "success": True,
                "subscribed": len(subscriptions) > 0,
                "subscription_count": len(subscriptions),
                "subscriptions": subscriptions
            }
            
        except Exception as e:
            logger.error(f"Error getting push status: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @push_router.get("/vapid-key")
    async def get_vapid_public_key():
        """Get the VAPID public key for push subscription"""
        # Get VAPID keys from environment or database
        vapid_public = os.environ.get("VAPID_PUBLIC_KEY")
        
        if not vapid_public:
            # Check database for settings
            settings = await db.platform_settings.find_one({"key": "push_notifications"})
            if settings:
                vapid_public = settings.get("vapid_public_key")
        
        if not vapid_public:
            raise HTTPException(
                status_code=500,
                detail="Push notifications not configured. VAPID keys required."
            )
        
        return {"success": True, "vapid_public_key": vapid_public}
    
    return push_router


async def send_push_notification(db, user_id: str, title: str, body: str, link: str = None, data: dict = None):
    """
    Send a push notification to all of a user's subscribed devices
    
    Args:
        db: Database instance
        user_id: Target user's ID
        title: Notification title
        body: Notification body text
        link: Optional URL to open when notification is clicked
        data: Optional additional data
    """
    try:
        from pywebpush import webpush, WebPushException
        
        # Get VAPID keys
        vapid_private = os.environ.get("VAPID_PRIVATE_KEY")
        vapid_public = os.environ.get("VAPID_PUBLIC_KEY")
        vapid_claims = {"sub": os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:admin@upshift.works")}
        
        if not vapid_private or not vapid_public:
            # Try database settings
            settings = await db.platform_settings.find_one({"key": "push_notifications"})
            if settings:
                vapid_private = settings.get("vapid_private_key")
                vapid_public = settings.get("vapid_public_key")
        
        if not vapid_private or not vapid_public:
            logger.warning("Push notifications not configured - VAPID keys missing")
            return False
        
        # Get all subscriptions for this user
        subscriptions = await db.push_subscriptions.find(
            {"user_id": user_id}
        ).to_list(length=100)
        
        if not subscriptions:
            logger.debug(f"No push subscriptions found for user {user_id}")
            return False
        
        # Prepare notification payload
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/logo192.png",
            "badge": "/logo192.png",
            "data": {
                "link": link,
                **(data or {})
            }
        })
        
        # Send to all subscriptions
        success_count = 0
        failed_endpoints = []
        
        for sub in subscriptions:
            subscription_info = {
                "endpoint": sub["endpoint"],
                "keys": sub["keys"]
            }
            
            try:
                webpush(
                    subscription_info=subscription_info,
                    data=payload,
                    vapid_private_key=vapid_private,
                    vapid_claims=vapid_claims
                )
                success_count += 1
            except WebPushException as e:
                logger.warning(f"Push failed for endpoint: {e}")
                # If subscription is invalid, mark for removal
                if e.response and e.response.status_code in [404, 410]:
                    failed_endpoints.append(sub["endpoint"])
        
        # Remove invalid subscriptions
        if failed_endpoints:
            await db.push_subscriptions.delete_many({
                "user_id": user_id,
                "endpoint": {"$in": failed_endpoints}
            })
            logger.info(f"Removed {len(failed_endpoints)} invalid push subscriptions")
        
        logger.info(f"Push notification sent to {success_count}/{len(subscriptions)} devices for user {user_id}")
        return success_count > 0
        
    except ImportError:
        logger.warning("pywebpush not installed - push notifications disabled")
        return False
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
        return False
