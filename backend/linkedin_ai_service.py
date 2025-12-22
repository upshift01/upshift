from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv
from typing import Dict, List, Optional
import logging
import json

load_dotenv()

logger = logging.getLogger(__name__)

class LinkedInAIService:
    """AI-powered LinkedIn profile analysis, generation, and enhancement"""
    
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
    
    async def convert_linkedin_to_resume(self, linkedin_data: Dict) -> Dict:
        """
        Convert LinkedIn profile data to a professional resume format.
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="linkedin_to_resume",
                system_message="""You are an expert CV/Resume writer specializing in the South African job market. 
                You excel at converting LinkedIn profiles into professional, ATS-friendly resumes. 
                Create resumes that are well-structured, keyword-optimized, and highlight achievements."""
            )
            chat.with_model("openai", "gpt-5.2")
            
            prompt = f"""Convert the following LinkedIn profile data into a professional, ATS-friendly resume:

LINKEDIN PROFILE DATA:
{json.dumps(linkedin_data, indent=2)}

Create a comprehensive resume with the following sections:
1. Contact Information & Professional Summary
2. Work Experience (with quantifiable achievements)
3. Education
4. Skills (categorized: Technical, Soft Skills)
5. Certifications (if any)

Provide the resume in the following JSON format:
{{
  "personal_info": {{
    "full_name": "string",
    "email": "string",
    "phone": "string (if available)",
    "location": "string",
    "linkedin_url": "string"
  }},
  "professional_summary": "A compelling 3-4 sentence summary highlighting key achievements and expertise",
  "work_experience": [
    {{
      "job_title": "string",
      "company": "string",
      "location": "string",
      "start_date": "string",
      "end_date": "string or Present",
      "achievements": ["list of quantifiable achievements with action verbs"]
    }}
  ],
  "education": [
    {{
      "degree": "string",
      "institution": "string",
      "graduation_date": "string",
      "highlights": ["optional honors, relevant coursework"]
    }}
  ],
  "skills": {{
    "technical": ["list of technical skills"],
    "soft_skills": ["list of soft skills"],
    "tools": ["list of tools/software"]
  }},
  "certifications": ["list of certifications"],
  "ats_keywords": ["list of important keywords for ATS"],
  "resume_text": "Complete formatted resume as plain text"
}}

Return ONLY valid JSON without markdown formatting."""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Clean and parse JSON
            clean_response = response.strip()
            if clean_response.startswith('```json'):
                clean_response = clean_response[7:]
            if clean_response.startswith('```'):
                clean_response = clean_response[3:]
            if clean_response.endswith('```'):
                clean_response = clean_response[:-3]
            
            return json.loads(clean_response.strip())
        except Exception as e:
            logger.error(f"Error converting LinkedIn to resume: {str(e)}")
            raise
    
    async def create_linkedin_profile(self, user_data: Dict) -> Dict:
        """
        Create LinkedIn profile content from scratch based on user's background.
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="create_linkedin",
                system_message="""You are an expert LinkedIn profile strategist and personal branding consultant 
                specializing in the South African job market. You create compelling LinkedIn profiles that 
                attract recruiters and showcase professional value. Focus on keyword optimization, 
                storytelling, and professional positioning."""
            )
            chat.with_model("openai", "gpt-5.2")
            
            prompt = f"""Create a complete, professional LinkedIn profile based on the following information:

USER INFORMATION:
{json.dumps(user_data, indent=2)}

Generate a comprehensive LinkedIn profile with the following sections:

1. **Headline** (120 characters max): A compelling headline that includes keywords and value proposition
2. **About/Summary** (2600 characters max): An engaging story-driven summary with:
   - Hook in the first line
   - Key achievements and expertise
   - Value proposition
   - Call to action
3. **Experience Descriptions**: Impactful descriptions for each role
4. **Skills List**: Recommended skills to add (prioritized)
5. **Recommendations Template**: Suggested text for requesting recommendations

Provide the profile in the following JSON format:
{{
  "headline": "Compelling headline under 120 characters",
  "headline_alternatives": ["3 alternative headline options"],
  "about_summary": "Full about section with story-driven content",
  "about_summary_short": "Condensed version for mobile preview",
  "experience_entries": [
    {{
      "job_title": "string",
      "company": "string",
      "description": "Optimized description with achievements",
      "bullet_points": ["key achievements"]
    }}
  ],
  "skills_to_add": {{
    "priority_1": ["top 5 must-have skills"],
    "priority_2": ["10 additional recommended skills"],
    "industry_keywords": ["industry-specific keywords"]
  }},
  "recommendation_request_template": "Template message to request recommendations",
  "profile_optimization_tips": ["5 tips to maximize profile visibility"],
  "target_keywords": ["keywords optimized for South African recruiters"]
}}

Return ONLY valid JSON without markdown formatting."""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            clean_response = response.strip()
            if clean_response.startswith('```json'):
                clean_response = clean_response[7:]
            if clean_response.startswith('```'):
                clean_response = clean_response[3:]
            if clean_response.endswith('```'):
                clean_response = clean_response[:-3]
            
            return json.loads(clean_response.strip())
        except Exception as e:
            logger.error(f"Error creating LinkedIn profile: {str(e)}")
            raise
    
    async def enhance_linkedin_profile(self, current_profile: Dict, target_role: Optional[str] = None) -> Dict:
        """
        Analyze and enhance existing LinkedIn profile sections.
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="enhance_linkedin",
                system_message="""You are an expert LinkedIn profile optimizer and career strategist 
                specializing in the South African job market. You analyze profiles for weaknesses 
                and provide specific, actionable improvements that increase profile views, 
                connection requests, and recruiter engagement."""
            )
            chat.with_model("openai", "gpt-5.2")
            
            target_info = f"\nTARGET ROLE: {target_role}" if target_role else ""
            
            prompt = f"""Analyze and enhance the following LinkedIn profile:{target_info}

