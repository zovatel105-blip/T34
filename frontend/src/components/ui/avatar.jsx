import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "../../lib/utils"
import { resolveAssetUrl } from "../../utils/resolveAssetUrl"

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props} />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

// 📱 AvatarImage resuelve automáticamente paths relativos como
// "/api/uploads/avatars/xxx.jpg" -> "https://backend.com/api/uploads/..."
// para que funcionen tanto en web como en APK de Capacitor (donde la
// WebView vive en https://localhost).
const AvatarImage = React.forwardRef(({ className, src, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    src={resolveAssetUrl(src)}
    className={cn("aspect-square h-full w-full", className)}
    {...props} />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

// 🖼️ AvatarFallback: cuando no hay foto de perfil (src inválido, falla al
// cargar, o el usuario no tiene avatar) SIEMPRE se muestra la imagen por
// defecto `default-avatar.svg`. Nunca iniciales ni iconos genéricos — esto
// evita "contenido roto" y da una estética uniforme a toda la app.
//
// Los `children` que los componentes pasaban (ej. `<User />` o iniciales)
// se ignoran a propósito: la imagen por defecto toma su lugar.
const AvatarFallback = React.forwardRef(({ className, children: _ignored, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gray-100",
      className
    )}
    {...props}
  >
    <img
      src="/default-avatar.svg"
      alt=""
      draggable={false}
      className="h-full w-full object-cover select-none pointer-events-none"
      onError={(e) => {
        // Defensa extra: si por algún motivo el SVG no carga, dejamos el
        // fondo gris en vez de mostrar un icono roto del navegador.
        e.currentTarget.style.visibility = 'hidden';
      }}
    />
  </AvatarPrimitive.Fallback>
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
