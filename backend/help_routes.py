"""
Help Center Routes - User Manual and Documentation
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io
import logging
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

help_router = APIRouter(prefix="/api/help", tags=["Help Center"])

logger = logging.getLogger(__name__)

# Database reference (will be set from server.py)
db = None

def set_db(database):
    global db
    db = database


# Help content data - comprehensive manual content
HELP_CONTENT = {
    "cv_builder": {
        "title": "CV Builder",
        "description": "Create professional, ATS-optimised CVs with AI assistance",
        "steps": [
            ("Choose a Template", "Start by selecting a template that matches your industry and career level. We offer General templates for versatile use, ATS-Optimised templates that pass Applicant Tracking Systems, and Industry-Specific templates tailored for your field."),
            ("Enter Personal Information", "Fill in your contact details including full name, email, phone number, and location. You can also add a professional photo, ID/passport number, and languages you speak."),
            ("Add Work Experience", "Enter your work history with job titles, company names, dates, and descriptions. Use the 'AI Enhance' button to automatically improve your descriptions and generate key achievements."),
            ("Add Education", "Include your educational background with degrees, institutions, and graduation years. Add any relevant certifications or courses."),
            ("List Your Skills", "Add your technical and soft skills. Use the 'Suggest Skills' feature to get AI-powered recommendations based on your experience and target role."),
            ("Add References", "Include professional references with their contact details. This section is optional but recommended for senior positions."),
            ("Generate & Download", "Click 'Generate & Download CV' to create your professional PDF. Your CV will also be saved to 'My Documents' for future editing.")
        ],
        "tips": [
            "Use action verbs to start bullet points (e.g., 'Managed', 'Developed', 'Increased')",
            "Quantify achievements with numbers where possible",
            "Keep your CV to 1-2 pages for most roles",
            "Tailor your CV for each job application"
        ]
    },
    "improve_cv": {
        "title": "Improve CV / Resume Enhancer",
        "description": "Upload your existing CV and let AI enhance it professionally",
        "steps": [
            ("Upload Your CV", "Drag and drop your existing CV (PDF, DOC, or DOCX format) or click to browse. Our AI will extract all the information automatically."),
            ("Review Extracted Data", "Check the extracted information for accuracy. The AI will identify your personal details, work experience, education, and skills."),
            ("AI Enhancement", "Click 'Enhance with AI' to automatically improve your professional summary, job descriptions, and achievements. The AI will make your content more impactful and ATS-friendly."),
            ("Select Template", "Choose a new professional template to give your CV a fresh, modern look while keeping your enhanced content."),
            ("Download Enhanced CV", "Generate and download your improved CV as a professionally formatted PDF.")
        ],
        "tips": [
            "Upload a text-based PDF for best extraction results",
            "Review AI suggestions and personalise as needed",
            "Compare before and after versions to see improvements"
        ]
    },
    "ats_checker": {
        "title": "ATS Checker",
        "description": "Check if your CV passes Applicant Tracking Systems",
        "steps": [
            ("Upload Your CV", "Upload your CV in PDF, DOC, or DOCX format. For best results, use a text-based PDF rather than a scanned image."),
            ("Optional: Add Job Description", "Paste the job description you're applying for to get tailored keyword matching and recommendations."),
            ("Get Your Score", "Receive an ATS compatibility score out of 100, along with detailed feedback on formatting, keywords, and structure."),
            ("Review Recommendations", "Read through specific suggestions to improve your CV's ATS compatibility, including missing keywords and formatting issues."),
            ("Make Improvements", "Use our CV Builder or Improve CV tool to implement the recommended changes and re-check your score.")
        ],
        "tips": [
            "Aim for a score of 80% or higher",
            "Use standard section headings (Education, Experience, Skills)",
            "Avoid tables, graphics, and unusual fonts",
            "Include keywords from the job description naturally"
        ]
    },
    "cover_letter": {
        "title": "Cover Letter Generator",
        "description": "Generate compelling, personalised cover letters with AI",
        "steps": [
            ("Enter Job Details", "Provide the job title, company name, and paste the job description. This helps the AI tailor your cover letter."),
            ("Add Your Background", "Enter your relevant experience, skills, and achievements. You can also upload your CV for automatic extraction."),
            ("Choose Tone & Style", "Select the tone (Professional, Enthusiastic, Confident) and length (Short, Medium, Long) that suits the role and company culture."),
            ("Generate Cover Letter", "Click generate to create your AI-powered cover letter. The system will match your experience to the job requirements."),
            ("Edit & Personalise", "Review and edit the generated letter. Add personal touches and specific examples that showcase your fit for the role."),
            ("Download", "Download your cover letter as a PDF or copy the text to paste directly into job applications.")
        ],
        "tips": [
            "Research the company before generating",
            "Mention specific projects or achievements",
            "Keep it to one page",
            "Address it to a specific person if possible"
        ]
    },
    "linkedin_tools": {
        "title": "LinkedIn Tools",
        "description": "Optimise your LinkedIn profile for maximum visibility",
        "steps": [
            ("Profile Analyser", "Enter your LinkedIn profile URL or paste your current headline and summary. Our AI will analyse it for effectiveness."),
            ("Headline Generator", "Generate compelling headlines that highlight your value proposition. Choose from multiple AI-generated options."),
            ("Summary Writer", "Create an engaging 'About' section that tells your professional story and includes relevant keywords."),
            ("Skills Optimisation", "Get recommendations for skills to add based on your industry and target roles."),
            ("Implementation Tips", "Follow our guide to update your LinkedIn profile with the optimised content.")
        ],
        "tips": [
            "Use industry keywords in your headline",
            "Keep your summary focused on value you provide",
            "Update your profile regularly",
            "Engage with content in your field"
        ]
    },
    "skills_generator": {
        "title": "Skills Generator",
        "description": "Discover relevant skills for your industry and role",
        "steps": [
            ("Enter Your Role", "Specify your current job title, target role, and industry. This helps the AI understand your context."),
            ("Review Generated Skills", "Get a comprehensive list of technical skills, soft skills, and industry-specific competencies."),
            ("Select Relevant Skills", "Choose the skills that match your experience and add them to your profile."),
            ("Add to CV", "Export selected skills directly to your CV Builder or copy them for manual addition.")
        ],
        "tips": [
            "Focus on skills mentioned in job descriptions",
            "Balance technical and soft skills",
            "Only list skills you can demonstrate",
            "Update skills as you learn new ones"
        ]
    },
    "job_tracker": {
        "title": "Job Tracker",
        "description": "Track and manage your job applications in one place",
        "steps": [
            ("Add Application", "Enter job details including company, position, salary range, and application date."),
            ("Track Status", "Update application status as you progress: Applied, Interview, Offer, Rejected, or Accepted."),
            ("Add Notes", "Keep notes on each application including interview feedback, contact names, and follow-up dates."),
            ("Set Reminders", "Set reminders for follow-ups and interview preparation."),
            ("Review Analytics", "View your application statistics including response rates and time-to-interview metrics.")
        ],
        "tips": [
            "Update status promptly after each interaction",
            "Note key details after every interview",
            "Follow up within one week of applying",
            "Track which CV version you used for each application"
        ]
    },
    "interview_prep": {
        "title": "Interview Preparation",
        "description": "Prepare for interviews with AI-powered practice and tips",
        "steps": [
            ("Select Interview Type", "Choose the type of interview: Behavioural, Technical, Case Study, or General."),
            ("Enter Job Details", "Provide the job title, company, and description to get tailored questions."),
            ("Practice Questions", "Review common questions and practice your responses. Use the STAR method for behavioural questions."),
            ("AI Feedback", "Get AI feedback on your practice answers with suggestions for improvement."),
            ("Research Tips", "Access company research tips and questions to ask the interviewer.")
        ],
        "tips": [
            "Use the STAR method: Situation, Task, Action, Result",
            "Prepare 3-5 stories that demonstrate key competencies",
            "Research the company's recent news and projects",
            "Prepare thoughtful questions to ask the interviewer"
        ]
    },
    "strategy_call": {
        "title": "Book Strategy Call",
        "description": "Schedule a one-on-one career strategy session with our experts",
        "steps": [
            ("Choose Service", "Select the type of consultation: CV Review, Career Coaching, Interview Prep, or Comprehensive Package."),
            ("Select Date & Time", "Browse available slots and choose a time that works for you. Sessions are typically 30-60 minutes."),
            ("Provide Background", "Fill in your career background, goals, and specific questions you'd like to discuss."),
            ("Confirm Booking", "Review your booking details and complete the payment to confirm your session."),
            ("Prepare for Session", "You'll receive a confirmation email with preparation tips and meeting link.")
        ],
        "tips": [
            "Have your CV ready to share",
            "Prepare specific questions in advance",
            "Be ready to discuss your career goals",
            "Take notes during the session"
        ]
    }
}

RESELLER_HELP_CONTENT = {
    "reseller_dashboard": {
        "title": "Reseller Dashboard",
        "description": "Overview of your reseller portal and key metrics",
        "steps": [
            ("Access Dashboard", "Log in to your reseller account at /reseller-dashboard to view your business overview."),
            ("View Statistics", "Monitor key metrics including total customers, active subscriptions, revenue, and recent activity."),
            ("Recent Activity", "Track new sign-ups, purchases, and customer actions in real-time.")
        ],
        "tips": [
            "Check your dashboard daily for new sign-ups",
            "Monitor customer activity to identify engagement opportunities"
        ]
    },
    "customer_management": {
        "title": "Customer Management",
        "description": "Manage your customers and their subscriptions",
        "steps": [
            ("View Customers", "Access the Customers page to see all your registered users with their subscription status."),
            ("Search & Filter", "Use search and filters to find specific customers by name, email, or subscription tier."),
            ("View Details", "Click on a customer to view their full profile, activity history, and documents."),
            ("Manage Subscriptions", "Upgrade, downgrade, or manage customer subscription tiers as needed.")
        ],
        "tips": [
            "Regularly review customer activity",
            "Reach out to inactive customers",
            "Celebrate customer milestones"
        ]
    },
    "branding_setup": {
        "title": "Branding & White-Label Setup",
        "description": "Customise your partner site with your branding",
        "steps": [
            ("Upload Logo", "Go to Settings > Branding and upload your company logo (recommended size: 200x60px)."),
            ("Set Brand Colors", "Choose your primary and secondary brand colors using the color picker."),
            ("Update Contact Info", "Enter your business contact details including email, phone, and address."),
            ("Configure Domain", "Set up your custom domain or subdomain for a fully branded experience."),
            ("Preview & Save", "Preview your changes and save to apply them to your partner site.")
        ],
        "tips": [
            "Use high-resolution logos for best quality",
            "Choose colors that match your brand guidelines",
            "Test your partner site on mobile devices"
        ]
    },
    "cv_templates": {
        "title": "CV Templates Management",
        "description": "Upload and manage custom CV templates for your customers",
        "steps": [
            ("Access Templates", "Navigate to CV Templates (.docx) in the reseller dashboard sidebar."),
            ("Upload Template", "Click 'Upload Template' and select your custom .docx CV template file."),
            ("Add Template Details", "Provide a name and description for your template."),
            ("Manage Templates", "View, edit, or delete existing templates from the templates list."),
            ("Customer Access", "Your customers will automatically see your custom templates when using the CV Builder.")
        ],
        "tips": [
            "Use placeholders like {{FULL_NAME}}, {{EMAIL}}, {{EXPERIENCE}} in your .docx templates",
            "Test templates with different CV data before making them available",
            "Create industry-specific templates for different customer segments"
        ]
    },
    "pricing_setup": {
        "title": "Pricing Configuration",
        "description": "Set up custom pricing for your partner site",
        "steps": [
            ("Access Pricing", "Go to Pricing in the reseller dashboard sidebar."),
            ("Configure Tiers", "Set prices for each service tier (ATS Optimise, Professional, Executive Elite)."),
            ("Set Currency", "Choose the currency and display format for your market."),
            ("Save Changes", "Save your pricing configuration to apply it to your partner site.")
        ],
        "tips": [
            "Research competitor pricing in your market",
            "Consider offering promotional pricing for new customers",
            "Update pricing seasonally based on demand"
        ]
    }
}


def generate_manual_pdf():
    """Generate a comprehensive PDF user manual"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch
    )
    
    # Colors
    primary_color = HexColor('#1e40af')
    secondary_color = HexColor('#7c3aed')
    text_color = HexColor('#1f2937')
    light_gray = HexColor('#f3f4f6')
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Cover title
    cover_title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Title'],
        fontSize=32,
        textColor=primary_color,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    # Cover subtitle
    cover_subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontSize=16,
        textColor=secondary_color,
        alignment=TA_CENTER,
        spaceAfter=40
    )
    
    # Section title
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=primary_color,
        spaceBefore=20,
        spaceAfter=10,
        borderPadding=5
    )
    
    # Subsection title
    subsection_title_style = ParagraphStyle(
        'SubsectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=secondary_color,
        spaceBefore=15,
        spaceAfter=6
    )
    
    # Body text
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=text_color,
        alignment=TA_JUSTIFY,
        spaceBefore=4,
        spaceAfter=4,
        leading=14
    )
    
    # Step style
    step_style = ParagraphStyle(
        'StepText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=text_color,
        leftIndent=20,
        spaceBefore=3,
        spaceAfter=3,
        leading=13
    )
    
    # Tip style
    tip_style = ParagraphStyle(
        'TipText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#059669'),
        leftIndent=25,
        spaceBefore=2,
        spaceAfter=2,
        leading=12
    )
    
    story = []
    
    # Cover Page
    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph("UpShift", cover_title_style))
    story.append(Paragraph("User Manual", cover_title_style))
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph("AI-Powered Career Tools Platform", cover_subtitle_style))
    story.append(Spacer(1, 1 * inch))
    story.append(Paragraph(f"Version 1.0 • {datetime.now().strftime('%B %Y')}", ParagraphStyle(
        'Version',
        parent=styles['Normal'],
        fontSize=10,
        textColor=text_color,
        alignment=TA_CENTER
    )))
    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph("This manual covers all features of the UpShift platform,<br/>including tools for job seekers and reseller/partner functionality.", ParagraphStyle(
        'CoverNote',
        parent=styles['Normal'],
        fontSize=10,
        textColor=text_color,
        alignment=TA_CENTER,
        leading=14
    )))
    story.append(PageBreak())
    
    # Table of Contents
    story.append(Paragraph("Table of Contents", section_title_style))
    story.append(Spacer(1, 0.3 * inch))
    
    toc_style = ParagraphStyle(
        'TOC',
        parent=styles['Normal'],
        fontSize=11,
        textColor=text_color,
        spaceBefore=6,
        spaceAfter=6
    )
    
    story.append(Paragraph("<b>Part 1: User Guide</b>", toc_style))
    for idx, key in enumerate(HELP_CONTENT.keys(), 1):
        story.append(Paragraph(f"   {idx}. {HELP_CONTENT[key]['title']}", toc_style))
    
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("<b>Part 2: Reseller/Partner Guide</b>", toc_style))
    for idx, key in enumerate(RESELLER_HELP_CONTENT.keys(), 1):
        story.append(Paragraph(f"   {idx}. {RESELLER_HELP_CONTENT[key]['title']}", toc_style))
    
    story.append(PageBreak())
    
    # Part 1: User Guide
    story.append(Paragraph("Part 1: User Guide", ParagraphStyle(
        'PartTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=primary_color,
        alignment=TA_CENTER,
        spaceBefore=40,
        spaceAfter=30
    )))
    story.append(Paragraph("This section covers all the tools available to help you in your job search and career development.", body_style))
    story.append(Spacer(1, 0.3 * inch))
    
    # User sections
    for key, section in HELP_CONTENT.items():
        story.append(Paragraph(section['title'], section_title_style))
        story.append(Paragraph(section['description'], body_style))
        story.append(Spacer(1, 0.1 * inch))
        
        # Steps
        story.append(Paragraph("<b>How to Use:</b>", subsection_title_style))
        for idx, (step_title, step_content) in enumerate(section['steps'], 1):
            story.append(Paragraph(f"<b>Step {idx}: {step_title}</b>", step_style))
            story.append(Paragraph(step_content, step_style))
        
        # Tips
        if section.get('tips'):
            story.append(Spacer(1, 0.1 * inch))
            story.append(Paragraph("<b>Pro Tips:</b>", subsection_title_style))
            for tip in section['tips']:
                story.append(Paragraph(f"✓ {tip}", tip_style))
        
        story.append(Spacer(1, 0.3 * inch))
    
    story.append(PageBreak())
    
    # Part 2: Reseller Guide
    story.append(Paragraph("Part 2: Reseller/Partner Guide", ParagraphStyle(
        'PartTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=secondary_color,
        alignment=TA_CENTER,
        spaceBefore=40,
        spaceAfter=30
    )))
    story.append(Paragraph("This section covers the features available to resellers and partners for managing their white-label career services platform.", body_style))
    story.append(Spacer(1, 0.3 * inch))
    
    # Reseller sections
    for key, section in RESELLER_HELP_CONTENT.items():
        story.append(Paragraph(section['title'], section_title_style))
        story.append(Paragraph(section['description'], body_style))
        story.append(Spacer(1, 0.1 * inch))
        
        # Steps
        story.append(Paragraph("<b>How to Use:</b>", subsection_title_style))
        for idx, (step_title, step_content) in enumerate(section['steps'], 1):
            story.append(Paragraph(f"<b>Step {idx}: {step_title}</b>", step_style))
            story.append(Paragraph(step_content, step_style))
        
        # Tips
        if section.get('tips'):
            story.append(Spacer(1, 0.1 * inch))
            story.append(Paragraph("<b>Pro Tips:</b>", subsection_title_style))
            for tip in section['tips']:
                story.append(Paragraph(f"✓ {tip}", tip_style))
        
        story.append(Spacer(1, 0.3 * inch))
    
    # Final page - Support info
    story.append(PageBreak())
    story.append(Paragraph("Need More Help?", section_title_style))
    story.append(Spacer(1, 0.2 * inch))
    
    support_items = [
        ("<b>Email Support:</b> support@upshift.works", body_style),
        ("<b>Online Help Center:</b> Visit /help on the platform", body_style),
        ("<b>Book a Strategy Call:</b> One-on-one career consultation", body_style),
        ("<b>Contact Page:</b> Visit /contact for additional support options", body_style),
    ]
    
    for text, style in support_items:
        story.append(Paragraph(text, style))
        story.append(Spacer(1, 0.1 * inch))
    
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph("Thank you for choosing UpShift!", ParagraphStyle(
        'Thanks',
        parent=styles['Normal'],
        fontSize=12,
        textColor=primary_color,
        alignment=TA_CENTER,
        spaceBefore=20
    )))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return buffer


@help_router.get("/user-manual/pdf")
async def download_user_manual_pdf():
    """Generate and download the user manual as a PDF"""
    try:
        pdf_buffer = generate_manual_pdf()
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=UpShift_User_Manual.pdf"
            }
        )
    except Exception as e:
        logger.error(f"Error generating user manual PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@help_router.get("/content")
async def get_help_content():
    """Get all help content for the online help center"""
    try:
        return {
            "user_guide": HELP_CONTENT,
            "reseller_guide": RESELLER_HELP_CONTENT
        }
    except Exception as e:
        logger.error(f"Error getting help content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@help_router.get("/content/{section_key}")
async def get_help_section(section_key: str):
    """Get a specific help section"""
    try:
        # Check user guide first
        if section_key in HELP_CONTENT:
            return HELP_CONTENT[section_key]
        
        # Check reseller guide
        if section_key in RESELLER_HELP_CONTENT:
            return RESELLER_HELP_CONTENT[section_key]
        
        raise HTTPException(status_code=404, detail=f"Help section '{section_key}' not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting help section: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
