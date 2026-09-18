import React, { useState, useRef, useEffect } from 'react';
import { Search, Trophy, Briefcase, HelpCircle, Droplets, ChevronDown, RotateCcw } from 'lucide-react';
import { useMarket } from '../context/MarketContext';

export const Navbar = () => {
  const { 
    balance, 
    positions, 
    searchQuery, 
    setSearchQuery, 
    setIsPositionsOpen, 
    setIsLeaderboardOpen, 
    setIsFaucetOpen, 
    setIsRulesOpen,
    resetWallet
  } = useMarket();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 border-b border-navy-700/60 px-4 py-1.5 text-xs text-slate-300 text-center flex items-center justify-center gap-2">
        <span className="inline-flex items-center justify-center bg-squid-500/20 text-squid-400 font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border border-squid-500/30">
          🎓 ISA Promo 2026
        </span>
        <span>
          Welcome to <strong>IsaMarket</strong>! Educational prediction market using <span className="text-squid-400 font-semibold">🦑 Squid</span> play currency.
        </span>
        <button 
          onClick={() => setIsFaucetOpen(true)} 
          className="ml-2 underline text-squid-400 hover:text-squid-300 font-medium transition"
        >
          Claim 250 Free Squid →
        </button>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-navy-950/90 backdrop-blur-md border-b border-navy-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="relative">
                <img 
                  src="/logo.png" 
                  alt="ISA Lille Squid Logo" 
                  className="w-10 h-10 rounded-full object-cover border-2 border-squid-500/80 shadow-md group-hover:scale-105 transition-transform duration-200" 
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-navy-950 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-xl tracking-tight text-white flex items-center">
                    Isa<span className="text-squid-500">Market</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-navy-800 text-slate-400 px-1.5 py-0.5 rounded border border-navy-700">
                    Lille
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 tracking-wide font-medium leading-none">
                  International Sport Administration
                </p>
              </div>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 ml-6 text-sm font-medium">
              <a href="#markets" className="px-3 py-1.5 rounded-lg text-white bg-navy-800 hover:bg-navy-700 transition">
                Markets
              </a>
              <button 
                onClick={() => setIsLeaderboardOpen(true)} 
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition flex items-center gap-1.5"
              >
                <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
              </button>
              <button 
                onClick={() => setIsPositionsOpen(true)} 
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4 text-indigo-400" /> Portfolio
                {positions.length > 0 && (
                  <span className="bg-navy-700 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full">
                    {positions.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setIsRulesOpen(true)} 
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition flex items-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4 text-slate-400" /> How it works
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden lg:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sports, William, campus, exams..." 
                className="w-full pl-10 pr-10 py-2 bg-navy-900 border border-navy-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-squid-500/70 focus:ring-1 focus:ring-squid-500/50 transition"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 bg-navy-800 border border-navy-700 text-[10px] text-slate-400 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </div>
          </div>

          {/* User Wallet & Profile */}
          <div className="flex items-center gap-2.5">
            
            {/* Faucet button */}
            <button 
              onClick={() => setIsFaucetOpen(true)} 
              title="Claim free Squid test currency" 
              className="hidden sm:inline-flex items-center gap-1.5 bg-squid-500/10 hover:bg-squid-500/20 text-squid-400 border border-squid-500/30 hover:border-squid-500/60 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            >
              <Droplets className="w-3.5 h-3.5 text-squid-400" />
              <span>Faucet</span>
            </button>

            {/* Balance Pill */}
            <div 
              onClick={() => setIsPositionsOpen(true)}
              className="flex items-center gap-2 bg-navy-900 border border-navy-700 px-3.5 py-1.5 rounded-xl shadow-inner cursor-pointer hover:border-navy-600 transition" 
              title="View Portfolio & Active Positions"
            >
              <span className="text-base select-none">🦑</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase leading-none">Squid Balance</span>
                <span className="font-display font-bold text-sm text-white tracking-tight leading-tight">
                  {balance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setProfileOpen(!profileOpen)} 
                className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 border border-navy-700 rounded-xl p-1.5 sm:px-3 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-squid-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                  JM
                </div>
                <span className="text-xs font-semibold text-slate-200 hidden md:inline">Jules (M1 ISA)</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:inline" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-navy-900 border border-navy-700 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-navy-800">
                    <p className="text-xs font-semibold text-white">Jules Moreau</p>
                    <p className="text-[11px] text-slate-400">jules@univ-lille.fr • ISA Promo 2026</p>
                  </div>
                  <button 
                    onClick={() => { setIsPositionsOpen(true); setProfileOpen(false); }} 
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-navy-800 flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4 text-indigo-400" /> My Open Positions ({positions.length})
                  </button>
                  <button 
                    onClick={() => { setIsLeaderboardOpen(true); setProfileOpen(false); }} 
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-navy-800 flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" /> Uni Leaderboard Rank: <strong className="text-white">#8</strong>
                  </button>
                  <button 
                    onClick={() => { setIsFaucetOpen(true); setProfileOpen(false); }} 
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-navy-800 flex items-center gap-2"
                  >
                    <Droplets className="w-4 h-4 text-squid-400" /> Claim Squid Faucet (+250)
                  </button>
                  <div className="border-t border-navy-800 my-1"></div>
                  <button 
                    onClick={() => { resetWallet(); setProfileOpen(false); }} 
                    className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-navy-800 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Mock Wallet (1,000 🦑)
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Mobile Search */}
        <div className="p-3 border-t border-navy-800/80 lg:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sports, William, exams..." 
              className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-navy-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-squid-500"
            />
          </div>
        </div>
      </header>
    </>
  );
};
