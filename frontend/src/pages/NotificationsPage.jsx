import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Heart, MessageCircle, Users, Vote, Trophy, Clock, User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import notificationApiService from '../services/notificationApiService';

const NotificationItem = ({ notification, onRead }) => {
  const { type, sender_username, sender_avatar, message, poll_title, created_at, is_read } = notification;

  const getIcon = () => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-400" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case 'follow': return <Users className="w-4 h-4 text-green-400" />;
      case 'vote': return <Vote className="w-4 h-4 text-purple-400" />;
      case 'achievement': return <Trophy className="w-4 h-4 text-yellow-400" />;
      default: return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'like': return 'bg-red-500/20';
      case 'comment': return 'bg-blue-500/20';
      case 'follow': return 'bg-green-500/20';
      case 'vote': return 'bg-purple-500/20';
      case 'achievement': return 'bg-yellow-500/20';
      default: return 'bg-zinc-500/20';
    }
  };

  const getTimeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHrs < 24) return `hace ${diffHrs}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <button
      onClick={() => !is_read && onRead(notification.id)}
      className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-colors text-left ${
        !is_read ? 'bg-zinc-800/80' : 'bg-zinc-900 opacity-70'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-11 h-11">
          <AvatarImage src={sender_avatar} alt={sender_username} />
          <AvatarFallback className="bg-zinc-700 text-zinc-300 text-sm">
            {sender_username?.charAt(0)?.toUpperCase() || <User className="w-5 h-5" />}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${getIconBg()} flex items-center justify-center border-2 border-zinc-900`}>
          {getIcon()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200">
          <span className="font-semibold text-white">{sender_username}</span>{' '}
          {message}
        </p>
        {poll_title && (
          <p className="text-xs text-zinc-500 mt-1 truncate">"{poll_title}"</p>
        )}
        <div className="flex items-center gap-1 mt-1.5">
          <Clock className="w-3 h-3 text-zinc-600" />
          <span className="text-xs text-zinc-600">{getTimeAgo(created_at)}</span>
        </div>
      </div>

      {/* Unread indicator */}
      {!is_read && (
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
      )}
    </button>
  );
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApiService.getNotifications(50);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    await notificationApiService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleMarkRead = async (notifId) => {
    await notificationApiService.markAsRead(notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
  };

  const newNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  return (
    <div className="min-h-screen bg-zinc-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white">Notificaciones</h1>
            {newNotifications.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-600 rounded-full text-xs font-semibold text-white">
                {newNotifications.length}
              </span>
            )}
          </div>
          {newNotifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-400 font-medium hover:text-blue-300 transition-colors"
            >
              Marcar todas
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Sin notificaciones</h3>
            <p className="text-sm text-zinc-500 text-center">
              Cuando tengas interacciones aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* New notifications */}
            {newNotifications.length > 0 && (
              <div className="mb-4">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  Nuevas
                </h2>
                <div className="space-y-1.5">
                  {newNotifications.map((n) => (
                    <NotificationItem key={n.id} notification={n} onRead={handleMarkRead} />
                  ))}
                </div>
              </div>
            )}

            {/* Read notifications */}
            {readNotifications.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                  Anteriores
                </h2>
                <div className="space-y-1.5">
                  {readNotifications.map((n) => (
                    <NotificationItem key={n.id} notification={n} onRead={handleMarkRead} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
