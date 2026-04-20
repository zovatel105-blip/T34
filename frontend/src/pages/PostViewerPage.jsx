import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TikTokScrollView from '../components/TikTokScrollView';
import CommentsModal from '../components/CommentsModal';
import pollService from '../services/pollService';
import savedPollsService from '../services/savedPollsService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useShare } from '../hooks/useShare';

/**
 * Full-screen TikTok-style viewer for a single post.
 * Opens when navigating to /post/:postId or /poll/:postId from
 * explore/search/trending/discovery/recommendations sections.
 */
const PostViewerPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { sharePoll } = useShare();

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [selectedPollTitle, setSelectedPollTitle] = useState('');
  const [selectedPollAuthor, setSelectedPollAuthor] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const transformed = await pollService.refreshPoll(postId);
        if (!cancelled && transformed) {
          setPolls([transformed]);
        }
      } catch (e) {
        console.error('Error loading post:', e);
        toast({
          title: 'No se pudo cargar el post',
          description: 'El contenido puede haber sido eliminado o no está disponible.',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [postId, toast]);

  const handleVote = useCallback(async (pollId, optionId) => {
    try {
      await pollService.voteOnPoll(pollId, optionId);
      const fresh = await pollService.refreshPoll(pollId);
      if (fresh) setPolls([fresh]);
    } catch (e) {
      console.error('Error voting:', e);
    }
  }, []);

  const handleLike = useCallback(async (pollId) => {
    try {
      const result = await pollService.toggleLike(pollId);
      setPolls((prev) => prev.map(p => p.id === pollId ? { ...p, userLiked: result.liked, likes: result.likes } : p));
    } catch (e) {
      console.error('Error liking:', e);
    }
  }, []);

  const handleShare = useCallback((pollId) => {
    const poll = polls.find(p => p.id === pollId);
    if (poll) sharePoll(poll);
  }, [polls, sharePoll]);

  const handleComment = useCallback((pollId) => {
    const poll = polls.find(p => p.id === pollId);
    if (poll) {
      setSelectedPollId(pollId);
      setSelectedPollTitle(poll.title);
      setSelectedPollAuthor(poll.author?.username || '');
      setShowCommentsModal(true);
    }
  }, [polls]);

  const handleSave = useCallback(async (pollId) => {
    try {
      const result = await savedPollsService.toggleSavePoll(pollId);
      setPolls((prev) => prev.map(p => p.id === pollId ? { ...p, isSaved: result.saved } : p));
    } catch (e) {
      console.error('Error saving:', e);
    }
  }, []);

  const handleCreatePoll = useCallback(() => {
    navigate('/create');
  }, [navigate]);

  const handleExit = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/feed');
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-black z-0" data-testid="post-viewer-page">
      <TikTokScrollView
        polls={polls}
        onVote={handleVote}
        onLike={handleLike}
        onShare={handleShare}
        onComment={handleComment}
        onSave={handleSave}
        onCreatePoll={handleCreatePoll}
        initialIndex={0}
        onExitTikTok={handleExit}
        showLogo={false}
        isInitialLoading={loading}
        emptyMessage="Post no disponible"
        emptySubMessage="Este contenido no existe o ha sido eliminado."
        currentUser={authUser}
      />

      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        pollId={selectedPollId}
        pollTitle={selectedPollTitle}
        pollAuthor={selectedPollAuthor}
      />
    </div>
  );
};

export default PostViewerPage;
