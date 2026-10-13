// Real API test with isolated app user keys. Hide the exact test work in finally.
const fs=require('node:fs'),assert=require('node:assert/strict');const source=fs.readFileSync('index.html','utf8');
const url=source.match(/const SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1],key=source.match(/const SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
async function call(body){const r=await fetch(url+'/functions/v1/playground',{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const value=await r.json();if(!r.ok||!value.ok)throw Error(`${r.status}: ${JSON.stringify(value)}`);return value;}
(async()=>{const authorKey='fp_qa_pg_'+crypto.randomUUID(),voterKey='fp_qa_pg_'+crypto.randomUUID(),request=crypto.randomUUID();let poemId=null,attempted=false;
 try{
 const feed=await call({action:'feed',user_key:authorKey});assert(feed.campaign);assert.equal(feed.identity_model,'app-user-key-v1');
 const submission={action:'submit',user_key:authorKey,campaign_id:feed.campaign.id,nickname:'연동검증',lines:feed.campaign.syllables.map((x,i)=>x+['첫째 줄 검증','둘째 줄 검증','마지막 검증'][i]),request_id:request};
 attempted=true;const result=await call(submission),again=await call(submission);poemId=result.id;assert.equal(result.id,again.id);
 await assert.rejects(call({...submission,request_id:crypto.randomUUID()}),/ALREADY_PARTICIPATED/);
 const own=await call({action:'feed',user_key:authorKey});assert.equal(own.participated,true);assert.equal(own.items.find(p=>p.id===poemId).own,true);
 await call({action:'react',user_key:voterKey,poem_id:poemId,reaction:'funny'});
 const after=await call({action:'feed',user_key:voterKey,sort:'popular'});const poem=after.items.find(p=>p.id===poemId);assert.equal(poem.counts.funny,1);assert.equal(poem.selected,'funny');assert(!Object.hasOwn(poem,'author_id'));assert(after.leaders.some(p=>p.id===poemId));
 await Promise.all(Array.from({length:4},()=>call({action:'react',user_key:voterKey,poem_id:poemId,reaction:'like'})));
 const switched=await call({action:'feed',user_key:voterKey});const changed=switched.items.find(p=>p.id===poemId);assert.equal(changed.counts.funny,0);assert.equal(changed.counts.like,1);assert(!switched.leaders.some(p=>p.id===poemId));
 await assert.rejects(call({action:'react',user_key:authorKey,poem_id:poemId,reaction:'funny'}),/SELF_REACTION_NOT_ALLOWED/);
 await call({action:'react',user_key:voterKey,poem_id:poemId,reaction:null});
 const cancelled=await call({action:'feed',user_key:authorKey});assert.equal(cancelled.items.find(p=>p.id===poemId).counts.like,0);
 console.log('PASS: actual app user reuse, one weekly work, retry idempotency, participated flag, funny leader, concurrent reaction switch/cancel, self-vote block, private UUID exclusion');
 }finally{
 if(attempted){await call({action:'hide-own',user_key:authorKey,request_id:request});for(const sort of ['latest','popular']){const check=await call({action:'feed',user_key:authorKey,sort});assert(!check.items.some(p=>p.id===poemId));assert(!check.leaders.some(p=>p.id===poemId));assert.equal(check.participated,true);}
 fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/playground-live-test-ids.json',JSON.stringify({poem_id:poemId,request_id:request,author_key:authorKey,voter_key:voterKey},null,2));console.log('PASS: exact test work hidden; user participation remains used; shared QA users and hidden history retained.');}
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
