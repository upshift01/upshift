"""
CV PDF Generation Service - Professional Template-based PDF creation
Enhanced with photo support, ID number, languages, and improved styling
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image, KeepTogether
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from io import BytesIO
import logging
import base64

logger = logging.getLogger(__name__)

# Template Definitions with improved professional styling
TEMPLATES = {
    'professional': {
        'name': 'Professional',
        'description': 'Clean and traditional format, perfect for corporate roles',
        'primary_color': colors.HexColor('#1e40af'),
        'secondary_color': colors.HexColor('#374151'),
        'accent_color': colors.HexColor('#dbeafe'),
        'header_style': 'centered',
        'section_style': 'underlined',
        'category': 'general'
    },
    'modern': {
        'name': 'Modern',
        'description': 'Contemporary design with accent colors',
        'primary_color': colors.HexColor('#7c3aed'),
        'secondary_color': colors.HexColor('#4b5563'),
        'accent_color': colors.HexColor('#ede9fe'),
        'header_style': 'left-accent',
        'section_style': 'boxed',
        'category': 'general'
    },
    'creative': {
        'name': 'Creative',
        'description': 'Stand out with unique styling',
        'primary_color': colors.HexColor('#059669'),
        'secondary_color': colors.HexColor('#1f2937'),
        'accent_color': colors.HexColor('#d1fae5'),
        'header_style': 'sidebar',
        'section_style': 'colored',
        'category': 'general'
    },
    'executive': {
        'name': 'Executive',
        'description': 'Sophisticated for senior roles',
        'primary_color': colors.HexColor('#991b1b'),
        'secondary_color': colors.HexColor('#1f2937'),
        'accent_color': colors.HexColor('#fee2e2'),
        'header_style': 'elegant',
        'section_style': 'classic',
        'category': 'general'
    },
    'ats-classic': {
        'name': 'ATS Classic',
        'description': 'Optimised to pass Applicant Tracking Systems',
        'primary_color': colors.HexColor('#000000'),
        'secondary_color': colors.HexColor('#333333'),
        'accent_color': colors.HexColor('#f3f4f6'),
        'header_style': 'simple',
        'section_style': 'plain',
        'category': 'ats'
    },
    'ats-modern': {
        'name': 'ATS Modern',
        'description': 'ATS-friendly with a modern touch',
        'primary_color': colors.HexColor('#2563eb'),
        'secondary_color': colors.HexColor('#374151'),
        'accent_color': colors.HexColor('#eff6ff'),
        'header_style': 'simple',
        'section_style': 'underlined',
        'category': 'ats'
    },
    'ats-tech': {
        'name': 'ATS Tech/IT',
        'description': 'Optimised for technology and software roles',
        'primary_color': colors.HexColor('#0891b2'),
        'secondary_color': colors.HexColor('#164e63'),
        'accent_color': colors.HexColor('#cffafe'),
        'header_style': 'simple',
        'section_style': 'underlined',
        'category': 'ats-industry',
        'industry': 'technology'
    },
    'ats-finance': {
        'name': 'ATS Finance/Banking',
        'description': 'Professional format for financial services',
        'primary_color': colors.HexColor('#0f766e'),
        'secondary_color': colors.HexColor('#134e4a'),
        'accent_color': colors.HexColor('#ccfbf1'),
        'header_style': 'simple',
        'section_style': 'plain',
        'category': 'ats-industry',
        'industry': 'finance'
    },
    'ats-healthcare': {
        'name': 'ATS Healthcare/Medical',
        'description': 'Clean format for healthcare professionals',
        'primary_color': colors.HexColor('#dc2626'),
        'secondary_color': colors.HexColor('#7f1d1d'),
        'accent_color': colors.HexColor('#fecaca'),
        'header_style': 'simple',
        'section_style': 'underlined',
        'category': 'ats-industry',
        'industry': 'healthcare'
    },
    'ats-engineering': {
        'name': 'ATS Engineering',
        'description': 'Structured format for engineering roles',
        'primary_color': colors.HexColor('#ea580c'),
        'secondary_color': colors.HexColor('#7c2d12'),
        'accent_color': colors.HexColor('#fed7aa'),
        'header_style': 'simple',
        'section_style': 'plain',
        'category': 'ats-industry',
        'industry': 'engineering'
    },
    'ats-sales': {
        'name': 'ATS Sales/Marketing',
        'description': 'Results-focused format for sales professionals',
        'primary_color': colors.HexColor('#c026d3'),
        'secondary_color': colors.HexColor('#701a75'),
        'accent_color': colors.HexColor('#f5d0fe'),
        'header_style': 'simple',
        'section_style': 'underlined',
        'category': 'ats-industry',
        'industry': 'sales'
    },
    'ats-education': {
        'name': 'ATS Education/Academic',
        'description': 'Academic format for teaching and research',
        'primary_color': colors.HexColor('#4f46e5'),
        'secondary_color': colors.HexColor('#3730a3'),
        'accent_color': colors.HexColor('#e0e7ff'),
        'header_style': 'simple',
        'section_style': 'plain',
        'category': 'ats-industry',
        'industry': 'education'
    },
    'ats-legal': {
        'name': 'ATS Legal/Law',
        'description': 'Formal format for legal professionals',
        'primary_color': colors.HexColor('#1e3a5f'),
        'secondary_color': colors.HexColor('#0c1929'),
        'accent_color': colors.HexColor('#dbeafe'),
        'header_style': 'simple',
        'section_style': 'plain',
        'category': 'ats-industry',
        'industry': 'legal'
    },
    'ats-hospitality': {
        'name': 'ATS Hospitality/Tourism',
        'description': 'Friendly format for service industry roles',
        'primary_color': colors.HexColor('#b45309'),
        'secondary_color': colors.HexColor('#78350f'),
        'accent_color': colors.HexColor('#fef3c7'),
        'header_style': 'simple',
        'section_style': 'underlined',
        'category': 'ats-industry',
        'industry': 'hospitality'
    },
    'ats-retail': {
        'name': 'ATS Retail/Customer Service',
        'description': 'Customer-focused format for retail roles',
        'primary_color': colors.HexColor('#be185d'),
        'secondary_color': colors.HexColor('#831843'),
        'accent_color': colors.HexColor('#fce7f3'),
        'header_style': 'simple',
        'section_style': 'underlined',
        'category': 'ats-industry',
        'industry': 'retail'
    },
    'ats-manufacturing': {
        'name': 'ATS Manufacturing/Operations',
        'description': 'Practical format for production roles',
        'primary_color': colors.HexColor('#4d7c0f'),
        'secondary_color': colors.HexColor('#365314'),
        'accent_color': colors.HexColor('#ecfccb'),
        'header_style': 'simple',
        'section_style': 'plain',
        'category': 'ats-industry',
        'industry': 'manufacturing'
    }
}


class CVPDFGenerator:
    def __init__(self, template_id='professional'):
        self.template = TEMPLATES.get(template_id, TEMPLATES['professional'])
        self.styles = getSampleStyleSheet()
        self._setup_styles()
    
    def _setup_styles(self):
        """Setup custom paragraph styles based on template with improved spacing"""
        # Name style - larger and more prominent
        self.styles.add(ParagraphStyle(
            name='CVName',
            parent=self.styles['Heading1'],
            fontSize=26,
            textColor=self.template['primary_color'],
            spaceAfter=4,
            spaceBefore=0,
            leading=32,
            alignment=TA_CENTER if self.template['header_style'] == 'centered' else TA_LEFT
        ))
        
        # Contact info style - clean and readable
        self.styles.add(ParagraphStyle(
            name='CVContact',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=self.template['secondary_color'],
            alignment=TA_CENTER if self.template['header_style'] == 'centered' else TA_LEFT,
            spaceAfter=4,
            leading=14
        ))
        
        # ID/Personal details style
        self.styles.add(ParagraphStyle(
            name='CVPersonalDetail',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#6b7280'),
            alignment=TA_CENTER if self.template['header_style'] == 'centered' else TA_LEFT,
            spaceAfter=2,
            leading=12
        ))
        
        # Section header style - prominent with proper spacing
        self.styles.add(ParagraphStyle(
            name='CVSection',
            parent=self.styles['Heading2'],
            fontSize=13,
            textColor=self.template['primary_color'],
            spaceBefore=20,
            spaceAfter=8,
            fontName='Helvetica-Bold',
            borderPadding=4,
            leading=16
        ))
        
        # Job title style - bold and clear
        self.styles.add(ParagraphStyle(
            name='CVJobTitle',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=self.template['primary_color'],
            fontName='Helvetica-Bold',
            spaceBefore=8,
            spaceAfter=2,
            leading=14
        ))
        
        # Company/details style - italicized for distinction
        self.styles.add(ParagraphStyle(
            name='CVCompany',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=self.template['secondary_color'],
            fontName='Helvetica-Oblique',
            spaceAfter=6,
            leading=13
        ))
        
        # Body text style - readable with proper line height
        self.styles.add(ParagraphStyle(
            name='CVBody',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#374151'),
            alignment=TA_JUSTIFY,
            spaceAfter=8,
            leading=15
        ))
        
        # Bullet point style - clean indentation
        self.styles.add(ParagraphStyle(
            name='CVBullet',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#374151'),
            leftIndent=16,
            bulletIndent=0,
            spaceBefore=2,
            spaceAfter=4,
            leading=14
        ))
        
        # Achievement bullet style - highlighted
        self.styles.add(ParagraphStyle(
            name='CVAchievement',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1f2937'),
            leftIndent=16,
            bulletIndent=0,
            spaceBefore=2,
            spaceAfter=4,
            leading=14
        ))
        
        # Skills style
        self.styles.add(ParagraphStyle(
            name='CVSkill',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=3,
            leading=13
        ))
        
        # Languages style
        self.styles.add(ParagraphStyle(
            name='CVLanguage',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#374151'),
            spaceAfter=3,
            leading=13
        ))
    
    def _add_section_header(self, story, title):
        """Add a section header with template styling and proper spacing"""
        story.append(Spacer(1, 8))
        
        if self.template['section_style'] == 'underlined':
            story.append(Paragraph(title.upper(), self.styles['CVSection']))
            story.append(HRFlowable(
                width="100%", 
                thickness=2, 
                color=self.template['primary_color'],
                spaceBefore=0,
                spaceAfter=10
            ))
        elif self.template['section_style'] == 'boxed':
            header_data = [[Paragraph(title.upper(), self.styles['CVSection'])]]
            header_table = Table(header_data, colWidths=[495])
            header_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), self.template['accent_color']),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('ROUNDEDCORNERS', [4, 4, 4, 4]),
            ]))
            story.append(header_table)
            story.append(Spacer(1, 10))
        elif self.template['section_style'] == 'colored':
            # Colored left border style
            story.append(Paragraph(f'<font color="{self.template["primary_color"]}">▌</font> {title.upper()}', self.styles['CVSection']))
            story.append(Spacer(1, 8))
        else:
            story.append(Paragraph(title.upper(), self.styles['CVSection']))
            story.append(Spacer(1, 6))
    
    def _process_photo(self, photo_data):
        """Process photo from base64 data"""
        try:
            if photo_data and photo_data.startswith('data:image'):
                # Extract base64 data after the comma
                base64_data = photo_data.split(',')[1]
                image_data = base64.b64decode(base64_data)
                return BytesIO(image_data)
            return None
        except Exception as e:
            logger.warning(f"Failed to process photo: {str(e)}")
            return None
    
    def generate_pdf(self, cv_data):
        """Generate PDF from CV data with improved professional styling"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=45,
            leftMargin=45,
            topMargin=35,
            bottomMargin=35
        )
        
        story = []
        
        # Header Section with optional photo
        photo_data = cv_data.get('photo')
        has_photo = photo_data and self._process_photo(photo_data)
        
        if has_photo:
            # Create header with photo on the left
            photo_buffer = self._process_photo(photo_data)
            photo_img = Image(photo_buffer, width=70, height=85)
            
            # Build name and contact info
            header_content = []
            if cv_data.get('full_name'):
                header_content.append(Paragraph(cv_data['full_name'], self.styles['CVName']))
            
            # Contact line
            contact_parts = []
            if cv_data.get('email'):
                contact_parts.append(cv_data['email'])
            if cv_data.get('phone'):
                contact_parts.append(cv_data['phone'])
            if cv_data.get('address'):
                contact_parts.append(cv_data['address'])
            
            if contact_parts:
                contact_text = "  •  ".join(contact_parts)
                header_content.append(Paragraph(contact_text, self.styles['CVContact']))
            
            # ID Number if present
            if cv_data.get('id_number'):
                header_content.append(Paragraph(f"ID: {cv_data['id_number']}", self.styles['CVPersonalDetail']))
            
            # Languages in header if present
            languages = cv_data.get('languages', [])
            if languages:
                langs = [l.strip() for l in languages if l and l.strip()]
                if langs:
                    header_content.append(Paragraph(f"Languages: {', '.join(langs)}", self.styles['CVPersonalDetail']))
            
            # Create table with photo and info
            header_table = Table(
                [[photo_img, header_content]],
                colWidths=[85, 420]
            )
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (0, 0), 0),
                ('LEFTPADDING', (1, 0), (1, 0), 15),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(header_table)
        else:
            # Standard header without photo
            if cv_data.get('full_name'):
                story.append(Paragraph(cv_data['full_name'], self.styles['CVName']))
            
            # Contact Information
            contact_parts = []
            if cv_data.get('email'):
                contact_parts.append(cv_data['email'])
            if cv_data.get('phone'):
                contact_parts.append(cv_data['phone'])
            if cv_data.get('address'):
                contact_parts.append(cv_data['address'])
            
            if contact_parts:
                contact_text = "  •  ".join(contact_parts)
                story.append(Paragraph(contact_text, self.styles['CVContact']))
            
            # ID Number if present
            if cv_data.get('id_number'):
                story.append(Paragraph(f"ID: {cv_data['id_number']}", self.styles['CVPersonalDetail']))
            
            # Languages if present (in header for non-photo layouts)
            languages = cv_data.get('languages', [])
            if languages:
                langs = [l.strip() for l in languages if l and l.strip()]
                if langs:
                    story.append(Paragraph(f"Languages: {', '.join(langs)}", self.styles['CVPersonalDetail']))
        
        story.append(Spacer(1, 12))
        
        # Divider line after header
        story.append(HRFlowable(
            width="100%", 
            thickness=1, 
            color=colors.HexColor('#e5e7eb'),
            spaceBefore=4,
            spaceAfter=8
        ))
        
        # Professional Summary
        if cv_data.get('summary'):
            self._add_section_header(story, 'Professional Summary')
            story.append(Paragraph(cv_data['summary'], self.styles['CVBody']))
        
        # Work Experience
        experiences = cv_data.get('experiences', [])
        if experiences and any(exp.get('title') or exp.get('company') for exp in experiences):
            self._add_section_header(story, 'Work Experience')
            
            for i, exp in enumerate(experiences):
                if exp.get('title') or exp.get('company'):
                    # Keep job entry together
                    job_elements = []
                    
                    # Job title
                    if exp.get('title'):
                        job_elements.append(Paragraph(exp['title'], self.styles['CVJobTitle']))
                    
                    # Company and duration
                    company_line = []
                    if exp.get('company'):
                        company_line.append(exp['company'])
                    if exp.get('duration'):
                        company_line.append(exp['duration'])
                    if company_line:
                        job_elements.append(Paragraph(" | ".join(company_line), self.styles['CVCompany']))
                    
                    # Description
                    if exp.get('description'):
                        desc = exp['description']
                        if '\n' in desc or '•' in desc or '- ' in desc:
                            lines = desc.replace('•', '\n').replace('- ', '\n').split('\n')
                            for line in lines:
                                line = line.strip()
                                if line:
                                    job_elements.append(Paragraph(f"• {line}", self.styles['CVBullet']))
                        else:
                            job_elements.append(Paragraph(desc, self.styles['CVBody']))
                    
                    # Key achievements
                    if exp.get('achievements'):
                        achievements = exp['achievements']
                        if isinstance(achievements, str):
                            achievements = [a.strip() for a in achievements.split('\n') if a.strip()]
                        if achievements:
                            job_elements.append(Spacer(1, 4))
                            for ach in achievements:
                                if ach:
                                    ach_text = ach.lstrip('•-★ ').strip()
                                    job_elements.append(Paragraph(f"★ {ach_text}", self.styles['CVAchievement']))
                    
                    # Add spacing between jobs
                    job_elements.append(Spacer(1, 10))
                    
                    # Try to keep job entry together on same page
                    story.append(KeepTogether(job_elements))
        
        # Education
        education = cv_data.get('education', [])
        if education and any(edu.get('degree') or edu.get('institution') for edu in education):
            self._add_section_header(story, 'Education')
            
            for edu in education:
                if edu.get('degree') or edu.get('institution'):
                    edu_elements = []
                    
                    if edu.get('degree'):
                        edu_elements.append(Paragraph(edu['degree'], self.styles['CVJobTitle']))
                    
                    edu_line = []
                    if edu.get('institution'):
                        edu_line.append(edu['institution'])
                    if edu.get('year'):
                        edu_line.append(edu['year'])
                    if edu_line:
                        edu_elements.append(Paragraph(" | ".join(edu_line), self.styles['CVCompany']))
                    
                    edu_elements.append(Spacer(1, 8))
                    story.append(KeepTogether(edu_elements))
        
        # Skills
        skills = cv_data.get('skills', [])
        if skills:
            skills = [s.strip() for s in skills if s and s.strip()]
            if skills:
                self._add_section_header(story, 'Skills')
                
                # Create skill chips/badges look
                if len(skills) <= 10:
                    # Bullet list for fewer skills
                    for skill in skills:
                        story.append(Paragraph(f"• {skill}", self.styles['CVSkill']))
                else:
                    # Two-column layout for many skills
                    mid = (len(skills) + 1) // 2
                    skill_data = []
                    for i in range(mid):
                        row = [Paragraph(f"• {skills[i]}", self.styles['CVSkill'])]
                        if i + mid < len(skills):
                            row.append(Paragraph(f"• {skills[i + mid]}", self.styles['CVSkill']))
                        else:
                            row.append(Paragraph("", self.styles['CVSkill']))
                        skill_data.append(row)
                    
                    skill_table = Table(skill_data, colWidths=[247, 247])
                    skill_table.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('LEFTPADDING', (0, 0), (-1, -1), 0),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                        ('TOPPADDING', (0, 0), (-1, -1), 1),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                    ]))
                    story.append(skill_table)
        
        # Certifications (if present)
        certifications = cv_data.get('certifications', [])
        if certifications:
            certs = [c.strip() for c in certifications if c and c.strip()]
            if certs:
                self._add_section_header(story, 'Certifications')
                for cert in certs:
                    story.append(Paragraph(f"• {cert}", self.styles['CVSkill']))
        
        # References (if present)
        references = cv_data.get('references', [])
        if references:
            # Filter to only include references with at least a name
            valid_refs = [r for r in references if r.get('name')]
            if valid_refs:
                self._add_section_header(story, 'References')
                for ref in valid_refs:
                    ref_name = ref.get('name', '')
                    ref_title = ref.get('title', '')
                    ref_company = ref.get('company', '')
                    ref_email = ref.get('email', '')
                    ref_phone = ref.get('phone', '')
                    
                    # Build reference info
                    ref_line = f"<b>{ref_name}</b>"
                    if ref_title:
                        ref_line += f", {ref_title}"
                    if ref_company:
                        ref_line += f" at {ref_company}"
                    story.append(Paragraph(ref_line, self.styles['CVBody']))
                    
                    contact_parts = []
                    if ref_email:
                        contact_parts.append(f"Email: {ref_email}")
                    if ref_phone:
                        contact_parts.append(f"Phone: {ref_phone}")
                    if contact_parts:
                        story.append(Paragraph(" | ".join(contact_parts), self.styles['CVContact']))
                    story.append(Spacer(1, 8))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()


def generate_cv_pdf(cv_data, template_id='professional'):
    """
    Generate a CV PDF from the provided data using the specified template.
    
    Args:
        cv_data: Dictionary containing CV information including:
            - full_name, email, phone, address
            - id_number (optional)
            - languages (optional list)
            - photo (optional base64 string)
            - summary
            - experiences (list)
            - education (list)
            - skills (list)
            - certifications (optional list)
            - references (optional list of {name, title, company, email, phone})
        template_id: Template identifier
    
    Returns:
        bytes: PDF file content
    """
    try:
        generator = CVPDFGenerator(template_id)
        return generator.generate_pdf(cv_data)
    except Exception as e:
        logger.error(f"Error generating CV PDF: {str(e)}")
        raise
