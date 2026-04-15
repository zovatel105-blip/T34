import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Camera, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import CircularCrop from './CircularCrop';
import uploadService from '../services/uploadService';

const EditProfileModal = ({ isOpen, onClose, onProfileUpdate }) => {
  const { user, updateUser, apiRequest } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState(null);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    occupation: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        display_name: user.display_name || '',
        bio: user.bio || '',
        occupation: user.occupation || '',
        avatar_url: user.avatar_url || ''
      });
    }
  }, [isOpen, user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpdate = (result, avatarUrl) => {
    setFormData(prev => ({ ...prev, avatar_url: avatarUrl }));
    toast({ title: "¡Avatar actualizado!", description: "Tu nueva foto de perfil ha sido guardada", variant: "default" });
  };

  const fileInputRef = useRef(null);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Archivo no válido", description: "Por favor selecciona una imagen", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempImageForCrop(event.target.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAvatarCropped = async (croppedBlob) => {
    try {
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const result = await uploadService.uploadAvatar(file);
      if (result && result.avatar_url) {
        setFormData(prev => ({ ...prev, avatar_url: result.avatar_url }));
        toast({ title: "¡Avatar actualizado!", description: "Tu nueva foto ha sido guardada", variant: "default" });
      }
    } catch (error) {
      console.error('Error uploading cropped avatar:', error);
      toast({ title: "Error al subir", description: "No se pudo subir la imagen", variant: "destructive" });
    }
    setCropModalOpen(false);
    setTempImageForCrop(null);
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

      const updatedUser = await updateUser(updateData);
      toast({ title: "¡Perfil actualizado!", description: "Los cambios se han guardado exitosamente", variant: "default" });
      if (onProfileUpdate) onProfileUpdate(updatedUser);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: "Error al actualizar", description: error.message || "No se pudo conectar con el servidor", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        style={{ animation: 'fadeIn 0.2s ease-out forwards' }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="flex h-full items-end justify-center">
        <div
          className="relative bg-white shadow-2xl overflow-hidden w-full rounded-t-3xl flex flex-col"
          style={{
            animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards',
            maxHeight: '92vh'
          }}
        >
          {/* Handle */}
          <div className="w-full pt-3 pb-1 flex justify-center">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </button>
            <h2 className="font-semibold text-gray-900 text-base">Editar perfil</h2>
            <div className="w-9" />
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            <form id="edit-profile-form" onSubmit={handleSubmit}>

              {/* Avatar */}
              <div className="flex flex-col items-center py-6">
                <button
                  type="button"
                  onClick={handleCameraClick}
                  className="relative w-28 h-28 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg group"
                >
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Perfil" className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-full">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <p className="text-xs text-gray-400 mt-3">Toca para cambiar foto</p>
              </div>

              {/* Fields as rounded cards */}
              <div className="flex flex-col gap-3">
                {/* Nombre */}
                <div className="p-4 rounded-2xl bg-gray-50">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    placeholder="Tu nombre completo"
                    maxLength={50}
                    className="w-full text-sm font-medium text-gray-900 placeholder-gray-300 bg-transparent border-0 focus:outline-none"
                  />
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-400">Así te verán otros usuarios</p>
                    <p className="text-xs text-gray-300">{formData.display_name.length}/50</p>
                  </div>
                </div>

                {/* Biografía */}
                <div className="p-4 rounded-2xl bg-gray-50">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Biografía</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder="¿Qué te apasiona? Comparte lo que quieras..."
                    maxLength={160}
                    rows={3}
                    className="w-full text-sm text-gray-900 placeholder-gray-300 bg-transparent border-0 focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="flex justify-end mt-1">
                    <p className="text-xs text-gray-300">{formData.bio.length}/160</p>
                  </div>
                </div>

                {/* Ocupación */}
                <div className="p-4 rounded-2xl bg-gray-50">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ocupación</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                    placeholder="Estudiante, Diseñador, Músico..."
                    maxLength={100}
                    className="w-full text-sm font-medium text-gray-900 placeholder-gray-300 bg-transparent border-0 focus:outline-none"
                  />
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-400">Campo opcional</p>
                    <p className="text-xs text-gray-300">{formData.occupation.length}/100</p>
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* Bottom action buttons */}
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="edit-profile-form"
              disabled={loading}
              className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</span>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Crop modal */}
      <CircularCrop
        isOpen={cropModalOpen}
        onClose={() => { setCropModalOpen(false); setTempImageForCrop(null); }}
        onImageCropped={handleAvatarCropped}
        initialImage={tempImageForCrop}
      />
    </div>,
    document.body
  );
};

export default EditProfileModal;
