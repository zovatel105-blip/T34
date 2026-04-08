import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import pollService from '../services/pollService';
import uploadService from '../services/uploadService';
import challengeService from '../services/challengeService';
import { savePendingUpload, getPendingUploads, removePendingUpload } from '../services/uploadDB';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/use-toast';

const UploadContext = createContext(null);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export const UploadProvider = ({ children }) => {
  const [activeUploads, setActiveUploads] = useState([]);
  const uploadsRef = useRef([]);
  const resumedRef = useRef(false);

  // Get auth token and toast from context so we can re-inject on resume
  const { token: authToken } = useAuth();
  const { toast: contextToast } = useToast();

  // Keep refs so callbacks always have fresh values
  const authTokenRef = useRef(authToken);
  const contextToastRef = useRef(contextToast);
  useEffect(() => { authTokenRef.current = authToken; }, [authToken]);
  useEffect(() => { contextToastRef.current = contextToast; }, [contextToast]);

  // Warn user before page reload if uploads are in progress
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasActive = uploadsRef.current.some(
        u => u.status === 'uploading' || u.status === 'creating'
      );
      if (hasActive) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const updateUpload = useCallback((id, updates) => {
    setActiveUploads(prev => {
      const next = prev.map(u => u.id === id ? { ...u, ...updates } : u);
      uploadsRef.current = next;
      return next;
    });
  }, []);

  const removeUploadCard = useCallback((id) => {
    setActiveUploads(prev => {
      const next = prev.filter(u => u.id !== id);
      uploadsRef.current = next;
      return next;
    });
    removePendingUpload(id);
  }, []);

  // Core upload execution - shared between new uploads and resumed uploads
  const executeUpload = useCallback(async (id, params) => {
    const {
      contentData, title, hashtagsList, mentionedUsers,
      commentsEnabled, audienceTarget, sourceAuthenticity,
      votingPrivacy, matureContent, allowDownloads, showVoteCount,
      isChallengeMode, joiningChallengeId, selectedUsers, challengeType,
    } = params;

    // Use token and toast from params if available (new upload), otherwise from context refs (resumed upload)
    const token = params.token || authTokenRef.current || localStorage.getItem('token');
    const toast = (typeof params.toast === 'function') ? params.toast : contextToastRef.current;

    try {
      // Recover File objects from stored Blobs if needed
      const optionsWithFiles = [];
      for (const opt of contentData.options) {
        let fileObj = opt.file || opt.storedBlob || null;

        // If we have a blob URL (from original creation), try to fetch it
        if (!fileObj && opt.media_url && opt.media_url.startsWith('blob:')) {
          try {
            const response = await fetch(opt.media_url);
            const blob = await response.blob();
            const ext = opt.media_type === 'video' ? '.mp4' : '.jpg';
            fileObj = new File([blob], `upload_${Date.now()}${ext}`, { type: blob.type });
          } catch (e) {
            console.warn('[UploadContext] Could not recover from blob URL:', e);
          }
        }

        // If fileObj is a plain Blob (from IndexedDB), wrap it as File
        if (fileObj && !(fileObj instanceof File) && (fileObj instanceof Blob)) {
          const ext = opt.media_type === 'video' ? '.mp4' : '.jpg';
          fileObj = new File([fileObj], opt.fileName || `upload_${Date.now()}${ext}`, { type: fileObj.type });
        }

        optionsWithFiles.push({ ...opt, file: fileObj });
      }

      const filesToUpload = optionsWithFiles.filter(o => o.file).map(o => o.file);
      console.log(`📦 [Upload ${id}] Files to upload: ${filesToUpload.length}`);

      let uploadedOptions = [...optionsWithFiles];

      if (filesToUpload.length > 0) {
        updateUpload(id, { progress: 10, status: 'uploading' });

        const uploadResults = await uploadService.uploadMultipleFiles(
          filesToUpload,
          'poll_options',
          (progress) => {
            updateUpload(id, { progress: Math.round(10 + progress * 0.6) });
          }
        );

        console.log(`✅ [Upload ${id}] Files uploaded:`, uploadResults.length);

        let idx = 0;
        uploadedOptions = optionsWithFiles.map(opt => {
          if (opt.file) {
            const res = uploadResults[idx++];
            return {
              text: opt.text || '',
              media_type: res.file_type === 'video' ? 'video' : 'image',
              media_url: res.public_url,
              thumbnail_url: res.thumbnail_url || res.public_url,
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

      const allMentioned = [
        ...(contentData.mentioned_users || []),
        ...(mentionedUsers || []).map(u => u.id)
      ];

      const pollData = {
        title: (title || '').trim(),
        description: null,
        options: uploadedOptions,
        music_id: contentData.music_id,
        tags: (hashtagsList || []).map(t => t.startsWith('#') ? t : `#${t}`),
        category: 'general',
        mentioned_users: [...new Set(allMentioned)],
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
      console.log(`✅ [Upload ${id}] Poll created:`, newPoll.id);

      updateUpload(id, { progress: 100, status: 'done' });
      removePendingUpload(id);
      setTimeout(() => removeUploadCard(id), 3000);

      // Handle challenges
      if (joiningChallengeId) {
        try {
          const result = await challengeService.submitContent(joiningChallengeId, newPoll.id, token);
          if (toast) toast({ title: "🏆 ¡Contenido enviado!", description: result.is_ready_to_publish ? "¡Challenge completo!" : "Añadido al challenge" });
        } catch (err) { console.error('Challenge submit error:', err); }
      } else if (isChallengeMode && selectedUsers?.length > 0) {
        try {
          await challengeService.createChallenge({
            title: (title || '').trim(), description: (title || '').trim(),
            participant_ids: selectedUsers.map(u => u.id),
            challenge_type: challengeType || null, deadline: null, creator_poll_id: newPoll.id
          }, token);
          if (toast) toast({ title: "🏆 ¡Challenge creado!" });
        } catch (err) { console.error('Challenge create error:', err); }
      } else {
        if (toast) toast({ title: "🎉 ¡Publicación creada!", description: "Tu contenido ha sido publicado exitosamente" });
      }

    } catch (error) {
      console.error(`❌ [Upload ${id}] Error:`, error);
      updateUpload(id, { progress: 0, status: 'error', errorMsg: error.message });
      setTimeout(() => removeUploadCard(id), 8000);
      if (toast) toast({ title: "Error al crear publicación", description: error.message || "Error desconocido", variant: "destructive" });
    }
  }, [updateUpload, removeUploadCard]);

  // Generate a thumbnail from a video file by capturing the first frame
  const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        const objectUrl = URL.createObjectURL(file);
        
        const cleanup = () => {
          URL.revokeObjectURL(objectUrl);
          video.remove();
        };

        video.onloadeddata = () => {
          // Seek to 0.1s to avoid black first frames
          video.currentTime = 0.1;
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            cleanup();
            resolve(dataUrl);
          } catch (e) {
            cleanup();
            resolve(null);
          }
        };

        video.onerror = () => {
          cleanup();
          resolve(null);
        };

        // Timeout fallback
        setTimeout(() => {
          cleanup();
          resolve(null);
        }, 3000);

        video.src = objectUrl;
      } catch (e) {
        resolve(null);
      }
    });
  };

  // Start a new background upload
  const publishInBackground = useCallback((params) => {
    const { contentData, title } = params;
    const firstOption = contentData.options?.[0];

    const id = Date.now().toString();
    // Start with null thumbnail, will be updated async if video
    const upload = { id, progress: 5, status: 'uploading', title: title || 'Publicando...', thumbnail: null };

    // Try to get a quick thumbnail for images
    if (firstOption?.file && firstOption.file.type?.startsWith('image/')) {
      try {
        upload.thumbnail = URL.createObjectURL(firstOption.file);
      } catch (e) { /* ignore */ }
    } else if (firstOption?.media_url && !firstOption.media_url.startsWith('blob:')) {
      upload.thumbnail = firstOption.media_url;
    }

    setActiveUploads(prev => {
      const next = [upload, ...prev];
      uploadsRef.current = next;
      return next;
    });

    // For video files, generate a real thumbnail frame async
    if (firstOption?.file && firstOption.file.type?.startsWith('video/')) {
      generateVideoThumbnail(firstOption.file).then((thumbDataUrl) => {
        if (thumbDataUrl) {
          updateUpload(id, { thumbnail: thumbDataUrl });
        }
      });
    } else if (firstOption?.file && !firstOption.file.type?.startsWith('image/')) {
      // For blob URLs that might be video
      try {
        const blobUrl = URL.createObjectURL(firstOption.file);
        updateUpload(id, { thumbnail: blobUrl });
      } catch (e) { /* ignore */ }
    }

    setActiveUploads(prev => {
      const next = [upload, ...prev];
      uploadsRef.current = next;
      return next;
    });

    // Persist to IndexedDB so we can resume after reload
    (async () => {
      // Convert File objects to Blobs for IndexedDB storage
      const serializableOptions = await Promise.all(
        contentData.options.map(async (opt) => {
          let storedBlob = null;
          let fileName = null;
          if (opt.file && opt.file instanceof Blob) {
            storedBlob = opt.file;
            fileName = opt.file.name || `file_${Date.now()}`;
          } else if (opt.media_url && opt.media_url.startsWith('blob:')) {
            try {
              const resp = await fetch(opt.media_url);
              storedBlob = await resp.blob();
              fileName = `file_${Date.now()}`;
            } catch (e) { /* ignore */ }
          }
          // Strip any non-serializable fields from options
          const { file: _file, mentionedUsers: _mu, ...serializableOpt } = opt;
          return {
            ...serializableOpt,
            file: undefined,
            storedBlob,
            fileName,
          };
        })
      );

      // Build serializable params - strip non-serializable fields (toast is a function)
      const { toast: _toast, ...serializableParams } = params;

      // Also ensure selectedUsers only contain plain objects
      const cleanSelectedUsers = (serializableParams.selectedUsers || []).map(u => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
      }));

      const persistData = {
        id,
        params: {
          ...serializableParams,
          selectedUsers: cleanSelectedUsers,
          contentData: { ...contentData, options: serializableOptions },
        },
        createdAt: Date.now(),
      };

      try {
        await savePendingUpload(persistData);
        console.log(`💾 [Upload ${id}] Saved to IndexedDB successfully`);
      } catch (saveErr) {
        console.warn(`⚠️ [Upload ${id}] Failed to save to IndexedDB (upload will not be resumable):`, saveErr);
      }

      // Now execute the upload (with original params including toast)
      executeUpload(id, params);
    })();

    return id;
  }, [executeUpload]);

  // Resume pending uploads on page load - waits for auth token to be available
  useEffect(() => {
    if (resumedRef.current) return;

    // We need an auth token to resume uploads (all uploads require authentication)
    // Also try localStorage as fallback in case AuthContext hasn't loaded yet
    const availableToken = authToken || localStorage.getItem('token');
    if (!availableToken) {
      console.log('🔄 [UploadContext] Waiting for auth token before resuming uploads...');
      return; // Will re-run when authToken changes
    }

    resumedRef.current = true;

    (async () => {
      let pending;
      try {
        pending = await getPendingUploads();
      } catch (e) {
        console.warn('[UploadContext] Failed to read pending uploads:', e);
        return;
      }
      if (!pending || pending.length === 0) return;

      console.log(`🔄 [UploadContext] Found ${pending.length} pending upload(s) to resume`);

      for (const entry of pending) {
        // Skip entries older than 1 hour
        if (Date.now() - entry.createdAt > 60 * 60 * 1000) {
          console.log(`⏰ [Upload ${entry.id}] Too old (> 1 hour), removing`);
          await removePendingUpload(entry.id);
          continue;
        }

        const { id, params } = entry;

        // Re-inject fresh token (stored token may be expired)
        params.token = availableToken;
        // toast will be resolved from contextToastRef inside executeUpload

        // Get thumbnail from first option
        let thumbnail = null;
        const firstOpt = params.contentData?.options?.[0];
        if (firstOpt?.storedBlob) {
          try { thumbnail = URL.createObjectURL(firstOpt.storedBlob); } catch (e) { /* ignore */ }
        }

        // Show the upload card with "Reanudando..." status
        const upload = { id, progress: 5, status: 'uploading', title: params.title || 'Reanudando subida...', thumbnail };
        setActiveUploads(prev => {
          const next = [upload, ...prev];
          uploadsRef.current = next;
          return next;
        });

        // Resume execution
        console.log(`▶️ [Upload ${id}] Resuming upload after page reload...`);
        executeUpload(id, params);
      }
    })();
  }, [authToken, executeUpload]);

  const value = { activeUploads, publishInBackground };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

export default UploadContext;
