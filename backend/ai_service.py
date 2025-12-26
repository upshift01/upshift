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
                system_message="You are an expert cover letter writer specializing in the South African job market. Create compelling, professional, ATS-friendly cover letters that highlight the candidate's strengths while incorporating relevant keywords for ATS systems."
            )
            chat.with_model("openai", "gpt-5.2")
            
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
                system_message="You are an expert recruitment analyst specializing in ATS systems. Compare resumes to job descriptions, focusing on ATS keyword matching, skills alignment, and provide specific ATS-friendly recommendations."
            )
            chat.with_model("openai", "gpt-5.2")
            
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

    async def ats_resume_check(self, resume_text: str) -> Dict:
        """
        Comprehensive ATS Resume Check - analyzes resume for ATS compliance and provides detailed feedback.
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="ats_check",
                system_message="""You are an expert ATS (Applicant Tracking System) analyst with deep knowledge of how modern ATS software parses and scores resumes. Your analysis must be thorough and actionable, helping job seekers optimize their resumes for maximum ATS compatibility."""
            )
            chat.with_model("openai", "gpt-5.2")
            
            prompt = f"""Perform a comprehensive ATS (Applicant Tracking System) analysis on the following resume:

{resume_text}

Analyze the resume across these key ATS criteria and provide a detailed assessment:

1. **Format Compatibility** (0-100): Check for ATS-friendly formatting
   - Simple, clean layout
   - Standard section headings
   - No tables, graphics, or complex formatting
   - Proper use of bullet points
   - Standard fonts

2. **Contact Information** (0-100): Verify presence and format
   - Full name clearly visible
   - Email address present
   - Phone number present
   - Location/City
   - LinkedIn profile (optional but recommended)

3. **Keywords & Skills** (0-100): Industry-relevant keywords
   - Technical skills mentioned
   - Soft skills present
   - Industry-specific terminology
   - Action verbs used

4. **Work Experience** (0-100): Professional experience section
   - Clear job titles
   - Company names included
   - Dates of employment
   - Quantifiable achievements
   - Relevant responsibilities

5. **Education** (0-100): Educational background
   - Degrees listed
   - Institution names
   - Graduation dates
   - Relevant certifications

6. **Overall Structure** (0-100): Document organization
   - Logical section order
   - Consistent formatting
   - Appropriate length
   - Clear hierarchy

Provide your analysis in the following JSON format:
{{
  "overall_score": <weighted average 0-100>,
  "summary": "Brief 2-3 sentence summary of the resume's ATS readiness",
  "categories": {{
    "format_compatibility": {{
      "score": <0-100>,
      "status": "pass|warning|fail",
      "findings": ["list of specific findings"]
    }},
    "contact_information": {{
      "score": <0-100>,
      "status": "pass|warning|fail",
      "findings": ["list of specific findings"]
    }},
    "keywords_skills": {{
      "score": <0-100>,
      "status": "pass|warning|fail",
      "findings": ["list of specific findings"],
      "detected_skills": ["list of detected skills"]
    }},
    "work_experience": {{
      "score": <0-100>,
      "status": "pass|warning|fail",
      "findings": ["list of specific findings"]
    }},
    "education": {{
      "score": <0-100>,
      "status": "pass|warning|fail",
      "findings": ["list of specific findings"]
    }},
    "overall_structure": {{
      "score": <0-100>,
      "status": "pass|warning|fail",
      "findings": ["list of specific findings"]
    }}
  }},
  "checklist": [
    {{
      "item": "Issue description",
      "status": "pass|fail|warning",
      "priority": "high|medium|low",
      "recommendation": "How to fix this issue",
      "impact": "Expected improvement (e.g., +10% ATS Score)"
    }}
  ],
  "strengths": ["List of resume strengths"],
  "critical_issues": ["List of critical issues that must be fixed"],
  "recommendations": ["Top recommendations for improvement"]
}}

