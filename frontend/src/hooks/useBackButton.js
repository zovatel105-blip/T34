/**
 * useBackButton Hook
 * Maneja el botón de "atrás" de Android tipo TikTok
 * - En la página principal (Feed): Doble tap para salir
 * - En otras páginas: Navega hacia atrás normalmente
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useToast } from './use-toast';

// Rutas que se consideran "raíz" - requieren doble tap para salir
const ROOT_ROUTES = ['/feed', '/explore', '/'];

export const useBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const lastBackPressRef = useRef(0);
  const toastIdRef = useRef(null);

  useEffect(() => {
    // Solo funciona en plataformas nativas (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleBackButton = CapacitorApp.addListener('backButton', (event) => {
      const currentPath = location.pathname;
      
      // Determinar si estamos en una ruta raíz
      const isRootRoute = ROOT_ROUTES.some(route => currentPath === route || currentPath.startsWith(route));

      if (isRootRoute) {
        // Comportamiento en página raíz: Doble tap para salir
        const currentTime = new Date().getTime();
        const timeDifference = currentTime - lastBackPressRef.current;

        if (timeDifference < 2000) {
          // Segundo tap dentro de 2 segundos - Salir de la app
          CapacitorApp.exitApp();
        } else {
          // Primer tap - Mostrar mensaje
          lastBackPressRef.current = currentTime;
          
          // Mostrar toast
          if (toastIdRef.current) {
            // Ocultar toast anterior si existe
            toast.dismiss(toastIdRef.current);
          }
          
          const toastResult = toast({
            title: "Presiona de nuevo para salir",
            description: "Toca atrás una vez más para cerrar la app",
            duration: 2000,
          });
          
          if (toastResult && toastResult.id) {
            toastIdRef.current = toastResult.id;
          }
        }
      } else {
        // En páginas secundarias: Navegar hacia atrás
        // Verificar si hay historial
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          // Si no hay historial, ir al feed
          navigate('/feed');
        }
      }
    });

    // Cleanup
    return () => {
      handleBackButton.remove();
    };
  }, [location.pathname, navigate, toast]);
};
