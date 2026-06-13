import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  CameraIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CustomerProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });


  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (validateEmail(formData.email)) {
      toast.error('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      // Update profile API call would go here
      toast.success('Profile updated successfully!');
      setEditing(false);
      // Update user context
      updateUser({ ...user, ...formData });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12 text-white" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 bg-white/[0.05] rounded-full p-2 shadow-lg border border-white/[0.08] hover:bg-white/[0.03]">
              <CameraIcon className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
            <p className="text-neutral-400">{user?.email}</p>
            <div className="flex items-center mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-500/15 text-success-300">
                Verified Customer
              </span>
            </div>
          </div>
          
          <Button
            variant={editing ? "outline" : "primary"}
            onClick={() => setEditing(!editing)}
            icon={<PencilIcon className="w-4 h-4" />}
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Personal Information</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={!editing}
              icon={<UserIcon className="w-5 h-5" />}
              required
            />
            
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!editing}
              icon={<EnvelopeIcon className="w-5 h-5" />}
              required
            />
            
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={!editing}
              icon={<PhoneIcon className="w-5 h-5" />}
            />
            
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              disabled={!editing}
              icon={<MapPinIcon className="w-5 h-5" />}
            />
          </div>
          
          {editing && (
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
              >
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>

    </div>
  );
};

export default CustomerProfile;
