# 🔙 Botón atrás estilo TikTok (Android/Capacitor)

Este proyecto es un WebView con React Router (no React Native), por lo que el
comportamiento que pediste se implementa con el plugin `@capacitor/app`
escuchando el evento `backButton`.

## Flujo implementado

```
          ┌──────────────────────────────────────────────┐
          │          Usuario presiona atrás               │
          └──────────────────────┬───────────────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
     ¿Hay modal/sheet?    ¿Estamos en raíz?     Otra ruta
     (CommentsModal,      (/feed, /explore,     (perfil, audio,
      ShareModal,...)      /)                    mensajes, etc.)
             │                   │                   │
             ▼                   ▼                   ▼
     Cerrar modal     1er tap → Toast         navigate(-1)
                      "Presiona de nuevo
                       para salir"
                      2do tap <2s → exitApp()
```

## Archivos clave

### `/app/frontend/src/hooks/useBackButton.js`
- Hook global, ya está llamado en `App.js`
- Bug arreglado: `CapacitorApp.addListener()` ahora se espera con `await`
  (antes se hacía `.remove()` sobre una Promise → no funcionaba)
- Usa refs para `path` y `navigate` → sin stale closures
- Ventana de doble tap de 2 segundos
- Si no hay historial → redirige a `/feed` (no crashea)

### Nuevo: `useModalBackButton(isOpen, onClose)`
Hook auxiliar que cada modal importa. Escucha el evento `app:backbutton`
y cierra el modal. Previene que la app salga mientras hay un modal abierto.

## Modales actualizados

Todos ahora se cierran con el botón/gesto atrás del sistema:

- ✅ `CommentsModal`
- ✅ `ShareModal`
- ✅ `VotersModal`
- ✅ `PostDetailModal`
- ✅ `ChallengeParticipantsModal`
- ✅ `EditProfileModal`
- ✅ `ChangePasswordModal`
- ✅ `SettingsSelectModal`
- ✅ `TikTokCropModal`

## Cómo agregar soporte a un nuevo modal

```jsx
import { useModalBackButton } from '../hooks/useBackButton';

const MyModal = ({ isOpen, onClose }) => {
  // ¡Una sola línea!
  useModalBackButton(isOpen, onClose);

  // ...resto del componente
};
```

## Rutas "raíz" (doble tap para salir)

Configurado en `useBackButton.js`:

```js
const ROOT_ROUTES = ['/feed', '/explore', '/'];
```

Si quieres añadir más rutas raíz (p. ej. `/following`), edita este array.

## Notas

- El swipe/gesto de atrás de Android 10+ dispara el mismo evento que el
  botón físico, así que todo funciona idéntico.
- `CapacitorApp.exitApp()` cierra la app limpiamente sin crashear.
- Si algún toast queda pegado tras salir/entrar, se auto-descarta a los 2s.
