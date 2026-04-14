import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Heart, MessageCircle, User, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppConfig from '../../config/config.js';

// Gradient ring colors for avatars
const RING_GRADIENTS = [
  'linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #ffecd2, #fcb69f)',
  'linear-gradient(135deg, #667eea, #764ba2)',
];

const getRingGradient = (id) => {
  const index = (id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % RING_GRADIENTS.length;
  return RING_GRADIENTS[index];
};

const ActivityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [followingStatus, setFollowingStatus] = useState({});

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

  const checkFollowStatus = useCallback(async (userIds) => {
    const statuses = {};
    for (const uid of userIds) {
      try {
        const res = await apiRequest(`/api/users/${uid}/follow-status`);
        statuses[uid] = res.is_following || false;
      } catch {
        statuses[uid] = false;
      }
    }
    setFollowingStatus(prev => ({ ...prev, ...statuses }));
  }, [apiRequest]);

  const handleFollowBack = async (userId) => {
    try {
      if (followingStatus[userId]) {
        await apiRequest(`/api/users/${userId}/follow`, { method: 'DELETE' });
        setFollowingStatus(prev => ({ ...prev, [userId]: false }));
      } else {
        await apiRequest(`/api/users/${userId}/follow`, { method: 'POST' });
        setFollowingStatus(prev => ({ ...prev, [userId]: true }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [followersData, activitiesData] = await Promise.all([
        apiRequest('/api/users/followers/recent').catch(() => []),
        apiRequest('/api/users/activity/recent').catch(() => [])
      ]);
      setFollowers(followersData || []);
      setActivities(activitiesData || []);
      const followerIds = (followersData || []).map(f => f.id);
      if (followerIds.length > 0) checkFollowStatus(followerIds);
      await apiRequest('/api/users/activity/mark-read', { method: 'POST' }).catch(() => {});
      await apiRequest('/api/users/followers/mark-read', { method: 'POST' }).catch(() => {});
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest, checkFollowStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const getAllItems = () => {
    const items = [];
    followers.forEach(f => {
      items.push({
        id: `follow-${f.id}`, type: 'follow',
        user: { id: f.id, username: f.username, display_name: f.display_name, avatar_url: f.avatar_url },
        created_at: f.followed_at, unread: f.unread,
      });
    });
    activities.forEach(a => {
      items.push({
        id: `activity-${a.id}`, type: a.type, user: a.user,
        created_at: a.created_at, unread: a.unread,
        content_preview: a.content_preview, comment_preview: a.comment_preview,
        vote_option: a.vote_option, poll_id: a.poll_id, poll_thumbnail: a.poll_thumbnail,
      });
    });
    items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return items;
  };

  const getFilteredItems = () => {
    const all = getAllItems();
    switch (activeTab) {
      case 'likes': return all.filter(i => i.type === 'like');
      case 'comments': return all.filter(i => i.type === 'comment');
      case 'mentions': return all.filter(i => i.type === 'mention');
      default: return all;
    }
  };

  const getCounts = () => {
    const all = getAllItems();
    return {
      likes: all.filter(i => i.type === 'like').length,
      comments: all.filter(i => i.type === 'comment').length,
      mentions: all.filter(i => i.type === 'mention').length,
      total: all.length,
    };
  };

  const filteredItems = getFilteredItems();
  const counts = getCounts();

  const tabs = [
    { key: 'all', label: 'Toda la actividad', count: null },
    { key: 'likes', label: 'Me gusta', count: counts.likes },
    { key: 'comments', label: 'Comentarios', count: counts.comments },
    { key: 'mentions', label: 'Menciones', count: counts.mentions },
  ];

  // Avatar with gradient ring - matching reference exactly
  const AvatarWithRing = ({ avatarUrl, name, id }) => {
    const gradient = getRingGradient(id);
    return (
      <div
        className="w-[52px] h-[52px] rounded-full p-[2.5px] flex-shrink-0"
        style={{ background: gradient }}
      >
        <div className="w-full h-full rounded-full bg-white p-[2px]">
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div
              className="w-full h-full flex items-center justify-center text-gray-400"
              style={{ display: avatarUrl ? 'none' : 'flex' }}
            >
              <User className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Chat bubble icon with dots (matching reference)
  const ChatBubbleIcon = () => (
    <div className="w-[22px] h-[22px] flex items-center justify-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <circle cx="8" cy="10" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="12" cy="10" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="16" cy="10" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );

  const renderItem = (item) => {
    const username = item.user?.username || item.user?.display_name || 'Usuario';
    const time = formatTime(item.created_at);

    // FOLLOW notification
    if (item.type === 'follow') {
      return (
        <div key={item.id} className="bg-white rounded-2xl mx-4 mb-2.5 px-4 py-3.5 flex items-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div onClick={() => navigate(`/profile/${item.user.id}`)} className="cursor-pointer">
            <AvatarWithRing avatarUrl={item.user.avatar_url} name={username} id={item.user.id} />
          </div>
          <div className="flex-1 min-w-0 ml-3.5">
            <p className="text-[15px] font-bold text-black leading-tight cursor-pointer" onClick={() => navigate(`/profile/${item.user.id}`)}>
              {username}
            </p>
            <p className="text-[13px] text-gray-500 leading-snug mt-0.5">
              empezó a seguirte.  <span className="text-gray-400">{time}</span>
            </p>
          </div>
          <button
            onClick={() => handleFollowBack(item.user.id)}
            className={`ml-3 px-5 py-2.5 rounded-lg text-[14px] font-semibold flex-shrink-0 transition-all ${
              followingStatus[item.user.id]
                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                : 'bg-[#0095F6] text-white active:bg-blue-700'
            }`}
          >
            {followingStatus[item.user.id] ? 'Siguiendo' : 'Seguir'}
          </button>
        </div>
      );
    }

    // COMMENT notification
    if (item.type === 'comment') {
      const commentText = item.comment_preview || 'Comentó tu publicación';
      return (
        <div key={item.id} className="bg-white rounded-2xl mx-4 mb-2.5 px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-start">
            <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer">
              <AvatarWithRing avatarUrl={item.user?.avatar_url} name={username} id={item.user?.id} />
            </div>
            <div className="flex-1 min-w-0 ml-3.5">
              <p className="text-[15px] font-bold text-black leading-tight cursor-pointer" onClick={() => navigate(`/profile/${item.user?.id}`)}>
                {username}
              </p>
              <p className="text-[13px] text-gray-500 leading-relaxed mt-0.5">
                Comentó: {commentText}  <span className="text-gray-400">{time}</span>
              </p>
            </div>
            {item.poll_thumbnail && (
              <div className="ml-3 w-[52px] h-[52px] rounded-xl overflow-hidden flex-shrink-0">
                <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          {/* Action icons below comment */}
          <div className="flex items-center gap-4 mt-2.5 ml-[66px]">
            <Heart className="w-[22px] h-[22px] text-gray-400 cursor-pointer hover:text-red-500 transition-colors" strokeWidth={1.5} />
            <ChatBubbleIcon />
          </div>
        </div>
      );
    }

    // LIKE notification
    if (item.type === 'like') {
      return (
        <div key={item.id} className="bg-white rounded-2xl mx-4 mb-2.5 px-4 py-3.5 flex items-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer">
            <AvatarWithRing avatarUrl={item.user?.avatar_url} name={username} id={item.user?.id} />
          </div>
          <div className="flex-1 min-w-0 ml-3.5">
            <p className="text-[15px] font-bold text-black leading-tight cursor-pointer" onClick={() => navigate(`/profile/${item.user?.id}`)}>
              {username}
            </p>
            <p className="text-[13px] text-gray-500 leading-snug mt-0.5">
              le gustó tu publicación.  <span className="text-gray-400">{time}</span>
            </p>
          </div>
          {item.poll_thumbnail && (
            <div className="ml-3 w-[52px] h-[52px] rounded-xl overflow-hidden flex-shrink-0">
              <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      );
    }

    // VOTE notification
    if (item.type === 'vote') {
      return (
        <div key={item.id} className="bg-white rounded-2xl mx-4 mb-2.5 px-4 py-3.5 flex items-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer">
            <AvatarWithRing avatarUrl={item.user?.avatar_url} name={username} id={item.user?.id} />
          </div>
          <div className="flex-1 min-w-0 ml-3.5">
            <p className="text-[15px] font-bold text-black leading-tight cursor-pointer" onClick={() => navigate(`/profile/${item.user?.id}`)}>
              {username}
            </p>
            <p className="text-[13px] text-gray-500 leading-snug mt-0.5">
              votó en tu encuesta{item.vote_option ? `: "${item.vote_option}"` : ''}.  <span className="text-gray-400">{time}</span>
            </p>
          </div>
        </div>
      );
    }

    // MENTION notification
    return (
      <div key={item.id} className="bg-white rounded-2xl mx-4 mb-2.5 px-4 py-3.5 flex items-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer">
          <AvatarWithRing avatarUrl={item.user?.avatar_url} name={username} id={item.user?.id} />
        </div>
        <div className="flex-1 min-w-0 ml-3.5">
          <p className="text-[15px] font-bold text-black leading-tight cursor-pointer" onClick={() => navigate(`/profile/${item.user?.id}`)}>
            {username}
          </p>
          <p className="text-[13px] text-gray-500 leading-snug mt-0.5">
            te mencionó en una publicación.  <span className="text-gray-400">{time}</span>
          </p>
        </div>
        {item.poll_thumbnail && (
          <div className="ml-3 w-[52px] h-[52px] rounded-xl overflow-hidden flex-shrink-0">
            <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#f2f2f2]">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#f2f2f2] px-4 pt-4 pb-1">
        {/* Title */}
        <div className="flex items-center justify-center relative mb-4">
          <button
            onClick={() => navigate('/messages')}
            className="absolute left-0 p-1"
          >
            <ArrowLeft className="h-6 w-6 text-black" strokeWidth={2} />
          </button>
          <h1 className="text-[22px] font-bold text-black tracking-tight">Actividad</h1>
        </div>

        {/* Filter Tabs - matching reference exactly */}
        <div className="flex items-end gap-2 overflow-x-auto scrollbar-hide pb-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex flex-col items-center relative flex-shrink-0"
            >
              {/* Badge above text */}
              {tab.count > 0 && (
                <span className="mb-1 min-w-[22px] h-[22px] rounded-full bg-[#FF3B5C] flex items-center justify-center">
                  <span className="text-[11px] text-white font-bold px-1.5">{tab.count}</span>
                </span>
              )}
              {/* Tab pill */}
              <span className={`px-5 py-2.5 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-black text-white'
                  : 'bg-transparent text-gray-800'
              }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Heart className="h-9 w-9 text-gray-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-[17px] font-bold text-black mb-1.5">Sin actividad</h3>
            <p className="text-gray-400 text-[14px] leading-relaxed">
              Los likes, comentarios, seguidores y menciones aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="pt-2 pb-24">
            {/* Section Header */}
            <div className="px-5 mb-3">
              <h2 className="text-[17px] font-bold text-black">
                Nuevo ({filteredItems.length})
              </h2>
            </div>

            {/* Activity Items */}
            {filteredItems.map(item => renderItem(item))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
