"""
Reseller CV Limit Service
Tracks CV usage per reseller and enforces monthly limits based on their plan.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Plan limits configuration
RESELLER_PLAN_LIMITS = {
    "starter": {
        "monthly_cv_limit": 1000,
        "name": "Starter"
    },
    "professional": {
        "monthly_cv_limit": 3500,
        "name": "Professional"
    },
    "enterprise": {
        "monthly_cv_limit": -1,  # -1 means unlimited
        "name": "Enterprise"
    },
    "custom": {
        "monthly_cv_limit": -1,  # Same as enterprise
        "name": "Enterprise"
    }
}


class ResellerCVLimitService:
    """Service to track and enforce CV limits for resellers"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def _get_current_month_range(self) -> Tuple[datetime, datetime]:
        """Get the start and end of the current month"""
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get start of next month
        if now.month == 12:
            end_of_month = start_of_month.replace(year=now.year + 1, month=1)
        else:
            end_of_month = start_of_month.replace(month=now.month + 1)
        
        return start_of_month, end_of_month
    
    async def get_reseller_plan(self, reseller_id: str) -> Optional[Dict]:
        """Get the reseller's current plan"""
        reseller = await self.db.resellers.find_one(
            {"id": reseller_id},
            {"_id": 0, "subscription_plan": 1, "id": 1, "company_name": 1}
        )
        return reseller
    
    async def get_cv_usage(self, reseller_id: str) -> Dict:
        """
        Get the current month's CV usage for a reseller.
        Returns usage stats and limit info.
        """
        start_of_month, end_of_month = self._get_current_month_range()
        
        # Get reseller info
        reseller = await self.db.resellers.find_one(
            {"id": reseller_id},
            {"_id": 0, "subscription_plan": 1, "company_name": 1}
        )
        
        if not reseller:
            return {"error": "Reseller not found"}
        
        plan_key = reseller.get("subscription_plan", "starter").lower()
        plan_limits = RESELLER_PLAN_LIMITS.get(plan_key, RESELLER_PLAN_LIMITS["starter"])
        
        # Count CVs created this month for this reseller's customers
        cv_count = await self.db.cv_documents.count_documents({
            "reseller_id": reseller_id,
            "created_at": {
                "$gte": start_of_month,
                "$lt": end_of_month
            }
        })
        
        # Also count from cv_generations collection if exists
        cv_gen_count = await self.db.cv_generations.count_documents({
            "reseller_id": reseller_id,
            "created_at": {
                "$gte": start_of_month,
                "$lt": end_of_month
            }
        })
        
        total_cvs = cv_count + cv_gen_count
        monthly_limit = plan_limits["monthly_cv_limit"]
        
        # Calculate percentage used
        if monthly_limit == -1:
            percentage_used = 0
            remaining = -1  # Unlimited
        else:
            percentage_used = (total_cvs / monthly_limit) * 100 if monthly_limit > 0 else 100
            remaining = max(0, monthly_limit - total_cvs)
        
        return {
            "reseller_id": reseller_id,
            "company_name": reseller.get("company_name"),
            "plan": plan_key,
            "plan_name": plan_limits["name"],
            "monthly_limit": monthly_limit,
            "cvs_used": total_cvs,
            "cvs_remaining": remaining,
            "percentage_used": round(percentage_used, 1),
            "is_unlimited": monthly_limit == -1,
            "limit_reached": monthly_limit != -1 and total_cvs >= monthly_limit,
            "month": start_of_month.strftime("%B %Y"),
            "reset_date": end_of_month.isoformat()
        }
    
    async def check_can_create_cv(self, reseller_id: str) -> Dict:
        """
        Check if a reseller can create more CVs this month.
        Returns whether creation is allowed and relevant messages.
        """
        usage = await self.get_cv_usage(reseller_id)
        
        if usage.get("error"):
            return {
                "allowed": False,
                "reason": usage["error"]
            }
        
        if usage["is_unlimited"]:
            return {
                "allowed": True,
                "message": "Unlimited CV creation available",
                "usage": usage
            }
        
        if usage["limit_reached"]:
            return {
                "allowed": False,
                "reason": "monthly_limit_reached",
                "message": f"You have reached your monthly CV limit of {usage['monthly_limit']:,} CVs for your {usage['plan_name']} plan.",
                "upgrade_message": self._get_upgrade_message(usage["plan"]),
                "usage": usage
            }
        
        # Warning if approaching limit (>80%)
        warning = None
        if usage["percentage_used"] >= 80:
            warning = f"You have used {usage['percentage_used']}% of your monthly CV limit ({usage['cvs_used']:,}/{usage['monthly_limit']:,})."
        
        return {
            "allowed": True,
            "warning": warning,
            "usage": usage
        }
    
    def _get_upgrade_message(self, current_plan: str) -> Optional[str]:
        """Get the appropriate upgrade message based on current plan"""
        if current_plan == "starter":
            return "Upgrade to Professional plan for 3,500 CVs/month, or Enterprise for unlimited CVs."
        elif current_plan == "professional":
            return "Upgrade to Enterprise plan for unlimited CV creation."
        return None
    
    async def record_cv_creation(self, reseller_id: str, user_id: str, cv_type: str = "cv") -> Dict:
        """
        Record a CV creation for tracking purposes.
        This should be called whenever a CV is created/generated.
        """
        try:
            await self.db.cv_usage_log.insert_one({
                "reseller_id": reseller_id,
                "user_id": user_id,
                "cv_type": cv_type,
                "created_at": datetime.now(timezone.utc)
            })
            
            return {"success": True}
        except Exception as e:
            logger.error(f"Error recording CV creation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_usage_summary_for_dashboard(self, reseller_id: str) -> Dict:
        """
        Get a summary suitable for displaying on the reseller dashboard.
        """
        usage = await self.get_cv_usage(reseller_id)
        
        if usage.get("error"):
            return usage
        
        # Determine alert level
        alert_level = "normal"
        if usage["limit_reached"]:
            alert_level = "critical"
        elif usage["percentage_used"] >= 90:
            alert_level = "warning"
        elif usage["percentage_used"] >= 80:
            alert_level = "caution"
        
        return {
            **usage,
            "alert_level": alert_level,
            "show_upgrade_prompt": usage["limit_reached"] or usage["percentage_used"] >= 80,
            "display_text": self._format_display_text(usage)
        }
    
    def _format_display_text(self, usage: Dict) -> str:
        """Format usage for display"""
        if usage["is_unlimited"]:
            return f"{usage['cvs_used']:,} CVs created this month (Unlimited)"
        
        return f"{usage['cvs_used']:,} / {usage['monthly_limit']:,} CVs used this month"


# Factory function to create service instance
def create_cv_limit_service(db: AsyncIOMotorDatabase) -> ResellerCVLimitService:
    return ResellerCVLimitService(db)
