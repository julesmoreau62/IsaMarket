import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

const SPORT_LOOKAHEAD_HOURS = 72;
const MAX_NEW_SPORT_DRAFTS = 10;

const DAILY_SPORTS_TO_SCAN = [
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

async function requireSuccess(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export function parisDay(now) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export async function updateOddsAndCreateDrafts({ supabase, oddsApiKey, fetchImpl = fetch, now = new Date(), logger = console }) {
  const summary = { day: parisDay(now), sportCreated: 0, polymarketCreated: 0, errors: [] };
  const reportError = (context, error) => {
    summary.errors.push(`${context} : ${error.message}`);
    logger.error(`${context} :`, error.message);
  };
  const fetchJson = async (url, source) => {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${source} : HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`Réponse ${source} invalide.`);
    return data;
  };
  const insertDraft = async (draft) => {
    // Do not recreate settled imports or fail on concurrent/repeated external IDs.
    const rows = await requireSuccess(supabase.from('subjects')
      .upsert(draft, { onConflict: 'external_id', ignoreDuplicates: true }).select('id'));
    return Boolean(rows?.length);
  };
  const refreshOdds = async (subject, outcomes) => {
    await requireSuccess(supabase.from('subjects').update({ outcomes })
      .eq('id', subject.id).eq('conditions_locked', false)
      .in('status', ['open', 'draft']).gt('closes_at', now.toISOString()));
  };
  logger.log("🚀 Démarrage du Bot IsaMarket...");

  const adminData = await requireSuccess(supabase.from('memberships').select('user_id').eq('role', 'admin').eq('status', 'active').limit(1).single());
  if (!adminData) throw new Error("Aucun admin trouvé !");
  const adminId = adminData.user_id;

  const activeSubjects = await requireSuccess(supabase.from('subjects')
    .select('*')
    .in('status', ['open', 'draft']).gt('closes_at', now.toISOString()));
  const importedToday = await requireSuccess(supabase.from('subjects').select('category')
    .eq('creation_day', summary.day).not('external_id', 'is', null));
  let newPolyCount = importedToday.filter((subject) => subject.category === 'Polymarket').length;
  let newSportCount = importedToday.filter((subject) => subject.category === 'Sport').length;

  if (!activeSubjects) throw new Error("Impossible de charger les sujets actifs.");
  const activePolymarket = activeSubjects.filter(s => s.category === 'Polymarket');
  const activeSports = activeSubjects.filter(s => s.category === 'Sport');

  logger.log(`📊 Paris actifs en base : ${activePolymarket.length} Polymarket, ${activeSports.length} Sports.`);

  const sportWindowEnd = new Date(now.getTime() + SPORT_LOOKAHEAD_HOURS * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // ==========================================
  // POLYMARKET
  // ==========================================
  logger.log("🌐 Scan Polymarket...");
  try {
    const polyEvents = await fetchJson("https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100", 'Polymarket');
    
    // Refresh existants
    for (const sub of activePolymarket) {
      // The database freezes market conditions after the first wager.
      if (sub.conditions_locked) continue;
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
          
          await refreshOdds(sub, newOutcomes);
        }
      }
    }

    // Création drafts
    // A delayed morning job must still generate today's suggestions after noon.
    if (newPolyCount < 2) {
      const BANNED = ["cricket", "nfl", "baseball", "india", "biden", "trump", "harris", "senate", "house", "congress", "gop"];

      for (const event of polyEvents) {
        if (newPolyCount >= 2) break; // Limite stricte : 2 paris Polymarket max par jour
        
        if (!event.markets || event.markets.length === 0) continue;
        const titleLower = event.title.toLowerCase();
        if (BANNED.some(w => titleLower.includes(w))) continue;

        const primaryMarket = [...event.markets].sort((a, b) => Number(b.volume) - Number(a.volume))[0];
        if (Number(primaryMarket.volume) < 100000) continue;
        
        const endDate = new Date(primaryMarket.endDate);
        // On refuse les vieux, et on refuse ce qui finit dans plus de 7 jours (car < 24h c'est introuvable sur Poly)
        if (!Number.isFinite(endDate.getTime()) || endDate <= now || endDate > nextWeek) continue;

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
          const inserted = await insertDraft({
            creator_id: adminId,
            title: event.title,
            category: 'Polymarket',
            image_url: event.image || primaryMarket.image || null,
            closes_at: primaryMarket.endDate,
            outcomes: outcomes,
            external_id: primaryMarket.id,
            status: 'draft'
          });
          if (inserted) {
            newPolyCount++; summary.polymarketCreated++;
            logger.log(`🆕 [Poly] Nouveau brouillon : ${event.title}`);
          }
        }
      }
    }
  } catch (e) {
    reportError('Erreur Polymarket', e);
  }

  // ==========================================
  // SPORTS
  // ==========================================
  logger.log("⚽ Scan The Odds API...");
  try {
    if (!oddsApiKey) throw new Error('ODDS_API_KEY manquante.');
    const sportsToScan = new Set();
    activeSports.forEach(s => {
      if (s.external_id && s.external_id.includes('::')) sportsToScan.add(s.external_id.split('::')[0]);
    });
    if (newSportCount < MAX_NEW_SPORT_DRAFTS) DAILY_SPORTS_TO_SCAN.forEach(s => sportsToScan.add(s));
    // The sports endpoint is free of quota costs and excludes inactive competitions.
    const availableSports = await fetchJson(`https://api.the-odds-api.com/v4/sports/?apiKey=${encodeURIComponent(oddsApiKey)}`, 'The Odds API');
    const availableKeys = new Set(availableSports.filter(s => s.active !== false).map(s => s.key));

    for (const sport of sportsToScan) {
      if (!availableKeys.has(sport)) continue;
      if (newSportCount >= MAX_NEW_SPORT_DRAFTS && !activeSports.some(s => !s.conditions_locked && s.external_id?.startsWith(`${sport}::`))) continue;
      try {
        const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${encodeURIComponent(oddsApiKey)}&regions=eu&markets=h2h`;
        const matches = await fetchJson(url, 'The Odds API');

        for (const match of matches) {
          const extId = `${sport}::${match.id}`;
          const existingSubject = activeSports.find(s => s.external_id === extId);
          
          const bookmaker = match.bookmakers && match.bookmakers[0];
          if (!bookmaker) continue;
          const h2h = bookmaker.markets.find(m => m.key === 'h2h');
          if (!h2h || !h2h.outcomes) continue;

          if (existingSubject) {
            if (existingSubject.conditions_locked) continue;
            const newOutcomes = [...existingSubject.outcomes];
            h2h.outcomes.forEach(o => {
              let label = o.name; if (label === "Draw") label = "Match Nul";
              const opt = newOutcomes.find(ex => ex.label === label);
              if (opt) opt.odds = Number(o.price.toFixed(2));
            });
            await refreshOdds(existingSubject, newOutcomes);
            continue;
          }

          if (newSportCount < MAX_NEW_SPORT_DRAFTS) {
            const matchTime = new Date(match.commence_time);
            // All teams in the scanned competitions are eligible during the next 72 hours.
            if (matchTime > now && matchTime <= sportWindowEnd) {
              const outcomes = h2h.outcomes.map(o => {
                let label = o.name; if (label === "Draw") label = "Match Nul";
                return {
                  id: label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                  label: label,
                  odds: Number(o.price.toFixed(2))
                };
              });
              const inserted = await insertDraft({
                creator_id: adminId,
                title: `${match.home_team} vs ${match.away_team}`,
                category: 'Sport',
                image_url: null,
                closes_at: match.commence_time,
                outcomes: outcomes,
                external_id: extId,
                status: 'draft'
              });
              if (inserted) {
                newSportCount++; summary.sportCreated++;
                logger.log(`🆕 [Sport] Nouveau brouillon : ${match.home_team} vs ${match.away_team}`);
              }
            }
          }
        }
      } catch (e) {
        reportError(`Erreur TheOddsAPI sur ${sport}`, e);
      }
    }
  } catch (e) {
    reportError('Erreur Sports', e);
  }

  logger.log(`Bilan ${summary.day} : ${summary.sportCreated} nouveaux brouillons Sport, ${summary.polymarketCreated} Polymarket, ${summary.errors.length} erreur(s).`);
  if (newSportCount === 0) logger.log('Aucune nouvelle suggestion Sport disponible pour ce jour.');
  if (newPolyCount === 0) logger.log('Aucune nouvelle suggestion Polymarket disponible pour ce jour.');
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    process.exitCode = 1;
    console.error('ERREUR: SUPABASE_SERVICE_ROLE_KEY manquante.');
  } else {
    const supabase = createClient(process.env.SUPABASE_URL || 'https://xdjitzgqjsgcupwwipzz.supabase.co', serviceKey,
      { auth: { persistSession: false, autoRefreshToken: false } });
    updateOddsAndCreateDrafts({ supabase, oddsApiKey: process.env.ODDS_API_KEY })
      .then((summary) => { if (summary.errors.length) process.exitCode = 1; })
      .catch((error) => { process.exitCode = 1; console.error(error.message); });
  }
}
