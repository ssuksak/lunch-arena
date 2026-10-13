const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.html','utf8');
const url=source.match(/const SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1];
const key=source.match(/const SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
async function call(body){const r=await fetch(url+'/functions/v1/playground',{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const value=await r.json();if(!r.ok||!value.ok)throw Error(`${r.status}: ${JSON.stringify(value)}`);return value;}
(async()=>{
 const feed=await call({action:'feed',sort:'latest'});assert(feed.campaign);assert.equal(feed.campaign.syllables.length,3);assert(feed.campaign.writing_ends_at<feed.campaign.voting_ends_at);
 const direct=await fetch(url+'/rest/v1/la_poems?select=id',{headers,signal:AbortSignal.timeout(10000)});assert(!direct.ok,'Direct table access must be denied');
 const unauth=await fetch(url+'/functions/v1/playground',{method:'POST',headers,body:JSON.stringify({action:'react',poem_id:crypto.randomUUID(),reaction:'like'}),signal:AbortSignal.timeout(10000)});assert.equal(unauth.status,400);
 console.log('PASS: live campaign/read API, direct table access denied, missing-user writes denied');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
