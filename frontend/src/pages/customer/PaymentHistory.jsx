import React, { useState, useEffect } from 'react';
import { CreditCardIcon, CalendarIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import paymentApi from '../../api/paymentApi';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchPaymentHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await paymentApi.getPaymentHistory({
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      });

      if (response.success) {
        setPayments(response.data.items || response.data.payments || []);
      } else {
        setError(response.message || 'Failed to fetch payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError('Failed to load payment history');
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-success-400" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-danger-400" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-warning-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-neutral-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success-400 bg-success-500/10';
      case 'failed':
        return 'text-danger-400 bg-danger-500/10';
      case 'pending':
        return 'text-warning-400 bg-warning-500/10';
      default:
        return 'text-neutral-400 bg-white/[0.03]';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment History</h1>
          <p className="text-neutral-400 text-sm mt-0.5">Track all your past transactions</p>
        </div>
        <CreditCardIcon className="h-8 w-8 text-primary-400 flex-shrink-0" />
      </div>

      {/* Filters */}
      <div className="bg-white/[0.05] p-4 rounded-2xl shadow-soft border">
        <h3 className="text-lg font-medium text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Payment List */}
      <div className="bg-white/[0.05] rounded-2xl shadow-soft border">
        {error ? (
          <div className="p-6 text-center">
            <p className="text-danger-400">{error}</p>
            <button
              onClick={fetchPaymentHistory}
              className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center">
            <CreditCardIcon className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-500">No payment history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06]">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/[0.05] divide-y divide-white/[0.06]">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-white/[0.03]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CreditCardIcon className="h-5 w-5 text-neutral-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {payment.razorpayPaymentId || payment._id.slice(-8)}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {payment.paymentMethod || 'Online Payment'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {payment.serviceRequest?.issueType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {payment.serviceRequest?.vehicleInfo?.model || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(payment.status)}
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-neutral-500">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {formatDate(payment.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
