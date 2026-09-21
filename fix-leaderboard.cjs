const fs = require('fs');
let html = fs.readFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/leaderboard.html', 'utf8');

// 1. Remove hardcoded ticker names
html = html.replace(/<span class="text-white font-bold">Thomas Bernard(.*?)<\/span>/g, '<span class="text-white font-bold">Waiting for matches...</span>');
html = html.replace(/<span class="text-white font-bold">Camille Renault(.*?)<\/span>/g, '<span class="text-white font-bold">Waiting for matches...</span>');
html = html.replace(/<span class="text-white font-bold">Lucas Dubois(.*?)<\/span>/g, '<span class="text-white font-bold">Waiting for matches...</span>');

// 2. Add loadLeaderboardData to the Supabase init block
const oldSupa = `          if (window.loadUserState) window.loadUserState();`;
const newSupa = `          if (window.loadUserState) window.loadUserState();
          if (window.loadLeaderboardData) window.loadLeaderboardData();`;
html = html.replace(oldSupa, newSupa);

// 3. Define loadLeaderboardData and replace STANDINGS
const oldStandings = `    const STANDINGS = [
      { rank: 1, name: 'Thomas Bernard', promo: 'M2', program: 'ISA M2', balance: 14820, won: 28, total: 34, streak: '4W 🔥', form: ['W', 'W', 'W', 'W'], bestOdds: '4.20' },
      { rank: 2, name: 'Camille Renault', promo: 'M1', program: 'ISA M1', balance: 11450, won: 22, total: 30, streak: '2W 🔥', form: ['W', 'L', 'W', 'W'], bestOdds: '3.12' },
      { rank: 3, name: 'Lucas Dubois', promo: 'L3', program: 'ISA L3', balance: 9380, won: 19, total: 28, streak: '3W 🔥', form: ['W', 'W', 'W', 'L'], bestOdds: '3.45' },
      { rank: 4, name: 'Emma Lefebvre', promo: 'M2', program: 'ISA M2', balance: 7240, won: 16, total: 25, streak: '1W', form: ['L', 'W', 'W', 'L'], bestOdds: '2.80' },
      { rank: 5, name: 'Alexandre Petit', promo: 'M1', program: 'ISA M1', balance: 5120, won: 14, total: 22, streak: '2W 🔥', form: ['W', 'W', 'L', 'W'], bestOdds: '2.44' },
      { rank: 6, name: 'Inès Martin', promo: 'L3', program: 'ISA L3', balance: 3400, won: 11, total: 20, streak: '1L', form: ['W', 'L', 'L', 'W'], bestOdds: '1.92' },
      { rank: 7, name: 'Maxime Leroy', promo: 'M1', program: 'ISA M1', balance: 2150, won: 9, total: 17, streak: '1W', form: ['L', 'L', 'W', 'W'], bestOdds: '2.10' },
      { rank: 8, name: 'Jules Moreau (You)', promo: 'M1', program: 'ISA M1', balance: 1000, won: 4, total: 6, streak: 'Ready', form: ['-', '-', '-', '-'], bestOdds: '1.72', isUser: true },
      { rank: 9, name: 'Sophie Laurent', promo: 'M2', program: 'ISA M2', balance: 850, won: 7, total: 18, streak: '2L', form: ['L', 'L', 'W', 'L'], bestOdds: '2.38' },
      { rank: 10, name: 'Antoine Roux', promo: 'L3', program: 'ISA L3', balance: 620, won: 5, total: 16, streak: '3L', form: ['L', 'L', 'L', 'W'], bestOdds: '1.85' },
    ];`;

const newStandings = `    let STANDINGS = [];

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
          isUser: p.id === window.currentUserId
        }));
        renderStandings();
        lucide.createIcons();
      }
    };`;

html = html.replace(oldStandings, newStandings);

fs.writeFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/leaderboard.html', html);
console.log('leaderboard done');
