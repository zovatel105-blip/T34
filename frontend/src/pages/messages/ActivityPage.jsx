import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Heart, MessageCircle, Send, X, Check } from 'lucide-react';
import DefaultAvatarSvg from '../../components/common/DefaultAvatarSvg';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppConfig from '../../config/config.js';
import useLivePoll from '../../hooks/useLivePoll';
import { useTranslation } from '../../hooks/useTranslation';
import resolveAssetUrl from '../../utils/resolveAssetUrl';

const ActivityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  // Inline reply state: which activity id is currently being replied to
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replySentFor, setReplySentFor] = useState(null); // item.id with recent "sent" feedback
  const replyInputRef = useRef(null);

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };
    const response = await fetch(`${AppConfig.BACKEND_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }, []);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const now = new Date();
      const dateStr = dateString.endsWith('Z') ? dateString : dateString + 'Z';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffSec < 60) return `${diffSec} seg`;
      if (diffMins < 60) return `${diffMins} min`;
      if (diffHours < 24) return `${diffHours} h`;
      if (diffDays < 7) return `${diffDays} d`;
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const activitiesData = await apiRequest('/api/users/activity/recent').catch(() => []);
      setActivities(activitiesData || []);
      await apiRequest('/api/users/activity/mark-read', { method: 'POST' }).catch(() => {});
      // Actualizar estado local: marcar todas las actividades como leídas para que
      // los puntos rojos de los tabs (Todo, Votos, Likes, Comentarios, Menciones)
      // desaparezcan inmediatamente sin esperar al siguiente poll.
      setActivities(prev => (prev || []).map(a => ({ ...a, unread: false })));
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest]);

  // Refresco silencioso (sin spinner, sin mark-read) para live polling
  const silentRefresh = useCallback(async () => {
    if (!user) return;
    try {
      const activitiesData = await apiRequest('/api/users/activity/recent').catch(() => null);
      if (Array.isArray(activitiesData)) {
        setActivities(activitiesData);
      }
    } catch (_) {
      // silencioso
    }
  }, [user, apiRequest]);

  useEffect(() => { loadData(); }, [loadData]);

  // 🔴 Live refresh cada 10s mientras la página de actividad está abierta
  useLivePoll(silentRefresh, 10000, {
    enabled: Boolean(user),
    pauseWhenHidden: true,
    refreshOnFocus: true,
  });

  const getFilteredItems = () => {
    switch (activeTab) {
      case 'votes': return activities.filter(i => i.type === 'vote');
      case 'likes': return activities.filter(i => i.type === 'like');
      case 'comments': return activities.filter(i => i.type === 'comment');
      case 'mentions': return activities.filter(i => i.type === 'mention');
      default: return activities;
    }
  };

  const getCounts = () => ({
    all: activities.filter(i => i.unread).length,
    votes: activities.filter(i => i.type === 'vote' && i.unread).length,
    likes: activities.filter(i => i.type === 'like' && i.unread).length,
    comments: activities.filter(i => i.type === 'comment' && i.unread).length,
    mentions: activities.filter(i => i.type === 'mention' && i.unread).length,
  });

  const filteredItems = getFilteredItems();
  const counts = getCounts();

  const tabs = [
    { key: 'all', label: t('inbox.activity.all'), count: counts.all },
    { key: 'votes', label: t('inbox.activity.votes'), count: counts.votes },
    { key: 'likes', label: t('inbox.activity.likes'), count: counts.likes },
    { key: 'comments', label: t('inbox.activity.comments'), count: counts.comments },
    { key: 'mentions', label: t('inbox.activity.mentions'), count: counts.mentions },
  ];

  const Avatar = ({ avatarUrl, name }) => {
    const resolvedAvatar = resolveAssetUrl(avatarUrl);
    return (
    <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center flex-shrink-0">
      {resolvedAvatar ? (
        <>
          <img src={resolvedAvatar} alt={name} className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
          <div className="w-full h-full items-center justify-center overflow-hidden"
            style={{ display: 'none' }}>
            <DefaultAvatarSvg className="w-full h-full" />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <DefaultAvatarSvg className="w-full h-full" />
        </div>
      )}
    </div>
    );
  };

  // Helper: renderiza la miniatura del poll. Para layout VS muestra los dos
  // lados (las dos opciones) lado-a-lado igual que en la vista completa,
  // con la línea central y el badge "VS" superpuesto en estilo Twyk.
  const PollThumb = ({ item, onClick }) => {
    const isVS = item.poll_layout === 'vs' && Array.isArray(item.poll_vs_thumbnails) && item.poll_vs_thumbnails.length >= 2;
    if (isVS) {
      const [left, right] = item.poll_vs_thumbnails;
      const leftSrc = resolveAssetUrl(left);
      const rightSrc = resolveAssetUrl(right);
      return (
        <div
          onClick={onClick}
          className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer flex bg-black"
        >
          <div className="relative w-1/2 h-full overflow-hidden">
            <img src={leftSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          {/* Línea central blanca, mismo look que la vista completa */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white z-10 shadow-[0_0_2px_rgba(255,255,255,0.9)]" />
          <div className="relative w-1/2 h-full overflow-hidden">
            <img src={rightSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          {/* VS central — letras blancas con bordes lila (V) y azul (S),
              italic, escala reducida para encajar en la miniatura */}
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <span
              className="inline-flex items-baseline font-black select-none"
              style={{
                fontSize: '20px',
                lineHeight: 1,
                letterSpacing: '-0.14em',
                fontStyle: 'italic',
                fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif',
                fontWeight: 900,
              }}
            >
              <span
                style={{
                  color: '#fff',
                  WebkitTextStroke: '1.2px #A855F7',
                  paintOrder: 'stroke fill',
                  textShadow: '0 1px 0 rgba(0,0,0,0.6), 1px 2px 3px rgba(0,0,0,0.7)',
                  transform: 'skewX(-6deg) translateY(-0.14em)',
                  display: 'inline-block',
                  marginRight: '0.02em',
                }}
              >V</span>
              <span
                style={{
                  color: '#fff',
                  WebkitTextStroke: '1.2px #3B82F6',
                  paintOrder: 'stroke fill',
                  textShadow: '0 1px 0 rgba(0,0,0,0.6), 1px 2px 3px rgba(0,0,0,0.7)',
                  transform: 'skewX(-6deg) translateY(0.14em)',
                  display: 'inline-block',
                }}
              >S</span>
            </span>
          </div>
        </div>
      );
    }
    if (!item.poll_thumbnail) return null;
    return (
      <div
        onClick={onClick}
        className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
      >
        <img src={resolveAssetUrl(item.poll_thumbnail)} alt="" className="w-full h-full object-cover" />
      </div>
    );
  };

  const handleLikeComment = useCallback(async (commentId, itemId) => {
    if (!commentId) return;
    try {
      const res = await apiRequest(`/api/comments/${commentId}/like`, { method: 'POST' });
      // Marca visual local del corazón
      setActivities(prev => prev.map(a => a.id === itemId ? { ...a, comment_liked: !!res?.liked } : a));
    } catch (e) {
      console.error('Error liking comment:', e);
    }
  }, [apiRequest]);

  const openReply = useCallback((item) => {
    setReplyingTo(item.id);
    const username = item.user?.username || item.user?.display_name || '';
    // Prefill with @username (Instagram/TikTok-like behavior)
    setReplyText(username ? `@${username} ` : '');
    setReplySentFor(null);
    // Focus the input on next tick
    setTimeout(() => {
      try { replyInputRef.current?.focus(); } catch (_) {}
    }, 50);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyText('');
  }, []);

  const submitReply = useCallback(async (item) => {
    const content = (replyText || '').trim();
    if (!content || !item?.poll_id || !item?.comment_id) return;
    try {
      setReplySubmitting(true);
      await apiRequest(`/api/polls/${item.poll_id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          poll_id: item.poll_id,
          content,
          parent_comment_id: item.comment_id,
        }),
      });
      // Reset + show transient confirmation
      setReplyText('');
      setReplyingTo(null);
      setReplySentFor(item.id);
      // Hide the confirmation badge after 2.5s
      setTimeout(() => {
        setReplySentFor(curr => (curr === item.id ? null : curr));
      }, 2500);
    } catch (e) {
      console.error('Error sending reply:', e);
      // Use translation if available, fallback to default
      try {
        alert(t('inbox.activity.replyError'));
      } catch (_) {
        alert('No se pudo enviar la respuesta');
      }
    } finally {
      setReplySubmitting(false);
    }
  }, [replyText, apiRequest, t]);

  const renderItem = (item) => {
    const username = item.user?.username || item.user?.display_name || t('profile.defaultUsername');
    const time = formatTime(item.created_at);
    const goToPost = () => {
      if (item.poll_id) navigate(`/post/${item.poll_id}`);
    };

    if (item.type === 'comment') {
      const commentText = item.comment_preview || t('inbox.activity.commentedDefault');
      const isReplying = replyingTo === item.id;
      const wasSent = replySentFor === item.id;
      return (
        <div key={item.id} className="flex flex-col gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
          <div className="flex items-start gap-3">
            <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer flex-shrink-0">
              <Avatar avatarUrl={item.user?.avatar_url} name={username} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 cursor-pointer truncate" onClick={() => navigate(`/profile/${item.user?.id}`)}>
                {username}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed flex items-center gap-1 flex-wrap">
                <span>
                  {t('inbox.activity.commentedPrefix')}: {commentText} · <span className="text-gray-400">{time}</span>
                </span>
                {/* 🆕 Mini avatar del creador con corazón cuando ya le diste like al comentario (estilo TikTok/Instagram) */}
                {item.comment_liked && (
                  <span
                    className="relative inline-flex items-center justify-center flex-shrink-0 ml-0.5 align-middle"
                    title="Te gustó este comentario"
                    aria-label="Te gustó este comentario"
                  >
                    <span className="block w-4 h-4 rounded-full overflow-hidden ring-1 ring-white shadow-sm bg-gray-200">
                      {user?.avatar_url ? (
                        <img
                          src={resolveAssetUrl(user.avatar_url)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <DefaultAvatarSvg className="w-full h-full" />
                      )}
                    </span>
                    <Heart
                      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-red-500"
                      fill="currentColor"
                      strokeWidth={1}
                      style={{ filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.95))' }}
                    />
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleLikeComment(item.comment_id, item.id); }}
                  className="p-0 bg-transparent border-0"
                  aria-label="Like comment"
                >
                  <Heart
                    className={`w-5 h-5 cursor-pointer transition-colors ${item.comment_liked ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'}`}
                    strokeWidth={1.5}
                    fill={item.comment_liked ? 'currentColor' : 'none'}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (replyingTo === item.id) {
                      cancelReply();
                    } else {
                      openReply(item);
                    }
                  }}
                  className="p-0 bg-transparent border-0"
                  aria-label="Reply to comment"
                >
                  <MessageCircle className={`w-5 h-5 cursor-pointer transition-colors ${isReplying ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`} strokeWidth={1.5} />
                </button>
                {wasSent && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {t('inbox.activity.replySent')}
                  </span>
                )}
              </div>
            </div>
            {item.poll_thumbnail && (
              <PollThumb item={item} onClick={goToPost} />
            )}
          </div>
          {isReplying && (
            <div
              className="ml-15 pl-15 mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
                <textarea
                  ref={replyInputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitReply(item);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelReply();
                    }
                  }}
                  rows={1}
                  placeholder={t('inbox.activity.replyPlaceholder')}
                  className="flex-1 resize-none bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400 max-h-28 py-1"
                  disabled={replySubmitting}
                />
                <button
                  type="button"
                  onClick={cancelReply}
                  disabled={replySubmitting}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                  aria-label={t('inbox.activity.cancel')}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  type="button"
                  onClick={() => submitReply(item)}
                  disabled={replySubmitting || !replyText.trim()}
                  className={`p-1.5 rounded-full transition-colors ${
                    replyText.trim() && !replySubmitting
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-label={t('inbox.activity.send')}
                >
                  {replySubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'like') {
      return (
        <div key={item.id} className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
          <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer flex-shrink-0">
            <Avatar avatarUrl={item.user?.avatar_url} name={username} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 cursor-pointer truncate" onClick={() => navigate(`/profile/${item.user?.id}`)}>
              {username}
            </p>
            <p className="text-xs text-gray-500">
              {t('inbox.activity.liked')} · <span className="text-gray-400">{time}</span>
            </p>
          </div>
          {item.poll_thumbnail && (
            <PollThumb item={item} onClick={goToPost} />
          )}
        </div>
      );
    }

    if (item.type === 'vote') {
      return (
        <div key={item.id} className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
          <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer flex-shrink-0">
            <Avatar avatarUrl={item.user?.avatar_url} name={username} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 cursor-pointer truncate" onClick={() => navigate(`/profile/${item.user?.id}`)}>
              {username}
            </p>
            <p className="text-xs text-gray-500">
              {t('inbox.activity.votedPrefix')}{item.vote_option ? `: "${item.vote_option}"` : ''} · <span className="text-gray-400">{time}</span>
            </p>
          </div>
          {item.poll_thumbnail && (
            <PollThumb item={item} onClick={goToPost} />
          )}
        </div>
      );
    }

    // Mention
    return (
      <div key={item.id} className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
        <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer flex-shrink-0">
          <Avatar avatarUrl={item.user?.avatar_url} name={username} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 cursor-pointer truncate" onClick={() => navigate(`/profile/${item.user?.id}`)}>
            {username}
          </p>
          <p className="text-xs text-gray-500">
            {t('inbox.activity.mentioned')} · <span className="text-gray-400">{time}</span>
          </p>
        </div>
        {item.poll_thumbnail && (
          <div className="ml-3">
            <PollThumb item={item} onClick={goToPost} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-1 pt-3 pb-2">
        <div className="flex items-center justify-center relative mb-3">
          <button onClick={() => navigate('/messages')}
            className="absolute left-0 p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-800" />
          </button>
          <h1 className="text-xl font-normal text-black">{t('inbox.activity.title')}</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 pt-2 -mx-1 px-1">
          {tabs.map(tab => (
            <div key={tab.key} className="relative flex-shrink-0">
              {tab.count > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white px-1 z-10">
                  {tab.count}
                </span>
              )}
              <button onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? 'text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={activeTab === tab.key ? {
                  backgroundColor: '#f3f4f6',
                  border: '2px solid #3B82F6'
                } : {}}>
                {tab.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('inbox.activity.empty')}</h3>
            <p className="text-gray-500 text-sm">
              {t('inbox.activity.emptyDesc')}
            </p>
          </div>
        ) : (
          <div className="px-2 py-2 flex flex-col gap-2">
            {filteredItems.map(item => renderItem(item))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
