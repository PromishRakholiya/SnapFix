import React, { useState, useEffect, useRef } from 'react';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  PhotoIcon, 
  TrashIcon, 
  ArrowLeftIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
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

  const quickReplies = [
    "What is your ETA?",
    "I am at the shared location.",
    "Call me when you are nearby.",
    "Thank you!"
  ];

  useEffect(() => {
    fetchConversations();
    setupSocketListeners();
    
    return () => {
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
    if (selectedConversation) {
      const prevRoom = selectedConversation.serviceRequest?._id || selectedConversation._id;
      socketService.leaveRequest(prevRoom);
    }
    
    setSelectedConversation(conversation);
    setMessages([]);
    
    if (conversation) {
      const newRoom = conversation.serviceRequest?._id || conversation._id;
      socketService.joinRequest(newRoom);
      
      try {
        await chatApi.markAsRead(newRoom);
        fetchConversations();
      } catch (err) {
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
        fetchConversations();
        
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
    return user.role === 'customer'
      ? selectedConversation.mechanic
      : selectedConversation.customer;
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
    if (!serviceRequest) return 'Direct Message';
    const issueTypes = {
      flat_tire: 'Flat Tire Repair',
      battery_dead: 'Dead Battery Jumpstart',
      fuel_empty: 'Out of Fuel Delivery',
      engine_trouble: 'Engine Diagnostics',
      accident: 'Accident Assistance',
      key_locked: 'Keys Locked Out',
      overheating: 'Engine Overheating',
      brake_failure: 'Brake Repair',
      transmission_issue: 'Transmission Service',
      other: 'General Repair'
    };
    return issueTypes[serviceRequest.issueType] || 'Service Request';
  };

  const participant = getOtherParticipant();

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#0d0d0d] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
      {/* Conversation List Sidebar */}
      <div 
        className={`w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-white/[0.08] p-4 flex flex-col ${
          selectedConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-red-500" />
            <span>Conversations</span>
          </h2>
          <span className="text-[11px] font-bold text-neutral-400 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.08]">
            {conversations.length} Active
          </span>
        </div>

        <ConversationList
          conversations={conversations}
          loading={loading}
          onConversationSelect={handleConversationSelect}
          selectedConversationId={selectedConversation?._id}
        />
      </div>

      {/* Main Chat Window Panel */}
      <div 
        className={`flex-1 flex-col h-full bg-[#080808] min-w-0 ${
          selectedConversation ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Header Bar */}
            <div className="p-3.5 sm:p-4 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-xl border border-red-500/20 shrink-0 transition-all"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                {/* Mechanic Avatar & Details */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center font-bold text-xs text-black shadow-md">
                    {participant?.name 
                      ? participant.name.split(" ").map(n => n[0]).slice(0, 2).join("") 
                      : "M"}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#090909] rounded-full" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-white truncate">
                      {participant?.name || 'Verified Mechanic'}
                    </h3>
                    <ShieldCheckIcon className="w-4 h-4 text-emerald-400 shrink-0" title="Verified Provider" />
                  </div>
                  <p className="text-xs text-neutral-400 truncate">
                    {getServiceRequestTitle(selectedConversation.serviceRequest)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {participant?.phone && (
                  <a
                    href={`tel:${participant.phone}`}
                    className="p-2 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all"
                    title="Call Mechanic"
                  >
                    <PhoneIcon className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={handleDeleteChat}
                  title="Clear chat messages"
                  className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] rounded-xl transition-all"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-3">
                    <SparklesIcon className="w-6 h-6" />
                  </div>
                  <p className="text-white font-bold text-sm">Conversation Started</p>
                  <p className="text-neutral-400 text-xs mt-1">
                    Send a message to {participant?.name || 'the mechanic'} regarding your service request.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <ChatMessage key={message._id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Quick Reply Suggestion Chips */}
            <div className="px-4 py-2 bg-white/[0.01] border-t border-white/[0.04] flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-neutral-500 uppercase font-bold shrink-0">Quick:</span>
              {quickReplies.map((reply, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNewMessage(reply)}
                  className="text-xs text-neutral-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] px-3 py-1 rounded-full whitespace-nowrap transition-all"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-[#0d0d0d]">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full pl-4 pr-10 py-3 bg-white/[0.03] border border-white/[0.1] rounded-2xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition-all"
                    disabled={sending}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-neutral-500">
                    <button
                      type="button"
                      className="hover:text-neutral-300 transition-colors"
                      title="Attach file"
                    >
                      <PaperClipIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="hover:text-neutral-300 transition-colors"
                      title="Attach photo"
                    >
                      <PhotoIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold px-4 py-3 rounded-2xl text-xs sm:text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-500/20 shrink-0"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State when no conversation selected on desktop */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center text-red-400 mb-4">
              <ChatBubbleLeftRightIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Conversation Selected</h3>
            <p className="text-neutral-400 text-xs max-w-sm leading-relaxed">
              Select a verified mechanic from the left sidebar to view messages, share location updates, or ask about your service request status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
