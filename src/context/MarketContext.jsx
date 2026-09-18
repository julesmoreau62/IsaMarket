import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { INITIAL_MARKETS, MOCK_LEADERBOARD } from '../lib/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const MarketContext = createContext(null);

export const MarketProvider = ({ children }) => {
  const [markets, setMarkets] = useState(INITIAL_MARKETS);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMethod, setSortMethod] = useState('volume');
  
  // Wallet & Positions
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('isamarket_balance');
    return saved !== null ? parseInt(saved, 10) : 1000;
  });

  const [positions, setPositions] = useState(() => {
    const saved = localStorage.getItem('isamarket_positions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Modals state
  const [isPositionsOpen, setIsPositionsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Trade Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMarket, setDrawerMarket] = useState(null);
  const [drawerOutcome, setDrawerOutcome] = useState('YES');

  // Toast state
  const [toast, setToast] = useState({ show: false, title: '', message: '' });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('isamarket_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('isamarket_positions', JSON.stringify(positions));
  }, [positions]);

  // Load from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const fetchSupabaseData = async () => {
        try {
          const { data: remoteMarkets, error } = await supabase
            .from('markets')
            .select('*')
            .order('volume', { ascending: false });
          if (!error && remoteMarkets && remoteMarkets.length > 0) {
            setMarkets(remoteMarkets.map(m => ({
              id: m.id,
              category: m.category,
              categoryName: m.category_name,
              icon: m.icon,
              title: m.title,
              description: m.description,
              yesPrice: Number(m.yes_price),
              noPrice: Number(m.no_price),
              yesLabel: m.yes_label,
              noLabel: m.no_label,
              volume: Number(m.volume),
              endDate: m.end_date,
              image: m.image_url || '/logo.png',
              featured: m.featured
            })));
          }
        } catch (err) {
          console.warn('Supabase fetch fallback to local:', err);
        }
      };
      fetchSupabaseData();
    }
  }, []);

  const showToast = (title, message) => {
    setToast({ show: true, title, message });
    setTimeout(() => {
      setToast({ show: false, title: '', message: '' });
    }, 3500);
  };

  const openDrawer = (market, outcome = 'YES') => {
    setDrawerMarket(market);
    setDrawerOutcome(outcome);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const claimFaucet = () => {
    setBalance(prev => prev + 250);
    setIsFaucetOpen(false);
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#eb6d8a', '#38bdf8', '#fbbf24']
    });
    showToast('🦑 Squid Received!', '+250 Squid added to your ISA wallet');
  };

  const resetWallet = () => {
    setBalance(1000);
    setPositions([]);
    showToast('Wallet Reset', 'Reset balance back to 1,000 Squid');
  };

  const placeOrder = (amount) => {
    if (!drawerMarket || amount <= 0 || amount > balance) return;

    const price = drawerOutcome === 'YES' ? drawerMarket.yesPrice : drawerMarket.noPrice;
    const shares = amount / price;
    const payout = shares;
    const outcomeLabel = drawerOutcome === 'YES' ? (drawerMarket.yesLabel || 'Yes') : (drawerMarket.noLabel || 'No');

    // Deduct balance
    setBalance(prev => prev - amount);

    // Update volume in local state
    setMarkets(prev => prev.map(m => {
      if (m.id === drawerMarket.id) {
        return { ...m, volume: m.volume + amount };
      }
      return m;
    }));

    // Record position
    const newPosition = {
      id: Date.now(),
      marketId: drawerMarket.id,
      marketTitle: drawerMarket.title,
      outcome: outcomeLabel,
      amount,
      shares,
      payout,
      price,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setPositions(prev => [newPosition, ...prev]);

    // Confetti
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#eb6d8a', '#10b981', '#ffffff']
    });

    closeDrawer();
    showToast('🎉 Order Placed!', `Bought ${shares.toFixed(1)} ${outcomeLabel} shares for ${amount} Squid`);
  };

  return (
    <MarketContext.Provider value={{
      markets,
      activeCategory,
      setActiveCategory,
      searchQuery,
      setSearchQuery,
      sortMethod,
      setSortMethod,
      balance,
      positions,
      drawerOpen,
      drawerMarket,
      drawerOutcome,
      setDrawerOutcome,
      openDrawer,
      closeDrawer,
      placeOrder,
      claimFaucet,
      resetWallet,
      isPositionsOpen,
      setIsPositionsOpen,
      isLeaderboardOpen,
      setIsLeaderboardOpen,
      isFaucetOpen,
      setIsFaucetOpen,
      isRulesOpen,
      setIsRulesOpen,
      toast,
      showToast,
      leaderboard: MOCK_LEADERBOARD
    }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => useContext(MarketContext);
