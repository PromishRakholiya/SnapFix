import React, { useState, useEffect } from 'react';
import { 
  UserIcon,
  ShieldCheckIcon,
  CogIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import adminService from '../../services/adminService';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivity();
    }
  }, [activeTab]);

  const fetchActivity = async () => {
    try {
      const response = await adminService.getActivity();
      if (response.success) {
        setActivity(response.data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await adminService.updateProfile(profileData);
      
      if (response.success) {
        toast.success('Profile updated successfully');
        updateUser(response.data.user);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await adminService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setLoading(true);

    try {
      const response = await adminService.uploadAvatar(formData);
      
      if (response.success) {
        toast.success('Avatar uploaded successfully');
        updateUser(response.data.user);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'activity', name: 'Activity', icon: BellIcon },
    { id: 'system', name: 'System', icon: CogIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-neutral-400">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-[#111111] border border-white/[0.07] rounded-2xl">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-500/10 text-primary-400 border-r-2 border-primary-700'
                        : 'text-neutral-400 hover:bg-white/[0.03] hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
              <h2 className="text-lg font-medium text-white mb-6">Profile Information</h2>
              
              <div className="flex items-center space-x-6 mb-6">
                <div className="flex-shrink-0">
                  {user?.avatar ? (
                    <img
                      className="h-20 w-20 rounded-full"
                      src={user.avatar}
                      alt={user.name}
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-white/[0.08] flex items-center justify-center">
                      <UserIcon className="h-10 w-10 text-neutral-400" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Profile Picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/15"
                  />
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled
                  />
                </div>
                <Input
                  label="Phone Number"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                >
                  Update Profile
                </Button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
              <h2 className="text-lg font-medium text-white mb-6">Security Settings</h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                >
                  Change Password
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/[0.08]">
                <h3 className="text-md font-medium text-white mb-4">Account Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Role:</span>
                    <span className="text-sm font-medium text-white">{user?.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Member Since:</span>
                    <span className="text-sm font-medium text-white">
                      {formatDate(user?.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Last Login:</span>
                    <span className="text-sm font-medium text-white">
                      {user?.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
              <h2 className="text-lg font-medium text-white mb-6">Recent Activity</h2>
              
              <div className="space-y-4">
                {activity.length > 0 ? (
                  activity.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 border border-white/[0.08] rounded-2xl">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary-500/15 rounded-full flex items-center justify-center">
                          <BellIcon className="h-4 w-4 text-primary-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{item.action}</p>
                        <p className="text-sm text-neutral-500">{item.description}</p>
                      </div>
                      <div className="text-sm text-neutral-500">
                        {formatDate(item.timestamp)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BellIcon className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
                    <p className="text-neutral-500">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
              <h2 className="text-lg font-medium text-white mb-6">System Information</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-white mb-4">Platform Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-success-500/10 rounded-2xl">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-success-500 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-green-800">API Operational</span>
                      </div>
                    </div>
                    <div className="p-4 bg-success-500/10 rounded-2xl">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-success-500 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-green-800">Database Connected</span>
                      </div>
                    </div>
                    <div className="p-4 bg-success-500/10 rounded-2xl">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-success-500 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-green-800">Payment Gateway Active</span>
                      </div>
                    </div>
                    <div className="p-4 bg-success-500/10 rounded-2xl">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-success-500 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-green-800">Email Service Running</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-white mb-4">Version Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-400">Platform Version:</span>
                      <span className="text-sm font-medium text-white">v1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-400">Last Updated:</span>
                      <span className="text-sm font-medium text-white">
                        {formatDate(new Date())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
