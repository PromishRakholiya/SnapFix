import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, PaperClipIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConversationList from './ConversationList';
import ChatMessage from './ChatMessage';
import chatApi from '../../api/chatApi';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import socketService from '../../services/socketService';

const ChatInterface = ({ requestId = null }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchConversations();
    setupSocketListeners();
    
    return () => {
      // Cleanup socket listeners
      socketService.off('new-message');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select conversation when requestId is provided
  useEffect(() => {
    if (requestId && conversations.length > 0) {
      const targetConversation = conversations.find(
        conv => conv.serviceRequest?._id === requestId
      );
      if (targetConversation) {
        setSelectedConversation(targetConversation);
      }
    }
  }, [requestId, conversations]);

  const setupSocketListeners = () => {
    // Listen for new messages
    socketService.onNewMessage((data) => {
      if (selectedConversation) {
        const roomId = selectedConversation.serviceRequest?._id || selectedConversation._id;
        if (data.requestId === roomId || data.chatId === roomId) {
          setMessages(prev => [...prev, data]);
        }
      }
    });
  };

  useEffect(() => {
    if (selectedConversation) {
      const roomId = selectedConversation.serviceRequest?._id || selectedConversation._id;
      fetchMessages(roomId);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await chatApi.getConversations();
      if (response.success) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (serviceRequestId) => {
    try {
      const response = await chatApi.getMessages(serviceRequestId);
      if (response.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleConversationSelect = async (conversation) => {
    // Leave previous request room if any
    if (selectedConversation) {
      const prevRoom = selectedConversation.serviceRequest?._id || selectedConversation._id;
      socketService.leaveRequest(prevRoom);
    }
    
    setSelectedConversation(conversation);
    setMessages([]);
    
    // Join new request room for real-time updates
    if (conversation) {
      const newRoom = conversation.serviceRequest?._id || conversation._id;
      socketService.joinRequest(newRoom);
      
      // Mark messages as read to clear the unread badge
      try {
        await chatApi.markAsRead(newRoom);
        // Refresh conversations to update the unread count badge
        fetchConversations();
      } catch (err) {
        // Non-critical, don't block the UI
        console.warn('markAsRead failed:', err);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const roomId = selectedConversation.serviceRequest?._id || selectedConversation._id;
    const isDirectChat = !selectedConversation.serviceRequest;

    try {
      setSending(true);
      const messageData = {
        content: newMessage.trim(),
        messageType: 'text'
      };

      let response;
      if (isDirectChat) {
        response = await chatApi.sendDirectMessage(selectedConversation._id, messageData);
      } else {
        response = await chatApi.sendMessage(roomId, messageData);
      }

      if (response.success) {
        setMessages(prev => [...prev, response.data]);
        setNewMessage('');
        
        // Update conversation list to show new message
        fetchConversations();
        
        // Also send via socket for real-time delivery
        socketService.sendMessage(
          roomId,
          newMessage.trim(),
          user.role
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = () => {
    if (!selectedConversation) return null;
    
    if (user.role === 'customer') {
      return selectedConversation.mechanic;
    } else {
      return selectedConversation.customer;
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedConversation) return;
    const roomId = selectedConversation.serviceRequest?._id || selectedConversation._id;
    if (!window.confirm('Delete all messages in this chat? This cannot be undone.')) return;
    try {
      await chatApi.deleteChat(roomId);
      setMessages([]);
      fetchConversations();
      toast.success('Chat cleared');
    } catch (err) {
      toast.error('Failed to delete chat');
    }
  };

  const getServiceRequestTitle = (serviceRequest) => {
    if (!serviceRequest) return 'Unknown Request';
    
    const issueTypes = {
      flat_tire: 'Flat Tire',
      battery_dead: 'Dead Battery',
      fuel_empty: 'Out of Fuel',
      engine_trouble: 'Engine Trouble',
      accident: 'Accident',
      key_locked: 'Keys Locked',
      overheating: 'Overheating',
      brake_failure: 'Brake Failure',
      transmission_issue: 'Transmission Issue',
      other: 'Other Issue'
    };
    
    return issueTypes[serviceRequest.issueType] || 'Service Request';
  };

  return (
    <div className="flex h-full bg-white/[0.05] rounded-2xl shadow-soft border">
      {/* Conversation List */}
      <div className="w-1/3 border-r border-white/[0.08] p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Conversations</h2>
        <ConversationList
          conversations={conversations}
          loading={loading}
          onConversationSelect={handleConversationSelect}
          selectedConversationId={selectedConversation?._id}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/[0.08] bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    {getOtherParticipant()?.name || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-neutral-500">
                    {selectedConversation.serviceRequest
                      ? getServiceRequestTitle(selectedConversation.serviceRequest)
                      : 'Direct Message'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">
                    Status: {selectedConversation.serviceRequest?.status || 'Active'}
                  </span>
                  <button
                    onClick={handleDeleteChat}
                    title="Delete chat history"
                    className="p-1.5 text-neutral-500 hover:text-danger-400 hover:bg-danger-500/10 rounded-2xl transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage key={message._id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/[0.08]">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full px-4 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={sending}
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      className="p-1 text-neutral-500 hover:text-neutral-400"
                      title="Attach file"
                    >
                      <PaperClipIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1 text-neutral-500 hover:text-neutral-400"
                      title="Send image"
                    >
                      <PhotoIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-neutral-500 text-lg">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
