# 📱 Fix Status Bar - Estilo TikTok (Edge-to-Edge)

## ✅ Problema Resuelto
Los elementos se superponían con la barra de estado del sistema. Ahora funciona como TikTok APK.

## 🎯 Comportamiento TikTok Implementado

### Feed / Páginas Oscuras (TikTok Mode)
- ✅ Video/contenido fullscreen DETRÁS de la barra de estado
- ✅ Barra de estado TRANSPARENTE
- ✅ Iconos del sistema (hora, batería, señal) en BLANCO sobre contenido oscuro
- ✅ Header del post (avatar, nombre) posicionado DEBAJO de la barra de estado
- ✅ Sin espacio ni barra visible - experiencia inmersiva

### Páginas Claras (Settings, Messages, Profile, etc.)
- ✅ Contenido empieza DEBAJO de la barra de estado
- ✅ Barra de estado TRANSPARENTE
- ✅ Iconos del sistema en OSCURO sobre fondo blanco
- ✅ Sin superposición de elementos

## 🔧 Cambios Realizados

### 1. Configuración Capacitor (`capacitor.config.json`)
- `overlaysWebView: true` → WebView se extiende detrás de la barra de estado
- `backgroundColor: "#00000000"` → Transparente

### 2. Hook StatusBar (`useStatusBarColor.js`)
- `overlay: true` SIEMPRE (antes era false, causando conflicto)
- Sin color de fondo (transparente nativo)
- Solo cambia estilo de iconos: blancos en páginas oscuras, oscuros en claras

### 3. App.js
- Configuración inicial con `overlay: true`
- Consistente con el modo edge-to-edge nativo

### 4. Hook SafeArea (`useSafeArea.js`)
- Detección robusta de altura de barra de estado
- Múltiples fallbacks: Plugin Capacitor → CSS env() → screen.availTop → heurística
- Variable CSS `--safe-area-inset-top` siempre calculada correctamente

### 5. ResponsiveLayout
- **TikTok mode**: SIN paddingTop → contenido fullscreen detrás de la barra
- **Páginas normales**: CON paddingTop → contenido debajo de la barra

### 6. Páginas con safe area corregido
- ContentSelectionPage, VSCreatePage, VSExperiencePage
- StoryCapturePage, StoryEditPage
- StoriesViewer, BottomNavigation, FollowingPage

### 7. Nativo Android (sin cambios, ya correcto)
- `MainActivity.java`: Edge-to-edge con `setDecorFitsSystemWindows(false)`
- `styles.xml`: Status bar y nav bar transparentes

## 🚀 Para Reconstruir el APK

```bash
cd frontend
yarn build              # o npm run build
npx cap sync android
npx cap open android    # Abre Android Studio
```

En Android Studio:
1. File → Sync Project with Gradle Files
2. Build → Clean Project
3. Build → Rebuild Project / Build APK(s)

## 📊 Antes vs Ahora

### ANTES ❌ (overlay=false + edge-to-edge = CONFLICTO)
```
┌──────────────────────────────────┐
│ 🕐 17:30  📶 🔋                  │ ← Barra de estado
├──────────────────────────────────┤
│ [SUPERPOSICIÓN] elementos UI     │ ← Contenido se superponía
│ se montaban sobre la barra       │
└──────────────────────────────────┘
```

### AHORA ✅ (overlay=true + edge-to-edge = TIKTOK)

**Feed (oscuro):**
```
┌──────────────────────────────────┐
│ 🕐 17:30  📶 🔋  (iconos blancos)│ ← Transparente sobre video
│                                  │
│  [Avatar] @usuario • 2h  [Logo] │ ← Header CON safe-area padding
│                                  │
│  🎬 VIDEO FULLSCREEN             │ ← Contenido detrás de la barra
│                                  │
│  ❤️ 💬 📤 🔖                      │
└──────────────────────────────────┘
```

**Settings (claro):**
```
┌──────────────────────────────────┐
│ 🕐 17:30  📶 🔋  (iconos oscuros)│ ← Transparente sobre fondo blanco
│ [safe-area padding]              │ ← Espacio reservado
│ ← Configuración                  │ ← Contenido DEBAJO de la barra
│ ⚙️ Cuenta                        │
│ 🔒 Privacidad                    │
└──────────────────────────────────┘
```

## ⚠️ Causa Raíz del Problema Original

El código nativo de Android configuraba edge-to-edge (`setDecorFitsSystemWindows(false)`) pero el plugin Capacitor StatusBar configuraba `overlay: false`, lo que internamente llama a `setDecorFitsSystemWindows(true)`. Esta **contradicción** causaba comportamiento impredecible donde algunos elementos se superponían con la barra de estado.

**Solución**: Hacer TODO consistente con `overlay: true` (edge-to-edge) y manejar el espacio de la barra de estado con CSS variables (`--safe-area-inset-top`).
