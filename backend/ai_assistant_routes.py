"""
AI Assistant Bot Routes for UpShift
Provides 24/7 customer support with knowledge of all products and services
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
import os
import logging
from dotenv import load_dotenv

load_dotenv()

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

ai_assistant_router = APIRouter(prefix="/api/ai-assistant", tags=["AI Assistant"])

# Database reference - will be set from server.py
db = None

def set_db(database):
    global db
    db = database

# Pydantic Models
class ChatMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str

class QuickAction(BaseModel):
    label: str
    action: str
    url: Optional[str] = None

# UpShift Knowledge Base System Prompt
UPSHIFT_SYSTEM_PROMPT = """You are UpShift AI Assistant, a friendly and knowledgeable support bot for UpShift - an AI-powered career services platform. You provide 24/7 assistance to users.

## About UpShift
UpShift is a comprehensive AI-driven platform that helps job seekers create professional CVs, cover letters, optimize for ATS systems, and advance their careers.

## Products & Services

### 1. ATS Optimize (Tier 1) - R899
- AI-powered CV analysis and optimization
- ATS (Applicant Tracking System) compatibility check
- Keyword optimization for job descriptions
- Professional CV templates
- Instant feedback and suggestions
- Best for: Entry-level job seekers who need ATS-friendly CVs

### 2. Professional Package (Tier 2) - R1,500 (Most Popular)
- Everything in ATS Optimize, PLUS:
- AI Cover Letter Generator
- LinkedIn Profile Optimization tips
- Multiple CV versions for different roles
- Priority email support
- Best for: Mid-career professionals seeking comprehensive tools

### 3. Executive Elite (Tier 3) - R3,000 (Premium)
- Everything in Professional Package, PLUS:
- One FREE 30-minute Career Strategy Call with expert
- Executive-level CV templates
- Personal branding guidance
- WhatsApp & Phone support
- Best for: Senior professionals and executives

### 4. Career Strategy Calls - R699 (30 minutes)
- One-on-one consultation with career experts
- Personalized career advice
- Interview preparation tips
- Salary negotiation strategies
- Can be booked separately or included FREE with Executive Elite

## Key Features

### CV Builder
- AI-powered content suggestions
- Multiple professional templates
- Real-time preview
- Export to PDF/Word
- ATS-optimized formatting

### Cover Letter Generator
- AI generates tailored cover letters
- Match to specific job descriptions
- Multiple templates available
- Customizable content

### ATS Checker
- Analyzes CV for ATS compatibility
- Provides optimization score
- Keyword matching analysis
- Formatting recommendations

### LinkedIn Tools
- Profile optimization suggestions
- Headline generator
- Summary writer

## Navigation Help
When users ask to go somewhere, provide these exact URLs:
- Home: /
- Pricing: /pricing
- CV Builder: /resume-builder
- Cover Letter: /cover-letter
- ATS Checker: /ats-checker
- LinkedIn Tools: /linkedin-tools
- Strategy Call Booking: /strategy-call
- Login: /login
- Register: /register
- Contact: /contact

## Communication Guidelines
1. Be friendly, professional, and helpful
2. Use emojis sparingly but appropriately 😊
3. Keep responses concise but informative
4. If unsure about something, acknowledge it and offer to help find the answer
5. Always encourage users to explore the platform's features
6. For complex issues, suggest booking a Strategy Call
7. If asked about refunds or billing, direct to support@upshift.works
8. Never make up information about features that don't exist

## Quick Responses for Common Questions
- Payment methods: We accept credit/debit cards via Yoco payment gateway
- Refund policy: 7-day money-back guarantee if not satisfied
- Support hours: AI assistant available 24/7, human support during business hours
- Data privacy: We follow POPIA compliance, data is encrypted and secure

Remember: Your goal is to help users succeed in their career journey with UpShift's tools!"""

# Store active chat sessions in memory (for conversation context)
chat_sessions = {}

@ai_assistant_router.post("/chat", response_model=ChatMessageResponse)
async def chat_with_assistant(request: ChatMessageRequest):
    """Send a message to the AI assistant and get a response"""
    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Generate or use existing session ID
        session_id = request.session_id or str(uuid4())
        
        # Get or create chat session
        if session_id not in chat_sessions:
            chat_sessions[session_id] = LlmChat(
                api_key=api_key,
                session_id=session_id,
                system_message=UPSHIFT_SYSTEM_PROMPT
            ).with_model("openai", "gpt-4o")
        
        chat = chat_sessions[session_id]
        
        # Create user message
        user_message = UserMessage(text=request.message)
        
        # Get AI response
        response = await chat.send_message(user_message)
        
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Save to database for analytics
        await save_chat_message(session_id, request.message, response, timestamp)
        
        return ChatMessageResponse(
            response=response,
            session_id=session_id,
            timestamp=timestamp
        )
        
    except Exception as e:
        logger.error(f"AI Assistant error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@ai_assistant_router.get("/quick-actions", response_model=List[QuickAction])
async def get_quick_actions():
    """Get predefined quick action buttons for the chat widget"""
    return [
        QuickAction(label="📄 CV Builder", action="navigate", url="/resume-builder"),
        QuickAction(label="💼 View Pricing", action="navigate", url="/pricing"),
        QuickAction(label="📝 Cover Letters", action="navigate", url="/cover-letter"),
        QuickAction(label="🎯 ATS Checker", action="navigate", url="/ats-checker"),
        QuickAction(label="📞 Book Strategy Call", action="navigate", url="/strategy-call"),
        QuickAction(label="❓ How does it work?", action="message", url=None),
        QuickAction(label="💰 Pricing & Plans", action="message", url=None),
        QuickAction(label="🤝 Talk to Human", action="message", url=None),
    ]


@ai_assistant_router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    try:
        messages = await db.ai_chat_history.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(100)
        
        return {"session_id": session_id, "messages": messages}
    except Exception as e:
        logger.error(f"Error fetching chat history: {str(e)}")
        return {"session_id": session_id, "messages": []}


@ai_assistant_router.delete("/session/{session_id}")
async def clear_chat_session(session_id: str):
    """Clear a chat session"""
    try:
        if session_id in chat_sessions:
            del chat_sessions[session_id]
        
        # Optionally clear from database
        await db.ai_chat_history.delete_many({"session_id": session_id})
        
        return {"success": True, "message": "Session cleared"}
    except Exception as e:
        logger.error(f"Error clearing session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@ai_assistant_router.get("/analytics")
async def get_chat_analytics():
    """Get analytics for AI assistant usage (admin only)"""
    try:
        # Get total conversations
        total_sessions = await db.ai_chat_history.distinct("session_id")
        total_messages = await db.ai_chat_history.count_documents({})
        
        # Get recent conversations
        recent = await db.ai_chat_history.find(
            {},
            {"_id": 0, "session_id": 1, "user_message": 1, "timestamp": 1}
        ).sort("timestamp", -1).limit(20).to_list(20)
        
        return {
            "total_sessions": len(total_sessions),
            "total_messages": total_messages,
            "recent_conversations": recent
        }
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        return {"total_sessions": 0, "total_messages": 0, "recent_conversations": []}


async def save_chat_message(session_id: str, user_message: str, ai_response: str, timestamp: str):
    """Save chat message to database for analytics"""
    try:
        await db.ai_chat_history.insert_one({
            "id": str(uuid4()),
            "session_id": session_id,
            "user_message": user_message,
            "ai_response": ai_response,
            "timestamp": timestamp,
            "created_at": datetime.now(timezone.utc)
        })
    except Exception as e:
        logger.error(f"Error saving chat message: {str(e)}")
