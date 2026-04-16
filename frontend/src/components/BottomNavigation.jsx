import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, Heart, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useInboxUnreadCount } from '../hooks/useInboxUnreadCount';
import { useAuth } from '../contexts/AuthContext';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Long press handlers for home button
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

  const navItems = [
    {
      path: currentMode === 'following' ? '/following' : '/feed',
      icon: Home,
      label: 'Inicio',
      isHome: true,
    },
    {
      path: '/explore',
      icon: Search,
      label: 'Buscar',
    },
    {
      path: '/new',
      icon: Plus,
      label: 'Crear',
      isCreate: true,
    },
    {
      path: '/messages',
      icon: Heart,
      label: 'Actividad',
      badge: unreadCount,
    },
    {
      path: '/profile',
      icon: User,
      label: 'Perfil',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Barra negra redondeada estilo TikTok */}
      <div className="mx-3 mb-2 bg-black rounded-[28px] shadow-2xl">
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path === navItems[0].path ? '/feed' : item.path);

            if (item.isCreate) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 active:scale-90"
                  style={{
                    background: 'transparent',
                    border: '2px solid rgba(255,255,255,0.35)',
                  }}
                >
                  <Plus className="w-6 h-6 text-white" strokeWidth={2} />
                </button>
              );
            }

            if (item.isHome) {
              return (
                <button
                  key={item.path}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleTouchStart}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onClick={() => !isLongPressing && navigate(item.path)}
                  className={cn(
                    "flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 active:scale-90",
                    isLongPressing && "scale-110 opacity-70"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-7 h-7 transition-all duration-200",
                      active ? "text-white" : "text-white/60"
                    )}
                    strokeWidth={active ? 2.5 : 1.5}
                    fill={active ? "white" : "none"}
                  />
                </button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 active:scale-90"
              >
                <Icon
                  className={cn(
                    "w-7 h-7 transition-all duration-200",
                    active ? "text-white" : "text-white/60"
                  )}
                  strokeWidth={active ? 2.5 : 1.5}
                  fill={active ? (item.path === '/messages' ? "none" : "none") : "none"}
                />
                {/* Badge de notificaciones */}
                {item.badge > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
