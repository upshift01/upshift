import smtplib
import ssl
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
        self.encryption = 'tls'  # tls, ssl, or none
        self.is_configured = False
    
    def configure(self, settings: Dict):
        """Configure SMTP settings"""
        self.smtp_host = settings.get('smtp_host', 'smtp.office365.com')
        self.smtp_port = int(settings.get('smtp_port', 587))
        self.smtp_user = settings.get('smtp_user')
        self.smtp_password = settings.get('smtp_password')
        self.from_email = settings.get('from_email', self.smtp_user)
        self.from_name = settings.get('from_name', 'UpShift')
        self.encryption = settings.get('encryption', 'tls')  # tls, ssl, or none
        self.is_configured = bool(self.smtp_user and self.smtp_password)
        
        if self.is_configured:
            logger.info(f"Email service configured with {self.smtp_host}:{self.smtp_port} (encryption: {self.encryption})")
        else:
            logger.warning("Email service not fully configured")
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        raise_exceptions: bool = True
    ) -> bool:
        """Send an email via SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML content of the email
            text_body: Optional plain text content
            cc: Optional list of CC recipients
            bcc: Optional list of BCC recipients
            raise_exceptions: If True, SMTP exceptions are raised for caller to handle.
                              If False, exceptions are caught and False is returned.
        
        Returns:
            bool: True if email sent successfully, False otherwise
            
        Raises:
            smtplib.SMTPAuthenticationError: If authentication fails (when raise_exceptions=True)
            smtplib.SMTPConnectError: If connection to server fails (when raise_exceptions=True)
            smtplib.SMTPException: For other SMTP errors (when raise_exceptions=True)
        """
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
            
            # Connect and send based on encryption type
            if self.encryption == 'ssl':
                # Use SMTP_SSL for port 465
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, context=context, timeout=30) as server:
                    server.login(self.smtp_user, self.smtp_password)
                    server.sendmail(self.from_email, recipients, msg.as_string())
            elif self.encryption == 'tls':
                # Use SMTP with STARTTLS for port 587
                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.sendmail(self.from_email, recipients, msg.as_string())
            else:
                # No encryption
                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                    server.login(self.smtp_user, self.smtp_password)
                    server.sendmail(self.from_email, recipients, msg.as_string())
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
            
        except smtplib.SMTPAuthenticationError as auth_error:
            logger.error(f"SMTP Authentication failed for {to_email}: {str(auth_error)}")
            if raise_exceptions:
                raise
            return False
        except smtplib.SMTPConnectError as connect_error:
            logger.error(f"SMTP Connection failed for {to_email}: {str(connect_error)}")
            if raise_exceptions:
                raise
            return False
        except smtplib.SMTPServerDisconnected as disconnect_error:
            logger.error(f"SMTP Server disconnected while sending to {to_email}: {str(disconnect_error)}")
            if raise_exceptions:
                raise
            return False
        except smtplib.SMTPRecipientsRefused as refused_error:
            logger.error(f"SMTP Recipients refused for {to_email}: {str(refused_error)}")
            if raise_exceptions:
                raise
            return False
        except smtplib.SMTPException as smtp_error:
            logger.error(f"SMTP Error sending to {to_email}: {str(smtp_error)}")
            if raise_exceptions:
                raise
            return False
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            if raise_exceptions:
                raise
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
    
    async def send_booking_confirmation(
        self,
        to_email: str,
        customer_name: str,
        booking_date: str,
        booking_time: str,
        meeting_link: str,
        amount: str,
        company_name: str = "UpShift"
    ) -> bool:
        """Send booking confirmation email after successful payment"""
        subject = f"Your Strategy Call is Confirmed! - {company_name}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .success-badge {{ background: #059669; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }}
                .details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }}
                .details p {{ margin: 8px 0; }}
                .meeting-link {{ background: #1e40af; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 15px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✓ Booking Confirmed!</h1>
                </div>
                <div class="content">
                    <div style="text-align: center;">
                        <span class="success-badge">Payment Successful</span>
                    </div>
                    
                    <p>Dear {customer_name},</p>
                    
                    <p>Great news! Your payment of <strong>{amount}</strong> has been received and your strategy call is now confirmed.</p>
                    
                    <div class="details">
                        <p><strong>📅 Date:</strong> {booking_date}</p>
                        <p><strong>🕐 Time:</strong> {booking_time}</p>
                        <p><strong>💰 Amount Paid:</strong> {amount}</p>
                    </div>
                    
                    <p><strong>Your Meeting Link:</strong></p>
                    <p>Use the link below to join your strategy call at the scheduled time:</p>
                    
                    <div style="text-align: center;">
                        <a href="{meeting_link}" class="meeting-link">Join Strategy Call</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #6b7280;">
                        Meeting Link: <a href="{meeting_link}">{meeting_link}</a>
                    </p>
                    
                    <p><strong>What to Prepare:</strong></p>
                    <ul>
                        <li>Your current CV/resume</li>
                        <li>Any specific questions about your career goals</li>
                        <li>A quiet space with good internet connection</li>
                    </ul>
                    
                    <p>If you need to reschedule, please contact us at least 24 hours before your appointment.</p>
                    
                    <p>We look forward to speaking with you!</p>
                    
                    <p>Best regards,<br>The {company_name} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated confirmation from {company_name}.</p>
                    <p>If you did not make this booking, please contact us immediately.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body)
    
    async def send_welcome_email(
        self,
        to_email: str,
        user_name: str,
        platform_name: str = "UpShift",
        login_url: str = "",
        features: List[str] = None
    ) -> bool:
        """Send welcome email to new user registration"""
        if features is None:
            features = [
                "AI-powered CV Builder",
                "ATS-optimized templates",
                "Cover letter generator",
                "Job application tracking"
            ]
        
        subject = f"Welcome to {platform_name}! 🎉"
        
        features_html = "".join([f"<li style='margin: 8px 0;'>{feature}</li>" for feature in features])
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Welcome to {platform_name}!</h1>
                    <p style="margin: 15px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your career journey starts here</p>
                </div>
                
                <!-- Body -->
                <div style="padding: 40px 30px;">
                    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi {user_name},</p>
                    
                    <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 25px 0;">
                        Thank you for joining {platform_name}! We're excited to help you take your career to the next level.
                    </p>
                    
                    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Here's what you can do:</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                            {features_html}
                        </ul>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{login_url}" style="display: inline-block; background: #1e40af; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">Get Started</a>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0 0 0;">
                        If you have any questions, feel free to reach out to our support team. We're here to help!
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        © {datetime.now().year} {platform_name}. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
Welcome to {platform_name}!

Hi {user_name},

Thank you for joining {platform_name}! We're excited to help you take your career to the next level.

Here's what you can do:
- AI-powered CV Builder
- ATS-optimized templates
- Cover letter generator
- Job application tracking

Get started: {login_url}

If you have any questions, feel free to reach out to our support team.

© {datetime.now().year} {platform_name}
        """
        
        return await self.send_email(to_email, subject, html_body, text_body, raise_exceptions=False)
    
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
