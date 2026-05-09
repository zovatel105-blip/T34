#!/usr/bin/env python3
"""
Create test data for VS Layout Cinema 3D Effect testing
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
import uuid
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_data():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.twyk_db
    
    print("Creating test data for VS Layout Cinema 3D Effect testing...")
    
    # Create test user
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash("test1234")
    
    user = {
        "id": user_id,
        "email": "apktest2@test.com",
        "username": "apktest2",
        "display_name": "APK Test User",
        "hashed_password": hashed_password,
        "avatar_url": None,
        "bio": "Test user for VS Layout testing",
        "occupation": None,
        "is_verified": False,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "is_public": True,
        "allow_messages": True,
        "notifications_enabled": True,
        "email_notifications": True,
        "push_notifications": True,
        "notifications_likes": True,
        "notifications_comments": True,
        "notifications_follows": True,
        "notifications_mentions": True,
        "video_quality": "auto",
        "wifi_only": False,
        "battery_saver": False,
        "auto_cache": True,
        "background_sync": True,
        "app_language": "es",
        "dark_mode": False,
        "large_text": False,
        "two_factor_enabled": False,
        "oauth_provider": None,
        "oauth_id": None
    }
    
    # Check if user already exists
    existing_user = await db.users.find_one({"username": "apktest2"})
    if existing_user:
        print("✓ User apktest2 already exists")
        user_id = existing_user["id"]
    else:
        await db.users.insert_one(user)
        print("✓ Created user: apktest2 / test1234")
    
    # Create VS layout polls
    vs_polls = []
    
    # VS Poll 1: Messi vs Ronaldo
    poll1_id = str(uuid.uuid4())
    poll1 = {
        "id": poll1_id,
        "title": "¿Quién es mejor?",
        "description": "El eterno debate del fútbol",
        "layout": "vs",
        "vs_orientation": "horizontal",
        "author": {
            "id": user_id,
            "username": "apktest2",
            "display_name": "APK Test User",
            "avatar_url": None
        },
        "options": [
            {
                "id": str(uuid.uuid4()),
                "text": "Messi",
                "votes": 0,
                "media_url": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800",
                "media_type": "image",
                "thumbnail_url": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400"
            },
            {
                "id": str(uuid.uuid4()),
                "text": "Ronaldo",
                "votes": 0,
                "media_url": "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800",
                "media_type": "image",
                "thumbnail_url": "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=400"
            }
        ],
        "total_votes": 0,
        "created_at": datetime.utcnow(),
        "expires_at": None,
        "is_active": True,
        "is_public": True,
        "allow_comments": True,
        "allow_sharing": True,
        "views": 0,
        "likes": 0,
        "comments_count": 0,
        "shares_count": 0,
        "music": None,
        "music_id": None,
        "creator_country": "AR"
    }
    vs_polls.append(poll1)
    
    # VS Poll 2: Pizza vs Burger
    poll2_id = str(uuid.uuid4())
    poll2 = {
        "id": poll2_id,
        "title": "¿Qué prefieres?",
        "description": "Comida favorita",
        "layout": "vs",
        "vs_orientation": "vertical",
        "author": {
            "id": user_id,
            "username": "apktest2",
            "display_name": "APK Test User",
            "avatar_url": None
        },
        "options": [
            {
                "id": str(uuid.uuid4()),
                "text": "Pizza",
                "votes": 0,
                "media_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
                "media_type": "image",
                "thumbnail_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400"
            },
            {
                "id": str(uuid.uuid4()),
                "text": "Burger",
                "votes": 0,
                "media_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
                "media_type": "image",
                "thumbnail_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"
            }
        ],
        "total_votes": 0,
        "created_at": datetime.utcnow(),
        "expires_at": None,
        "is_active": True,
        "is_public": True,
        "allow_comments": True,
        "allow_sharing": True,
        "views": 0,
        "likes": 0,
        "comments_count": 0,
        "shares_count": 0,
        "music": None,
        "music_id": None,
        "creator_country": "US"
    }
    vs_polls.append(poll2)
    
    # VS Poll 3: Beach vs Mountain
    poll3_id = str(uuid.uuid4())
    poll3 = {
        "id": poll3_id,
        "title": "¿Dónde prefieres vacacionar?",
        "description": "Destino de vacaciones",
        "layout": "vs",
        "vs_orientation": "horizontal",
        "author": {
            "id": user_id,
            "username": "apktest2",
            "display_name": "APK Test User",
            "avatar_url": None
        },
        "options": [
            {
                "id": str(uuid.uuid4()),
                "text": "Playa",
                "votes": 0,
                "media_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
                "media_type": "image",
                "thumbnail_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400"
            },
            {
                "id": str(uuid.uuid4()),
                "text": "Montaña",
                "votes": 0,
                "media_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
                "media_type": "image",
                "thumbnail_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"
            }
        ],
        "total_votes": 0,
        "created_at": datetime.utcnow(),
        "expires_at": None,
        "is_active": True,
        "is_public": True,
        "allow_comments": True,
        "allow_sharing": True,
        "views": 0,
        "likes": 0,
        "comments_count": 0,
        "shares_count": 0,
        "music": None,
        "music_id": None,
        "creator_country": "ES"
    }
    vs_polls.append(poll3)
    
    # Insert polls
    for poll in vs_polls:
        existing_poll = await db.polls.find_one({"id": poll["id"]})
        if not existing_poll:
            await db.polls.insert_one(poll)
            print(f"✓ Created VS poll: {poll['title']}")
        else:
            print(f"✓ VS poll already exists: {poll['title']}")
    
    print(f"\n✓ Test data creation complete!")
    print(f"  - User: apktest2 / test1234")
    print(f"  - VS Polls: {len(vs_polls)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_data())
