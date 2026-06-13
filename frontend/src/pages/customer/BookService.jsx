import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  WrenchScrewdriverIcon,
  PhotoIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  UserIcon,
  StarIcon,
  PhoneIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Button from "../../components/common/Button";
import MapLocationPicker from "../../components/common/MapLocationPicker";
import requestService from "../../services/requestService";
import customerApi from "../../api/customerApi";
import { useAuth } from "../../contexts/AuthContext";
import {
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  PRIORITY_LEVELS,
  PRIORITY_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
} from "../../utils/constants";
import toast from "react-hot-toast";

const BookService = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [loadingMechanic, setLoadingMechanic] = useState(true);
  const [formData, setFormData] = useState({
    issueType: "",
    description: "",
    vehicleInfo: {
      type: "",
      model: "",
      plate: "",
      year: new Date().getFullYear(),
    },
    location: null,
    priority: searchParams.get("priority") || "medium",
    images: [],
    userExpectedPrice: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [selectedVehicleName, setSelectedVehicleName] = useState("");

  console.log("BookService component loaded");
  console.log("Search params:", searchParams.toString());

  useEffect(() => {
    // Load mechanic details if mechanicId is provided
    const mechanicId = searchParams.get("mechanicId");
    console.log("Mechanic ID from params:", mechanicId);

    if (mechanicId) {
      // Validate mechanicId format
      if (!mechanicId.match(/^[0-9a-fA-F]{24}$/)) {
        toast.error("Invalid mechanic ID format");
        navigate("/customer/mechanics");
        return;
      }
      loadMechanicDetails(mechanicId);
    } else {
      setLoadingMechanic(false);
      // If no mechanicId is provided, redirect to mechanic discovery
      toast.error("No mechanic selected. Please select a mechanic first.");
      navigate("/customer/mechanics");
    }

    // Fetch user's vehicles
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showVehicleDropdown && !event.target.closest(".vehicle-dropdown")) {
        setShowVehicleDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showVehicleDropdown]);

  // Add error boundary after hooks
  if (!user) {
    console.error("User not found in BookService");
    return <div>Loading...</div>;
  }

  const loadMechanicDetails = async (mechanicId) => {
    try {
      setLoadingMechanic(true);
      console.log("Loading mechanic details for ID:", mechanicId);
      const response = await customerApi.getMechanicDetails(mechanicId);
      console.log("Mechanic details response:", response);

      if (response.success) {
        setSelectedMechanic(response.data);
      } else {
        toast.error("Failed to load mechanic details");
        navigate("/customer/mechanics");
      }
    } catch (error) {
      console.error("Error loading mechanic details:", error);
      toast.error("Failed to load mechanic details");
      navigate("/customer/mechanics");
    } finally {
      setLoadingMechanic(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await customerApi.getVehicles();
      if (response.success) {
        setVehicles(response.data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles");
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleVehicleSelect = (vehicle) => {
    setFormData((prev) => ({
      ...prev,
      vehicleInfo: {
        type: vehicle.type,
        model: `${vehicle.make} ${vehicle.model}`.trim(),
        plate: vehicle.plate,
        year: vehicle.year,
      },
    }));
    setSelectedVehicleName(vehicle.name);
    setShowVehicleDropdown(false);
    toast.success(`Selected vehicle: ${vehicle.name}`);
  };

  const handleAddNewVehicle = () => {
    setShowVehicleDropdown(false);
    setSelectedVehicleName("");
    // Clear the form to allow manual entry
    setFormData((prev) => ({
      ...prev,
      vehicleInfo: {
        type: "",
        model: "",
        plate: "",
        year: new Date().getFullYear(),
      },
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleLocationSelect = (location) => {
    // Ensure location always has an address field
    const locationWithAddress = {
      ...location,
      address:
        location.address ||
        `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
    };

    setFormData((prev) => ({
      ...prev,
      location: locationWithAddress,
    }));

    if (errors.location) {
      setErrors((prev) => ({
        ...prev,
        location: "",
      }));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isValidType = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit

      if (!isValidType) {
        toast.error(`${file.name} is not a valid image type`);
      }
      if (!isValidSize) {
        toast.error(`${file.name} is too large (max 5MB)`);
      }

      return isValidType && isValidSize;
    });

    if (validFiles.length > 0) {
      setImageFiles((prev) => [...prev, ...validFiles].slice(0, 5)); // Max 5 images
    }
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    console.log("Validating form data:", formData);

    if (!formData.issueType) {
      newErrors.issueType = "Please select an issue type";
    }

    if (!formData.description || !formData.description.trim()) {
      newErrors.description = "Please provide a description of the issue";
    }

    if (!formData.vehicleInfo.type) {
      newErrors["vehicleInfo.type"] = "Please select vehicle type";
    }

    if (
      !formData.vehicleInfo.model ||
      formData.vehicleInfo.model.trim().length < 2
    ) {
      newErrors["vehicleInfo.model"] = "Please enter a valid vehicle model";
    }

    if (
      !formData.vehicleInfo.plate ||
      formData.vehicleInfo.plate.trim().length < 3
    ) {
      newErrors["vehicleInfo.plate"] = "Please enter a valid license plate";
    }

    if (!formData.location) {
      newErrors.location = "Please select your location";
    } else if (!formData.location.lat || !formData.location.lng) {
      newErrors.location = "Please select a valid location on the map";
    }

    if (
      formData.userExpectedPrice === undefined ||
      formData.userExpectedPrice === null ||
      formData.userExpectedPrice === ""
    ) {
      newErrors.userExpectedPrice = "Please enter your expected price";
    }

    console.log("Validation errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log(
      "Form data before validation:",
      JSON.stringify(formData, null, 2),
    );

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    if (!selectedMechanic) {
      toast.error("No mechanic selected");
      return;
    }

    setLoading(true);

    try {
      // Upload images first
      let imageUrls = [];
      if (imageFiles.length > 0) {
        setUploadingImages(true);
        try {
          const uploadResponse = await requestService.uploadImages(imageFiles);
          if (uploadResponse.success) {
            imageUrls =
              uploadResponse.data.imageUrls || uploadResponse.data.urls; // Support both just in case
          }
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          toast.warning(
            "Failed to upload some images, continuing without them",
          );
        } finally {
          setUploadingImages(false);
        }
      }

      // Create service request with specific mechanic
      const requestData = {
        ...formData,
        images: imageUrls,
        mechanicId: selectedMechanic._id, // Direct booking to specific mechanic
        isDirectBooking: true, // Flag to indicate this is a direct booking
      };

      console.log(
        "Request data being sent:",
        JSON.stringify(requestData, null, 2),
      );

      const response = await requestService.createRequest(requestData);

      if (response.success) {
        toast.success("Service request sent to mechanic successfully!");
        navigate(`/customer/dashboard`);
      } else {
        toast.error(response.message || "Failed to create service request");
      }
    } catch (error) {
      console.error("Error creating service request:", error);
      toast.error("Failed to create service request. Please try again.");
    } finally {
      setLoading(false);
    }
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

  if (loadingMechanic) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Book Service</h1>
              <p className="text-neutral-400">
                Send a direct service request to the selected mechanic
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <WrenchScrewdriverIcon className="h-8 w-8 text-primary-400" />
            </div>
          </div>

          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-neutral-400">Loading mechanic details...</p>
              <p className="text-sm text-neutral-500 mt-1">
                Please wait while we fetch the mechanic information
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Book Service</h1>
            <p className="text-neutral-400">
              Send a direct service request to the selected mechanic
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <WrenchScrewdriverIcon className="h-8 w-8 text-primary-400" />
          </div>
        </div>

        {selectedMechanic ? (
          <div className="bg-white/[0.03] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-primary-500/15 rounded-full flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-primary-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    {selectedMechanic.name}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-neutral-400">
                    <div className="flex items-center">
                      {getRatingStars(selectedMechanic.rating || 0)}
                      <span className="ml-1">
                        ({selectedMechanic.rating?.toFixed(1) || "N/A"})
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      <span>
                        {selectedMechanic.location?.address ||
                          "Location not available"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      <span>
                        {selectedMechanic.phone || "Phone not available"}
                      </span>
                    </div>
                    {selectedMechanic.specialties &&
                      selectedMechanic.specialties.length > 0 && (
                        <div className="flex items-center">
                          <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
                          <span>{selectedMechanic.specialties.join(", ")}</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-500/15 text-green-800">
                  Direct Booking
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/customer/mechanics")}
                >
                  Change Mechanic
                </Button>
              </div>
            </div>

            {/* Additional Mechanic Info */}
            {selectedMechanic.reviews &&
              selectedMechanic.reviews.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.08]">
                  <h4 className="text-sm font-medium text-neutral-300 mb-2">
                    Recent Reviews
                  </h4>
                  <div className="space-y-2">
                    {selectedMechanic.reviews
                      .slice(0, 2)
                      .map((review, index) => (
                        <div
                          key={index}
                          className="bg-white/[0.05] rounded p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">
                              {review.customerName}
                            </span>
                            <div className="flex items-center">
                              {getRatingStars(review.rating)}
                            </div>
                          </div>
                          <p className="text-sm text-neutral-400">
                            {review.comment}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        ) : (
          <div className="bg-danger-500/10 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-danger-400 mr-2" />
                <span className="text-danger-400">
                  Mechanic details not found
                </span>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => navigate("/customer/mechanics")}
              >
                Find Mechanic
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Service Request Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Issue Type Selection */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <WrenchScrewdriverIcon className="h-6 w-6 mr-2 text-primary-400" />
            What's the problem?
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {Object.entries(ISSUE_TYPES).map(([key, value]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, issueType: value }))
                }
                className={`p-4 border-2 rounded-2xl text-center transition-all ${
                  formData.issueType === value
                    ? "border-primary-500 bg-primary-500/10 text-primary-400"
                    : "border-white/[0.1] hover:border-secondary-400 text-neutral-300"
                }`}
              >
                <div className="font-medium">{ISSUE_TYPE_LABELS[value]}</div>
              </button>
            ))}
          </div>

          {errors.issueType && (
            <p className="text-danger-400 text-sm">{errors.issueType}</p>
          )}
        </div>

        {/* Description */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Describe the Issue
          </h2>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Please provide a detailed description of the problem..."
            className={`w-full p-3 border rounded-2xl resize-none ${
              errors.description ? "border-danger-500" : "border-white/[0.1]"
            }`}
            rows={4}
          />
          {errors.description && (
            <p className="text-danger-400 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        {/* Vehicle Information */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Vehicle Information
          </h2>

          {/* Vehicle Selector Dropdown */}
          {vehicles.length > 0 ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Select from your vehicles
              </label>
              <div className="relative vehicle-dropdown">
                <button
                  type="button"
                  onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                  className="w-full flex items-center justify-between p-3 border border-white/[0.1] rounded-2xl bg-white/[0.05] hover:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <span className="text-white">
                    {loadingVehicles
                      ? "Loading vehicles..."
                      : selectedVehicleName
                        ? `Selected: ${selectedVehicleName}`
                        : "Choose a vehicle from your profile"}
                  </span>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-neutral-500 transition-transform ${showVehicleDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showVehicleDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white/[0.05] border border-white/[0.1] rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                    {vehicles.map((vehicle) => (
                      <button
                        key={vehicle._id}
                        type="button"
                        onClick={() => handleVehicleSelect(vehicle)}
                        className="w-full px-4 py-3 text-left hover:bg-white/[0.03] border-b border-white/[0.06] last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">
                              {vehicle.name}
                            </p>
                            <p className="text-sm text-neutral-400">
                              {vehicle.make} {vehicle.model} • {vehicle.plate}
                            </p>
                          </div>
                          <div className="text-xs text-neutral-500">
                            {vehicle.type}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddNewVehicle}
                      className="w-full px-4 py-3 text-left hover:bg-white/[0.03] border-t border-white/[0.08] flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2 text-primary-400" />
                      <span className="text-primary-400 font-medium">
                        Add new vehicle
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Select a vehicle from your profile or add a new one below
              </p>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08]">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-secondary-200 rounded-full flex items-center justify-center">
                    <span className="text-neutral-400 text-sm">🚗</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    No vehicles in your profile
                  </p>
                  <p className="text-sm text-neutral-400">
                    You can add vehicles to your profile for faster booking.
                    Enter vehicle details below or{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/customer/profile")}
                      className="text-primary-400 hover:text-primary-400 font-medium"
                    >
                      manage your vehicles
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Vehicle Type *
              </label>
              <select
                name="vehicleInfo.type"
                value={formData.vehicleInfo.type}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-2xl ${
                  errors["vehicleInfo.type"]
                    ? "border-danger-500"
                    : "border-white/[0.1]"
                }`}
              >
                <option value="">Select vehicle type</option>
                {Object.entries(VEHICLE_TYPES).map(([key, value]) => (
                  <option key={value} value={value}>
                    {VEHICLE_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
              {errors["vehicleInfo.type"] && (
                <p className="text-danger-400 text-sm mt-1">
                  {errors["vehicleInfo.type"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Model *
              </label>
              <input
                type="text"
                name="vehicleInfo.model"
                value={formData.vehicleInfo.model}
                onChange={handleInputChange}
                placeholder="e.g., Honda City, Maruti Swift"
                className={`w-full p-3 border rounded-2xl ${
                  errors["vehicleInfo.model"]
                    ? "border-danger-500"
                    : "border-white/[0.1]"
                }`}
              />
              {errors["vehicleInfo.model"] && (
                <p className="text-danger-400 text-sm mt-1">
                  {errors["vehicleInfo.model"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                License Plate *
              </label>
              <input
                type="text"
                name="vehicleInfo.plate"
                value={formData.vehicleInfo.plate}
                onChange={handleInputChange}
                placeholder="e.g., DL01AB1234"
                className={`w-full p-3 border rounded-2xl ${
                  errors["vehicleInfo.plate"]
                    ? "border-danger-500"
                    : "border-white/[0.1]"
                }`}
              />
              {errors["vehicleInfo.plate"] && (
                <p className="text-danger-400 text-sm mt-1">
                  {errors["vehicleInfo.plate"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Year
              </label>
              <input
                type="number"
                name="vehicleInfo.year"
                value={formData.vehicleInfo.year}
                onChange={handleInputChange}
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full p-3 border border-white/[0.1] rounded-2xl"
              />
            </div>
          </div>
        </div>

        {/* Location Selection */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <MapPinIcon className="h-6 w-6 mr-2 text-primary-400" />
            Service Location
          </h2>

          <MapLocationPicker
            onLocationSelect={handleLocationSelect}
            initialLocation={formData.location}
            height="400px"
            className="h-64 rounded-2xl overflow-hidden"
          />

          {errors.location && (
            <p className="text-danger-400 text-sm mt-2">{errors.location}</p>
          )}
        </div>

        {/* Priority Selection */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Priority Level
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(PRIORITY_LEVELS).map(([key, value]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
                className={`p-4 border-2 rounded-2xl text-center transition-all ${
                  formData.priority === value
                    ? "border-primary-500 bg-primary-500/10 text-primary-400"
                    : "border-white/[0.1] hover:border-secondary-400 text-neutral-300"
                }`}
              >
                <div className="font-medium">{PRIORITY_LABELS[value]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Budget and Pricing */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <span className="text-primary-400 mr-2 text-2xl">₹</span>
            Budget and Pricing
          </h2>

          <div className="max-w-md">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Your Expected Price (₹) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-neutral-500 sm:text-sm">₹</span>
              </div>
              <input
                type="number"
                name="userExpectedPrice"
                value={formData.userExpectedPrice}
                onChange={handleInputChange}
                className={`block w-full pl-7 pr-12 border-2 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.userExpectedPrice
                    ? "border-danger-300"
                    : "border-white/[0.1]"
                }`}
                placeholder="e.g. 1500"
                min="0"
              />
            </div>
            {errors.userExpectedPrice && (
              <p className="text-danger-400 text-sm mt-1">
                {errors.userExpectedPrice}
              </p>
            )}
            <p className="mt-2 text-sm text-neutral-500 italic">
              * The mechanic will see your expected amount and may offer a
              counter amount.
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <PhotoIcon className="h-6 w-6 mr-2 text-primary-400" />
            Upload Photos (Optional)
          </h2>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-white/[0.1] rounded-2xl p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <PhotoIcon className="h-12 w-12 text-neutral-500 mx-auto mb-2" />
                <p className="text-neutral-400">
                  Click to upload images or drag and drop
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  PNG, JPG, GIF up to 5MB each (max 5 images)
                </p>
              </label>
            </div>

            {imageFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageFiles.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-2xl"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-danger-500 text-white rounded-full p-1 hover:bg-danger-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/customer/mechanics")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData({
                issueType: "flat_tire",
                description:
                  "My car has a flat tire and I need assistance to change it.",
                vehicleInfo: {
                  type: "car",
                  model: "Honda City",
                  plate: "DL01AB1234",
                  year: 2020,
                },
                location: {
                  lat: 28.6139,
                  lng: 77.209,
                  address: "Delhi, India",
                },
                priority: "medium",
                images: [],
              });
              toast.success("Form pre-filled for testing");
            }}
            disabled={loading}
          >
            Pre-fill Form
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading || uploadingImages}
            disabled={loading || uploadingImages}
          >
            {loading || uploadingImages
              ? "Sending Request..."
              : "Send Request to Mechanic"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BookService;
