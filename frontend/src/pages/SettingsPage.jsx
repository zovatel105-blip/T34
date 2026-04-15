import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { 
  ArrowLeft, ChevronRight, User, Shield, Bell, Eye, MessageCircle, 
  Lock, LogOut, Save, Monitor, Key, Globe, Moon, Sun, Volume2, Smartphone,
  Download, Wifi, BatteryLow, Languages, Type, HelpCircle, Info, Mail, Settings,
  Mic, UserCircle, UserCircle2
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import voiceService, { VOICE_TYPES } from '../services/voiceService';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout, apiRequest, refreshUser } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    is_public: true,
    allow_messages: true,
    notifications_enabled: true,
    email_notifications: true,
    push_notifications: true,
    notifications_likes: true,
    notifications_comments: true,
    notifications_follows: true,
    notifications_mentions: true,
    video_quality: 'auto',
    wifi_only: false,
    battery_saver: false,
    auto_cache: true,
    background_sync: true,
    app_language: 'es',
    dark_mode: false,
    large_text: false,
    two_factor_enabled: false
  });
  const [loading, setLoading] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [modalsOpen, setModalsOpen] = useState({
    editProfile: false,
    changePassword: false
  });

  const [voiceSettings, setVoiceSettings] = useState(() => voiceService.getPreferences());
  const [testingVoice, setTestingVoice] = useState(false);

  useEffect(() => {
    if (user) {
      setSettings({
        is_public: user.is_public ?? true,
        allow_messages: user.allow_messages ?? true,
        notifications_enabled: user.notifications_enabled ?? true,
        email_notifications: user.email_notifications ?? true,
        push_notifications: user.push_notifications ?? true,
        notifications_likes: user.notifications_likes ?? true,
        notifications_comments: user.notifications_comments ?? true,
        notifications_follows: user.notifications_follows ?? true,
        notifications_mentions: user.notifications_mentions ?? true,
        video_quality: user.video_quality ?? 'auto',
        wifi_only: user.wifi_only ?? false,
        battery_saver: user.battery_saver ?? false,
        auto_cache: user.auto_cache ?? true,
        background_sync: user.background_sync ?? true,
        app_language: user.app_language ?? 'es',
        dark_mode: user.dark_mode ?? false,
        large_text: user.large_text ?? false,
        two_factor_enabled: user.two_factor_enabled ?? false
      });
    }
  }, [user]);

  const handleSettingsChange = async (field, value) => {
    if (savingField === field) return;

    const previousValue = settings[field];
    setSettings(prev => ({ ...prev, [field]: value }));
    setSavingField(field);
    
    try {
      const settingsUpdate = { [field]: value };
      const updatedUser = await apiRequest('/api/auth/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsUpdate)
      });

      if (updatedUser) {
        await refreshUser();
      }
      
      toast({
        title: "Configuración actualizada",
        description: `${getFieldDisplayName(field)} se ha guardado exitosamente`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error updating settings:', error);
      setSettings(prev => ({ ...prev, [field]: previousValue }));
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo actualizar la configuración. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setSavingField(null);
    }
  };

  const getFieldDisplayName = (field) => {
    const fieldNames = {
      is_public: 'Privacidad de perfil',
      allow_messages: 'Mensajes',
      notifications_enabled: 'Notificaciones',
      email_notifications: 'Notificaciones por email',
      push_notifications: 'Notificaciones push',
      dark_mode: 'Modo oscuro',
      large_text: 'Texto grande',
      video_quality: 'Calidad de video',
      wifi_only: 'Solo WiFi',
      battery_saver: 'Ahorro de batería'
    };
    return fieldNames[field] || field;
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente",
    });
    navigate('/');
  };

  const handleProfileUpdate = async (updatedUser) => {
    console.log('Profile updated successfully from settings:', updatedUser);
  };

  const openModal = (modalName) => {
    setModalsOpen(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModalsOpen(prev => ({ ...prev, [modalName]: false }));
  };

  const handleVoiceTypeChange = (voiceType) => {
    const updated = voiceService.setPreferredVoiceType(voiceType);
    setVoiceSettings(updated);
    toast({
      title: "Voz actualizada",
      description: `Tipo de voz cambiado a ${voiceType === VOICE_TYPES.FEMALE ? 'Femenina' : voiceType === VOICE_TYPES.MALE ? 'Masculina' : 'Neutral'}`,
    });
  };

  const handleVoiceRateChange = (rate) => {
    const updated = voiceService.setVoiceParams({ rate: parseFloat(rate) });
    setVoiceSettings(updated);
  };

  const testVoice = async () => {
    if (testingVoice) return;
    setTestingVoice(true);
    const testTexts = [
      "¡Hola! Esta es una prueba de voz en español.",
      "Hello! This is a voice test in English.",
      "Olá! Este é um teste de voz em português."
    ];
    const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];
    await voiceService.speak(randomText, {
      onEnd: () => setTestingVoice(false),
      onError: () => setTestingVoice(false)
    });
  };

  // Componente para elementos de configuración — estilo modal "Tu historia"
  const SettingsItem = ({ icon: Icon, title, description, onClick, rightElement, showChevron = false }) => (
    <button
      type="button"
      className={`flex items-center gap-3 w-full p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors text-left ${!onClick ? 'cursor-default' : ''}`}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
        <Icon className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        {rightElement}
        {showChevron && (
          <ChevronRight className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
        )}
      </div>
    </button>
  );

  // Título de sección
  const SectionTitle = ({ children }) => (
    <div className="pt-6 pb-2 px-1">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {children}
      </h3>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Contenedor estilo modal — rounded top, handle bar, título centrado */}
      <div className="max-w-md mx-auto bg-white rounded-t-3xl">

        {/* Handle bar */}
        <div className="w-full pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header — centrado con botón de volver */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
          </button>
          <h2 className="font-semibold text-gray-900 text-base">Configuración</h2>
          <div className="w-9" />
        </div>

        {/* Contenido con padding */}
        <div className="px-4 pb-10">

          {/* Cuenta */}
          <SectionTitle>Cuenta</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={User}
              title="Editar perfil"
              description="Nombre, foto, biografía"
              onClick={() => openModal('editProfile')}
              showChevron
            />
            <SettingsItem
              icon={Key}
              title="Cambiar contraseña"
              description="Actualizar contraseña"
              onClick={() => openModal('changePassword')}
              showChevron
            />
          </div>

          {/* Privacidad */}
          <SectionTitle>Privacidad</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Globe}
              title="Perfil público"
              description="Permitir que otros vean tu perfil"
              rightElement={
                <Switch
                  checked={settings.is_public}
                  onCheckedChange={(value) => handleSettingsChange('is_public', value)}
                  disabled={loading}
                  className="data-[state=checked]:bg-blue-600"
                />
              }
            />
            <SettingsItem
              icon={MessageCircle}
              title="Permitir mensajes"
              description="Recibir mensajes directos"
              rightElement={
                <Switch
                  checked={settings.allow_messages}
                  onCheckedChange={(value) => handleSettingsChange('allow_messages', value)}
                  disabled={loading}
                  className="data-[state=checked]:bg-blue-600"
                />
              }
            />
          </div>

          {/* Notificaciones */}
          <SectionTitle>Notificaciones</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Bell}
              title="Notificaciones"
              description="Activar todas las notificaciones"
              rightElement={
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(value) => handleSettingsChange('notifications_enabled', value)}
                  disabled={savingField === 'notifications_enabled'}
                  className="data-[state=checked]:bg-blue-600"
                />
              }
            />
            {settings.notifications_enabled && (
              <>
                <SettingsItem
                  icon={Mail}
                  title="Notificaciones por email"
                  description="Recibir por correo electrónico"
                  rightElement={
                    <Switch
                      checked={settings.email_notifications}
                      onCheckedChange={(value) => handleSettingsChange('email_notifications', value)}
                      disabled={savingField === 'email_notifications'}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  }
                />
                <SettingsItem
                  icon={Smartphone}
                  title="Notificaciones push"
                  description="Recibir en el dispositivo"
                  rightElement={
                    <Switch
                      checked={settings.push_notifications}
                      onCheckedChange={(value) => handleSettingsChange('push_notifications', value)}
                      disabled={savingField === 'push_notifications'}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  }
                />
              </>
            )}
          </div>

          {/* Rendimiento */}
          <SectionTitle>Rendimiento</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Monitor}
              title="Calidad de video"
              description="Ajustar calidad de reproducción"
              rightElement={
                <select 
                  value={settings.video_quality}
                  onChange={(e) => handleSettingsChange('video_quality', e.target.value)}
                  disabled={loading}
                  className="text-sm text-gray-500 bg-transparent border-none focus:outline-none"
                >
                  <option value="auto">Auto</option>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              }
            />
            <SettingsItem
              icon={Wifi}
              title="Solo WiFi"
              description="Reproducir solo con WiFi"
              rightElement={
                <Switch
                  checked={settings.wifi_only}
                  onCheckedChange={(value) => handleSettingsChange('wifi_only', value)}
                  disabled={loading}
                  className="data-[state=checked]:bg-blue-600"
                />
              }
            />
            <SettingsItem
              icon={BatteryLow}
              title="Ahorro de batería"
              description="Reducir animaciones"
              rightElement={
                <Switch
                  checked={settings.battery_saver}
                  onCheckedChange={(value) => handleSettingsChange('battery_saver', value)}
                  disabled={loading}
                  className="data-[state=checked]:bg-blue-600"
                />
              }
            />
          </div>

          {/* Apariencia */}
          <SectionTitle>Apariencia</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Languages}
              title="Idioma"
              description="Español"
              rightElement={
                <select 
                  value={settings.app_language}
                  onChange={(e) => handleSettingsChange('app_language', e.target.value)}
                  disabled={loading}
                  className="text-sm text-gray-500 bg-transparent border-none focus:outline-none"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="pt">Português</option>
                </select>
              }
            />
            <SettingsItem
              icon={settings.dark_mode ? Moon : Sun}
              title="Modo oscuro"
              description="Tema oscuro para la interfaz"
              rightElement={
                <Switch
                  checked={settings.dark_mode}
                  onCheckedChange={(value) => handleSettingsChange('dark_mode', value)}
                  disabled={loading}
                  className="data-[state=checked]:bg-blue-600"
                />
              }
            />
            <SettingsItem
              icon={Type}
              title="Texto grande"
              description="Aumentar tamaño del texto"
              rightElement={
                <Switch
                  checked={settings.large_text}
                  onCheckedChange={(value) => handleSettingsChange('large_text', value)}
                  disabled={loading}
                  className="data-[state=checked]:bg-blue-600"
                />
              }
            />
          </div>

          {/* Voz VS */}
          <SectionTitle>Voz de VS</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Mic}
              title="Tipo de voz"
              description="La voz se adapta automáticamente al idioma"
              rightElement={
                <select 
                  value={voiceSettings.voiceType}
                  onChange={(e) => handleVoiceTypeChange(e.target.value)}
                  className="text-sm text-gray-500 bg-transparent border-none focus:outline-none"
                >
                  <option value={VOICE_TYPES.FEMALE}>Femenina</option>
                  <option value={VOICE_TYPES.MALE}>Masculina</option>
                  <option value={VOICE_TYPES.NEUTRAL}>Neutral</option>
                </select>
              }
            />
            <SettingsItem
              icon={Volume2}
              title="Velocidad de voz"
              description="Ajustar velocidad de lectura"
              rightElement={
                <select 
                  value={voiceSettings.rate}
                  onChange={(e) => handleVoiceRateChange(e.target.value)}
                  className="text-sm text-gray-500 bg-transparent border-none focus:outline-none"
                >
                  <option value="0.8">Lenta</option>
                  <option value="1.0">Normal</option>
                  <option value="1.1">Rápida</option>
                  <option value="1.3">Muy rápida</option>
                </select>
              }
            />
            <button
              type="button"
              className={`flex items-center gap-3 w-full p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors text-left ${testingVoice ? 'opacity-50' : ''}`}
              onClick={testVoice}
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                <Globe className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">Probar voz</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {testingVoice ? 'Reproduciendo...' : 'Escuchar una muestra con detección de idioma'}
                </p>
              </div>
              {testingVoice ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
              )}
            </button>
            <div className="p-3 bg-blue-50 rounded-2xl">
              <p className="text-xs text-blue-600">
                💡 La voz detecta automáticamente el idioma del texto y usa tu tipo de voz preferido en cada idioma.
              </p>
            </div>
          </div>

          {/* Seguridad */}
          <SectionTitle>Seguridad</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Shield}
              title="Autenticación de dos factores"
              description="Seguridad adicional"
              rightElement={
                <Switch
                  checked={settings.two_factor_enabled}
                  onCheckedChange={(value) => handleSettingsChange('two_factor_enabled', value)}
                  disabled={loading}
                  className="data-[state=checked]:bg-blue-600"
                />
              }
            />
          </div>

          {/* Soporte */}
          <SectionTitle>Soporte</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={HelpCircle}
              title="Centro de ayuda"
              description="Preguntas frecuentes y soporte"
              showChevron
            />
            <SettingsItem
              icon={Info}
              title="Acerca de"
              description="Versión de la aplicación"
              showChevron
            />
          </div>

          {/* Cerrar sesión — card estilo modal */}
          <div className="mt-8">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-red-50 hover:bg-red-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                <LogOut className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-red-600 text-sm">Cerrar sesión</p>
                <p className="text-xs text-red-400">Salir de tu cuenta</p>
              </div>
            </button>
          </div>

          {/* Información de la cuenta */}
          <div className="py-8 text-center">
            <div className="space-y-0.5 text-xs text-gray-400">
              <p>@{user?.username}</p>
              <p>{user?.email}</p>
              <p>
                Miembro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long'
                }) : 'N/A'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Modales */}
      <EditProfileModal
        isOpen={modalsOpen.editProfile}
        onClose={() => closeModal('editProfile')}
        onProfileUpdate={handleProfileUpdate}
      />
      <ChangePasswordModal
        isOpen={modalsOpen.changePassword}
        onClose={() => closeModal('changePassword')}
      />
    </div>
  );
};

export default SettingsPage;
