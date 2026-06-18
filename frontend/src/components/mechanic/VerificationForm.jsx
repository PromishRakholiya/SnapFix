import React, { useState, useEffect } from "react";
import {
  CameraIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import Button from "../common/Button";
import Input from "../common/Input";
import Select from "../common/Select";
import MapLocationPicker from "../common/MapLocationPicker";
import mechanicVerificationService from "../../services/mechanicVerificationService";
import toast from "react-hot-toast";

const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) => {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
      return;
    }
    // If it's a PDF, we can't compress it as an image
    if (file.type === "application/pdf") {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // fallback to original file if blob creation fails
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const VerificationForm = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState(null);
  const [formData, setFormData] = useState({
    shopName: "",
    shopAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
    },
    location: {
      lat: null,
      lng: null,
    },
    gstNumber: "",
    documentType: "",
  });
  const [files, setFiles] = useState({
    shopImage: null,
    documentImage: null,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response =
        await mechanicVerificationService.getVerificationStatus();
      if (response.success && response.data.verification) {
        setVerification(response.data.verification);
        if (response.data.verification.status === "pending") {
          // Pre-fill form with existing data
          const existing = response.data.verification;
          setFormData({
            shopName: existing.shopName || "",
            shopAddress: existing.shopAddress || {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: "India",
            },
            location: existing.location || {
              lat: null,
              lng: null,
            },
            gstNumber: existing.gstNumber || "",
            documentType: existing.documentType || "",
          });
        }
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    }
  };

  const handleInputChange = (name, value) => {
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

  const handleFileChange = (name, file) => {
    console.log(`File selected for ${name}:`, file);

    // Validate file size (10MB limit)
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    // Validate file type (images or PDF documents are allowed)
    if (
      file &&
      !file.type.startsWith("image/") &&
      file.type !== "application/pdf"
    ) {
      toast.error("Please select an image or PDF file");
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [name]: file,
    }));

    // Clear error when user selects a file
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          location: {
            lat: latitude,
            lng: longitude,
          },
        }));
        toast.success("Location obtained successfully!");
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
            errorMessage = "An unknown error occurred while getting location.";
        }

        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.shopName.trim()) {
      newErrors.shopName = "Shop name is required";
    }

    if (!formData.shopAddress.street.trim()) {
      newErrors["shopAddress.street"] = "Street address is required";
    }

    if (!formData.shopAddress.city.trim()) {
      newErrors["shopAddress.city"] = "City is required";
    }

    if (!formData.shopAddress.state.trim()) {
      newErrors["shopAddress.state"] = "State is required";
    }

    if (!formData.shopAddress.zipCode.trim()) {
      newErrors["shopAddress.zipCode"] = "ZIP code is required";
    }

    // Validate location
    if (!formData.location.lat || !formData.location.lng) {
      newErrors["location.lat"] = "Shop location is required";
      newErrors["location.lng"] = "Shop location is required";
    } else {
      // Validate latitude range
      if (formData.location.lat < -90 || formData.location.lat > 90) {
        newErrors["location.lat"] = "Latitude must be between -90 and 90";
      }
      // Validate longitude range
      if (formData.location.lng < -180 || formData.location.lng > 180) {
        newErrors["location.lng"] = "Longitude must be between -180 and 180";
      }
    }

    if (!formData.documentType) {
      newErrors.documentType = "Document type is required";
    }

    if (!files.shopImage && !verification) {
      newErrors.shopImage = "Shop image is required";
    }

    if (!files.documentImage && !verification) {
      newErrors.documentImage = "Document image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // Add form data
      formDataToSend.append("shopName", formData.shopName);
      formDataToSend.append(
        "shopAddress",
        JSON.stringify(formData.shopAddress),
      );
      formDataToSend.append("location", JSON.stringify(formData.location));
      if (formData.gstNumber) {
        formDataToSend.append("gstNumber", formData.gstNumber);
      }
      formDataToSend.append("documentType", formData.documentType);

      // Compress and add files
      if (files.shopImage) {
        console.log("Compressing shop image...");
        const compressedShopImage = await compressImage(files.shopImage);
        console.log("Original shop image size:", (files.shopImage.size / 1024 / 1024).toFixed(2) + "MB");
        console.log("Compressed shop image size:", (compressedShopImage.size / 1024 / 1024).toFixed(2) + "MB");
        formDataToSend.append("shopImage", compressedShopImage);
      }
      if (files.documentImage) {
        console.log("Compressing document image...");
        const compressedDocImage = await compressImage(files.documentImage);
        console.log("Original document image size:", (files.documentImage.size / 1024 / 1024).toFixed(2) + "MB");
        console.log("Compressed document image size:", (compressedDocImage.size / 1024 / 1024).toFixed(2) + "MB");
        formDataToSend.append("documentImage", compressedDocImage);
      }

      console.log("FormData contents:");
      console.log("Location data being sent:", formData.location);
      for (let [key, value] of formDataToSend.entries()) {
        console.log(key, value);
      }

      const response =
        await mechanicVerificationService.submitVerification(formDataToSend);

      if (response.success) {
        toast.success("Verification request submitted successfully!");
        setVerification(response.data.verification);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Verification submission error:", error);
      const errorMessage = error.message || "Failed to submit verification";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // Add form data
      formDataToSend.append("shopName", formData.shopName);
      formDataToSend.append(
        "shopAddress",
        JSON.stringify(formData.shopAddress),
      );
      formDataToSend.append("location", JSON.stringify(formData.location));
      if (formData.gstNumber) {
        formDataToSend.append("gstNumber", formData.gstNumber);
      }
      formDataToSend.append("documentType", formData.documentType);

      // Compress and add files only if new ones are selected
      if (files.shopImage) {
        console.log("Compressing updated shop image...");
        const compressedShopImage = await compressImage(files.shopImage);
        console.log("Original shop image size:", (files.shopImage.size / 1024 / 1024).toFixed(2) + "MB");
        console.log("Compressed shop image size:", (compressedShopImage.size / 1024 / 1024).toFixed(2) + "MB");
        formDataToSend.append("shopImage", compressedShopImage);
      }
      if (files.documentImage) {
        console.log("Compressing updated document image...");
        const compressedDocImage = await compressImage(files.documentImage);
        console.log("Original document image size:", (files.documentImage.size / 1024 / 1024).toFixed(2) + "MB");
        console.log("Compressed document image size:", (compressedDocImage.size / 1024 / 1024).toFixed(2) + "MB");
        formDataToSend.append("documentImage", compressedDocImage);
      }

      const response =
        await mechanicVerificationService.updateVerification(formDataToSend);

      if (response.success) {
        toast.success("Verification request updated successfully!");
        setVerification(response.data.verification);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      const errorMessage = error.message || "Failed to update verification";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (!verification) return null;

    const statusConfig = {
      pending: {
        icon: <ClockIcon className="h-6 w-6 text-warning-500" />,
        color: "text-warning-400",
        bgColor: "bg-warning-500/10",
        title: "Verification Pending",
        description:
          "Your verification request is under review by our admin team.",
      },
      approved: {
        icon: <CheckCircleIcon className="h-6 w-6 text-success-500" />,
        color: "text-success-400",
        bgColor: "bg-success-500/10",
        title: "Verification Approved",
        description: "Your account has been verified successfully!",
      },
      rejected: {
        icon: <XCircleIcon className="h-6 w-6 text-danger-500" />,
        color: "text-danger-400",
        bgColor: "bg-danger-500/10",
        title: "Verification Rejected",
        description:
          verification.rejectionReason ||
          "Your verification request was not approved.",
      },
    };

    const config = statusConfig[verification.status];

    return (
      <div
        className={`p-4 rounded-2xl ${config.bgColor} border border-current ${config.color}`}
      >
        <div className="flex items-center space-x-3">
          {config.icon}
          <div>
            <h3 className={`font-medium ${config.color}`}>{config.title}</h3>
            <p className="text-sm text-neutral-400">{config.description}</p>
          </div>
        </div>
      </div>
    );
  };

  // If verification is approved or rejected, show status
  if (verification && ["approved", "rejected"].includes(verification.status)) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/[0.05] rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Verification Status</h2>
          {getStatusDisplay()}

          {verification.status === "rejected" && (
            <div className="mt-4">
              <Button onClick={() => setVerification(null)} variant="primary">
                Submit New Verification
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/[0.05] rounded-2xl shadow p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Shop Verification</h2>
          <p className="text-neutral-400">
            Please provide your shop details and upload required documents for
            verification.
          </p>
        </div>

        {verification &&
          verification.status === "pending" &&
          getStatusDisplay()}

        <form
          onSubmit={verification ? handleUpdate : handleSubmit}
          className="space-y-6"
        >
          {/* Shop Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Shop Information</h3>

            <Input
              label="Shop Name"
              name="shopName"
              value={formData.shopName}
              onChange={(e) => handleInputChange("shopName", e.target.value)}
              error={errors.shopName}
              placeholder="Enter your shop name"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Street Address"
                name="shopAddress.street"
                value={formData.shopAddress.street}
                onChange={(e) =>
                  handleInputChange("shopAddress.street", e.target.value)
                }
                error={errors["shopAddress.street"]}
                placeholder="Enter street address"
                required
              />

              <Input
                label="City"
                name="shopAddress.city"
                value={formData.shopAddress.city}
                onChange={(e) =>
                  handleInputChange("shopAddress.city", e.target.value)
                }
                error={errors["shopAddress.city"]}
                placeholder="Enter city"
                required
              />

              <Input
                label="State"
                name="shopAddress.state"
                value={formData.shopAddress.state}
                onChange={(e) =>
                  handleInputChange("shopAddress.state", e.target.value)
                }
                error={errors["shopAddress.state"]}
                placeholder="Enter state"
                required
              />

              <Input
                label="ZIP Code"
                name="shopAddress.zipCode"
                value={formData.shopAddress.zipCode}
                onChange={(e) =>
                  handleInputChange("shopAddress.zipCode", e.target.value)
                }
                error={errors["shopAddress.zipCode"]}
                placeholder="Enter ZIP code"
                required
              />
            </div>

            <Input
              label="GST Number (Optional)"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={(e) => handleInputChange("gstNumber", e.target.value)}
              error={errors.gstNumber}
              placeholder="Enter GST number (optional)"
            />

            {/* Location Fields */}
            <div className="space-y-4">
              <h4 className="text-md font-medium">Shop Location</h4>
              <p className="text-sm text-neutral-400">
                Please provide the exact coordinates of your shop location. This
                helps customers find your shop easily.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Latitude"
                  name="location.lat"
                  type="number"
                  step="any"
                  value={formData.location.lat || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "location.lat",
                      parseFloat(e.target.value) || null,
                    )
                  }
                  error={errors["location.lat"]}
                  placeholder="e.g., 40.7128"
                  required
                />

                <Input
                  label="Longitude"
                  name="location.lng"
                  type="number"
                  step="any"
                  value={formData.location.lng || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "location.lng",
                      parseFloat(e.target.value) || null,
                    )
                  }
                  error={errors["location.lng"]}
                  placeholder="e.g., -74.0060"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={getCurrentLocation}
                  disabled={loading}
                >
                  Get Current Location
                </Button>
                <span className="text-sm text-neutral-500">
                  Click to automatically get your current location
                </span>
              </div>

              {/* Map for location selection */}
              <div className="mt-4">
                <MapLocationPicker
                  onLocationSelect={(location) => {
                    setFormData((prev) => ({
                      ...prev,
                      location: {
                        lat: location.lat,
                        lng: location.lng,
                      },
                    }));
                    toast.success("Location selected from map!");
                  }}
                  initialLocation={
                    formData.location.lat && formData.location.lng
                      ? {
                          lat: formData.location.lat,
                          lng: formData.location.lng,
                        }
                      : null
                  }
                  height="300px"
                  showCurrentLocationButton={false}
                />
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Document Upload</h3>

            <Select
              label="Document Type"
              name="documentType"
              value={formData.documentType}
              onChange={(e) =>
                handleInputChange("documentType", e.target.value)
              }
              error={errors.documentType}
              required
            >
              <option value="">Select document type</option>
              <option value="aadhar">Aadhar Card</option>
              <option value="pan">PAN Card</option>
              <option value="driving_license">Driving License</option>
              <option value="shop_license">Shop License</option>
              <option value="other">Other</option>
            </Select>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Shop Image <span className="text-danger-400">*</span>
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/[0.1] border-dashed rounded-2xl cursor-pointer bg-white/[0.03] hover:bg-white/[0.05]">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <CameraIcon className="w-8 h-8 mb-2 text-neutral-500" />
                      <p className="mb-2 text-sm text-neutral-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-neutral-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        console.log(
                          "Shop image file input change:",
                          e.target.files,
                        );
                        handleFileChange("shopImage", e.target.files[0]);
                      }}
                    />
                  </label>
                </div>
                {files.shopImage && (
                  <div className="mt-2">
                    <p className="text-sm text-neutral-400 mb-2">
                      Selected: {files.shopImage.name}
                    </p>
                    <div className="w-32 h-24 border rounded overflow-hidden">
                      <img
                        src={URL.createObjectURL(files.shopImage)}
                        alt="Shop preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {errors.shopImage && (
                  <p className="mt-1 text-sm text-danger-400">
                    {errors.shopImage}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Document Image <span className="text-danger-400">*</span>
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/[0.1] border-dashed rounded-2xl cursor-pointer bg-white/[0.03] hover:bg-white/[0.05]">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <DocumentIcon className="w-8 h-8 mb-2 text-neutral-500" />
                      <p className="mb-2 text-sm text-neutral-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-neutral-500">
                        PNG, JPG, GIF, PDF up to 10MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        console.log(
                          "Document image file input change:",
                          e.target.files,
                        );
                        handleFileChange("documentImage", e.target.files[0]);
                      }}
                    />
                  </label>
                </div>
                {files.documentImage && (
                  <div className="mt-2">
                    <p className="text-sm text-neutral-400 mb-2">
                      Selected: {files.documentImage.name}
                    </p>
                    {files.documentImage.type.startsWith("image/") ? (
                      <div className="w-32 h-24 border rounded overflow-hidden">
                        <img
                          src={URL.createObjectURL(files.documentImage)}
                          alt="Document preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-24 border rounded bg-white/[0.05] flex items-center justify-center">
                        <DocumentIcon className="w-8 h-8 text-neutral-500" />
                      </div>
                    )}
                  </div>
                )}
                {errors.documentImage && (
                  <p className="mt-1 text-sm text-danger-400">
                    {errors.documentImage}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">
                  Important Notes
                </h4>
                <ul className="mt-2 text-sm text-blue-400 space-y-1">
                  <li>• Ensure all images are clear and readable</li>
                  <li>• Shop image should show your workshop/garage</li>
                  <li>• Document image should be a valid government ID</li>
                  <li>• Verification process may take 24-48 hours</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading}
          >
            {verification ? "Update Verification" : "Submit Verification"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VerificationForm;
