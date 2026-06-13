import React, { useState, useEffect, useCallback } from "react";
import {
  StarIcon,
  UserIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
} from "@heroicons/react/24/outline";
import mechanicApi from "../../api/mechanicApi";
import { formatDate, getRelativeTime } from "../../utils/helpers";
import toast from "react-hot-toast";

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {},
  });
  const [filters, setFilters] = useState({
    rating: "",
    sortBy: "newest",
  });

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await mechanicApi.getReviews(filters);

      if (response.success) {
        setReviews(response.data.reviews || []);
        setStats(
          response.data.stats || {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: {},
          },
        );
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [filters.rating, filters.sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <StarIcon
        key={index}
        className={`h-4 w-4 ${
          index < rating ? "text-primary-400 fill-current" : "text-neutral-600"
        }`}
      />
    ));
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return "text-success-400";
    if (rating >= 3) return "text-warning-400";
    return "text-danger-400";
  };

  const getRatingLabel = (rating) => {
    if (rating >= 4.5) return "Excellent";
    if (rating >= 4) return "Very Good";
    if (rating >= 3.5) return "Good";
    if (rating >= 3) return "Average";
    if (rating >= 2) return "Below Average";
    return "Poor";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Customer Reviews</h1>
        <p className="text-neutral-400">
          See what your customers are saying about your services
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="flex justify-center mt-2">
              {renderStars(Math.round(stats.averageRating))}
            </div>
            <p className="text-sm text-neutral-400 mt-1">
              {getRatingLabel(stats.averageRating)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">Average Rating</p>
          </div>
        </div>

        <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {stats.totalReviews}
            </div>
            <p className="text-sm text-neutral-400 mt-1">Total Reviews</p>
          </div>
        </div>

        <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-success-400">
              {stats.totalReviews > 0
                ? Math.round(
                    ((stats.ratingDistribution[5] || 0) / stats.totalReviews) *
                      100,
                  )
                : 0}
              %
            </div>
            <p className="text-sm text-neutral-400 mt-1">5-Star Reviews</p>
          </div>
        </div>

        <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">
              {stats.totalReviews > 0
                ? Math.round(
                    ((stats.ratingDistribution[4] || 0) / stats.totalReviews) *
                      100,
                  )
                : 0}
              %
            </div>
            <p className="text-sm text-neutral-400 mt-1">4-Star Reviews</p>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Rating Distribution
        </h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating] || 0;
            const percentage =
              stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

            return (
              <div key={rating} className="flex items-center">
                <div className="flex items-center w-16">
                  <span className="text-sm font-medium text-white">
                    {rating}
                  </span>
                  <StarIcon className="h-4 w-4 text-primary-400 fill-current ml-1" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-white/[0.06] rounded-full h-2">
                    <div
                      className="bg-primary-400 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-12 text-right">
                  <span className="text-sm text-neutral-400">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.05] rounded-2xl shadow-soft border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Filter by Rating
            </label>
            <select
              value={filters.rating}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, rating: e.target.value }))
              }
              className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
              }
              className="w-full px-3 py-2 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReviews}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white/[0.05] rounded-2xl shadow-soft border">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <h3 className="text-lg font-semibold text-white">
            Customer Reviews ({reviews.length})
          </h3>
        </div>

        {reviews.length === 0 ? (
          <div className="p-6 text-center">
            <ChatBubbleLeftIcon className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-500">No reviews found</p>
            <p className="text-sm text-neutral-500">
              Reviews will appear here once customers rate your services
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {reviews.map((review) => (
              <div key={review._id} className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-white/[0.08] rounded-full flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-neutral-400" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-white">
                          {review.customer?.name || "Anonymous Customer"}
                        </h4>
                        <div className="flex items-center mt-1">
                          <div className="flex">
                            {renderStars(review.rating)}
                          </div>
                          <span
                            className={`ml-2 text-sm font-medium ${getRatingColor(review.rating)}`}
                          >
                            {review.rating}/5
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-neutral-500">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {getRelativeTime(review.createdAt)}
                      </div>
                    </div>

                    {review.comment && (
                      <div className="mt-3">
                        <p className="text-sm text-neutral-300">
                          {review.comment}
                        </p>
                      </div>
                    )}

                    {review.serviceRequest && (
                      <div className="mt-3 p-3 bg-white/[0.03] rounded-2xl">
                        <div className="text-sm">
                          <span className="font-medium text-white">
                            Service:
                          </span>
                          <span className="ml-1 text-neutral-400">
                            {review.serviceRequest.issueType
                              ?.replace("_", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </div>
                        {review.serviceRequest.description && (
                          <div className="text-sm mt-1">
                            <span className="font-medium text-white">
                              Details:
                            </span>
                            <span className="ml-1 text-neutral-400">
                              {review.serviceRequest.description}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {review.response && (
                      <div className="mt-3 p-3 bg-blue-500/10 rounded-2xl">
                        <div className="text-sm">
                          <span className="font-medium text-blue-900">
                            Your Response:
                          </span>
                          <p className="mt-1 text-blue-800">
                            {review.response}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-success-500/10 rounded-2xl p-4">
        <h4 className="text-sm font-medium text-green-900 mb-2">
          💡 Tips for Better Reviews
        </h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>
            • Provide excellent service and communicate clearly with customers
          </li>
          <li>• Respond to reviews professionally and address any concerns</li>
          <li>
            • Ask satisfied customers to leave reviews after service completion
          </li>
          <li>
            • Use negative feedback as an opportunity to improve your services
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Reviews;
