import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Read-only network checks: OPTIONS requests and one-row public GETs only.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const url = html.match(/const SUPABASE_URL = '([^']+)'/)[1];
const apikey = html.match(/const SUPABASE_KEY = '([^']+)'/)[1];
const origins = ['apps', 'private-apps', 'web', 'private-web'].map(prefix => `https://lunch-arena.${prefix}.tossmini.com`);
const endpoints = ['get-user-school', 'set-user-school', 'submit-review', 'update-review', 'delete-review', 'react-review', 'create-battle', 'vote-battle', 'replace-battle-opponent', 'create-review-photo-upload', 'review-photo-urls'];

for (const origin of origins) {
  for (const name of endpoints) {
    const response = await fetch(`${url}/functions/v1/${name}`, {
      method: 'OPTIONS', signal: AbortSignal.timeout(15000),
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'apikey,authorization,content-type' },
    });
    assert.ok(response.ok, `${origin} ${name}: HTTP ${response.status}`);
    assert.ok(['*', origin].includes(response.headers.get('access-control-allow-origin')), `${name}: origin rejected`);
    const allowed = response.headers.get('access-control-allow-headers')?.toLowerCase() || '';
    for (const header of ['apikey', 'authorization', 'content-type']) assert.ok(allowed.includes(header), `${name}: ${header} not allowed`);
    assert.match(response.headers.get('access-control-allow-methods') || '', /POST|\*/i, `${name}: POST not allowed`);
  }
  const response = await fetch(`${url}/rest/v1/la_schools?select=id&limit=1`, {
    signal: AbortSignal.timeout(15000), headers: { Origin: origin, apikey, Authorization: `Bearer ${apikey}` },
  });
  assert.ok(response.ok, `${origin}: REST HTTP ${response.status}`);
  assert.ok(['*', origin].includes(response.headers.get('access-control-allow-origin')), 'REST origin rejected');
  assert.ok(Array.isArray(await response.json()), 'REST data unavailable');
  console.log(`PASS ${origin}: ${endpoints.length} preflights + public REST GET`);
}
