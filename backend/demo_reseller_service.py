"""
Demo Reseller Service - TalentHub Demo Account Management

This service manages the demo reseller account "TalentHub" for the white-label demo.
It handles:
- Initial demo data setup
- Nightly reset at midnight SAST (UTC+2)
- Sample data generation (customers, CVs, transactions, etc.)
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Demo account constants
DEMO_RESELLER_SUBDOMAIN = "talenthub-demo"
DEMO_RESELLER_ID = "demo-talenthub-reseller-001"
DEMO_OWNER_ID = "demo-talenthub-owner-001"
DEMO_OWNER_EMAIL = "demo@talenthub.upshift.works"
DEMO_OWNER_PASSWORD = "demo123"  # Will be hashed

# TalentHub branding - Modern teal/coral color scheme
TALENTHUB_BRANDING = {
    "logo_url": None,  # Will use text logo
    "primary_color": "#0D9488",  # Teal-600
    "secondary_color": "#F97316",  # Orange-500
    "favicon_url": None,
    "brand_name": "TalentHub",
    "tagline": "Your Career, Elevated"
}

# Sample customer data
SAMPLE_CUSTOMERS = [
    {
        "email": "sarah.johnson@example.com",
        "full_name": "Sarah Johnson",
        "active_tier": "tier-3",
        "tier_name": "Executive Elite",
        "created_days_ago": 45
    },
    {
        "email": "michael.ndlovu@example.com",
        "full_name": "Michael Ndlovu",
        "active_tier": "tier-2",
        "tier_name": "Professional Package",
        "created_days_ago": 30
    },
    {
        "email": "priya.patel@example.com",
        "full_name": "Priya Patel",
        "active_tier": "tier-2",
        "tier_name": "Professional Package",
        "created_days_ago": 25
    },
    {
        "email": "james.van.der.berg@example.com",
        "full_name": "James van der Berg",
        "active_tier": "tier-1",
        "tier_name": "ATS Optimise",
        "created_days_ago": 20
    },
    {
        "email": "nomsa.dlamini@example.com",
        "full_name": "Nomsa Dlamini",
        "active_tier": "tier-1",
        "tier_name": "ATS Optimise",
        "created_days_ago": 15
    },
    {
        "email": "david.smith@example.com",
        "full_name": "David Smith",
        "active_tier": "tier-3",
        "tier_name": "Executive Elite",
        "created_days_ago": 12
    },
    {
        "email": "fatima.moosa@example.com",
        "full_name": "Fatima Moosa",
        "active_tier": "tier-1",
        "tier_name": "ATS Optimise",
        "created_days_ago": 8
    },
    {
        "email": "chen.wei@example.com",
        "full_name": "Chen Wei",
        "active_tier": "tier-2",
        "tier_name": "Professional Package",
        "created_days_ago": 5
    }
]

# Sample transaction amounts (in cents) by tier
TIER_PRICES = {
    "tier-1": 89900,   # R899
    "tier-2": 150000,  # R1,500
    "tier-3": 300000   # R3,000
}


class DemoResellerService:
    """Service for managing the TalentHub demo reseller account."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def initialize_demo_account(self) -> dict:
        """
        Initialize or reset the demo reseller account with all sample data.
        This creates the TalentHub demo reseller if it doesn't exist.
        """
        from auth import get_password_hash
        
        logger.info("Initializing TalentHub demo reseller account...")
        
        try:
            # Check if demo reseller exists
            existing = await self.db.resellers.find_one({"id": DEMO_RESELLER_ID})
            
            if not existing:
                # Create demo owner user
                await self._create_demo_owner()
                # Create demo reseller
                await self._create_demo_reseller()
                logger.info("Created new TalentHub demo reseller account")
            else:
                logger.info("TalentHub demo reseller already exists")
            
            # Seed sample data
            await self._seed_sample_customers()
            await self._seed_sample_transactions()
            await self._seed_sample_cvs()
            await self._update_reseller_stats()
            
            return {
                "success": True,
                "message": "Demo account initialized successfully",
                "reseller_id": DEMO_RESELLER_ID,
                "login_email": DEMO_OWNER_EMAIL,
                "login_password": DEMO_OWNER_PASSWORD
            }
            
        except Exception as e:
            logger.error(f"Error initializing demo account: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _create_demo_owner(self):
        """Create the demo reseller owner user."""
        from auth import get_password_hash
        
        # Check if owner already exists
        existing = await self.db.users.find_one({"id": DEMO_OWNER_ID})
        if existing:
            return
        
        owner = {
            "id": DEMO_OWNER_ID,
            "email": DEMO_OWNER_EMAIL,
            "full_name": "TalentHub Demo Admin",
            "hashed_password": get_password_hash(DEMO_OWNER_PASSWORD),
            "role": "reseller_admin",
            "reseller_id": DEMO_RESELLER_ID,
            "active_tier": None,
            "is_active": True,
            "is_demo_account": True,
            "created_at": datetime.now(timezone.utc),
            "payment_history": []
        }
        
        await self.db.users.insert_one(owner)
        logger.info(f"Created demo owner user: {DEMO_OWNER_EMAIL}")
    
    async def _create_demo_reseller(self):
        """Create the TalentHub demo reseller."""
        now = datetime.now(timezone.utc)
        
        reseller = {
            "id": DEMO_RESELLER_ID,
            "company_name": "TalentHub Careers",
            "brand_name": "TalentHub",
            "subdomain": DEMO_RESELLER_SUBDOMAIN,
            "custom_domain": None,
            "status": "active",
            "is_demo_account": True,
            "branding": TALENTHUB_BRANDING,
            "pricing": {
                "tier_1_price": 89900,
                "tier_2_price": 150000,
                "tier_3_price": 300000,
                "currency": "ZAR",
                "strategy_call_pricing": {
                    "price": 69900,
                    "duration_minutes": 30,
                    "included_in_tier_3": True,
                    "enabled": True
                }
            },
            "contact_info": {
                "email": "hello@talenthub.demo",
                "phone": "+27 12 345 6789",
                "address": "123 Career Street, Sandton, Johannesburg"
            },
            "legal": {
                "terms_url": "/terms",
                "privacy_url": "/privacy"
            },
            "subscription": {
                "plan": "professional",
                "monthly_fee": 499900,
                "status": "active",
                "next_billing_date": (now + timedelta(days=30)).isoformat(),
                "payment_method": "card",
                "is_trial": False,
                "trial_start_date": None,
                "trial_end_date": None,
                "trial_days": 0,
                "converted_from_trial": True,
                "converted_date": (now - timedelta(days=60)).isoformat()
            },
            "stats": {
                "total_customers": 0,
                "active_customers": 0,
                "total_revenue": 0,
                "this_month_revenue": 0
            },
            "owner_user_id": DEMO_OWNER_ID,
            "api_key": f"demo_{uuid.uuid4().hex[:16]}",
            "created_at": now - timedelta(days=90),
            "updated_at": now
        }
        
        await self.db.resellers.insert_one(reseller)
        logger.info(f"Created TalentHub demo reseller: {DEMO_RESELLER_ID}")
    
    async def _seed_sample_customers(self):
        """Seed sample customers for the demo account."""
        from auth import get_password_hash
        
        now = datetime.now(timezone.utc)
        
        for i, customer_data in enumerate(SAMPLE_CUSTOMERS):
            customer_id = f"demo-customer-{i+1:03d}"
            
            # Check if customer exists
            existing = await self.db.users.find_one({"id": customer_id})
            if existing:
                continue
            
            created_at = now - timedelta(days=customer_data["created_days_ago"])
            
            customer = {
                "id": customer_id,
                "email": customer_data["email"],
                "full_name": customer_data["full_name"],
                "hashed_password": get_password_hash("demo123"),
                "role": "customer",
                "reseller_id": DEMO_RESELLER_ID,
                "active_tier": customer_data["active_tier"],
                "tier_name": customer_data["tier_name"],
                "is_active": True,
                "is_demo_account": True,
                "created_at": created_at,
                "payment_history": []
            }
            
            await self.db.users.insert_one(customer)
        
        logger.info(f"Seeded {len(SAMPLE_CUSTOMERS)} sample customers")
    
    async def _seed_sample_transactions(self):
        """Seed sample payment transactions for demo customers."""
        now = datetime.now(timezone.utc)
        
        # Get demo customers
        customers = await self.db.users.find({
            "reseller_id": DEMO_RESELLER_ID,
            "role": "customer",
            "is_demo_account": True
        }, {"_id": 0}).to_list(100)
        
        for customer in customers:
            payment_id = f"demo-payment-{customer['id']}"
            
            # Check if payment exists
            existing = await self.db.payments.find_one({"id": payment_id})
            if existing:
                continue
            
            tier_id = customer.get("active_tier", "tier-1")
            amount = TIER_PRICES.get(tier_id, 89900)
            
            # Calculate payment date (same as customer creation)
            created_at = customer.get("created_at", now)
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            payment = {
                "id": payment_id,
                "user_id": customer["id"],
                "user_email": customer["email"],
                "reseller_id": DEMO_RESELLER_ID,
                "tier_id": tier_id,
                "tier_name": customer.get("tier_name", "Package"),
                "amount_cents": amount,
                "currency": "ZAR",
                "status": "succeeded",
                "payment_method": "card",
                "is_demo_transaction": True,
                "created_at": created_at,
                "verified_at": created_at + timedelta(minutes=5)
            }
            
            await self.db.payments.insert_one(payment)
        
        logger.info(f"Seeded sample transactions for {len(customers)} customers")
    
    async def _seed_sample_cvs(self):
        """Seed sample CVs for demo customers."""
        now = datetime.now(timezone.utc)
        
        # Get demo customers with tier-2 or tier-3
        customers = await self.db.users.find({
            "reseller_id": DEMO_RESELLER_ID,
            "role": "customer",
            "is_demo_account": True,
            "active_tier": {"$in": ["tier-2", "tier-3"]}
        }, {"_id": 0}).to_list(100)
        
        sample_job_titles = [
            "Software Engineer",
            "Marketing Manager",
            "Financial Analyst",
            "Project Manager",
            "HR Specialist",
            "Sales Director"
        ]
        
        for i, customer in enumerate(customers):
            cv_id = f"demo-cv-{customer['id']}"
            
            # Check if CV exists
            existing = await self.db.user_cvs.find_one({"id": cv_id})
            if existing:
                continue
            
            job_title = sample_job_titles[i % len(sample_job_titles)]
            
            cv = {
                "id": cv_id,
                "user_id": customer["id"],
                "reseller_id": DEMO_RESELLER_ID,
                "title": f"{customer['full_name']} - {job_title} CV",
                "target_role": job_title,
                "personal_info": {
                    "full_name": customer["full_name"],
                    "email": customer["email"],
                    "phone": "+27 XX XXX XXXX",
                    "location": "Johannesburg, South Africa"
                },
                "summary": f"Experienced {job_title} with a proven track record...",
                "is_demo_cv": True,
                "created_at": customer.get("created_at", now),
                "updated_at": now
            }
            
            await self.db.user_cvs.insert_one(cv)
        
        logger.info(f"Seeded sample CVs for {len(customers)} customers")
    
    async def _update_reseller_stats(self):
        """Update the demo reseller's statistics."""
        # Count customers
        total_customers = await self.db.users.count_documents({
            "reseller_id": DEMO_RESELLER_ID,
            "role": "customer"
        })
        
        active_customers = await self.db.users.count_documents({
            "reseller_id": DEMO_RESELLER_ID,
            "role": "customer",
            "active_tier": {"$ne": None}
        })
        
        # Calculate revenue
        pipeline = [
            {"$match": {"reseller_id": DEMO_RESELLER_ID, "status": "succeeded"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount_cents"}}}
        ]
        revenue_result = await self.db.payments.aggregate(pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        # This month revenue
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        month_pipeline = [
            {
                "$match": {
                    "reseller_id": DEMO_RESELLER_ID,
                    "status": "succeeded",
                    "created_at": {"$gte": start_of_month}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount_cents"}}}
        ]
        month_result = await self.db.payments.aggregate(month_pipeline).to_list(1)
        this_month_revenue = month_result[0]["total"] if month_result else 0
        
        # Update reseller stats
        await self.db.resellers.update_one(
            {"id": DEMO_RESELLER_ID},
            {
                "$set": {
                    "stats.total_customers": total_customers,
                    "stats.active_customers": active_customers,
                    "stats.total_revenue": total_revenue,
                    "stats.this_month_revenue": this_month_revenue,
                    "updated_at": now
                }
            }
        )
        
        logger.info(f"Updated demo reseller stats: {total_customers} customers, R{total_revenue/100:,.2f} revenue")
    
    async def reset_demo_data(self) -> dict:
        """
        Reset the demo account by removing user-added data while keeping base configuration.
        This is called nightly at midnight SAST.
        """
        logger.info("Starting nightly demo data reset...")
        
        try:
            # 1. Remove non-demo customers (user-added during demo)
            deleted_users = await self.db.users.delete_many({
                "reseller_id": DEMO_RESELLER_ID,
                "is_demo_account": {"$ne": True},
                "id": {"$ne": DEMO_OWNER_ID}
            })
            
            # 2. Remove non-demo payments
            deleted_payments = await self.db.payments.delete_many({
                "reseller_id": DEMO_RESELLER_ID,
                "is_demo_transaction": {"$ne": True}
            })
            
            # 3. Remove non-demo CVs
            deleted_cvs = await self.db.user_cvs.delete_many({
                "reseller_id": DEMO_RESELLER_ID,
                "is_demo_cv": {"$ne": True}
            })
            
            # 4. Remove non-demo cover letters
            deleted_letters = await self.db.cover_letters.delete_many({
                "reseller_id": DEMO_RESELLER_ID,
                "is_demo": {"$ne": True}
            })
            
            # 5. Remove non-demo bookings
            deleted_bookings = await self.db.bookings.delete_many({
                "reseller_id": DEMO_RESELLER_ID,
                "is_demo": {"$ne": True}
            })
            
            # 6. Reset CV usage logs for the demo reseller
            await self.db.cv_usage_logs.delete_many({
                "reseller_id": DEMO_RESELLER_ID
            })
            
            # 7. Update stats
            await self._update_reseller_stats()
            
            # 8. Reset branding to defaults (in case user changed it)
            await self.db.resellers.update_one(
                {"id": DEMO_RESELLER_ID},
                {
                    "$set": {
                        "branding": TALENTHUB_BRANDING,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            result = {
                "success": True,
                "message": "Demo data reset completed",
                "deleted": {
                    "users": deleted_users.deleted_count,
                    "payments": deleted_payments.deleted_count,
                    "cvs": deleted_cvs.deleted_count,
                    "cover_letters": deleted_letters.deleted_count,
                    "bookings": deleted_bookings.deleted_count
                },
                "reset_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Demo reset complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error resetting demo data: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_demo_credentials(self) -> dict:
        """Get the demo login credentials for display."""
        return {
            "success": True,
            "demo_url": f"/partner/{DEMO_RESELLER_SUBDOMAIN}",
            "login_email": DEMO_OWNER_EMAIL,
            "login_password": DEMO_OWNER_PASSWORD,
            "brand_name": "TalentHub",
            "description": "Experience the full white-label reseller dashboard with sample data"
        }


def create_demo_service(db: AsyncIOMotorDatabase) -> DemoResellerService:
    """Factory function to create a DemoResellerService instance."""
    return DemoResellerService(db)
