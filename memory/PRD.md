# PRD - Content Creation Page (Polls / VS / Momento / Challenge)

## Original Problem Statement (último ciclo)
1. Instalar `ffmpeg` en el contenedor (sistema).
2. Fix indicadores del carousel solapando con la nav bar inferior.
3. Embeber "VS" y "Momento" dentro de `ContentCreationPage`.
4. Restringir layouts: VS solo Side-by-Side y Top-and-Bottom; Momento sin layouts.
5. VS: barra inline para descripción + Swiper hasta 3 parejas / 6 imágenes.
6. VS al publicar: golpear `POST /api/vs/create`.
7. Header: pastilla central Add Sound + Layout con separador vertical.
8. Tap simple = toggle Descripción/Mención.
9. **Crop adjust TikTok-like**: con detectar intención de arrastre (drag > 8px) o pinch (2 dedos) se activa el crop e inyecta la gestura — sin long-press.
10. Persistir el ajuste de crop al publicar (rasterizar con aspect ratio del layout).

## Core Requirements
- Frontend: React + Tailwind + lucide-react + Swiper.
- Backend: FastAPI + MongoDB.
- Mobile-only UX (desktop muestra "Coming Soon").
- Modos: `publicar` (default), `vs`, `momento`. `isChallengeMode` ortogonal a `publicar`.

## Architecture
- `frontend/src/pages/ContentCreationPage.jsx` (~2200 líneas).
  - `LayoutPreview` (sub-componente): grid según `selectedLayout`, gestura responsive en cada slot, InlineCrop por slot.
  - Detección de drag intent en LayoutPreview:
    - `gestureStartRef` registra inicio de gestura.
    - Si movimiento > `DRAG_THRESHOLD_PX` (8) o 2 dedos → `activateCropAndInject(slotIndex, eventLike)`:
      - llama `onCropFromPreview(slotIndex)` → setea `cropActiveSlot`.
      - llama `cropRefsByIdx.current[slotIndex].startGestureAt(eventLike)` → inicializa gesture en InlineCrop.
    - `dragFiredRef` suprime el click sintético post-drag.
  - `creationMode` controla qué editor se muestra (`momento` rinde `MomentCreationPage embedded`).
  - `handleCreate`: bifurca a path VS (rasteriza + `POST /api/vs/create`) o path normal (rasteriza + navega a `/content-publish`).
  - `getCellOutputSize(layoutId)` → calcula `{w,h}` de salida por celda manteniendo 9:16 global.
  - `getFinalCroppedImage(src, transform, w, h)` → simula `object-fit: cover`.
- `frontend/src/components/InlineCrop.jsx`:
  - `forwardRef` con imperativo `startGestureAt({ touches } | { clientX, clientY })`.
  - Auto-save cada 800ms tras movimiento, sin botón Save.
  - Listeners globales `touchmove`/`mousemove` cuando `isActive`.
- `frontend/src/components/layouts/CarouselLayout.jsx` — indicadores con offset dinámico.
- `frontend/src/pages/MomentCreationPage.jsx` — soporta prop `embedded`.

## Estado actual (Feb 2026)
✅ ffmpeg instalado.
✅ Carousel indicators reposicionados.
✅ VS/Momento embebidos.
✅ Layouts restringidos por `creationMode`.
✅ Carousel multi-pareja VS (Swiper, hasta 3).
✅ `POST /api/vs/create` cableado.
✅ Pastilla central Add Sound + Layout con separador.
✅ Tap toggle (Descripción/Mención).
✅ **Crop TikTok-like**: drag > 8px o pinch activa crop e inyecta gestura inmediatamente. Sin long-press.
✅ Rasterización dinámica con aspect ratio del layout.
✅ Aplicado uniforme en Publicar/Challenge/VS.

### Sesión Feb 2026 — UI de feed (TikTok-like)
✅ Botón "stories" oculto en Following.
✅ Frame del menú 3-puntos eliminado; iconos de voto agrandados.
✅ `VSWinnerCard` portalizado con flechas animadas + auto-advance 1.5s tras votar; UI duplicada removida del post.
✅ Barra de progreso de votación movida a `VotersModal` (incluye payload VS).
✅ Bug submit comentarios (typo `addCommentForFrontend`) en `BottomNavigation.jsx` arreglado.
✅ **CommentsModal portalizado a `document.body`** — antes el modal aparecía completamente negro al abrirse desde la barra inferior porque un ancestro con CSS `transform` (TikTokScrollView) rompía `position: fixed` y posicionaba el modal en `top: -915px`. Fix: `createPortal(..., document.body)`.
✅ **Sin solapamiento post/modal en medio-abierto**: el post miniatura usaba `height: 59vh` y se solapaba ~110px con el modal half-open (46vh + 56px input). Cambiado a `calc(100vh - 46vh - 56px - 16px)` para que el post termine justo donde empieza el modal. El modal solo se superpone al post cuando está completamente expandido.
✅ **Viewport units `vh` → `dvh`** en `CommentsModal` y `TikTokScrollView` para evitar solapamientos en móviles reales con barra de URL visible.
✅ **Marco unificado**: bottom nav sin `rounded-t-3xl` cuando hay comentarios activos → modal + input se ven como un único marco blanco continuo que se expande.
✅ **Reacciones rápidas con emoji**: long-press sobre un comentario abre picker con ❤️🔥😂😮😢👏. Backend: `POST /api/comments/{id}/reaction` (toggle/replace), nueva colección `comment_reactions`. Frontend: chips clickeables debajo del texto con conteo y estado del usuario actual; optimistic UI; fallback a refresh ante error.

