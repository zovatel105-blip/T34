import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import pollService from '../services/pollService';
import uploadService from '../services/uploadService';
import challengeService from '../services/challengeService';

const UploadContext = createContext(null);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export const UploadProvider = ({ children }) => {
  // Active background uploads: { id, progress, status, thumbnail, title }
  const [activeUploads, setActiveUploads] = useState([]);
  const uploadsRef = useRef([]);

  const updateUpload = useCallback((id, updates) => {
    setActiveUploads(prev => {
      const next = prev.map(u => u.id === id ? { ...u, ...updates } : u);
      uploadsRef.current = next;
      return next;
    });
  }, []);

  const removeUpload = useCallback((id) => {
    setActiveUploads(prev => {
      const next = prev.filter(u => u.id !== id);
      uploadsRef.current = next;
      return next;
    });
  }, []);

  // Main function: starts background upload and returns immediately
  const publishInBackground = useCallback(({
    contentData,
    title,
    hashtagsList,
    mentionedUsers,
    commentsEnabled,
    audienceTarget,
    sourceAuthenticity,
    votingPrivacy,
    matureContent,
    allowDownloads,
    showVoteCount,
    isChallengeMode,
    joiningChallengeId,
    selectedUsers,
    challengeType,
    token,
    toast,
  }) => {
    // Get a thumbnail preview
    const firstOption = contentData.options?.[0];
    let previewThumbnail = null;
    try {
      previewThumbnail = firstOption?.file 
        ? URL.createObjectURL(firstOption.file) 
        : firstOption?.media_url || null;
    } catch (e) {
      previewThumbnail = firstOption?.media_url || null;
    }

    // Create upload entry
    const id = Date.now().toString();
    const upload = {
      id,
      progress: 5,
      status: 'uploading',
      title: title || 'Publicando...',
      thumbnail: previewThumbnail,
    };
    
    setActiveUploads(prev => {
      const next = [upload, ...prev];
      uploadsRef.current = next;
      return next;
    });

    // Start async upload process (fire-and-forget)
    (async () => {
      try {
        console.log('🚀 [UploadContext] Starting background upload...');
        
        const filesToUpload = contentData.options
          .filter(opt => opt.file && opt.needsUpload !== false)
          .map(opt => opt.file);
        
        let uploadedOptions = [...contentData.options];
        
        if (filesToUpload.length > 0) {
          updateUpload(id, { progress: 10, status: 'uploading' });
          
          const uploadResults = await uploadService.uploadMultipleFiles(
            filesToUpload,
            'poll_options',
            (progress) => {
              const mappedProgress = Math.round(10 + (progress * 0.6));
              updateUpload(id, { progress: mappedProgress });
            }
          );
          
          console.log('✅ [UploadContext] Files uploaded:', uploadResults.length);
          
          let uploadIndex = 0;
          uploadedOptions = contentData.options.map(opt => {
            if (opt.file && opt.needsUpload !== false) {
              const uploadResult = uploadResults[uploadIndex++];
              return {
                text: opt.text || '',
                media_type: uploadResult.file_type === 'video' ? 'video' : 'image',
                media_url: uploadResult.public_url,
                thumbnail_url: uploadResult.thumbnail_url || uploadResult.public_url,
                media_transform: opt.media_transform || null,
                mentioned_users: Array.isArray(opt.mentioned_users) && opt.mentioned_users.length > 0
                  ? opt.mentioned_users.filter(mid => typeof mid === 'string' && mid)
                  : opt.mentionedUsers
                    ? opt.mentionedUsers.map(u => u.id).filter(mid => typeof mid === 'string' && mid)
                    : []
              };
            }
            return {
              text: opt.text || '',
              media_type: opt.media_type,
              media_url: opt.media_url,
              thumbnail_url: opt.thumbnail_url || opt.media_url,
              media_transform: opt.media_transform || null,
              mentioned_users: Array.isArray(opt.mentioned_users) && opt.mentioned_users.length > 0
                ? opt.mentioned_users.filter(mid => typeof mid === 'string' && mid)
                : opt.mentionedUsers
                  ? opt.mentionedUsers.map(u => u.id).filter(mid => typeof mid === 'string' && mid)
                  : []
            };
          });
        }
        
        updateUpload(id, { progress: 75, status: 'creating' });
        
        const allMentionedUsers = [
          ...(contentData.mentioned_users || []),
          ...(mentionedUsers || []).map(u => u.id)
        ];

        const pollData = {
          title: title.trim(),
          description: null,
          options: uploadedOptions,
          music_id: contentData.music_id,
          tags: (hashtagsList || []).map(tag => tag.startsWith('#') ? tag : `#${tag}`),
          category: 'general',
          mentioned_users: [...new Set(allMentionedUsers)],
          video_playbook_settings: null,
          layout: contentData.layout,
          comments_enabled: commentsEnabled,
          audience_target: audienceTarget,
          source_authenticity: sourceAuthenticity,
          voting_privacy: votingPrivacy,
          mature_content: matureContent,
          allow_downloads: allowDownloads,
          show_vote_count: showVoteCount
        };

        const newPoll = await pollService.createPoll(pollData);
        console.log('✅ [UploadContext] Poll created:', newPoll.id);
        
        updateUpload(id, { progress: 100, status: 'done' });
        
        // Remove card after 3 seconds
        setTimeout(() => removeUpload(id), 3000);
        
        // Handle challenges
        if (joiningChallengeId) {
          try {
            const result = await challengeService.submitContent(joiningChallengeId, newPoll.id, token);
            if (toast) toast({
              title: "🏆 ¡Contenido enviado!",
              description: result.is_ready_to_publish 
                ? "¡El challenge está completo y se ha publicado!" 
                : "Tu contenido ha sido añadido al challenge",
            });
          } catch (err) {
            console.error('❌ Challenge submit error:', err);
          }
        } else if (isChallengeMode && selectedUsers?.length > 0) {
          try {
            await challengeService.createChallenge({
              title: title.trim(),
              description: title.trim(),
              participant_ids: selectedUsers.map(u => u.id),
              challenge_type: challengeType || null,
              deadline: null,
              creator_poll_id: newPoll.id
            }, token);
            if (toast) toast({
              title: "🏆 ¡Challenge creado!",
              description: `Se envió la invitación a ${selectedUsers.length} usuario(s)`,
            });
          } catch (err) {
            console.error('❌ Challenge create error:', err);
          }
        } else {
          if (toast) toast({
            title: "🎉 ¡Publicación creada!",
            description: "Tu contenido ha sido publicado exitosamente",
          });
        }

      } catch (error) {
        console.error('❌ [UploadContext] Upload error:', error);
        updateUpload(id, { progress: 0, status: 'error' });
        setTimeout(() => removeUpload(id), 5000);
        
        if (toast) toast({
          title: "Error al crear publicación",
          description: error.message || "No se pudo crear la publicación",
          variant: "destructive",
        });
      }
    })();

    return id;
  }, [updateUpload, removeUpload]);

  const value = {
    activeUploads,
    publishInBackground,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

export default UploadContext;
