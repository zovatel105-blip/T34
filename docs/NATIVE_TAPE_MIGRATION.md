# 🎬 Twyk — Migración del Feed a Tape Nativa
## Roadmap de cierre de la brecha con TikTok

> **Objetivo**: Llevar el feed de Twyk de "fluido dentro del WebView" → "indistinguible de TikTok en gama media Android".  
> **Premisa**: React + Capacitor tiene un techo estructural. Para superarlo hay que mover las capas calientes (gesto + video) a código nativo.  
> **Estado actual**: TIER 1 de optimización React aplicado (HLS, fast-scroll, preconnect, etc.). La brecha restante es estructural, no de código JS.

---

## 📊 Diagnóstico de la brecha estructural

| Capa | TikTok (nativo) | Twyk hoy (React WebView) | Brecha |
|---|---|---|---|
| **Gesto swipe** | Native touch handler → RenderThread compositor | React `onTouchMove` → JS main thread → CSS transform | 60fps garantizado vs. 30-50fps con jitter |
| **Decoder video** | ExoPlayer/AVPlayer en RenderThread | `<video>` + hls.js en main thread | 0 contention vs. compite con React |
| **Recycling de cards** | RecyclerView ViewHolder (1 sola View reusada) | 3 slots con React.memo (5000 líneas reconciliadas/swipe) | Coste 0 vs. 30-80ms/swipe |
| **Audio focus** | OS AudioFocus / AVAudioSession | 2 useEffects en JS races | 0ms transición vs. 100-200ms |
| **Layout repaint** | Compositor independiente | Main thread paint | 0 vs. box-shadow/blur en CPU |

---

## 🎯 Estrategia general: migración por fases incrementales

**NO** migrar todo de golpe. Cada fase aporta ~30-40% de la brecha y se puede liberar a producción independientemente.

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 0 (HECHO) — TIER 1 optimizaciones React                    │ 
│ HLS startLevel 360p, fast-scroll suspension, preconnect, etc.   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1 (3-5 días) — Native gesture + Native scroll container    │
│ El gesto y la animación del tape se mueven a nativo.            │
│ React sigue renderizando el contenido de cada card.             │
│ Mejora: 60fps garantizado en el swipe, sin jitter.              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FASE 2 (5-7 días) — Native video player overlay                 │
│ Los videos se reproducen con ExoPlayer/AVPlayer (no <video>).   │
│ React renderiza el resto (texto, botones, modales).             │
│ Mejora: arranque de video <100ms, 0 lag de decoder.             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FASE 3 (10-14 días) — Full RecyclerView tape (opcional)         │
│ El tape completo es nativo. Cada slot es un WebView pooleado.   │
│ Mejora: indistinguible de TikTok. Solo necesario si gama baja.  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 FASE 1 — Native Gesture + Native Scroll Container

### Resumen
- **Tiempo**: 3-5 días (1 dev nativo experimentado)
- **Riesgo**: 🟡 Medio
- **Mejora percibida**: ~40% del cierre de brecha (gesto = lo primero que el usuario siente)

### Qué cambia

#### Capacitor Plugin nuevo: `@twyk/native-tape`

```typescript
interface NativeTapePlugin {
  /** Inicializa el container nativo encima del WebView principal */
  mount(opts: {
    slotCount: number;        // 3 (PREV/CUR/NEXT)
    slotHeight: 'dvh' | 'px'; 
    initialIndex: number;
    overscrollMode: 'rubber-band' | 'none';
  }): Promise<void>;

  /** El WebView le dice al nativo qué post está en cada slot */
  setSlotContent(slotIndex: number, pollId: string): Promise<void>;

  /** Programáticamente saltar a un índice (deep-link, "go to top") */
  goToIndex(index: number, opts?: { animate: boolean; duration: number }): Promise<void>;

  /** Listeners — el nativo dispara hacia JS */
  addListener(event: 'swipeStart',   cb: (e: SwipeStartEvent) => void);
  addListener(event: 'swipeProgress', cb: (e: SwipeProgressEvent) => void);
  addListener(event: 'swipeCommit',  cb: (e: SwipeCommitEvent) => void);   // post cambió
  addListener(event: 'swipeCancel',  cb: () => void);                       // dedo soltado sin commit
  addListener(event: 'velocityHint', cb: (e: { px_per_ms: number }) => void); // para fast-scroll suspension

  /** Para destruir al salir del feed */
  unmount(): Promise<void>;
}
```

