import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DesktopSidebar from './DesktopSidebar';
import RightSideNavigation from './RightSideNavigation';
import BottomNavigation from './BottomNavigation';
import ComingSoon from './ComingSoon';
import { useTikTok } from '../contexts/TikTokContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavPreference } from '../hooks/useNavPreference';

/**
 * ResponsiveLayout
 *
 * Estructura IDÉNTICA a StatisticsModal (la única que funciona bien en APK):
 *   <div className="fixed inset-0 flex flex-col bg-... overflow-hidden">
 *      ...header/nav opcional (flex-shrink-0)...
 *      <main className="flex-1 overflow-y-auto">{children}</main>
 *      ...nav inferior (flex-shrink-0)...
 *   </div>
 *
 * La regla CSS global `.fixed.inset-0 { padding-top: var(--safe-area-inset-top) }`
 * garantiza que el contenido NUNCA se superpone a la barra de estado del sistema.
 * El `overflow-hidden` + `flex-1 overflow-y-auto` garantiza un scroll
 * correctamente delimitado al viewport (no crece más allá de la pantalla).
 */

const ResponsiveLayout = ({ children, onCreatePoll }) => {
  const location = useLocation();
  const { isTikTokMode, hideRightNavigation, hideRightNavigationBar, showRightNavigationBar } = useTikTok();
  const { isAuthenticated, user } = useAuth();
  const { isBottomNav } = useNavPreference();

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calcular rutas ANTES del early return para que los useEffect dependan de estados estables
  const isFeedPage = location.pathname === '/feed';
  const isFollowingPage = location.pathname === '/following';
  const isExplorePage = location.pathname === '/explore';
  // Ocultar navegación cuando se está viendo una publicación en modo TikTok desde
  // páginas como Profile propio, PostViewer, etc. Excepción: Feed/Following/Explore
  // están permanentemente en TikTok mode y DEBEN mostrar la navegación.
  const isViewingPublicationInTikTokMode = isTikTokMode && !(isFeedPage || isFollowingPage || isExplorePage);

  // Sincronizar el estado `hideRightNavigation` del TikTokContext con nuestra
  // decisión de ocultar la nav. Esto es crítico porque TikTokScrollView usa
  // ese flag para calcular el paddingBottom de los botones de acción (si la
  // nav está visible reserva 56px extra; si no, los acerca al borde inferior).
  useEffect(() => {
    if (isViewingPublicationInTikTokMode && !hideRightNavigation) {
      hideRightNavigationBar();
    } else if (!isViewingPublicationInTikTokMode && hideRightNavigation) {
      showRightNavigationBar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewingPublicationInTikTokMode]);

  if (isDesktop) {
    return <ComingSoon />;
  }

  const isCreatePage = location.pathname === '/create';
  const isStoryPage = location.pathname === '/story-creation' || location.pathname === '/story-edit';
  const isContentPublishPage = location.pathname === '/content-publish';
  const isSearchPage = location.pathname === '/search';
  const isMessagesPage = location.pathname.startsWith('/messages/');
  const isAudioDetailPage = location.pathname.startsWith('/audio/');
  const isSettingsPage = location.pathname === '/settings' || location.pathname === '/edit-profile' || location.pathname === '/change-password';
  const isOtherUserProfile = location.pathname.startsWith('/profile/') && user?.username && location.pathname !== `/profile/${user.username}`;
  // Perfil propio: /profile/<mi_username>  (o /profile sin parámetro)
  const isOwnProfilePage = (location.pathname === '/profile' || (user?.username && location.pathname === `/profile/${user.username}`));
  const isChallengePage = location.pathname.startsWith('/challenges') || location.pathname === '/explore/active';
  // /following debe verse como /feed (fondo negro detrás de la status bar, TikTok scroll)
  const shouldUseTikTokLayout = (isFeedPage || isFollowingPage || isExplorePage || isCreatePage || isStoryPage) && isTikTokMode;

  const shouldHideRightNavigation = hideRightNavigation || isCreatePage || isStoryPage || isContentPublishPage || isSearchPage || isMessagesPage || isOtherUserProfile || isOwnProfilePage || isSettingsPage || isChallengePage || isAudioDetailPage || isViewingPublicationInTikTokMode;

  const renderNavigation = () => {
    if (!isAuthenticated || shouldHideRightNavigation || isCreatePage) return null;
    if (isBottomNav) {
      return <BottomNavigation />;
    } else {
      return <RightSideNavigation />;
    }
  };

  // Layout TikTok (Feed / Explore / Create / Story en modo TikTok)
  if (shouldUseTikTokLayout) {
    const isBlackBg = !(isCreatePage || isStoryPage);
    return (
      <div
        className={`fixed inset-0 flex flex-col w-full overflow-hidden ${isBlackBg ? 'bg-black' : ''}`}
        style={{ paddingTop: 0 }}
      >
        {/* Scroll principal — sin padding-top para ir edge-to-edge (TikTokScrollView
            interno usa position:fixed; top:0 y queda detrás de la barra del sistema). */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {/* Navegación inferior — no scrollea */}
        <div className="flex-shrink-0">
          {renderNavigation()}
        </div>
      </div>
    );
  }

  // Layout estándar
  // 🎬 Cuando una página entra en modo TikTok (ej: Profile/Search/AudioDetail abre una
  // publicación), el fondo cambia a negro y eliminamos el padding-top global de
  // var(--safe-area-inset-top) via inline style. Esto permite que el TikTokScrollView
  // interno (que usa position:fixed; top:0) llegue hasta el borde REAL del viewport
  // y se vea completo detrás de la barra de notificaciones del sistema, como en el
  // feed. La estructura del árbol se mantiene IGUAL para no desmontar la página.
  return (
    <div
      className={`fixed inset-0 flex flex-col ${isTikTokMode ? 'bg-black' : 'bg-white'} overflow-hidden`}
      style={isTikTokMode ? { paddingTop: 0 } : undefined}
    >
      {/* Contenido principal (la CSS global añade padding-top var(--safe-area-inset-top)) */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop Sidebar - Hidden on mobile */}
        {isAuthenticated && <DesktopSidebar onCreatePoll={onCreatePoll} />}
        {/* Área de scroll del contenido — única fuente de scroll */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
        {/* Navigation */}
        <div className="flex-shrink-0">
          {renderNavigation()}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveLayout;
