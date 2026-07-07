import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

function sqlQuery(sql) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const dir = mkdtempSync(join(tmpdir(), "la-crud-sql-"));
  const file = join(dir, "query.sql");
  writeFileSync(file, sql, "utf8");
  let output = "";
  try {
    output = execFileSync(
      npx,
      ["--yes", "supabase", "db", "query", "--linked", "--file", file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  assert(start >= 0 && end > start, "Could not parse supabase db query output", { output });
  return JSON.parse(output.slice(start, end + 1));
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

function latestMeals() {
  const result = sqlQuery(`
    with my_meal as (
      select m.id, m.school_id, m.meal_date, coalesce(m.auto_score, 0) as auto_score
      from public.la_meals m
      where m.school_id = ${SCHOOL_ID}
      order by m.meal_date desc, m.id desc
      limit 1
    )
    select
      (select jsonb_build_object('id', id, 'school_id', school_id, 'meal_date', meal_date, 'auto_score', auto_score) from my_meal) as mine,
      (
        select jsonb_agg(jsonb_build_object('id', m.id, 'school_id', m.school_id, 'meal_date', m.meal_date, 'auto_score', coalesce(m.auto_score, 0)) order by m.id)
        from public.la_meals m
        join my_meal mm on mm.meal_date = m.meal_date
        where m.school_id <> ${SCHOOL_ID}
        limit 3
      ) as opponents;
  `);
  const row = result.rows?.[0] || {};
  return { mine: row.mine, opponents: row.opponents || [] };
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

  const countsBeforeDelete = sqlQuery(`
    select
      (select count(*) from public.la_reviews where id = ${reviewId} and user_key = '${userKey}') as la_reviews,
      (select count(*) from public.la_review_comments where rating_id = ${reviewId} and user_key = '${userKey}') as la_review_comments,
      (select count(*) from public.la_review_reactions where rating_id = ${reviewId} and user_key = '${userKey}' and reaction = 'dislike') as la_review_reactions,
      (select count(*) from public.ratings where user_key = '${userKey}') as legacy_ratings,
      (select count(*) from public.review_comments where user_key = '${userKey}') as legacy_review_comments,
      (select count(*) from public.review_reactions where user_key = '${userKey}') as legacy_review_reactions;
  `).rows?.[0] || {};
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

  const meals = latestMeals();
  assert(meals.mine?.id && meals.opponents.length >= 2, "Not enough meals for battle verification", meals);
  const first = meals.opponents[0];
  const second = meals.opponents[1];
  const battleDate = `2099-12-${String((Number(runId.slice(-2)) % 27) + 1).padStart(2, "0")}`;
  sqlQuery(`
    delete from public.la_battles
    where battle_date = '${battleDate}'
      and ${SCHOOL_ID} in (school_a_id, school_b_id);
  `);

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

  const battleCounts = sqlQuery(`
    select
      (select count(*) from public.la_battles where id = ${replaced.battle.id}) as la_battles,
      (select count(*) from public.la_battle_votes where battle_id = ${replaced.battle.id} and user_key = '${userKey}') as la_battle_votes,
      (select count(*) from public.battle_votes where user_key = '${userKey}') as legacy_battle_votes;
  `).rows?.[0] || {};
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
