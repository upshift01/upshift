from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
import os

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    reseller_id: Optional[str] = None  # For white-label signups

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    hashed_password: str
    role: str = "customer"  # customer, reseller_admin, super_admin
    reseller_id: Optional[str] = None  # For customers belonging to a reseller
    active_tier: Optional[str] = None
    tier_activation_date: Optional[datetime] = None
    created_at: datetime
    is_active: bool = True

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str = "customer"
    reseller_id: Optional[str] = None
    active_tier: Optional[str] = None
    tier_activation_date: Optional[datetime] = None
    created_at: datetime

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db = None) -> UserResponse:
    """Get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    if db is None:
        raise credentials_exception
    
    user = await db.users.find_one({"email": token_data.email})
    if user is None:
        raise credentials_exception
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        phone=user.get("phone"),
        role=user.get("role", "customer"),
        reseller_id=user.get("reseller_id"),
        active_tier=user.get("active_tier"),
        tier_activation_date=user.get("tier_activation_date"),
        created_at=user["created_at"]
    )

async def get_current_active_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Get the current active user."""
    return current_user

def check_user_has_tier(required_tiers: list):
    """Dependency to check if user has required tier."""
    async def verify_tier(current_user: UserResponse = Depends(get_current_active_user)):
        if not current_user.active_tier:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This feature requires a paid plan. Please upgrade to access AI features."
            )
        if current_user.active_tier not in required_tiers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your current plan does not include this feature. Please upgrade."
            )
        return current_user
    return verify_tier