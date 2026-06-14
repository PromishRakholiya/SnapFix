import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  TruckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  MapPinIcon,
  ClockIcon,
  ShieldExclamationIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { formatDate, formatTime, getRelativeTime, formatCurrency } from '../../utils/helpers';
import { REQUEST_STATUS_LABELS } from '../../utils/constants';
import socketService from '../../services/socketService';
import requestService from '../../services/requestService';
import chatApi from '../../api/chatApi';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import DemoPaymentModal from '../../components/payment/DemoPaymentModal';

// Helper component to dynamically pan map when location changes
const RecenterMap = ({ center, bounds }) => {
  const map = useMap();
  useEffect(() => {
    try {
      if (bounds && bounds[0] && bounds[1] && !isNaN(bounds[0][0]) && !isNaN(bounds[0][1])) {
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (center && !isNaN(center[0]) && !isNaN(center[1])) {
        map.setView(center, map.getZoom());
      }
    } catch (error) {
      console.error("Leaflet recentering error caught:", error);
    }
  }, [center, bounds, map]);
  return null;
};

// Custom icons
const customerIcon = L.divIcon({
  className: '',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-10 h-10 bg-primary-500/30 rounded-full animate-ping"></div>
      <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4.5 h-4.5 text-white">
          <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.06 1.06l8.69-8.69z" />
          <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const createMechanicIcon = (heading = 0) => L.divIcon({
  className: '',
  html: `
    <div class="relative flex items-center justify-center" style="transform: rotate(${heading || 0}deg); transition: transform 0.5s ease;">
      <div class="absolute w-12 h-12 bg-success-500/25 rounded-full animate-pulse"></div>
      <div class="w-9 h-9 bg-gradient-to-br from-success-500 to-emerald-600 border-2 border-white rounded-full flex items-center justify-center shadow-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-white">
          <path d="M3.375 3C2.395 3 1.6 3.795 1.6 4.775V15.75c0 .98.795 1.775 1.775 1.775h1.723a3 3 0 005.804 0h3.296a3 3 0 005.804 0h1.723c.98 0 1.775-.795 1.775-1.775v-3.775c0-.573-.276-1.111-.743-1.448l-3.417-2.47a2.25 2.25 0 00-1.325-.432H13.5v-3C13.5 3.795 12.705 3 11.725 3H3.375zM17.25 18a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM7.5 18a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const CustomerLiveTracker = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mechanicLocation, setMechanicLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sosAlert, setSosAlert] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const messagesEndRef = useRef(null);

  // Fetch Request Details
  const fetchDetails = useCallback(async () => {
    try {
      const response = await requestService.getRequestDetails(requestId);
      if (response.success) {
        setRequest(response.data.request);
        if (response.data.request.mechanicId?.location) {
          const loc = response.data.request.mechanicId.location;
          setMechanicLocation({
            lat: loc.lat,
            lng: loc.lng,
            heading: 0,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error("Error loading request details:", error);
      toast.error("Failed to load service request");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  // Load chat history
  const fetchChatMessages = useCallback(async () => {
    try {
      const response = await chatApi.getMessages(requestId);
      if (response.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.warn("Could not load chat messages:", error);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDetails();
    fetchChatMessages();
  }, [fetchDetails, fetchChatMessages]);

  // Handle Socket listeners
  useEffect(() => {
    if (!requestId) return;

    socketService.joinRequest(requestId);

    // Coordinate update listener
    socketService.onLocationUpdate((data) => {
      console.log("Customer Tracker: Coordinate update:", data);
      setMechanicLocation({
        lat: data.lat,
        lng: data.lng,
        heading: data.heading || 0,
        timestamp: new Date()
      });
    });

    // Request status updates
    socketService.onRequestUpdate((data) => {
      console.log("Customer Tracker: status-update:", data);
      if (data.requestId === requestId) {
        setRequest(prev => prev ? { ...prev, status: data.status } : null);
        
        const statusMap = {
          offered: 'A mechanic has proposed a counter offer.',
          assigned: 'Mechanic confirmed and assigned!',
          enroute: 'Your mechanic is on the way!',
          in_progress: 'Wrenching in progress! Work has started.',
          completed: 'Service completed! Invoice is ready for payment.',
          cancelled: 'Service request cancelled.'
        };
        
        if (statusMap[data.status]) {
          toast.success(statusMap[data.status]);
        }

        if (data.status === 'completed') {
          fetchDetails();
        }
      }
    });

    // Message listener
    socketService.onNewMessage((data) => {
      if (data.requestId === requestId || data.chatId === requestId) {
        setMessages(prev => [...prev, data]);
      }
    });

    // Emergency SOS alert
    socketService.onEmergencyAlert((data) => {
      if (data.requestId === requestId) {
        setSosAlert(data.message || 'The mechanic has triggered an emergency SOS. Please reach out to emergency services if needed.');
        toast.error('EMERGENCY: Mechanic has requested assistance!', { duration: 8000 });
      }
    });

    return () => {
      socketService.leaveRequest(requestId);
    };
  }, [requestId, navigate]);

  // Route calculation
  useEffect(() => {
    if (mechanicLocation && request?.location) {
      const fetchRoute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${mechanicLocation.lng},${mechanicLocation.lat};${request.location.lng},${request.location.lat}?overview=full&geometries=geojson`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRoute(coords);
          } else {
            setRoute([
              [mechanicLocation.lat, mechanicLocation.lng],
              [request.location.lat, request.location.lng]
            ]);
          }
        } catch (err) {
          setRoute([
            [mechanicLocation.lat, mechanicLocation.lng],
            [request.location.lat, request.location.lng]
          ]);
        }
      };
      fetchRoute();
    } else {
      setRoute([]);
    }
  }, [mechanicLocation, request?.location]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  // Send message helper
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const messageData = {
        content: newMessage.trim(),
        messageType: 'text'
      };

      const response = await chatApi.sendMessage(requestId, messageData);
      if (response.success) {
        setMessages(prev => [...prev, response.data]);
        socketService.sendMessage(requestId, newMessage.trim(), 'customer');
        setNewMessage('');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Confirm Counter Offer
  const handleConfirmPrice = async () => {
    try {
      const response = await requestService.confirmRequestPrice(requestId);
      if (response.success) {
        toast.success('Offer accepted! Mechanic is now assigned.');
        fetchDetails();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to accept offer');
    }
  };

  // Get map utilities
  const getMapCenter = () => {
    if (mechanicLocation && request?.location) {
      return [
        (request.location.lat + mechanicLocation.lat) / 2,
        (request.location.lng + mechanicLocation.lng) / 2
      ];
    }
    if (request?.location) {
      return [request.location.lat, request.location.lng];
    }
    return [22.30389, 70.80216]; // Rajkot
  };

  const getMapBounds = () => {
    if (mechanicLocation && request?.location) {
      return [
        [
          Math.min(request.location.lat, mechanicLocation.lat) - 0.005,
          Math.min(request.location.lng, mechanicLocation.lng) - 0.005
        ],
        [
          Math.max(request.location.lat, mechanicLocation.lat) + 0.005,
          Math.max(request.location.lng, mechanicLocation.lng) + 0.005
        ]
      ];
    }
    return null;
  };

  const getStatusStepIndex = () => {
    const sequence = ['pending', 'offered', 'assigned', 'enroute', 'in_progress', 'completed'];
    return sequence.indexOf(request?.status || 'pending');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-primary-500"></div>
        <p className="text-neutral-400 font-semibold">Loading Live Tracker...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <p className="text-white text-lg font-bold">Request not found</p>
        <Button onClick={() => navigate('/customer/requests')}>Back to Requests</Button>
      </div>
    );
  }

  const mechanic = request.mechanicId;

  return (
    <div className="relative h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* MAP AREA */}
      <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl h-[50vh] lg:h-full z-10">
        <MapContainer
          center={getMapCenter()}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          bounds={getMapBounds()}
        >
          <RecenterMap center={getMapCenter()} bounds={getMapBounds()} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Customer target marker */}
          <Marker position={[request.location.lat, request.location.lng]} icon={customerIcon}>
            <Popup>
              <div className="text-center font-medium p-1">
                <p className="text-black font-bold">Your Location</p>
                <p className="text-neutral-500 text-xs mt-1">{request.location.address}</p>
              </div>
            </Popup>
          </Marker>

          {/* Mechanic location marker */}
          {mechanicLocation && (
            <Marker 
              position={[mechanicLocation.lat, mechanicLocation.lng]} 
              icon={createMechanicIcon(mechanicLocation.heading)}
            >
              <Popup>
                <div className="text-center font-medium p-1">
                  <p className="text-black font-bold">{mechanic?.name || 'Mechanic'}</p>
                  <p className="text-neutral-500 text-xs mt-1">Last seen: {getRelativeTime(mechanicLocation.timestamp)}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Path polyline */}
          {mechanicLocation && route.length > 0 && (
            <Polyline
              positions={route}
              color="#0ea5e9"
              weight={5}
              opacity={0.8}
              dashArray="2, 8"
            />
          )}
        </MapContainer>

        {/* SOS emergency modal bar */}
        {sosAlert && (
          <div className="absolute top-4 left-4 right-4 z-[1000] bg-danger-500/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl border border-danger-400 shadow-xl flex items-center justify-between animate-bounce">
            <div className="flex items-center space-x-3">
              <ShieldExclamationIcon className="h-8 w-8 text-white animate-pulse" />
              <div>
                <h4 className="font-extrabold tracking-tight">Mechanic Triggered SOS Alert</h4>
                <p className="text-xs text-neutral-100">{sosAlert}</p>
              </div>
            </div>
            <button 
              onClick={() => setSosAlert(null)}
              className="p-1 hover:bg-white/10 rounded-full"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Floating live tracking stat tag */}
        {mechanicLocation && ['assigned', 'enroute'].includes(request.status) && (
          <div className="absolute bottom-6 left-6 z-[1000] glass-panel bg-neutral-950/80 backdrop-blur-lg border border-white/10 p-4 rounded-2xl flex items-center space-x-4 shadow-2xl">
            <div className="p-2.5 bg-success-500/10 border border-success-500/20 rounded-xl">
              <TruckIcon className="h-6 w-6 text-success-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Estimated Distance</p>
              <p className="text-lg font-black text-white">
                {route.length > 0 ? `${(route.length * 0.15).toFixed(1)} km away` : 'Calculating...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING STATUS PANEL & ACTIONS */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 h-fit lg:h-full lg:overflow-y-auto pr-1">
        {/* Tracker Header */}
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-28 h-28 rounded-full bg-primary-500/10 blur-2xl"></div>
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={() => navigate('/customer/requests')}
              className="p-2 hover:bg-white/5 rounded-xl border border-white/10 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Track Service</h2>
              <p className="text-xs text-neutral-500">ID: #{request._id.slice(-8)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
            <div>
              <p className="text-xs text-neutral-500">Service Category</p>
              <p className="text-sm font-bold text-neutral-300 capitalize">{request.issueType?.replace('_', ' ')}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              request.status === 'completed' ? 'bg-success-500/15 text-success-400' :
              request.status === 'cancelled' ? 'bg-danger-500/15 text-danger-400' :
              'bg-primary-500/15 text-primary-400'
            }`}>
              {REQUEST_STATUS_LABELS[request.status]}
            </div>
          </div>
        </div>

        {/* Invoice & Checkout screen */}
        {request.status === 'completed' && (
          <div className="bg-gradient-to-br from-success-500/15 via-success-500/5 to-transparent border border-success-500/25 p-6 rounded-3xl shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-black text-success-400 mb-1">Service Completed</h3>
              <p className="text-xs text-neutral-400">The mechanic has completed the service and generated the invoice.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 text-xs">
              {request.workSummary && (
                <div className="border-b border-white/5 pb-2">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-1">Work Summary</p>
                  <p className="font-medium text-neutral-200 leading-relaxed">{request.workSummary}</p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-bold">Total Invoice Amount:</span>
                <span className="text-xl font-black text-success-400">{formatCurrency(request.finalAmount || request.quotation || 0)}</span>
              </div>
            </div>

            {request.paymentStatus === 'paid' ? (
              <div className="bg-success-500/10 border border-success-500/20 p-4 rounded-2xl flex items-center space-x-3 text-success-400">
                <CheckCircleIcon className="h-6 w-6 shrink-0 text-success-400" />
                <div>
                  <h4 className="font-bold text-xs">Invoice Paid</h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Thank you for your payment!</p>
                </div>
              </div>
            ) : (
              <Button
                variant="success"
                onClick={() => setShowPaymentModal(true)}
                className="w-full font-bold shadow-lg shadow-success-500/20 py-3.5 rounded-xl transition-all"
                icon={<CreditCardIcon className="h-5 w-5" />}
              >
                Pay Invoice
              </Button>
            )}
          </div>
        )}

        {/* Counter Offer confirmation screen */}
        {request.status === 'offered' && (
          <div className="bg-gradient-to-br from-warning-500/15 via-warning-500/5 to-transparent border border-warning-500/25 p-6 rounded-3xl animate-pulse shadow-xl">
            <h3 className="text-base font-black text-warning-400 mb-1">New Proposal Offered</h3>
            <p className="text-xs text-neutral-400 mb-4">The mechanic proposed a final quote for this service.</p>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-neutral-400">Offer Amount</p>
                <p className="text-2xl font-black text-white">{formatCurrency(request.mechanicOfferPrice || request.quotation)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Expected Duration</p>
                <p className="text-sm font-bold text-white text-right">{request.estimatedDuration || 30} min</p>
              </div>
            </div>

            <Button
              variant="warning"
              onClick={handleConfirmPrice}
              className="w-full font-bold shadow-lg shadow-warning-500/10 text-black py-3 rounded-xl active:scale-[0.98] transition-transform"
            >
              Confirm & Assign Mechanic
            </Button>
          </div>
        )}

        {/* Mechanic info panel */}
        {mechanic && (
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Assigned Mechanic</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 bg-primary-600/10 border border-primary-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-primary-400 font-extrabold text-base capitalize">
                    {mechanic.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-extrabold text-white text-sm leading-none">{mechanic.name}</p>
                  <p className="text-xs text-neutral-500 mt-1.5 flex items-center">
                    ⭐ <span className="text-neutral-300 font-bold ml-1">{mechanic.rating?.toFixed(1) || 'New'}</span>
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <a 
                  href={`tel:${mechanic.phone}`}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-neutral-300 hover:text-white transition-colors"
                  title="Call Mechanic"
                >
                  <PhoneIcon className="h-5 w-5" />
                </a>
                <button
                  onClick={() => setShowChat(true)}
                  className="p-2.5 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 rounded-xl text-primary-400 hover:text-primary-300 transition-colors"
                  title="Chat with Mechanic"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5 animate-pulse" />
                </button>
              </div>
            </div>

            {request.status === 'enroute' && (
              <div className="bg-success-500/5 border border-success-500/10 p-3.5 rounded-2xl flex items-center space-x-3 text-success-400">
                <ClockIcon className="h-5 w-5 flex-shrink-0 animate-spin" />
                <div className="text-xs font-semibold">
                  Mechanic is en route! Estimated arrival in 20-30 minutes.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Request details panel */}
        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Request details</h3>
          <div className="space-y-3.5 text-xs text-neutral-400">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Vehicle Details:</span>
              <span className="font-bold text-white capitalize">{request.vehicleInfo?.make} {request.vehicleInfo?.model} ({request.vehicleInfo?.plate})</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Expected Budget:</span>
              <span className="font-bold text-white">{formatCurrency(request.userExpectedPrice)}</span>
            </div>
            {request.quotation && (
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Final Quotation:</span>
                <span className="font-bold text-success-400">{formatCurrency(request.quotation)}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="mb-1 text-white/35">Issue Description:</span>
              <p className="bg-white/5 p-3 rounded-2xl text-neutral-300 leading-relaxed font-medium">
                {request.description}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline updates */}
        <div className="glass-panel p-6 rounded-3xl flex-1">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Progress Timeline</h3>
          <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6">
            {[
              { status: 'pending', label: 'Request Broadcasted', desc: 'Finding nearby available mechanics.' },
              { status: 'offered', label: 'Offer Received', desc: 'Mechanic submitted counter offer.' },
              { status: 'assigned', label: 'Mechanic Assigned', desc: 'Agreement reached on quote.' },
              { status: 'enroute', label: 'Mechanic En Route', desc: 'Driver is traveling to your location.' },
              { status: 'in_progress', label: 'Work Started', desc: 'Repair work is currently underway.' },
              { status: 'completed', label: 'Service Completed', desc: 'Service completed successfully.' }
            ].map((step, idx) => {
              const activeIdx = getStatusStepIndex();
              const isDone = activeIdx >= idx;
              const isCurrent = activeIdx === idx;

              return (
                <div key={idx} className="relative group">
                  {/* Bullet */}
                  <div className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isCurrent ? 'bg-primary-500 border-primary-400 ring-4 ring-primary-500/20 scale-110' :
                    isDone ? 'bg-success-500 border-success-400' :
                    'bg-neutral-800 border-white/10'
                  }`}>
                    {isDone && !isCurrent && <CheckCircleIcon className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isCurrent ? 'text-primary-400' : isDone ? 'text-white' : 'text-neutral-500'}`}>
                      {step.label}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CHAT DRAWER PANEL OVERLAY */}
      {showChat && mechanic && (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-neutral-900 border-l border-white/10 shadow-2xl z-[1100] flex flex-col animate-slide-in">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-neutral-950/40">
            <div>
              <h3 className="font-extrabold text-white text-sm">Chat with {mechanic.name}</h3>
              <p className="text-xs text-neutral-500">Service Request #{request._id.slice(-8)}</p>
            </div>
            <button 
              onClick={() => setShowChat(false)}
              className="p-2 hover:bg-white/5 rounded-xl border border-white/10 text-neutral-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-neutral-950/20">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-500">
                <ChatBubbleLeftRightIcon className="h-10 w-10 text-neutral-600 mb-2 animate-bounce" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1 text-neutral-600">Send a message to coordinate with the mechanic.</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.sender === 'customer' || msg.senderId === request.customerId;
                return (
                  <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                      isMe 
                        ? 'bg-primary-600 text-white rounded-br-none shadow-md shadow-primary-600/10' 
                        : 'bg-neutral-800 text-neutral-200 rounded-bl-none border border-white/5'
                    }`}>
                      <p>{msg.message || msg.content}</p>
                      <span className="block text-[9px] text-right mt-1.5 opacity-60">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-neutral-950/40 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 px-4 py-2 text-xs bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              variant="primary"
              className="px-4 py-2 rounded-xl text-xs font-bold"
            >
              {sending ? '...' : 'Send'}
            </Button>
          </form>
        </div>
      )}

      {showPaymentModal && (
        <DemoPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          serviceRequest={request}
          onPaymentSuccess={(updatedRequest) => {
            setRequest(prev => prev ? { ...prev, paymentStatus: 'paid' } : null);
          }}
        />
      )}
    </div>
  );
};

export default CustomerLiveTracker;
