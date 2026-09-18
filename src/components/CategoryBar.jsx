import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useMarket } from '../context/MarketContext';

export const CategoryBar = () => {
  const { activeCategory, setActiveCategory, sortMethod, setSortMethod } = useMarket();

  const categories = [
    { id: 'all', label: '🔥 All Markets' },
    { id: 'isa', label: '🎓 ISA & Campus' },
    { id: 'football', label: '⚽ Football' },
    { id: 'basketball', label: '🏀 Basketball' },
    { id: 'olympics', label: '🏆 Global Sports' },
    { id: 'campus', label: '🍻 Student Life & BDS' },
  ];

  return (
    <div className="bg-navy-900/60 border-b border-navy-800/80 backdrop-blur-sm sticky top-16 z-30 overflow-x-auto no-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  isActive
                    ? 'bg-squid-500 text-white shadow-sm'
                    : 'bg-navy-800 text-slate-300 hover:bg-navy-700 hover:text-white border border-navy-700/60'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sorting Dropdown */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-navy-950 px-2.5 py-1 rounded-lg border border-navy-800">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortMethod}
              onChange={(e) => setSortMethod(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="volume" className="bg-navy-900">Highest Squid Volume</option>
              <option value="chance" className="bg-navy-900">Highest Probability</option>
              <option value="newest" className="bg-navy-900">Newest Markets</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};
