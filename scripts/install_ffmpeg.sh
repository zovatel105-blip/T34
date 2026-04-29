#!/usr/bin/env bash
# Instala FFmpeg si no está presente. Idempotente: seguro correr en cada deploy.
#
# FFmpeg se usa en el backend para:
#   - Transcodificar vídeos subidos a H.264 main / level 3.1 / +faststart
#   - Generar thumbnails de vídeos
#   - Validar vídeos (ffprobe)
#
# Para el APK nativo de Android/iOS NO hace falta: el usuario sube el vídeo
# original y el backend hace el trabajo pesado.
set -e
if command -v ffmpeg >/dev/null 2>&1; then
    echo "[ffmpeg] already installed: $(ffmpeg -version | head -n1)"
    exit 0
fi
echo "[ffmpeg] not found, installing…"
apt-get update -y
apt-get install -y --no-install-recommends ffmpeg
echo "[ffmpeg] installed: $(ffmpeg -version | head -n1)"
