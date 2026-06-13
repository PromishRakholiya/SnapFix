import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import adminService from "../../services/adminService";
import { formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: "",
    isActive: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0,
    totalItems: 0,
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      };

      console.log("Fetching users with params:", params);
      const response = await adminService.getUsers(params);
      console.log("Users response:", response);

      if (response.success) {
        setUsers(response.data.users || []);
        setPagination((prev) => ({
          ...prev,
          totalPages: response.data.pagination?.totalPages || 0,
          totalItems: response.data.pagination?.totalItems || 0,
        }));
      } else {
        console.error("API returned success: false:", response);
        toast.error(response.message || "Failed to fetch users");
        setUsers([]);
        setPagination((prev) => ({
          ...prev,
          totalPages: 0,
          totalItems: 0,
        }));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Failed to fetch users");
      setUsers([]);
      setPagination((prev) => ({
        ...prev,
        totalPages: 0,
        totalItems: 0,
      }));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleUserStatusChange = async (userId, isActive) => {
    try {
      const response = await adminService.updateUserStatus(userId, {
        isActive,
      });

      if (response.success) {
        toast.success(
          `User ${isActive ? "activated" : "deactivated"} successfully`,
        );
        fetchUsers(); // Refresh the list
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleVerifyUser = async (userId) => {
    try {
      const response = await adminService.verifyUser(userId);

      if (response.success) {
        toast.success("User verified successfully");
        fetchUsers(); // Refresh the list
      }
    } catch (error) {
      console.error("Error verifying user:", error);
      toast.error("Failed to verify user");
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.error("Please select users to perform bulk action");
      return;
    }

    try {
      const response = await adminService.bulkUserActions({
        userIds: selectedUsers,
        action,
      });

      if (response.success) {
        toast.success(`Bulk ${action} completed successfully`);
        setSelectedUsers([]);
        fetchUsers();
      }
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(users.map((user) => user._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId]);
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "customer":
        return <UserIcon className="h-5 w-5 text-blue-400" />;
      case "mechanic":
        return <WrenchScrewdriverIcon className="h-5 w-5 text-success-400" />;
      case "admin":
        return <ShieldCheckIcon className="h-5 w-5 text-purple-400" />;
      default:
        return <UserIcon className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getRoleBadge = (role) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (role) {
      case "customer":
        return `${baseClasses} bg-blue-500/15 text-blue-800`;
      case "mechanic":
        return `${baseClasses} bg-success-500/15 text-green-800`;
      case "admin":
        return `${baseClasses} bg-purple-500/15 text-purple-800`;
      default:
        return `${baseClasses} bg-white/[0.05] text-neutral-100`;
    }
  };

  const getStatusBadge = (isActive, isVerified) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";

    if (!isActive) {
      return `${baseClasses} bg-danger-500/15 text-danger-400`;
    }

    if (!isVerified) {
      return `${baseClasses} bg-warning-500/15 text-warning-400`;
    }

    return `${baseClasses} bg-success-500/15 text-green-800`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-neutral-400">Manage all users on the platform</p>
        </div>
        <div className="flex space-x-2">
          {selectedUsers.length > 0 && (
            <>
              <Button
                variant="secondary"
                onClick={() => handleBulkAction("activate")}
                disabled={loading}
              >
                Activate Selected
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleBulkAction("deactivate")}
                disabled={loading}
              >
                Deactivate Selected
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Filters</h2>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            {showFilters ? "Hide" : "Show"} Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Search"
              placeholder="Search by name, email, or phone"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              icon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />

            <Select
              label="Role"
              value={filters.role}
              onChange={(e) => handleFilterChange("role", e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="mechanic">Mechanic</option>
              <option value="admin">Admin</option>
            </Select>

            <Select
              label="Status"
              value={filters.isActive}
              onChange={(e) => handleFilterChange("isActive", e.target.value)}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>

            <Select
              label="Sort By"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            >
              <option value="createdAt">Registration Date</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="rating">Rating</option>
            </Select>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">
              Users ({pagination.totalItems})
            </h2>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={
                  selectedUsers.length === users.length && users.length > 0
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-white/[0.1]"
              />
              <span className="text-sm text-neutral-400">Select All</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06]">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/[0.06]">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-white/[0.03]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id)}
                          onChange={(e) =>
                            handleSelectUser(user._id, e.target.checked)
                          }
                          className="rounded border-white/[0.1] mr-3"
                        />
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.avatar ? (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={user.avatar}
                                alt={user.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-white/[0.08] flex items-center justify-center">
                                {getRoleIcon(user.role)}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {user.name}
                            </div>
                            <div className="text-sm text-neutral-500">
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="text-sm text-neutral-500">
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRoleBadge(user.role)}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={getStatusBadge(
                          user.isActive,
                          user.isVerified,
                        )}
                      >
                        {!user.isActive
                          ? "Inactive"
                          : !user.isVerified
                            ? "Unverified"
                            : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleUserStatusChange(user._id, !user.isActive)
                          }
                          className={`p-1 rounded ${
                            user.isActive
                              ? "text-danger-400 hover:text-danger-300"
                              : "text-success-400 hover:text-green-900"
                          }`}
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? (
                            <XCircleIcon className="h-4 w-4" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4" />
                          )}
                        </button>

                        {!user.isVerified && (
                          <button
                            onClick={() => handleVerifyUser(user._id)}
                            className="p-1 rounded text-blue-400 hover:text-blue-900"
                            title="Verify User"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          className="p-1 rounded text-neutral-400 hover:text-white"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        <button
                          className="p-1 rounded text-neutral-400 hover:text-white"
                          title="Edit User"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-300">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.totalItems,
                )}{" "}
                of {pagination.totalItems} results
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
