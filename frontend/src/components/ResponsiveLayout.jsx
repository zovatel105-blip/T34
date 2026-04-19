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
 * Spacer fijo de 16px — replica el py-4 de StatisticsModal.
 * Está FUERA del área de scroll para que NUNCA se desplace.
 * Esto garantiza que siempre hay 16px entre la barra de estado y el contenido.
 */
const StatusBarSpacer = ({ bg = 'transparent' }) => (
  <div style={{ 
    height: '16px', 
    minHeight: '16px',
    flexShrink: 0, 
    width: '100%',
    backgroundColor: bg,
  }} />
);

const ResponsiveLayout = ({ children, onCreatePoll }) => {
  const location = useLocation();
  const { isTikTokMode, hideRightNavigation } = useTikTok();
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

  if (isDesktop) {
    return <ComingSoon />;
  }

  const isFeedPage = location.pathname === '/feed';
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

  const shouldHideRightNavigation = hideRightNavigation || isCreatePage || isStoryPage || isContentPublishPage || isSearchPage || isMessagesPage || isOtherUserProfile || isSettingsPage || isChallengePage || isAudioDetailPage;

  const renderNavigation = () => {
    if (!isAuthenticated || shouldHideRightNavigation || isCreatePage) return null;
    if (isBottomNav) {
      return <BottomNavigation />;
    } else {
      return <RightSideNavigation />;
    }
  };

  if (shouldUseTikTokLayout) {
    const backgroundClass = (isCreatePage || isStoryPage) ? '' : 'bg-black';

    return (
      <div className={`flex flex-col h-screen w-full ${backgroundClass} overflow-hidden`}>
        {/* Spacer fijo FUERA del scroll — como StatisticsModal */}
        <StatusBarSpacer bg={backgroundClass === 'bg-black' ? '#000' : 'transparent'} />
        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {/* Navigation */}
        <div className="flex-shrink-0">
          {renderNavigation()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Spacer fijo FUERA del scroll — como StatisticsModal */}
      <StatusBarSpacer bg="#ffffff" />
      {/* Contenido principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Hidden on mobile */}
        {isAuthenticated && <DesktopSidebar onCreatePoll={onCreatePoll} />}
        {/* Área de scroll del contenido */}
        <main className="flex-1 overflow-y-auto">
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
