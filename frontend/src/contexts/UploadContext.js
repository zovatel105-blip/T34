import React, { createContext, useContext, useState, useCallback } from 'react';

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

  const startUpload = useCallback((uploadData) => {
    const id = Date.now().toString();
    const upload = {
      id,
      progress: 0,
      status: 'uploading', // 'uploading' | 'creating' | 'done' | 'error'
      title: uploadData.title || 'Publicando...',
      thumbnail: uploadData.thumbnail || null,
    };
    setActiveUploads(prev => [upload, ...prev]);
    return id;
  }, []);

  const updateUpload = useCallback((id, updates) => {
    setActiveUploads(prev => 
      prev.map(u => u.id === id ? { ...u, ...updates } : u)
    );
  }, []);

  const removeUpload = useCallback((id) => {
    setActiveUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const value = {
    activeUploads,
    startUpload,
    updateUpload,
    removeUpload,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

export default UploadContext;
