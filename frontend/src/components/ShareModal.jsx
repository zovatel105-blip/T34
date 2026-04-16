import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Facebook, MessageCircle, Copy, ExternalLink, Link, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { cn } from '../lib/utils';
import { useNavPreference } from '../hooks/useNavPreference';

const ShareModal = ({ isOpen, onClose, content }) => {
  const [isMobile, setIsMobile] = useState(false);
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);
  const { isBottomNav } = useNavPreference();
  const [isExpanded, setIsExpanded] = useState(false);
  const isBottomSheet = isMobile && isBottomNav;

  const handleTouchStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    isDragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };
  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;

    if (isBottomSheet && !isExpanded && deltaY < -30) {
      isDragging.current = false;
      if (sheetRef.current) { sheetRef.current.style.transition = 'transform 0.2s ease-out'; sheetRef.current.style.transform = 'translateY(0)'; }
      setIsExpanded(true);
      return;
    }

    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      if (sheetRef.current) sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    } else {
      isDragging.current = false;
      if (sheetRef.current) { sheetRef.current.style.transition = 'transform 0.2s ease-out'; sheetRef.current.style.transform = 'translateY(0)'; }
    }
  };
  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 0.3s ease-out';
    if (currentTranslateY.current > 80) {
      if (isBottomSheet && isExpanded) {
        if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
        setIsExpanded(false);
      } else {
        if (sheetRef.current) sheetRef.current.style.transform = 'translateY(100%)';
        setTimeout(onClose, 300);
      }
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }
    currentTranslateY.current = 0;
  };

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) setIsExpanded(false);
  }, [isOpen]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!content) return null;

  const { type, title, description, url } = content;

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title + ' - ' + description)}&url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + '\n' + description + '\n' + url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title + ' - ' + description)}`,
  };

  const copyToClipboard = async (text) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleShare = async (platform) => {
    try {
      switch (platform) {
        case 'instagram':
        case 'tiktok':
        case 'copy':
          await copyToClipboard(url);
          toast({
            title: platform === 'copy' ? "Enlace copiado" : `Copiado para ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
            description: "El enlace se ha copiado al portapapeles",
          });
          break;
        default:
          window.open(shareUrls[platform], '_blank', 'width=600,height=400');
          toast({
            title: "Compartiendo...",
            description: `Abriendo ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
          });
          break;
      }
      setTimeout(onClose, 1000);
    } catch (error) {
      console.error('Error al compartir:', error);
      toast({ title: "Error al compartir", description: "Hubo un problema al intentar compartir", variant: "destructive" });
    }
  };

  const platforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      description: 'Compartir por WhatsApp'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      description: 'Compartir en Facebook'
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      description: 'Compartir en X (Twitter)'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785L24 5.405c.309-1.239-.473-1.8-1.335-1.688z"/>
        </svg>
      ),
      description: 'Compartir en Telegram'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      description: 'Copiar para Instagram'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-1.32-.17A6.57 6.57 0 0 0 3.5 15.768a6.57 6.57 0 0 0 6.57 6.57 6.57 6.57 0 0 0 6.57-6.57V9.379a8.365 8.365 0 0 0 3.766 1.355 8.365 8.365 0 0 0 1.183-.001V7.016h-.035a4.795 4.795 0 0 1-1.965-.33z"/>
        </svg>
      ),
      description: 'Copiar para TikTok'
    }
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn("fixed inset-0 backdrop-blur-md z-[9999] flex items-end justify-center", isBottomSheet && !isExpanded ? "bg-black/40" : "bg-black/70")}
          onClick={onClose}
        >
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "rounded-t-3xl w-full overflow-y-auto shadow-2xl transition-all duration-300",
              isBottomSheet 
                ? (isExpanded ? "bg-white max-h-[95vh]" : "bg-white max-h-[42vh]")
                : "bg-zinc-900 max-h-[85vh]"
            )}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ paddingBottom: `max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)))` }}
          >
            {/* Handle/Chevron */}
            {isBottomSheet ? (
              <button 
                onClick={toggleExpand}
                className="w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing bg-white active:bg-gray-50"
              >
                {isExpanded ? (
                  <ChevronDown className="w-6 h-6 text-gray-400" strokeWidth={2.5} />
                ) : (
                  <ChevronUp className="w-6 h-6 text-gray-400" strokeWidth={2.5} />
                )}
              </button>
            ) : (
              <div className="w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-center">
              <h3 className={cn("font-semibold text-base", isBottomSheet ? "text-gray-900" : "text-white")}>
                Compartir {type === 'poll' ? 'Votación' : 'Perfil'}
              </h3>
            </div>

            {/* Content Preview */}
            <div className={cn("mx-4 mb-4 p-4 rounded-2xl", isBottomSheet ? "bg-gray-100" : "bg-zinc-800")}>
              <p className={cn("font-medium text-sm mb-1", isBottomSheet ? "text-gray-900" : "text-white")}>{title}</p>
              <p className={cn("text-xs mb-2", isBottomSheet ? "text-gray-500" : "text-zinc-400")}>{description}</p>
              <p className={cn("text-xs truncate", isBottomSheet ? "text-gray-400" : "text-zinc-500")}>{url}</p>
            </div>

            {/* Platform Options */}
            <div className="px-4 pb-4 flex flex-col gap-3">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => handleShare(platform.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl transition-colors text-left",
                      isBottomSheet ? "bg-gray-100 hover:bg-gray-200" : "bg-zinc-800 hover:bg-zinc-700"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", isBottomSheet ? "bg-indigo-100" : "bg-indigo-500/20")}>
                      <Icon className={cn("w-5 h-5", isBottomSheet ? "text-indigo-500" : "text-indigo-400")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-semibold text-sm", isBottomSheet ? "text-gray-900" : "text-white")}>{platform.name}</p>
                      <p className={cn("text-xs", isBottomSheet ? "text-gray-500" : "text-zinc-400")}>{platform.description}</p>
                    </div>
                  </button>
                );
              })}
              
              {/* Copy Link */}
              <button
                onClick={() => handleShare('copy')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl transition-colors text-left",
                  isBottomSheet ? "bg-gray-100 hover:bg-gray-200" : "bg-zinc-800 hover:bg-zinc-700"
                )}
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", isBottomSheet ? "bg-purple-100" : "bg-purple-500/20")}>
                  <Link className={cn("w-5 h-5", isBottomSheet ? "text-purple-500" : "text-purple-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold text-sm", isBottomSheet ? "text-gray-900" : "text-white")}>Copiar enlace</p>
                  <p className={cn("text-xs", isBottomSheet ? "text-gray-500" : "text-zinc-400")}>Copiar al portapapeles</p>
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ShareModal;
