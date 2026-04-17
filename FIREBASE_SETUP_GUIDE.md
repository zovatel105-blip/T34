# 🔔 Guía Completa: Configurar Firebase Push Notifications

## 📋 Tabla de Contenidos
1. [Crear Proyecto Firebase](#1-crear-proyecto-firebase)
2. [Obtener Credenciales](#2-obtener-credenciales)
3. [Configurar Android](#3-configurar-android)
4. [Configurar Backend](#4-configurar-backend)
5. [Probar Notificaciones](#5-probar-notificaciones)

---

## 1️⃣ Crear Proyecto Firebase

### Paso 1.1: Ir a Firebase Console
1. Abre https://console.firebase.google.com/
2. Haz clic en **"Agregar proyecto"** o **"Add project"**
3. Nombre del proyecto: **Twyk** (o el nombre que prefieras)
4. Acepta los términos y haz clic en **Continuar**
5. Desactiva Google Analytics (opcional, no es necesario para push notifications)
6. Haz clic en **Crear proyecto**
7. Espera a que se cree el proyecto (30-60 segundos)

### Paso 1.2: Agregar App Android
1. En la página principal del proyecto, haz clic en el ícono de **Android** 
2. Llena los siguientes campos:
   - **Android package name**: `com.twyk.app` (debe coincidir con tu APK)
   - **App nickname**: Twyk Android
   - **Debug signing certificate**: Déjalo vacío por ahora
3. Haz clic en **Registrar app**

---

## 2️⃣ Obtener Credenciales

### Paso 2.1: Descargar `google-services.json` (Para Android)
1. En la misma pantalla de registro de app Android, haz clic en **Descargar google-services.json**
2. **Guarda este archivo** - lo usarás en el paso 3

### Paso 2.2: Obtener `firebase-admin.json` (Para Backend)
1. En Firebase Console, ve a **⚙️ Configuración del proyecto** (Project Settings)
2. Ve a la pestaña **Cuentas de servicio** (Service accounts)
3. Haz clic en **Generar nueva clave privada** (Generate new private key)
4. Aparecerá un popup de confirmación, haz clic en **Generar clave**
5. Se descargará un archivo JSON con un nombre largo tipo: `twyk-abc123-firebase-adminsdk-xyz.json`
6. **Renombra este archivo a `firebase-admin.json`**

---

## 3️⃣ Configurar Android

### Paso 3.1: Copiar `google-services.json` al proyecto
```bash
# En tu máquina local, dentro de la carpeta del proyecto:
cp ruta/al/archivo/google-services.json frontend/android/app/google-services.json
```

### Paso 3.2: Verificar configuración de Capacitor
El archivo `capacitor.config.json` ya está configurado con el plugin de StatusBar y PushNotifications. ✅

### Paso 3.3: Sincronizar proyecto Android
```bash
cd frontend
npx cap sync android
```

### Paso 3.4: Actualizar Firebase versión en Android (si es necesario)
Si encuentras errores al compilar, abre `frontend/android/build.gradle` y verifica que tenga:

```gradle
buildscript {
    dependencies {
        // ...
        classpath 'com.google.gms:google-services:4.4.0'  // Firebase plugin
    }
}
```

Y en `frontend/android/app/build.gradle` al final del archivo:
```gradle
apply plugin: 'com.google.gms.google-services'
```

---

## 4️⃣ Configurar Backend

### Paso 4.1: Copiar credenciales al backend
```bash
# En tu máquina local:
# Sube el archivo firebase-admin.json a tu servidor

# O si estás en Emergent, crea el archivo manualmente:
nano /app/backend/firebase-admin.json

# Pega el contenido del archivo JSON que descargaste en el paso 2.2
# Guarda con Ctrl+O, Enter, y sal con Ctrl+X
```

**IMPORTANTE**: Este archivo contiene credenciales sensibles. **NO lo subas a Git**.

### Paso 4.2: El backend ya está configurado ✅
Los siguientes archivos ya están creados:
- ✅ `/app/backend/push_notification_service.py` - Servicio de Firebase
- ✅ `/app/backend/push_routes.py` - API endpoints para FCM
- ✅ `/app/backend/push_helpers.py` - Funciones helper para eventos
- ✅ Firebase Admin SDK instalado en requirements.txt

---

## 5️⃣ Probar Notificaciones

### Paso 5.1: Reiniciar el backend
```bash
cd /app/backend
sudo supervisorctl restart backend
```

### Paso 5.2: Compilar y probar APK
```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
```

En Android Studio:
1. Compila el APK: **Build → Build APK**
2. Instala en tu dispositivo Android
3. Abre la app y haz login

### Paso 5.3: Enviar notificación de prueba
La app automáticamente registrará el token FCM cuando:
- El usuario hace login exitosamente
- La app se abre en primer plano

Puedes probar enviando una notificación de prueba desde el backend:

**Opción A: Desde la API (recomendado)**
```bash
# Obtén el token de autenticación
TOKEN="tu_token_jwt_aqui"

# Enviar notificación de prueba
curl -X POST https://tu-backend-url/api/push/test-notification \
  -H "Authorization: Bearer $TOKEN"
```

**Opción B: Desde Firebase Console**
1. Ve a Firebase Console → **Cloud Messaging**
2. Haz clic en **Enviar tu primer mensaje**
3. Llena el título y texto
4. En **Target**, selecciona tu app Android
5. Haz clic en **Revisar** y luego **Publicar**

---

## 🎯 Eventos que Envían Notificaciones

Una vez configurado, la app enviará notificaciones automáticamente para:

| Evento | Descripción | Configuración de Usuario |
|--------|-------------|--------------------------|
| 💬 **Mensaje nuevo** | Cuando recibes un mensaje directo | `push_notifications` + `allow_messages` |
| 💭 **Comentario** | Cuando alguien comenta tu contenido | `push_notifications` + `notifications_comments` |
| ❤️ **Like** | Cuando alguien le da like a tu contenido | `push_notifications` + `notifications_likes` |
| 👤 **Nuevo seguidor** | Cuando alguien te sigue | `push_notifications` + `notifications_follows` |
| 🗳️ **Voto** | Cuando alguien vota en tu poll | `push_notifications` |
| ⚔️ **Challenge** | Invitaciones y resultados de batallas | `push_notifications` |
| @ **Mención** | Cuando te mencionan en un comentario | `push_notifications` + `notifications_mentions` |

---

## 🔧 Troubleshooting

### Problema: "firebase-admin.json not found"
**Solución**: Verifica que el archivo `firebase-admin.json` esté en `/app/backend/` y tenga el formato correcto JSON.

### Problema: "google-services.json not found"
**Solución**: Verifica que el archivo esté en `frontend/android/app/google-services.json` y ejecuta `npx cap sync android`.

### Problema: No llegan notificaciones
**Checklist**:
1. ✅ ¿El token FCM se registró correctamente? (verifica logs del backend)
2. ✅ ¿El usuario tiene notificaciones habilitadas en su perfil?
3. ✅ ¿El backend puede conectarse a Firebase? (verifica logs de inicialización)
4. ✅ ¿La app tiene permisos de notificaciones en Android?

### Problema: "Token is invalid or unregistered"
**Solución**: El token FCM puede expirar. La app automáticamente registrará un nuevo token al abrirse de nuevo.

---

## 📚 Recursos Adicionales

- [Documentación oficial de Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Admin SDK para Python](https://firebase.google.com/docs/admin/setup)

---

## ✅ Checklist Final

Antes de considerar completada la configuración:

- [ ] Proyecto Firebase creado
- [ ] `google-services.json` descargado y copiado a `frontend/android/app/`
- [ ] `firebase-admin.json` descargado y copiado a `/app/backend/`
- [ ] Backend reiniciado sin errores
- [ ] APK compilado e instalado en dispositivo Android
- [ ] Token FCM registrado exitosamente (verificar logs)
- [ ] Notificación de prueba enviada y recibida

---

**¿Necesitas ayuda?** Revisa los logs del backend en `/var/log/supervisor/backend.err.log` para ver mensajes de error detallados.
