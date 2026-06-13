import React, { useState, useEffect } from "react";
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ReceiptIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import Button from "../common/Button";
import paymentApi from "../../api/paymentApi";
import { formatCurrency, formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });

  useEffect(() => {
    fetchPayments();
  }, [pagination.currentPage, filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...filters,
      };

      const response = await paymentApi.getPaymentHistory(params);

      if (response.success) {
        setPayments(response.data.items || []);
        setPagination((prev) => ({
          ...prev,
          totalPages: response.data.totalPages || 1,
          totalItems: response.data.totalItems || 0,
        }));
      } else {
        toast.error("Failed to fetch payment history");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to fetch payment history");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon className="w-5 h-5 text-success-400" />;
      case "failed":
        return <XCircleIcon className="w-5 h-5 text-danger-400" />;
      case "pending":
        return <ClockIcon className="w-5 h-5 text-warning-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-neutral-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-success-500/15 text-green-800";
      case "failed":
        return "bg-danger-500/15 text-danger-400";
      case "pending":
        return "bg-warning-500/15 text-warning-400";
      default:
        return "bg-white/[0.05] text-neutral-100";
    }
  };

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const filteredPayments = payments.filter((payment) => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        payment.transactionId?.toLowerCase().includes(searchTerm) ||
        payment.orderId?.toLowerCase().includes(searchTerm) ||
        payment.serviceRequest?.issueType?.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

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
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Payment History</h1>
            <p className="text-neutral-400">
              View all your payment transactions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ReceiptIcon className="h-8 w-8 text-primary-400" />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search payments..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-4 py-2 border border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            className="px-4 py-2 border border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            className="px-4 py-2 border border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Payment List */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <ReceiptIcon className="mx-auto h-12 w-12 text-neutral-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No payments found
              </h3>
              <p className="text-neutral-400">
                No payment records match your current filters.
              </p>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div
                key={payment._id}
                className="bg-white/[0.03] rounded-2xl p-4 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(payment.status)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white">
                          {payment.serviceRequest?.issueType?.replace(
                            "_",
                            " ",
                          ) || "Service Payment"}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-neutral-400 mt-1">
                        <span className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          {formatDate(payment.createdAt)}
                        </span>
                        <span className="flex items-center">
                          <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                          {formatCurrency(payment.amount)}
                        </span>
                        {payment.transactionId && (
                          <span className="font-mono text-xs">
                            ID: {payment.transactionId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(payment)}
                      icon={<EyeIcon className="h-4 w-4" />}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-neutral-300">
              Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{" "}
              {Math.min(
                pagination.currentPage * pagination.limit,
                pagination.totalItems,
              )}{" "}
              of {pagination.totalItems} results
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                Previous
              </Button>

              <span className="px-3 py-2 text-sm text-neutral-300">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
};

// Payment Details Modal Component
const PaymentDetailsModal = ({ payment, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-white/[0.15] bg-opacity-60 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white/[0.05] rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white/[0.05] px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="w-full">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-white">
                    Payment Details
                  </h3>
                  <button
                    onClick={onClose}
                    className="text-neutral-500 hover:text-neutral-400"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Payment Status */}
                  <div className="bg-white/[0.03] rounded-2xl p-4">
                    <h4 className="font-semibold text-white mb-3">
                      Payment Status
                    </h4>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payment.status)}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="bg-white/[0.03] rounded-2xl p-4">
                    <h4 className="font-semibold text-white mb-3">
                      Payment Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Amount:</span>
                        <span className="font-medium">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Currency:</span>
                        <span className="font-medium">{payment.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Method:</span>
                        <span className="font-medium capitalize">
                          {payment.method}
                        </span>
                      </div>
                      {payment.processingFee && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">
                            Processing Fee:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(payment.processingFee)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-white/[0.03] rounded-2xl p-4">
                    <h4 className="font-semibold text-white mb-3">
                      Transaction Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      {payment.transactionId && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">
                            Transaction ID:
                          </span>
                          <span className="font-mono text-xs">
                            {payment.transactionId}
                          </span>
                        </div>
                      )}
                      {payment.orderId && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Order ID:</span>
                          <span className="font-mono text-xs">
                            {payment.orderId}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Created:</span>
                        <span>{formatDate(payment.createdAt)}</span>
                      </div>
                      {payment.paidAt && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Paid:</span>
                          <span>{formatDate(payment.paidAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Request Details */}
                  {payment.serviceRequest && (
                    <div className="bg-white/[0.03] rounded-2xl p-4">
                      <h4 className="font-semibold text-white mb-3">
                        Service Request
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">
                            Service Type:
                          </span>
                          <span className="font-medium capitalize">
                            {payment.serviceRequest.issueType?.replace(
                              "_",
                              " ",
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Status:</span>
                          <span className="font-medium capitalize">
                            {payment.serviceRequest.status}
                          </span>
                        </div>
                        {payment.serviceRequest.mechanic && (
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Mechanic:</span>
                            <span className="font-medium">
                              {payment.serviceRequest.mechanic.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              variant="primary"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
