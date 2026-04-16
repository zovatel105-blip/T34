import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles, Minus, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  
  const didHideNavRef = useRef(false);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);

  const isBottomSheet = isMobile && isBottomNav;

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

    if (isBottomSheet && !isExpanded && deltaY < -30) {
      // Dragging up while half-open → expand
      isDragging.current = false;
      if (modalRef.current) {
        modalRef.current.style.transition = 'transform 0.2s ease-out';
        modalRef.current.style.transform = 'translateY(0)';
      }
      setIsExpanded(true);
      return;
    }

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
      if (isBottomSheet && isExpanded) {
        // Dragging down while expanded → collapse to half
        if (modalRef.current) modalRef.current.style.transform = 'translateY(0)';
        setIsExpanded(false);
      } else {
        // Dragging down while half-open → close
        if (modalRef.current) modalRef.current.style.transform = 'translateY(100%)';
        setTimeout(onClose, 300);
      }
    } else {
      if (modalRef.current) modalRef.current.style.transform = 'translateY(0)';
    }
    currentTranslateY.current = 0;
  };

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Reset expanded on close
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle open/close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      hideRightNavigationBar();
      didHideNavRef.current = true;
    } else if (didHideNavRef.current) {
      document.body.style.overflow = 'unset';
      showRightNavigationBar();
      didHideNavRef.current = false;
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (didHideNavRef.current) {
        document.body.style.overflow = 'unset';
        showRightNavigationBar();
        didHideNavRef.current = false;
      }
    };
  }, [isOpen, onClose, hideRightNavigationBar, showRightNavigationBar]);

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (isBottomSheet && isExpanded) {
        setIsExpanded(false);
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  // Animation variants
  const modalVariants = {
    hidden: isMobile 
      ? { opacity: 0, y: "100%" } 
      : { opacity: 0, scale: 0.85, y: 60 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: isMobile 
      ? { opacity: 0, y: "100%" }
      : { opacity: 0, scale: 0.85, y: 60 }
  };

  // Bottom sheet height classes
  const getSheetClasses = () => {
    if (isBottomSheet) {
      if (isExpanded) {
        return "w-full h-[95vh] rounded-t-3xl bg-white";
      }
      return "w-full h-[42vh] rounded-t-3xl bg-white";
    }
    if (isMobile) {
      return "w-full h-[75vh] max-h-[85vh] rounded-t-3xl safe-area-inset-bottom bg-zinc-900";
    }
    return "w-full max-w-2xl max-h-[92vh] rounded-2xl bg-zinc-900";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <motion.div
          className={cn(
            "absolute inset-0 backdrop-blur-md",
            isBottomSheet && !isExpanded ? "bg-black/40" : "bg-black/70"
          )}
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
              "relative shadow-2xl overflow-hidden flex flex-col transition-all duration-300",
              getSheetClasses()
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", stiffness: 380, damping: 30, duration: 0.4 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Chevron indicator for bottom sheet */}
            {isBottomSheet ? (
              <button 
                onClick={toggleExpand}
                className="w-full py-2 flex justify-center flex-shrink-0 bg-white active:bg-gray-50"
              >
                {isExpanded ? (
                  <ChevronDown className="w-6 h-6 text-gray-400" strokeWidth={2.5} />
                ) : (
                  <ChevronUp className="w-6 h-6 text-gray-400" strokeWidth={2.5} />
                )}
              </button>
            ) : (
              /* Handle for non-bottom-sheet */
              <div className="w-full py-2 flex justify-center flex-shrink-0 bg-zinc-900">
                <div className={cn("rounded-full", isMobile ? "w-10 h-1" : "w-12 h-1", "bg-zinc-600")} />
              </div>
            )}

            {/* Header */}
            <div className={cn(
              "sticky top-0 z-10 px-4 sm:px-6 py-2 flex-shrink-0",
              isBottomSheet ? "bg-white border-b border-gray-100" : "bg-zinc-900"
            )}>
              <div className="flex items-center justify-center">
                <h2 className={cn(
                  "font-semibold text-center",
                  isMobile ? "text-sm" : "text-lg",
                  isBottomSheet ? "text-gray-900" : "text-white"
                )}>
                  Comentarios
                </h2>
              </div>
            </div>
            
            {/* Content */}
            <div ref={scrollRef} className="flex-1 flex flex-col overflow-hidden overflow-y-auto">
              {!commentsEnabled ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className={cn("text-center text-base", isBottomSheet ? "text-gray-400" : "text-zinc-500")}>
                    Este creador desactivó los comentarios
                  </p>
                </div>
              ) : (
                <CommentSection
                  pollId={pollId}
                  isVisible={isOpen}
                  maxHeight="100%"
                  showHeader={false}
                  darkMode={!isBottomSheet}
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
