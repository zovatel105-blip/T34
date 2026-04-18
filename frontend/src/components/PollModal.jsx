import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { X, Heart, MessageCircle, Send, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import CommentsModal from './CommentsModal';

const PollModal = ({ isOpen, onClose, poll, onVote, onLike, onShare, onComment }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  if (!poll) return null;

  const totalVotes = poll.totalVotes || (poll.options && poll.options.length > 0 ? poll.options.reduce((sum, option) => sum + option.votes, 0) : 0) || 0;

  const handleVote = (optionId) => {
    setSelectedOption(optionId);
    onVote && onVote(poll.id, optionId);
  };

  const handleComment = () => {
    setShowCommentsModal(true);
  };

  const formatVotes = (votes) => {
    if (votes >= 1000000) {
      return `${(votes / 1000000).toFixed(1)}M`;
    } else if (votes >= 1000) {
      return `${(votes / 1000).toFixed(1)}K`;
    }
    return votes.toString();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl h-[80vh] p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={resolveAssetUrl(poll.author?.avatar_url || poll.authorUser?.avatar)} />
                  <AvatarFallback>
                    {(poll.author?.display_name || poll.author?.username || poll.authorUser?.displayName || 'A').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-sm font-semibold">
                    {poll.author?.display_name || poll.author?.username || poll.authorUser?.displayName || 'Usuario'}
                  </DialogTitle>
                  <p className="text-xs text-gray-500">{poll.timeAgo}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Poll Title */}
            <h3 className="text-lg font-bold mb-4">{poll.title}</h3>

            {/* Poll Options */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {poll.options?.map((option, index) => {
                const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                const isSelected = selectedOption === option.id;
                const isWinner = percentage > 0 && percentage === Math.max(...poll.options.map(opt => 
                  totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0
                ));

                return (
                  <motion.div
                    key={option.id}
                    className={cn(
                      "relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-300",
                      isSelected 
                        ? "border-blue-500 shadow-lg" 
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => handleVote(option.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Option Image */}
                    {option.media && (
                      <div className="aspect-square relative">
                        <img
                          src={option.media.thumbnail || option.media.url}
                          alt={option.text}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Progress overlay */}
                        {totalVotes > 0 && (
                          <motion.div
                            className={cn(
                              "absolute inset-x-0 bottom-0 transition-all duration-700",
                              isSelected 
                                ? "bg-gradient-to-t from-blue-500/80 to-transparent"
                                : isWinner 
                                  ? "bg-gradient-to-t from-green-500/80 to-transparent"
                                  : "bg-gradient-to-t from-gray-500/60 to-transparent"
                            )}
                            initial={{ height: '0%' }}
                            animate={{ height: `${percentage}%` }}
                            transition={{ duration: 0.8, delay: index * 0.2 }}
                          />
                        )}
                      </div>
                    )}

                    {/* Option Info */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={option.user?.avatar} />
                          <AvatarFallback className="text-xs">
                            {(option.user?.displayName || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-gray-700">
                          {option.user?.displayName}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-900 mb-2">{option.text}</p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900">
                          {formatVotes(option.votes)} votos
                        </span>
                        <span className="text-xs text-gray-500">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Poll Stats */}
            <div className="text-center text-sm text-gray-600 mb-4">
              <span className="font-medium">{formatVotes(totalVotes)}</span> votos totales
            </div>
          </div>

          {/* Actions Footer */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 hover:text-red-500"
                  onClick={() => onLike && onLike(poll.id)}
                >
                  <Heart className={cn("w-4 h-4", poll.userLiked && "fill-red-500 text-red-500")} />
                  <span className="text-sm">{poll.likes || 0}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 hover:text-blue-500"
                  onClick={handleComment}
                >
                  <MessageCircle className="w-4 h-4" />
                  {(poll.comments_enabled !== false && poll.commentsEnabled !== false) && (
                    <span className="text-sm">{poll.comments || 0}</span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 hover:text-green-500"
                  onClick={() => onShare && onShare(poll.id)}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        pollId={poll.id}
        pollTitle={poll.title}
        pollAuthor={poll.author?.display_name || poll.author?.username || 'Usuario'}
      />
    </>
  );
};

export default PollModal;