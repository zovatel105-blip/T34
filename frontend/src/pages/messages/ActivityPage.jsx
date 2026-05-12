import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import DefaultAvatarSvg from '../../components/common/DefaultAvatarSvg';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppConfig from '../../config/config.js';
import useLivePoll from '../../hooks/useLivePoll';
import { useTranslation } from '../../hooks/useTranslation';

const ActivityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

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

  const Avatar = ({ avatarUrl, name }) => (
    <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center flex-shrink-0">
      {avatarUrl ? (
        <>
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover"
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

  const renderItem = (item) => {
    const username = item.user?.username || item.user?.display_name || t('profile.defaultUsername');
    const time = formatTime(item.created_at);
    const goToPost = () => {
      if (item.poll_id) navigate(`/post/${item.poll_id}`);
    };
    const goToPostAndOpenComments = (e) => {
      e?.stopPropagation?.();
      if (item.poll_id) navigate(`/post/${item.poll_id}?openComments=1`);
    };

    if (item.type === 'comment') {
      const commentText = item.comment_preview || t('inbox.activity.commentedDefault');
      return (
        <div key={item.id} className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
          <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer flex-shrink-0">
            <Avatar avatarUrl={item.user?.avatar_url} name={username} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 cursor-pointer truncate" onClick={() => navigate(`/profile/${item.user?.id}`)}>
              {username}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('inbox.activity.commentedPrefix')}: {commentText} · <span className="text-gray-400">{time}</span>
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
                onClick={goToPostAndOpenComments}
                className="p-0 bg-transparent border-0"
                aria-label="Reply to comment"
              >
                <MessageCircle className="w-5 h-5 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          {item.poll_thumbnail && (
            <div
              onClick={goToPost}
              className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
            >
              <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
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
            <div
              onClick={goToPost}
              className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
            >
              <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
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
            <div
              onClick={goToPost}
              className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
            >
              <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
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
          <div
            onClick={goToPost}
            className="ml-3 w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
          >
            <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-4 pt-3 pb-2">
        <div className="flex items-center justify-center relative mb-3">
          <button onClick={() => navigate('/messages')}
            className="absolute left-0 p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-800" />
          </button>
          <h1 className="text-xl font-normal text-black">{t('inbox.activity.title')}</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 pt-2 px-1">
          {tabs.map(tab => (
            <div key={tab.key} className="relative flex-shrink-0">
              {tab.count > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white px-1 z-10">
                  {tab.count}
                </span>
              )}
              <button onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
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
