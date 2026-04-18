import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Vote, Loader2, User, Search, Heart, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { useNavPreference } from '../hooks/useNavPreference';
import { useModalBackButton } from '../hooks/useBackButton';

const VotersModal = ({ isOpen, onClose, pollId, onExpandChange = null }) => {
  // 📱 Cerrar con botón atrás / gesto (Android/Capacitor)
  useModalBackButton(isOpen, onClose);

  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [views, setViews] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isBottomNav } = useNavPreference();
  const [isExpanded, setIsExpanded] = useState(false);
  const isBottomSheet = isMobile && isBottomNav;
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

    if (isBottomSheet && !isExpanded && deltaY < -30) {
      isDragging.current = false;
      if (modalRef.current) { modalRef.current.style.transition = 'transform 0.2s ease-out'; modalRef.current.style.transform = 'translateY(0)'; }
      setIsExpanded(true);
      if (onExpandChange) onExpandChange(true);
      return;
    }

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
      if (isBottomSheet && isExpanded) {
        if (modalRef.current) modalRef.current.style.transform = 'translateY(0)';
        setIsExpanded(false);
        if (onExpandChange) onExpandChange(false);
      } else {
        if (modalRef.current) modalRef.current.style.transform = 'translateY(100%)';
        setTimeout(onClose, 300);
      }
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

  // Reset expanded on close
  useEffect(() => {
    if (!isOpen) setIsExpanded(false);
  }, [isOpen]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => {
      const next = !prev;
      if (onExpandChange) onExpandChange(next);
      return next;
    });
  }, [onExpandChange]);

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
      if (isBottomSheet && isExpanded) {
        setIsExpanded(false);
      } else {
        onClose();
      }
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
          className={cn(
            "absolute inset-0 backdrop-blur-md",
            isBottomSheet && !isExpanded ? "bg-black/40" : "bg-black/70"
          )}
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
              "relative shadow-2xl overflow-hidden flex flex-col transition-all duration-300",
              isBottomSheet
                ? (isExpanded ? "w-full h-[95vh] rounded-t-3xl bg-white" : "w-full h-[42vh] rounded-t-3xl bg-white")
                : isMobile 
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
            {/* Handle/Chevron superior */}
            {isBottomSheet ? (
              <button 
                onClick={toggleExpand}
                className="w-full py-2 flex justify-center flex-shrink-0 bg-white active:bg-gray-50"
              >
                {isExpanded ? (
                  <ChevronDown className="w-6 h-6 text-gray-400" strokeWidth={2.5} />
                ) : (
                  <ChevronUp className="w-6 h-6 text-gray-400" strokeWidth={2.5} />
                )}
              </button>
            ) : (
              <div className="w-full py-3 flex justify-center flex-shrink-0">
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
              </div>
            )}

            {/* Header - Título y stats */}
            <div className={cn("px-4 sm:px-6 pb-4 flex-shrink-0", isMobile && isBottomNav ? "bg-white" : "")}>
              <div className={cn("pb-4 border-b", isMobile && isBottomNav ? "border-gray-200" : "border-white/10")}>
                <h2 className={cn("font-semibold text-center text-base leading-tight", isMobile && isBottomNav ? "text-gray-900" : "text-white")}>
                  Votos y<br />reproducciones
                </h2>
              </div>

              <div className="flex items-center justify-center gap-8 pt-4">
                <div className="flex items-center gap-2">
                  <Vote className={cn("w-5 h-5", isMobile && isBottomNav ? "text-gray-700" : "text-white")} strokeWidth={1.5} />
                  <span className={cn("text-lg font-normal", isMobile && isBottomNav ? "text-gray-900" : "text-white")}>
                    {totalVotes.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Play className={cn("w-5 h-5", isMobile && isBottomNav ? "text-gray-700" : "text-white")} strokeWidth={1.5} />
                  <span className={cn("text-lg font-normal", isMobile && isBottomNav ? "text-gray-900" : "text-white")}>
                    {views.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de votantes */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className={cn("w-6 h-6 animate-spin mb-3", isMobile && isBottomNav ? "text-gray-400" : "text-white/40")} />
                  <p className={cn("text-xs", isMobile && isBottomNav ? "text-gray-400" : "text-white/50")}>Cargando votantes...</p>
                </div>
              ) : filteredVoters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-3", isMobile && isBottomNav ? "bg-gray-100" : "bg-white/10")}>
                    <Vote className={cn("w-7 h-7", isMobile && isBottomNav ? "text-gray-400" : "text-white/40")} />
                  </div>
                  <p className={cn("text-center text-sm", isMobile && isBottomNav ? "text-gray-400" : "text-white/50")}>
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
                            src={resolveAssetUrl(voter.avatar_url)} 
                            alt={voter.display_name}
                            crossOrigin="anonymous"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <AvatarFallback className={cn("flex items-center justify-center", isMobile && isBottomNav ? "bg-gray-100 text-gray-400" : "bg-white/10 text-white/50")}>
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
                          <p className={cn("font-bold text-[15px] truncate", isMobile && isBottomNav ? "text-gray-900" : "text-white")}>
                            {voter.username}
                          </p>
                          <p className={cn("text-[13px] truncate", isMobile && isBottomNav ? "text-gray-500" : "text-white/50")}>
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
                              ? (isMobile && isBottomNav ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/15 text-white hover:bg-white/25')
                              : (isMobile && isBottomNav ? 'text-white hover:brightness-110' : 'text-white hover:brightness-110')
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
