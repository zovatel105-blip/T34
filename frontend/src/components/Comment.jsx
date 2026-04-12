import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, MoreHorizontal, Edit3, Trash2, 
  ChevronDown, ChevronUp, Reply, Flag, CheckCircle, Send, Sparkles, Loader2, HeartCrack, User
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

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
  depth = 0, 
  maxDepth = 3 
}) => {
  const { user: currentUser } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);

  const isAuthor = currentUser && currentUser.id === comment.user.id;
  const canReply = depth < maxDepth;
  const hasReplies = comment.replies && comment.replies.length > 0;

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
        {/* Avatar pequeño */}
        <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
          <AvatarImage src={comment.user.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        
        {/* Contenido central */}
        <div className="flex-1 min-w-0">
          {/* Nombre y hora */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white text-[13px]">
              {comment.user.display_name || comment.user.username}
            </span>
            <span className="text-[11px] text-white/40">
              {formatTimeAgo(comment.created_at)}
            </span>
            {comment.is_edited && (
              <span className="text-[11px] text-white/30">(editado)</span>
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
            <p className="text-white/90 text-[13px] leading-snug mt-0.5">
              {comment.content}
            </p>
          )}
          
          {/* Acciones compactas */}
          <div className="flex items-center gap-3 text-[11px] text-white/40 mt-1">
            {canReply && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="font-semibold hover:text-white/70"
              >
                Responder
              </button>
            )}
            
            {isAuthor && (
              <>
                <button
                  onClick={() => setShowEditForm(true)}
                  className="font-semibold hover:text-white/70"
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="font-semibold hover:text-red-400"
                >
                  Eliminar
                </button>
              </>
            )}
            
            {/* Menú de 3 puntos */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="hover:text-white/70"
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
          </div>
          
          {/* Ver respuestas */}
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-[11px] text-white/40 font-semibold hover:text-white/70 mt-1"
            >
              {showReplies ? (
                <>Ocultar respuestas ({comment.reply_count})</>
              ) : (
                <>Ver {comment.reply_count} respuesta{comment.reply_count !== 1 ? 's' : ''} más</>
              )}
            </button>
          )}
        </div>
        
        {/* Likes/Dislikes a la derecha */}
        <div className="flex items-center gap-2 ml-1 flex-shrink-0">
          <motion.button
            onClick={handleLike}
            disabled={isLiking}
            className={cn(
              "p-0.5 transition-all duration-200",
              comment.user_liked ? "text-red-500" : "text-white/30 hover:text-red-500"
            )}
            whileTap={{ scale: 0.9 }}
          >
            <Heart className={cn(
              "w-4 h-4",
              comment.user_liked && "fill-current"
            )} />
          </motion.button>
          {comment.likes > 0 && (
            <span className="text-[11px] text-white/40">{comment.likes}</span>
          )}
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
                depth={depth + 1}
                maxDepth={maxDepth}
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