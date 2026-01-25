import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Swords, Crown, Medal, Eye, User, Play, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import TikTokScrollView from '../components/TikTokScrollView';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import challengeService from '../services/challengeService';
import AppConfig from '../config/config';

const ExplorePage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedPolls, setSavedPolls] = useState(new Set());
  const [commentedPolls, setCommentedPolls] = useState(new Set());
  const [sharedPolls, setSharedPolls] = useState(new Set());

  // Cargar challenges completados del backend
  useEffect(() => {
    const loadCompletedChallenges = async () => {
      try {
        setLoading(true);
        const challenges = await challengeService.getCompletedChallenges(20, 0);
        console.log('✅ Challenges completados cargados:', challenges);
        
        // Transformar challenges al formato de TikTokScrollView
        const transformedChallenges = challenges.map(challenge => {
          // Obtener los participantes con contenido
          const participantsWithContent = challenge.participants?.filter(
            p => p.status === 'content_submitted'
          ) || [];
          
          // Construir opciones del challenge (cada participante es una opción)
          const options = participantsWithContent.map((participant, idx) => ({
            id: participant.poll_id || `opt_${idx}`,
            text: participant.username || '',
            votes: 0,
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
            layout: challenge.final_layout || 'vs-horizontal',
            is_challenge: true,
            isCompleted: true,
            category: 'Challenge',
            totalVotes: 0,
            total_votes: 0,
            views: 0,
            likes_count: 0,
            comments_count: 0,
            created_at: challenge.published_at || challenge.created_at,
            author: {
              id: challenge.creator_id,
              username: challenge.creator_username,
              display_name: challenge.creator_display_name || challenge.creator_username,
              avatar_url: challenge.creator_avatar_url,
              is_verified: false
            },
            options: options,
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
      } catch (error) {
        console.error('Error loading completed challenges:', error);
        setBattles([]);
      } finally {
        setLoading(false);
      }
    };

    loadCompletedChallenges();
  }, []);

  // Handlers para interacciones
  const handleVote = useCallback((pollId, optionId) => {
    console.log('Vote on completed battle:', pollId, optionId);
    // No permitir votar en batallas completadas
  }, []);

  const handleLike = useCallback((pollId) => {
    console.log('Like completed battle:', pollId);
  }, []);

  const handleShare = useCallback((pollId) => {
    console.log('Share completed battle:', pollId);
  }, []);

  const handleComment = useCallback((pollId) => {
    console.log('Comment on completed battle:', pollId);
  }, []);

  const handleSave = useCallback((pollId) => {
    console.log('Save completed battle:', pollId);
    setSavedPolls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pollId)) {
        newSet.delete(pollId);
      } else {
        newSet.add(pollId);
      }
      return newSet;
    });
  }, []);

  const handleCreatePoll = useCallback(() => {
    navigate('/new');
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
        savedPolls={savedPolls}
        setSavedPolls={setSavedPolls}
        commentedPolls={commentedPolls}
        setCommentedPolls={setCommentedPolls}
        sharedPolls={sharedPolls}
        setSharedPolls={setSharedPolls}
      />
    </div>
  );
};

export default ExplorePage;
