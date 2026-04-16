import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Vote, Loader2, User, Search, Heart, Eye } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const VotersModal = ({ isOpen, onClose, pollId }) => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [views, setViews] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);
  const scrollRef = useRef(null);

  const handleTouchStart = (e) => {
    if (scrollRef.current && scrollRef.current.scrollTop > 0) return;
    dragStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    isDragging.current = true;
    if (modalRef.current) modalRef.current.style.transition = 'none';
  };
  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    if (deltaY > 0) {
      e.preventDefault();
      currentTranslateY.current = deltaY;
      if (modalRef.current) modalRef.current.style.transform = `translateY(${deltaY}px)`;
    } else {
      isDragging.current = false;
      if (modalRef.current) { modalRef.current.style.transition = 'transform 0.2s ease-out'; modalRef.current.style.transform = 'translateY(0)'; }
    }
  };
  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (modalRef.current) modalRef.current.style.transition = 'transform 0.3s ease-out';
    if (currentTranslateY.current > 80) {
      if (modalRef.current) modalRef.current.style.transform = 'translateY(100%)';
      setTimeout(onClose, 300);
    } else {
      if (modalRef.current) modalRef.current.style.transform = 'translateY(0)';
    }
    currentTranslateY.current = 0;
  };

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cargar votantes cuando el modal se abre
  useEffect(() => {
    if (isOpen && pollId) {
      loadVoters();
      setSearchQuery('');
    }
  }, [isOpen, pollId]);

  // Manejar escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const loadVoters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/polls/${pollId}/voters`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVoters(data.voters || []);
        setTotalVotes(data.total_votes || 0);
        setViews(data.views || 0);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los votantes",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading voters:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los votantes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (userId, isFollowing) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setVoters(voters.map(voter => 
          voter.id === userId 
            ? { ...voter, is_following: !isFollowing }
            : voter
        ));
        
        toast({
          title: isFollowing ? "Dejaste de seguir" : "Siguiendo",
          description: isFollowing 
            ? "Ya no sigues a este usuario" 
            : "Ahora sigues a este usuario"
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la acción",
        variant: "destructive"
      });
    }
  };

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  // Filtrar votantes por búsqueda
  const filteredVoters = voters.filter(voter => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (voter.username || '').toLowerCase().includes(q) ||
      (voter.display_name || '').toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  const modalVariants = {
    hidden: isMobile 
      ? { opacity: 0, y: "100%" } 
      : { opacity: 0, scale: 0.85, y: 60 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0 
    },
    exit: isMobile 
      ? { opacity: 0, y: "100%" }
      : { opacity: 0, scale: 0.85, y: 60 }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        />
        
        {/* Modal Container */}
        <div className={cn(
          "flex h-full",
          isMobile ? "items-end justify-center" : "items-center justify-center p-4"
        )}>
          <motion.div
            ref={modalRef}
            className={cn(
              "relative shadow-2xl overflow-hidden flex flex-col",
              isMobile 
                ? "w-full max-h-[85vh] rounded-t-3xl bg-zinc-900" 
                : "w-full max-w-md max-h-[90vh] rounded-2xl bg-zinc-900"
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ 
              type: "spring", 
              stiffness: 380, 
              damping: 30,
              duration: 0.4 
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Handle superior */}
            <div className="w-full py-3 flex justify-center flex-shrink-0">
              <div className="w-10 h-1 bg-zinc-600 rounded-full" />
            </div>

            {/* Header - Título y stats */}
            <div className="px-4 sm:px-6 pb-4 flex-shrink-0">
              <div className="pb-4 border-b border-white/10">
                <h2 className="font-semibold text-white text-center text-base leading-tight">
                  Votos y<br />reproducciones
                </h2>
              </div>

              <div className="flex items-center justify-center gap-8 pt-4">
                <div className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-white" strokeWidth={1.5} />
                  <span className="text-lg font-normal text-white">
                    {totalVotes.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-white" strokeWidth={1.5} />
                  <span className="text-lg font-normal text-white">
                    {views.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de votantes */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-white/40 animate-spin mb-3" />
                  <p className="text-white/50 text-xs">Cargando votantes...</p>
                </div>
              ) : filteredVoters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-3">
                    <Vote className="w-7 h-7 text-white/40" />
                  </div>
                  <p className="text-white/50 text-center text-sm">
                    Aún no hay votos en esta publicación
                  </p>
                </div>
              ) : (
                <div className="px-4 sm:px-6">
                  {filteredVoters.map((voter) => (
                    <div
                      key={voter.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar
                          className="w-14 h-14 cursor-pointer flex-shrink-0"
                          onClick={() => {
                            onClose();
                            navigate(`/profile/${voter.username}`);
                          }}
                        >
                          <AvatarImage 
                            src={voter.avatar_url} 
                            alt={voter.display_name}
                            crossOrigin="anonymous"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <AvatarFallback className="bg-white/10 text-white/50 flex items-center justify-center">
                            <User className="w-7 h-7" />
                          </AvatarFallback>
                        </Avatar>
                        
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            onClose();
                            navigate(`/profile/${voter.username}`);
                          }}
                        >
                          <p className="font-bold text-[15px] text-white truncate">
                            {voter.username}
                          </p>
                          <p className="text-[13px] text-white/50 truncate">
                            {voter.display_name}
                          </p>
                        </div>
                      </div>

                      {currentUser && voter.id !== currentUser.id && (
                        <Button
                          onClick={() => handleFollowToggle(voter.id, voter.is_following)}
                          className={cn(
                            "ml-3 rounded-full font-semibold transition-all flex-shrink-0 h-[38px] px-7 text-[14px]",
                            voter.is_following
                              ? 'bg-white/15 text-white hover:bg-white/25'
                              : 'text-white hover:brightness-110'
                          )}
                          style={!voter.is_following ? {backgroundColor: '#B061FF'} : {}}
                        >
                          {voter.is_following ? 'Siguiendo' : (voter.follows_me ? 'Seguir también' : 'Seguir')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default VotersModal;
