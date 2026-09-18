import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const url = html.match(/const SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1];
const key = html.match(/const SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)/)?.[1]
  || readFileSync(new URL('./verify-la-runtime-crud.mjs', import.meta.url), 'utf8')
    .match(/const SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)/)[1];
const userKey = `fp_daily_${randomUUID().replaceAll('-', '')}`;
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const created = [];
async function edge(name, body) {
  const response = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST', headers, body: JSON.stringify({ user_key: userKey, ...body }),
  });
  return { ...await response.json(), status: response.status };
}
const response = await fetch(`${url}/rest/v1/la_meals?school_id=eq.1863&select=id,school_id&order=id.desc&limit=6`, { headers });
assert(response.ok);
const meals = await response.json();
assert.equal(meals.length, 6);
const body = meal => ({ meal_id: meal.id, school_id: meal.school_id, score: 4, nickname: 'limit test', comment: 'daily quota verification' });
try {
  assert((await edge('set-user-school', { source: 'fp', school_id: 1863, nickname: 'limit test' })).ok);
  // Actual simultaneous network requests exercise row-lock serialization.
  const results = await Promise.all(meals.map(meal => edge('submit-review', body(meal))));
  created.push(...results.filter(r => r.ok).map(r => r.rating.id));
  assert.equal(created.length, 3, JSON.stringify(results));
  assert.equal(results.filter(r => r.status === 429 && r.error === 'REVIEW_DAILY_LIMIT_REACHED').length, 3, JSON.stringify(results));
  assert.deepEqual(results.filter(r => r.ok).map(r => r.daily_remaining).sort(), [0, 1, 2]);
  const reviewId = created[0];
  assert((await edge('update-review', { review_id: reviewId, score: 5, comment: 'edited after daily limit', nickname: 'limit test' })).ok);
  for (let i = 0; i < 4; i++) {
    assert((await edge('create-review-comment', { rating_id: reviewId, comment: `unlimited comment ${i}`, nickname: 'limit test' })).ok);
    assert((await edge('react-review', { rating_id: reviewId, reaction: 'like', nickname: 'limit test' })).ok);
  }
  assert((await edge('delete-review', { review_id: reviewId })).ok);
  const rejectedMeal = meals[results.findIndex(r => r.status === 429)];
  assert.equal((await edge('submit-review', body(rejectedMeal))).error, 'REVIEW_DAILY_LIMIT_REACHED');
  const direct = await fetch(`${url}/rest/v1/rpc/la_submit_review_limited`, {
    method: 'POST', headers, body: JSON.stringify({ p_review: { ...body(rejectedMeal), user_key: userKey } }),
  });
  assert([401, 403].includes(direct.status), `Public RPC accessible: ${direct.status}`);
  console.log(JSON.stringify({ ok: true, userKey, concurrent: { accepted: 3, limited: 3 },
    editAfterLimit: true, fourCommentsAfterLimit: true, fourReactionsAfterLimit: true,
    deletionDoesNotReset: true, publicRpcDenied: direct.status }, null, 2));
} finally {
  for (const id of created) {
    const result = await edge('delete-review', { review_id: id });
    if (!result.ok && result.status !== 404) throw new Error(`Cleanup failed: ${JSON.stringify(result)}`);
  }
}
