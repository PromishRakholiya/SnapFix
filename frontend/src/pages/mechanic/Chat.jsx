import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatInterface from '../../components/chat/ChatInterface';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          {requestId && (
            <Link 
              to="/mechanic/requests"
              className="flex items-center gap-2 text-primary-400 hover:text-primary-400"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Back to Requests
            </Link>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white">
              {requestId ? 'Service Request Chat' : 'Messages'}
            </h1>
            <p className="text-neutral-400 mt-2">
              {requestId 
                ? 'Chat with customer about this service request'
                : 'Chat with customers about their service requests'
              }
            </p>
          </div>
        </div>
      </div>
      
      <div className="h-[600px]">
        <ChatInterface requestId={requestId} />
      </div>
    </div>
  );
};

export default Chat;
