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
import useLivePoll from '../hooks/useLivePoll';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const CommentSection = ({ 
  pollId, 
  isVisible = true, 
  maxHeight = "600px",
  showHeader = true,
  darkMode = false,
  bottomSheetMode = false
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
          // 🆕 Si el usuario actual ES el autor del poll, refleja el badge "liked by creator"
          const isAuthor = comment.post_author_id && user && comment.post_author_id === user.id;
          return {
            ...comment,
            userLiked: result.liked,
            user_liked: result.liked,
            likes: result.likes,
            ...(isAuthor ? { liked_by_author: result.liked } : {})
          };
        }
        // También actualizar en replies
        return {
          ...comment,
          replies: comment.replies.map(reply => {
            if (reply.id !== commentId) return reply;
            const isAuthor = reply.post_author_id && user && reply.post_author_id === user.id;
            return {
              ...reply,
              userLiked: result.liked,
              user_liked: result.liked,
              likes: result.likes,
              ...(isAuthor ? { liked_by_author: result.liked } : {})
            };
          })
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

  // Manejar reacción rápida (emoji) sobre un comentario
  const handleCommentReact = async (commentId, emoji) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para reaccionar",
        variant: "destructive",
      });
      return;
    }

    // Optimistic: aplicar el cambio en el árbol localmente
    const applyReaction = (list) => list.map(c => {
      const update = (node) => {
        if (node.id !== commentId) {
          return { ...node, replies: node.replies ? node.replies.map(update) : [] };
        }
        const prev = node.user_reaction || null;
        const reactions = { ...(node.reactions || {}) };
        // remove previous
        if (prev) {
          reactions[prev] = Math.max(0, (reactions[prev] || 1) - 1);
          if (reactions[prev] === 0) delete reactions[prev];
        }
        let next;
        if (prev === emoji) {
          next = null; // toggle off
        } else {
          reactions[emoji] = (reactions[emoji] || 0) + 1;
          next = emoji;
        }
        return { ...node, replies: node.replies ? node.replies.map(update) : [], user_reaction: next, reactions };
      };
      return update(c);
    });

    setComments(prev => applyReaction(prev));

    try {
      const result = await commentService.toggleReaction(commentId, emoji);
      // Sincronizar con la respuesta del servidor (datos canónicos)
      setComments(prev => prev.map(c => {
        const sync = (node) => {
          if (node.id === commentId) {
            return { ...node, replies: node.replies ? node.replies.map(sync) : [], user_reaction: result.user_reaction, reactions: result.reactions };
          }
          return { ...node, replies: node.replies ? node.replies.map(sync) : [] };
        };
        return sync(c);
      }));
    } catch (err) {
      console.error('Error reacting to comment:', err);
      toast({
        title: "Error",
        description: err.message || "No se pudo enviar la reacción",
        variant: "destructive",
      });
      // Refresco para volver al estado consistente
      loadComments(0, false);
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

  // 🔴 LIVE REFRESH — refrescar comentarios cada 5s mientras el modal está visible
  // Merge inteligente: preserva comentarios optimistas (temp-*) y no pisa el estado local
  // de likes. Solo refresca la primera página (si el usuario paginó, no sobreescribimos).
  const silentRefreshComments = useCallback(async () => {
    if (!pollId || !isAuthenticated) return;
    if (page !== 0) return; // no interferir con paginación
    if (submitting) return; // no pisar envíos en curso
    try {
      const fresh = await commentService.getCommentsForFrontend(pollId, 20, 0);
      if (!Array.isArray(fresh)) return;

      setComments((prev) => {
        // Conservar comentarios optimistas (aún sin ID real)
        const optimistic = prev.filter((c) => String(c.id).startsWith('temp-'));

        // Para cada comentario del servidor, preservar el estado local de likes
        // (el servidor ya devuelve is_liked del usuario actual, así que confiamos en él,
        //  pero mantenemos replies locales si hay optimistas dentro).
        const merged = fresh.map((nc) => {
          const existing = prev.find((c) => c.id === nc.id);
          if (!existing) return nc;
          // Mantener replies optimistas (si hay) dentro del comentario padre
          const tempReplies = (existing.replies || []).filter((r) =>
            String(r.id).startsWith('temp-')
          );
          const mergedReplies = [...(nc.replies || []), ...tempReplies];
          return { ...nc, replies: mergedReplies };
        });

        return [...optimistic, ...merged];
      });
    } catch (_) {
      // silencioso: no molestar al usuario por un poll fallido
    }
  }, [pollId, isAuthenticated, page, submitting]);

  useLivePoll(silentRefreshComments, 5000, {
    enabled: Boolean(pollId && isVisible && isAuthenticated),
    pauseWhenHidden: true,
    refreshOnFocus: true,
  });

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
        <div className={`comment-header px-5 py-4 flex-shrink-0 ${darkMode ? 'bg-transparent' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>Comentarios</h3>
              {comments.length > 0 && (
                <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-gray-400'}`}>{comments.length} comentario{comments.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            
            <button
              onClick={() => loadComments(0, false)}
              disabled={loading}
              className={`h-9 w-9 rounded-full transition-colors flex items-center justify-center ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            >
              <RefreshCw className={cn("w-4 h-4", darkMode ? "text-zinc-400" : "text-gray-400", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      )}
      
      {/* Lista de comentarios minimalista - con flex-1 para que ocupe espacio disponible */}
      <div className={`comment-list overflow-y-auto flex-1 ${darkMode ? 'bg-transparent' : 'bg-white'}`}>
        {error && (
          <motion.div 
            className={`p-4 mx-4 mt-3 rounded-2xl ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={`flex items-center gap-3 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-red-900/40' : 'bg-white shadow-sm'}`}>
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="text-sm flex-1">{error}</span>
              <button
                onClick={() => loadComments(0, false)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'bg-white shadow-sm text-red-600 hover:bg-red-50'}`}
              >
                Reintentar
              </button>
            </div>
          </motion.div>
        )}
        
        {loading && comments.length === 0 ? (
          <div className="p-12 flex items-center justify-center">
            <div className={`flex flex-col items-center gap-3 ${darkMode ? 'text-zinc-400' : 'text-gray-400'}`}>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-medium">Cargando comentarios...</span>
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 py-12">
            <div className="text-center space-y-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                <MessageCircle className={`w-6 h-6 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} strokeWidth={1.5} />
              </div>
              <h3 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Todavía no hay comentarios</h3>
              <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-gray-400'}`}>
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
                  onReact={handleCommentReact}
                  onReplyClick={handleReplyClick}
                  depth={0}
                  maxDepth={3}
                  bottomSheetMode={false}
                />
              ))}
            </AnimatePresence>
            
            {/* Botón cargar más */}
            {hasMore && (
              <div className="py-4 text-center">
                <button
                  onClick={loadMoreComments}
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                    darkMode 
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cargando...
                    </span>
                  ) : (
                    'Mostrar más comentarios'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Área de comentario - oculta en bottomSheetMode porque el input está en la barra de navegación */}
      {user && !bottomSheetMode && (
        <div className={`flex-shrink-0 ${bottomSheetMode ? 'bg-white border-t border-gray-100' : darkMode ? 'bg-transparent' : 'bg-white'}`}>
          {/* Indicador de respuesta */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center justify-between px-5 py-2`}
              >
                <span className={`text-xs ${bottomSheetMode || !darkMode ? 'text-gray-400' : 'text-white/60'}`}>
                  Respondiendo a <span className={`font-semibold ${bottomSheetMode || !darkMode ? 'text-gray-900' : 'text-white/90'}`}>{replyingTo.user.username}</span>
                </span>
                <button onClick={cancelReply} className={`p-1 ${bottomSheetMode || !darkMode ? 'text-gray-400 hover:text-gray-600' : 'text-white/40 hover:text-white/70'}`}>
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="flex items-center gap-3 px-4 pb-4 pt-2">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={resolveAssetUrl(user.avatar_url)} alt={user.username} />
              <AvatarFallback className={`flex items-center justify-center ${bottomSheetMode ? 'bg-gray-100 text-gray-400' : darkMode ? 'bg-white text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
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
                placeholder={replyingTo ? `@${replyingTo.user.username}` : "Add comment..."}
                className={`flex-1 px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all ${
                  bottomSheetMode
                    ? 'bg-gray-100 placeholder-gray-400 text-gray-900 focus:ring-1 focus:ring-gray-200'
                    : darkMode 
                      ? 'bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500' 
                      : 'bg-gray-50 placeholder-gray-400 focus:ring-1 focus:ring-gray-200'
                }`}
                maxLength={500}
                disabled={submitting}
              />
              {bottomSheetMode && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-500 text-white flex-shrink-0 hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </form>
          </div>
        </div>
      )}
      
      {/* Aviso para usuarios no autenticados */}
      {!user && (
        <div className={`p-4 flex-shrink-0 ${darkMode ? '' : ''}`}>
          <div className="p-4 rounded-2xl bg-gray-50 text-center space-y-1">
            <p className="text-sm font-medium text-gray-900">
              ¡Únete a la conversación!
            </p>
            <p className="text-xs text-gray-400">
              <a href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Inicia sesión
              </a> para comentar
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CommentSection;