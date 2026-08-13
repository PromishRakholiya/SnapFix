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
  MagnifyingGlassIcon,
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
    title: "Competitive Offers",
    description:
      "Our network broadcasts your request to mechanics in your area so you can get competitive offers instantly.",
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
    title: "Broadcast & Get Offers",
    desc: "Your request is broadcasted to nearby mechanics who will send you competitive offers.",
  },
  {
    num: "03",
    title: "Accept & Track",
    desc: "Choose the best offer. Track your mechanic with live GPS and chat in-app.",
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
const mockMechanics = [
  {
    id: "sunil",
    name: "Sunil Verma",
    rating: "4.9",
    reviews: 142,
    specialty: "Tire & Wheel Expert",
    skills: ["tire", "flat tire", "puncture", "wheel", "alignment", "mechanic"],
    vehicle: "Tata Winger Mobile Workshop",
    distance: "1.8 km",
    eta: 8,
    color: "from-red-500 to-orange-600",
    markerColor: "#ef4444",
    x: 120,
    y: 280,
    path: "M 120 280 Q 180 220 250 200"
  },
  {
    id: "amit",
    name: "Amit Patel",
    rating: "4.8",
    reviews: 98,
    specialty: "Battery & Electricals",
    skills: ["battery", "jumpstart", "alternator", "wiring", "electrical", "mechanic"],
    vehicle: "Maruti Eeco Mobile Unit",
    distance: "2.4 km",
    eta: 11,
    color: "from-amber-500 to-yellow-600",
    markerColor: "#f59e0b",
    x: 380,
    y: 120,
    path: "M 380 120 Q 300 140 250 200"
  },
  {
    id: "rajesh",
    name: "Rajesh Kumar",
    rating: "4.7",
    reviews: 215,
    specialty: "Engine & Diagnostics",
    skills: ["engine", "smoke", "overheating", "fluid leak", "coolant", "brakes", "mechanic"],
    vehicle: "Mahindra Bolero Workshop",
    distance: "3.5 km",
    eta: 15,
    color: "from-blue-500 to-indigo-600",
    markerColor: "#3b82f6",
    x: 80,
    y: 100,
    path: "M 80 100 Q 160 130 250 200"
  },
  {
    id: "vikram",
    name: "Vikram Singh",
    rating: "4.9",
    reviews: 84,
    specialty: "Key & Lockout Specialist",
    skills: ["lockout", "keys", "door unlock", "car key", "lock", "mechanic"],
    vehicle: "Bajaj RE Auto Repair",
    distance: "1.2 km",
    eta: 6,
    color: "from-emerald-500 to-teal-600",
    markerColor: "#10b981",
    x: 420,
    y: 320,
    path: "M 420 320 Q 320 280 250 200"
  }
];

const InteractiveSimulator = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [hoveredMechanic, setHoveredMechanic] = useState(null);
  const [activeSim, setActiveSim] = useState(null);
  const [simStep, setSimStep] = useState(0);
  const [eta, setEta] = useState(12);

  const activeMech = mockMechanics.find(m => m.id === activeSim);

  useEffect(() => {
    let etaInterval = null;
    let t1 = null;
    let t2 = null;
    let t3 = null;

    if (activeSim && activeMech) {
      setSimStep(0);
      setEta(activeMech.eta);
      
      // Step 1: Request Accepted (after 1.5s)
      t1 = setTimeout(() => {
        setSimStep(1);
      }, 1500);

      // Step 2: En Route (after 3.0s)
      t2 = setTimeout(() => {
        setSimStep(2);
        // Countdown ETA
        etaInterval = setInterval(() => {
          setEta(prev => {
            if (prev > 2) return prev - 2;
            return 1;
          });
        }, 1000);
      }, 3000);

      // Step 3: Arrived (after 8.0s)
      t3 = setTimeout(() => {
        setSimStep(3);
        setEta(0);
        if (etaInterval) clearInterval(etaInterval);
      }, 8000);
    }

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
      if (etaInterval) clearInterval(etaInterval);
    };
  }, [activeSim, activeMech]);

  const filteredMechanics = mockMechanics.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.specialty.toLowerCase().includes(q) ||
      m.skills.some(s => s.includes(q))
    );
  });

  const handleSelectMechanic = (m) => {
    if (activeSim) return; // Disable selection during active simulation
    setSelectedMechanic(m);
  };

  const handleStartSim = () => {
    if (!selectedMechanic) return;
    setActiveSim(selectedMechanic.id);
  };

  const handleResetSim = () => {
    setActiveSim(null);
    setSimStep(0);
    setSelectedMechanic(null);
  };

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
            Search for verified mechanics near your location, and broadcast your request to receive competitive offers in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Controls & Logs Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between glass-panel p-5 sm:p-8 rounded-3xl border border-white/[0.06] bg-white/[0.02] min-h-[500px]">
            {!activeSim ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">1. Search & Select Mechanic</h3>
                  
                  {/* Search Field */}
                  <div className="relative mb-6">
                    <MagnifyingGlassIcon className="absolute left-4 top-3.5 h-5 w-5 text-neutral-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search specialty (e.g. battery, tire, engine)..."
                      className="w-full pl-12 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition-all text-sm"
                    />
                  </div>

                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">
                    {searchQuery ? `Search Results (${filteredMechanics.length})` : "Verified Mechanics Near You"}
                  </h4>

                  {/* Mechanics List */}
                  <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                    {filteredMechanics.length === 0 ? (
                      <p className="text-neutral-500 text-sm italic py-4 text-center">
                        No mechanics found matching "{searchQuery}". Try searching "tire" or "battery".
                      </p>
                    ) : (
                      filteredMechanics.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMechanic(m)}
                          onMouseEnter={() => setHoveredMechanic(m.id)}
                          onMouseLeave={() => setHoveredMechanic(null)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-300 ${
                            selectedMechanic?.id === m.id
                              ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/5'
                              : 'border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.12]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${m.color} flex items-center justify-center font-bold text-xs text-black`}>
                              {m.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white leading-tight">{m.name}</p>
                              <p className="text-xs text-neutral-500 mt-0.5">{m.specialty}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-red-500">★ {m.rating}</span>
                            <p className="text-[10px] text-neutral-500 mt-0.5">{m.distance}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Mechanic details */}
                <div className="mt-6 pt-6 border-t border-white/[0.06]">
                  {selectedMechanic ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-start justify-between">
                        <div>
                          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Selected Provider</p>
                          <h4 className="text-base font-bold text-white mt-1">{selectedMechanic.name}</h4>
                          <p className="text-xs text-neutral-400 mt-0.5">{selectedMechanic.vehicle}</p>
                          <p className="text-[10px] text-neutral-500 mt-2 font-medium">Reviews: {selectedMechanic.reviews} verified jobs</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Eta</p>
                          <p className="text-lg font-black text-red-500 mt-0.5">~{selectedMechanic.eta} Mins</p>
                          <p className="text-xs text-neutral-400 mt-0.5">{selectedMechanic.distance} away</p>
                        </div>
                      </div>

                      <button
                        onClick={handleStartSim}
                        className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                      >
                        <WrenchScrewdriverIcon className="h-4 w-4" />
                        Request {selectedMechanic.name.split(" ")[0]}
                      </button>
                    </motion.div>
                  ) : (
                    <p className="text-neutral-500 text-sm italic text-center py-4">
                      Select a nearby mechanic above to view details & broadcast your request...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              // Active Simulation Logs Screen
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Live Request Status</h3>
                    <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-bold text-red-500 animate-pulse">
                      Active tracking
                    </span>
                  </div>

                  {/* Real-time Logs List */}
                  <div className="space-y-4">
                    {/* Log 1: Sending request */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 text-sm"
                    >
                      <span className="text-red-500 mt-0.5">⚡</span>
                      <div>
                        <p className="font-semibold text-white">Sending request to {activeMech.name}</p>
                        <p className="text-xs text-neutral-500">Contacting specific technician near your location...</p>
                      </div>
                    </motion.div>

                    {/* Log 2: Accepted */}
                    {simStep >= 1 && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="text-green-500 mt-0.5">✓</span>
                        <div>
                          <p className="font-semibold text-white">Request Accepted</p>
                          <div className="flex items-center gap-3 mt-2 p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${activeMech.color} flex items-center justify-center font-bold text-xs text-black`}>
                              {activeMech.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{activeMech.name} ({activeMech.rating} ★)</p>
                              <p className="text-[10px] text-neutral-500 font-medium">{activeMech.vehicle}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Log 3: En route */}
                    {simStep >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="text-green-500 mt-0.5">✓</span>
                        <div>
                          <p className="font-semibold text-white">En Route & Live GPS Active</p>
                          <p className="text-xs text-red-400 font-semibold mt-0.5">
                            ETA: {eta} minutes · Live routing path active
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Log 4: Arrived */}
                    {simStep === 3 && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="text-green-500 mt-0.5">🎉</span>
                        <div>
                          <p className="font-semibold text-white">Help Has Arrived!</p>
                          <p className="text-xs text-neutral-400">{activeMech.name} has safely reached your coordinates.</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/[0.06]">
                  <button
                    onClick={handleResetSim}
                    className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white font-semibold py-3 px-6 rounded-2xl text-sm transition-all duration-300"
                  >
                    Reset & Search Again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Live Map Simulator */}
          <div className="lg:col-span-7 w-full min-h-[400px] sm:min-h-[500px] lg:h-[500px] relative rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0c0c0c] shadow-2xl flex items-center justify-center shrink-0">
            {/* Map Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* SVG Interactive Map */}
            <div className="w-full h-full relative p-4 flex items-center justify-center">
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 500 400">
                <defs>
                  <pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                  </pattern>
                  {/* Subtle shadows for markers */}
                  <filter id="marker-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
                  </filter>
                  {/* Define paths statically so <animateMotion> can reference them safely */}
                  {mockMechanics.map(m => (
                    <path key={m.id} id={`route-path-${m.id}`} d={m.path} fill="none" />
                  ))}
                </defs>
                
                {/* Grid */}
                <rect width="500" height="400" fill="url(#map-grid)" />

                {/* Draw Route Path if simulation is active (step >= 2) */}
                {activeSim && simStep >= 2 && (
                  <motion.path
                    id={`route-path-${activeSim}`}
                    d={activeMech.path}
                    stroke={activeMech.markerColor}
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                )}

                {/* Radar ripple on dispatch request (Step 0) */}
                {activeSim && simStep === 0 && (
                  <circle cx="250" cy="200" r="10" fill={activeMech.markerColor} opacity="0.3">
                    <animate attributeName="r" values="10;140;10" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* User Car Marker (Static Center) */}
                <g transform="translate(250, 200)" filter="url(#marker-shadow)">
                  <circle cx="0" cy="0" r="24" fill="#10b981" opacity="0.12" className="animate-pulse" />
                  <circle cx="0" cy="0" r="9" fill="#10b981" />
                  <circle cx="0" cy="0" r="4" fill="#fff" />
                  <text y="-28" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="800" letterSpacing="0.1em" className="select-none">YOUR CAR</text>
                </g>

                {/* Interactive/Searchable Mechanics Pins (Only shown when simulator is not running) */}
                {!activeSim && (
                  filteredMechanics.map(m => {
                    const isSelected = selectedMechanic?.id === m.id;
                    const isHovered = hoveredMechanic === m.id;
                    const scale = isSelected ? 1.3 : isHovered ? 1.15 : 1.0;
                    return (
                      <g
                        key={m.id}
                        transform={`translate(${m.x}, ${m.y})`}
                        onClick={() => handleSelectMechanic(m)}
                        className="cursor-pointer group"
                        filter="url(#marker-shadow)"
                        style={{ transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                      >
                        <g transform={`scale(${scale})`}>
                          <circle
                            cx="0"
                            cy="0"
                            r={isSelected ? "18" : "14"}
                            fill={m.markerColor}
                            opacity={isSelected ? "0.2" : "0.15"}
                            className="group-hover:scale-125 transition-transform"
                          />
                          <circle cx="0" cy="0" r="8" fill={m.markerColor} />
                          <circle cx="0" cy="0" r="3" fill="#fff" />
                        </g>
                        <text
                          y="-20"
                          textAnchor="middle"
                          fill={isSelected ? "#fff" : "#a3a3a3"}
                          fontSize="9"
                          fontWeight={isSelected ? "800" : "500"}
                          className="select-none pointer-events-none transition-colors"
                        >
                          {m.name.split(" ")[0]}
                        </text>
                      </g>
                    );
                  })
                )}

                {/* Simulating Mechanic Travel marker */}
                {activeSim && simStep >= 1 && (
                  <g>
                    {simStep === 1 && (
                      // Static start position
                      <g transform={`translate(${activeMech.x}, ${activeMech.y})`}>
                        {/* Vehicle Shape */}
                        <g transform="translate(-15, -8)">
                          <rect x="2" y="2" width="22" height="10" rx="2" fill={activeMech.markerColor} />
                          <path d="M 24 2 L 28 6 L 28 12 L 24 12 Z" fill={activeMech.markerColor} />
                          <rect x="18" y="4" width="5" height="3" rx="0.5" fill="#090909" />
                          <rect x="10" y="4" width="6" height="3" rx="0.5" fill="#090909" />
                          <circle cx="7" cy="13" r="3" fill="#121212" />
                          <circle cx="19" cy="13" r="3" fill="#121212" />
                          <circle cx="7" cy="13" r="1.2" fill="#fff" />
                          <circle cx="19" cy="13" r="1.2" fill="#fff" />
                        </g>
                        {/* Label */}
                        <g transform="translate(0, -22)">
                          <rect x="-24" y="-8" width="48" height="14" rx="4" fill="#121212" stroke={activeMech.markerColor} strokeWidth="1" opacity="0.95" />
                          <text textAnchor="middle" y="2" fill="#fff" fontSize="8" fontWeight="800" className="select-none">
                            {activeMech.name.split(" ")[0]}
                          </text>
                        </g>
                      </g>
                    )}

                    {simStep === 2 && (
                      // Animate along route path
                      <g>
                        {/* 1. Rotating Vehicle group */}
                        <g filter="url(#marker-shadow)">
                          <g transform="translate(-15, -8)">
                            <rect x="2" y="3" width="22" height="10" rx="2" fill="#000" opacity="0.3" filter="blur(1px)" />
                            <rect x="2" y="2" width="22" height="10" rx="2" fill={activeMech.markerColor} />
                            <path d="M 24 2 L 28 6 L 28 12 L 24 12 Z" fill={activeMech.markerColor} />
                            <rect x="18" y="4" width="5" height="3" rx="0.5" fill="#090909" />
                            <rect x="10" y="4" width="6" height="3" rx="0.5" fill="#090909" />
                            <circle cx="7" cy="13" r="3" fill="#121212" />
                            <circle cx="19" cy="13" r="3" fill="#121212" />
                            <circle cx="7" cy="13" r="1.2" fill="#fff" />
                            <circle cx="19" cy="13" r="1.2" fill="#fff" />
                          </g>
                          <animateMotion dur="5s" fill="freeze" rotate="auto" key={`veh-${activeSim}`}>
                            <mpath href={`#route-path-${activeSim}`} />
                          </animateMotion>
                        </g>

                        {/* 2. Non-rotating Label group (keeps text perfectly horizontal) */}
                        <g>
                          <g transform="translate(0, -22)">
                            <rect x="-24" y="-8" width="48" height="14" rx="4" fill="#121212" stroke={activeMech.markerColor} strokeWidth="1" opacity="0.95" />
                            <text textAnchor="middle" y="2" fill="#fff" fontSize="8" fontWeight="800" className="select-none">
                              {activeMech.name.split(" ")[0]}
                            </text>
                          </g>
                          <animateMotion dur="5s" fill="freeze" key={`lbl-${activeSim}`}>
                            <mpath href={`#route-path-${activeSim}`} />
                          </animateMotion>
                        </g>
                      </g>
                    )}

                    {simStep === 3 && (
                      // Arrived at customer location
                      <g>
                        {/* Arrived badge */}
                        <g transform="translate(250, 200)" filter="url(#marker-shadow)">
                          <circle cx="0" cy="0" r="28" fill={activeMech.markerColor} opacity="0.2" className="animate-pulse" />
                          <circle cx="0" cy="0" r="10" fill={activeMech.markerColor} />
                          <circle cx="0" cy="0" r="4" fill="#fff" />
                          <text y="34" textAnchor="middle" fill={activeMech.markerColor} fontSize="10" fontWeight="900" letterSpacing="0.05em" className="select-none">
                            ARRIVED
                          </text>
                        </g>
                        {/* Parked Van next to user car */}
                        <g transform="translate(220, 202)">
                          <g transform="translate(-15, -8)">
                            <rect x="2" y="2" width="22" height="10" rx="2" fill={activeMech.markerColor} />
                            <path d="M 24 2 L 28 6 L 28 12 L 24 12 Z" fill={activeMech.markerColor} />
                            <rect x="18" y="4" width="5" height="3" rx="0.5" fill="#090909" />
                            <rect x="10" y="4" width="6" height="3" rx="0.5" fill="#090909" />
                            <circle cx="7" cy="13" r="3" fill="#121212" />
                            <circle cx="19" cy="13" r="3" fill="#121212" />
                            <circle cx="7" cy="13" r="1.2" fill="#fff" />
                            <circle cx="19" cy="13" r="1.2" fill="#fff" />
                          </g>
                        </g>
                      </g>
                    )}
                  </g>
                )}
              </svg>

              {/* Status Overlay */}
              <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 bg-[#121212]/95 backdrop-blur-md border border-white/[0.08] p-3.5 sm:p-5 rounded-2xl flex items-center justify-between shadow-2xl">
                <div>
                  <p className="text-[9px] sm:text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Simulator Map</p>
                  <h4 className="text-xs sm:text-sm font-bold text-white mt-1">
                    {!activeSim && (selectedMechanic ? `Ready to request ${selectedMechanic.name}` : 'Select a provider on map or list')}
                    {activeSim && simStep === 0 && `Broadcasting request to ${activeMech.name}...`}
                    {activeSim && simStep === 1 && `Waiting for ${activeMech.name} to accept...`}
                    {activeSim && simStep === 2 && `${activeMech.name} is en route`}
                    {activeSim && simStep === 3 && `${activeMech.name} arrived at your location`}
                  </h4>
                </div>
                {activeSim && simStep >= 2 && (
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-[9px] sm:text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Live ETA</p>
                    <p className="text-xs sm:text-sm font-black text-red-500 mt-1">{eta > 0 ? `${eta} mins` : 'Arrived'}</p>
                  </div>
                )}
              </div>
            </div>
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
            Get Help Now
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
                Get Help Now
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
