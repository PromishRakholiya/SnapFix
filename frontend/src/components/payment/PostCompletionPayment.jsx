import React, { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Button from "../common/Button";
import { formatCurrency, formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

const PostCompletionPayment = ({
  serviceRequest,
  onPaymentSuccess,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("pending");

  useEffect(() => {
    if (serviceRequest && serviceRequest.status === "completed") {
      createPaymentOrder();
    }
  }, [serviceRequest]);

  const createPaymentOrder = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/payments/create-post-completion-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({
            serviceRequestId: serviceRequest._id,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPaymentData(result.data);
          initializeRazorpayPayment(result.data);
        } else {
          toast.error(result.message || "Failed to create payment order");
        }
      } else {
        toast.error("Failed to create payment order");
      }
    } catch (error) {
      console.error("Error creating payment order:", error);
      toast.error("Failed to create payment order");
    } finally {
      setLoading(false);
    }
  };

  const initializeRazorpayPayment = (paymentData) => {
    const options = {
      key: paymentData.razorpayKey,
      amount: paymentData.amount * 100, // Convert to paise
      currency: paymentData.currency,
      name: "SnapFix",
      description: `Payment for ${serviceRequest.issueType.replace("_", " ")} service`,
      order_id: paymentData.razorpayOrderId,
      handler: function (response) {
        handlePaymentSuccess(response);
      },
      prefill: {
        name: serviceRequest.customerId?.name || "",
        email: serviceRequest.customerId?.email || "",
        contact: serviceRequest.customerId?.phone || "",
      },
      theme: {
        color: "#3B82F6",
      },
      modal: {
        ondismiss: function () {
          toast.error("Payment cancelled");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handlePaymentSuccess = async (razorpayResponse) => {
    try {
      setLoading(true);

      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          paymentId: paymentData.paymentId,
          razorpayPaymentId: razorpayResponse.razorpay_payment_id,
          razorpayOrderId: razorpayResponse.razorpay_order_id,
          razorpaySignature: razorpayResponse.razorpay_signature,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPaymentStatus("success");
          toast.success("Payment successful! Thank you for using SnapFix.");
          if (onPaymentSuccess) {
            onPaymentSuccess(result.data);
          }
        } else {
          setPaymentStatus("failed");
          toast.error(result.message || "Payment verification failed");
        }
      } else {
        setPaymentStatus("failed");
        toast.error("Payment verification failed");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      setPaymentStatus("failed");
      toast.error("Payment verification failed");
    } finally {
      setLoading(false);
    }
  };

  const retryPayment = () => {
    setPaymentStatus("pending");
    createPaymentOrder();
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "success":
        return <CheckCircleIcon className="w-16 h-16 text-success-400" />;
      case "failed":
        return (
          <ExclamationTriangleIcon className="w-16 h-16 text-danger-400" />
        );
      default:
        return <ClockIcon className="w-16 h-16 text-blue-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case "success":
        return "Payment Successful!";
      case "failed":
        return "Payment Failed";
      default:
        return "Processing Payment...";
    }
  };

  const getStatusDescription = () => {
    switch (paymentStatus) {
      case "success":
        return "Your payment has been processed successfully. The mechanic will receive the payment shortly.";
      case "failed":
        return "There was an issue processing your payment. Please try again or contact support.";
      default:
        return "Please complete the payment to finalize your service request.";
    }
  };

  if (!serviceRequest) {
    return (
      <div className="fixed inset-0 bg-neutral-800 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white/[0.05]">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-danger-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Invalid Request
            </h3>
            <p className="text-neutral-500">
              Service request not found or not completed.
            </p>
            <Button variant="primary" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-neutral-800 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-xl bg-white/[0.05]">
        <div className="text-center">
          {/* Status Icon */}
          <div className="mb-4">{getStatusIcon()}</div>

          {/* Status Message */}
          <h3 className="text-xl font-semibold text-white mb-2">
            {getStatusMessage()}
          </h3>

          <p className="text-neutral-400 mb-6">{getStatusDescription()}</p>

          {/* Service Request Details */}
          <div className="bg-white/[0.03] rounded-2xl p-4 mb-6 text-left">
            <h4 className="font-medium text-white mb-3">Service Details</h4>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Service Type:</span>
                <span className="font-medium text-white">
                  {serviceRequest.issueType.replace("_", " ").toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Mechanic:</span>
                <span className="font-medium text-white">
                  {serviceRequest.mechanicId?.name || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Completed:</span>
                <span className="font-medium text-white">
                  {formatDate(
                    serviceRequest.completedAt || serviceRequest.updatedAt,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Amount:</span>
                <span className="font-medium text-success-400 text-lg">
                  {formatCurrency(
                    serviceRequest.quotation || serviceRequest.finalAmount || 0,
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Actions */}
          {paymentStatus === "pending" && (
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={createPaymentOrder}
                loading={loading}
                disabled={loading}
                className="w-full"
              >
                <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                Pay Now
              </Button>

              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          {paymentStatus === "success" && (
            <div className="space-y-3">
              <div className="bg-success-500/10 border border-green-200 rounded-2xl p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-success-400 mr-2" />
                  <span className="text-green-800 font-medium">
                    Payment completed successfully!
                  </span>
                </div>
              </div>

              <Button variant="primary" onClick={onClose} className="w-full">
                Done
              </Button>
            </div>
          )}

          {paymentStatus === "failed" && (
            <div className="space-y-3">
              <div className="bg-danger-500/10 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-danger-400 mr-2" />
                  <span className="text-danger-400 font-medium">
                    Payment failed. Please try again.
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={retryPayment}
                loading={loading}
                disabled={loading}
                className="w-full"
              >
                Retry Payment
              </Button>

              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}

          {/* Payment Info */}
          {paymentData && (
            <div className="mt-4 text-xs text-neutral-500">
              <p>Order ID: {paymentData.orderId}</p>
              <p>Payment ID: {paymentData.paymentId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCompletionPayment;
