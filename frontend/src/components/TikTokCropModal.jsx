/**
 * TikTokCropModal - TikTok-style image cropping with touch gestures
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { useModalBackButton } from '../hooks/useBackButton';

const TikTokCropModal = ({
  isOpen = false,
  onClose = () => {},
  onSave = () => {},
  imageFile = null,
  videoFile = null, // New: support for video cropping
  aspectRatio = 9/16, // TikTok aspect ratio by default
  title = 'Ajustar Contenido',
  cropShape = 'rect', // 'rect' or 'round'
  allowResize = true, // Allow aspect ratio changes
  showFilters = true // Show TikTok-style filters
}) => {
  // 📱 Cerrar con botón atrás / gesto (Android/Capacitor)
  useModalBackButton(isOpen, onClose);

  const [mediaSrc, setMediaSrc] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [transform, setTransform] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotate: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [lastDistance, setLastDistance] = useState(0);
  const [currentAspectRatio, setCurrentAspectRatio] = useState(aspectRatio);
  const [selectedFilter, setSelectedFilter] = useState('none');
  
  // TikTok-style aspect ratio presets
  const aspectRatios = [
    { name: 'TikTok', ratio: 9/16, icon: '9:16' },
    { name: 'Square', ratio: 1, icon: '1:1' },
    { name: 'Widescreen', ratio: 16/9, icon: '16:9' },
    { name: 'Story', ratio: 9/16, icon: '9:16' }
  ];
  
  // TikTok-style filters
  const filters = [
    { name: 'None', value: 'none', css: '' },
    { name: 'Vintage', value: 'vintage', css: 'sepia(0.5) contrast(1.2)' },
    { name: 'Cool', value: 'cool', css: 'hue-rotate(180deg) saturate(1.3)' },
    { name: 'Warm', value: 'warm', css: 'hue-rotate(30deg) saturate(1.2)' },
    { name: 'B&W', value: 'bw', css: 'grayscale(1)' },
    { name: 'Pop', value: 'pop', css: 'contrast(1.5) saturate(1.8)' }
  ];
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Load image
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setMediaSrc(reader.result);
        // Reset transform when new image loads
        setTransform({
          scale: 1,
          translateX: 0,
          translateY: 0,
          rotate: 0
        });
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  // Auto-fit image when it loads
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    
    const img = imageRef.current;
    const container = containerRef.current;
    
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate scale to fit image in container (covering the entire area)
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const initialScale = Math.max(scaleX, scaleY);
    
    setTransform(prev => ({
      ...prev,
      scale: initialScale
    }));
  }, []);

  // Get distance between two touches
  const getDistance = (touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  // Get center point of two touches
  const getCenter = (touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Handle touch start
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 1) {
      // Single touch - start panning
      setIsDragging(true);
      setLastPanPoint({
        x: touches[0].clientX,
        y: touches[0].clientY
      });
    } else if (touches.length === 2) {
      // Two touches - start pinching
      setIsDragging(false);
      setLastDistance(getDistance(touches));
    }
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 1 && isDragging) {
      // Single touch - panning
      const deltaX = touches[0].clientX - lastPanPoint.x;
      const deltaY = touches[0].clientY - lastPanPoint.y;
      
      setTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY
      }));
      
      setLastPanPoint({
        x: touches[0].clientX,
        y: touches[0].clientY
      });
    } else if (touches.length === 2) {
      // Two touches - pinching
      const distance = getDistance(touches);
      const scaleDelta = distance / lastDistance;
      
      setTransform(prev => ({
        ...prev,
        scale: Math.max(0.5, Math.min(3, prev.scale * scaleDelta))
      }));
      
      setLastDistance(distance);
    }
  };

  // Handle touch end
  const handleTouchEnd = (e) => {
    setIsDragging(false);
  };

  // Handle mouse events (for desktop)
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    
    setTransform(prev => ({
      ...prev,
      translateX: prev.translateX + deltaX,
      translateY: prev.translateY + deltaY
    }));
    
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle wheel for zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
    
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale * scaleDelta))
    }));
  };

  // Reset transform
  const handleReset = () => {
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotate: 0
    });
    handleImageLoad(); // Re-fit the image
  };

  // Rotate image
  const handleRotate = () => {
    setTransform(prev => ({
      ...prev,
      rotate: (prev.rotate + 90) % 360
    }));
  };

  // Generate cropped image
  const generateCroppedImage = useCallback(async () => {
    if (!imageRef.current || !containerRef.current || !canvasRef.current) {
      return null;
    }

    const img = imageRef.current;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas size based on desired aspect ratio and shape
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // For round crops (avatars), use square dimensions
    if (cropShape === 'round') {
      const size = Math.min(containerWidth, containerHeight);
      canvas.width = size;
      canvas.height = size;
    } else {
      // For rectangular crops, maintain aspect ratio
      canvas.width = containerWidth;
      canvas.height = containerHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    
    // Move to center
    ctx.translate(containerWidth / 2, containerHeight / 2);
    
    // Apply rotation
    ctx.rotate((transform.rotate * Math.PI) / 180);
    
    // Apply scale and translation
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(
      transform.translateX / transform.scale,
      transform.translateY / transform.scale
    );

    // Draw the image centered
    ctx.drawImage(
      img,
      -img.naturalWidth / 2,
      -img.naturalHeight / 2,
      img.naturalWidth,
      img.naturalHeight
    );

    ctx.restore();

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          blob.name = imageFile?.name || 'cropped-image.jpg';
          resolve(blob);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.95);
    });
  }, [transform, imageFile]);

  // Handle save
  const handleSave = async () => {
    const croppedBlob = await generateCroppedImage();
    if (croppedBlob) {
      const croppedFile = new File([croppedBlob], imageFile?.name || 'cropped-image.jpg', {
        type: 'image/jpeg'
      });
      
      const reader = new FileReader();
      reader.onload = () => {
        onSave({
          file: croppedFile,
          blob: croppedBlob,
          base64: reader.result,
          originalFile: imageFile
        });
        onClose();
      };
      reader.readAsDataURL(croppedBlob);
    }
  };

  // Handle close
  const handleClose = () => {
    setMediaSrc('');
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotate: 0
    });
    onClose();
  };

  if (!isOpen || !imageFile) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex flex-col"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 text-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
          
          <h2 className="text-lg font-semibold">{title}</h2>
          
          <Button
            onClick={handleSave}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-semibold"
          >
            <Check className="w-5 h-5 mr-1" />
            Listo
          </Button>
        </div>

        {/* Crop Area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            ref={containerRef}
            className={`relative overflow-hidden bg-black ${
              cropShape === 'round' ? 'rounded-full' : 'rounded-lg'
            }`}
            style={{
              width: '90vw',
              height: `${90 * aspectRatio}vh`,
              maxWidth: '400px',
              maxHeight: '600px'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          >
            {mediaSrc && (
              <img
                ref={imageRef}
                src={mediaSrc}
                alt="Crop preview"
                className="absolute inset-0 w-full h-full object-cover select-none"
                style={{
                  transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale}) rotate(${transform.rotate}deg)`,
                  transformOrigin: 'center'
                }}
                onLoad={handleImageLoad}
                onDragStart={(e) => e.preventDefault()}
              />
            )}
            
            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-white/20" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="p-4 text-white">
          <div className="flex items-center justify-center gap-8">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="text-white hover:bg-white/20 rounded-full p-3"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleRotate}
              className="text-white hover:bg-white/20 rounded-full p-3"
            >
              <div className="w-6 h-6 border-2 border-white rounded transform rotate-45" />
            </Button>
          </div>
          
          <div className="text-center mt-4 text-gray-300 text-sm">
            Pellizca para hacer zoom • Arrastra para mover
          </div>
        </div>

        {/* Hidden canvas for generating cropped image */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default TikTokCropModal;