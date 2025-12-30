from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
import uuid

# Resume Models
class WorkExperience(BaseModel):
    title: str
    company: str
    duration: str
    description: str
    achievements: Optional[str] = ""

class Education(BaseModel):
    degree: str
    institution: str
    year: str
    location: Optional[str] = ""

class Language(BaseModel):
    language: str
    proficiency: str

class Reference(BaseModel):
    name: str
    title: Optional[str] = ""
    company: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""

class ResumeCreate(BaseModel):
    fullName: str
    email: EmailStr
    phone: str
    idNumber: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    province: Optional[str] = ""
    postalCode: Optional[str] = ""
    industry: Optional[str] = ""
    summary: str
    experiences: List[WorkExperience]
    education: List[Education]
    skills: List[str]
    languages: List[Language] = []
    references: List[Reference] = []

class Resume(ResumeCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    odoo_record_id: Optional[str] = None  # Placeholder for Odoo integration

# Cover Letter Models
class CoverLetterCreate(BaseModel):
    fullName: str
    email: EmailStr
    phone: str
    recipientName: Optional[str] = ""
    companyName: str
    jobTitle: str
    jobDescription: Optional[str] = ""
    keySkills: Optional[str] = ""
    whyInterested: Optional[str] = ""

class CoverLetter(CoverLetterCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    generated_content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    odoo_record_id: Optional[str] = None  # Placeholder for Odoo integration

# AI Analysis Models
class ResumeAnalysisResult(BaseModel):
    overall_score: int
    ats_score: int
    impact_score: int
    clarity_score: int
    keyword_score: int
    improvements: List[dict]

class AIImprovement(BaseModel):
    category: str
    severity: str
    issue: str
    suggestion: str
    impact: str

# User Models (for future auth implementation)
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    odoo_partner_id: Optional[str] = None  # Placeholder for Odoo integration

# Odoo Integration Placeholder Models
class OdooSyncStatus(BaseModel):
    record_id: str
    record_type: str  # 'resume', 'cover_letter', 'user'
    odoo_id: Optional[str] = None
    sync_status: str  # 'pending', 'synced', 'error'
    last_sync: Optional[datetime] = None
    error_message: Optional[str] = None