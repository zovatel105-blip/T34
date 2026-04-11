import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, CheckCircle, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

const CircularCrop = ({ isOpen, onClose, onImageCropped, initialImage = null }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Configuración del crop circular
  const CANVAS_SIZE = 330; // Aumentado de 300 a 330px para círculo más grande
  const CROP_SIZE = 330; // Círculo del mismo tamaño que el canvas
  const MIN_SCALE = 0.3; // Reducido para mostrar más imagen completa inicialmente
  const MAX_SCALE = 4; // Aumentado para mejor control de zoom

  useEffect(() => {
    if (initialImage) {
      handleImageLoad(initialImage);
    }
  }, [initialImage, isOpen]);

  const handleImageLoad = (imageSrc) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      // Escala inicial para cubrir todo el círculo (object-cover)
      const initialScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
      
      // Asegurar que la escala permita ver la imagen completa
      const finalScale = Math.max(initialScale, MIN_SCALE);
      setScale(finalScale);
      setPosition({ x: 0, y: 0 });
      drawCanvas(img, finalScale, { x: 0, y: 0 });
    };
    img.src = imageSrc;
  };

  const drawCanvas = useCallback((img = image, currentScale = scale, currentPosition = position) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    
    // Configurar alta resolución para evitar difuminación
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasSize = CANVAS_SIZE;
    const displaySize = canvasSize;
    
    // Configurar tamaño real del canvas para alta resolución
    canvas.width = canvasSize * devicePixelRatio;
    canvas.height = canvasSize * devicePixelRatio;
    
    // Configurar tamaño de display
    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';
    
    // Escalar el contexto para alta resolución
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Configurar calidad de renderizado para imágenes nítidas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Limpiar canvas completamente
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Calcular dimensiones de la imagen escalada
    const scaledWidth = img.width * currentScale;
    const scaledHeight = img.height * currentScale;

    // Posición centrada + offset del drag
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const imageX = centerX - scaledWidth / 2 + currentPosition.x;
    const imageY = centerY - scaledHeight / 2 + currentPosition.y;

    // Crear clipping path circular que ocupa todo el canvas
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, canvasSize / 2, 0, 2 * Math.PI);
    ctx.clip();

    // Dibujar imagen con alta calidad dentro del círculo
    ctx.drawImage(img, imageX, imageY, scaledWidth, scaledHeight);
    
    ctx.restore();

    // Dibujar borde del círculo con estilo claro
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, canvasSize / 2 - 1.5, 0, 2 * Math.PI);
    ctx.stroke();
  }, [image, scale, position]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Funciones de zoom
  const handleZoomIn = () => {
    const newScale = Math.min(scale * 1.2, MAX_SCALE);
    setScale(newScale);
    drawCanvas(image, newScale, position);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale * 0.8, MIN_SCALE);
    setScale(newScale);
    drawCanvas(image, newScale, position);
  };

  const handleReset = () => {
    if (image) {
      const imageAspect = image.width / image.height;
      let initialScale;
      
      // Reset para mostrar imagen completa en formato 9:16
      const targetAspect = 9/16; // 0.5625
      
      if (imageAspect <= targetAspect) {
        // Imagen vertical o cuadrada - escalar por ancho para mostrar completa
        initialScale = (CANVAS_SIZE * 0.7) / image.width;
      } else {
        // Imagen horizontal - escalar por altura para mostrar completa  
        initialScale = (CANVAS_SIZE * 0.7) / image.height;
      }
      
      const newScale = Math.max(initialScale, MIN_SCALE);
      const newPosition = { x: 0, y: 0 };
      setScale(newScale);
      setPosition(newPosition);
      drawCanvas(image, newScale, newPosition);
    }
  };

  // Funciones de drag (mouse)
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setLastPanPoint(position);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const newPosition = {
      x: lastPanPoint.x + deltaX,
      y: lastPanPoint.y + deltaY
    };
    
    setPosition(newPosition);
    drawCanvas(image, scale, newPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Funciones táctiles
  const getTouchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 1) {
      // Drag con un dedo
      setIsDragging(true);
      setDragStart({ x: touches[0].clientX, y: touches[0].clientY });
      setLastPanPoint(position);
    } else if (touches.length === 2) {
      // Zoom con dos dedos
      setIsDragging(false);
      const distance = getTouchDistance(touches);
      setLastTouchDistance(distance);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 1 && isDragging) {
      // Drag con un dedo
      const deltaX = touches[0].clientX - dragStart.x;
      const deltaY = touches[0].clientY - dragStart.y;
      const newPosition = {
        x: lastPanPoint.x + deltaX,
        y: lastPanPoint.y + deltaY
      };
      
      setPosition(newPosition);
      drawCanvas(image, scale, newPosition);
    } else if (touches.length === 2) {
      // Zoom con dos dedos
      const distance = getTouchDistance(touches);
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * scaleChange));
        setScale(newScale);
        drawCanvas(image, newScale, position);
      }
      setLastTouchDistance(distance);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  // Función para recortar imagen
  const handleCropImage = () => {
    if (!image) return;
    
    setLoading(true);
    
    // Crear canvas temporal para el crop circular con alta resolución
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Usar alta resolución para el crop final (2x para mejor calidad)
    const outputSize = CANVAS_SIZE * 2; // Doble resolución para mejor calidad
    tempCanvas.width = outputSize;
    tempCanvas.height = outputSize;
    
    // Configurar alta calidad de renderizado
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';

    // Calcular dimensiones de la imagen escalada para alta resolución
    const resolutionMultiplier = 2; // 2x para mejor calidad
    const scaledWidth = image.width * scale * resolutionMultiplier;
    const scaledHeight = image.height * scale * resolutionMultiplier;

    // Posición de la imagen ajustada para alta resolución
    const centerX = outputSize / 2;
    const centerY = outputSize / 2;
    const imageX = centerX - scaledWidth / 2 + (position.x * resolutionMultiplier);
    const imageY = centerY - scaledHeight / 2 + (position.y * resolutionMultiplier);

    // Crear círculo clip que ocupa todo el canvas de alta resolución
    tempCtx.beginPath();
    tempCtx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
    tempCtx.clip();

    // Dibujar la imagen completa escalada y posicionada con alta calidad
    tempCtx.drawImage(image, imageX, imageY, scaledWidth, scaledHeight);

    // Convertir a blob con máxima calidad y llamar callback
    tempCanvas.toBlob((blob) => {
      const croppedImageUrl = URL.createObjectURL(blob);
      onImageCropped(croppedImageUrl, blob);
      setLoading(false);
      onClose();
    }, 'image/jpeg', 0.98); // JPEG con 98% de calidad para mejor balance calidad/tamaño
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleImageLoad(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-white z-50 flex flex-col",
      !isOpen && "hidden"
    )}>
      
      {/* Header - Solo título centrado */}
      <div className="flex items-center justify-center py-6">
        <h1 className="text-2xl font-semibold text-black">Crop</h1>
      </div>

      {/* Body - Imagen centrada con máscara circular */}
      <div className="flex-1 flex items-center justify-center bg-white">
        {!image ? (
          <div className="text-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="bg-gray-50 hover:bg-gray-100 px-8 py-12 rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <p className="text-gray-900 text-xl font-medium mb-2">Selecciona una foto</p>
                <p className="text-gray-500 text-sm">JPG, PNG o GIF hasta 10MB</p>
              </div>
            </label>
          </div>
        ) : (
          <div className="relative">
            {/* Canvas con diseño igual a la referencia */}
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="cursor-move touch-none rounded-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>
        )}
      </div>
      
      {/* Footer - Botones Cancel y Save */}
      {image && (
        <div className="px-6 py-6 bg-white">
          <div className="flex items-center justify-center space-x-4">
            {/* Botón Cancel - gris como en la referencia */}
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-medium py-4 rounded-xl transition-all duration-200 max-w-[150px]"
            >
              Cancel
            </button>
            
            {/* Botón Save - púrpura como guardar cambios del perfil */}
            <button
              onClick={handleCropImage}
              disabled={loading}
              className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-xl transition-all duration-200 max-w-[150px]"
              style={{backgroundColor: '#B061FF', boxShadow: '0 10px 15px -3px rgba(176, 97, 255, 0.25)'}}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CircularCrop;