import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import ResponsiveLayout from './components/ResponsiveLayout';
import FeedPage from './pages/FeedPage';
import ExplorePage from './pages/ExplorePage';
// Demo pages removed - using real implementations only
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';
import MessagesMainPage from './pages/messages/MessagesMainPage';
import FollowersPage from './pages/messages/FollowersPage';
import ActivityPage from './pages/messages/ActivityPage';
import RequestsPage from './pages/messages/RequestsPage';
import SettingsPage from './pages/SettingsPage';
import AudioDetailPage from './pages/AudioDetailPage';
import SearchPage from './pages/SearchPage';
import ContentSelectionPage from './pages/ContentSelectionPage';
import ContentCreationPage from './pages/ContentCreationPage';
import ContentPublishPage from './pages/ContentPublishPage';
import VSCreatePage from './pages/VSCreatePage';
import VSExperiencePage from './pages/VSExperiencePage';
import MomentCreationPage from './pages/MomentCreationPage';
import FollowingPage from './pages/FollowingPage';
import AuthPage from './pages/AuthPage';
import StoryCapturePage from './pages/StoryCapturePage';
import StoryEditPage from './pages/StoryEditPage';
import CompletedBattlesPage from './pages/CompletedBattlesPage';
import ActiveChallengesPage from './pages/ActiveChallengesPage';
import ChallengeCreationPage from './pages/ChallengeCreationPage';
import { Toaster } from './components/ui/toaster';
// Mock data imports removed - using real backend services
import { useToast } from './hooks/use-toast';
import { TikTokProvider, useTikTok } from './contexts/TikTokContext';

// Import Authentication and Addiction
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AddictionProvider } from './contexts/AddictionContext';
import { FollowProvider } from './contexts/FollowContext';

// ✅ Configuración automática de entorno
import AppConfig from './config/config';

function AppContent() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isTikTokMode } = useTikTok();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [configInitialized, setConfigInitialized] = useState(false);

  // ✅ Inicializar configuración automática de entorno al inicio
  useEffect(() => {
    const initializeAppConfig = async () => {
      try {
        console.log('🚀 Inicializando configuración automática de entorno...');
        await AppConfig.initialize();
        setConfigInitialized(true);
        console.log('✅ Configuración de entorno lista para usar');
      } catch (error) {
        console.error('❌ Error inicializando configuración:', error);
        // Continúa con configuración de fallback
        setConfigInitialized(true);
      }
    };

    initializeAppConfig();
  }, []);

  // 🎵 CLEANUP GLOBAL: Detener audio en navegación de rutas
  React.useEffect(() => {
    const handleRouteChange = async () => {
      try {
        console.log('🔄 Route changing - Stopping audio');
        const audioManager = (await import('./services/AudioManager')).default;
        await audioManager.stop();
      } catch (error) {
        console.error('❌ Error stopping audio on route change:', error);
      }
    };

    // Escuchar cambios de ruta
    const unsubscribe = navigate && (() => {
      // Este efecto se ejecutará en cada renderizado cuando cambie la ruta
      handleRouteChange();
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigate, window.location.pathname]);

  const handleCreatePoll = async (pollData) => {
    // Poll creation now handled by backend services in ContentCreationPage
    console.log('Poll creation triggered:', pollData);
    
    toast({
      title: "¡Votación creada!",
      description: "Tu votación ha sido publicada exitosamente",
    });
  };

  // Show loading while checking auth or initializing config
  if (authLoading || !configInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">
            {!configInitialized ? 'Configurando entorno...' : 'Cargando...'}
          </p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return (
      <div className="App relative">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
        <Toaster />
      </div>
    );
  }

  return (
    <ResponsiveLayout onCreatePoll={handleCreatePoll}>
      <div className="App relative">
          <Routes>
            {/* Redirect root to feed */}
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/dashboard" element={<Navigate to="/feed" replace />} />
            <Route path="/auth" element={<Navigate to="/feed" replace />} />
            
            {/* Main pages */}
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/active" element={<ActiveChallengesPage />} />
            <Route path="/messages" element={<MessagesMainPage />} />
            <Route path="/messages/followers" element={<FollowersPage />} />
            <Route path="/messages/activity" element={<ActivityPage />} />
            <Route path="/messages/requests" element={<RequestsPage />} />
            <Route path="/profile/:userId?" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/audio/:audioId" element={<AudioDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/new" element={<Navigate to="/create" replace />} />
            <Route path="/content-creation" element={<ContentCreationPage />} />
            <Route path="/create" element={<ContentCreationPage />} />
            <Route path="/content-publish" element={<ContentPublishPage />} />
            <Route path="/vs-create" element={<VSCreatePage />} />
            <Route path="/vs-experience" element={<VSExperiencePage />} />
            <Route path="/moment-create" element={<MomentCreationPage />} />
            <Route path="/following" element={<FollowingPage />} />
            <Route path="/story-creation" element={<StoryCapturePage />} />
            <Route path="/story-edit" element={<StoryEditPage />} />
          </Routes>

          <Toaster />
      </div>
    </ResponsiveLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FollowProvider>
          <AddictionProvider>
            <TikTokProvider>
              <AppContent />
            </TikTokProvider>
          </AddictionProvider>
        </FollowProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;