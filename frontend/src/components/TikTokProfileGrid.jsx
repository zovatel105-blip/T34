import React, { useState, useEffect } from 'react';
import { Play, Vote, BarChart3, Video, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import LayoutRenderer from './layouts/LayoutRenderer';
import PostManagementMenu from './PostManagementMenu';
import uploadService from '../services/uploadService';
import { useUpload } from '../contexts/UploadContext';

const TikTokProfileGrid = ({ polls, onPollClick, onUpdatePoll, onDeletePoll, currentUser, isOwnProfile = false }) => {
  const [thumbnails, setThumbnails] = useState({});
  const { activeUploads } = useUpload();

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
      {/* Background upload placeholders - shown at the top of own profile grid */}
      {isOwnProfile && activeUploads.map((upload) => (
        <motion.div
          key={`upload-${upload.id}`}
          className="tiktok-profile-grid-item relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-full h-full relative bg-gray-900 flex flex-col items-center justify-center">
            {/* Thumbnail preview */}
            {upload.thumbnail && (
              <img
                src={upload.thumbnail}
                alt="Subiendo..."
                className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-60"
              />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 rounded-lg" />
            
            {/* Status indicator */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {upload.status === 'done' ? (
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              ) : upload.status === 'error' ? (
                <AlertCircle className="w-10 h-10 text-red-400" />
              ) : (
                <svg className="w-12 h-12" viewBox="0 0 48 48">
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2.5"
                  />
                  <motion.circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={125.6}
                    initial={{ strokeDashoffset: 125.6 }}
                    animate={{ strokeDashoffset: 125.6 - (125.6 * upload.progress / 100) }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  />
                </svg>
              )}
            </div>
          </div>
        </motion.div>
      ))}
      
      {polls.map((poll, index) => {
        const voteCount = getVoteCount(poll);

        return (
          <motion.div
            key={poll.id}
            className="tiktok-profile-grid-item group relative overflow-hidden"
            onClick={() => onPollClick && onPollClick(poll)}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {/* Thumbnail */}
            <div className="w-full h-full relative bg-black z-0">
              {(() => {
                const thumbnail = getPostThumbnail(poll);
                const isVideo = hasVideoContent(poll);
                
                if (thumbnail) {
                  return (
                    <img
                      src={uploadService.getPublicUrl(thumbnail, { width: 300, height: 400, quality: 70 })}
                      alt={poll.title || 'Post thumbnail'}
                      className="w-full h-full object-cover"
                      style={(() => {
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
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  );
                }
                
                return (
                  <div className="w-full h-full" style={{ display: thumbnail ? 'none' : 'block' }}>
                    <LayoutRenderer 
                      poll={poll} 
                      onVote={handleDummyVote} 
                      isActive={false}
                      disableVideo={true}
                      isThumbnail={true}
                    />
                  </div>
                );
              })()}
            </div>

            {/* View/vote count - bottom left */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[13px] font-semibold pointer-events-none z-30" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{formatViewCount(voteCount)}</span>
            </div>

            {/* Post management menu for own profile */}
            {isOwnProfile && onUpdatePoll && onDeletePoll && (
              <div className="absolute top-1 right-1 z-40">
                <PostManagementMenu 
                  poll={poll}
                  onUpdate={onUpdatePoll}
                  onDelete={onDeletePoll}
                  currentUser={currentUser}
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default TikTokProfileGrid;