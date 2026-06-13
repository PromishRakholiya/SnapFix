import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  UsersIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '../../utils/helpers';
import api from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const DashboardStats = () => {
  const [stats, setStats] = useState({
    overview: {
      totalUsers: 0,
      totalMechanics: 0,
      totalRequests: 0,
      totalRevenue: 0,
      activeRequests: 0,
      completedRequests: 0,
      avgResponseTime: 0,
      customerSatisfaction: 0
    },
    trends: {
      userGrowth: 0,
      revenueGrowth: 0,
      requestGrowth: 0,
      mechanicGrowth: 0
    },
    charts: {
      requestsByStatus: {},
      revenueByMonth: [],
      requestsByType: {},
      mechanicPerformance: [],
      userGrowth: []
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 1y

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/dashboard/stats?range=${timeRange}`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };
  
  // Request status chart data
  const requestStatusData = {
    labels: Object.keys(stats.charts.requestsByStatus),
    datasets: [
      {
        data: Object.values(stats.charts.requestsByStatus),
        backgroundColor: [
          '#fbbf24', // pending - yellow
          '#3b82f6', // assigned - blue  
          '#8b5cf6', // in_progress - purple
          '#10b981', // completed - green
          '#ef4444', // cancelled - red
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Revenue chart data
  const revenueData = {
    labels: stats.charts.revenueByMonth.map(item => item.month),
    datasets: [
      {
        label: 'Revenue',
        data: stats.charts.revenueByMonth.map(item => item.revenue),
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Request types chart data
  const requestTypesData = {
    labels: Object.keys(stats.charts.requestsByType).map(type => 
      type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    ),
    datasets: [
      {
        label: 'Number of Requests',
        data: Object.values(stats.charts.requestsByType),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
      },
    ],
  };

  // User growth chart data
  const userGrowthData = {
    labels: stats.charts.userGrowth.map(item => item.date),
    datasets: [
      {
        label: 'Customers',
        data: stats.charts.userGrowth.map(item => item.customers),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Mechanics',
        data: stats.charts.userGrowth.map(item => item.mechanics),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => {
    const colorClasses = {
      primary: 'bg-primary-500/15 text-primary-400',
      success: 'bg-success-500/15 text-success-400',
      warning: 'bg-warning-500/15 text-warning-400',
      danger: 'bg-danger-500/15 text-danger-400',
    };

    return (
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-2xl ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-neutral-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
          {trend && (
            <div className={`flex items-center ${trend === 'up' ? 'text-success-400' : 'text-danger-400'}`}>
              {trend === 'up' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm font-medium">{trendValue}%</span>
            </div>
          )}
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
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Dashboard Analytics</h1>
        <div className="flex space-x-2">
          {[
            { label: '7 Days', value: '7d' },
            { label: '30 Days', value: '30d' },
            { label: '90 Days', value: '90d' },
            { label: '1 Year', value: '1y' },
          ].map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-4 py-2 text-sm font-medium rounded-2xl transition-colors ${
                timeRange === range.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/[0.05] text-neutral-300 hover:bg-white/[0.03] border border-white/[0.1]'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.overview.totalUsers.toLocaleString()}
          icon={UsersIcon}
          trend={stats.trends.userGrowth > 0 ? 'up' : 'down'}
          trendValue={Math.abs(stats.trends.userGrowth)}
          color="primary"
        />
        <StatCard
          title="Active Mechanics"
          value={stats.overview.totalMechanics.toLocaleString()}
          icon={WrenchScrewdriverIcon}
          trend={stats.trends.mechanicGrowth > 0 ? 'up' : 'down'}
          trendValue={Math.abs(stats.trends.mechanicGrowth)}
          color="success"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.overview.totalRevenue)}
          icon={CurrencyDollarIcon}
          trend={stats.trends.revenueGrowth > 0 ? 'up' : 'down'}
          trendValue={Math.abs(stats.trends.revenueGrowth)}
          color="warning"
        />
        <StatCard
          title="Active Requests"
          value={stats.overview.activeRequests.toLocaleString()}
          icon={ClockIcon}
          trend={stats.trends.requestGrowth > 0 ? 'up' : 'down'}
          trendValue={Math.abs(stats.trends.requestGrowth)}
          color="danger"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{stats.overview.completedRequests}</p>
            <p className="text-sm text-neutral-400">Completed Requests</p>
          </div>
        </div>
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{stats.overview.avgResponseTime}min</p>
            <p className="text-sm text-neutral-400">Avg Response Time</p>
          </div>
        </div>
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{stats.overview.customerSatisfaction}%</p>
            <p className="text-sm text-neutral-400">Customer Satisfaction</p>
          </div>
        </div>
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {((stats.overview.completedRequests / stats.overview.totalRequests) * 100 || 0).toFixed(1)}%
            </p>
            <p className="text-sm text-neutral-400">Completion Rate</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Status Distribution */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Request Status Distribution
          </h3>
          <div className="h-64">
            <Doughnut data={requestStatusData} options={doughnutOptions} />
          </div>
        </div>

        {/* Request Types */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Request Types
          </h3>
          <div className="h-64">
            <Bar data={requestTypesData} options={chartOptions} />
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Revenue Trend
          </h3>
          <div className="h-64">
            <Line data={revenueData} options={chartOptions} />
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            User Growth
          </h3>
          <div className="h-64">
            <Line data={userGrowthData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Top Mechanics Performance */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Top Performing Mechanics
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left py-3 px-4 font-medium text-white">Mechanic</th>
                <th className="text-left py-3 px-4 font-medium text-white">Completed Jobs</th>
                <th className="text-left py-3 px-4 font-medium text-white">Rating</th>
                <th className="text-left py-3 px-4 font-medium text-white">Revenue</th>
                <th className="text-left py-3 px-4 font-medium text-white">Response Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.charts.mechanicPerformance.slice(0, 5).map((mechanic, index) => (
                <tr key={mechanic.id} className="border-b border-white/[0.06]">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-500/15 rounded-full flex items-center justify-center mr-3">
                        <span className="text-primary-400 font-bold text-sm">
                          {mechanic.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-white">{mechanic.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-neutral-300">{mechanic.completedJobs}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <span className="text-neutral-300">{mechanic.rating.toFixed(1)}</span>
                      <span className="text-warning-400 ml-1">⭐</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-neutral-300">{formatCurrency(mechanic.revenue)}</td>
                  <td className="py-3 px-4 text-neutral-300">{mechanic.avgResponseTime}min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
