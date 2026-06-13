import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";

const NotificationsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "request",
      title: "New Service Request",
      message: "A new service request has been assigned to you",
      timestamp: new Date(Date.now() - 5 * 60000),
      read: false,
      icon: "🔧",
    },
    {
      id: 2,
      type: "payment",
      title: "Payment Received",
      message: "You received a payment of $85 for completed service",
      timestamp: new Date(Date.now() - 30 * 60000),
      read: false,
      icon: "💳",
    },
    {
      id: 3,
      type: "message",
      title: "New Message",
      message: "You have a new message from John Doe",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: true,
      icon: "💬",
    },
    {
      id: 4,
      type: "rating",
      title: "New Review",
      message: "You received a 5-star review from a customer",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
      icon: "⭐",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "request":
        return "bg-primary-500/10 border-primary-500/20";
      case "payment":
        return "bg-success-500/10 border-success-500/20";
      case "message":
        return "bg-accent/10 border-accent/20";
      case "rating":
        return "bg-warning-500/10 border-warning-500/20";
      default:
        return "bg-neutral-500/10 border-neutral-500/20";
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-neutral-400 hover:text-white transition-colors bg-white/[0.05] hover:bg-white/[0.08] rounded-xl border border-white/[0.08]"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-danger-500 rounded-full border-2 border-[#111111] flex items-center justify-center text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-3 w-96 bg-[#1a1a1a] border border-white/[0.08] shadow-2xl rounded-2xl backdrop-blur-xl z-50 max-h-96 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#1a1a1a] border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <BellIcon className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 text-sm">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                          !notification.read ? "bg-white/[0.02]" : ""
                        } transition-colors hover:bg-white/[0.05] cursor-pointer group`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 text-xl">
                            {notification.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p
                                  className={`text-sm font-semibold ${
                                    !notification.read
                                      ? "text-white"
                                      : "text-neutral-400"
                                  }`}
                                >
                                  {notification.title}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                              </div>

                              {/* Mark as read button */}
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="flex-shrink-0 p-1 hover:bg-white/[0.1] rounded transition-colors"
                                  title="Mark as read"
                                >
                                  <CheckIcon className="h-4 w-4 text-primary-400" />
                                </button>
                              )}
                            </div>

                            {/* Timestamp */}
                            <p className="text-xs text-neutral-600 mt-2">
                              {formatTime(notification.timestamp)}
                            </p>
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="flex-shrink-0 p-1 hover:bg-white/[0.1] rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete notification"
                          >
                            <XMarkIcon className="h-4 w-4 text-neutral-500" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-white/[0.08] px-4 py-3">
                  <button className="w-full px-3 py-2 text-sm font-medium text-center text-primary-400 hover:bg-white/[0.05] rounded-lg transition-colors">
                    View all notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsPanel;
