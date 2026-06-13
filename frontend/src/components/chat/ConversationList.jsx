import React from 'react';
import { ChatBubbleLeftIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const ConversationList = ({ conversations, loading, onConversationSelect, selectedConversationId }) => {
  const { user } = useAuth();

  const getOtherParticipant = (conversation) => {
    if (user.role === 'customer') {
      return conversation.mechanic;
    } else {
      return conversation.customer;
    }
  };

  const getLastMessage = (conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      return conversation.messages[conversation.messages.length - 1];
    }
    return null;
  };

  const getConversationTitle = (conversation) => {
    if (conversation.isDirectChat || !conversation.serviceRequest) return 'Direct Message';
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
    return issueTypes[conversation.serviceRequest.issueType] || 'Service Request';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <ChatBubbleLeftIcon className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No conversations yet</h3>
        <p className="text-neutral-500">
          Start a conversation by creating a service request or accepting one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const otherParticipant = getOtherParticipant(conversation);
        const lastMessage = getLastMessage(conversation);
        const isSelected = selectedConversationId === conversation._id;
        
        return (
          <div
            key={conversation._id}
            onClick={() => onConversationSelect(conversation)}
            className={`p-4 border rounded-2xl cursor-pointer transition-colors ${
              isSelected 
                ? 'bg-primary-500/10 border-primary-500/20' 
                : 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500/15 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">
                    {otherParticipant?.name || 'Unknown User'}
                  </h4>
                  <p className="text-sm text-neutral-500">
                    {getConversationTitle(conversation)}
                  </p>
                </div>
              </div>
              {conversation.unreadCount > 0 && (
                <span className="bg-danger-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
            
            {lastMessage && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-400 truncate flex-1">
                  {lastMessage.content}
                </p>
                <div className="flex items-center gap-1 text-xs text-neutral-500 ml-2">
                  <ClockIcon className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            )}
            
            {conversation.serviceRequest && (
              <div className="mt-2 text-xs text-neutral-500">
                Status: {conversation.serviceRequest.status}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
