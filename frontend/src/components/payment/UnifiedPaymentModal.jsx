import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Button from "../common/Button";
import paymentApi from "../../api/paymentApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency, formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

const UnifiedPaymentModal = ({
  isOpen,
  onClose,
  serviceRequest,
  amount,
  paymentType = "post-completion", // 'post-completion', 'direct', 'refund'
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState("details"); // 'details', 'processing', 'success', 'failed'
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRazorpaySDK();
    }
  }, [isOpen]);

  const loadRazorpaySDK = () => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      setError("Payment system unavailable. Please try again later.");
      toast.error("Failed to load payment system");
    };
    document.head.appendChild(script);
  };

  const resetModal = () => {
    setPaymentStep("details");
    setPaymentData(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (paymentStep === "processing") {
      toast.error("Payment is in progress. Please wait.");
      return;
    }
    resetModal();
    onClose();
  };

  const createPaymentOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      setPaymentStep("processing");

      // For post-completion payments, get amount from service request
      let paymentAmount;
      if (paymentType === "post-completion") {
        paymentAmount =
          serviceRequest.quotation || serviceRequest.finalAmount || 500; // Fallback to ₹500 for testing
        console.log("Service request data:", {
          quotation: serviceRequest.quotation,
          finalAmount: serviceRequest.finalAmount,
          selectedAmount: paymentAmount,
        });
      } else {
        paymentAmount = amount;
      }

      console.log("Creating payment order for:", {
        serviceRequestId: serviceRequest._id,
        paymentType,
        amount: paymentAmount,
        quotation: serviceRequest.quotation,
        finalAmount: serviceRequest.finalAmount,
      });

      let response;

      if (paymentType === "post-completion") {
        response = await paymentApi.createPostCompletionPaymentOrder(
          serviceRequest._id,
        );
      } else if (paymentType === "direct") {
        response = await paymentApi.createPaymentOrder({
          serviceRequestId: serviceRequest._id,
          amount: paymentAmount,
          currency: "INR",
        });
      }

      console.log("Payment order response:", response);

      if (!response.success) {
        throw new Error(response.message || "Failed to create payment order");
      }

      setPaymentData(response.data);
      await processRazorpayPayment(response.data);
    } catch (error) {
      console.error("Error creating payment order:", error);
      setError(error.message || "Failed to create payment order");
      setPaymentStep("failed");
      toast.error(error.message || "Failed to create payment order");
    } finally {
      setLoading(false);
    }
  };

  const processRazorpayPayment = async (orderData) => {
    return new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error("Razorpay SDK not loaded"));
        return;
      }

      const options = {
        key:
          orderData.razorpayKey ||
          process.env.REACT_APP_RAZORPAY_KEY_ID ||
          "rzp_test_CjxI6ZFqFKX7Xs",
        amount: orderData.amount * 100, // Convert to paise
        currency: orderData.currency || "INR",
        name: "SnapFix",
        description: `Payment for ${serviceRequest.issueType?.replace("_", " ") || "roadside assistance"} service`,
        order_id: orderData.razorpayOrderId,
        handler: function (response) {
          console.log("Payment successful:", response);
          handlePaymentSuccess(response);
          resolve(response);
        },
        prefill: {
          name: user?.name || "Customer",
          email: user?.email || "customer@example.com",
          contact: user?.phone || "9999999999",
        },
        theme: {
          color: "#0ea5e9",
        },
        modal: {
          ondismiss: function () {
            console.log("Payment modal dismissed");
            setPaymentStep("failed");
            toast.error("Payment cancelled");
            reject(new Error("Payment cancelled by user"));
          },
        },
        notes: {
          service_request_id: serviceRequest._id,
          customer_id: user?.id,
          payment_type: paymentType,
        },
        // Add test mode configuration
        config: {
          display: {
            blocks: {
              banks: {
                name: "Pay using Bank",
                instruments: [
                  {
                    method: "card",
                    issuers: ["HDFC", "SBI", "ICICI"],
                  },
                  {
                    method: "netbanking",
                    banks: ["HDFC", "SBI", "ICICI"],
                  },
                ],
              },
              upi: {
                name: "Pay via UPI",
                instruments: [
                  {
                    method: "upi",
                  },
                ],
              },
            },
            sequence: ["block.banks", "block.upi"],
            preferences: {
              show_default_blocks: false,
            },
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    });
  };

  const handlePaymentSuccess = async (razorpayResponse) => {
    try {
      setLoading(true);

      const verificationData = {
        paymentId: paymentData.paymentId,
        razorpayPaymentId: razorpayResponse.razorpay_payment_id,
        razorpayOrderId: razorpayResponse.razorpay_order_id,
        razorpaySignature: razorpayResponse.razorpay_signature,
      };

      const verificationResponse =
        await paymentApi.verifyPayment(verificationData);

      if (verificationResponse.success) {
        setPaymentStep("success");
        toast.success("Payment completed successfully!");
        if (onPaymentSuccess) {
          onPaymentSuccess(verificationResponse.data);
        }
      } else {
        throw new Error(
          verificationResponse.message || "Payment verification failed",
        );
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setError(error.message || "Payment verification failed");
      setPaymentStep("failed");
      toast.error(error.message || "Payment verification failed");
    } finally {
      setLoading(false);
    }
  };

  const retryPayment = () => {
    setPaymentStep("details");
    setError(null);
    createPaymentOrder();
  };

  const getStepContent = () => {
    switch (paymentStep) {
      case "details":
        return (
          <div className="px-6 py-4">
            <div className="space-y-4">
              {/* Service Request Info */}
              <div className="bg-white/[0.03] rounded-2xl p-4">
                <h3 className="font-semibold text-white mb-3">
                  Service Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Service Type:</span>
                    <span className="font-medium capitalize">
                      {serviceRequest.issueType.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Request ID:</span>
                    <span className="font-mono text-xs">
                      {serviceRequest._id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Status:</span>
                    <span className="font-medium capitalize">
                      {serviceRequest.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="bg-blue-500/10 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Payment Amount
                    </h3>
                    <p className="text-sm text-blue-400">
                      Final amount for service completion
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">
                      {formatCurrency(
                        paymentData?.amount ||
                          amount ||
                          serviceRequest.quotation ||
                          0,
                      )}
                    </div>
                    {paymentData?.processingFee && (
                      <div className="text-xs text-blue-400">
                        + {formatCurrency(paymentData.processingFee)} processing
                        fee
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-success-500/10 border border-green-200 rounded-2xl p-4">
                <div className="flex items-start">
                  <ShieldCheckIcon className="w-5 h-5 text-success-400 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">
                      Secure Payment
                    </h4>
                    <p className="text-sm text-success-400 mt-1">
                      Your payment is secured by Razorpay with bank-level
                      encryption. We never store your card details.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={createPaymentOrder}
                  loading={loading}
                  disabled={loading || !razorpayLoaded}
                  className="flex-1"
                >
                  {loading ? "Processing..." : "Proceed to Payment"}
                </Button>
              </div>
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="px-6 py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-white mb-2">
              Processing Payment
            </h3>
            <p className="text-neutral-400">
              Please complete the payment in the popup window...
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              Do not close this window
            </p>
          </div>
        );

      case "success":
        return (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-success-500/15 rounded-full flex items-center justify-center mb-4">
              <CheckCircleIcon className="w-8 h-8 text-success-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Payment Successful!
            </h3>
            <p className="text-neutral-400 mb-4">
              Your payment of {formatCurrency(paymentData?.amount || amount)}{" "}
              has been processed successfully.
            </p>

            {paymentData && (
              <div className="bg-white/[0.03] rounded-2xl p-4 mb-4 text-left">
                <h4 className="font-medium text-white mb-2">Payment Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Transaction ID:</span>
                    <span className="font-mono">
                      {paymentData.transactionId || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Order ID:</span>
                    <span className="font-mono">{paymentData.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Date:</span>
                    <span>{formatDate(new Date())}</span>
                  </div>
                </div>
              </div>
            )}

            <Button variant="primary" onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        );

      case "failed":
        return (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-danger-500/15 rounded-full flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-danger-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Payment Failed
            </h3>
            <p className="text-neutral-400 mb-4">
              {error ||
                "Something went wrong with your payment. Please try again."}
            </p>

            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={retryPayment}
                loading={loading}
                disabled={loading}
                className="w-full"
              >
                Try Again
              </Button>

              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-full"
              >
                Close
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
          className="fixed inset-0 bg-white/[0.15] bg-opacity-60 transition-opacity"
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

export default UnifiedPaymentModal;
