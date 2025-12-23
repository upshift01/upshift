"""
Invoice PDF Generation Service
Generates professional PDF invoices using ReportLab
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.graphics.shapes import Drawing, Rect, Line
from io import BytesIO
from datetime import datetime
import logging
import qrcode

logger = logging.getLogger(__name__)

# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = A4

class InvoicePDFGenerator:
    """Generates professional PDF invoices"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Large company name
        self.styles.add(ParagraphStyle(
            name='CompanyLarge',
            parent=self.styles['Heading1'],
            fontSize=28,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=2,
            leading=32
        ))
        
        # Invoice title style
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=32,
            textColor=colors.HexColor('#111827'),
            spaceAfter=5,
            alignment=TA_RIGHT
        ))
        
        # Section headers
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=11,
            textColor=colors.HexColor('#6b7280'),
            spaceBefore=10,
            spaceAfter=5,
            fontName='Helvetica-Bold'
        ))
        
        # Invoice body text
        self.styles.add(ParagraphStyle(
            name='InvoiceBodyText',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#374151'),
            spaceAfter=2,
            leading=14
        ))
        
        # Small text
        self.styles.add(ParagraphStyle(
            name='SmallText',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#6b7280'),
            spaceAfter=1
        ))
        
        # Footer text
        self.styles.add(ParagraphStyle(
            name='FooterText',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#9ca3af'),
            alignment=TA_CENTER
        ))
        
        # Bold value
        self.styles.add(ParagraphStyle(
            name='BoldValue',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#111827'),
            fontName='Helvetica-Bold'
        ))
    
    def _generate_qr_code(self, data: str, size: int = 150, brand_color: str = '#1e40af') -> BytesIO:
        """Generate a QR code image"""
        try:
            hex_color = brand_color.lstrip('#')
            rgb_color = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
            
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=8,
                border=1,
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color=rgb_color, back_color="white")
            img = img.resize((size, size))
            
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            return buffer
        except Exception as e:
            logger.error(f"Error generating QR code: {e}")
            return None
    
    def _format_currency(self, amount, currency='ZAR'):
        """Format amount as currency"""
        if isinstance(amount, (int, float)):
            if amount > 10000:
                amount = amount / 100
            return f"R {amount:,.2f}"
        return str(amount)
    
    def _format_date(self, date_str):
        """Format date string to readable format"""
        if not date_str:
            return "N/A"
        try:
            if isinstance(date_str, str):
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
    
    def _create_header_table(self, company_name: str, company_info: dict, invoice_number: str, 
                            invoice_date: str, brand_color: str = '#1e40af', vat_number: str = None):
        """Create the header section with company info and invoice details"""
        
        # Left side: Company info as a single cell with stacked content
        company_content = f"<b>{company_name}</b><br/>"
        if company_info.get('address'):
            company_content += f"<font size='9' color='#6b7280'>{company_info['address']}</font><br/>"
        if company_info.get('email'):
            company_content += f"<font size='9' color='#6b7280'>{company_info['email']}</font><br/>"
        if company_info.get('phone'):
            company_content += f"<font size='9' color='#6b7280'>{company_info['phone']}</font><br/>"
        if vat_number:
            company_content += f"<font size='9' color='#6b7280'>VAT No: {vat_number}</font>"
        
        company_para = Paragraph(company_content, ParagraphStyle(
            name='CompanyBlock',
            parent=self.styles['Normal'],
            fontSize=18,
            textColor=colors.HexColor(brand_color),
            fontName='Helvetica-Bold',
            leading=14
        ))
        
        # Right side: Invoice info stacked vertically
        invoice_content = f"""<font size='24'><b>INVOICE</b></font><br/>
<font size='11' color='#6b7280'>#{invoice_number}</font><br/>
<br/>
<font size='10' color='#374151'>Date: {invoice_date}</font>"""
        
        invoice_para = Paragraph(invoice_content, ParagraphStyle(
            name='InvoiceBlock',
            parent=self.styles['Normal'],
            fontSize=24,
            textColor=colors.HexColor('#111827'),
            fontName='Helvetica-Bold',
            alignment=TA_RIGHT,
            leading=16
        ))
        
        # Create two-column header table
        header_table = Table(
            [[company_para, invoice_para]],
            colWidths=[9*cm, 8*cm]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ]))
        
        return header_table
    
    def _create_info_boxes(self, bill_to: dict, invoice_details: dict, brand_color: str = '#1e40af'):
        """Create the bill-to and invoice details boxes side by side"""
        
        # Bill To box
        bill_to_content = [
            Paragraph("BILL TO", ParagraphStyle(
                name='BoxHeader',
                parent=self.styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#6b7280'),
                fontName='Helvetica-Bold',
                spaceAfter=5
            )),
            Paragraph(f"<b>{bill_to.get('name', 'Customer')}</b>", self.styles['BoldValue']),
        ]
        if bill_to.get('email'):
            bill_to_content.append(Paragraph(bill_to['email'], self.styles['SmallText']))
        if bill_to.get('address'):
            bill_to_content.append(Paragraph(bill_to['address'], self.styles['SmallText']))
        
        # Invoice Details box
        details_content = [
            Paragraph("INVOICE DETAILS", ParagraphStyle(
                name='BoxHeader2',
                parent=self.styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#6b7280'),
                fontName='Helvetica-Bold',
                spaceAfter=5
            )),
        ]
        
        details_data = [
            ['Due Date:', invoice_details.get('due_date', 'N/A')],
            ['Status:', invoice_details.get('status', 'Pending').upper()],
        ]
        if invoice_details.get('period'):
            details_data.insert(0, ['Period:', invoice_details['period']])
        
        mini_table = Table(details_data, colWidths=[2.5*cm, 4*cm])
        mini_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
        ]))
        details_content.append(mini_table)
        
        # Create side-by-side boxes
        info_table = Table(
            [[[bill_to_content], [details_content]]],
            colWidths=[8.5*cm, 8.5*cm]
        )
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#f9fafb')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#f9fafb')),
            ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#e5e7eb')),
            ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#e5e7eb')),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        return info_table
    
    def _create_items_table(self, items: list, brand_color: str = '#1e40af'):
        """Create the line items table"""
        
        # Table header
        table_data = [['Description', 'Qty', 'Unit Price', 'Amount']]
        
        subtotal = 0
        for item in items:
            qty = item.get('quantity', 1)
            unit_price = item.get('unit_price', item.get('amount', 0))
            amount = item.get('amount', unit_price * qty)
            subtotal += amount
            
            table_data.append([
                item.get('description', 'Service'),
                str(qty),
                self._format_currency(unit_price),
                self._format_currency(amount)
            ])
        
        # Calculate totals
        vat = subtotal * 0.15
        total = subtotal + vat
        
        # Add spacing and totals
        table_data.append(['', '', '', ''])
        table_data.append(['', '', 'Subtotal:', self._format_currency(subtotal)])
        table_data.append(['', '', 'VAT (15%):', self._format_currency(vat)])
        table_data.append(['', '', 'TOTAL:', self._format_currency(total)])
        
        items_table = Table(table_data, colWidths=[8*cm, 2*cm, 3.5*cm, 3.5*cm])
        items_table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(brand_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows
            ('FONTSIZE', (0, 1), (-1, -5), 10),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('TOPPADDING', (0, 1), (-1, -5), 10),
            ('BOTTOMPADDING', (0, 1), (-1, -5), 10),
            ('LINEBELOW', (0, 1), (-1, -5), 0.5, colors.HexColor('#e5e7eb')),
            
            # Totals section
            ('FONTSIZE', (2, -3), (-1, -1), 10),
            ('TOPPADDING', (0, -3), (-1, -1), 6),
            ('BOTTOMPADDING', (0, -3), (-1, -1), 6),
            
            # Final total row
            ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (2, -1), (-1, -1), 12),
            ('BACKGROUND', (2, -1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('LINEABOVE', (2, -1), (-1, -1), 1.5, colors.HexColor(brand_color)),
            ('TOPPADDING', (2, -1), (-1, -1), 10),
            ('BOTTOMPADDING', (2, -1), (-1, -1), 10),
        ]))
        
        return items_table, total
    
    def _create_payment_section(self, status: str, payment_url: str = None, paid_date: str = None, 
                                brand_color: str = '#1e40af'):
        """Create the payment status and QR code section"""
        elements = []
        
        if status.upper() == 'PAID':
            # Paid status box
            paid_content = [
                [Paragraph(
                    f"<b>✓ PAID</b>",
                    ParagraphStyle(
                        name='PaidLabel',
                        parent=self.styles['Normal'],
                        fontSize=16,
                        textColor=colors.HexColor('#059669'),
                        alignment=TA_CENTER,
                        fontName='Helvetica-Bold'
                    )
                )],
                [Paragraph(
                    f"Payment received on {paid_date}" if paid_date else "Payment received",
                    ParagraphStyle(
                        name='PaidDate',
                        parent=self.styles['Normal'],
                        fontSize=10,
                        textColor=colors.HexColor('#059669'),
                        alignment=TA_CENTER
                    )
                )]
            ]
            
            paid_table = Table(paid_content, colWidths=[17*cm])
            paid_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ecfdf5')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#059669')),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ]))
            elements.append(paid_table)
            
        elif status.upper() in ['PENDING', 'OVERDUE']:
            # Payment pending with optional QR code
            status_color = '#d97706' if status.upper() == 'PENDING' else '#dc2626'
            status_bg = '#fffbeb' if status.upper() == 'PENDING' else '#fef2f2'
            status_text = 'PAYMENT PENDING' if status.upper() == 'PENDING' else 'PAYMENT OVERDUE'
            
            if payment_url:
                # Create QR code - smaller size for inline display
                qr_buffer = self._generate_qr_code(payment_url, size=100, brand_color=brand_color)
                
                if qr_buffer:
                    qr_image = Image(qr_buffer, width=2.2*cm, height=2.2*cm)
                    
                    # Payment section with QR code inline
                    payment_content = [
                        [
                            # Left: Status and instructions
                            [
                                Paragraph(
                                    f"<b>⏳ {status_text}</b>",
                                    ParagraphStyle(
                                        name='PendingLabel',
                                        parent=self.styles['Normal'],
                                        fontSize=14,
                                        textColor=colors.HexColor(status_color),
                                        fontName='Helvetica-Bold',
                                        spaceAfter=8
                                    )
                                ),
                                Paragraph(
                                    "Scan the QR code or click the link below to pay securely via Yoco:",
                                    ParagraphStyle(
                                        name='PayInstructions',
                                        parent=self.styles['Normal'],
                                        fontSize=9,
                                        textColor=colors.HexColor('#6b7280'),
                                        spaceAfter=5
                                    )
                                ),
                                Paragraph(
                                    f"<link href='{payment_url}'>{payment_url[:50]}...</link>" if len(payment_url) > 50 else f"<link href='{payment_url}'>{payment_url}</link>",
                                    ParagraphStyle(
                                        name='PayLink',
                                        parent=self.styles['Normal'],
                                        fontSize=8,
                                        textColor=colors.HexColor(brand_color)
                                    )
                                )
                            ],
                            # Right: QR code
                            [
                                qr_image,
                                Paragraph(
                                    "Scan to Pay",
                                    ParagraphStyle(
                                        name='ScanLabel',
                                        parent=self.styles['Normal'],
                                        fontSize=8,
                                        textColor=colors.HexColor('#6b7280'),
                                        alignment=TA_CENTER
                                    )
                                )
                            ]
                        ]
                    ]
                    
                    payment_table = Table(payment_content, colWidths=[13*cm, 4*cm])
                    payment_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(status_bg)),
                        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(status_color)),
                        ('TOPPADDING', (0, 0), (-1, -1), 15),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
                        ('LEFTPADDING', (0, 0), (0, 0), 15),
                        ('RIGHTPADDING', (1, 0), (1, 0), 15),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
                    ]))
                    elements.append(payment_table)
                else:
                    # Fallback without QR
                    elements.append(self._create_simple_status_box(status_text, status_color, status_bg))
            else:
                # No payment URL
                elements.append(self._create_simple_status_box(status_text, status_color, status_bg))
        
        return elements
    
    def _create_simple_status_box(self, status_text: str, status_color: str, status_bg: str):
        """Create a simple status box without QR code"""
        status_content = [
            [Paragraph(
                f"<b>⏳ {status_text}</b>",
                ParagraphStyle(
                    name='StatusLabel',
                    parent=self.styles['Normal'],
                    fontSize=14,
                    textColor=colors.HexColor(status_color),
                    alignment=TA_CENTER,
                    fontName='Helvetica-Bold'
                )
            )]
        ]
        
        status_table = Table(status_content, colWidths=[17*cm])
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(status_bg)),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(status_color)),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        return status_table
    
    def generate_customer_invoice_pdf(self, invoice: dict, reseller: dict = None, reseller_settings: dict = None) -> BytesIO:
        """Generate professional PDF for customer invoice"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1.5*cm,
            bottomMargin=1.5*cm
        )
        
        elements = []
        
        # Get branding
        company_name = reseller.get('company_name', reseller.get('brand_name', 'Company')) if reseller else 'Company'
        brand_color = reseller.get('branding', {}).get('primary_color', '#1e40af') if reseller else '#1e40af'
        contact_info = reseller.get('contact_info', {}) if reseller else {}
        
        # Get VAT number from reseller settings
        vat_number = reseller_settings.get('vat_number', '') if reseller_settings else ''
        
        # === HEADER ===
        header = self._create_header_table(
            company_name=company_name,
            company_info=contact_info,
            invoice_number=invoice.get('invoice_number', 'N/A'),
            invoice_date=self._format_date(invoice.get('created_at')),
            brand_color=brand_color,
            vat_number=vat_number
        )
        elements.append(header)
        
        # Divider line
        elements.append(Spacer(1, 8*mm))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 8*mm))
        
        # === BILL TO & INVOICE DETAILS ===
        bill_to = {
            'name': invoice.get('customer_name', 'Customer'),
            'email': invoice.get('customer_email', ''),
            'address': invoice.get('customer_address', '')
        }
        
        invoice_details = {
            'due_date': self._format_date(invoice.get('due_date')),
            'status': invoice.get('status', 'pending'),
            'period': invoice.get('period')
        }
        
        info_boxes = self._create_info_boxes(bill_to, invoice_details, brand_color)
        elements.append(info_boxes)
        elements.append(Spacer(1, 10*mm))
        
        # === LINE ITEMS ===
        items = invoice.get('items', [])
        if not items:
            items = [{
                'description': invoice.get('plan_name', 'Service'),
                'quantity': 1,
                'amount': invoice.get('amount', 0)
            }]
        
        items_table, total = self._create_items_table(items, brand_color)
        elements.append(items_table)
        elements.append(Spacer(1, 10*mm))
        
        # === PAYMENT STATUS & QR CODE ===
        payment_elements = self._create_payment_section(
            status=invoice.get('status', 'pending'),
            payment_url=invoice.get('payment_url'),
            paid_date=self._format_date(invoice.get('paid_date')),
            brand_color=brand_color
        )
        elements.extend(payment_elements)
        elements.append(Spacer(1, 10*mm))
        
        # === FOOTER ===
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 5*mm))
        elements.append(Paragraph(
            "Thank you for your business!",
            ParagraphStyle(
                name='ThankYou',
                parent=self.styles['Normal'],
                fontSize=11,
                textColor=colors.HexColor('#374151'),
                alignment=TA_CENTER,
                fontName='Helvetica-Oblique'
            )
        ))
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph(
            f"{company_name} • Generated on {datetime.now().strftime('%d %B %Y at %H:%M')}",
            self.styles['FooterText']
        ))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def generate_reseller_invoice_pdf(self, invoice: dict, reseller: dict = None, platform_settings: dict = None) -> BytesIO:
        """Generate professional PDF for reseller subscription invoice"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1.5*cm,
            bottomMargin=1.5*cm
        )
        
        elements = []
        brand_color = '#1e40af'
        
        # Platform info
        platform_name = platform_settings.get('platform_name', 'UpShift') if platform_settings else 'UpShift'
        contact = platform_settings.get('contact', {}) if platform_settings else {}
        vat_number = platform_settings.get('vat_number', '') if platform_settings else ''
        
        # === HEADER ===
        header = self._create_header_table(
            company_name=platform_name,
            company_info=contact,
            invoice_number=invoice.get('invoice_number', 'N/A'),
            invoice_date=self._format_date(invoice.get('created_at')),
            brand_color=brand_color,
            vat_number=vat_number
        )
        elements.append(header)
        
        # Tax Invoice badge
        elements.append(Spacer(1, 3*mm))
        tax_badge = Table(
            [[Paragraph("<b>TAX INVOICE</b>", ParagraphStyle(
                name='TaxBadge',
                parent=self.styles['Normal'],
                fontSize=9,
                textColor=colors.white,
                alignment=TA_CENTER
            ))]],
            colWidths=[3*cm]
        )
        tax_badge.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(brand_color)),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        
        badge_container = Table([[tax_badge, '']], colWidths=[3.5*cm, 13.5*cm])
        badge_container.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ]))
        elements.append(badge_container)
        
        # Divider
        elements.append(Spacer(1, 5*mm))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 8*mm))
        
        # === BILL TO & DETAILS ===
        reseller_name = reseller.get('company_name', invoice.get('reseller_name', 'N/A')) if reseller else invoice.get('reseller_name', 'N/A')
        reseller_contact = reseller.get('contact_info', {}) if reseller else {}
        
        bill_to = {
            'name': reseller_name,
            'email': reseller_contact.get('email', ''),
            'address': reseller_contact.get('address', '')
        }
        
        invoice_details = {
            'due_date': self._format_date(invoice.get('due_date')),
            'status': invoice.get('status', 'pending'),
            'period': invoice.get('period')
        }
        
        info_boxes = self._create_info_boxes(bill_to, invoice_details, brand_color)
        elements.append(info_boxes)
        elements.append(Spacer(1, 10*mm))
        
        # === LINE ITEMS ===
        items = invoice.get('items', [])
        if not items:
            items = [{
                'description': f"Monthly SaaS Subscription - {invoice.get('period', 'N/A')}",
                'quantity': 1,
                'amount': invoice.get('amount', 0)
            }]
        
        items_table, total = self._create_items_table(items, brand_color)
        elements.append(items_table)
        elements.append(Spacer(1, 10*mm))
        
        # === PAYMENT STATUS ===
        payment_elements = self._create_payment_section(
            status=invoice.get('status', 'pending'),
            payment_url=invoice.get('payment_url'),
            paid_date=self._format_date(invoice.get('paid_date')),
            brand_color=brand_color
        )
        elements.extend(payment_elements)
        elements.append(Spacer(1, 10*mm))
        
        # === FOOTER ===
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 5*mm))
        elements.append(Paragraph(
            "Thank you for your business!",
            ParagraphStyle(
                name='ThankYou2',
                parent=self.styles['Normal'],
                fontSize=11,
                textColor=colors.HexColor('#374151'),
                alignment=TA_CENTER,
                fontName='Helvetica-Oblique'
            )
        ))
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph(
            f"{platform_name} • Generated on {datetime.now().strftime('%d %B %Y at %H:%M')}",
            self.styles['FooterText']
        ))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer


# Singleton instance
invoice_pdf_generator = InvoicePDFGenerator()
