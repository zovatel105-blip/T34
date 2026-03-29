import React, { useState, useEffect } from 'react';
import { Play, Vote, BarChart3, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import LayoutRenderer from './layouts/LayoutRenderer';
import PostManagementMenu from './PostManagementMenu';
import uploadService from '../services/uploadService';

const TikTokProfileGrid = ({ polls, onPollClick, onUpdatePoll, onDeletePoll, currentUser, isOwnProfile = false }) => {
  const [thumbnails, setThumbnails] = useState({});

  // Function to format vote count
  const formatViewCount = (votes) => {
    if (votes >= 1000000) {
      return `${(votes / 1000000).toFixed(1)}M`;
    } else if (votes >= 1000) {
      return `${(votes / 1000).toFixed(1)}K`;
    }
    return votes.toString();
  };

  // Function to get vote count
  const getVoteCount = (poll) => {
    return poll.totalVotes || 0;
  };

  // Dummy vote function for profile grid (doesn't actually vote)
  const handleDummyVote = (optionId) => {
    // This is just for rendering purposes, actual voting happens in TikTokScrollView
    console.log('Profile grid vote click (no action):', optionId);
  };

  // Check if poll has video content
  const hasVideoContent = (poll) => {
    return poll.options?.some(option => 
      option.media_url && (
        option.media_url.includes('.mp4') || 
        option.media_url.includes('.webm') ||
        option.media_type === 'video'
      )
    );
  };

  // Get thumbnail for the poll
  const getPostThumbnail = (poll) => {
    // First, check if we have a dedicated thumbnail
    if (poll.thumbnail_url) {
      return poll.thumbnail_url;
    }

    // For video content, use generated thumbnail or first frame
    if (hasVideoContent(poll)) {
      const videoOption = poll.options?.find(opt => opt.media_type === 'video' || opt.media_url?.includes('.mp4'));
      return videoOption?.thumbnail_url || null;
    }

    // For image content, use the first image
    const imageOption = poll.options?.find(opt => 
      opt.media_url && (opt.media_type === 'image' || opt.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
    );
    
    return imageOption?.media_url || null;
  };

  return (
    <div className="tiktok-profile-grid">
      {polls.map((poll, index) => {
        const voteCount = getVoteCount(poll);

        return (
          <motion.div
            key={poll.id}
            className="tiktok-profile-grid-item group relative overflow-hidden rounded-lg"
            onClick={() => onPollClick && onPollClick(poll)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {/* Thumbnail or static image representation */}
            <div className="w-full h-full relative bg-gray-100 rounded-lg">
              {(() => {
                const thumbnail = getPostThumbnail(poll);
                const isVideo = hasVideoContent(poll);
                
                if (thumbnail) {
                  return (
                    <img
                      src={uploadService.getPublicUrl(thumbnail, { width: 300, height: 400, quality: 70 })}
                      alt={poll.title || 'Post thumbnail'}
                      className="w-full h-full object-cover rounded-lg"
                      style={(() => {
                        // Find the option with media to get transform
                        const imageOption = poll.options?.find(opt => 
                          opt.media_url && (opt.media_url.includes('.jpg') || opt.media_url.includes('.png') || opt.media_url.includes('.gif'))
                        );
                        return imageOption?.transform ? {
                          objectPosition: `${imageOption.transform.position?.x || 50}% ${imageOption.transform.position?.y || 50}%`,
                          transform: `scale(${imageOption.transform.scale || 1})`,
                          transformOrigin: 'center center'
                        } : {};
                      })()}
                      onError={(e) => {
                        // Fallback to layout renderer if thumbnail fails
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  );
                }
                
                // Fallback: Render static version of layout
                return (
                  <div className="w-full h-full" style={{ display: thumbnail ? 'none' : 'block' }}>
                    <LayoutRenderer 
                      poll={poll} 
                      onVote={handleDummyVote} 
                      isActive={false} // Not active in profile grid
                      disableVideo={true} // Prevent video autoplay
                      isThumbnail={true} // 🖼️ Ocultar indicadores de progreso en miniaturas
                    />
                  </div>
                );
              })()}
            </div>

            {/* Dark overlay for better text visibility */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none" />

            {/* Play Button (responsive for touch) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white ml-0.5" />
              </motion.div>
            </div>

            {/* Video indicator - top right */}
            {hasVideoContent(poll) && (
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium pointer-events-none">
                <Video className="w-3 h-3" />
              </div>
            )}

            {/* Vote count overlay - bottom left */}
            {voteCount > 0 && poll.show_vote_count !== false && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium pointer-events-none">
                <Vote className="w-3 h-3" />
                <span>{formatViewCount(voteCount)}</span>
              </div>
            )}

            {/* Debug indicator removed */}

            {/* Poll title overlay removed from profile grid */}
          </motion.div>
        );
      })}
    </div>
  );
};

export default TikTokProfileGrid;