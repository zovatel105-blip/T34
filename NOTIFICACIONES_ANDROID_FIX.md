# 🔔 Fix de Notificaciones Locales - Android

## Problema Identificado
Las notificaciones locales fallaban silenciosamente en Android porque el código estaba intentando usar un ícono (`ic_stat_icon_config_sample`) que **no existía** en las carpetas de recursos de Android.

Android requiere que TODAS las notificaciones tengan un ícono monocromo válido, de lo contrario la notificación simplemente no se muestra (sin mensajes de error).

---

## ✅ Solución Implementada

### 1. Ícono de Notificación Creado
**Archivos creados:**
- `/app/frontend/android/app/src/main/res/drawable-mdpi/ic_stat_notification.png`
- `/app/frontend/android/app/src/main/res/drawable-hdpi/ic_stat_notification.png`
- `/app/frontend/android/app/src/main/res/drawable-xhdpi/ic_stat_notification.png`
- `/app/frontend/android/app/src/main/res/drawable-xxhdpi/ic_stat_notification.png`
- `/app/frontend/android/app/src/main/res/drawable-xxxhdpi/ic_stat_notification.png`
- `/app/frontend/android/app/src/main/res/drawable/ic_stat_notification.xml` (fallback vectorial)

**Características:**
- ✅ **Usa el mismo logo de la app** (ic_launcher_foreground)
- Múltiples densidades para todos los dispositivos
- Formato PNG optimizado para notificaciones
- Fallback XML vectorial para compatibilidad máxima

### 2. Código Actualizado
**Archivo:** `/app/frontend/src/hooks/useLocalNotifications.js`

Cambiado en 2 lugares (líneas 111 y 292):
```javascript
// ANTES ❌
smallIcon: 'ic_stat_icon_config_sample',  // No existía

// AHORA ✅
smallIcon: 'ic_stat_notification',        // Ícono válido
```

---

## 🧪 Cómo Probar (Pasos Exactos)

### Paso 1: Reconstruir el APK
En Android Studio:

1. **Sincronizar proyecto con archivos Gradle:**
   ```
   File → Sync Project with Gradle Files
   ```

2. **Limpiar y reconstruir:**
   ```
   Build → Clean Project
   Build → Rebuild Project
   ```

3. **Generar APK:**
   ```
   Build → Build Bundle(s) / APK(s) → Build APK(s)
   ```

### Paso 2: Instalar en Dispositivo
```bash
adb install -r app-debug.apk
```

### Paso 3: Verificar Notificaciones

**IMPORTANTE:** El ícono de las notificaciones ahora usa el **mismo logo de tu app** (ic_launcher_foreground). Esto garantiza consistencia visual con el resto de la aplicación.

#### A. Verificación Inicial (Permisos)
1. Abre la app
2. Inicia sesión con tu cuenta
3. **Verifica en consola logcat** (desde Android Studio):
   ```
   🔔 Permisos actuales: {...}
   🔔 Resultado solicitud permisos: {...}
   ✅ Permisos de notificaciones locales OTORGADOS
   ✅ Canal de notificaciones creado: default
   ```

#### B. Prueba de Notificación Manual
En el código `useLocalNotifications.js`, **descomenta temporalmente la línea 67**:

```javascript
// Línea 67 - DESCOMENTAR PARA PRUEBA:
await sendTestNotification();
```

Luego:
1. Reconstruir APK
2. Instalar
3. Abrir app e iniciar sesión
4. **Deberías ver una notificación de prueba en ~1 segundo:**
   - Título: "🎉 Notificaciones activas"
   - Cuerpo: "Recibirás alertas de mensajes y actividad."

#### C. Prueba de Polling Real
Con la app abierta y autenticado:

1. **Desde otro dispositivo/navegador**, envía un mensaje al usuario logueado
2. **Espera hasta 20 segundos** (intervalo de polling)
3. Verifica en logcat:
   ```
   🔔 [Notif] 1 nuevos mensajes detectados
   ✅ [Notif] Programada (id=12345): 💬 Nuevo mensaje
   ```
4. **Deberías ver la notificación en la barra de estado de Android**

---

## 🐛 Troubleshooting

### Las notificaciones aún no aparecen

1. **Verificar permisos en el dispositivo:**
   - Ve a `Configuración → Apps → Twyk → Notificaciones`
   - Asegúrate de que estén **ACTIVADAS**

2. **Revisar logcat para errores:**
   ```bash
   adb logcat | grep -E "(Notif|LocalNotifications)"
   ```

3. **Verificar que el ícono se copió correctamente:**
   ```bash
   # En tu máquina local, desde la carpeta del proyecto Android:
   ls -la app/src/main/res/drawable/ic_stat_notification.xml
   ```
   Debe existir y tener contenido válido.

4. **Limpiar caché de Android Studio:**
   ```
   File → Invalidate Caches → Invalidate and Restart
   ```

### El ícono no se ve en la notificación

Esto es normal en algunos dispositivos. Android puede:
- Usar el ícono de la app principal
- Aplicar un tinte de color del sistema
- Solo mostrar un punto/círculo genérico

Lo importante es que **la notificación aparezca**, no el diseño exacto del ícono.

---

## 📱 Comportamiento Esperado

### Notificaciones de Mensajes
- **Trigger:** Nuevo mensaje no leído
- **Título:** "💬 Nuevo mensaje"
- **Cuerpo:** "Tienes X mensaje(s) nuevo(s)"
- **Al tocar:** Navega a `/messages`

### Notificaciones de Actividad
- **Trigger:** Nuevo like, comentario, follow, etc.
- **Títulos:**
  - "❤️ Nuevo like"
  - "💭 Nuevo comentario"
  - "👤 Nuevo seguidor"
  - "@ Mención"
  - "⚔️ Nuevo desafío"
- **Al tocar:** Navega a `/notifications`

### Frecuencia de Polling
- **Intervalo:** Cada 20 segundos mientras la app está abierta
- **Primera verificación:** Inmediata al iniciar sesión
- **Inicialización:** La primera vez NO notifica (solo guarda contadores)

---

## 🔧 Configuración Técnica

### Canal de Notificaciones
```javascript
{
  id: 'default',
  name: 'Notificaciones Generales',
  importance: 5,        // IMPORTANCE_HIGH
  sound: 'default',
  vibration: true,
  lights: true,
  lightColor: '#ff4081'  // Rosa/magenta
}
```

### Permisos Configurados
- `POST_NOTIFICATIONS` ✅
- `VIBRATE` ✅
- `SCHEDULE_EXACT_ALARM` ✅
- `USE_EXACT_ALARM` ✅

---

## ✅ Checklist Final

Antes de declarar el bug como resuelto:

- [ ] Ícono `ic_stat_notification.xml` existe en `res/drawable/`
- [ ] Código actualizado para usar el nuevo ícono
- [ ] APK reconstruido y reinstalado
- [ ] Permisos de notificaciones otorgados en el dispositivo
- [ ] Logcat muestra "Canal de notificaciones creado: default"
- [ ] Notificación de prueba aparece (opcional, si descomentaste línea 67)
- [ ] Notificación real aparece al recibir mensaje/actividad

---

## 📝 Notas Adicionales

- **Producción:** Volver a comentar la línea 67 (notificación de prueba) antes de release
- **iOS:** Este fix es específico de Android. iOS usa un sistema diferente para íconos
- **Migración FCM:** Este sistema de polling se puede migrar fácilmente a Firebase Cloud Messaging en el futuro para notificaciones push reales en segundo plano

---

**Última actualización:** 17 Abril 2025
**Status:** ✅ Implementado - Pendiente de testing en dispositivo físico
