import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Search, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { useToast } from '../hooks/use-toast';
import challengeService from '../services/challengeService';
import AppConfig from '../config/config';
import { cn } from '../lib/utils';

const ChallengeCreationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();

  // El poll_id viene desde ContentCreationPage después de crear el contenido
  const creatorPollId = location.state?.pollId;
  const creatorLayout = location.state?.layout; // Layout seleccionado por el creador

  const [description, setDescription] = useState('');
  const [challengeType, setChallengeType] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);

  // Si no hay pollId, redirigir
  useEffect(() => {
    if (!creatorPollId) {
      toast({
        title: "Error",
        description: "Primero debes crear tu contenido para el challenge",
        variant: "destructive"
      });
      navigate('/new');
    }
  }, [creatorPollId, navigate, toast]);

  // Buscar usuarios
  useEffect(() => {
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
        console.log('🔗 URL de búsqueda:', url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('📡 Respuesta status:', response.status);

        if (response.ok) {
          const users = await response.json();
          console.log('👥 Usuarios encontrados:', users.length, users);
          
          // Filtrar usuarios ya seleccionados y el usuario actual
          const filtered = users.filter(
            u => u.id !== user.id && !selectedUsers.find(s => s.id === u.id)
          );
          console.log('✅ Usuarios filtrados:', filtered.length);
          setSearchResults(filtered);
        } else {
          const errorText = await response.text();
          console.error('❌ Error en búsqueda de usuarios:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Error searching users:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, token, user?.id, selectedUsers]);

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

  const handleCreateChallenge = async () => {
    // Validaciones
    if (!description.trim()) {
      toast({
        title: "Campo requerido",
        description: "Debes agregar una descripción al challenge",
        variant: "destructive"
      });
      return;
    }

    if (selectedUsers.length < 1) {
      toast({
        title: "Participantes requeridos",
        description: "Debes invitar al menos 1 participante",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreating(true);

      const challengeData = {
        title: description.trim(),
        description: description.trim(),
        participant_ids: selectedUsers.map(u => u.id),
        challenge_type: challengeType || null,
        deadline: null,
        creator_poll_id: creatorPollId,
        required_layout: creatorLayout || null
      };

      const createdChallenge = await challengeService.createChallenge(challengeData, token);

      toast({
        title: "¡Challenge creado!",
        description: `Se envió la invitación a ${selectedUsers.length} ${selectedUsers.length === 1 ? 'usuario' : 'usuarios'}`,
      });

      // Redirigir al explore
      navigate('/explore');

    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el challenge",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="text-white hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-base font-semibold">Crear Challenge</h1>
        <button
          onClick={handleCreateChallenge}
          disabled={creating || selectedUsers.length < 1 || !description.trim()}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold transition-all",
            creating || selectedUsers.length < 1 || !description.trim()
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-yellow-500 text-black hover:bg-yellow-400"
          )}
        >
          {creating ? 'Creando...' : 'Crear'}
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Descripción */}
          <div className="rounded-2xl bg-zinc-800 p-4">
            <label className="block text-white font-semibold text-sm mb-2">
              Descripción del Challenge *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el reto..."
              maxLength={300}
              rows={3}
              className="w-full bg-zinc-700/50 text-white px-4 py-3 rounded-xl focus:ring-1 focus:ring-yellow-500/50 focus:outline-none transition-colors resize-none placeholder-zinc-500 text-sm"
            />
            <p className="text-zinc-500 text-xs mt-2 text-right">
              {description.length}/300
            </p>
          </div>

          {/* Tipo de challenge */}
          <div className="rounded-2xl bg-zinc-800 p-4">
            <label className="block text-white font-semibold text-sm mb-3">
              Categoría (Opcional)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Baile', 'Arte', 'Cocina', 'Música', 'Deporte', 'Otro'].map((type) => (
                <button
                  key={type}
                  onClick={() => setChallengeType(challengeType === type.toLowerCase() ? '' : type.toLowerCase())}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                    challengeType === type.toLowerCase()
                      ? "bg-yellow-500 text-black"
                      : "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Participantes seleccionados */}
          <div className="rounded-2xl bg-zinc-800 p-4">
            <label className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                Invitar Participantes * ({selectedUsers.length}/5)
              </span>
              {selectedUsers.length >= 5 && (
                <span className="text-yellow-500 text-xs">Límite</span>
              )}
            </label>

            {selectedUsers.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {selectedUsers.map((selectedUser) => (
                  <div
                    key={selectedUser.id}
                    className="flex items-center justify-between bg-zinc-700/50 p-3 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.username} />
                        <AvatarFallback className="bg-gray-50 text-gray-400 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-semibold text-sm">{selectedUser.display_name || selectedUser.username}</p>
                        <p className="text-zinc-400 text-xs">@{selectedUser.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(selectedUser.id)}
                      className="w-7 h-7 rounded-full bg-zinc-600/50 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Buscador de usuarios */}
            {selectedUsers.length < 5 && (
              <div className="relative">
                <div className="flex items-center gap-2 bg-zinc-700/50 px-4 py-3 rounded-xl focus-within:ring-1 focus-within:ring-yellow-500/50 transition-all">
                  <Search className="w-5 h-5 text-zinc-500" />
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

                {/* Resultados de búsqueda */}
                {searchQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 rounded-xl max-h-60 overflow-y-auto z-[100] shadow-2xl border border-zinc-700/50">
                    {searching ? (
                      <div className="p-4 text-center text-zinc-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto mb-2" />
                        <span className="text-sm">Buscando...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((searchUser) => (
                        <button
                          key={searchUser.id}
                          onClick={() => handleSelectUser(searchUser)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-zinc-700/50 transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={searchUser.avatar_url} alt={searchUser.username} />
                            <AvatarFallback className="bg-gray-50 text-gray-400 flex items-center justify-center">
                              <Users className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="text-white font-semibold text-sm">{searchUser.display_name || searchUser.username}</p>
                            <p className="text-zinc-400 text-xs">@{searchUser.username}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-zinc-500 text-sm">
                        No se encontraron usuarios con "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="rounded-2xl bg-zinc-800 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-white text-sm mb-1">¿Cómo funcionan los Challenges?</p>
                <ul className="space-y-1 text-zinc-400 text-xs">
                  <li>• Los usuarios invitados verán tu challenge en Explore {'>'} Activos</li>
                  <li>• Deben aceptar y crear su propio contenido</li>
                  <li>• Cuando todos completen, se publicará automáticamente</li>
                  <li>• Los usuarios podrán votar por el ganador</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCreationPage;
