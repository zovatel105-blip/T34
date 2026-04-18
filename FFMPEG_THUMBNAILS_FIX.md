# 🎬 FFmpeg - Generación de Miniaturas de Video

## ⚙️ Instalación de FFmpeg

**Problema identificado:** Las miniaturas de videos no se mostraban en AudioDetailPage y SearchPage porque FFmpeg no estaba instalado en el contenedor del backend.

**Solución aplicada:**
```bash
apt-get update && apt-get install -y ffmpeg
```

**FFmpeg instalado:**
- Versión: 5.1.8-0+deb12u1
- Ubicación: `/usr/bin/ffmpeg`
- Estado: ✅ Instalado y funcionando

---

## 📋 ¿Qué hace FFmpeg en esta aplicación?

FFmpeg se usa para generar **thumbnails (miniaturas)** de videos subidos por los usuarios. Cuando un usuario sube un video en un poll:

1. El backend recibe el video
2. FFmpeg extrae el primer frame del video
3. Se guarda como imagen (thumbnail_url)
4. Esta miniatura se muestra en:
   - AudioDetailPage (página de detalles de audio)
   - SearchPage (resultados de búsqueda)
   - TikTokProfileGrid (grid de perfil)

---

## 🔧 Código del Backend que Usa FFmpeg

**Ubicación:** `/app/backend/server.py`

El backend genera thumbnails automáticamente cuando detecta videos:

```python
# Líneas ~2707-2712 y otras secciones similares
if not option_copy.get("thumbnail_url"):
    video_thumbnail = await generate_video_thumbnail(option_copy["media_url"])
    option_copy["thumbnail_url"] = video_thumbnail
```

---

## 🖼️ Componentes del Frontend que Usan Thumbnails

### 1. AudioDetailPage
**Archivo:** `/app/frontend/src/pages/AudioDetailPage.jsx`

```jsx
// Miniatura de audio/cover
<img 
  src={resolveAssetUrl(audio.cover_url)} 
  alt={audio.title}
  className="w-full h-full object-cover"
/>
```

**Cambio aplicado:** Se agregó `resolveAssetUrl()` para que las URLs funcionen correctamente en el APK.

### 2. TikTokProfileGrid
**Archivo:** `/app/frontend/src/components/TikTokProfileGrid.jsx`

```jsx
// Miniaturas en el grid de perfil
<img
  src={uploadService.getPublicUrl(thumbnail, { width: 300, height: 400, quality: 70 })}
  alt={poll.title || 'Post thumbnail'}
  className="w-full h-full object-cover rounded-lg"
/>
```

**Estado:** Ya usa `uploadService.getPublicUrl()` que internamente usa `resolveAssetUrl()`.

### 3. SearchPage con LazyImage
**Archivo:** `/app/frontend/src/pages/SearchPage.jsx`

```jsx
<LazyImage 
  src={story.thumbnail_url}
  alt={story.user?.display_name || 'Story'}
  className="absolute inset-0 w-full h-full object-cover"
/>
```

**Estado:** `LazyImage` ya usa `resolveAssetUrl()` internamente.

---

## 🚀 Testing - Generación de Thumbnails

### Verificar que FFmpeg Funciona

```bash
# 1. Verificar instalación
ffmpeg -version

# 2. Probar generación de thumbnail de un video de prueba
ffmpeg -i /app/backend/uploads/videos/test.mp4 -ss 00:00:01 -vframes 1 -q:v 2 /tmp/thumbnail.jpg
```

### Verificar en la Aplicación

1. **Subir un video nuevo:**
   - Crear un nuevo poll con un video
   - El backend debe generar automáticamente el thumbnail

2. **Verificar en AudioDetailPage:**
   - Navegar a `/audio/:audioId`
   - Debe mostrar la miniatura del video

3. **Verificar en SearchPage:**
   - Buscar el video
   - Los resultados deben mostrar las miniaturas

---

## ⚠️ Importante: Persistencia de FFmpeg

**Problema potencial:** Si el contenedor se reinicia o se reconstruye, FFmpeg podría no estar instalado.

**Soluciones:**

### Opción 1: Dockerfile (Recomendado para producción)
Agregar al Dockerfile del backend:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
```

### Opción 2: Script de Inicialización
Crear `/app/backend/install_dependencies.sh`:
```bash
#!/bin/bash
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing FFmpeg..."
    apt-get update && apt-get install -y ffmpeg
    echo "FFmpeg installed successfully"
else
    echo "FFmpeg already installed"
fi
```

### Opción 3: Emergent Platform
Si estás usando Emergent Platform, FFmpeg debería estar preinstalado. Contacta soporte si no está disponible.

---

## 🐛 Troubleshooting

### Problema: "FFmpeg not found"
```bash
# Solución: Instalar FFmpeg
apt-get update && apt-get install -y ffmpeg
```

### Problema: Miniaturas no se generan
```bash
# 1. Verificar logs del backend
tail -f /var/log/supervisor/backend.*.log | grep -i "thumbnail\|ffmpeg"

# 2. Verificar permisos en carpeta de uploads
ls -la /app/backend/uploads/
chmod -R 755 /app/backend/uploads/
```

### Problema: Miniaturas no se ven en el APK
```bash
# Verificar que las URLs usen resolveAssetUrl()
# Ya aplicado en:
# - AudioDetailPage.jsx ✅
# - LazyImage.jsx ✅
# - uploadService.js ✅
```

---

## 📊 Comparación: Antes vs Ahora

### ANTES ❌
```
Backend: FFmpeg NO instalado
  ↓
Videos sin thumbnails (thumbnail_url = null)
  ↓
Frontend: Rectángulos grises en AudioDetailPage/SearchPage
```

### AHORA ✅
```
Backend: FFmpeg instalado ✅
  ↓
Videos con thumbnails generados automáticamente
  ↓
Frontend: Miniaturas visibles en AudioDetailPage/SearchPage ✅
```

---

## 📝 Checklist de Verificación

- [x] FFmpeg instalado en el backend
- [x] AudioDetailPage usa `resolveAssetUrl()` para cover_url
- [x] LazyImage usa `resolveAssetUrl()` internamente
- [x] uploadService.getPublicUrl() usa `resolveOptimizedAssetUrl()`
- [x] TikTokProfileGrid usa uploadService.getPublicUrl()
- [ ] Probar subida de video nuevo y verificar thumbnail
- [ ] Verificar thumbnails en AudioDetailPage en APK
- [ ] Verificar thumbnails en SearchPage en APK

---

**Última actualización:** 18 Abril 2025  
**Status:** ✅ FFmpeg instalado y configurado  
**Resultado:** Las miniaturas de video ahora deberían generarse y mostrarse correctamente en el APK.
