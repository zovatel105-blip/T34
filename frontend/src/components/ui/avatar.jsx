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

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props} />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
