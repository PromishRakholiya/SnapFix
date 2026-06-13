import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MapPinIcon, 
  PhoneIcon,
  ClockIcon,
  TruckIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import Button from '../common/Button';
import mechanicApi from '../../api/mechanicApi';
import { formatDistance, formatDuration } from '../../utils/helpers';
import toast from 'react-hot-toast';

const NavigationModal = ({ isOpen, onClose, request, mechanicLocation }) => {
  const [distance, setDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && request?.location) {
      if (mechanicLocation) {
        calculateRoute();
      } else {
        // Try to get current location if not provided
        getCurrentLocation();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, request, mechanicLocation]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          calculateRouteWithLocation(currentLocation);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your current location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };

  const calculateRouteWithLocation = (location) => {
    if (!request?.location || !location) return;

    setLoading(true);
    try {
      // Calculate distance using Haversine formula
      const distanceInKm = calculateDistance(
        location.lat,
        location.lng,
        request.location.lat,
        request.location.lng
      );
      setDistance(distanceInKm);

      // Estimate travel time (assuming average speed of 30 km/h in city)
      const estimatedTimeInMinutes = Math.ceil((distanceInKm / 30) * 60);
      setEstimatedTime(estimatedTimeInMinutes);
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRoute = async () => {
    if (!request?.location || !mechanicLocation) return;
    calculateRouteWithLocation(mechanicLocation);
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const openGoogleMaps = () => {
    if (!request?.location) return;
    
    const { lat, lng, address } = request.location;
    const destination = address || `${lat},${lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(url, '_blank');
  };

  const openAppleMaps = () => {
    if (!request?.location) return;
    
    const { lat, lng, address } = request.location;
    const destination = address || `${lat},${lng}`;
    const url = `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}`;
    window.open(url, '_blank');
  };

  const openWaze = () => {
    if (!request?.location) return;
    
    const { lat, lng } = request.location;
    const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    window.open(url, '_blank');
  };

  const callCustomer = () => {
    if (request?.customerId?.phone) {
      window.open(`tel:${request.customerId.phone}`, '_self');
    }
  };

  const copyAddressToClipboard = async () => {
    if (!request?.location?.address) return;
    
    try {
      await navigator.clipboard.writeText(request.location.address);
      toast.success('Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address');
    }
  };

  const updateRequestStatus = async (status) => {
    try {
      const response = await mechanicApi.updateRequestStatus(request._id, { status });
      
      if (response.success) {
        toast.success(`Request marked as ${status}`);
        onClose(); // Close the modal after successful update
      } else {
        toast.error('Failed to update request status');
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white/[0.05] rounded-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Navigation</h2>
              <p className="text-neutral-400 mt-1">Get directions to customer location</p>
            </div>
            <Button
              variant="secondary"
              onClick={onClose}
              icon={<XMarkIcon className="h-4 w-4" />}
            >
              Close
            </Button>
          </div>

          {/* Customer Info */}
          <div className="bg-white/[0.03] rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-white mb-2">Customer Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4 text-neutral-500" />
                <span className="text-neutral-400">
                  {request.customerId?.name || 'Customer'}
                </span>
              </div>
              {request.customerId?.phone && (
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4 text-neutral-500" />
                  <span className="text-neutral-400">{request.customerId.phone}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <MapPinIcon className="h-4 w-4 text-neutral-500 mt-0.5" />
                <div className="flex-1">
                  <span className="text-neutral-400">
                    {request.location?.address || 'Address not specified'}
                  </span>
                  {request.location?.address && (
                    <button
                      onClick={copyAddressToClipboard}
                      className="ml-2 text-primary-400 hover:text-primary-400"
                      title="Copy address"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Route Information */}
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-neutral-400 mt-2">Calculating route...</p>
            </div>
          ) : (
            <div className="bg-blue-500/10 rounded-2xl p-4 mb-6">
              <h3 className="font-semibold text-white mb-3">Route Information</h3>
              <div className="space-y-3">
                {distance && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Distance:</span>
                    <span className="font-medium">{formatDistance(distance)}</span>
                  </div>
                )}
                {estimatedTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Estimated Time:</span>
                    <span className="font-medium">{formatDuration(estimatedTime)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Service Type:</span>
                  <span className="font-medium capitalize">
                    {request.issueType?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Map Preview */}
          {request?.location && (
            <div className="bg-white/[0.03] rounded-2xl p-4 mb-6">
              <h3 className="font-semibold text-white mb-3">Location Preview</h3>
              <div className="bg-white/[0.05] rounded-2xl p-3 border">
                {/* Exact Coordinates */}
                <div className="bg-blue-500/10 border border-blue-200 rounded-2xl p-3 mb-3">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    📍 Exact Coordinates
                  </label>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-400">Latitude:</span>
                      <span className="text-sm font-mono text-blue-900 bg-white/[0.05] px-2 py-1 rounded border">
                        {request.location.lat.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-400">Longitude:</span>
                      <span className="text-sm font-mono text-blue-900 bg-white/[0.05] px-2 py-1 rounded border">
                        {request.location.lng.toFixed(6)}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const coords = `${request.location.lat.toFixed(6)}, ${request.location.lng.toFixed(6)}`;
                        navigator.clipboard.writeText(coords);
                        toast.success('Coordinates copied to clipboard');
                      }}
                      className="w-full bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Copy Coordinates
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-neutral-400">
                  {request.location.address || 'Address not specified'}
                </div>
                <div className="mt-3">
                  <a
                    href={`https://www.google.com/maps?q=${request.location.lat},${request.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-400 text-sm font-medium"
                  >
                    View on Google Maps →
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Options */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-white">Open Navigation</h3>
            
            <Button
              onClick={openGoogleMaps}
              variant="primary"
              className="w-full justify-center"
              icon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />}
            >
              Open Google Maps
            </Button>
            
            <Button
              onClick={openAppleMaps}
              variant="outline"
              className="w-full justify-center"
              icon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />}
            >
              Open Apple Maps
            </Button>
            
            <Button
              onClick={openWaze}
              variant="outline"
              className="w-full justify-center"
              icon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />}
            >
              Open Waze
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-white">Quick Actions</h3>
            
            {request.customerId?.phone && (
              <Button
                onClick={callCustomer}
                variant="outline"
                className="w-full justify-center"
                icon={<PhoneIcon className="h-4 w-4" />}
              >
                Call Customer
              </Button>
            )}
            
            <Button
              onClick={() => updateRequestStatus('enroute')}
              variant="primary"
              className="w-full justify-center"
              icon={<ClockIcon className="h-4 w-4" />}
            >
              Mark as En Route
            </Button>
          </div>

          {/* Service Details */}
          <div className="bg-white/[0.03] rounded-2xl p-4">
            <h3 className="font-semibold text-white mb-2">Service Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Vehicle:</span>
                <span className="font-medium">
                  {request.vehicleInfo?.make} {request.vehicleInfo?.model}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Plate:</span>
                <span className="font-medium">{request.vehicleInfo?.plate}</span>
              </div>
              {request.quotation && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Quotation:</span>
                  <span className="font-medium">₹{request.quotation}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationModal;
