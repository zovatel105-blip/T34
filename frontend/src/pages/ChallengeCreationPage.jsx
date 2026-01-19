import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Search, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { useToast } from '../hooks/use-toast';
import challengeService from '../services/challengeService';
import AppConfig from '../config/config';
import { cn } from '../lib/utils';

const API_BASE_URL = AppConfig.API_BASE_URL;

const ChallengeCreationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();

  // El poll_id viene desde ContentCreationPage después de crear el contenido
  const creatorPollId = location.state?.pollId;

  const [title, setTitle] = useState('');
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

      try {
        setSearching(true);
        const response = await fetch(
          `${API_BASE_URL}/users/search?q=${encodeURIComponent(searchQuery)}&limit=20`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const users = await response.json();
          // Filtrar usuarios ya seleccionados y el usuario actual
          const filtered = users.filter(
            u => u.id !== user.id && !selectedUsers.find(s => s.id === u.id)
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, token, user.id, selectedUsers]);

  const handleSelectUser = (selectedUser) => {
    if (selectedUsers.length >= 6) {
      toast({
        title: "Límite alcanzado",
        description: "Máximo 6 participantes permitidos",
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
    if (!title.trim()) {
      toast({
        title: "Campo requerido",
        description: "Debes agregar un título al challenge",
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
        title: title.trim(),
        description: description.trim() || null,
        participant_ids: selectedUsers.map(u => u.id),
        challenge_type: challengeType || null,
        deadline: null,
        creator_poll_id: creatorPollId
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
    <div className="fixed inset-0 bg-black overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button
          onClick={() => navigate(-1)}
          className="text-white hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-bold">Crear Challenge</h1>
        <button
          onClick={handleCreateChallenge}
          disabled={creating || selectedUsers.length < 1 || !title.trim()}
          className={cn(
            "px-4 py-2 rounded-lg font-semibold transition-all",
            creating || selectedUsers.length < 1 || !title.trim()
              ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
              : "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-lg"
          )}
        >
          {creating ? 'Creando...' : 'Crear'}
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Formulario */}
        <div className="px-4 py-6 space-y-6">
          {/* Título */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Título del Challenge *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Challenge de Baile 💃"
              maxLength={100}
              className="w-full bg-zinc-900 text-white px-4 py-3 rounded-lg border border-zinc-700 focus:border-yellow-500 focus:outline-none transition-colors"
            />
            <p className="text-zinc-500 text-xs mt-1">
              {title.length}/100 caracteres
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el reto..."
              maxLength={300}
              rows={3}
              className="w-full bg-zinc-900 text-white px-4 py-3 rounded-lg border border-zinc-700 focus:border-yellow-500 focus:outline-none transition-colors resize-none"
            />
            <p className="text-zinc-500 text-xs mt-1">
              {description.length}/300 caracteres
            </p>
          </div>

          {/* Tipo de challenge */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Categoría (Opcional)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Baile', 'Arte', 'Cocina', 'Música', 'Deporte', 'Otro'].map((type) => (
                <button
                  key={type}
                  onClick={() => setChallengeType(type.toLowerCase())}
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                    challengeType === type.toLowerCase()
                      ? "bg-yellow-500 text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Participantes seleccionados */}
          <div>
            <label className="block text-white font-semibold mb-2 flex items-center justify-between">
              <span>Participantes * ({selectedUsers.length}/6)</span>
              {selectedUsers.length >= 6 && (
                <span className="text-yellow-500 text-xs">Límite alcanzado</span>
              )}
            </label>

            {selectedUsers.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedUsers.map((selectedUser) => (
                  <div
                    key={selectedUser.id}
                    className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.username} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {selectedUser.display_name?.[0]?.toUpperCase() || selectedUser.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">{selectedUser.display_name || selectedUser.username}</p>
                        <p className="text-zinc-500 text-sm">@{selectedUser.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(selectedUser.id)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Buscador de usuarios */}
            {selectedUsers.length < 6 && (
              <div className="relative">
                <div className="flex items-center gap-2 bg-zinc-900 px-4 py-3 rounded-lg border border-zinc-700 focus-within:border-yellow-500 transition-colors">
                  <Search className="w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar usuarios..."
                    className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none"
                  />
                  {searching && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500" />
                  )}
                </div>

                {/* Resultados de búsqueda */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-lg max-h-60 overflow-y-auto z-50 shadow-xl">
                    {searchResults.map((searchUser) => (
                      <button
                        key={searchUser.id}
                        onClick={() => handleSelectUser(searchUser)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={searchUser.avatar_url} alt={searchUser.username} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            {searchUser.display_name?.[0]?.toUpperCase() || searchUser.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-white font-medium">{searchUser.display_name || searchUser.username}</p>
                          <p className="text-zinc-500 text-sm">@{searchUser.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-1">¿Cómo funcionan los Challenges?</p>
                <ul className="space-y-1 text-blue-300">
                  <li>• Los usuarios invitados verán tu challenge en Explore > Activos</li>
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