#### Implementación nativa

##### Android (Kotlin)
- **Component**: `androidx.viewpager2.widget.ViewPager2` con `RecyclerView.Adapter`
- Cada "page" del ViewPager renderiza un `FrameLayout` con un sub-WebView que carga la URL `/card/{pollId}` (route nuevo)
- O alternativa más simple: usar 3 `WebView` pooleados como ViewHolders
- Touch listener nativo en el ViewPager → dispara eventos al main WebView vía bridge
- `OverScroller` nativo para el momentum scroll de TikTok

```kotlin
class NativeTapePlugin : Plugin() {
  private lateinit var viewPager: ViewPager2
  
  @PluginMethod
  fun mount(call: PluginCall) {
    val rootView = activity.findViewById<ViewGroup>(android.R.id.content)
    viewPager = ViewPager2(activity).apply {
      orientation = ViewPager2.ORIENTATION_VERTICAL
      offscreenPageLimit = 1  // 3 slots: PREV + CUR + NEXT
      adapter = TapeAdapter(this@NativeTapePlugin)
    }
    rootView.addView(viewPager, MATCH_PARENT, MATCH_PARENT)
    
    viewPager.registerOnPageChangeCallback(object : OnPageChangeCallback() {
      override fun onPageSelected(position: Int) {
        notifyListeners("swipeCommit", JSObject().put("index", position))
      }
    })
  }
}
```

##### iOS (Swift)
- **Component**: `UIPageViewController` con `transitionStyle = .scroll`, `navigationOrientation = .vertical`
- O `UICollectionView` con `UICollectionViewCompositionalLayout` y paginación
- `UIPanGestureRecognizer` nativo, dispara `WKScriptMessageHandler` al WebView principal

### Lo que se reusa
- ✅ Todo el código de React (cards, layouts, modales)
- ✅ Todo el código de HLS, optimizaciones, fast-scroll
- ✅ Backend completo

### Lo que se reescribe
- ❌ `TikTokScrollView.jsx` → wrapper minimalista del plugin nativo (~200 líneas vs. 2983)
- ❌ Toda la lógica de gesto/momentum/snap-to-target (líneas 2302-2510)
- ❌ Las animaciones de `transform: translate3d` del tape

### Retos técnicos
1. **Sincronización JS ↔ Native**: el WebView principal tiene la auth/contexts. Si vamos por la ruta "1 WebView por card", cada uno necesita compartir estado → diseñar SharedPreferences/UserDefaults bridge.
2. **Mejor opción inicial**: NO usar sub-WebViews. Mantener un solo WebView con tu app React entera, y poner el ViewPager NATIVO COMO un overlay invisible que captura el touch y le dice a JS cuándo conmutar. JS sigue renderizando los 3 slots como ahora. Solo cambia: el gesto y el snap son nativos.
3. **z-order con modales**: cuando se abre CommentsModal, el ViewPager debe desactivarse para no robar el gesto. Plugin necesita método `setEnabled(false)`.

### Criterios de éxito
- [ ] Swipe en gama media Android (Pixel 4a / Galaxy A52) sostiene 60fps verificado con `adb shell dumpsys SurfaceFlinger`
- [ ] Latencia entre dedo↑ y commit de post < 150ms
- [ ] 0 jitter perceptible durante el momentum scroll
- [ ] Fallback funcional si plugin no disponible (web build, dev) → cae al actual `TikTokScrollView`

---

## 🎥 FASE 2 — Native Video Player overlay

### Resumen
- **Tiempo**: 5-7 días
- **Riesgo**: 🟠 Medio-Alto
- **Mejora percibida**: ~40% adicional del cierre de brecha (esto es lo que el usuario ve)

### Qué cambia

#### Capacitor Plugin nuevo: `@twyk/native-video`

```typescript
interface NativeVideoPlugin {
  /** Pinta un video nativo en coordenadas exactas sobre el WebView */
  attach(opts: {
    instanceId: string;       // único por slot
    url: string;              // HLS m3u8 o MP4
    posterUrl?: string;
    rect: { x: number; y: number; width: number; height: number };
    autoplay: boolean;
    muted: boolean;
    loop: boolean;
    startLevel?: 0 | 1 | 2;   // 360p/540p/720p para HLS
  }): Promise<void>;

  detach(instanceId: string): Promise<void>;

  play(instanceId: string): Promise<void>;
  pause(instanceId: string): Promise<void>;
  seek(instanceId: string, timeSec: number): Promise<void>;

  /** Cuando el WebView hace scroll, hay que reposicionar el video nativo */
  updateRect(instanceId: string, rect: Rect): Promise<void>;

  addListener(event: 'firstFrame', cb: (e: { instanceId: string }) => void);
  addListener(event: 'buffering', cb: (e: { instanceId: string }) => void);
  addListener(event: 'ended', cb: (e: { instanceId: string }) => void);
  addListener(event: 'error', cb: (e: { instanceId: string; error: string }) => void);
}
```

