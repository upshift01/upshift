#!/usr/bin/env python3

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def create_test_cv_pdf():
    # Create PDF document
    doc = SimpleDocTemplate("/app/test_cv_sample.pdf", pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Create custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=12,
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=6,
    )
    
    # Build the content
    story = []
    
    # Header
    story.append(Paragraph("John Smith", title_style))
    story.append(Paragraph("Email: john.smith@email.com", styles['Normal']))
    story.append(Paragraph("Phone: +27 11 123 4567", styles['Normal']))
    story.append(Paragraph("Address: 123 Main Street, Johannesburg, South Africa", styles['Normal']))
    story.append(Spacer(1, 12))
    
    # Professional Summary
    story.append(Paragraph("PROFESSIONAL SUMMARY", heading_style))
    story.append(Paragraph("Experienced Software Developer with 5+ years of experience in full-stack development, specializing in React, Node.js, and Python. Proven track record of delivering high-quality applications and leading development teams.", styles['Normal']))
    story.append(Spacer(1, 12))
    
    # Work Experience
    story.append(Paragraph("WORK EXPERIENCE", heading_style))
    
    story.append(Paragraph("Senior Software Developer", styles['Heading3']))
    story.append(Paragraph("TechCorp Solutions | Jan 2022 - Present", styles['Normal']))
    story.append(Paragraph("• Led development of customer portal using React and Node.js", styles['Normal']))
    story.append(Paragraph("• Implemented CI/CD pipelines reducing deployment time by 50%", styles['Normal']))
    story.append(Paragraph("• Mentored junior developers and conducted code reviews", styles['Normal']))
    story.append(Paragraph("• Collaborated with product team to define technical requirements", styles['Normal']))
    story.append(Spacer(1, 6))
    
    story.append(Paragraph("Software Developer", styles['Heading3']))
    story.append(Paragraph("Digital Innovations | Jun 2019 - Dec 2021", styles['Normal']))
    story.append(Paragraph("• Developed web applications using Python Django and React", styles['Normal']))
    story.append(Paragraph("• Integrated third-party APIs and payment gateways", styles['Normal']))
    story.append(Paragraph("• Optimized database queries improving performance by 30%", styles['Normal']))
    story.append(Paragraph("• Participated in agile development processes", styles['Normal']))
    story.append(Spacer(1, 12))
    
    # Education
    story.append(Paragraph("EDUCATION", heading_style))
    story.append(Paragraph("Bachelor of Science in Computer Science", styles['Heading3']))
    story.append(Paragraph("University of the Witwatersrand | 2015 - 2018", styles['Normal']))
    story.append(Paragraph("• Graduated Cum Laude", styles['Normal']))
    story.append(Paragraph("• Relevant coursework: Data Structures, Algorithms, Software Engineering", styles['Normal']))
    story.append(Spacer(1, 12))
    
    # Skills
    story.append(Paragraph("SKILLS", heading_style))
    story.append(Paragraph("• Programming Languages: JavaScript, Python, Java, C++", styles['Normal']))
    story.append(Paragraph("• Frontend: React, Vue.js, HTML5, CSS3, TypeScript", styles['Normal']))
    story.append(Paragraph("• Backend: Node.js, Django, Express.js, FastAPI", styles['Normal']))
    story.append(Paragraph("• Databases: PostgreSQL, MongoDB, MySQL", styles['Normal']))
    story.append(Paragraph("• Tools: Git, Docker, AWS, Jenkins", styles['Normal']))
    story.append(Paragraph("• Soft Skills: Team Leadership, Problem Solving, Communication", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    print("PDF created successfully: /app/test_cv_sample.pdf")

if __name__ == "__main__":
    create_test_cv_pdf()