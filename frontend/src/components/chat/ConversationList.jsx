import React, { useState } from 'react';
import { 
  ChatBubbleLeftIcon, 
  ClockIcon, 
  UserIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const ConversationList = ({ conversations, loading, onConversationSelect, selectedConversationId }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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
    return issueTypes[conversation.serviceRequest.issueType] || 'Service Request';
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>;
      case 'in_progress':
      case 'assigned':
      case 'accepted':
      case 'enroute':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 animate-pulse">In Progress</span>;
      case 'pending':
      case 'offered':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>;
      case 'cancelled':
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">{status || 'Active'}</span>;
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const participant = getOtherParticipant(conv);
    const title = getConversationTitle(conv);
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      participant?.name?.toLowerCase().includes(query) ||
      title.toLowerCase().includes(query) ||
      conv.serviceRequest?.status?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
        <p className="text-neutral-400 text-xs font-medium">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400">
          <ChatBubbleLeftIcon className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">No Conversations Yet</h3>
        <p className="text-neutral-400 text-xs leading-relaxed max-w-xs mx-auto">
          When you connect with a verified mechanic, your conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="relative mb-3">
        <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search mechanics or issues..."
          className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition-all"
        />
      </div>

      {/* Conversations Items List */}
      <div className="space-y-2 overflow-y-auto pr-1 flex-1">
        {filteredConversations.length === 0 ? (
          <p className="text-neutral-500 text-xs italic text-center py-6">
            No mechanics match "{searchQuery}"
          </p>
        ) : (
          filteredConversations.map((conversation) => {
            const otherParticipant = getOtherParticipant(conversation);
            const lastMessage = getLastMessage(conversation);
            const isSelected = selectedConversationId === conversation._id;
            const isVerifiedMechanic = user.role === 'customer';

            return (
              <div
                key={conversation._id}
                onClick={() => onConversationSelect(conversation)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/5' 
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center font-bold text-xs text-black shadow-md">
                        {otherParticipant?.name 
                          ? otherParticipant.name.split(" ").map(n => n[0]).slice(0, 2).join("") 
                          : "M"}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#090909] rounded-full" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-white truncate leading-tight">
                          {otherParticipant?.name || 'Verified Mechanic'}
                        </h4>
                        {isVerifiedMechanic && (
                          <ShieldCheckIcon className="w-4 h-4 text-emerald-400 shrink-0" title="Verified Mechanic" />
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 truncate mt-0.5 flex items-center gap-1">
                        <WrenchScrewdriverIcon className="w-3 h-3 text-red-400 shrink-0 inline" />
                        <span>{getConversationTitle(conversation)}</span>
                      </p>
                    </div>
                  </div>

                  {conversation.unreadCount > 0 && (
                    <span className="bg-red-500 text-white font-extrabold text-[11px] rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-lg shadow-red-500/30 shrink-0">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/[0.04]">
                  <p className="text-neutral-400 truncate flex-1 pr-2">
                    {lastMessage ? lastMessage.content : <span className="italic text-neutral-500">Tap to view messages</span>}
                  </p>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {conversation.serviceRequest && getStatusBadge(conversation.serviceRequest.status)}
                    {lastMessage && (
                      <span className="text-[10px] text-neutral-500">
                        {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
