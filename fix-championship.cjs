const fs = require('fs');
let html = fs.readFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/leaderboard.html', 'utf8');

// 1. Remove SEMESTER REWARDS section
const rewardsStart = html.indexOf('<!-- ================= BDS SEMESTER PRIZES ================= -->');
const rewardsEnd = html.indexOf('</main>', rewardsStart); // Assuming it ends before main
if (rewardsStart !== -1 && rewardsEnd !== -1) {
  // Let's just remove the section by finding the closing </section>
  const endSection = html.indexOf('</section>', rewardsStart) + 10;
  html = html.substring(0, rewardsStart) + html.substring(endSection);
  console.log('Removed Semester Rewards');
}

// 2. Remove Promo Filter
const filterStart = html.indexOf('<div class="flex items-center gap-2 overflow-x-auto no-scrollbar">');
const filterEndStr = 'Showing <span id="filtered-count" class="text-white font-bold">10</span> Forecasters';
const filterEnd = html.indexOf(filterEndStr);
if (filterStart !== -1 && filterEnd !== -1) {
    // Actually the whole header block for filters:
    const headerStart = html.lastIndexOf('<div class="flex flex-col sm:flex-row', filterStart);
    const headerEnd = html.indexOf('</div>', filterEnd) + 6;
    if(headerStart !== -1) {
        // Also remove the "Showing 10 Forecasters" parent div
        const parentEnd = html.indexOf('</div>', headerEnd) + 6;
        html = html.substring(0, headerStart) + html.substring(parentEnd);
        console.log('Removed Promo Filter');
    }
}

// 3. Update JS logic for Dynamic Podium and Table filtering
const renderStandingsStart = html.indexOf('function renderStandings() {');
const renderStandingsEnd = html.indexOf('function filterPromo(promo) {');
if (renderStandingsStart !== -1) {
  const newRenderLogic = `    function renderStandings() {
      const podiumEl = document.getElementById('dynamic-podium');
      const tbody = document.getElementById('standings-table-body');
      
      const data = STANDINGS.map(item => {
        if (item.isUser) {
          return { ...item, balance: userBalance, name: currentUser };
        }
        return item;
      }).sort((a, b) => b.balance - a.balance);

      const top3 = data.slice(0, 3);
      const rest = data.slice(3);

      if (podiumEl) {
        if (top3.length > 0) {
          let podiumHTML = \`
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-display font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <i data-lucide="award" class="w-4 h-4 text-trophy"></i>
                <span>CURRENT PODIUM LEADERS</span>
              </h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-4">
          \`;

          // #2 Silver
          if (top3[1]) {
            podiumHTML += \`
              <div class="order-2 md:order-1 rounded-xl p-5 bg-pitch-900 border border-slate-400 relative flex flex-col justify-between space-y-4">
                <div class="absolute -top-3 left-4 bg-slate-300 text-pitch-950 font-display font-black text-xs uppercase px-2.5 py-0.5 rounded shadow">🥈 RANK #2</div>
                <div class="pt-2">
                  <h3 class="font-display font-black text-xl uppercase tracking-tight text-white">\${top3[1].name}</h3>
                  <span class="font-teko text-2xl font-bold text-white">\${top3[1].balance} 🦑</span>
                </div>
              </div>
            \`;
          }

          // #1 Gold
          if (top3[0]) {
            podiumHTML += \`
              <div class="order-1 md:order-2 rounded-xl p-6 bg-pitch-900 border-2 border-trophy relative flex flex-col justify-between space-y-5 md:-translate-y-4 shadow-[0_0_20px_rgba(255,183,3,0.15)]">
                <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-trophy text-pitch-950 font-display font-black text-sm uppercase px-4 py-0.5 rounded-full shadow-lg">👑 CHAMPION</div>
                <div class="pt-3 text-center">
                  <h3 class="font-display font-black text-3xl uppercase tracking-tight text-white">\${top3[0].name}</h3>
                  <span class="font-teko text-3xl font-black text-trophy">\${top3[0].balance} 🦑</span>
                </div>
              </div>
            \`;
          }

          // #3 Bronze
          if (top3[2]) {
            podiumHTML += \`
              <div class="order-3 md:order-3 rounded-xl p-5 bg-pitch-900 border border-amber-600 relative flex flex-col justify-between space-y-4">
                <div class="absolute -top-3 left-4 bg-amber-600 text-white font-display font-black text-xs uppercase px-2.5 py-0.5 rounded shadow">🥉 RANK #3</div>
                <div class="pt-2">
                  <h3 class="font-display font-black text-xl uppercase tracking-tight text-white">\${top3[2].name}</h3>
                  <span class="font-teko text-2xl font-bold text-white">\${top3[2].balance} 🦑</span>
                </div>
              </div>
            \`;
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
          return \`
            <tr class="standings-row \${u.isUser ? 'bg-volt/10 font-bold' : ''}">
              <td class="py-3.5 px-4 text-center font-teko text-xl text-slate-400">#\${rankDisplay}</td>
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-display font-extrabold uppercase text-sm \${u.isUser ? 'text-volt' : 'text-white'}">\${u.name}</span>
                      \${u.isUser ? '<span class="text-[9px] font-display font-black uppercase px-1.5 py-0.2 bg-volt text-pitch-950 rounded">YOU</span>' : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td class="py-3.5 px-4 font-teko text-xl font-bold text-white tracking-wide text-right">
                \${u.balance.toLocaleString()} 🦑
              </td>
            </tr>
          \`;
        }).join('');
      }
    }

    // Function to remove later filter logic
    function dummyFunc() {}
`;
  html = html.substring(0, renderStandingsStart) + newRenderLogic + html.substring(renderStandingsEnd);
  console.log('Updated renderStandings logic');
}

fs.writeFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/leaderboard.html', html);
console.log('Done');
