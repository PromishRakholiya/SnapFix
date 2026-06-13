import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  CreditCardIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import Button from "../common/Button";
import paymentApi from "../../api/paymentApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../utils/helpers";
import toast from "react-hot-toast";

const PaymentModal = ({
  isOpen,
  onClose,
  serviceRequest,
  amount,
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState("details"); // 'details', 'processing', 'success', 'failed'
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Load Razorpay SDK when modal opens
      loadRazorpaySDK().catch((error) => {
        console.error("Failed to load Razorpay SDK:", error);
        setError("Payment system unavailable. Please try again later.");
      });
    }
  }, [isOpen]);

  const loadRazorpaySDK = () => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.head.appendChild(script);
    });
  };

  const processRazorpayPayment = (orderData) => {
    return new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error("Razorpay SDK not loaded"));
        return;
      }

      const options = {
        key: "rzp_test_51O8X8X8X8X8X8", // Test key for development
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "SnapFix",
        description: "Service Payment",
        order_id: orderData.orderId,
        handler: function (response) {
          console.log("Payment successful:", response);
          resolve({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        prefill: {
          name: orderData.customerName || "Test Customer",
          email: orderData.customerEmail || "test@example.com",
          contact: orderData.customerPhone || "9999999999",
        },
        theme: {
          color: "#0ea5e9",
        },
        modal: {
          ondismiss: function () {
            console.log("Payment modal dismissed");
            reject(new Error("Payment cancelled by user"));
          },
        },
        notes: {
          service_request_id: orderData.serviceRequestId || "test_request",
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    });
  };

  const resetModal = () => {
    setPaymentStep("details");
    setPaymentData(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create payment order
      setPaymentStep("processing");

      console.log(
        "Creating payment order for service request:",
        serviceRequest._id,
      );
      const orderResponse = await paymentApi.createPostCompletionPaymentOrder(
        serviceRequest._id,
      );

      if (!orderResponse.success) {
        throw new Error(
          orderResponse.message || "Failed to create payment order",
        );
      }

      const { orderId, amount, currency, paymentId } = orderResponse.data;
      console.log("Payment order created:", {
        orderId,
        amount,
        currency,
        paymentId,
      });

      // Step 2: Process payment with Razorpay
      const paymentData = {
        orderId: orderId,
        amount: amount,
        currency: currency,
        customerName: user?.name || "Test Customer",
        customerEmail: user?.email || "test@example.com",
        customerPhone: user?.phone || "9999999999",
        serviceRequestId: serviceRequest._id,
      };

      console.log("Processing payment with Razorpay:", paymentData);
      const razorpayResult = await processRazorpayPayment(paymentData);
      console.log("Razorpay payment result:", razorpayResult);

      // Step 3: Verify payment on backend
      const verificationData = {
        paymentId: paymentId,
        razorpayPaymentId: razorpayResult.razorpayPaymentId,
        razorpayOrderId: razorpayResult.razorpayOrderId,
        razorpaySignature: razorpayResult.razorpaySignature,
      };

      console.log("Verifying payment:", verificationData);
      const verificationResponse =
        await paymentApi.verifyPayment(verificationData);

      if (verificationResponse.success) {
        console.log("Payment verified successfully");
        setPaymentData(verificationResponse.data);
        setPaymentStep("success");

        // Call success callback
        if (onPaymentSuccess) {
          onPaymentSuccess(verificationResponse.data);
        }

        toast.success("Payment completed successfully!");
      } else {
        throw new Error("Payment verification failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      let errorMessage = "Payment failed. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setPaymentStep("failed");

      // Call failure callback
      if (onPaymentFailure) {
        onPaymentFailure(error);
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = () => {
    switch (paymentStep) {
      case "details":
        return (
          <div>
            <div className="p-6">
              <h3 className="text-lg font-medium text-white mb-4">
                Payment Details
              </h3>

              {/* Service Details */}
              <div className="bg-white/[0.03] rounded-2xl p-4 mb-6">
                <h4 className="font-medium text-white mb-3">Service Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Service Type:</span>
                    <span className="text-white">
                      {serviceRequest.issueType
                        ?.replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Vehicle:</span>
                    <span className="text-white">
                      {serviceRequest.vehicleInfo?.model} (
                      {serviceRequest.vehicleInfo?.plate})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Mechanic:</span>
                    <span className="text-white">
                      {serviceRequest.mechanic?.name || "TBD"}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-white/[0.08] pt-2">
                    <span className="text-white">Total Amount:</span>
                    <span className="text-white">{formatCurrency(amount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <h4 className="font-medium text-white mb-3">Payment Method</h4>
                <div className="border border-white/[0.08] rounded-2xl p-4">
                  <div className="flex items-center">
                    <CreditCardIcon className="h-6 w-6 text-primary-400 mr-3" />
                    <div>
                      <p className="font-medium text-white">
                        Razorpay Secure Payment
                      </p>
                      <p className="text-sm text-neutral-400">
                        Credit Card, Debit Card, UPI, Net Banking, Wallets
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-danger-500/10 border border-danger-500/20 rounded-2xl">
                  <p className="text-danger-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-white/[0.03] flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handlePayment}
                loading={loading}
                disabled={loading}
                icon={<CreditCardIcon className="h-5 w-5" />}
              >
                Pay {formatCurrency(amount)}
              </Button>
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-white mb-2">
              Processing Payment...
            </h3>
            <p className="text-neutral-400">
              Please complete the payment in the Razorpay window.
            </p>
          </div>
        );

      case "success":
        return (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-success-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="h-10 w-10 text-success-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Payment Successful!
            </h3>
            <p className="text-neutral-400 mb-4">
              Your payment of {formatCurrency(amount)} has been processed
              successfully.
            </p>

            {paymentData && (
              <div className="bg-white/[0.03] rounded-2xl p-4 mb-6 text-left">
                <h4 className="font-medium text-white mb-2">
                  Transaction Details
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Transaction ID:</span>
                    <span className="text-white font-mono">
                      {paymentData.razorpayPaymentId || paymentData._id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Status:</span>
                    <span className="text-success-400 font-medium">
                      Completed
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Date:</span>
                    <span className="text-white">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Button variant="primary" onClick={handleClose} className="w-full">
              Continue
            </Button>
          </div>
        );

      case "failed":
        return (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-danger-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <XMarkIcon className="h-10 w-10 text-danger-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Payment Failed
            </h3>
            <p className="text-neutral-400 mb-4">
              {error ||
                "Your payment could not be processed. Please try again."}
            </p>

            <div className="flex space-x-3 justify-center">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => setPaymentStep("details")}
              >
                Try Again
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-secondary-500 bg-opacity-60 transition-opacity"
          onClick={paymentStep === "details" ? handleClose : undefined}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white/[0.05] rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          {paymentStep === "details" && (
            <div className="px-6 py-4 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-white">
                  Complete Payment
                </h2>
                <button
                  onClick={handleClose}
                  className="text-neutral-500 hover:text-neutral-400"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {getStepContent()}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
