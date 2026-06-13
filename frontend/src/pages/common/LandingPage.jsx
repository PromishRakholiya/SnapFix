import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  WrenchScrewdriverIcon,
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  StarIcon,
  ArrowRightIcon,
  CheckIcon,
  BoltIcon,
  SignalIcon,
  PhoneIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Logo from "../../components/common/Logo";

/* ─── Static Data ─────────────────────────────────────────────── */
const stats = [
  { value: "50K+", label: "Happy Customers" },
  { value: "8K+", label: "Expert Mechanics" },
  { value: "99%", label: "Success Rate" },
  { value: "24/7", label: "Always Available" },
];

const features = [
  {
    icon: <WrenchScrewdriverIcon className="h-6 w-6" />,
    color: "from-red-500/20 to-red-600/5",
    accent: "text-red-400",
    border: "border-red-500/20",
    title: "Verified Experts",
    description:
      "Every mechanic is background-checked, licensed, and rated by real customers before joining.",
  },
  {
    icon: <MapPinIcon className="h-6 w-6" />,
    color: "from-accent/20 to-accent-600/5",
    accent: "text-accent",
    border: "border-accent/20",
    title: "Live GPS Tracking",
    description:
      "Watch your mechanic arrive in real time on an interactive map. No more guessing.",
  },
  {
    icon: <BoltIcon className="h-6 w-6" />,
    color: "from-warning-500/20 to-warning-600/5",
    accent: "text-warning-400",
    border: "border-warning-500/20",
    title: "< 30 Min Response",
    description:
      "Our network dispatch system connects you with the nearest available mechanic instantly.",
  },
  {
    icon: <ShieldCheckIcon className="h-6 w-6" />,
    color: "from-success-500/20 to-success-600/5",
    accent: "text-success-400",
    border: "border-success-500/20",
    title: "Secure & Insured",
    description:
      "Every job is insured. Pay safely through our escrow-style payment system.",
  },
  {
    icon: <SignalIcon className="h-6 w-6" />,
    color: "from-primary-500/20 to-primary-600/5",
    accent: "text-primary-400",
    border: "border-primary-500/20",
    title: "Real-time Chat",
    description:
      "Message your mechanic directly inside the app. No more waiting on hold.",
  },
  {
    icon: <StarIcon className="h-6 w-6" />,
    color: "from-accent/20 to-accent-600/5",
    accent: "text-accent",
    border: "border-accent/20",
    title: "Guaranteed Quality",
    description:
      "Rate your experience after every service. Low ratings trigger automatic review.",
  },
];

const testimonials = [
  {
    name: "Ayaan Kapoor",
    role: "Got flat tire fixed",
    content:
      "Mechanic arrived in 18 minutes on a highway at 2AM. I was shocked. 10/10 service.",
    rating: 5,
    initials: "AK",
    color: "from-red-500 to-orange-600",
  },
  {
    name: "Priya Sharma",
    role: "Battery replacement",
    content:
      "The live tracking was so reassuring — I could see him coming in real-time. Super professional.",
    rating: 5,
    initials: "PS",
    color: "from-purple-500 to-pink-600",
  },
  {
    name: "Rahul Mehta",
    role: "Mechanic Partner",
    content:
      "Best platform to grow my mechanic business. 3x more jobs since I joined SnapFix.",
    rating: 5,
    initials: "RM",
    color: "from-emerald-500 to-teal-600",
  },
];

const steps = [
  {
    num: "01",
    title: "Describe your issue",
    desc: "Select the problem type, add location and expected budget in 60 seconds.",
  },
  {
    num: "02",
    title: "Get matched instantly",
    desc: "Our system dispatches the nearest verified mechanic automatically.",
  },
  {
    num: "03",
    title: "Track & Chat",
    desc: "Live GPS tracking and in-app chat keep you informed every step of the way.",
  },
  {
    num: "04",
    title: "Pay & Rate",
    desc: "Secure payment after the job is done. Rate to help the community.",
  },
];

