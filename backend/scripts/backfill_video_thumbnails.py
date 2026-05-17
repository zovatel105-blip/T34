"""
backfill_video_thumbnails.py
============================
Una sola vez. Recorre TODAS las polls (activas o no) y, para cada opción cuyo
`media_url` apunta a un archivo de video (.mp4/.mov/.webm/.avi/.m4v/.mkv):

  1) Corrige `media_type` a 'video' si está mal (a menudo se guardó 'image').
  2) Si `thumbnail_url` es vacío, null, o apunta al video en sí, genera una
     miniatura con ffmpeg desde el archivo en disco y la guarda.
  3) Cachea el thumbnail_url en uploaded_files para que la generación lazy
     futura sea instantánea.

Uso:
    cd /app/backend && python3 scripts/backfill_video_thumbnails.py
"""
import asyncio
import os
import re
import subprocess
import sys
from pathlib import Path

# Permitir importar config y constantes del backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "social_media_app")
UPLOAD_BASE_DIR = Path(os.environ.get("UPLOAD_BASE_DIR", "/app/backend/uploads"))

VIDEO_RE = re.compile(r"\.(mp4|mov|webm|avi|m4v|mkv)(\?|$)", re.IGNORECASE)


def is_video_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    return bool(VIDEO_RE.search(url))


def media_url_to_disk_path(media_url: str) -> Path | None:
    """/api/uploads/general/file.mp4 → <UPLOAD_BASE_DIR>/general/file.mp4"""
    if not media_url or "/api/uploads/" not in media_url:
        return None
    after = media_url.split("/api/uploads/", 1)[1]
    return UPLOAD_BASE_DIR / after


def generate_thumbnail(video_path: Path) -> str | None:
    """Genera miniatura JPG con ffmpeg y devuelve la URL relativa `/api/uploads/...`."""
    if not video_path.exists() or not video_path.is_file():
        return None
    thumbnails_dir = video_path.parent / "thumbnails"
    thumbnails_dir.mkdir(parents=True, exist_ok=True)
    thumb_filename = f"{video_path.stem}_thumbnail.jpg"
    thumb_path = thumbnails_dir / thumb_filename
    if not thumb_path.exists():
        try:
            result = subprocess.run(
                [
                    "ffmpeg", "-ss", "1", "-i", str(video_path),
                    "-vframes", "1", "-vf", "scale=720:-2",
                    "-q:v", "2", "-y", str(thumb_path),
                ],
                capture_output=True, timeout=15,
            )
            if result.returncode != 0:
                # Reintenta sin seek (videos muy cortos no admiten -ss 1)
                result = subprocess.run(
                    [
                        "ffmpeg", "-i", str(video_path), "-vframes", "1",
                        "-vf", "scale=720:-2", "-q:v", "2", "-y", str(thumb_path),
                    ],
                    capture_output=True, timeout=15,
                )
                if result.returncode != 0:
                    print(f"  ❌ ffmpeg falló: {result.stderr.decode()[:200]}")
                    return None
        except subprocess.TimeoutExpired:
            print(f"  ⚠️ timeout generando thumb para {video_path.name}")
            return None
        except Exception as e:
            print(f"  ⚠️ excepción ffmpeg: {e}")
            return None

    if not thumb_path.exists():
        return None
    # Reconstruye la URL relativa partiendo desde UPLOAD_BASE_DIR
    try:
        rel = thumb_path.relative_to(UPLOAD_BASE_DIR)
    except ValueError:
        return None
    return f"/api/uploads/{rel.as_posix()}"


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    total_polls = await db.polls.count_documents({})
    print(f"📊 Total polls en BD: {total_polls}")

    fixed_type = 0
    generated_thumb = 0
    cleaned_bogus_thumb = 0
    scanned = 0
    failures = 0

    cursor = db.polls.find({})
    async for poll in cursor:
        poll_id = poll.get("id")
        options = poll.get("options", [])
        any_change = False

        for opt in options:
            mu = opt.get("media_url") or ""
            if not is_video_url(mu):
                continue
            scanned += 1

            # 1) Corregir media_type si no es 'video'
            if opt.get("media_type") != "video":
                opt["media_type"] = "video"
                fixed_type += 1
                any_change = True

            # 2) Si thumbnail_url es bogus (vacío o apunta al video), regenerar
            current_thumb = opt.get("thumbnail_url")
            is_bogus = (
                not current_thumb
                or is_video_url(current_thumb)
                or current_thumb == mu
            )
            if is_bogus:
                if current_thumb and is_video_url(current_thumb):
                    cleaned_bogus_thumb += 1
                disk_path = media_url_to_disk_path(mu)
                if disk_path is None:
                    failures += 1
                    print(f"  ⚠️ poll {poll_id}: no se pudo derivar disk path de {mu}")
                    continue
                thumb_url = generate_thumbnail(disk_path)
                if thumb_url:
                    opt["thumbnail_url"] = thumb_url
                    generated_thumb += 1
                    any_change = True
                    # Cache best-effort en uploaded_files
                    try:
                        await db.uploaded_files.update_one(
                            {"filename": disk_path.name},
                            {"$set": {"thumbnail_url": thumb_url, "file_type": "video"}}
                        )
                    except Exception:
                        pass
                    print(f"  ✅ {poll_id} :: {disk_path.name} → {thumb_url}")
                else:
                    failures += 1
                    print(f"  ❌ {poll_id} :: no se pudo generar thumb para {disk_path}")

        if any_change:
            await db.polls.update_one(
                {"id": poll_id},
                {"$set": {"options": options}}
            )

    print("\n────────────────────────────────")
    print(f"📈 Opciones de video escaneadas:        {scanned}")
    print(f"🔧 media_type corregidos a 'video':     {fixed_type}")
    print(f"🧹 thumbnail_url bogus saneados:        {cleaned_bogus_thumb}")
    print(f"🖼️  thumbnails generados con ffmpeg:    {generated_thumb}")
    print(f"❌ fallos:                              {failures}")
    print("────────────────────────────────")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
