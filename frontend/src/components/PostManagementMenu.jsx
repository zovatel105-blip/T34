import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoreVertical, 
  Edit, 
  Pin, 
  Archive, 
  Globe, 
  Lock, 
  Trash2, 
  X,
  MessageCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import '../styles/PostManagement.css';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';

const PostManagementMenu = ({ poll, onUpdate, onDelete, currentUser, isOwnProfile, className, onOpenChange }) => {
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState(poll.title || '');
  const [editDescription, setEditDescription] = useState(poll.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
  
  const handleToggleComments = async () => {
    setIsLoading(true);
    try {
      const updatedPoll = {
        ...poll,
        comments_enabled: !poll.comments_enabled,
        commentsEnabled: !poll.comments_enabled
      };
      await onUpdate(poll.id, updatedPoll);
      toast({
        title: "Éxito",
        description: poll.comments_enabled ? "Comentarios deshabilitados" : "Comentarios habilitados"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar la configuración de comentarios",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoteCount = async () => {
    setIsLoading(true);
    try {
      const updatedPoll = {
        ...poll,
        show_vote_count: !poll.show_vote_count,
        showVoteCount: !poll.show_vote_count
      };
      await onUpdate(poll.id, updatedPoll);
      toast({
        title: "Éxito",
        description: poll.show_vote_count ? "Conteo de votos oculto" : "Conteo de votos visible"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar la configuración de votos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser || !isOwnProfile) {
    return null;
  }

  const handleEdit = async () => {
    if (!editTitle.trim()) {
      toast({
        title: "Error",
        description: "El título no puede estar vacío",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const updatedPoll = {
        ...poll,
        title: editTitle.trim(),
        description: editDescription.trim()
      };
      await onUpdate(poll.id, updatedPoll);
      setShowEditDialog(false);
      toast({
        title: "Éxito",
        description: "Publicación editada correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo editar la publicación",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePin = async () => {
    setIsLoading(true);
    try {
      const updatedPoll = { ...poll, is_pinned: !poll.is_pinned };
      await onUpdate(poll.id, updatedPoll);
      toast({
        title: "Éxito",
        description: poll.is_pinned ? "Publicación desanclada" : "Publicación anclada en el perfil"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo anclar la publicación",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const updatedPoll = { ...poll, is_archived: !poll.is_archived };
      await onUpdate(poll.id, updatedPoll);
      toast({
        title: "Éxito",
        description: poll.is_archived ? "Publicación desarchivada" : "Publicación archivada"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo archivar la publicación",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivacy = async () => {
    setIsLoading(true);
    try {
      const updatedPoll = { ...poll, is_private: !poll.is_private };
      await onUpdate(poll.id, updatedPoll);
      toast({
        title: "Éxito",
        description: poll.is_private ? "Publicación hecha pública" : "Publicación hecha privada"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar la privacidad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(poll.id);
      setShowDeleteDialog(false);
      toast({
        title: "Éxito",
        description: "Publicación eliminada permanentemente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la publicación",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Menu Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSetIsOpen(!isOpen);
        }}
        className={className || "flex items-center justify-center text-white hover:text-gray-300 hover:scale-105 transition-all duration-200 h-auto p-2 rounded-lg bg-black/20 backdrop-blur-sm"}
      >
        <MoreVertical className="post-management-icon w-5 h-5" />
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
          
          {/* Bottom Sheet Content - with swipe to close */}
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
                <h2 className="font-semibold text-white text-base">Gestionar publicación</h2>
              </div>

              {/* Menu Options - card style like "Tu historia" */}
              <div className="px-4 pb-8 flex flex-col gap-3">
                {/* Editar título/descripción */}
                <button
                  onClick={() => {
                    setShowEditDialog(true);
                    handleSetIsOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <Edit className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">Editar título/descripción</p>
                  </div>
                </button>

                {/* Fijar en perfil */}
                <button
                  onClick={() => { handlePin(); handleSetIsOpen(false); }}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <Pin className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">{poll.is_pinned ? 'Desanclar del perfil' : 'Fijar en perfil'}</p>
                  </div>
                </button>

                {/* Archivar publicación */}
                <button
                  onClick={() => { handleArchive(); handleSetIsOpen(false); }}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <Archive className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">{poll.is_archived ? 'Desarchivar publicación' : 'Archivar publicación'}</p>
                  </div>
                </button>

                {/* Hacer publicación privada/pública */}
                <button
                  onClick={() => { handlePrivacy(); handleSetIsOpen(false); }}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    {poll.is_private ? <Globe className="w-5 h-5 text-zinc-300" /> : <Lock className="w-5 h-5 text-zinc-300" />}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">{poll.is_private ? 'Hacer publicación pública' : 'Hacer publicación privada'}</p>
                  </div>
                </button>

                {/* Deshabilitar/Habilitar comentarios */}
                <button
                  onClick={() => { handleToggleComments(); handleSetIsOpen(false); }}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">
                      {poll.comments_enabled || poll.commentsEnabled ? 'Deshabilitar comentarios' : 'Habilitar comentarios'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {poll.comments_enabled || poll.commentsEnabled ? 'Los comentarios se ocultarán' : 'Los comentarios serán visibles'}
                    </p>
                  </div>
                </button>

                {/* Ocultar/Mostrar conteo de votos */}
                <button
                  onClick={() => { handleToggleVoteCount(); handleSetIsOpen(false); }}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    {poll.show_vote_count || poll.showVoteCount ? <EyeOff className="w-5 h-5 text-zinc-300" /> : <Eye className="w-5 h-5 text-zinc-300" />}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">
                      {poll.show_vote_count || poll.showVoteCount ? 'Ocultar conteo de votos' : 'Mostrar conteo de votos'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {poll.show_vote_count || poll.showVoteCount ? 'Los números de votos se ocultarán' : 'Los números de votos serán visibles'}
                    </p>
                  </div>
                </button>

                {/* Eliminar publicación */}
                <button
                  onClick={() => { setShowDeleteDialog(true); handleSetIsOpen(false); }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/30 active:bg-red-900/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-red-400 text-sm">Eliminar publicación</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar publicación</DialogTitle>
            <DialogDescription>
              Modifica el título y descripción de tu publicación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título/Pregunta</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="¿Cuál es tu pregunta?"
                maxLength={200}
              />
              <p className="text-xs text-gray-500">{editTitle.length}/200 caracteres</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Añade contexto o detalles..."
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-gray-500">{editDescription.length}/500 caracteres</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar publicación?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La publicación será eliminada permanentemente
              junto con todos sus votos y comentarios.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? 'Eliminando...' : 'Eliminar permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostManagementMenu;
