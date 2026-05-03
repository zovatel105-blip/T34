# PRD - Content Creation Page (Polls / VS / Momento / Challenge)

## Original Problem Statement (último ciclo)
1. Instalar `ffmpeg` en el contenedor (sistema).
2. Fix indicadores del carousel solapando con la nav bar inferior.
3. Embeber "VS" y "Momento" dentro de `ContentCreationPage` (sin redirigir a páginas separadas).
4. Restringir layouts:
   - VS: solo Side-by-Side y Top-and-Bottom.
   - Momento: imagen única (sin selector de layouts).
5. VS: barra inline para descripción + carousel (Swiper) hasta 3 parejas / 6 imágenes.
6. VS al publicar: golpear `POST /api/vs/create` (no la API de polls).
7. Header: pastilla central que combina "Add Sound" + "Layout" con separador vertical.
8. Imagen: tap simple = toggle de Descripción/Mención; Long-press 500ms = abrir crop overlay sin botón Save.
9. Persistir el ajuste de crop al publicar (rasterizar con aspect ratio del layout).

## Core Requirements
- Frontend: React + Tailwind + lucide-react + Swiper.
- Backend: FastAPI + MongoDB.
- Mobile-only UX (desktop muestra "Coming Soon").
- Modos de creación: `publicar` (default), `vs`, `momento`. `isChallengeMode` es ortogonal a `publicar`.

## Architecture
- `frontend/src/pages/ContentCreationPage.jsx` (~2185 líneas) — orquesta todos los modos.
  - `LayoutPreview` (sub-componente): renderiza el grid según `selectedLayout`, maneja tap/long-press, InlineCrop por slot.
  - `creationMode` controla qué editor se muestra (`momento` rinde `MomentCreationPage embedded`).
  - `handleCreate`: bifurca a path VS (rasteriza + `POST /api/vs/create`) o path normal (rasteriza + navega a `/content-publish`).
  - `getCellOutputSize(layoutId)` → calcula `{w,h}` de salida por celda manteniendo 9:16 global.
  - `getFinalCroppedImage(src, transform, w, h)` → simula `object-fit: cover` con `position` y `scale` en canvas.
- `frontend/src/components/InlineCrop.jsx` — crop autosave (800ms debounce), sin botón Save.
- `frontend/src/components/layouts/CarouselLayout.jsx` — indicadores con offset dinámico según `useNavPreference`.
- `frontend/src/pages/MomentCreationPage.jsx` — soporta prop `embedded`.

## Estado actual (Feb 2026)
✅ ffmpeg instalado.
✅ Carousel indicators reposicionados.
✅ VS/Momento embebidos.
✅ Layouts restringidos por `creationMode`.
✅ Carousel multi-pareja VS (Swiper, hasta 3).
✅ `POST /api/vs/create` cableado.
✅ Pastilla central Add Sound + Layout con separador.
✅ Tap toggle (Descripción/Mención) + Long-press 500ms (crop) — uniforme en Publicar/Challenge/VS.
✅ Rasterización dinámica con aspect ratio del layout — uniforme en Publicar/Challenge/VS.
✅ Verificado: handlers en LayoutPreview no condicionan por creationMode (excepto VS branch para inline input).

## Backlog / Próximas mejoras (P2)
- Refactor `ContentCreationPage.jsx` (>2100 líneas): extraer `LayoutPreview` y handlers de upload a archivos separados.
- Tests E2E de flujo completo Publicar/Challenge/VS con testing_agent_v3.
- Considerar persistir borradores en localStorage por modo.

## Endpoints clave
- `POST /api/vs/create` — VS multi-question.
- `POST /api/polls/...` — polls normales.
- `POST /api/challenges/...` — challenges.
- `POST /api/uploads` (vía `uploadService`) — upload de archivos.
- `GET /api/geolocation` — país del creador para VS.

## Notas críticas
- `longPressFiredRef` evita que el click sintético post-long-press dispare el toggle de botones.
- Tras rasterizar, `media.transform` se pone en `null` para no re-aplicarlo en el feed.
- En VS el rasterizado usa `vsCellSize` (vertical=lado-a-lado, horizontal=arriba/abajo).
