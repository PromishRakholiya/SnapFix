import React, { useState, useEffect, useCallback } from 'react';
import {
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  ShieldCheckIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import mechanicVerificationService from '../../services/mechanicVerificationService';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const VerificationManagement = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = { page: pagination.currentPage, limit: pagination.limit, ...filters };
      Object.keys(queryParams).forEach((key) => { if (!queryParams[key]) delete queryParams[key]; });
      const response = await mechanicVerificationService.getAllVerifications(queryParams);
      if (response.success) {
        setVerifications(response.data.verifications || []);
        setPagination((prev) => ({
          ...prev,
          totalPages: response.data.pagination?.totalPages || 1,
          totalItems: response.data.pagination?.totalItems || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.limit]);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleReview = (verification) => { setSelectedVerification(verification); setShowReviewModal(true); };
  const handleViewDetails = (verification) => { setSelectedVerification(verification); setShowDetailsModal(true); };

  const handleReviewSubmit = async (reviewData) => {
    try {
      const response = await mechanicVerificationService.reviewVerification(selectedVerification._id, reviewData);
      if (response.success) {
        toast.success(`Verification ${reviewData.status} successfully`);
        setShowReviewModal(false);
        setSelectedVerification(null);
        fetchVerifications();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to review verification');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending:  'bg-warning-500/15 text-warning-400 border border-warning-500/20',
      approved: 'bg-success-500/15 text-success-400 border border-success-500/20',
      rejected: 'bg-danger-500/15 text-danger-400 border border-danger-500/20',
    };
    return map[status] || 'bg-white/[0.05] text-neutral-300 border border-white/10';
  };

  const getStatusIcon = (status) => {
    if (status === 'approved') return <CheckCircleIcon className="h-5 w-5 text-success-400" />;
    if (status === 'rejected') return <XCircleIcon className="h-5 w-5 text-danger-400" />;
    return <ClockIcon className="h-5 w-5 text-warning-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Mechanic Verifications</h1>
        <p className="text-neutral-400 mt-1">Review and manage mechanic verification requests</p>
      </div>

      {/* Filters */}
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-300 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-white/[0.1] text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-300 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by mechanic name or shop..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-white/[0.1] text-neutral-100 placeholder-neutral-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-neutral-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Verifications List */}
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center gap-3">
          <ShieldCheckIcon className="h-5 w-5 text-primary-400" />
          <h2 className="text-base font-semibold text-white">
            Verification Requests
            <span className="ml-2 text-sm font-normal text-neutral-400">({pagination.totalItems})</span>
          </h2>
        </div>

        {verifications.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheckIcon className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400 font-medium">No verification requests found</p>
            <p className="text-neutral-600 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {verifications.map((v) => (
              <div key={v._id} className="p-5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Status icon */}
                    <div className="mt-0.5 flex-shrink-0">{getStatusIcon(v.status)}</div>

                    <div className="flex-1 min-w-0">
                      {/* Name + badge */}
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <h3 className="text-base font-semibold text-white">
                          {v.mechanicId?.name || 'Unknown Mechanic'}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase ${getStatusBadge(v.status)}`}>
                          {v.status}
                        </span>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2">
                        <InfoRow label="Shop" value={v.shopName} />
                        <InfoRow label="Email" value={v.mechanicId?.email} />
                        <InfoRow label="Submitted" value={formatDate(v.createdAt)} />
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        <InfoRow
                          label="Address"
                          value={`${v.shopAddress.street}, ${v.shopAddress.city}, ${v.shopAddress.state}`}
                        />
                        <InfoRow
                          label="Document"
                          value={v.documentType.replace('_', ' ').toUpperCase()}
                        />
                      </div>

                      {v.location && (
                        <div className="mt-2">
                          <InfoRow
                            label="Location"
                            value={`${v.location.lat.toFixed(6)}, ${v.location.lng.toFixed(6)}`}
                          />
                        </div>
                      )}

                      {v.status === 'rejected' && v.rejectionReason && (
                        <div className="mt-3 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl">
                          <p className="text-xs font-semibold text-danger-400 uppercase tracking-wide mb-1">Rejection Reason</p>
                          <p className="text-sm text-danger-300">{v.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {v.status === 'pending' && (
                      <>
                        <Button variant="success" size="sm" onClick={() => handleReview(v)} icon={<CheckCircleIcon className="h-4 w-4" />}>
                          Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleReview(v)} icon={<XCircleIcon className="h-4 w-4" />}>
                          Reject
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(v)} icon={<EyeIcon className="h-4 w-4" />}>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <nav className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagination((p) => ({ ...p, currentPage: p.currentPage - 1 }))} disabled={pagination.currentPage === 1}>
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-neutral-300 bg-white/[0.04] rounded-xl border border-white/[0.07]">
              Page <strong className="text-white">{pagination.currentPage}</strong> of {pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPagination((p) => ({ ...p, currentPage: p.currentPage + 1 }))} disabled={pagination.currentPage === pagination.totalPages}>
              Next
            </Button>
          </nav>
        </div>
      )}

      {/* Modals */}
      {showReviewModal && selectedVerification && (
        <ReviewModal
          verification={selectedVerification}
          onClose={() => { setShowReviewModal(false); setSelectedVerification(null); }}
          onSubmit={handleReviewSubmit}
        />
      )}
      {showDetailsModal && selectedVerification && (
        <DetailsModal
          verification={selectedVerification}
          onClose={() => { setShowDetailsModal(false); setSelectedVerification(null); }}
          onReview={() => { setShowDetailsModal(false); setShowReviewModal(true); }}
        />
      )}
    </div>
  );
};

/* ─── Tiny helper to render a labelled info row ─── */
const InfoRow = ({ label, value }) => (
  <div className="flex items-baseline gap-1.5 min-w-0">
    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">{label}:</span>
    <span className="text-sm text-neutral-200 truncate">{value || '—'}</span>
  </div>
);

/* ─── Review Modal ─── */
const ReviewModal = ({ verification, onClose, onSubmit }) => {
  const [reviewData, setReviewData] = useState({ status: '', notes: '', rejectionReason: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reviewData.status) return toast.error('Please select a decision');
    if (reviewData.status === 'rejected' && !reviewData.rejectionReason.trim()) return toast.error('Please provide a rejection reason');

    setLoading(true);
    try {
      const data = { status: reviewData.status, notes: reviewData.notes || undefined };
      if (reviewData.status === 'rejected') data.rejectionReason = reviewData.rejectionReason;
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Review Verification Request" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-5 p-6">
          <DetailCard label="Mechanic" icon={<IdentificationIcon className="h-4 w-4" />}>
            <p className="text-sm font-semibold text-white">{verification.mechanicId?.name}</p>
            <p className="text-sm text-neutral-400">{verification.mechanicId?.email}</p>
          </DetailCard>

          <DetailCard label="Shop" icon={<BuildingStorefrontIcon className="h-4 w-4" />}>
            <p className="text-sm font-semibold text-white">{verification.shopName}</p>
            <p className="text-sm text-neutral-400">{verification.shopAddress.street}, {verification.shopAddress.city}, {verification.shopAddress.state}</p>
          </DetailCard>

          <DetailCard label="Document Type" icon={<DocumentIcon className="h-4 w-4" />}>
            <p className="text-sm text-neutral-200 capitalize">{verification.documentType.replace('_', ' ')}</p>
          </DetailCard>

          <div>
            <label className="block text-sm font-semibold text-neutral-300 mb-2">
              Decision <span className="text-danger-400">*</span>
            </label>
            <select
              value={reviewData.status}
              onChange={(e) => setReviewData((p) => ({ ...p, status: e.target.value }))}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-white/[0.1] text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
              required
            >
              <option value="">Select decision</option>
              <option value="approved">✓ Approve</option>
              <option value="rejected">✕ Reject</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-300 mb-2">Notes <span className="text-neutral-600">(Optional)</span></label>
            <textarea
              value={reviewData.notes}
              onChange={(e) => setReviewData((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-white/[0.1] text-neutral-100 placeholder-neutral-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all resize-none"
              placeholder="Add any notes about this verification..."
            />
          </div>

          {reviewData.status === 'rejected' && (
            <div>
              <label className="block text-sm font-semibold text-neutral-300 mb-2">
                Rejection Reason <span className="text-danger-400">*</span>
              </label>
              <textarea
                value={reviewData.rejectionReason}
                onChange={(e) => setReviewData((p) => ({ ...p, rejectionReason: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2.5 bg-danger-500/10 border border-danger-500/20 text-neutral-100 placeholder-neutral-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-danger-500/40 transition-all resize-none"
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            type="submit"
            variant={reviewData.status === 'approved' ? 'success' : 'danger'}
            loading={loading}
            disabled={loading || !reviewData.status}
          >
            {reviewData.status === 'approved' ? 'Approve Verification' : reviewData.status === 'rejected' ? 'Reject Verification' : 'Submit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ─── Details Modal ─── */
const DetailsModal = ({ verification, onClose, onReview }) => (
  <Modal onClose={onClose} title="Verification Details" maxWidth="max-w-4xl">
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="space-y-4">
        <DetailCard label="Mechanic Information" icon={<IdentificationIcon className="h-4 w-4" />}>
          <p className="text-sm font-semibold text-white">{verification.mechanicId?.name}</p>
          <p className="text-sm text-neutral-400 mt-0.5">{verification.mechanicId?.email}</p>
          <p className="text-sm text-neutral-400">{verification.mechanicId?.phone}</p>
        </DetailCard>

        <DetailCard label="Shop Details" icon={<BuildingStorefrontIcon className="h-4 w-4" />}>
          <p className="text-sm font-semibold text-white">{verification.shopName}</p>
          <p className="text-sm text-neutral-400 mt-0.5">
            {verification.shopAddress.street}<br />
            {verification.shopAddress.city}, {verification.shopAddress.state} {verification.shopAddress.zipCode}<br />
            {verification.shopAddress.country}
          </p>
          {verification.gstNumber && (
            <p className="text-sm text-neutral-400 mt-1">
              <span className="text-neutral-500 font-semibold">GST:</span> {verification.gstNumber}
            </p>
          )}
        </DetailCard>

        <DetailCard label="Document Information" icon={<DocumentIcon className="h-4 w-4" />}>
          <p className="text-sm font-semibold text-white capitalize">{verification.documentType.replace('_', ' ')}</p>
          <p className="text-sm text-neutral-400 mt-0.5">Submitted: {formatDate(verification.createdAt)}</p>
          {verification.status !== 'pending' && (
            <p className="text-sm text-neutral-400">Reviewed: {formatDate(verification.reviewedAt)}</p>
          )}
        </DetailCard>

        {verification.location && (
          <DetailCard label="Location" icon={<MapPinIcon className="h-4 w-4" />}>
            <p className="text-sm text-neutral-200 font-mono">
              {verification.location.lat.toFixed(6)}, {verification.location.lng.toFixed(6)}
            </p>
          </DetailCard>
        )}

        {verification.status === 'rejected' && verification.rejectionReason && (
          <div className="bg-danger-500/10 border border-danger-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-danger-400 uppercase tracking-wide mb-1">Rejection Reason</p>
            <p className="text-sm text-danger-300">{verification.rejectionReason}</p>
          </div>
        )}

        {verification.adminNotes && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">Admin Notes</p>
            <p className="text-sm text-blue-300">{verification.adminNotes}</p>
          </div>
        )}
      </div>

      {/* Right column — Images */}
      <div className="space-y-4">
        <ImageCard label="Shop Image" icon={<PhotoIcon className="h-4 w-4" />} src={verification.shopImage} fallback="Shop" />
        <ImageCard label="Document Image" icon={<DocumentIcon className="h-4 w-4" />} src={verification.documentImage} fallback="Document" />
      </div>
    </div>

    <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex justify-end gap-3">
      <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      {verification.status === 'pending' && (
        <Button variant="primary" onClick={onReview}>Review Request</Button>
      )}
    </div>
  </Modal>
);

/* ─── Reusable Modal wrapper ─── */
const Modal = ({ onClose, title, children, maxWidth = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative w-full ${maxWidth} bg-[#111111] border border-white/[0.09] rounded-3xl shadow-2xl shadow-black/60 overflow-hidden`}>
      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.06] transition-all">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* ─── Detail section card ─── */
const DetailCard = ({ label, icon, children }) => (
  <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary-400">{icon}</span>
      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">{label}</span>
    </div>
    {children}
  </div>
);

/* ─── Image display card ─── */
const ImageCard = ({ label, icon, src, fallback }) => (
  <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary-400">{icon}</span>
      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">{label}</span>
    </div>
    {src ? (
      <>
        <img
          src={src}
          alt={fallback}
          className="w-full h-48 object-cover rounded-xl border border-white/[0.07]"
          onError={(e) => { e.target.src = `https://via.placeholder.com/400x300?text=${fallback}+Not+Available`; }}
        />
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 mt-2 transition-colors"
        >
          View Full Size ↗
        </a>
      </>
    ) : (
      <div className="h-48 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.07]">
        <PhotoIcon className="h-10 w-10 text-neutral-600 mb-2" />
        <p className="text-sm text-neutral-600">No {fallback.toLowerCase()} image available</p>
      </div>
    )}
  </div>
);

export default VerificationManagement;
