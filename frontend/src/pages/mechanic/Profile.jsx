import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  WrenchScrewdriverIcon,
  StarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

import mechanicApi from "../../api/mechanicApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../utils/helpers";
import toast from "react-hot-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    shopName: "",
    shopAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    specializations: [],
    experience: "",
    bio: "",
    workingHours: {
      start: "09:00",
      end: "18:00",
    },
    serviceRadius: 10,
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileResponse, statsResponse] = await Promise.all([
        mechanicApi.getProfile(),
        mechanicApi.getStats(),
      ]);

      if (profileResponse.success) {
        const pData = profileResponse.data.profile || profileResponse.data;
        setProfile(pData);
        setFormData({
          name: pData.name || "",
          phone: pData.phone || "",
          shopName: pData.shopName || "",
          shopAddress: pData.shopAddress || {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
          specializations: pData.specializations || [],
          experience: pData.experience || "",
          bio: pData.bio || "",
          workingHours: pData.workingHours || { start: "09:00", end: "18:00" },
          serviceRadius: pData.serviceRadius || 10,
        });
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
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
        [field]: value,
      }));
    }
  };

  const handleSpecializationChange = (specialization) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter((s) => s !== specialization)
        : [...prev.specializations, specialization],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await mechanicApi.updateProfile(formData);

      if (response.success) {
        setProfile(response.data);
        setEditing(false);
        updateUser(response.data);
        toast.success("Profile updated successfully!");
      } else {
        toast.error(response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await mechanicApi.uploadAvatar(formData);
      if (response.success) {
        setProfile((prev) => ({ ...prev, avatar: response.data.avatar }));
        updateUser({ ...user, avatar: response.data.avatar });
        toast.success("Avatar updated successfully!");
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      verified: {
        color: "bg-success-500/15 text-green-800",
        icon: CheckCircleIcon,
      },
      pending: { color: "bg-warning-500/15 text-warning-400", icon: ClockIcon },
      rejected: {
        color: "bg-danger-500/15 text-danger-400",
        icon: XCircleIcon,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Mechanic Profile</h1>
        {!editing && (
          <Button
            variant="primary"
            onClick={() => setEditing(true)}
            icon={<PencilIcon className="h-4 w-4" />}
          >
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                Basic Information
              </h2>
              {editing && (
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={saving}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Full Name
                </label>
                {editing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.name || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Phone Number
                </label>
                {editing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.phone || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Email
                </label>
                <p className="text-white">{profile?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Experience (Years)
                </label>
                {editing ? (
                  <Input
                    type="number"
                    value={formData.experience}
                    onChange={(e) =>
                      handleInputChange("experience", e.target.value)
                    }
                    placeholder="Years of experience"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.experience || "Not specified"} years
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Bio
              </label>
              {editing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Tell us about yourself and your expertise..."
                  className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              ) : (
                <p className="text-white">
                  {profile?.bio || "No bio provided"}
                </p>
              )}
            </div>
          </div>

          {/* Shop Details */}
          <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Shop Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Shop Name
                </label>
                {editing ? (
                  <Input
                    value={formData.shopName || ""}
                    onChange={(e) =>
                      handleInputChange("shopName", e.target.value)
                    }
                    placeholder="Enter your shop name"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.shopName || "Not provided"}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Street Address
                </label>
                {editing ? (
                  <Input
                    value={formData.shopAddress?.street || ""}
                    onChange={(e) =>
                      handleInputChange("shopAddress.street", e.target.value)
                    }
                    placeholder="Enter street address"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.shopAddress?.street || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  City
                </label>
                {editing ? (
                  <Input
                    value={formData.shopAddress?.city || ""}
                    onChange={(e) =>
                      handleInputChange("shopAddress.city", e.target.value)
                    }
                    placeholder="Enter city"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.shopAddress?.city || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  State
                </label>
                {editing ? (
                  <Input
                    value={formData.shopAddress?.state || ""}
                    onChange={(e) =>
                      handleInputChange("shopAddress.state", e.target.value)
                    }
                    placeholder="Enter state"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.shopAddress?.state || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  ZIP Code
                </label>
                {editing ? (
                  <Input
                    value={formData.shopAddress?.zipCode || ""}
                    onChange={(e) =>
                      handleInputChange("shopAddress.zipCode", e.target.value)
                    }
                    placeholder="Enter ZIP code"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.shopAddress?.zipCode || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Country
                </label>
                {editing ? (
                  <Input
                    value={formData.shopAddress?.country || ""}
                    onChange={(e) =>
                      handleInputChange("shopAddress.country", e.target.value)
                    }
                    placeholder="Enter country"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.shopAddress?.country || "Not provided"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Specializations */}
          <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Specializations
            </h2>
            {editing ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "Engine Repair",
                  "Brake System",
                  "Electrical",
                  "AC/Heating",
                  "Transmission",
                  "Suspension",
                  "Tire Service",
                  "Diagnostics",
                ].map((spec) => (
                  <label key={spec} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.specializations.includes(spec)}
                      onChange={() => handleSpecializationChange(spec)}
                      className="rounded border-white/[0.1] text-primary-400 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-neutral-300">
                      {spec}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.specializations?.length > 0 ? (
                  profile.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="px-3 py-1 bg-primary-500/15 text-primary-300 rounded-full text-sm"
                    >
                      {spec}
                    </span>
                  ))
                ) : (
                  <p className="text-neutral-500">No specializations added</p>
                )}
              </div>
            )}
          </div>

          {/* Working Hours & Service Area */}
          <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Working Hours & Service Area
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Start Time
                </label>
                {editing ? (
                  <Input
                    type="time"
                    value={formData.workingHours.start}
                    onChange={(e) =>
                      handleInputChange("workingHours.start", e.target.value)
                    }
                  />
                ) : (
                  <p className="text-white">
                    {profile?.workingHours?.start || "Not set"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  End Time
                </label>
                {editing ? (
                  <Input
                    type="time"
                    value={formData.workingHours.end}
                    onChange={(e) =>
                      handleInputChange("workingHours.end", e.target.value)
                    }
                  />
                ) : (
                  <p className="text-white">
                    {profile?.workingHours?.end || "Not set"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Service Radius (km)
                </label>
                {editing ? (
                  <Input
                    type="number"
                    value={formData.serviceRadius}
                    onChange={(e) =>
                      handleInputChange("serviceRadius", e.target.value)
                    }
                    min="1"
                    max="50"
                  />
                ) : (
                  <p className="text-white">
                    {profile?.serviceRadius || "Not set"} km
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Avatar & Status */}
          <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={profile?.avatar || "/default-avatar.png"}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/[0.08]"
                />
                {editing && (
                  <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700">
                    <CameraIcon className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <h3 className="mt-4 text-lg font-semibold text-white">
                {profile?.name}
              </h3>
              <p className="text-neutral-400">{profile?.email}</p>

              <div className="mt-3">
                {getStatusBadge(profile?.verificationStatus || "pending")}
              </div>

              {profile?.rating && (
                <div className="mt-3 flex items-center justify-center">
                  <StarIcon className="h-5 w-5 text-primary-400" />
                  <span className="ml-1 text-white">
                    {profile.rating.toFixed(1)}
                  </span>
                  <span className="ml-1 text-neutral-400">
                    ({profile.totalReviews} reviews)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Requests</span>
                  <span className="font-semibold">{stats.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Completed</span>
                  <span className="font-semibold text-success-400">
                    {stats.completedRequests}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Earnings</span>
                  <span className="font-semibold text-success-400">
                    {formatCurrency(stats.totalEarnings)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Average Rating</span>
                  <span className="font-semibold">
                    {stats.averageRating?.toFixed(1) || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/mechanic/requests")}
                icon={<WrenchScrewdriverIcon className="h-4 w-4" />}
              >
                View Assigned Requests
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/mechanic/earnings")}
                icon={<CurrencyDollarIcon className="h-4 w-4" />}
              >
                View Earnings
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/mechanic/reviews")}
                icon={<StarIcon className="h-4 w-4" />}
              >
                View Reviews
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
