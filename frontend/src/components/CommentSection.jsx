import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Loader2, AlertCircle, RefreshCw, Send, Plus, User } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import commentService from '../services/commentService';
import { cn } from '../lib/utils';
import Comment from './Comment';

const CommentSection = ({ 
  pollId, 
  isVisible = true, 
  maxHeight = "600px",
  showHeader = true,
  darkMode = false
}) => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewCommentForm, setShowNewCommentForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [newCommentId, setNewCommentId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const commentListRef = useRef(null);
  const inputRef = useRef(null);

  const quickEmojis = ['❤️', '🙌', '🔥', '👏', '🐴', '😍', '🥺', '😂'];

  // Función para hacer scroll hacia un comentario y centrarlo
  const scrollToComment = useCallback((commentId) => {
    if (!commentId || !commentListRef.current) return;
    
    // Pequeño delay para asegurar que el DOM se ha actualizado
    setTimeout(() => {
      const commentElement = commentListRef.current.querySelector(`[data-comment-id="${commentId}"]`);
      if (commentElement) {
        commentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Agregar efecto visual de highlight temporal
        commentElement.classList.add('highlight-comment');
        setTimeout(() => {
          commentElement.classList.remove('highlight-comment');
        }, 2000);
      }
    }, 100);
  }, []);

  // Cargar comentarios
  const loadComments = async (pageNum = 0, append = false) => {
    if (!pollId || loading || !isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const newComments = await commentService.getCommentsForFrontend(pollId, 20, pageNum * 20);
      
      if (append) {
        setComments(prev => [...prev, ...newComments]);
      } else {
        setComments(newComments);
      }
      
      setHasMore(newComments.length === 20);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Error al cargar comentarios. Intenta nuevamente.');
      toast({
        title: "Error al cargar comentarios",
        description: err.message || "Intenta recargar la página",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar más comentarios
  const loadMoreComments = () => {
    if (!loading && hasMore) {
      loadComments(page + 1, true);
    }
  };

  // Agregar nuevo comentario con optimistic UI
  const handleAddComment = async (content, parentId = null) => {
    if (!content.trim() || submitting || !isAuthenticated) return;
    
    setSubmitting(true);
    
    // Create optimistic comment
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url
      },
      created_at: new Date().toISOString(),
      likes_count: 0,
      replies: [],
      parent_id: parentId,
      is_liked: false,
      status: 'sending' // Mark as sending
    };
    
    // Optimistic update
    if (parentId) {
      setComments(prev => prev.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...comment.replies, optimisticComment]
          };
        }
        return comment;
      }));
    } else {
      setComments(prev => [optimisticComment, ...prev]);
    }
    
    try {
      const newComment = await commentService.addCommentForFrontend(pollId, content.trim(), parentId);
      
      // Replace optimistic comment with real one
      if (parentId) {
        setComments(prev => prev.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply.id === optimisticComment.id 
                  ? { ...newComment, status: 'sent' }
                  : reply
              )
            };
          }
          return comment;
        }));
      } else {
        setComments(prev => prev.map(comment => 
          comment.id === optimisticComment.id 
            ? { ...newComment, status: 'sent' }
            : comment
        ));
      }
      
      setShowNewCommentForm(false);
      
      // Hacer scroll hacia el nuevo comentario y centrarlo
      setNewCommentId(newComment.id);
      scrollToComment(newComment.id);
      
      toast({
        title: "Comentario agregado",
        description: "Tu comentario se ha publicado correctamente",
      });
    } catch (err) {
      console.error('Error adding comment:', err);
      
      // Rollback optimistic update
      if (parentId) {
        setComments(prev => prev.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies.filter(reply => reply.id !== optimisticComment.id)
            };
          }
          return comment;
        }));
      } else {
        setComments(prev => prev.filter(comment => comment.id !== optimisticComment.id));
      }
      
      toast({
        title: "Error al agregar comentario",
        description: err.message || "No se pudo agregar el comentario. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar like de comentario
  const handleCommentLike = async (commentId) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para dar like",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await commentService.toggleCommentLike(commentId);
      
      // Actualizar el estado local
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            userLiked: result.liked,
            likes: result.likes
          };
        }
        // También actualizar en replies
        return {
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === commentId 
              ? { ...reply, userLiked: result.liked, likes: result.likes }
              : reply
          )
        };
      }));
      
      toast({
        title: result.liked ? "¡Te gusta!" : "Like removido",
        description: result.liked ? "Has dado like a este comentario" : "Ya no te gusta este comentario",
      });
    } catch (err) {
      console.error('Error liking comment:', err);
      toast({
        title: "Error",
        description: err.message || "No se pudo procesar el like. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Responder a comentario
  const handleReplyToComment = async (parentCommentId, content) => {
    return await handleAddComment(content, parentCommentId);
  };

  // Manejar click en "Responder" de un comentario
  const handleReplyClick = (comment) => {
    setReplyingTo(comment);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.value = `@${comment.user.username} `;
      }
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Editar comentario
  const handleEditComment = async (commentId, content) => {
    if (!isAuthenticated) return;
    
    try {
      await commentService.updateComment(commentId, content);
      // Recargar comentarios para mostrar la edición
      loadComments(0, false);
      toast({
        title: "Comentario editado",
        description: "Tu comentario se ha actualizado correctamente",
      });
    } catch (err) {
      console.error('Error editing comment:', err);
      toast({
        title: "Error al editar comentario",
        description: err.message || "No se pudo editar el comentario. Intenta de nuevo.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Eliminar comentario
  const handleDeleteComment = async (commentId) => {
    if (!isAuthenticated) return;
    
    try {
      await commentService.deleteComment(commentId);
      // Recargar comentarios para actualizar la vista
      loadComments(0, false);
      toast({
        title: "Comentario eliminado",
        description: "El comentario se ha eliminado correctamente",
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast({
        title: "Error al eliminar comentario",
        description: err.message || "No se pudo eliminar el comentario. Intenta de nuevo.",
        variant: "destructive",
      });
      throw err;
    }
  };



  // Cargar comentarios al montar el componente
  useEffect(() => {
    if (pollId && isVisible) {
      loadComments(0, false);
    }
  }, [pollId, isVisible]);

  if (!pollId) {
    return null;
  }

  return (
    <motion.div 
      className={`comment-section rounded-2xl overflow-hidden flex flex-col h-full ${darkMode ? 'bg-transparent' : 'bg-white'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header minimalista - solo mostrar cuando showHeader = true */}
      {showHeader && (
        <div className={`comment-header p-6 border-b flex-shrink-0 ${darkMode ? 'bg-transparent border-zinc-800' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Comentarios</h3>
                {comments.length > 0 && (
                  <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>{comments.length} comentario{comments.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadComments(0, false)}
                disabled={loading}
                className={`h-10 w-10 rounded-lg transition-colors flex items-center justify-center ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-50'}`}
              >
                <RefreshCw className={cn("w-5 h-5", darkMode ? "text-zinc-400" : "text-gray-500", loading && "animate-spin")} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de comentarios minimalista - con flex-1 para que ocupe espacio disponible */}
      <div className={`comment-list overflow-y-auto flex-1 ${darkMode ? 'bg-transparent' : 'bg-white'}`}>
        {error && (
          <motion.div 
            className={`error-message p-4 m-4 border rounded-xl ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={`flex items-center gap-3 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-red-900/40' : 'bg-red-100'}`}>
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button
                onClick={() => loadComments(0, false)}
                className={`h-8 px-3 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-700 hover:text-red-800 hover:bg-red-100'}`}
              >
                Reintentar
              </button>
            </div>
          </motion.div>
        )}
        
        {loading && comments.length === 0 ? (
          <div className="loading-state p-12 flex items-center justify-center">
            <div className={`flex flex-col items-center gap-4 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
              <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
              <span className="font-medium">Cargando comentarios...</span>
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="empty-state flex flex-col items-center justify-center p-8 py-16">
            <div className="text-center">
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Todavía no hay comentarios</h3>
              <p className={`text-base ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                Sé el primero en comentar.
              </p>
            </div>
          </div>
        ) : (
          <div className="comments-container px-4 py-2 space-y-3">
            <AnimatePresence mode="popLayout">
              {comments.map((comment, index) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  onReply={handleReplyToComment}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  onLike={handleCommentLike}
                  onReplyClick={handleReplyClick}
                  depth={0}
                  maxDepth={3}
                />
              ))}
            </AnimatePresence>
            
            {/* Botón cargar más - Diseño moderno */}
            {hasMore && (
              <div className="load-more p-6 text-center border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMoreComments}
                  disabled={loading}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-8 py-3 rounded-2xl font-medium transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    'Mostrar más comentarios'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Área de comentario flotante en la parte inferior */}
      {user && (
        <div className={`border-t flex-shrink-0 ${darkMode ? 'bg-transparent border-zinc-800' : 'bg-white border-gray-100'}`}>
          {/* Indicador de respuesta */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center justify-between px-4 py-2 border-b ${darkMode ? 'border-zinc-800' : 'border-gray-100'}`}
              >
                <span className={`text-sm ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
                  Respondiendo a <span className={`font-semibold ${darkMode ? 'text-white/90' : 'text-gray-900'}`}>{replyingTo.user.username}</span>
                </span>
                <button onClick={cancelReply} className={`p-1 ${darkMode ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input con avatar y botón enviar */}
          <div className="flex items-center gap-3 px-4 pb-4 pt-2">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={user.avatar_url} alt={user.username} />
              <AvatarFallback className={`flex items-center justify-center ${darkMode ? 'bg-white text-gray-600' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'}`}>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const content = inputRef.current?.value?.trim();
                if (!content) return;
                
                try {
                  if (replyingTo) {
                    await handleAddComment(content, replyingTo.id);
                    setReplyingTo(null);
                  } else {
                    await handleAddComment(content);
                  }
                  if (inputRef.current) inputRef.current.value = '';
                } catch (error) {
                  // Error ya manejado
                }
              }}
              className="flex-1 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder={replyingTo ? `@${replyingTo.user.username}` : "Añade un comentario..."}
                className={`flex-1 px-4 py-2.5 rounded-full text-sm focus:outline-none transition-all ${
                  darkMode 
                    ? 'bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500' 
                    : 'border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                }`}
                maxLength={500}
                disabled={submitting}
              />
            </form>
          </div>
        </div>
      )}
      
      {/* Aviso para usuarios no autenticados - Diseño moderno */}
      {!user && (
        <div className="auth-notice p-4 sm:p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200/60 flex-shrink-0">
          <div className="text-center">
            <p className="text-amber-800 font-medium mb-2 text-sm sm:text-base">
              ¡Únete a la conversación!
            </p>
            <p className="text-xs sm:text-sm text-amber-700">
              <a href="/login" className="font-semibold hover:underline text-indigo-600 hover:text-indigo-700 transition-colors">
                Inicia sesión
              </a> para comentar y conectar con la comunidad
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CommentSection;