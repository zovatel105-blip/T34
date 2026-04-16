import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Plus, Bell, User, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const NavigationItem = ({ to, icon: Icon, label, isActive }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 min-w-[60px]",
          // Remover colores activos - solo hover gris sutil
          "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        )
      }
    >
      <Icon className="w-6 h-6 transition-all duration-300" />
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
};

const BottomNavigation = ({ onCreatePoll }) => {
  const location = useLocation();
  const navigate = useNavigate();
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

  // Función para obtener el color y texto basado en el modo actual
  const getModeStyles = () => {
    if (currentMode === 'following') {
      return {
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-600',
        iconColor: 'text-purple-600',
        label: 'Following',
        activeBg: 'bg-purple-50',
        activeText: 'text-purple-600'
      };
    } else {
      return {
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
        iconColor: 'text-blue-600',
        label: 'Seguidos',
        activeBg: 'bg-blue-50',
        activeText: 'text-blue-600'
      };
    }
  };

  const modeStyles = getModeStyles();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 shadow-lg z-50">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {/* Home Button with Long Press - Dynamic Colors */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <NavLink
              to={currentMode === 'following' ? '/following' : '/feed'}
              className={() =>
                cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 min-w-[60px]",
                  // Usar los estilos del modo actual
                  modeStyles.activeBg,
                  modeStyles.activeText,
                  "transform scale-105",
                  isLongPressing && "transform scale-110 opacity-75"
                )
              }
            >
              <Home 
                className={cn(
                  "w-6 h-6 transition-all duration-300 fill-current",
                  modeStyles.iconColor,
                  isLongPressing && "animate-pulse"
                )} 
              />
              <span className={cn(
                "text-xs font-medium transition-all duration-300",
                modeStyles.textColor,
                isLongPressing && "animate-pulse"
              )}>
                {isLongPressing 
                  ? (currentMode === 'feed' ? 'Following...' : 'Feed...') 
                  : modeStyles.label
                }
              </span>
            </NavLink>
            
            {/* Long press indicator */}
            {isLongPressing && (
              <div className={cn(
                "absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse",
                currentMode === 'following' ? 'bg-blue-500' : 'bg-purple-500'
              )}>
                <div className={cn(
                  "absolute inset-0 rounded-full animate-ping",
                  currentMode === 'following' ? 'bg-blue-400' : 'bg-purple-400'
                )}></div>
              </div>
            )}
          </div>
          
          <NavigationItem
            to="/explore"
            icon={Compass}
            label="Explorar"
          />

          {/* Create Content Button - Navigate to selection page */}
          <NavLink
            to="/new"
            className="flex flex-col items-center gap-1 px-3 py-2 transition-all duration-300 min-w-[60px] group"
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-r from-blue-700 to-purple-700"
                    : "bg-gradient-to-r from-blue-600 to-purple-600"
                )}>
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "text-blue-700" : "text-blue-600"
                )}>Crear</span>
              </>
            )}
          </NavLink>

          <NavigationItem
            to="/messages"
            icon={MessageCircle}
            label="Mensajes"
          />

          <NavigationItem
            to="/profile"
            icon={User}
            label="Perfil"
          />
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;