import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  WrenchScrewdriverIcon,
  CreditCardIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import RequestTracker from '../../components/customer/RequestTracker';
import DemoPaymentModal from '../../components/payment/DemoPaymentModal';
import AddReview from '../../components/customer/AddReview';
import ChatModal from '../../components/chat/ChatModal';
import requestService from '../../services/requestService';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, getRelativeTime } from '../../utils/helpers';
import { REQUEST_STATUS_LABELS, ISSUE_TYPE_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

const RequestHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    issueType: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showTracker, setShowTracker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRequest, setChatRequest] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...filters
      };

      Object.keys(queryParams).forEach(key => {
        if (!queryParams[key]) {
          delete queryParams[key];
        }
      });

      const response = await requestService.getMyRequests(queryParams);
      
      if (response.success) {
        setRequests(response.data.items || []);
        setPagination(prev => ({
          ...prev,
          totalPages: response.data.totalPages || 1,
          totalItems: response.data.totalItems || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.limit]);

  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching requests for:', user.email);
      fetchRequests();
    } else {
      console.log('No user found, cannot fetch requests');
    }
  }, [user, fetchRequests]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      issueType: '',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleTrackRequest = (request) => {
    setSelectedRequest(request);
    setShowTracker(true);
  };

  const handlePayment = (request) => {
    setPaymentRequest(request);
    setShowPaymentModal(true);
  };

  const handleStatusUpdate = (updatedData) => {
    setRequests(prev => prev.map(req => 
      req._id === updatedData.requestId 
        ? { ...req, status: updatedData.status }
        : req
    ));
  };

  const handlePaymentSuccess = (paymentData) => {
    setShowPaymentModal(false);
    setPaymentRequest(null);
    toast.success('Demo payment completed successfully!');
    fetchRequests(); // Refresh the list
  };

  const handleReview = (request) => {
    setSelectedRequest(request);
    setShowReviewModal(true);
  };

  const handleReviewSuccess = () => {
    setShowReviewModal(false);
    setSelectedRequest(null);
    fetchRequests();
    toast.success('Review submitted successfully!');
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this request permanently? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await requestService.deleteRequest(requestId);
      if (response.success) {
        toast.success('Request deleted successfully');
        fetchRequests(); // Refresh the list
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete request');
    }
  };

  const canDelete = (request) => {
    const hasMechanic = request.mechanic || request.mechanicId;
    return request.status === 'pending' && !hasMechanic;
  };

  const handleStartChat = (request) => {
    setChatRequest(request);
    setShowChatModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-warning-500" />;
      case 'assigned':
      case 'enroute':
      case 'in_progress':
        return <WrenchScrewdriverIcon className="h-5 w-5 text-primary-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-danger-500" />;
      case 'offered':
        return <BanknotesIcon className="h-5 w-5 text-warning-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-neutral-500" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'status-pending',
      assigned: 'status-assigned',
      enroute: 'status-in-progress',
      in_progress: 'status-in-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      offered: 'status-pending'
    };
    return colors[status] || 'status-pending';
  };

  const canTrack = (status) => {
    return ['assigned', 'enroute', 'in_progress'].includes(status);
  };

  const canPay = (request) => { // eslint-disable-line no-unused-vars
    const hasMechanic = request.mechanic || request.mechanicId;
    return request.status === 'completed' && 
           (request.quotation || request.finalAmount) && 
           request.paymentStatus !== 'paid' && 
           hasMechanic;
  };

  const canReview = (request) => {
    // Check if request has a mechanic (either mechanic or mechanicId)
    const hasMechanic = request.mechanic || request.mechanicId;
    const canReviewResult = request.status === 'completed' && hasMechanic && !request.reviewId;
    
    console.log('Can review check:', {
      requestId: request._id,
      status: request.status,
      hasMechanic: !!hasMechanic,
      mechanic: request.mechanic,
      mechanicId: request.mechanicId,
      hasReview: !!request.reviewId,
      canReview: canReviewResult
    });
    return Boolean(canReviewResult);
  };

  // Helper function to get mechanic info
  const getMechanicInfo = (request) => {
    return request.mechanic || request.mechanicId;
  };

  const canChat = (request) => {
    const hasMechanic = request.mechanic || request.mechanicId;
    return hasMechanic && ['assigned', 'enroute', 'in_progress', 'completed'].includes(request.status);
  };

  if (showTracker && selectedRequest) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowTracker(false)}
          >
            ← Back to History
          </Button>
        </div>
        <RequestTracker 
          request={selectedRequest}
          onStatusUpdate={handleStatusUpdate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Request History</h1>
          <p className="text-neutral-400">
            Track and manage your service requests
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/customer/mechanics')}
          icon={<WrenchScrewdriverIcon className="h-5 w-5" />}
        >
          New Request
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            Clear All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Request ID, vehicle..."
                className="pl-10 w-full px-3 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Issue Type
            </label>
            <select
              value={filters.issueType}
              onChange={(e) => handleFilterChange('issueType', e.target.value)}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="flat_tire">Flat Tire</option>
              <option value="battery_dead">Dead Battery</option>
              <option value="engine_trouble">Engine Trouble</option>
              <option value="fuel_empty">Out of Fuel</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <h2 className="text-lg font-semibold text-white">
            Service Requests ({pagination.totalItems})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-neutral-400 mt-4">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <WrenchScrewdriverIcon className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No requests found</h3>
            <p className="text-neutral-400 mb-4">
              {Object.values(filters).some(filter => filter) 
                ? 'Try adjusting your filters to see more results.'
                : 'You haven\'t created any service requests yet.'
              }
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/customer/mechanics')}
              icon={<WrenchScrewdriverIcon className="h-5 w-5" />}
            >
              Create Your First Request
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {requests.map((request) => (
              <div key={request._id} className="p-4 sm:p-6 hover:bg-white/[0.03] transition-colors">
                {/* Top row: status badge + title */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {getStatusIcon(request.status)}
                  <h3 className="text-base sm:text-lg font-semibold text-white flex-1 min-w-0 truncate">
                    {ISSUE_TYPE_LABELS[request.issueType] || request.issueType}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(request.status)}`}>
                    {request.status === 'completed' && request.paymentStatus === 'paid' ? 'Paid' : REQUEST_STATUS_LABELS[request.status]}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-neutral-400 mb-3">
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{request.location.address || 'Location provided'}</span>
                  </div>
                  <div>
                    <strong>Vehicle:</strong> {request.vehicleInfo.model} ({request.vehicleInfo.plate})
                  </div>
                  <div>
                    <strong>Created:</strong> {getRelativeTime(request.createdAt)}
                  </div>
                  {request.userExpectedPrice > 0 && (
                    <div>
                      <strong>Expected:</strong> ₹{request.userExpectedPrice}
                    </div>
                  )}
                </div>

                {request.description && (
                  <p className="text-sm text-neutral-400 mb-3 line-clamp-2">{request.description}</p>
                )}

                {getMechanicInfo(request) && (
                  <div className="mb-3 p-3 bg-white/[0.03] rounded-2xl">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Assigned to: {getMechanicInfo(request)?.name || 'Mechanic'}
                        </p>
                        <p className="text-xs text-neutral-400">
                          ⭐ {getMechanicInfo(request)?.rating?.toFixed(1) || 'New'} • {getMechanicInfo(request)?.phone || 'Contact available'}
                        </p>
                      </div>
                      {request.quotation && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{formatCurrency(request.quotation)}</p>
                          <p className="text-xs text-neutral-400">Estimated cost</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons - wrap on mobile */}
                <div className="flex flex-wrap gap-2">
                  {request.status === 'offered' && (
                    <>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await requestService.confirmRequestPrice(request._id);
                            if (response.success) {
                              toast.success('Offer accepted! Mechanic is now assigned.');
                              fetchRequests();
                            }
                          } catch (error) {
                            toast.error(error.message || 'Failed to accept offer');
                          }
                        }}
                      >
                        Accept Offer (₹{request.mechanicOfferPrice})
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          const reason = window.prompt('Please enter a reason for cancellation:');
                          if (reason !== null) {
                            try {
                              const response = await requestService.cancelRequest(request._id, reason);
                              if (response.success) {
                                toast.success('Request cancelled');
                                fetchRequests();
                              }
                            } catch (error) {
                              toast.error(error.message || 'Failed to cancel request');
                            }
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {canTrack(request.status) && (
                    <Button variant="primary" size="sm" onClick={() => handleTrackRequest(request)} icon={<EyeIcon className="h-4 w-4" />}>
                      Track Live
                    </Button>
                  )}

                  <Button variant="outline" size="sm" onClick={() => handleTrackRequest(request)} icon={<EyeIcon className="h-4 w-4" />}>
                    Details
                  </Button>

                  {canChat(request) && (
                    <Button variant="outline" size="sm" onClick={() => handleStartChat(request)} icon={<ChatBubbleLeftIcon className="h-4 w-4" />}>
                      Chat
                    </Button>
                  )}

                  {canPay(request) && (
                    <Button variant="success" size="sm" onClick={() => handlePayment(request)} icon={<CreditCardIcon className="h-4 w-4" />}>
                      Pay
                    </Button>
                  )}

                  {canReview(request) && (
                    <Button variant="warning" size="sm" onClick={() => handleReview(request)} icon={<StarIcon className="h-4 w-4" />}>
                      Review
                    </Button>
                  )}

                  {request.reviewId && (
                    <span className="flex items-center text-success-400 text-xs gap-1 px-2 py-1 bg-success-500/10 rounded-lg">
                      <StarIcon className="h-4 w-4" /> Reviewed
                    </span>
                  )}

                  {canDelete(request) && (
                    <Button variant="danger" size="sm" onClick={() => handleDeleteRequest(request._id)} icon={<TrashIcon className="h-4 w-4" />}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentRequest && (
        <DemoPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          serviceRequest={paymentRequest}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <AddReview
          mechanicId={getMechanicInfo(selectedRequest)?._id}
          mechanicName={getMechanicInfo(selectedRequest)?.name || 'Mechanic'}
          requestId={selectedRequest._id}
          onSuccess={handleReviewSuccess}
          onClose={() => setShowReviewModal(false)}
        />
      )}

      {/* Chat Modal */}
      <ChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        mechanic={chatRequest ? getMechanicInfo(chatRequest) : null}
        serviceRequestId={chatRequest?._id}
      />
    </div>
  );
};

export default RequestHistory;
