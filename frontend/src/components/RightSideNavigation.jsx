import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Swords, Plus, Inbox, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useInboxUnreadCount } from '../hooks/useInboxUnreadCount';
import { useAuth } from '../contexts/AuthContext';


const RightSideNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useInboxUnreadCount(!!user);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [currentMode, setCurrentMode] = useState('feed'); // 'feed' or 'following'
  const longPressTimer = useRef(null);

  // Detectar el modo actual basado en la ruta
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
      // Vibration feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Alternar entre feed y following
      if (currentMode === 'feed') {
        setCurrentMode('following');
        navigate('/following');
      } else {
        setCurrentMode('feed');
        navigate('/feed');
      }
      
      setIsLongPressing(false);
    }, 800); // 800ms for long press
  }, [navigate, currentMode]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    handleTouchStart();
  }, [handleTouchStart]);

  const handleMouseUp = useCallback(() => {
    handleTouchEnd();
  }, [handleTouchEnd]);

  const handleMouseLeave = useCallback(() => {
    handleTouchEnd();
  }, [handleTouchEnd]);

  // Función para obtener los estilos del modo actual
  const getModeStyles = () => {
    if (currentMode === 'following') {
      return {
        bgColor: 'bg-purple-500',
        hoverColor: 'hover:bg-purple-600',
        textColor: 'text-white',
        shadowColor: 'shadow-purple-200'
      };
    } else {
      return {
        bgColor: 'bg-blue-500',
        hoverColor: 'hover:bg-blue-600',
        textColor: 'text-white',
        shadowColor: 'shadow-blue-200'
      };
    }
  };

  const modeStyles = getModeStyles();

  return (
    <div className="fixed right-1 md:right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-50"
         style={{ right: 'max(0.25rem, env(safe-area-inset-right))' }}>
      
      {/* Home/Inicio with Long Press - Dynamic Colors */}
      <div className="relative">
        <button
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={() => !isLongPressing && navigate(currentMode === 'following' ? '/following' : '/feed')}
          className={cn(
            "rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10",
            modeStyles.bgColor,
            modeStyles.hoverColor,
            "w-5 h-12 shadow-xl",
            isLongPressing && "w-6 h-14 shadow-2xl scale-110 opacity-75",
            "flex items-center justify-center"
          )}
          title={isLongPressing 
            ? (currentMode === 'feed' ? 'Cambiando a Following...' : 'Cambiando a Feed...') 
            : (currentMode === 'following' ? 'Following' : 'Inicio')
          }
        >
          <Home className={cn(
            "w-4 h-4 transition-all duration-300 text-white",
            isLongPressing && "w-5 h-5 animate-pulse"
          )} />
        </button>
        
        {/* Long press indicator */}
        {isLongPressing && (
          <div className={cn(
            "absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse",
            currentMode === 'following' ? 'bg-blue-400' : 'bg-purple-400'
          )}>
            <div className={cn(
              "absolute inset-0 rounded-full animate-ping",
              currentMode === 'following' ? 'bg-blue-300' : 'bg-purple-300'
            )}></div>
          </div>
        )}
      </div>

      {/* Battle Live */}
      <button
        onClick={() => navigate('/explore')}
        className={cn(
          "rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10",
          location.pathname === '/explore'
            ? "bg-blue-500 hover:bg-blue-600 w-4 h-10 shadow-xl"
            : "bg-white/60 hover:bg-white hover:scale-110 w-4 h-10 shadow-lg",
          "flex items-center justify-center"
        )}
        title="Battle Live"
      >
        <Swords className={cn(
          "w-3 h-3",
          location.pathname === '/explore' ? "text-white" : "text-gray-600"
        )} />
      </button>

      {/* Crear Poll - Botón especial con colores en los bordes en forma de pastilla */}
      <button
        onClick={() => navigate('/new')}
        className={cn(
          "rounded-full transition-all duration-300 relative overflow-hidden",
          (location.pathname === '/create' || location.pathname === '/new')
            ? "w-5 h-12 shadow-2xl"
            : "hover:scale-110 w-5 h-12 shadow-xl hover:opacity-90",
          "flex items-center justify-center flex-shrink-0"
        )}
        title="Crear"
        style={{
          background: 'linear-gradient(180deg, #000 0%, #000 100%)',
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(#000, #000), linear-gradient(180deg, #A855F7 0%, #3B82F6 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          minWidth: '1.25rem',
          maxWidth: '1.25rem',
          minHeight: '3rem',
          maxHeight: '3rem'
        }}
      >
        <Plus className="w-4 h-4 text-white relative z-10" />
      </button>

      {/* Mensajes */}
      <div className="relative">
        <button
          onClick={() => navigate('/messages')}
          className={cn(
            "rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10",
            location.pathname === '/messages'
              ? "bg-blue-500 hover:bg-blue-600 w-4 h-10 shadow-xl"
              : "bg-white/60 hover:bg-white hover:scale-110 w-4 h-10 shadow-lg",
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
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </div>

      {/* Perfil */}
      <button
        onClick={() => navigate('/profile')}
        className={cn(
          "rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10",
          location.pathname === '/profile'
            ? "bg-blue-500 hover:bg-blue-600 w-4 h-10 shadow-xl"
            : "bg-white/60 hover:bg-white hover:scale-110 w-4 h-10 shadow-lg",
          "flex items-center justify-center"
        )}
        title="Perfil"
      >
        <User className={cn(
          "w-3 h-3",
          location.pathname === '/profile' ? "text-white" : "text-gray-600"
        )} />
      </button>
    </div>
  );
};

export default RightSideNavigation;