"""
Optimized Feed System for VotaTok
Implements performance optimizations for fast loading
"""
from typing import List, Dict, Optional
from fastapi import HTTPException
import asyncio
from datetime import datetime, timedelta

class FeedOptimizer:
    """Handles feed optimization strategies"""
    
    def __init__(self, db):
        self.db = db
        self.cache = {}  # Simple in-memory cache
        self.cache_ttl = 300  # 5 minutes
    
    async def get_optimized_polls(
        self, 
        current_user_id: str,
        limit: int = 20, 
        offset: int = 0,
        load_thumbnails: bool = False
    ) -> List[Dict]:
        """
        Optimized poll loading with minimal DB queries
        """
        
        # 1. GET BASIC POLLS DATA (Single Query)
        polls_cursor = self.db.polls.find(
            {"is_active": True, "status": {"$nin": ["broken", "hidden", "failed", "processing"]}},  # 🩺 ocultar publicaciones rotas
            {
                "id": 1,
                "title": 1, 
                "author_id": 1,
                "created_at": 1,
                "total_votes": 1,
                "likes_count": 1,
                "comments_count": 1,
                "layout": 1,
                "music": 1,
                "options": {
                    "$slice": ["$options", 2]  # Only first 2 options for speed
                }
            }
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        polls = await polls_cursor.to_list(limit)
        
        if not polls:
            return []
        
        # 2. BATCH GET ALL REQUIRED DATA (3 Queries Total)
        poll_ids = [poll["id"] for poll in polls]
        author_ids = list(set(poll["author_id"] for poll in polls))
        
        # Get authors, votes, and likes in parallel
        authors_task = self.db.users.find(
            {"id": {"$in": author_ids}},
            {"id": 1, "username": 1, "display_name": 1, "avatar_url": 1, "is_verified": 1}
        ).to_list(len(author_ids))
        
        user_votes_task = self.db.votes.find({
            "poll_id": {"$in": poll_ids},
            "user_id": current_user_id
        }).to_list(len(poll_ids))
        
        user_likes_task = self.db.poll_likes.find({
            "poll_id": {"$in": poll_ids},
            "user_id": current_user_id
        }).to_list(len(poll_ids))
        
        # Execute all queries in parallel
        authors_list, user_votes, user_likes = await asyncio.gather(
            authors_task, user_votes_task, user_likes_task
        )
        
        # 3. BUILD LOOKUP DICTIONARIES
        authors_dict = {user["id"]: user for user in authors_list}
        user_votes_dict = {vote["poll_id"]: vote["option_id"] for vote in user_votes}
        liked_poll_ids = {like["poll_id"] for like in user_likes}
        
        # 4. BUILD OPTIMIZED RESPONSE
        result = []
        for poll_data in polls:
            author = authors_dict.get(poll_data["author_id"])
            if not author:
                continue
                
            # Simplified options (no nested user queries)
            simplified_options = []
            for option in poll_data.get("options", []):
                # Only include essential data
                option_data = {
                    "id": option["id"],
                    "text": option["text"],
                    "votes": option.get("votes", 0),
                    "media_url": option.get("media_url"),
                    "media_type": option.get("media_type"),
                    "thumbnail_url": option.get("thumbnail_url") if load_thumbnails else None
                }
                simplified_options.append(option_data)
            
            # Build poll response
            poll_response = {
                "id": poll_data["id"],
                "title": poll_data["title"],
                "author": {
                    "id": author["id"],
                    "username": author["username"],
                    "display_name": author.get("display_name"),
                    "avatar_url": author.get("avatar_url"),
                    "is_verified": author.get("is_verified", False)
                },
                "authorUser": {  # For compatibility
                    "id": author["id"],
                    "username": author["username"],
                    "display_name": author.get("display_name"),
                    "avatar_url": author.get("avatar_url"),
                    "is_verified": author.get("is_verified", False)
                },
                "options": simplified_options,
                "created_at": poll_data["created_at"],
                "total_votes": poll_data.get("total_votes", 0),
                "likes_count": poll_data.get("likes_count", 0),
                "comments_count": poll_data.get("comments_count", 0),
                "layout": poll_data.get("layout"),
                "music": poll_data.get("music"),
                "userVote": user_votes_dict.get(poll_data["id"]),
                "userLiked": poll_data["id"] in liked_poll_ids,
                "commentsCount": poll_data.get("comments_count", 0),
                "totalVotes": poll_data.get("total_votes", 0)
            }
            
            result.append(poll_response)
        
        return result

    async def get_lightweight_feed(
        self, 
        current_user_id: str,
        limit: int = 10,
        offset: int = 0
    ) -> List[Dict]:
        """
        Ultra-lightweight feed for initial load
        Only essential data, no media processing
        """
        
        cache_key = f"feed_light_{current_user_id}_{limit}_{offset}"
        
        # Check cache
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if datetime.now().timestamp() - timestamp < self.cache_ttl:
                return cached_data
        
        # Minimal data query
        polls_cursor = self.db.polls.find(
            {"is_active": True, "status": {"$nin": ["broken", "hidden", "failed", "processing"]}},  # 🩺 ocultar publicaciones rotas
            {
                "id": 1,
                "title": 1,
                "author_id": 1, 
                "created_at": 1,
                "total_votes": 1,
                "likes_count": 1,
                "layout": 1,
                # Only get first option for preview
                "options": {"$slice": ["$options", 1]}
            }
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        polls = await polls_cursor.to_list(limit)
        
        if not polls:
            return []
        
        # Get authors in batch
        author_ids = list(set(poll["author_id"] for poll in polls))
        authors_cursor = self.db.users.find(
            {"id": {"$in": author_ids}},
            {"id": 1, "username": 1, "display_name": 1, "avatar_url": 1}
        )
        authors_list = await authors_cursor.to_list(len(author_ids))
        authors_dict = {user["id"]: user for user in authors_list}
        
        # Build minimal response
        result = []
        for poll_data in polls:
            author = authors_dict.get(poll_data["author_id"])
            if not author:
                continue
                
            # Only first option for preview
            first_option = poll_data.get("options", [{}])[0] if poll_data.get("options") else {}
            
            poll_response = {
                "id": poll_data["id"],
                "title": poll_data["title"],
                "author": {
                    "id": author["id"],
                    "username": author["username"],
                    "display_name": author.get("display_name"),
                    "avatar_url": author.get("avatar_url")
                },
                "preview_option": {
                    "id": first_option.get("id"),
                    "text": first_option.get("text"),
                    "media_type": first_option.get("media_type"),
                    "has_media": bool(first_option.get("media_url"))
                },
                "created_at": poll_data["created_at"],
                "total_votes": poll_data.get("total_votes", 0),
                "likes_count": poll_data.get("likes_count", 0),
                "layout": poll_data.get("layout"),
                "is_lightweight": True  # Flag for frontend
            }
            
            result.append(poll_response)
        
        # Cache result
        self.cache[cache_key] = (result, datetime.now().timestamp())
        
        return result

    async def get_poll_details_on_demand(
        self, 
        poll_id: str, 
        current_user_id: str
    ) -> Optional[Dict]:
        """
        Load full poll details only when requested
        """
        
        # Get full poll data
        poll_data = await self.db.polls.find_one({"id": poll_id})
        if not poll_data:
            return None
        
        # Get author
        author = await self.db.users.find_one({"id": poll_data["author_id"]})
        if not author:
            return None
        
        # Get user interactions
        user_vote = await self.db.votes.find_one({
            "poll_id": poll_id,
            "user_id": current_user_id
        })
        
        user_like = await self.db.poll_likes.find_one({
            "poll_id": poll_id, 
            "user_id": current_user_id
        })
        
        # Build complete response
        return {
            "id": poll_data["id"],
            "title": poll_data["title"],
            "author": {
                "id": author["id"],
                "username": author["username"],
                "display_name": author.get("display_name"),
                "avatar_url": author.get("avatar_url"),
                "is_verified": author.get("is_verified", False)
            },
            "options": poll_data.get("options", []),
            "created_at": poll_data["created_at"],
            "total_votes": poll_data.get("total_votes", 0),
            "likes_count": poll_data.get("likes_count", 0),
            "comments_count": poll_data.get("comments_count", 0),
            "layout": poll_data.get("layout"),
            "music": poll_data.get("music"),
            "userVote": user_vote.get("option_id") if user_vote else None,
            "userLiked": bool(user_like)
        }

# Initialize optimizer
feed_optimizer = None

def init_feed_optimizer(db):
    global feed_optimizer
    feed_optimizer = FeedOptimizer(db)
    return feed_optimizer