import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Trophy } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/utils';

const ChallengeParticipantsModal = ({ isOpen, onClose, participants = [], challengeTitle = '' }) => {
  const navigate = useNavigate();
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    isDragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };
  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      if (sheetRef.current) sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    } else {
      isDragging.current = false;
      if (sheetRef.current) { sheetRef.current.style.transition = 'transform 0.2s ease-out'; sheetRef.current.style.transform = 'translateY(0)'; }
    }
  };
  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 0.3s ease-out';
    if (currentTranslateY.current > 80) {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(100%)';
      setTimeout(onClose, 300);
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }
    currentTranslateY.current = 0;
  };

  if (!isOpen) return null;

  const handleParticipantClick = (participant) => {
    onClose();
    if (participant.username) {
      navigate(`/profile/${participant.username}`);
    } else if (participant.id) {
      navigate(`/profile/${participant.id}`);
    }
  };

  // Colores para los íconos de cada participante
  const participantColors = [
    { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
    { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    { bg: 'bg-pink-500/20', text: 'text-pink-400' },
    { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  ];

  return (
    <div className="fixed inset-0 z-[100000]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        style={{ animation: 'fadeIn 0.2s ease-out forwards' }}
        onClick={onClose}
      />
      
      {/* Modal Container - desde abajo */}
      <div className="flex h-full items-end justify-center">
        <div 
          ref={sheetRef}
          className="relative bg-zinc-900 shadow-2xl overflow-hidden w-full rounded-t-3xl"
          style={{ animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Handle superior */}
          <div className="w-full py-2 flex justify-center bg-zinc-900">
            <div className="w-10 h-1 bg-zinc-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-center">
            <h2 className="font-semibold text-white text-base">
              {challengeTitle || 'Participantes del Challenge'}
            </h2>
          </div>

          {/* Participantes */}
          <div className="px-4 pb-8 flex flex-col gap-3 max-h-[60vh] overflow-y-auto overscroll-contain">
            {participants.map((participant, index) => {
              const color = participantColors[index % participantColors.length];
              return (
                <button
                  key={participant.id || index}
                  onClick={() => handleParticipantClick(participant)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  {/* Avatar o ícono con color */}
                  {participant.avatar_url ? (
                    <Avatar className="w-10 h-10 rounded-full flex-shrink-0">
                      <AvatarImage
                        src={participant.avatar_url}
                        className="object-cover"
                      />
                      <AvatarFallback className={cn("flex items-center justify-center", color.bg)}>
                        <User className={cn("w-5 h-5", color.text)} />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", color.bg)}>
                      <User className={cn("w-5 h-5", color.text)} />
                    </div>
                  )}

                  {/* Info */}
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {participant.display_name || participant.username || 'Usuario'}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {participant.username ? `@${participant.username}` : `Participante ${index + 1}`}
                    </p>
                  </div>

                  {/* Badge de posición */}
                  {index === 0 && (
                    <div className="flex-shrink-0">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Animaciones */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ChallengeParticipantsModal;
