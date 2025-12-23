"""
Invoice PDF Generation Service
Generates professional PDF invoices using ReportLab
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class InvoicePDFGenerator:
    """Generates professional PDF invoices"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=20,
            alignment=TA_LEFT
        ))
        
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Heading2'],
            fontSize=18,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=5
        ))
        
        self.styles.add(ParagraphStyle(
            name='SubHeading',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#6b7280'),
            spaceAfter=3
        ))
        
        self.styles.add(ParagraphStyle(
            name='RightAlign',
            parent=self.styles['Normal'],
            alignment=TA_RIGHT
        ))
        
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#9ca3af'),
            alignment=TA_CENTER
        ))
    
    def _format_currency(self, amount, currency='ZAR'):
        """Format amount as currency"""
        if isinstance(amount, (int, float)):
            # Check if amount is in cents (reseller invoices) or rands (customer invoices)
            if amount > 10000:  # Likely in cents
                amount = amount / 100
            return f"R {amount:,.2f}"
        return str(amount)
    
    def _format_date(self, date_str):
        """Format date string to readable format"""
        if not date_str:
            return "N/A"
        try:
            if isinstance(date_str, str):
                # Try different formats
                for fmt in ['%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%d']:
                    try:
                        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00').split('+')[0])
                        return dt.strftime('%d %B %Y')
                    except:
                        continue
            elif isinstance(date_str, datetime):
                return date_str.strftime('%d %B %Y')
        except Exception as e:
            logger.warning(f"Date formatting error: {e}")
        return str(date_str)[:10] if date_str else "N/A"
    
    def generate_reseller_invoice_pdf(self, invoice: dict, reseller: dict = None, platform_settings: dict = None) -> BytesIO:
        """
        Generate PDF for reseller subscription invoice (Super Admin)
        
        Args:
            invoice: Invoice data from reseller_invoices collection
            reseller: Reseller information
            platform_settings: Platform settings including site config
        
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        elements = []
        
        # Header section
        platform_name = platform_settings.get('platform_name', 'UpShift') if platform_settings else 'UpShift'
        contact = platform_settings.get('contact', {}) if platform_settings else {}
        
        # Company header
        elements.append(Paragraph(platform_name, self.styles['CompanyName']))
        if contact.get('address'):
            elements.append(Paragraph(contact.get('address', ''), self.styles['SubHeading']))
        if contact.get('email'):
            elements.append(Paragraph(f"Email: {contact.get('email', '')}", self.styles['SubHeading']))
        if contact.get('phone'):
            elements.append(Paragraph(f"Phone: {contact.get('phone', '')}", self.styles['SubHeading']))
        
        elements.append(Spacer(1, 15*mm))
        
        # Invoice title
        elements.append(Paragraph("TAX INVOICE", self.styles['InvoiceTitle']))
        
        # Invoice details table
        invoice_details = [
            ['Invoice Number:', invoice.get('invoice_number', 'N/A')],
            ['Invoice Date:', self._format_date(invoice.get('created_at'))],
            ['Due Date:', self._format_date(invoice.get('due_date'))],
            ['Period:', invoice.get('period', 'N/A')],
            ['Status:', invoice.get('status', 'pending').upper()],
        ]
        
        if invoice.get('paid_date'):
            invoice_details.append(['Paid Date:', self._format_date(invoice.get('paid_date'))])
        
        details_table = Table(invoice_details, colWidths=[4*cm, 8*cm])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(details_table)
        
        elements.append(Spacer(1, 10*mm))
        
        # Bill To section
        elements.append(Paragraph("BILL TO:", self.styles['SubHeading']))
        reseller_name = reseller.get('company_name', invoice.get('reseller_name', 'N/A')) if reseller else invoice.get('reseller_name', 'N/A')
        elements.append(Paragraph(f"<b>{reseller_name}</b>", self.styles['Normal']))
        
        if reseller:
            contact_info = reseller.get('contact_info', {})
            if contact_info.get('email'):
                elements.append(Paragraph(contact_info.get('email', ''), self.styles['SubHeading']))
            if contact_info.get('address'):
                elements.append(Paragraph(contact_info.get('address', ''), self.styles['SubHeading']))
        
        elements.append(Spacer(1, 10*mm))
        
        # Items table
        items = invoice.get('items', [])
        if not items:
            items = [{'description': f"Monthly SaaS Subscription - {invoice.get('period', 'N/A')}", 'amount': invoice.get('amount', 0)}]
        
        table_data = [['Description', 'Amount']]
        subtotal = 0
        
        for item in items:
            amount = item.get('amount', 0)
            subtotal += amount
            table_data.append([
                item.get('description', 'Service'),
                self._format_currency(amount)
            ])
        
        # Add totals
        table_data.append(['', ''])  # Empty row
        table_data.append(['Subtotal:', self._format_currency(subtotal)])
        table_data.append(['VAT (15%):', self._format_currency(subtotal * 0.15)])
        table_data.append(['TOTAL:', self._format_currency(subtotal * 1.15)])
        
        items_table = Table(table_data, colWidths=[12*cm, 4*cm])
        items_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            
            # Data rows
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            
            # Borders
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#1e40af')),
            ('LINEBELOW', (0, -4), (-1, -4), 1, colors.HexColor('#e5e7eb')),
            
            # Total row styling
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#1e40af')),
        ]))
        elements.append(items_table)
        
        elements.append(Spacer(1, 15*mm))
        
        # Payment status badge
        status = invoice.get('status', 'pending').upper()
        if status == 'PAID':
            elements.append(Paragraph(
                f"<b>✓ PAID</b> on {self._format_date(invoice.get('paid_date'))}",
                ParagraphStyle(
                    name='PaidBadge',
                    parent=self.styles['Normal'],
                    fontSize=14,
                    textColor=colors.HexColor('#059669'),
                    alignment=TA_CENTER,
                    spaceAfter=10
                )
            ))
        elif status == 'PENDING':
            elements.append(Paragraph(
                "<b>⏳ PAYMENT PENDING</b>",
                ParagraphStyle(
                    name='PendingBadge',
                    parent=self.styles['Normal'],
                    fontSize=14,
                    textColor=colors.HexColor('#d97706'),
                    alignment=TA_CENTER,
                    spaceAfter=10
                )
            ))
        
        elements.append(Spacer(1, 10*mm))
        
        # Footer
        elements.append(Paragraph(
            "Thank you for your business!",
            ParagraphStyle(name='Thanks', parent=self.styles['Normal'], alignment=TA_CENTER, fontSize=11)
        ))
        elements.append(Spacer(1, 5*mm))
        elements.append(Paragraph(
            f"Generated on {datetime.now().strftime('%d %B %Y at %H:%M')}",
            self.styles['Footer']
        ))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def generate_customer_invoice_pdf(self, invoice: dict, reseller: dict = None) -> BytesIO:
        """
        Generate PDF for customer invoice (Reseller)
        
        Args:
            invoice: Invoice data from customer_invoices collection
            reseller: Reseller information for branding
        
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        elements = []
        
        # Use reseller branding if available
        company_name = reseller.get('company_name', reseller.get('brand_name', 'Company')) if reseller else 'Company'
        brand_color = reseller.get('branding', {}).get('primary_color', '#1e40af') if reseller else '#1e40af'
        contact_info = reseller.get('contact_info', {}) if reseller else {}
        
        # Company header
        elements.append(Paragraph(company_name, ParagraphStyle(
            name='BrandName',
            parent=self.styles['Heading2'],
            fontSize=18,
            textColor=colors.HexColor(brand_color)
        )))
        
        if contact_info.get('address'):
            elements.append(Paragraph(contact_info.get('address', ''), self.styles['SubHeading']))
        if contact_info.get('email'):
            elements.append(Paragraph(f"Email: {contact_info.get('email', '')}", self.styles['SubHeading']))
        if contact_info.get('phone'):
            elements.append(Paragraph(f"Phone: {contact_info.get('phone', '')}", self.styles['SubHeading']))
        
        elements.append(Spacer(1, 15*mm))
        
        # Invoice title
        elements.append(Paragraph("INVOICE", ParagraphStyle(
            name='InvoiceTitleBrand',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor(brand_color),
            spaceAfter=20
        )))
        
        # Invoice details
        invoice_details = [
            ['Invoice Number:', invoice.get('invoice_number', 'N/A')],
            ['Invoice Date:', self._format_date(invoice.get('created_at'))],
            ['Due Date:', self._format_date(invoice.get('due_date'))],
            ['Status:', invoice.get('status', 'pending').upper()],
        ]
        
        if invoice.get('paid_date'):
            invoice_details.append(['Paid Date:', self._format_date(invoice.get('paid_date'))])
        
        details_table = Table(invoice_details, colWidths=[4*cm, 8*cm])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(details_table)
        
        elements.append(Spacer(1, 10*mm))
        
        # Bill To section
        elements.append(Paragraph("BILL TO:", self.styles['SubHeading']))
        elements.append(Paragraph(f"<b>{invoice.get('customer_name', 'Customer')}</b>", self.styles['Normal']))
        elements.append(Paragraph(invoice.get('customer_email', ''), self.styles['SubHeading']))
        
        elements.append(Spacer(1, 10*mm))
        
        # Items table
        amount = invoice.get('amount', 0)
        plan_name = invoice.get('plan_name', 'Service')
        
        table_data = [
            ['Description', 'Amount'],
            [plan_name, self._format_currency(amount)],
            ['', ''],
            ['Subtotal:', self._format_currency(amount)],
            ['VAT (15%):', self._format_currency(amount * 0.15)],
            ['TOTAL:', self._format_currency(amount * 1.15)],
        ]
        
        items_table = Table(table_data, colWidths=[12*cm, 4*cm])
        items_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(brand_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            
            # Data rows
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            
            # Borders
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor(brand_color)),
            ('LINEBELOW', (0, -4), (-1, -4), 1, colors.HexColor('#e5e7eb')),
            
            # Total row styling
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor(brand_color)),
        ]))
        elements.append(items_table)
        
        elements.append(Spacer(1, 15*mm))
        
        # Payment status
        status = invoice.get('status', 'pending').upper()
        if status == 'PAID':
            elements.append(Paragraph(
                f"<b>✓ PAID</b> on {self._format_date(invoice.get('paid_date'))}",
                ParagraphStyle(
                    name='PaidStatus',
                    parent=self.styles['Normal'],
                    fontSize=14,
                    textColor=colors.HexColor('#059669'),
                    alignment=TA_CENTER
                )
            ))
        elif status == 'PENDING':
            elements.append(Paragraph(
                "<b>⏳ PAYMENT PENDING</b>",
                ParagraphStyle(
                    name='PendingStatus',
                    parent=self.styles['Normal'],
                    fontSize=14,
                    textColor=colors.HexColor('#d97706'),
                    alignment=TA_CENTER
                )
            ))
        
        # Payment link if available
        if invoice.get('payment_url'):
            elements.append(Spacer(1, 5*mm))
            elements.append(Paragraph(
                f"Payment Link: {invoice.get('payment_url')}",
                ParagraphStyle(name='PaymentLink', parent=self.styles['Normal'], fontSize=9, textColor=colors.HexColor('#2563eb'))
            ))
        
        elements.append(Spacer(1, 10*mm))
        
        # Footer
        elements.append(Paragraph(
            "Thank you for your business!",
            ParagraphStyle(name='Thanks', parent=self.styles['Normal'], alignment=TA_CENTER, fontSize=11)
        ))
        elements.append(Spacer(1, 5*mm))
        elements.append(Paragraph(
            f"Generated on {datetime.now().strftime('%d %B %Y at %H:%M')}",
            self.styles['Footer']
        ))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer


# Singleton instance
invoice_pdf_generator = InvoicePDFGenerator()
