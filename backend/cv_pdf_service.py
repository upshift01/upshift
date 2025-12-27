"""
CV PDF Generation Service - Template-based PDF creation
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

# Template Definitions
TEMPLATES = {
    'professional': {
        'name': 'Professional',
        'primary_color': colors.HexColor('#1e40af'),
        'secondary_color': colors.HexColor('#374151'),
        'accent_color': colors.HexColor('#dbeafe'),
        'header_style': 'centered',
        'section_style': 'underlined',
    },
    'modern': {
        'name': 'Modern',
        'primary_color': colors.HexColor('#7c3aed'),
        'secondary_color': colors.HexColor('#4b5563'),
        'accent_color': colors.HexColor('#ede9fe'),
        'header_style': 'left-accent',
        'section_style': 'boxed',
    },
    'creative': {
        'name': 'Creative',
        'primary_color': colors.HexColor('#059669'),
        'secondary_color': colors.HexColor('#1f2937'),
        'accent_color': colors.HexColor('#d1fae5'),
        'header_style': 'sidebar',
        'section_style': 'colored',
    },
    'executive': {
        'name': 'Executive',
        'primary_color': colors.HexColor('#991b1b'),
        'secondary_color': colors.HexColor('#1f2937'),
        'accent_color': colors.HexColor('#fee2e2'),
        'header_style': 'elegant',
        'section_style': 'classic',
    },
    'ats-classic': {
        'name': 'ATS Classic',
        'primary_color': colors.HexColor('#000000'),
        'secondary_color': colors.HexColor('#333333'),
        'accent_color': colors.HexColor('#f3f4f6'),
        'header_style': 'simple',
        'section_style': 'plain',
    },
    'ats-modern': {
        'name': 'ATS Modern',
        'primary_color': colors.HexColor('#2563eb'),
        'secondary_color': colors.HexColor('#374151'),
        'accent_color': colors.HexColor('#eff6ff'),
        'header_style': 'simple',
        'section_style': 'underlined',
    }
}


class CVPDFGenerator:
    def __init__(self, template_id='professional'):
        self.template = TEMPLATES.get(template_id, TEMPLATES['professional'])
        self.styles = getSampleStyleSheet()
        self._setup_styles()
    
    def _setup_styles(self):
        """Setup custom paragraph styles based on template"""
        # Name style
        self.styles.add(ParagraphStyle(
            name='CVName',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=self.template['primary_color'],
            spaceAfter=6,
            alignment=TA_CENTER if self.template['header_style'] == 'centered' else TA_LEFT
        ))
        
        # Contact info style
        self.styles.add(ParagraphStyle(
            name='CVContact',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=self.template['secondary_color'],
            alignment=TA_CENTER if self.template['header_style'] == 'centered' else TA_LEFT,
            spaceAfter=12
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='CVSection',
            parent=self.styles['Heading2'],
            fontSize=13,
            textColor=self.template['primary_color'],
            spaceBefore=16,
            spaceAfter=8,
            borderPadding=4
        ))
        
        # Job title style
        self.styles.add(ParagraphStyle(
            name='CVJobTitle',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=self.template['primary_color'],
            fontName='Helvetica-Bold',
            spaceAfter=2
        ))
        
        # Company/details style
        self.styles.add(ParagraphStyle(
            name='CVCompany',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=self.template['secondary_color'],
            fontName='Helvetica-Oblique',
            spaceAfter=4
        ))
        
        # Body text style
        self.styles.add(ParagraphStyle(
            name='CVBody',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#374151'),
            alignment=TA_JUSTIFY,
            spaceAfter=6,
            leading=14
        ))
        
        # Bullet point style
        self.styles.add(ParagraphStyle(
            name='CVBullet',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#374151'),
            leftIndent=12,
            bulletIndent=0,
            spaceAfter=3,
            leading=13
        ))
        
        # Skills style
        self.styles.add(ParagraphStyle(
            name='CVSkill',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=2
        ))
    
    def _add_section_header(self, story, title):
        """Add a section header with template styling"""
        if self.template['section_style'] == 'underlined':
            story.append(Paragraph(title.upper(), self.styles['CVSection']))
            story.append(HRFlowable(
                width="100%", 
                thickness=2, 
                color=self.template['primary_color'],
                spaceBefore=0,
                spaceAfter=8
            ))
        elif self.template['section_style'] == 'boxed':
            # Create a table with background
            header_data = [[Paragraph(title.upper(), self.styles['CVSection'])]]
            header_table = Table(header_data, colWidths=[500])
            header_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), self.template['accent_color']),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(header_table)
            story.append(Spacer(1, 8))
        else:
            story.append(Paragraph(title.upper(), self.styles['CVSection']))
            story.append(Spacer(1, 4))
    
    def generate_pdf(self, cv_data):
        """Generate PDF from CV data"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=50,
            leftMargin=50,
            topMargin=40,
            bottomMargin=40
        )
        
        story = []
        
        # Header Section - Name
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
            contact_text = " • ".join(contact_parts)
            story.append(Paragraph(contact_text, self.styles['CVContact']))
        
        story.append(Spacer(1, 8))
        
        # Professional Summary
        if cv_data.get('summary'):
            self._add_section_header(story, 'Professional Summary')
            story.append(Paragraph(cv_data['summary'], self.styles['CVBody']))
        
        # Work Experience
        experiences = cv_data.get('experiences', [])
        if experiences and any(exp.get('title') or exp.get('company') for exp in experiences):
            self._add_section_header(story, 'Work Experience')
            
            for exp in experiences:
                if exp.get('title') or exp.get('company'):
                    # Job title
                    if exp.get('title'):
                        story.append(Paragraph(exp['title'], self.styles['CVJobTitle']))
                    
                    # Company and duration
                    company_line = []
                    if exp.get('company'):
                        company_line.append(exp['company'])
                    if exp.get('duration'):
                        company_line.append(exp['duration'])
                    if company_line:
                        story.append(Paragraph(" | ".join(company_line), self.styles['CVCompany']))
                    
                    # Description
                    if exp.get('description'):
                        # Split into bullet points if contains line breaks or bullet chars
                        desc = exp['description']
                        if '\n' in desc or '•' in desc or '-' in desc:
                            lines = desc.replace('•', '\n').replace('- ', '\n').split('\n')
                            for line in lines:
                                line = line.strip()
                                if line:
                                    story.append(Paragraph(f"• {line}", self.styles['CVBullet']))
                        else:
                            story.append(Paragraph(desc, self.styles['CVBody']))
                    
                    # Key achievements
                    if exp.get('achievements'):
                        achievements = exp['achievements']
                        if isinstance(achievements, str):
                            achievements = [a.strip() for a in achievements.split('\n') if a.strip()]
                        for ach in achievements:
                            if ach:
                                story.append(Paragraph(f"★ {ach}", self.styles['CVBullet']))
                    
                    story.append(Spacer(1, 8))
        
        # Education
        education = cv_data.get('education', [])
        if education and any(edu.get('degree') or edu.get('institution') for edu in education):
            self._add_section_header(story, 'Education')
            
            for edu in education:
                if edu.get('degree') or edu.get('institution'):
                    if edu.get('degree'):
                        story.append(Paragraph(edu['degree'], self.styles['CVJobTitle']))
                    
                    edu_line = []
                    if edu.get('institution'):
                        edu_line.append(edu['institution'])
                    if edu.get('year'):
                        edu_line.append(edu['year'])
                    if edu_line:
                        story.append(Paragraph(" | ".join(edu_line), self.styles['CVCompany']))
                    
                    story.append(Spacer(1, 4))
        
        # Skills
        skills = cv_data.get('skills', [])
        if skills:
            # Filter out empty skills
            skills = [s.strip() for s in skills if s and s.strip()]
            if skills:
                self._add_section_header(story, 'Skills')
                
                # Display skills in a grid or comma-separated
                if len(skills) <= 8:
                    # Bullet list for fewer skills
                    for skill in skills:
                        story.append(Paragraph(f"• {skill}", self.styles['CVSkill']))
                else:
                    # Comma-separated for many skills
                    skills_text = " • ".join(skills)
                    story.append(Paragraph(skills_text, self.styles['CVBody']))
        
        # Certifications (if present)
        certifications = cv_data.get('certifications', [])
        if certifications:
            certs = [c.strip() for c in certifications if c and c.strip()]
            if certs:
                self._add_section_header(story, 'Certifications')
                for cert in certs:
                    story.append(Paragraph(f"• {cert}", self.styles['CVSkill']))
        
        # Languages (if present)
        languages = cv_data.get('languages', [])
        if languages:
            langs = [l.strip() for l in languages if l and l.strip()]
            if langs:
                self._add_section_header(story, 'Languages')
                story.append(Paragraph(" • ".join(langs), self.styles['CVBody']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()


def generate_cv_pdf(cv_data, template_id='professional'):
    """
    Generate a CV PDF from the provided data using the specified template.
    
    Args:
        cv_data: Dictionary containing CV information
        template_id: Template identifier (professional, modern, creative, executive, ats-classic, ats-modern)
    
    Returns:
        bytes: PDF file content
    """
    try:
        generator = CVPDFGenerator(template_id)
        return generator.generate_pdf(cv_data)
    except Exception as e:
        logger.error(f"Error generating CV PDF: {str(e)}")
        raise
