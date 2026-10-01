import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xdjitzgqjsgcupwwipzz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY || '792887da5c72e0fe207ccba79daef4a9';

if (!SUPABASE_KEY) {
  console.error("ERREUR: SUPABASE_SERVICE_ROLE_KEY manquante.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VIP_TEAMS = [
  "Paris", "PSG", "Paris Saint Germain", "Lyon", "Olympique Lyonnais", "Monaco", "Lille", "Strasbourg", "Rennes", "Stade Rennais", "Marseille", "Olympique de Marseille", "Nantes", "Guingamp",
  "Barcelona", "Real Madrid", "Atletico Madrid", "Sevilla",
  "Manchester City", "Manchester United", "Arsenal", "Chelsea", "Liverpool",
  "France", "Spain", "England", "Italy", "Germany", "Norway", "Denmark", "Croatia", "Portugal",
  "San Antonio Spurs", "Philadelphia 76ers",
  "Sinner", "Alcaraz", "Djokovic", "Medvedev", "Zverev", "Fils", "Swiatek", "Sabalenka", "Gauff", "Rybakina", "Pegula"
];

function isVipMatch(home, away, sportKey) {
  if (sportKey === 'soccer_uefa_champs_league' || sportKey === 'rugby_union_six_nations') return true;
  return VIP_TEAMS.some(t => 
    home.toLowerCase().includes(t.toLowerCase()) || 
    away.toLowerCase().includes(t.toLowerCase())
  );
}

const MORNING_SPORTS_TO_SCAN = [
  'soccer_uefa_champs_league',
  'soccer_uefa_europa_league',
  'soccer_uefa_nations_league',
  'soccer_france_ligue_one',
  'soccer_france_ligue_two',
  'soccer_epl',
  'soccer_spain_la_liga',
  'basketball_nba',
  'rugby_union_six_nations',
  'tennis_atp_wimbledon', 
  'tennis_atp_french_open',
  'tennis_atp_us_open',
  'tennis_atp_australian_open'
];

async function updateOddsAndCreateDrafts() {
  console.log("🚀 Démarrage du Bot IsaMarket...");

  const { data: adminData } = await supabase.from('memberships').select('user_id').eq('role', 'admin').limit(1).single();
  if (!adminData) throw new Error("Aucun admin trouvé !");
  const adminId = adminData.user_id;

  const { data: activeSubjects } = await supabase.from('subjects')
    .select('*')
    .in('status', ['open', 'draft']);

  const activePolymarket = activeSubjects.filter(s => s.category === 'Polymarket');
  const activeSports = activeSubjects.filter(s => s.category === 'Sport');

  console.log(`📊 Paris actifs en base : ${activePolymarket.length} Polymarket, ${activeSports.length} Sports.`);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // ==========================================
  // POLYMARKET
  // ==========================================
  console.log("🌐 Scan Polymarket...");
  try {
    const polyRes = await fetch("https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100");
    const polyEvents = await polyRes.json();
    
    // Refresh existants
    for (const sub of activePolymarket) {
      const event = polyEvents.find(e => e.markets && e.markets.some(m => m.id === sub.external_id));
      if (event) {
        const primaryMarket = event.markets.find(m => m.id === sub.external_id);
        if (primaryMarket) {
          const outcomesStrs = JSON.parse(primaryMarket.outcomes);
          const pricesStrs = JSON.parse(primaryMarket.outcomePrices);
          const newOutcomes = [...sub.outcomes];
          
          outcomesStrs.forEach((label, idx) => {
            let price = Number(pricesStrs[idx]);
            if (price < 0.01) price = 0.01; if (price > 0.99) price = 0.99;
            let odds = Number(Math.min(1 / price, 100).toFixed(2));
            const existingOpt = newOutcomes.find(o => o.label.toLowerCase() === (label === "Yes" ? "oui" : label === "No" ? "non" : label.toLowerCase()));
            if (existingOpt) existingOpt.odds = odds;
          });
          
          await supabase.from('subjects').update({ outcomes: newOutcomes }).eq('id', sub.id);
        }
      }
    }

    // Création drafts
    if (new Date().getHours() < 12) {
      const BANNED = ["cricket", "nfl", "baseball", "india", "biden", "trump", "harris", "senate", "house", "congress", "gop"];
      let newPolyCount = 0;

      for (const event of polyEvents) {
        if (newPolyCount >= 2) break; // Limite stricte : 2 paris Polymarket max par jour
        
        if (!event.markets || event.markets.length === 0) continue;
        const titleLower = event.title.toLowerCase();
        if (BANNED.some(w => titleLower.includes(w))) continue;

        const primaryMarket = event.markets.sort((a, b) => Number(b.volume) - Number(a.volume))[0];
        if (Number(primaryMarket.volume) < 100000) continue;
        
        const endDate = new Date(primaryMarket.endDate);
        // On refuse les vieux, et on refuse ce qui finit dans plus de 7 jours (car < 24h c'est introuvable sur Poly)
        if (endDate <= now || endDate > nextWeek) continue;

        const exists = activeSubjects.some(s => s.external_id === primaryMarket.id);
        if (exists) continue;

        const outcomesStrs = JSON.parse(primaryMarket.outcomes);
        const pricesStrs = JSON.parse(primaryMarket.outcomePrices);
        const outcomes = outcomesStrs.map((label, idx) => {
          let price = Number(pricesStrs[idx]);
          if (price < 0.01) price = 0.01; if (price > 0.99) price = 0.99;
          const finalLabel = label === "Yes" ? "Oui" : label === "No" ? "Non" : label;
          return {
            id: finalLabel.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            label: finalLabel,
            odds: Number(Math.min(1 / price, 100).toFixed(2))
          };
        });

        if (outcomes.length >= 2) {
          await supabase.from('subjects').insert({
            creator_id: adminId,
            title: event.title.replace(/'/g, "''"),
            category: 'Polymarket',
            image_url: event.image || primaryMarket.image || null,
            closes_at: primaryMarket.endDate,
            outcomes: outcomes,
            external_id: primaryMarket.id,
            status: 'draft'
          });
          newPolyCount++;
          console.log(`🆕 [Poly] Nouveau brouillon : ${event.title}`);
        }
      }
    }
  } catch (e) {
    console.error("Erreur Polymarket :", e.message);
  }

  // ==========================================
  // SPORTS
  // ==========================================
  console.log("⚽ Scan The Odds API...");
  try {
    let sportsToScan = new Set();
    activeSports.forEach(s => {
      if (s.external_id && s.external_id.includes('::')) sportsToScan.add(s.external_id.split('::')[0]);
    });
    if (new Date().getHours() < 12) MORNING_SPORTS_TO_SCAN.forEach(s => sportsToScan.add(s));

    let newSportCount = 0;

    for (const sport of sportsToScan) {
      try {
        const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h`;
        const res = await fetch(url);
        if (res.status === 422) continue; 
        const matches = await res.json();
        if (!Array.isArray(matches)) continue;

        for (const match of matches) {
          const extId = `${sport}::${match.id}`;
          const existingSubject = activeSports.find(s => s.external_id === extId);
          
          const bookmaker = match.bookmakers && match.bookmakers[0];
          if (!bookmaker) continue;
          const h2h = bookmaker.markets.find(m => m.key === 'h2h');
          if (!h2h || !h2h.outcomes) continue;

          if (existingSubject) {
            const newOutcomes = [...existingSubject.outcomes];
            h2h.outcomes.forEach(o => {
              let label = o.name; if (label === "Draw") label = "Match Nul";
              const opt = newOutcomes.find(ex => ex.label === label);
              if (opt) opt.odds = Number(o.price.toFixed(2));
            });
            await supabase.from('subjects').update({ outcomes: newOutcomes }).eq('id', existingSubject.id);
            continue;
          }

          if (new Date().getHours() < 12 && newSportCount < 10) {
            const matchTime = new Date(match.commence_time);
            if (matchTime > now && matchTime <= tomorrow && isVipMatch(match.home_team, match.away_team, sport)) {
              const outcomes = h2h.outcomes.map(o => {
                let label = o.name; if (label === "Draw") label = "Match Nul";
                return {
                  id: label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                  label: label,
                  odds: Number(o.price.toFixed(2))
                };
              });
              await supabase.from('subjects').insert({
                creator_id: adminId,
                title: `${match.home_team} vs ${match.away_team}`,
                category: 'Sport',
                image_url: null,
                closes_at: match.commence_time,
                outcomes: outcomes,
                external_id: extId,
                status: 'draft'
              });
              newSportCount++;
              console.log(`🆕 [Sport] Nouveau brouillon : ${match.home_team} vs ${match.away_team}`);
            }
          }
        }
      } catch (e) {
        console.error(`Erreur TheOddsAPI sur ${sport} :`, e.message);
      }
    }
  } catch (e) {
    console.error("Erreur Sports :", e.message);
  }

  console.log("🎉 Fin de l'exécution du Bot IsaMarket.");
}

updateOddsAndCreateDrafts().catch(console.error);
