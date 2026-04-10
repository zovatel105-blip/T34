import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Facebook, MessageCircle, Copy, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from '../hooks/use-toast';

const ShareModal = ({ isOpen, onClose, content }) => {
  const [isMobile, setIsMobile] = useState(false);
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    isDragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };
  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
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
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(100%)';
      setTimeout(onClose, 300);
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }
    currentTranslateY.current = 0;
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!content) return null;

  const { type, title, description, url, imageUrl } = content;

  // URLs para compartir en diferentes plataformas
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title + ' - ' + description)}&url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + '\n' + description + '\n' + url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title + ' - ' + description)}`,
  };

  const handleShare = async (platform) => {
    try {
      switch (platform) {
        case 'instagram':
          // Instagram no permite compartir directo por URL, copiamos al portapapeles
          await copyToClipboard(url);
          toast({
            title: "📱 Copiado para Instagram",
            description: "El enlace se ha copiado. Pégalo en tu story o post de Instagram",
          });
          break;
        
        case 'tiktok':
          // TikTok tampoco permite compartir directo por URL
          await copyToClipboard(url);
          toast({
            title: "🎵 Copiado para TikTok", 
            description: "El enlace se ha copiado. Pégalo en tu video de TikTok",
          });
          break;

        case 'copy':
          await copyToClipboard(url);
          toast({
            title: "🔗 Enlace copiado",
            description: "El enlace se ha copiado al portapapeles",
          });
          break;

        default:
          // Para Facebook, Twitter, WhatsApp, Telegram
          window.open(shareUrls[platform], '_blank', 'width=600,height=400');
          toast({
            title: "🚀 Compartiendo...",
            description: `Abriendo ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
          });
          break;
      }
      
      // Cerrar modal después de compartir
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error al compartir:', error);
      toast({
        title: "❌ Error al compartir",
        description: "Hubo un problema al intentar compartir el contenido",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async (text) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback para navegadores más antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const platforms = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
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
      color: 'bg-black hover:bg-gray-800',
      description: 'Compartir en X (Twitter)'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Compartir por WhatsApp'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785L24 5.405c.309-1.239-.473-1.8-1.335-1.688z"/>
        </svg>
      ),
      color: 'bg-blue-500 hover:bg-blue-600',
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
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
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
      color: 'bg-gray-900 hover:bg-gray-800',
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
          className={
            isMobile 
              ? "fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
              : "fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          }
          onClick={onClose}
        >
          <motion.div
            ref={sheetRef}
            initial={
              isMobile 
                ? { y: "100%", opacity: 1 }
                : { scale: 0.95, opacity: 0 }
            }
            animate={
              isMobile 
                ? { y: "0%", opacity: 1 }
                : { scale: 1, opacity: 1 }
            }
            exit={
              isMobile 
                ? { y: "100%", opacity: 1 }
                : { scale: 0.95, opacity: 0 }
            }
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3
            }}
            className={
              isMobile
                ? "bg-white rounded-t-3xl p-6 w-full fixed bottom-0 left-0 right-0 max-h-[60vh] overflow-y-auto"
                : "bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            }
            onClick={(e) => e.stopPropagation()}
            onTouchStart={isMobile ? handleTouchStart : undefined}
            onTouchMove={isMobile ? handleTouchMove : undefined}
            onTouchEnd={isMobile ? handleTouchEnd : undefined}
            style={isMobile ? { 
              paddingBottom: `max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)))`
            } : {}}
          >
            {/* Drag Indicator for Mobile */}
            {isMobile && (
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Compartir {type === 'poll' ? 'Votación' : 'Perfil'}
              </h3>
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Content Preview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
              <p className="text-sm text-gray-600 mb-2">{description}</p>
              <p className="text-xs text-gray-500 truncate">{url}</p>
            </div>

            {/* Platform Options */}
            <div className="space-y-3">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <motion.button
                    key={platform.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleShare(platform.id)}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg text-white transition-colors ${platform.color}`}
                  >
                    <Icon className="h-6 w-6" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{platform.name}</div>
                      <div className="text-xs opacity-90">{platform.description}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 opacity-70" />
                  </motion.button>
                );
              })}
              
              {/* Copy Link Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-4 p-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors"
              >
                <Copy className="h-6 w-6" />
                <div className="flex-1 text-left">
                  <div className="font-semibold">Copiar Enlace</div>
                  <div className="text-xs opacity-90">Copiar al portapapeles</div>
                </div>
              </motion.button>
            </div>

            {/* Mobile Close Button */}
            {isMobile && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full py-3 text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  Cerrar
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ShareModal;