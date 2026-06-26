import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NEIS_KEY_NAMES = [
  'NEIS_API_KEY',
  'NEIS_KEY',
  'OPENNEIS_API_KEY',
  'NEIS_OPEN_API_KEY',
  'NEIS_SCHOOL_API_KEY',
  'SCHOOL_API_KEY',
  'OPEN_API_KEY',
  'API_KEY',
];
const NEIS_KEY = NEIS_KEY_NAMES.map((name) => Deno.env.get(name)).find(Boolean) || '';
const NEIS_BASE = 'https://open.neis.go.kr/hub';
const NEIS_KEY_PARAM = NEIS_KEY ? `KEY=${encodeURIComponent(NEIS_KEY)}&` : '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PAGE_SIZE = 100;

const REGIONS: Record<string, string> = {
  B10: '서울특별시', C10: '부산광역시', D10: '대구광역시', E10: '인천광역시',
  F10: '광주광역시', G10: '대전광역시', H10: '울산광역시', I10: '세종특별자치시',
  J10: '경기도', K10: '강원특별자치도', M10: '충청북도', N10: '충청남도',
  P10: '전북특별자치도', Q10: '전라남도', R10: '경상북도', S10: '경상남도', T10: '제주특별자치도',
};

type SchoolRow = {
  atpt_code: string;
  school_code: string;
  name: string;
  type: string | null;
  address: string | null;
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function schoolFromNeis(row: Record<string, unknown>): SchoolRow | null {
  const atpt = clean(row.ATPT_OFCDC_SC_CODE);
  const code = clean(row.SD_SCHUL_CODE);
  const name = clean(row.SCHUL_NM);
  if (!atpt || !code || !name) return null;

  const type = clean(row.SCHUL_KND_SC_NM) || null;
  const road = clean(row.ORG_RDNMA);
  const detail = clean(row.ORG_RDNDA);
  const address = [road, detail]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() || null;

  return {
    atpt_code: atpt,
    school_code: code,
    name,
    type,
    address,
  };
}

function uniqueSchools(rows: Record<string, unknown>[]): SchoolRow[] {
  const byKey = new Map<string, SchoolRow>();
  for (const row of rows) {
    const school = schoolFromNeis(row);
    if (!school) continue;
    byKey.set(`${school.atpt_code}:${school.school_code}`, school);
  }
  return [...byKey.values()];
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

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return Response.json({ error: 'Required environment variables are not configured' }, { status: 500, headers: corsHeaders });
    }

    if (!NEIS_KEY) {
      return Response.json({
        error: 'NEIS API key is not configured',
        message: 'Set one of the supported NEIS key secrets before running school sync.',
        supportedSecrets: NEIS_KEY_NAMES,
      }, { status: 500, headers: corsHeaders });
    }

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { body = {}; }

    const atptCode = clean(body.atpt_code);
    if (!REGIONS[atptCode]) {
      return Response.json({ error: 'Invalid atpt_code', valid: Object.keys(REGIONS) }, { status: 400, headers: corsHeaders });
    }

    const page = Math.max(1, Number(body.page || 1) || 1);
    const url = `${NEIS_BASE}/schoolInfo?${NEIS_KEY_PARAM}Type=json&pIndex=${page}&pSize=${PAGE_SIZE}&ATPT_OFCDC_SC_CODE=${encodeURIComponent(atptCode)}`;
    const neisRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!neisRes.ok) {
      return Response.json({ error: 'NEIS request failed', status: neisRes.status }, { status: 502, headers: corsHeaders });
    }

    const json = await neisRes.json();
    const resultCode = json?.RESULT?.CODE || json?.schoolInfo?.[0]?.head?.[1]?.RESULT?.CODE;
    if (resultCode && resultCode !== 'INFO-000') {
      return Response.json({ error: json?.RESULT?.MESSAGE || 'No data', page, done: true }, { headers: corsHeaders });
    }

    const head = json?.schoolInfo?.[0]?.head || [];
    const totalCount = Number(head?.[0]?.list_total_count || 0);
    const rawRows = Array.isArray(json?.schoolInfo?.[1]?.row) ? json.schoolInfo[1].row : [];
    if (!rawRows.length) {
      return Response.json({ error: 'No data', page, done: true }, { headers: corsHeaders });
    }

    const schools = uniqueSchools(rawRows);
    const skippedDuplicates = rawRows.length - schools.length;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase
      .from('schools')
      .upsert(schools, { onConflict: 'atpt_code,school_code' });

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    const hasMore = page * PAGE_SIZE < totalCount;
    return Response.json({
      success: true,
      region: REGIONS[atptCode],
      inserted: schools.length,
      rawCount: rawRows.length,
      skippedDuplicates,
      totalCount,
      page,
      hasMore,
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500, headers: corsHeaders });
  }
});
