import React, { useState, useEffect } from "react";
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  StarIcon,
  FireIcon,
  CreditCardIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import mechanicApi from "../../api/mechanicApi";
import { formatCurrency, formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

const Earnings = () => {
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [detailedEarnings, setDetailedEarnings] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    period: "month",
    startDate: "",
    endDate: "",
  });
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountType: "Savings",
    amount: "",
  });

  useEffect(() => {
    fetchEarningsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const [summaryResponse, detailedResponse, chartResponse] =
        await Promise.all([
          mechanicApi.getEarningsSummary(filters),
          mechanicApi.getDetailedEarnings(filters),
          mechanicApi.getEarningsChart(filters),
        ]);

      if (summaryResponse.success) {
        setEarningsSummary(summaryResponse.data);
      }

      if (detailedResponse.success) {
        setDetailedEarnings(detailedResponse.data.earnings || []);
      }

      if (chartResponse.success) {
        setChartData(chartResponse.data);
      }
    } catch (error) {
      console.error("Error fetching earnings data:", error);
      toast.error("Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportEarnings = async () => {
    try {
      const response = await mechanicApi.exportEarnings(filters);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `earnings-${filters.period}-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Earnings exported successfully!");
    } catch (error) {
      console.error("Error exporting earnings:", error);
      toast.error("Failed to export earnings");
    }
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) {
      return <ArrowTrendingUpIcon className="h-5 w-5 text-success-400" />;
    } else if (growth < 0) {
      return <ArrowTrendingDownIcon className="h-5 w-5 text-danger-400" />;
    }
    return null;
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return "text-success-400";
    if (growth < 0) return "text-danger-400";
    return "text-neutral-400";
  };

  const handleRedeemWallet = async (e) => {
    e.preventDefault();
    if (!bankDetails.amount || parseFloat(bankDetails.amount) < 100) {
      toast.error("Minimum redemption amount is ₹100");
      return;
    }

    if (
      parseFloat(bankDetails.amount) > (earningsSummary?.walletBalance || 0)
    ) {
      toast.error("Insufficient wallet balance");
      return;
    }

    try {
      setIsRedeeming(true);
      const response = await mechanicApi.redeemWallet({
        amount: parseFloat(bankDetails.amount),
        bankDetails: {
          accountNumber: bankDetails.accountNumber,
          ifscCode: bankDetails.ifscCode,
          accountType: bankDetails.accountType,
        },
      });

      if (response.success) {
        toast.success(response.message || "Amount redeemed successfully!");
        setShowRedeemModal(false);
        setBankDetails({ ...bankDetails, amount: "" });
        fetchEarningsData(); // Refresh summary
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to redeem amount");
    } finally {
      setIsRedeeming(false);
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Earnings Overview</h1>
          <p className="text-neutral-400">
            Track your earnings and performance metrics
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleExportEarnings}
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
        >
          Export Earnings
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Period
            </label>
            <Select
              value={filters.period}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, period: e.target.value }))
              }
              options={[
                { value: "week", label: "This Week" },
                { value: "month", label: "This Month" },
                { value: "quarter", label: "This Quarter" },
                { value: "year", label: "This Year" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
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
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={fetchEarningsData}
              className="w-full"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {earningsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl shadow-lg p-6 text-white col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/[0.05] bg-opacity-20 rounded-2xl">
                <BanknotesIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium bg-white/[0.05] bg-opacity-20 px-2 py-1 rounded text-primary-100">
                Wallet
              </span>
            </div>
            <div>
              <p className="text-primary-100 text-sm font-medium">
                Available Balance
              </p>
              <h2 className="text-3xl font-bold mt-1">
                {formatCurrency(earningsSummary.walletBalance || 0)}
              </h2>
            </div>
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full bg-white/[0.05] text-primary-400 border-white hover:bg-primary-500/10"
                onClick={() => setShowRedeemModal(true)}
              >
                Redeem to Bank
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-1 md:col-span-2 lg:col-span-2">
            {/* Total Earnings */}
            <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400">
                    Total Earnings
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(earningsSummary.totalEarnings)}
                  </p>
                  <div className="flex items-center mt-2">
                    {getGrowthIcon(earningsSummary.growth)}
                    <span
                      className={`ml-1 text-sm font-medium ${getGrowthColor(earningsSummary.growth)}`}
                    >
                      {earningsSummary.growth > 0 ? "+" : ""}
                      {earningsSummary.growth}% vs last period
                    </span>
                  </div>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-success-400" />
              </div>
            </div>

            {/* Total Requests */}
            <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400">
                    Total Requests
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {earningsSummary.totalRequests}
                  </p>
                  <p className="text-sm text-neutral-500 mt-2">
                    {earningsSummary.completedRequests} completed
                  </p>
                </div>
                <WrenchScrewdriverIcon className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Average Earning */}
          <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-400">
                  Average Earning
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(earningsSummary.averageEarning)}
                </p>
                <p className="text-sm text-neutral-500 mt-2">per request</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          {/* Growth Rate */}
          <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6 hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-400">
                  Growth Rate
                </p>
                <p className="text-2xl font-bold text-white">
                  {earningsSummary.growth}%
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  vs previous period
                </p>
              </div>
              <FireIcon className="h-8 w-8 text-accent" />
            </div>
          </div>
        </div>
      )}

      {/* Detailed Earnings Table */}
      <div className="bg-white/[0.05] rounded-2xl shadow-soft border">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <h3 className="text-lg font-semibold text-white">Recent Earnings</h3>
        </div>

        {detailedEarnings.length === 0 ? (
          <div className="p-6 text-center">
            <CurrencyDollarIcon className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-500">
              No earnings data found for the selected period
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06]">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Service Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/[0.05] divide-y divide-white/[0.06]">
                {detailedEarnings.map((earning) => (
                  <tr key={earning._id} className="hover:bg-white/[0.03]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {earning.serviceRequest?.issueType
                            ? earning.serviceRequest.issueType
                                .replace("_", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())
                            : "General Service"}
                        </div>
                        <div className="text-sm text-neutral-500">
                          Req: #
                          {earning.serviceRequest?._id?.toString().slice(-6) ||
                            "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-neutral-500 mr-2" />
                        <div className="text-sm text-white">
                          {earning.customer?.name || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {formatCurrency(earning.amount)}
                      </div>
                      {earning.processingFee > 0 && (
                        <div className="text-xs text-neutral-500">
                          Fee: {formatCurrency(earning.processingFee)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-neutral-500 mr-2" />
                        <div className="text-sm text-white">
                          {formatDate(earning.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-neutral-500">
                        {earning.paymentId ||
                          earning.transactionId ||
                          earning.receipt ||
                          earning._id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          earning.status === "success"
                            ? "bg-success-500/15 text-green-800"
                            : earning.status === "pending"
                              ? "bg-warning-500/15 text-warning-400"
                              : "bg-danger-500/15 text-danger-400"
                        }`}
                      >
                        {earning.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redemption Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-white/[0.15] bg-opacity-60 transition-opacity"
              onClick={() => setShowRedeemModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white/[0.05] rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleRedeemWallet}>
                <div className="bg-white/[0.05] px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-500/15 sm:mx-0 sm:h-10 sm:w-10">
                      <BanknotesIcon className="h-6 w-6 text-primary-400" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-white">
                        Redeem Wallet Balance
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-neutral-500">
                          Transfer your earnings to your bank account. Minimum
                          redemption is ₹100.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <Input
                      label="Amount to Redeem (₹)"
                      type="number"
                      placeholder="Enter amount"
                      required
                      min="100"
                      max={earningsSummary?.walletBalance || 0}
                      value={bankDetails.amount}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          amount: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Account Number"
                      type="text"
                      placeholder="Enter bank account number"
                      required
                      value={bankDetails.accountNumber}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          accountNumber: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="IFSC Code"
                      type="text"
                      placeholder="Enter bank IFSC code"
                      required
                      value={bankDetails.ifscCode}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          ifscCode: e.target.value,
                        })
                      }
                    />

                    <div className="bg-blue-500/10 p-4 rounded-2xl">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <CreditCardIcon
                            className="h-5 w-5 text-blue-400"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-400 font-medium">
                            Demonstration Mode
                          </p>
                          <p className="text-sm text-blue-400 mt-1">
                            Use fake bank details for testing. Transfer is
                            simulated.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.03] px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isRedeeming}
                    className="w-full sm:ml-3 sm:w-auto"
                  >
                    {isRedeeming ? "Processing..." : "Redeem Now"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRedeemModal(false)}
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Earnings;
