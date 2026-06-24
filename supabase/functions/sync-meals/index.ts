import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NEIS_KEY = Deno.env.get('NEIS_API_KEY') || Deno.env.get('NEIS_KEY') || '';
const NEIS_BASE = 'https://open.neis.go.kr/hub';
const NEIS_KEY_PARAM = NEIS_KEY ? `KEY=${encodeURIComponent(NEIS_KEY)}&` : '';

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

function scoreMeal(menu: string[]): { score: number; rank: string } {
  const str = menu.join(' ');
  const cnt = menu.length;
  const diversity = Math.min(cnt, 7) / 7 * 25;
  let popCnt = 0;
  for (const p of POPULAR) if (str.includes(p)) popCnt++;
  const popular = Math.min(popCnt, 3) / 3 * 25;
  let hCnt = 0;
  for (const h of HEALTHY) if (str.includes(h)) hCnt++;
  const nutrition = Math.min(hCnt, 3) / 3 * 25;
  let dCnt = 0;
  for (const d of DESSERTS) if (str.includes(d)) dCnt++;
  const dessert = dCnt > 0 ? 25 : 0;
  const total = Math.round(diversity + popular + nutrition + dessert);
  let rank = 'D';
  if (total >= 90) rank = 'S';
  else if (total >= 75) rank = 'A';
  else if (total >= 55) rank = 'B';
  else if (total >= 35) rank = 'C';
  return { score: total, rank };
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

function preferredMeal(meals: MealRow[] | null | undefined) {
  if (!meals || meals.length === 0) return null;
  return meals.find(m => m.meal_type === 'lunch') || meals[0];
}

function parseMenu(value: string | null | undefined) {
  return String(value || '')
    .split('<br/>')
    .map((x: string) => x.replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { atpt_code, school_code, date } = await req.json();

    if (!atpt_code || !school_code || !date) {
      return new Response(JSON.stringify({ error: 'atpt_code, school_code, date required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('atpt_code', atpt_code)
      .eq('school_code', school_code)
      .single();

    if (!school) {
      return new Response(JSON.stringify({ error: 'School not found in DB' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: existing } = await supabase
      .from('meals')
      .select('*')
      .eq('school_id', school.id)
      .eq('meal_date', date);
    const cachedMeals = (existing || []) as MealRow[];

    const dateStr = date.replace(/-/g, '');
    const url = `${NEIS_BASE}/mealServiceDietInfo?${NEIS_KEY_PARAM}Type=json&ATPT_OFCDC_SC_CODE=${atpt_code}&SD_SCHUL_CODE=${school_code}&MLSV_YMD=${dateStr}`;
    const res = await fetch(url);
    const data2 = await res.json();

    if (!data2.mealServiceDietInfo) {
      return new Response(JSON.stringify({ success: true, cached: cachedMeals.length > 0, meal: preferredMeal(cachedMeals), meals: cachedMeals, message: 'No meal data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const rows = data2.mealServiceDietInfo[1]?.row || [];
    const mealRows: MealRow[] = rows.map((m: any) => {
      const menu = parseMenu(m.DDISH_NM);
      const calories = parseFloat(m.CAL_INFO) || null;
      const { score, rank } = scoreMeal(menu);
      const mealType = normalizeMealType(m.MMEAL_SC_CODE, m.MMEAL_SC_NM);
      return {
        school_id: school.id,
        meal_date: date,
        meal_type: mealType.meal_type,
        meal_type_label: mealType.meal_type_label,
        neis_meal_code: m.MMEAL_SC_CODE || null,
        menu,
        calories,
        nutrition: m.NTR_INFO || null,
        auto_score: score,
        auto_rank: rank,
      };
    }).filter((m: MealRow) => m.menu.length > 0);

    if (mealRows.length === 0) {
      return new Response(JSON.stringify({ success: true, cached: cachedMeals.length > 0, meal: preferredMeal(cachedMeals), meals: cachedMeals, message: 'No meal data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: inserted, error } = await supabase
      .from('meals')
      .upsert(mealRows, { onConflict: 'school_id,meal_date,meal_type' })
      .select()
      .order('meal_type', { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const meals = inserted as MealRow[];
    return new Response(JSON.stringify({ success: true, cached: false, meal: preferredMeal(meals), meals }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
