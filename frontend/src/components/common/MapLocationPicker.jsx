import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinIcon } from '@heroicons/react/24/outline';
import Button from './Button';
import { getCurrentLocation } from '../../utils/helpers';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for selected location
const selectedLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
const LocationMarker = ({ position, setPosition, onLocationSelect }) => {
  useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      if (onLocationSelect) {
        // Call the parent's location select handler which includes reverse geocoding
        onLocationSelect({
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
      }
    },
  });

  return position ? (
    <Marker position={position} icon={selectedLocationIcon}>
      <Popup>
        Selected Location
        <br />
        Lat: {position[0].toFixed(6)}
        <br />
        Lng: {position[1].toFixed(6)}
      </Popup>
    </Marker>
  ) : null;
};

const MapLocationPicker = ({ 
  onLocationSelect, 
  initialLocation = null,
  height = "400px",
  showCurrentLocationButton = true,
  className = ""
}) => {
  const [position, setPosition] = useState(initialLocation ? [initialLocation.lat, initialLocation.lng] : null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default to Delhi

  useEffect(() => {
    if (initialLocation) {
      setPosition([initialLocation.lat, initialLocation.lng]);
      setMapCenter([initialLocation.lat, initialLocation.lng]);
    } else {
      // Auto-detect location on mount
      handleGetCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation]);

  // Get current location
  const handleGetCurrentLocation = useCallback(async () => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      const newPosition = [location.lat, location.lng];
      setPosition(newPosition);
      setMapCenter(newPosition);
      setCurrentLocation(location);
      
      if (onLocationSelect) {
        onLocationSelect({
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy
        });
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setLoading(false);
    }
  }, [onLocationSelect]);

  // Reverse geocoding to get address (you can implement this with a geocoding service)
  const reverseGeocode = async (lat, lng) => {
    try {
      // Using Nominatim for reverse geocoding (free but rate limited)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const handleLocationSelect = async (location) => {
    const address = await reverseGeocode(location.lat, location.lng);
    if (onLocationSelect) {
      onLocationSelect({
        ...location,
        address
      });
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {showCurrentLocationButton && (
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-neutral-400">
            Click on the map to select a location or use your current location
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetCurrentLocation}
            loading={loading}
            disabled={loading}
            icon={<MapPinIcon className="h-4 w-4" />}
          >
            Use Current Location
          </Button>
        </div>
      )}
      
      <div 
        className="border border-white/[0.1] rounded-2xl overflow-hidden"
        style={{ height }}
      >
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <LocationMarker 
            position={position} 
            setPosition={setPosition}
            onLocationSelect={handleLocationSelect}
          />
          
          {/* Show current location marker if available */}
          {currentLocation && (
            <Marker position={[currentLocation.lat, currentLocation.lng]}>
              <Popup>
                Your Current Location
                <br />
                Accuracy: ±{currentLocation.accuracy}m
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      
      {position && (
        <div className="mt-2 p-3 bg-white/[0.03] rounded-2xl">
          <p className="text-sm text-neutral-300">
            <strong>Selected Location:</strong>
          </p>
          <p className="text-xs text-neutral-400">
            Latitude: {position[0].toFixed(6)}, Longitude: {position[1].toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
};

export default MapLocationPicker;
