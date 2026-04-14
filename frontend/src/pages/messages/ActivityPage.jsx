import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Heart, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppConfig from '../../config/config.js';

const ActivityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest]);

  useEffect(() => { loadData(); }, [loadData]);

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
    votes: activities.filter(i => i.type === 'vote' && i.unread).length,
    likes: activities.filter(i => i.type === 'like' && i.unread).length,
    comments: activities.filter(i => i.type === 'comment' && i.unread).length,
    mentions: activities.filter(i => i.type === 'mention' && i.unread).length,
  });

  const filteredItems = getFilteredItems();
  const counts = getCounts();

  const tabs = [
    { key: 'all', label: 'All activity', count: activities.length > 0 ? activities.length : null },
    { key: 'votes', label: 'Votes', count: counts.votes },
    { key: 'likes', label: 'Likes', count: counts.likes },
    { key: 'comments', label: 'Comments', count: counts.comments },
    { key: 'mentions', label: 'Mentions', count: counts.mentions },
  ];

  const Avatar = ({ avatarUrl, name }) => (
    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
      ) : null}
      <div className="w-full h-full flex items-center justify-center text-gray-500"
        style={{ display: avatarUrl ? 'none' : 'flex' }}>
        <User className="w-5 h-5" />
      </div>
    </div>
  );

  const renderItem = (item) => {
    const username = item.user?.username || item.user?.display_name || 'Usuario';
    const time = formatTime(item.created_at);

    if (item.type === 'comment') {
      const commentText = item.comment_preview || 'Comentó tu publicación';
      return (
        <div key={item.id} className="flex items-start px-4 py-3 bg-gray-50/80 rounded-xl mx-3 mb-2">
          <div onClick={() => navigate(`/profile/${item.user?.id}`)} className="cursor-pointer">
            <Avatar avatarUrl={item.user?.avatar_url} name={username} />
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
            <Avatar avatarUrl={item.user?.avatar_url} name={username} />
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
            <Avatar avatarUrl={item.user?.avatar_url} name={username} />
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
          <Avatar avatarUrl={item.user?.avatar_url} name={username} />
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
      <div className="flex-shrink-0 bg-white px-4 pt-3 pb-2">
        <div className="flex items-center justify-center relative mb-3">
          <button onClick={() => navigate('/messages')}
            className="absolute left-0 p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-800" />
          </button>
          <h1 className="text-xl font-normal text-black">Activity</h1>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin actividad</h3>
            <p className="text-gray-500 text-sm">
              Los likes, comentarios, votos y menciones aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="pt-3 pb-20">
            {filteredItems.map(item => renderItem(item))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
