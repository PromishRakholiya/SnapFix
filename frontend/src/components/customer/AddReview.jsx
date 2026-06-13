import React, { useState } from "react";
import { StarIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import Button from "../common/Button";
import reviewService from "../../services/reviewService";
import toast from "react-hot-toast";

const AddReview = ({
  requestId,
  mechanicId,
  mechanicName,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      setSubmitting(true);

      const reviewData = {
        serviceRequestId: requestId,
        mechanicId,
        rating,
        comment: `Rated ${rating} stars`,
      };

      const response = await reviewService.submitReview(reviewData);

      if (response.success) {
        toast.success("Review submitted successfully!");
        onSuccess && onSuccess(response.data);
        onClose();
      } else {
        toast.error(response.message || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= (hoveredRating || rating);

      return (
        <button
          key={index}
          type="button"
          onClick={() => handleRatingChange(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          className="focus:outline-none transition-all duration-200 hover:scale-110 transform"
        >
          <StarIcon
            className={`h-12 w-12 transition-all duration-200 ${
              isFilled
                ? "text-primary-400 fill-current drop-shadow-lg"
                : "text-neutral-600 hover:text-primary-300"
            }`}
          />
        </button>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white/[0.05] rounded-2xl max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Rate Your Experience</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors duration-200 p-2 rounded-full hover:bg-white/[0.05] hover:bg-opacity-20"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stars */}
            <div className="text-center">
              <div className="flex justify-center space-x-4 mb-6">
                {renderStars()}
              </div>

              {rating > 0 && (
                <div className="text-lg font-semibold text-white">
                  {rating}/5 stars
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                icon={!submitting && <CheckIcon className="h-5 w-5" />}
                disabled={rating === 0}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddReview;
