import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  PaperAirplaneIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import chatApi from "../../api/chatApi";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import socketService from "../../services/socketService";

const ChatModal = ({ isOpen, onClose, mechanic, serviceRequestId = null }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState(null); // direct chat id (no service request)
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && mechanic) {
      initializeChat();
    }
    return () => {
      // Cleanup: leave socket room when modal closes
      if (chatId) {
        socketService.leaveRequest(chatId);
        socketService.off("new-message");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mechanic, serviceRequestId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const setupSocketListeners = (roomId) => {
    socketService.joinRequest(roomId);
    socketService.onNewMessage((data) => {
      const incomingRoom = data.chatId || data.requestId;
      if (incomingRoom === roomId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m._id && m._id === data._id)) return prev;
          return [...prev, data];
        });
      }
    });
  };

  const deleteChat = async () => {
    const id = chatId || serviceRequestId;
    if (!id) return;
    if (
      !window.confirm(
        "Are you sure you want to delete all messages in this chat? This cannot be undone.",
      )
    )
      return;
    try {
      await chatApi.deleteChat(id);
      setMessages([]);
      toast.success("Chat cleared successfully");
    } catch (err) {
      toast.error("Failed to delete chat");
    }
  };

  const initializeChat = async () => {
    try {
      setLoading(true);

      if (serviceRequestId) {
        // Tied to a real service request
        const response =
          await chatApi.getOrCreateConversation(serviceRequestId);
        if (response.success) {
          setMessages(response.data.messages || []);
          setupSocketListeners(serviceRequestId);
        }
      } else {
        // Pure direct chat — no service request at all
        const response = await chatApi.createDirectChat(mechanic._id);
        if (response.success) {
          const chat = response.data;
          setChatId(chat._id);
          setMessages(chat.messages || []);
          setupSocketListeners(chat._id);
        } else {
          toast.error("Could not start chat. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
      toast.error("Failed to load chat. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage("");

    // Optimistically add the message to UI
    const tempMsg = {
      _id: `temp-${Date.now()}`,
      sender: { _id: user.id, name: user.name },
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      setSending(true);

      let response;
      if (chatId) {
        // Direct chat: use chatId-based endpoint (no service request)
        response = await chatApi.sendDirectMessage(chatId, {
          content,
          messageType: "text",
        });
        if (response.success) {
          // Replace temp with real message
          setMessages((prev) =>
            prev.map((m) => (m._id === tempMsg._id ? response.data : m)),
          );
          // Emit via socket for real-time delivery
          socketService.sendMessage(chatId, content, user.role);
        } else {
          throw new Error(response.message || "Failed to send");
        }
      } else if (serviceRequestId) {
        // Service-request chat
        response = await chatApi.sendMessage(serviceRequestId, {
          content,
          messageType: "text",
        });
        if (response.success) {
          setMessages((prev) =>
            prev.map((m) => (m._id === tempMsg._id ? response.data : m)),
          );
          socketService.sendMessage(serviceRequestId, content, user.role);
        } else {
          throw new Error(response.message || "Failed to send");
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
      // Remove the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
    } finally {
      setSending(false);
    }
  };

  const isOwnMessage = (message) => {
    const senderId =
      message.sender?._id || message.sender?.id || message.sender;
    return senderId?.toString() === user.id?.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white/[0.05] rounded-xl w-full max-w-2xl h-[600px] flex flex-col mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-gradient-to-r from-primary-600 to-primary-700 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/[0.05] bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {mechanic?.name?.charAt(0) || "M"}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white">
                Chat with {mechanic?.name}
              </h3>
              <p className="text-xs text-primary-100">
                {serviceRequestId ? "Service Request Chat" : "Direct Message"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={deleteChat}
              title="Delete chat history"
              className="text-white hover:text-danger-300 transition-colors p-1 rounded-2xl hover:bg-white/[0.05] hover:bg-opacity-10"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-primary-100 transition-colors p-1 rounded-2xl hover:bg-white/[0.05] hover:bg-opacity-10"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto bg-white/[0.03] space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-neutral-500 font-medium">No messages yet</p>
              <p className="text-sm text-neutral-500 mt-1">
                Be the first to say hello!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${isOwnMessage(message) ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-xs lg:max-w-md`}>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwnMessage(message)
                        ? "bg-primary-600 text-white rounded-br-sm"
                        : "bg-white/[0.05] text-white border border-white/[0.08] rounded-bl-sm shadow-soft"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <div
                    className={`flex items-center gap-1 mt-1 text-xs text-neutral-500 ${
                      isOwnMessage(message) ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span>{message.sender?.name || "Unknown"}</span>
                    <span>•</span>
                    <span>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-white/[0.08] bg-white/[0.05] rounded-b-xl">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-white/[0.1] rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              disabled={sending || loading}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
