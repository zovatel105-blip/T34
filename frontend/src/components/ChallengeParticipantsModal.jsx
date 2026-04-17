import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Trophy } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/utils';
import { useModalBackButton } from '../hooks/useBackButton';

const ChallengeParticipantsModal = ({ isOpen, onClose, participants = [], challengeTitle = '' }) => {
  // 📱 Cerrar con botón atrás / gesto (Android/Capacitor)
  useModalBackButton(isOpen, onClose);

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
          <div className="flex items-center justify-center px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h3 className="text-white font-semibold text-base">
                Participantes del Challenge
              </h3>
            </div>
          </div>

          {/* Challenge title */}
          {challengeTitle && (
            <div className="px-4 pb-3">
              <p className="text-zinc-400 text-sm">{challengeTitle}</p>
            </div>
          )}

          {/* Participants list */}
          <div className="px-4 pb-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto overscroll-contain">
            {participants.map((participant, index) => (
              <button
                key={participant.id || index}
                onClick={() => handleParticipantClick(participant)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] transition-all"
              >
                {/* Avatar — mismo estilo que el perfil */}
                <Avatar className="w-11 h-11 rounded-full flex-shrink-0">
                  <AvatarImage
                    src={participant.avatar_url || undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-50 text-gray-400 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {participant.display_name || participant.username || 'Usuario'}
                  </p>
                  {participant.username && (
                    <p className="text-xs text-zinc-400 truncate">
                      @{participant.username}
                    </p>
                  )}
                </div>

                {/* Index badge */}
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  index === 0
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-zinc-700 text-zinc-400"
                )}>
                  {index + 1}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3">
            <p className="text-zinc-500 text-xs text-center">
              {participants.length} participante{participants.length !== 1 ? 's' : ''} en este challenge
            </p>
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
