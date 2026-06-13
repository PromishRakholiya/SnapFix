import apiClient from './apiClient';

class ChatApi {
  // Get all conversations for the current user
  async getConversations() {
    try {
      const response = await apiClient.get('/chat/conversations');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get conversations' };
    }
  }

  // Get or create a conversation for a specific service request
  async getOrCreateConversation(serviceRequestId) {
    try {
      const response = await apiClient.get(`/chat/conversations/${serviceRequestId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get conversation' };
    }
  }

  // Get messages from a conversation with pagination
  async getMessages(serviceRequestId, page = 1, limit = 50) {
    try {
      const response = await apiClient.get(`/chat/conversations/${serviceRequestId}/messages`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get messages' };
    }
  }

  // Send a message on a service-request-based chat
  async sendMessage(serviceRequestId, messageData) {
    try {
      const response = await apiClient.post(`/chat/conversations/${serviceRequestId}/messages`, messageData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send message' };
    }
  }

  // Mark messages as read
  async markAsRead(id) {
    try {
      const response = await apiClient.post(`/chat/conversations/${id}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark messages as read' };
    }
  }

  // Find or create a direct chat with a mechanic (NO service request created)
  async createDirectChat(mechanicId) {
    try {
      const response = await apiClient.post('/chat/direct-chat', { mechanicId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create direct chat' };
    }
  }

  // Send a message in a direct chat by chatId
  async sendDirectMessage(chatId, messageData) {
    try {
      const response = await apiClient.post(`/chat/direct-chat/${chatId}/messages`, messageData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send message' };
    }
  }

  // Delete/clear all messages in a chat
  async deleteChat(chatId) {
    try {
      const response = await apiClient.delete(`/chat/delete/${chatId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete chat' };
    }
  }
}

const chatApi = new ChatApi();
export default chatApi;
