import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Swords, Plus, Inbox, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useInboxUnreadCount } from '../hooks/useInboxUnreadCount';
import { useAuth } from '../contexts/AuthContext';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const getModeStyles = () => {
    if (currentMode === 'following') {
      return { bgColor: 'bg-purple-500', hoverColor: 'hover:bg-purple-600' };
    }
    return { bgColor: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' };
  };

  const modeStyles = getModeStyles();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md rounded-t-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around px-6 py-2.5">

        {/* Home/Inicio - Dynamic Colors + Long Press */}
        <div className="relative">
          <button
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onClick={() => !isLongPressing && navigate(currentMode === 'following' ? '/following' : '/feed')}
            className={cn(
              "rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10",
              modeStyles.bgColor,
              modeStyles.hoverColor,
              "w-12 h-5 shadow-xl",
              isLongPressing && "w-14 h-6 shadow-2xl scale-110 opacity-75",
              "flex items-center justify-center"
            )}
            title={currentMode === 'following' ? 'Following' : 'Inicio'}
          >
            <Home className={cn(
              "w-4 h-4 transition-all duration-300 text-white",
              isLongPressing && "w-5 h-5 animate-pulse"
            )} />
          </button>
          {isLongPressing && (
            <div className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse",
              currentMode === 'following' ? 'bg-blue-400' : 'bg-purple-400'
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping",
                currentMode === 'following' ? 'bg-blue-300' : 'bg-purple-300'
              )} />
            </div>
          )}
        </div>

        {/* Explorar / Battle Live */}
        <button
          onClick={() => navigate('/explore')}
          className={cn(
            "rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10",
            location.pathname === '/explore'
              ? "bg-blue-500 hover:bg-blue-600 w-10 h-4 shadow-xl"
              : "bg-white/60 hover:bg-white hover:scale-110 w-10 h-4 shadow-lg",
            "flex items-center justify-center"
          )}
          title="Battle Live"
        >
          <Swords className={cn(
            "w-3 h-3",
            location.pathname === '/explore' ? "text-white" : "text-gray-600"
          )} />
        </button>

        {/* Crear - Botón con borde gradiente */}
        <button
          onClick={() => navigate('/new')}
          className={cn(
            "rounded-full transition-all duration-300 relative overflow-hidden",
            (location.pathname === '/create' || location.pathname === '/new')
              ? "w-12 h-5 shadow-2xl"
              : "hover:scale-110 w-12 h-5 shadow-xl hover:opacity-90",
            "flex items-center justify-center flex-shrink-0"
          )}
          title="Crear"
          style={{
            background: 'linear-gradient(180deg, #000 0%, #000 100%)',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(#000, #000), linear-gradient(90deg, #A855F7 0%, #3B82F6 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            minWidth: '3rem',
            maxWidth: '3rem',
            minHeight: '1.25rem',
            maxHeight: '1.25rem'
          }}
        >
          <Plus className="w-4 h-4 text-white relative z-10" />
        </button>

        {/* Mensajes / Inbox */}
        <div className="relative">
          <button
            onClick={() => navigate('/messages')}
            className={cn(
              "rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10",
              location.pathname === '/messages'
                ? "bg-blue-500 hover:bg-blue-600 w-10 h-4 shadow-xl"
                : "bg-white/60 hover:bg-white hover:scale-110 w-10 h-4 shadow-lg",
              "flex items-center justify-center"
            )}
            title="Mensajes"
          >
            <Inbox className={cn(
              "w-3 h-3",
              location.pathname === '/messages' ? "text-white" : "text-gray-600"
            )} />
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </div>

        {/* Perfil */}
        <button
          onClick={() => navigate('/profile')}
          className={cn(
            "rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10",
            (location.pathname === '/profile' || location.pathname.startsWith('/profile/'))
              ? "bg-blue-500 hover:bg-blue-600 w-10 h-4 shadow-xl"
              : "bg-white/60 hover:bg-white hover:scale-110 w-10 h-4 shadow-lg",
            "flex items-center justify-center"
          )}
          title="Perfil"
        >
          <User className={cn(
            "w-3 h-3",
            (location.pathname === '/profile' || location.pathname.startsWith('/profile/')) ? "text-white" : "text-gray-600"
          )} />
        </button>

      </div>
    </nav>
  );
};

export default BottomNavigation;
