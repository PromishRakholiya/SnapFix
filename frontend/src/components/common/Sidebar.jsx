import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "./Logo";
import {
  HomeIcon,
  PlusCircleIcon,
  ClockIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

const iconMap = {
  HomeIcon,
  PlusCircleIcon,
  ClockIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  CreditCardIcon,
};

const Sidebar = ({ navigationItems }) => {
  const location = useLocation();

  return (
    <div className="w-72 flex-shrink-0 bg-[#111111] border-r border-white/[0.06] flex flex-col h-full z-20 relative">
      {/* Brand */}
      <div className="p-8">
        <Link to="/">
          <Logo className="h-12 w-12" showText={true} textClass="text-2xl font-bold" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-8 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = iconMap[item.icon] || HomeIcon;
            const isActive = location.pathname === item.href;

            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className="relative group flex items-center px-4 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-300"
                >
                  {isActive ? (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-primary-600/10 border border-primary-500/20 rounded-2xl"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 rounded-2xl group-hover:bg-white/[0.05] transition-colors" />
                  )}

                  <span
                    className={`relative flex items-center z-10 w-full transition-colors duration-300 ${isActive ? "text-primary-400" : "text-neutral-400 group-hover:text-neutral-200"}`}
                  >
                    <Icon
                      className={`mr-4 h-6 w-6 transition-transform duration-300 ${isActive ? "scale-110 text-primary-400" : "group-hover:scale-110"}`}
                    />
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
