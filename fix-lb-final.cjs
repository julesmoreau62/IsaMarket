const fs = require('fs');
let html = fs.readFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/leaderboard.html', 'utf8');

// Replace the STANDINGS array using Regex
html = html.replace(/const STANDINGS = \[[\s\S]*?\];/, `let STANDINGS = [];

    window.loadLeaderboardData = async function() {
      if (!window.supabaseClient) return;
      
      const { data: profiles, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .order('balance', { ascending: false });
        
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
          isUser: window.currentUserId ? (p.id === window.currentUserId) : false
        }));
        
        // Also update Active Traders count!
        const statElements = document.querySelectorAll('.text-3xl.font-display.font-black.text-white');
        if (statElements.length >= 2) {
          // The second one is usually "Active Traders" based on the UI
          statElements[1].textContent = profiles.length;
        }

        renderStandings();
        lucide.createIcons();
      }
    };`);

// Also fix the ticker in leaderboard.html which might still have Thomas Bernard
html = html.replace(/<span class="text-white font-bold">Thomas Bernard(.*?)<\/span>/g, '<span class="text-white font-bold">Waiting for matches...</span>');
html = html.replace(/<span class="text-white font-bold">Camille Renault(.*?)<\/span>/g, '<span class="text-white font-bold">Waiting for matches...</span>');
html = html.replace(/<span class="text-white font-bold">Lucas Dubois(.*?)<\/span>/g, '<span class="text-white font-bold">Waiting for matches...</span>');

fs.writeFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/leaderboard.html', html);
console.log('done');
