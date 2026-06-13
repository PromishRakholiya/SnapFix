import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../components/common/PageTransition';

import AdminDashboard from '../pages/admin/Dashboard';
import UserManagement from '../pages/admin/UserManagement';
import ServiceRequests from '../pages/admin/ServiceRequests';
import VerificationManagement from '../pages/admin/VerificationManagement';
import Analytics from '../pages/admin/Analytics';
import Settings from '../pages/admin/Settings';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';

const AnimatedAdminRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="dashboard" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="users" element={<PageTransition><UserManagement /></PageTransition>} />
        <Route path="service-requests" element={<PageTransition><ServiceRequests /></PageTransition>} />
        <Route path="verifications" element={<PageTransition><VerificationManagement /></PageTransition>} />
        <Route path="analytics" element={<PageTransition><Analytics /></PageTransition>} />
        <Route path="settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: 'HomeIcon',
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: 'UsersIcon',
    },
    {
      name: 'Service Requests',
      href: '/admin/service-requests',
      icon: 'WrenchScrewdriverIcon',
    },
    {
      name: 'Verifications',
      href: '/admin/verifications',
      icon: 'DocumentTextIcon',
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: 'ChartBarIcon',
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: 'CogIcon',
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
              <AnimatedAdminRoutes />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
