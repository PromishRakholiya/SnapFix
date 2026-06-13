import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  StarIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import customerApi from '../../api/customerApi';
import toast from 'react-hot-toast';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'car',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    plate: '',
    color: '',
    isDefault: false
  });

  const vehicleTypes = [
    { value: 'car', label: 'Car', icon: TruckIcon },
    { value: 'motorcycle', label: 'Motorcycle', icon: TruckIcon },
    { value: 'truck', label: 'Truck', icon: TruckIcon },
    { value: 'bus', label: 'Bus', icon: TruckIcon },
    { value: 'other', label: 'Other', icon: TruckIcon }
  ];

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await customerApi.getVehicles();
      if (response.success) {
        setVehicles(response.data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'car',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      plate: '',
      color: '',
      isDefault: false
    });
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    
    try {
      const response = await customerApi.addVehicle(formData);
      if (response.success) {
        toast.success('Vehicle added successfully');
        setShowAddModal(false);
        resetForm();
        fetchVehicles();
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error(error.response?.data?.message || 'Failed to add vehicle');
    }
  };

  const handleEditVehicle = async (e) => {
    e.preventDefault();
    
    try {
      const response = await customerApi.updateVehicle(selectedVehicle._id, formData);
      if (response.success) {
        toast.success('Vehicle updated successfully');
        setShowEditModal(false);
        setSelectedVehicle(null);
        resetForm();
        fetchVehicles();
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error(error.response?.data?.message || 'Failed to update vehicle');
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      const response = await customerApi.deleteVehicle(vehicleId);
      if (response.success) {
        toast.success('Vehicle deleted successfully');
        fetchVehicles();
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error(error.response?.data?.message || 'Failed to delete vehicle');
    }
  };

  const handleSetDefault = async (vehicleId) => {
    try {
      const response = await customerApi.setDefaultVehicle(vehicleId);
      if (response.success) {
        toast.success('Default vehicle updated');
        fetchVehicles();
      }
    } catch (error) {
      console.error('Error setting default vehicle:', error);
      toast.error(error.response?.data?.message || 'Failed to set default vehicle');
    }
  };

  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      type: vehicle.type,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      plate: vehicle.plate,
      color: vehicle.color || '',
      isDefault: vehicle.isDefault
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const getVehicleTypeIcon = (type) => {
    const vehicleType = vehicleTypes.find(vt => vt.value === type);
    const IconComponent = vehicleType?.icon || TruckIcon;
    return <IconComponent className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My Vehicles</h1>
            <p className="text-neutral-400 mt-1">
              Manage your saved vehicles for quick service requests
            </p>
          </div>
          <Button
            onClick={openAddModal}
            variant="primary"
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Vehicle
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-12">
            <TruckIcon className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No vehicles saved</h3>
            <p className="text-neutral-500 mb-4">
              Add your vehicles to quickly create service requests without entering details each time.
            </p>
            <Button onClick={openAddModal} variant="primary">
              Add Your First Vehicle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle._id} className="border border-white/[0.08] rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getVehicleTypeIcon(vehicle.type)}
                    <div>
                      <h3 className="font-semibold text-white">{vehicle.name}</h3>
                      <p className="text-sm text-neutral-500">
                        {vehicle.make} {vehicle.model} ({vehicle.year})
                      </p>
                    </div>
                  </div>
                  {vehicle.isDefault && (
                    <StarIcon className="h-5 w-5 text-warning-400 fill-current" />
                  )}
                </div>

                <div className="space-y-2 text-sm text-neutral-400 mb-4">
                  <div className="flex justify-between">
                    <span>License Plate:</span>
                    <span className="font-medium">{vehicle.plate}</span>
                  </div>
                  {vehicle.color && (
                    <div className="flex justify-between">
                      <span>Color:</span>
                      <span className="font-medium">{vehicle.color}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium capitalize">{vehicle.type}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!vehicle.isDefault && (
                    <Button
                      onClick={() => handleSetDefault(vehicle._id)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    onClick={() => openEditModal(vehicle)}
                    variant="outline"
                    size="sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteVehicle(vehicle._id)}
                    variant="danger"
                    size="sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/[0.05] rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4 text-white">Add New Vehicle</h2>
            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Vehicle Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., My Honda City"
                  className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Vehicle Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Make *
                  </label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => handleInputChange('make', e.target.value)}
                    placeholder="e.g., Honda"
                    className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="e.g., City"
                    className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    placeholder="e.g., White"
                    className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  License Plate *
                </label>
                <input
                  type="text"
                  value={formData.plate}
                  onChange={(e) => handleInputChange('plate', e.target.value)}
                  placeholder="e.g., MH12AB1234"
                  className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="h-4 w-4 text-primary-400 focus:ring-primary-500 border-white/[0.1] rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-white">
                  Set as default vehicle
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  Add Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/[0.05] rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4 text-white">Edit Vehicle</h2>
            <form onSubmit={handleEditVehicle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Vehicle Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., My Honda City"
                  className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Vehicle Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Make *
                  </label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => handleInputChange('make', e.target.value)}
                    placeholder="e.g., Honda"
                    className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="e.g., City"
                    className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    placeholder="e.g., White"
                    className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  License Plate *
                </label>
                <input
                  type="text"
                  value={formData.plate}
                  onChange={(e) => handleInputChange('plate', e.target.value)}
                  placeholder="e.g., MH12AB1234"
                  className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefaultEdit"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="h-4 w-4 text-primary-400 focus:ring-primary-500 border-white/[0.1] rounded"
                />
                <label htmlFor="isDefaultEdit" className="ml-2 block text-sm text-white">
                  Set as default vehicle
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  Update Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;
