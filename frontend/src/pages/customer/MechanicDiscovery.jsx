import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  StarIcon,
  PhoneIcon,
  ClockIcon,
  ViewColumnsIcon,
  MapIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import customerService from "../../services/customerService";
import { formatDistance } from "../../utils/helpers";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import ChatModal from "../../components/chat/ChatModal";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom icons for better visibility
const userLocationIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const mechanicIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const availableMechanicIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MechanicDiscovery = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("card"); // 'card' or 'map'
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMechanic, setChatMechanic] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [pendingFilters, setPendingFilters] = useState({
    search: "",
    rating: "",
    distance: "all", // Default all distances
    sortBy: "distance",
  });
  const [filters, setFilters] = useState({
    search: "",
    rating: "",
    distance: "all", // Default all distances
    sortBy: "distance",
  });

  const fetchMechanics = useCallback(
    async (activeFilters) => {
      try {
        setLoading(true);

        // Use provided filters or default to current filters
        const filtersToUse = activeFilters || filters;

        // Get user location first - ensure we have it before proceeding
        let currentLocation = userLocation;
        if (!currentLocation) {
          try {
            currentLocation = await getCurrentPosition();
            setUserLocation(currentLocation);
            setLocationError(null);
          } catch (error) {
            console.log("Using default location due to error:", error.message);
            // Use default location (New York City) if geolocation fails
            currentLocation = {
              latitude: 40.7128,
              longitude: -74.006,
            };
            setUserLocation(currentLocation);
            setLocationError(error.message);
          }
        }

        // Validate location data
        if (!currentLocation.latitude || !currentLocation.longitude) {
          throw new Error(
            "Unable to get your location. Please enable location services.",
          );
        }

        const params = {
          ...filtersToUse,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          maxDistance: filtersToUse.distance,
        };

        console.log("Fetching mechanics with params:", params);
        const response = await customerService.getNearbyMechanics(params);

        if (response.success) {
          setMechanics(response.data.mechanics || []);
        }
      } catch (error) {
        console.error("Error fetching mechanics:", error);
        setMechanics([]);
      } finally {
        setLoading(false);
      }
    },
    [userLocation, filters],
  );

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Location obtained:", position.coords);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          let errorMessage = "Unable to get your location";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location permission denied. Please enable location services.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
            default:
              errorMessage =
                "An unknown error occurred while getting location.";
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      );
    });
  };

  useEffect(() => {
    fetchMechanics();
  }, [fetchMechanics]);

  const handleFilterChange = (key, value) => {
    setPendingFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applySearch = async () => {
    try {
      const newFilters = { ...pendingFilters };
      console.log("Applying search with filters:", newFilters);

      // Update URL
      const queryParams = new URLSearchParams();
      if (newFilters.search) queryParams.set("search", newFilters.search);
      if (newFilters.rating) queryParams.set("rating", newFilters.rating);
      if (newFilters.distance) queryParams.set("distance", newFilters.distance);
      if (newFilters.sortBy) queryParams.set("sortBy", newFilters.sortBy);

      // Update state
      setFilters(newFilters);

      // Navigate with query params
      navigate(`/customer/mechanics?${queryParams.toString()}`);

      // Fetch mechanics with new filters - pass explicitly to avoid state timing issues
      await fetchMechanics(newFilters);
    } catch (error) {
      console.error("Error in applySearch:", error);
    }
  };

  useEffect(() => {
    const searchQuery = searchParams.get("search") || "";
    const rating = searchParams.get("rating") || "";
    const distance = searchParams.get("distance") || "all";
    const sortBy = searchParams.get("sortBy") || "distance";
    const newFilters = {
      search: searchQuery,
      rating,
      distance,
      sortBy,
    };
    setPendingFilters(newFilters);
    setFilters(newFilters);
  }, [searchParams]);

  const handleViewDetails = (mechanic) => {
    setSelectedMechanic(mechanic);
    setShowDetailsModal(true);
  };

  const handleBookService = (mechanic) => {
    // Navigate to booking page with mechanic pre-selected
    console.log("Navigating to book service with mechanic:", mechanic._id);
    const url = `/customer/book-service?mechanicId=${mechanic._id}`;
    console.log("Navigation URL:", url);
    navigate(url);
  };

  const handleStartChat = (mechanic) => {
    setChatMechanic(mechanic);
    setShowChatModal(true);
  };

  const getRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarIcon
          key={i}
          className={`h-4 w-4 ${
            i <= rating ? "text-primary-400 fill-current" : "text-neutral-600"
          }`}
        />,
      );
    }
    return stars;
  };

  const getStatusBadge = (isAvailable) => {
    return (
      <span
        className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
          isAvailable
            ? "bg-success-500/10 text-success-400 border-success-500/20"
            : "bg-danger-500/10 text-danger-400 border-danger-500/20"
        }`}
      >
        {isAvailable ? "Available" : "Busy"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Find Mechanics</h1>
          <p className="text-neutral-400">
            Discover mechanics{" "}
            {filters.distance === "all"
              ? "at all distances"
              : `within ${filters.distance}km`}{" "}
            of your location
          </p>
          {locationError && (
            <p className="text-sm text-warning-400 mt-1">
              ⚠️ Using default location: {locationError}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant={viewMode === "card" ? "primary" : "secondary"}
            onClick={() => setViewMode("card")}
          >
            <ViewColumnsIcon className="h-4 w-4 mr-2" />
            Card View
          </Button>
          <Button
            variant={viewMode === "map" ? "primary" : "secondary"}
            onClick={() => setViewMode("map")}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            Map View
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.05] rounded-2xl shadow p-4">
        {/* Compact Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:gap-3 items-end">
          {/* Search Field */}
          <div className="lg:flex-1 lg:min-w-60">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400" />
              <input
                type="text"
                placeholder="Search by name or services"
                value={pendingFilters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:bg-white/15 transition"
              />
            </div>
          </div>

          {/* Rating Dropdown */}
          <div className="w-full sm:w-auto">
            <select
              value={pendingFilters.rating}
              onChange={(e) => handleFilterChange("rating", e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:bg-white/15 transition font-medium"
            >
              <option value="">All Ratings</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2">2+ Stars</option>
            </select>
          </div>

          {/* Distance Dropdown */}
          <div className="w-full sm:w-auto">
            <select
              value={pendingFilters.distance}
              onChange={(e) => handleFilterChange("distance", e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:bg-white/15 transition font-medium"
            >
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="15">15 km</option>
              <option value="20">20 km</option>
              <option value="25">25 km</option>
              <option value="all">All Distances</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="w-full sm:w-auto">
            <select
              value={pendingFilters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:bg-white/15 transition font-medium"
            >
              <option value="distance">Nearest</option>
              <option value="rating">Top Rated</option>
              <option value="completedJobs">Most Experienced</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {/* Buttons row */}
          <div className="flex gap-2 col-span-full sm:col-span-2 lg:col-span-auto">
            {/* Search Button */}
            <button
              onClick={applySearch}
              disabled={loading}
              className="flex-1 lg:flex-none px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>

            {/* Apply Filter Button */}
            <button
              onClick={async () => {
                try {
                  const newFilters = { ...pendingFilters };
                  console.log("Applying filters:", newFilters);

                  setFilters(newFilters);
                  const queryParams = new URLSearchParams();
                  if (newFilters.rating)
                    queryParams.set("rating", newFilters.rating);
                  if (newFilters.distance)
                    queryParams.set("distance", newFilters.distance);
                  if (newFilters.sortBy)
                    queryParams.set("sortBy", newFilters.sortBy);
                  navigate(`/customer/mechanics?${queryParams.toString()}`);
                  await fetchMechanics(newFilters);
                } catch (error) {
                  console.error("Error applying filters:", error);
                }
              }}
              disabled={loading}
              className="flex-1 lg:flex-none px-6 py-3 bg-accent hover:bg-accent-600 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === "card" ? (
        /* Card View */
        (mechanics.length === 0 && (filters.search || filters.rating || filters.distance !== "all")) ? (
          <div className="glass-panel p-12 text-center max-w-md mx-auto my-8">
            <div className="h-16 w-16 bg-white/[0.05] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/[0.08]">
              <MagnifyingGlassIcon className="h-8 w-8 text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No mechanics found</h3>
            <p className="text-neutral-400 text-sm">
              We couldn't find any mechanics matching your filters. Try adjusting your search query, rating, or distance limit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mechanics.map((mechanic) => (
            <div
              key={mechanic._id}
              className="bg-white/[0.05] rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-tr from-primary-500/20 to-accent-dark/20 rounded-2xl flex items-center justify-center border border-primary-500/20 shadow-md">
                      <span className="text-primary-400 font-extrabold text-xl">
                        {mechanic.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-white">
                        {mechanic.name}
                      </h3>
                      <div className="flex items-center">
                        {getRatingStars(mechanic.rating || 0)}
                        <span className="ml-1 text-sm text-neutral-400">
                          ({mechanic.rating?.toFixed(1) || "N/A"})
                        </span>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(mechanic.isAvailable)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-neutral-400">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <span>{formatDistance(mechanic.distance)} away</span>
                  </div>
                  <div className="flex items-center text-sm text-neutral-400">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span>{mechanic.completedJobs || 0} jobs completed</span>
                  </div>
                  {mechanic.phone && (
                    <div className="flex items-center text-sm text-neutral-400">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      <span>{mechanic.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleViewDetails(mechanic)}
                    className="flex-1"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStartChat(mechanic)}
                    className="flex-1"
                  >
                    <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleBookService(mechanic)}
                    className="flex-1"
                    disabled={!mechanic.isAvailable}
                  >
                    Book Service
                  </Button>
                </div>
              </div>
            </div>
            ))}
          </div>
        )
      ) : (
        /* Map View */
        <>
          {mechanics.length === 0 && (filters.search || filters.rating || filters.distance !== "all") && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-4 text-center text-sm text-amber-400">
              No mechanics found matching your filters. Try adjusting your search query or selecting a larger distance.
            </div>
          )}
          <div className="bg-white/[0.05] rounded-2xl shadow overflow-hidden">
          <div className="h-96">
            <MapContainer
              center={
                userLocation
                  ? [userLocation.latitude, userLocation.longitude]
                  : [40.7128, -74.006]
              }
              zoom={10}
              className="h-full w-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* User location marker */}
              {userLocation && (
                <Marker
                  position={[userLocation.latitude, userLocation.longitude]}
                  icon={userLocationIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <strong>Your Location</strong>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Mechanic markers */}
              {mechanics.map((mechanic) => {
                // Check if mechanic has valid location data
                if (
                  !mechanic.location ||
                  typeof mechanic.location.lat !== "number" ||
                  typeof mechanic.location.lng !== "number"
                ) {
                  console.warn(
                    "Invalid location data for mechanic:",
                    mechanic._id,
                    mechanic.location,
                  );
                  return null;
                }

                return (
                  <Marker
                    key={mechanic._id}
                    position={[mechanic.location.lat, mechanic.location.lng]}
                    icon={
                      mechanic.isAvailable
                        ? availableMechanicIcon
                        : mechanicIcon
                    }
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold text-white">
                          {mechanic.name}
                        </h3>
                        <div className="flex items-center mb-2">
                          {getRatingStars(mechanic.rating || 0)}
                          <span className="ml-1 text-sm text-neutral-400">
                            ({mechanic.rating?.toFixed(1) || "N/A"})
                          </span>
                        </div>
                        <p className="text-sm text-neutral-400 mb-2">
                          {formatDistance(mechanic.distance)} away
                        </p>
                        <p className="text-sm text-neutral-400 mb-3">
                          {mechanic.completedJobs || 0} jobs completed
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(mechanic)}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleStartChat(mechanic)}
                            className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                          >
                            Chat
                          </button>
                          <button
                            onClick={() => handleBookService(mechanic)}
                            className="text-xs bg-success-500 text-white px-2 py-1 rounded hover:bg-green-600"
                            disabled={!mechanic.isAvailable}
                          >
                            Book Service
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
        </>
      )}

      {/* Mechanic Details Modal */}
      {showDetailsModal && selectedMechanic && (
        <div className="fixed inset-0 bg-black bg-opacity-65 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#121212] border border-white/[0.08] shadow-2xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedMechanic.name}
                  </h2>
                  <div className="flex items-center mt-2">
                    {getRatingStars(selectedMechanic.rating || 0)}
                    <span className="ml-2 text-neutral-400">
                      {selectedMechanic.rating?.toFixed(1) || "N/A"} (
                      {selectedMechanic.completedJobs || 0} jobs)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-neutral-500 hover:text-neutral-400"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-neutral-400">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      <span>{selectedMechanic.phone || "Not provided"}</span>
                    </div>
                    <div className="flex items-center text-neutral-400">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      <span>
                        {selectedMechanic.location?.address ||
                          "Location not available"}
                      </span>
                    </div>
                    <div className="flex items-center text-neutral-400">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      <span>
                        {formatDistance(selectedMechanic.distance)} away
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Services & Specialties
                  </h3>
                  <div className="space-y-2">
                    {selectedMechanic.specialties?.map((specialty, index) => (
                      <div
                        key={index}
                        className="bg-white/[0.05] px-3 py-1 rounded-full text-sm text-neutral-300"
                      >
                        {specialty}
                      </div>
                    )) || (
                      <p className="text-neutral-500">No specialties listed</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedMechanic.reviews &&
                selectedMechanic.reviews.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Recent Reviews
                    </h3>
                    <div className="space-y-3">
                      {selectedMechanic.reviews
                        .slice(0, 3)
                        .map((review, index) => (
                          <div
                            key={index}
                            className="border-l-4 border-blue-500 pl-4"
                          >
                            <div className="flex items-center mb-1">
                              {getRatingStars(review.rating)}
                              <span className="ml-2 text-sm font-medium">
                                {review.customerName}
                              </span>
                            </div>
                            <p className="text-neutral-400 text-sm">
                              {review.comment}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              <div className="flex space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStartChat(selectedMechanic)}
                  className="flex-1"
                >
                  <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                  Chat
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleBookService(selectedMechanic)}
                  className="flex-1"
                  disabled={!selectedMechanic.isAvailable}
                >
                  Book Service
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      <ChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        mechanic={chatMechanic}
      />
    </div>
  );
};

export default MechanicDiscovery;
