# 📱 Fix de Barra de Estado en Android APK

## ✅ Cambios Realizados

### 1. **Configuración del Plugin StatusBar** (`capacitor.config.json`)
- Agregado plugin `StatusBar` con configuración:
  - `style`: "Dark" (iconos blancos en la barra de estado)
  - `backgroundColor`: "#000000" (fondo negro)
  - `overlaysWebView`: false (evita superposición con el contenido)

### 2. **Actualización del Tema de Android** (`styles.xml`)
- Agregadas propiedades al tema `AppTheme.NoActionBar`:
  - `windowDrawsSystemBarBackgrounds`: true (permite controlar el color de la barra de estado)
  - `statusBarColor`: black (color negro para la barra de estado)
  - `windowLayoutInDisplayCutoutMode`: shortEdges (compatibilidad con notch/cutouts)

### 3. **Inicialización del StatusBar en React** (`App.js`)
- Importado plugin `@capacitor/status-bar`
- Agregado useEffect para configurar la barra de estado en dispositivos nativos
- Aplica configuración solo cuando la app corre en Android/iOS (no en web)

### 4. **CSS SafeArea** (`index.css` + `App.js`)
- Ya existía clase `.safe-area-top` en index.css con `padding-top: env(safe-area-inset-top)`
- Aplicada clase al contenedor principal de la app

### 5. **Sincronización Nativa**
- Ejecutado `npx cap sync android` para aplicar todos los cambios al proyecto Android

---

## 🧪 Cómo Probar el Fix

### Paso 1: Reconstruir la App
En tu máquina local, dentro de la carpeta del proyecto:

```bash
cd frontend
npm run build
npx cap sync android
```

### Paso 2: Abrir el Proyecto en Android Studio
```bash
npx cap open android
```

### Paso 3: Compilar el APK
1. En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. O desde línea de comandos:
```bash
cd android
./gradlew assembleDebug
```

### Paso 4: Instalar en tu Dispositivo
El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔍 Qué Esperar

**ANTES del fix:**
- El contenido de la app se superponía con la barra de notificaciones del móvil
- Los iconos de hora, batería, señal aparecían sobre el contenido de la app

**DESPUÉS del fix:**
- La barra de estado (notificaciones) ahora tiene un espacio separado con fondo negro
- El contenido de la app comienza DEBAJO de la barra de estado
- Los iconos del sistema (hora, batería, etc.) se muestran en la barra negra superior
- El contenido de la app queda completamente visible sin superposiciones

---

## 📝 Archivos Modificados

1. `/app/frontend/capacitor.config.json` - Configuración de StatusBar
2. `/app/frontend/src/App.js` - Inicialización de StatusBar + clase SafeArea
3. `/app/frontend/android/app/src/main/res/values/styles.xml` - Tema Android

---

## ⚠️ Nota Importante

- Este fix solo aplica en **dispositivos nativos** (Android/iOS)
- En el **navegador web** no verás ningún cambio (y está bien así)
- Debes **recompilar el APK** para que los cambios se reflejen
- No olvides hacer `npm run build && npx cap sync android` antes de compilar