#### Implementación nativa

##### Android (Kotlin) — usando Media3 ExoPlayer
- ExoPlayer es la librería que usa TikTok, YouTube, Netflix
- Soporta HLS nativo, MP4, DASH, hardware decoding
- API: `androidx.media3:media3-exoplayer-hls`

```kotlin
class NativeVideoPlugin : Plugin() {
  private val players = mutableMapOf<String, ExoPlayer>()
  private val playerViews = mutableMapOf<String, PlayerView>()

  @PluginMethod
  fun attach(call: PluginCall) {
    val instanceId = call.getString("instanceId")!!
    val url = call.getString("url")!!
    val rect = call.getObject("rect")
    
    val player = ExoPlayer.Builder(context).build()
    val playerView = PlayerView(context).apply {
      this.player = player
      useController = false
      setBackgroundColor(Color.BLACK)
      layoutParams = FrameLayout.LayoutParams(rect.getInt("width"), rect.getInt("height")).apply {
        leftMargin = rect.getInt("x")
        topMargin = rect.getInt("y")
      }
    }
    
    activity.findViewById<ViewGroup>(android.R.id.content).addView(playerView)
    
    val mediaSource = if (url.endsWith(".m3u8")) {
      HlsMediaSource.Factory(DefaultHttpDataSource.Factory()).createMediaSource(MediaItem.fromUri(url))
    } else {
      ProgressiveMediaSource.Factory(...).createMediaSource(...)
    }
    
    player.setMediaSource(mediaSource)
    player.prepare()
    if (call.getBoolean("autoplay") == true) player.play()
    
    players[instanceId] = player
    playerViews[instanceId] = playerView
  }
}
```

##### iOS (Swift) — usando AVPlayer + AVPlayerLayer
```swift
class NativeVideoPlugin: CAPPlugin {
  private var players: [String: AVPlayer] = [:]
  private var layers: [String: AVPlayerLayer] = [:]

  @objc func attach(_ call: CAPPluginCall) {
    let instanceId = call.getString("instanceId")!
    let url = URL(string: call.getString("url")!)!
    let rect = call.getObject("rect")!
    
    let player = AVPlayer(url: url)
    let layer = AVPlayerLayer(player: player)
    layer.frame = CGRect(
      x: rect["x"] as! CGFloat,
      y: rect["y"] as! CGFloat,
      width: rect["width"] as! CGFloat,
      height: rect["height"] as! CGFloat
    )
    
    bridge?.webView?.superview?.layer.insertSublayer(layer, below: bridge?.webView?.layer)
    
    if call.getBool("autoplay") == true { player.play() }
    
    players[instanceId] = player
    layers[instanceId] = layer
  }
}
```

#### Cambios en React
- `HlsVideo.jsx` se reemplaza por `NativeVideoSurface.jsx`:
  - En vez de renderizar `<video>`, renderiza un `<div>` vacío con `ref`
  - En `useEffect`, llama a `NativeVideo.attach(...)` con el rect del div
  - En `useEffect` cleanup, llama a `NativeVideo.detach(...)`
  - En `ResizeObserver`, llama a `NativeVideo.updateRect(...)`

### Lo que se reusa
- ✅ Todo el código de PollOptionMedia (lógica de selección de URL)
- ✅ HLS URLs ya generadas en backend
- ✅ Backend completo
- ✅ Posters (se muestran en `<img>` de React hasta que llega `firstFrame` del nativo)

### Lo que se reescribe
- ❌ `HlsVideo.jsx` (235 líneas) → `NativeVideoSurface.jsx` (~150 líneas)
- ❌ `useHlsVideo.js` (208 líneas) → ya no se usa
- ❌ `videoMemoryManager.js` → reemplazado por gestión nativa

