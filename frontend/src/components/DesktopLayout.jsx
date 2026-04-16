/**
 * DesktopLayout - Modern desktop layout with sidebar, main content, and right panel
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  User, 
  Settings, 
  TrendingUp,
  Plus,
  Hash,
  Users,
  Play,
  Bookmark,
  MoreHorizontal,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import TrendingPanel from './TrendingPanel';
import SuggestionsPanel from './SuggestionsPanel';
import { cn } from '../lib/utils';

const DesktopLayout = ({ children }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items
  const navigationItems = [
    { icon: Home, label: 'Para ti', path: '/', active: location.pathname === '/' },
    { icon: Search, label: 'Explorar', path: '/explore', active: location.pathname === '/explore' },
    { icon: Bell, label: 'Notificaciones', path: '/notifications', active: location.pathname === '/notifications', badge: 3 },
    { icon: Mail, label: 'Mensajes', path: '/messages', active: location.pathname === '/messages', badge: 1 },
    { icon: Bookmark, label: 'Guardados', path: '/saved', active: location.pathname === '/saved' },
    { icon: User, label: 'Perfil', path: '/profile', active: location.pathname === '/profile' },
    { icon: Settings, label: 'Configuración', path: '/settings', active: location.pathname === '/settings' },
  ];

  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente"
    });
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // In a real app, this would update a theme context
    toast({
      title: isDarkMode ? "Modo claro activado" : "Modo oscuro activado",
      description: "El tema ha sido cambiado"
    });
  };

  return (
    <div className={cn(
      "min-h-screen bg-gray-50 flex",
      isDarkMode && "dark bg-gray-900"
    )}>
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">VotaTok</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant={item.active ? "default" : "ghost"}
              className={cn(
                "w-full justify-start h-12 text-base relative",
                item.active 
                  ? "bg-purple-50 text-purple-700 hover:bg-purple-100" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
              onClick={() => handleNavigation(item.path)}
            >
              <item.icon className="w-6 h-6 mr-3" />
              <span>{item.label}</span>
              {item.badge && (
                <Badge 
                  variant="destructive" 
                  className="ml-auto w-5 h-5 flex items-center justify-center p-0 text-xs"
                >
                  {item.badge}
                </Badge>
              )}
            </Button>
          ))}

          {/* Create Button */}
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12"
          >
            <Plus className="w-5 h-5 mr-2" />
            Crear Votación
          </Button>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className="w-full justify-start mb-2"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 mr-2" />
                Modo claro
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 mr-2" />
                Modo oscuro
              </>
            )}
          </Button>

          {/* User info */}
          <div className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.avatar_url} alt={user?.display_name} />
              <AvatarFallback>{user?.display_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.display_name}
              </p>
              <p className="text-sm text-gray-500 truncate">
                @{user?.username}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="p-1"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 ml-64">
        <div className="flex max-w-7xl mx-auto">
          {/* Main content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>

          {/* Right sidebar */}
          <aside className="w-80 p-6 space-y-6">
            {/* Search */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar votaciones, usuarios..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Trending Panel */}
            <TrendingPanel />

            {/* Suggestions Panel */}
            <SuggestionsPanel />

            {/* Quick stats */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Estadísticas</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Votaciones creadas</span>
                  <span className="font-semibold text-purple-600">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Votos recibidos</span>
                  <span className="font-semibold text-green-600">1,234</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Seguidores</span>
                  <span className="font-semibold text-blue-600">567</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Create Poll Modal - REMOVED */}
    </div>
  );
};

export default DesktopLayout;