"""
WebSocket Notifications Service
Handles real-time notifications via WebSocket connections
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import json
import uuid
import logging
import asyncio

logger = logging.getLogger(__name__)

websocket_router = APIRouter(prefix="/api/ws", tags=["WebSocket"])


class NotificationCreate(BaseModel):
    type: str  # new_proposal, contract_update, milestone_funded, etc.
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[dict] = None


class ConnectionManager:
    """Manages WebSocket connections for all users"""
    
    def __init__(self):
        # user_id -> list of websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}. Total connections: {len(self.active_connections.get(user_id, []))}")
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        async with self._lock:
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user {user_id}")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to all connections of a specific user"""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send to user {user_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected sockets
            for conn in disconnected:
                await self.disconnect(conn, user_id)
    
    async def broadcast(self, message: dict, exclude_user: str = None):
        """Broadcast message to all connected users"""
        for user_id, connections in list(self.active_connections.items()):
            if exclude_user and user_id == exclude_user:
                continue
            await self.send_to_user(user_id, message)
    
    def is_user_connected(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Global connection manager instance
manager = ConnectionManager()


def get_websocket_routes(db, get_current_user, decode_token_func):
    """Factory function to create WebSocket routes with dependencies"""
    
    async def get_user_from_token(token: str):
        """Validate token and return user"""
        try:
            payload = decode_token_func(token)
            if not payload:
                return None
            # JWT stores email in 'sub' field
            email = payload.get("sub")
            if not email:
                return None
            user = await db.users.find_one({"email": email}, {"_id": 0})
            return user
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None
    
    @websocket_router.websocket("/notifications")
    async def websocket_endpoint(websocket: WebSocket, token: str = None):
        """WebSocket endpoint for real-time notifications"""
        if not token:
            await websocket.close(code=4001, reason="Token required")
            return
        
        user = await get_user_from_token(token)
        if not user:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        user_id = user.get("id")
        await manager.connect(websocket, user_id)
        
        try:
            # Send initial unread count
            unread_count = await db.notifications.count_documents({
                "user_id": user_id,
                "read": False
            })
            await websocket.send_json({
                "type": "init",
                "unread_count": unread_count
            })
            
            # Keep connection alive and handle incoming messages
            while True:
                try:
                    data = await asyncio.wait_for(websocket.receive_json(), timeout=30)
                    
                    # Handle ping/pong for keepalive
                    if data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                    
                    # Handle mark as read
                    elif data.get("type") == "mark_read":
                        notification_id = data.get("notification_id")
                        if notification_id:
                            await db.notifications.update_one(
                                {"id": notification_id, "user_id": user_id},
                                {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
                            )
                            unread_count = await db.notifications.count_documents({
                                "user_id": user_id,
                                "read": False
                            })
                            await websocket.send_json({
                                "type": "unread_count",
                                "count": unread_count
                            })
                    
                    # Handle mark all as read
                    elif data.get("type") == "mark_all_read":
                        await db.notifications.update_many(
                            {"user_id": user_id, "read": False},
                            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
                        )
                        await websocket.send_json({
                            "type": "unread_count",
                            "count": 0
                        })
                        
                except asyncio.TimeoutError:
                    # Send ping to check if connection is alive
                    try:
                        await websocket.send_json({"type": "ping"})
                    except:
                        break
                        
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected normally for user {user_id}")
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}")
        finally:
            await manager.disconnect(websocket, user_id)
    
    @websocket_router.get("/notifications")
    async def get_notifications(
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False,
        current_user = Depends(get_current_user)
    ):
        """Get user's notifications"""
        try:
            query = {"user_id": current_user.id}
            if unread_only:
                query["read"] = False
            
            notifications = await db.notifications.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
            
            total = await db.notifications.count_documents(query)
            unread_count = await db.notifications.count_documents({
                "user_id": current_user.id,
                "read": False
            })
            
            return {
                "success": True,
                "notifications": notifications,
                "total": total,
                "unread_count": unread_count
            }
        except Exception as e:
            logger.error(f"Error getting notifications: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @websocket_router.post("/notifications/{notification_id}/read")
    async def mark_notification_read(
        notification_id: str,
        current_user = Depends(get_current_user)
    ):
        """Mark a notification as read"""
        try:
            result = await db.notifications.update_one(
                {"id": notification_id, "user_id": current_user.id},
                {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            if result.modified_count == 0:
                raise HTTPException(status_code=404, detail="Notification not found")
            
            unread_count = await db.notifications.count_documents({
                "user_id": current_user.id,
                "read": False
            })
            
            return {"success": True, "unread_count": unread_count}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error marking notification read: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @websocket_router.post("/notifications/read-all")
    async def mark_all_notifications_read(current_user = Depends(get_current_user)):
        """Mark all notifications as read"""
        try:
            await db.notifications.update_many(
                {"user_id": current_user.id, "read": False},
                {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            return {"success": True, "unread_count": 0}
        except Exception as e:
            logger.error(f"Error marking all notifications read: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return websocket_router


async def create_notification(db, user_id: str, notification_type: str, title: str, message: str, link: str = None, metadata: dict = None):
    """
    Create a notification and send it via WebSocket if user is connected
    
    Args:
        db: Database instance
        user_id: Target user's ID
        notification_type: Type of notification (new_proposal, contract_update, etc.)
        title: Notification title
        message: Notification message
        link: Optional link to navigate to
        metadata: Optional additional data
    """
    try:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "link": link,
            "metadata": metadata or {},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store in database
        await db.notifications.insert_one(notification)
        
        # Remove _id for WebSocket transmission
        notification.pop("_id", None)
        
        # Send via WebSocket if user is connected
        if manager.is_user_connected(user_id):
            await manager.send_to_user(user_id, {
                "type": "notification",
                "notification": notification
            })
            
            # Also send updated unread count
            unread_count = await db.notifications.count_documents({
                "user_id": user_id,
                "read": False
            })
            await manager.send_to_user(user_id, {
                "type": "unread_count",
                "count": unread_count
            })
        
        logger.info(f"Created notification for user {user_id}: {notification_type}")
        return notification
        
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        return None
