import React, { useState } from "react";
import { MapPinIcon, PhoneIcon } from "@heroicons/react/24/outline";
import Button from "../common/Button";
import { formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

const RequestDetailsModal = ({
  request,
  onClose,
  onStatusUpdate,
  onNavigate,
}) => {
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      if (onStatusUpdate) {
        await onStatusUpdate(request._id, newStatus);
      }
      onClose();
    } finally {
      setUpdating(false);
    }
  };

  const openGoogleMaps = () => {
    if (!request?.location) return;

    const { lat, lng, address } = request.location;
    const destination = address || `${lat},${lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(url, "_blank");
  };

  const callCustomer = () => {
    if (request?.customerId?.phone) {
      window.open(`tel:${request.customerId.phone}`, "_self");
    }
  };

  const copyAddressToClipboard = async () => {
    if (!request?.location?.address) return;

    try {
      await navigator.clipboard.writeText(request.location.address);
      toast.success("Address copied to clipboard");
    } catch (error) {
      console.error("Failed to copy address:", error);
      toast.error("Failed to copy address");
    }
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black/40 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white/95 backdrop-blur-sm rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white/95 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-neutral-200">
            <div className="sm:flex sm:items-start">
              <div className="w-full">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-neutral-900">
                    Service Request Details
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === "completed"
                          ? "bg-success-500/20 text-success-700"
                          : request.status === "cancelled"
                            ? "bg-danger-500/20 text-danger-700"
                            : "bg-warning-500/20 text-warning-700"
                      }`}
                    >
                      {request.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Basic Information */}
                  <div className="space-y-4">
                    <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200">
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Request Information
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Request ID
                          </label>
                          <p className="text-sm text-neutral-900 font-mono">
                            #{request._id.slice(-8)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Issue Type
                          </label>
                          <p className="text-sm text-neutral-900 capitalize">
                            {request.issueType.replace("_", " ")}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Priority
                          </label>
                          <p className="text-sm text-neutral-900 capitalize">
                            {request.priority || "Medium"}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Description
                          </label>
                          <p className="text-sm text-neutral-900 bg-white/50 p-2 rounded border border-neutral-300">
                            {request.description}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Created
                          </label>
                          <p className="text-sm text-neutral-900">
                            {formatDate(request.createdAt)}
                          </p>
                        </div>

                        {request.acceptedAt && (
                          <div>
                            <label className="block text-sm font-medium text-neutral-600 mb-1">
                              Accepted
                            </label>
                            <p className="text-sm text-neutral-900">
                              {formatDate(request.acceptedAt)}
                            </p>
                          </div>
                        )}

                        {request.quotation && (
                          <div>
                            <label className="block text-sm font-medium text-neutral-600 mb-1">
                              Quotation
                            </label>
                            <p className="text-lg font-semibold text-success-600">
                              ₹{request.quotation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Customer & Location */}
                  <div className="space-y-4">
                    {/* Customer Information */}
                    <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200">
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Customer Information
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Name
                          </label>
                          <p className="text-sm text-neutral-900">
                            {request.customerId?.name ||
                              "Customer name not available"}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Phone
                          </label>
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 text-neutral-600" />
                            <span className="text-sm text-neutral-900">
                              {request.customerId?.phone ||
                                "Phone not available"}
                            </span>
                            {request.customerId?.phone && (
                              <button
                                onClick={callCustomer}
                                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                              >
                                Call
                              </button>
                            )}
                          </div>
                        </div>

                        {request.customerId?.email && (
                          <div>
                            <label className="block text-sm font-medium text-neutral-600 mb-1">
                              Email
                            </label>
                            <p className="text-sm text-neutral-900">
                              {request.customerId.email}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location Information */}
                    <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200">
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Service Location
                      </h4>
                      <div className="space-y-3">
                        {/* Exact Coordinates */}
                        <div className="bg-primary-50 border border-primary-300 rounded-2xl p-3">
                          <label className="block text-sm font-medium text-primary-900 mb-2">
                            📍 Exact Coordinates (Copy for Navigation)
                          </label>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-primary-800">
                                Latitude:
                              </span>
                              <span className="text-sm font-mono text-primary-900 bg-white px-2 py-1 rounded border border-primary-200">
                                {request.location.lat.toFixed(6)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-primary-800">
                                Longitude:
                              </span>
                              <span className="text-sm font-mono text-primary-900 bg-white px-2 py-1 rounded border border-primary-200">
                                {request.location.lng.toFixed(6)}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                const coords = `${request.location.lat.toFixed(6)}, ${request.location.lng.toFixed(6)}`;
                                navigator.clipboard.writeText(coords);
                                toast.success(
                                  "Coordinates copied to clipboard",
                                );
                              }}
                              className="w-full bg-primary-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
                            >
                              Copy Coordinates
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Address
                          </label>
                          <div className="flex items-start gap-2">
                            <MapPinIcon className="w-4 h-4 text-neutral-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-neutral-900">
                                {request.location.address ||
                                  "Address not specified"}
                              </p>
                              {request.location.address && (
                                <button
                                  onClick={copyAddressToClipboard}
                                  className="text-primary-600 hover:text-primary-700 text-xs font-medium mt-1"
                                >
                                  Copy Address
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={openGoogleMaps}
                            className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
                          >
                            Open in Maps
                          </button>
                          {onNavigate && (
                            <button
                              onClick={() => onNavigate(request)}
                              className="flex-1 bg-success-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-success-700 transition-colors"
                            >
                              Navigate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Information */}
                    <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200">
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Service Vehicle
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Type:</span>
                          <span className="font-medium capitalize text-neutral-900">
                            {request.vehicleInfo.type}
                          </span>
                        </div>
                        {request.vehicleInfo.make && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Make:</span>
                            <span className="font-medium text-neutral-900">
                              {request.vehicleInfo.make}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Model:</span>
                          <span className="font-medium text-neutral-900">
                            {request.vehicleInfo.model}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Plate:</span>
                          <span className="font-medium font-mono text-neutral-900">
                            {request.vehicleInfo.plate}
                          </span>
                        </div>
                        {request.vehicleInfo.year && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Year:</span>
                            <span className="font-medium text-neutral-900">
                              {request.vehicleInfo.year}
                            </span>
                          </div>
                        )}
                        {request.vehicleInfo.color && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Color:</span>
                            <span className="font-medium capitalize text-neutral-900">
                              {request.vehicleInfo.color}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer's Vehicles */}
                    {request.customerId?.vehicles &&
                      request.customerId.vehicles.length > 0 && (
                        <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200">
                          <h4 className="font-semibold text-neutral-900 mb-3">
                            Customer's Vehicles
                          </h4>
                          <div className="space-y-3">
                            {request.customerId.vehicles.map(
                              (vehicle, index) => (
                                <div
                                  key={vehicle._id || index}
                                  className="bg-white rounded-2xl p-3 border border-neutral-300"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-neutral-900">
                                      {vehicle.name}
                                    </h5>
                                    {vehicle.isDefault && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning-500/20 text-warning-700">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-neutral-600">
                                        Type:
                                      </span>
                                      <span className="font-medium capitalize text-neutral-900">
                                        {vehicle.type}
                                      </span>
                                    </div>
                                    {vehicle.make && (
                                      <div className="flex justify-between">
                                        <span className="text-neutral-600">
                                          Make:
                                        </span>
                                        <span className="font-medium text-neutral-900">
                                          {vehicle.make}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-neutral-600">
                                        Model:
                                      </span>
                                      <span className="font-medium text-neutral-900">
                                        {vehicle.model}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-neutral-600">
                                        Plate:
                                      </span>
                                      <span className="font-medium font-mono text-neutral-900">
                                        {vehicle.plate}
                                      </span>
                                    </div>
                                    {vehicle.year && (
                                      <div className="flex justify-between">
                                        <span className="text-neutral-600">
                                          Year:
                                        </span>
                                        <span className="font-medium text-neutral-900">
                                          {vehicle.year}
                                        </span>
                                      </div>
                                    )}
                                    {vehicle.color && (
                                      <div className="flex justify-between">
                                        <span className="text-neutral-600">
                                          Color:
                                        </span>
                                        <span className="font-medium capitalize text-neutral-900">
                                          {vehicle.color}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Additional Information */}
                    <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200">
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Additional Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        {request.broadcastRadius && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              Broadcast Radius:
                            </span>
                            <span className="font-medium text-neutral-900">
                              {request.broadcastRadius} km
                            </span>
                          </div>
                        )}
                        {request.estimatedDuration && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              Estimated Duration:
                            </span>
                            <span className="font-medium text-neutral-900">
                              {request.estimatedDuration} minutes
                            </span>
                          </div>
                        )}
                        {request.actualDuration && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              Actual Duration:
                            </span>
                            <span className="font-medium text-neutral-900">
                              {request.actualDuration} minutes
                            </span>
                          </div>
                        )}
                        {request.estimatedArrival && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              Estimated Arrival:
                            </span>
                            <span className="font-medium text-neutral-900">
                              {request.estimatedArrival} minutes
                            </span>
                          </div>
                        )}
                        {request.isDirectChat && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              Direct Booking:
                            </span>
                            <span className="font-medium text-success-600">
                              Yes
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Images Section */}
                    {request.images && request.images.length > 0 && (
                      <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200">
                        <h4 className="font-semibold text-neutral-900 mb-3">
                          Request Images
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {request.images.map((image, index) => (
                            <div key={index} className="relative">
                              <img
                                src={image}
                                alt={`Request attachment ${index + 1}`}
                                className="w-full h-24 object-cover rounded-2xl border border-neutral-300"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/95 border-t border-neutral-200 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            {request.status === "assigned" && onStatusUpdate && (
              <Button
                variant="primary"
                onClick={() => handleStatusUpdate("enroute")}
                loading={updating}
                disabled={updating}
                className="ml-3"
              >
                Start Journey
              </Button>
            )}

            {request.status === "enroute" && onStatusUpdate && (
              <Button
                variant="primary"
                onClick={() => handleStatusUpdate("in_progress")}
                loading={updating}
                disabled={updating}
                className="ml-3"
              >
                Start Work
              </Button>
            )}

            {request.status === "in_progress" && onStatusUpdate && (
              <Button
                variant="success"
                onClick={() => handleStatusUpdate("completed")}
                loading={updating}
                disabled={updating}
                className="ml-3"
              >
                Complete Request
              </Button>
            )}

            <Button variant="outline" onClick={onClose} disabled={updating}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal;
