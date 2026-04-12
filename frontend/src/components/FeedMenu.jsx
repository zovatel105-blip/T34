import React, { useState } from 'react';
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
  
  // Notify parent when menu opens/closes
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

  const handleNotInterested = async () => {
    try {
      console.log('🚫 FeedMenu: handleNotInterested called for poll:', poll.id);
      console.log('🚫 FeedMenu: onNotInterested function:', typeof onNotInterested);
      console.log('🚫 FeedMenu: localStorage token exists:', !!localStorage.getItem('token'));
      
      if (!onNotInterested) {
        throw new Error('onNotInterested handler not provided');
      }
      
      const result = await onNotInterested(poll.id);
      console.log('✅ FeedMenu: Successfully marked as not interested, result:', result);
      
      toast({
        title: "Contenido ocultado",
        description: "Este tipo de contenido aparecerá menos en tu feed",
        duration: 3000,
      });
      handleSetIsOpen(false);
    } catch (error) {
      console.error('❌ FeedMenu: Error in handleNotInterested:', error);
      console.error('❌ FeedMenu: Error stack:', error.stack);
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
      console.log('👤 FeedMenu: handleHideUser called');
      console.log('👤 FeedMenu: poll.author:', poll.author);
      console.log('👤 FeedMenu: poll.authorUser:', poll.authorUser);
      
      const authorUsername = poll.author?.username || poll.authorUser?.username || 'usuario';
      const authorId = poll.author?.id || poll.authorUser?.id || poll.author?.username;
      
      console.log('👤 FeedMenu: authorId:', authorId);
      console.log('👤 FeedMenu: onHideUser function:', typeof onHideUser);
      
      if (!onHideUser) {
        throw new Error('onHideUser handler not provided');
      }
      
      await onHideUser(authorId);
      console.log('✅ FeedMenu: Successfully hidden user');
      
      toast({
        title: "Usuario ocultado",
        description: `Ya no verás contenido de @${authorUsername}`,
        duration: 3000,
      });
      handleSetIsOpen(false);
    } catch (error) {
      console.error('❌ FeedMenu: Error in handleHideUser:', error);
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
      
      // Reset state
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
        className={`flex items-center justify-center text-white hover:text-gray-300 hover:scale-105 transition-all duration-200 h-auto p-2 rounded-lg bg-black/20 backdrop-blur-sm ${className}`}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* Bottom Sheet Modal - Portal to body */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] animate-in fade-in duration-200"
            onClick={() => handleSetIsOpen(false)}
          />
          
          {/* Bottom Sheet Content */}
          <div className="fixed bottom-0 left-0 right-0 z-[10000] animate-in slide-in-from-bottom duration-300">
            <div className="bg-zinc-900 rounded-t-3xl shadow-2xl overflow-hidden max-w-lg mx-auto">
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-zinc-600 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-800">
                <h3 className="text-white font-semibold text-lg">Opciones del contenido</h3>
              </div>

              {/* Menu Options */}
              <div className="py-2">
                {/* No me interesa */}
                <button
                  onClick={handleNotInterested}
                  className="w-full px-6 py-4 text-left hover:bg-zinc-800 active:bg-zinc-700 transition-colors duration-150 flex items-center gap-4"
                >
                  <EyeOff className="w-6 h-6 text-zinc-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-white text-base font-medium">No me interesa</div>
                    <div className="text-zinc-500 text-sm mt-0.5">Este contenido aparecerá menos</div>
                  </div>
                </button>

                {/* Ocultar usuario */}
                <button
                  onClick={handleHideUser}
                  className="w-full px-6 py-4 text-left hover:bg-zinc-800 active:bg-zinc-700 transition-colors duration-150 flex items-center gap-4"
                >
                  <UserX className="w-6 h-6 text-zinc-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-white text-base font-medium">Ocultar usuario</div>
                    <div className="text-zinc-500 text-sm mt-0.5">No mostrar contenido de este usuario</div>
                  </div>
                </button>

                {/* Activar/Desactivar notificaciones */}
                <button
                  onClick={handleToggleNotifications}
                  className="w-full px-6 py-4 text-left hover:bg-zinc-800 active:bg-zinc-700 transition-colors duration-150 flex items-center gap-4"
                >
                  {isNotificationEnabled ? (
                    <BellOff className="w-6 h-6 text-zinc-400 flex-shrink-0" />
                  ) : (
                    <Bell className="w-6 h-6 text-zinc-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-white text-base font-medium">
                      {isNotificationEnabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                    </div>
                    <div className="text-zinc-500 text-sm mt-0.5">
                      {isNotificationEnabled 
                        ? 'Dejar de recibir alertas de este usuario'
                        : 'Recibir alertas cuando publique contenido'
                      }
                    </div>
                  </div>
                </button>

                {/* Separador */}
                <div className="my-2 border-t border-zinc-800" />

                {/* Reportar */}
                <button
                  onClick={() => {
                    setShowReportModal(true);
                    handleSetIsOpen(false);
                  }}
                  className="w-full px-6 py-4 text-left hover:bg-red-950/30 active:bg-red-900/30 transition-colors duration-150 flex items-center gap-4"
                >
                  <Flag className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-red-500 text-base font-medium">Reportar</div>
                    <div className="text-zinc-500 text-sm mt-0.5">Contenido inapropiado o spam</div>
                  </div>
                </button>
              </div>
              
              {/* Safe Area Bottom Padding (for mobile notch/home bar) */}
              <div className="h-6" />
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
              {/* Categories */}
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

              {/* Comment */}
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

              {/* Actions */}
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