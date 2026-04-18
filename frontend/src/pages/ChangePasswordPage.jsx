import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [formData, setFormData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.current_password) newErrors.current_password = 'La contraseña actual es requerida';
    if (!formData.new_password) newErrors.new_password = 'La nueva contraseña es requerida';
    else if (formData.new_password.length < 6) newErrors.new_password = 'Mínimo 6 caracteres';
    if (!formData.confirm_password) newErrors.confirm_password = 'Confirma la nueva contraseña';
    else if (formData.new_password !== formData.confirm_password) newErrors.confirm_password = 'Las contraseñas no coinciden';
    if (formData.current_password === formData.new_password && formData.new_password) newErrors.new_password = 'Debe ser diferente a la actual';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await apiRequest('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: formData.current_password, new_password: formData.new_password })
      });
      if (response.ok) {
        toast({ title: "¡Contraseña actualizada!", description: "Tu contraseña se ha cambiado exitosamente", variant: "default" });
        navigate(-1);
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.detail?.includes('incorrect')) {
          setErrors({ current_password: 'La contraseña actual es incorrecta' });
        } else {
          toast({ title: "Error", description: errorData.detail || "No se pudo cambiar la contraseña", variant: "destructive" });
        }
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({ title: "Error de conexión", description: "No se pudo conectar con el servidor", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({ label, field, placeholder }) => (
    <div className="p-4 rounded-2xl bg-gray-50">
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        <input
          type={showPasswords[field] ? 'text' : 'password'}
          value={formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholder}
          className={`w-full text-base font-medium text-gray-900 placeholder-gray-300 bg-transparent border-0 focus:outline-none pr-8 ${errors[field] ? 'text-red-600' : ''}`}
        />
        <button
          type="button"
          onClick={() => togglePasswordVisibility(field)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          {showPasswords[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {errors[field] && <p className="text-xs text-red-500 mt-2">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
        </button>
        <h2 className="font-semibold text-gray-900 text-base">Cambiar contraseña</h2>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <form id="change-password-form" onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          <PasswordField label="Contraseña actual" field="current_password" placeholder="Ingresa tu contraseña actual" />
          <PasswordField label="Nueva contraseña" field="new_password" placeholder="Ingresa una nueva contraseña" />
          <PasswordField label="Confirmar contraseña" field="confirm_password" placeholder="Confirma tu nueva contraseña" />

          <div className="p-3 bg-blue-50 rounded-2xl mt-1">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-600">
                Usa una contraseña única con letras, números y símbolos. Mínimo 6 caracteres.
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Bottom buttons */}
      <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex-1 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="change-password-form"
          disabled={loading}
          className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin mr-2" />Cambiando...</span>
          ) : (
            'Cambiar'
          )}
        </button>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
