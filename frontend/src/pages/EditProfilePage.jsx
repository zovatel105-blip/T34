import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import CircularCrop from '../components/CircularCrop';
import uploadService from '../services/uploadService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser, apiRequest } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef(null);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    occupation: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || '',
        bio: user.bio || '',
        occupation: user.occupation || '',
        avatar_url: user.avatar_url || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 150);
    };
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fileInputRef = useRef(null);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTempImageForCrop(ev.target.result);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarCropped = async (croppedImageUrl, imageBlob) => {
    try {
      const file = new File([imageBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const uploadResult = await uploadService.uploadAvatar(file);
      const permanentUrl = uploadService.getPublicUrl(uploadResult.public_url);
      setFormData(prev => ({ ...prev, avatar_url: permanentUrl }));
      toast({ title: "¡Foto recortada y guardada!", description: "Tu nueva foto de perfil está lista. No olvides guardar los cambios.", variant: "default" });
    } catch (error) {
      console.error('Error al subir la imagen recortada:', error);
      toast({ title: "Error al subir imagen", description: error.message || "No se pudo subir la imagen.", variant: "destructive" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = {};
      if (formData.display_name.trim() !== (user.display_name || '')) updateData.display_name = formData.display_name.trim();
      if (formData.bio.trim() !== (user.bio || '')) updateData.bio = formData.bio.trim();
      if (formData.occupation.trim() !== (user.occupation || '')) updateData.occupation = formData.occupation.trim();
      if (formData.avatar_url.trim() !== (user.avatar_url || '')) updateData.avatar_url = formData.avatar_url.trim();

      if (Object.keys(updateData).length === 0) {
        toast({ title: "Sin cambios", description: "No hay cambios que guardar", variant: "default" });
        setLoading(false);
        return;
      }

      await updateUser(updateData);
      toast({ title: "¡Perfil actualizado!", description: "Los cambios se han guardado exitosamente", variant: "default" });
      navigate(-1);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: "Error al actualizar", description: error.message || "No se pudo conectar con el servidor", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header (sticky para que no se deslice) */}
      <div 
        className="sticky top-0 z-20 relative w-full flex items-center justify-center px-4 py-4 transition-colors duration-300" 
        style={{backgroundColor: isScrolled ? 'white' : 'rgba(176, 97, 255, 0.1)'}}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200 z-10"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-lg font-semibold text-gray-900 mt-3">Editar perfil</h1>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-hide">
        <form id="edit-profile-form" onSubmit={handleSubmit} className="min-h-full">
          
          {/* Foto de perfil hero section */}
          <div className="px-6 py-12" style={{background: 'linear-gradient(to bottom, rgba(176, 97, 255, 0.1), white)'}}>
            <div className="flex flex-col items-center">
              <div className="relative group mb-6">
                <button
                  type="button"
                  onClick={handleCameraClick}
                  className="relative w-36 h-36 rounded-full overflow-hidden bg-white ring-4 ring-white shadow-xl transition-all duration-300 group-hover:shadow-2xl hover:ring-blue-200 cursor-pointer group"
                >
                  {formData.avatar_url ? (
                    <img src={resolveAssetUrl(formData.avatar_url)} alt="Foto de perfil" className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-75" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </div>
              <p className="text-sm text-gray-500">Toca para cambiar foto</p>
            </div>
          </div>

          {/* Formulario — campos en tarjetas redondeadas */}
          <div className="px-5 py-6 flex flex-col gap-3">
            <div className="p-4 rounded-2xl bg-gray-50">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => handleChange('display_name', e.target.value)}
                placeholder="Tu nombre completo"
                maxLength={50}
                className="w-full text-base font-medium text-gray-900 placeholder-gray-300 bg-transparent border-0 focus:outline-none"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">Así te verán otros usuarios</p>
                <p className="text-xs text-gray-300">{formData.display_name.length}/50</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Biografía</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="¿Qué te apasiona? Comparte lo que quieras..."
                maxLength={160}
                rows={4}
                className="w-full text-base text-gray-900 placeholder-gray-300 bg-transparent border-0 focus:outline-none resize-none leading-relaxed"
              />
              <div className="flex justify-end mt-1">
                <p className="text-xs text-gray-300">{formData.bio.length}/160</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ocupación</label>
              <input
                type="text"
                value={formData.occupation}
                onChange={(e) => handleChange('occupation', e.target.value)}
                placeholder="Estudiante, Diseñador, Músico..."
                maxLength={100}
                className="w-full text-base font-medium text-gray-900 placeholder-gray-300 bg-transparent border-0 focus:outline-none"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">Campo opcional</p>
                <p className="text-xs text-gray-300">{formData.occupation.length}/100</p>
              </div>
            </div>
          </div>

          <div className="h-24"></div>
        </form>
      </div>

      {/* Botones fijos */}
      <div className="bg-white border-t border-gray-100 px-6 py-4 safe-area-bottom">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all duration-200 active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-profile-form"
            disabled={loading}
            className="flex-2 h-14 rounded-2xl text-white font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg min-w-[140px]"
            style={{backgroundColor: '#B061FF', boxShadow: '0 10px 15px -3px rgba(176, 97, 255, 0.25)'}}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9941E5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#B061FF'}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Guardando...
              </div>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>
      </div>

      <CircularCrop
        isOpen={cropModalOpen}
        onClose={() => { setCropModalOpen(false); setTempImageForCrop(null); }}
        onImageCropped={handleAvatarCropped}
        initialImage={tempImageForCrop}
      />
    </div>
  );
};

export default EditProfilePage;
