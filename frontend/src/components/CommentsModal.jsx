import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles, Minus } from 'lucide-react';
import { Button } from './ui/button';
import CommentSection from './CommentSection';
import { cn } from '../lib/utils';
import { useTikTok } from '../contexts/TikTokContext';

const CommentsModal = ({ 
  isOpen, 
  onClose, 
  pollId, 
  pollTitle = "Comentarios",
  pollAuthor = null,
  commentsEnabled = true
}) => {
  const modalRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const { hideRightNavigationBar, showRightNavigationBar } = useTikTok();
  
  // Ref para rastrear si este modal específico ocultó la barra de navegación
  const didHideNavRef = useRef(false);

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
              "relative bg-zinc-900 shadow-2xl overflow-hidden flex flex-col",
              isMobile 
                ? "w-full h-[75vh] max-h-[85vh] rounded-t-3xl safe-area-inset-bottom" 
                : "w-full max-w-2xl max-h-[92vh] rounded-2xl"
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
          >
            {/* Handle superior */}
            <div className="w-full py-2 flex justify-center bg-zinc-900 flex-shrink-0">
              <div className={cn(
                "bg-zinc-600 rounded-full",
                isMobile ? "w-10 h-1" : "w-12 h-1"
              )} />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-900 px-4 sm:px-6 py-3 flex-shrink-0">
              <div className="flex items-center justify-center">
                <h2 className={cn(
                  "font-semibold text-white text-center",
                  isMobile ? "text-base" : "text-lg"
                )}>
                  Comentarios
                </h2>
              </div>
            </div>
            
            {/* Contenido */}
            <div className="flex-1 flex flex-col overflow-hidden">
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
                  darkMode={true}
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