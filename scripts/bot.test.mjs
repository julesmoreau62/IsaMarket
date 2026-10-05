import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parisDay, updateOddsAndCreateDrafts } from './bot.js';

const now = new Date('2026-10-04T11:50:00Z'); // A delayed morning job: 13:50 in Paris.
const logger = { log() {}, error() {} };
const options = [{ id: 'alpha', label: 'Alpha', odds: 2 }, { id: 'beta', label: 'Beta', odds: 3 }];

// In-memory Data API double: no production keys, writes, or provider requests.
function database(seed = [], beforeUpdate) {
  const rows = structuredClone(seed);
  const writes = [];
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.operation = 'select'; }
    select() { return this; }
    eq(key, value) { this.filters.push(row => row[key] === value); return this; }
    in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
    gt(key, value) { this.filters.push(row => row[key] > value); return this; }
    not(key, _operator, value) { this.filters.push(row => row[key] !== value && row[key] !== undefined); return this; }
    limit() { return this; }
    single() { this.one = true; return this; }
    upsert(row, config) { this.operation = 'upsert'; this.row = row; this.config = config; return this; }
    update(patch) { this.operation = 'update'; this.patch = patch; return this; }
    then(resolve, reject) {
      return Promise.resolve().then(() => {
        if (this.table === 'memberships') return { data: { user_id: 'admin', role: 'admin', status: 'active' }, error: null };
        assert.equal(this.table, 'subjects');
        if (this.operation === 'upsert') {
          assert.deepEqual(this.config, { onConflict: 'external_id', ignoreDuplicates: true });
          if (rows.some(row => row.external_id === this.row.external_id)) return { data: [], error: null };
          const row = { id: `new-${rows.length}`, conditions_locked: false, creation_day: parisDay(now), ...structuredClone(this.row) };
          rows.push(row); writes.push({ operation: 'insert', row });
          return { data: [{ id: row.id }], error: null };
        }
        if (this.operation === 'update') beforeUpdate?.(rows);
        const selected = rows.filter(row => this.filters.every(filter => filter(row)));
        if (this.operation === 'update') selected.forEach(row => {
          assert.equal(row.conditions_locked, false, 'Changed locked odds');
          Object.assign(row, structuredClone(this.patch)); writes.push({ operation: 'update', row });
        });
        return { data: structuredClone(selected), error: null };
      }).then(resolve, reject);
    }
  }
  return { rows, writes, from: table => new Query(table) };
}

function providers({ sportCount = 12, polyCount = 3, failPolymarket = false, failSports = false } = {}) {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    const parsed = new URL(url);
    let data;
    if (parsed.hostname === 'gamma-api.polymarket.com') {
      if (failPolymarket) return { ok: false, status: 503 };
      data = Array.from({ length: polyCount }, (_, i) => ({
        title: `Culture question ${i}`, markets: [{ id: `poly-${i}`, volume: 200000,
          endDate: '2026-10-06T18:00:00Z', outcomes: '["Yes","No"]', outcomePrices: '["0.5","0.5"]' }]
      }));
    } else if (parsed.pathname === '/v4/sports/') {
      if (failSports) return { ok: false, status: 401 };
      data = [{ key: 'soccer_epl', active: true }];
    } else {
      assert.equal(parsed.pathname, '/v4/sports/soccer_epl/odds/');
      data = Array.from({ length: sportCount }, (_, i) => ({
        id: `match-${i}`, home_team: 'Alpha', away_team: 'Beta', commence_time: '2026-10-05T18:00:00Z',
        bookmakers: [{ markets: [{ key: 'h2h', outcomes: [{ name: 'Alpha', price: 2.5 }, { name: 'Beta', price: 3.5 }] }] }]
      }));
    }
    return { ok: true, status: 200, json: async () => structuredClone(data) };
  };
  return { requests, fetchImpl };
}

test('delayed morning run creates drafts after noon; repeats respect daily quotas', async () => {
  const supabase = database(); const api = providers();
  const first = await updateOddsAndCreateDrafts({ supabase, now, logger, oddsApiKey: 'test-key', fetchImpl: api.fetchImpl });
  assert.deepEqual(first, { day: '2026-10-04', sportCreated: 10, polymarketCreated: 2, errors: [] });
  assert.equal(supabase.rows.length, 12);
  assert.ok(supabase.rows.every(row => row.status === 'draft'), 'Suggestions bypassed admin validation');
  const again = await updateOddsAndCreateDrafts({ supabase, now, logger, oddsApiKey: 'test-key', fetchImpl: api.fetchImpl });
  assert.equal(again.sportCreated, 0); assert.equal(again.polymarketCreated, 0);
  assert.equal(supabase.rows.length, 12);
  assert.ok(!api.requests.some(url => url.includes('rugby_union_six_nations') || url.includes('tennis_atp_australian_open')));
});

