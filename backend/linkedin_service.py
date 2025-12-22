import os
import httpx
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Store OAuth states temporarily (use Redis in production)
oauth_states = {}

class LinkedInOAuthService:
    """Service for handling LinkedIn OAuth authentication"""
    
    def __init__(self):
        self.client_id = os.environ.get('LINKEDIN_CLIENT_ID')
        self.client_secret = os.environ.get('LINKEDIN_CLIENT_SECRET')
        self.redirect_uri = os.environ.get('LINKEDIN_REDIRECT_URI', 'http://localhost:3000/dashboard/linkedin-callback')
        self.auth_url = "https://www.linkedin.com/oauth/v2/authorization"
        self.token_url = "https://www.linkedin.com/oauth/v2/accessToken"
        self.profile_url = "https://api.linkedin.com/v2/userinfo"
        
    def is_configured(self) -> bool:
        """Check if LinkedIn OAuth is properly configured"""
        return bool(self.client_id and self.client_secret)
    
    def get_authorization_url(self, user_id: str) -> Dict:
        """Generate LinkedIn authorization URL for user consent"""
        if not self.is_configured():
            return {"error": "LinkedIn OAuth not configured"}
            
        state = secrets.token_urlsafe(32)
        oauth_states[state] = {
            "user_id": user_id,
            "expires": datetime.utcnow() + timedelta(minutes=10)
        }
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "openid profile email",
            "state": state
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        auth_url = f"{self.auth_url}?{query_string}"
        
        return {"auth_url": auth_url, "state": state}
    
    async def exchange_code_for_token(self, code: str, state: str) -> Dict:
        """Exchange authorization code for access token"""
        # Verify state
        if state not in oauth_states:
            raise ValueError("Invalid or expired state")
        
        state_data = oauth_states[state]
        if state_data["expires"] < datetime.utcnow():
            del oauth_states[state]
            raise ValueError("State expired")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": self.redirect_uri,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Token exchange failed: {response.text}")
                    raise ValueError(f"Token exchange failed: {response.text}")
                
                token_data = response.json()
                user_id = state_data["user_id"]
                del oauth_states[state]
                
                return {
                    "access_token": token_data.get("access_token"),
                    "expires_in": token_data.get("expires_in"),
                    "user_id": user_id
                }
        except Exception as e:
            logger.error(f"Error exchanging code: {str(e)}")
            raise
    
    async def get_profile(self, access_token: str) -> Dict:
        """Retrieve user profile data from LinkedIn"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.profile_url,
                    headers={
                        "Authorization": f"Bearer {access_token}"
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Profile fetch failed: {response.text}")
                    raise ValueError(f"Profile fetch failed")
                
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching profile: {str(e)}")
            raise

# Initialize service
linkedin_oauth_service = LinkedInOAuthService()
