import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPinIcon,
  PlayIcon,
  PauseIcon,
  SignalIcon,
  ClockIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import Button from '../common/Button';
import { getCurrentLocation, calculateDistance, formatTime } from '../../utils/helpers';
import socketService from '../../services/socketService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Custom mechanic location icon
const mechanicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Customer location icon
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const LiveTracker = ({ activeRequest = null, onLocationUpdate }) => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [trackingStats, setTrackingStats] = useState({
    totalDistance: 0,
    startTime: null,
    estimatedArrival: null
  });
  const [watchId, setWatchId] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);

  // Start/stop tracking based on active request
  useEffect(() => {
    if (activeRequest && activeRequest.status === 'assigned') {
      startTracking();
    } else if (!activeRequest || activeRequest.status === 'completed') {
      stopTracking();
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeRequest]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    if (isTracking) {
      toast.info('Location tracking is already active');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading
        };

        setCurrentLocation(newLocation);
        setAccuracy(position.coords.accuracy);
        setLastUpdate(new Date());

        // Add to location history
        setLocationHistory(prev => {
          const updated = [...prev, newLocation];
          // Keep only last 100 locations to avoid memory issues
          return updated.slice(-100);
        });

        // Calculate distance and ETA if we have an active request
        if (activeRequest && activeRequest.location) {
          updateTrackingStats(newLocation, activeRequest.location);
        }

        // Send location update via socket
        if (socketService.isConnected() && activeRequest) {
          socketService.updateLocation(newLocation, activeRequest._id);
        }

        // Call external callback if provided
        if (onLocationUpdate) {
          onLocationUpdate(newLocation);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let message = 'Unable to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        
        toast.error(message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000 // Update every 5 seconds
      }
    );

    setWatchId(id);
    setIsTracking(true);
    setTrackingStats(prev => ({
      ...prev,
      startTime: new Date()
    }));
    
    toast.success('Live location tracking started');
  }, [activeRequest, isTracking, onLocationUpdate]);

  const stopTracking = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    
    setIsTracking(false);
    setTrackingStats({
      totalDistance: 0,
      startTime: null,
      estimatedArrival: null
    });
    
    if (isTracking) {
      toast.success('Location tracking stopped');
    }
  }, [watchId, isTracking]);

  const updateTrackingStats = (newLocation, customerLocation) => {
    const distance = calculateDistance(
      newLocation.lat,
      newLocation.lng,
      customerLocation.lat,
      customerLocation.lng
    );

    // Simple ETA calculation based on average speed (assuming 30 km/h in city)
    const averageSpeed = 30; // km/h
    const estimatedTime = (distance / averageSpeed) * 60; // minutes
    const estimatedArrival = new Date(Date.now() + estimatedTime * 60000);

    setTrackingStats(prev => ({
      ...prev,
      estimatedArrival
    }));
  };

  const handleEmergencyAlert = () => {
    if (currentLocation && activeRequest) {
      socketService.sendEmergencyAlert(activeRequest._id, currentLocation);
      toast.success('Emergency alert sent to customer and admin');
    } else {
      toast.error('Unable to send emergency alert - location not available');
    }
  };

  const getMapCenter = () => {
    if (currentLocation) {
      return [currentLocation.lat, currentLocation.lng];
    }
    if (activeRequest && activeRequest.location) {
      return [activeRequest.location.lat, activeRequest.location.lng];
    }
    return [28.6139, 77.2090]; // Default to Delhi
  };

  const getConnectionStatus = () => {
    if (!isTracking) return 'offline';
    if (accuracy > 50) return 'poor';
    if (accuracy > 20) return 'good';
    return 'excellent';
  };

  const getConnectionColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-success-400';
      case 'good': return 'text-primary-400';
      case 'poor': return 'text-warning-400';
      default: return 'text-danger-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tracking Controls */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <TruckIcon className="h-6 w-6 mr-2 text-primary-400" />
            Live Location Tracking
          </h2>
          
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 ${getConnectionColor(getConnectionStatus())}`}>
              <SignalIcon className="h-5 w-5" />
              <span className="text-sm font-medium capitalize">
                {getConnectionStatus()}
              </span>
            </div>
            
            <Button
              variant={isTracking ? "danger" : "primary"}
              onClick={isTracking ? stopTracking : startTracking}
              icon={isTracking ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            >
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Button>
          </div>
        </div>

        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.03] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Status</p>
                <p className={`font-medium ${isTracking ? 'text-success-400' : 'text-neutral-400'}`}>
                  {isTracking ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-success-500' : 'bg-secondary-400'}`} />
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-2xl p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-neutral-400 mr-2" />
              <div>
                <p className="text-sm text-neutral-400">Last Update</p>
                <p className="font-medium text-white">
                  {lastUpdate ? formatTime(lastUpdate) : 'Never'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-2xl p-4">
            <div className="flex items-center">
              <MapPinIcon className="h-5 w-5 text-neutral-400 mr-2" />
              <div>
                <p className="text-sm text-neutral-400">Accuracy</p>
                <p className="font-medium text-white">
                  {accuracy ? `±${Math.round(accuracy)}m` : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-2xl p-4">
            <div className="flex items-center">
              <TruckIcon className="h-5 w-5 text-neutral-400 mr-2" />
              <div>
                <p className="text-sm text-neutral-400">ETA</p>
                <p className="font-medium text-white">
                  {trackingStats.estimatedArrival 
                    ? formatTime(trackingStats.estimatedArrival)
                    : 'Calculating...'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Current Location</h3>
        
        <div className="h-96 rounded-2xl overflow-hidden border border-white/[0.08]">
          <MapContainer
            center={getMapCenter()}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Mechanic's current location */}
            {currentLocation && (
              <Marker position={[currentLocation.lat, currentLocation.lng]} icon={mechanicIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-medium">Your Location</p>
                    <p className="text-sm text-neutral-400">
                      Accuracy: ±{Math.round(accuracy || 0)}m
                    </p>
                    <p className="text-sm text-neutral-400">
                      Updated: {formatTime(lastUpdate)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Customer location if active request */}
            {activeRequest && activeRequest.location && (
              <Marker 
                position={[activeRequest.location.lat, activeRequest.location.lng]} 
                icon={customerIcon}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-medium">Customer Location</p>
                    <p className="text-sm text-neutral-400">
                      {activeRequest.customer?.name || 'Customer'}
                    </p>
                    <p className="text-sm text-neutral-400">
                      {activeRequest.location.address || 'Service location'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      {/* Active Request Info */}
      {activeRequest && (
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Request</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-white mb-2">Customer Information</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {activeRequest.customer?.name || 'Unknown'}</p>
                <p><strong>Phone:</strong> {activeRequest.customer?.phone || 'Unknown'}</p>
                <p><strong>Issue:</strong> {activeRequest.issueType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p><strong>Vehicle:</strong> {activeRequest.vehicleInfo?.model} ({activeRequest.vehicleInfo?.plate})</p>
              </div>
              
              <div className="mt-4 flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${activeRequest.customer?.phone}`)}
                  icon={<PhoneIcon className="h-4 w-4" />}
                >
                  Call Customer
                </Button>
                
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleEmergencyAlert}
                  icon={<ExclamationTriangleIcon className="h-4 w-4" />}
                >
                  Emergency Alert
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Request Details</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Priority:</strong> <span className="capitalize">{activeRequest.priority}</span></p>
                <p><strong>Status:</strong> <span className="capitalize">{activeRequest.status}</span></p>
                {activeRequest.quotation && (
                  <p><strong>Quotation:</strong> ₹{activeRequest.quotation}</p>
                )}
                {currentLocation && activeRequest.location && (
                  <p><strong>Distance:</strong> {
                    calculateDistance(
                      currentLocation.lat,
                      currentLocation.lng,
                      activeRequest.location.lat,
                      activeRequest.location.lng
                    ).toFixed(1)
                  } km</p>
                )}
              </div>
              
              {activeRequest.description && (
                <div className="mt-4">
                  <p className="font-medium text-white mb-1">Description:</p>
                  <p className="text-sm text-neutral-400 bg-white/[0.03] p-3 rounded">
                    {activeRequest.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tracking Guidelines Below*/}
      {!activeRequest && (
        <div className="bg-blue-500/10 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Location Tracking Guidelines</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Location tracking automatically starts when you accept a request</li>
            <li>• Your location is shared with the customer for better service coordination</li>
            <li>• Tracking stops when the request is completed or cancelled</li>
            <li>• Emergency alerts can be sent if you encounter any issues</li>
            <li>• Location data is used only for service delivery and is not stored permanently</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default LiveTracker;
