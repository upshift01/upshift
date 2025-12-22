from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
from auth import get_current_user
from database import db

router = APIRouter(prefix="/api/customer", tags=["customer"])

# Pydantic Models
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    email_updates: bool = True
    marketing: bool = False
    tips: bool = True

class JobApplication(BaseModel):
    company: str
    position: str
    location: Optional[str] = ""
    url: Optional[str] = ""
    status: str = "saved"
    notes: Optional[str] = ""

class JobUpdate(BaseModel):
    company: Optional[str] = None
    position: Optional[str] = None
    location: Optional[str] = None
    url: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class InterviewPracticeRequest(BaseModel):
    question: str
    answer: str
    job_title: Optional[str] = ""
    industry: Optional[str] = ""

# Dashboard Stats
@router.get("/dashboard-stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Get document count
    documents_count = await db.documents.count_documents({"user_id": user_id})
    
    # Get ATS checks count
    ats_checks = await db.ats_results.count_documents({"user_id": user_id})
    
    # Get AI generations count
    ai_generations = await db.ai_generations.count_documents({"user_id": user_id})
    
    # Get jobs tracked count
    jobs_count = await db.job_applications.count_documents({"user_id": user_id})
    
    # Check if user has used LinkedIn tools
    linkedin_used = await db.linkedin_activity.count_documents({"user_id": user_id}) > 0
    
    return {
        "total_documents": documents_count,
        "ats_checks": ats_checks,
        "ai_generations": ai_generations,
        "jobs_tracked": jobs_count,
        "linkedin_used": linkedin_used
    }

# Recent Activity
@router.get("/recent-activity")
async def get_recent_activity(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    activities = []
    
    # Get recent ATS checks
    ats_results = await db.ats_results.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for result in ats_results:
        activities.append({
            "type": "ats",
            "description": f"ATS Check: Score {result.get('score', 0)}%",
            "created_at": result.get("created_at", datetime.now(timezone.utc).isoformat())
        })
    
    # Get recent documents
    docs = await db.documents.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for doc in docs:
        activities.append({
            "type": "document",
            "description": f"Created: {doc.get('name', 'Document')}",
            "created_at": doc.get("created_at", datetime.now(timezone.utc).isoformat())
        })
    
    # Sort by date
    activities.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"activities": activities[:10]}

# Documents
@router.get("/documents")
async def get_documents(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    documents = await db.documents.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"documents": documents}

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    result = await db.documents.delete_one({"id": doc_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True}

# Job Applications
@router.get("/jobs")
async def get_jobs(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    jobs = await db.job_applications.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"jobs": jobs}

@router.post("/jobs")
async def create_job(job: JobApplication, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    new_job = {
        "id": str(uuid4()),
        "user_id": user_id,
        "company": job.company,
        "position": job.position,
        "location": job.location,
        "url": job.url,
        "status": job.status,
        "notes": job.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.job_applications.insert_one(new_job)
    return {"job": {k: v for k, v in new_job.items() if k != "_id"}}

@router.put("/jobs/{job_id}")
async def update_job(job_id: str, job_update: JobUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in job_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.job_applications.update_one(
        {"id": job_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"success": True}

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    result = await db.job_applications.delete_one({"id": job_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"success": True}

# Profile
@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "full_name": current_user.get("full_name", ""),
        "email": current_user.get("email", ""),
        "phone": current_user.get("phone", "")
    }

@router.put("/profile")
async def update_profile(profile: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in profile.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Profile updated successfully"}

# Password Change
@router.post("/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    import bcrypt
    user_id = current_user["id"]
    
    # Get user with password
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not bcrypt.checkpw(data.current_password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash new password
    new_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Password changed successfully"}

# Notifications
@router.get("/notifications")
async def get_notification_preferences(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    prefs = await db.notification_preferences.find_one({"user_id": user_id}, {"_id": 0})
    
    if not prefs:
        return {"email_updates": True, "marketing": False, "tips": True}
    
    return prefs

@router.put("/notifications")
async def update_notification_preferences(
    prefs: NotificationPreferences, 
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    
    await db.notification_preferences.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "email_updates": prefs.email_updates,
            "marketing": prefs.marketing,
            "tips": prefs.tips,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True}

# Analytics
@router.get("/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Get counts
    documents_count = await db.documents.count_documents({"user_id": user_id})
    ats_checks = await db.ats_results.count_documents({"user_id": user_id})
    ai_generations = await db.ai_generations.count_documents({"user_id": user_id})
    
    # Calculate average ATS score
    ats_results = await db.ats_results.find(
        {"user_id": user_id},
        {"_id": 0, "score": 1}
    ).to_list(100)
    
    avg_score = 0
    if ats_results:
        scores = [r.get("score", 0) for r in ats_results if r.get("score")]
        if scores:
            avg_score = round(sum(scores) / len(scores))
    
    # Get this month stats
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    docs_this_month = await db.documents.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": month_start.isoformat()}
    })
    
    ats_this_month = await db.ats_results.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": month_start.isoformat()}
    })
    
    return {
        "total_documents": documents_count,
        "ai_generations": ai_generations,
        "ats_checks": ats_checks,
        "avg_ats_score": avg_score,
        "documents_this_month": docs_this_month,
        "ats_checks_this_month": ats_this_month,
        "this_month_activity": docs_this_month + ats_this_month
    }

# ATS History
@router.get("/ats-history")
async def get_ats_history(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    history = await db.ats_results.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {"history": history}

# Interview Prep - Get AI Feedback
@router.post("/interview-feedback")
async def get_interview_feedback(
    request: InterviewPracticeRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        from emergentintegrations.llm.chat import chat, LlmModel
        import os
        
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")
        
        prompt = f"""You are an expert interview coach. Analyze this interview answer and provide constructive feedback.

Question: {request.question}
Job Title: {request.job_title or 'Not specified'}
Industry: {request.industry or 'Not specified'}

Candidate's Answer:
{request.answer}

Provide feedback in this exact JSON format:
{{
    "score": <number 0-100>,
    "strengths": "<what they did well>",
    "improvements": "<specific areas to improve>",
    "suggested": "<a model answer or key points to include>"
}}

Be encouraging but honest. Focus on specific, actionable feedback."""

        response = await chat(
            api_key=api_key,
            model=LlmModel.GPT_4O,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        import json
        feedback = json.loads(response)
        
        return feedback
        
    except Exception as e:
        print(f"Error generating interview feedback: {e}")
        return {
            "score": 70,
            "strengths": "Good attempt at answering the question.",
            "improvements": "Consider adding more specific examples and quantifiable results.",
            "suggested": "A strong answer would include the STAR method (Situation, Task, Action, Result) with specific metrics."
        }
