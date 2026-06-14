
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import mechanicApi from '../api/mechanicApi';
import socketService from '../services/socketService';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../components/common/PageTransition';

import MechanicDashboard from '../pages/mechanic/Dashboard';
import AssignedRequests from '../pages/mechanic/AssignedRequests';
import Earnings from '../pages/mechanic/Earnings';
import Profile from '../pages/mechanic/Profile';
import Calendar from '../pages/mechanic/Calendar';
import VerificationForm from '../components/mechanic/VerificationForm';
import Chat from '../pages/mechanic/Chat';
import MechanicLiveTracker from '../pages/mechanic/MechanicLiveTracker';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';

const AnimatedMechanicRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="dashboard" element={<PageTransition><MechanicDashboard /></PageTransition>} />
        <Route path="requests" element={<PageTransition><AssignedRequests /></PageTransition>} />
        <Route path="requests/:requestId/track" element={<PageTransition><MechanicLiveTracker /></PageTransition>} />
        <Route path="calendar" element={<PageTransition><Calendar /></PageTransition>} />
        <Route path="earnings" element={<PageTransition><Earnings /></PageTransition>} />
        <Route path="chat/*" element={<PageTransition><Chat /></PageTransition>} />
        <Route path="verification" element={<PageTransition><VerificationForm /></PageTransition>} />
        <Route path="profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const MechanicLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  
  const watchIdRef = useRef(null);
  const activeRequestRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    let pollInterval = null;

    const checkActiveRequests = async () => {
      try {
        const response = await mechanicApi.getAssignedRequests({ limit: 10 });
        if (response.success) {
          const items = response.data.items || response.data.requests || [];
          const active = items.find(r => r.status === 'assigned' || r.status === 'enroute');
          
          if (active) {
            if (activeRequestRef.current?._id !== active._id) {
              stopWatching();
              activeRequestRef.current = active;
              startWatching(active);
            } else {
              startWatching(active);
            }
          } else {
            activeRequestRef.current = null;
            stopWatching();
          }
        }
      } catch (error) {
        console.error('Error fetching requests in background tracker:', error);
      }
    };

    const startWatching = async (activeRequest) => {
      if (!activeRequest || !activeRequest._id) return;
      const requestId = activeRequest._id;
      if (watchIdRef.current) return;

      // Ensure mechanic joins socket request room
      socketService.joinRequest(requestId);

      const simulateFlag = localStorage.getItem(`simulate_${requestId}`) === 'true';

      if (simulateFlag) {
        console.log(`Starting simulated geolocation watch for request: ${requestId}`);
        
        let routeCoords = [];
        try {
          let startLat = user.location?.lat || 22.30389;
          let startLng = user.location?.lng || 70.80216;
          
          if (navigator.geolocation) {
            const pos = await new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 3000 });
            });
            if (pos) {
              startLat = pos.coords.latitude;
              startLng = pos.coords.longitude;
            }
          }

          if (activeRequest.location && activeRequest.location.lat && activeRequest.location.lng) {
            const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${activeRequest.location.lng},${activeRequest.location.lat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              routeCoords = data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
            }
          }
        } catch (err) {
          console.error("OSRM simulation generation failed, using direct interpolation:", err);
        }

        if (routeCoords.length === 0) {
          const startLat = user.location?.lat || 22.30389;
          const startLng = user.location?.lng || 70.80216;
          const destLat = activeRequest.location?.lat || startLat;
          const destLng = activeRequest.location?.lng || startLng;
          
          for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            routeCoords.push({
              lat: startLat + (destLat - startLat) * t,
              lng: startLng + (destLng - startLng) * t
            });
          }
        }

        let stepIndex = 0;
        const intervalId = setInterval(() => {
          if (stepIndex >= routeCoords.length) {
            clearInterval(intervalId);
            console.log("Simulated journey complete.");
            return;
          }

          const currentPoint = routeCoords[stepIndex];
          socketService.updateLocation(
            {
              lat: currentPoint.lat,
              lng: currentPoint.lng,
              accuracy: 5,
              heading: 0,
              speed: 10
            },
            requestId,
            user._id
          );
          console.log(`Emitted simulated step ${stepIndex + 1}/${routeCoords.length}:`, currentPoint);
          stepIndex++;
        }, 3000);

        watchIdRef.current = {
          type: 'simulation',
          clear: () => clearInterval(intervalId)
        };
      } else {
        if (navigator.geolocation) {
          console.log(`Starting real geolocation watch for request: ${requestId}`);
          const watchId = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude, longitude, accuracy, heading, speed } = position.coords;
              socketService.updateLocation(
                {
                  lat: latitude,
                  lng: longitude,
                  accuracy: accuracy || 10,
                  heading,
                  speed
                },
                requestId,
                user._id
              );
            },
            (error) => {
              console.error('Background geolocation error:', error);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 0,
              timeout: 10000
            }
          );
          watchIdRef.current = {
            type: 'real',
            clear: () => navigator.geolocation.clearWatch(watchId)
          };
        } else {
          console.warn('Geolocation is not supported by this browser.');
        }
      }
    };

    const stopWatching = () => {
      if (watchIdRef.current) {
        console.log('Stopping watcher');
        watchIdRef.current.clear();
        watchIdRef.current = null;
      }
      if (activeRequestRef.current?._id) {
        socketService.leaveRequest(activeRequestRef.current._id);
      }
    };

    checkActiveRequests();
    pollInterval = setInterval(checkActiveRequests, 10000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      stopWatching();
    };
  }, [user]);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/mechanic/dashboard',
      icon: 'HomeIcon',
    },
    {
      name: 'Assigned Requests',
      href: '/mechanic/requests',
      icon: 'WrenchScrewdriverIcon',
    },
    {
      name: 'Calendar',
      href: '/mechanic/calendar',
      icon: 'CalendarIcon',
    },
    {
      name: 'Earnings',
      href: '/mechanic/earnings',
      icon: 'CurrencyDollarIcon',
    },
    {
      name: 'Messages',
      href: '/mechanic/chat',
      icon: 'ChatBubbleLeftIcon',
    },
    {
      name: 'Verification',
      href: '/mechanic/verification',
      icon: 'DocumentTextIcon',
    },
    {
      name: 'Profile',
      href: '/mechanic/profile',
      icon: 'UserIcon',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-hidden">
      <div className="flex h-screen relative">
        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}

        <Sidebar
          navigationItems={navigationItems}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-screen-xl mx-auto px-4 py-6 sm:py-8">
              <AnimatedMechanicRoutes />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default MechanicLayout;
