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
5. **Companies/Employers**: Post remote job opportunities (NEW)

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
- [x] **Candidate Profile Picture Upload** (Jan 2025) - Candidates can upload profile pictures to their Talent Pool profile
- [x] **CV Download for Recruiters** (Jan 2025) - Recruiters can download candidate CVs when available

### Phase 5 - Remote Work Space (IN PROGRESS - Jan 2025)
- [x] **Phase 5.1: Job Posting Portal** (COMPLETED)
  - [x] Job posting form with AI-assisted description generation
  - [x] AI-powered skill suggestions
  - [x] Support for USD and ZAR currencies
  - [x] Job types: Full-time, Contract, Gig/Micro-task
  - [x] Remote type options: Fully Remote, Hybrid, Flexible
  - [x] Timeline options: Ongoing, 1-3 months, 3-6 months, etc.
  - [x] Location/region preferences
  - [x] My Jobs management page (pause, activate, delete)
  - [x] Job details page with owner controls
- [ ] **Phase 5.2: Talent Matching Dashboard** (UPCOMING)
  - [ ] AI-curated job recommendations for job seekers
  - [ ] Company dashboard showing matched candidates
  - [ ] Filters for regions (e.g., South African talent)
  - [ ] Gig-style micro-task matching
- [ ] **Phase 5.3: Bid/Proposal System** (FUTURE)
  - [ ] Job seekers submit AI-generated proposals
  - [ ] Companies accept/reject bids
  - [ ] Rate negotiation in chosen currency
  - [ ] Contract management

## Technical Stack
- **Frontend**: React 18, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Yoco (South African payment gateway)
- **AI**: OpenAI GPT-4o via Emergent LLM Key

## Key API Endpoints

### Talent Pool
- `GET /api/talent-pool/industries` - List industries
- `GET /api/talent-pool/experience-levels` - List experience levels
- `GET /api/talent-pool/recruiter/plans` - Get subscription plans
- `GET /api/talent-pool/browse` - Browse candidates (requires subscription)
- `POST /api/talent-pool/opt-in` - Customer opts into talent pool
- `POST /api/talent-pool/subscribe/{plan_id}` - Create subscription checkout
- `POST /api/talent-pool/verify-payment/{subscription_id}` - Verify and activate subscription
- `POST /api/talent-pool/upload-profile-picture` - Upload candidate profile picture (NEW)
- `GET /api/talent-pool/profile-picture/{filename}` - Serve profile picture (NEW)
- `GET /api/talent-pool/admin/candidates` - Admin: Get all candidates
- `POST /api/talent-pool/admin/candidates` - Admin: Add candidate
- `PUT /api/talent-pool/admin/candidates/{id}/status` - Admin: Approve/reject
- `DELETE /api/talent-pool/admin/candidates/{id}` - Admin: Delete candidate
- `GET/PUT /api/talent-pool/admin/pricing` - Admin: Get/update pricing

## Database Collections
- `users` - User accounts with roles
- `user_cvs` - CV documents
- `talent_pool_profiles` - Candidate profiles in talent pool (includes `profile_picture_url`, `cv_url`)
- `recruiter_subscriptions` - Recruiter access subscriptions
- `contact_requests` - Recruiter-candidate contact requests
- `platform_settings` - Platform configuration including pricing

## Credentials
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@upshift.works | Admin@2025! |
| Demo Reseller | demo@talenthub.upshift.works | demo123 |
| Test Customer | test@example.com | password123 |
| Test Recruiter | john@woo.co.za | Test@1234 |

## Recent Changes (Jan 2025)
1. **Candidate Profile Picture Upload** - Added ability for candidates to upload profile pictures (stored locally at `/app/public/uploads/profile_pictures`)
2. **Enhanced Candidate Cards** - Recruiter browse view now displays profile pictures with gradient avatar fallback
3. **CV Download Button** - CV download button only shows when candidate has attached a CV
4. **Job Seeker Registration Redirect** - Fixed to redirect to dashboard instead of pricing page
5. **CV Selection Fix** - Fixed talent pool CV attachment to use correct `user_documents` collection
6. **AI Improve Skills** - Added AI-powered skill generation button in Talent Pool profile form
7. **Bio Field with AI** - Added new Bio text area with AI generate/improve functionality

## Recent Fixes (Dec 2025)
1. **Hardcoded Phone Number** - Fixed to use dynamic settings
2. **Certifications Tab** - Added to CV Builder with .docx export
3. **ATS Checker Pricing** - Fixed to fetch from database dynamically
4. **Free Tools User Gate** - Requires login for ATS Checker/Skills Generator
5. **Admin Login** - Fixed password field inconsistency
6. **Talent Pool Pricing Bug** - Fixed the `/api/talent-pool/recruiter/plans` endpoint to fetch dynamic pricing from database instead of returning hardcoded values. Admin pricing updates now reflect on public page and Yoco checkouts.

## Upcoming Tasks (P1)
- [ ] Odoo Integration
- [ ] Customer CV/vacancy upload to Talent Pool

## Future/Backlog (P2-P3)
- [ ] Refactor remaining partner pages (PartnerPricing, PartnerHome)
- [ ] Secure/remove emergency admin endpoints
- [ ] Clean up duplicate admin accounts
- [ ] Address linting errors in ATSChecker, SkillsGenerator
