# UpShift - AI-Driven White-Label SaaS Resume Platform

## Original Problem Statement
Build "UpShift," an AI-driven, white-label SaaS resume and career services platform. The platform enables:
- Main site for direct customers
- Reseller portals with custom branding
- Admin portal for platform management
- AI-powered CV/resume building, ATS checking, and career tools

## User Personas
1. **Job Seekers (Customers)**: Create CVs, check ATS scores, generate cover letters
2. **Recruiters**: Browse and subscribe to talent pool for hiring
3. **Resellers**: White-label the platform with custom branding and pricing
4. **Super Admin**: Manage entire platform, resellers, users, and content

## Core Requirements

### Phase 1 - Foundation (COMPLETED)
- [x] User authentication (JWT-based)
- [x] CV Builder with AI assistance
- [x] ATS Checker tool
- [x] Skills Generator
- [x] Cover Letter Generator
- [x] Customer Dashboard
- [x] Pricing and subscription tiers

### Phase 2 - White-Label (COMPLETED)
- [x] Reseller portal with branding customization
- [x] Partner/subdomain routing
- [x] Custom domain setup
- [x] Reseller pricing configuration
- [x] Email template customization

### Phase 3 - Admin & Payments (COMPLETED)
- [x] Super Admin dashboard
- [x] Yoco payment integration
- [x] Invoice generation
- [x] Subscription management
- [x] User management

### Phase 4 - Talent Pool (COMPLETED - Dec 2025)
- [x] Public talent pool page with recruiter subscription plans
- [x] Admin management (candidates, subscriptions, pricing)
- [x] Reseller management (scoped to their candidates)
- [x] Customer opt-in to talent pool
- [x] Yoco payment for recruiter subscriptions
- [x] Contact request system
- [x] Email notifications for contact requests (to candidate when recruiter requests, to recruiter when candidate responds)

## Technical Stack
- **Frontend**: React 18, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Yoco (South African payment gateway)
- **AI**: OpenAI GPT-4o via Emergent LLM Key

## Key API Endpoints

### Talent Pool (New)
- `GET /api/talent-pool/industries` - List industries
- `GET /api/talent-pool/experience-levels` - List experience levels
- `GET /api/talent-pool/recruiter/plans` - Get subscription plans
- `GET /api/talent-pool/browse` - Browse candidates (requires subscription)
- `POST /api/talent-pool/opt-in` - Customer opts into talent pool
- `POST /api/talent-pool/subscribe/{plan_id}` - Create subscription checkout
- `POST /api/talent-pool/verify-payment/{subscription_id}` - Verify and activate subscription
- `GET /api/talent-pool/admin/candidates` - Admin: Get all candidates
- `POST /api/talent-pool/admin/candidates` - Admin: Add candidate
- `PUT /api/talent-pool/admin/candidates/{id}/status` - Admin: Approve/reject
- `DELETE /api/talent-pool/admin/candidates/{id}` - Admin: Delete candidate
- `GET/PUT /api/talent-pool/admin/pricing` - Admin: Get/update pricing

## Database Collections
- `users` - User accounts with roles
- `user_cvs` - CV documents
- `talent_pool_profiles` - Candidate profiles in talent pool
- `recruiter_subscriptions` - Recruiter access subscriptions
- `contact_requests` - Recruiter-candidate contact requests
- `platform_settings` - Platform configuration including pricing

## Credentials
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@upshift.works | Admin@2025! |
| Demo Reseller | demo@talenthub.upshift.works | demo123 |
| Test Customer | test@example.com | password123 |

## Recent Fixes (Dec 2025)
1. **Hardcoded Phone Number** - Fixed to use dynamic settings
2. **Certifications Tab** - Added to CV Builder with .docx export
3. **ATS Checker Pricing** - Fixed to fetch from database dynamically
4. **Free Tools User Gate** - Requires login for ATS Checker/Skills Generator
5. **Admin Login** - Fixed password field inconsistency

## Upcoming Tasks (P1)
- [ ] Odoo Integration
- [ ] Customer CV/vacancy upload to Talent Pool

## Future/Backlog (P2-P3)
- [ ] Refactor remaining partner pages (PartnerPricing, PartnerHome)
- [ ] Secure/remove emergency admin endpoints
- [ ] Clean up duplicate admin accounts
- [ ] Address linting errors in ATSChecker, SkillsGenerator
