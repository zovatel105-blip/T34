/**
 * Comment Service - Handles all comment-related API calls
 */
import { queuedFetch, isNetworkError } from './offlineQueueService';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

class CommentService {
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

  // Get comments for a poll
  async getComments(pollId, offset = 0, limit = 20) {
    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${this.baseURL}/polls/${pollId}/comments?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.warn('Could not parse error response JSON:', e);
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Get comments error:', error);
      // Asegurar que siempre se lanza un Error con un mensaje string
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  // Create a comment (offline-aware). Accepts optional { optimistic } with
  // a shape similar al del backend (id temporal, author, content, etc.)
  // para que el caller no tenga que distinguir online vs queued.
  async createComment(pollId, commentData, { optimistic } = {}) {
    try {
      const token = localStorage.getItem('token');
      const result = await queuedFetch({
        type: 'comment_create',
        resourceKey: `poll:${pollId}:comment`,
        endpoint: `${this.baseURL}/polls/${pollId}/comments`,
        method: 'POST',
        body: commentData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        optimistic: optimistic || {},
        requiresAuth: true,
      });
      return result;
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Create comment error:', error);
      }
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
  }

  // Like a comment (offline-aware).
  async toggleCommentLike(commentId, { optimistic } = {}) {
    try {
      const token = localStorage.getItem('token');
      const result = await queuedFetch({
        type: 'comment_like_toggle',
        resourceKey: `comment:${commentId}:like`,
        endpoint: `${this.baseURL}/comments/${commentId}/like`,
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        optimistic: optimistic || {},
        requiresAuth: true,
      });
      return result;
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Toggle comment like error:', error);
      }
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
  }

  // Delete a comment
  async deleteComment(commentId) {
    try {
      const response = await fetch(`${this.baseURL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.warn('Could not parse error response JSON:', e);
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Delete comment error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  // Update a comment
  async updateComment(commentId, commentData) {
    try {
      const response = await fetch(`${this.baseURL}/comments/${commentId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(commentData)
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.warn('Could not parse error response JSON:', e);
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Update comment error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  // Frontend-friendly method to get comments (alias for getComments)
  async getCommentsForFrontend(pollId, limit = 20, offset = 0) {
    return this.getComments(pollId, offset, limit);
  }

  // Frontend-friendly method to add comment (alias for createComment)
  async addCommentForFrontend(pollId, content, parentId = null) {
    const commentData = {
      poll_id: pollId,
      content,
      ...(parentId && { parent_comment_id: parentId })
    };
    return this.createComment(pollId, commentData);
  }
}

export default new CommentService();