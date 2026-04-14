import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    display_name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { login, register, loginLoading, registrationLoading } = useAuth();
  const navigate = useNavigate();
  const loading = loginLoading || registrationLoading;

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (isLogin) {
      // Login: accept email or username
      if (!formData.email.trim()) {
        newErrors.email = 'Email o nombre de usuario requerido';
      }
    } else {
      // Register: require valid email
      if (!formData.email.trim()) {
        newErrors.email = 'Email requerido';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Contraseña requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }
    
    if (!isLogin) {
      if (!formData.username.trim()) {
        newErrors.username = 'Usuario requerido';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Mínimo 3 caracteres';
      }
      
      if (!formData.display_name.trim()) {
        newErrors.display_name = 'Nombre requerido';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setErrors({});

    try {
      let result;
      
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register({
          email: formData.email,
          username: formData.username,
          display_name: formData.display_name,
          password: formData.password
        });
      }

      if (result.success) {
        navigate('/feed');
      } else {
        handleAuthError(result.error);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setErrors({ general: "Error inesperado. Intenta de nuevo." });
    }
  };

  // Handle authentication errors
  const handleAuthError = (error) => {
    let errorMessage = error;
    
    if (error.toLowerCase().includes('incorrect email') || error.toLowerCase().includes('incorrect email/username')) {
      errorMessage = 'Email/usuario o contraseña incorrectos';
    } else if (error.toLowerCase().includes('user already exists') || error.toLowerCase().includes('email already registered')) {
      errorMessage = 'Email ya registrado';
      setErrors({ email: errorMessage });
      return;
    } else if (error.toLowerCase().includes('username already exists')) {
      errorMessage = 'Usuario ya existe';
      setErrors({ username: errorMessage });
      return;
    } else if (error.toLowerCase().includes('social login') || error.toLowerCase().includes('google sign-in')) {
      errorMessage = 'Esta cuenta usa inicio de sesión con Google. Usa el botón de Google.';
    }
    
    setErrors({ general: errorMessage });
  };

  // Toggle between login and register
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      username: '',
      display_name: ''
    });
    setErrors({});
    setShowPassword(false);
  };

  return (
    <div className="h-screen bg-white flex items-center justify-center px-4 md:px-6 overflow-hidden">
      {/* Background geometric elements - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-0 left-0 w-32 h-32 border border-gray-100 rotate-45 -translate-x-16 -translate-y-16" />
        <div className="absolute top-20 right-10 w-16 h-16 border border-gray-200 rounded-full" />
        <div className="absolute bottom-20 left-20 w-24 h-1 bg-black" />
        <div className="absolute bottom-10 right-1/4 w-1 h-20 bg-gray-300" />
      </div>

      <div className="w-full max-w-md md:max-w-lg relative z-10">
        
        {/* Header - Responsive design */}
        <div className="text-center mb-8 md:mb-12">
          {/* Logo personalizado */}
          <div className="inline-flex items-center justify-center mb-10 md:mb-6">
            <img 
              src="/twyk-auth-logo.png"
              alt="Twyk Logo"
              className="w-72 h-72 md:w-48 md:h-48 object-contain"
            />
          </div>
          {/* Title - Hidden on mobile for Twyk style */}
          <h1 className="hidden md:block text-3xl font-bold text-black mb-2">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h1>
          <p className="hidden md:block text-gray-600">
            {isLogin ? 'Accede a tu cuenta' : 'Únete a nosotros'}
          </p>
        </div>

        {/* Form - Twyk style spacing on mobile */}
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
          
          {/* General Error */}
          {errors.general && (
            <div className="p-3 md:p-4 border border-red-500 md:border-black bg-red-50 md:bg-gray-50 rounded-md md:rounded-none flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 md:text-black mt-0.5 flex-shrink-0" />
              <span className="text-red-700 md:text-black text-sm">{errors.general}</span>
            </div>
          )}

          {/* Email/Username Field - Twyk style */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black hidden md:block">
              {isLogin ? 'Email o nombre de usuario' : 'Email'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hidden md:block" />
              <input
                type={isLogin ? 'text' : 'email'}
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full md:pl-10 px-4 py-3 border text-sm md:text-base text-black placeholder-gray-400 bg-gray-50 md:bg-white rounded-md md:rounded-none focus:outline-none focus:border-purple-600 md:focus:border-black transition-colors ${
                  errors.email ? 'border-red-500' : 'border-gray-300 md:border-gray-200'
                }`}
                placeholder={isLogin ? 'username or email' : 'Email'}
                disabled={loading}
                autoComplete={isLogin ? 'username' : 'email'}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs">{errors.email}</p>
            )}
          </div>

          {/* Register-only fields */}
          {!isLogin && (
            <>
              {/* Username Field - Twyk style */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black hidden md:block">
                  Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hidden md:block" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full md:pl-10 px-4 py-3 border text-sm md:text-base text-black placeholder-gray-400 bg-gray-50 md:bg-white rounded-md md:rounded-none focus:outline-none focus:border-purple-600 md:focus:border-black transition-colors ${
                      errors.username ? 'border-red-500' : 'border-gray-300 md:border-gray-200'
                    }`}
                    placeholder="username"
                    disabled={loading}
                  />
                </div>
                {errors.username && (
                  <p className="text-red-500 text-xs">{errors.username}</p>
                )}
              </div>

              {/* Display Name Field - Twyk style */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black hidden md:block">
                  Nombre
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hidden md:block" />
                  <input
                    type="text"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleChange}
                    className={`w-full md:pl-10 px-4 py-3 border text-sm md:text-base text-black placeholder-gray-400 bg-gray-50 md:bg-white rounded-md md:rounded-none focus:outline-none focus:border-purple-600 md:focus:border-black transition-colors ${
                      errors.display_name ? 'border-red-500' : 'border-gray-300 md:border-gray-200'
                    }`}
                    placeholder="Full Name"
                    disabled={loading}
                  />
                </div>
                {errors.display_name && (
                  <p className="text-red-500 text-xs">{errors.display_name}</p>
                )}
              </div>
            </>
          )}

          {/* Password Field - Twyk style */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black hidden md:block">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hidden md:block" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full md:pl-10 px-4 pr-12 py-3 border text-sm md:text-base text-black placeholder-gray-400 bg-gray-50 md:bg-white rounded-md md:rounded-none focus:outline-none focus:border-purple-600 md:focus:border-black transition-colors ${
                  errors.password ? 'border-red-500' : 'border-gray-300 md:border-gray-200'
                }`}
                placeholder="Password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 md:hover:text-black transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs">{errors.password}</p>
            )}
          </div>

          {/* Forgot Password - Mobile only, Twyk style */}
          {isLogin && (
            <div className="text-right md:hidden -mt-2">
              <button
                type="button"
                className="text-sm text-purple-600 font-semibold hover:text-purple-800 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button - Purple on mobile, Black on desktop */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 md:bg-black text-white py-3.5 md:py-4 font-semibold rounded-lg md:rounded-none hover:bg-purple-700 md:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-600 md:focus:ring-black focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading 
              ? (isLogin ? 'Iniciando...' : 'Creando...') 
              : (isLogin ? 'Log in' : 'Sign up')
            }
          </button>

          {/* Divider */}
          <div className="relative my-6 md:my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 md:border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-semibold md:font-normal">OR</span>
            </div>
          </div>

          {/* Google OAuth Button - Twyk style on mobile */}
          <button
            type="button"
            onClick={() => {
              const currentUrl = window.location.origin;
              const redirectUrl = `${currentUrl}/profile`;
              const googleAuthUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
              window.location.href = googleAuthUrl;
            }}
            disabled={loading}
            className="w-full border border-purple-600 md:border-2 md:border-black text-purple-600 md:text-black py-3 md:py-4 font-semibold md:font-medium rounded-lg md:rounded-none hover:bg-purple-50 md:hover:bg-black md:hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-600 md:focus:ring-black focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
            </svg>
            <span className="hidden md:inline">Continuar con Google</span>
            <span className="md:hidden">Log in with Google</span>
          </button>
        </form>

        {/* Toggle Auth Mode - Twyk style on mobile */}
        <div className="mt-6 md:mt-8 text-center">
          <p className="text-gray-600 text-sm md:text-base">
            {isLogin ? (
              <>
                <span className="hidden md:inline">¿No tienes cuenta?</span>
                <span className="md:hidden">Don't have an account?</span>
              </>
            ) : (
              <>
                <span className="hidden md:inline">¿Ya tienes cuenta?</span>
                <span className="md:hidden">Have an account?</span>
              </>
            )}
            {' '}
            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              className="text-purple-600 md:text-black font-semibold md:font-medium hover:underline transition-colors disabled:opacity-50"
            >
              {isLogin ? (
                <>
                  <span className="hidden md:inline">Crear una</span>
                  <span className="md:hidden">Sign up</span>
                </>
              ) : (
                <>
                  <span className="hidden md:inline">Iniciar sesión</span>
                  <span className="md:hidden">Log in</span>
                </>
              )}
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-xs">
            Al continuar, aceptas nuestros términos y política de privacidad
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;