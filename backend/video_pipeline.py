"""
Video pipeline for polls.

Procesa los medios (principalmente videos) de una publicación recién creada:
    1. Valida integridad con ffprobe (descarta archivos corruptos).
    2. Genera thumbnail server-side si falta (evita posters rotos).
    3. Transcodifica a 720p H.264+AAC mobile-friendly (+faststart) en
       segundo plano sin bloquear la visibilidad del poll.

State machine que gestiona este módulo:
    processing -> ready   (validación + thumbnail OK, transcoding seguirá async)
    processing -> failed  (validación ffprobe falló en alguna opción de video)

El transcoding nunca cambia el status: si falla, el original sigue sirviéndose
y el poll se mantiene `ready` (fallback transparente).

Los archivos generados se guardan bajo:
    <UPLOAD_DIR>/thumbnails/{option_id}.jpg
    <UPLOAD_DIR>/videos/optimized/{option_id}.mp4

Y se sirven vía el mismo endpoint estático /api/uploads/... que ya existe.
"""

from __future__ import annotations

import os
import re
import json
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Directorios
UPLOAD_DIR = Path(__file__).parent / "uploads"
THUMBNAIL_DIR = UPLOAD_DIR / "thumbnails"
OPTIMIZED_DIR = UPLOAD_DIR / "videos" / "optimized"
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)
OPTIMIZED_DIR.mkdir(parents=True, exist_ok=True)

# Semáforo global para limitar ffmpeg concurrente (CPU-bound).
# 2 concurrentes es razonable en contenedores típicos (2 vCPU).
_FFMPEG_SEMAPHORE = asyncio.Semaphore(2)

# Timeouts
_FFPROBE_TIMEOUT = 15.0     # validación rápida
_THUMBNAIL_TIMEOUT = 20.0   # generar un JPG de 1 frame
_TRANSCODE_TIMEOUT = 180.0  # transcoding puede tardar en videos largos


def _local_path_from_url(url: Optional[str]) -> Optional[Path]:
    """Convierte una URL `/api/uploads/...` en un path absoluto en disco.
    Devuelve None si la URL no apunta a un upload local."""
    if not url:
        return None
    m = re.search(r"/api/uploads/(.+?)(?:\?|#|$)", url)
    if not m:
        return None
    return UPLOAD_DIR / m.group(1).lstrip("/")


def _public_url_from_path(path: Path) -> str:
    """Convierte un path absoluto dentro de uploads/ a la URL pública."""
    rel = path.resolve().relative_to(UPLOAD_DIR.resolve())
    return f"/api/uploads/{rel.as_posix()}"


