"""
Email Service for MixLink Platform
Using Brevo (formerly Sendinblue) for transactional emails
"""

import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Configuration from environment
BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
SENDER_EMAIL = os.environ.get('BREVO_SENDER_EMAIL', 'noreply@mixlink.fr')
SENDER_NAME = os.environ.get('BREVO_SENDER_NAME', 'MixLink')


class EmailService:
    """Email service using Brevo API for real email sending"""
    
    def __init__(self):
        self.api_key = BREVO_API_KEY
        self.sender_email = SENDER_EMAIL
        self.sender_name = SENDER_NAME
        self.sent_emails = []
        self._api_instance = None
        
        # Initialize Brevo API if key is available
        if self.api_key:
            try:
                import sib_api_v3_sdk
                from sib_api_v3_sdk.rest import ApiException
                
                configuration = sib_api_v3_sdk.Configuration()
                configuration.api_key['api-key'] = self.api_key
                self._api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
                    sib_api_v3_sdk.ApiClient(configuration)
                )
                logger.info("Brevo email service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Brevo: {e}")
                self._api_instance = None
        else:
            logger.warning("BREVO_API_KEY not set - emails will be logged only")
    
    async def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None
    ) -> dict:
        """
        Send an email using Brevo API
        Falls back to logging if Brevo is not configured
        """
        email_data = {
            "to": to,
            "subject": subject,
            "sent_at": datetime.utcnow().isoformat(),
        }
        
        if self._api_instance:
            return await self._send_via_brevo(to, subject, html_content, plain_content)
        else:
            return await self._send_mock(email_data, html_content)
    
    async def _send_via_brevo(
        self,
        to: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None
    ) -> dict:
        """Send email via Brevo API"""
        try:
            import sib_api_v3_sdk
            
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                sender=sib_api_v3_sdk.SendSmtpEmailSender(
                    name=self.sender_name,
                    email=self.sender_email
                ),
                to=[sib_api_v3_sdk.SendSmtpEmailTo(email=to)],
                subject=subject,
                html_content=html_content,
                text_content=plain_content
            )
            
            response = self._api_instance.send_transac_email(send_smtp_email)
            
            logger.info(f"[BREVO] Email sent to {to} - Message ID: {response.message_id}")
            
            return {
                "success": True,
                "mode": "brevo",
                "message_id": response.message_id,
                "message": f"Email envoyé à {to}"
            }
            
        except Exception as e:
            logger.error(f"[BREVO ERROR] Failed to send email to {to}: {str(e)}")
            return {
                "success": False,
                "mode": "brevo",
                "error": str(e)
            }
    
    async def _send_mock(self, email_data: dict, html_content: str) -> dict:
        """Mock email sending - logs to console"""
        self.sent_emails.append(email_data)
        logger.info(f"[MOCK EMAIL] To: {email_data['to']}")
        logger.info(f"[MOCK EMAIL] Subject: {email_data['subject']}")
        
        return {
            "success": True,
            "mode": "mock",
            "message": "Email logged (Brevo not configured)",
            "email_id": f"mock_{len(self.sent_emails)}"
        }

    # ==================== EMAIL TEMPLATES ====================
    
    async def send_password_reset(self, to: str, reset_token: str, reset_url: str) -> dict:
        """Send password reset email"""
        subject = "🔐 Réinitialisation de votre mot de passe - MixLink"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0c0c0c; color: #fff; padding: 20px; margin: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(0, 206, 201, 0.2); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 36px; font-weight: bold; background: linear-gradient(90deg, #00CEC9, #E056FD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }}
                .button {{ display: inline-block; background: linear-gradient(90deg, #00CEC9, #E056FD); color: #fff !important; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin: 24px 0; font-size: 16px; }}
                .warning {{ background: rgba(224, 86, 253, 0.1); padding: 16px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #E056FD; }}
                .footer {{ margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }}
                h2 {{ color: #fff; margin-bottom: 16px; }}
                p {{ color: #ccc; line-height: 1.6; }}
                .link {{ color: #00CEC9; word-break: break-all; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">MixLink</div>
                    <p style="color: #888; margin-top: 8px;">La plateforme de réservation de DJs</p>
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
                <p class="link">{reset_url}</p>
                
                <div class="footer">
                    <p>© 2025 MixLink. Tous droits réservés.</p>
                    <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
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
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0c0c0c; color: #fff; padding: 20px; margin: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(0, 206, 201, 0.2); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 36px; font-weight: bold; background: linear-gradient(90deg, #00CEC9, #E056FD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }}
                .details {{ background: rgba(0, 206, 201, 0.1); padding: 24px; border-radius: 12px; margin: 24px 0; }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }}
                .detail-label {{ color: #888; }}
                .detail-value {{ color: #00CEC9; font-weight: bold; }}
                .price {{ font-size: 32px; color: #00B894; text-align: center; margin: 24px 0; font-weight: bold; }}
                .footer {{ margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }}
                h2 {{ color: #fff; margin-bottom: 16px; }}
                p {{ color: #ccc; line-height: 1.6; }}
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
                        <span class="detail-value">🎵 {dj_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">N° Réservation</span>
                        <span class="detail-value">{booking_id[:8].upper()}</span>
                    </div>
                </div>
                
                <div class="price">
                    {price:.2f}€
                </div>
                
                <p>Vous pouvez contacter le DJ via la messagerie de l'application MixLink.</p>
                
                <div class="footer">
                    <p>© 2025 MixLink. Tous droits réservés.</p>
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
        
        status_color = {
            "pending": "#F39C12",
            "processing": "#00CEC9",
            "completed": "#00B894",
            "rejected": "#E74C3C"
        }
        
        emoji = status_emoji.get(status, "📧")
        text = status_text.get(status, status)
        color = status_color.get(status, "#00CEC9")
        
        subject = f"{emoji} Retrait {text} - {amount:.2f}€"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0c0c0c; color: #fff; padding: 20px; margin: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(0, 206, 201, 0.2); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 36px; font-weight: bold; background: linear-gradient(90deg, #00CEC9, #E056FD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }}
                .status-box {{ background: rgba(0, 0, 0, 0.3); padding: 32px; border-radius: 16px; text-align: center; margin: 24px 0; }}
                .amount {{ font-size: 48px; color: #00B894; margin: 16px 0; font-weight: bold; }}
                .status {{ font-size: 20px; color: {color}; font-weight: bold; }}
                .details {{ margin: 24px 0; }}
                .footer {{ margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }}
                h2 {{ color: #fff; margin-bottom: 16px; }}
                p {{ color: #ccc; line-height: 1.6; }}
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
                
                <p>Consultez votre historique de retraits dans l'application MixLink pour plus de détails.</p>
                
                <div class="footer">
                    <p>© 2025 MixLink. Tous droits réservés.</p>
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
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0c0c0c; color: #fff; padding: 20px; margin: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(224, 86, 253, 0.3); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 36px; font-weight: bold; background: linear-gradient(90deg, #00CEC9, #E056FD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }}
                .highlight {{ background: linear-gradient(90deg, rgba(224, 86, 253, 0.2), rgba(0, 206, 201, 0.2)); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center; }}
                .price {{ font-size: 36px; color: #00B894; font-weight: bold; }}
                .details {{ background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 12px; margin: 24px 0; }}
                .footer {{ margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }}
                h2 {{ color: #fff; margin-bottom: 16px; }}
                p {{ color: #ccc; line-height: 1.6; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">MixLink</div>
                </div>
                
                <h2>🎵 Nouvelle demande de réservation !</h2>
                
                <p>Vous avez reçu une nouvelle demande de réservation de <strong style="color: #E056FD;">{organizer_name}</strong>.</p>
                
                <div class="details">
                    <p><strong>Événement :</strong> {event_title}</p>
                    <p><strong>Date :</strong> {event_date}</p>
                </div>
                
                <div class="highlight">
                    <p style="margin: 0; color: #888;">Cachet proposé</p>
                    <div class="price">{price:.2f}€</div>
                </div>
                
                <p>Connectez-vous à l'application MixLink pour accepter ou refuser cette demande.</p>
                
                <div class="footer">
                    <p>© 2025 MixLink. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to, subject, html_content)
    
    async def send_new_review_notification(
        self,
        to: str,
        reviewer_name: str,
        rating: int,
        comment: Optional[str] = None
    ) -> dict:
        """Send notification to DJ when they receive a new review"""
        stars = "⭐" * rating
        subject = f"📝 Nouvel avis {stars} sur MixLink"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0c0c0c; color: #fff; padding: 20px; margin: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(0, 206, 201, 0.2); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 36px; font-weight: bold; background: linear-gradient(90deg, #00CEC9, #E056FD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }}
                .rating-box {{ background: rgba(243, 156, 18, 0.1); padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; }}
                .stars {{ font-size: 36px; }}
                .comment {{ background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 12px; margin: 24px 0; font-style: italic; color: #ccc; }}
                .footer {{ margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }}
                h2 {{ color: #fff; margin-bottom: 16px; }}
                p {{ color: #ccc; line-height: 1.6; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">MixLink</div>
                </div>
                
                <h2>📝 Nouvel avis reçu !</h2>
                
                <p><strong style="color: #00CEC9;">{reviewer_name}</strong> vous a laissé un avis :</p>
                
                <div class="rating-box">
                    <div class="stars">{stars}</div>
                    <p style="margin: 8px 0 0 0; color: #F39C12;">{rating}/5</p>
                </div>
                
                {f'<div class="comment">"{comment}"</div>' if comment else ''}
                
                <p>Continuez à offrir d'excellentes prestations pour maintenir votre réputation sur MixLink !</p>
                
                <div class="footer">
                    <p>© 2025 MixLink. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to, subject, html_content)

    async def send_email_verification(self, to: str, first_name: str, verify_url: str) -> bool:
        """Send email verification link to new user"""
        subject = "MixLink - Vérifiez votre adresse email"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f; color: #e0e0e0; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: #111118; border-radius: 12px; overflow: hidden; border: 1px solid #1e1e2e; }}
                .header {{ background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 40px 30px; text-align: center; }}
                .header h1 {{ color: #fff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; }}
                .header p {{ color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }}
                .body {{ padding: 40px 30px; }}
                .body h2 {{ color: #fff; font-size: 22px; margin-bottom: 16px; }}
                .body p {{ color: #b0b0c0; line-height: 1.6; font-size: 15px; }}
                .button {{ display: block; width: fit-content; margin: 30px auto; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff !important; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 700; font-size: 16px; text-align: center; }}
                .note {{ background: rgba(124, 58, 237, 0.1); border-left: 3px solid #7c3aed; padding: 12px 16px; border-radius: 4px; margin-top: 24px; }}
                .note p {{ color: #a89bca; font-size: 13px; margin: 0; }}
                .footer {{ text-align: center; padding: 20px; color: #555; font-size: 12px; border-top: 1px solid #1e1e2e; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>MixLink</h1>
                    <p>La plateforme des DJs professionnels</p>
                </div>
                <div class="body">
                    <h2>Bonjour {first_name} !</h2>
                    <p>Bienvenue sur <strong>MixLink</strong> ! Merci de vous être inscrit(e).</p>
                    <p>Pour activer votre compte et accéder à toutes les fonctionnalités, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
                    <a href="{verify_url}" class="button">Vérifier mon email</a>
                    <div class="note">
                        <p>Si vous n'avez pas créé de compte MixLink, ignorez cet email. Le lien expire dans 48h.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 MixLink. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to, subject, html_content)


# Singleton instance
email_service = EmailService()
