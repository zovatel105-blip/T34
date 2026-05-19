"""Test aislado de Fase 1: transcoder HLS + endpoint.

Genera un video sintético con ffmpeg, lo pasa por transcode_video_hls(),
verifica master.m3u8 + 3 renditions + segmentos .ts y luego pega los
endpoints HTTP para validar headers (Content-Type, Content-Disposition,
Cache-Control, Accept-Ranges).

Se ejecuta independiente del pipeline completo: no toca la DB.
"""

import asyncio
import os
import shutil
import sys
import subprocess
from pathlib import Path

sys.path.insert(0, "/app/backend")

from video_pipeline import (  # noqa: E402
    transcode_video_hls,
    HLS_DIR,
    UPLOAD_DIR,
)
import urllib.request  # noqa: E402

OPTION_ID = "test_hls_pipeline_001"
SOURCE = Path("/tmp/test_hls_source.mp4")
BACKEND = "http://localhost:8001"


def gen_source_video():
    """Genera 8 segundos de testsrc 720p + sine 1kHz para tener algo realista."""
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=8",
        "-f", "lavfi", "-i", "sine=frequency=1000:duration=8",
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-shortest",
        str(SOURCE),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    assert SOURCE.exists() and SOURCE.stat().st_size > 0
    print(f"  source: {SOURCE} ({SOURCE.stat().st_size:,} bytes)")


async def run_transcode():
    print("\n[1/4] Generando source video sintético…")
    gen_source_video()

    print("\n[2/4] Transcoding HLS (3 renditions, segmentos 2s)…")
    url = await transcode_video_hls(SOURCE, OPTION_ID)
    if not url:
        print("  ❌ transcode_video_hls devolvió None")
        return False
    print(f"  ✅ master URL: {url}")

    out_dir = HLS_DIR / OPTION_ID
    assert out_dir.exists(), f"out_dir no existe: {out_dir}"
    master = out_dir / "master.m3u8"
    assert master.exists(), "master.m3u8 no fue generado"
    print(f"  master.m3u8: {master.stat().st_size} bytes")
    print("  master.m3u8 content:")
    print("    " + master.read_text().replace("\n", "\n    "))

    # Validar renditions
    for name in ("360p", "540p", "720p"):
        playlist = out_dir / f"{name}.m3u8"
        segments = list(out_dir.glob(f"{name}_*.ts"))
        assert playlist.exists(), f"{name}.m3u8 no existe"
        assert len(segments) > 0, f"{name} sin segmentos"
        print(f"  ✅ {name}: playlist + {len(segments)} segmentos .ts "
              f"(total {sum(s.stat().st_size for s in segments):,} bytes)")

    return True


def check_endpoint(path, expected_ct):
    """Hace HTTP GET y devuelve dict con headers + status."""
    req = urllib.request.Request(f"{BACKEND}{path}")
    try:
        resp = urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as e:
        return {"status": e.code, "headers": dict(e.headers), "body_size": 0}
    body = resp.read()
    return {
        "status": resp.status,
        "headers": {k.lower(): v for k, v in resp.headers.items()},
        "body_size": len(body),
        "expected_ct": expected_ct,
    }


def test_endpoints():
    print("\n[3/4] Testeando endpoints HTTP…")
    out_dir = HLS_DIR / OPTION_ID
    segments = sorted(out_dir.glob("720p_*.ts"))
    first_segment = segments[0].name

    cases = [
        (f"/api/uploads/videos/hls/{OPTION_ID}/master.m3u8",
         "application/vnd.apple.mpegurl"),
        (f"/api/uploads/videos/hls/{OPTION_ID}/720p.m3u8",
         "application/vnd.apple.mpegurl"),
        (f"/api/uploads/videos/hls/{OPTION_ID}/{first_segment}",
         "video/mp2t"),
    ]

    all_ok = True
    for path, expected_ct in cases:
        r = check_endpoint(path, expected_ct)
        ct = r["headers"].get("content-type", "")
        cd = r["headers"].get("content-disposition", "")
        cc = r["headers"].get("cache-control", "")
        ar = r["headers"].get("accept-ranges", "")
        ok = (
            r["status"] == 200
            and expected_ct in ct
            and cd == "inline"
            and "immutable" in cc
            and ar == "bytes"
        )
        flag = "✅" if ok else "❌"
        print(f"  {flag} {path}")
        print(f"     status={r['status']} CT={ct} CD={cd} CC={cc} AR={ar} size={r['body_size']}")
        if not ok:
            all_ok = False
    return all_ok


def test_security():
    """Path traversal debe ser bloqueado."""
    print("\n[4/4] Testeando guardas de path traversal…")
    bad_paths = [
        f"/api/uploads/videos/hls/{OPTION_ID}/..%2Fmaster.m3u8",  # encoded
        "/api/uploads/videos/hls/..%2F..%2Fetc/passwd",
    ]
    all_ok = True
    for p in bad_paths:
        r = check_endpoint(p, "")
        ok = r["status"] in (400, 404)
        flag = "✅" if ok else "❌"
        print(f"  {flag} {p} → {r['status']}")
        if not ok:
            all_ok = False
    return all_ok


def cleanup():
    out_dir = HLS_DIR / OPTION_ID
    if out_dir.exists():
        shutil.rmtree(out_dir)
    if SOURCE.exists():
        SOURCE.unlink()
    print("\n🧹 cleanup ok")


async def main():
    try:
        ok_transcode = await run_transcode()
        if not ok_transcode:
            print("\n❌ FALLÓ en transcoding")
            return 1
        ok_endpoints = test_endpoints()
        ok_security = test_security()
        print("\n" + "=" * 60)
        if ok_transcode and ok_endpoints and ok_security:
            print("✅ TODOS LOS TESTS DE FASE 1 PASARON")
            return 0
        print("❌ Algún test falló")
        return 1
    finally:
        cleanup()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