Return ONLY valid JSON without any markdown formatting."""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
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
            error_str = str(e).lower()
            logger.error(f"Error performing ATS check: {str(e)}")
            
            # Check for quota/rate limit errors and provide user-friendly message
            if any(keyword in error_str for keyword in ['quota', 'rate limit', 'insufficient', 'exceeded', '429', '402', 'billing', 'credit']):
                raise QuotaExceededError("AI service quota exceeded. Please try again later or contact support.")
            elif 'timeout' in error_str or 'timed out' in error_str:
                raise AIServiceError("The AI service is taking too long to respond. Please try again.")
            elif '502' in error_str or '503' in error_str or 'bad gateway' in error_str:
                raise AIServiceError("The AI service is temporarily unavailable. Please try again in a few minutes.")
            else:
                raise AIServiceError(f"Unable to analyse resume: {str(e)}")


# Custom exceptions for better error handling
class QuotaExceededError(Exception):
    """Raised when API quota is exceeded"""
    pass

class AIServiceError(Exception):
    """Raised for general AI service errors"""
    pass


# Basic fallback ATS analysis (rule-based, no AI needed)
def fallback_ats_analysis(resume_text: str) -> Dict:
    """
    Performs a basic rule-based ATS analysis when AI is unavailable.
    This provides immediate value to users even when API quota is exceeded.
    """
    import re
    
    text_lower = resume_text.lower()
    text_length = len(resume_text)
    
    # Initialize scores
    scores = {
        "format_compatibility": 70,
        "contact_information": 50,
        "keywords_skills": 50,
        "work_experience": 50,
        "education": 50,
        "overall_structure": 60
    }
    
    findings = {
        "format_compatibility": [],
        "contact_information": [],
        "keywords_skills": [],
        "work_experience": [],
        "education": [],
        "overall_structure": []
    }
    
    detected_skills = []
    strengths = []
    critical_issues = []
    recommendations = []
    
    # Contact Information Analysis
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    phone_pattern = r'[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}'
    
    has_email = bool(re.search(email_pattern, resume_text))
    has_phone = bool(re.search(phone_pattern, resume_text))
    has_linkedin = 'linkedin' in text_lower
    
    if has_email:
        scores["contact_information"] += 20
        findings["contact_information"].append("✓ Email address detected")
    else:
        findings["contact_information"].append("✗ No email address found")
        critical_issues.append("Missing email address")
    
    if has_phone:
        scores["contact_information"] += 20
        findings["contact_information"].append("✓ Phone number detected")
    else:
        findings["contact_information"].append("✗ No phone number found")
        critical_issues.append("Missing phone number")
    
    if has_linkedin:
        scores["contact_information"] += 10
        findings["contact_information"].append("✓ LinkedIn profile mentioned")
        strengths.append("LinkedIn profile included")
    else:
        findings["contact_information"].append("○ Consider adding LinkedIn profile")
        recommendations.append("Add your LinkedIn profile URL")
    
    # Keywords & Skills Analysis
    common_skills = [
        'python', 'java', 'javascript', 'sql', 'excel', 'word', 'powerpoint',
        'management', 'leadership', 'communication', 'teamwork', 'problem solving',
        'project management', 'data analysis', 'customer service', 'sales',
        'marketing', 'finance', 'accounting', 'microsoft office', 'sap',
        'html', 'css', 'react', 'node', 'aws', 'azure', 'agile', 'scrum'
    ]
    
    for skill in common_skills:
        if skill in text_lower:
            detected_skills.append(skill.title())
            scores["keywords_skills"] += 3
    
    scores["keywords_skills"] = min(scores["keywords_skills"], 100)
    
    if len(detected_skills) > 10:
        strengths.append(f"Good variety of skills detected ({len(detected_skills)} skills)")
        findings["keywords_skills"].append(f"✓ {len(detected_skills)} relevant skills detected")
    elif len(detected_skills) > 5:
        findings["keywords_skills"].append(f"○ {len(detected_skills)} skills detected - consider adding more")
        recommendations.append("Add more industry-specific keywords and skills")
    else:
        findings["keywords_skills"].append("✗ Few skills detected - add more keywords")
        critical_issues.append("Insufficient keywords and skills")
    
    # Work Experience Analysis
    experience_keywords = ['experience', 'work history', 'employment', 'career', 'position', 'role']
    achievement_words = ['achieved', 'improved', 'increased', 'reduced', 'managed', 'led', 'developed', 'created', 'implemented']
    
    has_experience_section = any(keyword in text_lower for keyword in experience_keywords)
    achievement_count = sum(1 for word in achievement_words if word in text_lower)
    
    if has_experience_section:
        scores["work_experience"] += 20
        findings["work_experience"].append("✓ Work experience section detected")
    else:
        findings["work_experience"].append("✗ No clear work experience section")
        critical_issues.append("Missing or unclear work experience section")
    
    if achievement_count > 5:
        scores["work_experience"] += 30
        findings["work_experience"].append(f"✓ Strong action verbs used ({achievement_count} found)")
        strengths.append("Good use of action verbs and achievements")
    elif achievement_count > 2:
        scores["work_experience"] += 15
        findings["work_experience"].append(f"○ Some action verbs used ({achievement_count} found)")
        recommendations.append("Use more action verbs (achieved, improved, managed)")
    else:
        findings["work_experience"].append("✗ Few action verbs - add quantifiable achievements")
        recommendations.append("Add quantifiable achievements (e.g., 'Increased sales by 20%')")
    
    # Education Analysis
    education_keywords = ['education', 'qualification', 'degree', 'diploma', 'certificate', 'university', 'college', 'matric', 'bachelor', 'master', 'honours']
    
    education_count = sum(1 for keyword in education_keywords if keyword in text_lower)
    
    if education_count >= 3:
        scores["education"] += 40
        findings["education"].append("✓ Education section well documented")
        strengths.append("Education section is comprehensive")
    elif education_count >= 1:
        scores["education"] += 20
        findings["education"].append("○ Education section present but could be enhanced")
    else:
        findings["education"].append("✗ Education section missing or unclear")
        recommendations.append("Add clear education section with qualifications")
    
    # Overall Structure Analysis
    section_headers = ['experience', 'education', 'skills', 'summary', 'profile', 'objective', 'references', 'contact']
    sections_found = sum(1 for header in section_headers if header in text_lower)
    
    if sections_found >= 5:
        scores["overall_structure"] += 30
        findings["overall_structure"].append(f"✓ Well-structured with {sections_found} clear sections")
        strengths.append("CV has clear, well-defined sections")
    elif sections_found >= 3:
        scores["overall_structure"] += 15
        findings["overall_structure"].append(f"○ {sections_found} sections detected - consider adding more")
    else:
        findings["overall_structure"].append("✗ Few clear sections - improve document structure")
        critical_issues.append("Poor document structure")
    
    # Length check
    if 1500 < text_length < 5000:
        scores["overall_structure"] += 10
        findings["overall_structure"].append("✓ CV length is appropriate")
    elif text_length < 500:
        findings["overall_structure"].append("✗ CV appears too short")
        critical_issues.append("CV is too short - add more detail")
    elif text_length > 8000:
        findings["overall_structure"].append("✗ CV may be too long")
        recommendations.append("Consider condensing to 2 pages maximum")
    
    # Format compatibility (basic checks)
    if '|' in resume_text or '\t\t\t' in resume_text:
        scores["format_compatibility"] -= 10
        findings["format_compatibility"].append("○ Possible table or complex formatting detected")
        recommendations.append("Avoid tables - use simple formatting for better ATS parsing")
    else:
        findings["format_compatibility"].append("✓ No complex tables detected")
    
    # Calculate overall score
    overall_score = int(sum(scores.values()) / len(scores))
    
    # Determine status for each category
    def get_status(score):
        if score >= 70:
            return "pass"
        elif score >= 50:
            return "warning"
        return "fail"
    
    # Build checklist
    checklist = []
    if not has_email:
        checklist.append({
            "item": "Email address missing",
            "status": "fail",
            "priority": "high",
            "recommendation": "Add a professional email address",
            "impact": "+15% ATS Score"
        })
    if not has_phone:
        checklist.append({
            "item": "Phone number missing",
            "status": "fail",
            "priority": "high",
            "recommendation": "Add a contact phone number",
            "impact": "+10% ATS Score"
        })
    if len(detected_skills) < 5:
        checklist.append({
            "item": "Insufficient keywords",
            "status": "warning",
            "priority": "high",
            "recommendation": "Add more industry-specific skills and keywords",
            "impact": "+20% ATS Score"
        })
    if achievement_count < 3:
        checklist.append({
            "item": "Weak action verbs",
            "status": "warning",
            "priority": "medium",
            "recommendation": "Use strong action verbs (achieved, implemented, managed)",
            "impact": "+10% ATS Score"
        })
    
    return {
        "overall_score": overall_score,
        "summary": f"Basic ATS analysis complete. Your CV scored {overall_score}/100. {'This is a good foundation!' if overall_score >= 70 else 'There is room for improvement.' if overall_score >= 50 else 'Significant improvements needed.'}",
        "categories": {
            "format_compatibility": {
                "score": min(scores["format_compatibility"], 100),
                "status": get_status(scores["format_compatibility"]),
                "findings": findings["format_compatibility"]
            },
            "contact_information": {
                "score": min(scores["contact_information"], 100),
                "status": get_status(scores["contact_information"]),
                "findings": findings["contact_information"]
            },
            "keywords_skills": {
                "score": min(scores["keywords_skills"], 100),
                "status": get_status(scores["keywords_skills"]),
                "findings": findings["keywords_skills"],
                "detected_skills": detected_skills[:20]  # Limit to 20 skills
            },
            "work_experience": {
                "score": min(scores["work_experience"], 100),
                "status": get_status(scores["work_experience"]),
                "findings": findings["work_experience"]
            },
            "education": {
                "score": min(scores["education"], 100),
                "status": get_status(scores["education"]),
                "findings": findings["education"]
            },
            "overall_structure": {
                "score": min(scores["overall_structure"], 100),
                "status": get_status(scores["overall_structure"]),
                "findings": findings["overall_structure"]
            }
        },
        "checklist": checklist,
        "strengths": strengths if strengths else ["CV uploaded successfully"],
        "critical_issues": critical_issues if critical_issues else [],
        "recommendations": recommendations[:5] if recommendations else ["Keep your CV updated regularly"],
        "is_fallback": True,
        "fallback_notice": "This is a basic analysis. For detailed AI-powered insights, please try again later when the service is available."
    }


# Initialize AI service
ai_service = AIService()