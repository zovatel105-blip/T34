import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DesktopSidebar from './DesktopSidebar';
import RightSideNavigation from './RightSideNavigation';
import ComingSoon from './ComingSoon';
import { useTikTok } from '../contexts/TikTokContext';
import { useAuth } from '../contexts/AuthContext';

const ResponsiveLayout = ({ children, onCreatePoll }) => {
  const location = useLocation();
  const { isTikTokMode, hideRightNavigation } = useTikTok();
  const { isAuthenticated, user } = useAuth();
  
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
  const isMessagesPage = location.pathname.startsWith('/messages');
  const isSettingsPage = location.pathname === '/settings' || location.pathname === '/edit-profile' || location.pathname === '/change-password';
  const isOtherUserProfile = location.pathname.startsWith('/profile/') && user?.username && location.pathname !== `/profile/${user.username}`;
  const isChallengePage = location.pathname.startsWith('/challenges');
  const shouldUseTikTokLayout = (isFeedPage || isExplorePage || isCreatePage || isStoryPage) && isTikTokMode;
  
  // Force hide RightSideNavigation on create page, story pages, content publish page, search page, messages page, challenges page, and other users' profiles
  const shouldHideRightNavigation = hideRightNavigation || isCreatePage || isStoryPage || isContentPublishPage || isSearchPage || isMessagesPage || isOtherUserProfile || isSettingsPage || isChallengePage;

  if (shouldUseTikTokLayout) {
    // Mobile TikTok mode - full screen without sidebars
    // For create page and story pages, don't apply bg-black to allow gradients
    const backgroundClass = (isCreatePage || isStoryPage) ? '' : 'bg-black';
    
    return (
      <div className={`relative h-screen ${backgroundClass}`}>
        {children}
        {/* Right side navigation for mobile TikTok mode - HIDDEN on create page */}
        <div className="lg:hidden">
          {isAuthenticated && !shouldHideRightNavigation && !isCreatePage && <RightSideNavigation onCreatePoll={onCreatePoll} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:bg-gray-100">
      {/* Desktop Sidebar - Hidden on mobile */}
      {isAuthenticated && <DesktopSidebar />}
      
      {/* Main Content Area */}
      <div className={`${isAuthenticated ? 'lg:ml-60 lg:mr-16' : ''}`}>
        <div className="relative">
          {children}
        </div>
      </div>
      
      {/* Right Side Navigation - HIDDEN on create page */}
      <div className="hidden lg:block lg:fixed lg:right-4 lg:top-1/2 lg:transform lg:-translate-y-1/2 lg:z-20">
        {isAuthenticated && !shouldHideRightNavigation && !isCreatePage && <RightSideNavigation onCreatePoll={onCreatePoll} />}
      </div>
      
      {/* Mobile Right Side Navigation - Only when not in TikTok mode and NOT on create page */}
      <div className="lg:hidden">
        {!shouldUseTikTokLayout && isAuthenticated && !shouldHideRightNavigation && !isCreatePage && (
          <RightSideNavigation onCreatePoll={onCreatePoll} />
        )}
      </div>
    </div>
  );
};

export default ResponsiveLayout;