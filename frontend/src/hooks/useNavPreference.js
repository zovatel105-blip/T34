import { useState, useCallback, useEffect } from 'react';

const NAV_PREFERENCE_KEY = 'twyk_nav_preference';

// 'right' = barra lateral derecha (actual)
// 'bottom' = barra inferior estilo TikTok
export const NAV_STYLES = {
  RIGHT: 'right',
  BOTTOM: 'bottom',
};

export const useNavPreference = () => {
  const [navStyle, setNavStyleState] = useState(() => {
    try {
      return localStorage.getItem(NAV_PREFERENCE_KEY) || NAV_STYLES.RIGHT;
    } catch {
      return NAV_STYLES.RIGHT;
    }
  });

  const setNavStyle = useCallback((style) => {
    setNavStyleState(style);
    try {
      localStorage.setItem(NAV_PREFERENCE_KEY, style);
      // Dispatch event so other components can react
      window.dispatchEvent(new CustomEvent('navPreferenceChanged', { detail: style }));
    } catch (e) {
      console.error('Error saving nav preference:', e);
    }
  }, []);

  const isBottomNav = navStyle === NAV_STYLES.BOTTOM;
  const isRightNav = navStyle === NAV_STYLES.RIGHT;

  // Listen for changes from other components
  useEffect(() => {
    const handleChange = (e) => {
      setNavStyleState(e.detail);
    };
    window.addEventListener('navPreferenceChanged', handleChange);
    return () => window.removeEventListener('navPreferenceChanged', handleChange);
  }, []);

  return { navStyle, setNavStyle, isBottomNav, isRightNav };
};

export default useNavPreference;
