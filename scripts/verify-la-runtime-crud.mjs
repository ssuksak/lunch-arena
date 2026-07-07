const SUPABASE_URL = "https://puwthqzbounohrdmacgo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3RocXpib3Vub2hyZG1hY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjA2MzMsImV4cCI6MjA5MDg5NjYzM30.AxUjNNTnLv2xVNC_UMFE3o0x0-s_tFJnRcMr7mBNOy0";
const ORIGIN = "http://localhost:5173";
const SCHOOL_ID = 1863;
const ATPT_CODE = "D10";
const SCHOOL_CODE = "7240085";

const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const userKey = `fp_crud_${runId}`;

function assert(condition, message, detail) {
  if (!condition) {
    throw new Error(`${message}${detail ? `\n${JSON.stringify(detail, null, 2)}` : ""}`);
  }
}

function restHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

async function restJson(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: restHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  assert(response.ok, `REST request failed for ${path}`, { status: response.status, json });
  return json;
}

async function countRows(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: restHeaders({
      Prefer: "count=exact",
      Range: "0-0",
    }),
  });
  const text = await response.text().catch(() => "");
  const contentRange = response.headers.get("content-range") || "";
  assert(response.ok, `Count failed for ${path}`, { status: response.status, contentRange, text });
  const total = Number(contentRange.split("/")[1] || 0);
  return Number.isFinite(total) ? total : 0;
}

async function edge(name, body) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Origin: ORIGIN,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  json._status = response.status;
  return json;
}

async function preflight(name) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "OPTIONS",
    headers: {
      Origin: ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "apikey,authorization,content-type",
    },
  });
  const allowHeaders = response.headers.get("access-control-allow-headers") || "";
  assert(response.ok, `${name} CORS preflight failed`, { status: response.status, allowHeaders });
  assert(/apikey/i.test(allowHeaders), `${name} CORS missing apikey`, { allowHeaders });
}

async function directInsertShouldFail(path, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      Origin: ORIGIN,
    },
    body: JSON.stringify(body),
  });
  assert(response.status >= 400, `Direct REST insert unexpectedly succeeded for ${path}`, { status: response.status });
  return response.status;
}

async function latestMeals() {
  const mineRows = await restJson(
    `la_meals?school_id=eq.${SCHOOL_ID}&order=meal_date.desc,id.desc&limit=1&select=id,school_id,meal_date,auto_score`,
  );
  const mine = mineRows[0];
  if (!mine?.meal_date) return { mine: null, opponents: [] };

  const opponents = await restJson(
    `la_meals?meal_date=eq.${encodeURIComponent(mine.meal_date)}&school_id=neq.${SCHOOL_ID}&order=id.asc&limit=3&select=id,school_id,meal_date,auto_score`,
  );
  return {
    mine: { ...mine, auto_score: mine.auto_score || 0 },
    opponents: opponents.map((meal) => ({ ...meal, auto_score: meal.auto_score || 0 })),
  };
}

