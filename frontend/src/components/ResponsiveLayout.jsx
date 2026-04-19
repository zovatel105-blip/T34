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

  // Force hide RightSideNavigation on create page, story pages, content publish page, search page, messages page, challenges page, and other users' profiles
  const shouldHideRightNavigation = hideRightNavigation || isCreatePage || isStoryPage || isContentPublishPage || isSearchPage || isMessagesPage || isOtherUserProfile || isSettingsPage || isChallengePage || isAudioDetailPage;

  // Render the appropriate navigation based on user preference
  const renderNavigation = () => {
    if (!isAuthenticated || shouldHideRightNavigation || isCreatePage) return null;

    if (isBottomNav) {
      return <BottomNavigation />;
    } else {
      return <RightSideNavigation />;
    }
  };

  if (shouldUseTikTokLayout) {
    // Mobile TikTok mode - full screen without sidebars
    const backgroundClass = (isCreatePage || isStoryPage) ? '' : 'bg-black';

    return (
      <div className={`flex flex-col h-screen w-full ${backgroundClass} overflow-hidden`}>
        {isBottomNav && isAuthenticated && (
          <div className="flex-1 overflow-y-auto pt-2">
            {children}
          </div>
        )}
        {!isBottomNav && (
          <div className="flex-1 overflow-y-auto pt-2">
            {children}
          </div>
        )}
        {/* Navigation */}
        <div className="flex-shrink-0">
          {renderNavigation()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop Sidebar - Hidden on mobile */}
      {isAuthenticated && <DesktopSidebar onCreatePoll={onCreatePoll} />}

      {/* Main Content Area - pequeño padding para separar del status bar */}
      <main className="flex-1 overflow-y-auto pt-2">
        {children}
      </main>

      {/* Navigation */}
      <div className="flex-shrink-0">
        {renderNavigation()}
      </div>
    </div>
  );
};

export default ResponsiveLayout;
