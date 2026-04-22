"""
Media validator for polls.

Valida la integridad de los medios (imagenes/videos) de una publicacion
ANTES de marcarla como "ready". Si algo falta o no responde, se marca
como "broken" y los endpoints de listado lo filtran silenciosamente.

Estados posibles de un poll:
    - "pending": Creado pero aun no validado (estado transitorio).
    - "ready":   Validado OK, puede mostrarse en listados.
    - "broken":  Falla alguna validacion → oculto en listados.

Reglas de validacion:
    1. Debe tener `options` con al menos 1 elemento.
    2. Debe tener `title` no vacio y `author_id`.
    3. Cada opcion con `media_type` in {"image", "video"} debe tener `media_url`.
    4. Para URLs locales (`/api/uploads/...`) el archivo debe existir en disco.
    5. Para URLs externas (http/https), se hace un HEAD con timeout corto.
       Si falla o responde 4xx/5xx → broken.
"""

from __future__ import annotations

import os
import re
import logging
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

# Directorio de uploads local (mismo que en server.py)
UPLOAD_DIR = Path(__file__).parent / "uploads"

# Timeout corto para HEAD requests a URLs externas.
# Si una CDN tarda mas, mejor no bloquear la creacion del post.
_EXTERNAL_HEAD_TIMEOUT = 5.0  # segundos


def _local_path_from_url(url: str) -> Optional[Path]:
    """
    Convierte una URL de upload local (`/api/uploads/<path>`) en una ruta de
    disco absoluta. Devuelve None si la URL no parece ser local.
    """
    if not url:
        return None
    # Posibles formatos: "/api/uploads/foo.mp4", "http://host/api/uploads/foo.mp4"
    m = re.search(r"/api/uploads/(.+?)(?:\?|#|$)", url)
    if not m:
        return None
    rel = m.group(1).lstrip("/")
    return UPLOAD_DIR / rel


async def _url_is_reachable(url: str, client: httpx.AsyncClient) -> bool:
    """
    Comprueba si una URL externa responde correctamente (HEAD -> 2xx/3xx).
    Si el servidor no soporta HEAD, cae a GET con Range (0-0).
    """
    try:
        r = await client.head(url, follow_redirects=True, timeout=_EXTERNAL_HEAD_TIMEOUT)
        if r.status_code < 400:
            return True
        # Algunos CDNs devuelven 405 a HEAD: probamos GET ligero.
        if r.status_code in (405, 403):
            r2 = await client.get(
                url,
                follow_redirects=True,
                timeout=_EXTERNAL_HEAD_TIMEOUT,
                headers={"Range": "bytes=0-0"},
            )
            return r2.status_code < 400
        return False
    except Exception as e:
        logger.warning(f"[media_validator] URL no alcanzable {url}: {e}")
        return False


async def validate_poll_media(poll: dict) -> Tuple[bool, str]:
    """
    Valida que el poll tenga estructura coherente y todos sus medios existan.

    Args:
        poll: dict con los campos del poll tal y como se guardaria en Mongo
              (equivalent a `Poll.model_dump()`).

    Returns:
        (is_valid, reason)
        - is_valid=True  → el poll puede marcarse como "ready".
        - is_valid=False → `reason` describe por que se marca como "broken".
    """
    # 1) Estructura basica
    title = (poll.get("title") or "").strip()
    if not title:
        return False, "missing_title"

    author_id = poll.get("author_id")
    if not author_id:
        return False, "missing_author"

    options = poll.get("options") or []
    if not isinstance(options, list) or len(options) == 0:
        return False, "no_options"

    # 2) Validar cada opcion con media
    # Recolectamos URLs externas para chequearlas en paralelo con un solo client.
    external_urls: list[str] = []

    for i, opt in enumerate(options):
        if not isinstance(opt, dict):
            return False, f"option_{i}_invalid_shape"

        media_type = opt.get("media_type")
        media_url = opt.get("media_url")

        # Solo validamos opciones marcadas como image/video
        if media_type not in ("image", "video"):
            continue

        if not media_url or not isinstance(media_url, str):
            return False, f"option_{i}_missing_media_url"

        # 2a) URL local: comprobamos que el archivo exista en disco
        local_path = _local_path_from_url(media_url)
        if local_path is not None:
            if not local_path.exists():
                return False, f"option_{i}_local_file_missing:{local_path.name}"
            # Archivo existe y no esta vacio
            try:
                if local_path.stat().st_size == 0:
                    return False, f"option_{i}_local_file_empty"
            except OSError as e:
                return False, f"option_{i}_local_file_stat_error:{e}"
            continue

        # 2b) URL externa: la comprobamos con HEAD
        parsed = urlparse(media_url)
        if parsed.scheme in ("http", "https"):
            external_urls.append(media_url)
        else:
            # Esquema desconocido o vacio → invalido
            return False, f"option_{i}_invalid_url_scheme"

    # 3) Comprobar URLs externas (si las hay) con HEAD en paralelo
    if external_urls:
        try:
            async with httpx.AsyncClient() as client:
                for url in external_urls:
                    ok = await _url_is_reachable(url, client)
                    if not ok:
                        return False, f"external_url_unreachable:{url[:80]}"
        except Exception as e:
            # Si httpx falla catastroficamente, NO marcamos broken por ello
            # (podria ser problema de red temporal del servidor). Preferimos
            # falso-ready a falso-broken.
            logger.warning(f"[media_validator] HTTP client failure, skipping external checks: {e}")

    return True, "ok"


async def compute_status_for_poll(poll: dict) -> str:
    """
    Helper: devuelve directamente el string de status a guardar.
    """
    is_valid, reason = await validate_poll_media(poll)
    if not is_valid:
        logger.info(f"[media_validator] poll {poll.get('id')} marked as broken: {reason}")
        return "broken"
    return "ready"
