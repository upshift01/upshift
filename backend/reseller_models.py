from pydantic import BaseModel, Field, EmailStr, HttpUrl
from typing import Optional, List
from datetime import datetime
import uuid

# Reseller/Tenant Models
class ResellerBranding(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#1e40af"
    secondary_color: str = "#7c3aed"
    favicon_url: Optional[str] = None

class ResellerPricing(BaseModel):
    tier_1_price: int = 89900  # R899 in cents
    tier_2_price: int = 150000  # R1500
    tier_3_price: int = 300000  # R3000
    currency: str = "ZAR"

class ResellerContactInfo(BaseModel):
    email: EmailStr
    phone: str
    address: Optional[str] = None

class ResellerLegal(BaseModel):
    terms_url: Optional[str] = None
    privacy_url: Optional[str] = None

class ResellerSubscription(BaseModel):
    plan: str = "monthly"
    monthly_fee: int = 250000  # R2500 in cents
    status: str = "active"  # active, suspended, cancelled
    next_billing_date: Optional[datetime] = None
    payment_method: str = "invoice"  # invoice, card

class ResellerStats(BaseModel):
    total_customers: int = 0
    active_customers: int = 0
    total_revenue: int = 0
    this_month_revenue: int = 0

class ResellerCreate(BaseModel):
    company_name: str
    brand_name: str
    subdomain: str
    custom_domain: Optional[str] = None
    contact_info: ResellerContactInfo
    owner_email: EmailStr
    owner_name: str
    owner_password: str

class ResellerUpdate(BaseModel):
    company_name: Optional[str] = None
    brand_name: Optional[str] = None
    custom_domain: Optional[str] = None
    contact_info: Optional[ResellerContactInfo] = None
    legal: Optional[ResellerLegal] = None

class Reseller(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    brand_name: str
    subdomain: str
    custom_domain: Optional[str] = None
    status: str = "pending"  # pending, active, suspended
    
    branding: ResellerBranding = Field(default_factory=ResellerBranding)
    pricing: ResellerPricing = Field(default_factory=ResellerPricing)
    contact_info: ResellerContactInfo
    legal: ResellerLegal = Field(default_factory=ResellerLegal)
    subscription: ResellerSubscription = Field(default_factory=ResellerSubscription)
    stats: ResellerStats = Field(default_factory=ResellerStats)
    
    owner_user_id: str
    api_key: str = Field(default_factory=lambda: f"rsl_{uuid.uuid4().hex}")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ResellerResponse(BaseModel):
    id: str
    company_name: str
    brand_name: str
    subdomain: str
    custom_domain: Optional[str]
    status: str
    branding: ResellerBranding
    pricing: ResellerPricing
    contact_info: ResellerContactInfo
    legal: ResellerLegal
    subscription: ResellerSubscription
    stats: ResellerStats
    created_at: datetime

# Invoice Models
class InvoiceItem(BaseModel):
    description: str
    amount: int

class ResellerInvoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reseller_id: str
    invoice_number: str
    amount: int
    period: str  # e.g., "2025-01"
    due_date: datetime
    paid_date: Optional[datetime] = None
    status: str = "pending"  # pending, paid, overdue
    items: List[InvoiceItem]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    amount: int
    period: str
    due_date: datetime
    paid_date: Optional[datetime]
    status: str
    items: List[InvoiceItem]
    created_at: datetime

# White-Label Config (Public)
class WhiteLabelConfig(BaseModel):
    brand_name: str
    logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    favicon_url: Optional[str]
    contact_email: str
    terms_url: Optional[str]
    privacy_url: Optional[str]
    pricing: ResellerPricing

# Admin Analytics
class PlatformAnalytics(BaseModel):
    total_resellers: int
    active_resellers: int
    suspended_resellers: int
    total_customers: int
    total_revenue: int
    this_month_revenue: int
    pending_invoices: int
    overdue_invoices: int
