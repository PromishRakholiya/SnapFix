import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { formatDate, formatTime, getRelativeTime } from '../../utils/helpers';
import { REQUEST_STATUS_LABELS } from '../../utils/constants';
import socketService from '../../services/socketService';
import Button from '../common/Button';
import requestService from '../../services/requestService';
import toast from 'react-hot-toast';

// Custom icons for different markers
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const mechanicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const RequestTracker = ({ request, onStatusUpdate, onNewMessage }) => {
  const [mechanicLocation, setMechanicLocation] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [route] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const mechanic = request.mechanic || request.mechanicId;

  // Get map center and bounds
  const getMapCenter = useCallback(() => {
    if (mechanicLocation) {
      return [
        (request.location.lat + mechanicLocation.lat) / 2,
        (request.location.lng + mechanicLocation.lng) / 2
      ];
    }
    return [request.location.lat, request.location.lng];
  }, [request.location, mechanicLocation]);

  const getMapBounds = useCallback(() => {
    if (mechanicLocation) {
      return [
        [Math.min(request.location.lat, mechanicLocation.lat) - 0.01,
         Math.min(request.location.lng, mechanicLocation.lng) - 0.01],
        [Math.max(request.location.lat, mechanicLocation.lat) + 0.01,
         Math.max(request.location.lng, mechanicLocation.lng) + 0.01]
      ];
    }
    return null;
  }, [request.location, mechanicLocation]);

  // Set up real-time updates
  useEffect(() => {
    if (request._id) {
      // Join the request room for real-time updates
      socketService.joinRequest(request._id);

      // Listen for mechanic location updates
      socketService.onLocationUpdate((data) => {
        if (data.mechanicId === request.mechanicId) {
          setMechanicLocation({
            lat: data.lat,
            lng: data.lng,
            timestamp: new Date()
          });
          
          // Update estimated arrival if provided
          if (data.estimatedArrival) {
            setEstimatedArrival(data.estimatedArrival);
          }
        }
      });

      // Listen for request status updates
      socketService.onRequestUpdate((data) => {
        if (data.requestId === request._id) {
          if (onStatusUpdate) {
            onStatusUpdate(data);
          }
          
          // Show notification for status changes
          const statusMessages = {
            offered: 'A mechanic has shown interest! Review the price offer.',
            assigned: 'Agreement reached! The mechanic is assigned.',
            enroute: 'The mechanic is on the way to your location',
            in_progress: 'The mechanic has started working on your vehicle',
            completed: 'Your service request has been completed!'
          };
          
          if (statusMessages[data.status]) {
            toast.success(statusMessages[data.status]);
          }
        }
      });

      // Listen for new messages
      socketService.onNewMessage((data) => {
        if (data.requestId === request._id) {
          setMessages(prev => [...prev, data]);
          if (onNewMessage) {
            onNewMessage(data);
          }
          
          // Show notification for new messages
          if (data.sender !== 'customer') {
            toast.info(`New message from ${data.sender}`);
          }
        }
      });

      return () => {
        socketService.leaveRequest(request._id);
        socketService.off('location_updated');
        socketService.off('request_updated');
        socketService.off('new_message');
      };
    }
  }, [request._id, request.mechanicId, onStatusUpdate, onNewMessage]);

  // Calculate estimated arrival time
  const getEstimatedArrival = () => {
    if (estimatedArrival) {
      return new Date(Date.now() + estimatedArrival * 60000);
    }
    return null;
  };

  // Send chat message
  const handleSendMessage = () => {
    if (newMessage.trim() && request._id) {
      socketService.sendMessage(request._id, newMessage.trim(), 'customer');
      setMessages(prev => [...prev, {
        requestId: request._id,
        message: newMessage.trim(),
        sender: 'customer',
        timestamp: new Date().toISOString()
      }]);
      setNewMessage('');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-warning-400 bg-warning-500/15',
      assigned: 'text-primary-400 bg-primary-500/15',
      enroute: 'text-blue-400 bg-blue-500/15',
      in_progress: 'text-purple-400 bg-purple-500/15',
      completed: 'text-success-400 bg-success-500/15',
      cancelled: 'text-danger-400 bg-danger-500/15'
    };
    return colors[status] || 'text-neutral-400 bg-secondary-100';
  };

  const handleConfirmPrice = async () => {
    try {
      const response = await requestService.confirmRequestPrice(request._id);
      if (response.success) {
        toast.success('Price confirmed and mechanic assigned!');
        if (onStatusUpdate) {
          onStatusUpdate({ requestId: request._id, status: 'assigned' });
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to confirm price');
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Request Tracking</h2>
            <p className="text-neutral-400">Request ID: {request._id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
            {REQUEST_STATUS_LABELS[request.status]}
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="flex items-center justify-between">
          {['pending', 'offered', 'assigned', 'enroute', 'in_progress', 'completed'].map((status, index) => (
            <div key={status} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['pending', 'offered', 'assigned', 'enroute', 'in_progress', 'completed'].indexOf(request.status) >= index
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-200 text-neutral-500'
              }`}>
                {status === 'completed' ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-2 text-center">
                {status === 'offered' ? 'Interest' : REQUEST_STATUS_LABELS[status]}
              </p>
            </div>
          ))}
        </div>
        {request.status === 'offered' && (
          <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl flex items-center justify-between animate-pulse">
            <div>
              <p className="text-primary-300 font-bold">New Offer Received!</p>
              <p className="text-primary-400 text-sm">Mechanic has proposed a price of <span className="text-lg font-bold">₹{request.mechanicOfferPrice || request.quotation}</span></p>
            </div>
            <Button
              variant="primary"
              onClick={handleConfirmPrice}
            >
              Final Confirm & Assign
            </Button>
          </div>
        )}
      </div>

      {/* Mechanic Info */}
      {mechanic && (
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Assigned Mechanic</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-500/15 rounded-full flex items-center justify-center">
                <span className="text-primary-400 font-bold text-lg">
                  {mechanic.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-white">{mechanic.name}</p>
                <div className="flex items-center text-sm text-neutral-400">
                  <span className="flex items-center">
                    ⭐ {mechanic.rating?.toFixed(1) || 'New'} 
                    {mechanic.totalReviews > 0 && (
                      <span className="ml-1">({mechanic.totalReviews} reviews)</span>
                    )}
                  </span>
                </div>
                {estimatedArrival && (
                  <p className="text-sm text-success-400">
                    ETA: {formatTime(getEstimatedArrival())}
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                icon={<PhoneIcon className="h-4 w-4" />}
                onClick={() => window.open(`tel:${mechanic.phone}`)}
              >
                Call
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
                onClick={() => setShowChat(!showChat)}
              >
                Chat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Live Location</h3>
        <div className="h-96 rounded-2xl overflow-hidden border border-white/[0.08]">
          <MapContainer
            center={getMapCenter()}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            bounds={getMapBounds()}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Customer location marker */}
            <Marker position={[request.location.lat, request.location.lng]} icon={customerIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-medium">Your Location</p>
                  <p className="text-sm text-neutral-400">
                    {request.location.address || 'Service location'}
                  </p>
                </div>
              </Popup>
            </Marker>
            
            {/* Mechanic location marker */}
            {mechanicLocation && (
              <Marker position={[mechanicLocation.lat, mechanicLocation.lng]} icon={mechanicIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-medium">{mechanic?.name || 'Mechanic'}</p>
                    <p className="text-sm text-neutral-400">
                      Last updated: {getRelativeTime(mechanicLocation.timestamp)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Route line */}
            {mechanicLocation && route.length > 0 && (
              <Polyline
                positions={route}
                color="#0ea5e9"
                weight={4}
                opacity={0.7}
              />
            )}
          </MapContainer>
        </div>
        
        {!mechanicLocation && request.status !== 'pending' && (
          <div className="mt-4 p-4 bg-warning-500/10 border border-warning-500/20 rounded-2xl">
            <p className="text-warning-800 text-sm">
              <TruckIcon className="h-5 w-5 inline mr-2" />
              Waiting for mechanic's location update...
            </p>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      {showChat && mechanic && (
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Chat with {mechanic.name}
          </h3>
          
          <div className="h-64 border border-white/[0.08] rounded-2xl p-4 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <p className="text-neutral-500 text-center">No messages yet. Start a conversation!</p>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        message.sender === 'customer'
                          ? 'bg-primary-600 text-white'
                          : 'bg-secondary-100 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'customer' ? 'text-primary-100' : 'text-neutral-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              variant="primary"
            >
              Send
            </Button>
          </div>
        </div>
      )}

      {/* Request Details */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Request Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-neutral-300">Issue Type</p>
            <p className="text-white">{request.issueType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-300">Priority</p>
            <p className="text-white capitalize">{request.priority}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-300">Vehicle</p>
            <p className="text-white">
              {request.vehicleInfo?.model} ({request.vehicleInfo?.plate})
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-300">Created</p>
            <p className="text-white">{formatDate(request.createdAt)}</p>
          </div>
          {request.quotation && (
            <div>
              <p className="text-sm font-medium text-neutral-300">Estimated Cost</p>
              <p className="text-white">₹{request.quotation}</p>
            </div>
          )}
          {request.userExpectedPrice > 0 && (
            <div>
              <p className="text-sm font-medium text-neutral-300">Your Expected Price</p>
              <p className="text-white font-medium">₹{request.userExpectedPrice}</p>
            </div>
          )}
        </div>
        
        {request.description && (
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-300">Description</p>
            <p className="text-white mt-1">{request.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestTracker;
