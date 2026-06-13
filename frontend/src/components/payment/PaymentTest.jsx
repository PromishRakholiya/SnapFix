import React, { useState } from "react";
import Button from "../common/Button";
import paymentApi from "../../api/paymentApi";
import toast from "react-hot-toast";

const PaymentTest = () => {
  const [loading, setLoading] = useState(false);
  const [testAmount, setTestAmount] = useState(100);

  const testPayment = async () => {
    try {
      setLoading(true);

      // Create a test payment order
      const response = await paymentApi.createPaymentOrder({
        serviceRequestId: "507f1f77bcf86cd799439011", // Test request ID
        amount: testAmount,
        currency: "INR",
      });

      if (response.success) {
        console.log("Test payment order created:", response.data);
        toast.success("Test payment order created successfully!");

        // Initialize Razorpay payment
        if (window.Razorpay) {
          const options = {
            key: response.data.razorpayKey || "rzp_test_CjxI6ZFqFKX7Xs",
            amount: response.data.amount * 100,
            currency: response.data.currency,
            name: "SnapFix Test",
            description: "Test payment for SnapFix",
            order_id: response.data.razorpayOrderId,
            handler: function (paymentResponse) {
              console.log("Test payment successful:", paymentResponse);
              toast.success("Test payment completed!");
            },
            prefill: {
              name: "Test Customer",
              email: "test@example.com",
              contact: "9999999999",
            },
            theme: {
              color: "#0ea5e9",
            },
          };

          const razorpayInstance = new window.Razorpay(options);
          razorpayInstance.open();
        } else {
          toast.error("Razorpay SDK not loaded");
        }
      } else {
        toast.error(response.message || "Failed to create test payment");
      }
    } catch (error) {
      console.error("Test payment error:", error);
      toast.error("Test payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white/[0.05] rounded-2xl shadow-md">
      <h3 className="text-lg font-semibold mb-4">Payment Test</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Test Amount (₹)
          </label>
          <input
            type="number"
            value={testAmount}
            onChange={(e) => setTestAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-white/[0.1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            min="1"
            max="10000"
          />
        </div>
        <Button onClick={testPayment} loading={loading} variant="primary">
          Test Payment
        </Button>
      </div>
    </div>
  );
};

export default PaymentTest;
