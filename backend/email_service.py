import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = None
        self.smtp_port = None
        self.smtp_user = None
        self.smtp_password = None
        self.from_email = None
        self.from_name = None
        self.is_configured = False
    
    def configure(self, settings: Dict):
        """Configure SMTP settings"""
        self.smtp_host = settings.get('smtp_host', 'smtp.office365.com')
        self.smtp_port = int(settings.get('smtp_port', 587))
        self.smtp_user = settings.get('smtp_user')
        self.smtp_password = settings.get('smtp_password')
        self.from_email = settings.get('from_email', self.smtp_user)
        self.from_name = settings.get('from_name', 'UpShift')
        self.is_configured = bool(self.smtp_user and self.smtp_password)
        
        if self.is_configured:
            logger.info(f"Email service configured with {self.smtp_host}:{self.smtp_port}")
        else:
            logger.warning("Email service not fully configured")
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """Send an email via SMTP"""
        if not self.is_configured:
            logger.error("Email service not configured")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            if cc:
                msg['Cc'] = ', '.join(cc)
            
            # Add text and HTML parts
            if text_body:
                part1 = MIMEText(text_body, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(html_body, 'html')
            msg.attach(part2)
            
            # Build recipient list
            recipients = [to_email]
            if cc:
                recipients.extend(cc)
            if bcc:
                recipients.extend(bcc)
            
            # Connect and send
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, recipients, msg.as_string())
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_invoice_reminder(
        self,
        to_email: str,
        reseller_name: str,
        invoice_number: str,
        amount: str,
        due_date: str,
        payment_link: str,
        is_overdue: bool = False
    ) -> bool:
        """Send invoice payment reminder email"""
        
        if is_overdue:
            subject = f"OVERDUE: Invoice {invoice_number} - Payment Required"
            urgency_text = "This invoice is now overdue. Please make payment immediately to avoid service interruption."
            urgency_color = "#dc2626"
        else:
            subject = f"Payment Reminder: Invoice {invoice_number}"
            urgency_text = "Please ensure payment is made before the due date."
            urgency_color = "#f59e0b"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .invoice-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
                .amount {{ font-size: 32px; font-weight: bold; color: #1e40af; }}
                .urgency {{ background: {urgency_color}; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                .btn {{ display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Payment Reminder</h1>
                </div>
                <div class="content">
                    <p>Dear {reseller_name},</p>
                    
                    <div class="urgency">
                        {urgency_text}
                    </div>
                    
                    <div class="invoice-box">
                        <p><strong>Invoice Number:</strong> {invoice_number}</p>
                        <p><strong>Amount Due:</strong></p>
                        <p class="amount">{amount}</p>
                        <p><strong>Due Date:</strong> {due_date}</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="{payment_link}" class="btn">Pay Now</a>
                    </p>
                    
                    <p>If you have already made this payment, please disregard this reminder.</p>
                    
                    <p>Thank you for your continued partnership.</p>
                    
                    <p>Best regards,<br>The UpShift Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from UpShift Platform.</p>
                    <p>If you have any questions, please contact support@upshift.works</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Payment Reminder - {invoice_number}
        
        Dear {reseller_name},
        
        {urgency_text}
        
        Invoice Number: {invoice_number}
        Amount Due: {amount}
        Due Date: {due_date}
        
        Pay now: {payment_link}
        
        If you have already made this payment, please disregard this reminder.
        
        Thank you for your continued partnership.
        
        Best regards,
        The UpShift Team
        """
        
        return await self.send_email(to_email, subject, html_body, text_body)
    
    async def send_invoice_created(
        self,
        to_email: str,
        reseller_name: str,
        invoice_number: str,
        amount: str,
        period: str,
        due_date: str,
        payment_link: str
    ) -> bool:
        """Send new invoice notification email"""
        
        subject = f"New Invoice: {invoice_number} for {period}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .invoice-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
                .amount {{ font-size: 32px; font-weight: bold; color: #1e40af; }}
                .btn {{ display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Invoice</h1>
                </div>
                <div class="content">
                    <p>Dear {reseller_name},</p>
                    
                    <p>Your invoice for {period} has been generated.</p>
                    
                    <div class="invoice-box">
                        <p><strong>Invoice Number:</strong> {invoice_number}</p>
                        <p><strong>Period:</strong> {period}</p>
                        <p><strong>Amount Due:</strong></p>
                        <p class="amount">{amount}</p>
                        <p><strong>Due Date:</strong> {due_date}</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="{payment_link}" class="btn">View & Pay Invoice</a>
                    </p>
                    
                    <p>Thank you for your continued partnership.</p>
                    
                    <p>Best regards,<br>The UpShift Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from UpShift Platform.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body)
    
    async def test_connection(self) -> Dict:
        """Test SMTP connection"""
        if not self.is_configured:
            return {"success": False, "error": "Email service not configured"}
        
        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
            return {"success": True, "message": "SMTP connection successful"}
        except Exception as e:
            return {"success": False, "error": str(e)}

# Global instance
email_service = EmailService()
