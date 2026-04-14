import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AppConfig from '../config/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Authentication states
const AUTH_STATES = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated', 
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error'
};

// Error types for better error handling
const ERROR_TYPES = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  VALIDATION: 'validation',
  SERVER: 'server',
  UNKNOWN: 'unknown'
};

export const AuthProvider = ({ children }) => {
  // Core authentication state
  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Registration/Login specific state
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Get backend URL with fallback
  const getBackendUrl = useCallback(() => {
    // Debug: Log what we're getting from different sources
    const envUrl = process.env.REACT_APP_BACKEND_URL;
    const configUrl = AppConfig.BACKEND_URL;
    
    console.log('🔍 DEBUG - Backend URL sources:', {
      'process.env.REACT_APP_BACKEND_URL': envUrl,
      'AppConfig.BACKEND_URL': configUrl
    });
    
    // Return the URL with proper fallback
    return envUrl || configUrl || 'http://localhost:8001';
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Set auth data in state and localStorage
  const setAuthData = useCallback((userData, tokenData) => {
    try {
      // Validate required data
      if (!userData || !tokenData) {
        throw new Error('Missing user data or token');
      }

      // Set state
      setUser(userData);
      setToken(tokenData);
      setAuthState(AUTH_STATES.AUTHENTICATED);
      
      // Save to localStorage with error handling
      try {
        localStorage.setItem('token', tokenData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (storageError) {
        console.warn('Failed to save auth data to localStorage:', storageError);
        // Continue anyway - the session will work but won't persist
      }
    } catch (error) {
      console.error('Error setting auth data:', error);
      setError({
        type: ERROR_TYPES.UNKNOWN,
        message: 'Failed to set authentication data'
      });
    }
  }, []);

  // Clear auth data
  const clearAuthData = useCallback(() => {
    setUser(null);
    setToken(null);
    setAuthState(AUTH_STATES.UNAUTHENTICATED);
    setError(null);
    
    // Clear localStorage
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId'); // Legacy cleanup
    } catch (storageError) {
      console.warn('Failed to clear localStorage:', storageError);
    }
  }, []);

  // Make authenticated API request
  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    // Check if using demo token - if so, pass through to real backend
    const isDemoToken = token && token.startsWith('demo_token_');
    
    const backendUrl = getBackendUrl();
    const fullUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // For demo token, we'll still pass it but the backend will handle demo users
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    };

    // Auto-serialize body to JSON if it's an object and not FormData
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    // Debug logging
    if (url.includes('/api/messages') || isDemoToken) {
      console.log('🔍 DEBUG makeAuthenticatedRequest - URL:', fullUrl);
      console.log('🔍 DEBUG makeAuthenticatedRequest - Headers:', config.headers);
      console.log('🔍 DEBUG makeAuthenticatedRequest - Is Demo:', isDemoToken);
    }

    try {
      const response = await fetch(fullUrl, config);
      
      // Handle 401 - token expired (but not for demo users)
      if (response.status === 401 && !isDemoToken) {
        clearAuthData();
        throw new Error('Session expired. Please login again.');
      }
      
      return response;
    } catch (fetchError) {
      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      throw fetchError;
    }
  }, [token, getBackendUrl, clearAuthData]);

  // Parse and categorize errors
  const parseError = useCallback((error, response = null) => {
    let errorType = ERROR_TYPES.UNKNOWN;
    let errorMessage = 'An unexpected error occurred';

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorType = ERROR_TYPES.NETWORK;
      errorMessage = 'Network connection failed. Please check your internet connection.';
    } else if (response) {
      if (response.status >= 500) {
        errorType = ERROR_TYPES.SERVER;
        errorMessage = 'Server error. Please try again later.';
      } else if (response.status === 401) {
        errorType = ERROR_TYPES.AUTHENTICATION;
        errorMessage = 'Invalid credentials. Please check your email and password.';
      } else if (response.status === 400 || response.status === 422) {
        errorType = ERROR_TYPES.VALIDATION;
        errorMessage = error.message || 'Invalid data provided. Please check all required fields.';
      }
    } else {
      errorMessage = error.message || errorMessage;
    }

    return { type: errorType, message: errorMessage };
  }, []);

  // Enhanced register function with comprehensive error handling
  const register = useCallback(async (userData) => {
    setRegistrationLoading(true);
    setError(null);
    
    try {
      // Input validation
      if (!userData.email || !userData.password || !userData.username) {
        throw new Error('Email, username, and password are required');
      }

      if (!userData.display_name || !userData.display_name.trim()) {
        throw new Error('Display name is required');
      }

      if (userData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new Error('Please enter a valid email address');
      }

      const backendUrl = getBackendUrl();
      const registerUrl = `${backendUrl}/api/auth/register`;
      
      console.log('🔍 REGISTER ATTEMPT:', {
        url: registerUrl,
        userData: { ...userData, password: '[HIDDEN]' }
      });

      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          throw new Error(`Registration failed: HTTP ${response.status}`);
        }
        
        // Handle specific backend errors
        if (errorData.detail) {
          if (errorData.detail.toLowerCase().includes('email already registered') || 
              errorData.detail.toLowerCase().includes('user already exists')) {
            throw new Error('This email address is already registered. Please use a different email or try logging in.');
          } else if (errorData.detail.toLowerCase().includes('username already exists')) {
            throw new Error('This username is already taken. Please choose a different username.');
          } else {
            throw new Error(errorData.detail);
          }
        } else if (response.status === 422 && errorData.errors) {
          // Handle FastAPI validation errors (422)
          const validationErrors = errorData.errors.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
          throw new Error(`Validation error: ${validationErrors}`);
        } else if (response.status === 422) {
          // Generic 422 handling
          throw new Error('Invalid data provided. Please check all required fields are filled correctly.');
        } else {
          throw new Error(`Registration failed: ${response.statusText || 'Unknown error'}`);
        }
      }

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        throw new Error('Server returned invalid response. Please try again.');
      }

      // Validate response data
      if (!responseData.access_token || !responseData.user) {
        throw new Error('Invalid response from server. Please try again.');
      }

      console.log('✅ REGISTRATION SUCCESSFUL:', {
        user: responseData.user.email,
        hasToken: !!responseData.access_token
      });

      // Set auth data
      setAuthData(responseData.user, responseData.access_token);
      
      return { 
        success: true, 
        user: responseData.user,
        message: 'Account created successfully!'
      };

    } catch (error) {
      console.error('❌ REGISTRATION ERROR:', error);
      
      const parsedError = parseError(error);
      setError(parsedError);
      
      return { 
        success: false, 
        error: parsedError.message,
        errorType: parsedError.type
      };
    } finally {
      setRegistrationLoading(false);
    }
  }, [getBackendUrl, setAuthData, parseError]);

  // Enhanced login function
  const login = useCallback(async (identifier, password) => {
    setLoginLoading(true);
    setError(null);
    
    try {
      // Input validation
      if (!identifier || !password) {
        throw new Error('Email/username and password are required');
      }

      const backendUrl = getBackendUrl();
      const loginUrl = `${backendUrl}/api/auth/login`;
      
      console.log('🔍 LOGIN ATTEMPT:', { identifier, url: loginUrl });

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: identifier, password }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          throw new Error(`Login failed: HTTP ${response.status}`);
        }
        
        if (errorData.detail) {
          if (errorData.detail.toLowerCase().includes('incorrect email or password') ||
              errorData.detail.toLowerCase().includes('invalid credentials')) {
            throw new Error('Incorrect email or password. Please check your credentials and try again.');
          } else {
            throw new Error(errorData.detail);
          }
        } else {
          throw new Error(`Login failed: ${response.statusText || 'Unknown error'}`);
        }
      }

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        throw new Error('Server returned invalid response. Please try again.');
      }

      // Validate response data
      if (!responseData.access_token || !responseData.user) {
        throw new Error('Invalid response from server. Please try again.');
      }

      console.log('✅ LOGIN SUCCESSFUL:', {
        user: responseData.user.email,
        hasToken: !!responseData.access_token
      });

      // Set auth data
      setAuthData(responseData.user, responseData.access_token);
      
      return { 
        success: true, 
        user: responseData.user,
        message: 'Login successful!'
      };

    } catch (error) {
      console.error('❌ LOGIN ERROR:', error);
      
      const parsedError = parseError(error);
      setError(parsedError);
      
      return { 
        success: false, 
        error: parsedError.message,
        errorType: parsedError.type
      };
    } finally {
      setLoginLoading(false);
    }
  }, [getBackendUrl, setAuthData, parseError]);

  // Verify token with backend
  const verifyToken = useCallback(async (tokenToVerify) => {
    try {
      // If it's a demo token, automatically validate with demo user data
      if (tokenToVerify && tokenToVerify.startsWith('demo_token_')) {
        console.log('✅ Validating demo token automatically');
        const demoUser = {
          id: 'demo-user-2025',
          email: 'demo@example.com',
          username: 'demo_user',
          display_name: 'Demo User',
          bio: '🎯 Usuario Demo - Funcionalidad Completa',
          profile_image: null,
          created_at: new Date().toISOString(),
          followers_count: 42,
          following_count: 18,
          posts_count: 15
        };
        return { valid: true, user: demoUser };
      }

      const response = await makeAuthenticatedRequest('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return { valid: true, user: userData };
      } else {
        return { valid: false };
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return { valid: false };
    }
  }, [makeAuthenticatedRequest]);

  // Create automatic demo user session
  const createDemoUserSession = useCallback(async () => {
    try {
      console.log('🎯 Creating automatic demo user session...');
      
      // Demo user data
      const demoUser = {
        id: 'demo-user-2025',
        email: 'demo@example.com',
        username: 'demo_user',
        display_name: 'Demo User',
        bio: '🎯 Usuario Demo - Funcionalidad Completa',
        profile_image: null,
        created_at: new Date().toISOString(),
        followers_count: 42,
        following_count: 18,
        posts_count: 15
      };
      
      // Generate a demo token
      const demoToken = `demo_token_${Date.now()}`;
      
      console.log('✅ Demo user session created successfully:', {
        user: demoUser.display_name,
        email: demoUser.email
      });
      
      // Set auth data with demo user
      setAuthData(demoUser, demoToken);
      
    } catch (error) {
      console.error('❌ Error creating demo user session:', error);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
    }
  }, [setAuthData]);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      setAuthState(AUTH_STATES.LOADING);
      
      try {
        // Check for OAuth session in URL fragment first
        const fragment = window.location.hash.substring(1);
        const params = new URLSearchParams(fragment);
        const sessionId = params.get('session_id');
        
        if (sessionId) {
          try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/auth/oauth/google`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ session_id: sessionId }),
            });

            if (response.ok) {
              const data = await response.json();
              setAuthData(data.user, data.access_token);
              
              // Clear the hash from URL
              window.location.hash = '';
              return;
            }
          } catch (oauthError) {
            console.error('OAuth authentication error:', oauthError);
          }
        }
        
        // Check stored credentials
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (savedToken && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            const { valid, user: verifiedUser } = await verifyToken(savedToken);
            
            if (valid && verifiedUser) {
              setAuthData(verifiedUser, savedToken);
            } else {
              // Token is invalid, clear storage
              clearAuthData();
            }
          } catch (error) {
            console.error('Stored auth data is invalid:', error);
            clearAuthData();
          }
        } else {
          // No saved credentials, user needs to login manually
          setAuthState(AUTH_STATES.UNAUTHENTICATED);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError({
          type: ERROR_TYPES.UNKNOWN,
          message: 'Failed to initialize authentication'
        });
        setAuthState(AUTH_STATES.ERROR);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [getBackendUrl, setAuthData, clearAuthData, verifyToken, createDemoUserSession]);

  // Logout function
  const logout = useCallback(() => {
    clearAuthData();
  }, [clearAuthData]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await makeAuthenticatedRequest('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [token, makeAuthenticatedRequest]);

  // Update user profile
  const updateUser = useCallback(async (updateData) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await makeAuthenticatedRequest('/api/auth/profile', {
        method: 'PUT',
        body: updateData,
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [token, makeAuthenticatedRequest]);

  // Get auth headers
  const getAuthHeaders = useCallback(() => {
    if (!token) return {};
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, [token]);

  // Legacy API request method for backward compatibility
  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const response = await makeAuthenticatedRequest(endpoint, options);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }, [makeAuthenticatedRequest]);

  // Computed properties
  const isAuthenticated = authState === AUTH_STATES.AUTHENTICATED;
  const isLoading = loading || authState === AUTH_STATES.LOADING;

  const value = {
    // State
    isAuthenticated,
    user,
    token,
    loading: isLoading,
    error,
    authState,
    registrationLoading,
    loginLoading,
    
    // Actions
    login,
    register,
    logout,
    refreshUser,
    updateUser,
    clearError,
    
    // Utilities
    getAuthHeaders,
    apiRequest, // Legacy compatibility
    makeAuthenticatedRequest,
    
    // Constants
    AUTH_STATES,
    ERROR_TYPES
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};