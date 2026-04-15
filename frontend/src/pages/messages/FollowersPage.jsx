import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppConfig from '../../config/config.js';

const FollowersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const handleFollowToggle = async (userId) => {
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

  const loadFollowers = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const followersData = await apiRequest('/api/users/followers/recent').catch(() => []);
      setFollowers(followersData || []);

      const followerIds = (followersData || []).map(f => f.id);
      if (followerIds.length > 0) checkFollowStatus(followerIds);

      await apiRequest('/api/users/followers/mark-read', { method: 'POST' }).catch(() => {});
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest, checkFollowStatus]);

  useEffect(() => { loadFollowers(); }, [loadFollowers]);

  const Avatar = ({ avatarUrl, name }) => (
    <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center flex-shrink-0">
      {avatarUrl ? (
        <>
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400"
            style={{ display: 'none' }}>
            <User className="w-6 h-6" />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
          <User className="w-6 h-6" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header - same style as Activity */}
      <div className="flex-shrink-0 bg-white px-4 pt-3 pb-3">
        <div className="flex items-center justify-center relative">
          <button onClick={() => navigate('/messages')}
            className="absolute left-0 p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-800" />
          </button>
          <h1 className="text-xl font-normal text-black">Nuevos Seguidores</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : followers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin nuevos seguidores</h3>
            <p className="text-gray-500 text-sm">
              Cuando alguien nuevo te siga, aparecerá aquí
            </p>
          </div>
        ) : (
          <div className="px-4 py-2 flex flex-col gap-2">
            {followers.map(follower => {
              const username = follower.username || follower.display_name || 'Usuario';
              const time = formatTime(follower.followed_at);
              const isFollowing = followingStatus[follower.id];

              return (
                <div key={follower.id} className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-2xl transition-colors">
                  <div onClick={() => navigate(`/profile/${follower.id}`)} className="cursor-pointer flex-shrink-0">
                    <Avatar avatarUrl={follower.avatar_url} name={username} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 cursor-pointer truncate" onClick={() => navigate(`/profile/${follower.id}`)}>
                      {username}
                    </p>
                    <p className="text-xs text-gray-500">
                      empezó a seguirte · <span className="text-gray-400">{time}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleFollowToggle(follower.id)}
                    className={`px-5 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                      isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={!isFollowing ? { backgroundColor: '#B061FF' } : {}}
                  >
                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowersPage;