### Retos técnicos críticos
1. **🔴 Z-order**: el video nativo se pinta DEBAJO o ENCIMA del WebView. Si va encima, los botones de React (like, share, comments) quedan ocultos. Si va debajo, hay que hacer el WebView transparente en esa zona (`webView.setBackgroundColor(Color.TRANSPARENT)` + body sin fondo). Esto se hace pero requiere coordinación con CSS.
2. **🔴 Touch passthrough**: si el video va encima del WebView, los toques en los botones no llegan a React. Hay que implementar passthrough: native View con `setOnTouchListener` que devuelva `false` (no consume), o usar hit-test custom.
3. **🟡 Sync scroll**: cuando el tape se mueve (swipe), el video nativo tiene que moverse a la par. Si el move es nativo (Fase 1 ya aplicada), el plugin puede animar el AVPlayerLayer en el mismo timeline. Si el move sigue siendo CSS, hay desincronización (CSS anima a 60fps pero los `updateRect` llegan a 30fps por el bridge).
4. **🟡 Modales**: cuando se abre CommentsModal, queda DEBAJO del video nativo. Hay que llamar a `setZOrder(below_webview)` cuando un modal está abierto.

### Mitigación recomendada
- Hacer Fase 2 SOLO DESPUÉS de Fase 1. Con el tape nativo, el sync de posición es trivial (mismo timeline).
- Hacer prototipo de "1 sólo video activo" primero. Solo el slot CUR usa video nativo. PREV/NEXT siguen con `<video>` de WebView. Cuando funciona perfectamente, expandir.

### Criterios de éxito
- [ ] Primer frame del video < 100ms tras commit del swipe (vs. 250-400ms actuales en HLS)
- [ ] Decoder isolation: durante el swipe, el video del CUR NO se congela
- [ ] Memoria: 3 ExoPlayer pooleados + reciclados = <120MB (vs. los actuales 3 `<video>` + hls.js de ~180MB)
- [ ] HLS funciona con ABR (sube de 360p a 720p al estabilizarse)

---

## 🏗️ FASE 3 — Full RecyclerView Tape (OPCIONAL)

### Resumen
- **Tiempo**: 10-14 días
- **Riesgo**: 🔴 Alto
- **Mejora percibida**: ~20% adicional (rendimientos decrecientes)

### Cuándo hace sentido hacerlo
- Solo si tu target incluye **gama baja Android (Snapdragon 4xx, <3GB RAM)** y tras Fase 2 sigue habiendo jitter en esos dispositivos
- O si quieres soportar feeds infinitos (>10K posts) sin degradar — el tape actual con virtualización 3-slot lo hace ya en teoría, pero el accounting de React acumula

### Qué cambia
Cada slot es un sub-WebView independiente con su propio bundle ligero (sin auth, sin contexts, solo render de card). El WebView principal hace de orchestrador.

### Por qué probablemente NO lo necesitas
- Twyk en gama media-alta con Fase 1 + Fase 2 va a ir a 60fps sólidos
- Twyk en gama baja con Fase 1 + Fase 2 va a ir a 45-55fps, perceptiblemente fluido
- El paso de 55fps → 60fps en gama baja con Fase 3 es invisible al 95% de usuarios
- El coste (10-14 días + complejidad de mantenimiento perpetua) no compensa para una mejora marginal

### Recomendación
**No hacer Fase 3 hasta tener métricas reales de producción** que digan "los usuarios de gama baja churnean por el feed". Si ese dato no existe, no es el cuello de botella.

---

## 💰 Análisis coste-beneficio

| Fase | Días dev | Mejora fluidez | Riesgo | Recomendación |
|---|---|---|---|---|
| 0 (hecho) | — | +30% vs. baseline | — | ✅ Done |
| 1 (gesto nativo) | 3-5 | +40% adicional | 🟡 Medio | ⭐ HACER |
| 2 (video nativo) | 5-7 | +40% adicional | 🟠 Alto | ⭐ HACER |
| 3 (full tape) | 10-14 | +20% adicional | 🔴 Muy alto | ⏸️ ESPERAR |

**Total Fase 1+2**: 8-12 días → 95% de la fluidez TikTok.  
**Total Fase 1+2+3**: 18-26 días → 100% (techo teórico).

---

## 👥 Perfil del dev recomendado

