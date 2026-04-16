import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles, Minus } from 'lucide-react';
import { Button } from './ui/button';
import CommentSection from './CommentSection';
import { cn } from '../lib/utils';
import { useTikTok } from '../contexts/TikTokContext';
import { useNavPreference } from '../hooks/useNavPreference';

const CommentsModal = ({ 
  isOpen, 
  onClose, 
  pollId, 
  pollTitle = "Comentarios",
  pollAuthor = null,
  commentsEnabled = true
}) => {
  const modalRef = useRef(null);
  const scrollRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const { hideRightNavigationBar, showRightNavigationBar } = useTikTok();
  const { isBottomNav } = useNavPreference();
  
  const didHideNavRef = useRef(false);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e) => {
    const scrollEl = scrollRef.current;
    if (scrollEl && scrollEl.scrollTop > 0) return;
    dragStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    isDragging.current = true;
    if (modalRef.current) modalRef.current.style.transition = 'none';
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    if (deltaY > 0) {
      e.preventDefault();
      currentTranslateY.current = deltaY;
      if (modalRef.current) modalRef.current.style.transform = `translateY(${deltaY}px)`;
    } else {
      isDragging.current = false;
      if (modalRef.current) {
        modalRef.current.style.transition = 'transform 0.2s ease-out';
        modalRef.current.style.transform = 'translateY(0)';
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (modalRef.current) modalRef.current.style.transition = 'transform 0.3s ease-out';
    if (currentTranslateY.current > 80) {
      if (modalRef.current) modalRef.current.style.transform = 'translateY(100%)';
      setTimeout(onClose, 300);
    } else {
      if (modalRef.current) modalRef.current.style.transform = 'translateY(0)';
    }
    currentTranslateY.current = 0;
  };

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Manejar apertura/cierre del modal: scroll y navegación lateral
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
      // Ocultar la barra de navegación lateral y marcar que este modal lo hizo
      hideRightNavigationBar();
      didHideNavRef.current = true;
    } else if (didHideNavRef.current) {
      // Solo restaurar si ESTE modal específico ocultó la navegación
      document.body.style.overflow = 'unset';
      showRightNavigationBar();
      didHideNavRef.current = false;
    }

    // Cleanup: Solo restaurar si este modal específico ocultó la navegación
    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (didHideNavRef.current) {
        document.body.style.overflow = 'unset';
        showRightNavigationBar();
        didHideNavRef.current = false;
      }
    };
  }, [isOpen, onClose, hideRightNavigationBar, showRightNavigationBar]);

  // Click outside para cerrar
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Variantes de animación
  const modalVariants = {
    hidden: isMobile 
      ? { opacity: 0, y: "100%" } 
      : { opacity: 0, scale: 0.85, y: 60 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0 
    },
    exit: isMobile 
      ? { opacity: 0, y: "100%" }
      : { opacity: 0, scale: 0.85, y: 60 }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        />
        
        {/* Modal Container */}
        <div className={cn(
          "flex h-full",
          isMobile ? "items-end justify-center" : "items-center justify-center p-4"
        )}>
          <motion.div
            ref={modalRef}
            className={cn(
              "relative shadow-2xl overflow-hidden flex flex-col",
              isMobile && isBottomNav
                ? "w-full h-[50vh] max-h-[60vh] rounded-t-3xl bg-white"
                : isMobile 
                  ? "w-full h-[75vh] max-h-[85vh] rounded-t-3xl safe-area-inset-bottom bg-zinc-900" 
                  : "w-full max-w-2xl max-h-[92vh] rounded-2xl bg-zinc-900"
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ 
              type: "spring", 
              stiffness: 380, 
              damping: 30,
              duration: 0.4 
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Handle superior */}
            <div className={cn("w-full py-2 flex justify-center flex-shrink-0", isBottomNav && isMobile ? "bg-white" : "bg-zinc-900")}>
              <div className={cn(
                "rounded-full",
                isMobile ? "w-10 h-1" : "w-12 h-1",
                isBottomNav && isMobile ? "bg-gray-300" : "bg-zinc-600"
              )} />
            </div>

            {/* Header */}
            <div className={cn("sticky top-0 z-10 px-4 sm:px-6 py-3 flex-shrink-0", isBottomNav && isMobile ? "bg-white" : "bg-zinc-900")}>
              <div className="flex items-center justify-center">
                <h2 className={cn(
                  "font-semibold text-center",
                  isMobile ? "text-base" : "text-lg",
                  isBottomNav && isMobile ? "text-gray-900" : "text-white"
                )}>
                  Comentarios
                </h2>
              </div>
            </div>
            
            {/* Contenido */}
            <div ref={scrollRef} className="flex-1 flex flex-col overflow-hidden overflow-y-auto">
              {!commentsEnabled ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className="text-zinc-500 text-center text-base">
                    Este creador desactivó los comentarios
                  </p>
                </div>
              ) : (
                <CommentSection
                  pollId={pollId}
                  isVisible={isOpen}
                  maxHeight="100%"
                  showHeader={false}
                  darkMode={!(isBottomNav && isMobile)}
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default CommentsModal;