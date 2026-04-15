import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Hash, AtSign, Search, X, Users, Trophy } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useUpload } from '../contexts/UploadContext';
import pollService from '../services/pollService';
import uploadService from '../services/uploadService';  // ⚡ Import upload service
import challengeService from '../services/challengeService';  // ⚡ Import challenge service
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import AppConfig from '../config/config';

// CSS para ocultar scrollbar
const scrollableOptionsStyle = `
  .scrollable-options::-webkit-scrollbar {
    display: none;
  }
`;

const ContentPublishPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user, token } = useAuth();
  const { publishInBackground } = useUpload();

  // States
  const [title, setTitle] = useState('');
  const [hashtagsList] = useState([]);
  const [mentionedUsers] = useState([]);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [showVoteCount, setShowVoteCount] = useState(true);
  const [matureContent, setMatureContent] = useState('none'); // none, mild, strong
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [contentData, setContentData] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);  // ⚡ Upload progress
  const [uploadStatus, setUploadStatus] = useState('');  // ⚡ Upload status message
  const [isChallengeMode, setIsChallengeMode] = useState(false); // Track if creating content for challenge
  const [joiningChallengeId, setJoiningChallengeId] = useState(null); // ID del challenge al que unirse (si existe)
  
  // Challenge-specific states
  const [challengeType, setChallengeType] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // New states for modals and selections
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showAuthenticityModal, setShowAuthenticityModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [audienceTarget, setAudienceTarget] = useState('General audience');
  const [sourceAuthenticity, setSourceAuthenticity] = useState('Original');
  const [votingPrivacy, setVotingPrivacy] = useState('Público');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
  }, [isAuthenticated, navigate]);

  // Get content data from navigation state
  useEffect(() => {
    const data = location.state?.contentData;
    const challengeMode = location.state?.isChallengeMode || false;
    const existingChallengeId = location.state?.challengeId; // ID del challenge al que unirse
    
    if (!data) {
      // No content data, redirect back to creation
      navigate('/content-creation');
      return;
    }
    console.log('📦 ContentPublishPage - Received contentData:', {
      layout: data.layout,
      optionsCount: data.options?.length,
      isChallengeMode: challengeMode,
      existingChallengeId: existingChallengeId,
      data: data
    });
    setContentData(data);
    setIsChallengeMode(challengeMode);
    
    // Si viene de un challenge existente, guardarlo
    if (existingChallengeId) {
      setJoiningChallengeId(existingChallengeId);
      console.log('🎯 Uniéndose al challenge:', existingChallengeId);
    }
  }, [location.state, navigate]);

  // Search users for Challenge mode
  useEffect(() => {
    if (!isChallengeMode) return;
    
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      // Verificar que tenemos token y usuario
      if (!token || !user?.id) {
        console.warn('⚠️ No hay token o usuario para buscar');
        return;
      }

      try {
        setSearching(true);
        console.log('🔍 Buscando usuarios:', searchQuery);
        
        const url = `${AppConfig.BACKEND_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=20`;
        console.log('🔗 URL:', url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('📡 Response status:', response.status);

        if (response.ok) {
          const users = await response.json();
          console.log('👥 Usuarios encontrados:', users.length);
          // Filter out already selected users and current user
          const filtered = users.filter(
            u => u.id !== user?.id && !selectedUsers.find(s => s.id === u.id)
          );
          console.log('✅ Usuarios filtrados:', filtered.length);
          setSearchResults(filtered);
        } else {
          console.error('❌ Error en búsqueda:', response.status);
        }
      } catch (error) {
        console.error('❌ Error searching users:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, token, user?.id, selectedUsers, isChallengeMode]);

  const handleSelectUser = (selectedUser) => {
    // Máximo 5 invitados (6 total con creador)
    if (selectedUsers.length >= 5) {
      toast({
        title: "Límite alcanzado",
        description: "Máximo 5 usuarios invitados (6 total con creador)",
        variant: "destructive"
      });
      return;
    }
    setSelectedUsers(prev => [...prev, selectedUser]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleBack = () => {
    navigate('/content-creation');
  };

  // Function to add # to title field
  const handleAddHashtagSymbol = () => {
    setTitle(prev => prev + '#');
    // Focus on the title input
    setTimeout(() => {
      const titleInput = document.getElementById('title-input');
      if (titleInput) {
        titleInput.focus();
        // Move cursor to end
        titleInput.selectionStart = titleInput.selectionEnd = titleInput.value.length;
      }
    }, 0);
  };

  // Function to add @ to title field
  const handleAddMentionSymbol = () => {
    setTitle(prev => prev + '@');
    // Focus on the title input
    setTimeout(() => {
      const titleInput = document.getElementById('title-input');
      if (titleInput) {
        titleInput.focus();
        // Move cursor to end
        titleInput.selectionStart = titleInput.selectionEnd = titleInput.value.length;
      }
    }, 0);
  };

  const handleFinalPublish = async () => {
    // Para participantes de challenge, no requerir título
    if (!joiningChallengeId && !title.trim()) {
      toast({
        title: "Error",
        description: "Necesitas escribir un título para tu publicación",
        variant: "destructive"
      });
      return;
    }

    if (!contentData) {
      toast({
        title: "Error",
        description: "No hay contenido para publicar",
        variant: "destructive"
      });
      return;
    }

    // Challenge-specific validations - Solo para CREAR nuevo challenge, no para unirse
    if (isChallengeMode && !joiningChallengeId) {
      if (!title.trim()) {
        toast({
          title: "Error",
          description: "Necesitas escribir una descripción para la publicación",
          variant: "destructive"
        });
        return;
      }
      if (selectedUsers.length < 1) {
        toast({
          title: "Error",
          description: "Debes invitar al menos 1 participante al challenge",
          variant: "destructive"
        });
        return;
      }
    }

    // ✅ Start background upload via context (persists across navigation)
    publishInBackground({
      contentData,
      title: title.trim(),
      hashtagsList,
      mentionedUsers,
      commentsEnabled,
      audienceTarget,
      sourceAuthenticity,
      votingPrivacy,
      matureContent,
      allowDownloads,
      showVoteCount,
      isChallengeMode,
      joiningChallengeId,
      selectedUsers,
      challengeType,
      token,
      toast,
    });

    // ✅ Navigate to OWN profile page (without username = own profile with right nav)
    navigate('/profile');
  };

  // Show loading screen if not authenticated or no content data
  if (!isAuthenticated || !contentData) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  // ========== VISTA SIMPLIFICADA PARA PARTICIPANTES DE CHALLENGE ==========
  if (joiningChallengeId) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header simple */}
        <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-gray-800">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-900 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-500 font-semibold">Challenge</span>
          </div>
          <div className="w-9"></div>
        </div>

        {/* Contenido principal - Preview grande */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Preview del contenido */}
          <div className="w-full max-w-sm aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl mb-6">
            {contentData && contentData.options && contentData.options.length > 0 ? (
              <div className="relative w-full h-full">
                {contentData.options[0]?.media_type?.startsWith('image') ? (
                  <img
                    src={contentData.options[0].media}
                    alt="Tu contenido"
                    className="w-full h-full object-cover"
                  />
                ) : contentData.options[0]?.media_type?.startsWith('video') ? (
                  <video
                    src={contentData.options[0].media}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : null}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                Sin contenido
              </div>
            )}
          </div>

          {/* Mensaje informativo */}
          <div className="text-center mb-6 px-4">
            <p className="text-white text-lg font-medium mb-2">¿Listo para enviar?</p>
            <p className="text-gray-400 text-sm">
              Tu contenido se añadirá al challenge. Cuando todos los participantes suban su contenido, el challenge se publicará automáticamente.
            </p>
          </div>
        </div>

        {/* Botón fijo abajo */}
        <div className="p-4 bg-black border-t border-gray-800">
          <button
            onClick={handleFinalPublish}
            disabled={isPublishing}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 rounded-full text-white font-bold text-lg transition-all flex items-center justify-center gap-2"
          >
            {isPublishing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{uploadStatus || 'Enviando...'}</span>
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5" />
                <span>Enviar al Challenge</span>
              </>
            )}
          </button>
          
          {/* Progress bar */}
          {isPublishing && uploadProgress > 0 && (
            <div className="mt-3 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
  // ========== FIN VISTA SIMPLIFICADA ==========

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Inject CSS for hiding scrollbar */}
      <style>{scrollableOptionsStyle}</style>
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-900 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1"></div>
        <div className="w-9"></div>
      </div>

      {/* Main Content - Fixed Two Column Layout */}
      <div className="px-3 sm:px-4 pt-4 pb-32">
        
        {/* Two Column Layout - Always the same */}
        <div className="flex gap-3 sm:gap-4">
          
          {/* Left Column - Preview */}
          <div className="w-24 sm:w-28 flex-shrink-0">
            <div className="sticky top-4">
              <div className="bg-zinc-800 rounded-xl overflow-hidden shadow-lg w-full h-32 sm:h-36">
                {contentData && contentData.options && contentData.options.length > 0 ? (
                  <div className="relative w-full h-full">
                    {(() => {
                      console.log('🎨 Preview rendering - Layout:', contentData.layout, 'Options:', contentData.options.length);
                      
                      const renderMedia = (option, key = 0) => {
                        if (!option) return null;
                        return option.media_type?.startsWith('image') ? (
                          <img 
                            key={key}
                            src={option.media_url} 
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video 
                            key={key}
                            src={option.media_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        );
                      };

                      // Off (Carousel) - Show first slide with indicator
                      if (contentData.layout === 'off') {
                        return (
                          <div className="relative w-full h-full">
                            {renderMedia(contentData.options[0])}
                            {contentData.options.length > 1 && (
                              <div className="absolute top-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] text-white">
                                1/{contentData.options.length}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Vertical (Lado a lado) - 2 columns
                      if (contentData.layout === 'vertical') {
                        return (
                          <div className="flex h-full">
                            {contentData.options.slice(0, 2).map((option, index) => (
                              <div key={index} className="flex-1 relative overflow-hidden">
                                {renderMedia(option, index)}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Horizontal (Arriba y abajo) - 2 rows
                      if (contentData.layout === 'horizontal') {
                        return (
                          <div className="flex flex-col h-full">
                            {contentData.options.slice(0, 2).map((option, index) => (
                              <div key={index} className="flex-1 relative overflow-hidden">
                                {renderMedia(option, index)}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Triptych Vertical - 3 columns
                      if (contentData.layout === 'triptych-vertical') {
                        return (
                          <div className="flex h-full">
                            {contentData.options.slice(0, 3).map((option, index) => (
                              <div key={index} className="flex-1 relative overflow-hidden">
                                {renderMedia(option, index)}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Triptych Horizontal - 3 rows
                      if (contentData.layout === 'triptych-horizontal') {
                        return (
                          <div className="flex flex-col h-full">
                            {contentData.options.slice(0, 3).map((option, index) => (
                              <div key={index} className="flex-1 relative overflow-hidden">
                                {renderMedia(option, index)}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Grid 2x2 - 4 items
                      if (contentData.layout === 'grid-2x2') {
                        return (
                          <div className="grid grid-cols-2 grid-rows-2 h-full gap-0">
                            {contentData.options.slice(0, 4).map((option, index) => (
                              <div key={index} className="relative overflow-hidden">
                                {renderMedia(option, index)}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Grid 3x2 - 6 items in 3 columns, 2 rows
                      if (contentData.layout === 'grid-3x2') {
                        return (
                          <div className="grid grid-cols-3 grid-rows-2 h-full gap-0">
                            {contentData.options.slice(0, 6).map((option, index) => (
                              <div key={index} className="relative overflow-hidden">
                                {renderMedia(option, index)}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Grid 2x3 (horizontal-3x2) - 6 items in 2 columns, 3 rows
                      if (contentData.layout === 'horizontal-3x2') {
                        return (
                          <div className="grid grid-cols-2 grid-rows-3 h-full gap-0">
                            {contentData.options.slice(0, 6).map((option, index) => (
                              <div key={index} className="relative overflow-hidden">
                                {renderMedia(option, index)}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Moment - Single image fullscreen
                      if (contentData.layout === 'moment') {
                        return (
                          <div className="relative w-full h-full">
                            {renderMedia(contentData.options[0])}
                            <div className="absolute top-1 right-1 bg-amber-500/80 px-1.5 py-0.5 rounded text-[8px] text-white font-medium">
                              Momento
                            </div>
                          </div>
                        );
                      }
                      
                      // Default fallback - Show first image
                      return (
                        <div className="relative w-full h-full">
                          {renderMedia(contentData.options[0])}
                        </div>
                      );
                    })()}
                    
                    {/* Edit cover overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <p className="text-white text-[10px] sm:text-xs text-center font-medium">Preview</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-lg sm:text-xl mb-1">📱</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Hashtag and Mention Quick Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddHashtagSymbol}
                  className="flex-1 flex items-center justify-center py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-lg transition-colors touch-manipulation"
                  title="Add hashtag"
                >
                  <Hash className="w-4 h-4 text-gray-300" />
                </button>
                <button
                  onClick={handleAddMentionSymbol}
                  className="flex-1 flex items-center justify-center py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-lg transition-colors touch-manipulation"
                  title="Add mention"
                >
                  <AtSign className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Description and Options */}
          <div className="flex-1 min-w-0">
            
            {/* Description Input - Sticky on mobile */}
            <div className="mb-5 sticky top-0 bg-zinc-900 z-10 pb-2 -mt-4 pt-4">
              <textarea
                id="title-input"
                placeholder="Add description..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-white text-sm sm:text-base placeholder-gray-500 bg-transparent border-none outline-none resize-none leading-relaxed"
                rows={5}
                maxLength={200}
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">{title.length}/200</span>
              </div>
            </div>

          </div>

        </div>

        {/* Action Items - Full width, outside two-column layout */}
        <div className="space-y-1 mt-2">

              {/* Separator line */}
              <div className="border-t border-zinc-800 mt-8 mb-3"></div>

              {/* Joining Challenge Info - Shown when joining an existing challenge */}
              {joiningChallengeId && (
                <div className="mb-3">
                  <div className="rounded-2xl bg-zinc-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <span className="text-yellow-500 font-semibold text-sm">Participando en Challenge</span>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      Tu contenido será enviado al challenge. Una vez que todos los participantes suban su contenido, el challenge se publicará automáticamente.
                    </p>
                  </div>
                </div>
              )}

              {/* Challenge Section - Only shown when CREATING a new challenge (not joining existing) */}
              {isChallengeMode && !joiningChallengeId && (
                <div className="space-y-3">
                  {/* Challenge Header */}
                  <div className="flex items-center gap-2 mb-1 px-5 md:px-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-500 font-semibold text-sm">Configuración del Challenge</span>
                  </div>

                  {/* Challenge Category */}
                  <div className="rounded-2xl bg-zinc-800 p-4">
                    <label className="block text-white text-sm font-semibold mb-3">
                      Categoría (Opcional)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Baile', 'Arte', 'Cocina', 'Música', 'Deporte', 'Otro'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setChallengeType(type.toLowerCase())}
                          className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
                            challengeType === type.toLowerCase()
                              ? 'bg-yellow-500 text-black'
                              : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Invite Users */}
                  <div className="rounded-2xl bg-zinc-800 p-4">
                    <label className="block text-white text-sm font-semibold mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-zinc-400" />
                        Invitar Participantes * ({selectedUsers.length}/5)
                      </span>
                      {selectedUsers.length >= 5 && (
                        <span className="text-yellow-500 text-xs">Límite</span>
                      )}
                    </label>

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-col gap-2 mb-3">
                        {selectedUsers.map((selectedUser) => (
                          <div
                            key={selectedUser.id}
                            className="flex items-center justify-between bg-zinc-700/50 p-3 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-9 h-9">
                                <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.username} />
                                <AvatarFallback className="bg-gray-50 text-gray-400 flex items-center justify-center">
                                  <Users className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-white text-sm font-semibold">{selectedUser.display_name || selectedUser.username}</p>
                                <p className="text-zinc-400 text-xs">@{selectedUser.username}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(selectedUser.id)}
                              className="w-7 h-7 rounded-full bg-zinc-600/50 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                            >
                              <X className="w-4 h-4 text-zinc-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Search Users */}
                    {selectedUsers.length < 5 && (
                      <div className="relative">
                        <div className="flex items-center gap-2 bg-zinc-700/50 px-3 py-2.5 rounded-xl focus-within:ring-1 focus-within:ring-yellow-500/50 transition-all">
                          <Search className="w-4 h-4 text-zinc-500" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Escribe al menos 2 caracteres..."
                            className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none text-sm"
                          />
                          {searching && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500" />
                          )}
                        </div>
                        
                        {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                          <p className="text-zinc-500 text-xs mt-2">Escribe al menos 2 caracteres para buscar</p>
                        )}

                        {/* Search Results */}
                        {searchQuery.trim().length >= 2 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 rounded-xl max-h-48 overflow-y-auto z-[100] shadow-2xl border border-zinc-700/50">
                            {searching ? (
                              <div className="p-3 text-center text-zinc-400">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500 mx-auto mb-2" />
                                <span className="text-sm">Buscando...</span>
                              </div>
                            ) : searchResults.length > 0 ? (
                              searchResults.map((searchUser) => (
                                <button
                                  key={searchUser.id}
                                  type="button"
                                  onClick={() => handleSelectUser(searchUser)}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-zinc-700/50 transition-colors"
                                >
                                  <Avatar className="w-9 h-9">
                                    <AvatarImage src={searchUser.avatar_url} alt={searchUser.username} />
                                    <AvatarFallback className="bg-gray-50 text-gray-400 flex items-center justify-center">
                                      <Users className="w-4 h-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="text-left">
                                    <p className="text-white text-sm font-semibold">{searchUser.display_name || searchUser.username}</p>
                                    <p className="text-zinc-400 text-xs">@{searchUser.username}</p>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-zinc-500 text-sm">
                                No se encontraron usuarios con "{searchQuery}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Challenge Info */}
                  <div className="rounded-2xl bg-zinc-800 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm">💡</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Los usuarios invitados recibirán una notificación para participar en tu challenge. 
                        Cuando acepten, crearán su propio contenido y los usuarios podrán votar por el ganador.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Audience Targeting */}
              <div className="rounded-2xl bg-zinc-800 p-4">
                <button 
                  onClick={() => setShowAudienceModal(true)}
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity group touch-manipulation"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-zinc-300 text-sm font-medium">Público objetivo</span>
                      <span className="text-zinc-500 text-xs truncate w-full">{audienceTarget}</span>
                    </div>
                  </div>
                  <span className="text-zinc-500 text-xl flex-shrink-0">›</span>
                </button>
              </div>

              {/* Source Authenticity */}
              <div className="rounded-2xl bg-zinc-800 p-4">
                <button 
                  onClick={() => setShowAuthenticityModal(true)}
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity group touch-manipulation"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-zinc-300 text-sm font-medium">Autenticidad del contenido</span>
                      <span className="text-zinc-500 text-xs truncate w-full">{sourceAuthenticity}</span>
                    </div>
                  </div>
                  <span className="text-zinc-500 text-xl flex-shrink-0">›</span>
                </button>
              </div>

              {/* Voting Privacy */}
              <div className="rounded-2xl bg-zinc-800 p-4">
                <button 
                  onClick={() => setShowPrivacyModal(true)}
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity group touch-manipulation"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-zinc-300 text-sm font-medium">Privacidad de votos</span>
                      <span className="text-zinc-500 text-xs truncate w-full">{votingPrivacy}</span>
                    </div>
                  </div>
                  <span className="text-zinc-500 text-xl flex-shrink-0">›</span>
                </button>
              </div>

              {/* Allow comments */}
              <div className="rounded-2xl bg-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-zinc-300 text-sm font-medium">Allow comments</span>
                      <span className="text-zinc-500 text-xs">
                        {commentsEnabled ? 'Puede comentar y ver comentarios' : 'No puede comentar; comentarios ocultos'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCommentsEnabled(!commentsEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors touch-manipulation flex-shrink-0 ${
                      commentsEnabled ? 'bg-[#3B82F6]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        commentsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Show vote count */}
              <div className="rounded-2xl bg-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-zinc-300 text-sm font-medium">Show vote count</span>
                      <span className="text-zinc-500 text-xs">
                        {showVoteCount ? 'Ve números de votos' : 'No ve números'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowVoteCount(!showVoteCount)}
                    className={`relative w-11 h-6 rounded-full transition-colors touch-manipulation flex-shrink-0 ${
                      showVoteCount ? 'bg-[#3B82F6]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        showVoteCount ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Mature content */}
              <div className="rounded-2xl bg-zinc-800 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-zinc-300 text-sm font-medium">Mature content (Sensitive media)</span>
                    <span className="text-zinc-500 text-xs">Classify the sensitivity level</span>
                  </div>
                </div>
                <div className="flex gap-2 pl-0">
                  <button
                    onClick={() => setMatureContent('none')}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                      matureContent === 'none'
                        ? 'bg-[#3B82F6] text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => setMatureContent('mild')}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                      matureContent === 'mild'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Mild
                  </button>
                  <button
                    onClick={() => setMatureContent('strong')}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                      matureContent === 'strong'
                        ? 'bg-red-500 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Strong
                  </button>
                </div>
                {matureContent === 'mild' && (
                  <p className="text-xs text-zinc-500 mt-2 pl-0">Edits with blood, dark themes</p>
                )}
                {matureContent === 'strong' && (
                  <p className="text-xs text-zinc-500 mt-2 pl-0">Fictional violence, disturbing content</p>
                )}
              </div>

              {/* Allow downloads */}
              <div className="rounded-2xl bg-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-zinc-300 text-sm font-medium">Allow downloads</span>
                      <span className="text-zinc-500 text-xs">Let others download the image or video</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setAllowDownloads(!allowDownloads)}
                    className={`relative w-11 h-6 rounded-full transition-colors touch-manipulation flex-shrink-0 ${
                      allowDownloads ? 'bg-[#3B82F6]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        allowDownloads ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Share to */}
              <div className="rounded-2xl bg-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </div>
                    <span className="text-zinc-300 text-sm font-medium">Share to</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-700 active:bg-zinc-600 flex items-center justify-center transition-colors touch-manipulation">
                      <svg className="w-4 h-4 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </button>
                    <button className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-700 active:bg-zinc-600 flex items-center justify-center transition-colors touch-manipulation">
                      <svg className="w-4 h-4 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </button>
                    <button className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-700 active:bg-zinc-600 flex items-center justify-center transition-colors touch-manipulation">
                      <MessageCircle className="w-4 h-4 text-zinc-300" />
                    </button>
                  </div>
                </div>
              </div>

            </div>

      </div>

      {/* Bottom Action Bar - Mobile Optimized */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-3 md:px-4 py-3 safe-area-inset-bottom">
        {/* Progress Bar */}
        {isPublishing && uploadProgress > 0 && (
          <div className="mb-2.5 md:mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-zinc-400 truncate pr-2">{uploadStatus}</span>
              <span className="text-xs font-semibold text-pink-500 flex-shrink-0">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-pink-500 to-red-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center justify-center">
          <button
            onClick={handleFinalPublish}
            disabled={isPublishing || !title.trim()}
            className="w-full flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] active:bg-[#6D28D9] disabled:bg-zinc-700 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed text-sm touch-manipulation min-h-[44px]"
          >
            {isPublishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <span className="truncate">{uploadProgress > 0 ? `${uploadProgress}%` : 'Publishing...'}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>{joiningChallengeId ? 'Enviar al Challenge' : isChallengeMode ? 'Publicar Challenge' : 'Post'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Sheet Modal Animations */}
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* Audience Targeting Modal - Bottom Sheet style */}
      {showAudienceModal && (
        <div className="fixed inset-0 z-[100000]">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            style={{ animation: 'modalFadeIn 0.2s ease-out forwards' }}
            onClick={() => setShowAudienceModal(false)}
          />
          <div className="flex h-full items-end justify-center">
            <div 
              className="relative bg-zinc-900 shadow-2xl w-full rounded-t-3xl max-h-[80vh] flex flex-col"
              style={{ animation: 'modalSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
            >
              {/* Handle bar */}
              <div className="w-full py-2 flex justify-center bg-zinc-900 flex-shrink-0">
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
              </div>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-center flex-shrink-0">
                <h2 className="font-semibold text-white text-base">Público objetivo</h2>
              </div>
              {/* Options */}
              <div className="px-4 pb-8 flex flex-col gap-3 overflow-y-auto overscroll-contain">
                {[
                  { value: 'General audience', label: 'General audience', subtitle: 'Para todo tipo de público' },
                  { value: 'Anime fans', label: 'Anime fans', subtitle: 'Amantes del anime y manga' },
                  { value: 'Gaming', label: 'Gaming', subtitle: 'Comunidad de videojuegos' },
                  { value: 'Art & Edits', label: 'Art & Edits', subtitle: 'Arte digital y ediciones' },
                  { value: 'Movies & series', label: 'Movies & series', subtitle: 'Películas y series de TV' },
                  { value: 'Photography', label: 'Photography', subtitle: 'Fotografía y contenido visual' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setAudienceTarget(option.value);
                      setShowAudienceModal(false);
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${
                      audienceTarget === option.value 
                        ? 'bg-zinc-700 ring-1 ring-indigo-500/50' 
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-white text-sm">{option.label}</p>
                      <p className="text-xs text-zinc-400">{option.subtitle}</p>
                    </div>
                    {audienceTarget === option.value && (
                      <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source Authenticity Modal - Bottom Sheet style */}
      {showAuthenticityModal && (
        <div className="fixed inset-0 z-[100000]">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            style={{ animation: 'modalFadeIn 0.2s ease-out forwards' }}
            onClick={() => setShowAuthenticityModal(false)}
          />
          <div className="flex h-full items-end justify-center">
            <div 
              className="relative bg-zinc-900 shadow-2xl w-full rounded-t-3xl max-h-[80vh] flex flex-col"
              style={{ animation: 'modalSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
            >
              {/* Handle bar */}
              <div className="w-full py-2 flex justify-center bg-zinc-900 flex-shrink-0">
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
              </div>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-center flex-shrink-0">
                <h2 className="font-semibold text-white text-base">Autenticidad del contenido</h2>
              </div>
              {/* Options */}
              <div className="px-4 pb-8 flex flex-col gap-3 overflow-y-auto overscroll-contain">
                {[
                  { value: 'Original', label: 'Original', subtitle: 'Contenido creado por ti' },
                  { value: 'Fan-made', label: 'Fan-made', subtitle: 'Hecho por fans de un contenido' },
                  { value: 'Official', label: 'Official', subtitle: 'Contenido oficial verificado' },
                  { value: 'AI-generated', label: 'AI-generated', subtitle: 'Generado con inteligencia artificial' },
                  { value: 'Mixed', label: 'Mixed', subtitle: 'Combinación de fuentes' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSourceAuthenticity(option.value);
                      setShowAuthenticityModal(false);
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${
                      sourceAuthenticity === option.value 
                        ? 'bg-zinc-700 ring-1 ring-indigo-500/50' 
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-white text-sm">{option.label}</p>
                      <p className="text-xs text-zinc-400">{option.subtitle}</p>
                    </div>
                    {sourceAuthenticity === option.value && (
                      <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voting Privacy Modal - Bottom Sheet style */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[100000]">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            style={{ animation: 'modalFadeIn 0.2s ease-out forwards' }}
            onClick={() => setShowPrivacyModal(false)}
          />
          <div className="flex h-full items-end justify-center">
            <div 
              className="relative bg-zinc-900 shadow-2xl w-full rounded-t-3xl max-h-[80vh] flex flex-col"
              style={{ animation: 'modalSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
            >
              {/* Handle bar */}
              <div className="w-full py-2 flex justify-center bg-zinc-900 flex-shrink-0">
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
              </div>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-center flex-shrink-0">
                <h2 className="font-semibold text-white text-base">Privacidad de votos</h2>
              </div>
              {/* Options */}
              <div className="px-4 pb-8 flex flex-col gap-3 overflow-y-auto overscroll-contain">
                {[
                  { value: 'Público', label: 'Público', subtitle: 'Todos pueden ver los votos' },
                  { value: 'Solo seguidores', label: 'Solo seguidores', subtitle: 'Solo tus seguidores pueden ver los votos' },
                  { value: 'Privado', label: 'Privado', subtitle: 'Solo tú puedes ver los votos' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setVotingPrivacy(option.value);
                      setShowPrivacyModal(false);
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${
                      votingPrivacy === option.value 
                        ? 'bg-zinc-700 ring-1 ring-indigo-500/50' 
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-white text-sm">{option.label}</p>
                      <p className="text-xs text-zinc-400">{option.subtitle}</p>
                    </div>
                    {votingPrivacy === option.value && (
                      <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ContentPublishPage;