Para Fase 1 + Fase 2 necesitas a alguien con:
- ✅ Capacitor plugin development (TypeScript + Native bridges)
- ✅ Android: Kotlin + ExoPlayer (Media3) + ViewPager2
- ✅ iOS: Swift + AVPlayer + UIPageViewController
- ✅ Experiencia con WebView ↔ Native bridges (`WKWebView`, `WebView`)
- ⚠️ NO necesita ser experto en React (apenas tocará 2-3 archivos JS)

**Senior junior Android/iOS con experiencia en hybrid apps**. NO contratar un "React dev fullstack" para esto — es trabajo nativo casi 100%.

Tiempo estimado real (con cushion para testing en devices):
- **Solo Android**: 8-12 días
- **Solo iOS**: 8-12 días
- **Ambas plataformas en paralelo (2 devs)**: 8-12 días
- **Una sola persona ambas plataformas**: 16-22 días

---

## 🧪 Estrategia de validación

### Métricas objetivas (antes y después)
1. **Frame budget**: `chrome://inspect` → Performance recording → FPS durante 10 swipes consecutivos
2. **Touch-to-commit latency**: hook custom que mida del `touchstart` al `setActiveIndex(new)` — target <150ms
3. **First-frame time**: del commit al firstFrame del nuevo video — target <100ms
4. **Memory**: `adb shell dumpsys meminfo com.twyk` — target <250MB en idle, <350MB en feed activo

### Métricas subjetivas (UX testing)
- 5 usuarios reales, gama media (Galaxy A52, Pixel 4a)
- Pregunta: "¿Notas diferencia con TikTok en fluidez?" — escala 1-10
- Antes (estado actual con TIER 1): 5-7
- Target después de Fase 1+2: 9-10

### Plan de rollback
- Plugin con feature flag por `localStorage`: `?native=0` cae al React swiper actual
- Backend devuelve flag `feature_native_tape` en `/api/users/me` — control remoto sin redeploy
- Si en producción aparecen crashes nativos, flag se desactiva server-side, todos vuelven al React swiper instantáneamente

---

## 📅 Cronograma sugerido

### Semana 1 (Fase 1)
- L-M: Setup plugin Android (skeleton, ViewPager2, bridge events)
- X: Setup plugin iOS (skeleton, UIPageViewController)
- J: Integración React (wrapper `TikTokScrollView` que detecta `Capacitor.isNativePlatform()`)
- V: Testing en devices, ajuste de animaciones, rollback flag

### Semana 2 (Fase 2 — Android)
- L: ExoPlayer skeleton + HLS basic
- M: Posicionamiento sobre WebView + transparencia
- X: Touch passthrough + z-order con modales
- J: ABR validation, ResizeObserver sync
- V: Testing en devices, memory profiling

### Semana 3 (Fase 2 — iOS)
- L: AVPlayer skeleton + HLS basic
- M: AVPlayerLayer positioning + transparencia
- X: Sync con UIPageViewController
- J: Touch handling + modal z-order
- V: Testing en devices iOS, parity check Android↔iOS

### Total: 3 semanas de 1 dev nativo, o 2 semanas de 2 devs (Android + iOS en paralelo)

---

## 🔚 TL;DR para decisión

**Si el feedback de usuarios es "se siente lento"**:
→ Hacer Fase 1 + Fase 2. ~3 semanas, gana 80-95% de la fluidez TikTok.

**Si el feedback es "perfecto pero quiero que sea idéntico a TikTok"**:
→ Hacer Fase 1 + 2 + 3. ~5 semanas. 

**Si no hay budget/tiempo para nativo**:
→ Asumir que React WebView tiene techo. Aplicar los 6 fixes que propuse antes (F1-F6) — cierran ~30% adicional sobre el TIER 1 actual y son ~2 horas de trabajo.

---

## 📚 Referencias para el dev nativo

- **ExoPlayer Media3**: https://developer.android.com/jetpack/androidx/releases/media3
- **AVPlayer + AVPlayerLayer**: https://developer.apple.com/documentation/avfoundation/avplayerlayer
- **Capacitor plugin guide**: https://capacitorjs.com/docs/plugins/creating-plugins
- **ViewPager2 + RecyclerView**: https://developer.android.com/training/animation/vp2-migration
- **WebView transparency Android**: `webView.setBackgroundColor(Color.TRANSPARENT)` + `setLayerType(LAYER_TYPE_HARDWARE, null)`
- **WKWebView transparency iOS**: `webView.isOpaque = false; webView.backgroundColor = .clear`

---

*Documento generado: julio 2025. Twyk pre-launch optimización feed.*
