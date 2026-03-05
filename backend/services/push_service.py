"""
Push Notification Service for MixLink Platform
Using Expo Push Notifications
"""

import os
import logging
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class PushNotificationService:
    """Expo Push Notification Service"""
    
    def __init__(self):
        self.sent_notifications = []  # Store for debugging
        
    async def send_notification(
        self,
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        badge: Optional[int] = None,
        sound: str = "default"
    ) -> dict:
        """
        Send a push notification to a single device
        
        Args:
            push_token: Expo push token (ExponentPushToken[xxx])
            title: Notification title
            body: Notification body text
            data: Additional data to send with notification
            badge: Badge count to display
            sound: Sound to play ("default" or custom)
        """
        if not push_token or not push_token.startswith("ExponentPushToken"):
            logger.warning(f"Invalid push token: {push_token}")
            return {"success": False, "error": "Invalid push token"}
        
        message = {
            "to": push_token,
            "title": title,
            "body": body,
            "sound": sound,
        }
        
        if data:
            message["data"] = data
        if badge is not None:
            message["badge"] = badge
            
        return await self._send_to_expo([message])
    
    async def send_bulk_notifications(
        self,
        notifications: List[Dict[str, Any]]
    ) -> dict:
        """
        Send multiple notifications at once
        Each notification should have: push_token, title, body, and optional data
        """
        messages = []
        for notif in notifications:
            if not notif.get("push_token", "").startswith("ExponentPushToken"):
                continue
                
            messages.append({
                "to": notif["push_token"],
                "title": notif["title"],
                "body": notif["body"],
                "sound": notif.get("sound", "default"),
                "data": notif.get("data", {}),
            })
        
        if not messages:
            return {"success": False, "error": "No valid push tokens"}
            
        return await self._send_to_expo(messages)
    
    async def _send_to_expo(self, messages: List[dict]) -> dict:
        """Send messages to Expo Push API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=messages,
                    headers={
                        "Accept": "application/json",
                        "Accept-encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0
                )
                
                result = response.json()
                
                # Log sent notifications
                for msg in messages:
                    self.sent_notifications.append({
                        **msg,
                        "sent_at": datetime.utcnow().isoformat(),
                        "status": "sent"
                    })
                
                logger.info(f"Push notifications sent: {len(messages)} messages")
                
                return {
                    "success": True,
                    "data": result,
                    "sent_count": len(messages)
                }
                
        except Exception as e:
            logger.error(f"Push notification error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    # ==================== NOTIFICATION TEMPLATES ====================
    
    async def notify_new_booking(
        self,
        dj_push_token: str,
        organizer_name: str,
        event_title: str,
        price: float
    ) -> dict:
        """Notify DJ of new booking request"""
        return await self.send_notification(
            push_token=dj_push_token,
            title="🎵 Nouvelle réservation !",
            body=f"{organizer_name} veut vous réserver pour '{event_title}' - {price:.0f}€",
            data={
                "type": "new_booking",
                "event_title": event_title,
                "price": price
            }
        )
    
    async def notify_booking_accepted(
        self,
        organizer_push_token: str,
        dj_name: str,
        event_title: str
    ) -> dict:
        """Notify organizer that DJ accepted booking"""
        return await self.send_notification(
            push_token=organizer_push_token,
            title="✅ Réservation acceptée !",
            body=f"{dj_name} a accepté votre réservation pour '{event_title}'",
            data={
                "type": "booking_accepted",
                "dj_name": dj_name,
                "event_title": event_title
            }
        )
    
    async def notify_booking_rejected(
        self,
        organizer_push_token: str,
        dj_name: str,
        event_title: str
    ) -> dict:
        """Notify organizer that DJ rejected booking"""
        return await self.send_notification(
            push_token=organizer_push_token,
            title="❌ Réservation refusée",
            body=f"{dj_name} n'est pas disponible pour '{event_title}'",
            data={
                "type": "booking_rejected",
                "dj_name": dj_name,
                "event_title": event_title
            }
        )
    
    async def notify_new_message(
        self,
        push_token: str,
        sender_name: str,
        message_preview: str
    ) -> dict:
        """Notify user of new message"""
        preview = message_preview[:50] + "..." if len(message_preview) > 50 else message_preview
        return await self.send_notification(
            push_token=push_token,
            title=f"💬 Message de {sender_name}",
            body=preview,
            data={
                "type": "new_message",
                "sender_name": sender_name
            }
        )
    
    async def notify_withdrawal_status(
        self,
        push_token: str,
        amount: float,
        status: str
    ) -> dict:
        """Notify DJ of withdrawal status change"""
        status_emoji = {
            "processing": "🔄",
            "completed": "✅",
            "rejected": "❌"
        }
        
        status_text = {
            "processing": "en cours de traitement",
            "completed": "effectué avec succès",
            "rejected": "rejeté"
        }
        
        emoji = status_emoji.get(status, "📧")
        text = status_text.get(status, status)
        
        return await self.send_notification(
            push_token=push_token,
            title=f"{emoji} Retrait {text}",
            body=f"Votre retrait de {amount:.2f}€ est {text}",
            data={
                "type": "withdrawal_update",
                "amount": amount,
                "status": status
            }
        )
    
    async def notify_new_review(
        self,
        dj_push_token: str,
        organizer_name: str,
        rating: int
    ) -> dict:
        """Notify DJ of new review"""
        stars = "⭐" * rating
        return await self.send_notification(
            push_token=dj_push_token,
            title=f"📝 Nouvel avis {stars}",
            body=f"{organizer_name} vous a laissé un avis",
            data={
                "type": "new_review",
                "rating": rating
            }
        )
    
    async def notify_payment_received(
        self,
        dj_push_token: str,
        amount: float,
        event_title: str
    ) -> dict:
        """Notify DJ of payment received"""
        return await self.send_notification(
            push_token=dj_push_token,
            title="💰 Paiement reçu !",
            body=f"Vous avez reçu {amount:.2f}€ pour '{event_title}'",
            data={
                "type": "payment_received",
                "amount": amount,
                "event_title": event_title
            }
        )


# Singleton instance
push_service = PushNotificationService()
