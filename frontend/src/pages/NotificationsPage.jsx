import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Bell, Heart, MessageCircle, Users, Vote, Trophy, Clock, User } from 'lucide-react';

const NotificationItem = ({ type, user, message, time, poll, isNew = false }) => {
  const getIcon = () => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow': return <Users className="w-4 h-4 text-green-500" />;
      case 'vote': return <Vote className="w-4 h-4 text-purple-500" />;
      case 'achievement': return <Trophy className="w-4 h-4 text-yellow-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'like': return 'bg-red-50 hover:bg-red-100';
      case 'comment': return 'bg-blue-50 hover:bg-blue-100';
      case 'follow': return 'bg-green-50 hover:bg-green-100';
      case 'vote': return 'bg-purple-50 hover:bg-purple-100';
      case 'achievement': return 'bg-yellow-50 hover:bg-yellow-100';
      default: return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  return (
    <Card className={`transition-all duration-300 cursor-pointer ${getBackgroundColor()} ${isNew ? 'ring-2 ring-blue-500/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Avatar className="w-10 h-10">
              <AvatarImage src={`https://github.com/${user}.png`} alt={user} />
              <AvatarFallback className="flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600">
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">{user}</span>
              <div className="flex items-center gap-1">
                {getIcon()}
              </div>
              {isNew && (
                <Badge variant="default" className="text-xs bg-blue-600">
                  Nuevo
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-gray-700 mb-2">{message}</p>
            
            {poll && (
              <div className="bg-white/60 rounded-lg p-2 mb-2">
                <p className="text-xs font-medium text-gray-600 truncate">
                  "{poll}"
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{time}</span>
              </div>
              
              {type === 'follow' && (
                <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                  Seguir
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const NotificationsPage = () => {
  const notifications = [
    {
      id: 1,
      type: 'like',
      user: 'MariaGonzalez',
      message: 'le dio like a tu votación',
      time: 'hace 5 min',
      poll: '¿Quién ganó el mejor outfit de hoy?',
      isNew: true
    },
    {
      id: 2,
      type: 'comment',
      user: 'CarlosRuiz',
      message: 'comentó en tu votación',
      time: 'hace 15 min',
      poll: '¿Cuál es la mejor receta de cocina?',
      isNew: true
    },
    {
      id: 3,
      type: 'follow',
      user: 'AnaLopez',
      message: 'comenzó a seguirte',
      time: 'hace 30 min',
      isNew: true
    },
    {
      id: 4,
      type: 'vote',
      user: 'PedroMartinez',
      message: 'votó en tu votación',
      time: 'hace 1 hora',
      poll: '¿Cuál es el mejor baile de Twyk?'
    },
    {
      id: 5,
      type: 'achievement',
      user: 'Sistema',
      message: '¡Tu votación alcanzó 1000 votos!',
      time: 'hace 2 horas',
      poll: '¿Quién ganó el mejor outfit de hoy?'
    },
    {
      id: 6,
      type: 'like',
      user: 'LuisaFernandez',
      message: 'le dio like a tu votación',
      time: 'hace 3 horas',
      poll: '¿Cuál es la mejor receta de cocina?'
    },
    {
      id: 7,
      type: 'follow',
      user: 'RobertoGarcia',
      message: 'comenzó a seguirte',
      time: 'hace 5 horas'
    },
    {
      id: 8,
      type: 'vote',
      user: 'SofiaHernandez',
      message: 'votó en tu votación',
      time: 'hace 1 día',
      poll: '¿Cuál es el mejor baile de Twyk?'
    }
  ];

  const newNotificationsCount = notifications.filter(n => n.isNew).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                {newNotificationsCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{newNotificationsCount}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
                <p className="text-xs text-gray-500">
                  {newNotificationsCount > 0 ? `${newNotificationsCount} nuevas` : 'Todo al día'}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
              Marcar todas como leídas
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No tienes notificaciones</h3>
            <p className="text-gray-600 mb-6">Cuando tengas nuevas interacciones, aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* New Notifications */}
            {newNotificationsCount > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Nuevas ({newNotificationsCount})
                </h2>
                <div className="space-y-3">
                  {notifications
                    .filter(notification => notification.isNew)
                    .map((notification) => (
                      <NotificationItem key={notification.id} {...notification} />
                    ))}
                </div>
              </div>
            )}

            {/* Earlier Notifications */}
            {notifications.some(n => !n.isNew) && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Anteriores</h2>
                <div className="space-y-3">
                  {notifications
                    .filter(notification => !notification.isNew)
                    .map((notification) => (
                      <NotificationItem key={notification.id} {...notification} />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;