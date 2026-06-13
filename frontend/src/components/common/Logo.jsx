import React from "react";
import { motion } from "framer-motion";

const Logo = ({
  className = "h-12 w-12",
  showText = false,
  textClass = "text-2xl font-bold",
  logoColorClass = "text-white",
  onClick
}) => {

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }

    if (window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={handleClick}
      className="flex items-center gap-3 select-none group cursor-pointer"
    >
      <div className={className}>
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full ${logoColorClass}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>{`
            @keyframes logo-gear-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .gear-spin {
              animation: logo-gear-spin 20s linear infinite;
              transform-origin: 60px 60px;
              transition: animation-duration 0.4s ease;
            }
            .group:hover .gear-spin {
              animation-duration: 5s;
            }
            .wrench-hover {
              transform: rotate(-45deg);
              transform-origin: 28px 28px;
              transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .group:hover .wrench-hover {
              transform: rotate(-30deg);
            }
          `}</style>

          <defs>
            {/* Rich Red-to-Orange Brand Gradient */}
            <linearGradient id="logo-accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>

            {/* Mask for hollow gear cutout */}
            <mask id="gear-hole-mask">
              <rect x="0" y="0" width="120" height="120" fill="white" />
              <circle cx="60" cy="60" r="31.5" fill="black" />
            </mask>

            {/* Mask for vertical wrench head cutout */}
            <mask id="vertical-wrench-mask">
              <rect x="0" y="0" width="120" height="120" fill="white" />
              <path
                d="M 22 10 
                   L 34 10 
                   L 34 26 
                   L 28 32 
                   L 22 26 
                   Z"
                fill="black"
              />
            </mask>
          </defs>

          {/* Hollow Red-Orange Gear Outline (spins slowly, faster on hover) */}
          <g mask="url(#gear-hole-mask)" className="gear-spin">
            <circle cx="60" cy="60" r="36" fill="url(#logo-accent-grad)" opacity="0.9" />
            {/* 8 Gear teeth */}
            <rect x="54" y="14" width="12" height="12" rx="2.5" fill="url(#logo-accent-grad)" opacity="0.9" />
            <rect x="54" y="14" width="12" height="12" rx="2.5" fill="url(#logo-accent-grad)" opacity="0.9" transform="rotate(45 60 60)" />
            <rect x="54" y="14" width="12" height="12" rx="2.5" fill="url(#logo-accent-grad)" opacity="0.9" transform="rotate(90 60 60)" />
            <rect x="54" y="14" width="12" height="12" rx="2.5" fill="url(#logo-accent-grad)" opacity="0.9" transform="rotate(135 60 60)" />
            <rect x="54" y="14" width="12" height="12" rx="2.5" fill="url(#logo-accent-grad)" opacity="0.9" transform="rotate(180 60 60)" />
            <rect x="54" y="14" width="12" height="12" rx="2.5" fill="url(#logo-accent-grad)" opacity="0.9" transform="rotate(225 60 60)" />
            <rect x="54" y="14" width="12" height="12" rx="2.5" fill="url(#logo-accent-grad)" opacity="0.9" transform="rotate(270 60 60)" />
            <rect x="54" y="14" width="12" height="12" rx="2.5" fill="url(#logo-accent-grad)" opacity="0.9" transform="rotate(315 60 60)" />
          </g>

          {/* Red-Orange Partial Circle Outline */}
          <path
            d="M 38 34 A 34 34 0 1 1 38 86"
            stroke="url(#logo-accent-grad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Wrench graphic (wiggles on hover) */}
          <g className="wrench-hover">
            {/* Wrench handle extending towards center-right */}
            <path
              d="M 28 28 L 28 85"
              stroke="currentColor"
              strokeWidth="9.5"
              strokeLinecap="round"
            />
            {/* Wrench Head with jaw cutout applied */}
            <g mask="url(#vertical-wrench-mask)">
              <circle cx="28" cy="28" r="14" fill="currentColor" />
            </g>
          </g>
        </svg>
      </div>

      {showText && (
        <span className={`${textClass} tracking-tight select-none`}>
          <span className="text-white">Snap</span>
          <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Fix</span>
        </span>
      )}
    </motion.div>
  );
};

export default Logo;
