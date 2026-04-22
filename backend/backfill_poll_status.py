"""
Script de migracion: revalida TODOS los polls existentes y actualiza su
campo `status` a "ready" o "broken" segun el resultado.

Uso (desde /app/backend):
    python backfill_poll_status.py            # Revalida todos
    python backfill_poll_status.py --dry-run  # Muestra cambios sin aplicarlos
    python backfill_poll_status.py --limit 50 # Solo los primeros 50

El script es idempotente: se puede ejecutar cuantas veces quieras.
"""

import asyncio
import argparse
import logging
import sys
from typing import Optional

sys.path.insert(0, ".")

from database import db
from media_validator import validate_poll_media

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("backfill_poll_status")


async def revalidate_all(dry_run: bool = False, limit: Optional[int] = None) -> dict:
    query = {}
    cursor = db.polls.find(query).sort("created_at", -1)
    if limit:
        cursor = cursor.limit(limit)

    stats = {
        "total": 0,
        "ready_kept": 0,
        "broken_kept": 0,
        "newly_broken": 0,
        "restored_to_ready": 0,
        "updated": 0,
        "errors": 0,
    }

    async for poll in cursor:
        stats["total"] += 1
        poll_id = poll.get("id")
        current_status = poll.get("status", "ready")

        try:
            is_valid, reason = await validate_poll_media(poll)
        except Exception as e:
            logger.error(f"Error validating poll {poll_id}: {e}")
            stats["errors"] += 1
            continue

        new_status = "ready" if is_valid else "broken"

        if new_status == current_status:
            if new_status == "ready":
                stats["ready_kept"] += 1
            else:
                stats["broken_kept"] += 1
            continue

        # Transicion
        if new_status == "broken":
            stats["newly_broken"] += 1
            logger.warning(
                f"[BROKEN] poll_id={poll_id} title={poll.get('title','')[:40]!r} reason={reason}"
            )
        else:
            stats["restored_to_ready"] += 1
            logger.info(
                f"[RESTORED] poll_id={poll_id} title={poll.get('title','')[:40]!r}"
            )

        if not dry_run:
            await db.polls.update_one(
                {"id": poll_id},
                {"$set": {"status": new_status}},
            )
            stats["updated"] += 1

    return stats


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="No aplicar cambios")
    parser.add_argument("--limit", type=int, default=None, help="Max polls a procesar")
    args = parser.parse_args()

    logger.info(
        f"Starting backfill (dry_run={args.dry_run}, limit={args.limit})"
    )
    stats = await revalidate_all(dry_run=args.dry_run, limit=args.limit)
    logger.info(f"Backfill finished. Stats: {stats}")


if __name__ == "__main__":
    asyncio.run(main())
