/**
 * <FeedOfflineToast>
 *
 * Toast de "sin conexión" estilo Android, exclusivo del feed (Para Ti
 * + Siguiendo). Reemplaza al `OfflineBanner` global en estas dos pantallas.
 *
 * Diseño según especificación del usuario:
 *  - Marco semi-transparente oscuro con esquinas muy redondeadas.
 *  - Texto en español, en 2 líneas:
 *      "Sin conexión a internet."
 *      "Conéctate a internet e inténtalo de nuevo."
 *  - Posicionado arriba (debajo del logo, respetando safe-area).
 *  - Slide-down animado al aparecer; auto-fade-out al recuperar red.
 *  - Pequeño toast verde "Conectado" al volver online (UX suave).
 *
 * Uso:
 *   <FeedOfflineToast />   ← solo en FeedPage y FollowingPage.
 */
import React, { useEffect, useState } from 'react';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import { WifiOff, Wifi } from 'lucide-react';

const OFFLINE_LINE_1 = 'Sin conexión a internet.';
const OFFLINE_LINE_2 = 'Conéctate a internet e inténtalo de nuevo.';

const FeedOfflineToast = () => {
  const { isOnline } = useNetworkStatus();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('offline'); // 'offline' | 'reconnected'

  useEffect(() => {
    if (!isOnline) {
      setMode('offline');
      setVisible(true);
      return undefined;
    }
    // Si estaba visible (offline → online), pasamos a "reconnected" y ocultamos tras 1.8 s
    if (visible) {
      setMode('reconnected');
      const t = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (!visible) return null;

  const isOffline = mode === 'offline';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 z-[9999] flex justify-center pointer-events-none px-6"
      style={{
        // Justo debajo del logo flotante (top-4 + 40 px de logo + margen)
        top: 'calc(env(safe-area-inset-top, 0px) + 64px)',
      }}
    >
      <div
        className={[
          'pointer-events-auto max-w-[320px] flex items-start gap-2.5 px-5 py-3.5 shadow-lg backdrop-blur-md transition-all duration-300',
          // Esquinas muy redondeadas (estilo Android Toast)
          'rounded-[22px]',
          // Marco semi-transparente: gris oscuro al ~70 % opacidad + borde sutil
          isOffline
            ? 'bg-gray-900/70 text-white border border-white/10'
            : 'bg-emerald-700/80 text-white border border-white/15',
        ].join(' ')}
        style={{
          animation: 'feedOfflineToastIn 280ms ease-out',
        }}
      >
        {isOffline ? (
          <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-90" />
        ) : (
          <Wifi className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-95" />
        )}
        {isOffline ? (
          // 2 líneas según pidió el usuario
          <div className="text-[14px] leading-snug font-medium">
            <div>{OFFLINE_LINE_1}</div>
            <div className="text-white/85 font-normal">{OFFLINE_LINE_2}</div>
          </div>
        ) : (
          <span className="text-[14px] font-medium leading-snug">Conectado</span>
        )}
      </div>

      {/* Keyframes locales — evita tocar CSS global */}
      <style>{`
        @keyframes feedOfflineToastIn {
          from { transform: translateY(-12px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default FeedOfflineToast;
