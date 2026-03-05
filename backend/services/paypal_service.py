"""
PayPal Payouts Service
Handles PayPal payout operations for DJ withdrawals
"""
import httpx
import base64
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class PayPalService:
    """Service for handling PayPal Payouts"""
    
    def __init__(self):
        self.client_id = os.environ.get('PAYPAL_CLIENT_ID', '')
        self.client_secret = os.environ.get('PAYPAL_CLIENT_SECRET', '')
        self.mode = os.environ.get('PAYPAL_MODE', 'sandbox')
        
        if self.mode == 'live':
            self.base_url = "https://api-m.paypal.com"
        else:
            self.base_url = "https://api-m.sandbox.paypal.com"
        
        self.access_token = None
        self.token_expires_at = None
    
    async def _get_access_token(self) -> str:
        """Get OAuth 2.0 access token from PayPal"""
        if self.access_token and self.token_expires_at and datetime.utcnow() < self.token_expires_at:
            return self.access_token
        
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = base64.b64encode(auth_string.encode()).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {auth_bytes}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data="grant_type=client_credentials"
            )
            
            if response.status_code != 200:
                logger.error(f"PayPal auth failed: {response.text}")
                raise Exception(f"PayPal authentication failed: {response.text}")
            
            data = response.json()
            self.access_token = data['access_token']
            # Token expires in seconds, subtract 60 for safety
            expires_in = data.get('expires_in', 3600) - 60
            from datetime import timedelta
            self.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            return self.access_token
    
    async def create_payout(
        self,
        recipient_email: str,
        amount: float,
        currency: str = "EUR",
        note: str = "MixLink Platform - Payout",
        sender_batch_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a PayPal payout to a recipient
        
        Args:
            recipient_email: PayPal email of recipient
            amount: Amount to send
            currency: Currency code (default EUR)
            note: Note to recipient
            sender_batch_id: Unique batch ID (auto-generated if not provided)
        
        Returns:
            PayPal payout response with batch_id and status
        """
        if not sender_batch_id:
            import uuid
            sender_batch_id = f"DJPAYOUT_{uuid.uuid4().hex[:12].upper()}"
        
        token = await self._get_access_token()
        
        payout_data = {
            "sender_batch_header": {
                "sender_batch_id": sender_batch_id,
                "email_subject": "Vous avez reçu un paiement de MixLink",
                "email_message": note
            },
            "items": [
                {
                    "recipient_type": "EMAIL",
                    "amount": {
                        "value": str(round(amount, 2)),
                        "currency": currency
                    },
                    "note": note,
                    "receiver": recipient_email,
                    "sender_item_id": f"ITEM_{sender_batch_id}"
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/payments/payouts",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json=payout_data
            )
            
            result = response.json()
            
            if response.status_code not in [200, 201]:
                logger.error(f"PayPal payout failed: {result}")
                error_message = result.get('message', 'Unknown error')
                if 'details' in result:
                    error_message = result['details'][0].get('issue', error_message)
                raise Exception(f"PayPal payout failed: {error_message}")
            
            logger.info(f"PayPal payout created: {result.get('batch_header', {}).get('payout_batch_id')}")
            
            return {
                "success": True,
                "batch_id": result.get('batch_header', {}).get('payout_batch_id'),
                "status": result.get('batch_header', {}).get('batch_status'),
                "sender_batch_id": sender_batch_id
            }
    
    async def get_payout_status(self, payout_batch_id: str) -> Dict[str, Any]:
        """
        Get the status of a payout batch
        
        Args:
            payout_batch_id: PayPal payout batch ID
        
        Returns:
            Payout status details
        """
        token = await self._get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/payments/payouts/{payout_batch_id}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"PayPal status check failed: {response.text}")
                raise Exception(f"Failed to get payout status: {response.text}")
            
            result = response.json()
            batch_header = result.get('batch_header', {})
            
            return {
                "batch_id": batch_header.get('payout_batch_id'),
                "status": batch_header.get('batch_status'),
                "time_created": batch_header.get('time_created'),
                "time_completed": batch_header.get('time_completed'),
                "amount": batch_header.get('amount', {}).get('value'),
                "currency": batch_header.get('amount', {}).get('currency'),
                "fees": batch_header.get('fees', {}).get('value')
            }


# Global PayPal service instance
paypal_service = PayPalService()
