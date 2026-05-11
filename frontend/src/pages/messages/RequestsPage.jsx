import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppConfig from '../../config/config.js';
import useLivePoll from '../../hooks/useLivePoll';
import { useTranslation } from '../../hooks/useTranslation';

const RequestsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } catch (e) {
      console.warn('Date formatting error:', e);
      return '';
    }
  };

  const loadRequests = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const requestsData = await apiRequest('/api/messages/requests').catch(() => []);
      setRequests(requestsData || []);
      await apiRequest('/api/messages/requests/mark-read', { method: 'POST' }).catch(() => {});
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // 🔴 Live refresh cada 10s mientras la página de solicitudes está abierta (silencioso)
  const silentRefreshRequests = useCallback(async () => {
    if (!user) return;
    try {
      const requestsData = await apiRequest('/api/messages/requests').catch(() => null);
      if (Array.isArray(requestsData)) {
        setRequests(requestsData);
      }
    } catch (e) {
      console.warn('Silent refresh requests skipped:', e?.message);
    }
  }, [user, apiRequest]);

  useLivePoll(silentRefreshRequests, 10000, {
    enabled: Boolean(user),
    pauseWhenHidden: true,
    refreshOnFocus: true,
  });

  const handleRequestClick = (request) => {
    navigate('/messages', {
      state: {
        openConversation: {
          id: `request-${request.id}`,
          participants: [{
            id: request.sender.id,
            username: request.sender.username,
            display_name: request.sender.display_name
          }],
          is_chat_request: true,
          is_request_receiver: true,
          chat_request_id: request.id
        }
      }
    });
  };

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
    <div className="flex flex-col h-full bg-white">
      {/* Header - same style as Activity */}
      <div className="flex-shrink-0 bg-white px-4 pt-3 pb-3">
        <div className="flex items-center justify-center relative">
          <button onClick={() => navigate('/messages')}
            className="absolute left-0 p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-800" />
          </button>
          <h1 className="text-xl font-normal text-black">Solicitudes</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('inbox.requests.empty')}</h3>
            <p className="text-gray-500 text-sm">
              {t('inbox.requests.emptyDesc')}
            </p>
          </div>
        ) : (
          <div className="px-2 py-2 flex flex-col gap-2">
            {requests.map(request => {
              const username = request.sender?.display_name || request.sender?.username || t('profile.defaultUsername');
              const time = formatTime(request.created_at);
              const preview = request.preview || t('inbox.requests.defaultPreview');

              return (
                <div key={request.id}
                  onClick={() => handleRequestClick(request)}
                  className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-2xl cursor-pointer transition-colors">
                  <Avatar avatarUrl={request.sender?.avatar_url} name={username} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{username}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {preview} · <span className="text-gray-400">{time}</span>
                    </p>
                  </div>
                  {request.unread && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: '#B061FF' }}>
                      {t('inbox.requests.newBadge')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsPage;
