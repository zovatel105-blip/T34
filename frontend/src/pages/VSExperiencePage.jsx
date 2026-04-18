import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import voiceService from '../services/voiceService';

// Componente para una sola pregunta VS
const VSQuestion = ({ 
  question, 
  isActive, 
  onVote, 
  hasVoted, 
  selectedOption, 
  votes,
  onComplete,
  creatorCountry  // País donde se creó la publicación
}) => {
  const [highlightedOption, setHighlightedOption] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const speechRef = useRef(null);
  const timeoutRef = useRef(null);
  const autoAdvanceRef = useRef(null);

  // Colores para las opciones
  const optionColors = [
    { bg: 'from-orange-500 to-amber-500', highlight: 'ring-4 ring-white' },
    { bg: 'from-blue-500 to-cyan-500', highlight: 'ring-4 ring-white' }
  ];

  // Text-to-Speech para presentar las opciones con detección automática de idioma
  const speakOptions = useCallback(() => {
    if (!isActive || hasVoted) return;
    
    // Cancelar cualquier speech anterior
    voiceService.stop();
    
    const options = question.options;
    let currentIndex = 0;
    
    const speakNext = async () => {
      if (currentIndex >= options.length || !isActive) {
        setHighlightedOption(null);
        return;
      }
      
      const option = options[currentIndex];
      setHighlightedOption(option.id);
      
      // Texto a hablar (con fallback para opciones sin texto)
      const textToSpeak = option.text || `Opción ${currentIndex + 1}`;
      
      // Usar el servicio de voz con el país del creador para determinar el idioma
      // La voz preferida (femenina/masculina) se mantiene consistente entre idiomas
      await voiceService.speak(textToSpeak, {
        rate: 1.1,
        pitch: 1.0,
        country: creatorCountry,  // Usar país del creador para determinar idioma
        onEnd: () => {
          currentIndex++;
          if (currentIndex < options.length) {
            setTimeout(speakNext, 300);
          } else {
            setHighlightedOption(null);
          }
        },
        onError: () => {
          // En caso de error, continuar con la siguiente opción
          currentIndex++;
          if (currentIndex < options.length) {
            setTimeout(speakNext, 300);
          } else {
            setHighlightedOption(null);
          }
        }
      });
    };
    
    // Pequeño delay antes de empezar
    timeoutRef.current = setTimeout(speakNext, 500);
  }, [isActive, hasVoted, question.options, creatorCountry]);

  // Auto-avance si no vota
  useEffect(() => {
    if (!isActive || hasVoted) return;
    
    autoAdvanceRef.current = setTimeout(() => {
      if (!hasVoted) {
        onComplete();
      }
    }, 5000);
    
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, [isActive, hasVoted, onComplete]);

  // Iniciar speech cuando se activa
  useEffect(() => {
    if (isActive && !hasVoted) {
      speakOptions();
    }
    
    return () => {
      voiceService.stop();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive, hasVoted, speakOptions]);

  // Mostrar resultados después de votar
  useEffect(() => {
    if (hasVoted) {
      setShowResults(true);
      // Auto-avance después de votar
      const advanceTimeout = setTimeout(() => {
        onComplete();
      }, 1500);
      
      return () => clearTimeout(advanceTimeout);
    }
  }, [hasVoted, onComplete]);

  const handleVote = (optionId) => {
    if (hasVoted) return;
    
    // Detener audio inmediatamente
    voiceService.stop();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    
    onVote(question.id, optionId);
  };

  const getPercentage = (optionId) => {
    if (!votes || votes.total === 0) {
      // Simular votos si no hay datos reales
      const totalFake = Math.floor(Math.random() * 1000) + 100;
      const optionVotes = optionId === selectedOption 
        ? Math.floor(totalFake * (0.4 + Math.random() * 0.3))
        : Math.floor(totalFake * (0.3 + Math.random() * 0.3));
      return Math.round((optionVotes / totalFake) * 100);
    }
    return Math.round((votes[optionId] / votes.total) * 100);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {question.options.map((option, index) => {
        const isHighlighted = highlightedOption === option.id;
        const isSelected = selectedOption === option.id;
        const percentage = showResults ? getPercentage(option.id) : 0;
        
        return (
          <button
            key={option.id}
            onClick={() => handleVote(option.id)}
            disabled={hasVoted}
            className={cn(
              "flex-1 relative overflow-hidden transition-all duration-300",
              "flex items-center justify-center",
              isHighlighted && !hasVoted && "scale-[1.02] z-10",
              isSelected && "ring-4 ring-white ring-inset"
            )}
          >
            {/* Background - Image or Gradient */}
            {option.image ? (
              <img 
                src={option.image} 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br",
                optionColors[index]?.bg || 'from-gray-600 to-gray-800'
              )} />
            )}
            
            {/* Overlay oscuro para legibilidad */}
            <div className={cn(
              "absolute inset-0 transition-opacity duration-300",
              option.image ? "bg-black/40" : "bg-black/20",
              isHighlighted && !hasVoted && "bg-black/10"
            )} />
            
            {/* Barra de progreso de resultados */}
            {showResults && (
              <div 
                className="absolute bottom-0 left-0 right-0 bg-white/30 transition-all duration-700"
                style={{ height: `${percentage}%` }}
              />
            )}
            
            {/* Contenido */}
            <div className="relative z-10 text-center p-6">
              {/* Texto de la opción */}
              <h2 className={cn(
                "text-white font-bold transition-all duration-300",
                "text-3xl md:text-4xl",
                "drop-shadow-lg",
                isHighlighted && !hasVoted && "scale-110"
              )}>
                {option.text || `Opción ${index + 1}`}
              </h2>
              
              {/* Porcentaje después de votar */}
              {showResults && (
                <div className={cn(
                  "mt-4 transition-all duration-500",
                  "animate-in fade-in zoom-in"
                )}>
                  <span className="text-6xl md:text-7xl font-black text-white drop-shadow-lg">
                    {percentage}%
                  </span>
                </div>
              )}
            </div>
            
            {/* Indicador de selección */}
            {isSelected && (
              <div className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            
            {/* Línea divisora entre opciones */}
            {index === 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black" />
            )}
          </button>
        );
      })}
      
      {/* VS Badge en el centro */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className={cn(
          "w-16 h-16 md:w-20 md:h-20 rounded-full bg-black flex items-center justify-center",
          "shadow-2xl border-4 border-white"
        )}>
          <span className="text-white font-black text-xl md:text-2xl">VS</span>
        </div>
      </div>
    </div>
  );
};

// Página principal de la experiencia VS
const VSExperiencePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);
  
  // Obtener preguntas y país del creador del state
  const initialQuestions = location.state?.questions || [
    {
      id: 1,
      options: [
        { id: 'a', text: 'Pizza', image: null },
        { id: 'b', text: 'Hamburguesa', image: null }
      ]
    },
    {
      id: 2,
      options: [
        { id: 'a', text: 'Playa', image: null },
        { id: 'b', text: 'Montaña', image: null }
      ]
    },
    {
      id: 3,
      options: [
        { id: 'a', text: 'Netflix', image: null },
        { id: 'b', text: 'Salir', image: null }
      ]
    }
  ];
  
  // País donde se creó la publicación (determina el idioma de la voz)
  const creatorCountry = location.state?.creator_country || null;
  
  const [questions] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votedQuestions, setVotedQuestions] = useState({});
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const minSwipeDistance = 50;

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    if (currentIndex < questions.length - 1) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    } else {
      // Fin de la experiencia
      navigate('/feed');
    }
  }, [currentIndex, questions.length, isTransitioning, navigate]);

  const goToPrev = useCallback(() => {
    if (isTransitioning) return;
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, isTransitioning]);

  const handleVote = (questionId, optionId) => {
    setVotedQuestions(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  // Touch handlers para swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goToPrev();
      } else if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, navigate]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress indicators */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2" style={{ paddingTop: 'calc(var(--safe-area-inset-top) + 0.5rem)' }}>
        {questions.map((_, index) => (
          <div 
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              index < currentIndex ? "bg-white" :
              index === currentIndex ? "bg-white/80" : "bg-white/30"
            )}
          />
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute right-4 z-30 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
        style={{ top: 'calc(var(--safe-area-inset-top) + 2rem)' }}
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Questions carousel */}
      <div 
        className="h-full flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {questions.map((question, index) => (
          <div 
            key={question.id}
            className="w-full h-full flex-shrink-0"
          >
            <VSQuestion
              question={question}
              isActive={index === currentIndex}
              onVote={handleVote}
              hasVoted={!!votedQuestions[question.id]}
              selectedOption={votedQuestions[question.id]}
              votes={null}
              onComplete={goToNext}
              creatorCountry={creatorCountry}
            />
          </div>
        ))}
      </div>

      {/* Swipe hint - solo en la primera pregunta si no ha votado */}
      {currentIndex === 0 && !votedQuestions[questions[0]?.id] && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 animate-pulse">
          <div className="bg-black/60 px-4 py-2 rounded-full text-white/80 text-sm backdrop-blur-sm">
            Desliza o toca para elegir
          </div>
        </div>
      )}
    </div>
  );
};

export default VSExperiencePage;
