import { resolveOptimizedAssetUrl } from '../utils/resolveAssetUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

class UploadService {
  constructor() {
    this.baseURL = `${BACKEND_URL}/api`;
  }

  // Get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Get auth headers for FormData (no Content-Type needed)
  getAuthHeadersFormData() {
    const token = localStorage.getItem('token');
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async uploadFile(file, type = 'general') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_type', type);

      const response = await fetch(`${this.baseURL}/upload`, {
        method: 'POST',
        headers: this.getAuthHeadersFormData(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Upload failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async uploadAvatar(file) {
    return this.uploadFile(file, 'avatar');
  }

  async uploadPollOption(file) {
    return this.uploadFile(file, 'poll_option');
  }

  async uploadBackground(file) {
    return this.uploadFile(file, 'poll_background');
  }

  // Generate video thumbnail
  generateVideoThumbnail(videoFile, timeOffset = 1) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        // Set canvas size to match video aspect ratio
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Seek to specified time
        video.currentTime = Math.min(timeOffset, video.duration);
      };
      
      video.onseeked = () => {
        try {
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                blob,
                url: canvas.toDataURL('image/jpeg', 0.8),
                width: canvas.width,
                height: canvas.height
              });
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          }, 'image/jpeg', 0.8);
        } catch (error) {
          reject(error);
        }
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };
      
      // Load video
      video.src = URL.createObjectURL(videoFile);
      video.load();
    });
  }

  // Validate file with better video/image detection
  validateFile(file, options = {}) {
    const {
      maxSize = 50 * 1024 * 1024, // 50MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
      maxDuration = 60, // seconds for videos
    } = options;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`El archivo es demasiado grande (máximo ${Math.round(maxSize / 1024 / 1024)}MB)`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push('Tipo de archivo no permitido');
    }

    // For videos, we'll validate duration after upload
    const isVideo = file.type.startsWith('video/');
    
    return {
      isValid: errors.length === 0,
      errors,
      isVideo,
      isImage: file.type.startsWith('image/')
    };
  }

  // Upload multiple files with progress tracking
  async uploadMultipleFiles(files, uploadType = 'poll_options', progressCallback = null) {
    try {
      console.log(`📤 Uploading ${files.length} files...`);
      const uploadResults = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        // Create form data for this file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_type', uploadType);
        
        // Upload file
        const response = await fetch(`${this.baseURL}/upload`, {
          method: 'POST',
          headers: this.getAuthHeadersFormData(),
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
          throw new Error(errorData.detail || `Upload failed for file ${file.name}`);
        }
        
        const result = await response.json();
        uploadResults.push(result);
        
        // Call progress callback if provided
        if (progressCallback) {
          const overallProgress = Math.round(((i + 1) / files.length) * 100);
          progressCallback(overallProgress, i, 100);
        }
        
        console.log(`✅ File ${i + 1}/${files.length} uploaded successfully`);
      }
      
      console.log(`✅ All ${files.length} files uploaded successfully`);
      return uploadResults;
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  }

  // Get optimized public URL with transformations.
  // 📱 En APK de Capacitor el frontend vive en https://localhost.
  // Los paths relativos ("/api/uploads/xxx.jpg") se romperían al resolverse
  // contra localhost. Por eso usamos `resolveOptimizedAssetUrl` que
  // siempre prepone BACKEND_URL (con fallback a AppConfig).
  getPublicUrl(path, options = {}) {
    if (!path) return null;
    return resolveOptimizedAssetUrl(path, options);
  }
}

export default new UploadService();