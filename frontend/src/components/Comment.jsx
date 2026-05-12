import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, MoreHorizontal, Edit3, Trash2, 
  ChevronDown, ChevronUp, Reply, Flag, CheckCircle, Send, Sparkles, Loader2, HeartCrack, User
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { cn } from '../lib/utils';

const QUICK_EMOJIS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

const CommentForm = ({ 
  onSubmit, 
  onCancel, 
  placeholder = "Escribe un comentario...", 
  initialValue = "",
  isReply = false,
  isEditing = false 
}) => {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form 
      className="flex items-center gap-2 p-2 rounded-lg border bg-white"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <input
        ref={textareaRef}
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 text-sm border-none focus:outline-none bg-transparent"
        maxLength={500}
        autoFocus
      />
      
      <button
        type="button"
        onClick={onCancel}
        className="text-gray-400 hover:text-gray-600 text-sm font-semibold px-3"
      >
        Cancelar
      </button>
      
      <button
        type="submit"
        disabled={!content.trim() || isSubmitting}
        className="text-blue-500 hover:text-blue-600 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed px-3"
      >
        {isSubmitting ? 'Enviando...' : (isEditing ? 'Guardar' : 'Publicar')}
      </button>
    </motion.form>
  );
};

const Comment = ({ 
  comment, 
  onReply, 
  onEdit, 
  onDelete, 
  onLike, 
  onReact,
  onReplyClick,
  depth = 0, 
  maxDepth = 3,
  bottomSheetMode = false
}) => {
  const { user: currentUser } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const longPressTimer = useRef(null);
  const longPressFiredRef = useRef(false);
  const longPressStartRef = useRef({ x: 0, y: 0 });

  const isAuthor = currentUser && currentUser.id === comment.user.id;
  const canReply = depth < maxDepth;
  const hasReplies = comment.replies && comment.replies.length > 0;

  // ⏱️ Long-press para abrir picker de reacciones rápidas
  const startLongPress = (e) => {
    longPressFiredRef.current = false;
    if (e?.touches?.[0]) {
      longPressStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (typeof e?.clientX === 'number') {
      longPressStartRef.current = { x: e.clientX, y: e.clientY };
    }
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      setShowReactionPicker(true);
    }, 350);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleLongPressMove = (e) => {
    if (!longPressTimer.current) return;
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - longPressStartRef.current.x;
    const dy = t.clientY - longPressStartRef.current.y;
    if (Math.hypot(dx, dy) > 10) cancelLongPress();
  };

  const handleReact = async (emoji) => {
    setShowReactionPicker(false);
    if (onReact) {
      try {
        await onReact(comment.id, emoji);
      } catch (e) {
        console.error('Error reacting:', e);
      }
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      await onLike(comment.id);
    } catch (error) {
      console.error('Error liking comment:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    if (isDisliking) return;
    
    setIsDisliking(true);
    try {
      // TODO: Implementar funcionalidad de dislike en el backend
      console.log('Dislike comment:', comment.id);
    } catch (error) {
      console.error('Error disliking comment:', error);
    } finally {
      setIsDisliking(false);
    }
  };

  const handleReply = async (content) => {
    try {
      await onReply(comment.id, content);
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error replying:', error);
      throw error;
    }
  };

  const handleEdit = async (content) => {
    try {
      await onEdit(comment.id, content);
      setShowEditForm(false);
    } catch (error) {
      console.error('Error editing comment:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este comentario? Esta acción no se puede deshacer.')) {
      try {
        await onDelete(comment.id);
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Si el string no tiene timezone, asumir UTC
    const dateUTC = dateString.endsWith('Z') || dateString.includes('+') ? date : new Date(dateString + 'Z');
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateUTC) / 1000);
    
    if (diffInSeconds < 0) return 'ahora';
    if (diffInSeconds < 60) return 'ahora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}sem`;
    
    return dateUTC.toLocaleDateString('es', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      className="comment-thread py-2 px-4"
      data-comment-id={comment.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: depth * 0.1 }}
    >
      <div className="comment-item flex gap-3">
        {/* Avatar */}
        <Avatar className={cn("flex-shrink-0 mt-0.5", bottomSheetMode ? "w-10 h-10" : "w-8 h-8")}>
          <AvatarImage src={resolveAssetUrl(comment.user.avatar_url)} />
          <AvatarFallback className={cn(
            "flex items-center justify-center",
            bottomSheetMode ? "bg-gray-100 text-gray-400" : "bg-gray-50 text-gray-400"
          )}>
            <User className={bottomSheetMode ? "w-5 h-5" : "w-4 h-4"} />
          </AvatarFallback>
        </Avatar>
        
        {/* Contenido central */}
        <div className="flex-1 min-w-0">
          {/* Nombre y hora */}
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-[13px]",
              bottomSheetMode ? "text-gray-500 font-medium" : "font-semibold text-white"
            )}>
              {comment.user.display_name || comment.user.username}
            </span>
            <span className={cn("text-[11px]", bottomSheetMode ? "text-gray-400" : "text-white/40")}>
              {formatTimeAgo(comment.created_at)}
            </span>
            {comment.is_edited && (
              <span className={cn("text-[11px]", bottomSheetMode ? "text-gray-300" : "text-white/30")}>(editado)</span>
            )}
            {/* 🆕 Badge "liked by creator" (estilo TikTok/Instagram): mini avatar del autor con un corazón rojo encima */}
            {comment.liked_by_author && (
              <span
                className="relative inline-flex items-center justify-center flex-shrink-0 ml-0.5"
                title="Le gustó al autor"
                aria-label="Le gustó al autor"
              >
                <Avatar className="w-4 h-4 ring-1 ring-white shadow-sm">
                  <AvatarImage src={resolveAssetUrl(comment.post_author_avatar_url)} />
                  <AvatarFallback className="bg-gray-200">
                    <User className="w-2.5 h-2.5 text-gray-400" />
                  </AvatarFallback>
                </Avatar>
                <Heart
                  className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-red-500"
                  fill="currentColor"
                  strokeWidth={1}
                  style={{ filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.95))' }}
                />
              </span>
            )}
          </div>
          
          {/* Texto del comentario */}
          {showEditForm ? (
            <div className="mt-1">
              <CommentForm
                onSubmit={handleEdit}
                onCancel={() => setShowEditForm(false)}
                placeholder="Editar comentario..."
                initialValue={comment.content}
                isEditing={true}
              />
            </div>
          ) : (
            <div className="relative">
              <p
                className={cn(
                  "text-[13px] leading-snug mt-0.5 select-none",
                  bottomSheetMode ? "text-gray-900 font-medium" : "text-white/90"
                )}
                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                onTouchStart={startLongPress}
                onTouchEnd={cancelLongPress}
                onTouchMove={handleLongPressMove}
                onTouchCancel={cancelLongPress}
                onMouseDown={startLongPress}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onContextMenu={(e) => { e.preventDefault(); setShowReactionPicker(true); }}
              >
                {comment.content}
              </p>

              {/* Emoji reaction picker (long-press) — portalizado a body para
                  escapar de los transforms del modal y quedar fijo al viewport */}
              {showReactionPicker && createPortal(
                <AnimatePresence>
                  <div
                    className="fixed inset-0 z-[150]"
                    onClick={() => setShowReactionPicker(false)}
                  />
                  <motion.div
                    data-testid="comment-reaction-picker"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    className={cn(
                      "fixed left-0 right-0 z-[160] flex items-center justify-around px-4 py-3 border-t",
                      bottomSheetMode ? "bg-white border-gray-100" : "bg-zinc-900 border-white/10"
                    )}
                    style={{
                      // Justo encima del input "Add comment" del bottom nav
                      bottom: 'calc(56px + max(var(--safe-area-inset-bottom, 0px), 8px))'
                    }}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        data-testid={`react-emoji-${emoji}`}
                        onClick={(e) => { e.stopPropagation(); handleReact(emoji); }}
                        className={cn(
                          "text-[28px] leading-none transition-transform active:scale-90 hover:scale-125",
                          comment.user_reaction === emoji && "scale-125"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                </AnimatePresence>,
                document.body
              )}

              {/* Reaction chips (debajo del texto) */}
              {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {Object.entries(comment.reactions)
                    .sort((a, b) => b[1] - a[1])
                    .map(([emoji, count]) => {
                      const isMine = comment.user_reaction === emoji;
                      return (
                        <button
                          key={emoji}
                          data-testid={`reaction-chip-${emoji}`}
                          onClick={() => handleReact(emoji)}
                          className={cn(
                            "flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-medium border transition-all active:scale-95",
                            bottomSheetMode
                              ? (isMine
                                  ? "bg-blue-50 border-blue-300 text-blue-700"
                                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100")
                              : (isMine
                                  ? "bg-blue-500/20 border-blue-400/40 text-blue-100"
                                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10")
                          )}
                        >
                          <span className="text-sm leading-none">{emoji}</span>
                          <span>{count}</span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}
          
          {/* Acciones */}
          <div className={cn("flex items-center gap-2 mt-1.5", bottomSheetMode ? "gap-2" : "gap-3 text-[11px] text-white/40")}>
            {canReply && (
              <button
                onClick={() => onReplyClick ? onReplyClick(comment) : setShowReplyForm(!showReplyForm)}
                className={cn(
                  bottomSheetMode
                    ? "px-3 py-1 rounded-full border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
                    : "font-semibold hover:text-white/70 text-[11px] text-white/40"
                )}
              >
                Reply
              </button>
            )}
            
            {isAuthor && !bottomSheetMode && (
              <>
                <button
                  onClick={() => setShowEditForm(true)}
                  className="font-semibold hover:text-white/70 text-[11px] text-white/40"
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="font-semibold hover:text-red-400 text-[11px] text-white/40"
                >
                  Eliminar
                </button>
              </>
            )}

            {isAuthor && bottomSheetMode && (
              <button
                onClick={handleDelete}
                className="px-3 py-1 rounded-full border border-gray-200 text-[11px] font-medium text-gray-400 hover:bg-gray-50"
              >
                Eliminar
              </button>
            )}
            
            {/* Menú de 3 puntos - solo en modo oscuro */}
            {!bottomSheetMode && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="hover:text-white/70 text-white/40"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                
                <AnimatePresence>
                  {showMenu && (
                    <motion.div 
                      className="absolute right-0 top-5 bg-gray-800 border border-white/20 rounded-lg shadow-lg py-1 z-20 min-w-[120px]"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                      >
                        <Flag className="w-4 h-4" />
                        Reportar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          
          {/* Ver respuestas */}
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold mt-1",
                bottomSheetMode ? "text-gray-400 hover:text-gray-600" : "text-white/40 hover:text-white/70"
              )}
            >
              {showReplies ? (
                <>Ocultar respuestas ({comment.reply_count})</>
              ) : (
                <>Ver {comment.reply_count} respuesta{comment.reply_count !== 1 ? 's' : ''} más</>
              )}
            </button>
          )}
        </div>
        
        {/* Like a la derecha */}
        <div className="flex items-start ml-1 flex-shrink-0">
          <div className="flex flex-col items-center w-5">
            <motion.button
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                "p-0.5 transition-all duration-200",
                bottomSheetMode
                  ? (comment.user_liked ? "text-red-500" : "text-gray-300 hover:text-red-500")
                  : (comment.user_liked ? "text-red-500" : "text-white/30 hover:text-red-500")
              )}
              whileTap={{ scale: 0.9 }}
            >
              <Heart className={cn(
                "w-4 h-4",
                comment.user_liked && "fill-current"
              )} />
            </motion.button>
            {comment.likes > 0 && (
              <span className={cn("text-[10px]", bottomSheetMode ? "text-gray-400" : "text-white/40")}>{comment.likes}</span>
            )}
          </div>
          {/* Dislike solo en modo oscuro */}
          {!bottomSheetMode && (
            <div className="flex flex-col items-center w-5">
              <motion.button
                onClick={handleDislike}
                disabled={isDisliking}
                className={cn(
                  "p-0.5 transition-all duration-200",
                  comment.user_disliked ? "text-blue-500" : "text-white/30 hover:text-blue-500"
                )}
                whileTap={{ scale: 0.9 }}
              >
                <HeartCrack className={cn(
                  "w-4 h-4",
                  comment.user_disliked && "fill-current"
                )} />
              </motion.button>
            </div>
          )}
        </div>
      </div>
      
      {/* Formulario de respuesta */}
      <AnimatePresence>
        {showReplyForm && (
          <div className="mt-4">
            <CommentForm
              onSubmit={handleReply}
              onCancel={() => setShowReplyForm(false)}
              placeholder={`Responder a ${comment.user.display_name || comment.user.username}...`}
              isReply={true}
            />
          </div>
        )}
      </AnimatePresence>
      
      {/* Respuestas anidadas */}
      <AnimatePresence>
        {showReplies && hasReplies && (
          <motion.div 
            className="replies-container mt-6 space-y-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {comment.replies.map((reply, index) => (
              <Comment
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onLike={onLike}
                onReact={onReact}
                onReplyClick={onReplyClick}
                depth={depth + 1}
                maxDepth={maxDepth}
                bottomSheetMode={bottomSheetMode}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Overlay para cerrar menú al hacer click fuera */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-10"
          onClick={() => setShowMenu(false)}
        />
      )}
    </motion.div>
  );
};

export default Comment;