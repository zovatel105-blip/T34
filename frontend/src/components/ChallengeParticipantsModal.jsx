import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Trophy } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/utils';

/**
 * Modal that shows all participants of a Challenge.
 * Opens when user taps the participant tag in the feed.
 */
const ChallengeParticipantsModal = ({ isOpen, onClose, participants = [], challengeTitle = '' }) => {
  const navigate = useNavigate();

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
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-zinc-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-semibold text-base">
              Participantes del Challenge
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Challenge title */}
        {challengeTitle && (
          <div className="px-4 py-2 border-b border-zinc-800/50">
            <p className="text-white/60 text-sm">{challengeTitle}</p>
          </div>
        )}

        {/* Participants list */}
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {participants.map((participant, index) => (
            <button
              key={participant.id || index}
              onClick={() => handleParticipantClick(participant)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors"
            >
              {/* Avatar */}
              <Avatar className="w-11 h-11 rounded-full border-2 border-zinc-700 flex-shrink-0">
                <AvatarImage
                  src={participant.avatar_url || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white flex items-center justify-center">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {participant.display_name || participant.username || 'Usuario'}
                </p>
                {participant.username && (
                  <p className="text-white/50 text-xs truncate">
                    @{participant.username}
                  </p>
                )}
              </div>

              {/* Index badge */}
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                index === 0
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : "bg-zinc-800 text-white/50 border border-zinc-700"
              )}>
                {index + 1}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800">
          <p className="text-white/40 text-xs text-center">
            {participants.length} participante{participants.length !== 1 ? 's' : ''} en este challenge
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChallengeParticipantsModal;
