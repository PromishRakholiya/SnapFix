import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  return (
    <header className="bg-[#111111]/80 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-30">
      <div className="px-4 sm:px-8 h-20 flex items-center justify-between">
        {/* Left Side: Mobile Menu Toggle & Welcome */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-neutral-400 hover:text-white lg:hidden focus:outline-none flex-shrink-0"
            aria-label="Open sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate">
              Welcome back, {user?.name?.split(" ")[0] || "User"}! 👋
            </h1>
            <p className="text-xs sm:text-sm font-medium text-neutral-500 capitalize mt-0.5 sm:mt-1">
              {user?.role} Dashboard
            </p>
          </div>
        </div>

        {/* Right Side: Actions & Profile */}
        <div className="flex items-center space-x-4">

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-3 p-1.5 pr-4 bg-white/[0.05] border border-white/[0.08] rounded-2xl hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200"
            >
              <div className="h-10 w-10 bg-gradient-to-tr from-primary-500/20 to-accent-dark/20 rounded-xl flex items-center justify-center border border-primary-500/20">
                <UserCircleIcon className="h-7 w-7 text-primary-400" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-white leading-tight">
                  {user?.name}
                </p>
                <p className="text-xs font-semibold text-neutral-500 capitalize">
                  {user?.role}
                </p>
              </div>
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-56 bg-[#1a1a1a] border border-white/[0.08] shadow-2xl py-2 z-50 origin-top-right rounded-2xl backdrop-blur-xl"
                >
                  <div className="px-4 py-3 border-b border-white/[0.06] mb-1">
                    <p className="text-sm font-bold text-white">{user?.name}</p>
                    <p className="text-xs text-neutral-500 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="px-2">
                    <button
                      className="block w-full text-left px-3 py-2.5 text-sm font-medium text-neutral-400 hover:bg-white/[0.05] hover:text-primary-400 rounded-xl transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      Profile Settings
                    </button>
                    <button
                      className="block w-full text-left px-3 py-2.5 text-sm font-medium text-neutral-400 hover:bg-white/[0.05] hover:text-primary-400 rounded-xl transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      Preferences
                    </button>
                  </div>

                  <div className="px-2 mt-1 border-t border-white/[0.06] pt-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-2.5 text-sm font-bold text-danger-400 hover:bg-danger-500/10 rounded-xl transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