/* ─── Animation variants ──────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.6, delay: i * 0.1 },
  }),
};

/* ─── Interactive Simulator Component ─────────────────────────── */
const InteractiveSimulator = () => {
  const [activeSim, setActiveSim] = useState(null);
  const [simStep, setSimStep] = useState(0);
  const [eta, setEta] = useState(12);

  useEffect(() => {
    let etaInterval = null;
    if (activeSim) {
      setSimStep(0);
      setEta(12);
      
      // Step 1: Matching
      const t1 = setTimeout(() => {
        setSimStep(1);
      }, 1500);

      // Step 2: Routing
      const t2 = setTimeout(() => {
        setSimStep(2);
        // Countdown ETA
        etaInterval = setInterval(() => {
          setEta(prev => (prev > 1 ? prev - 1 : 1));
        }, 1200);
      }, 3500);

      // Step 3: Arrived
      const t3 = setTimeout(() => {
        setSimStep(3);
        setEta(0);
        if (etaInterval) clearInterval(etaInterval);
      }, 8500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        if (etaInterval) clearInterval(etaInterval);
      };
    }
  }, [activeSim]);

  const scenarios = [
    { id: 'flat_tire', label: 'Flat Tire Rescue', icon: <WrenchScrewdriverIcon className="h-5 w-5" />, desc: 'Spare tire installation or flat tire patch.' },
    { id: 'dead_battery', label: 'Battery Jumpstart', icon: <BoltIcon className="h-5 w-5" />, desc: 'Dead battery jumpstart or new battery replacement.' },
    { id: 'engine_smoke', label: 'Engine Smoke', icon: <SignalIcon className="h-5 w-5" />, desc: 'Overheated engine or fluid leak diagnosis.' },
    { id: 'lockout', label: 'Lockout Assist', icon: <ShieldCheckIcon className="h-5 w-5" />, desc: 'Keys locked inside the vehicle or key replacement.' }
  ];

  return (
    <section className="py-28 px-6 relative overflow-hidden bg-[#090909]/40 border-t border-b border-white/[0.04]">
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-orange-500/5 pointer-events-none" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-4">Live Demo</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
            Experience <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">SnapFix Live</span>
          </h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto mt-4">
            Select a roadside breakdown scenario below to see how our instant GPS dispatch and live tracking systems operate.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Controls & Logs Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between glass-panel p-8 rounded-3xl border border-white/[0.06] bg-white/[0.02]">
            <div>
              <h3 className="text-lg font-bold text-white mb-6">1. Choose a Scenario</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {scenarios.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSim(s.id)}
                    className={`flex flex-col items-start p-5 rounded-2xl border text-left transition-all duration-300 ${
                      activeSim === s.id
                        ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                    }`}
                  >
                    <span className={`p-2 bg-white/[0.06] rounded-xl mb-3 ${activeSim === s.id ? 'text-red-400' : 'text-neutral-400'}`}>{s.icon}</span>
                    <span className="text-sm font-bold text-white">{s.label}</span>
                    <span className="text-xs text-neutral-500 mt-1 line-clamp-2">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Timeline Logs */}
            <div className="mt-8 border-t border-white/[0.06] pt-6">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Simulation Logs</h3>
              <div className="space-y-4">
                {!activeSim ? (
                  <p className="text-neutral-500 text-sm italic">Select a scenario above to start the live simulation...</p>
                ) : (
                  <div className="space-y-4">
                    {/* Log 1 */}
                    <div className="flex items-start gap-3 text-sm">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <div>
                        <p className="font-semibold text-white">Emergency Request Broadcasted</p>
                        <p className="text-xs text-neutral-500">Searching coordinates within 3km radius...</p>
                      </div>
                    </div>

                    {/* Log 2 */}
                    {simStep >= 1 && (
                      <div className="flex items-start gap-3 text-sm animate-fade-in">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <div>
                          <p className="font-semibold text-white">Mechanic Found & Dispatched</p>
                          <div className="flex items-center gap-3 mt-2 p-2.5 bg-white/[0.04] rounded-xl border border-white/[0.05]">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center font-bold text-xs text-black">SV</div>
                            <div>
                              <p className="text-xs font-bold text-white">Sunil Verma (4.9 ★)</p>
                              <p className="text-[10px] text-neutral-500 font-medium">Tata Winger Mobile Workshop</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Log 3 */}
                    {simStep >= 2 && (
                      <div className="flex items-start gap-3 text-sm animate-fade-in">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <div>
                          <p className="font-semibold text-white">Live Route Navigation Active</p>
                          <p className="text-xs text-red-400 font-semibold mt-0.5">ETA: {eta} minutes · Live GPS tracking enabled</p>
                        </div>
                      </div>
                    )}

                    {/* Log 4 */}
                    {simStep === 3 && (
                      <div className="flex items-start gap-3 text-sm animate-fade-in">
                        <span className="text-green-500 mt-0.5">🎉</span>
                        <div>
                          <p className="font-semibold text-white">Help Arrived!</p>
                          <p className="text-xs text-neutral-400">Mechanic has safely reached your coordinates.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Live Map Simulator */}
          <div className="lg:col-span-7 h-[500px] relative rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0c0c0c] shadow-2xl flex items-center justify-center">
            {/* Map Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {!activeSim ? (
              <div className="text-center p-8 z-10">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="text-2xl">🛰️</span>
                </div>
                <h4 className="text-lg font-bold text-white">Interactive Map Simulator</h4>
                <p className="text-neutral-500 text-sm max-w-sm mt-2 mx-auto">
                  Pick a breakdown category to watch the map dynamically search, match, and route the mechanic in real time.
                </p>
              </div>
            ) : (
              <div className="w-full h-full relative p-4 flex items-center justify-center">
                <svg className="w-full h-full absolute inset-0" viewBox="0 0 500 400">
                  <defs>
                    <pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="500" height="400" fill="url(#map-grid)" />

                  {/* Search Radius Animation in Step 0 */}
                  {simStep === 0 && (
                    <circle cx="250" cy="200" r="10" fill="#ef4444" opacity="0.3">
                      <animate attributeName="r" values="10;140;10" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Route path */}
                  {simStep >= 2 && (
                    <path
                      d="M 120 280 Q 200 120 250 200"
                      stroke="#ef4444"
                      strokeWidth="3.5"
                      strokeDasharray="8 6"
                      fill="none"
                    >
                      <animate attributeName="stroke-dashoffset" values="100;0" dur="15s" repeatCount="indefinite" />
                    </path>
                  )}

                  {/* User Car Marker */}
                  <g transform="translate(250, 200)">
                    <circle cx="0" cy="0" r="24" fill="#10b981" opacity="0.15" className="animate-pulse" />
                    <circle cx="0" cy="0" r="9" fill="#10b981" />
                    <text y="-28" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="800" letterSpacing="0.05em">YOUR CAR</text>
                  </g>

                  {/* Mechanic Marker */}
                  {simStep >= 1 && (
                    <g 
                      transform={simStep === 3 ? "translate(250, 200)" : "translate(120, 280)"}
                      style={{ transition: 'transform 5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                    >
                      <circle cx="0" cy="0" r="24" fill="#ef4444" opacity="0.15" />
                      <circle cx="0" cy="0" r="9" fill="#ef4444" />
                      <text y="-28" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="800" letterSpacing="0.05em">MECHANIC</text>
                    </g>
                  )}
                </svg>

                {/* Live Status Overlay */}
                <div className="absolute top-6 left-6 right-6 bg-[#121212]/95 backdrop-blur-md border border-white/[0.08] p-5 rounded-2xl flex items-center justify-between shadow-2xl">
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Dispatch Status</p>
                    <p className="text-sm font-bold text-white mt-1">
                      {simStep === 0 && 'Searching for nearest mechanics...'}
                      {simStep === 1 && 'Connecting Sunil Verma...'}
                      {simStep === 2 && 'En Route to your coordinates'}
                      {simStep === 3 && 'Help has arrived at scene'}
                    </p>
                  </div>
                  {simStep >= 2 && (
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Estimated Arrival</p>
                      <p className="text-sm font-black text-red-400 mt-1">{eta > 0 ? `${eta} mins` : 'Arrived'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Component ───────────────────────────────────────────────── */
const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden font-['Sora',sans-serif]">
      {/* ── Ambient background blobs ─────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-red-500/8 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-red-600/5 blur-[120px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Navbar ───────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#080808]/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-18 py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 group">
            <Logo className="h-9 w-9" showText={true} textClass="text-xl font-bold tracking-tight text-white" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it works", "Testimonials"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm text-neutral-400 hover:text-white transition-colors duration-200 font-medium"
              >
                {item}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-neutral-400 hover:text-white"
          >
            <div className="w-5 h-0.5 bg-current mb-1 transition-all" />
            <div className="w-5 h-0.5 bg-current mb-1 transition-all" />
            <div className="w-3.5 h-0.5 bg-current transition-all" />
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/[0.06] bg-[#0d0d0d] px-6 py-4 space-y-3"
            >
              {["Features", "How it works", "Testimonials"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  onClick={() => setMenuOpen(false)}
                  className="block text-sm text-neutral-400 hover:text-white py-2"
                >
                  {item}
                </a>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="text-center text-sm text-neutral-400 py-2 border border-white/[0.08] rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-center text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 py-2.5 rounded-xl"
                >
                  Get Started Free
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-32">
        {/* Badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          India's #1 Roadside Assistance Platform
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6 max-w-5xl"
        >
          Stuck on the{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-red-500 via-orange-500 to-red-600 bg-clip-text text-transparent">
              road?
            </span>
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 300 12"
              fill="none"
            >
              <path
                d="M0 8 Q75 2 150 8 Q225 14 300 8"
                stroke="url(#u)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <defs>
                <linearGradient
                  id="u"
                  x1="0"
                  y1="0"
                  x2="300"
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#ef4444" />
                  <stop offset="1" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>
          </span>{" "}
          We'll get <br className="hidden md:block" />
          you moving.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="text-lg md:text-xl text-neutral-400 max-w-2xl leading-relaxed mb-10"
        >
          SnapFix connects you with verified mechanics in under 30 minutes —
          anywhere, anytime. Live tracking, secure payments, and 24/7 support
          included.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <Link
            to="/register"
            className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold px-8 py-4 rounded-2xl text-base shadow-xl shadow-red-500/20 hover:shadow-red-500/30 transition-all duration-300 hover:-translate-y-1"
          >
            Get Help Now — It's Free
            <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/register?role=mechanic"
            className="inline-flex items-center gap-2.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] hover:border-white/[0.2] text-white font-semibold px-8 py-4 rounded-2xl text-base backdrop-blur-md transition-all duration-300 hover:-translate-y-1"
          >
            <WrenchScrewdriverIcon className="h-4 w-4 text-red-500" />
            Join as Mechanic
          </Link>
        </motion.div>

        {/* Social proof row */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          custom={4}
          className="flex flex-col sm:flex-row items-center gap-6 text-sm text-neutral-500"
        >
          <div className="flex -space-x-3">
            {["AK", "PS", "RM", "JD", "SV"].map((init, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-[#080808] bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center text-xs font-bold text-white"
                style={{ zIndex: 5 - i }}
              >
                {init}
              </div>
            ))}
          </div>
          <div>
            <span className="text-white font-semibold">50,000+</span> customers
            helped this year &nbsp;·&nbsp;
            <span className="text-red-500">★ 4.9/5</span> average rating
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-neutral-600"
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDownIcon className="h-4 w-4 animate-bounce" />
        </motion.div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <section className="relative py-12 border-y border-white/[0.05]">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-orange-500/5" />
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-1">
                {s.value}
              </div>
              <div className="text-sm text-neutral-500 font-medium">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-4">
              Why SnapFix
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              Everything you need,{" "}
              <span className="text-red-500">nothing you don't</span>
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Built from the ground up to handle roadside emergencies with
              speed, reliability and transparency.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.5}
                className={`group relative p-7 rounded-3xl border ${f.border} bg-gradient-to-br ${f.color} backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-default`}
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.06] ${f.accent} mb-5 group-hover:scale-110 transition-transform duration-300`}
                >
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {f.description}
                </p>
                <div
                  className={`absolute bottom-6 right-6 w-6 h-6 rounded-full bg-gradient-to-br opacity-30 group-hover:opacity-60 transition-opacity ${f.color}`}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <InteractiveSimulator />

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/3 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-4">
              Process
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              Help in 4 simple steps
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={idx * 0.15}
                className="text-center group"
              >
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-2xl font-black text-red-500 mx-auto mb-6 group-hover:scale-110 group-hover:bg-red-500 group-hover:text-black transition-all duration-300">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section id="testimonials" className="py-28 px-6 bg-[#090909]/20 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-4">
              Reviews
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              What our users say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={idx * 0.15}
                className="glass-panel p-8 rounded-3xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
              >
                <div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(t.rating)].map((_, i) => (
                      <StarIcon key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-neutral-300 text-base italic leading-relaxed mb-6">
                    "{t.content}"
                  </p>
                </div>
                <div className="flex items-center gap-4 border-t border-white/[0.06] pt-6">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${t.color} flex items-center justify-center font-bold text-sm text-black`}>
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{t.name}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="glass-panel p-12 md:p-16 rounded-3xl border border-white/[0.06] bg-white/[0.02]"
          >
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-neutral-400 text-lg mb-10 max-w-2xl mx-auto">
              Join thousands of satisfied users and experience reliable roadside assistance today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 hover:-translate-y-1"
              >
                Get Help Now — It's Free
                <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 hover:-translate-y-1"
              >
                Already have an account?
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-neutral-500">
              {[
                "No credit card required",
                "Cancel anytime",
                "Trusted by 50K+ users",
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-red-400" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-1">
            <Logo className="h-8 w-8" showText={true} textClass="font-bold text-lg text-white" />
          </Link>
          <div className="flex gap-6 text-sm text-neutral-500">
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-white transition-colors">
              Register
            </Link>
            <Link
              to="/register?role=mechanic"
              className="hover:text-white transition-colors"
            >
              Become a Mechanic
            </Link>
          </div>
          <p className="text-neutral-600 text-sm">
            © 2025 SnapFix. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
