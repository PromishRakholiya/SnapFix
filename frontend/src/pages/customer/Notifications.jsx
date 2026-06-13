import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  FunnelIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import { formatDate, getRelativeTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - in real app, this would be an API call
      const mockNotifications = [
        {
          _id: '1',
          title: 'Service Request Completed',
          message: 'Your flat tire service has been completed successfully. Please rate your experience.',
          type: 'success',
          read: false,
          createdAt: new Date().toISOString(),
          relatedTo: 'service_request',
          relatedId: 'req_123'
        },
        {
          _id: '2',
          title: 'Mechanic En Route',
          message: 'Your assigned mechanic is on the way to your location. Estimated arrival: 15 minutes.',
          type: 'info',
          read: false,
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          relatedTo: 'service_request',
          relatedId: 'req_124'
        },
        {
          _id: '3',
          title: 'Payment Successful',
          message: 'Your payment of ₹850 for roadside assistance has been processed successfully.',
          type: 'success',
          read: true,
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          relatedTo: 'payment',
          relatedId: 'pay_456'
        },
        {
          _id: '4',
          title: 'Service Request Assigned',
          message: 'Your service request has been assigned to Rajesh Kumar, a verified mechanic in your area.',
          type: 'info',
          read: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          relatedTo: 'service_request',
          relatedId: 'req_125'
        },
        {
          _id: '5',
          title: 'Profile Update Required',
          message: 'Please update your profile information to improve our service recommendations.',
          type: 'warning',
          read: false,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          relatedTo: 'profile',
          relatedId: null
        }
      ];

      // Filter notifications based on selected filter
      let filtered = mockNotifications;
      if (filter === 'unread') {
        filtered = mockNotifications.filter(n => !n.read);
      } else if (filter === 'read') {
        filtered = mockNotifications.filter(n => n.read);
      }

      setNotifications(filtered);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds) => {
    try {
      const updatedNotifications = notifications.map(notification => 
        notificationIds.includes(notification._id) 
          ? { ...notification, read: true }
          : notification
      );
      setNotifications(updatedNotifications);
      toast.success('Marked as read');
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const markAsUnread = async (notificationIds) => {
    try {
      const updatedNotifications = notifications.map(notification => 
        notificationIds.includes(notification._id) 
          ? { ...notification, read: false }
          : notification
      );
      setNotifications(updatedNotifications);
      toast.success('Marked as unread');
    } catch (error) {
      console.error('Error marking as unread:', error);
      toast.error('Failed to update notifications');
    }
  };

  const deleteNotifications = async (notificationIds) => {
    try {
      const updatedNotifications = notifications.filter(
        notification => !notificationIds.includes(notification._id)
      );
      setNotifications(updatedNotifications);
      setSelectedNotifications([]);
      toast.success('Notifications deleted');
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n._id));
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-success-500" />;
      case 'warning':
        return <ExclamationCircleIcon className="w-6 h-6 text-warning-500" />;
      case 'error':
        return <XMarkIcon className="w-6 h-6 text-danger-500" />;
      case 'info':
      default:
        return <InformationCircleIcon className="w-6 h-6 text-primary-500" />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-l-success-500';
      case 'warning':
        return 'border-l-warning-500';
      case 'error':
        return 'border-l-danger-500';
      case 'info':
      default:
        return 'border-l-primary-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-neutral-400 mt-1">Stay updated with your service requests and account activity</p>
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-5 h-5 text-neutral-500" />
              <span className="font-medium text-white">Filter:</span>
            </div>
            <div className="flex space-x-2">
              {['all', 'unread', 'read'].map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filter === filterOption
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-100 text-neutral-300 hover:bg-secondary-200'
                  }`}
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                  {filterOption === 'unread' && (
                    <span className="ml-1 bg-primary-500 text-white rounded-full px-1.5 py-0.5 text-xs">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedNotifications.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-neutral-400">
                {selectedNotifications.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAsRead(selectedNotifications)}
              >
                Mark Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAsUnread(selectedNotifications)}
              >
                Mark Unread
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteNotifications(selectedNotifications)}
                icon={<TrashIcon className="w-4 h-4" />}
              >
                Delete
              </Button>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="mt-4 flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedNotifications.length === notifications.length}
              onChange={handleSelectAll}
              className="h-4 w-4 text-primary-400 focus:ring-primary-500 border-white/[0.1] rounded"
            />
            <span className="text-sm text-neutral-400">Select all</span>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white/[0.05] rounded-2xl shadow-card overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="mx-auto h-12 w-12 text-neutral-500" />
            <h3 className="mt-2 text-sm font-medium text-white">No notifications</h3>
            <p className="mt-1 text-sm text-neutral-500">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : filter === 'read'
                ? "No read notifications found."
                : "You'll receive notifications about your service requests and account activity here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-6 hover:bg-white/[0.03] transition-colors ${
                  !notification.read ? 'bg-primary-500/5' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification._id)}
                    onChange={() => handleSelectNotification(notification._id)}
                    className="mt-1 h-4 w-4 text-primary-400 focus:ring-primary-500 border-white/[0.1] rounded"
                  />
                  
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className={`flex-1 border-l-4 pl-4 ${getBorderColor(notification.type)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${
                          !notification.read ? 'text-white' : 'text-neutral-300'
                        }`}>
                          {notification.title}
                          {!notification.read && (
                            <span className="ml-2 inline-block w-2 h-2 bg-primary-500 rounded-full"></span>
                          )}
                        </h4>
                        <p className="mt-1 text-sm text-neutral-400">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center text-xs text-neutral-500">
                          <span>{getRelativeTime(notification.createdAt)}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(notification.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        <button
                          onClick={() => notification.read 
                            ? markAsUnread([notification._id])
                            : markAsRead([notification._id])
                          }
                          className="text-primary-400 hover:text-primary-400 text-sm font-medium"
                        >
                          {notification.read ? 'Mark unread' : 'Mark read'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
