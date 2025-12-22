# UpShift White-Label SaaS Architecture

## Overview
Convert UpShift into a multi-tenant white-label SaaS platform where resellers can run their own branded instances.

## Database Schema

### Resellers/Tenants Collection
```javascript
{
  _id: ObjectId,
  id: UUID,
  company_name: "Acme Careers",
  brand_name: "Acme CV Pro",
  subdomain: "acme", // For internal reference
  custom_domain: "acmecvpro.com",
  status: "active" | "suspended" | "pending",
  
  // White-label Settings
  branding: {
    logo_url: "https://cdn.../logo.png",
    primary_color: "#1e40af",
    secondary_color: "#7c3aed",
    favicon_url: "https://cdn.../favicon.ico"
  },
  
  // Pricing Configuration
  pricing: {
    tier_1_price: 89900, // R899 in cents
    tier_2_price: 150000,
    tier_3_price: 300000,
    currency: "ZAR"
  },
  
  // Contact & Legal
  contact_info: {
    email: "support@acmecvpro.com",
    phone: "+27 XX XXX XXXX",
    address: "..."
  },
  legal: {
    terms_url: "https://acmecvpro.com/terms",
    privacy_url: "https://acmecvpro.com/privacy"
  },
  
  // Subscription
  subscription: {
    plan: "monthly", // R2500/month
    monthly_fee: 250000, // R2500 in cents
    status: "active",
    next_billing_date: Date,
    payment_method: "invoice" | "card"
  },
  
  // Stats
  stats: {
    total_customers: 0,
    active_customers: 0,
    total_revenue: 0,
    this_month_revenue: 0
  },
  
  // Auth
  owner_user_id: UUID,
  api_key: "rsl_xxxxx", // For API access
  
  created_at: Date,
  updated_at: Date
}
```

### Users Collection (Extended)
```javascript
{
  // ... existing fields
  reseller_id: UUID, // Which reseller this user belongs to
  role: "customer" | "reseller_admin" | "super_admin"
}
```

### Payments Collection (Extended)
```javascript
{
  // ... existing fields
  reseller_id: UUID,
  reseller_revenue: 0, // Amount reseller earned
  platform_fee: 0 // Our commission (currently 0)
}
```

### Reseller Invoices Collection
```javascript
{
  _id: ObjectId,
  id: UUID,
  reseller_id: UUID,
  invoice_number: "INV-2025-001",
  amount: 250000, // R2500
  period: "2025-01",
  due_date: Date,
  paid_date: Date | null,
  status: "pending" | "paid" | "overdue",
  items: [
    {
      description: "Monthly SaaS Subscription",
      amount: 250000
    }
  ],
  created_at: Date
}
```

## Architecture Components

### 1. Domain Routing & Multi-Tenancy
- Middleware to detect custom domain
- Load reseller config based on domain
- Inject branding into responses
- Isolate data per reseller

### 2. Backend API Structure
```
/api/reseller/*          - Reseller dashboard APIs
/api/admin/*             - Super admin APIs
/api/white-label/*       - Public white-label config API
/api/auth/*              - Authentication (tenant-aware)
/api/payments/*          - Payments (tenant-aware)
```

### 3. Frontend Structure
```
/reseller-dashboard      - Reseller admin panel
/super-admin             - Platform super admin
/                        - Customer-facing (white-labeled)
```

### 4. White-Label Theming System
- Dynamic CSS variables based on reseller colors
- Logo/favicon injection
- Brand name replacement throughout UI
- Custom domain email templates

## Implementation Phases

### Phase 1: Database & Models ✅
- Create reseller models
- Extend user/payment models
- Add tenant isolation

### Phase 2: Multi-Tenancy Middleware
- Domain detection
- Reseller config loading
- Request context injection

### Phase 3: Reseller Dashboard
- Reseller registration/onboarding
- White-label settings management
- Customer list & stats
- Revenue tracking
- Pricing configuration
- Custom branding upload

### Phase 4: Super Admin Panel
- Reseller management (CRUD)
- Platform analytics
- Invoice generation
- Reseller approval workflow
- Override settings
- Suspend/activate resellers

### Phase 5: White-Label Customer Experience
- Dynamic theming
- Custom domain support
- Branded emails
- Custom T&C/Privacy pages

### Phase 6: Billing & Invoicing
- Monthly invoice generation
- Payment tracking
- Automated reminders
- Revenue reports

## API Endpoints to Create

### Reseller APIs
```
POST   /api/reseller/register
GET    /api/reseller/profile
PUT    /api/reseller/profile
PUT    /api/reseller/branding
PUT    /api/reseller/pricing
GET    /api/reseller/customers
GET    /api/reseller/stats
GET    /api/reseller/revenue
GET    /api/reseller/invoices
POST   /api/reseller/upload-logo
```

### Super Admin APIs
```
GET    /api/admin/resellers
POST   /api/admin/resellers
PUT    /api/admin/resellers/:id
DELETE /api/admin/resellers/:id
POST   /api/admin/resellers/:id/suspend
POST   /api/admin/resellers/:id/activate
GET    /api/admin/analytics
POST   /api/admin/generate-invoices
```

### White-Label Public APIs
```
GET    /api/white-label/config   - Returns branding for current domain
```

## Security Considerations
1. Tenant isolation - ensure users can't access other reseller data
2. Domain verification - prevent domain hijacking
3. API key security for resellers
4. Role-based access control (customer, reseller, admin)
5. Audit logging for admin actions

## Deployment Strategy
1. Main instance: upshift.co.za (for customer acquisition)
2. Reseller instances: Custom domains pointing to same deployment
3. Nginx/Cloudflare for domain routing
4. Environment variables for multi-domain support

## Revenue Model
- Reseller pays R2500/month
- Reseller sets their own prices (suggested: R899, R1500, R3000)
- Reseller keeps 100% of customer payments
- We invoice reseller monthly for platform access

## Next Steps
1. ✅ Create database models
2. Build reseller dashboard UI
3. Build super admin panel UI
4. Implement multi-tenancy middleware
5. Add white-label theming system
6. Set up domain routing
7. Create invoice generation system
8. Testing & documentation
