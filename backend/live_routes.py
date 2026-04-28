"""
Live Streaming Routes - Real-time interactive live rooms with WebSockets.

Features:
- Live room creation and discovery
- Real-time chat via WebSocket
- Real-time interactive voting
- Real-time challenge proposals with virtual coin donations
- Hearts/likes animation
- Mock virtual coin economy (500 coins start, no real money)
- "Fake but credible" video: creator uses local camera, viewers see a mock loop URL

NOTE on architecture:
- REST endpoints under /api/live/*  (added to api_router)
- WebSocket endpoint under /api/ws/live/{room_id}  (added to main app)
"""

import os
import uuid
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class CreateLiveRoomRequest(BaseModel):
    title: str = Field(default="LIVE", max_length=100)
    placeholder_video_url: Optional[str] = None
    tags: List[str] = []


class LiveRoom(BaseModel):
    id: str
    creator_id: str
    creator_username: str
    creator_display_name: str
    creator_avatar: Optional[str] = None
    title: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    is_active: bool = True
    viewer_count: int = 0
    total_likes: int = 0
    placeholder_video_url: Optional[str] = None
    tags: List[str] = []


class CreatePollRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=120)
    options: List[str] = Field(..., min_items=2, max_items=4)
    duration_seconds: int = Field(default=10, ge=5, le=60)


class ProposeChallengeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=60)
    donation_coins: int = Field(default=1, ge=0, le=100)
    message: Optional[str] = Field(default=None, max_length=120)


class SendGiftRequest(BaseModel):
    gift_type: str = Field(default="rose")  # rose, heart, crown, fire
    amount: int = Field(default=1, ge=1, le=100)


# ---------------------------------------------------------------------------
# Connection Manager (in-memory state per room)
# ---------------------------------------------------------------------------


class LiveRoomState:
    """Holds the runtime state of a single live room (connections + active poll)."""

    def __init__(self, room_id: str):
        self.room_id = room_id
        # connection_id -> {websocket, user_info}
        self.connections: Dict[str, Dict[str, Any]] = {}
        self.active_poll: Optional[Dict[str, Any]] = None
        # poll_id -> set of user identifiers that already voted
        self.poll_voters: Dict[str, Set[str]] = {}
        # task that ends the active poll automatically
        self.poll_task: Optional[asyncio.Task] = None
        self.total_likes: int = 0

    @property
    def viewer_count(self) -> int:
        return len(self.connections)


class LiveConnectionManager:
    """Singleton-like manager for all rooms."""

    def __init__(self):
        self.rooms: Dict[str, LiveRoomState] = {}
        self._lock = asyncio.Lock()

    def get_or_create_room(self, room_id: str) -> LiveRoomState:
        if room_id not in self.rooms:
            self.rooms[room_id] = LiveRoomState(room_id)
        return self.rooms[room_id]

    def get_room(self, room_id: str) -> Optional[LiveRoomState]:
        return self.rooms.get(room_id)

    async def connect(
        self,
        room_id: str,
        websocket: WebSocket,
        user_info: Dict[str, Any],
    ) -> str:
        """Register a new websocket connection and return its connection_id."""
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        room = self.get_or_create_room(room_id)
        room.connections[connection_id] = {
            "websocket": websocket,
            "user": user_info,
            "joined_at": datetime.utcnow().isoformat(),
        }
        return connection_id

    async def disconnect(self, room_id: str, connection_id: str) -> None:
        room = self.get_room(room_id)
        if not room:
            return
        room.connections.pop(connection_id, None)
        if not room.connections:
            # Cancel any pending poll task to avoid leaks
            if room.poll_task and not room.poll_task.done():
                room.poll_task.cancel()
            # Keep the room object so /api/live/rooms/{id} can still read it,
            # but clear active poll.
            room.active_poll = None

    async def broadcast(self, room_id: str, message: Dict[str, Any]) -> None:
        room = self.get_room(room_id)
        if not room:
            return
        payload = json.dumps(message, default=str)
        # Snapshot to avoid mutation during iteration
        for connection_id, info in list(room.connections.items()):
            ws = info["websocket"]
            try:
                await ws.send_text(payload)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to send to %s in room %s: %s", connection_id, room_id, exc)
                room.connections.pop(connection_id, None)


# Global instance
manager = LiveConnectionManager()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


