import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  WrenchScrewdriverIcon,
  CreditCardIcon,
  TrashIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Button from "../../components/common/Button";
import requestService from "../../services/requestService";
import paymentApi from "../../api/paymentApi";
import { formatDate, formatCurrency } from "../../utils/helpers";
import { REQUEST_STATUS_LABELS } from "../../utils/constants";
import UnifiedPaymentModal from "../../components/payment/UnifiedPaymentModal";
import toast from "react-hot-toast";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
};

const CustomerDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchPendingPayments();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const requestsResponse = await requestService.getMyRequests({
        limit: 5,
        page: 1,
      });
      if (requestsResponse.success) {
        const requestsData = requestsResponse.data.items || [];
        setRequests(requestsData);
        const totalRequests = requestsData.length;
        const activeRequests = requestsData.filter((req) =>
          ["pending", "assigned", "enroute", "in_progress"].includes(
            req.status,
          ),
        ).length;
        const completedRequests = requestsData.filter(
          (req) => req.status === "completed",
        ).length;
        const totalSpent = requestsData
          .filter((req) => req.status === "completed" && req.quotation)
          .reduce((sum, req) => sum + req.quotation, 0);
        setStats({
          totalRequests,
          activeRequests,
          completedRequests,
          totalSpent,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const response = await paymentApi.getPaymentHistory({
        status: "pending",
        limit: 5,
      });
      if (response.success) {
        setPendingPayments(response.data.items || []);
      }
    } catch (error) {
      console.error("Error fetching pending payments:", error);
    }
  };

  const handlePaymentClick = (request) => {
    setSelectedRequest(request);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    toast.success("Payment completed successfully!");
    setShowPaymentModal(false);
    setSelectedRequest(null);
    fetchDashboardData();
    fetchPendingPayments();
  };

  const handlePaymentFailure = () => {
    toast.error("Payment failed. Please try again.");
    setShowPaymentModal(false);
    setSelectedRequest(null);
  };

  const handleDeleteRequest = async (requestId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this request permanently?",
      )
    ) {
      return;
    }
    try {
      const response = await requestService.deleteRequest(requestId);
      if (response.success) {
        toast.success("Request deleted successfully");
        fetchDashboardData();
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete request");
    }
  };

  const canDelete = (request) => {
    return (
      request.status === "pending" && !(request.mechanic || request.mechanicId)
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <ClockIcon className="h-5 w-5 text-warning-400" />;
      case "assigned":
      case "enroute":
      case "in_progress":
        return <WrenchScrewdriverIcon className="h-5 w-5 text-primary-400" />;
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-success-400" />;
      case "cancelled":
        return <XCircleIcon className="h-5 w-5 text-danger-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-neutral-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-8 max-w-7xl mx-auto pb-12"
    >
      {/* Welcome Section */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600/20 via-primary-500/10 to-transparent border border-primary-500/20 shadow-xl p-6 sm:p-8 md:p-10"
      >
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary-500/5 blur-3xl"></div>
        <div className="absolute bottom-0 right-40 w-60 h-60 rounded-full bg-accent/5 blur-3xl"></div>

        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
            Welcome back to SnapFix 👋
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg mb-6 leading-relaxed font-medium max-w-lg">
            Need immediate roadside assistance or want to schedule maintenance?
            Our professional network is ready 24/7.
          </p>
          <Link to="/customer/mechanics">
            <button className="group relative inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-black bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              <span className="mr-2">Request Help Now</span>
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          {
            label: "Total Requests",
            value: stats.totalRequests,
            icon: WrenchScrewdriverIcon,
            color: "text-primary-400",
            bg: "bg-primary-500/10",
            border: "border-primary-500/20",
          },
          {
            label: "Active Requests",
            value: stats.activeRequests,
            icon: ClockIcon,
            color: "text-warning-400",
            bg: "bg-warning-500/10",
            border: "border-warning-500/20",
          },
          {
            label: "Completed",
            value: stats.completedRequests,
            icon: CheckCircleIcon,
            color: "text-success-400",
            bg: "bg-success-500/10",
            border: "border-success-500/20",
          },
          {
            label: "Total Spent",
            value: formatCurrency(stats.totalSpent),
            icon: CreditCardIcon,
            color: "text-neutral-300",
            bg: "bg-white/[0.05]",
            border: "border-white/[0.08]",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="glass-panel p-6 hover:bg-white/[0.07] transition-all group"
          >
            <div className="flex items-center">
              <div
                className={`p-4 rounded-2xl ${stat.bg} ${stat.border} border group-hover:scale-110 transition-transform duration-300`}
              >
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
              <div className="ml-5">
                <p className="text-sm font-semibold text-neutral-500">
                  {stat.label}
                </p>
                <p className="text-3xl font-extrabold text-white mt-1 tracking-tight">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Main Content Layout */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Left Column (Recent Requests) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel">
            <div className="px-4 sm:px-8 py-5 sm:py-6 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Recent Requests
              </h2>
              <Link
                to="/customer/requests"
                className="text-sm font-bold text-primary-400 hover:text-primary-300 bg-primary-500/10 px-4 py-2 rounded-xl border border-primary-500/20 transition-colors"
              >
                View All
              </Link>
            </div>

            <div className="p-6 md:p-8">
              {requests.length === 0 ? (
                <div className="text-center py-10">
                  <div className="p-4 bg-white/[0.05] rounded-full inline-block mb-4">
                    <WrenchScrewdriverIcon className="h-10 w-10 text-neutral-500" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    No requests yet
                  </h3>
                  <p className="mt-2 text-sm text-neutral-500 font-medium">
                    Get started by creating your first service request.
                  </p>
                  <div className="mt-6">
                    <Link to="/customer/mechanics">
                      <Button
                        variant="primary"
                        icon={<PlusIcon className="h-5 w-5" />}
                      >
                        Create Request
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div
                      key={request._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border border-white/[0.06] rounded-2xl hover:bg-white/[0.03] transition-all gap-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="p-2 bg-white/[0.05] border border-white/[0.08] rounded-xl flex-shrink-0">
                          {getStatusIcon(request.status)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white capitalize truncate">
                            {request.issueType.replace("_", " ")}
                          </h3>
                          <div className="flex flex-wrap items-center mt-1 text-xs font-semibold text-neutral-500 gap-1">
                            <MapPinIcon className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[140px] sm:max-w-[200px]">
                              {request.location.address || "Location provided"}
                            </span>
                            <span className="text-neutral-600">•</span>
                            {formatDate(request.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <div
                          className={`px-3 py-1.5 rounded-2xl text-xs font-bold ${
                            request.status === "completed"
                              ? "bg-success-500/15 text-success-400"
                              : request.status === "pending"
                                ? "bg-warning-500/15 text-warning-400"
                                : "bg-primary-500/15 text-primary-400"
                          }`}
                        >
                          {request.status === "completed"
                            ? request.paymentStatus === "paid"
                              ? "Completed & Paid"
                              : "Payment Pending"
                            : REQUEST_STATUS_LABELS[request.status]}
                        </div>
                        {request.quotation && (
                          <span className="text-sm font-extrabold text-white bg-white/[0.05] px-3 py-1.5 rounded-2xl border border-white/[0.08]">
                            {formatCurrency(request.quotation)}
                          </span>
                        )}
                        {canDelete(request) && (
                          <button
                            onClick={() => handleDeleteRequest(request._id)}
                            className="p-1.5 text-danger-400 hover:text-danger-300 bg-danger-500/10 border border-danger-500/20 rounded-2xl transition-colors"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Payments & Actions) */}
        <div className="space-y-8">
          {pendingPayments.length > 0 && (
            <div className="glass-panel border-warning-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <CreditCardIcon className="w-24 h-24 text-warning-400" />
              </div>
              <div className="px-6 py-5 border-b border-warning-500/10 flex items-center justify-between relative z-10">
                <h2 className="text-lg font-extrabold text-white tracking-tight">
                  Pending Payments
                </h2>
              </div>

              <div className="p-6 relative z-10">
                <div className="space-y-4">
                  {pendingPayments.map((payment) => (
                    <div
                      key={payment._id}
                      className="p-4 bg-white/[0.03] border border-warning-500/15 rounded-2xl hover:bg-white/[0.05] transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-warning-500/15 rounded-xl">
                          <CreditCardIcon className="h-5 w-5 text-warning-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white capitalize">
                            {payment.serviceRequest?.issueType?.replace(
                              "_",
                              " ",
                            ) || "Service Payment"}
                          </h3>
                          <p className="text-xs font-semibold text-neutral-500">
                            Due: {formatDate(payment.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <span className="font-extrabold text-lg text-white">
                          {formatCurrency(payment.amount)}
                        </span>
                        <Button
                          variant="warning"
                          size="sm"
                          className="font-bold"
                          onClick={() =>
                            handlePaymentClick(payment.serviceRequest)
                          }
                        >
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/customer/payments"
                  className="block text-center mt-4 text-xs font-bold text-warning-400 hover:text-warning-300"
                >
                  View All Payments →
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-gradient-to-br from-danger-500/10 to-danger-600/5 rounded-3xl p-6 border border-danger-500/20">
              <h3 className="text-lg font-bold text-white mb-2">
                Emergency Hub
              </h3>
              <p className="text-xs font-semibold text-neutral-500 mb-5 leading-relaxed">
                Stranded or facing a critical issue? Our priority broadcast reaches all nearby mechanics immediately.
              </p>
              <Link to="/customer/mechanics">
                <Button
                  variant="danger"
                  className="w-full text-sm py-3 !rounded-xl active:scale-[0.98]"
                >
                  Start Priority Request
                </Button>
              </Link>
            </div>

            <div className="glass-panel p-6 border border-primary-500/15">
              <h3 className="text-lg font-bold text-white mb-2">
                Service Tracking
              </h3>
              <p className="text-xs font-semibold text-neutral-500 mb-5 leading-relaxed">
                Know exactly where your mechanic is and estimated arrival times.
              </p>
              <Link to="/customer/requests?status=active">
                <Button
                  variant="outline"
                  className="w-full text-sm py-3 !rounded-xl active:scale-[0.98]"
                >
                  Track Active Requests
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Modal */}
      {showPaymentModal && selectedRequest && (
        <UnifiedPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          serviceRequest={selectedRequest}
          paymentType="post-completion"
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
      )}
    </motion.div>
  );
};

export default CustomerDashboard;
