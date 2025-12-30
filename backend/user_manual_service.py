"""
User Manual PDF Generation Service
Generates a comprehensive PDF user manual for UpShift
"""
import io
import logging
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    PageBreak, ListFlowable, ListItem, Image
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

logger = logging.getLogger(__name__)

# Brand colors
PRIMARY_COLOR = colors.HexColor('#1e40af')
SECONDARY_COLOR = colors.HexColor('#7c3aed')
ACCENT_COLOR = colors.HexColor('#059669')

# Help content data
HELP_SECTIONS = {
    'cv-builder': {
        'title': 'CV Builder',
        'description': 'Create professional, ATS-optimised CVs with AI assistance',
        'audience': 'Users',
        'steps': [
            ('Choose a Template', 'Start by selecting a template that matches your industry and career level. We offer General templates for versatile use, ATS-Optimised templates that pass Applicant Tracking Systems, and Industry-Specific templates tailored for your field.'),
            ('Enter Personal Information', 'Fill in your contact details including full name, email, phone number, and location. You can also add a professional photo, ID/passport number, and languages you speak.'),
            ('Add Work Experience', 'Enter your work history with job titles, company names, dates, and descriptions. Use the "AI Enhance" button to automatically improve your descriptions and generate key achievements.'),
            ('Add Education', 'Include your educational background with degrees, institutions, and graduation years. Add any relevant certifications or courses.'),
            ('List Your Skills', 'Add your technical and soft skills. Use the "Suggest Skills" feature to get AI-powered recommendations based on your experience and target role.'),
            ('Add References', 'Include professional references with their contact details. This section is optional but recommended for senior positions.'),
            ('Generate & Download', 'Click "Generate & Download CV" to create your professional PDF. Your CV will also be saved to "My Documents" for future editing.')
        ],
        'tips': [
            'Use action verbs to start bullet points (e.g., "Managed", "Developed", "Increased")',
            'Quantify achievements with numbers where possible',
            'Keep your CV to 1-2 pages for most roles',
            'Tailor your CV for each job application'
        ]
    },
    'improve-cv': {
        'title': 'Improve CV / Resume Enhancer',
        'description': 'Upload your existing CV and let AI enhance it professionally',
        'audience': 'Users',
        'steps': [
            ('Upload Your CV', 'Drag and drop your existing CV (PDF, DOC, or DOCX format) or click to browse. Our AI will extract all the information automatically.'),
            ('Review Extracted Data', 'Check the extracted information for accuracy. The AI will identify your personal details, work experience, education, and skills.'),
            ('AI Enhancement', 'Click "Enhance with AI" to automatically improve your professional summary, job descriptions, and achievements.'),
            ('Select Template', 'Choose a new professional template to give your CV a fresh, modern look while keeping your enhanced content.'),
            ('Download Enhanced CV', 'Generate and download your improved CV as a professionally formatted PDF.')
        ],
        'tips': [
            'Upload a text-based PDF for best extraction results',
            'Review AI suggestions and personalise as needed',
            'Compare before and after versions to see improvements'
        ]
    },
    'ats-checker': {
        'title': 'ATS Checker',
        'description': 'Check if your CV passes Applicant Tracking Systems',
        'audience': 'Users',
        'steps': [
            ('Upload Your CV', 'Upload your CV in PDF, DOC, or DOCX format. For best results, use a text-based PDF rather than a scanned image.'),
            ('Add Job Description (Optional)', 'Paste the job description you\'re applying for to get tailored keyword matching and recommendations.'),
            ('Get Your Score', 'Receive an ATS compatibility score out of 100, along with detailed feedback on formatting, keywords, and structure.'),
            ('Review Recommendations', 'Read through specific suggestions to improve your CV\'s ATS compatibility.'),
            ('Make Improvements', 'Use our CV Builder or Improve CV tool to implement the recommended changes and re-check your score.')
        ],
        'tips': [
            'Aim for a score of 80% or higher',
            'Use standard section headings (Education, Experience, Skills)',
            'Avoid tables, graphics, and unusual fonts',
            'Include keywords from the job description naturally'
        ]
    },
    'cover-letter': {
        'title': 'Cover Letter Generator',
        'description': 'Generate compelling, personalised cover letters with AI',
        'audience': 'Users',
        'steps': [
            ('Enter Job Details', 'Provide the job title, company name, and paste the job description.'),
            ('Add Your Background', 'Enter your relevant experience, skills, and achievements.'),
            ('Choose Tone & Style', 'Select the tone (Professional, Enthusiastic, Confident) and length.'),
            ('Generate Cover Letter', 'Click generate to create your AI-powered cover letter.'),
            ('Edit & Personalise', 'Review and edit the generated letter with personal touches.'),
            ('Download', 'Download your cover letter as a PDF or copy the text.')
        ],
        'tips': [
            'Research the company before generating',
            'Mention specific projects or achievements',
            'Keep it to one page',
            'Address it to a specific person if possible'
        ]
    },
    'linkedin-tools': {
        'title': 'LinkedIn Tools',
        'description': 'Optimise your LinkedIn profile for maximum visibility',
        'audience': 'Users',
        'steps': [
            ('Profile Analyser', 'Enter your LinkedIn profile URL or paste your current headline and summary for AI analysis.'),
            ('Headline Generator', 'Generate compelling headlines that highlight your value proposition.'),
            ('Summary Writer', 'Create an engaging "About" section with relevant keywords.'),
            ('Skills Optimisation', 'Get recommendations for skills to add based on your industry.'),
            ('Implementation Tips', 'Follow our guide to update your LinkedIn profile.')
        ],
        'tips': [
            'Use industry keywords in your headline',
            'Keep your summary focused on value you provide',
            'Update your profile regularly',
            'Engage with content in your field'
        ]
    },
    'skills-generator': {
        'title': 'Skills Generator',
        'description': 'Discover relevant skills for your industry and role',
        'audience': 'Users',
        'steps': [
            ('Enter Your Role', 'Specify your current job title, target role, and industry.'),
            ('Review Generated Skills', 'Get a comprehensive list of technical and soft skills.'),
            ('Select Relevant Skills', 'Choose the skills that match your experience.'),
            ('Add to CV', 'Export selected skills directly to your CV Builder.')
        ],
        'tips': [
            'Focus on skills mentioned in job descriptions',
            'Balance technical and soft skills',
            'Only list skills you can demonstrate'
        ]
    },
    'job-tracker': {
        'title': 'Job Tracker',
        'description': 'Track and manage your job applications in one place',
        'audience': 'Users',
        'steps': [
            ('Add Application', 'Enter job details including company, position, and application date.'),
            ('Track Status', 'Update status: Applied, Interview, Offer, Rejected, or Accepted.'),
            ('Add Notes', 'Keep notes on each application including interview feedback.'),
            ('Set Reminders', 'Set reminders for follow-ups and interviews.'),
            ('Review Analytics', 'View your application statistics.')
        ],
        'tips': [
            'Update status promptly after each interaction',
            'Note key details after every interview',
            'Follow up within one week of applying'
        ]
    },
    'interview-prep': {
        'title': 'Interview Preparation',
        'description': 'Prepare for interviews with AI-powered practice and tips',
        'audience': 'Users',
        'steps': [
            ('Select Interview Type', 'Choose: Behavioural, Technical, Case Study, or General.'),
            ('Enter Job Details', 'Provide job title and description for tailored questions.'),
            ('Practice Questions', 'Review common questions and practice responses.'),
            ('AI Feedback', 'Get feedback on your practice answers.'),
            ('Research Tips', 'Access company research tips and questions to ask.')
        ],
        'tips': [
            'Use the STAR method: Situation, Task, Action, Result',
            'Prepare 3-5 stories that demonstrate key competencies',
            'Research the company\'s recent news and projects'
        ]
    },
    'strategy-call': {
        'title': 'Book Strategy Call',
        'description': 'Schedule a one-on-one career strategy session',
        'audience': 'Users',
        'steps': [
            ('Choose Service', 'Select: CV Review, Career Coaching, Interview Prep, or Comprehensive Package.'),
            ('Select Date & Time', 'Browse available slots and choose a suitable time.'),
            ('Provide Background', 'Fill in your career background and goals.'),
            ('Confirm Booking', 'Complete payment to confirm your session.'),
            ('Prepare for Session', 'Receive confirmation email with preparation tips.')
        ],
        'tips': [
            'Have your CV ready to share',
            'Prepare specific questions in advance',
            'Be ready to discuss your career goals'
        ]
    },
    'reseller-dashboard': {
        'title': 'Reseller Dashboard',
        'description': 'Overview of your reseller portal and key metrics',
        'audience': 'Partners',
        'steps': [
            ('Access Dashboard', 'Log in to your reseller account to view your business overview.'),
            ('View Statistics', 'Monitor total customers, subscriptions, and revenue.'),
            ('Recent Activity', 'Track new sign-ups and customer actions.')
        ],
        'tips': [
            'Check your dashboard daily for new sign-ups',
            'Monitor customer activity for engagement opportunities'
        ]
    },
    'customer-management': {
        'title': 'Customer Management',
        'description': 'Manage your customers and their subscriptions',
        'audience': 'Partners',
        'steps': [
            ('View Customers', 'Access the Customers page to see all registered users.'),
            ('Search & Filter', 'Find specific customers by name, email, or tier.'),
            ('View Details', 'Click on a customer to view their full profile.'),
            ('Manage Subscriptions', 'Upgrade or manage customer subscription tiers.')
        ],
        'tips': [
            'Regularly review customer activity',
            'Reach out to inactive customers'
        ]
    },
    'branding-setup': {
        'title': 'Branding & White-Label Setup',
        'description': 'Customise your partner site with your branding',
        'audience': 'Partners',
        'steps': [
            ('Upload Logo', 'Go to Settings > Branding and upload your company logo.'),
            ('Set Brand Colors', 'Choose your primary and secondary brand colors.'),
            ('Update Contact Info', 'Enter your business contact details.'),
            ('Configure Domain', 'Set up your custom domain for a branded experience.'),
            ('Preview & Save', 'Preview changes and save to apply.')
        ],
        'tips': [
            'Use high-resolution logos for best quality',
            'Choose colors that match your brand guidelines'
        ]
    }
}


