import React, { createContext, useContext, useState } from 'react';

const TikTokContext = createContext();

export const useTikTok = () => {
  const context = useContext(TikTokContext);
  if (!context) {
    throw new Error('useTikTok must be used within a TikTokProvider');
  }
  return context;
};

export const TikTokProvider = ({ children }) => {
  const [isTikTokMode, setIsTikTokMode] = useState(false);
  const [hideRightNavigation, setHideRightNavigation] = useState(false);
  const [hideBottomNav, setHideBottomNav] = useState(false);
  const [commentInputConfig, setCommentInputConfig] = useState(null);

  const enterTikTokMode = () => {
    setIsTikTokMode(true);
    // Prevent body scroll when in TikTok mode
    document.body.style.overflow = 'hidden';
  };

  const exitTikTokMode = () => {
    setIsTikTokMode(false);
    setHideRightNavigation(false);
    setHideBottomNav(false);
    // Restore body scroll
    document.body.style.overflow = 'auto';
  };

  const toggleTikTokMode = () => {
    if (isTikTokMode) {
      exitTikTokMode();
    } else {
      enterTikTokMode();
    }
  };

  const hideRightNavigationBar = () => {
    setHideRightNavigation(true);
  };

  const showRightNavigationBar = () => {
    setHideRightNavigation(false);
  };

  const hideBottomNavigationBar = () => {
    setHideBottomNav(true);
  };

  const showBottomNavigationBar = () => {
    setHideBottomNav(false);
  };

  return (
    <TikTokContext.Provider 
      value={{
        isTikTokMode,
        hideRightNavigation,
        hideBottomNav,
        commentInputConfig,
        setCommentInputConfig,
        enterTikTokMode,
        exitTikTokMode,
        toggleTikTokMode,
        hideRightNavigationBar,
        showRightNavigationBar,
        hideBottomNavigationBar,
        showBottomNavigationBar
      }}
    >
      {children}
    </TikTokContext.Provider>
  );
};

export default TikTokContext;