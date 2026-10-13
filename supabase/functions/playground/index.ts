import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
const url=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,key,{auth:{persistSession:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(data:Record<string,unknown>,status=200)=>Response.json({...data,identity_model:'app-user-key-v1',identity_ready:true},{status,headers:cors});
const uuid=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
function fail(error:{message:string}){const known=['WRITING_CLOSED','VOTING_CLOSED','SELF_REACTION_NOT_ALLOWED','ALREADY_PARTICIPATED','INVALID_LINES','POEM_NOT_FOUND'];const found=known.find(e=>error.message.includes(e));return json({error:found||'REQUEST_FAILED'},found==='ALREADY_PARTICIPATED'?409:found?400:500);}
const clean=(row:any,uid:string|null,selected:Map<string,string>)=>({id:row.id,nickname:row.nickname,lines:row.lines,created_at:row.created_at,own:uid===row.author_id,counts:{like:row.like_count,dislike:row.dislike_count,funny:row.funny_count},selected:selected.get(row.id)||null});
const fields='id,author_id,nickname,lines,created_at,like_count,dislike_count,funny_count';
// Same user_key -> la_users.id mapping used by the existing review service.
// No playground-only user, session, login or external identity API is introduced.
async function resolveUser(userKey:string,create:boolean):Promise<string|null>{
  const mapped=await db.from('la_user_keys').select('user_id').eq('user_key',userKey).maybeSingle();
  if(mapped.error)throw new Error(mapped.error.message);
  let userId=mapped.data?.user_id;
  if(!userId){
   const existing=await db.from('la_users').select('id').eq('primary_user_key',userKey).maybeSingle();
   if(existing.error)throw new Error(existing.error.message);
   userId=existing.data?.id;
   if(!userId&&!create)return null;
   if(!userId){
    const created=await db.from('la_users').insert({primary_user_key:userKey,metadata:{created_by:'playground'}}).select('id').single();
    if(created.error){
     if(created.error.code!=='23505')throw new Error(created.error.message);
     const raced=await db.from('la_users').select('id').eq('primary_user_key',userKey).single();
     if(raced.error)throw new Error(raced.error.message);userId=raced.data.id;
    }else userId=created.data.id;
   }
   if(create){
   const mapping=await db.from('la_user_keys').insert({user_key:userKey,user_id:userId,source:userKey.startsWith('toss_')?'toss':'fp',is_primary:true,metadata:{created_by:'playground'}});
   if(mapping.error){
    if(mapping.error.code!=='23505')throw new Error(mapping.error.message);
    const raced=await db.from('la_user_keys').select('user_id').eq('user_key',userKey).single();
    if(raced.error)throw new Error(raced.error.message);userId=raced.data.user_id;
   }
   }
  }
  const active=await db.from('la_users').select('id').eq('id',userId).eq('status','active').maybeSingle();
  if(active.error)throw new Error(active.error.message);if(!active.data)return null;
  return userId;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 try{
 const body=await req.json();const action=body.action;
 if(!['feed','submit','react','hide-own'].includes(action))return json({error:'INVALID_ACTION'},400);
 if(action==='submit'&&(!uuid(body.campaign_id)||!uuid(body.request_id)||!Array.isArray(body.lines)||body.lines.length!==3||body.lines.some((s:unknown)=>typeof s!=='string'||s.length>120)))return json({error:'INVALID_INPUT'},400);
 if(action==='react'&&(!uuid(body.poem_id)||(body.reaction!==null&&!['like','dislike','funny'].includes(body.reaction))))return json({error:'INVALID_INPUT'},400);
 const userKey=body.user_key;
 const validKey=typeof userKey==='string'&&/^(toss_|fp_)[A-Za-z0-9_-]{8,128}$/.test(userKey);
 if(action!=='feed'&&!validKey)return json({error:'INVALID_USER_KEY'},400);
 const uid=validKey?await resolveUser(userKey,action==='submit'||action==='react'):null;
 if(action==='hide-own'){
  if(!uid)return json({error:'USER_REQUIRED'},403);
  if(!uuid(body.request_id))return json({error:'INVALID_INPUT'},400);
  const {error}=await db.from('la_poems').update({status:'deleted'}).eq('author_id',uid).eq('request_id',body.request_id);
  return error?fail(error):json({ok:true});
 }
 if(action==='submit'||action==='react'){
  if(!uid)return json({error:'USER_REQUIRED'},403);
  if(action==='submit'){
   if(!uuid(body.campaign_id)||!uuid(body.request_id)||!Array.isArray(body.lines)||body.lines.length!==3||body.lines.some((s:unknown)=>typeof s!=='string'||s.length>120))return json({error:'INVALID_INPUT'},400);
   const nickname=String(body.nickname||'급식러').trim();if(!nickname||Array.from(nickname).length>12)return json({error:'INVALID_NICKNAME'},400);
   const {data,error}=await db.rpc('la_submit_poem',{p_user_id:uid,p_campaign_id:body.campaign_id,p_nickname:nickname,p_lines:body.lines,p_request_id:body.request_id});return error?fail(error):json({ok:true,id:data});
  }
  if(!uuid(body.poem_id)||(body.reaction!==null&&!['like','dislike','funny'].includes(body.reaction)))return json({error:'INVALID_INPUT'},400);
  const {error}=await db.rpc('la_set_poem_reaction',{p_user_id:uid,p_poem_id:body.poem_id,p_reaction:body.reaction});return error?fail(error):json({ok:true});
 }
 if(action!=='feed')return json({error:'INVALID_ACTION'},400);
 const now=new Date().toISOString();
 const {data:campaigns,error:campaignError}=await db.from('la_poem_campaigns').select('id,word,starts_at,writing_ends_at,voting_ends_at,finalized_at,final_winners').lte('starts_at',now).order('starts_at',{ascending:false}).limit(1);
 if(campaignError)return fail(campaignError);const campaign=campaigns?.[0];if(!campaign)return json({ok:true,campaign:null,items:[],leaders:[],has_more:false,server_now:now});
 const sort=body.sort==='popular'?'popular':'latest';const cursor=body.cursor;
 let query=db.from('la_poems').select(fields).eq('campaign_id',campaign.id).eq('status','visible');
 if(sort==='popular')query=query.order('funny_count',{ascending:false});
 query=query.order('created_at',{ascending:false}).order('id',{ascending:false});
 if(cursor){
  if(!uuid(cursor.id)||!/^\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00)$/.test(cursor.created_at)||!Number.isInteger(cursor.funny_count)||cursor.funny_count<0)return json({error:'INVALID_CURSOR'},400);
  const time=`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
  query=query.or(sort==='popular'?`funny_count.lt.${cursor.funny_count},and(funny_count.eq.${cursor.funny_count},or(${time}))`:time);
 }
 const {data:rows,error:rowsError}=await query.limit(11);if(rowsError)return fail(rowsError);
 const max=await db.from('la_poems').select('funny_count').eq('campaign_id',campaign.id).eq('status','visible').order('funny_count',{ascending:false}).limit(1);if(max.error)return fail(max.error);
 let leaderRows:any[]=[];
 if(campaign.finalized_at){const ids=campaign.final_winners.map((w:any)=>w.id);if(ids.length){const r=await db.from('la_poems').select(fields).in('id',ids).eq('status','visible').order('created_at');if(r.error)return fail(r.error);leaderRows=r.data||[];}}
 else if(max.data?.[0]?.funny_count>0){const r=await db.from('la_poems').select(fields).eq('campaign_id',campaign.id).eq('status','visible').eq('funny_count',max.data[0].funny_count).order('created_at').limit(100);if(r.error)return fail(r.error);leaderRows=r.data||[];}
 let participated=false;
 if(uid){const own=await db.from('la_poems').select('id').eq('campaign_id',campaign.id).eq('author_id',uid).limit(1);if(own.error)return fail(own.error);participated=Boolean(own.data?.length);}
 const ids=[...new Set([...(rows||[]).map(r=>r.id),...leaderRows.map(r=>r.id)])];let mine=new Map<string,string>();
 if(uid&&ids.length){const r=await db.from('la_poem_reactions').select('poem_id,reaction').eq('user_id',uid).in('poem_id',ids);if(r.error)return fail(r.error);mine=new Map((r.data||[]).map(r=>[r.poem_id,r.reaction]));}
 const items=(rows||[]).slice(0,10);const last=items.at(-1);
 return json({ok:true,campaign:{...campaign,syllables:Array.from(campaign.word)},participated,items:items.map(r=>clean(r,uid,mine)),leaders:leaderRows.map(r=>clean(r,uid,mine)),has_more:(rows||[]).length>10,cursor:last?{id:last.id,created_at:last.created_at,funny_count:last.funny_count}:null,server_now:now});
 }catch(error){console.error('playground request failed',error instanceof Error?error.message:'unknown');return json({error:'REQUEST_FAILED'},500);}
});
