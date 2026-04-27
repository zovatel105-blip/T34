import { formatApiError } from '../utils/apiErrorHandler';
import { queuedFetch, isNetworkError } from './offlineQueueService';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

class UserService {
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

  // Auto-detect if parameter is ID vs username
  async getUserProfile(userParam) {
    try {
      let endpoint;
      
      // Simple heuristic: if it's a long string with dashes, treat as ID
      // Otherwise treat as username
      if (userParam.includes('-') && userParam.length > 20) {
        endpoint = `/user/profile/${userParam}`;
      } else {
        endpoint = `/user/profile/by-username/${userParam}`;
      }
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Usuario no encontrado');
        }
        const errorData = await response.json();
        const errorMessage = formatApiError(errorData, response.status);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await fetch(`${this.baseURL}/user/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = formatApiError(errorData, response.status);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async getCurrentUserProfile() {
    try {
      const response = await fetch(`${this.baseURL}/user/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Perfil no encontrado');
        }
        const errorData = await response.json();
        const errorMessage = formatApiError(errorData, response.status);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting current user profile:', error);
      throw error;
    }
  }

  async followUser(userId, { optimistic } = {}) {
    try {
      const token = localStorage.getItem('token');
      const result = await queuedFetch({
        // follow y unfollow se consideran mutuamente inversos:
        // si el usuario hace follow → unfollow → follow sin red, los toggles
        // se irán cancelando. Para eso reutilizamos el mismo resource_key y
        // type 'like_toggle'? No: follow no es propiamente toggle en el API
        // (son dos endpoints). Usamos types distintos; la cancelación natural
        // ocurre porque quedan dos entradas pero al flushear se ejecutan
        // en orden → resultado final correcto.
        type: 'follow',
        resourceKey: `user:${userId}:follow`,
        endpoint: `${this.baseURL}/users/${userId}/follow`,
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        optimistic: optimistic || {},
        requiresAuth: true,
      });
      return result;
    } catch (error) {
      if (!isNetworkError(error)) {
        // errores HTTP reales: log + re-throw con mensaje amigable
        try {
          const msg = formatApiError({ detail: error.message }, error.status || 500);
          throw new Error(msg);
        } catch (e) { throw e; }
      }
      console.error('Error following user:', error);
      throw error;
    }
  }

  async unfollowUser(userId, { optimistic } = {}) {
    try {
      const token = localStorage.getItem('token');
      const result = await queuedFetch({
        type: 'unfollow',
        resourceKey: `user:${userId}:follow`,
        endpoint: `${this.baseURL}/users/${userId}/unfollow`,
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        optimistic: optimistic || {},
        requiresAuth: true,
      });
      return result;
    } catch (error) {
      if (!isNetworkError(error)) {
        try {
          const msg = formatApiError({ detail: error.message }, error.status || 500);
          throw new Error(msg);
        } catch (e) { throw e; }
      }
      console.error('Error unfollowing user:', error);
      throw error;
    }
  }

  async getFollowing(userId) {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}/following`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = formatApiError(errorData, response.status);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting following users:', error);
      throw error;
    }
  }
}

export default new UserService();