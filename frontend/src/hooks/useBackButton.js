/**
 * useBackButton Hook (estilo TikTok para Android/Capacitor)
 *
 * Comportamiento del botón "atrás" / gesto de retroceso:
 *
 *   1. Modal/sheet/drawer abierto  →  lo cierra (dispatch evento)
 *   2. Página raíz (/feed, /explore, /)  →  doble tap para salir de la app
 *   3. Resto de páginas  →  navega hacia atrás (navigate(-1))
 *   4. Si no hay historial  →  redirige al feed
 *
 * En Capacitor 7, `CapacitorApp.addListener` devuelve una Promise<PluginListenerHandle>,
 * por lo que hay que esperar a que se resuelva antes de poder llamar a `.remove()`.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useToast } from './use-toast';

// Rutas que se consideran "raíz" - requieren doble tap para salir
const ROOT_ROUTES = ['/feed', '/explore', '/'];

// Nombre del evento que se dispara cuando se presiona back y hay que
// cerrar un modal/sheet en lugar de navegar. Los componentes modales
// deben escucharlo y llamar a event.preventDefault() para marcar que
// "ya manejaron" el back.
export const BACK_BUTTON_EVENT = 'app:backbutton';

/**
 * Dispara el evento de back button y devuelve `true` si algún listener
 * lo manejó (llamando a event.preventDefault()).
 */
const dispatchBackButtonEvent = () => {
  const event = new CustomEvent(BACK_BUTTON_EVENT, {
    cancelable: true,
    bubbles: false
  });
  const notCancelled = window.dispatchEvent(event);
  // Si algún listener llamó preventDefault() → notCancelled === false
  return !notCancelled;
};

export const useBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const lastBackPressRef = useRef(0);
  const toastIdRef = useRef(null);

  // Refs siempre actualizados para usar dentro del callback sin stale closures
  const pathRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    // Solo funciona en plataformas nativas (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle = null;
    let cancelled = false;

    const handleBack = (event) => {
      // 1) Intentar cerrar un modal/sheet abierto
      const handledByModal = dispatchBackButtonEvent();
      if (handledByModal) {
        return;
      }

      const currentPath = pathRef.current;
      const isRootRoute = ROOT_ROUTES.some(
        (route) => currentPath === route || currentPath.startsWith(`${route}/`)
      );

      if (isRootRoute) {
        // 2) Doble tap para salir desde la raíz
        const currentTime = Date.now();
        const timeDifference = currentTime - lastBackPressRef.current;

        if (timeDifference < 2000 && lastBackPressRef.current !== 0) {
          // Segundo tap: cerrar app limpiamente (no crashea)
          CapacitorApp.exitApp();
        } else {
          lastBackPressRef.current = currentTime;

          if (toastIdRef.current) {
            try {
              toast.dismiss(toastIdRef.current);
            } catch (e) {
              /* noop */
            }
          }

          const toastResult = toast({
            title: 'Presiona de nuevo para salir',
            description: 'Toca atrás una vez más para cerrar la app',
            duration: 2000
          });

          if (toastResult && toastResult.id) {
            toastIdRef.current = toastResult.id;
          }

          // Reset tras la ventana de 2s (por si el usuario no vuelve a tocar)
          setTimeout(() => {
            if (lastBackPressRef.current === currentTime) {
              lastBackPressRef.current = 0;
            }
          }, 2000);
        }
      } else if (event?.canGoBack) {
        // 3) Hay historial del webview → navegar atrás
        navigateRef.current(-1);
      } else if (window.history.length > 1) {
        // 3b) Historial del navegador interno
        navigateRef.current(-1);
      } else {
        // 4) Sin historial → volver a home
        navigateRef.current('/feed');
      }
    };

    const attach = async () => {
      try {
        // ⚠️ En Capacitor 7 esto devuelve Promise<PluginListenerHandle>
        const handle = await CapacitorApp.addListener('backButton', handleBack);
        if (cancelled) {
          // Si el componente se desmontó antes de atachar, limpia ya.
          try {
            await handle.remove();
          } catch (e) {
            /* noop */
          }
          return;
        }
        listenerHandle = handle;
      } catch (err) {
        console.error('❌ Error registrando backButton listener:', err);
      }
    };

    attach();

    // Cleanup
    return () => {
      cancelled = true;
      if (listenerHandle) {
        try {
          const result = listenerHandle.remove();
          if (result && typeof result.catch === 'function') {
            result.catch(() => {});
          }
        } catch (e) {
          /* noop */
        }
        listenerHandle = null;
      }
    };
  }, [toast]); // Sólo depende de toast — path/navigate los leemos via ref
};

/**
 * Hook auxiliar para componentes modales / sheets.
 * Cuando esté abierto, llamará a onClose() al presionar atrás y marcará
 * el evento como manejado para que no se navegue ni se salga de la app.
 *
 * Ejemplo:
 *   useModalBackButton(showCommentsModal, () => setShowCommentsModal(false));
 */
export const useModalBackButton = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen || typeof onClose !== 'function') return;

    const handler = (event) => {
      event.preventDefault(); // marca como manejado
      onClose();
    };

    window.addEventListener(BACK_BUTTON_EVENT, handler);
    return () => {
      window.removeEventListener(BACK_BUTTON_EVENT, handler);
    };
  }, [isOpen, onClose]);
};
