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
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  CheckIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { formatDate, formatTime, getRelativeTime, formatCurrency } from '../../utils/helpers';
import socketService from '../../services/socketService';
import requestService from '../../services/requestService';
import chatApi from '../../api/chatApi';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

// Recenter component
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
      <div class="absolute w-10 h-10 bg-danger-500/20 rounded-full animate-ping"></div>
      <div class="w-8 h-8 bg-gradient-to-br from-danger-500 to-red-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4.5 h-4.5 text-white">
          <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
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
      <div class="absolute w-12 h-12 bg-primary-500/25 rounded-full animate-pulse"></div>
      <div class="w-9 h-9 bg-gradient-to-br from-primary-500 to-blue-600 border-2 border-white rounded-full flex items-center justify-center shadow-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-white">
          <path d="M3.375 3C2.395 3 1.6 3.795 1.6 4.775V15.75c0 .98.795 1.775 1.775 1.775h1.723a3 3 0 005.804 0h3.296a3 3 0 005.804 0h1.723c.98 0 1.775-.795 1.775-1.775v-3.775c0-.573-.276-1.111-.743-1.448l-3.417-2.47a2.25 2.25 0 00-1.325-.432H13.5v-3C13.5 3.795 12.705 3 11.725 3H3.375zM17.25 18a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM7.5 18a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const MechanicLiveTracker = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mechanicLocation, setMechanicLocation] = useState(null);
  const [route, setRoute] = useState([]);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [simulationPoints, setSimulationPoints] = useState([]);
  const simulationIntervalRef = useRef(null);

  // Completion Form Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    workSummary: '',
    finalAmount: ''
  });

  const messagesEndRef = useRef(null);

  // Fetch Request Details
  const fetchDetails = useCallback(async () => {
    try {
      const response = await requestService.getRequestDetails(requestId);
      if (response.success) {
        setRequest(response.data.request);
        
        // Initialize mechanic location if not currently simulating/watching
        if (!isSimulating && !mechanicLocation) {
          const defaultLat = user?.location?.lat || 22.30389;
          const defaultLng = user?.location?.lng || 70.80216;
          setMechanicLocation({
            lat: defaultLat,
            lng: defaultLng,
            heading: 0,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error("Error loading request details:", error);
      toast.error("Failed to load service request details");
    } finally {
      setLoading(false);
    }
  }, [requestId, user, isSimulating, mechanicLocation]);

  // Load chat messages
  const fetchChatMessages = useCallback(async () => {
    try {
      const response = await chatApi.getMessages(requestId);
      if (response.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.warn("Could not fetch chat history:", error);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDetails();
    fetchChatMessages();
  }, [fetchDetails, fetchChatMessages]);

  // Handle Socket
  useEffect(() => {
    if (!requestId) return;

    socketService.joinRequest(requestId);

    // Listen for customer cancels
    socketService.onRequestUpdate((data) => {
      if (data.requestId === requestId) {
        setRequest(prev => prev ? { ...prev, status: data.status } : null);
        
        if (data.status === 'cancelled') {
          toast.error('This request has been cancelled by the customer.', { duration: 8000 });
          stopSimulation();
          setTimeout(() => {
            navigate('/mechanic/dashboard');
          }, 4000);
        }
      }
    });

    // Listen for chat messages
    socketService.onNewMessage((data) => {
      if (data.requestId === requestId || data.chatId === requestId) {
        setMessages(prev => [...prev, data]);
      }
    });

    return () => {
      socketService.leaveRequest(requestId);
      stopSimulation();
    };
  }, [requestId, navigate]);

  // Fetch route and simulation path
  useEffect(() => {
    if (mechanicLocation && request?.location && route.length === 0) {
      const fetchRoute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${mechanicLocation.lng},${mechanicLocation.lat};${request.location.lng},${request.location.lat}?overview=full&geometries=geojson`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRoute(coords);
            
            // Map coordinates for simulation
            const points = data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
            setSimulationPoints(points);
          } else {
            const directPoints = [];
            for (let i = 0; i <= 20; i++) {
              const t = i / 20;
              directPoints.push({
                lat: mechanicLocation.lat + (request.location.lat - mechanicLocation.lat) * t,
                lng: mechanicLocation.lng + (request.location.lng - mechanicLocation.lng) * t
              });
            }
            setSimulationPoints(directPoints);
            setRoute(directPoints.map(p => [p.lat, p.lng]));
          }
        } catch (err) {
          console.error("Failed OSRM route fetch:", err);
        }
      };
      fetchRoute();
    }
  }, [mechanicLocation, request?.location, route]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  // Send message
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
        socketService.sendMessage(requestId, newMessage.trim(), 'mechanic');
        setNewMessage('');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // State Transition API triggers
  const handleStartJourney = async () => {
    try {
      const response = await requestService.updateRequestStatus(requestId, 'enroute');
      if (response.success) {
        toast.success('Journey started! Sharing live location.');
        setRequest(prev => prev ? { ...prev, status: 'enroute' } : null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to start journey');
    }
  };

  const handleArrive = async () => {
    try {
      stopSimulation();
      const response = await requestService.updateRequestStatus(requestId, 'in_progress');
      if (response.success) {
        toast.success('Arrived! Service started.');
        setRequest(prev => prev ? { ...prev, status: 'in_progress' } : null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update arrival status');
    }
  };

  const handleCompleteServiceSubmit = async (e) => {
    e.preventDefault();
    if (!completeForm.workSummary.trim() || !completeForm.finalAmount || parseFloat(completeForm.finalAmount) <= 0) {
      toast.error('Please enter a valid work summary and final invoice amount.');
      return;
    }

    try {
      const response = await requestService.completeRequest(requestId, {
        workSummary: completeForm.workSummary,
        finalAmount: parseFloat(completeForm.finalAmount)
      });

      if (response.success) {
        toast.success('Job completed successfully!');
        setShowCompleteModal(false);
        navigate('/mechanic/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to complete request');
    }
  };

  // Trigger SOS Alarm
  const handleSOSAlert = () => {
    if (!window.confirm('WARNING: Are you sure you want to trigger an emergency SOS alert? This will immediately notify the customer and support admins.')) {
      return;
    }

    try {
      const payload = {
        lat: mechanicLocation?.lat || 0,
        lng: mechanicLocation?.lng || 0
      };
      socketService.sendEmergencyAlert(requestId, 'accident', payload);
      toast.success('SOS Emergency Alert Sent successfully!');
    } catch (error) {
      toast.error('Failed to dispatch SOS alert');
    }
  };

  // Journey Simulation Animation
  const startSimulation = () => {
    if (simulationPoints.length === 0) {
      toast.error('Route coordinates are loading. Please wait.');
      return;
    }

    setIsSimulating(true);
    let index = simulationIndex;

    localStorage.setItem(`simulate_${requestId}`, 'true');

    simulationIntervalRef.current = setInterval(() => {
      if (index >= simulationPoints.length) {
        stopSimulation();
        toast.success('You have arrived at the customer location!');
        handleArrive();
        return;
      }

      const point = simulationPoints[index];
      setMechanicLocation({
        lat: point.lat,
        lng: point.lng,
        heading: index > 0 ? getHeadingAngle(simulationPoints[index-1], point) : 0,
        timestamp: new Date()
      });

      // Emit coordinate updates over Socket.IO requests namespace
      socketService.updateLocation(
        {
          lat: point.lat,
          lng: point.lng,
          accuracy: 5,
          heading: index > 0 ? getHeadingAngle(simulationPoints[index-1], point) : 0,
          speed: 15
        },
        requestId,
        user?._id
      );

      setSimulationIndex(index);
      index++;
    }, 2500);

    toast.success('Live journey simulation active.');
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    localStorage.removeItem(`simulate_${requestId}`);
  };

  const getHeadingAngle = (pt1, pt2) => {
    const dy = pt2.lat - pt1.lat;
    const dx = pt2.lng - pt1.lng;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return angle;
  };

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
    return [22.30389, 70.80216];
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-primary-500"></div>
        <p className="text-neutral-400 font-semibold">Loading Live journey...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <p className="text-white text-lg font-bold">Request details not found</p>
        <Button onClick={() => navigate('/mechanic/requests')}>Back to Requests</Button>
      </div>
    );
  }

  const customer = request.customerId;

  return (
    <div className="relative h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* MAP VIEWPORT */}
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
                <p className="text-black font-bold">Customer breakdown</p>
                <p className="text-neutral-500 text-xs mt-1">{request.location.address}</p>
              </div>
            </Popup>
          </Marker>

          {/* Mechanic marker */}
          {mechanicLocation && (
            <Marker 
              position={[mechanicLocation.lat, mechanicLocation.lng]} 
              icon={createMechanicIcon(mechanicLocation.heading)}
            >
              <Popup>
                <div className="text-center font-medium p-1">
                  <p className="text-black font-bold">You (Mechanic)</p>
                  <p className="text-neutral-500 text-xs mt-1">Simulated coordinates.</p>
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
            />
          )}
        </MapContainer>

        {/* SOS Emergency Trigger Badge */}
        <div className="absolute top-4 right-4 z-[1000]">
          <button
            onClick={handleSOSAlert}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold text-xs px-4 py-3 rounded-2xl border border-red-500 shadow-2xl hover:scale-105 active:scale-95 transition-all animate-pulse"
          >
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span>TRIGGER SOS EMERGENCY</span>
          </button>
        </div>

        {/* Dynamic Journey distance tags */}
        {request.status === 'enroute' && simulationPoints.length > 0 && (
          <div className="absolute bottom-6 left-6 z-[1000] glass-panel bg-neutral-950/80 backdrop-blur-lg border border-white/10 p-4 rounded-2xl flex items-center space-x-4 shadow-2xl">
            <div className="p-2.5 bg-primary-500/10 border border-primary-500/20 rounded-xl">
              <TruckIcon className="h-6 w-6 text-primary-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Remaining Distance</p>
              <p className="text-lg font-black text-white">
                {Math.max(0, ((simulationPoints.length - simulationIndex) * 0.15)).toFixed(1)} km left
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MECHANIC ACTIONS PANEL */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 h-fit lg:h-full lg:overflow-y-auto pr-1">
        {/* Navigation Modal header */}
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-28 h-28 rounded-full bg-success-500/10 blur-2xl"></div>
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={() => navigate('/mechanic/requests')}
              className="p-2 hover:bg-white/5 rounded-xl border border-white/10 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Active Navigation</h2>
              <p className="text-xs text-neutral-500">Service ID: #{request._id.slice(-8)}</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 mt-2">
            <p className="text-xs text-neutral-500 mb-1">Breakdown Address</p>
            <p className="text-xs font-bold text-neutral-300 leading-relaxed truncate-2-lines">{request.location.address}</p>
          </div>
        </div>

        {/* Journey workflow actions */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Journey Controls</h3>
          
          {request.status === 'assigned' && (
            <Button
              variant="primary"
              onClick={handleStartJourney}
              className="w-full justify-center py-3.5 font-bold shadow-lg shadow-primary-500/20 rounded-xl"
              icon={<TruckIcon className="h-5 w-5" />}
            >
              Start Journey to Customer
            </Button>
          )}

          {request.status === 'enroute' && (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Button
                  variant={isSimulating ? "warning" : "success"}
                  onClick={isSimulating ? stopSimulation : startSimulation}
                  className="flex-1 justify-center py-3 font-semibold rounded-xl text-xs"
                  icon={isSimulating ? <PauseIcon className="h-4.5 w-4.5" /> : <PlayIcon className="h-4.5 w-4.5" />}
                >
                  {isSimulating ? 'Pause Simulation' : 'Simulate Live Journey'}
                </Button>
              </div>

              <Button
                variant="primary"
                onClick={handleArrive}
                className="w-full justify-center py-3.5 font-bold shadow-lg shadow-primary-500/25 rounded-xl"
                icon={<CheckIcon className="h-5 w-5" />}
              >
                Mark as Arrived (Arrive Location)
              </Button>
            </div>
          )}

          {request.status === 'in_progress' && (
            <div className="space-y-2.5">
              <div className="bg-primary-500/5 border border-primary-500/15 p-4 rounded-2xl flex items-center space-x-3 text-primary-400">
                <WrenchScrewdriverIcon className="h-5 w-5 animate-pulse shrink-0" />
                <span className="text-xs font-bold leading-normal">Repair Work Started! Work on the vehicle and compile service invoice summary.</span>
              </div>
              <Button
                variant="success"
                onClick={() => setShowCompleteModal(true)}
                className="w-full justify-center py-3.5 font-bold shadow-lg shadow-success-500/20 rounded-xl"
                icon={<CheckCircleIcon className="h-5 w-5" />}
              >
                Complete Service & Invoice
              </Button>
            </div>
          )}

          {request.status === 'completed' && (
            <div className="bg-success-500/10 border border-success-500/20 p-4 rounded-2xl flex items-center space-x-3 text-success-400">
              <CheckCircleIcon className="h-6 w-6 shrink-0" />
              <div>
                <h4 className="font-bold text-xs">Job Completed</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">Payment transaction receipt is pending customer clearance.</p>
              </div>
            </div>
          )}
        </div>

        {/* Customer details card */}
        <div className="glass-panel p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Customer details</h3>
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center space-x-1.5 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 px-3 py-1.5 rounded-xl text-xs font-bold text-primary-400 transition-colors"
            >
              <ChatBubbleLeftRightIcon className="h-4.5 w-4.5 animate-pulse" />
              <span>Chat</span>
            </button>
          </div>

          <div className="space-y-3.5 text-xs text-neutral-400">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Customer Name:</span>
              <span className="font-bold text-white">{customer?.name || 'Customer'}</span>
            </div>
            {customer?.phone && (
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Phone:</span>
                <a href={`tel:${customer.phone}`} className="font-bold text-primary-400 hover:underline">{customer.phone}</a>
              </div>
            )}
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Vehicle:</span>
              <span className="font-bold text-white capitalize">{request.vehicleInfo?.make} {request.vehicleInfo?.model} ({request.vehicleInfo?.plate})</span>
            </div>
            {request.quotation && (
              <div className="flex justify-between">
                <span>Offer Agreement:</span>
                <span className="font-bold text-success-400">{formatCurrency(request.quotation)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CHAT PANEL SIDE BAR DRAWER */}
      {showChat && (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-neutral-900 border-l border-white/10 shadow-2xl z-[1100] flex flex-col animate-slide-in">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-neutral-950/40">
            <div>
              <h3 className="font-extrabold text-white text-sm">Chat with {customer?.name || 'Customer'}</h3>
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
                <ChatBubbleLeftRightIcon className="h-10 w-10 text-neutral-600 mb-2" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1 text-neutral-600">Send coordinate notes or checklist status details.</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.sender === 'mechanic' || msg.senderId === user?._id;
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

          {/* Input Form */}
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

      {/* COMPLETE SERVICE WORK INVOICE MODAL */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1200] p-4">
          <div className="glass-panel bg-neutral-900 border border-white/10 max-w-md w-full rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 rounded-full bg-success-500/5 blur-3xl"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-black text-white">Complete Service Request</h3>
                <p className="text-xs text-neutral-500">Provide work log and invoice summary</p>
              </div>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="p-1.5 bg-white/5 border border-white/10 rounded-xl text-neutral-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Work Summary</label>
                <textarea
                  required
                  value={completeForm.workSummary}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, workSummary: e.target.value }))}
                  placeholder="Detail the issues solved and parts replaced..."
                  rows="3"
                  className="w-full px-4 py-3 text-xs bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white leading-relaxed resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Final Invoice Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={completeForm.finalAmount}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, finalAmount: e.target.value }))}
                  placeholder="Enter final quote"
                  className="w-full px-4 py-3 text-xs bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white font-extrabold"
                  min="0"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 py-3 text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  className="flex-1 py-3 text-xs font-bold rounded-xl"
                >
                  Submit Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MechanicLiveTracker;
