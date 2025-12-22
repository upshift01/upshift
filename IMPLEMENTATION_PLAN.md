# UpShift - Complete Implementation Plan

## ✅ Already Completed

### AI Service
- ✅ Updated to GPT-5.2 for all AI operations
- ✅ Added ATS-optimization focus to all system prompts
- ✅ Resume improvement, analysis, cover letter generation, job matching
- ✅ Using `emergentintegrations` with EMERGENT_LLM_KEY

### Frontend
- ✅ All pages built (Home, Resume Builder, Improver, Cover Letter, Templates)
- ✅ Pricing tiers defined (R899, R1500, R3000)
- ✅ PricingSection component created
- ✅ Modern design with gradient branding
- ✅ South African focus (ID fields, provinces, industries)

### Backend
- ✅ FastAPI with MongoDB
- ✅ Resume and Cover Letter CRUD APIs
- ✅ AI integration endpoints
- ✅ PDF generation
- ✅ Odoo integration placeholders

## 🚧 Remaining Implementation Tasks

### 1. User Authentication System

**Files to Create:**
- `/app/backend/auth.py` - JWT token handling, password hashing
- `/app/backend/auth_models.py` - User models with Pydantic
- `/app/frontend/src/context/AuthContext.jsx` - React auth context
- `/app/frontend/src/pages/Login.jsx` - Login page
- `/app/frontend/src/pages/Register.jsx` - Registration page

**Backend Auth Implementation:**
```python
# /app/backend/auth.py
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = "your-secret-key-here"  # Use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    # Verify JWT and return user
    pass
```

**Auth API Endpoints to Add to server.py:**
```python
@api_router.post("/auth/register")
async def register(email: str, password: str, full_name: str):
    # Check if user exists
    # Hash password
    # Create user in MongoDB
    # Return user + token
    pass

@api_router.post("/auth/login")
async def login(email: str, password: str):
    # Verify credentials
    # Create JWT token
    # Return token
    pass

@api_router.get("/auth/me")
async def get_current_user_info(current_user = Depends(get_current_user)):
    # Return current user profile
    pass
```

### 2. Yoco Payment Integration

**Environment Variables to Add to `/app/backend/.env`:**
```env
YOCO_PUBLIC_KEY=pk_live_your_key_here
YOCO_SECRET_KEY=sk_live_your_key_here
YOCO_WEBHOOK_SECRET=your_webhook_secret
```

**Files to Create:**
- `/app/backend/yoco_service.py` - Yoco API integration
- `/app/frontend/src/components/YocoCheckout.jsx` - Checkout component

**Yoco Service Implementation:**
```python
# /app/backend/yoco_service.py
import httpx
from typing import Dict
import os

class YocoService:
    def __init__(self):
        self.base_url = "https://api.yoco.com/v1"
        self.secret_key = os.environ.get('YOCO_SECRET_KEY')
        self.headers = {
            "X-Auth-Secret-Key": self.secret_key,
            "Content-Type": "application/json"
        }
    
    async def create_checkout(self, amount_cents: int, email: str, metadata: dict):
        async with httpx.AsyncClient() as client:
            payload = {
                "amount": amount_cents,
                "currency": "ZAR",
                "successUrl": f"{os.environ.get('FRONTEND_URL')}/payment/success",
                "cancelUrl": f"{os.environ.get('FRONTEND_URL')}/payment/cancel",
                "failureUrl": f"{os.environ.get('FRONTEND_URL')}/payment/failure",
                "metadata": metadata
            }
            response = await client.post(
                f"{self.base_url}/checkouts",
                json=payload,
                headers=self.headers
            )
            return response.json()
    
    async def verify_payment(self, payment_id: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/checkouts/{payment_id}",
                headers=self.headers
            )
            return response.json()

yoco_service = YocoService()
```

