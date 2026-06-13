import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import adminService from "../../services/adminService";
import { formatDate, formatCurrency } from "../../utils/helpers";
import toast from "react-hot-toast";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";

const ServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    issueType: "",
    search: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0,
    totalItems: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchServiceRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      };

      const response = await adminService.getServiceRequests(params);

      if (response.success) {
        setRequests(response.data.requests || []);
        setPagination((prev) => ({
          ...prev,
          totalPages: response.data.pagination?.totalPages || 0,
          totalItems: response.data.pagination?.totalItems || 0,
        }));
      }
    } catch (error) {
      console.error("Error fetching service requests:", error);
      toast.error("Failed to fetch service requests");
      setRequests([]);
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
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case "pending":
        return `${baseClasses} bg-warning-500/15 text-yellow-800`;
      case "assigned":
        return `${baseClasses} bg-blue-500/15 text-blue-800`;
      case "enroute":
        return `${baseClasses} bg-purple-500/15 text-purple-800`;
      case "in_progress":
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case "completed":
        return `${baseClasses} bg-success-500/15 text-green-800`;
      case "cancelled":
        return `${baseClasses} bg-danger-500/15 text-red-800`;
      case "offered":
        return `${baseClasses} bg-warning-500/15 text-yellow-800`;
      default:
        return `${baseClasses} bg-white/[0.05] text-neutral-100`;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <ClockIcon className="h-4 w-4 text-warning-400" />;
      case "assigned":
        return <CheckCircleIcon className="h-4 w-4 text-blue-400" />;
      case "enroute":
        return <ExclamationTriangleIcon className="h-4 w-4 text-purple-400" />;
      case "in_progress":
        return <ExclamationTriangleIcon className="h-4 w-4 text-accent-600" />;
      case "completed":
        return <CheckCircleIcon className="h-4 w-4 text-success-400" />;
      case "cancelled":
        return <XCircleIcon className="h-4 w-4 text-danger-400" />;
      case "offered":
        return <ClockIcon className="h-4 w-4 text-warning-400" />;
      default:
        return <ClockIcon className="h-4 w-4 text-neutral-400" />;
    }
  };

  const exportToCSV = async () => {
    try {
      const response = await adminService.getServiceRequests({
        ...filters,
        export: "csv",
      });

      if (response.success) {
        // Create and download CSV file
        const blob = new Blob([response.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `service-requests-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("CSV exported successfully");
      }
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV");
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Service Requests</h1>
          <p className="text-neutral-400">
            Monitor and manage all service requests
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={exportToCSV} disabled={loading}>
            Export CSV
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search"
              placeholder="Search by customer name or issue"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              icon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />

            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="enroute">En Route</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="offered">Price Offered</option>
            </Select>

            <Select
              label="Issue Type"
              value={filters.issueType}
              onChange={(e) => handleFilterChange("issueType", e.target.value)}
            >
              <option value="">All Types</option>
              <option value="flat_tire">Flat Tire</option>
              <option value="battery_dead">Dead Battery</option>
              <option value="fuel_empty">Out of Fuel</option>
              <option value="engine_trouble">Engine Problem</option>
              <option value="accident">Accident</option>
              <option value="key_locked">Key Locked</option>
              <option value="overheating">Overheating</option>
              <option value="brake_failure">Brake Failure</option>
              <option value="transmission_issue">Transmission Issue</option>
              <option value="other">Other</option>
            </Select>

            <Input
              label="Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            />

            <Input
              label="Date To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            />

            <Select
              label="Sort By"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            >
              <option value="createdAt">Request Date</option>
              <option value="updatedAt">Last Updated</option>
              <option value="quotation">Amount</option>
              <option value="status">Status</option>
            </Select>
          </div>
        )}
      </div>

      {/* Service Requests Table */}
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <h2 className="text-lg font-medium text-white">
            Service Requests ({pagination.totalItems})
          </h2>
        </div>

        {requests.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-neutral-500">No service requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06]">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Request Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Mechanic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/[0.06]">
                {requests.map((request) => (
                  <tr key={request._id} className="hover:bg-white/[0.03]">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">
                          #{request._id?.slice(-8) || "N/A"}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {request.issueType?.replace("_", " ").toUpperCase() ||
                            "N/A"}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {request.description?.substring(0, 50) ||
                            "No description"}
                          {request.description?.length > 50 && "..."}
                        </div>
                        {request.location?.address && (
                          <div className="text-xs text-neutral-500">
                            📍 {request.location.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          {request.customerId?.avatar ? (
                            <img
                              className="h-8 w-8 rounded-full"
                              src={request.customerId.avatar}
                              alt={request.customerId.name}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-white/[0.08] flex items-center justify-center">
                              <span className="text-xs font-medium text-neutral-400">
                                {request.customerId?.name
                                  ?.charAt(0)
                                  ?.toUpperCase() || "C"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">
                            {request.customerId?.name || "Unknown Customer"}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {request.customerId?.phone || "No phone"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.mechanicId ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            {request.mechanicId.avatar ? (
                              <img
                                className="h-8 w-8 rounded-full"
                                src={request.mechanicId.avatar}
                                alt={request.mechanicId.name}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-green-300 flex items-center justify-center">
                                <span className="text-xs font-medium text-success-400">
                                  {request.mechanicId.name
                                    ?.charAt(0)
                                    ?.toUpperCase() || "M"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-white">
                              {request.mechanicId.name}
                            </div>
                            <div className="text-sm text-neutral-500">
                              ⭐{" "}
                              {request.mechanicId.rating?.toFixed(1) || "N/A"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-500">
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <span
                          className={`ml-2 ${getStatusBadge(request.status)}`}
                        >
                          {request.status?.replace("_", " ").toUpperCase() ||
                            "UNKNOWN"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {request.finalAmount ? (
                          <span className="font-bold">
                            {formatCurrency(request.finalAmount)} (Final)
                          </span>
                        ) : request.quotation ? (
                          <span>{formatCurrency(request.quotation)}</span>
                        ) : (
                          "N/A"
                        )}
                      </div>
                      {request.userExpectedPrice > 0 && (
                        <div className="text-xs text-blue-400">
                          Exp: {formatCurrency(request.userExpectedPrice)}
                        </div>
                      )}
                      {request.mechanicOfferPrice > 0 &&
                        !request.finalAmount && (
                          <div className="text-xs text-accent-600">
                            Offered:{" "}
                            {formatCurrency(request.mechanicOfferPrice)}
                          </div>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          className="p-1 rounded text-blue-400 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-neutral-300">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.totalItems,
                )}{" "}
                of {pagination.totalItems} results
              </div>
              <div className="flex gap-2">
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

export default ServiceRequests;
