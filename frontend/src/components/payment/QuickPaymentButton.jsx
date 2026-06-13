import React, { useState } from 'react';
import { CreditCardIcon } from '@heroicons/react/24/outline';
import Button from '../common/Button';
import UnifiedPaymentModal from './UnifiedPaymentModal';
import toast from 'react-hot-toast';

const QuickPaymentButton = ({ 
  serviceRequest, 
  amount, 
  variant = "primary", 
  size = "sm",
  className = "",
  onPaymentSuccess,
  onPaymentFailure,
  children = "Pay Now"
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handlePaymentClick = () => {
    if (!serviceRequest) {
      toast.error('No service request found');
      return;
    }
    
    if (!amount || amount <= 0) {
      toast.error('Invalid payment amount');
      return;
    }
    
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentData) => {
    toast.success('Payment completed successfully!');
    setShowPaymentModal(false);
    if (onPaymentSuccess) {
      onPaymentSuccess(paymentData);
    }
  };

  const handlePaymentFailure = (error) => {
    toast.error('Payment failed. Please try again.');
    setShowPaymentModal(false);
    if (onPaymentFailure) {
      onPaymentFailure(error);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handlePaymentClick}
        icon={<CreditCardIcon className="h-4 w-4" />}
        className={className}
      >
        {children}
      </Button>

      {showPaymentModal && serviceRequest && (
        <UnifiedPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          serviceRequest={serviceRequest}
          amount={amount}
          paymentType="post-completion"
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
      )}
    </>
  );
};

export default QuickPaymentButton;