async function main() {
  for (const fn of [
    "set-user-school",
    "sync-meals",
    "submit-review",
    "update-review",
    "delete-review",
    "create-review-comment",
    "react-review",
    "create-battle",
    "replace-battle-opponent",
    "vote-battle",
  ]) {
    await preflight(fn);
  }

  const school = await edge("set-user-school", {
    user_key: userKey,
    source: "fp",
    school_id: SCHOOL_ID,
    nickname: "CRUD tester",
    idempotency_key: `crud:school:${runId}`,
  });
  assert(school.ok, "set-user-school failed", school);

  const mealSync = await edge("sync-meals", {
    atpt_code: ATPT_CODE,
    school_code: SCHOOL_CODE,
    date: "2026-06-30",
  });
  assert(mealSync.meal?.id, "sync-meals failed", mealSync);

  const review = await edge("submit-review", {
    user_key: userKey,
    source: "fp",
    meal_id: mealSync.meal.id,
    school_id: SCHOOL_ID,
    score: 4,
    comment: `runtime review ${runId}`,
    nickname: "CRUD tester",
    selected_menu_item: "runtime-menu",
    idempotency_key: `crud:review:${runId}`,
  });
  assert(review.ok && review.rating?.id, "submit-review failed", review);
  const reviewId = review.rating.id;

  const updated = await edge("update-review", {
    user_key: userKey,
    review_id: reviewId,
    score: 5,
    comment: `runtime review edited ${runId}`,
    nickname: "CRUD tester",
    selected_menu_item: "runtime-menu-edited",
  });
  assert(updated.ok && updated.review?.score === 5, "update-review failed", updated);

  const comment = await edge("create-review-comment", {
    user_key: userKey,
    rating_id: reviewId,
    nickname: "CRUD tester",
    comment: `runtime comment ${runId}`,
  });
  assert(comment.ok && comment.comment?.id, "create-review-comment failed", comment);

  const liked = await edge("react-review", {
    user_key: userKey,
    rating_id: reviewId,
    nickname: "CRUD tester",
    reaction: "like",
  });
  assert(liked.ok && liked.selected === true, "react-review like failed", liked);

  const disliked = await edge("react-review", {
    user_key: userKey,
    rating_id: reviewId,
    nickname: "CRUD tester",
    reaction: "dislike",
  });
  assert(disliked.ok && disliked.selected === true && disliked.reaction?.reaction === "dislike", "react-review switch failed", disliked);

  const encodedUserKey = encodeURIComponent(userKey);
  const countsBeforeDelete = {
    la_reviews: await countRows(`la_reviews?select=id&id=eq.${reviewId}&user_key=eq.${encodedUserKey}`),
    la_review_comments: await countRows(`la_review_comments?select=id&rating_id=eq.${reviewId}&user_key=eq.${encodedUserKey}`),
    la_review_reactions: await countRows(`la_review_reactions?select=id&rating_id=eq.${reviewId}&user_key=eq.${encodedUserKey}&reaction=eq.dislike`),
    legacy_ratings: await countRows(`ratings?select=id&user_key=eq.${encodedUserKey}`),
    legacy_review_comments: await countRows(`review_comments?select=id&user_key=eq.${encodedUserKey}`),
    legacy_review_reactions: await countRows(`review_reactions?select=id&user_key=eq.${encodedUserKey}`),
  };
  assert(countsBeforeDelete.la_reviews === 1, "la_reviews count mismatch", countsBeforeDelete);
  assert(countsBeforeDelete.la_review_comments === 1, "la_review_comments count mismatch", countsBeforeDelete);
  assert(countsBeforeDelete.la_review_reactions === 1, "la_review_reactions count mismatch", countsBeforeDelete);
  assert(countsBeforeDelete.legacy_ratings === 0, "legacy ratings were written", countsBeforeDelete);
  assert(countsBeforeDelete.legacy_review_comments === 0, "legacy review_comments were written", countsBeforeDelete);
  assert(countsBeforeDelete.legacy_review_reactions === 0, "legacy review_reactions were written", countsBeforeDelete);

  const directStatus = await directInsertShouldFail("la_review_comments", {
    rating_id: reviewId,
    user_key: userKey,
    comment: "should fail",
  });

  const meals = await latestMeals();
  assert(meals.mine?.id && meals.opponents.length >= 2, "Not enough meals for battle verification", meals);
  const first = meals.opponents[0];
  const second = meals.opponents[1];
  const battleDate = new Date(Date.UTC(2099, 0, 1) + (Number(runId.slice(2)) % 36500) * 86400000)
    .toISOString()
    .slice(0, 10);

  let aId = Math.min(meals.mine.school_id, first.school_id);
  let bId = Math.max(meals.mine.school_id, first.school_id);
  let mineIsA = meals.mine.school_id === aId;
  const battle = await edge("create-battle", {
    user_key: userKey,
    battle_date: battleDate,
    school_a_id: aId,
    school_b_id: bId,
    meal_a_id: mineIsA ? meals.mine.id : first.id,
    meal_b_id: mineIsA ? first.id : meals.mine.id,
    score_a: mineIsA ? meals.mine.auto_score : first.auto_score,
    score_b: mineIsA ? first.auto_score : meals.mine.auto_score,
  });
  assert(battle.ok && battle.battle?.id, "create-battle failed", battle);

  aId = Math.min(meals.mine.school_id, second.school_id);
  bId = Math.max(meals.mine.school_id, second.school_id);
  mineIsA = meals.mine.school_id === aId;
  const replaced = await edge("replace-battle-opponent", {
    user_key: userKey,
    old_battle_id: battle.battle.id,
    battle_date: battleDate,
    school_a_id: aId,
    school_b_id: bId,
    meal_a_id: mineIsA ? meals.mine.id : second.id,
    meal_b_id: mineIsA ? second.id : meals.mine.id,
    score_a: mineIsA ? meals.mine.auto_score : second.auto_score,
    score_b: mineIsA ? second.auto_score : meals.mine.auto_score,
  });
  assert(replaced.ok && replaced.battle?.id, "replace-battle-opponent failed", replaced);

  const vote = await edge("vote-battle", {
    user_key: userKey,
    battle_id: replaced.battle.id,
    voted_school_id: SCHOOL_ID,
  });
  assert(vote.ok, "vote-battle failed", vote);

  const battleCounts = {
    la_battles: await countRows(`la_battles?select=id&id=eq.${replaced.battle.id}`),
    la_battle_votes: await countRows(`la_battle_votes?select=id&battle_id=eq.${replaced.battle.id}&user_key=eq.${encodedUserKey}`),
    legacy_battle_votes: await countRows(`battle_votes?select=id&user_key=eq.${encodedUserKey}`),
  };
  assert(battleCounts.la_battles === 1, "la_battles count mismatch", battleCounts);
  assert(battleCounts.la_battle_votes === 1, "la_battle_votes count mismatch", battleCounts);
  assert(battleCounts.legacy_battle_votes === 0, "legacy battle_votes were written", battleCounts);

  const deleted = await edge("delete-review", {
    user_key: userKey,
    review_id: reviewId,
  });
  assert(deleted.ok, "delete-review failed", deleted);

  console.log(JSON.stringify({
    ok: true,
    run_id: runId,
    user_key: userKey,
    direct_rest_insert_status: directStatus,
    review_id: reviewId,
    battle_id: replaced.battle.id,
    counts_before_review_delete: countsBeforeDelete,
    battle_counts: battleCounts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