**Payment API Endpoints to Add:**
```python
@api_router.post("/payments/create-checkout")
async def create_payment_checkout(
    tier_id: str,
    email: str,
    current_user = Depends(get_current_user)
):
    # Get tier details
    tier = get_tier_by_id(tier_id)
    
    # Create checkout with Yoco
    checkout = await yoco_service.create_checkout(
        amount_cents=tier['priceCents'],
        email=email,
        metadata={
            "user_id": current_user['id'],
            "tier_id": tier_id,
            "tier_name": tier['name']
        }
    )
    
    # Save pending payment to MongoDB
    await db.payments.insert_one({
        "user_id": current_user['id'],
        "tier_id": tier_id,
        "amount_cents": tier['priceCents'],
        "yoco_checkout_id": checkout['id'],
        "status": "pending",
        "created_at": datetime.utcnow()
    })
    
    return {"checkout_url": checkout['redirectUrl']}

@api_router.post("/payments/verify")
async def verify_payment(payment_id: str):
    # Verify with Yoco
    payment_data = await yoco_service.verify_payment(payment_id)
    
    if payment_data['status'] == 'SUCCESSFUL':
        # Update payment status
        # Grant user access to tier
        # Send confirmation email
        pass
    
    return {"status": "success"}

@api_router.post("/webhooks/yoco")
async def handle_yoco_webhook(request: Request):
    # Verify webhook signature
    # Process payment status updates
    # Update database
    pass
```

### 3. Customer Portal/Dashboard

**Files to Create:**
- `/app/frontend/src/pages/Dashboard.jsx` - Main dashboard
- `/app/frontend/src/pages/MyDocuments.jsx` - User's CVs & cover letters
- `/app/frontend/src/pages/PaymentHistory.jsx` - Payment history
- `/app/frontend/src/pages/Support.jsx` - Help/support page

**Dashboard Features:**
- Display current active tier
- List of created CVs and cover letters
- Payment history with download receipts
- Upgrade/purchase additional services
- Support ticket system
- Account settings

### 4. Free vs Paid Feature Gating

**Implementation:**
```javascript
// Frontend - Feature gate component
const FeatureGate = ({ tier, children, fallback }) => {
  const { user } = useAuth();
  
  if (!user?.activeTier || !tier.includes(user.activeTier)) {
    return fallback || <UpgradePrompt />;
  }
  
  return children;
};

// Usage
<FeatureGate tier={['tier-1', 'tier-2', 'tier-3']}>
  <AIImproveButton />
</FeatureGate>
```

**Backend - Protect AI endpoints:**
```python
@api_router.post("/ai/improve-section")
async def improve_section(
    data: dict,
    current_user = Depends(get_current_user)
):
    # Check if user has active paid tier
    if not current_user.get('active_tier'):
        raise HTTPException(
            status_code=403,
            detail="This feature requires a paid plan"
        )
    
    # Process AI request
    ...
```

### 5. LinkedIn Integration

**Options to Implement:**
1. **LinkedIn Profile Optimization Suggestions** (Easiest)
   - Analyze CV content
   - Generate LinkedIn-specific recommendations
   - Provide section-by-section suggestions
   - No LinkedIn API needed

2. **LinkedIn Profile Export** (Medium)
   - Generate formatted text for each LinkedIn section
   - Provide copy-paste instructions
   - Include tips for profile completion

3. **LinkedIn API Integration** (Advanced - Requires LinkedIn API access)
   - OAuth authentication
   - Auto-populate LinkedIn profile
   - Requires LinkedIn API approval (can take weeks)

**Recommended: Start with Option 1**
```python
@api_router.post("/ai/linkedin-suggestions")
async def generate_linkedin_suggestions(resume_data: dict):
    # Use GPT-5.2 to generate LinkedIn-specific content
    suggestions = await ai_service.generate_linkedin_profile(resume_data)
    return suggestions
```

### 6. Payment Flow Integration

