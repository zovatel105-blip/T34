"""
backfill_vs_questions_thumbnails.py
====================================
Una sola vez. Recorre TODAS las polls con `layout == "vs"` (o que tengan
`vs_questions` no vacío) y, para cada opción dentro de `vs_questions[].options[]`:

  1) Si `image` apunta a un video (.mp4/.mov/.webm/.avi/.m4v/.mkv) → fuerza
     `media_type = "video"` y, si falta `thumbnail_url` o es bogus, genera
     una miniatura con ffmpeg desde el archivo en disco y la persiste.
  2) Si `image` apunta a una imagen estática → fuerza `media_type = "image"`
     y rellena `thumbnail_url = image` para que el pipeline TikTok pueda
     usarlo como poster sin penalty.
  3) Rellena `media_url` con el valor de `image` para mantener el alias
     canónico que usa el pipeline del feed.
  4) Cachea best-effort el thumbnail en `uploaded_files` para que la
     generación lazy futura sea instantánea.

El script es idempotente: si una opción ya está enriquecida correctamente
no la toca. Se puede correr varias veces sin riesgo.

También opera en `db.vs_experiences.questions[].options[]` con la misma
lógica para mantener ambas colecciones consistentes (algunos endpoints
leen de vs_experiences directamente).

Uso:
    cd /app/backend && python3 scripts/backfill_vs_questions_thumbnails.py
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
IMAGE_RE = re.compile(r"\.(jpg|jpeg|png|gif|webp|bmp|avif|heic|heif)(\?|$)", re.IGNORECASE)


def is_video_url(url):
    if not url or not isinstance(url, str):
        return False
    return bool(VIDEO_RE.search(url))


def is_image_url(url):
    if not url or not isinstance(url, str):
        return False
    return bool(IMAGE_RE.search(url))


def media_url_to_disk_path(media_url):
    """/api/uploads/general/file.mp4 → <UPLOAD_BASE_DIR>/general/file.mp4"""
    if not media_url or "/api/uploads/" not in media_url:
        return None
    after = media_url.split("/api/uploads/", 1)[1]
    return UPLOAD_BASE_DIR / after


def generate_thumbnail(video_path):
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
    try:
        rel = thumb_path.relative_to(UPLOAD_BASE_DIR)
    except ValueError:
        return None
    return f"/api/uploads/{rel.as_posix()}"


def enrich_option_in_place(opt, db_for_cache=None):
    """
    Mutates `opt` (un dict de option dentro de vs_questions[].options[]) si
    le faltan campos canónicos. Devuelve True si hubo cambio, False si no.
    Si `db_for_cache` está disponible, agenda el update de uploaded_files
    a través de la lista returns_pending_cache_updates (no async aquí).
    """
    if not isinstance(opt, dict):
        return False, None

    # El campo de origen del media en vs_questions es `image`.
    # En algunos posts antiguos puede venir ya en `media_url`.
    media_url = opt.get("media_url") or opt.get("image")
    if not media_url:
        return False, None

    changed = False
    pending_cache = None

    # 1) Alinear `media_url` (alias canónico) con `image`.
    if opt.get("media_url") != media_url:
        opt["media_url"] = media_url
        changed = True

    # 2) Determinar el media_type correcto.
    if is_video_url(media_url):
        target_type = "video"
    elif is_image_url(media_url):
        target_type = "image"
    else:
        target_type = opt.get("media_type") or "image"

    if opt.get("media_type") != target_type:
        opt["media_type"] = target_type
        changed = True

    # 3) Asegurar thumbnail_url usable.
    current_thumb = opt.get("thumbnail_url")
    thumb_is_bogus = (
        not current_thumb
        or current_thumb == media_url
        or is_video_url(current_thumb)
    )

    if target_type == "video":
        if thumb_is_bogus:
            disk_path = media_url_to_disk_path(media_url)
            if disk_path is None:
                print(f"  ⚠️ no se pudo derivar disk path de {media_url}")
            else:
                thumb_url = generate_thumbnail(disk_path)
                if thumb_url:
                    opt["thumbnail_url"] = thumb_url
                    changed = True
                    pending_cache = (disk_path.name, thumb_url)
                    print(f"  ✅ thumb generado :: {disk_path.name} → {thumb_url}")
                else:
                    print(f"  ❌ no se pudo generar thumb para {disk_path}")
    elif target_type == "image":
        # Para imágenes, la propia imagen sirve como poster.
        if not current_thumb or current_thumb != media_url:
            opt["thumbnail_url"] = media_url
            changed = True

    # 4) Asegurar votes existe (por consistencia).
    if "votes" not in opt:
        opt["votes"] = 0
        changed = True

    return changed, pending_cache


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ── Paso 1: polls con layout=vs (estructura del feed) ──────────────────
    poll_filter = {
        "$or": [
            {"layout": "vs"},
            {"vs_questions": {"$exists": True, "$type": "array", "$ne": []}},
        ]
    }
    total_polls = await db.polls.count_documents(poll_filter)
    print(f"📊 Polls VS en BD: {total_polls}")

    polls_changed = 0
    options_enriched = 0
    thumbs_generated = 0
    failures = 0

    cursor = db.polls.find(poll_filter)
    async for poll in cursor:
        poll_id = poll.get("id")
        vs_questions = poll.get("vs_questions") or []
        any_change = False

        for q in vs_questions:
            if not isinstance(q, dict):
                continue
            options = q.get("options") or []
            for opt in options:
                changed, pending = enrich_option_in_place(opt)
                if changed:
                    any_change = True
                    options_enriched += 1
                if pending:
                    fname, thumb_url = pending
                    thumbs_generated += 1
                    try:
                        await db.uploaded_files.update_one(
                            {"filename": fname},
                            {"$set": {"thumbnail_url": thumb_url, "file_type": "video"}}
                        )
                    except Exception:
                        pass

        # También enriquecer poll.options (primera pregunta) por si quedó
        # desincronizado con vs_questions[0]. No regeneramos thumbs aquí
        # (ya se hizo arriba si correspondía).
        if any_change and vs_questions:
            first_q = vs_questions[0] if isinstance(vs_questions[0], dict) else None
            if first_q and isinstance(first_q.get("options"), list):
                # Sincroniza solo media_type / thumbnail_url / media_url por id.
                poll_options = poll.get("options") or []
                idx_by_id = {o.get("id"): o for o in first_q["options"] if isinstance(o, dict)}
                for po in poll_options:
                    if not isinstance(po, dict):
                        continue
                    src = idx_by_id.get(po.get("id"))
                    if not src:
                        continue
                    for k in ("media_url", "media_type", "thumbnail_url"):
                        if src.get(k) and po.get(k) != src.get(k):
                            po[k] = src[k]

        if any_change:
            polls_changed += 1
            await db.polls.update_one(
                {"id": poll_id},
                {"$set": {
                    "vs_questions": vs_questions,
                    "options": poll.get("options") or [],
                }}
            )

    # ── Paso 2: vs_experiences (colección paralela) ────────────────────────
    total_vs = await db.vs_experiences.count_documents({})
    print(f"📊 vs_experiences en BD: {total_vs}")

    vs_changed = 0
    vs_options_enriched = 0

    cursor = db.vs_experiences.find({})
    async for vs in cursor:
        vs_id = vs.get("id")
        questions = vs.get("questions") or []
        any_change = False

        for q in questions:
            if not isinstance(q, dict):
                continue
            options = q.get("options") or []
            for opt in options:
                changed, pending = enrich_option_in_place(opt)
                if changed:
                    any_change = True
                    vs_options_enriched += 1
                if pending:
                    fname, thumb_url = pending
                    try:
                        await db.uploaded_files.update_one(
                            {"filename": fname},
                            {"$set": {"thumbnail_url": thumb_url, "file_type": "video"}}
                        )
                    except Exception:
                        pass

        if any_change:
            vs_changed += 1
            await db.vs_experiences.update_one(
                {"id": vs_id},
                {"$set": {"questions": questions}}
            )

    print("\n────────────────────────────────")
    print(f"📈 polls VS escaneados:                 {total_polls}")
    print(f"   ✅ polls modificados:                 {polls_changed}")
    print(f"   ✅ options enriquecidas:              {options_enriched}")
    print(f"   🖼  thumbnails generados (ffmpeg):    {thumbs_generated}")
    print(f"📈 vs_experiences escaneados:           {total_vs}")
    print(f"   ✅ vs_experiences modificados:        {vs_changed}")
    print(f"   ✅ options enriquecidas:              {vs_options_enriched}")
    print(f"❌ fallos:                              {failures}")
    print("────────────────────────────────")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
