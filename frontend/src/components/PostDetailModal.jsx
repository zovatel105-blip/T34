import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import CommentSection from './CommentSection';
import { useTikTok } from '../contexts/TikTokContext';

const PostDetailModal = ({ 
  isOpen, 
  onClose, 
  poll,
  isFollowing = false,
  onFollow,
  commentsEnabled = true
}) => {
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);
  const { hideRightNavigationBar, showRightNavigationBar } = useTikTok();
  const didHideNavRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      hideRightNavigationBar();
      didHideNavRef.current = true;
    } else if (didHideNavRef.current) {
      showRightNavigationBar();
      didHideNavRef.current = false;
    }
    return () => {
      if (didHideNavRef.current) {
        showRightNavigationBar();
        didHideNavRef.current = false;
      }
    };
  }, [isOpen, hideRightNavigationBar, showRightNavigationBar]);

  const scrollRef = useRef(null);

  const handleTouchStart = (e) => {
    // Solo permitir drag si el scroll está arriba del todo
    const scrollEl = scrollRef.current;
    if (scrollEl && scrollEl.scrollTop > 0) return;
    dragStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    isDragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    if (deltaY > 0) {
      e.preventDefault();
      currentTranslateY.current = deltaY;
      if (sheetRef.current) sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    } else {
      // User is scrolling up, cancel drag
      isDragging.current = false;
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.2s ease-out';
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 0.3s ease-out';
    if (currentTranslateY.current > 80) {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(100%)';
      setTimeout(onClose, 300);
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }
    currentTranslateY.current = 0;
  };

  const handleMouseDown = (e) => {
    const startY = e.clientY;
    let translateY = 0;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
    const onMouseMove = (ev) => {
      const delta = ev.clientY - startY;
      if (delta > 0) {
        translateY = delta;
        if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (sheetRef.current) sheetRef.current.style.transition = 'transform 0.3s ease-out';
      if (translateY > 80) {
        if (sheetRef.current) sheetRef.current.style.transform = 'translateY(100%)';
        setTimeout(onClose, 300);
      } else {
        if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (!isOpen || !poll) return null;

  const authorName = poll.author?.display_name || poll.author?.username || poll.authorUser?.displayName || 'Usuario';
  const authorAvatar = poll.author?.avatar_url || poll.authorUser?.avatar;
  const authorUsername = poll.author?.username || poll.authorUser?.username || authorName;

  const formatDate = () => {
    if (poll.created_at) {
      const date = new Date(poll.created_at);
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    }
    return poll.timeAgo || '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            className="relative z-10 bg-zinc-900 rounded-t-3xl w-full max-h-[80vh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
            >
              <div className="w-10 h-1 bg-zinc-600 rounded-full" />
            </div>
            
            {/* Scrollable Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
              {/* Post Header */}
              <div className="px-4 pt-2 pb-4">
                {/* Author */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={authorAvatar} className="object-cover" />
                    <AvatarFallback className="bg-white text-gray-600">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <span className="text-white font-bold text-base flex-1">
                    {authorUsername}
                  </span>
                  
                  {!isFollowing && onFollow && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFollow();
                      }}
                      className="px-5 py-1.5 rounded-full text-white text-sm font-semibold hover:opacity-90 transition-colors"
                      style={{ backgroundColor: '#B061FF' }}
                    >
                      Seguir
                    </button>
                  )}
                </div>

                {/* Post Title */}
                <p className="text-white text-base leading-relaxed mb-3">
                  {poll.title}
                </p>

                {/* Date */}
                <p className="text-zinc-500 text-sm">
                  {formatDate()}
                </p>
              </div>

              {/* Separator */}
              <div className="border-t border-zinc-800" />

              {/* Comments */}
              <div>
                {commentsEnabled ? (
                  <CommentSection
                    pollId={poll.id}
                    isVisible={isOpen}
                    maxHeight="100%"
                    showHeader={false}
                    darkMode={true}
                  />
                ) : (
                  <div className="flex items-center justify-center p-8">
                    <p className="text-zinc-500 text-center text-sm">
                      Los comentarios están desactivados
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PostDetailModal;
