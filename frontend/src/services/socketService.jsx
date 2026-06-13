import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.requestNamespace = null;
  }

  // Initialize socket connection
  init(token) {
    if (this.socket) {
      this.disconnect();
    }

    // Connect to main socket
    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    // Connect to requests namespace
    this.requestNamespace = io(`${process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000'}/requests`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  // Setup basic event listeners
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Main socket connected:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Main socket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Main socket connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Main socket error:', error);
    });

    // Setup request namespace listeners
    if (this.requestNamespace) {
      this.requestNamespace.on('connect', () => {
        console.log('Request namespace connected:', this.requestNamespace.id);
      });

      this.requestNamespace.on('disconnect', (reason) => {
        console.log('Request namespace disconnected:', reason);
      });

      this.requestNamespace.on('connect_error', (error) => {
        console.error('Request namespace connection error:', error);
      });
    }
  }

  // Join user to their personal room
  joinUserRoom(userId) {
    if (this.requestNamespace && this.requestNamespace.connected) {
      this.requestNamespace.emit('join-user-room', userId);
      console.log('Joined user room:', userId);
    }
  }

  // Join mechanic to their service area
  joinMechanicArea(mechanicId, location) {
    if (this.requestNamespace && this.requestNamespace.connected) {
      this.requestNamespace.emit('join-mechanic-area', mechanicId, location);
      console.log('Joined mechanic area:', mechanicId, location);
    }
  }

  // Join a service request room for real-time updates
  joinRequest(requestId) {
    if (this.requestNamespace && this.requestNamespace.connected) {
      this.requestNamespace.emit('join_request', { requestId });
      console.log('Joined request room:', requestId);
    }
  }

  // Leave a service request room
  leaveRequest(requestId) {
    if (this.requestNamespace && this.requestNamespace.connected) {
      this.requestNamespace.emit('leave_request', { requestId });
      console.log('Left request room:', requestId);
    }
  }

  // Update location (for mechanics)
  updateLocation(location) {
    if (this.requestNamespace && this.requestNamespace.connected) {
      this.requestNamespace.emit('location-update', {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy || 10,
      });
    }
  }

  // Send chat message
  sendMessage(requestId, message, sender = 'customer') {
    if (this.requestNamespace && this.requestNamespace.connected) {
      this.requestNamespace.emit('send-message', {
        requestId,
        message,
        sender,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Send emergency alert
  sendEmergencyAlert(requestId, alertType, location) {
    if (this.requestNamespace && this.requestNamespace.connected) {
      this.requestNamespace.emit('emergency-alert', {
        requestId,
        type: alertType,
        location,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Listen for request updates
  onRequestUpdate(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('request_updated', callback);
    }
  }

  // Listen for location updates
  onLocationUpdate(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('location_updated', callback);
    }
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('new-message', callback);
    }
  }

  // Listen for emergency alerts
  onEmergencyAlert(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('emergency-alert', callback);
    }
  }

  // Listen for mechanic assigned
  onMechanicAssigned(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('mechanic_assigned', callback);
    }
  }

  // Listen for service started
  onServiceStarted(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('service_started', callback);
    }
  }

  // Listen for service completed
  onServiceCompleted(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('service_completed', callback);
    }
  }

  // Listen for new request available (for mechanics)
  onNewRequestAvailable(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('new-request-available', callback);
    }
  }

  // Listen for request taken (for mechanics)
  onRequestTaken(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('request-taken', callback);
    }
  }

  // Listen for request accepted (for customers)
  onRequestAccepted(callback) {
    if (this.requestNamespace) {
      this.requestNamespace.on('request-accepted', callback);
    }
  }

  // Remove event listeners
  off(event, callback) {
    if (this.requestNamespace) {
      this.requestNamespace.off(event, callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.requestNamespace) {
      this.requestNamespace.disconnect();
      this.requestNamespace = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }

  // Get socket instance (for custom events)
  getSocket() {
    return this.socket;
  }

  // Get request namespace instance
  getRequestNamespace() {
    return this.requestNamespace;
  }
}

const socketService = new SocketService();
export default socketService;
