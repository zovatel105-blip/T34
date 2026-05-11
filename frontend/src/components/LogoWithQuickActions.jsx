import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomLogo from './CustomLogo';
import QuickActionsMenu from './QuickActionsMenu';

const LogoWithQuickActions = ({ size = 32, className = "" }) => {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const navigate = useNavigate();

  // Abrir/cerrar el menú con un simple click
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickActions((prev) => !prev);

    // Haptic feedback si está disponible
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, []);

  const handleCloseMenu = useCallback(() => {
    console.log('✖️ Closing quick actions menu');
    setShowQuickActions(false);
  }, []);

  const handleActionSelect = useCallback((actionType) => {
    console.log('🎯 Quick action selected:', actionType);
    
    switch (actionType) {
      case 'search':
        console.log('🔍 Navigating to search...');
        navigate('/search');
        break;
      // 🎯 MVP VS-ONLY: 'moments' y 'live' deshabilitados en el MVP
      // case 'moments':
      //   console.log('📸 Moments action - Coming soon...');
      //   break;
      default:
        console.log('❓ Unknown or hidden action:', actionType);
    }
  }, [navigate]);

  return (
    <>
      <div
        onClick={handleClick}
        className={`${className} flex items-center justify-center cursor-pointer select-none transition-all duration-300 ${
          isPressed 
            ? 'scale-110' 
            : 'hover:scale-105'
        }`}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          background: 'transparent',
          // Forzar eliminación de cualquier outline o ring del navegador
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          // Eliminar cualquier ring o outline en todos los estados
          '&:focus': {
            outline: 'none !important',
            boxShadow: 'none !important',
            border: 'none !important'
          },
          '&:active': {
            outline: 'none !important',
            boxShadow: 'none !important',
            border: 'none !important'
          },
          '&:hover': {
            outline: 'none !important',
            boxShadow: 'none !important',
            border: 'none !important'
          }
        }}
        title="Toca para ver acciones rápidas"
      >
        {/* Efectos eliminados para quitar cualquier anillo visual */}
        
        <CustomLogo 
          size={size} 
          className={`transition-all duration-300 ${
            isPressed ? 'brightness-110 drop-shadow-lg' : 'hover:brightness-105'
          }`} 
        />
        
        {/* Indicador de carga eliminado para quitar anillo */}
      </div>

      {/* Menú de acciones rápidas */}
      <QuickActionsMenu 
        isVisible={showQuickActions}
        onClose={handleCloseMenu}
        onActionSelect={handleActionSelect}
      />
    </>
  );
};

export default LogoWithQuickActions;