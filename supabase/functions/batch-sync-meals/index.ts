import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NEIS_KEY = Deno.env.get('NEIS_API_KEY') || Deno.env.get('NEIS_KEY') || '';
const NEIS_KEY_PARAM = NEIS_KEY ? `KEY=${encodeURIComponent(NEIS_KEY)}&` : '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const POPULAR = ['치킨','피자','떡볶이','햄버거','돈까스','돈가스','카레','짜장','탕수육','제육','불고기','갈비','스파게티','파스타','라면','순대','핫도그','너겟'];
const DESSERTS = ['케이크','아이스크림','푸딩','젤리','요구르트','요거트','딸기','귤','사과','바나나','포도','수박','초코','쿠키','빵','주스','우유'];
const HEALTHY = ['나물','샐러드','두부','콩','시금치','브로콜리','당근','버섯','미역','김','고등어','연어','잡곡','보리','현미'];

type MealRow = {
  school_id: number;
  meal_date: string;
  meal_type: string;
  meal_type_label: string;
  neis_meal_code: string | null;
  menu: string[];
  calories: number | null;
  nutrition: string | null;
  auto_score: number;
  auto_rank: string;
};

function calcScore(menu: string[]): number {
  let score = 45;
  for (const item of menu) {
    if (POPULAR.some(p => item.includes(p))) score += 10;
    else if (DESSERTS.some(d => item.includes(d))) score += 5;
    else if (HEALTHY.some(h => item.includes(h))) score += 3;
  }
  score += Math.min(menu.length * 2, 10);
  return Math.min(Math.max(score, 0), 100);
}

function calcRank(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  return 'D';
}

function getWeekdays(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function normalizeMealType(code?: string, label?: string): { meal_type: string; meal_type_label: string } {
  const c = String(code || '').trim();
  const l = String(label || '').trim();
  if (c === '1' || l.includes('조')) return { meal_type: 'breakfast', meal_type_label: l || '조식' };
  if (c === '2' || l.includes('중')) return { meal_type: 'lunch', meal_type_label: l || '중식' };
  if (c === '3' || l.includes('석')) return { meal_type: 'dinner', meal_type_label: l || '석식' };
  if (l.includes('간')) return { meal_type: 'snack', meal_type_label: l || '간식' };
  return { meal_type: 'other', meal_type_label: l || '급식' };
}

function parseMenu(value: string | null | undefined): string[] {
  return String(value || '')
    .split('<br/>')
    .map((s: string) => s.replace(/\s*\([^)]*\)/g, '').trim())
    .filter((s: string) => s.length > 0);
}

async function fetchMealsFromNeis(atpt: string, code: string, date: string): Promise<MealRow[]> {
  const ymd = date.replace(/-/g, '');
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?${NEIS_KEY_PARAM}Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${atpt}&SD_SCHUL_CODE=${code}&MLSV_FROM_YMD=${ymd}&MLSV_TO_YMD=${ymd}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await r.json();
    const rows = json?.mealServiceDietInfo?.[1]?.row || [];
    return rows.map((row: any) => {
      const menu = parseMenu(row.DDISH_NM);
      const calStr = String(row.CAL_INFO || '').replace(/[^0-9.]/g, '');
      const calories = calStr ? parseFloat(calStr) : null;
      const score = calcScore(menu);
      const mealType = normalizeMealType(row.MMEAL_SC_CODE, row.MMEAL_SC_NM);
      return {
        school_id: 0,
        meal_date: date,
        meal_type: mealType.meal_type,
        meal_type_label: mealType.meal_type_label,
        neis_meal_code: row.MMEAL_SC_CODE || null,
        menu,
        calories,
        nutrition: row.NTR_INFO || null,
        auto_score: score,
        auto_rank: calcRank(score),
      };
    }).filter((meal: MealRow) => meal.menu.length > 0);
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return Response.json({ error: 'Required environment variables are not configured' }, { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* use defaults */ }

  const offset = Number(body.offset ?? 0);
  const batch_size = Number(body.batch_size ?? 30);
  const date_from = String(body.date_from ?? new Date().toISOString().slice(0, 10));
  const date_to = String(body.date_to ?? date_from);

  const { count } = await supabase.from('schools').select('*', { count: 'exact', head: true });
  const total = count ?? 0;

  const { data: schools, error: schoolsErr } = await supabase
    .from('schools')
    .select('id,atpt_code,school_code')
    .order('id')
    .range(offset, offset + batch_size - 1);

  if (schoolsErr || !schools || schools.length === 0) {
    return Response.json({ done: true, processed: 0, total, next_offset: offset }, { headers: corsHeaders });
  }

  const dates = getWeekdays(date_from, date_to);
  if (dates.length === 0) {
    return Response.json({ done: true, processed: 0, total, next_offset: offset, message: '평일 없음 (주말만 선택됨)' }, { headers: corsHeaders });
  }

  let saved = 0, errors = 0, empty = 0;

  for (const school of schools) {
    const results = await Promise.allSettled(
      dates.map(async (date) => {
        const meals = await fetchMealsFromNeis(school.atpt_code, school.school_code, date);
        if (meals.length === 0) { empty++; return; }

        const rows = meals.map((meal) => ({ ...meal, school_id: school.id }));
        const { error } = await supabase
          .from('meals')
          .upsert(rows, { onConflict: 'school_id,meal_date,meal_type' });

        if (error) errors++;
        else saved += rows.length;
      })
    );
    results.forEach(r => { if (r.status === 'rejected') errors++; });
    await new Promise(r => setTimeout(r, 100));
  }

  const next_offset = offset + schools.length;
  return Response.json({
    done: next_offset >= total,
    processed: schools.length,
    saved,
    empty,
    errors,
    next_offset,
    total,
    progress_pct: total > 0 ? Math.round(next_offset / total * 100) : 100,
  }, { headers: corsHeaders });
});
