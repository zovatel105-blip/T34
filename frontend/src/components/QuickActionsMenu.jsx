import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, User, Settings, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';

// Ícono personalizado de historia con + en esquina inferior
const StoryPlusIcon = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Círculo principal más grande */}
    <circle
      cx="13"
      cy="13"
      r="11"
      stroke="currentColor"
      strokeWidth="2.2"
      fill="none"
    />
    {/* Círculo blanco en esquina inferior derecha */}
    <circle
      cx="19"
      cy="20.5"
      r="5.5"
      fill="white"
    />
    {/* Cruz del + en naranja más fino */}
    <line
      x1="19"
      y1="17.5"
      x2="19"
      y2="23.5"
      stroke="#f97316"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="20.5"
      x2="22"
      y2="20.5"
      stroke="#f97316"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Ícono personalizado de LIVE estilo TikTok
const TikTokLiveIcon = ({ size = 16, className = "" }) => {
  return (
    <svg
      width={size * 2.2}
      height={size * 2.2}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Antena izquierda - más cerca del centro */}
      <line
        x1="42"
        y1="20"
        x2="32"
        y2="5"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      
      {/* Antena derecha - más cerca del centro */}
      <line
        x1="58"
        y1="20"
        x2="68"
        y2="5"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      
      {/* Arco superior del TV */}
      <path
        d="M 20 30 Q 20 20 30 20 L 70 20 Q 80 20 80 30"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Arco inferior del TV (base) - igual que el superior */}
      <path
        d="M 20 70 Q 20 80 30 80 L 70 80 Q 80 80 80 70"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Texto LIVE centrado entre los dos arcos - un poco más abajo */}
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fill="currentColor"
        fontSize="24"
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        letterSpacing="1"
      >
        LIVE
      </text>
    </svg>
  );
};

const QuickActionsMenu = ({ isVisible, onClose, onActionSelect }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isVisible]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible, onClose]);

  const handleActionClick = (actionType) => {
    setSelectedAction(actionType);
    
    setTimeout(() => {
      switch (actionType) {
        case 'search':
          handleSearch();
          break;
        case 'moments':
          handleMoments();
          break;
        case 'moments':
          handleMoments();
          break;

        case 'settings':
          handleSettings();
          break;
        case 'live':
          handleLive();
          break;
        default:
          break;
      }
      onClose();
      setSelectedAction(null);
    }, 200);
  };

  const handleSearch = () => {
    toast({
      title: "🔍 Abriendo búsqueda...",
      description: "Navegando a la página de búsqueda",
    });
    
    navigate('/search');
    
    if (onActionSelect) {
      onActionSelect('search');
    }
  };

  const handleMoments = () => {
    toast({
      title: "📸 Crear Historia",
      description: "Abriendo editor de historias...",
      duration: 2000,
    });
    
    navigate('/story-creation');
    
    if (onActionSelect) {
      onActionSelect('moments');
    }
  };

  const handleCreate = () => {
    toast({
      title: "✨ Crear publicación...",
      description: "Abriendo formulario de creación",
    });
    
    // Aquí se puede disparar el modal de crear publicación
    // O navegar a una página dedicada
    const createEvent = new CustomEvent('openCreateModal');
    window.dispatchEvent(createEvent);
    
    if (onActionSelect) {
      onActionSelect('create');
    }
  };

  const handleProfile = () => {
    toast({
      title: "👤 Mi perfil...",
      description: "Navegando a tu perfil",
    });
    
    navigate('/profile');
    
    if (onActionSelect) {
      onActionSelect('profile');
    }
  };

  const handleSettings = () => {
    toast({
      title: "⚙️ Configuraciones...",
      description: "Abriendo ajustes",
    });
    
    navigate('/settings');
    
    if (onActionSelect) {
      onActionSelect('settings');
    }
  };

  const handleLive = () => {
    toast({
      title: "🔴 LIVE Streaming",
      description: "¡Próximamente! La mejor plataforma de retos y batallas en vivo",
      duration: 4000,
    });
    
    // Futuro: navegar a la página de live streaming
    // navigate('/live');
    
    if (onActionSelect) {
      onActionSelect('live');
    }
  };

  if (!isVisible && !isAnimating) return null;

  const actions = [
    {
      id: 'moments',
      icon: StoryPlusIcon,
      label: 'Historias',
      color: 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
      borderColor: 'border-orange-300',
      shadowColor: 'shadow-orange-500/50',
      position: { x: -28, y: 8 }, // SUBIDO: 8px más arriba
    },
    {
      id: 'search',
      icon: Search,
      label: 'Buscar',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      borderColor: 'border-blue-300',
      shadowColor: 'shadow-blue-500/50',
      position: { x: -35, y: -13 }, // SUBIDO: 8px más arriba
    },
    {
      id: 'live',
      icon: TikTokLiveIcon,
      label: 'LIVE',
      color: 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
      borderColor: 'border-red-300',
      shadowColor: 'shadow-red-500/50',
      position: { x: -8, y: 16 }, // AJUSTADO: manteniendo distancia proporcional
    }
  ];

  return (
    <div 
      ref={menuRef}
      className="fixed top-4 right-4 z-[10001]"
      style={{ 
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 10001,
      }}
    >


      {/* Centro del menú - Sin logo duplicado */}
      <div className="relative">



        {/* Botones de acción radiales */}
        {actions.map((action, index) => {
          const Icon = action.icon;
          const isSelected = selectedAction === action.id;
          const isLiveAction = action.id === 'live';
          const isMomentsAction = action.id === 'moments';
          
          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              className={`
                group absolute rounded-full shadow-lg transition-all duration-500 transform
                ${action.color} ${action.borderColor} ${action.shadowColor}
                ${isSelected ? 'scale-125 ring-4 ring-black/50' : 'hover:scale-110 active:scale-95'}
                flex items-center justify-center border-2 w-10 h-10
              `}
              style={{
                left: `${action.position.x}px`,
                top: `${action.position.y}px`,
                transform: isVisible 
                  ? `translate(${action.position.x}px, ${action.position.y}px) scale(${isSelected ? 1.25 : 1})` 
                  : 'translate(0px, 0px) scale(0)',
                transitionDelay: isVisible ? `${index * 100}ms` : '0ms',
              }}
            >
              <Icon 
                size={isLiveAction ? 11 : isMomentsAction ? 17 : 16} 
                className={`text-white transition-all duration-200 ${
                  isSelected ? 'scale-125' : 'group-hover:scale-110'
                }`} 
              />
            </button>
          );
        })}

        {/* Líneas de conexión animadas */}
        <svg 
          className="absolute top-5 left-5 w-0 h-0 pointer-events-none"
          style={{ zIndex: -1 }}
        >
          {actions.map((action, index) => (
            <line
              key={`line-${action.id}`}
              x1="0"
              y1="0"
              x2={action.position.x}
              y2={action.position.y}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="2"
              strokeDasharray="4,4"
              className={`transition-all duration-500 ${
                isVisible ? 'opacity-60' : 'opacity-0'
              }`}
              style={{
                transitionDelay: isVisible ? `${index * 100 + 200}ms` : '0ms',
              }}
            />
          ))}
        </svg>
      </div>


    </div>
  );
};

export default QuickActionsMenu;