"""
Email Service for MixLink Platform
Currently using MOCK implementation - ready for SendGrid integration
"""

import os
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Configuration
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@mixlink.com')
EMAIL_MODE = os.environ.get('EMAIL_MODE', 'mock')  # 'mock' or 'sendgrid'


class EmailService:
    """Email service with mock and SendGrid support"""
    
    def __init__(self):
        self.mode = EMAIL_MODE
        self.sent_emails = []  # Store sent emails for debugging
        
    async def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None
    ) -> dict:
        """
        Send an email using configured method
        Returns: dict with status and details
        """
        email_data = {
            "to": to,
            "subject": subject,
            "html_content": html_content,
            "plain_content": plain_content,
            "sent_at": datetime.utcnow().isoformat(),
            "mode": self.mode
        }
        
        if self.mode == 'sendgrid' and SENDGRID_API_KEY:
            return await self._send_via_sendgrid(email_data)
        else:
            return await self._send_mock(email_data)
    
    async def _send_mock(self, email_data: dict) -> dict:
        """Mock email sending - logs to console"""
        self.sent_emails.append(email_data)
        logger.info(f"[MOCK EMAIL] To: {email_data['to']}")
        logger.info(f"[MOCK EMAIL] Subject: {email_data['subject']}")
        logger.info(f"[MOCK EMAIL] Content preview: {email_data['html_content'][:200]}...")
        
        return {
            "success": True,
            "mode": "mock",
            "message": "Email logged (mock mode)",
            "email_id": f"mock_{len(self.sent_emails)}"
        }
    
    async def _send_via_sendgrid(self, email_data: dict) -> dict:
        """Send email via SendGrid API"""
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            message = Mail(
                from_email=SENDER_EMAIL,
                to_emails=email_data['to'],
                subject=email_data['subject'],
                html_content=email_data['html_content'],
                plain_text_content=email_data.get('plain_content')
            )
            
            sg = SendGridAPIClient(SENDGRID_API_KEY)
            response = sg.send(message)
            
            return {
                "success": response.status_code == 202,
                "mode": "sendgrid",
                "status_code": response.status_code,
                "message": "Email sent via SendGrid"
            }
        except Exception as e:
            logger.error(f"SendGrid error: {str(e)}")
            return {
                "success": False,
                "mode": "sendgrid",
                "error": str(e)
            }

    # ==================== EMAIL TEMPLATES ====================
    
    async def send_password_reset(self, to: str, reset_token: str, reset_url: str) -> dict:
        """Send password reset email"""
        subject = "🔐 Réinitialisation de votre mot de passe - MixLink"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #0c0c0c; color: #fff; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 30px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 32px; font-weight: bold; background: linear-gradient(90deg, #00CEC9, #E056FD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
                .button {{ display: inline-block; background: linear-gradient(90deg, #00CEC9, #E056FD); color: #fff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }}
                .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
                .warning {{ background: #2d2d44; padding: 15px; border-radius: 8px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">MixLink</div>
                </div>
                
                <h2>Réinitialisation de mot de passe</h2>
                
                <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                
                <div style="text-align: center;">
                    <a href="{reset_url}" class="button">Réinitialiser mon mot de passe</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Ce lien expire dans 1 heure.</strong><br>
                    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                </div>
                
                <p>Ou copiez ce lien dans votre navigateur :</p>
                <p style="word-break: break-all; color: #00CEC9;">{reset_url}</p>
                
                <div class="footer">
                    <p>© 2025 MixLink Platform. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to, subject, html_content)
    
    async def send_booking_confirmation(
        self,
        to: str,
        booking_id: str,
        event_title: str,
        event_date: str,
        dj_name: str,
        price: float
    ) -> dict:
        """Send booking confirmation email"""
        subject = f"✅ Réservation confirmée - {event_title}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #0c0c0c; color: #fff; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 30px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 32px; font-weight: bold; background: linear-gradient(90deg, #00CEC9, #E056FD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
                .details {{ background: #2d2d44; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #3d3d5c; }}
                .detail-label {{ color: #888; }}
                .detail-value {{ color: #00CEC9; font-weight: bold; }}
                .price {{ font-size: 24px; color: #00B894; text-align: center; margin: 20px 0; }}
                .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">MixLink</div>
                </div>
                
                <h2>🎉 Votre réservation est confirmée !</h2>
                
                <div class="details">
                    <div class="detail-row">
                        <span class="detail-label">Événement</span>
                        <span class="detail-value">{event_title}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date</span>
                        <span class="detail-value">{event_date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">DJ</span>
                        <span class="detail-value">{dj_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">N° Réservation</span>
                        <span class="detail-value">{booking_id[:8]}...</span>
                    </div>
                </div>
                
                <div class="price">
                    Montant total : {price:.2f}€
                </div>
                
                <p>Vous pouvez contacter le DJ via la messagerie de l'application.</p>
                
                <div class="footer">
                    <p>© 2025 MixLink Platform. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to, subject, html_content)
    
    async def send_withdrawal_notification(
        self,
        to: str,
        amount: float,
        method: str,
        status: str,
        transaction_id: Optional[str] = None
    ) -> dict:
        """Send withdrawal status notification"""
        status_emoji = {
            "pending": "⏳",
            "processing": "🔄",
            "completed": "✅",
            "rejected": "❌"
        }
        
        status_text = {
            "pending": "en attente",
            "processing": "en cours de traitement",
            "completed": "effectué avec succès",
            "rejected": "rejeté"
        }
        
        emoji = status_emoji.get(status, "📧")
        text = status_text.get(status, status)
        
        subject = f"{emoji} Retrait {text} - {amount:.2f}€"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #0c0c0c; color: #fff; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 30px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 32px; font-weight: bold; background: linear-gradient(90deg, #00CEC9, #E056FD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
                .status-box {{ background: #2d2d44; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }}
                .amount {{ font-size: 36px; color: #00B894; margin: 10px 0; }}
                .status {{ font-size: 18px; color: {'#00B894' if status == 'completed' else '#F39C12' if status in ['pending', 'processing'] else '#E74C3C'}; }}
                .details {{ margin: 20px 0; }}
                .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">MixLink</div>
                </div>
                
                <h2>{emoji} Mise à jour de votre retrait</h2>
                
                <div class="status-box">
                    <div class="amount">{amount:.2f}€</div>
                    <div class="status">Statut : {text.upper()}</div>
                </div>
                
                <div class="details">
                    <p><strong>Méthode :</strong> {method.upper()}</p>
                    {f'<p><strong>Transaction ID :</strong> {transaction_id}</p>' if transaction_id else ''}
                </div>
                
                <p>Consultez votre historique de retraits dans l'application pour plus de détails.</p>
                
                <div class="footer">
                    <p>© 2025 MixLink Platform. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to, subject, html_content)
    
    async def send_new_booking_dj(
        self,
        to: str,
        organizer_name: str,
        event_title: str,
        event_date: str,
        price: float
    ) -> dict:
        """Send new booking notification to DJ"""
        subject = f"🎵 Nouvelle demande de réservation - {event_title}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #0c0c0c; color: #fff; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 30px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 32px; font-weight: bold; background: linear-gradient(90deg, #00CEC9, #E056FD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
                .button {{ display: inline-block; background: linear-gradient(90deg, #00CEC9, #E056FD); color: #fff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; }}
                .details {{ background: #2d2d44; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">MixLink</div>
                </div>
                
                <h2>🎵 Nouvelle demande de réservation !</h2>
                
                <p>Vous avez reçu une nouvelle demande de réservation de <strong>{organizer_name}</strong>.</p>
                
                <div class="details">
                    <p><strong>Événement :</strong> {event_title}</p>
                    <p><strong>Date :</strong> {event_date}</p>
                    <p><strong>Cachet proposé :</strong> {price:.2f}€</p>
                </div>
                
                <p>Connectez-vous à l'application pour accepter ou refuser cette demande.</p>
                
                <div class="footer">
                    <p>© 2025 MixLink Platform. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to, subject, html_content)


# Singleton instance
email_service = EmailService()
