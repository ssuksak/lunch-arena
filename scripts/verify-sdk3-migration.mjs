import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function section(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing runtime section: ${start}`);
  return html.slice(from, to);
}
const identity = section('// ===== USER KEY', '// ===== NICKNAME');
const config = section('// ===== CONFIG', '// ===== RELEASE NOTICE');
const school = section('async function loadMySchool()', '// LA membership/profile');
const userHash = 'existing_user_hash_123456';
const seed = {
  arena_school: JSON.stringify({ id: 1863, name: 'Existing school' }),
  arena_nickname: 'ExistingNick', rated_123: '5',
  review_reaction_token_123: 'existing-token', voted_battle_123: 'a',
  release_notice_20260624_school_fix_v2: '1',
};

function runtime({ host = 'lunch-arena.apps.tossmini.com', getKey, storage = seed, native = false, env, profile } = {}) {
  const values = new Map(Object.entries(storage));
  const requests = [];
  let calls = 0;
  const context = {
    console, URL, Uint8Array, crypto: webcrypto,
    location: { hostname: host },
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key),
    },
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 15)), clearTimeout,
    AITBridge: {
      getAnonymousKey: async () => { calls++; return getKey ? getKey(calls) : { type: 'HASH', hash: userHash }; },
      getOperationalEnvironment: () => env,
    },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return { ok: true, text: async () => JSON.stringify(profile || { ok: true }) };
    },
  };
  if (native) context.ReactNativeWebView = { postMessage() {} };
  context.window = context;
  runInNewContext(config + identity + `
    let mySchool = null;
    let userNickname = null;
    function normalizeNickname(value) { return String(value || '').trim(); }
    function ensureNickname() { userNickname ||= localStorage.getItem('arena_nickname') || 'NewNick'; return userNickname; }
    function applyNickname() {}
    function applyMySchool() {}
    let syncCount = 0;
    async function saveMySchoolToDb() { syncCount++; }
    async function saveNicknameToDb() { syncCount++; }
  ` + school + `
    window.api = { getUserId, getInteractionUserKey, loadMySchool, edge,
      state: () => ({ mySchool, userNickname, syncCount }) };
  `, context);
  return { context, api: context.api, values, requests, calls: () => calls };
}

test('existing Toss user keeps the same server key and every local value', async () => {
  const r = runtime();
  const user = await r.api.getUserId();
  assert.equal(user.id, `toss_${userHash}`);
  assert.equal(user.source, 'toss');
  assert.deepEqual(Object.fromEntries(r.values), seed);
});

for (const response of ['ERROR', 'INVALID_CATEGORY', undefined, null, 'arbitrary-string', { type: 'HASH', hash: '' }]) {
  test(`invalid SDK response is never an identity: ${JSON.stringify(response)}`, async () => {
    const r = runtime({ getKey: () => response });
    await assert.rejects(r.api.getUserId());
    assert.equal(r.context.USER, null);
    assert.deepEqual(Object.fromEntries(r.values), seed);
    assert.equal(r.requests.length, 0);
  });
}

test('native bridge and SDK environment both prevent browser fallback on local hosts', async () => {
  for (const options of [{ native: true }, { env: 'toss' }, { host: 'lunch-arena.private-apps.tossmini.com' }, { host: 'lunch-arena.web.tossmini.com' }]) {
    const r = runtime({ host: 'localhost', ...options, getKey: () => { throw new Error('unavailable'); } });
    await assert.rejects(r.api.getUserId());
    assert.equal(r.context.USER, null);
    assert.deepEqual(Object.fromEntries(r.values), seed);
  }
});

test('concurrent calls share one successful SDK lookup', async () => {
  const r = runtime();
  const users = await Promise.all([r.api.getUserId(), r.api.getUserId(), r.api.getUserId()]);
  assert.equal(r.calls(), 1);
  assert.ok(users.every(user => user.id === `toss_${userHash}`));
});

test('transient SDK error retries without creating an fp identity', async () => {
  const r = runtime({ getKey: n => { if (n === 1) throw new Error('temporary'); return { type: 'HASH', hash: userHash }; } });
  assert.equal((await r.api.getUserId()).id, `toss_${userHash}`);
  assert.equal(r.calls(), 2);
  assert.deepEqual(Object.fromEntries(r.values), seed);
});

test('failed lookup can recover on the next attempt in the same page', async () => {
  let failed = true;
  const r = runtime({ getKey: () => { if (failed) throw new Error('temporary'); return { type: 'HASH', hash: userHash }; } });
  await assert.rejects(r.api.getUserId());
  failed = false;
  assert.equal((await r.api.getUserId()).id, `toss_${userHash}`);
});

test('missing bridge on a Toss host fails without changing local storage', async () => {
  const r = runtime();
  r.context.AITBridge = undefined;
  await assert.rejects(r.api.getUserId());
  assert.deepEqual(Object.fromEntries(r.values), seed);
});

test('hung SDK request eventually fails and does not create a new user', async () => {
  const r = runtime({ getKey: () => new Promise(() => {}) });
  await assert.rejects(r.api.getUserId());
  assert.equal(r.context.USER, null);
  assert.deepEqual(Object.fromEntries(r.values), seed);
});

test('ordinary browser keeps its existing fp identity', async () => {
  const storage = { ...seed, arena_fp: 'cid_existing_browser_123456' };
  const r = runtime({ host: 'ssuksak.github.io', storage, getKey: () => { throw new Error('outside Toss'); } });
  assert.equal((await r.api.getUserId()).id, `fp_${storage.arena_fp}`);
  assert.deepEqual(Object.fromEntries(r.values), storage);
});

test('Toss requests cannot send fp or unrelated user keys', async () => {
  const r = runtime();
  await r.api.getUserId();
  for (const key of ['fp_cid_another_user', 'toss_another_user_123456', null]) {
    await assert.rejects(r.api.edge('submit-review', { user_key: key }));
  }
  assert.equal(r.requests.length, 0);
  await r.api.edge('submit-review', { user_key: `toss_${userHash}` });
  assert.equal(r.requests.length, 1);
});

test('server profile wins over stale local cache and restores empty storage', async () => {
  for (const storage of [seed, {}]) {
    const r = runtime({ storage, profile: { ok: true, profile: { display_name: 'ServerNick' }, school: { id: 2000, name: 'Server school' } } });
    await r.api.loadMySchool();
    assert.equal(r.requests[0].body.user_key, `toss_${userHash}`);
    assert.equal(r.api.state().mySchool.id, 2000);
    assert.equal(r.values.get('arena_nickname'), 'ServerNick');
    assert.equal(JSON.parse(r.values.get('arena_school')).id, 2000);
    assert.equal(r.api.state().syncCount, 0);
  }
});

test('profile server error shows cache but never writes stale cache back', async () => {
  const r = runtime({ profile: { error: 'TEMPORARY_ERROR' } });
  await r.api.loadMySchool();
  assert.equal(r.api.state().mySchool.id, 1863);
  assert.equal(r.api.state().syncCount, 0);
});
