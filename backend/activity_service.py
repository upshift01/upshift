"""
Activity Logging Service - Centralized activity tracking for user and reseller dashboards
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import uuid4

logger = logging.getLogger(__name__)

# Activity types
ACTIVITY_TYPES = {
    "cv_created": {"title": "CV Created", "icon": "FileText", "color": "blue"},
    "cv_downloaded": {"title": "CV Downloaded", "icon": "Download", "color": "green"},
    "cv_enhanced": {"title": "CV Enhanced by AI", "icon": "Sparkles", "color": "purple"},
    "ats_check": {"title": "ATS Check Performed", "icon": "CheckCircle", "color": "orange"},
    "cover_letter": {"title": "Cover Letter Created", "icon": "FileText", "color": "teal"},
    "skills_generated": {"title": "Skills Generated", "icon": "Zap", "color": "yellow"},
    "resume_improved": {"title": "Resume Improved", "icon": "TrendingUp", "color": "green"},
    "payment": {"title": "Payment Made", "icon": "CreditCard", "color": "green"},
    "signup": {"title": "Account Created", "icon": "UserPlus", "color": "blue"},
    "login": {"title": "Logged In", "icon": "LogIn", "color": "gray"},
    "profile_updated": {"title": "Profile Updated", "icon": "User", "color": "blue"},
    "template_used": {"title": "Template Used", "icon": "Layout", "color": "purple"},
}

class ActivityService:
    def __init__(self, db):
        self.db = db
    
    async def log_activity(
        self,
        user_id: str,
        activity_type: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        reseller_id: Optional[str] = None
    ) -> str:
        """
        Log a user activity
        
        Args:
            user_id: ID of the user performing the action
            activity_type: Type of activity (see ACTIVITY_TYPES)
            description: Human-readable description
            metadata: Additional data about the activity
            reseller_id: If the user belongs to a reseller
            
        Returns:
            str: The activity ID
        """
        try:
            activity_info = ACTIVITY_TYPES.get(activity_type, {
                "title": activity_type.replace("_", " ").title(),
                "icon": "Activity",
                "color": "gray"
            })
            
            activity_id = str(uuid4())
            activity = {
                "id": activity_id,
                "user_id": user_id,
                "type": activity_type,
                "title": activity_info["title"],
                "description": description,
                "icon": activity_info["icon"],
                "color": activity_info["color"],
                "metadata": metadata or {},
                "reseller_id": reseller_id,
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db.user_activity.insert_one(activity)
            
            # Also log to reseller activity if applicable
            if reseller_id:
                await self._log_reseller_activity(
                    reseller_id=reseller_id,
                    user_id=user_id,
                    activity_type=activity_type,
                    description=description,
                    metadata=metadata
                )
            
            logger.debug(f"Activity logged: {activity_type} for user {user_id}")
            return activity_id
            
        except Exception as e:
            logger.error(f"Error logging activity: {str(e)}")
            return ""
    
    async def _log_reseller_activity(
        self,
        reseller_id: str,
        user_id: str,
        activity_type: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log activity for reseller dashboard"""
        try:
            # Get user info for display
            user = await self.db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1, "email": 1})
            user_name = user.get("full_name", "Unknown") if user else "Unknown"
            user_email = user.get("email", "") if user else ""
            
            activity_info = ACTIVITY_TYPES.get(activity_type, {"title": activity_type})
            
            reseller_activity = {
                "id": str(uuid4()),
                "reseller_id": reseller_id,
                "user_id": user_id,
                "type": activity_type,
                "title": activity_info["title"],
                "description": description or f"{user_name} - {activity_info['title']}",
                "customer_name": user_name,
                "customer_email": user_email,
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db.reseller_activity.insert_one(reseller_activity)
            
        except Exception as e:
            logger.error(f"Error logging reseller activity: {str(e)}")
    
    async def get_user_activities(
        self,
        user_id: str,
        limit: int = 20,
        activity_types: Optional[list] = None
    ) -> list:
        """Get recent activities for a user"""
        query = {"user_id": user_id}
        if activity_types:
            query["type"] = {"$in": activity_types}
        
        activities = await self.db.user_activity.find(
            query, 
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return activities
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get activity statistics for a user"""
        from datetime import timedelta
        
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=now.weekday())
        
        # Total counts
        total_activities = await self.db.user_activity.count_documents({"user_id": user_id})
        
        # This month
        month_activities = await self.db.user_activity.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": month_start}
        })
        
        # This week
        week_activities = await self.db.user_activity.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": week_start}
        })
        
        # By type
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$type", "count": {"$sum": 1}}}
        ]
        type_counts = await self.db.user_activity.aggregate(pipeline).to_list(100)
        by_type = {item["_id"]: item["count"] for item in type_counts}
        
        return {
            "total_activities": total_activities,
            "this_month": month_activities,
            "this_week": week_activities,
            "by_type": by_type
        }
    
    async def get_reseller_stats(self, reseller_id: str) -> Dict[str, Any]:
        """Get activity statistics for reseller dashboard"""
        from datetime import timedelta
        
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=now.weekday())
        
        # Total customers
        total_customers = await self.db.users.count_documents({
            "reseller_id": reseller_id,
            "role": "customer"
        })
        
        # Active this month
        active_customers = await self.db.user_activity.distinct("user_id", {
            "reseller_id": reseller_id,
            "created_at": {"$gte": month_start}
        })
        
        # Total activities
        total_activities = await self.db.reseller_activity.count_documents({
            "reseller_id": reseller_id
        })
        
        # This month activities
        month_activities = await self.db.reseller_activity.count_documents({
            "reseller_id": reseller_id,
            "created_at": {"$gte": month_start}
        })
        
        # Signups this month
        month_signups = await self.db.reseller_activity.count_documents({
            "reseller_id": reseller_id,
            "type": "signup",
            "created_at": {"$gte": month_start}
        })
        
        # By type
        pipeline = [
            {"$match": {"reseller_id": reseller_id}},
            {"$group": {"_id": "$type", "count": {"$sum": 1}}}
        ]
        type_counts = await self.db.reseller_activity.aggregate(pipeline).to_list(100)
        by_type = {item["_id"]: item["count"] for item in type_counts}
        
        return {
            "total_customers": total_customers,
            "active_customers": len(active_customers),
            "total_activities": total_activities,
            "this_month_activities": month_activities,
            "month_signups": month_signups,
            "by_type": by_type
        }


# Helper function to get activity service instance
def get_activity_service(db):
    return ActivityService(db)