### Sesión Feb 2026 — Optimización Feed TikTok-like (Video Pipeline)
✅ **P0 — Fix "pantalla negra al swipear"** en `PollOptionMedia.jsx`:
   - Contenedor base usa gradiente brand (`from-purple-950 via-fuchsia-950 to-pink-950`) en lugar de heredar `bg-black` del card.
   - Posters de slots en DOM (distance ≤ videoTagMaxDistance) cargan con `loading="eager"` + `fetchpriority="high"` para distance ≤ 1.
   - `decoding="sync"` para slot activo, `async` para vecinos.
   - `img.decode()` Promise API pre-decodifica el poster antes del paint para evitar frame drops al hacer swipe.
✅ **P1 — Hardware decoder pool optimization**: `videoTagMaxDistance` bajado de `3` a `2` para layouts normales (sigue en `1` para VS). Antes podía haber 5 `<video>` simultáneos en el DOM; ahora 5 → 3 efectivos, respetando el límite de 2-4 decoders H.264 hardware de Android WebView gama media.
✅ **P2 — Consolidación de `v.play()`**: extraído helper `tryPlayIfActive` con guarda única (activo + paused + readyState≥2). Antes había 3 copias duplicadas de la guarda en `effect[distanceFromActive]`, `onCanPlay`, `onLoadedData`. Mantienen los 3 triggers como red de seguridad para distintos WebViews.

### Sesión Feb 2026 — Fluidez TikTok-style (videoPool + videoTimeCache)
✅ **`/app/frontend/src/lib/videoPool.js`** — Pool de 3 elementos `<video>` reciclables con `acquire/release/swapSource` y `LAZY_RELEASE_MS = 30_000`. Réplica exacta de la referencia. Singleton `window.__videoPool` para debug. Infraestructura lista para futuro refactor de MP4-only single-option posts (no se ha cableado aún porque el sistema actual HLS+videoMemoryManager ya cubre el caso multi-option/VS).
✅ **`/app/frontend/src/lib/videoTimeCache.js`** — `Map<url, {currentTime, ts}>` con TTL 30 s. Save al desmontar, restore al `loadedmetadata`. Cap LRU 60 entradas. Min save 1 s, skip near-end 1.5 s. Singleton `window.__videoTimeCache`.
✅ **Wire `videoTimeCache` en `PollOptionMedia`** — al volver a una publicación dentro de 30 s, el vídeo reanuda en el mismo frame en que se dejó (replica el efecto "lazy-release" del pool sin pool imperativo). Compatible con HLS y MP4 vía `videoEl.currentTime` directo.
✅ **Prefetch threshold bajado 8 → 5** en `TikTokScrollView` (`remaining <= 5` dispara `onLoadMore`). Alineado con la referencia de "carga al final" sin ser demasiado tardío.
✅ Verificado: `viewport-fit=cover` + `user-scalable=no` (`public/index.html` L5), `overscroll-behavior: none` (`index.css` L351, L375), `transform: translateZ(0)` en vídeo activo, `requestVideoFrameCallback` para primer frame, double-tap like optimista (`DoubleTapVoteAnimation`), animaciones GPU-only (`transform`/`opacity`).

### Sesión Feb 2026 — i18n (Fase 1)
✅ **Selector de idioma funcional**: `SettingsPage` ahora llama a `i18n.setLocale(value)` al cambiarlo y aplica re-render inmediato vía evento `localeChanged`.
✅ **Sincronización con backend**: `AuthContext.setAuthData` lee `userData.app_language` y aplica el locale al iniciar sesión / refrescar el usuario.
✅ **4 idiomas soportados**: `es`, `en`, `fr`, `pt` en `frontend/src/i18n/translations.js`.
✅ **Traducidos en Fase 1**:
   - `SettingsPage` (todas las secciones, modales, toasts).
   - `BottomNavigation` (placeholder "Add comment").
   - `ProfilePage` stats labels (Votos, Me gusta, Seguidores, Seguidos), botones (Editar perfil/Estadísticas/Seguir/Mensaje), toasts y panel "Invitación enviada".
✅ **Bug VS votos en perfil**: `ensure_user_profile` ahora suma también votos de `vs_experiences.questions[].options[].votes` (antes solo contaba `polls`). Endpoint `/user/profile` recalcula en cada GET.


