import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import VerificationForm from '../../components/mechanic/VerificationForm';
import NavigationModal from '../../components/mechanic/NavigationModal';
import RequestDetailsModal from '../../components/mechanic/RequestDetailsModal';
import mechanicApi from '../../api/mechanicApi';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { REQUEST_STATUS_LABELS, ISSUE_TYPE_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';
import socketService from '../../services/socketService';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

const MechanicDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [verification, setVerification] = useState(null);
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      const response = await mechanicApi.updateRequestStatus(requestId, newStatus);
      if (response.success) {
        toast.success(`Request ${newStatus} successfully`);
        fetchDashboardData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update request status');
    }
  };

  useEffect(() => {
    fetchDashboardData();
    checkVerificationStatus();
    setupSocketListeners();
    return () => {
      socketService.off('new-request-available');
      socketService.off('request-taken');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupSocketListeners = () => {
    if (user && user._id && user.location) {
      socketService.joinMechanicArea(user._id, user.location);
    }
    socketService.onNewRequestAvailable((requestData) => {
      toast.success(`New ${requestData.issueType} request available nearby!`);
      fetchDashboardData();
    });
    socketService.onRequestTaken(() => {
      fetchDashboardData();
    });
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [requestsResponse, statsResponse] = await Promise.all([
        mechanicApi.getAssignedRequests({ limit: 5, page: 1, includeAvailable: true }),
        mechanicApi.getStats()
      ]);
      if (requestsResponse.success) {
        setRequests(requestsResponse.data.items || requestsResponse.data.requests || []);
      }
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      const response = await mechanicApi.getVerificationStatus();
      if (response.success && response.data.verification) {
        setVerification(response.data.verification);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const handleVerificationSuccess = () => {
    setShowVerificationForm(false);
    checkVerificationStatus();
    toast.success('Verification submitted successfully!');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon className="h-5 w-5 text-warning-400" />;
      case 'offered': return <ClockIcon className="h-5 w-5 text-primary-400" />;
      case 'assigned':
      case 'enroute':
      case 'in_progress': return <WrenchScrewdriverIcon className="h-5 w-5 text-primary-400" />;
      case 'completed': return <CheckCircleIcon className="h-5 w-5 text-success-400" />;
      case 'cancelled': return <XCircleIcon className="h-5 w-5 text-danger-400" />;
      default: return <ClockIcon className="h-5 w-5 text-neutral-500" />;
    }
  };

  const getVerificationStatusDisplay = () => {
    if (!verification) {
      return (
        <motion.div variants={itemVariants} className="glass-panel border-warning-500/20 bg-warning-500/5 p-6 rounded-2xl">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-warning-500/15 rounded-xl">
              <ExclamationTriangleIcon className="h-6 w-6 text-warning-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Verification Required</h3>
              <p className="text-sm font-medium text-neutral-400 mt-1 mb-4 leading-relaxed max-w-2xl">
                You need to complete your shop verification to start receiving service requests and interacting with customers on the network.
              </p>
              <Button onClick={() => setShowVerificationForm(true)} variant="warning" className="active:scale-[0.98]">
                Start Verification
              </Button>
            </div>
          </div>
        </motion.div>
      );
    }

    const statusConfig = {
      pending: {
        icon: <ClockIcon className="h-6 w-6 text-warning-400" />,
        color: 'text-white',
        bgColor: 'bg-warning-500/5',
        borderColor: 'border-warning-500/20',
        title: 'Verification Pending',
        description: 'Your verification request is under review. You can still view requests but cannot accept them yet.',
        bgIcon: 'bg-warning-500/15'
      },
      approved: {
        icon: <CheckCircleIcon className="h-6 w-6 text-success-400" />,
        color: 'text-white',
        bgColor: 'bg-success-500/5',
        borderColor: 'border-success-500/20',
        title: 'Verification Approved',
        description: 'Your account is verified! You can now accept and complete service requests.',
        bgIcon: 'bg-success-500/15'
      },
      rejected: {
        icon: <XCircleIcon className="h-6 w-6 text-danger-400" />,
        color: 'text-white',
        bgColor: 'bg-danger-500/5',
        borderColor: 'border-danger-500/20',
        title: 'Verification Rejected',
        description: verification.rejectionReason || 'Your verification request was not approved. Please submit a new one.',
        bgIcon: 'bg-danger-500/15'
      }
    };

    const config = statusConfig[verification.status];

    return (
      <motion.div variants={itemVariants} className={`glass-panel border ${config.borderColor} ${config.bgColor} p-6 rounded-2xl`}>
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-xl ${config.bgIcon}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${config.color}`}>{config.title}</h3>
            <p className="text-sm font-medium text-neutral-400 mt-1 max-w-2xl leading-relaxed">{config.description}</p>
            {verification.status === 'rejected' && (
              <Button onClick={() => setShowVerificationForm(true)} variant="danger" className="mt-4">
                Submit New Verification
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
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
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600/20 via-primary-500/10 to-transparent border border-primary-500/20 shadow-xl p-8 md:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary-500/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-20 w-60 h-60 rounded-full bg-accent/5 blur-3xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">Welcome back, {user?.name}! 👋</h1>
          <p className="text-neutral-400 text-lg mb-8 leading-relaxed font-medium max-w-lg">
            Ready to help customers with their vehicle issues? Your workstation is fully synchronized.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-white/[0.05] px-4 py-2 rounded-xl border border-white/[0.08]">
              <div className="w-2.5 h-2.5 bg-success-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-neutral-300">Online & Available</span>
            </div>
            <Link to="/mechanic/chat">
              <button className="group relative inline-flex items-center justify-center px-6 py-2 text-sm font-bold text-black bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                <ChatBubbleLeftIcon className="w-4 h-4 mr-2" />
                Messages
              </button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Verification Status */}
      {getVerificationStatusDisplay()}

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Requests', value: stats.totalRequests, icon: DocumentTextIcon, color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20', status: 'Total assigned' },
          { label: 'Active Requests', value: stats.activeRequests, icon: ClockIcon, color: 'text-warning-400', bg: 'bg-warning-500/10', border: 'border-warning-500/20', status: 'Currently working' },
          { label: 'Completed', value: stats.completedRequests, icon: CheckCircleIcon, color: 'text-success-400', bg: 'bg-success-500/10', border: 'border-success-500/20', status: 'Completed jobs' },
          { label: 'Total Earnings', value: formatCurrency(stats.totalEarnings), icon: CurrencyDollarIcon, color: 'text-success-400', bg: 'bg-success-500/10', border: 'border-success-500/20', status: 'Available payouts' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 hover:bg-white/[0.07] transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</p>
                <p className={`text-xs font-semibold mt-2 ${stat.color}`}>{stat.status}</p>
              </div>
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.border} border group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Main Content Layout */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Recent Requests) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel">
            <div className="px-8 py-6 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-tight">Recent Requests</h2>
              <Link to="/mechanic/requests" className="text-sm font-bold text-primary-400 hover:text-primary-300 bg-primary-500/10 px-4 py-2 rounded-xl border border-primary-500/20 transition-colors">
                View All
              </Link>
            </div>

            <div className="p-6 md:p-8">
              {requests.length === 0 ? (
                <div className="text-center py-10">
                  <div className="p-4 bg-white/[0.05] rounded-full inline-block mb-4">
                    <WrenchScrewdriverIcon className="h-10 w-10 text-neutral-500" />
                  </div>
                  <h3 className="text-base font-bold text-white">No requests yet</h3>
                  <p className="mt-2 text-sm text-neutral-500 font-medium">
                    {verification?.status === 'approved'
                      ? 'You\'ll see service requests here when they become available.'
                      : 'Complete your verification to start receiving requests.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...requests].sort((a, b) => {
                    const weights = { emergency: 4, high: 3, medium: 2, low: 1 };
                    const weightA = weights[a.priority] || 0;
                    const weightB = weights[b.priority] || 0;
                    if (weightA !== weightB) return weightB - weightA;
                    return new Date(b.createdAt) - new Date(a.createdAt);
                  }).map((request) => (
                    <div key={request._id} className={`p-5 border ${request.priority === 'emergency' ? 'border-danger-500/30 bg-danger-500/5' : 'border-white/[0.06] hover:bg-white/[0.03]'} rounded-2xl transition-all`}>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="p-3 bg-white/[0.05] border border-white/[0.08] rounded-xl self-start">
                          {getStatusIcon(request.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-bold text-white capitalize">
                                {ISSUE_TYPE_LABELS[request.issueType] || request.issueType.replace('_', ' ')}
                              </h3>
                              {request.priority && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                  request.priority === 'emergency' ? 'bg-danger-500/15 text-danger-400 border-danger-500/30' :
                                  request.priority === 'high' ? 'bg-warning-500/15 text-warning-400 border-warning-500/30' :
                                  request.priority === 'medium' ? 'bg-primary-500/15 text-primary-400 border-primary-500/30' :
                                  'bg-secondary-500/15 text-secondary-400 border-secondary-500/30'
                                }`}>
                                  {request.priority}
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-2xl text-xs font-bold ${
                              request.status === 'completed' ? 'bg-success-500/15 text-success-400' :
                              request.status === 'cancelled' ? 'bg-danger-500/15 text-danger-400' :
                              request.status === 'pending' || request.status === 'offered' ? 'bg-warning-500/15 text-warning-400' :
                              'bg-primary-500/15 text-primary-400'
                            }`}>
                              {request.status === 'completed' && request.paymentStatus === 'paid' ? 'Paid' : 
                               request.status === 'completed' ? 'Payment Pending' :
                               request.status === 'offered' ? 'Offered' :
                               request.status === 'pending' ? 'Available' :
                               REQUEST_STATUS_LABELS[request.status]}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm font-semibold text-neutral-500 mb-3">
                            <div className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-1.5 text-neutral-600" />
                              <span className="truncate">{request.location.address || 'Location provided'}</span>
                            </div>
                            <div>
                              <strong className="text-neutral-400">Vehicle:</strong> {request.vehicleInfo.model} ({request.vehicleInfo.plate})
                            </div>
                            <div>
                              <strong className="text-neutral-400">Created:</strong> {formatDate(request.createdAt)}
                            </div>
                          </div>

                          {request.description && (
                            <p className="text-sm text-neutral-400 font-medium mb-3 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                              {request.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-4">
                            {request.quotation && (
                              <div className="text-sm bg-primary-500/10 text-primary-400 px-3 py-1.5 rounded-2xl border border-primary-500/20">
                                <strong className="font-bold">{request.status === 'pending' ? 'Base Price:' : 'Proposed Price:'}</strong> 
                                <span className="ml-1 font-extrabold">{formatCurrency(request.status === 'pending' ? (request.basePrice || request.quotation) : (request.mechanicOfferPrice || request.quotation))}</span>
                              </div>
                            )}
                            
                            <div className="flex-1"></div>
                            
                            {['assigned', 'enroute', 'in_progress'].includes(request.status) ? (
                              <Link to={`/mechanic/requests/${request._id}/track`}>
                                <Button variant="primary" size="sm" className="font-bold">
                                  Live Tracking
                                </Button>
                              </Link>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="font-bold"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowDetailsModal(true);
                                }}
                              >
                                View Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Quick Actions) */}
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Quick Actions</h2>
            <div className="flex flex-col gap-4">
              {[
                { icon: WrenchScrewdriverIcon, label: 'View All Requests', desc: 'Browse available jobs', link: '/mechanic/requests' },
                { icon: CalendarIcon, label: 'Service Calendar', desc: 'Check your schedule', link: '/mechanic/calendar' },
                { icon: UserIcon, label: 'Update Profile', desc: 'Manage your settings', link: '/mechanic/profile' },
                { icon: CurrencyDollarIcon, label: 'Earnings Dashboard', desc: 'Track your payouts', link: '/mechanic/earnings' },
              ].map((action, i) => (
                <Link key={i} to={action.link} className="group flex items-center p-4 border border-white/[0.06] rounded-2xl hover:border-primary-500/30 hover:bg-white/[0.03] transition-all duration-300">
                  <div className="p-3 bg-white/[0.05] border border-white/[0.08] rounded-xl group-hover:bg-primary-500/10 transition-colors">
                    <action.icon className="h-6 w-6 text-primary-400" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-bold text-white group-hover:text-primary-400">{action.label}</h3>
                    <p className="text-xs font-semibold text-neutral-500">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      {showVerificationForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowVerificationForm(false)}></div>
            <div className="inline-block relative glass-panel w-full max-w-4xl rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all p-6 md:p-8">
              <VerificationForm onSuccess={handleVerificationSuccess} />
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setShowDetailsModal(false)}
          onStatusUpdate={handleStatusUpdate}
          onNavigate={(request) => {
            setSelectedRequest(request);
            setShowDetailsModal(false);
            setShowNavigationModal(true);
          }}
        />
      )}

      <NavigationModal
        isOpen={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        request={selectedRequest}
        mechanicLocation={user?.location}
        onStatusUpdate={handleStatusUpdate}
      />
    </motion.div>
  );
};

export default MechanicDashboard;
