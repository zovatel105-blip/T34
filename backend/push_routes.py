"""
Push Notification API Routes
Handles FCM token registration and notification management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
import logging
from datetime import datetime

from models import FCMToken, FCMTokenCreate
from push_notification_service import push_service
from auth import verify_token
from database import db

logger = logging.getLogger(__name__)

# Router for push notification endpoints
push_router = APIRouter(prefix="/api/push", tags=["Push Notifications"])


@push_router.post("/register-token")
async def register_fcm_token(
    token_data: FCMTokenCreate,
    current_user: dict = Depends(verify_token)
):
    """
    Register or update FCM token for push notifications
    
    Args:
        token_data: FCM token and device info
        current_user: Authenticated user from JWT token
        
    Returns:
        Success message
    """
    try:
        user_id = current_user["id"]
        
        # Check if token already exists for this user
        existing_token = await db.fcm_tokens.find_one({
            "user_id": user_id,
            "token": token_data.token
        })
        
        if existing_token:
            # Update last_used timestamp
            await db.fcm_tokens.update_one(
                {"_id": existing_token["_id"]},
                {
                    "$set": {
                        "last_used": datetime.utcnow(),
                        "is_active": True
                    }
                }
            )
            logger.info(f"✅ Updated existing FCM token for user {user_id}")
        else:
            # Create new token record
            fcm_token = FCMToken(
                user_id=user_id,
                token=token_data.token,
                device_type=token_data.device_type,
                device_name=token_data.device_name
            )
            
            await db.fcm_tokens.insert_one(fcm_token.dict())
            logger.info(f"✅ Registered new FCM token for user {user_id}")
        
        return {
            "success": True,
            "message": "FCM token registered successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error registering FCM token: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register FCM token: {str(e)}"
        )


@push_router.delete("/unregister-token")
async def unregister_fcm_token(
    token: str,
    current_user: dict = Depends(verify_token)
):
    """
    Unregister FCM token (e.g., when user logs out)
    
    Args:
        token: FCM token to unregister
        current_user: Authenticated user
        
    Returns:
        Success message
    """
    try:
        user_id = current_user["id"]
        
        result = await db.fcm_tokens.update_one(
            {
                "user_id": user_id,
                "token": token
            },
            {
                "$set": {"is_active": False}
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"✅ Unregistered FCM token for user {user_id}")
            return {
                "success": True,
                "message": "FCM token unregistered successfully"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="Token not found"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error unregistering FCM token: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to unregister FCM token: {str(e)}"
        )


@push_router.post("/test-notification")
async def test_push_notification(
    current_user: dict = Depends(verify_token)
):
    """
    Send a test push notification to the current user
    Useful for testing FCM setup
    
    Args:
        current_user: Authenticated user
        
    Returns:
        Test result
    """
    try:
        user_id = current_user["id"]
        
        # Get active tokens for user
        tokens = await db.fcm_tokens.find({
            "user_id": user_id,
            "is_active": True
        }, {"_id": 0}).to_list(100)
        
        if not tokens:
            return {
                "success": False,
                "message": "No active FCM tokens found for this user"
            }
        
        # Send test notification to all user's devices
        token_list = [t["token"] for t in tokens]
        
        result = await push_service.send_multicast(
            tokens=token_list,
            title="🎉 ¡Notificaciones activadas!",
            body="Recibirás notificaciones de nuevos mensajes, comentarios, likes y más.",
            data={"type": "test"}
        )
        
        return {
            "success": True,
            "message": "Test notification sent",
            "results": result
        }
        
    except Exception as e:
        logger.error(f"❌ Error sending test notification: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send test notification: {str(e)}"
        )


@push_router.get("/tokens")
async def get_user_tokens(
    current_user: dict = Depends(verify_token)
) -> Dict:
    """
    Get all FCM tokens for the current user
    
    Args:
        current_user: Authenticated user
        
    Returns:
        List of user's registered tokens
    """
    try:
        user_id = current_user["id"]
        
        tokens = await db.fcm_tokens.find({
            "user_id": user_id,
            "is_active": True
        }, {"_id": 0}).to_list(100)
        
        return {
            "tokens": tokens,
            "count": len(tokens)
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching user tokens: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch tokens: {str(e)}"
        )
