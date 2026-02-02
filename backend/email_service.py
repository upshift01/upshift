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
        self.platform_name = "UpShift"
        self._db = None  # Database reference for template lookups
    
    def set_db(self, db):
        """Set the database reference for template lookups"""
        self._db = db
        logger.info("Email service database reference set")
    
    def configure(self, settings: Dict):
        """Configure SMTP settings"""
        self.smtp_host = settings.get('smtp_host', 'smtp.office365.com')
        self.smtp_port = int(settings.get('smtp_port', 587))
        self.smtp_user = settings.get('smtp_user')
        self.smtp_password = settings.get('smtp_password')
        self.from_email = settings.get('from_email', self.smtp_user)
        self.from_name = settings.get('from_name', 'UpShift')
        self.platform_name = settings.get('platform_name', 'UpShift')
        self.encryption = settings.get('encryption', 'tls')  # tls, ssl, or none
        self.is_configured = bool(self.smtp_user and self.smtp_password)
        
        if self.is_configured:
            logger.info(f"Email service configured with {self.smtp_host}:{self.smtp_port} (encryption: {self.encryption})")
        else:
            logger.warning("Email service not fully configured")
    
    async def get_custom_template(self, template_id: str) -> Optional[Dict]:
        """Fetch a custom email template from the database"""
        if not self._db:
            return None
        
        try:
            template = await self._db.email_templates.find_one(
                {"template_id": template_id, "is_active": {"$ne": False}},
                {"_id": 0}
            )
            return template
        except Exception as e:
            logger.error(f"Error fetching email template {template_id}: {e}")
            return None
    
    def replace_variables(self, text: str, variables: Dict) -> str:
        """Replace {{variable}} placeholders in text with actual values"""
        if not text:
            return text
        for key, value in variables.items():
            text = text.replace(f"{{{{{key}}}}}", str(value) if value else "")
        return text
    
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
    
    # ==================== CONTRACT EVENT EMAILS ====================
    
    async def send_proposal_accepted_email(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        company_name: str,
        employer_name: str,
        next_steps: str = "The employer will reach out with contract details soon.",
        platform_name: str = "UpShift"
    ) -> bool:
        """Send email when proposal is accepted"""
        subject = f"🎉 Great News! Your Proposal Was Accepted - {job_title}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .success-badge {{ background: #059669; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; }}
                .details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Proposal Accepted!</h1>
                </div>
                <div class="content">
                    <p>Dear {applicant_name},</p>
                    
                    <p>Congratulations! Your proposal has been accepted!</p>
                    
                    <div class="details">
                        <p><strong>📋 Job:</strong> {job_title}</p>
                        <p><strong>🏢 Company:</strong> {company_name}</p>
                        <p><strong>👤 Employer:</strong> {employer_name}</p>
                    </div>
                    
                    <p><strong>What's Next?</strong></p>
                    <p>{next_steps}</p>
                    
                    <p>Best of luck with this opportunity!</p>
                    
                    <p>Best regards,<br>The {platform_name} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from {platform_name}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)
    
    async def send_contract_created_email(
        self,
        to_email: str,
        contractor_name: str,
        contract_title: str,
        employer_name: str,
        company_name: str,
        contract_value: str,
        start_date: str,
        contract_url: str,
        platform_name: str = "UpShift"
    ) -> bool:
        """Send email when a contract is created for the contractor to review"""
        platform_name = self.platform_name or platform_name
        
        # Check for custom template
        custom_template = await self.get_custom_template("contract_created")
        
        variables = {
            "platform_name": platform_name,
            "contractor_name": contractor_name,
            "contract_title": contract_title,
            "employer_name": employer_name,
            "company_name": company_name,
            "contract_value": contract_value,
            "start_date": start_date,
            "contract_url": contract_url
        }
        
        # Use custom subject if available
        if custom_template and custom_template.get("subject"):
            subject = self.replace_variables(custom_template["subject"], variables)
        else:
            subject = f"📄 New Contract: {contract_title} - Review Required"
        
        # Use custom body if available
        if custom_template and custom_template.get("body_html"):
            html_body = self.replace_variables(custom_template["body_html"], variables)
        else:
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                    .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }}
                    .btn {{ display: inline-block; background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                    .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📄 New Contract</h1>
                    </div>
                    <div class="content">
                        <p>Dear {contractor_name},</p>
                        
                        <p>A new contract has been created for you. Please review the details and sign to activate it.</p>
                        
                        <div class="details">
                            <p><strong>📋 Contract:</strong> {contract_title}</p>
                            <p><strong>🏢 Company:</strong> {company_name}</p>
                            <p><strong>👤 Employer:</strong> {employer_name}</p>
                            <p><strong>💰 Value:</strong> {contract_value}</p>
                            <p><strong>📅 Start Date:</strong> {start_date}</p>
                        </div>
                        
                        <p style="text-align: center;">
                            <a href="{contract_url}" class="btn">Review & Sign Contract</a>
                        </p>
                        
                        <p>Please review the contract carefully before signing.</p>
                        
                        <p>Best regards,<br>The {platform_name} Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from {platform_name}.</p>
                    </div>
                </div>
            </body>
            </html>
            """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)
    
    async def send_contract_signed_email(
        self,
        to_email: str,
        recipient_name: str,
        contract_title: str,
        other_party_name: str,
        contract_url: str,
        platform_name: str = "UpShift"
    ) -> bool:
        """Send email when a contract is signed and activated"""
        subject = f"✅ Contract Activated: {contract_title}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .success-badge {{ background: #059669; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; }}
                .btn {{ display: inline-block; background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Contract Active!</h1>
                </div>
                <div class="content">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span class="success-badge">Contract Activated</span>
                    </div>
                    
                    <p>Dear {recipient_name},</p>
                    
                    <p>The contract <strong>"{contract_title}"</strong> has been signed by {other_party_name} and is now active!</p>
                    
                    <p style="text-align: center;">
                        <a href="{contract_url}" class="btn">View Contract</a>
                    </p>
                    
                    <p>You can now proceed with the work as outlined in the contract.</p>
                    
                    <p>Best regards,<br>The {platform_name} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from {platform_name}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)
    
    async def send_milestone_funded_email(
        self,
        to_email: str,
        recipient_name: str,
        contract_title: str,
        milestone_title: str,
        amount: str,
        contract_url: str,
        is_contractor: bool = True,
        platform_name: str = "UpShift"
    ) -> bool:
        """Send email when a milestone is funded"""
        if is_contractor:
            subject = f"💰 Milestone Funded: {milestone_title}"
            message = f"Great news! The milestone <strong>'{milestone_title}'</strong> has been funded. The funds are now held in escrow and will be released upon approval of your work."
        else:
            subject = f"✅ Payment Successful: {milestone_title}"
            message = f"Your payment for milestone <strong>'{milestone_title}'</strong> was successful. The funds are now held in escrow and will be released when you approve the contractor's work."
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .amount {{ font-size: 28px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }}
                .btn {{ display: inline-block; background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💰 Milestone Funded</h1>
                </div>
                <div class="content">
                    <p>Dear {recipient_name},</p>
                    
                    <p>{message}</p>
                    
                    <p class="amount">{amount}</p>
                    
                    <p><strong>Contract:</strong> {contract_title}<br>
                    <strong>Milestone:</strong> {milestone_title}</p>
                    
                    <p style="text-align: center;">
                        <a href="{contract_url}" class="btn">View Contract</a>
                    </p>
                    
                    <p>Best regards,<br>The {platform_name} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from {platform_name}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)
    
    async def send_payment_released_email(
        self,
        to_email: str,
        contractor_name: str,
        contract_title: str,
        milestone_title: str,
        amount: str,
        contract_url: str,
        platform_name: str = "UpShift"
    ) -> bool:
        """Send email when payment is released to contractor"""
        subject = f"💸 Payment Released: {amount} - {milestone_title}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .amount {{ font-size: 32px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }}
                .success-badge {{ background: #059669; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; }}
                .btn {{ display: inline-block; background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💸 Payment Released!</h1>
                </div>
                <div class="content">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span class="success-badge">Payment Successful</span>
                    </div>
                    
                    <p>Dear {contractor_name},</p>
                    
                    <p>Great news! Your payment has been released!</p>
                    
                    <p class="amount">{amount}</p>
                    
                    <p><strong>Contract:</strong> {contract_title}<br>
                    <strong>Milestone:</strong> {milestone_title}</p>
                    
                    <p>The funds will be transferred to your account shortly.</p>
                    
                    <p style="text-align: center;">
                        <a href="{contract_url}" class="btn">View Contract</a>
                    </p>
                    
                    <p>Keep up the great work!</p>
                    
                    <p>Best regards,<br>The {platform_name} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from {platform_name}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)
    
    async def send_new_proposal_notification_email(
        self,
        to_email: str,
        employer_name: str,
        job_title: str,
        applicant_name: str,
        applicant_rate: str,
        cover_letter_preview: str,
        proposals_url: str,
        total_proposals: int = 1,
        platform_name: str = "UpShift"
    ) -> bool:
        """Send email to employer when a new proposal is submitted for their job"""
        platform_name = self.platform_name or platform_name
        
        # Truncate cover letter preview
        if len(cover_letter_preview) > 200:
            cover_letter_preview = cover_letter_preview[:200] + "..."
        
        # Check for custom template
        custom_template = await self.get_custom_template("new_proposal")
        
        variables = {
            "platform_name": platform_name,
            "employer_name": employer_name,
            "job_title": job_title,
            "applicant_name": applicant_name,
            "applicant_rate": applicant_rate,
            "cover_letter_preview": cover_letter_preview,
            "proposals_url": proposals_url,
            "total_proposals": str(total_proposals)
        }
        
        # Use custom subject if available
        if custom_template and custom_template.get("subject"):
            subject = self.replace_variables(custom_template["subject"], variables)
        else:
            subject = f"📬 New Proposal: {job_title}"
        
        # Use custom body if available
        if custom_template and custom_template.get("body_html"):
            html_body = self.replace_variables(custom_template["body_html"], variables)
        else:
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                    .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .proposal-card {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }}
                    .applicant-name {{ font-size: 18px; font-weight: bold; color: #1f2937; }}
                    .rate {{ color: #059669; font-weight: bold; }}
                    .cover-letter {{ font-style: italic; color: #6b7280; margin-top: 10px; font-size: 14px; }}
                    .btn {{ display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                    .stats {{ background: #ecfdf5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📬 New Proposal Received!</h1>
                    </div>
                    <div class="content">
                        <p>Dear {employer_name},</p>
                        
                        <p>Great news! You've received a new proposal for your job posting:</p>
                        
                        <div class="stats">
                            <strong>📋 {job_title}</strong><br>
                            <span style="color: #059669;">Total Proposals: {total_proposals}</span>
                        </div>
                        
                        <div class="proposal-card">
                            <p class="applicant-name">👤 {applicant_name}</p>
                            <p class="rate">💰 Proposed Rate: {applicant_rate}</p>
                            <p class="cover-letter">"{cover_letter_preview}"</p>
                        </div>
                        
                        <p style="text-align: center;">
                            <a href="{proposals_url}" class="btn">Review All Proposals</a>
                        </p>
                        
                        <p>Don't miss out on great talent! Review proposals promptly to find the best fit for your role.</p>
                        
                        <p>Best regards,<br>The {platform_name} Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from {platform_name}.</p>
                    </div>
                </div>
            </body>
            </html>
            """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)

    async def send_employer_welcome_email(
        self,
        to_email: str,
        employer_name: str,
        password: str,
        login_url: str = None,
        created_by: str = "Administrator"
    ):
        """Send welcome email to newly created employer account"""
        platform_name = self.platform_name or "UpShift"
        login_url = login_url or "https://upshift.works/login"
        
        # Check for custom template
        custom_template = await self.get_custom_template("employer_welcome")
        
        variables = {
            "platform_name": platform_name,
            "employer_name": employer_name,
            "email": to_email,
            "password": password,
            "login_url": login_url,
            "created_by": created_by
        }
        
        # Use custom subject if available
        if custom_template and custom_template.get("subject"):
            subject = self.replace_variables(custom_template["subject"], variables)
        else:
            subject = f"Welcome to {platform_name} - Your Employer Account"
        
        # Use custom body if available
        if custom_template and custom_template.get("body_html"):
            html_body = self.replace_variables(custom_template["body_html"], variables)
        else:
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
                    .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                    .credentials {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }}
                    .credential-row {{ margin: 10px 0; }}
                    .label {{ color: #6b7280; font-size: 12px; text-transform: uppercase; }}
                    .value {{ font-family: monospace; font-size: 16px; color: #1f2937; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; margin-top: 4px; display: block; }}
                    .btn {{ display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                    .warning {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to {platform_name}!</h1>
                    </div>
                    <div class="content">
                        <p>Dear {employer_name},</p>
                        
                        <p>Your employer account has been created by {created_by}. You can now post jobs, review proposals, and hire talented professionals.</p>
                        
                        <div class="credentials">
                            <h3 style="margin-top: 0;">Your Login Credentials</h3>
                            <div class="credential-row">
                                <span class="label">Email</span>
                                <span class="value">{to_email}</span>
                            </div>
                            <div class="credential-row">
                                <span class="label">Password</span>
                                <span class="value">{password}</span>
                            </div>
                        </div>
                        
                        <div class="warning">
                            ⚠️ <strong>Important:</strong> Please change your password after your first login for security purposes.
                        </div>
                        
                        <p style="text-align: center;">
                            <a href="{login_url}" class="btn">Login to Your Account</a>
                        </p>
                        
                        <h3>What's Next?</h3>
                        <ul>
                            <li>Complete your company profile</li>
                            <li>Post your first job listing</li>
                            <li>Browse our talent pool</li>
                            <li>Start receiving proposals</li>
                        </ul>
                        
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                        
                        <p>Best regards,<br>The {platform_name} Team</p>
                    </div>
                    <div class="footer">
                        <p>This email was sent because an account was created for you on {platform_name}.</p>
                    </div>
                </div>
            </body>
            </html>
            """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)

    async def send_employer_password_reset_email(
        self,
        to_email: str,
        employer_name: str,
        new_password: str,
        reset_by: str = "Administrator"
    ):
        """Send password reset notification to employer"""
        platform_name = self.platform_name or "UpShift"
        
        subject = f"{platform_name} - Your Password Has Been Reset"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .credentials {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }}
                .value {{ font-family: monospace; font-size: 18px; color: #1f2937; background: #f3f4f6; padding: 12px; border-radius: 4px; margin-top: 8px; display: block; text-align: center; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset</h1>
                </div>
                <div class="content">
                    <p>Dear {employer_name},</p>
                    
                    <p>Your password has been reset by {reset_by}. Please use the new password below to login:</p>
                    
                    <div class="credentials">
                        <h3 style="margin-top: 0; text-align: center;">Your New Password</h3>
                        <span class="value">{new_password}</span>
                    </div>
                    
                    <p><strong>⚠️ Please change this password immediately after logging in.</strong></p>
                    
                    <p>If you did not request this password reset, please contact our support team immediately.</p>
                    
                    <p>Best regards,<br>The {platform_name} Team</p>
                </div>
                <div class="footer">
                    <p>This is a security notification from {platform_name}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)

    async def send_employer_suspended_email(
        self,
        to_email: str,
        employer_name: str,
        reason: str = None,
        suspended_by: str = "Administrator"
    ):
        """Send account suspension notification to employer"""
        platform_name = self.platform_name or "UpShift"
        reason_text = reason if reason else "Please contact support for more information."
        
        subject = f"{platform_name} - Account Suspended"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .notice {{ background: #fef2f2; border: 1px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ Account Suspended</h1>
                </div>
                <div class="content">
                    <p>Dear {employer_name},</p>
                    
                    <p>We regret to inform you that your employer account has been suspended.</p>
                    
                    <div class="notice">
                        <strong>Reason:</strong><br>
                        {reason_text}
                    </div>
                    
                    <p><strong>What this means:</strong></p>
                    <ul>
                        <li>You cannot access your employer dashboard</li>
                        <li>Your job listings have been paused</li>
                        <li>Active contracts remain in place but cannot be modified</li>
                    </ul>
                    
                    <p>If you believe this is an error or would like to appeal this decision, please contact our support team.</p>
                    
                    <p>Best regards,<br>The {platform_name} Team</p>
                </div>
                <div class="footer">
                    <p>This is an account notification from {platform_name}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)

    async def send_employer_reactivated_email(
        self,
        to_email: str,
        employer_name: str,
        reactivated_by: str = "Administrator"
    ):
        """Send account reactivation notification to employer"""
        platform_name = self.platform_name or "UpShift"
        
        subject = f"{platform_name} - Account Reactivated"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #059669; color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .notice {{ background: #ecfdf5; border: 1px solid #059669; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }}
                .btn {{ display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Account Reactivated!</h1>
                </div>
                <div class="content">
                    <p>Dear {employer_name},</p>
                    
                    <p>Great news! Your employer account has been reactivated.</p>
                    
                    <div class="notice">
                        <h3 style="margin: 0; color: #059669;">🎉 Welcome Back!</h3>
                        <p style="margin-bottom: 0;">Your account is now fully active.</p>
                    </div>
                    
                    <p><strong>What's restored:</strong></p>
                    <ul>
                        <li>Full access to your employer dashboard</li>
                        <li>Ability to manage and post job listings</li>
                        <li>Contract management capabilities</li>
                    </ul>
                    
                    <p style="text-align: center;">
                        <a href="https://upshift.works/login" class="btn">Login to Your Account</a>
                    </p>
                    
                    <p>Thank you for your continued partnership!</p>
                    
                    <p>Best regards,<br>The {platform_name} Team</p>
                </div>
                <div class="footer">
                    <p>This is an account notification from {platform_name}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)

    async def send_employer_subscription_update_email(
        self,
        to_email: str,
        employer_name: str,
        plan_name: str,
        status: str,
        expires_at: str,
        jobs_limit: int
    ):
        """Send subscription update notification to employer"""
        platform_name = self.platform_name or "UpShift"
        status_color = "#059669" if status == "active" else "#f59e0b" if status == "trial" else "#dc2626"
        status_text = "Active" if status == "active" else "Trial" if status == "trial" else "Expired"
        
        subject = f"{platform_name} - Subscription Updated"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .plan-card {{ background: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .plan-name {{ font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }}
                .status {{ display: inline-block; padding: 6px 16px; border-radius: 20px; background: {status_color}; color: white; font-weight: bold; font-size: 14px; }}
                .detail {{ margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
                .detail-label {{ color: #6b7280; font-size: 12px; text-transform: uppercase; }}
                .detail-value {{ font-size: 16px; color: #1f2937; font-weight: 500; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📋 Subscription Updated</h1>
                </div>
                <div class="content">
                    <p>Dear {employer_name},</p>
                    
                    <p>Your subscription has been updated. Here are your new plan details:</p>
                    
                    <div class="plan-card">
                        <div class="plan-name">{plan_name}</div>
                        <span class="status">{status_text}</span>
                        
                        <div class="detail">
                            <div class="detail-label">Job Posting Limit</div>
                            <div class="detail-value">{jobs_limit} jobs</div>
                        </div>
                        
                        <div class="detail">
                            <div class="detail-label">Valid Until</div>
                            <div class="detail-value">{expires_at}</div>
                        </div>
                    </div>
                    
                    <p>If you have any questions about your subscription, please contact our support team.</p>
                    
                    <p>Best regards,<br>The {platform_name} Team</p>
                </div>
                <div class="footer">
                    <p>This is a subscription notification from {platform_name}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_body, raise_exceptions=False)

# Global instance
email_service = EmailService()
