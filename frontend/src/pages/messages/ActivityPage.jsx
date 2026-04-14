import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppConfig from '../../config/config.js';

const ActivityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityCount, setActivityCount] = useState(0);

  // Función para hacer peticiones autenticadas
  const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    const response = await fetch(`${AppConfig.BACKEND_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  };

  // Función para obtener avatar del usuario
  const getAvatarForUser = (user) => {
    if (!user) return '👤';
    
    if (user.avatar_url) {
      return user.avatar_url;
    }
    
    if (user.display_name || user.username) {
      const name = user.display_name || user.username;
      return name.charAt(0).toUpperCase();
    }
    
    return '👤';
  };

  // Función para formatear tiempo
  const formatTimeForInbox = (dateString) => {
    if (!dateString) return '';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  // Funciones de utilidad para actividades
  const getActivityTitle = (activity) => {
    switch (activity.type) {
      case 'like':
        return `A ${activity.user.display_name || activity.user.username} le gustó tu publicación`;
      case 'comment':
        return `${activity.user.display_name || activity.user.username} comentó tu publicación`;
      case 'vote':
        return `${activity.user.display_name || activity.user.username} votó en tu encuesta`;
      case 'mention':
        return `${activity.user.display_name || activity.user.username} te mencionó`;
      default:
        return `${activity.user.display_name || activity.user.username} interactuó con tu contenido`;
    }
  };

  const getActivityMessage = (activity) => {
    switch (activity.type) {
      case 'like':
        return `Le gustó: "${activity.content_preview || 'tu publicación'}"`;
      case 'comment':
        return activity.comment_preview || 'Dejó un comentario en tu publicación';
      case 'vote':
        return `Votó por: "${activity.vote_option}" en "${activity.content_preview}"`;
      case 'mention':
        return `Te mencionó en: "${activity.content_preview || 'una publicación'}"`;
      default:
        return activity.content_preview || 'Actividad en tu contenido';
    }
  };

  // Cargar actividades
  const loadActivities = async () => {
    try {
      setLoading(true);
      const activityResponse = await apiRequest('/api/users/activity/recent');
      
      const activitiesData = activityResponse.map(activity => ({
        id: `activity-${activity.id}`,
        type: 'activity_notification',
        title: getActivityTitle(activity),
        message: getActivityMessage(activity),
        unreadCount: activity.unread ? 1 : 0,
        time: formatTimeForInbox(activity.created_at),
        avatar: activity.user.avatar_url, // Usar directamente avatar_url
        fallbackAvatar: getAvatarForUser(activity.user), // Separar el fallback
        userId: activity.user.id,
        activityType: activity.type,
        isSystem: false
      }));

      setActivities(activitiesData);
      setActivityCount(activitiesData.length);
    } catch (error) {
      console.log('Error loading activities:', error.message);
      setActivities([]);
      setActivityCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar
  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user]);

  // Manejar clic en actividad
  const handleActivityClick = (activity) => {
    if (activity.isSystem) return;
    // Mostrar información relevante de la actividad
    alert(`Actividad: ${activity.title}\n${activity.message}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/messages')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-2"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center">
              <Bell className="h-6 w-6 text-red-500 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">
                Actividad
              </h1>
              {activityCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                  {activityCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sin actividad reciente
            </h3>
            <p className="text-gray-500">
              Los comentarios, me gusta y menciones aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="bg-white">
            {activities.map((activity, index) => (
              <motion.button
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleActivityClick(activity)}
                className="w-full flex items-center px-4 py-4 border-b border-gray-100 transition-colors min-h-[72px] hover:bg-gray-50 active:bg-gray-100"
                style={{ touchAction: 'manipulation' }}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full mr-3 flex items-center justify-center text-lg flex-shrink-0 relative overflow-hidden bg-gray-100">
                  {activity.avatar ? (
                    <>
                      <img 
                        src={activity.avatar} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          // Si la imagen falla al cargar, ocultar imagen y mostrar fallback
                          e.target.style.display = 'none';
                          e.target.parentNode.querySelector('.avatar-fallback').style.display = 'flex';
                        }}
                      />
                      <div className="avatar-fallback w-full h-full rounded-full flex items-center justify-center text-lg font-bold" style={{ display: 'none' }}>
                        {activity.fallbackAvatar}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full rounded-full flex items-center justify-center text-lg font-bold">
                      {activity.fallbackAvatar}
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-semibold truncate text-black">
                      {activity.title}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {activity.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1 leading-relaxed">
                    {activity.message}
                  </p>
                </div>

                {/* Badge de no leído */}
                {activity.unreadCount > 0 && (
                  <div 
                    className="min-w-[24px] h-6 rounded-full flex items-center justify-center ml-3 flex-shrink-0"
                    style={{ backgroundColor: '#DC2626' }}
                  >
                    <span className="text-xs text-white font-medium px-2">
                      {activity.unreadCount > 99 ? '99+' : activity.unreadCount}
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;