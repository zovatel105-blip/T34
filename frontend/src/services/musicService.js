/**
 * Music Service - Handles all music-related API calls
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

class MusicService {
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

  // Search for music
  async searchMusic(query, limit = 200) {
    try {
      const params = new URLSearchParams({
        query,
        limit: limit.toString()
      });

      const response = await fetch(`${this.baseURL}/music/search-realtime?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Music search error:', error);
      throw error;
    }
  }

  // Search music by artist and track
  async searchMusicByArtistTrack(artist, track) {
    try {
      const params = new URLSearchParams({
        artist,
        ...(track && { track })
      });

      const response = await fetch(`${this.baseURL}/music/search?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Music search by artist/track error:', error);
      throw error;
    }
  }

  // Get trending music
  async getTrendingMusic(limit = 20) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });

      const response = await fetch(`${this.baseURL}/music/trending?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get trending music error:', error);
      throw error;
    }
  }

  // Get music by ID
  async getMusicById(musicId) {
    try {
      const response = await fetch(`${this.baseURL}/music/${musicId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get music by ID error:', error);
      throw error;
    }
  }
}

export default new MusicService();