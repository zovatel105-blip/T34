import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Swords, Plus, Inbox, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useInboxUnreadCount } from '../hooks/useInboxUnreadCount';
import { useAuth } from '../contexts/AuthContext';
import { useTikTok } from '../contexts/TikTokContext';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hideBottomNav } = useTikTok();
  const { unreadCount } = useInboxUnreadCount(!!user);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [currentMode, setCurrentMode] = useState('feed');
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (location.pathname === '/following') {
      setCurrentMode('following');
    } else {
      setCurrentMode('feed');
    }
  }, [location.pathname]);

  const handleTouchStart = useCallback(() => {
    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      if (currentMode === 'feed') {
        setCurrentMode('following');
        navigate('/following');
      } else {
        setCurrentMode('feed');
        navigate('/feed');
      }
      setIsLongPressing(false);
    }, 800);
  }, [navigate, currentMode]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const isActive = (path) => {
    if (path === '/feed') return location.pathname === '/feed' || location.pathname === '/following';
    if (path === '/profile') return location.pathname === '/profile' || location.pathname.startsWith('/profile/');
    return location.pathname === path;
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-black rounded-t-3xl transition-transform duration-300"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: hideBottomNav ? 'translateY(100%)' : 'translateY(0)',
      }}
    >
      <div className="flex items-center justify-around px-4 py-2.5">

        {/* Home - con long press */}
        <button
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onClick={() => !isLongPressing && navigate(currentMode === 'following' ? '/following' : '/feed')}
          className={cn(
            "flex items-center justify-center w-9 h-9 transition-all duration-200 active:scale-90",
            isLongPressing && "scale-110 opacity-70"
          )}
        >
          <Home
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isActive('/feed') ? "text-white" : "text-white/50"
            )}
            strokeWidth={isActive('/feed') ? 2.5 : 1.5}
            fill={isActive('/feed') ? "white" : "none"}
          />
        </button>

        {/* Explorar / Battle */}
        <button
          onClick={() => navigate('/explore')}
          className="flex items-center justify-center w-9 h-9 transition-all duration-200 active:scale-90"
        >
          <Swords
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isActive('/explore') ? "text-white" : "text-white/50"
            )}
            strokeWidth={isActive('/explore') ? 2.5 : 1.5}
          />
        </button>

        {/* Crear - borde gradiente */}
        <button
          onClick={() => navigate('/new')}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 active:scale-90 relative overflow-hidden flex-shrink-0"
          style={{
            background: 'linear-gradient(180deg, #000 0%, #000 100%)',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(#000, #000), linear-gradient(90deg, #A855F7 0%, #3B82F6 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <Plus className="w-5 h-5 text-white relative z-10" strokeWidth={2} />
        </button>

        {/* Mensajes / Inbox */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate('/messages')}
            className="flex items-center justify-center w-9 h-9 transition-all duration-200 active:scale-90"
          >
            <Inbox
              className={cn(
                "w-5 h-5 transition-all duration-200",
                isActive('/messages') ? "text-white" : "text-white/50"
              )}
              strokeWidth={isActive('/messages') ? 2.5 : 1.5}
            />
          </button>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </div>

        {/* Perfil */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center justify-center w-9 h-9 transition-all duration-200 active:scale-90"
        >
          <User
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isActive('/profile') ? "text-white" : "text-white/50"
            )}
            strokeWidth={isActive('/profile') ? 2.5 : 1.5}
          />
        </button>

      </div>
    </nav>
  );
};

export default BottomNavigation;
