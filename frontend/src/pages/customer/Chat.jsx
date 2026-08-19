import React from 'react';
import ChatInterface from '../../components/chat/ChatInterface';

const Chat = () => {
  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6">
      <div className="mb-3 sm:mb-6 px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Messages</h1>
        <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
          Real-time messaging with verified mechanics for your service requests
        </p>
      </div>
      
      <div className="h-[calc(100vh-170px)] min-h-[580px] max-h-[800px]">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Chat;
