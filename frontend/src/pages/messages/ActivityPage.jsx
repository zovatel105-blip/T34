import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Heart, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppConfig from '../../config/config.js';

// Colores para los anillos de avatar
const RING_COLORS = [
  'from-pink-500 via-red-500 to-yellow-500',
  'from-purple-500 via-pink-500 to-red-500',
  'from-blue-500 via-cyan-500 to-teal-500',
  'from-orange-500 via-red-500 to-pink-500',
  'from-green-500 via-teal-500 to-cyan-500',
  'from-indigo-500 via-purple-500 to-pink-500',
];

const getRandomRing = (id) => {
  const index = (id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % RING_COLORS.length;
  return RING_COLORS[index];
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
      if (followerIds.length > 0) {
        checkFollowStatus(followerIds);
      }

      await apiRequest('/api/users/activity/mark-read', { method: 'POST' }).catch(() => {});
      await apiRequest('/api/users/followers/mark-read', { method: 'POST' }).catch(() => {});
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest, checkFollowStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getAllItems = () => {
    const items = [];

    followers.forEach(f => {
      items.push({
        id: `follow-${f.id}`,
        type: 'follow',
        user: {
          id: f.id,
          username: f.username,
          display_name: f.display_name,
          avatar_url: f.avatar_url,
        },
        created_at: f.followed_at,
        unread: f.unread,
      });
    });

    activities.forEach(a => {
      items.push({
        id: `activity-${a.id}`,
        type: a.type,
        user: a.user,
        created_at: a.created_at,
        unread: a.unread,
        content_preview: a.content_preview,
        comment_preview: a.comment_preview,
        vote_option: a.vote_option,
        poll_id: a.poll_id,
        poll_thumbnail: a.poll_thumbnail,
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
    { key: 'all', label: 'All activity', count: null },
    { key: 'likes', label: 'Likes', count: counts.likes },
    { key: 'comments', label: 'Comments', count: counts.comments },
    { key: 'mentions', label: 'Mentions', count: counts.mentions },
  ];

  // Avatar component with colored ring
  const AvatarWithRing = ({ avatarUrl, name, id, size = 'md' }) => {
    const ring = getRandomRing(id);
    const sizeClass = size === 'lg' ? 'w-14 h-14' : 'w-12 h-12';
    const innerSize = size === 'lg' ? 'w-[50px] h-[50px]' : 'w-[42px] h-[42px]';

    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-tr ${ring} p-[2.5px] flex-shrink-0`}>
        <div className={`${innerSize} rounded-full bg-white p-[2px]`}>
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div
              className="w-full h-full flex items-center justify-center text-gray-500"
              style={{ display: avatarUrl ? 'none' : 'flex' }}
            >
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderItem = (item) => {
    const username = item.user?.username || item.user?.display_name || 'Usuario';
    const time = formatTime(item.created_at);

    if (item.type === 'follow') {
      return (
        <div key={item.id} className="flex items-center px-4 py-3 bg-gray-50/80 rounded-xl mx-3 mb-2">
          <div onClick={() => navigate(`/profile/${item.user.id}`)} className="cursor-pointer">
            <AvatarWithRing avatarUrl={item.user.avatar_url} name={username} id={item.user.id} />
          </div>
          <div className="flex-1 min-w-0 ml-3">
            <p className="text-sm">
              <span className="font-bold text-black cursor-pointer" onClick={() => navigate(`/profile/${item.user.id}`)}>
                {username}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              started following you. <span className="text-gray-400">{time}</span>
            </p>
          </div>
          <button
            onClick={() => handleFollowBack(item.user.id)}
            className={`ml-3 px-5 py-2 rounded-lg text-sm font-semibold flex-shrink-0 transition-colors ${
              followingStatus[item.user.id]
                ? 'bg-gray-200 text-gray-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {followingStatus[item.user.id] ? 'Following' : 'Follow back'}
          </button>
        </div>
      );
    }

    if (item.type === 'comment') {
      const commentText = item.comment_preview || 'Comentó tu publicación';
      return (
        <div key={item.id} className="flex items-start px-4 py-3 bg-gray-50/80 rounded-xl mx-3 mb-2">
          <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer">
            <AvatarWithRing avatarUrl={item.user?.avatar_url} name={username} id={item.user?.id} />
          </div>
          <div className="flex-1 min-w-0 ml-3">
            <p className="text-sm leading-relaxed">
              <span className="font-bold text-black cursor-pointer" onClick={() => navigate(`/profile/${item.user?.id}`)}>
                {username}
              </span>
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Commented: {commentText} <span className="text-gray-400">{time}</span>
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Heart className="w-5 h-5 text-gray-400 cursor-pointer hover:text-red-500 transition-colors" strokeWidth={1.5} />
              <MessageCircle className="w-5 h-5 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors" strokeWidth={1.5} />
            </div>
          </div>
          {item.poll_thumbnail && (
            <div className="ml-3 w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'like') {
      return (
        <div key={item.id} className="flex items-center px-4 py-3 bg-gray-50/80 rounded-xl mx-3 mb-2">
          <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer">
            <AvatarWithRing avatarUrl={item.user?.avatar_url} name={username} id={item.user?.id} />
          </div>
          <div className="flex-1 min-w-0 ml-3">
            <p className="text-sm">
              <span className="font-bold text-black cursor-pointer" onClick={() => navigate(`/profile/${item.user?.id}`)}>
                {username}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              le gustó tu publicación. <span className="text-gray-400">{time}</span>
            </p>
          </div>
          {item.poll_thumbnail && (
            <div className="ml-3 w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'vote') {
      return (
        <div key={item.id} className="flex items-center px-4 py-3 bg-gray-50/80 rounded-xl mx-3 mb-2">
          <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer">
            <AvatarWithRing avatarUrl={item.user?.avatar_url} name={username} id={item.user?.id} />
          </div>
          <div className="flex-1 min-w-0 ml-3">
            <p className="text-sm">
              <span className="font-bold text-black cursor-pointer" onClick={() => navigate(`/profile/${item.user?.id}`)}>
                {username}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              votó en tu encuesta{item.vote_option ? `: "${item.vote_option}"` : ''}. <span className="text-gray-400">{time}</span>
            </p>
          </div>
        </div>
      );
    }

    // Mention
    return (
      <div key={item.id} className="flex items-center px-4 py-3 bg-gray-50/80 rounded-xl mx-3 mb-2">
        <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer">
          <AvatarWithRing avatarUrl={item.user?.avatar_url} name={username} id={item.user?.id} />
        </div>
        <div className="flex-1 min-w-0 ml-3">
          <p className="text-sm">
            <span className="font-bold text-black cursor-pointer" onClick={() => navigate(`/profile/${item.user?.id}`)}>
              {username}
            </span>
          </p>
          <p className="text-sm text-gray-500">
            te mencionó en una publicación. <span className="text-gray-400">{time}</span>
          </p>
        </div>
        {item.poll_thumbnail && (
          <div className="ml-3 w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <img src={item.poll_thumbnail} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-center relative mb-3">
          <button
            onClick={() => navigate('/messages')}
            className="absolute left-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-800" />
          </button>
          <h1 className="text-xl font-bold text-black">Activity</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.key
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`min-w-[20px] h-5 rounded-full flex items-center justify-center text-xs font-bold px-1.5 ${
                  activeTab === tab.key ? 'bg-white text-black' : 'bg-red-500 text-white'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin actividad</h3>
            <p className="text-gray-500 text-sm">
              Los likes, comentarios, seguidores y menciones aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="pt-3 pb-20">
            {/* Section Header */}
            <div className="px-4 mb-3">
              <h2 className="text-base font-bold text-black">
                New ({filteredItems.length})
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
