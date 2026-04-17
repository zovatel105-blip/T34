"""
Firebase Cloud Messaging (FCM) Push Notification Service
Handles sending push notifications to Android devices
"""
import os
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, messaging
from pathlib import Path

logger = logging.getLogger(__name__)

class PushNotificationService:
    """Service for managing Firebase Cloud Messaging push notifications"""
    
    def __init__(self):
        self.initialized = False
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if already initialized
            if firebase_admin._apps:
                self.initialized = True
                logger.info("✅ Firebase Admin SDK already initialized")
                return
            
            # Path to Firebase service account credentials
            cred_path = Path(__file__).parent / 'firebase-admin.json'
            
            if not cred_path.exists():
                logger.warning("⚠️  firebase-admin.json not found. Push notifications disabled.")
                logger.warning("   Please add your Firebase service account JSON file to enable push notifications")
                return
            
            # Initialize Firebase Admin
            cred = credentials.Certificate(str(cred_path))
            firebase_admin.initialize_app(cred)
            self.initialized = True
            logger.info("✅ Firebase Admin SDK initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Error initializing Firebase Admin SDK: {e}")
            self.initialized = False
    
    async def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        image_url: Optional[str] = None
    ) -> bool:
        """
        Send push notification to a single device
        
        Args:
            token: FCM registration token
            title: Notification title
            body: Notification body text
            data: Optional custom data payload
            image_url: Optional image URL for rich notification
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        if not self.initialized:
            logger.warning("Push notifications not initialized. Skipping send.")
            return False
        
        try:
            # Build notification
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            # Build Android-specific config
            android_config = messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    icon='ic_stat_notification',
                    color='#9333ea',  # Purple brand color
                    sound='default',
                    channel_id='default_channel'
                )
            )
            
            # Build message
            message = messaging.Message(
                token=token,
                notification=notification,
                data=data or {},
                android=android_config
            )
            
            # Send message
            response = messaging.send(message)
            logger.info(f"✅ Notification sent successfully: {response}")
            return True
            
        except messaging.UnregisteredError:
            logger.warning(f"⚠️  Token is invalid or unregistered: {token[:20]}...")
            return False
        except Exception as e:
            logger.error(f"❌ Error sending notification: {e}")
            return False
    
    async def send_multicast(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send push notification to multiple devices
        
        Args:
            tokens: List of FCM registration tokens
            title: Notification title
            body: Notification body text
            data: Optional custom data payload
            image_url: Optional image URL
            
        Returns:
            dict: Results with success_count and failure_count
        """
        if not self.initialized:
            logger.warning("Push notifications not initialized. Skipping multicast.")
            return {"success_count": 0, "failure_count": len(tokens)}
        
        if not tokens:
            return {"success_count": 0, "failure_count": 0}
        
        try:
            # Build notification
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            # Build Android config
            android_config = messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    icon='ic_stat_notification',
                    color='#9333ea',
                    sound='default',
                    channel_id='default_channel'
                )
            )
            
            # Build multicast message
            message = messaging.MulticastMessage(
                tokens=tokens,
                notification=notification,
                data=data or {},
                android=android_config
            )
            
            # Send to multiple devices
            response = messaging.send_multicast(message)
            
            logger.info(f"✅ Multicast sent: {response.success_count} success, {response.failure_count} failures")
            
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
            
        except Exception as e:
            logger.error(f"❌ Error sending multicast notification: {e}")
            return {"success_count": 0, "failure_count": len(tokens)}
    
    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None
    ) -> bool:
        """
        Send notification to a topic (group of subscribed devices)
        
        Args:
            topic: Topic name
            title: Notification title
            body: Notification body text
            data: Optional custom data
            
        Returns:
            bool: True if sent successfully
        """
        if not self.initialized:
            logger.warning("Push notifications not initialized. Skipping topic send.")
            return False
        
        try:
            message = messaging.Message(
                topic=topic,
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {}
            )
            
            response = messaging.send(message)
            logger.info(f"✅ Topic notification sent: {response}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error sending topic notification: {e}")
            return False


# Singleton instance
push_service = PushNotificationService()