def generate_user_manual_pdf():
    """Generate a comprehensive PDF user manual"""
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=PRIMARY_COLOR,
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.gray,
        spaceAfter=40,
        alignment=TA_CENTER
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=PRIMARY_COLOR,
        spaceBefore=20,
        spaceAfter=10
    )
    
    subsection_style = ParagraphStyle(
        'Subsection',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=SECONDARY_COLOR,
        spaceBefore=15,
        spaceAfter=8
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#374151'),
        spaceAfter=10,
        alignment=TA_JUSTIFY,
        leading=16
    )
    
    step_title_style = ParagraphStyle(
        'StepTitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=PRIMARY_COLOR,
        fontName='Helvetica-Bold'
    )
    
    tip_style = ParagraphStyle(
        'TipStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#065f46'),
        leftIndent=20,
        spaceAfter=5
    )
    
    toc_style = ParagraphStyle(
        'TOCStyle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#374151'),
        spaceAfter=8,
        leftIndent=20
    )
    
    # Build story
    story = []
    
    # Title Page
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph("UpShift", title_style))
    story.append(Paragraph("User Manual", title_style))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("Complete Guide to All Features", subtitle_style))
    story.append(Spacer(1, 1*inch))
    story.append(Paragraph(f"Version 1.0 | {datetime.now().strftime('%B %Y')}", subtitle_style))
    story.append(Paragraph("AI-Powered Career Tools for South African Job Seekers", subtitle_style))
    story.append(PageBreak())
    
    # Table of Contents
    story.append(Paragraph("Table of Contents", section_title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # User Features
    story.append(Paragraph("<b>For Users</b>", toc_style))
    page_num = 3
    for key, section in HELP_SECTIONS.items():
        if section['audience'] == 'Users':
            story.append(Paragraph(f"• {section['title']}", toc_style))
    
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>For Partners</b>", toc_style))
    for key, section in HELP_SECTIONS.items():
        if section['audience'] == 'Partners':
            story.append(Paragraph(f"• {section['title']}", toc_style))
    
    story.append(PageBreak())
    
    # Introduction
    story.append(Paragraph("Introduction", section_title_style))
    story.append(Paragraph(
        "Welcome to UpShift, your AI-powered career companion. This user manual provides comprehensive "
        "guidance on how to use all our features to create professional CVs, cover letters, and advance "
        "your career in the South African job market.",
        body_style
    ))
    story.append(Paragraph(
        "UpShift offers a suite of tools designed to help job seekers at every stage of their career journey, "
        "from crafting the perfect CV to preparing for interviews. Our AI-powered features ensure your "
        "documents are optimised for Applicant Tracking Systems (ATS) used by employers.",
        body_style
    ))
    story.append(Spacer(1, 0.3*inch))
    
    # User Features Section
    story.append(Paragraph("User Features", section_title_style))
    story.append(Spacer(1, 0.2*inch))
    
    for key, section in HELP_SECTIONS.items():
        if section['audience'] != 'Users':
            continue
            
        # Section header
        story.append(Paragraph(section['title'], subsection_style))
        story.append(Paragraph(section['description'], body_style))
        
        # Steps
        story.append(Paragraph("<b>Step-by-Step Guide:</b>", body_style))
        for i, (step_title, step_content) in enumerate(section['steps'], 1):
            story.append(Paragraph(f"<b>Step {i}: {step_title}</b>", step_title_style))
            story.append(Paragraph(step_content, body_style))
        
        # Tips
        if section.get('tips'):
            story.append(Spacer(1, 0.1*inch))
            story.append(Paragraph("<b>Pro Tips:</b>", body_style))
            for tip in section['tips']:
                story.append(Paragraph(f"✓ {tip}", tip_style))
        
        story.append(Spacer(1, 0.3*inch))
    
    story.append(PageBreak())
    
    # Partner Features Section
    story.append(Paragraph("Partner Features", section_title_style))
    story.append(Paragraph(
        "This section is for resellers and white-label partners who manage their own branded version of UpShift.",
        body_style
    ))
    story.append(Spacer(1, 0.2*inch))
    
    for key, section in HELP_SECTIONS.items():
        if section['audience'] != 'Partners':
            continue
            
        story.append(Paragraph(section['title'], subsection_style))
        story.append(Paragraph(section['description'], body_style))
        
        story.append(Paragraph("<b>Step-by-Step Guide:</b>", body_style))
        for i, (step_title, step_content) in enumerate(section['steps'], 1):
            story.append(Paragraph(f"<b>Step {i}: {step_title}</b>", step_title_style))
            story.append(Paragraph(step_content, body_style))
        
        if section.get('tips'):
            story.append(Spacer(1, 0.1*inch))
            story.append(Paragraph("<b>Pro Tips:</b>", body_style))
            for tip in section['tips']:
                story.append(Paragraph(f"✓ {tip}", tip_style))
        
        story.append(Spacer(1, 0.3*inch))
    
    # Contact & Support
    story.append(PageBreak())
    story.append(Paragraph("Need Help?", section_title_style))
    story.append(Paragraph(
        "If you need additional assistance, our support team is here to help.",
        body_style
    ))
    story.append(Spacer(1, 0.2*inch))
    
    contact_data = [
        ['Email:', 'support@upshift.works'],
        ['Website:', 'https://upshift.works'],
        ['Help Center:', 'https://upshift.works/help'],
        ['Address:', '81 Botterklapper Street, The Willows, Pretoria']
    ]
    
    contact_table = Table(contact_data, colWidths=[2*inch, 4*inch])
    contact_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (0, -1), PRIMARY_COLOR),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(contact_table)
    
    # Footer
    story.append(Spacer(1, 1*inch))
    story.append(Paragraph(
        f"© {datetime.now().year} UpShift. All rights reserved.",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=10, textColor=colors.gray, alignment=TA_CENTER)
    ))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