CURRENT LINKEDIN PROFILE:
{json.dumps(current_profile, indent=2)}

Provide a comprehensive enhancement analysis with the following:

1. **Profile Score**: Overall effectiveness score (0-100)
2. **Section-by-Section Analysis**: Detailed feedback for each section
3. **Enhanced Content**: Rewritten, optimized versions of weak sections
4. **Keyword Optimization**: Missing keywords for South African job market
5. **Engagement Tips**: How to increase profile visibility

Provide analysis in the following JSON format:
{{
  "overall_score": <0-100>,
  "profile_strength": "weak|moderate|strong|excellent",
  "summary": "Brief assessment of the profile's effectiveness",
  "section_analysis": {{
    "headline": {{
      "current_score": <0-100>,
      "issues": ["list of issues"],
      "enhanced_version": "improved headline",
      "alternatives": ["2-3 alternative headlines"]
    }},
    "about": {{
      "current_score": <0-100>,
      "issues": ["list of issues"],
      "enhanced_version": "improved about section",
      "key_improvements": ["what was improved"]
    }},
    "experience": {{
      "current_score": <0-100>,
      "issues": ["common issues across experience entries"],
      "enhanced_entries": [
        {{
          "original_title": "string",
          "enhanced_description": "improved description",
          "added_achievements": ["quantifiable achievements to add"]
        }}
      ]
    }},
    "skills": {{
      "current_score": <0-100>,
      "missing_critical_skills": ["skills that should be added"],
      "skills_to_remove": ["outdated or irrelevant skills"],
      "skill_order_recommendation": ["top 10 skills in priority order"]
    }}
  }},
  "keyword_analysis": {{
    "current_keywords": ["detected keywords"],
    "missing_keywords": ["keywords to add for South African market"],
    "keyword_density_score": <0-100>
  }},
  "action_items": [
    {{
      "priority": "high|medium|low",
      "action": "specific action to take",
      "impact": "expected impact on profile performance",
      "time_estimate": "how long it will take"
    }}
  ],
  "visibility_tips": ["5 tips to increase profile visibility"],
  "recruiter_appeal_score": <0-100>,
  "ats_compatibility_score": <0-100>
}}

Return ONLY valid JSON without markdown formatting."""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            clean_response = response.strip()
            if clean_response.startswith('```json'):
                clean_response = clean_response[7:]
            if clean_response.startswith('```'):
                clean_response = clean_response[3:]
            if clean_response.endswith('```'):
                clean_response = clean_response[:-3]
            
            return json.loads(clean_response.strip())
        except Exception as e:
            logger.error(f"Error enhancing LinkedIn profile: {str(e)}")
            raise
    
    async def generate_linkedin_section(self, section_type: str, user_info: Dict) -> Dict:
        """
        Generate a specific LinkedIn section (headline, about, experience description).
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"linkedin_section_{section_type}",
                system_message="""You are an expert LinkedIn copywriter specializing in the South African job market. 
                You write compelling, keyword-optimized content that attracts recruiters and showcases professional value."""
            )
            chat.with_model("openai", "gpt-5.2")
            
            section_prompts = {
                "headline": f"""Generate 5 compelling LinkedIn headlines for:
{json.dumps(user_info, indent=2)}

Return JSON: {{"headlines": ["headline1", "headline2", ...], "best_choice": "recommended headline", "reasoning": "why this is best"}}""",
                
                "about": f"""Generate a compelling LinkedIn About section for:
{json.dumps(user_info, indent=2)}

Return JSON: {{"about_section": "full about text", "key_highlights": ["main points covered"], "keywords_included": ["SEO keywords"]}}""",
                
                "experience": f"""Generate an optimized LinkedIn experience description for:
{json.dumps(user_info, indent=2)}

Return JSON: {{"description": "full description", "achievements": ["bullet points"], "keywords": ["relevant keywords"]}}"""
            }
            
            prompt = section_prompts.get(section_type, section_prompts["headline"])
            prompt += "\n\nReturn ONLY valid JSON without markdown formatting."
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            clean_response = response.strip()
            if clean_response.startswith('```json'):
                clean_response = clean_response[7:]
            if clean_response.startswith('```'):
                clean_response = clean_response[3:]
            if clean_response.endswith('```'):
                clean_response = clean_response[:-3]
            
            return json.loads(clean_response.strip())
        except Exception as e:
            logger.error(f"Error generating LinkedIn section: {str(e)}")
            raise

# Initialize service
linkedin_ai_service = LinkedInAIService()
