import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Swords, Plus, Inbox, User, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { useInboxUnreadCount } from '../hooks/useInboxUnreadCount';
import { useAuth } from '../contexts/AuthContext';
import { useTikTok } from '../contexts/TikTokContext';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import commentService from '../services/commentService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hideBottomNav, commentInputConfig } = useTikTok();
  const { unreadCount } = useInboxUnreadCount(!!user);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [currentMode, setCurrentMode] = useState('feed');
  const commentInputRef = useRef(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (location.pathname === '/following') {
      setCurrentMode('following');
    } else {
      setCurrentMode('feed');
    }
  }, [location.pathname]);

  const handleTouchStart = useCallback(() => {
    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      if (currentMode === 'feed') {
        setCurrentMode('following');
        navigate('/following');
      } else {
        setCurrentMode('feed');
        navigate('/feed');
      }
      setIsLongPressing(false);
    }, 800);
  }, [navigate, currentMode]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const isActive = (path) => {
    if (path === '/feed') return location.pathname === '/feed' || location.pathname === '/following';
    if (path === '/profile') return location.pathname === '/profile' || location.pathname.startsWith('/profile/');
    return location.pathname === path;
  };

  const handleCommentSubmit = useCallback(async (e) => {
    e.preventDefault();
    const content = commentInputRef.current?.value?.trim();
    if (!content || !commentInputConfig?.pollId || submittingComment) return;
    
    setSubmittingComment(true);
    try {
      await commentService.addComment(commentInputConfig.pollId, content);
      if (commentInputRef.current) commentInputRef.current.value = '';
    } catch (error) {
      // Error silencioso
    } finally {
      setSubmittingComment(false);
    }
  }, [commentInputConfig, submittingComment]);

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl",
        hideBottomNav && commentInputConfig ? "bg-white" : "bg-black"
      )}
      style={{
        // EDGE-TO-EDGE: respetar la barra de navegación del sistema
        // (gesto o 3 botones). max() garantiza un mínimo aunque el
        // sistema no reporte insets.
        paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), 8px)'
      }}
    >
      {hideBottomNav && commentInputConfig ? (
        <div className="px-4 py-2">
          <form onSubmit={handleCommentSubmit} className="flex items-center bg-gray-100 rounded-full px-2.5 py-1.5">
            <Avatar className="w-7 h-7 flex-shrink-0">
              {user?.avatar_url ? (
                <AvatarImage src={resolveAssetUrl(user.avatar_url)} alt={user?.username} />
              ) : null}
              <AvatarFallback className="bg-gray-300 text-gray-500 flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </AvatarFallback>
            </Avatar>
            <input
              ref={commentInputRef}
              type="text"
              placeholder="Add comment"
              className="flex-1 px-2.5 py-0 text-sm bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
              maxLength={500}
              disabled={submittingComment}
            />
            <button
              type="submit"
              disabled={submittingComment}
              className="flex-shrink-0 disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      ) : (
      <div className="flex items-center justify-around px-4 py-2.5">

        {/* Home - con long press */}
        <button
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onClick={() => !isLongPressing && navigate(currentMode === 'following' ? '/following' : '/feed')}
          className={cn(
            "flex items-center justify-center w-9 h-9 transition-all duration-200 active:scale-90",
            isLongPressing && "scale-110 opacity-70"
          )}
        >
          <Home
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isActive('/feed') ? "text-white" : "text-white/50"
            )}
            strokeWidth={isActive('/feed') ? 2.5 : 1.5}
            fill={isActive('/feed') ? "white" : "none"}
          />
        </button>

        {/* Explorar / Battle */}
        <button
          onClick={() => navigate('/explore')}
          className="flex items-center justify-center w-9 h-9 transition-all duration-200 active:scale-90"
        >
          <Swords
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isActive('/explore') ? "text-white" : "text-white/50"
            )}
            strokeWidth={isActive('/explore') ? 2.5 : 1.5}
          />
        </button>

        {/* Crear - borde gradiente */}
        <button
          onClick={() => navigate('/content-creation')}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 active:scale-90 relative overflow-hidden flex-shrink-0"
          style={{
            background: 'linear-gradient(180deg, #000 0%, #000 100%)',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(#000, #000), linear-gradient(90deg, #A855F7 0%, #3B82F6 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <Plus className="w-5 h-5 text-white relative z-10" strokeWidth={2} />
        </button>

        {/* Mensajes / Inbox */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate('/messages')}
            className="flex items-center justify-center w-9 h-9 transition-all duration-200 active:scale-90"
          >
            <Inbox
              className={cn(
                "w-5 h-5 transition-all duration-200",
                isActive('/messages') ? "text-white" : "text-white/50"
              )}
              strokeWidth={isActive('/messages') ? 2.5 : 1.5}
            />
          </button>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </div>

        {/* Perfil */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center justify-center w-9 h-9 transition-all duration-200 active:scale-90"
        >
          <User
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isActive('/profile') ? "text-white" : "text-white/50"
            )}
            strokeWidth={isActive('/profile') ? 2.5 : 1.5}
          />
        </button>

      </div>
      )}
    </nav>
  );
};

export default BottomNavigation;
