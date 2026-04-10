import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Vote, Loader2, User } from 'lucide-react';
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
  const modalRef = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

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
      // Prevenir scroll del body
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
        console.log('Voters data loaded:', data.voters?.length, 'voters');
        console.log('Sample voter:', data.voters?.[0]);
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
        // Update local state
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

  // Click outside para cerrar
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Variantes de animación (igual que CommentsModal)
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
              "relative bg-white shadow-2xl overflow-hidden flex flex-col",
              isMobile 
                ? "w-full h-[85vh] rounded-t-3xl" 
                : "w-full max-w-md max-h-[90vh] rounded-2xl"
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
          >
            {/* Handle superior */}
            <div className="w-full py-2 flex justify-center bg-white flex-shrink-0">
              <div className={cn(
                "bg-gray-300 rounded-full",
                isMobile ? "w-10 h-1" : "w-12 h-1"
              )} />
            </div>

            {/* Header con título y stats */}
            <div className="bg-white px-4 sm:px-6 pb-4 flex-shrink-0">
              {/* Título centrado */}
              <div className="py-4 border-b border-gray-200">
                <h2 className={cn(
                  "font-semibold text-gray-900 text-center leading-tight",
                  isMobile ? "text-base" : "text-lg"
                )}>
                  Votos y<br />reproducciones
                </h2>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center gap-8 sm:gap-12 pt-4">
                <div className="flex items-center gap-2">
                  <Vote 
                    className={cn(
                      "text-gray-900",
                      isMobile ? "w-5 h-5" : "w-6 h-6"
                    )}
                    strokeWidth={1.5}
                  />
                  <span className={cn(
                    "font-normal text-gray-900",
                    isMobile ? "text-lg" : "text-xl"
                  )}>
                    {totalVotes.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Play 
                    className={cn(
                      "text-gray-900",
                      isMobile ? "w-5 h-5" : "w-6 h-6"
                    )}
                    strokeWidth={1.5}
                  />
                  <span className={cn(
                    "font-normal text-gray-900",
                    isMobile ? "text-lg" : "text-xl"
                  )}>
                    {views.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Voters list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className={cn(
                    "text-gray-400 animate-spin mb-3",
                    isMobile ? "w-6 h-6" : "w-8 h-8"
                  )} />
                  <p className={cn(
                    "text-gray-500",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Cargando votantes...
                  </p>
                </div>
              ) : voters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className={cn(
                    "bg-gray-100 rounded-full flex items-center justify-center mb-3",
                    isMobile ? "w-12 h-12" : "w-16 h-16"
                  )}>
                    <Vote className={cn(
                      "text-gray-400",
                      isMobile ? "w-6 h-6" : "w-8 h-8"
                    )} />
                  </div>
                  <p className={cn(
                    "text-gray-500 text-center",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Aún no hay votos en esta publicación
                  </p>
                </div>
              ) : (
                <div className="px-4 sm:px-6 pb-2">
                  {voters.map((voter) => (
                    <div
                      key={voter.id}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar
                          className={cn(
                            "cursor-pointer ring-2 ring-gray-100 flex-shrink-0",
                            isMobile ? "w-10 h-10" : "w-12 h-12"
                          )}
                          onClick={() => {
                            onClose();
                            navigate(`/profile/${voter.username}`);
                          }}
                        >
                          <AvatarImage 
                            src={voter.avatar_url} 
                            alt={voter.display_name}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              console.log('Avatar load error for:', voter.username, voter.avatar_url);
                              e.target.style.display = 'none';
                            }}
                            onLoad={(e) => {
                              console.log('Avatar loaded successfully for:', voter.username);
                            }}
                          />
                          <AvatarFallback>
                            <User className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
                          </AvatarFallback>
                        </Avatar>
                        
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            onClose();
                            navigate(`/profile/${voter.username}`);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <p className={cn(
                              "font-semibold text-gray-900 truncate",
                              isMobile ? "text-sm" : "text-base"
                            )}>
                              {voter.display_name}
                            </p>
                            {voter.is_verified && (
                              <svg className={cn(
                                "text-blue-500 flex-shrink-0",
                                isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
                              )} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                              </svg>
                            )}
                          </div>
                          <p className={cn(
                            "text-gray-500 truncate",
                            isMobile ? "text-xs" : "text-sm"
                          )}>
                            @{voter.username}
                          </p>
                        </div>
                      </div>

                      {/* Solo mostrar botón de seguir si NO es el usuario actual */}
                      {currentUser && voter.id !== currentUser.id && (
                        <Button
                          onClick={() => handleFollowToggle(voter.id, voter.is_following)}
                          className={cn(
                            "ml-3 rounded-full font-semibold transition-all flex-shrink-0",
                            isMobile ? "px-4 py-1 text-xs" : "px-6 py-1.5 text-sm",
                            voter.is_following
                              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          )}
                        >
                          {voter.is_following ? 'Siguiendo' : 'Seguir'}
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
