// Isolated PostgreSQL; no production credentials or network database writes.
// Install test tools in the ignored .sites-runtime/qa directory before running.
import EmbeddedPostgres from '../.sites-runtime/qa/node_modules/embedded-postgres/dist/index.js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const results = [];
const base = path.resolve('.sites-runtime/qa');
mkdirSync(base, { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: path.join(base, `db-${Date.now()}`), port: 55439,
  user: 'postgres', password: randomUUID(), persistent: true,
  postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: () => {},
});
const clients = [];
async function connection() { const c = pg.getPgClient(); await c.connect(); clients.push(c); return c; }
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function asUser(c, id, sql, args = []) {
  await c.query('begin');
  try {
    await c.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
    await c.query('set local role authenticated');
    const result = await c.query(sql, args);
    await c.query('commit'); return result;
  } catch (error) { await c.query('rollback'); throw error; }
}
function passed(name) { results.push(name); console.log(`PASS ${name}`); }
try {
  await pg.initialise(); await pg.start();
  const db = await connection();
  await db.query(`create role anon; create role authenticated;
    create schema auth; create schema extensions;
    create extension pgcrypto with schema extensions;
    create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;
    create publication supabase_realtime;`);
  await db.query(readFileSync('supabase/isamarket.sql', 'utf8'));
  await db.query(readFileSync('supabase/hardening.sql', 'utf8'));
  await db.query(readFileSync('supabase/verify.sql', 'utf8'));
  passed('full transactional suite on isolated PostgreSQL');
  const ids = Array.from({ length: 5 }, () => randomUUID());
  for (let i = 0; i < ids.length; i++) {
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',
      [ids[i], i === 0 ? 'tanguypavat8@gmail.com' : `qa-${i}@example.invalid`]);
  }
  const [admin,a,b,c,d] = ids;
  await asUser(db, admin, 'select public.complete_registration(null)');
  for (const id of [a,b,c,d]) {
    await asUser(db, id, 'select public.complete_registration(null)');
  }
  async function market(creator,title) {
    return (await asUser(db, creator, `select id from public.create_subject($1,'Contexte du test de concurrence.','Cours',null,clock_timestamp()+interval '1 day','Critères précis du test de concurrence.')`, [title])).rows[0].id;
  }
  const m1 = await market(admin,'Concurrence portefeuille ?');
  const m2 = await market(a,'Autre sujet concurrent ?');
  const m3 = await market(b,'Clôture après attente ?');
  const left = await connection(), right = await connection();
  const wagerSql = 'select public.place_wager($1,$2,$3,$4) receipt';
  let pair = await Promise.allSettled([
    asUser(left,a,wagerSql,[m1,'yes',800,randomUUID()]),
    asUser(right,a,wagerSql,[m2,'yes',800,randomUUID()]),
  ]);
  assert.equal(pair.filter((x) => x.status === 'fulfilled').length,1);
  assert.match(pair.find((x) => x.status === 'rejected').reason.message,/Solde insuffisant/);
  assert.equal(Number((await db.query('select balance from public.wallets where user_id=$1',[a])).rows[0].balance),200);
  passed('simultaneous 800 + 800 spending from a 1000 wallet: exactly one accepted');

  const req = randomUUID();
  pair = await Promise.all([
    asUser(left,b,wagerSql,[m1,'no',23,req]),
    asUser(right,b,wagerSql,[m1,'no',23,req]),
  ]);
  assert.equal(pair[0].rows[0].receipt.wager_id,pair[1].rows[0].receipt.wager_id);
  assert.equal(Number((await db.query('select balance from public.wallets where user_id=$1',[b])).rows[0].balance),977);
  passed('same simultaneous request creates one wager and one debit');

  const create = `select id from public.create_subject('Deux créations simultanées ?','Contexte du test de concurrence.','Cours',null,clock_timestamp()+interval '1 day','Critères précis du test de concurrence.')`;
  pair = await Promise.allSettled([asUser(left,c,create),asUser(right,c,create)]);
  assert.equal(pair.filter((x) => x.status === 'fulfilled').length,1);
  assert.match(pair.find((x) => x.status === 'rejected').reason.message,/déjà créé/);
  passed('two simultaneous creations consume exactly one Paris daily quota');

  // Hold the subject lock while a request waits beyond its deadline.
  await db.query("update public.subjects set closes_at=clock_timestamp()+interval '400 milliseconds' where id=$1",[m3]);
  await left.query('begin'); await left.query('select id from public.subjects where id=$1 for update',[m3]);
  const waiting = asUser(right,d,wagerSql,[m3,'yes',1,randomUUID()]).then(() => null, (error) => error);
  await delay(650); await left.query('commit');
  assert.match((await waiting).message,/mises sont closes/);
  passed('request waiting on a lock beyond deadline is rejected');

  const settle = "select public.resolve_subject($1,'yes','Justification du test concurrent.') receipt";
  const sum = Number((await db.query('select sum(balance) balance from public.wallets')).rows[0].balance);
  const pool = Number((await db.query('select sum(amount) amount from public.wagers where subject_id=$1',[m1])).rows[0].amount);
  pair = await Promise.all([asUser(left,admin,settle,[m1]),asUser(right,admin,settle,[m1])]);
  assert.equal(pair.filter((x) => x.rows[0].receipt.already_settled).length,1);
  assert.equal(Number((await db.query('select sum(balance) balance from public.wallets')).rows[0].balance),sum+pool);
  passed('simultaneous settlements pay exactly once');

  // Different subjects share several wallets; lock ordering must avoid deadlocks.
  const m4 = pair = (await asUser(db,d,create)).rows[0].id;
  for (const subject of [m2,m4]) for (const [id,side,amount] of [[b,'yes',9],[c,'yes',8],[d,'no',7]]) {
    await asUser(db,id,wagerSql,[subject,side,amount,randomUUID()]);
  }
  await Promise.all([asUser(left,admin,settle,[m2]),asUser(right,admin,settle,[m4])]);
  passed('settlements on separate subjects with shared wallets complete without deadlock');
  const supply = await db.query(`select (select sum(balance) from public.wallets)+coalesce((select sum(amount) from public.wagers where result='open'),0) total`);
  assert.equal(Number(supply.rows[0].total),5000);
  passed('all Squids conserved across concurrent operations');
  const ledger = await db.query(`select w.user_id from public.wallets w join public.wallet_transactions t on t.user_id=w.user_id group by w.user_id,w.balance having sum(t.amount)<>w.balance`);
  assert.equal(ledger.rowCount,0);
  passed('every wallet matches its ledger');
  writeFileSync(path.join(base,'results.json'),JSON.stringify({timestamp:new Date().toISOString(),postgres:(await db.query('select version()')).rows[0].version,passed:results},null,2));
} finally {
  for (const c of clients) await c.end().catch(() => {});
  await pg.stop();
}
