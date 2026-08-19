import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

const ChatMessage = ({ message }) => {
  const { user } = useAuth();
  
  const senderId = message.sender?._id || message.sender?.id || message.sender;
  const userId = user?.id || user?._id;
  const isOwnMessage = senderId?.toString() === userId?.toString();
  const senderName = message.sender?.name || (isOwnMessage ? 'You' : 'Mechanic');

  const renderMessageContent = () => {
    if (message.messageType === 'image') {
      return (
        <div>
          <img 
            src={message.fileUrl} 
            alt="Shared content" 
            className="max-w-xs rounded-2xl cursor-pointer shadow-md hover:opacity-95 transition-opacity"
            onClick={() => window.open(message.fileUrl, '_blank')}
          />
          {message.content && (
            <p className="mt-2 text-xs sm:text-sm">{message.content}</p>
          )}
        </div>
      );
    }

    if (message.messageType === 'file') {
      return (
        <div className="flex items-center gap-2.5 p-2 bg-black/20 rounded-xl border border-white/10">
          <span className="text-base">📎</span>
          <div>
            <p className="text-xs font-bold">Attachment</p>
            <a 
              href={message.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[11px] text-red-300 hover:underline font-medium"
            >
              Download / View file
            </a>
          </div>
        </div>
      );
    }

    return <p className="text-xs sm:text-sm leading-relaxed">{message.content}</p>;
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] sm:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            isOwnMessage
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-tr-xs shadow-red-500/10'
              : 'bg-white/[0.06] border border-white/[0.08] text-white rounded-tl-xs backdrop-blur-md'
          }`}
        >
          {renderMessageContent()}
        </div>
        <div className={`flex items-center gap-1.5 mt-1 text-[10px] text-neutral-500 ${
          isOwnMessage ? 'justify-end' : 'justify-start'
        }`}>
          <span className="font-semibold text-neutral-400">{senderName}</span>
          {!isOwnMessage && user?.role === 'customer' && (
            <ShieldCheckIcon className="w-3 h-3 text-emerald-400 shrink-0 inline" title="Verified Mechanic" />
          )}
          <span>•</span>
          <span>{formatDistanceToNow(new Date(message.createdAt || Date.now()), { addSuffix: true })}</span>
          {isOwnMessage && (
            <>
              <span>•</span>
              <span className={message.isRead ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                {message.isRead ? '✓✓' : '✓'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
