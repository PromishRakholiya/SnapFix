
import React, { useState } from 'react';
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
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';

const AnimatedMechanicRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="dashboard" element={<PageTransition><MechanicDashboard /></PageTransition>} />
        <Route path="requests" element={<PageTransition><AssignedRequests /></PageTransition>} />
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
