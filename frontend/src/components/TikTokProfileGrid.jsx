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
    return poll.options?.some(option => {
      const url = option.media?.url || option.media_url;
      const type = option.media?.type || option.media_type;
      return type === 'video' || (url && /\.(mp4|webm|mov|avi)(\?|$)/i.test(url));
    });
  };

  // Get thumbnail for the poll
  const getPostThumbnail = (poll) => {
    // 🎯 VS POSTS: nunca usar un thumbnail plano de una sola imagen.
    // Devolvemos null para forzar el fallback que renderiza el layout
    // completo (ambas opciones lado a lado) usando LayoutRenderer.
    const isVS = poll?.layout === 'vs' || !!poll?.vs_id;
    if (isVS) {
      return null;
    }

    // First, check if we have a dedicated thumbnail
    if (poll.thumbnail_url) {
      return poll.thumbnail_url;
    }

    // Helper to extract media fields from an option (handles both shapes)
    const getMediaFields = (opt) => ({
      url: opt.media?.url || opt.media_url,
      type: opt.media?.type || opt.media_type,
      thumbnail: opt.media?.thumbnail || opt.thumbnail_url,
    });

    const isVideoUrl = (u) => u && /\.(mp4|webm|mov|avi)(\?|$)/i.test(u);

    // For video content, use generated thumbnail (must be a real image, not the video URL)
    if (hasVideoContent(poll)) {
      const videoOption = poll.options?.find(opt => {
        const f = getMediaFields(opt);
        return f.type === 'video' || isVideoUrl(f.url);
      });
      if (videoOption) {
        const f = getMediaFields(videoOption);
        // Only return thumbnail if it's a valid image URL (not the video itself)
        if (f.thumbnail && !isVideoUrl(f.thumbnail)) {
          return f.thumbnail;
        }
      }
      return null;
    }

    // For image content, use the first image
    const imageOption = poll.options?.find(opt => {
      const f = getMediaFields(opt);
      return f.url && (f.type === 'image' || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(f.url));
    });
    
    if (imageOption) {
      const f = getMediaFields(imageOption);
      return f.url;
    }
    return null;
  };

  // Get first video URL (fallback when no image thumbnail is available)
  const getFirstVideoUrl = (poll) => {
    const videoOption = poll.options?.find(opt => {
      const url = opt.media?.url || opt.media_url;
      const type = opt.media?.type || opt.media_type;
      return type === 'video' || (url && /\.(mp4|webm|mov|avi)(\?|$)/i.test(url));
    });
    return videoOption?.media?.url || videoOption?.media_url || null;
  };

  return (
    <div className="tiktok-profile-grid">
      {/* Background upload placeholders - shown at the top of own profile grid */}
      {isOwnProfile && activeUploads.map((upload) => (
        <motion.div
          key={`upload-${upload.id}`}
          className="tiktok-profile-grid-item relative overflow-hidden rounded-lg"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-full h-full relative bg-gray-900 rounded-lg flex flex-col items-center justify-center">
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
            className="tiktok-profile-grid-item group relative overflow-hidden rounded-lg"
            onClick={() => onPollClick && onPollClick(poll)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {/* Thumbnail or static image representation */}
            <div className="w-full h-full relative bg-gray-100 rounded-lg z-0">
              {(() => {
                const isVS = poll?.layout === 'vs' || !!poll?.vs_id;
                const thumbnail = getPostThumbnail(poll);
                const isVideo = hasVideoContent(poll);
                const videoUrl = isVideo ? getFirstVideoUrl(poll) : null;
                
                if (thumbnail) {
                  return (
                    <img
                      src={uploadService.getPublicUrl(thumbnail, { width: 300, height: 400, quality: 70 })}
                      alt={poll.title || 'Post thumbnail'}
                      className="w-full h-full object-cover rounded-lg"
                      style={(() => {
                        // Find the option with media to get transform
                        const imageOption = poll.options?.find(opt => {
                          const url = opt.media?.url || opt.media_url;
                          return url && (url.includes('.jpg') || url.includes('.png') || url.includes('.gif'));
                        });
                        const transform = imageOption?.media?.transform || imageOption?.transform;
                        return transform ? {
                          objectPosition: `${transform.position?.x || 50}% ${transform.position?.y || 50}%`,
                          transform: `scale(${transform.scale || 1})`,
                          transformOrigin: 'center center'
                        } : {};
                      })()}
                      onError={(e) => {
                        // Fallback to layout renderer if thumbnail fails
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  );
                }

                // Fallback 1: Placeholder estilizado para vídeos sin miniatura.
                // ⚠️ NO renderizar <video> aquí: en Android WebView, un <video>
                // sin frame cargado muestra un ENORME botón de play por defecto
                // (conocido bug de Chromium que no se puede ocultar de forma
                // fiable con pseudo-elementos CSS). Mostramos un fondo oscuro
                // con nuestro propio icono de play — consistente con el diseño
                // del grid y sin el placeholder nativo feo.
                // 🎯 Excepción: posts VS — siempre deben mostrar el layout
                // completo (ambas opciones lado a lado), aunque tengan vídeo.
                if (!isVS && (videoUrl || isVideo)) {
                  return (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex items-center justify-center rounded-lg">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  );
                }
                
                // Fallback 2: Render static version of layout
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
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none z-10" />

            {/* Play Button (responsive for touch) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium pointer-events-none z-20">
                <Video className="w-3 h-3" />
              </div>
            )}

            {/* Vote count overlay - bottom left */}
            {voteCount > 0 && poll.show_vote_count !== false && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium pointer-events-none z-30">
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