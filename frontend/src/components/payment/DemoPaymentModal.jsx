import React, { useState } from 'react';
import { 
  XMarkIcon,
  CheckIcon,
  CreditCardIcon,
  UserIcon,
  CalendarIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import paymentService from '../../services/paymentService'; // Add paymentService

const DemoPaymentModal = ({ isOpen, onClose, serviceRequest, onPaymentSuccess }) => {
  const [paymentStep, setPaymentStep] = useState('details'); // 'details', 'processing', 'success'
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
    amount: serviceRequest?.quotation || serviceRequest?.finalAmount || 500
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) {
      toast.error('Please enter a valid 16-digit card number');
      return;
    }
    if (!formData.cardHolder.trim()) {
      toast.error('Please enter card holder name');
      return;
    }
    if (!formData.expiryDate.match(/^\d{2}\/\d{2}$/)) {
      toast.error('Please enter valid expiry date (MM/YY)');
      return;
    }
    if (!formData.cvv.match(/^\d{3,4}$/)) {
      toast.error('Please enter valid CVV');
      return;
    }

    setLoading(true);
    setPaymentStep('processing');

    try {
      // Connect to the backend route to process the payment
      const response = await paymentService.processDemoPayment({
        serviceRequestId: serviceRequest._id,
        amount: formData.amount,
        paymentMethod: 'card'
      });

      if (response.success) {
        setPaymentStep('success');
        setLoading(false);
        toast.success('Payment completed successfully!');
        
        // Auto close after 2 seconds
        setTimeout(() => {
          onPaymentSuccess && onPaymentSuccess(response.data);
          onClose();
        }, 2000);
      }
    } catch (error) {
      setLoading(false);
      setPaymentStep('details');
      toast.error(error.message || 'Payment processing failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white/[0.05] rounded-2xl max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <CreditCardIcon className="h-6 w-6" />
              <h2 className="text-xl font-bold">Demo Payment</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors duration-200 p-2 rounded-full hover:bg-white/[0.05] hover:bg-opacity-20"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {paymentStep === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount Display */}
              <div className="bg-white/[0.03] rounded-2xl p-4 text-center">
                <div className="text-sm text-neutral-400 mb-1">Payment Amount</div>
                <div className="text-2xl font-bold text-white">₹{formData.amount}</div>
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Card Number
                </label>
                <div className="relative">
                  <CreditCardIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <input
                    type="text"
                    value={formData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full pl-10 pr-4 py-3 border-2 border-white/[0.08] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    maxLength="19"
                    required
                  />
                </div>
              </div>

              {/* Card Holder */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Card Holder Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <input
                    type="text"
                    value={formData.cardHolder}
                    onChange={(e) => handleInputChange('cardHolder', e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 border-2 border-white/[0.08] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Expiry and CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Expiry Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                    <input
                      type="text"
                      value={formData.expiryDate}
                      onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
                      placeholder="MM/YY"
                      className="w-full pl-10 pr-4 py-3 border-2 border-white/[0.08] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      maxLength="5"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    CVV
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                    <input
                      type="text"
                      value={formData.cvv}
                      onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                      placeholder="123"
                      className="w-full pl-10 pr-4 py-3 border-2 border-white/[0.08] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      maxLength="4"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Demo Notice */}
              <div className="bg-blue-500/10 border border-blue-200 rounded-2xl p-4">
                <div className="text-sm text-blue-800">
                  <strong>Demo Mode:</strong> This is a test payment form. Any valid-looking card details will be accepted.
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                Pay ₹{formData.amount}
              </Button>
            </form>
          )}

          {paymentStep === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-white mb-2">Processing Payment...</h3>
              <p className="text-neutral-400">Please wait while we process your payment</p>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="text-center py-8">
              <div className="bg-success-500/15 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="h-8 w-8 text-success-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Payment Successful!</h3>
              <p className="text-neutral-400 mb-4">Your payment of ₹{formData.amount} has been processed successfully.</p>
              <div className="bg-success-500/10 border border-green-200 rounded-2xl p-4">
                <div className="text-sm text-green-800">
                  <strong>Transaction ID:</strong> DEMO_{Date.now()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoPaymentModal;
