"""
Invoice PDF Generation Service
Simple, clean PDF invoices using ReportLab
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime
import logging
import qrcode

logger = logging.getLogger(__name__)

PAGE_WIDTH, PAGE_HEIGHT = A4

class InvoicePDFGenerator:
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
    
    def _generate_qr_code(self, data: str, size: int = 100, brand_color: str = '#1e40af') -> BytesIO:
        """Generate a QR code image"""
        try:
            hex_color = brand_color.lstrip('#')
            rgb_color = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
            
            qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=1)
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
    
    def _format_currency(self, amount):
        if isinstance(amount, (int, float)):
            if amount > 10000:
                amount = amount / 100
            return f"R {amount:,.2f}"
        return str(amount)
    
    def _format_date(self, date_str):
        if not date_str:
            return "N/A"
        try:
            if isinstance(date_str, str):
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00').split('+')[0])
                return dt.strftime('%d %B %Y')
            elif isinstance(date_str, datetime):
                return date_str.strftime('%d %B %Y')
        except:
            pass
        return str(date_str)[:10] if date_str else "N/A"
    
    def generate_customer_invoice_pdf(self, invoice: dict, reseller: dict = None, reseller_settings: dict = None) -> BytesIO:
        """Generate PDF for customer invoice"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
        
        elements = []
        
        # Get branding info
        company_name = reseller.get('company_name', 'Company') if reseller else 'Company'
        brand_color = reseller.get('branding', {}).get('primary_color', '#1e40af') if reseller else '#1e40af'
        contact_info = reseller.get('contact_info', {}) if reseller else {}
        seller_vat = reseller_settings.get('vat_number', '') if reseller_settings else ''
        
        # === HEADER TABLE ===
        # Row 1: Company Name | INVOICE
        # Row 2: Contact Info | Invoice Number
        # Row 3: VAT Number   | Date
        
        header_data = [
            [
                Paragraph(f'<font size="18" color="{brand_color}"><b>{company_name}</b></font>', self.styles['Normal']),
                Paragraph('<font size="24"><b>INVOICE</b></font>', ParagraphStyle('title', alignment=TA_RIGHT, fontSize=24))
            ],
            [
                Paragraph(f'<font size="9" color="#666666">{contact_info.get("email", "")}</font>', self.styles['Normal']),
                Paragraph(f'<font size="11" color="#666666">#{invoice.get("invoice_number", "N/A")}</font>', ParagraphStyle('num', alignment=TA_RIGHT))
            ],
            [
                Paragraph(f'<font size="9" color="#666666">{contact_info.get("phone", "")}</font>', self.styles['Normal']),
                Paragraph(f'<font size="10">Date: {self._format_date(invoice.get("created_at"))}</font>', ParagraphStyle('date', alignment=TA_RIGHT))
            ],
        ]
        
        if seller_vat:
            header_data.append([
                Paragraph(f'<font size="9" color="#666666">VAT No: {seller_vat}</font>', self.styles['Normal']),
                ''
            ])
        
        header_table = Table(header_data, colWidths=[10*cm, 7*cm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 8*mm))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 8*mm))
        
        # === BILL TO & INVOICE DETAILS ===
        bill_to_text = f'''<font size="9" color="#666666"><b>BILL TO</b></font><br/>
<font size="11"><b>{invoice.get("customer_name", "Customer")}</b></font><br/>
<font size="9" color="#666666">{invoice.get("customer_email", "")}</font>'''
        
        if invoice.get("customer_address"):
            bill_to_text += f'<br/><font size="9" color="#666666">{invoice.get("customer_address")}</font>'
        if invoice.get("customer_vat_number"):
            bill_to_text += f'<br/><font size="9" color="#666666">VAT No: {invoice.get("customer_vat_number")}</font>'
        
        details_text = f'''<font size="9" color="#666666"><b>INVOICE DETAILS</b></font><br/>
<font size="9">Due Date: <b>{self._format_date(invoice.get("due_date"))}</b></font><br/>
<font size="9">Status: <b>{invoice.get("status", "pending").upper()}</b></font>'''
        
        info_data = [[
            Paragraph(bill_to_text, ParagraphStyle('billto', leading=14)),
            Paragraph(details_text, ParagraphStyle('details', leading=14))
        ]]
        
        info_table = Table(info_data, colWidths=[10*cm, 7*cm])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
            ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#e5e7eb')),
            ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#e5e7eb')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 8*mm))
        
        # === LINE ITEMS TABLE ===
        amount = invoice.get('amount', 0)
        if amount > 10000:
            amount = amount / 100
        vat = amount * 0.15
        total = amount + vat
        
        items_data = [
            ['Description', 'Amount'],
            [invoice.get('plan_name', 'Service'), self._format_currency(amount)],
            ['', ''],
            ['Subtotal:', self._format_currency(amount)],
            ['VAT (15%):', self._format_currency(vat)],
            ['TOTAL:', self._format_currency(total)],
        ]
        
        items_table = Table(items_data, colWidths=[13*cm, 4*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(brand_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LINEBELOW', (0, 1), (-1, 1), 0.5, colors.HexColor('#e5e7eb')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor(brand_color)),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 8*mm))
        
        # === PAYMENT STATUS ===
        status = invoice.get('status', 'pending').upper()
        payment_url = invoice.get('payment_url')
        
        if status == 'PAID':
            status_text = f'<font size="14" color="#059669"><b>✓ PAID</b></font>'
            if invoice.get('paid_date'):
                status_text += f'<br/><font size="10" color="#059669">Payment received on {self._format_date(invoice.get("paid_date"))}</font>'
            
            status_para = Paragraph(status_text, ParagraphStyle('paid', alignment=TA_CENTER, leading=18))
            status_table = Table([[status_para]], colWidths=[17*cm])
            status_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ecfdf5')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#059669')),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(status_table)
            
        elif payment_url:
            # Payment pending with QR code
            qr_buffer = self._generate_qr_code(payment_url, size=80, brand_color=brand_color)
            
            status_color = '#d97706' if status == 'PENDING' else '#dc2626'
            status_bg = '#fffbeb' if status == 'PENDING' else '#fef2f2'
            status_label = 'PAYMENT PENDING' if status == 'PENDING' else 'PAYMENT OVERDUE'
            
            left_text = f'''<font size="12" color="{status_color}"><b>⏳ {status_label}</b></font><br/><br/>
<font size="9" color="#666666">Scan QR code or visit:</font><br/>
<font size="8" color="{brand_color}">{payment_url[:45]}...</font>'''
            
            if qr_buffer:
                qr_img = Image(qr_buffer, width=2*cm, height=2*cm)
                payment_data = [[
                    Paragraph(left_text, ParagraphStyle('payleft', leading=14)),
                    qr_img
                ]]
            else:
                payment_data = [[Paragraph(left_text, ParagraphStyle('payleft', leading=14)), '']]
            
            payment_table = Table(payment_data, colWidths=[13*cm, 4*cm])
            payment_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(status_bg)),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(status_color)),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (1, 0), (1, 0), 'CENTER'),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(payment_table)
        else:
            # Pending without payment URL
            status_text = f'<font size="12" color="#d97706"><b>⏳ PAYMENT PENDING</b></font>'
            status_para = Paragraph(status_text, ParagraphStyle('pending', alignment=TA_CENTER))
            status_table = Table([[status_para]], colWidths=[17*cm])
            status_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fffbeb')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#d97706')),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(status_table)
        
        # === FOOTER ===
        elements.append(Spacer(1, 10*mm))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 5*mm))
        elements.append(Paragraph(
            '<font size="10"><i>Thank you for your business!</i></font>',
            ParagraphStyle('thanks', alignment=TA_CENTER)
        ))
        elements.append(Paragraph(
            f'<font size="8" color="#999999">{company_name} • Generated {datetime.now().strftime("%d %B %Y")}</font>',
            ParagraphStyle('footer', alignment=TA_CENTER)
        ))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def generate_reseller_invoice_pdf(self, invoice: dict, reseller: dict = None, platform_settings: dict = None) -> BytesIO:
        """Generate PDF for reseller subscription invoice"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
        
        elements = []
        brand_color = '#1e40af'
        
        platform_name = platform_settings.get('platform_name', 'UpShift') if platform_settings else 'UpShift'
        contact = platform_settings.get('contact', {}) if platform_settings else {}
        seller_vat = platform_settings.get('vat_number', '') if platform_settings else ''
        
        # === HEADER ===
        header_data = [
            [
                Paragraph(f'<font size="18" color="{brand_color}"><b>{platform_name}</b></font>', self.styles['Normal']),
                Paragraph('<font size="24"><b>TAX INVOICE</b></font>', ParagraphStyle('title', alignment=TA_RIGHT))
            ],
            [
                Paragraph(f'<font size="9" color="#666666">{contact.get("email", "")}</font>', self.styles['Normal']),
                Paragraph(f'<font size="11" color="#666666">#{invoice.get("invoice_number", "N/A")}</font>', ParagraphStyle('num', alignment=TA_RIGHT))
            ],
            [
                Paragraph(f'<font size="9" color="#666666">{contact.get("phone", "")}</font>', self.styles['Normal']),
                Paragraph(f'<font size="10">Date: {self._format_date(invoice.get("created_at"))}</font>', ParagraphStyle('date', alignment=TA_RIGHT))
            ],
        ]
        
        if seller_vat:
            header_data.append([
                Paragraph(f'<font size="9" color="#666666">VAT No: {seller_vat}</font>', self.styles['Normal']),
                ''
            ])
        
        header_table = Table(header_data, colWidths=[10*cm, 7*cm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 8*mm))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 8*mm))
        
        # === BILL TO ===
        reseller_name = reseller.get('company_name', invoice.get('reseller_name', 'N/A')) if reseller else invoice.get('reseller_name', 'N/A')
        reseller_contact = reseller.get('contact_info', {}) if reseller else {}
        
        bill_to_text = f'''<font size="9" color="#666666"><b>BILL TO</b></font><br/>
<font size="11"><b>{reseller_name}</b></font><br/>
<font size="9" color="#666666">{reseller_contact.get("email", "")}</font>'''
        
        details_text = f'''<font size="9" color="#666666"><b>INVOICE DETAILS</b></font><br/>
<font size="9">Period: <b>{invoice.get("period", "N/A")}</b></font><br/>
<font size="9">Due Date: <b>{self._format_date(invoice.get("due_date"))}</b></font><br/>
<font size="9">Status: <b>{invoice.get("status", "pending").upper()}</b></font>'''
        
        info_data = [[
            Paragraph(bill_to_text, ParagraphStyle('billto', leading=14)),
            Paragraph(details_text, ParagraphStyle('details', leading=14))
        ]]
        
        info_table = Table(info_data, colWidths=[10*cm, 7*cm])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
            ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#e5e7eb')),
            ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#e5e7eb')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 8*mm))
        
        # === LINE ITEMS ===
        amount = invoice.get('amount', 0)
        if amount > 10000:
            amount = amount / 100
        vat = amount * 0.15
        total = amount + vat
        
        items_data = [
            ['Description', 'Amount'],
            [f'Monthly SaaS Subscription - {invoice.get("period", "N/A")}', self._format_currency(amount)],
            ['', ''],
            ['Subtotal:', self._format_currency(amount)],
            ['VAT (15%):', self._format_currency(vat)],
            ['TOTAL:', self._format_currency(total)],
        ]
        
        items_table = Table(items_data, colWidths=[13*cm, 4*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(brand_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LINEBELOW', (0, 1), (-1, 1), 0.5, colors.HexColor('#e5e7eb')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor(brand_color)),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 8*mm))
        
        # === PAYMENT STATUS ===
        status = invoice.get('status', 'pending').upper()
        
        if status == 'PAID':
            status_text = f'<font size="14" color="#059669"><b>✓ PAID</b></font>'
            if invoice.get('paid_date'):
                status_text += f'<br/><font size="10" color="#059669">Payment received on {self._format_date(invoice.get("paid_date"))}</font>'
            
            status_para = Paragraph(status_text, ParagraphStyle('paid', alignment=TA_CENTER, leading=18))
            status_table = Table([[status_para]], colWidths=[17*cm])
            status_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ecfdf5')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#059669')),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(status_table)
        else:
            status_color = '#d97706' if status == 'PENDING' else '#dc2626'
            status_bg = '#fffbeb' if status == 'PENDING' else '#fef2f2'
            status_label = 'PAYMENT PENDING' if status == 'PENDING' else 'PAYMENT OVERDUE'
            
            status_text = f'<font size="12" color="{status_color}"><b>⏳ {status_label}</b></font>'
            status_para = Paragraph(status_text, ParagraphStyle('pending', alignment=TA_CENTER))
            status_table = Table([[status_para]], colWidths=[17*cm])
            status_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(status_bg)),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(status_color)),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(status_table)
        
        # === FOOTER ===
        elements.append(Spacer(1, 10*mm))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 5*mm))
        elements.append(Paragraph(
            '<font size="10"><i>Thank you for your business!</i></font>',
            ParagraphStyle('thanks', alignment=TA_CENTER)
        ))
        elements.append(Paragraph(
            f'<font size="8" color="#999999">{platform_name} • Generated {datetime.now().strftime("%d %B %Y")}</font>',
            ParagraphStyle('footer', alignment=TA_CENTER)
        ))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer


invoice_pdf_generator = InvoicePDFGenerator()
