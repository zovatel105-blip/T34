"""
Push Notification Helper Functions
Easy-to-use functions for sending notifications on various events
"""
import logging
from typing import Optional, List
from push_notification_service import push_service

logger = logging.getLogger(__name__)


async def get_user_fcm_tokens(db, user_id: str) -> List[str]:
    """
    Get all active FCM tokens for a user
    
    Args:
        db: MongoDB database instance
        user_id: User ID
        
    Returns:
        List of FCM tokens
    """
    try:
        tokens = await db.fcm_tokens.find({
            "user_id": user_id,
            "is_active": True
        }, {"_id": 0}).to_list(100)
        
        return [t["token"] for t in tokens]
    except Exception as e:
        logger.error(f"Error fetching FCM tokens: {e}")
        return []


async def check_user_notifications_enabled(db, user_id: str, notification_type: str) -> bool:
    """
    Check if user has notifications enabled for a specific type
    
    Args:
        db: MongoDB database instance
        user_id: User ID
        notification_type: Type of notification (likes, comments, follows, mentions)
        
    Returns:
        bool: True if enabled
    """
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            return False
        
        # Check global push notifications
        if not user.get("push_notifications", True):
            return False
        
        # Check specific notification type
        notification_key = f"notifications_{notification_type}"
        return user.get(notification_key, True)
        
    except Exception as e:
        logger.error(f"Error checking notification settings: {e}")
        return False


async def notify_new_message(db, sender_username: str, recipient_id: str, message_preview: str):
    """
    Send notification when user receives a new message
    
    Args:
        db: MongoDB database instance
        sender_username: Username of the sender
        recipient_id: ID of the recipient user
        message_preview: Preview text of the message
    """
    try:
        # Check if user has message notifications enabled
        if not await check_user_notifications_enabled(db, recipient_id, "messages"):
            return
        
        tokens = await get_user_fcm_tokens(db, recipient_id)
        if not tokens:
            return
        
        await push_service.send_multicast(
            tokens=tokens,
            title=f"💬 Nuevo mensaje de {sender_username}",
            body=message_preview[:100],
            data={
                "type": "message",
                "sender": sender_username
            }
        )
        logger.info(f"✅ Sent new message notification to user {recipient_id}")
        
    except Exception as e:
        logger.error(f"Error sending new message notification: {e}")


async def notify_new_comment(db, commenter_username: str, content_owner_id: str, comment_text: str, poll_id: str):
    """
    Send notification when someone comments on user's content
    
    Args:
        db: MongoDB database instance
        commenter_username: Username of the commenter
        content_owner_id: ID of the content owner
        comment_text: Text of the comment
        poll_id: ID of the poll/content
    """
    try:
        # Don't notify if commenting on own content
        if commenter_username == content_owner_id:
            return
        
        if not await check_user_notifications_enabled(db, content_owner_id, "comments"):
            return
        
        tokens = await get_user_fcm_tokens(db, content_owner_id)
        if not tokens:
            return
        
        await push_service.send_multicast(
            tokens=tokens,
            title=f"💭 {commenter_username} comentó tu publicación",
            body=comment_text[:100],
            data={
                "type": "comment",
                "poll_id": poll_id,
                "commenter": commenter_username
            }
        )
        logger.info(f"✅ Sent new comment notification to user {content_owner_id}")
        
    except Exception as e:
        logger.error(f"Error sending new comment notification: {e}")


async def notify_new_like(db, liker_username: str, content_owner_id: str, content_type: str = "publicación"):
    """
    Send notification when someone likes user's content
    
    Args:
        db: MongoDB database instance
        liker_username: Username of the person who liked
        content_owner_id: ID of the content owner
        content_type: Type of content (publicación, comentario, etc.)
    """
    try:
        # Don't notify if liking own content
        if liker_username == content_owner_id:
            return
        
        if not await check_user_notifications_enabled(db, content_owner_id, "likes"):
            return
        
        tokens = await get_user_fcm_tokens(db, content_owner_id)
        if not tokens:
            return
        
        await push_service.send_multicast(
            tokens=tokens,
            title=f"❤️ {liker_username} le gustó tu {content_type}",
            body=f"A {liker_username} le gustó tu {content_type}",
            data={
                "type": "like",
                "liker": liker_username
            }
        )
        logger.info(f"✅ Sent new like notification to user {content_owner_id}")
        
    except Exception as e:
        logger.error(f"Error sending new like notification: {e}")


