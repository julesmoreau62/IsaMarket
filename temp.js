
    // Initial Market Data with European Decimal Odds & Athletic Props
    const INITIAL_MARKETS = [
      {
        id: 1,
        category: 'isa',
        categoryName: 'Classroom',
        icon: '⏱️',
        title: 'How many minutes before William talks about volunteering?',
        description: 'Resolves to "< 15 mins" if William mentions volunteering within the first 15 minutes of lecture, or "≥ 15 mins" if later or never.',
        yesProb: 0.68,
        noProb: 0.32,
        yesLabel: '< 15 mins',
        noLabel: '≥ 15 mins',
        volume: 56800,
        endDate: 'Today\'s Lecture',
        image: 'assets/logo.png',
        featured: true,
        tag: 'LIVE PROP'
      },
      {
        id: 2,
        category: 'football',
        categoryName: 'Football',
        icon: '⚽',
        title: 'Will LOSC Lille finish in Ligue 1 Top 3 this season?',
        description: 'Resolves to Yes if LOSC Lille qualifies directly for the UEFA Champions League group stage.',
        yesProb: 0.58,
        noProb: 0.42,
        yesLabel: 'Yes',
        noLabel: 'No',
        volume: 34120,
        endDate: 'May 18, 2026',
        image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
        tag: 'LIGUE 1'
      },
      {
        id: 3,
        category: 'isa',
        categoryName: 'ISA Campus',
        icon: '🎟️',
        title: 'Will the ISA Annual Sports Gala tickets sell out within 24 hours?',
        description: 'BDS Gala ticket sales opening prediction for master and bachelor students.',
        yesProb: 0.84,
        noProb: 0.16,
        yesLabel: 'Yes',
        noLabel: 'No',
        volume: 18900,
        endDate: 'Apr 10, 2026',
        image: 'assets/logo.png',
        tag: 'BDS GALA'
      },
      {
        id: 4,
        category: 'olympics',
        categoryName: 'Global Sports',
        icon: '🏆',
        title: 'Will France reach the Final of the 2026 FIFA World Cup?',
        description: 'Resolves to Yes if the French National Team plays the 2026 World Cup Final in MetLife Stadium.',
        yesProb: 0.41,
        noProb: 0.59,
        yesLabel: 'Yes',
        noLabel: 'No',
        volume: 76500,
        endDate: 'Jul 19, 2026',
        image: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=400&q=80',
        tag: 'WORLD CUP'
      },
      {
        id: 5,
        category: 'basketball',
        categoryName: 'Basketball',
        icon: '🏀',
        title: 'Will the ISA 3x3 Basketball Team make the Regional Final Four?',
        description: 'FFSU Regional Championship in Villeneuve d\'Ascq.',
        yesProb: 0.63,
        noProb: 0.37,
        yesLabel: 'Yes',
        noLabel: 'No',
        volume: 12400,
        endDate: 'Apr 30, 2026',
        image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=400&q=80',
        tag: 'FFSU 3X3'
      },
      {
        id: 6,
        category: 'campus',
        categoryName: 'Student Life',
        icon: '🍻',
        title: 'Will the BDS organise an ISA Ski Trip to Val Thorens in 2027?',
        description: 'Annual winter semester sports retreat proposition by the Bureau des Sports.',
        yesProb: 0.89,
        noProb: 0.11,
        yesLabel: 'Yes',
        noLabel: 'No',
        volume: 9800,
        endDate: 'Dec 15, 2026',
        image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=400&q=80',
        tag: 'SKI RETREAT'
      },
      {
        id: 7,
        category: 'isa',
        categoryName: 'ISA Campus',
        icon: '📊',
        title: 'Will the class average in Sport Economics & Finance be above 14/20?',
        description: 'Semester exam graded across all ISA Master 1 students.',
        yesProb: 0.47,
        noProb: 0.53,
        yesLabel: 'Yes',
        noLabel: 'No',
        volume: 21300,
        endDate: 'Jun 12, 2026',
        image: 'assets/logo.png',
        tag: 'EXAM RESULTS'
      },
      {
        id: 8,
        category: 'football',
        categoryName: 'Football',
        icon: '👑',
        title: 'Will Kylian Mbappé win the 2026 Ballon d\'Or?',
        description: 'Resolves to Yes if France Football awards the Ballon d\'Or to Kylian Mbappé.',
        yesProb: 0.52,
        noProb: 0.48,
        yesLabel: 'Yes',
        noLabel: 'No',
        volume: 64200,
        endDate: 'Oct 30, 2026',
        image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&q=80',
        tag: 'BALLON D\'OR'
      },
      {
        id: 9,
        category: 'olympics',
        categoryName: 'Global Sports',
        icon: '🎾',
        title: 'Will Carlos Alcaraz win the 2026 French Open (Roland-Garros)?',
        description: 'Men\'s singles tournament at Stade Roland Garros, Paris.',
        yesProb: 0.65,
        noProb: 0.35,
        yesLabel: 'Yes',
        noLabel: 'No',
        volume: 28900,
        endDate: 'Jun 07, 2026',
        image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=400&q=80',
        tag: 'ROLAND-GARROS'
      },
      {
        id: 10,
        category: 'isa',
        categoryName: 'ISA Campus',
        icon: '🎓',
        title: 'Will ISA win the 2026 Lille Inter-University Sports Championship?',
        description: 'Resolves to Yes if ISA finishes 1st overall in the Université de Lille tournament.',
        yesProb: 0.72,
        noProb: 0.28,
        yesLabel: 'Yes',
        noLabel: 'No',
        volume: 48250,
        endDate: 'May 24, 2026',
        image: 'assets/logo.png',
        tag: 'UNIV DERBY'
      }
    ];

    // Championship Standings Mock Data
    const MOCK_LEADERBOARD = [
      { rank: 1, name: 'Thomas Bernard', promo: 'ISA M2', balance: 14820, streak: '4W 🔥', form: 'W W W W' },
      { rank: 2, name: 'Camille Renault', promo: 'ISA M1', balance: 11450, streak: '2W 🔥', form: 'W L W W' },
      { rank: 3, name: 'Lucas Dubois', promo: 'ISA L3', balance: 9380, streak: '3W 🔥', form: 'W W W L' },
      { rank: 4, name: 'Emma Lefebvre', promo: 'ISA M2', balance: 7240, streak: '1W', form: 'L W W L' },
      { rank: 5, name: 'Alexandre Petit', promo: 'ISA M1', balance: 5120, streak: '2W 🔥', form: 'W W L W' },
      { rank: 6, name: 'Inès Martin', promo: 'ISA L3', balance: 3400, streak: '1L', form: 'W L L W' },
      { rank: 7, name: 'Maxime Leroy', promo: 'ISA M1', balance: 2150, streak: '1W', form: 'L L W W' },
      { rank: 8, name: 'Jules Moreau (You)', promo: 'ISA M1', balance: 1000, streak: 'Ready', form: '- - - -', isUser: true },
      { rank: 9, name: 'Sophie Laurent', promo: 'ISA M2', balance: 850, streak: '2L', form: 'L L W L' },
      { rank: 10, name: 'Antoine Roux', promo: 'ISA L3', balance: 620, streak: '3L', form: 'L L L W' },
    ];

    // Helper: Convert probability (0-1) to European Decimal Odds
    function toDecimalOdds(prob) {
      if (!prob || prob <= 0) return '1.01';
      return (1 / prob).toFixed(2);
    }

    // App State
    let markets = [...INITIAL_MARKETS];
    let activeCategory = 'all';
    let searchQuery = '';
    let sortMethod = 'volume';
    let userBalance = 1000;
    let userPositions = [];
    let currentUser = 'Jules Moreau';

    // Current bet drawer state
    let currentDrawerMarket = null;
    let currentDrawerOutcome = 'YES';

    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
      loadState();
      checkDailyBonus();
      renderMarkets();
      renderPositionsBadge();
      lucide.createIcons();
    });

    function checkDailyBonus() {
      const lastBonus = localStorage.getItem('isamarket_last_daily_bonus');
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      if (!lastBonus || now - parseInt(lastBonus) > ONE_DAY_MS) {
        userBalance += 100;
        localStorage.setItem('isamarket_last_daily_bonus', now.toString());
        saveState();
        updateBalanceUI();
        
        // Show confetti and toast
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00f59b', '#ffffff', '#ffb703']
          });
        }
        showToast('🎁 Daily Bonus!', '+100 Squid for logging in today!');
      }
    }

    // Local Storage helpers
    function saveState() {
      localStorage.setItem('isamarket_balance', userBalance.toString());
      localStorage.setItem('isamarket_positions', JSON.stringify(userPositions));
      localStorage.setItem('isamarket_current_user', currentUser);
      
      const customMarkets = markets.filter(m => m.isCustom);
      localStorage.setItem('isamarket_custom_markets', JSON.stringify(customMarkets));
    }

    function loadState() {
      const savedBalance = localStorage.getItem('isamarket_balance');
      if (savedBalance !== null) {
        userBalance = parseInt(savedBalance, 10);
      }
      const savedPositions = localStorage.getItem('isamarket_positions');
      if (savedPositions) {
        try {
          userPositions = JSON.parse(savedPositions);
        } catch (e) {
          userPositions = [];
        }
      }
      
      const savedUser = localStorage.getItem('isamarket_current_user');
      if (savedUser) {
        currentUser = savedUser;
      }
      
      const savedMarkets = localStorage.getItem('isamarket_custom_markets');
      if (savedMarkets) {
        try {
          const customMarkets = JSON.parse(savedMarkets);
          markets = [...INITIAL_MARKETS, ...customMarkets];
        } catch (e) {
          // ignore
        }
      }
      
      updateUserUI();
      updateBalanceUI();
    }

    function updateUserUI() {
      const initials = currentUser.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const initialsEl = document.getElementById('profile-initials');
      if (initialsEl) initialsEl.textContent = initials;
      
      const nameEl = document.getElementById('profile-name');
      if (nameEl) nameEl.textContent = currentUser;
      
      const dropdownNameEl = document.getElementById('dropdown-name');
      if (dropdownNameEl) dropdownNameEl.textContent = currentUser;
    }

    function promptChangeUser() {
      const newName = prompt("Enter your name to switch profiles:", currentUser);
      if (newName && newName.trim() !== "") {
        currentUser = newName.trim();
        saveState();
        updateUserUI();
        renderMarkets(); // re-render to apply excluded logic
        showToast('Profile Changed', `Logged in as ${currentUser}`);
      }
    }

    function updateBalanceUI() {
      const el = document.getElementById('user-balance');
      if (el) el.textContent = userBalance.toLocaleString();
      
      const drawerBal = document.getElementById('drawer-available-balance');
      if (drawerBal) drawerBal.textContent = `${userBalance.toLocaleString()} 🦑`;
      
      const portFree = document.getElementById('portfolio-free-squid');
      if (portFree) portFree.textContent = `${userBalance.toLocaleString()} 🦑`;
    }

    // Category filter
    function filterCategory(cat) {
      activeCategory = cat;
      document.querySelectorAll('.cat-pill').forEach(btn => {
        btn.classList.remove('bg-volt', 'text-pitch-950', 'active');
        btn.classList.add('bg-pitch-800', 'text-slate-300');
      });
      
      const activeBtn = event?.target?.closest('button');
      if (activeBtn) {
        activeBtn.classList.add('bg-volt', 'text-pitch-950', 'active');
        activeBtn.classList.remove('bg-pitch-800', 'text-slate-300');
      }
      
      renderMarkets();
    }

    function handleSearch(val) {
      searchQuery = val.toLowerCase().trim();
      renderMarkets();
    }

    function handleSort(val) {
      sortMethod = val;
      renderMarkets();
    }

    function resetFilters() {
      activeCategory = 'all';
      searchQuery = '';
      const input = document.getElementById('searchInput');
      if (input) input.value = '';
      renderMarkets();
    }

    // Render Sports Markets Grid
    function renderMarkets() {
      const container = document.getElementById('markets-grid');
      const emptyState = document.getElementById('empty-state');
      if (!container) return;

      let filtered = markets.filter(m => {
        const matchesCat = (activeCategory === 'all') || (m.category === activeCategory);
        const matchesSearch = !searchQuery || 
          m.title.toLowerCase().includes(searchQuery) || 
          m.categoryName.toLowerCase().includes(searchQuery) ||
          m.description.toLowerCase().includes(searchQuery);
          
        const isExcluded = m.excludedUsers && m.excludedUsers.map(u => u.trim().toLowerCase()).includes(currentUser.trim().toLowerCase());
        
        return matchesCat && matchesSearch && !isExcluded;
      });

      // Sort with European Odds logic
      if (sortMethod === 'volume') {
        filtered.sort((a, b) => b.volume - a.volume);
      } else if (sortMethod === 'odds') {
        // Highest underdog decimal odds
        filtered.sort((a, b) => {
          const maxOddsA = Math.max(1 / a.yesProb, 1 / a.noProb);
          const maxOddsB = Math.max(1 / b.yesProb, 1 / b.noProb);
          return maxOddsB - maxOddsA;
        });
      } else if (sortMethod === 'chance') {
        filtered.sort((a, b) => b.yesProb - a.yesProb);
      } else if (sortMethod === 'newest') {
        filtered.sort((a, b) => b.id - a.id);
      }

      document.getElementById('market-count-badge').textContent = `${filtered.length} MARKETS`;

      if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      } else {
        emptyState.classList.add('hidden');
      }

      container.innerHTML = filtered.map(m => {
      container.innerHTML = filtered.map(m => {
        let isClosed = false;
        let closedBadge = '';
        if (m.isCustom && m.endDate) {
          const dt = new Date(m.endDate);
          if (dt < new Date()) {
            isClosed = true;
            closedBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-display font-bold uppercase bg-squid text-white absolute -top-2 -right-2 rotate-12 shadow-lg">CLOSED</span>`;
          }
        }

        let marketOptions = [];
        if (m.options && m.options.length > 0) {
          marketOptions = m.options;
        } else {
          marketOptions = [
            { label: m.yesLabel || 'Yes', prob: m.yesProb, isVolt: true },
            { label: m.noLabel || 'No', prob: m.noProb, isSquid: true }
          ];
        }

        const colorClasses = [
          { text: 'text-volt', bg: 'bg-volt', bgHover: 'hover:bg-volt/25', borderHover: 'hover:border-volt', bgLight: 'bg-volt/10', border: 'border-volt/40' },
          { text: 'text-squid', bg: 'bg-squid', bgHover: 'hover:bg-squid/25', borderHover: 'hover:border-squid', bgLight: 'bg-squid/10', border: 'border-squid/40' },
          { text: 'text-blue-400', bg: 'bg-blue-400', bgHover: 'hover:bg-blue-400/25', borderHover: 'hover:border-blue-400', bgLight: 'bg-blue-400/10', border: 'border-blue-400/40' },
          { text: 'text-yellow-400', bg: 'bg-yellow-400', bgHover: 'hover:bg-yellow-400/25', borderHover: 'hover:border-yellow-400', bgLight: 'bg-yellow-400/10', border: 'border-yellow-400/40' },
          { text: 'text-purple-400', bg: 'bg-purple-400', bgHover: 'hover:bg-purple-400/25', borderHover: 'hover:border-purple-400', bgLight: 'bg-purple-400/10', border: 'border-purple-400/40' }
        ];

        const labelsHTML = marketOptions.map((opt, i) => {
          let c = colorClasses[i % colorClasses.length];
          if (opt.isVolt) c = colorClasses[0];
          if (opt.isSquid) c = colorClasses[1];
          return `<span class="${c.text} font-bold">${opt.label} (${Math.round(opt.prob * 100)}%)</span>`;
        }).join(' <span class="text-slate-600">|</span> ');

        const gaugeBarsHTML = marketOptions.map((opt, i) => {
          let c = colorClasses[i % colorClasses.length];
          if (opt.isVolt) c = colorClasses[0];
          if (opt.isSquid) c = colorClasses[1];
          return `<div class="${c.bg} h-full transition-all duration-300" style="width: ${Math.round(opt.prob * 100)}%;"></div>`;
        }).join('');

        const gridCols = marketOptions.length > 2 ? (marketOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-2';
        
        const buttonsHTML = marketOptions.map((opt, i) => {
          let c = colorClasses[i % colorClasses.length];
          if (opt.isVolt) c = colorClasses[0];
          if (opt.isSquid) c = colorClasses[1];
          const odds = toDecimalOdds(opt.prob);
          const safeLabel = opt.label.replace(/'/g, "\\'");
          
          const clickAttr = isClosed ? 'disabled' : 'onclick="openBetModal(' + m.id + ', &quot;' + safeLabel.replace(/"/g, '&quot;') + '&quot;)"';
          
          return `
            <button 
              ${clickAttr}
              class="flex items-center justify-between px-3 py-2.5 rounded ${c.bgLight} ${isClosed ? 'opacity-50 cursor-not-allowed' : c.bgHover + ' ' + c.borderHover + ' group cursor-pointer'} border-2 ${c.border} ${c.text} font-display uppercase tracking-wider text-xs font-black transition"
            >
              <span class="truncate mr-2 max-w-[80px]" title="${opt.label}">${opt.label}</span>
              <span class="font-teko text-xl font-black text-white group-hover:${c.text} transition leading-none">${odds}</span>
            </button>
          `;
        }).join('');

        const safeFirstLabel = marketOptions[0].label.replace(/'/g, "\\'");

        return `
          <div class="sport-card relative bg-pitch-900 border-2 border-pitch-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4 ${isClosed ? 'opacity-80 grayscale-[50%]' : ''}">
            ${closedBadge}
            <!-- Card Header & Match Tag -->
            <div class="space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="inline-flex items-center gap-1.5 font-display font-black text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-pitch-800 text-volt border border-pitch-700">
                  <span>${m.icon}</span> ${m.tag || m.categoryName}
                </span>
                <span class="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <i data-lucide="clock" class="w-3 h-3 text-slate-500"></i> ${m.endDate}
                </span>
              </div>

              <!-- Title & Thumbnail -->
              <div class="flex items-start gap-3">
                <div class="w-12 h-12 rounded bg-pitch-850 border border-pitch-700 p-0.5 shrink-0 flex items-center justify-center overflow-hidden shadow">
                  <img src="${m.image}" alt="${m.title}" class="w-full h-full object-cover rounded" onerror="this.src='assets/logo.png'">
                </div>
                <h3 class="font-display font-bold text-base uppercase tracking-tight text-white leading-snug hover:text-volt transition cursor-pointer" onclick="${isClosed ? '' : 'openBetModal(' + m.id + ', &quot;' + safeFirstLabel.replace(/"/g, '&quot;') + '&quot;)'}">
                  ${m.title}
                </h3>
              </div>
            </div>

            <!-- European Odds Display Grid -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-[11px] font-display uppercase tracking-wider text-slate-400 flex-wrap gap-x-2">
                ${labelsHTML}
              </div>
              
              <!-- Stadium Gauge Bar -->
              <div class="h-2 w-full bg-pitch-950 rounded-sm overflow-hidden flex border border-pitch-800">
                ${gaugeBarsHTML}
              </div>
            </div>

            <!-- Sportsbook European Odds Buttons -->
            <div class="grid ${gridCols} gap-2 pt-1">
              ${buttonsHTML}
            </div>

            <!-- Footer metrics -->
            <div class="flex items-center justify-between pt-2 border-t border-pitch-800 text-[11px] text-slate-400 font-mono">
              <span class="flex items-center gap-1">
                <span>🦑</span> <strong class="text-white">${m.volume.toLocaleString()}</strong> SQUID STAKED
              </span>
              <div class="flex items-center gap-2">
                <button onclick="${'openBetModal(' + m.id + ', &quot;' + safeFirstLabel.replace(/"/g, '&quot;') + '&quot;)'}" class="hover:text-volt transition" title="Open Bet Slip">
                  <i data-lucide="ticket" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="showToast('Odds Link Copied', 'Proposition link copied to clipboard!')" class="hover:text-volt transition" title="Share Match">
                  <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

          </div>
        `;
      }).join('');

      lucide.createIcons();
    }

    // ================= OFFICIAL BET SLIP LOGIC =================
    function getOptionsForMarket(market) {
      if (market.options && market.options.length > 0) return market.options;
      return [
        { label: market.yesLabel || 'Yes', prob: market.yesProb, isVolt: true },
        { label: market.noLabel || 'No', prob: market.noProb, isSquid: true }
      ];
    }

    function openBetModal(marketId, outcomeLabel) {
      const market = markets.find(m => m.id === marketId);
      if (!market) return;

      currentDrawerMarket = market;
      
      const opts = getOptionsForMarket(market);
      // Determine selected outcome or fallback to the first one
      const outcomeMatch = opts.find(o => o.label === outcomeLabel);
      currentDrawerOutcome = outcomeMatch ? outcomeMatch.label : opts[0].label;

      // Unique ticket ref code
      document.getElementById('slip-ref-code').textContent = `#IS-${market.id}${Math.floor(100 + Math.random() * 900)}`;

      document.getElementById('drawer-market-title').textContent = market.title;
      document.getElementById('drawer-market-category').textContent = `${market.icon} ${market.tag || market.categoryName}`;
      document.getElementById('drawer-market-end').textContent = market.endDate;
      
      // Render dynamic outcome buttons
      const container = document.getElementById('drawer-outcomes-container');
      container.className = `grid gap-2 bg-pitch-950 p-1.5 rounded border border-pitch-800 ${opts.length > 2 ? (opts.length === 3 ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-2'}`;
      
      const colorClasses = [
        { text: 'text-volt', bg: 'bg-volt', bgLight: 'bg-volt/10' },
        { text: 'text-squid', bg: 'bg-squid', bgLight: 'bg-squid/10' },
        { text: 'text-blue-400', bg: 'bg-blue-400', bgLight: 'bg-blue-400/10' },
        { text: 'text-yellow-400', bg: 'bg-yellow-400', bgLight: 'bg-yellow-400/10' }
      ];

      container.innerHTML = opts.map((opt, i) => {
        let c = colorClasses[i % colorClasses.length];
        if (opt.isVolt) c = colorClasses[0];
        if (opt.isSquid) c = colorClasses[1];
        const odds = toDecimalOdds(opt.prob);
        const safeLabel = opt.label.replace(/'/g, "\\'");
        return `
          <button 
            id="drawer-outcome-btn-${i}"
            onclick="selectDrawerOutcome('${safeLabel}')" 
            class="py-2.5 px-3 rounded font-display uppercase tracking-wider text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition"
          >
            <span class="leading-none max-w-[80px] truncate" title="${opt.label}">${opt.label}</span>
            <span class="font-teko text-2xl font-black leading-none">${odds}</span>
          </button>
        `;
      }).join('');

      selectDrawerOutcome(currentDrawerOutcome);
      
      document.getElementById('trade-drawer').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeTradeDrawer() {
      document.getElementById('trade-drawer').classList.add('hidden');
    }

    function selectDrawerOutcome(outcomeLabel) {
      if (!currentDrawerMarket) return;
      currentDrawerOutcome = outcomeLabel;
      const opts = getOptionsForMarket(currentDrawerMarket);
      const submitBtn = document.getElementById('btn-submit-order');

      const colorClasses = [
        { border: 'border-volt', bg: 'bg-volt', bgLight: 'bg-volt/10', text: 'text-pitch-950', submitBg: 'bg-volt hover:bg-volt-400', textActive: 'text-pitch-950' },
        { border: 'border-squid', bg: 'bg-squid', bgLight: 'bg-squid/10', text: 'text-white', submitBg: 'bg-squid hover:bg-squid-600', textActive: 'text-white' },
        { border: 'border-blue-400', bg: 'bg-blue-400', bgLight: 'bg-blue-400/10', text: 'text-pitch-950', submitBg: 'bg-blue-400 hover:bg-blue-500', textActive: 'text-pitch-950' },
        { border: 'border-yellow-400', bg: 'bg-yellow-400', bgLight: 'bg-yellow-400/10', text: 'text-pitch-950', submitBg: 'bg-yellow-400 hover:bg-yellow-500', textActive: 'text-pitch-950' }
      ];

      opts.forEach((opt, i) => {
        const btn = document.getElementById(`drawer-outcome-btn-${i}`);
        if (!btn) return;
        let c = colorClasses[i % colorClasses.length];
        if (opt.isVolt) c = colorClasses[0];
        if (opt.isSquid) c = colorClasses[1];

        if (opt.label === outcomeLabel) {
          btn.className = `py-2.5 px-3 rounded font-display uppercase tracking-wider text-xs font-black flex flex-col items-center justify-center gap-0.5 transition ${c.bg} ${c.textActive} shadow-md border-2 ${c.border}`;
          submitBtn.className = `w-full py-3.5 rounded font-display font-black text-sm uppercase tracking-wider ${c.textActive} shadow-xl transition flex items-center justify-center gap-2 ${c.submitBg}`;
        } else {
          btn.className = `py-2.5 px-3 rounded font-display uppercase tracking-wider text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition bg-pitch-900 text-slate-400 hover:text-white border-2 border-transparent`;
        }
      });

      calculateTradeSummary();
    }

    function setBetChip(val) {
      document.getElementById('bet-amount').value = val;
      calculateTradeSummary();
    }

    function setMaxBet() {
      document.getElementById('bet-amount').value = Math.max(1, userBalance);
      calculateTradeSummary();
    }

    function calculateTradeSummary() {
      if (!currentDrawerMarket) return;
      
      const amountInput = document.getElementById('bet-amount');
      let stake = parseFloat(amountInput.value) || 0;
      if (stake < 0) stake = 0;

      const opts = getOptionsForMarket(currentDrawerMarket);
      const opt = opts.find(o => o.label === currentDrawerOutcome) || opts[0];
      const prob = opt.prob;
      const decimalOdds = parseFloat(toDecimalOdds(prob));
      
      const totalPayout = stake * decimalOdds;
      const netProfit = totalPayout - stake;
      const roi = stake > 0 ? ((decimalOdds - 1) * 100) : 0;

      document.getElementById('summary-decimal-odds').textContent = decimalOdds.toFixed(2);
      document.getElementById('summary-implied-prob').textContent = `${Math.round(prob * 100)}%`;
      document.getElementById('summary-potential-payout').textContent = `${totalPayout.toFixed(2)} 🦑`;
      document.getElementById('summary-potential-profit').textContent = `+${netProfit.toFixed(2)} 🦑 (+${roi.toFixed(1)}%)`;
      
      const submitBtn = document.getElementById('btn-submit-order');
      if (stake > userBalance) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = `<span>Insufficient Bankroll (Have ${userBalance} 🦑)</span>`;
      } else if (stake <= 0) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = `<span>Enter stake amount</span>`;
      } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = `<span>LOCK IN ${opt.label} @ ${decimalOdds.toFixed(2)} (${stake} 🦑)</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        lucide.createIcons();
      }
    }

    function executeTrade() {
      if (!currentDrawerMarket) return;
      
      const stake = parseFloat(document.getElementById('bet-amount').value) || 0;
      if (stake <= 0 || stake > userBalance) return;

      const opts = getOptionsForMarket(currentDrawerMarket);
      const opt = opts.find(o => o.label === currentDrawerOutcome) || opts[0];
      const decimalOdds = parseFloat(toDecimalOdds(opt.prob));
      const totalPayout = stake * decimalOdds;
      const netProfit = totalPayout - stake;

      // Deduct bankroll
      userBalance -= stake;
      
      // Update market volume
      currentDrawerMarket.volume += stake;

      // Add to user active bets
      userPositions.unshift({
        id: Date.now(),
        marketId: currentDrawerMarket.id,
        marketTitle: currentDrawerMarket.title,
        outcome: opt.label,
        stake: stake,
        decimalOdds: decimalOdds,
        payout: totalPayout,
        netProfit: netProfit,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      saveState();
      updateBalanceUI();
      renderMarkets();
      renderPositionsBadge();

      // Confetti feedback
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.8 },
        colors: ['#00f59b', '#ff2a6d', '#ffffff']
      });

      closeTradeDrawer();
      showToast('🎉 Bet Confirmed!', `Placed ${stake} 🦑 on ${outcomeLabel} @ ${decimalOdds.toFixed(2)} (Payout: ${totalPayout.toFixed(1)} 🦑)`);
    }

    // ================= POSITIONS / BETS MODAL =================
    function openPositionsModal() {
      renderPositionsList();
      document.getElementById('positions-modal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closePositionsModal() {
      document.getElementById('positions-modal').classList.add('hidden');
    }

    function renderPositionsBadge() {
      const badge = document.getElementById('nav-positions-count');
      if (!badge) return;
      if (userPositions.length > 0) {
        badge.textContent = userPositions.length;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    function renderPositionsList() {
      const container = document.getElementById('positions-list');
      const investedEl = document.getElementById('portfolio-invested-squid');
      const payoutEl = document.getElementById('portfolio-max-payout');
      if (!container) return;

      let totalInvested = 0;
      let totalMaxPayout = 0;

      userPositions.forEach(p => {
        totalInvested += p.stake;
        totalMaxPayout += p.payout;
      });

      if (investedEl) investedEl.textContent = `${totalInvested.toLocaleString()} 🦑`;
      if (payoutEl) payoutEl.textContent = `${totalMaxPayout.toFixed(0)} 🦑`;

      if (userPositions.length === 0) {
        container.innerHTML = `
          <div class="py-10 text-center text-slate-500 space-y-2 bg-pitch-950 rounded border border-pitch-800">
            <i data-lucide="ticket" class="w-8 h-8 mx-auto text-slate-600"></i>
            <p class="text-xs font-medium">No active bet slips yet.</p>
            <button onclick="closePositionsModal()" class="text-xs font-display font-bold uppercase tracking-wider text-volt hover:underline">Explore matches and lock in a bet →</button>
          </div>
        `;
        return;
      }

      container.innerHTML = userPositions.map(p => {
        return `
          <div class="p-3.5 bg-pitch-950 border border-pitch-800 rounded-lg space-y-2">
            <div class="flex items-start justify-between gap-2">
              <h5 class="text-xs font-bold text-white leading-snug">${p.marketTitle}</h5>
              <span class="shrink-0 px-2 py-0.5 rounded text-[10px] font-display font-black uppercase tracking-wider bg-volt/20 text-volt border border-volt/30">
                ${p.outcome} @ ${p.decimalOdds.toFixed(2)}
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-pitch-800 font-mono">
              <span>Stake: <strong class="text-white">${p.stake} 🦑</strong></span>
              <span class="text-volt font-bold">Max Return: ${p.payout.toFixed(1)} 🦑 (+${p.netProfit.toFixed(1)} 🦑)</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // ================= FAUCET MODAL =================
    function openFaucetModal() {
      document.getElementById('faucet-modal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeFaucetModal() {
      document.getElementById('faucet-modal').classList.add('hidden');
    }

    function claimFaucetSquid() {
      userBalance += 250;
      saveState();
      updateBalanceUI();
      closeFaucetModal();

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f59b', '#ff2a6d', '#ffb703']
      });

      showToast('⚡ Bankroll Credited!', '+250 Squid added to your ISA wallet');
    }

    // ================= LEAGUE CHAMPIONSHIP MODAL =================
    function openLeaderboardModal() {
      const container = document.getElementById('leaderboard-list');
      if (container) {
        const updated = MOCK_LEADERBOARD.map(item => {
          if (item.isUser) {
            return { ...item, balance: userBalance };
          }
          return item;
        }).sort((a, b) => b.balance - a.balance);

        container.innerHTML = updated.map((u, idx) => `
          <div class="flex items-center justify-between p-3 rounded-lg ${u.isUser ? 'bg-volt/15 border-2 border-volt' : 'bg-pitch-950 border border-pitch-800'}">
            <div class="flex items-center gap-3">
              <span class="w-6 text-center font-teko text-xl font-bold ${idx < 3 ? 'text-trophy' : 'text-slate-500'}">
                ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </span>
              <div>
                <p class="text-xs font-bold ${u.isUser ? 'text-volt' : 'text-white'}">${u.name}</p>
                <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>${u.promo}</span>
                  <span>•</span>
                  <span class="text-volt font-bold">${u.streak}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-teko text-xl font-bold text-white leading-none">
                ${u.balance.toLocaleString()} <span class="text-volt text-sm">🦑</span>
              </div>
              <div class="text-[9px] font-mono text-slate-500 tracking-widest mt-0.5">${u.form}</div>
            </div>
          </div>
        `).join('');
      }

      document.getElementById('leaderboard-modal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeLeaderboardModal() {
      document.getElementById('leaderboard-modal').classList.add('hidden');
    }

    // ================= CREATE MARKET MODAL =================
    function openCreateMarketModal() {
      document.getElementById('create-market-modal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeCreateMarketModal() {
      document.getElementById('create-market-modal').classList.add('hidden');
    }

    function addMarketOption() {
      const list = document.getElementById('new-market-options-list');
      const div = document.createElement('div');
      div.className = 'flex gap-2 market-option-row mt-2';
      div.innerHTML = `
        <input type="text" placeholder="Option Name" class="w-2/3 px-3 py-1.5 bg-pitch-950 border border-pitch-800 rounded text-white text-xs focus:outline-none focus:border-volt option-label">
        <input type="number" placeholder="%" value="10" min="1" max="99" class="w-1/3 px-3 py-1.5 bg-pitch-950 border border-pitch-800 rounded text-white text-xs focus:outline-none focus:border-volt option-prob">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-300 p-1">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      `;
      list.appendChild(div);
      lucide.createIcons();
    }

    function saveNewMarket() {
      const title = document.getElementById('new-market-title').value.trim();
      const desc = document.getElementById('new-market-desc').value.trim();
      const category = document.getElementById('new-market-category').value;
      const endTime = document.getElementById('new-market-time').value;
      const excludedInput = document.getElementById('new-market-excluded').value;

      if (!title || !desc || !endTime) {
        alert("Please fill out Title, Description, and Voting End Time.");
        return;
      }

      const optionRows = document.querySelectorAll('.market-option-row');
      let options = [];
      let totalProb = 0;
      optionRows.forEach(row => {
        const label = row.querySelector('.option-label').value.trim();
        const prob = parseInt(row.querySelector('.option-prob').value) || 0;
        if (label) {
          options.push({ label, prob: prob / 100 });
          totalProb += prob;
        }
      });
      
      if (options.length < 2) {
        alert("Please provide at least 2 options.");
        return;
      }
      
      if (totalProb > 0 && totalProb !== 100) {
        options = options.map(o => ({ ...o, prob: o.prob / (totalProb / 100) }));
      }

      const excludedUsers = excludedInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      const newMarket = {
        id: Date.now(),
        category: category,
        categoryName: category === 'isa' ? 'ISA & Campus' : category === 'football' ? 'Football' : category === 'basketball' ? 'Basketball' : category === 'olympics' ? 'Global Sports' : 'Student Life',
        icon: category === 'football' ? '⚽' : category === 'basketball' ? '🏀' : category === 'olympics' ? '🏆' : '🎓',
        title: title,
        description: desc,
        options: options,
        volume: 0,
        endDate: new Date(endTime).toLocaleString(),
        image: 'assets/logo.png',
        tag: 'CUSTOM PROP',
        isCustom: true,
        excludedUsers: excludedUsers
      };

      markets.unshift(newMarket); // Add to beginning
      saveState();
      renderMarkets();
      closeCreateMarketModal();

      // Reset form
      document.getElementById('new-market-title').value = '';
      document.getElementById('new-market-desc').value = '';
      document.getElementById('new-market-time').value = '';
      document.getElementById('new-market-excluded').value = '';
      document.getElementById('new-market-options-list').innerHTML = `
        <div class="flex gap-2 market-option-row">
          <input type="text" placeholder="e.g. Yes, Win" value="Yes" class="w-2/3 px-3 py-1.5 bg-pitch-950 border border-pitch-800 rounded text-white text-xs focus:outline-none focus:border-volt option-label">
          <input type="number" placeholder="%" value="50" min="1" max="99" class="w-1/3 px-3 py-1.5 bg-pitch-950 border border-pitch-800 rounded text-white text-xs focus:outline-none focus:border-volt option-prob">
        </div>
        <div class="flex gap-2 market-option-row">
          <input type="text" placeholder="e.g. No, Lose" value="No" class="w-2/3 px-3 py-1.5 bg-pitch-950 border border-pitch-800 rounded text-white text-xs focus:outline-none focus:border-volt option-label">
          <input type="number" placeholder="%" value="50" min="1" max="99" class="w-1/3 px-3 py-1.5 bg-pitch-950 border border-pitch-800 rounded text-white text-xs focus:outline-none focus:border-volt option-prob">
        </div>
      `;

      showToast('Market Created!', 'Your custom proposition is now live.');
    }

    // ================= HOW IT WORKS MODAL =================
    function openRulesModal() {
      document.getElementById('rules-modal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeRulesModal() {
      document.getElementById('rules-modal').classList.add('hidden');
    }

    // ================= PROFILE DROPDOWN =================
    function toggleProfileDropdown() {
      const menu = document.getElementById('profileDropdown');
      menu.classList.toggle('hidden');
    }

    window.addEventListener('click', (e) => {
      const btn = document.getElementById('profileBtn');
      const menu = document.getElementById('profileDropdown');
      if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
      }
    });

    function resetDemoState() {
      userBalance = 1000;
      userPositions = [];
      saveState();
      updateBalanceUI();
      renderMarkets();
      renderPositionsBadge();
      showToast('Bankroll Reset', 'Reset bankroll back to 1,000 Squid');
    }

    // ================= TOAST SYSTEM =================
    function showToast(title, message) {
      const toast = document.getElementById('toast');
      document.getElementById('toast-title').textContent = title;
      document.getElementById('toast-message').textContent = message;

      toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
      }, 3500);
    }
  