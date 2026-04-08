import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import pollService from '../services/pollService';
import uploadService from '../services/uploadService';
import challengeService from '../services/challengeService';
import { savePendingUpload, getPendingUploads, removePendingUpload } from '../services/uploadDB';

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
      isChallengeMode, joiningChallengeId, selectedUsers, challengeType, token, toast,
    } = params;

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

  // Start a new background upload
  const publishInBackground = useCallback((params) => {
    const { contentData, title } = params;
    const firstOption = contentData.options?.[0];
    let previewThumbnail = null;
    try {
      previewThumbnail = firstOption?.file
        ? URL.createObjectURL(firstOption.file)
        : firstOption?.media_url || null;
    } catch (e) {
      previewThumbnail = firstOption?.media_url || null;
    }

    const id = Date.now().toString();
    const upload = { id, progress: 5, status: 'uploading', title: title || 'Publicando...', thumbnail: previewThumbnail };

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
          return {
            ...opt,
            file: undefined, // Don't store File directly (use storedBlob)
            storedBlob,
            fileName,
          };
        })
      );

      const persistData = {
        id,
        params: {
          ...params,
          contentData: { ...contentData, options: serializableOptions },
        },
        createdAt: Date.now(),
      };

      await savePendingUpload(persistData);
      console.log(`💾 [Upload ${id}] Saved to IndexedDB`);

      // Now execute
      executeUpload(id, params);
    })();

    return id;
  }, [executeUpload]);

  // Resume pending uploads on page load
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;

    (async () => {
      const pending = await getPendingUploads();
      if (pending.length === 0) return;

      console.log(`🔄 [UploadContext] Found ${pending.length} pending upload(s) to resume`);

      for (const entry of pending) {
        // Skip entries older than 1 hour
        if (Date.now() - entry.createdAt > 60 * 60 * 1000) {
          console.log(`⏰ [Upload ${entry.id}] Too old, removing`);
          await removePendingUpload(entry.id);
          continue;
        }

        const { id, params } = entry;

        // Get thumbnail from first option
        let thumbnail = null;
        const firstOpt = params.contentData?.options?.[0];
        if (firstOpt?.storedBlob) {
          try { thumbnail = URL.createObjectURL(firstOpt.storedBlob); } catch (e) { /* ignore */ }
        }

        // Show the card
        const upload = { id, progress: 5, status: 'uploading', title: params.title || 'Reanudando...', thumbnail };
        setActiveUploads(prev => {
          const next = [upload, ...prev];
          uploadsRef.current = next;
          return next;
        });

        // Resume execution
        console.log(`▶️ [Upload ${id}] Resuming...`);
        executeUpload(id, params);
      }
    })();
  }, [executeUpload]);

  const value = { activeUploads, publishInBackground };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

export default UploadContext;
