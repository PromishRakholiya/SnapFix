import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  WrenchScrewdriverIcon, 
  PhotoIcon, 
  MapPinIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import MapLocationPicker from '../../components/common/MapLocationPicker';
import requestService from '../../services/requestService';
import { useAuth } from '../../contexts/AuthContext';
import { ISSUE_TYPES, ISSUE_TYPE_LABELS, PRIORITY_LEVELS, PRIORITY_LABELS, VEHICLE_TYPES, VEHICLE_TYPE_LABELS } from '../../utils/constants';
import { validateRequired } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CreateRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    issueType: '',
    description: '',
    vehicleInfo: {
      type: '',
      model: '',
      plate: '',
      year: new Date().getFullYear()
    },
    location: null,
    priority: searchParams.get('priority') || 'medium',
    images: [],
    userExpectedPrice: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Load user's vehicles for quick selection
  const [userVehicles, setUserVehicles] = useState([]);

  useEffect(() => {
    // You can load user's saved vehicles here
    // For now, we'll leave it empty and let users enter manually
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let error = '';
    
    if (name === 'description') {
      if (!value.trim()) error = 'Description is required';
      else if (value.trim().length < 10) error = 'Description must be at least 10 characters';
    } else if (name === 'vehicleInfo.type' && !value) {
      error = 'Vehicle type is required';
    } else if (name === 'vehicleInfo.model') {
      if (!value.trim()) error = 'Vehicle model is required';
      else if (value.trim().length < 2) error = 'Vehicle model must be at least 2 characters';
    } else if (name === 'vehicleInfo.plate') {
      if (!value.trim()) error = 'License plate is required';
      else if (value.trim().length < 3) error = 'License plate must be at least 3 characters';
    } else if (name === 'userExpectedPrice') {
      if (value === undefined || value === null || value === '') {
        error = 'Expected price is required';
      } else if (isNaN(value) || Number(value) <= 0) {
        error = 'Please enter a valid amount';
      }
    }

    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleLocationSelect = (location) => {
    // Ensure location always has an address field
    const locationWithAddress = {
      ...location,
      address: location.address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
    };
    
    setFormData(prev => ({
      ...prev,
      location: locationWithAddress
    }));
    
    if (errors.location) {
      setErrors(prev => ({
        ...prev,
        location: ''
      }));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + imageFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      return true;
    });

    setImageFiles(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (imageFiles.length === 0) return [];

    setUploadingImages(true);
    try {
      const uploadedUrls = await requestService.uploadImages(imageFiles);
      return uploadedUrls.data.imageUrls || [];
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.issueType) newErrors.issueType = 'Issue type is required';
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    if (!formData.vehicleInfo.type) newErrors['vehicleInfo.type'] = 'Vehicle type is required';
    if (!formData.vehicleInfo.model.trim()) {
      newErrors['vehicleInfo.model'] = 'Vehicle model is required';
    } else if (formData.vehicleInfo.model.trim().length < 2) {
      newErrors['vehicleInfo.model'] = 'Vehicle model must be at least 2 characters';
    }
    if (!formData.vehicleInfo.plate.trim()) {
      newErrors['vehicleInfo.plate'] = 'License plate is required';
    } else if (formData.vehicleInfo.plate.trim().length < 3) {
      newErrors['vehicleInfo.plate'] = 'License plate must be at least 3 characters';
    }
    if (!formData.location) newErrors.location = 'Location is required';
    if (formData.userExpectedPrice === undefined || formData.userExpectedPrice === null || formData.userExpectedPrice === '') {
      newErrors.userExpectedPrice = 'Expected price is required';
    } else if (isNaN(formData.userExpectedPrice) || Number(formData.userExpectedPrice) <= 0) {
      newErrors.userExpectedPrice = 'Please enter a valid amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Create request data
      const requestData = {
        ...formData,
        images: imageUrls,
        customerId: user._id,
        broadcastRadius: 25, // 25km radius for broadcasting to mechanics
        isDirectBooking: false // This is a broadcast request
      };

      const response = await requestService.createRequest(requestData);
      
      if (response.success) {
        toast.success('Service request created successfully!');
        navigate('/customer/requests');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error.message || 'Failed to create service request');
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    low: 'bg-secondary-100 text-neutral-100',
    medium: 'bg-primary-500/15 text-primary-300',
    high: 'bg-warning-500/15 text-warning-800',
    emergency: 'bg-danger-500/15 text-danger-300'
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Create Service Request</h1>
        <p className="text-neutral-400 mt-2">
          Fill out the details below to get roadside assistance
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
                onClick={() => setFormData(prev => ({ ...prev, issueType: value }))}
                className={`p-4 border-2 rounded-2xl text-center transition-all ${
                  formData.issueType === value
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-white/[0.1] hover:border-secondary-400 text-neutral-300'
                }`}
              >
                <div className="font-medium">{ISSUE_TYPE_LABELS[value]}</div>
              </button>
            ))}
          </div>
          
          {errors.issueType && (
            <p className="text-danger-400 text-sm">{errors.issueType}</p>
          )}

          <div className="mt-6">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Describe the problem in detail *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              onBlur={handleBlur}
              rows={4}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Please provide as much detail as possible about the issue..."
            />
            {errors.description && (
              <p className="text-danger-400 text-sm mt-1">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Vehicle Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Vehicle Type *
              </label>
              <select
                name="vehicleInfo.type"
                value={formData.vehicleInfo.type}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className="w-full px-3 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select vehicle type</option>
                {Object.entries(VEHICLE_TYPES).map(([key, value]) => (
                  <option key={value} value={value}>
                    {VEHICLE_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
              {errors['vehicleInfo.type'] && (
                <p className="text-danger-400 text-sm mt-1">{errors['vehicleInfo.type']}</p>
              )}
            </div>

            <Input
              label="Vehicle Model *"
              name="vehicleInfo.model"
              value={formData.vehicleInfo.model}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors['vehicleInfo.model']}
              placeholder="e.g., Toyota Camry, Honda Civic"
            />

            <Input
              label="License Plate *"
              name="vehicleInfo.plate"
              value={formData.vehicleInfo.plate}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors['vehicleInfo.plate']}
              placeholder="e.g., ABC-1234"
            />

            <Input
              label="Year"
              name="vehicleInfo.year"
              type="number"
              value={formData.vehicleInfo.year}
              onChange={handleInputChange}
              placeholder="e.g., 2020"
              min="1900"
              max={new Date().getFullYear() + 1}
            />
          </div>
        </div>

        {/* Priority Level */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-warning-400" />
            Priority Level
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(PRIORITY_LEVELS).map(([key, value]) => {
              const isSelected = formData.priority === value;
              let selectedClass = "border-primary-500 bg-primary-500/10";
              if (isSelected) {
                if (value === 'low') selectedClass = "border-secondary-500 bg-secondary-500/10";
                if (value === 'high') selectedClass = "border-warning-500 bg-warning-500/10";
                if (value === 'emergency') selectedClass = "border-danger-500 bg-danger-500/10";
              }
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: value }))}
                  className={`p-4 border-2 rounded-2xl text-center transition-all ${
                    isSelected
                      ? selectedClass
                      : 'border-white/[0.1] hover:border-secondary-400'
                  }`}
                >
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[value]}`}>
                    {PRIORITY_LABELS[value]}
                  </div>
                  {value === 'emergency' && (
                    <p className="text-xs text-neutral-500 mt-2">
                      Additional charges may apply
                    </p>
                  )}
                </button>
              );
            })}
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
                onBlur={handleBlur}
                className={`block w-full pl-7 pr-12 border-2 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.userExpectedPrice ? 'border-danger-300' : 'border-white/[0.1]'
                }`}
                placeholder="e.g. 1500"
                min="0"
              />
            </div>
            {errors.userExpectedPrice && (
              <p className="text-danger-400 text-sm mt-1">{errors.userExpectedPrice}</p>
            )}
            <p className="mt-2 text-sm text-neutral-500 italic">
              * Mechanics will see your expected amount and may offer a counter amount.
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <MapPinIcon className="h-6 w-6 mr-2 text-danger-400" />
            Location *
          </h2>
          
          <MapLocationPicker
            onLocationSelect={handleLocationSelect}
            height="350px"
            className="mb-4"
          />
          
          {errors.location && (
            <p className="text-danger-400 text-sm">{errors.location}</p>
          )}
          
          {formData.location && (
            <div className="bg-success-500/10 border border-success-500/20 rounded-2xl p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-success-400 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm font-medium text-success-300">Location Selected</p>
                  <p className="text-sm text-success-400">
                    {formData.location.address || `${formData.location.lat.toFixed(6)}, ${formData.location.lng.toFixed(6)}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Photo Upload */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <PhotoIcon className="h-6 w-6 mr-2 text-neutral-400" />
            Photos (Optional)
          </h2>
          
          <p className="text-sm text-neutral-400 mb-4">
            Upload photos of the issue to help mechanics understand the problem better. Maximum 5 images, 5MB each.
          </p>
          
          <div className="mb-4">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="inline-flex items-center px-4 py-2 border border-white/[0.1] rounded-2xl text-sm font-medium text-neutral-300 bg-white/[0.05] hover:bg-white/[0.03] cursor-pointer"
            >
              <PhotoIcon className="h-5 w-5 mr-2" />
              Choose Images
            </label>
          </div>

          {imageFiles.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {imageFiles.map((file, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 object-cover rounded-2xl border border-white/[0.08]"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-danger-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-danger-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Ready to submit?</h3>
              <p className="text-sm text-neutral-400">
                A nearby mechanic will be notified and will contact you shortly.
              </p>
            </div>
            <div className="flex space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/customer/dashboard')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading || uploadingImages}
                disabled={loading || uploadingImages}
                size="lg"
              >
                {loading ? 'Creating Request...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateRequest;