async def notify_new_follower(db, follower_username: str, followed_user_id: str):
    """
    Send notification when someone follows the user
    
    Args:
        db: MongoDB database instance
        follower_username: Username of the new follower
        followed_user_id: ID of the followed user
    """
    try:
        if not await check_user_notifications_enabled(db, followed_user_id, "follows"):
            return
        
        tokens = await get_user_fcm_tokens(db, followed_user_id)
        if not tokens:
            return
        
        await push_service.send_multicast(
            tokens=tokens,
            title=f"👤 {follower_username} te está siguiendo",
            body=f"{follower_username} comenzó a seguirte",
            data={
                "type": "follow",
                "follower": follower_username
            }
        )
        logger.info(f"✅ Sent new follower notification to user {followed_user_id}")
        
    except Exception as e:
        logger.error(f"Error sending new follower notification: {e}")


async def notify_new_vote(db, voter_username: str, poll_owner_id: str, poll_title: str):
    """
    Send notification when someone votes on user's poll
    
    Args:
        db: MongoDB database instance
        voter_username: Username of the voter
        poll_owner_id: ID of the poll owner
        poll_title: Title of the poll
    """
    try:
        # Don't notify if voting on own poll
        if voter_username == poll_owner_id:
            return
        
        tokens = await get_user_fcm_tokens(db, poll_owner_id)
        if not tokens:
            return
        
        # Only send notification occasionally to avoid spam (e.g., every 10 votes)
        # For now, send all notifications
        
        await push_service.send_multicast(
            tokens=tokens,
            title=f"🗳️ {voter_username} votó en tu poll",
            body=poll_title[:100],
            data={
                "type": "vote",
                "voter": voter_username
            }
        )
        logger.info(f"✅ Sent new vote notification to user {poll_owner_id}")
        
    except Exception as e:
        logger.error(f"Error sending new vote notification: {e}")


async def notify_challenge_invitation(db, inviter_username: str, invitee_id: str, challenge_title: str, challenge_id: str):
    """
    Send notification when user is invited to a challenge
    
    Args:
        db: MongoDB database instance
        inviter_username: Username of the inviter
        invitee_id: ID of the invited user
        challenge_title: Title of the challenge
        challenge_id: ID of the challenge
    """
    try:
        tokens = await get_user_fcm_tokens(db, invitee_id)
        if not tokens:
            return
        
        await push_service.send_multicast(
            tokens=tokens,
            title=f"⚔️ {inviter_username} te desafió",
            body=f"Invitación a challenge: {challenge_title}",
            data={
                "type": "challenge_invitation",
                "challenge_id": challenge_id,
                "inviter": inviter_username
            }
        )
        logger.info(f"✅ Sent challenge invitation notification to user {invitee_id}")
        
    except Exception as e:
        logger.error(f"Error sending challenge invitation notification: {e}")


async def notify_challenge_result(db, participant_id: str, challenge_title: str, result: str, challenge_id: str):
    """
    Send notification when a challenge is completed
    
    Args:
        db: MongoDB database instance
        participant_id: ID of the participant
        challenge_title: Title of the challenge
        result: Result text (winner/loser/tie)
        challenge_id: ID of the challenge
    """
    try:
        tokens = await get_user_fcm_tokens(db, participant_id)
        if not tokens:
            return
        
        await push_service.send_multicast(
            tokens=tokens,
            title=f"🏆 Challenge finalizado: {challenge_title}",
            body=result,
            data={
                "type": "challenge_result",
                "challenge_id": challenge_id
            }
        )
        logger.info(f"✅ Sent challenge result notification to user {participant_id}")
        
    except Exception as e:
        logger.error(f"Error sending challenge result notification: {e}")


async def notify_mention(db, mentioner_username: str, mentioned_user_id: str, context: str):
    """
    Send notification when user is mentioned in a comment or post
    
    Args:
        db: MongoDB database instance
        mentioner_username: Username of the person who mentioned
        mentioned_user_id: ID of the mentioned user
        context: Context where they were mentioned
    """
    try:
        if not await check_user_notifications_enabled(db, mentioned_user_id, "mentions"):
            return
        
        tokens = await get_user_fcm_tokens(db, mentioned_user_id)
        if not tokens:
            return
        
        await push_service.send_multicast(
            tokens=tokens,
            title=f"@{mentioner_username} te mencionó",
            body=context[:100],
            data={
                "type": "mention",
                "mentioner": mentioner_username
            }
        )
        logger.info(f"✅ Sent mention notification to user {mentioned_user_id}")
        
    except Exception as e:
        logger.error(f"Error sending mention notification: {e}")
