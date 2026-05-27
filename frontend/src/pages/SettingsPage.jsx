import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '../components/ui/switch';
import { 
  ArrowLeft, ChevronRight, User, Shield, Bell, MessageCircle, 
  LogOut, Monitor, Key, Globe, Moon, Sun, Volume2, Smartphone,
  Wifi, BatteryLow, Languages, Type, HelpCircle, Info, Mail,
  Mic, PanelBottom, PanelRight, Rocket
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import i18n from '../i18n';
import voiceService, { VOICE_TYPES } from '../services/voiceService';
import SettingsSelectModal from '../components/SettingsSelectModal';
import { useNavPreference, NAV_STYLES } from '../hooks/useNavPreference';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout, apiRequest, refreshUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { setNavStyle, isBottomNav } = useNavPreference();
  
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
  const [loading] = useState(false);
  const [savingField, setSavingField] = useState(null);

  const [voiceSettings, setVoiceSettings] = useState(() => voiceService.getPreferences());
  const [testingVoice, setTestingVoice] = useState(false);
  const [activeSelectModal, setActiveSelectModal] = useState(null);

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

    // Aplicación local inmediata para campos UX-críticos
    if (field === 'app_language') {
      i18n.setLocale(value);
    }
    
    try {
      const settingsUpdate = { [field]: value };
      const updatedUser = await apiRequest('/api/auth/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsUpdate)
      });

      if (updatedUser) {
        await refreshUser();
      }

      if (field === 'app_language') {
        const langLabel = {
          es: t('settings.appearance.languageEs'),
          en: t('settings.appearance.languageEn'),
          fr: t('settings.appearance.languageFr'),
          pt: t('settings.appearance.languagePt'),
        }[value] || value;
        toast({
          title: t('settings.toast.languageChanged'),
          description: t('settings.toast.languageChangedDesc', { language: langLabel }),
          variant: "default"
        });
      } else {
        toast({
          title: t('settings.toast.saved'),
          description: t('settings.toast.savedDesc', { field: getFieldDisplayName(field) }),
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('Error updating settings:', error);
      setSettings(prev => ({ ...prev, [field]: previousValue }));
      // Revertir locale si falla
      if (field === 'app_language') {
        i18n.setLocale(previousValue);
      }
      toast({
        title: t('settings.toast.error'),
        description: error.message || t('settings.toast.errorDesc'),
        variant: "destructive"
      });
    } finally {
      setSavingField(null);
    }
  };

  const getFieldDisplayName = (field) => t(`settings.fields.${field}`) || field;

  const handleLogout = () => {
    logout();
    toast({
      title: t('settings.toast.loggedOut'),
      description: t('settings.toast.loggedOutDesc'),
    });
    navigate('/');
  };

  const handleVoiceTypeChange = (voiceType) => {
    const updated = voiceService.setPreferredVoiceType(voiceType);
    setVoiceSettings(updated);
    const typeLabel = voiceType === VOICE_TYPES.FEMALE
      ? t('settings.voice.typeFemale')
      : voiceType === VOICE_TYPES.MALE
        ? t('settings.voice.typeMale')
        : t('settings.voice.typeNeutral');
    toast({
      title: t('settings.toast.voiceUpdated'),
      description: t('settings.toast.voiceUpdatedDesc', { type: typeLabel }),
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

  const videoQualityLabel = {
    auto: t('settings.performance.videoQualityAuto'),
    high: t('settings.performance.videoQualityHigh'),
    medium: t('settings.performance.videoQualityMedium'),
    low: t('settings.performance.videoQualityLow'),
  }[settings.video_quality] || t('settings.performance.videoQualityAuto');

  const languageLabel = {
    es: t('settings.appearance.languageEs'),
    en: t('settings.appearance.languageEn'),
    fr: t('settings.appearance.languageFr'),
    pt: t('settings.appearance.languagePt'),
  }[settings.app_language] || t('settings.appearance.languageEs');

  const voiceTypeLabel = {
    [VOICE_TYPES.FEMALE]: t('settings.voice.typeFemale'),
    [VOICE_TYPES.MALE]: t('settings.voice.typeMale'),
    [VOICE_TYPES.NEUTRAL]: t('settings.voice.typeNeutral'),
  }[voiceSettings.voiceType] || t('settings.voice.typeFemale');

  const voiceRateLabel = {
    '0.8': t('settings.voice.rateSlow'),
    '1': t('settings.voice.rateNormal'),
    '1.0': t('settings.voice.rateNormal'),
    '1.1': t('settings.voice.rateFast'),
    '1.3': t('settings.voice.rateVeryFast'),
  }[String(voiceSettings.rate)] || t('settings.voice.rateNormal');

  return (
    <>
    <div className="min-h-screen bg-white">
      {/* Contenedor estilo modal */}
      <div className="max-w-md mx-auto bg-white rounded-t-3xl">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            data-testid="settings-back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
          </button>
          <h2 className="font-semibold text-gray-900 text-base" data-testid="settings-title">{t('settings.title')}</h2>
          <div className="w-9" />
        </div>

        <div className="px-4 pb-10">

          {/* Cuenta */}
          <SectionTitle>{t('settings.sections.account')}</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Rocket}
              title="Probar Feed V2 (beta)"
              description="Feed VS optimizado: pool de video, virtualización, fluidez TikTok-style"
              onClick={() => navigate('/feed-v2')}
              showChevron
            />
            <SettingsItem
              icon={User}
              title={t('settings.account.editProfile')}
              description={t('settings.account.editProfileDesc')}
              onClick={() => navigate('/edit-profile')}
              showChevron
            />
            <SettingsItem
              icon={Key}
              title={t('settings.account.changePassword')}
              description={t('settings.account.changePasswordDesc')}
              onClick={() => navigate('/change-password')}
              showChevron
            />
          </div>

          {/* Privacidad */}
          <SectionTitle>{t('settings.sections.privacy')}</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Globe}
              title={t('settings.privacy.publicProfile')}
              description={t('settings.privacy.publicProfileDesc')}
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
              title={t('settings.privacy.allowMessages')}
              description={t('settings.privacy.allowMessagesDesc')}
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
          <SectionTitle>{t('settings.sections.notifications')}</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Bell}
              title={t('settings.notifications.enable')}
              description={t('settings.notifications.enableDesc')}
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
                  title={t('settings.notifications.email')}
                  description={t('settings.notifications.emailDesc')}
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
                  title={t('settings.notifications.push')}
                  description={t('settings.notifications.pushDesc')}
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
          <SectionTitle>{t('settings.sections.performance')}</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Monitor}
              title={t('settings.performance.videoQuality')}
              description={videoQualityLabel}
              onClick={() => setActiveSelectModal('video_quality')}
              showChevron
            />
            <SettingsItem
              icon={Wifi}
              title={t('settings.performance.wifiOnly')}
              description={t('settings.performance.wifiOnlyDesc')}
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
              title={t('settings.performance.batterySaver')}
              description={t('settings.performance.batterySaverDesc')}
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
          <SectionTitle>{t('settings.sections.appearance')}</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Languages}
              title={t('settings.appearance.language')}
              description={languageLabel}
              onClick={() => setActiveSelectModal('app_language')}
              showChevron
            />
            <SettingsItem
              icon={settings.dark_mode ? Moon : Sun}
              title={t('settings.appearance.darkMode')}
              description={t('settings.appearance.darkModeDesc')}
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
              title={t('settings.appearance.largeText')}
              description={t('settings.appearance.largeTextDesc')}
              rightElement={
                <Switch
                  checked={settings.large_text}
                  onCheckedChange={(value) => handleSettingsChange('large_text', value)}
                  disabled={loading}
                  className="data-[state=checked]:bg-blue-600"
                />
              }
            />
            <SettingsItem
              icon={isBottomNav ? PanelBottom : PanelRight}
              title={t('settings.appearance.navBar')}
              description={isBottomNav ? t('settings.appearance.navBottom') : t('settings.appearance.navRight')}
              rightElement={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newStyle = isBottomNav ? NAV_STYLES.RIGHT : NAV_STYLES.BOTTOM;
                      setNavStyle(newStyle);
                      toast({
                        title: t('settings.toast.navUpdated'),
                        description: newStyle === NAV_STYLES.BOTTOM
                          ? t('settings.toast.navBottomActive')
                          : t('settings.toast.navRightActive'),
                      });
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isBottomNav
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {isBottomNav ? (
                      <>
                        <PanelBottom className="w-3.5 h-3.5" />
                        {t('settings.appearance.navBottomShort')}
                      </>
                    ) : (
                      <>
                        <PanelRight className="w-3.5 h-3.5" />
                        {t('settings.appearance.navRightShort')}
                      </>
                    )}
                  </button>
                </div>
              }
            />
          </div>

          {/* Voz VS */}
          <SectionTitle>{t('settings.sections.voice')}</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Mic}
              title={t('settings.voice.type')}
              description={voiceTypeLabel}
              onClick={() => setActiveSelectModal('voice_type')}
              showChevron
            />
            <SettingsItem
              icon={Volume2}
              title={t('settings.voice.rate')}
              description={voiceRateLabel}
              onClick={() => setActiveSelectModal('voice_rate')}
              showChevron
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
                <p className="font-medium text-gray-900 text-sm">{t('settings.voice.test')}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {testingVoice ? t('settings.voice.testPlaying') : t('settings.voice.testDesc')}
                </p>
              </div>
              {testingVoice ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Seguridad */}
          <SectionTitle>{t('settings.sections.security')}</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={Shield}
              title={t('settings.security.twoFactor')}
              description={t('settings.security.twoFactorDesc')}
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
          <SectionTitle>{t('settings.sections.support')}</SectionTitle>
          <div className="flex flex-col gap-2">
            <SettingsItem
              icon={HelpCircle}
              title={t('settings.support.helpCenter')}
              description={t('settings.support.helpCenterDesc')}
              showChevron
            />
            <SettingsItem
              icon={Info}
              title={t('settings.support.about')}
              description={t('settings.support.aboutDesc')}
              showChevron
            />
          </div>

          {/* Cerrar sesión */}
          <div className="mt-8">
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-red-50 hover:bg-red-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                <LogOut className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-red-600 text-sm">{t('settings.logout')}</p>
                <p className="text-xs text-red-400">{t('settings.logoutDesc')}</p>
              </div>
            </button>
          </div>

          {/* Información de la cuenta */}
          <div className="py-8 text-center">
            <div className="space-y-0.5 text-xs text-gray-400">
              <p>@{user?.username}</p>
              <p>{user?.email}</p>
              <p>
                {t('settings.memberSince', {
                  date: user?.created_at
                    ? i18n.formatDate(user.created_at)
                    : 'N/A'
                })}
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>

      {/* Modales de selección */}
      <SettingsSelectModal
        isOpen={activeSelectModal === 'video_quality'}
        onClose={() => setActiveSelectModal(null)}
        title={t('settings.performance.videoQuality')}
        selectedValue={settings.video_quality}
        onSelect={(value) => handleSettingsChange('video_quality', value)}
        options={[
          { value: 'auto', label: t('settings.performance.videoQualityAuto'), description: t('settings.performance.videoQualityAutoDesc'), icon: Monitor },
          { value: 'high', label: t('settings.performance.videoQualityHigh'), description: t('settings.performance.videoQualityHighDesc'), icon: Monitor },
          { value: 'medium', label: t('settings.performance.videoQualityMedium'), description: t('settings.performance.videoQualityMediumDesc'), icon: Monitor },
          { value: 'low', label: t('settings.performance.videoQualityLow'), description: t('settings.performance.videoQualityLowDesc'), icon: Monitor },
        ]}
      />

      <SettingsSelectModal
        isOpen={activeSelectModal === 'app_language'}
        onClose={() => setActiveSelectModal(null)}
        title={t('settings.appearance.language')}
        selectedValue={settings.app_language}
        onSelect={(value) => handleSettingsChange('app_language', value)}
        options={[
          { value: 'es', label: 'Español', icon: Languages },
          { value: 'en', label: 'English', icon: Languages },
          { value: 'fr', label: 'Français', icon: Languages },
          { value: 'pt', label: 'Português', icon: Languages },
        ]}
      />

      <SettingsSelectModal
        isOpen={activeSelectModal === 'voice_type'}
        onClose={() => setActiveSelectModal(null)}
        title={t('settings.voice.type')}
        selectedValue={voiceSettings.voiceType}
        onSelect={(value) => handleVoiceTypeChange(value)}
        options={[
          { value: VOICE_TYPES.FEMALE, label: t('settings.voice.typeFemale'), description: t('settings.voice.typeFemaleDesc'), icon: Mic },
          { value: VOICE_TYPES.MALE, label: t('settings.voice.typeMale'), description: t('settings.voice.typeMaleDesc'), icon: Mic },
          { value: VOICE_TYPES.NEUTRAL, label: t('settings.voice.typeNeutral'), description: t('settings.voice.typeNeutralDesc'), icon: Mic },
        ]}
      />

      <SettingsSelectModal
        isOpen={activeSelectModal === 'voice_rate'}
        onClose={() => setActiveSelectModal(null)}
        title={t('settings.voice.rate')}
        selectedValue={String(voiceSettings.rate)}
        onSelect={(value) => handleVoiceRateChange(value)}
        options={[
          { value: '0.8', label: t('settings.voice.rateSlow'), description: t('settings.voice.rateSlowDesc'), icon: Volume2 },
          { value: '1.0', label: t('settings.voice.rateNormal'), description: t('settings.voice.rateNormalDesc'), icon: Volume2 },
          { value: '1.1', label: t('settings.voice.rateFast'), description: t('settings.voice.rateFastDesc'), icon: Volume2 },
          { value: '1.3', label: t('settings.voice.rateVeryFast'), description: t('settings.voice.rateVeryFastDesc'), icon: Volume2 },
        ]}
      />
    </>
  );
};

export default SettingsPage;
