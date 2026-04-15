const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

class NotificationApiService {
  getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getNotifications(limit = 50) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications?limit=${limit}`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async getUnreadCount() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch unread count');
      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async markAllAsRead() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/mark-read`, {
        method: 'PUT',
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
}

const notificationApiService = new NotificationApiService();
export default notificationApiService;
