import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from './Button';
import { getCurrentLocation } from '../../utils/helpers';
import toast from 'react-hot-toast';

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

// Map Controller for smooth transitions
const MapController = ({ center }) => {
  const map = useMapEvents({});
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

// Component to handle map clicks
const LocationMarker = ({ position, setPosition, onLocationSelect }) => {
  useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      if (onLocationSelect) {
        onLocationSelect({
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
      }
    },
  });

  return position ? (
    <Marker position={position} icon={selectedLocationIcon}>
      <Popup className="rounded-xl overflow-hidden">
        <div className="text-center font-medium">Selected Location</div>
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
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (initialLocation) {
      setPosition([initialLocation.lat, initialLocation.lng]);
      setMapCenter([initialLocation.lat, initialLocation.lng]);
    } else {
      // Auto-detect location on mount if no initial location
      handleGetCurrentLocation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation]);

  // Reverse geocoding to get address
  const reverseGeocode = async (lat, lng) => {
    try {
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

  // Get current location
  const handleGetCurrentLocation = useCallback(async (showToast = true) => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      const newPosition = [location.lat, location.lng];
      setPosition(newPosition);
      setMapCenter(newPosition);
      setCurrentLocation(location);
      
      // Fix: Await address resolution when setting current location!
      await handleLocationSelect({
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy
      });
      
      if (showToast) {
        toast.success("Location acquired successfully");
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      if (showToast) {
        toast.error('Unable to get current location. Please check your permissions.');
      }
    } finally {
      setLoading(false);
    }
  }, [onLocationSelect]);

  // Search location
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      setSearchResults(data);
      setShowDropdown(true);
      if(data.length === 0) {
          toast.error("No locations found for this query.");
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Location search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const newPosition = [lat, lng];
    
    setPosition(newPosition);
    setMapCenter(newPosition);
    setSearchResults([]);
    setSearchQuery('');
    setShowDropdown(false);
    
    // Reverse geocode explicitly to maintain consistency, or just use display_name
    if (onLocationSelect) {
      onLocationSelect({
        lat,
        lng,
        address: result.display_name
      });
    }
  };

  return (
    <div className={`w-full flex flex-col gap-4 ${className}`}>
      {/* Search and Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/[0.05]">
        
        {/* Search Bar */}
        <div className="relative flex-1 w-full max-w-xl">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400 group-focus-within:text-primary-400 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch(e);
                }
              }}
              placeholder="Search for a city, area, or street..."
              className="w-full pl-11 pr-12 py-3 bg-white/[0.04] border border-white/[0.1] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white/[0.06] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-[1000] w-full mt-2 bg-neutral-900 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/50">
              <ul className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
                {searchResults.map((result, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full text-left px-5 py-3 hover:bg-white/[0.06] flex items-start gap-3 transition-colors border-b border-white/[0.05] last:border-0"
                    >
                      <MapPinIcon className="h-5 w-5 text-primary-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-neutral-300 leading-snug">{result.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Current Location Action */}
        {showCurrentLocationButton && (
          <Button
            variant="outline"
            size="md"
            onClick={() => handleGetCurrentLocation(true)}
            loading={loading}
            disabled={loading}
            className="flex-shrink-0 whitespace-nowrap !rounded-xl !border-white/[0.1] hover:!bg-white/[0.05]"
            icon={<MapPinIcon className="h-5 w-5" />}
          >
            Use Current Location
          </Button>
        )}
      </div>
      
      {/* Map Display */}
      <div 
        className="border-2 border-white/[0.05] rounded-3xl overflow-hidden shadow-lg bg-neutral-900 relative z-0 group"
        style={{ height }}
      >
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: '100%', width: '100%', minHeight: '300px' }}
          scrollWheelZoom={true}
          className="focus:outline-none"
        >
          {/* Using Standard OpenStreetMap for a white, clear map */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController center={mapCenter} />
          
          <LocationMarker 
            position={position} 
            setPosition={setPosition}
            onLocationSelect={handleLocationSelect}
          />
          
          {/* Show current location marker if available */}
          {currentLocation && (
            <Marker position={[currentLocation.lat, currentLocation.lng]}>
              <Popup className="rounded-xl">
                <div className="font-medium text-center">Your Device Location</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {isSearching && (
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 shadow-xl"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapLocationPicker;
