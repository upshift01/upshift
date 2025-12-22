from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv
from typing import List, Dict
import logging

load_dotenv()

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
    
    async def improve_resume_section(self, section: str, content: str, context: str = "") -> str:
        """
        Improve a specific section of a resume using AI.
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"resume_improve_{section}",
                system_message="You are an expert CV/Resume writer specializing in the South African job market with deep expertise in ATS (Applicant Tracking Systems). Every CV you create or improve MUST be ATS-friendly with proper formatting, relevant keywords, and clear structure. Provide concise, impactful improvements that focus on quantifiable achievements."
            )
            chat.with_model("openai", "gpt-5.2")
            
            prompt = f"""Improve the following {section} section for a South African job seeker:

Current content:
{content}

{f'Context: {context}' if context else ''}

Provide an improved version that:
1. Uses strong action verbs
2. Includes quantifiable achievements where possible
3. Is ATS-friendly
4. Is tailored for the South African job market
5. Is concise but impactful

Return ONLY the improved text without any explanations."""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            return response
        except Exception as e:
            logger.error(f"Error improving resume section: {str(e)}")
            raise
    
    async def analyze_resume(self, resume_text: str) -> Dict:
        """
        Analyze a resume and provide detailed feedback.
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="resume_analysis",
                system_message="You are an expert ATS and recruitment specialist for the South African job market. All CVs MUST be ATS-friendly. Analyze resumes for ATS compatibility, keyword optimization, formatting issues, and provide detailed, actionable feedback that ensures maximum ATS pass-through rates."
            )
            chat.with_model("openai", "gpt-5.2")
            
            prompt = f"""Analyze the following resume for a South African job seeker:

{resume_text}

Provide analysis in the following JSON format:
{{
  "overall_score": <0-100>,
  "ats_score": <0-100>,
  "impact_score": <0-100>,
  "clarity_score": <0-100>,
  "keyword_score": <0-100>,
  "improvements": [
    {{
      "category": "string",
      "severity": "high|medium|low",
      "issue": "string",
      "suggestion": "string",
      "impact": "string (e.g., +15% ATS Score)"
    }}
  ]
}}

Focus on:
1. ATS compatibility for South African companies
2. Use of quantifiable achievements
3. Clarity and formatting
4. Industry-specific keywords
5. South African job market standards

Return ONLY valid JSON without any markdown formatting or explanations."""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Clean response and parse JSON
            import json
            clean_response = response.strip()
            if clean_response.startswith('```json'):
                clean_response = clean_response[7:]
            if clean_response.startswith('```'):
                clean_response = clean_response[3:]
            if clean_response.endswith('```'):
                clean_response = clean_response[:-3]
            
            return json.loads(clean_response.strip())
        except Exception as e:
            logger.error(f"Error analyzing resume: {str(e)}")
            raise
    
    async def generate_cover_letter(self, data: Dict) -> str:
        """
        Generate a professional cover letter based on provided information.
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="cover_letter_gen",
                system_message="You are an expert cover letter writer specializing in the South African job market. Create compelling, professional cover letters that highlight the candidate's strengths."
            )
            chat.with_model("openai", "gpt-4.1")
            
            prompt = f"""Generate a professional cover letter for a South African job application with the following details:

Candidate Name: {data.get('fullName')}
Company: {data.get('companyName')}
Position: {data.get('jobTitle')}
Recipient: {data.get('recipientName', 'Hiring Manager')}
Key Skills: {data.get('keySkills', 'Not provided')}
Why Interested: {data.get('whyInterested', 'Not provided')}
Job Description: {data.get('jobDescription', 'Not provided')}

Create a cover letter that:
1. Is professional and engaging
2. Highlights relevant skills and experiences
3. Shows genuine interest in the company
4. Is tailored to the South African job market
5. Is concise (around 3-4 paragraphs)
6. Uses formal South African business language

Return ONLY the cover letter text without any subject line or additional explanations."""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            return response
        except Exception as e:
            logger.error(f"Error generating cover letter: {str(e)}")
            raise
    
    async def get_job_match_score(self, resume_text: str, job_description: str) -> Dict:
        """
        Calculate how well a resume matches a job description.
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="job_match",
                system_message="You are an expert recruitment analyst. Compare resumes to job descriptions and provide match scores."
            )
            chat.with_model("openai", "gpt-4.1")
            
            prompt = f"""Compare the following resume to the job description and provide a match analysis:

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Provide analysis in JSON format:
{{
  "match_score": <0-100>,
  "strengths": ["list of matching strengths"],
  "gaps": ["list of missing requirements"],
  "recommendations": ["specific suggestions to improve match"]
}}

Return ONLY valid JSON."""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            import json
            clean_response = response.strip()
            if clean_response.startswith('```json'):
                clean_response = clean_response[7:]
            if clean_response.endswith('```'):
                clean_response = clean_response[:-3]
            
            return json.loads(clean_response.strip())
        except Exception as e:
            logger.error(f"Error calculating job match: {str(e)}")
            raise

# Initialize AI service
ai_service = AIService()