OPTION_COLORS = ["#a855f7", "#ec4899", "#f59e0b", "#10b981"]  # purple, pink, amber, emerald


def _build_poll(question: str, options: List[str], duration_seconds: int) -> Dict[str, Any]:
    now = datetime.utcnow()
    return {
        "id": str(uuid.uuid4()),
        "question": question,
        "options": [
            {
                "id": str(uuid.uuid4()),
                "text": text,
                "votes": 0,
                "color": OPTION_COLORS[idx % len(OPTION_COLORS)],
            }
            for idx, text in enumerate(options)
        ],
        "duration_seconds": duration_seconds,
        "started_at": now.isoformat(),
        "ends_at": (now + timedelta(seconds=duration_seconds)).isoformat(),
        "status": "active",
        "total_votes": 0,
        "winner_option_id": None,
    }


async def _end_poll_after(room_id: str, poll_id: str, delay: float) -> None:
    """Background task that ends the poll after `delay` seconds."""
    try:
        await asyncio.sleep(delay)
        room = manager.get_room(room_id)
        if not room or not room.active_poll or room.active_poll.get("id") != poll_id:
            return
        # Compute winner
        poll = room.active_poll
        winner = max(poll["options"], key=lambda o: o["votes"]) if poll["options"] else None
        poll["status"] = "ended"
        poll["winner_option_id"] = winner["id"] if winner else None
        await manager.broadcast(
            room_id,
            {
                "type": "poll_ended",
                "poll": poll,
                "winner": winner,
            },
        )
        # Clear active poll after a short while so the result banner has time to show
        await asyncio.sleep(0.1)
        if room.active_poll and room.active_poll.get("id") == poll_id:
            room.active_poll = None
    except asyncio.CancelledError:
        return
    except Exception as exc:  # noqa: BLE001
        logger.exception("Error ending poll: %s", exc)


# ---------------------------------------------------------------------------
# Coin economy (mock)
# ---------------------------------------------------------------------------


DEFAULT_COIN_BALANCE = 500


