import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../components/common/PageTransition';

import CustomerDashboard from '../pages/customer/Dashboard';
import BookService from '../pages/customer/BookService';
import RequestHistory from '../pages/customer/RequestHistory';
import PaymentHistory from '../pages/customer/PaymentHistory';
import Profile from '../pages/customer/Profile';
import MechanicDiscovery from '../pages/customer/MechanicDiscovery';
import Chat from '../pages/customer/Chat';
import CustomerLiveTracker from '../pages/customer/CustomerLiveTracker';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';

const AnimatedCustomerRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="dashboard" element={<PageTransition><CustomerDashboard /></PageTransition>} />
        <Route path="mechanics" element={<PageTransition><MechanicDiscovery /></PageTransition>} />

        <Route path="book-service" element={<PageTransition><BookService /></PageTransition>} />
        <Route path="requests" element={<PageTransition><RequestHistory /></PageTransition>} />
        <Route path="requests/:requestId/track" element={<PageTransition><CustomerLiveTracker /></PageTransition>} />
        <Route path="payments" element={<PageTransition><PaymentHistory /></PageTransition>} />
        <Route path="chat" element={<PageTransition><Chat /></PageTransition>} />
        <Route path="profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const CustomerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/customer/dashboard',
      icon: 'HomeIcon',
    },
    {
      name: 'Find Mechanics',
      href: '/customer/mechanics',
      icon: 'WrenchScrewdriverIcon',
    },
    {
      name: 'Request History',
      href: '/customer/requests',
      icon: 'ClockIcon',
    },
    {
      name: 'Payments',
      href: '/customer/payments',
      icon: 'CreditCardIcon',
    },
    {
      name: 'Messages',
      href: '/customer/chat',
      icon: 'ChatBubbleLeftIcon',
    },
    {
      name: 'Profile',
      href: '/customer/profile',
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
              <AnimatedCustomerRoutes />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerLayout;
