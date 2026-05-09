import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, MoreVertical, EyeOff, UserX, Bell, BellOff, Flag, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import AppConfig from '../config/config';

const REPORT_CATEGORIES = [
  { id: 'spam', label: 'Spam', icon: '', description: 'Contenido no deseado o repetitivo' },
  { id: 'harassment', label: 'Acoso', icon: '', description: 'Comportamiento abusivo o intimidatorio' },
  { id: 'hate', label: 'Discurso de odio', icon: '', description: 'Contenido que promueve odio o discriminación' },
  { id: 'violence', label: 'Violencia', icon: '', description: 'Contenido violento o que incita a la violencia' },
  { id: 'nudity', label: 'Desnudez/Sexual', icon: '', description: 'Contenido sexual explícito o desnudez' },
  { id: 'misinformation', label: 'Información falsa', icon: '', description: 'Información incorrecta o engañosa' },
  { id: 'other', label: 'Otro', icon: '', description: 'Otro tipo de contenido inapropiado' }
];

const FeedMenu = ({ 
  poll, 
  onNotInterested, 
  onHideUser, 
  onToggleNotifications, 
  onReport,
  className = "",
  isNotificationEnabled = false,
  onOpenChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Swipe-to-close state
  const sheetRef = useRef(null);
  const touchStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);
  
  const handleSetIsOpen = (value) => {
    setIsOpen(value);
    if (onOpenChange) {
      onOpenChange(value);
    }
  };
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportCategory, setSelectedReportCategory] = useState(null);
  const [reportComment, setReportComment] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Swipe handlers
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    }
    if (currentTranslateY.current > 100) {
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(100%)`;
      }
      setTimeout(() => handleSetIsOpen(false), 200);
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
    currentTranslateY.current = 0;
  }, []);

  const handleNotInterested = async () => {
    try {
      if (!onNotInterested) {
        throw new Error('onNotInterested handler not provided');
      }
      await onNotInterested(poll.id);
      toast({
        title: "Contenido ocultado",
        description: "Este tipo de contenido aparecerá menos en tu feed",
        duration: 3000,
      });
      handleSetIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo ocultar el contenido",
        variant: "destructive",
        duration: AppConfig.TOAST_DURATION,
      });
    }
  };

  const handleHideUser = async () => {
    try {
      const authorUsername = poll.author?.username || poll.authorUser?.username || 'usuario';
      const authorId = poll.author?.id || poll.authorUser?.id || poll.author?.username;
      if (!onHideUser) {
        throw new Error('onHideUser handler not provided');
      }
      await onHideUser(authorId);
      toast({
        title: "Usuario ocultado",
        description: `Ya no verás contenido de @${authorUsername}`,
        duration: 3000,
      });
      handleSetIsOpen(false);
    } catch (error) {
      toast({
        title: "Error", 
        description: error.message || "No se pudo ocultar al usuario",
        variant: "destructive",
        duration: AppConfig.TOAST_DURATION,
      });
    }
  };

  const handleToggleNotifications = async () => {
    try {
      const authorUsername = poll.author?.username || poll.authorUser?.username || 'usuario';
      await onToggleNotifications?.(poll.author?.id || poll.authorUser?.id || poll.author?.username);
      toast({
        title: isNotificationEnabled ? "Notificaciones desactivadas" : "Notificaciones activadas",
        description: isNotificationEnabled 
          ? `Ya no recibirás notificaciones de @${authorUsername}`
          : `Recibirás notificaciones cuando @${authorUsername} publique contenido`,
        duration: 3000,
      });
      handleSetIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar las notificaciones",
        variant: "destructive", 
        duration: AppConfig.TOAST_DURATION,
      });
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedReportCategory) {
      toast({
        title: "Selecciona una categoría",
        description: "Debes seleccionar el tipo de problema",
        variant: "destructive",
        duration: AppConfig.TOAST_DURATION,
      });
      return;
    }

    setIsSubmittingReport(true);
    try {
      await onReport?.(poll.id, {
        category: selectedReportCategory,
        comment: reportComment.trim(),
        reportedBy: user?.id,
        pollAuthor: poll.author?.id || poll.authorUser?.id,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Reporte enviado",
        description: "Gracias por ayudarnos a mantener la comunidad segura",
        duration: 3000,
      });
      
      setShowReportModal(false);
      setSelectedReportCategory(null);
      setReportComment('');
      handleSetIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el reporte. Inténtalo de nuevo",
        variant: "destructive",
        duration: AppConfig.TOAST_DURATION,
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="relative">
      {/* Menu Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSetIsOpen(!isOpen);
        }}
        className={className || "flex items-center justify-center text-white hover:text-gray-300 hover:scale-105 transition-all duration-200 h-auto p-2 rounded-lg bg-black/20 backdrop-blur-sm"}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* Bottom Sheet Modal - Portal to body */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999]"
            style={{ animation: 'fadeIn 0.2s ease-out forwards' }}
            onClick={() => handleSetIsOpen(false)}
          />
          
          {/* Bottom Sheet Content - same style as "Tu historia" modal */}
          <div className="fixed inset-0 z-[10000] flex items-end justify-center">
            <div 
              ref={sheetRef}
              className="relative bg-zinc-900 shadow-2xl overflow-hidden w-full rounded-t-3xl"
              style={{ animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Handle Bar */}
              <div className="w-full py-2 flex justify-center bg-zinc-900">
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-center">
                <h2 className="font-semibold text-white text-base">Opciones del contenido</h2>
              </div>

              {/* Menu Options - card style like "Tu historia" */}
              <div className="px-4 pb-8 flex flex-col gap-3">
                {/* No me interesa */}
                <button
                  onClick={handleNotInterested}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <EyeOff className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">No me interesa</p>
                    <p className="text-xs text-zinc-400">Este contenido aparecerá menos</p>
                  </div>
                </button>

                {/* Ocultar usuario */}
                <button
                  onClick={handleHideUser}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <UserX className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">Ocultar usuario</p>
                    <p className="text-xs text-zinc-400">No mostrar contenido de este usuario</p>
                  </div>
                </button>

                {/* Activar/Desactivar notificaciones */}
                <button
                  onClick={handleToggleNotifications}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    {isNotificationEnabled ? (
                      <BellOff className="w-5 h-5 text-zinc-300" />
                    ) : (
                      <Bell className="w-5 h-5 text-zinc-300" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">
                      {isNotificationEnabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {isNotificationEnabled 
                        ? 'Dejar de recibir alertas de este usuario'
                        : 'Recibir alertas cuando publique contenido'
                      }
                    </p>
                  </div>
                </button>

                {/* Reportar */}
                <button
                  onClick={() => {
                    setShowReportModal(true);
                    handleSetIsOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/30 active:bg-red-900/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Flag className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-red-400 text-sm">Reportar</p>
                    <p className="text-xs text-zinc-400">Contenido inapropiado o spam</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Report Modal - Portal to body */}
      {showReportModal && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowReportModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-gray-900 rounded-xl shadow-2xl border border-gray-600/50 w-full max-w-md max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600/50">
              <h2 className="text-xl font-bold text-white">Reportar contenido</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-white transition-colors duration-200 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-white font-medium mb-4">¿Cuál es el problema?</h3>
                <div className="space-y-2">
                    {REPORT_CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedReportCategory(category.id)}
                        className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                          selectedReportCategory === category.id
                            ? 'border-red-500 bg-red-500/10 text-white'
                            : 'border-gray-600/50 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div>
                            <div className="font-medium">{category.label}</div>
                            <div className="text-sm text-gray-400 mt-1">{category.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Detalles adicionales (opcional)
                </label>
                <textarea
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Proporciona más información sobre el problema..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-gray-400 mt-1">
                  {reportComment.length}/500 caracteres
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  disabled={isSubmittingReport}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitReport}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                  disabled={!selectedReportCategory || isSubmittingReport}
                >
                  {isSubmittingReport ? 'Enviando...' : 'Enviar reporte'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FeedMenu;