### Sesión May 2026 — Feed V2 (VS-only, aislado para testing de fluidez)
✅ **Nueva ruta `/feed-v2`** dedicada a publicaciones VS, sin tocar `/feed` actual.
✅ **Arquitectura "Video First"** con separación estricta video-layer / UI-layer:
   - `pages/FeedV2Page.jsx` — carga datos (reusa `pollService.getPollsForFrontend` que ya filtra a VS via `MVP_VS_ONLY=true`).
   - `components/feedV2/VSFeedSwiper.jsx` — Swiper v12 vertical con Virtual module (addSlidesBefore=1, addSlidesAfter=2, cache=true, resistance=false, threshold=5, Mousewheel+Keyboard).
   - `components/feedV2/VSSlideV2.jsx` — render condicional por isActive. Memoizado con compare estricto.
   - `components/feedV2/VSVideoLayer.jsx` — capa pura de video. Slot inactivo = sólo `<img>` poster (0 nodes pesados). Slot activo = `<video>` adquirido vía `videoPool.acquire()` imperativo. Memoizado por `option.id` + `isActive`.
   - `components/feedV2/VSOverlayLayer.jsx` — UI overlay separada (autor, votación, like, comments, share). Modales lazy-import via `React.lazy`.
   - `components/feedV2/LikeAnimation.jsx` — corazón animado para doble tap (CSS composite-only).
   - `hooks/useActiveVSSlide.js` — IntersectionObserver para play/pause automático (threshold 0.6).
   - `hooks/useVSGestures.js` — tap (toggle pause/play) vs doble tap (like animado) con timer 280ms.
✅ **VideoPool reutilizado** (`lib/videoPool.js`): pool de 3 `<video>` reciclables con swap-source + lazy-release 30s. Confirmado en runtime: 2 ocupados (lados A+B del slide activo), 1 libre para preload.
✅ **videoTimeCache reutilizado** para restaurar `currentTime` al volver a un post dentro de 30s.
✅ **Eager prefetch del +1** en onTouchStart usando `feedMediaPrefetcher`.
✅ **Modo inmersivo**: `enterTikTokMode()` + `hideRightNavigationBar()` ocultan navegación lateral/inferior global al entrar a `/feed-v2`.
✅ **Acceso**: botón "Probar Feed V2 (beta)" en `SettingsPage` (sección Cuenta, icono Rocket).
✅ **Funciones MVP V2 cableadas**: votación VS (POST `/api/vs/{vs_id}/vote`) optimista con barras de porcentaje, like (POST `/api/polls/{id}/like`), comments y share (modales lazy reusados del feed principal), tap=pause/play, doble tap=like animado.
✅ **Smoke test verificado**: `/feed-v2` carga, muestra 2 lados VS lado-a-lado, badge "FEED V2 · BETA", pool reporta 2 busy/1 free, sólo 2 `<video>` en DOM por slot activo.
⚠️ **Pendiente V2.1** (backlog): multi-pregunta VS (swipe horizontal nested), audio waves decorativos, modo "rápido" con skeleton cuando velocity > 500px/s, follow modal, stories ring.


## Backlog / Próximas mejoras (P2)
- **Wire `videoPool.js` en `PollOptionMedia`** para MP4-only single-option posts (refactor opcional — la infraestructura ya está lista en `frontend/src/lib/videoPool.js`). Requiere reemplazar `<HlsVideo>` por un wrapper que use `pool.acquire/release` en el camino sin HLS.
- **i18n Fase 2**: traducir TikTokScrollView, layouts (VS/Image/Music/Audio), modals (Voters/Share/Comments/Stats).
- **i18n Fase 3**: ContentCreationPage, ChallengeCreationPage, MessagesPage, NotificationsPage.
- **i18n Fase 4**: ExplorePage, Stories, LivePage, AuthPage, EditProfilePage, ChangePasswordPage.
- **Borradores autoguardados por modo en localStorage** (texto/posición/menciones/layout/música por `publicar` y `vs`). Permitiría sobrevivir refreshes.
- Refactor `ContentCreationPage.jsx` (>2200 líneas): extraer `LayoutPreview` y handlers de upload.
- Refactor `CommentsModal.jsx` / `CommentSection.jsx`: lógica condicional `isBottomSheet` + `darkMode` + `isMobile` se está volviendo enredada; consolidar en variantes.
- Tests E2E con testing_agent_v3 cubriendo los 3 modos.

## Endpoints clave
- `POST /api/vs/create` — VS multi-question.
- `POST /api/polls/...` — polls normales.
- `POST /api/challenges/...` — challenges.
- `POST /api/uploads` (vía `uploadService`).
- `GET /api/geolocation` — país del creador para VS.

## Notas críticas
- `dragFiredRef` evita que el click sintético post-drag dispare el toggle de botones.
- `gestureStartRef` se limpia en touchend/mouseup/leave para no arrastrar estado entre gestures.
- Tras rasterizar, `media.transform` se pone en `null` para no re-aplicarlo.
- En VS el rasterizado usa `vsCellSize` (vertical=lado-a-lado, horizontal=arriba/abajo).
