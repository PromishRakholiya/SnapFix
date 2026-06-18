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
  const [filterInputs, setFilterInputs] = useState({
    period: "month",
    startDate: "",
    endDate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
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
  }, [appliedFilters]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const [summaryResponse, detailedResponse, chartResponse] =
        await Promise.all([
          mechanicApi.getEarningsSummary(appliedFilters),
          mechanicApi.getDetailedEarnings(appliedFilters),
          mechanicApi.getEarningsChart(appliedFilters),
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
      const response = await mechanicApi.exportEarnings(appliedFilters);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `earnings-${appliedFilters.period}-${new Date().toISOString().split("T")[0]}.csv`,
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
      <div className="glass-panel p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              Period
            </label>
            <Select
              value={filterInputs.period}
              onChange={(e) => {
                const val = e.target.value;
                setFilterInputs((prev) => ({ ...prev, period: val }));
                setAppliedFilters((prev) => ({ ...prev, period: val }));
              }}
              options={[
                { value: "week", label: "This Week" },
                { value: "month", label: "This Month" },
                { value: "quarter", label: "This Quarter" },
                { value: "year", label: "This Year" },
              ]}
              className="mb-0"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              Start Date
            </label>
            <input
              type="date"
              value={filterInputs.startDate}
              onChange={(e) =>
                setFilterInputs((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-2xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all duration-300 hover:bg-white/[0.07] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              End Date
            </label>
            <input
              type="date"
              value={filterInputs.endDate}
              onChange={(e) =>
                setFilterInputs((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-2xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all duration-300 hover:bg-white/[0.07] cursor-pointer"
            />
          </div>

          <div>
            <Button
              variant="secondary"
              onClick={() => setAppliedFilters({ ...filterInputs })}
              className="w-full h-[48px] py-3 font-semibold text-sm"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {earningsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Wallet Balance Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary-500/90 via-primary-600 to-primary-800 rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg shadow-primary-500/10 border border-primary-500/20 backdrop-blur-md min-h-[220px] group transition-all duration-300 hover:shadow-glow-primary">
            {/* Glossy card sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
            {/* Decorative background glow circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <BanknotesIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-[10px] font-bold bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-primary-100 uppercase tracking-widest">
                Wallet
              </span>
            </div>

            <div className="relative z-10 mt-4 mb-4">
              <p className="text-primary-100/70 text-xs font-semibold tracking-wider uppercase">
                Available Balance
              </p>
              <h2 className="text-3xl font-extrabold mt-1 tracking-tight font-mono">
                {formatCurrency(earningsSummary.walletBalance || 0)}
              </h2>
            </div>

            <div className="relative z-10">
              <Button
                variant="secondary"
                fullWidth
                className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold py-2.5 shadow-none hover:shadow-glow-primary hover:border-white/30 transition-all duration-300"
                onClick={() => setShowRedeemModal(true)}
              >
                Redeem to Bank
              </Button>
            </div>
          </div>

          {/* Total Earnings Card */}
          <div className="card-hover relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] rounded-3xl p-6 flex flex-col justify-between min-h-[220px] transition-all duration-300 group hover:shadow-lg hover:shadow-success-500/5">
            {/* Subtle glow behind icon */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-success-500/5 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-success-500/10"></div>
            
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-success-500/10 border border-success-500/20 text-success-400 rounded-2xl transition-all duration-300 group-hover:scale-110">
                <CurrencyDollarIcon className="h-6 w-6" />
              </div>
              <div className="text-[10px] font-bold bg-success-500/10 text-success-400 px-3 py-1.5 rounded-full border border-success-500/20 uppercase tracking-wider">
                Revenue
              </div>
            </div>

            <div className="mt-4 mb-2">
              <p className="text-neutral-400 text-xs font-semibold tracking-wider uppercase">
                Total Earnings
              </p>
              <h3 className="text-3xl font-extrabold text-white mt-1 tracking-tight font-mono">
                {formatCurrency(earningsSummary.totalEarnings)}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 pt-2">
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  earningsSummary.growth > 0
                    ? "bg-success-500/10 text-success-400 border border-success-500/20"
                    : earningsSummary.growth < 0
                      ? "bg-danger-500/10 text-danger-400 border border-danger-500/20"
                      : "bg-white/5 text-neutral-400 border border-white/10"
                }`}
              >
                {getGrowthIcon(earningsSummary.growth)}
                <span>
                  {earningsSummary.growth > 0 ? "+" : ""}
                  {earningsSummary.growth}%
                </span>
              </div>
              <span className="text-xs text-neutral-500">vs last period</span>
            </div>
          </div>

          {/* Total Requests Card */}
          <div className="card-hover relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] rounded-3xl p-6 flex flex-col justify-between min-h-[220px] transition-all duration-300 group hover:shadow-lg hover:shadow-blue-500/5">
            {/* Subtle glow behind icon */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-blue-500/10"></div>

            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl transition-all duration-300 group-hover:scale-110">
                <WrenchScrewdriverIcon className="h-6 w-6" />
              </div>
              <div className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-wider">
                Jobs
              </div>
            </div>

            <div className="mt-4 mb-2">
              <p className="text-neutral-400 text-xs font-semibold tracking-wider uppercase">
                Total Requests
              </p>
              <h3 className="text-3xl font-extrabold text-white mt-1 tracking-tight font-mono">
                {earningsSummary.totalRequests}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 pt-2">
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {earningsSummary.completedRequests} Completed
              </div>
              <span className="text-xs text-neutral-500">requests solved</span>
            </div>
          </div>

          {/* Average Earning Card */}
          <div className="card-hover relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] rounded-3xl p-6 flex flex-col justify-between min-h-[220px] transition-all duration-300 group hover:shadow-lg hover:shadow-purple-500/5">
            {/* Subtle glow behind icon */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-purple-500/10"></div>

            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl transition-all duration-300 group-hover:scale-110">
                <ChartBarIcon className="h-6 w-6" />
              </div>
              <div className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-full border border-purple-500/20 uppercase tracking-wider">
                Average
              </div>
            </div>

            <div className="mt-4 mb-2">
              <p className="text-neutral-400 text-xs font-semibold tracking-wider uppercase">
                Average Earning
              </p>
              <h3 className="text-3xl font-extrabold text-white mt-1 tracking-tight font-mono">
                {formatCurrency(earningsSummary.averageEarning)}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 pt-2">
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Per Request
              </div>
              <span className="text-xs text-neutral-500">avg. ticket size</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Earnings Table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white tracking-tight">Recent Earnings</h3>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-400">
            {detailedEarnings.length} transactions
          </span>
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
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                          earning.status === "success"
                            ? "bg-success-500/10 text-success-400 border-success-500/20"
                            : earning.status === "pending"
                              ? "bg-warning-500/10 text-warning-400 border-warning-500/20"
                              : "bg-danger-500/10 text-danger-400 border-danger-500/20"
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
