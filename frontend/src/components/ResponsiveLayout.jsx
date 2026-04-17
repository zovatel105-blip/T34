import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DesktopSidebar from './DesktopSidebar';
import RightSideNavigation from './RightSideNavigation';
import BottomNavigation from './BottomNavigation';
import ComingSoon from './ComingSoon';
import { useTikTok } from '../contexts/TikTokContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavPreference } from '../hooks/useNavPreference';

const ResponsiveLayout = ({ children, onCreatePoll }) => {
  const location = useLocation();
  const { isTikTokMode, hideRightNavigation } = useTikTok();
  const { isAuthenticated, user } = useAuth();
  const { isBottomNav } = useNavPreference();

  // Desktop detection state
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Listen for window resize to update desktop detection
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // If desktop, show Coming Soon message
  if (isDesktop) {
    return <ComingSoon />;
  }

  // Mobile functionality continues below (existing logic)
  // Check if we're on a page that should use the TikTok-style layout
  const isFeedPage = location.pathname === '/feed';
  const isFollowingPage = location.pathname === '/following';
  const isExplorePage = location.pathname === '/explore';
  const isCreatePage = location.pathname === '/create';
  const isStoryPage = location.pathname === '/story-creation' || location.pathname === '/story-edit';
  const isContentPublishPage = location.pathname === '/content-publish';
  const isSearchPage = location.pathname === '/search';
  const isMessagesPage = location.pathname.startsWith('/messages/');
  const isMessagesMainPage = location.pathname === '/messages';
  const isAudioDetailPage = location.pathname.startsWith('/audio/');
  const isSettingsPage = location.pathname === '/settings' || location.pathname === '/edit-profile' || location.pathname === '/change-password';
  const isOtherUserProfile = location.pathname.startsWith('/profile/') && user?.username && location.pathname !== `/profile/${user.username}`;
  const isChallengePage = location.pathname.startsWith('/challenges') || location.pathname === '/explore/active';
  const shouldUseTikTokLayout = (isFeedPage || isExplorePage || isCreatePage || isStoryPage) && isTikTokMode;

  // 📱 EDGE-TO-EDGE: páginas fullscreen (video/feed/crear/stories) manejan
  // sus propias safe-areas mediante overlays internos. El resto de páginas
  // recibe padding-top para no quedar debajo de la status bar transparente.
  const isFullscreenPage =
    isFeedPage ||
    isFollowingPage ||
    isExplorePage ||
    isCreatePage ||
    isStoryPage ||
    isContentPublishPage ||
    location.pathname === '/vs-create' ||
    location.pathname === '/vs-experience' ||
    location.pathname === '/moment-create';

  // Force hide RightSideNavigation on create page, story pages, content publish page, search page, messages page, challenges page, and other users' profiles
  const shouldHideRightNavigation = hideRightNavigation || isCreatePage || isStoryPage || isContentPublishPage || isSearchPage || isMessagesPage || isOtherUserProfile || isSettingsPage || isChallengePage || isAudioDetailPage;

  // Render the appropriate navigation based on user preference
  const renderNavigation = () => {
    if (!isAuthenticated || shouldHideRightNavigation || isCreatePage) return null;

    if (isBottomNav) {
      return <BottomNavigation />;
    } else {
      return <RightSideNavigation onCreatePoll={onCreatePoll} />;
    }
  };

  if (shouldUseTikTokLayout) {
    // Mobile TikTok mode - full screen without sidebars
    // For create page and story pages, don't apply bg-black to allow gradients
    const backgroundClass = (isCreatePage || isStoryPage) ? '' : 'bg-black';

    return (
      <div className={`relative h-screen ${backgroundClass}`}>
        {isBottomNav && isAuthenticated && (
          <div
            style={{
              paddingBottom: 'calc(52px + env(safe-area-inset-bottom, 0px))'
            }}
          >
            {children}
          </div>
        )}
        {!isBottomNav && children}
        {/* Navigation */}
        <div className="lg:hidden">
          {renderNavigation()}
        </div>
      </div>
    );
  }

  // Clases dinámicas:
  // - safe-area-top: añade padding-top = altura de la status bar (sólo en
  //   páginas no-fullscreen donde hay headers que deben respetar la barra)
  // - pb-bottom-nav: añade padding-bottom = altura del BottomNavigation
  //   + la nav bar del sistema, para que el contenido scrolleable no
  //   quede tapado.
  const safeAreaClass = isFullscreenPage ? '' : 'safe-area-top';

  return (
    <div
      className={`min-h-screen bg-gray-50 lg:bg-gray-100 ${safeAreaClass}`}
      style={{
        paddingBottom:
          isBottomNav && isAuthenticated
            ? 'calc(52px + env(safe-area-inset-bottom, 0px))'
            : undefined
      }}
    >
      {/* Desktop Sidebar - Hidden on mobile */}
      {isAuthenticated && <DesktopSidebar />}

      {/* Main Content Area */}
      <div className={`${isAuthenticated ? 'lg:ml-60 lg:mr-16' : ''}`}>
        <div className="relative">
          {children}
        </div>
      </div>

      {/* Navigation */}
      <div className="lg:hidden">
        {renderNavigation()}
      </div>
    </div>
  );
};

export default ResponsiveLayout;