async def _run(cmd: list, timeout: float) -> Tuple[int, bytes, bytes]:
    """Ejecuta un comando externo con timeout. Devuelve (rc, stdout, stderr)."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return proc.returncode or 0, stdout, stderr
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except ProcessLookupError:
            pass
        raise


async def validate_video(path: Path) -> Tuple[bool, str, dict]:
    """Valida un archivo de video con ffprobe. Devuelve (ok, error, info)."""
    if not path.exists() or path.stat().st_size == 0:
        return False, "file_missing_or_empty", {}
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        str(path),
    ]
    try:
        rc, stdout, stderr = await _run(cmd, _FFPROBE_TIMEOUT)
    except asyncio.TimeoutError:
        return False, "ffprobe_timeout", {}

    if rc != 0:
        err = stderr.decode(errors="ignore")[:200]
        return False, f"ffprobe_failed:{err}", {}

    try:
        info = json.loads(stdout.decode())
    except json.JSONDecodeError:
        return False, "ffprobe_bad_json", {}

    fmt = info.get("format", {})
    streams = info.get("streams", [])
    has_video = any(s.get("codec_type") == "video" for s in streams)
    if not has_video:
        return False, "no_video_stream", info

    try:
        duration = float(fmt.get("duration", 0))
    except (TypeError, ValueError):
        duration = 0.0
    if duration <= 0:
        return False, "invalid_duration", info

    return True, "ok", {
        "duration": duration,
        "size": int(fmt.get("size", 0) or 0),
        "bitrate": int(fmt.get("bit_rate", 0) or 0),
        "has_audio": any(s.get("codec_type") == "audio" for s in streams),
    }


async def generate_thumbnail(video_path: Path, option_id: str) -> Optional[str]:
    """Genera un thumbnail server-side en el frame 1s. Devuelve la URL pública
    o None si falla (no es fatal: el client-side fallback sigue siendo válido)."""
    THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)
    out_path = THUMBNAIL_DIR / f"{option_id}.jpg"

    cmd = [
        "ffmpeg", "-y",
        "-ss", "1",            # segundo 1 (evita frame negro inicial)
        "-i", str(video_path),
        "-vframes", "1",
        "-vf", "scale=720:-2", # ancho 720, alto proporcional
        "-q:v", "5",           # calidad JPEG razonable (1=mejor,31=peor)
        str(out_path),
    ]
    try:
        async with _FFMPEG_SEMAPHORE:
            rc, _, stderr = await _run(cmd, _THUMBNAIL_TIMEOUT)
    except asyncio.TimeoutError:
        logger.warning(f"[pipeline] thumbnail timeout for {option_id}")
        return None

    if rc != 0 or not out_path.exists():
        # Reintento: sin el -ss 1 (video muy corto)
        cmd_retry = [
            "ffmpeg", "-y", "-i", str(video_path),
            "-vframes", "1", "-vf", "scale=720:-2", "-q:v", "5",
            str(out_path),
        ]
        try:
            async with _FFMPEG_SEMAPHORE:
                rc, _, _ = await _run(cmd_retry, _THUMBNAIL_TIMEOUT)
        except asyncio.TimeoutError:
            return None
        if rc != 0 or not out_path.exists():
            return None

    return _public_url_from_path(out_path)


async def transcode_video_720p(video_path: Path, option_id: str) -> Optional[str]:
    """Transcodifica a 720p H.264 + AAC + faststart (mobile-friendly).
    Devuelve la URL pública del archivo optimizado o None si falla."""
    OPTIMIZED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OPTIMIZED_DIR / f"{option_id}.mp4"

    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        # Video: escalar a máx 720 de alto, manteniendo aspect ratio, alineado par
        "-vf", "scale='min(iw,trunc(iw*720/ih/2)*2)':'min(720,ih)':force_original_aspect_ratio=decrease",
        "-c:v", "libx264",
        "-preset", "veryfast",  # buen balance calidad/velocidad
        "-crf", "23",
        "-maxrate", "2000k",
        "-bufsize", "4000k",
        "-profile:v", "main",
        "-pix_fmt", "yuv420p",  # compatibilidad universal
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "-max_muxing_queue_size", "1024",
        str(out_path),
    ]
    try:
        async with _FFMPEG_SEMAPHORE:
            rc, _, stderr = await _run(cmd, _TRANSCODE_TIMEOUT)
    except asyncio.TimeoutError:
        logger.warning(f"[pipeline] transcode timeout for {option_id}")
        try:
            out_path.unlink()
        except FileNotFoundError:
            pass
        return None

    if rc != 0 or not out_path.exists() or out_path.stat().st_size == 0:
        logger.warning(
            f"[pipeline] transcode failed for {option_id}: "
            f"{stderr.decode(errors='ignore')[:200]}"
        )
        try:
            out_path.unlink()
        except FileNotFoundError:
            pass
        return None

    return _public_url_from_path(out_path)


async def process_poll_media(db, poll_id: str) -> None:
    """Pipeline completo para un poll. Está pensado para correr como
    BackgroundTask de FastAPI; es tolerante a errores y siempre termina
    dejando al poll en un estado terminal (ready | failed).

    Parámetros:
        db: motor AsyncIOMotor database (pasada explícitamente porque este
            módulo no tiene su propia conexión).
        poll_id: identificador UUID del poll.
    """
    try:
        poll = await db.polls.find_one({"id": poll_id})
        if not poll:
            logger.warning(f"[pipeline] poll {poll_id} not found, aborting")
            return

        # Marcar inicio (idempotente)
        await db.polls.update_one(
            {"id": poll_id},
            {"$set": {
                "status": "processing",
                "processing_started_at": datetime.utcnow(),
            }},
        )

        options = poll.get("options", []) or []
        video_options = [o for o in options if (o.get("media_type") == "video")]

        # Si no hay videos, transición inmediata a ready.
        if not video_options:
            await db.polls.update_one(
                {"id": poll_id},
                {"$set": {
                    "status": "ready",
                    "processing_completed_at": datetime.utcnow(),
                }},
            )
            return

        # 1) Validación ffprobe de cada video. Si CUALQUIERA falla -> failed.
        for opt in video_options:
            local_path = _local_path_from_url(opt.get("media_url"))
            if local_path is None:
                # URL externa: confiamos en media_validator (ya corrió).
                continue
            ok, reason, _info = await validate_video(local_path)
            if not ok:
                logger.warning(
                    f"[pipeline] poll {poll_id} option {opt.get('id')} "
                    f"failed validation: {reason}"
                )
                await db.polls.update_one(
                    {"id": poll_id},
                    {"$set": {
                        "status": "failed",
                        "processing_completed_at": datetime.utcnow(),
                        "processing_error": f"video_validation:{reason}",
                    }},
                )
                return

        # 2) Thumbnails server-side para cualquier video que no tenga uno.
        #    Esto es rápido (~1s/video), así que lo hacemos antes de marcar ready.
        for opt in video_options:
            local_path = _local_path_from_url(opt.get("media_url"))
            if local_path is None:
                continue
            if opt.get("thumbnail_url"):
                continue  # ya tiene thumbnail cliente/anterior
            new_thumb = await generate_thumbnail(local_path, opt["id"])
            if new_thumb:
                await db.polls.update_one(
                    {"id": poll_id, "options.id": opt["id"]},
                    {"$set": {"options.$.thumbnail_url": new_thumb}},
                )

        # 3) Marcar READY para que el poll ya sea visible en feeds.
        #    El transcoding sigue en background; el cliente verá el original
        #    hasta que `optimized_media_url` esté disponible.
        await db.polls.update_one(
            {"id": poll_id},
            {"$set": {
                "status": "ready",
                "processing_completed_at": datetime.utcnow(),
            }},
        )

        # 4) Transcoding async "fire-and-forget" por opción. Errores no
        #    cambian el status del poll.
        for opt in video_options:
            local_path = _local_path_from_url(opt.get("media_url"))
            if local_path is None:
                continue
            try:
                optimized_url = await transcode_video_720p(local_path, opt["id"])
            except Exception as tx_err:
                logger.warning(
                    f"[pipeline] transcode crash for {opt['id']}: {tx_err}"
                )
                continue
            if optimized_url:
                await db.polls.update_one(
                    {"id": poll_id, "options.id": opt["id"]},
                    {"$set": {"options.$.optimized_media_url": optimized_url}},
                )
                logger.info(
                    f"[pipeline] poll {poll_id} option {opt['id']} optimized -> {optimized_url}"
                )

    except Exception as e:
        logger.error(f"[pipeline] unhandled error for poll {poll_id}: {e}", exc_info=True)
        # Último recurso: no dejar el poll zombi en processing.
        try:
            await db.polls.update_one(
                {"id": poll_id, "status": "processing"},
                {"$set": {
                    "status": "failed",
                    "processing_completed_at": datetime.utcnow(),
                    "processing_error": f"pipeline_crash:{str(e)[:180]}",
                }},
            )
        except Exception:
            pass


# ──────────────────────────────────────────────────────────────────────────
# Reaper: rescata polls que quedaron en `processing` más de X minutos.
# Suele pasar si el proceso backend se reinicia mientras transcodificaba.
# ──────────────────────────────────────────────────────────────────────────

async def reap_stuck_polls(db, max_age_minutes: int = 10) -> int:
    """Marca como `failed` cualquier poll en `processing` más antiguo que
    `max_age_minutes`. Devuelve el número de polls afectados."""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(minutes=max_age_minutes)
    result = await db.polls.update_many(
        {
            "status": "processing",
            "$or": [
                {"processing_started_at": {"$lt": cutoff}},
                {"processing_started_at": {"$exists": False},
                 "created_at": {"$lt": cutoff}},
            ],
        },
        {
            "$set": {
                "status": "failed",
                "processing_completed_at": datetime.utcnow(),
                "processing_error": "reaper_timeout",
            }
        },
    )
    if result.modified_count:
        logger.warning(f"[reaper] rescued {result.modified_count} stuck polls")
    return result.modified_count


async def reaper_loop(db, interval_seconds: int = 300, max_age_minutes: int = 10) -> None:
    """Loop infinito: corre el reaper cada `interval_seconds` (5 min por defecto).
    Pensado para arrancarse con asyncio.create_task() en startup."""
    logger.info(f"[reaper] loop started (every {interval_seconds}s, threshold {max_age_minutes}min)")
    # Una pasada al arrancar para limpiar fantasmas tras reinicio.
    try:
        await reap_stuck_polls(db, max_age_minutes=max_age_minutes)
    except Exception as e:
        logger.error(f"[reaper] startup pass failed: {e}")
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            await reap_stuck_polls(db, max_age_minutes=max_age_minutes)
        except asyncio.CancelledError:
            logger.info("[reaper] loop cancelled")
            raise
        except Exception as e:
            logger.error(f"[reaper] iteration failed: {e}")
            # Pausa defensiva para no entrar en busy loop si algo falla
            await asyncio.sleep(interval_seconds)
