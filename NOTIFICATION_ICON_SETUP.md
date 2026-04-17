# Configuración de Icono de Notificación en Android

## Icono de Notificación (`ic_stat_notification`)

Para que las notificaciones push se vean correctamente en Android, necesitas agregar un icono personalizado.

### Opción 1: Usar icono existente (temporal)
Si no tienes un icono personalizado todavía, puedes comentar la línea del icono en el código:

En `/app/backend/push_notification_service.py`, línea ~78:
```python
android_config = messaging.AndroidConfig(
    priority='high',
    notification=messaging.AndroidNotification(
        # icon='ic_stat_notification',  # Comentar esta línea temporalmente
        color='#9333ea',
        sound='default',
        channel_id='default_channel'
    )
)
```

### Opción 2: Agregar icono personalizado (recomendado)

1. **Generar el icono**:
   - Usa Android Asset Studio: https://romannurik.github.io/AndroidAssetStudio/icons-notification.html
   - Sube tu logo/icono
   - El icono debe ser **monocromático** (blanco sobre transparente)
   - Descarga el ZIP con los recursos

2. **Copiar archivos al proyecto**:
```bash
# Descomprime el ZIP descargado
# Dentro encontrarás carpetas: res/drawable-*dpi/

# Copia los archivos a tu proyecto Android:
cp -r res/drawable-* frontend/android/app/src/main/res/
```

3. **Estructura esperada**:
```
frontend/android/app/src/main/res/
├── drawable-mdpi/
│   └── ic_stat_notification.png    (24x24px)
├── drawable-hdpi/
│   └── ic_stat_notification.png    (36x36px)
├── drawable-xhdpi/
│   └── ic_stat_notification.png    (48x48px)
├── drawable-xxhdpi/
│   └── ic_stat_notification.png    (72x72px)
└── drawable-xxxhdpi/
    └── ic_stat_notification.png    (96x96px)
```

4. **Sincronizar cambios**:
```bash
cd frontend
npx cap sync android
```

### Verificar en Android Studio
1. Abre el proyecto: `npx cap open android`
2. Navega a: `app/src/main/res/drawable-*/`
3. Verifica que existan los archivos `ic_stat_notification.png`

---

**Nota**: Si no agregas el icono personalizado, Android usará el icono de la app por defecto, pero puede que no se vea bien en la barra de notificaciones (debe ser monocromático).