async def _get_or_create_coin_balance(db, user_id: str) -> int:
    doc = await db.user_coins.find_one({"user_id": user_id})
    if not doc:
        await db.user_coins.insert_one(
            {
                "user_id": user_id,
                "balance": DEFAULT_COIN_BALANCE,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        )
        return DEFAULT_COIN_BALANCE
    return int(doc.get("balance", DEFAULT_COIN_BALANCE))


async def _deduct_coins(db, user_id: str, amount: int) -> int:
    """Atomically deduct coins. Raises HTTPException(400) if insufficient."""
    if amount <= 0:
        return await _get_or_create_coin_balance(db, user_id)

    # Ensure balance exists
    await _get_or_create_coin_balance(db, user_id)

    # Try atomic decrement only if enough balance
    result = await db.user_coins.find_one_and_update(
        {"user_id": user_id, "balance": {"$gte": amount}},
        {"$inc": {"balance": -amount}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=400, detail="Saldo de monedas insuficiente")
    return int(result.get("balance", 0))


async def _add_coins(db, user_id: str, amount: int) -> int:
    if amount <= 0:
        return await _get_or_create_coin_balance(db, user_id)

    await _get_or_create_coin_balance(db, user_id)
    result = await db.user_coins.find_one_and_update(
        {"user_id": user_id},
        {"$inc": {"balance": amount}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True,
    )
    return int(result.get("balance", 0)) if result else amount


# ---------------------------------------------------------------------------
# Router factory  (we accept dependencies from server.py to avoid circular imports)
# ---------------------------------------------------------------------------


def build_live_router(*, db, get_current_user, get_current_user_optional):
    """
    Build the REST APIRouter for /live/* endpoints.

    Args:
        db: Async MongoDB database instance (motor).
        get_current_user: FastAPI dependency that returns the current user.
        get_current_user_optional: FastAPI dependency that returns user or None.
    """
    router = APIRouter(prefix="/live", tags=["live"])

    # ---- Coin balance ---------------------------------------------------
    @router.get("/coins/balance")
    async def get_coin_balance(current_user=Depends(get_current_user)):
        balance = await _get_or_create_coin_balance(db, current_user.id)
        return {"balance": balance, "currency": "coins"}

    @router.post("/coins/topup-mock")
    async def topup_mock(amount: int = Query(default=100, ge=1, le=10_000), current_user=Depends(get_current_user)):
        """Mock topup for testing. Adds virtual coins."""
        balance = await _add_coins(db, current_user.id, amount)
        return {"balance": balance, "added": amount}

    # ---- Rooms ----------------------------------------------------------
    @router.post("/rooms")
    async def create_live_room(req: CreateLiveRoomRequest, current_user=Depends(get_current_user)):
        # End any previous active room from this creator (only one at a time)
        await db.live_rooms.update_many(
            {"creator_id": current_user.id, "is_active": True},
            {"$set": {"is_active": False, "ended_at": datetime.utcnow()}},
        )
        room_id = str(uuid.uuid4())
        room_doc = {
            "id": room_id,
            "creator_id": current_user.id,
            "creator_username": getattr(current_user, "username", ""),
            "creator_display_name": getattr(current_user, "display_name", "")
            or getattr(current_user, "username", ""),
            "creator_avatar": getattr(current_user, "avatar_url", None),
            "title": req.title or "LIVE",
            "started_at": datetime.utcnow(),
            "ended_at": None,
            "is_active": True,
            "viewer_count": 0,
            "total_likes": 0,
            "placeholder_video_url": req.placeholder_video_url
            or "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "tags": req.tags or [],
        }
        await db.live_rooms.insert_one(room_doc)
        room_doc.pop("_id", None)
        # Pre-create in-memory state
        manager.get_or_create_room(room_id)
        return room_doc

    @router.get("/rooms")
    async def list_live_rooms(limit: int = Query(default=20, ge=1, le=100)):
        cursor = db.live_rooms.find({"is_active": True}).sort("started_at", -1).limit(limit)
        rooms = await cursor.to_list(length=limit)
        for r in rooms:
            r.pop("_id", None)
            state = manager.get_room(r["id"])
            r["viewer_count"] = state.viewer_count if state else 0
            r["total_likes"] = state.total_likes if state else r.get("total_likes", 0)
        return {"rooms": rooms, "total": len(rooms)}

    @router.get("/rooms/{room_id}")
    async def get_live_room(room_id: str):
        room = await db.live_rooms.find_one({"id": room_id})
        if not room:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        room.pop("_id", None)
        state = manager.get_room(room_id)
        room["viewer_count"] = state.viewer_count if state else 0
        room["total_likes"] = state.total_likes if state else room.get("total_likes", 0)
        room["active_poll"] = state.active_poll if state else None
        return room

    @router.post("/rooms/{room_id}/end")
    async def end_live_room(room_id: str, current_user=Depends(get_current_user)):
        room = await db.live_rooms.find_one({"id": room_id})
        if not room:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        if room["creator_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="No eres el creador de esta sala")
        await db.live_rooms.update_one(
            {"id": room_id},
            {"$set": {"is_active": False, "ended_at": datetime.utcnow()}},
        )
        # Notify viewers
        await manager.broadcast(room_id, {"type": "live_ended"})
        return {"success": True, "room_id": room_id}

    # ---- Polls (creator launches them) ----------------------------------
    @router.post("/rooms/{room_id}/polls")
    async def start_poll(room_id: str, req: CreatePollRequest, current_user=Depends(get_current_user)):
        room = await db.live_rooms.find_one({"id": room_id, "is_active": True})
        if not room:
            raise HTTPException(status_code=404, detail="Sala no encontrada o terminada")
        if room["creator_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Solo el creador puede lanzar votaciones")

        state = manager.get_or_create_room(room_id)

        # Cancel previous poll task if running
        if state.poll_task and not state.poll_task.done():
            state.poll_task.cancel()

        poll = _build_poll(req.question.strip(), [o.strip() for o in req.options if o.strip()], req.duration_seconds)
        state.active_poll = poll
        state.poll_voters[poll["id"]] = set()

        # Persist for analytics
        await db.live_polls.insert_one({**poll, "room_id": room_id, "creator_id": current_user.id})

        # Broadcast to all viewers
        await manager.broadcast(room_id, {"type": "poll_started", "poll": poll})

        # Schedule auto-end
        loop = asyncio.get_event_loop()
        state.poll_task = loop.create_task(_end_poll_after(room_id, poll["id"], req.duration_seconds))

        return poll

    @router.post("/rooms/{room_id}/polls/{poll_id}/end")
    async def end_poll_now(room_id: str, poll_id: str, current_user=Depends(get_current_user)):
        room = await db.live_rooms.find_one({"id": room_id})
        if not room:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        if room["creator_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Solo el creador puede finalizar la votación")
        state = manager.get_or_create_room(room_id)
        if not state.active_poll or state.active_poll.get("id") != poll_id:
            raise HTTPException(status_code=400, detail="No hay votación activa con ese id")
        # Cancel scheduled task and finalize immediately
        if state.poll_task and not state.poll_task.done():
            state.poll_task.cancel()
        poll = state.active_poll
        winner = max(poll["options"], key=lambda o: o["votes"]) if poll["options"] else None
        poll["status"] = "ended"
        poll["winner_option_id"] = winner["id"] if winner else None
        await manager.broadcast(room_id, {"type": "poll_ended", "poll": poll, "winner": winner})
        state.active_poll = None
        return {"success": True, "winner": winner}

    # ---- Proposals (viewers donate coins to propose challenges) ---------
    @router.post("/rooms/{room_id}/proposals")
    async def propose_challenge(
        room_id: str,
        req: ProposeChallengeRequest,
        current_user=Depends(get_current_user),
    ):
        room = await db.live_rooms.find_one({"id": room_id, "is_active": True})
        if not room:
            raise HTTPException(status_code=404, detail="Sala no encontrada o terminada")

        # Deduct coins (mock)
        new_balance = await _deduct_coins(db, current_user.id, req.donation_coins)

        proposal = {
            "id": str(uuid.uuid4()),
            "room_id": room_id,
            "user_id": current_user.id,
            "user_username": getattr(current_user, "username", ""),
            "user_display_name": getattr(current_user, "display_name", "")
            or getattr(current_user, "username", ""),
            "user_avatar": getattr(current_user, "avatar_url", None),
            "text": req.text.strip(),
            "message": (req.message or "").strip(),
            "donation_coins": req.donation_coins,
            "votes": 0,
            "created_at": datetime.utcnow().isoformat(),
            "status": "pending",
        }
        await db.live_proposals.insert_one(proposal.copy())

        # Broadcast to creator + viewers
        await manager.broadcast(room_id, {"type": "challenge_proposed", "proposal": proposal})
        return {"proposal": proposal, "balance": new_balance}

    @router.get("/rooms/{room_id}/proposals")
    async def list_proposals(
        room_id: str,
        sort: str = Query(default="donations", regex="^(donations|votes|recent)$"),
        limit: int = Query(default=50, ge=1, le=200),
    ):
        sort_field = {
            "donations": [("donation_coins", -1), ("created_at", -1)],
            "votes": [("votes", -1), ("created_at", -1)],
            "recent": [("created_at", -1)],
        }[sort]
        cursor = db.live_proposals.find({"room_id": room_id, "status": "pending"}).sort(sort_field).limit(limit)
        items = await cursor.to_list(length=limit)
        for it in items:
            it.pop("_id", None)
        return {"proposals": items, "total": len(items)}

    @router.post("/rooms/{room_id}/proposals/{proposal_id}/launch")
    async def launch_proposal_as_poll(
        room_id: str,
        proposal_id: str,
        current_user=Depends(get_current_user),
    ):
        """The creator launches a viewer's proposal as a yes/no poll."""
        room = await db.live_rooms.find_one({"id": room_id, "is_active": True})
        if not room:
            raise HTTPException(status_code=404, detail="Sala no encontrada o terminada")
        if room["creator_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Solo el creador puede lanzar propuestas")
        proposal = await db.live_proposals.find_one({"id": proposal_id, "room_id": room_id})
        if not proposal:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")

        await db.live_proposals.update_one({"id": proposal_id}, {"$set": {"status": "launched"}})

        # Build a yes/no poll with the proposal's text as the question
        question = f"¿{proposal['text']}?"
        options = ["Sí, hazlo", "No, otra cosa"]
        state = manager.get_or_create_room(room_id)
        if state.poll_task and not state.poll_task.done():
            state.poll_task.cancel()

        poll = _build_poll(question, options, 10)
        poll["from_proposal_id"] = proposal_id
        poll["from_user"] = {
            "username": proposal.get("user_username"),
            "display_name": proposal.get("user_display_name"),
            "avatar": proposal.get("user_avatar"),
            "donation_coins": proposal.get("donation_coins", 0),
        }
        state.active_poll = poll
        state.poll_voters[poll["id"]] = set()

        await db.live_polls.insert_one({**poll, "room_id": room_id, "creator_id": current_user.id})
        await manager.broadcast(room_id, {"type": "poll_started", "poll": poll})

        loop = asyncio.get_event_loop()
        state.poll_task = loop.create_task(_end_poll_after(room_id, poll["id"], poll["duration_seconds"]))

        return poll

    return router


# ---------------------------------------------------------------------------
# WebSocket endpoint registration
# ---------------------------------------------------------------------------


def register_live_websocket(app, *, db, get_user_from_token_optional):
    """
    Register the WebSocket route on the FastAPI app.

    Path: /api/ws/live/{room_id}?token=<jwt>
    """

    @app.websocket("/api/ws/live/{room_id}")
    async def live_ws(websocket: WebSocket, room_id: str):
        # Extract token from query (?token=...) — optional, viewers can be anon
        token = websocket.query_params.get("token")
        user = await get_user_from_token_optional(token)

        # Validate room exists
        room_doc = await db.live_rooms.find_one({"id": room_id})
        if not room_doc:
            await websocket.close(code=4404)
            return

        if user:
            user_info = {
                "id": user.id,
                "username": getattr(user, "username", "") or "anon",
                "display_name": getattr(user, "display_name", "") or getattr(user, "username", "") or "Anónimo",
                "avatar": getattr(user, "avatar_url", None),
                "is_creator": user.id == room_doc["creator_id"],
            }
            user_key = user.id
        else:
            user_info = {
                "id": f"anon_{uuid.uuid4().hex[:8]}",
                "username": "invitado",
                "display_name": "Invitado",
                "avatar": None,
                "is_creator": False,
            }
            user_key = user_info["id"]

        connection_id = await manager.connect(room_id, websocket, user_info)
        state = manager.get_or_create_room(room_id)

        try:
            # Send welcome packet (current state snapshot)
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "welcome",
                        "connection_id": connection_id,
                        "user": user_info,
                        "viewer_count": state.viewer_count,
                        "active_poll": state.active_poll,
                        "total_likes": state.total_likes,
                    },
                    default=str,
                )
            )

            # Notify others
            await manager.broadcast(
                room_id,
                {
                    "type": "user_joined",
                    "user": user_info,
                    "viewer_count": state.viewer_count,
                },
            )

            while True:
                raw = await websocket.receive_text()
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                msg_type = data.get("type")

                if msg_type == "chat":
                    text = (data.get("text") or "").strip()[:200]
                    if not text:
                        continue
                    await manager.broadcast(
                        room_id,
                        {
                            "type": "chat",
                            "id": str(uuid.uuid4()),
                            "user": user_info,
                            "text": text,
                            "ts": datetime.utcnow().isoformat(),
                        },
                    )

                elif msg_type == "like":
                    state.total_likes += 1
                    await manager.broadcast(
                        room_id,
                        {
                            "type": "like",
                            "user": user_info,
                            "total_likes": state.total_likes,
                            "ts": datetime.utcnow().isoformat(),
                        },
                    )

                elif msg_type == "vote":
                    poll_id = data.get("poll_id")
                    option_id = data.get("option_id")
                    if not state.active_poll or state.active_poll.get("id") != poll_id:
                        continue
                    voters = state.poll_voters.setdefault(poll_id, set())
                    if user_key in voters:
                        # Already voted, ignore (one vote per user/connection per poll)
                        continue
                    # Find option and increment
                    found = False
                    for opt in state.active_poll["options"]:
                        if opt["id"] == option_id:
                            opt["votes"] += 1
                            found = True
                            break
                    if not found:
                        continue
                    voters.add(user_key)
                    state.active_poll["total_votes"] = sum(o["votes"] for o in state.active_poll["options"])
                    await manager.broadcast(
                        room_id,
                        {
                            "type": "poll_update",
                            "poll": state.active_poll,
                        },
                    )

                elif msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "ts": datetime.utcnow().isoformat()}))

        except WebSocketDisconnect:
            pass
        except Exception as exc:  # noqa: BLE001
            logger.warning("WS error in room %s: %s", room_id, exc)
        finally:
            await manager.disconnect(room_id, connection_id)
            # Re-fetch viewer_count after disconnect
            state2 = manager.get_room(room_id)
            await manager.broadcast(
                room_id,
                {
                    "type": "user_left",
                    "user": user_info,
                    "viewer_count": state2.viewer_count if state2 else 0,
                },
            )