test('daily quota includes resolved imports; settled external IDs are never recreated', async () => {
  const supabase = database([{ id: 'old', external_id: 'soccer_epl::match-0', category: 'Sport', status: 'resolved', creation_day: '2026-10-03' }]);
  const api = providers({ sportCount: 2, polyCount: 0 });
  const result = await updateOddsAndCreateDrafts({ supabase, now, logger, oddsApiKey: 'test', fetchImpl: api.fetchImpl });
  assert.equal(result.sportCreated, 1);
  assert.equal(supabase.rows.filter(row => row.external_id === 'soccer_epl::match-0').length, 1);
  const capped = database(Array.from({ length: 10 }, (_, i) => ({ id: `old-${i}`, external_id: `resolved-${i}`, category: 'Sport', status: 'resolved', creation_day: '2026-10-04' })));
  const cappedApi = providers({ polyCount: 0 });
  const cappedResult = await updateOddsAndCreateDrafts({ supabase: capped, now, logger, oddsApiKey: 'test', fetchImpl: cappedApi.fetchImpl });
  assert.equal(cappedResult.sportCreated, 0);
  assert.ok(!cappedApi.requests.some(url => url.includes('/odds/')), 'Unnecessary paid scan after daily quota');
});

test('refresh preserves locked odds, including a wager placed while the bot is running', async () => {
  const seed = [0, 1].map(i => ({ id: `existing-${i}`, external_id: `soccer_epl::match-${i}`, category: 'Sport',
    status: 'open', conditions_locked: i === 0, closes_at: '2026-10-05T18:00:00Z', creation_day: '2026-10-03', outcomes: options }));
  const api = providers({ sportCount: 2, polyCount: 0 });
  const supabase = database(seed, rows => { rows.find(row => row.id === 'existing-1').conditions_locked = true; });
  await updateOddsAndCreateDrafts({ supabase, now, logger, oddsApiKey: 'test', fetchImpl: api.fetchImpl });
  assert.deepEqual(supabase.rows[0].outcomes, options); assert.deepEqual(supabase.rows[1].outcomes, options);
  assert.equal(supabase.writes.filter(write => write.operation === 'update').length, 0);
  const unlocked = database([seed[1]]);
  await updateOddsAndCreateDrafts({ supabase: unlocked, now, logger, oddsApiKey: 'test', fetchImpl: api.fetchImpl });
  assert.equal(unlocked.rows[0].outcomes[0].odds, 2.5);
});

test('provider failures and missing keys are reported without hiding other successful imports', async () => {
  const api = providers({ failPolymarket: true, sportCount: 1 });
  const result = await updateOddsAndCreateDrafts({ supabase: database(), now, logger, oddsApiKey: 'test', fetchImpl: api.fetchImpl });
  assert.equal(result.sportCreated, 1); assert.match(result.errors[0], /503/);
  const missing = await updateOddsAndCreateDrafts({ supabase: database(), now, logger, fetchImpl: providers({ polyCount: 0 }).fetchImpl });
  assert.match(missing.errors[0], /ODDS_API_KEY manquante/);
  const unauthorized = await updateOddsAndCreateDrafts({ supabase: database(), now, logger, oddsApiKey: 'test', fetchImpl: providers({ failSports: true }).fetchImpl });
  assert.match(unauthorized.errors[0], /401/);
  const cli = spawnSync(process.execPath, ['scripts/bot.js'], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(cli.status, 1); assert.match(cli.stderr, /SUPABASE_SERVICE_ROLE_KEY manquante/);
});

test('Paris daily quotas follow the local calendar in summer and winter', () => {
  assert.equal(parisDay(new Date('2026-10-04T22:30:00Z')), '2026-10-05');
  assert.equal(parisDay(new Date('2026-10-25T22:30:00Z')), '2026-10-25');
  assert.equal(parisDay(new Date('2026-10-25T23:30:00Z')), '2026-10-26');
});
