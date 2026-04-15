import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Camera, Video, Image as ImageIcon, Upload, RotateCw, Zap, ZapOff } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const StoryCapturePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = frontal, 'environment' = trasera
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isPressingButton, setIsPressingButton] = useState(false);
  const pressTimerRef = useRef(null);
  const pressStartTimeRef = useRef(null);

  // Iniciar cámara al cargar la página
  useEffect(() => {
    // Pequeño delay para que la página se renderice primero
    const timer = setTimeout(() => {
      startCamera();
    }, 500);
    
    return () => {
      clearTimeout(timer);
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
      stopCamera();
    };
  }, [facingMode]);

  // Timer para grabación con límite máximo de 15 segundos
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Detener automáticamente después de 15 segundos (límite máximo)
          if (newTime >= 15) {
            stopRecording();
            return 15;
          }
          return newTime;
        });
      }, 1000);
    } else {
      // No resetear el tiempo inmediatamente para mostrar el tiempo final
      // Se reseteará cuando se inicie una nueva grabación
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Iniciar cámara
  const startCamera = async () => {
    try {
      // Verificar si getUserMedia está disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia no está disponible');
        setCameraError(true);
        setPermissionDenied(true);
        return;
      }

      // Detener stream anterior si existe
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true // Siempre con audio para poder grabar video
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setCameraError(false);
        setPermissionDenied(false);
      }

      // Aplicar flash si está habilitado
      if (flashEnabled && stream.getVideoTracks().length > 0) {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: true }]
          });
        }
      }
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      setCameraError(true);
      
      // Verificar tipo de error
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      } else if (error.name === 'NotFoundError') {
        console.warn('No se encontró cámara en el dispositivo');
      } else if (error.name === 'NotReadableError') {
        console.warn('La cámara está siendo usada por otra aplicación');
      }
      
      // No mostrar toast de error inmediatamente, solo usar modo galería
      console.log('Modo galería activado (sin cámara)');
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Cambiar entre cámara frontal y trasera
  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Toggle flash
  const toggleFlash = async () => {
    const newFlashState = !flashEnabled;
    setFlashEnabled(newFlashState);

    if (streamRef.current && streamRef.current.getVideoTracks().length > 0) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: newFlashState }]
          });
        } catch (error) {
          console.error('Error al activar el flash:', error);
          toast({
            title: "Flash no disponible",
            description: "Tu dispositivo no soporta el flash.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Flash no disponible",
          description: "Tu dispositivo no tiene flash.",
          variant: "destructive"
        });
      }
    }
  };

  // Capturar foto desde la cámara
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);
      
      stopCamera();
      
      // Navegar directamente a edición
      navigateToEdit(file, 'image', previewUrl);
    }, 'image/jpeg', 0.95);
  };

  // Iniciar grabación de video
  const startRecording = async () => {
    if (!streamRef.current) return;

    try {
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], 'video.webm', { type: 'video/webm' });
        const previewUrl = URL.createObjectURL(blob);
        
        stopCamera();
        
        // Navegar directamente a edición
        navigateToEdit(file, 'video', previewUrl);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      toast({
        title: "Error de grabación",
        description: "No se pudo iniciar la grabación de video.",
        variant: "destructive"
      });
    }
  };

  // Detener grabación de video
  const stopRecording = () => {
    console.log('stopRecording llamado - mediaRecorder:', !!mediaRecorderRef.current, 'isRecording:', isRecording);
    
    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      
      // Verificar el estado del MediaRecorder
      if (recorder.state === 'recording') {
        console.log('Deteniendo MediaRecorder...');
        recorder.stop();
      } else {
        console.log('MediaRecorder no está grabando, estado:', recorder.state);
      }
      
      setIsRecording(false);
    } else {
      console.log('No hay mediaRecorder activo');
      setIsRecording(false);
    }
  };

  // Manejar inicio de presión (mouse o touch) - Iniciar video
  const handlePressStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPressingButton(true);
    setRecordingTime(0); // Resetear tiempo al iniciar
    pressStartTimeRef.current = Date.now();
    
    // Iniciar grabación de video después de mantener presionado
    pressTimerRef.current = setTimeout(() => {
      console.log('Iniciando grabación de video (después de 500ms)');
      startRecording();
    }, 500); // Delay de 500ms para iniciar video
  };

  // Manejar fin de presión - Si es rápido = foto, si es largo = detener video
  const handlePressEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const pressDuration = Date.now() - (pressStartTimeRef.current || 0);
    setIsPressingButton(false);
    
    console.log('Press duration:', pressDuration, 'ms', 'isRecording:', isRecording);
    
    // Limpiar timer de inicio si existe
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    // Si está grabando O si ya pasó el tiempo para iniciar, detener
    if (isRecording || pressDuration >= 500) {
      console.log('Deteniendo grabación');
      // Usar setTimeout para asegurar que el estado se actualice
      setTimeout(() => {
        stopRecording();
      }, 10);
    } else {
      // Si fue un click rápido (menos de 500ms), tomar foto
      if (pressDuration < 500) {
        console.log('Capturando foto (click rápido)');
        capturePhoto();
      }
    }
  };

  // Manejar selección de archivo desde galería
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = file.type.startsWith('image') ? 'image' : 'video';
    
    stopCamera();

    // Crear preview y navegar directamente a edición
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result;
      navigateToEdit(file, type, previewUrl);
    };
    reader.readAsDataURL(file);
  };

  // Ir a la página de edición
  const navigateToEdit = (file, type, preview) => {
    // Convertir archivo a base64 para pasar a la siguiente página
    const reader = new FileReader();
    reader.onloadend = () => {
      sessionStorage.setItem('storyMediaType', type);
      sessionStorage.setItem('storyMediaPreview', preview);
      sessionStorage.setItem('storyMediaFile', reader.result);
      sessionStorage.setItem('storyFileName', file.name);
      
      // Navegar a página de edición
      navigate('/story-edit');
    };
    reader.readAsDataURL(file);
  };

  // Formatear tiempo de grabación
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Canvas oculto para capturar fotos */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Input de archivo para galería */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header con botones transparentes */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-3 px-4">
        <div className="flex items-start justify-between">
          {/* Botón cerrar a la izquierda */}
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/80 transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Botones en vertical a la derecha */}
          <div className="flex flex-col gap-3">
            {/* Botón Flash */}
            <button 
              onClick={toggleFlash}
              className="w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/80 transition-all"
            >
              {flashEnabled ? (
                <Zap className="w-5 h-5 text-white" />
              ) : (
                <ZapOff className="w-5 h-5 text-white" />
              )}
            </button>
            
            {/* Botón Flip Camera */}
            <button 
              onClick={toggleCamera}
              className="w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/80 transition-all"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de grabación - ELIMINADO */}

      {/* Área central - cámara en vivo */}
      <div className="absolute top-0 left-0 right-0 bottom-32">
        <div className="relative w-full h-full bg-black rounded-3xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Mensaje de ayuda si hay error de cámara */}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <div className="text-center px-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-zinc-400" />
                </div>
                <h3 className="text-white text-lg font-semibold mb-2">
                  Cámara no disponible
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  {permissionDenied 
                    ? 'Necesitas dar permisos de cámara en tu navegador'
                    : 'No se pudo acceder a la cámara'}
                </p>
                <p className="text-zinc-500 text-xs mb-6">
                  Puedes usar el botón de galería para subir una foto o video
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-all"
                >
                  Abrir Galería
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra inferior en modo captura */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-8">
        {/* Temporizador encima del círculo cuando está grabando */}
        {isRecording && (
          <div className="absolute bottom-36 left-1/2 transform -translate-x-1/2 bg-zinc-800/90 backdrop-blur-sm px-4 py-2 rounded-full">
            <div className="text-white font-mono text-base font-semibold">
              {formatTime(recordingTime)}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-center px-4 w-full">
          {/* Botón de galería a la izquierda */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-8 w-14 h-14 rounded-2xl bg-white/90 hover:bg-white transition-all shadow-2xl flex items-center justify-center"
          >
            <ImageIcon className="w-7 h-7 text-black" />
          </button>
          
          {/* Botón circular de captura en el centro - Click = foto, Mantener = video */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Anillo exterior gris con progreso - SIEMPRE visible */}
            <svg className="absolute inset-0 w-20 h-20 transform -rotate-90 pointer-events-none">
              {/* Definir gradiente de colores de historia */}
              <defs>
                <linearGradient id="storyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#00FFFF', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: '#8A2BE2', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#000000', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              {/* Círculo de fondo gris completo */}
              <circle
                cx="40"
                cy="40"
                r="38"
                stroke="#9CA3AF"
                strokeWidth="3"
                fill="none"
              />
              {/* Círculo de progreso con gradiente de colores que se anima durante grabación */}
              {isRecording && (
                <circle
                  cx="40"
                  cy="40"
                  r="38"
                  stroke="url(#storyGradient)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={238.76}
                  strokeDashoffset={238.76 * (1 - recordingTime / 15)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              )}
            </svg>
            
            <button
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              className={`relative w-full h-full rounded-full flex items-center justify-center transition-all ${
                isRecording 
                  ? 'bg-transparent' 
                  : 'bg-transparent hover:scale-105'
              }`}
            >
              {/* Botón circular con gradiente cuando NO está grabando, blanco y pequeño cuando SÍ está grabando */}
              <div className={`rounded-full transition-all duration-200 ${
                isRecording 
                  ? 'w-10 h-10 bg-white' 
                  : 'w-16 h-16 bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#B061FF]'
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCapturePage;
