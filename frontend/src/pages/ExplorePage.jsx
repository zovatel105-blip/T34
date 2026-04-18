import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Swords, Crown, Medal, Eye, User, Play, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import TikTokScrollView from '../components/TikTokScrollView';
import CommentsModal from '../components/CommentsModal';
import ShareModal from '../components/ShareModal';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import challengeService from '../services/challengeService';
import pollService from '../services/pollService';
import savedPollsService from '../services/savedPollsService';
import { useToast } from '../hooks/use-toast';
import { useShare } from '../hooks/useShare';
import AppConfig from '../config/config';

const ExplorePage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedPolls, setSavedPolls] = useState(new Set());
  const [commentedPolls, setCommentedPolls] = useState(new Set());
  const [sharedPolls, setSharedPolls] = useState(new Set());
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [selectedPollTitle, setSelectedPollTitle] = useState('');
  const [selectedPollAuthor, setSelectedPollAuthor] = useState('');
  const { toast } = useToast();
  const { shareModal, sharePoll, closeShareModal } = useShare();

  // Cargar challenges completados del backend
  useEffect(() => {
    const loadCompletedChallenges = async () => {
      try {
        setLoading(true);
        const challenges = await challengeService.getCompletedChallenges(20, 0, token);
        console.log('✅ Challenges completados cargados:', challenges);
        
        // Transformar challenges al formato de TikTokScrollView
        const transformedChallenges = challenges.map(challenge => {
          // Obtener los participantes con contenido
          const participantsWithContent = challenge.participants?.filter(
            p => p.status === 'content_submitted'
          ) || [];
          
          // Construir opciones del challenge (cada participante es una opción)
          const options = participantsWithContent.map((participant, idx) => ({
            id: participant.user_id, // Usar user_id como id de opción para coincidir con userVote
            text: '',
            votes: participant.votes_received || 0,
            participant_id: participant.user_id,
            participant_username: participant.username,
            participant_avatar: participant.avatar_url,
            media: participant.poll_media ? {
              type: participant.poll_media.type || 'image',
              url: participant.poll_media.url,
              thumbnail: participant.poll_media.thumbnail || participant.poll_media.url
            } : null
          }));
          
          return {
            id: `challenge_${challenge.id}`,
            challenge_id: challenge.id,
            title: challenge.title || 'Challenge',
            type: 'vs',
            layout: challenge.required_layout || challenge.final_layout || 'vs-horizontal',
            is_challenge: true,
            isCompleted: true,
            category: 'Challenge',
            totalVotes: challenge.total_votes || 0,
            total_votes: challenge.total_votes || 0,
            views: 0,
            likes: challenge.likes_count || 0,
            likes_count: challenge.likes_count || 0,
            comments: challenge.comments_count || 0,
            comments_count: challenge.comments_count || 0,
            shares: 0,
            saves_count: challenge.saves_count || 0,
            userLiked: challenge.user_liked || false,
            isSaved: challenge.is_saved || false,
            userCommented: challenge.user_commented || false,
            comments_enabled: true,
            created_at: challenge.published_at || challenge.created_at,
            userVote: challenge.user_vote_participant_id || null,
            author: {
              id: challenge.creator_id,
              username: challenge.creator_username,
              display_name: challenge.creator_display_name || challenge.creator_username,
              avatar_url: challenge.creator_avatar_url,
              is_verified: false
            },
            options: options,
            music: challenge.music || null,
            participants: participantsWithContent.map(p => ({
              id: p.user_id,
              username: p.username,
              display_name: p.display_name,
              avatar_url: p.avatar_url
            }))
          };
        });
        
        console.log('🔄 Challenges transformados:', transformedChallenges);
        setBattles(transformedChallenges);
        
        // Initialize savedPolls from backend data
        const initialSaved = new Set(
          transformedChallenges.filter(c => c.isSaved).map(c => c.id)
        );
        setSavedPolls(initialSaved);
      } catch (error) {
        console.error('Error loading completed challenges:', error);
        setBattles([]);
      } finally {
        setLoading(false);
      }
    };

    loadCompletedChallenges();
  }, [token]);

  // Handlers para interacciones
  const handleVote = useCallback(async (pollId, optionId) => {
    console.log('Vote on challenge:', pollId, optionId);
    
    // Extraer el challenge_id real (quitando el prefijo "challenge_")
    const challengeId = pollId.replace('challenge_', '');
    
    // Buscar el participante_id de la opción votada
    const battle = battles.find(b => b.id === pollId);
    if (!battle) {
      console.error('Challenge no encontrado');
      return;
    }
    
    const votedOption = battle.options.find(opt => opt.id === optionId);
    if (!votedOption || !votedOption.participant_id) {
      console.error('Opción o participante no encontrado');
      return;
    }
    
    try {
      const result = await challengeService.voteChallenge(
        challengeId, 
        votedOption.participant_id, 
        token
      );
      
      console.log('✅ Voto registrado:', result);
      
      // Actualizar el estado local para reflejar el voto
      setBattles(prev => prev.map(b => {
        if (b.id === pollId) {
          return {
            ...b,
            options: b.options.map(opt => ({
              ...opt,
              votes: opt.id === optionId ? (opt.votes || 0) + 1 : opt.votes
            })),
            userVote: optionId
          };
        }
        return b;
      }));
      
    } catch (error) {
      console.error('Error al votar:', error);
    }
  }, [battles, token]);

  const handleLike = useCallback(async (pollId) => {
    if (!token) return;
    try {
      // Optimistic update
      setBattles(prev => prev.map(b => {
        if (b.id === pollId) {
          const wasLiked = b.userLiked;
          return {
            ...b,
            userLiked: !wasLiked,
            likes: wasLiked ? Math.max(0, (b.likes || 0) - 1) : (b.likes || 0) + 1
          };
        }
        return b;
      }));
      
      const result = await pollService.toggleLike(pollId);
      
      setBattles(prev => prev.map(b => {
        if (b.id === pollId) {
          return { ...b, userLiked: result.liked, likes: result.likes };
        }
        return b;
      }));
    } catch (error) {
      console.error('Error liking challenge:', error);
      // Revert
      setBattles(prev => prev.map(b => {
        if (b.id === pollId) {
          return { ...b, userLiked: !b.userLiked, likes: b.userLiked ? (b.likes || 0) + 1 : Math.max(0, (b.likes || 0) - 1) };
        }
        return b;
      }));
    }
  }, [token]);

  const handleShare = useCallback(async (pollId) => {
    const battle = battles.find(b => b.id === pollId);
    if (!battle) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: battle.title,
          text: battle.title || 'Mira este reto',
          url: `${window.location.origin}/explore`
        });
        setSharedPolls(prev => new Set([...prev, pollId]));
      } catch (e) {
        // User cancelled
      }
    } else {
      sharePoll(battle);
      setSharedPolls(prev => new Set([...prev, pollId]));
    }
  }, [battles, sharePoll]);

  const handleComment = useCallback((pollId) => {
    const battle = battles.find(b => b.id === pollId);
    if (battle) {
      setSelectedPollId(pollId);
      setSelectedPollTitle(battle.title);
      setSelectedPollAuthor(battle.author?.username || '');
      setShowCommentsModal(true);
      // Mark as commented when opening
      setCommentedPolls(prev => new Set([...prev, pollId]));
    }
  }, [battles]);

  const handleSave = useCallback(async (pollId) => {
    if (!token) return;
    try {
      const battle = battles.find(b => b.id === pollId);
      const wasSaved = battle?.isSaved || savedPolls.has(pollId);
      
      // Optimistic update
      setBattles(prev => prev.map(b => {
        if (b.id === pollId) {
          return {
            ...b,
            saves_count: wasSaved ? Math.max(0, (b.saves_count || 0) - 1) : (b.saves_count || 0) + 1,
            isSaved: !wasSaved
          };
        }
        return b;
      }));
      
      setSavedPolls(prev => {
        const newSet = new Set(prev);
        if (wasSaved) newSet.delete(pollId);
        else newSet.add(pollId);
        return newSet;
      });
      
      const result = await savedPollsService.toggleSavePoll(pollId);
      
      toast({
        title: result.saved ? "¡Guardado!" : "Eliminado de guardados",
        description: result.saved ? "El reto ha sido guardado" : "El reto ha sido eliminado de guardados",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error saving challenge:', error);
    }
  }, [battles, savedPolls, token, toast]);

  const handleCreatePoll = useCallback(() => {
    navigate('/create');
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Header fijo con título */}
      <div className="absolute top-0 left-0 right-0 z-40 px-4 py-3 bg-gradient-to-b from-black/90 via-black/60 to-transparent pointer-events-none">
        <div className="flex items-center pointer-events-auto">
          <h1 className="text-white text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Retos Completados
          </h1>
        </div>
      </div>

      {/* TikTokScrollView con los retos completados */}
      <TikTokScrollView
        polls={battles}
        onVote={handleVote}
        onLike={handleLike}
        onShare={handleShare}
        onComment={handleComment}
        onSave={handleSave}
        onCreatePoll={handleCreatePoll}
        showLogo={false}
        showActiveChallengesButton={true}
        isInitialLoading={loading}
        emptyMessage="No hay retos completados"
        emptySubMessage="Los retos completados aparecerán aquí. ¡Crea o participa en un reto!"
        savedPolls={savedPolls}
        setSavedPolls={setSavedPolls}
        commentedPolls={commentedPolls}
        setCommentedPolls={setCommentedPolls}
        sharedPolls={sharedPolls}
        setSharedPolls={setSharedPolls}
      />

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        pollId={selectedPollId}
        pollTitle={selectedPollTitle}
        pollAuthor={selectedPollAuthor}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={closeShareModal}
        content={shareModal.content}
      />
    </div>
  );
};

export default ExplorePage;
