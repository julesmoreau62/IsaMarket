// Master Forecasters Standings Data
    let STANDINGS = [];

    window.loadLeaderboardData = async function() {
      console.log('loadLeaderboardData started');
      if (!window.supabaseClient) {
        console.error('No supabaseClient found!');
        return;
      }
      
      try {
        const { data: profiles, error } = await window.supabaseClient
          .from('profiles')
          .select('*')
          .order('balance', { ascending: false });
          
        console.log('Supabase response:', { profiles, error });
        
        if (error) {
          console.error('Supabase fetch error:', error);
          return;
        }
      if (profiles) {
        STANDINGS = profiles.map((p, index) => ({
          rank: index + 1,
          name: p.full_name || p.email.split('@')[0],
          promo: 'ISA',
          program: 'Member',
          balance: p.balance,
          won: 0,
          total: 0,
          streak: '-',
          form: ['-', '-', '-', '-'],
          bestOdds: '-',
          isUser: p.id === window.currentUserId
        }));
        // Update counts
        const countEl = document.getElementById('active-traders-count');
        if (countEl) countEl.textContent = Math.max(1, profiles.length) + ' STUDENTS';
        
        const poolEl = document.getElementById('total-pool-count');
        if (poolEl) {
          const totalPool = profiles.reduce((sum, p) => sum + p.balance, 0);
          poolEl.textContent = Math.max(userBalance, totalPool).toLocaleString() + ' 🦑';
        }

        renderStandings();
        lucide.createIcons();
      }
      } catch (err) {
        console.error('Exception in loadLeaderboardData:', err);
      }
    };

    let currentFilter = 'all';
    let userBalance = 1000;
    let userPositions = [];
    let currentUser = 'Jules Moreau';

    function toggleProfileDropdown() {
      const dropdown = document.getElementById('profileDropdown');
      if (dropdown) dropdown.classList.toggle('hidden');
    }
    
    function openPositionsModal() {
      window.location.href = 'index.html';
    }

    function openFaucetModal() {
      window.location.href = 'index.html';
    }

    function resetDemoState() {
      window.location.href = 'index.html';
    }

    function openCreateMarketModal() {
      window.location.href = 'index.html';
    }

    function handleSearch() {
      // no-op on leaderboard
    }

    function filterCategory() {
      // no-op on leaderboard
    }

    document.addEventListener('DOMContentLoaded', () => {
      loadUserState();
      renderStandings();
      lucide.createIcons();
    });

    function loadUserState() {
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

      // Update User live balance on page
      
      const userRankNameEl = document.getElementById('profile-name');
      if (userRankNameEl) userRankNameEl.textContent = `${currentUser}`;
      
      const userRankInitialsEl = document.getElementById('profile-initials');
      if (userRankInitialsEl) userRankInitialsEl.textContent = currentUser.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      const balEl = document.getElementById('user-balance');
      if (balEl) balEl.textContent = userBalance.toLocaleString();

      const dropNameEl = document.getElementById('dropdown-name');
      if (dropNameEl) dropNameEl.textContent = currentUser;

      const openBetsEl = document.getElementById('user-open-bets');
      if (openBetsEl) openBetsEl.textContent = `${userPositions.length} BET${userPositions.length === 1 ? '' : 'S'}`;

      const navCount = document.getElementById('nav-positions-count');
      if (navCount && userPositions.length > 0) {
        navCount.textContent = userPositions.length;
        navCount.classList.remove('hidden');
      }
    }

    function filterPromo(promo) {
      currentFilter = promo;
      document.querySelectorAll('.promo-btn').forEach(btn => {
        btn.classList.remove('bg-volt', 'text-pitch-950', 'active', 'font-black');
        btn.classList.add('bg-pitch-900', 'text-slate-300', 'font-bold');
      });
      
      const activeBtn = event?.target?.closest('button');
      if (activeBtn) {
        activeBtn.classList.add('bg-volt', 'text-pitch-950', 'active', 'font-black');
        activeBtn.classList.remove('bg-pitch-900', 'text-slate-300', 'font-bold');
      }

      renderStandings();
    }

        function renderStandings() {
      const podiumEl = document.getElementById('dynamic-podium');
      const tbody = document.getElementById('standings-table-body');
      
      let data = STANDINGS.map(item => {
        if (item.isUser) {
          return { ...item, balance: userBalance, name: currentUser };
        }
        return item;
      });
      if (STANDINGS.length === 0) {
        data.push({
          rank: 1,
          name: currentUser,
          promo: 'ISA',
          program: 'Member',
          balance: userBalance,
          won: 0,
          total: 0,
          streak: '-',
          form: ['-', '-', '-', '-'],
          bestOdds: '-',
          isUser: true
        });
      }
      data = data.sort((a, b) => b.balance - a.balance);

      const top3 = data.slice(0, 3);
      const rest = data.slice(3);

      if (podiumEl) {
        if (top3.length > 0) {
          let podiumHTML = `
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-display font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <i data-lucide="award" class="w-4 h-4 text-trophy"></i>
                <span>CURRENT PODIUM LEADERS</span>
              </h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-4">
          `;

          // #2 Silver
          if (top3[1]) {
            podiumHTML += `
              <div class="order-2 md:order-1 rounded-xl p-5 bg-pitch-900 border border-slate-400 relative flex flex-col justify-between space-y-4">
                <div class="absolute -top-3 left-4 bg-slate-300 text-pitch-950 font-display font-black text-xs uppercase px-2.5 py-0.5 rounded shadow">🥈 RANK #2</div>
                <div class="pt-2">
                  <h3 class="font-display font-black text-xl uppercase tracking-tight text-white">${top3[1].name}</h3>
                  <span class="font-teko text-2xl font-bold text-white">${top3[1].balance} 🦑</span>
                </div>
              </div>
            `;
          }

          // #1 Gold
          if (top3[0]) {
            podiumHTML += `
              <div class="order-1 md:order-2 rounded-xl p-6 bg-pitch-900 border-2 border-trophy relative flex flex-col justify-between space-y-5 md:-translate-y-4 shadow-[0_0_20px_rgba(255,183,3,0.15)]">
                <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-trophy text-pitch-950 font-display font-black text-sm uppercase px-4 py-0.5 rounded-full shadow-lg">👑 CHAMPION</div>
                <div class="pt-3 text-center">
                  <h3 class="font-display font-black text-3xl uppercase tracking-tight text-white">${top3[0].name}</h3>
                  <span class="font-teko text-3xl font-black text-trophy">${top3[0].balance} 🦑</span>
                </div>
              </div>
            `;
          }

          // #3 Bronze
          if (top3[2]) {
            podiumHTML += `
              <div class="order-3 md:order-3 rounded-xl p-5 bg-pitch-900 border border-amber-600 relative flex flex-col justify-between space-y-4">
                <div class="absolute -top-3 left-4 bg-amber-600 text-white font-display font-black text-xs uppercase px-2.5 py-0.5 rounded shadow">🥉 RANK #3</div>
                <div class="pt-2">
                  <h3 class="font-display font-black text-xl uppercase tracking-tight text-white">${top3[2].name}</h3>
                  <span class="font-teko text-2xl font-bold text-white">${top3[2].balance} 🦑</span>
                </div>
              </div>
            `;
          }
          podiumHTML += '</div>';
          podiumEl.innerHTML = podiumHTML;
        } else {
          podiumEl.innerHTML = '';
        }
      }

      if (tbody) {
        tbody.innerHTML = rest.map((u, idx) => {
          const rankDisplay = idx + 4; // Start at #4
          return `
            <tr class="standings-row ${u.isUser ? 'bg-volt/10 font-bold' : ''}">
              <td class="py-3.5 px-4 text-center font-teko text-xl text-slate-400">#${rankDisplay}</td>
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-display font-extrabold uppercase text-sm ${u.isUser ? 'text-volt' : 'text-white'}">${u.name}</span>
                      ${u.isUser ? '<span class="text-[9px] font-display font-black uppercase px-1.5 py-0.2 bg-volt text-pitch-950 rounded">YOU</span>' : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td class="py-3.5 px-4 font-teko text-xl font-bold text-white tracking-wide text-right">
                ${u.balance.toLocaleString()} 🦑
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Function to remove later filter logic
    function dummyFunc() {}
function filterPromo(promo) {
      currentFilter = promo;
      document.querySelectorAll('.promo-btn').forEach(btn => {
        btn.classList.remove('bg-volt', 'text-pitch-950', 'active', 'font-black');
        btn.classList.add('bg-pitch-900', 'text-slate-300', 'font-bold');
      });
      
      const activeBtn = event?.target?.closest('button');
      if (activeBtn) {
        activeBtn.classList.add('bg-volt', 'text-pitch-950', 'active', 'font-black');
        activeBtn.classList.remove('bg-pitch-900', 'text-slate-300', 'font-bold');
      }

      renderStandings();
    }

    function renderStandings() {
      const tbody = document.getElementById('standings-table-body');
      if (!tbody) return;

      // Update user in data with current dynamic balance
      const data = STANDINGS.map(item => {
        if (item.isUser) {
          return { ...item, balance: userBalance, name: currentUser };
        }
        return item;
      }).sort((a, b) => b.balance - a.balance);

      const filtered = data.filter(item => {
        if (currentFilter === 'all') return true;
        return item.promo === currentFilter;
      });

      

      tbody.innerHTML = filtered.map((u, idx) => {
        const accuracy = Math.round((u.won / u.total) * 100);
        const rankDisplay = idx + 1;
        const isMedal = rankDisplay <= 3;
        const medalEmoji = rankDisplay === 1 ? '🥇' : rankDisplay === 2 ? '🥈' : rankDisplay === 3 ? '🥉' : `#${rankDisplay}`;

        const formPills = u.form.map(f => {
          if (f === 'W') return `<span class="w-5 h-5 rounded-full bg-volt/20 text-volt font-mono font-bold text-[10px] flex items-center justify-center border border-volt/40">W</span>`;
          if (f === 'L') return `<span class="w-5 h-5 rounded-full bg-squid/20 text-squid font-mono font-bold text-[10px] flex items-center justify-center border border-squid/40">L</span>`;
          return `<span class="w-5 h-5 rounded-full bg-pitch-800 text-slate-500 font-mono text-[10px] flex items-center justify-center">-</span>`;
        }).join('');

        return `
          <tr class="standings-row ${u.isUser ? 'bg-volt/10 font-bold' : ''}">
            <!-- Rank -->
            <td class="py-3.5 px-4 text-center font-teko text-xl ${isMedal ? 'text-trophy font-bold' : 'text-slate-400'}">
              ${isMedal ? medalEmoji : `#${rankDisplay}`}
            </td>

            <!-- Forecaster Name & Promo -->
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-pitch-800 border border-pitch-700 flex items-center justify-center font-display font-black text-xs ${u.isUser ? 'text-volt border-volt' : 'text-slate-300'}">
                  ${u.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-display font-extrabold uppercase text-sm ${u.isUser ? 'text-volt' : 'text-white'}">${u.name}</span>
                    ${u.isUser ? '<span class="text-[9px] font-display font-black uppercase px-1.5 py-0.2 bg-volt text-pitch-950 rounded">YOU</span>' : ''}
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">${u.program}</span>
                </div>
              </div>
            </td>

            <!-- Bankroll -->
            <td class="py-3.5 px-4 text-right">
              <span class="font-teko text-2xl font-bold ${u.isUser ? 'text-volt' : 'text-white'} leading-none">
                ${u.balance.toLocaleString()}
              </span>
              <span class="text-[10px] text-slate-400 font-mono ml-0.5">🦑</span>
            </td>

            <!-- Record -->
            <td class="py-3.5 px-4 text-center font-mono text-slate-300 hidden sm:table-cell">
              <span class="text-volt font-bold">${u.won}W</span> - <span class="text-slate-400">${u.total - u.won}L</span>
            </td>

            <!-- Accuracy -->
            <td class="py-3.5 px-4 text-center hidden md:table-cell">
              <div class="inline-flex items-center gap-1.5">
                <div class="w-12 bg-pitch-950 rounded-full h-1.5 overflow-hidden border border-pitch-800">
                  <div class="bg-volt h-full" style="width: ${accuracy}%;"></div>
                </div>
                <span class="font-mono text-xs font-semibold text-slate-300">${accuracy}%</span>
              </div>
            </td>

            <!-- Form -->
            <td class="py-3.5 px-4">
              <div class="flex items-center justify-center gap-1">
                ${formPills}
              </div>
            </td>

            <!-- Streak -->
            <td class="py-3.5 px-4 text-center hidden lg:table-cell font-mono text-xs ${u.streak.includes('🔥') ? 'text-volt font-bold' : 'text-slate-400'}">
              ${u.streak}
            </td>
          </tr>
        `;
      }).join('');

      lucide.createIcons();
    }