**Update Resume Builder:**
```javascript
// In ResumeBuilder.jsx
const handleGenerate = async () => {
  const { user } = useAuth();
  
  // Check if user has paid
  if (!user?.activeTier) {
    // Redirect to pricing page
    navigate('/pricing');
    return;
  }
  
  // Generate CV with AI
  ...
};
```

**Update Home Page:**
```javascript
// In Home.jsx - Update CTAs
<Link to="/pricing">
  <Button>View Pricing & Get Started</Button>
</Link>
```

### 7. Email Notifications

**Install:**
```bash
pip install fastapi-mail
```

**Implementation:**
```python
# /app/backend/email_service.py
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

conf = ConnectionConfig(
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME'),
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD'),
    MAIL_FROM = "noreply@upshift.co.za",
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False
)

async def send_payment_confirmation(email: str, tier_name: str, amount: int):
    message = MessageSchema(
        subject="Payment Confirmation - UpShift",
        recipients=[email],
        body=f"Thank you for purchasing {tier_name} for R{amount/100}...",
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)
```

## 🔒 Security Checklist

- [ ] Add CORS properly configured for production domain
- [ ] Store all secrets in environment variables
- [ ] Implement rate limiting on API endpoints
- [ ] Add CSRF protection
- [ ] Validate all user inputs
- [ ] Sanitize file uploads
- [ ] Implement webhook signature verification for Yoco
- [ ] Add SQL injection protection (MongoDB is NoSQL but still validate)
- [ ] Set up HTTPS in production
- [ ] Add logging and monitoring

## 📊 Database Indexes to Add

```python
# In server.py startup
await db.users.create_index("email", unique=True)
await db.users.create_index([("email", 1), ("active_tier", 1)])
await db.payments.create_index("user_id")
await db.payments.create_index([("user_id", 1), ("created_at", -1)])
await db.payments.create_index("yoco_checkout_id")
await db.resumes.create_index("user_id")
await db.cover_letters.create_index("user_id")
```

## 🧪 Testing Priority

1. **Payment Flow** - Most critical
   - Test with Yoco test cards
   - Verify payment verification
   - Check tier activation

2. **Authentication**
   - Register, login, logout
   - Token expiration
   - Protected routes

3. **AI Features**
   - CV generation
   - CV analysis
   - Cover letter generation

4. **File Handling**
   - PDF generation
   - File uploads

## 📱 Frontend Routes to Add

```javascript
<Route path="/pricing" element={<PricingPage />} />
<Route path="/register" element={<Register />} />
<Route path="/login" element={<Login />} />
<Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
<Route path="/my-documents" element={<PrivateRoute><MyDocuments /></PrivateRoute>} />
<Route path="/payment-history" element={<PrivateRoute><PaymentHistory /></PrivateRoute>} />
<Route path="/payment/success" element={<PaymentSuccess />} />
<Route path="/payment/cancel" element={<PaymentCancel />} />
<Route path="/support" element={<PrivateRoute><Support /></PrivateRoute>} />
```

## 🚀 Deployment Steps

1. Set up production MongoDB Atlas cluster
2. Configure production environment variables
3. Get Yoco live API keys
4. Set up domain and SSL certificate
5. Configure CORS for production domain
6. Set up email service (SendGrid/Gmail)
7. Deploy backend to production server
8. Deploy frontend to Vercel/Netlify
9. Test complete payment flow in production
10. Monitor logs and errors

## 📝 Next Immediate Steps

1. **Implement Authentication** - Users need accounts to purchase
2. **Add Yoco Payment Flow** - Critical for revenue
3. **Create Pricing Page** - Entry point for payments
4. **Build Dashboard** - User portal after purchase
5. **Add Feature Gating** - Protect AI features
6. **Test Payment Flow** - End-to-end testing

## 💡 Quick Wins

- Add "Free Basic Builder" badge to builder page
- Add "AI Features" lock icons on free tier
- Create upgrade prompts throughout the app
- Add testimonials from South African users
- Add trust badges (secure payment, money-back guarantee)
