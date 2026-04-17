# 🔧 Fixes APK - Resumen de cambios aplicados

## Fecha: Julio 2026

## Issues reportados y solución

### 1. ⬇️ "La parte inferior se ve cortada"

**Causa raíz:** El bottom nav no reservaba espacio para la barra de navegación del sistema Android (gesto o 3 botones), y el contenido scrolleable tampoco.

**Fix aplicado:**
- `BottomNavigation.jsx`: `paddingBottom: max(env(safe-area-inset-bottom), 8px)`
- `ResponsiveLayout.jsx`: `paddingBottom: calc(52px + env(safe-area-inset-bottom))` cuando hay bottom nav
- Modo TikTok: mismo ajuste para que los videos no queden detrás del nav

### 2. 🔍 "Búsqueda y detalles de audio no muestran resultados (sin error)"

**Fix aplicado:**
- `searchService.js`: Ahora usa `AppConfig.BACKEND_URL` (más robusto que leer `process.env` directo al cargar módulo)
- `SearchPage.jsx`: Banner visible de error con detalles (URL + mensaje) + botón "Reintentar"
- `AudioDetailPage.jsx`: Error detallado visible (URL + mensaje) + botón "Reintentar"
- Logs añadidos en consola (visibles con Chrome DevTools sobre WebView: `chrome://inspect`)

**💡 Para diagnosticar definitivamente:**
Si al compilar el nuevo APK aún falla, abre Chrome en PC → `chrome://inspect` → localiza tu app
Android → abre DevTools y mira Console + Network. Ahora verás el error exacto.

### 3. 🔔 "Las notificaciones no llegan"

**Causa raíz:** El `id` de la notificación se generaba con `Date.now()` (~1.7 trillones), que **excede el límite Int32** (~2.1 mil millones) que requiere Android. La notificación fallaba silenciosamente.

**Fix aplicado en `useLocalNotifications.js`:**
- Generador de IDs seguros dentro del rango Int32
- Primera verificación inicializa contadores (no notifica eventos viejos al abrir)
- Polling reducido a 20 segundos (antes 30s)
- Permiso verificado con `checkPermissions` + `requestPermissions` explícito
- Canal creado antes de programar notificaciones
- Logs verbosos para depurar

### 4. ⬆️ "Elementos se superponen en la barra de estado al hacer scroll"

**Causa raíz:** Configuración inconsistente — `windowDrawsSystemBarBackgrounds=true` en styles pero `overlaysWebView=false` en Capacitor. Al aplicar edge-to-edge moderno:

**Fix aplicado:**
- `MainActivity.java`: `WindowCompat.setDecorFitsSystemWindows(false)` + status/nav bars transparentes
- `styles.xml`: Barras transparentes, `enforceStatusBarContrast=false`
- `capacitor.config.json`: `StatusBar.overlaysWebView=true`
- `useStatusBarColor.js`: Siempre overlay=true, solo cambia estilo (light/dark)
- CSS `safe-area-top` aplicado al layout principal en páginas no-fullscreen
- `FeedPage.jsx`: Overlays superiores con `top: max(16px, env(safe-area-inset-top) + 8px)`
- `ResponsiveLayout.jsx`: Páginas no-fullscreen reciben padding-top automático

## 📦 Cómo compilar el APK actualizado

```bash
cd /app/frontend
yarn build
npx cap sync android
# Luego abre Android Studio y compila
```

> El paso `yarn build` y `npx cap sync android` ya se ejecutaron por ti en este fix.

## ✅ Archivos modificados

- `android/app/src/main/java/com/votatok/app/MainActivity.java`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/AndroidManifest.xml`
- `capacitor.config.json`
- `src/App.js`
- `src/hooks/useStatusBarColor.js`
- `src/hooks/useLocalNotifications.js`
- `src/components/ResponsiveLayout.jsx`
- `src/components/BottomNavigation.jsx`
- `src/services/searchService.js`
- `src/pages/SearchPage.jsx`
- `src/pages/AudioDetailPage.jsx`
- `src/pages/FeedPage.jsx`
- `src/index.css`
