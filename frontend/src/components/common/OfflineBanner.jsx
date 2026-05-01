/**
 * <OfflineBanner>
 *
 * Banner sutil arriba de la app, estilo Instagram/TikTok, que aparece
 * cuando el dispositivo pierde la conexión. Si la app tiene contenido
 * cacheado (feedCache), lo indica; si no, explica que algunas cosas no
 * funcionarán.
 *
 * Diseño:
 *  - Slide-down animado en top-0 (bajo safe-area).
 *  - Color: gris neutro → NO rojo alarmante. Instagram usa un tono neutro
 *    porque el scroll del feed sigue funcionando con caché.
 *  - Auto-desaparece al recuperar conexión con fade-out.
 *  - Mostrar momentáneamente un toast verde "Conectado" al volver online.
 */
import React, { useEffect, useState } from 'react';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import { WifiOff, Wifi } from 'lucide-react';
import feedCache from '../../services/feedCacheService';

const OfflineBanner = () => {
  const { isOnline } = useNetworkStatus();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('offline'); // 'offline' | 'reconnected'
  const [hasCache, setHasCache] = useState(null); // null = unknown, true/false

  useEffect(() => {
    if (!isOnline) {
      setMode('offline');
      setVisible(true);
      // Verificamos si hay caché en disco para no mentir en el banner.
      (async () => {
        try {
          const c = await feedCache.getCachedFeed('main');
          setHasCache(Boolean(c && c.polls && c.polls.length > 0));
        } catch {
          setHasCache(false);
        }
      })();
      return undefined;
    }
    // Si estaba visible (offline), pasamos a "reconnected" y ocultamos tras 2s
    if (visible) {
      setMode('reconnected');
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (!visible) return null;

  const isOffline = mode === 'offline';

  // 🔧 Mensaje honesto: si no hay caché, no decimos "mostrando contenido guardado"
  let label;
  if (!isOffline) {
    label = 'Conectado';
  } else if (hasCache === true) {
    label = 'Sin conexión · mostrando contenido guardado';
  } else if (hasCache === false) {
    label = 'Sin conexión';
  } else {
    label = 'Sin conexión';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 z-[9999] flex justify-center pointer-events-none"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px))',
      }}
    >
      <div
        className={[
          'pointer-events-auto mx-3 mt-2 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg backdrop-blur-sm transition-all duration-300',
          isOffline
            ? 'bg-gray-900/90 text-white'
            : 'bg-emerald-600/95 text-white',
        ].join(' ')}
        style={{
          animation: 'offlineBannerSlideDown 260ms ease-out',
        }}
      >
        {isOffline ? (
          <WifiOff className="w-4 h-4 flex-shrink-0" />
        ) : (
          <Wifi className="w-4 h-4 flex-shrink-0" />
        )}
        <span className="text-sm font-medium whitespace-nowrap">
          {label}
        </span>
      </div>

      {/* Keyframes locales — evita tocar CSS global */}
      <style>{`
        @keyframes offlineBannerSlideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OfflineBanner;
