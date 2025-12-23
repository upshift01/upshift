"""
Invoice PDF Generation Service - Simple Layout
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime
import logging
import qrcode

logger = logging.getLogger(__name__)

class InvoicePDFGenerator:
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
    
    def _generate_qr_code(self, data, size=80):
        try:
            qr = qrcode.QRCode(version=1, box_size=5, border=1)
            qr.add_data(data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            img = img.resize((size, size))
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            return buffer
        except:
            return None
    
    def _fmt_currency(self, amt):
        if isinstance(amt, (int, float)):
            if amt > 10000:
                amt = amt / 100
            return f"R {amt:,.2f}"
        return str(amt)
    
    def _fmt_date(self, d):
        if not d:
            return "N/A"
        try:
            if isinstance(d, str):
                dt = datetime.fromisoformat(d.replace('Z', '').split('+')[0])
                return dt.strftime('%d %B %Y')
        except:
            pass
        return str(d)[:10]
    
    def generate_customer_invoice_pdf(self, invoice, reseller=None, reseller_settings=None):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        
        story = []
        styles = self.styles
        
        company = reseller.get('company_name', 'Company') if reseller else 'Company'
        contact = reseller.get('contact_info', {}) if reseller else {}
        seller_vat = reseller_settings.get('vat_number', '') if reseller_settings else ''
        
        # HEADER - Build left side content as separate paragraphs in rows
        left_content = []
        left_content.append([Paragraph(f'<b><font size="16">{company}</font></b>', styles['Normal'])])
        left_content.append([Paragraph(f'<font size="9" color="gray">{contact.get("email", "")}</font>', styles['Normal'])])
        left_content.append([Paragraph(f'<font size="9" color="gray">{contact.get("phone", "")}</font>', styles['Normal'])])
        if seller_vat:
            left_content.append([Paragraph(f'<font size="9" color="gray">VAT: {seller_vat}</font>', styles['Normal'])])
        
        left_table = Table(left_content, colWidths=[8*cm])
        left_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        
        # RIGHT SIDE - Each element in its own row with explicit row heights
        right_content = [
            [Paragraph('<b><font size="20" color="#1e40af">INVOICE</font></b>', styles['Normal'])],
            [Paragraph(f'<font size="11" color="#666666">{invoice.get("invoice_number", "")}</font>', styles['Normal'])],
            [Paragraph(f'<font size="9" color="#888888">Date: {self._fmt_date(invoice.get("created_at"))}</font>', styles['Normal'])],
        ]
        
        right_table = Table(right_content, colWidths=[8*cm], rowHeights=[28, 18, 16])
        right_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (0,0), 'BOTTOM'),
            ('VALIGN', (0,1), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        
        header = Table([[left_table, right_table]], colWidths=[8.5*cm, 8.5*cm])
        header.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(header)
        story.append(Spacer(1, 10*mm))
        
        # LINE
        line = Table([['']], colWidths=[17*cm])
        line.setStyle(TableStyle([('LINEBELOW', (0,0), (-1,-1), 1, colors.lightgrey)]))
        story.append(line)
        story.append(Spacer(1, 10*mm))
        
        # BILL TO
        story.append(Paragraph('<b><font size="10" color="gray">BILL TO:</font></b>', styles['Normal']))
        story.append(Spacer(1, 2*mm))
        story.append(Paragraph(f'<b>{invoice.get("customer_name", "Customer")}</b>', styles['Normal']))
        if invoice.get("customer_email"):
            story.append(Paragraph(f'<font size="9" color="gray">{invoice.get("customer_email")}</font>', styles['Normal']))
        if invoice.get("customer_address"):
            story.append(Paragraph(f'<font size="9" color="gray">{invoice.get("customer_address")}</font>', styles['Normal']))
        if invoice.get("customer_vat_number"):
            story.append(Paragraph(f'<font size="9" color="gray">VAT: {invoice.get("customer_vat_number")}</font>', styles['Normal']))
        
        story.append(Spacer(1, 5*mm))
        story.append(Paragraph(f'<font size="9"><b>Due Date:</b> {self._fmt_date(invoice.get("due_date"))}</font>', styles['Normal']))
        story.append(Paragraph(f'<font size="9"><b>Status:</b> {invoice.get("status", "pending").upper()}</font>', styles['Normal']))
        story.append(Spacer(1, 10*mm))
        
        # ITEMS TABLE
        amt = invoice.get('amount', 0)
        if amt > 10000:
            amt = amt / 100
        vat = amt * 0.15
        total = amt + vat
        
        data = [
            ['Description', 'Amount'],
            [invoice.get('plan_name', 'Service'), self._fmt_currency(amt)],
            ['', ''],
            ['Subtotal', self._fmt_currency(amt)],
            ['VAT (15%)', self._fmt_currency(vat)],
            ['TOTAL', self._fmt_currency(total)],
        ]
        
        t = Table(data, colWidths=[12*cm, 5*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,0), 1, colors.HexColor('#1e40af')),
            ('LINEBELOW', (0,1), (-1,1), 0.5, colors.lightgrey),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#f0f0f0')),
            ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor('#1e40af')),
        ]))
        story.append(t)
        story.append(Spacer(1, 10*mm))
        
        # STATUS
        status = invoice.get('status', 'pending').upper()
        if status == 'PAID':
            story.append(Paragraph('<font size="14" color="green"><b>✓ PAID</b></font>', styles['Normal']))
        else:
            story.append(Paragraph('<font size="14" color="orange"><b>PAYMENT PENDING</b></font>', styles['Normal']))
            if invoice.get('payment_url'):
                story.append(Spacer(1, 3*mm))
                qr = self._generate_qr_code(invoice['payment_url'])
                if qr:
                    story.append(Image(qr, width=2*cm, height=2*cm))
                story.append(Paragraph(f'<font size="8" color="blue">{invoice["payment_url"]}</font>', styles['Normal']))
        
        story.append(Spacer(1, 15*mm))
        story.append(Paragraph('<font size="10"><i>Thank you for your business!</i></font>', styles['Normal']))
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_reseller_invoice_pdf(self, invoice, reseller=None, platform_settings=None):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        
        story = []
        styles = self.styles
        
        platform = platform_settings.get('platform_name', 'UpShift') if platform_settings else 'UpShift'
        contact = platform_settings.get('contact', {}) if platform_settings else {}
        seller_vat = platform_settings.get('vat_number', '') if platform_settings else ''
        
        # HEADER - Build left side content as separate paragraphs in rows
        left_content = []
        left_content.append([Paragraph(f'<b><font size="16">{platform}</font></b>', styles['Normal'])])
        left_content.append([Paragraph(f'<font size="9" color="gray">{contact.get("email", "")}</font>', styles['Normal'])])
        left_content.append([Paragraph(f'<font size="9" color="gray">{contact.get("phone", "")}</font>', styles['Normal'])])
        if seller_vat:
            left_content.append([Paragraph(f'<font size="9" color="gray">VAT: {seller_vat}</font>', styles['Normal'])])
        
        left_table = Table(left_content, colWidths=[8*cm])
        left_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        
        # RIGHT SIDE - Each element in its own row with explicit row heights
        right_content = [
            [Paragraph('<b><font size="20" color="#1e40af">TAX INVOICE</font></b>', styles['Normal'])],
            [Paragraph(f'<font size="11" color="#666666">{invoice.get("invoice_number", "")}</font>', styles['Normal'])],
            [Paragraph(f'<font size="9" color="#888888">Date: {self._fmt_date(invoice.get("created_at"))}</font>', styles['Normal'])],
        ]
        
        right_table = Table(right_content, colWidths=[8*cm], rowHeights=[28, 18, 16])
        right_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (0,0), 'BOTTOM'),
            ('VALIGN', (0,1), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        
        header = Table([[left_table, right_table]], colWidths=[8.5*cm, 8.5*cm])
        header.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(header)
        story.append(Spacer(1, 10*mm))
        
        # LINE
        line = Table([['']], colWidths=[17*cm])
        line.setStyle(TableStyle([('LINEBELOW', (0,0), (-1,-1), 1, colors.lightgrey)]))
        story.append(line)
        story.append(Spacer(1, 10*mm))
        
        # BILL TO
        reseller_name = reseller.get('company_name', 'Reseller') if reseller else 'Reseller'
        reseller_contact = reseller.get('contact_info', {}) if reseller else {}
        
        story.append(Paragraph('<b><font size="10" color="gray">BILL TO:</font></b>', styles['Normal']))
        story.append(Spacer(1, 2*mm))
        story.append(Paragraph(f'<b>{reseller_name}</b>', styles['Normal']))
        if reseller_contact.get("email"):
            story.append(Paragraph(f'<font size="9" color="gray">{reseller_contact.get("email")}</font>', styles['Normal']))
        
        story.append(Spacer(1, 5*mm))
        story.append(Paragraph(f'<font size="9"><b>Period:</b> {invoice.get("period", "N/A")}</font>', styles['Normal']))
        story.append(Paragraph(f'<font size="9"><b>Due Date:</b> {self._fmt_date(invoice.get("due_date"))}</font>', styles['Normal']))
        story.append(Paragraph(f'<font size="9"><b>Status:</b> {invoice.get("status", "pending").upper()}</font>', styles['Normal']))
        story.append(Spacer(1, 10*mm))
        
        # ITEMS
        amt = invoice.get('amount', 0)
        if amt > 10000:
            amt = amt / 100
        vat = amt * 0.15
        total = amt + vat
        
        data = [
            ['Description', 'Amount'],
            [f'Monthly Subscription - {invoice.get("period", "")}', self._fmt_currency(amt)],
            ['', ''],
            ['Subtotal', self._fmt_currency(amt)],
            ['VAT (15%)', self._fmt_currency(vat)],
            ['TOTAL', self._fmt_currency(total)],
        ]
        
        t = Table(data, colWidths=[12*cm, 5*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,0), 1, colors.HexColor('#1e40af')),
            ('LINEBELOW', (0,1), (-1,1), 0.5, colors.lightgrey),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#f0f0f0')),
            ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor('#1e40af')),
        ]))
        story.append(t)
        story.append(Spacer(1, 10*mm))
        
        # STATUS
        status = invoice.get('status', 'pending').upper()
        if status == 'PAID':
            story.append(Paragraph('<font size="14" color="green"><b>✓ PAID</b></font>', styles['Normal']))
        else:
            story.append(Paragraph('<font size="14" color="orange"><b>PAYMENT PENDING</b></font>', styles['Normal']))
        
        story.append(Spacer(1, 15*mm))
        story.append(Paragraph('<font size="10"><i>Thank you for your business!</i></font>', styles['Normal']))
        
        doc.build(story)
        buffer.seek(0)
        return buffer


invoice_pdf_generator = InvoicePDFGenerator()
