import React, { useState, useEffect, useCallback } from "react";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import adminService from "../../services/adminService";
import { formatCurrency } from "../../utils/helpers";
import toast from "react-hot-toast";
import Button from "../../components/common/Button";
import Select from "../../components/common/Select";

const Analytics = () => {
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    revenueData: [],
    requestTrends: [],
    topMechanics: [],
    popularServices: [],
    summary: {
      totalRevenue: 0,
      totalUsers: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      revenueGrowth: 0,
      userGrowth: 0,
      requestGrowth: 0,
      responseTimeChange: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getAnalytics(period);

      if (response.success) {
        setAnalytics(
          response.data || {
            userGrowth: [],
            revenueData: [],
            requestTrends: [],
            topMechanics: [],
            popularServices: [],
            summary: {
              totalRevenue: 0,
              totalUsers: 0,
              totalRequests: 0,
              avgResponseTime: 0,
              revenueGrowth: 0,
              userGrowth: 0,
              requestGrowth: 0,
              responseTimeChange: 0,
            },
          },
        );
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to fetch analytics data");
      setAnalytics({
        userGrowth: [],
        revenueData: [],
        requestTrends: [],
        topMechanics: [],
        popularServices: [],
        summary: {
          totalRevenue: 0,
          totalUsers: 0,
          totalRequests: 0,
          avgResponseTime: 0,
          revenueGrowth: 0,
          userGrowth: 0,
          requestGrowth: 0,
          responseTimeChange: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const getGrowthIcon = (percentage) => {
    const num = parseFloat(percentage || 0);
    if (num > 0) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-success-400" />;
    } else if (num < 0) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-danger-400" />;
    }
    return <ChartBarIcon className="h-4 w-4 text-neutral-400" />;
  };

  const getGrowthColor = (percentage) => {
    const num = parseFloat(percentage || 0);
    if (num > 0) return "text-success-400";
    if (num < 0) return "text-danger-400";
    return "text-neutral-400";
  };

  const formatChartData = (data, key) => {
    return data.map((item) => ({
      date: `${item._id.month}/${item._id.day}`,
      value: item[key] || 0,
    }));
  };

  const renderSimpleChart = (data, title, color = "blue") => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8">
          <ChartBarIcon className="h-12 w-12 text-neutral-500 mx-auto mb-2" />
          <p className="text-neutral-500">No data available</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map((item) => item.value));
    const minValue = Math.min(...data.map((item) => item.value));

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-neutral-300">{title}</h4>
        <div className="flex items-end space-x-1 h-32">
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full bg-${color}-500 rounded-t`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                ></div>
                <span className="text-xs text-neutral-500 mt-1">
                  {item.date}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-neutral-500">
          <span>Min: {minValue}</span>
          <span>Max: {maxValue}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-neutral-400">
            Monitor key metrics and performance indicators
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-32"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </Select>
          <Button
            variant="secondary"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/15 rounded-2xl">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-400">
                Total Revenue
              </p>
              <p className="text-2xl font-semibold text-white">
                {formatCurrency(analytics.summary?.totalRevenue || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(analytics.summary?.revenueGrowth)}
                <span
                  className={`text-sm ml-1 ${getGrowthColor(analytics.summary?.revenueGrowth)}`}
                >
                  {analytics.summary?.revenueGrowth || 0}% from last period
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-500/15 rounded-2xl">
              <UsersIcon className="h-6 w-6 text-success-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-400">
                Total Users
              </p>
              <p className="text-2xl font-semibold text-white">
                {(analytics.summary?.totalUsers || 0).toLocaleString()}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(analytics.summary?.userGrowth)}
                <span
                  className={`text-sm ml-1 ${getGrowthColor(analytics.summary?.userGrowth)}`}
                >
                  {analytics.summary?.userGrowth || 0}% from last period
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/15 rounded-2xl">
              <WrenchScrewdriverIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-400">
                Total Requests
              </p>
              <p className="text-2xl font-semibold text-white">
                {(analytics.summary?.totalRequests || 0).toLocaleString()}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(analytics.summary?.requestGrowth)}
                <span
                  className={`text-sm ml-1 ${getGrowthColor(analytics.summary?.requestGrowth)}`}
                >
                  {analytics.summary?.requestGrowth || 0}% from last period
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-accent/15 rounded-2xl">
              <ClockIcon className="h-6 w-6 text-accent" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-400">
                Avg Response Time
              </p>
              <p className="text-2xl font-semibold text-white">
                {analytics.summary?.avgResponseTime || 0} min
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(analytics.summary?.responseTimeChange)}
                <span
                  className={`text-sm ml-1 ${getGrowthColor(analytics.summary?.responseTimeChange)}`}
                >
                  {analytics.summary?.responseTimeChange || 0}% from last period
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Distribution Chart */}
        <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Service Distribution
          </h3>
          {analytics.popularServices && analytics.popularServices.length > 0 ? (
            <div className="space-y-3">
              {analytics.popularServices.slice(0, 5).map((service, index) => {
                const percentage = service.percentage || 0;
                return (
                  <div key={service._id || index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-neutral-300">
                        {service._id?.replace("_", " ").toUpperCase() ||
                          "Unknown"}
                      </span>
                      <span className="text-neutral-500">
                        {service.count || 0} requests
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChartBarIcon className="h-12 w-12 text-neutral-500 mx-auto mb-2" />
              <p className="text-neutral-500">No service data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Mechanics */}
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <h3 className="text-lg font-medium text-white">
            Top Performing Mechanics
          </h3>
        </div>
        <div className="p-6">
          {analytics.topMechanics && analytics.topMechanics.length > 0 ? (
            <div className="space-y-4">
              {analytics.topMechanics.map((mechanic, index) => (
                <div
                  key={mechanic._id || index}
                  className="flex items-center justify-between p-4 border border-white/[0.08] rounded-2xl"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500/15 rounded-full flex items-center justify-center text-sm font-medium text-blue-400">
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-white">
                        {mechanic.name || "Unknown"}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {mechanic.completedRequests || 0} requests completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(mechanic.totalEarnings || 0)}
                    </p>
                    <p className="text-sm text-neutral-500">
                      ⭐ {mechanic.rating?.toFixed(1) || "N/A"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-500">No mechanic data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Popular Services */}
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <h3 className="text-lg font-medium text-white">Popular Services</h3>
        </div>
        <div className="p-6">
          {analytics.popularServices && analytics.popularServices.length > 0 ? (
            <div className="space-y-4">
              {analytics.popularServices.map((service, index) => (
                <div
                  key={service._id || index}
                  className="flex items-center justify-between p-4 border border-white/[0.08] rounded-2xl"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-success-500/15 rounded-full flex items-center justify-center text-sm font-medium text-success-400">
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-white">
                        {service._id?.replace("_", " ").toUpperCase() ||
                          "Unknown Service"}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {service.count || 0} requests
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(service.totalRevenue || 0)}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {service.percentage?.toFixed(1) || 0}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-500">No service data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
