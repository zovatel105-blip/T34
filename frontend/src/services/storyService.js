import AppConfig from '../config/config';

const API_URL = AppConfig.BACKEND_URL;

class StoryService {
  // Get stories from followed users
  async getStories() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/stories`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stories');
    }
    
    return response.json();
  }

  // Get stories from a specific user
  async getUserStories(userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/stories/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // No stories found
      }
      throw new Error('Failed to fetch user stories');
    }
    
    return response.json();
  }

  // Check if user has active stories
  async checkUserHasStories(userId) {
    try {
      const stories = await this.getUserStories(userId);
      return stories && stories.total_stories > 0;
    } catch (error) {
      return false;
    }
  }

  // Create a new story
  async createStory(storyData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/stories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(storyData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create story');
    }
    
    return response.json();
  }

  // Upload story media file
  async uploadStoryMedia(file) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/api/stories/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload story media');
    }
    
    return response.json();
  }

  // Mark story as viewed
  async viewStory(storyId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/stories/${storyId}/view`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark story as viewed');
    }
    
    return response.json();
  }

  // Delete a story
  async deleteStory(storyId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/stories/${storyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete story');
    }
    
    return response.json();
  }

  // Get story viewers (only owner can see)
  async getStoryViewers(storyId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/stories/${storyId}/viewers`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch story viewers');
    }
    
    return response.json();
  }
}

export default new StoryService();
