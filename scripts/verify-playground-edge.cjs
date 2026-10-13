const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const {transformSync}=require('esbuild');
const source=fs.readFileSync('supabase/functions/playground/index.ts','utf8').replace(/^import .*;\n/gm,'');
const canonical=crypto.randomUUID();let handler,lastRpc,lastUpdate,filters={},mode='mapped',userCreates=0,keyCreates=0,inactive=false,rpcError=null;
function chain(table){let ownFilters={};return {select(){return this},eq(k,v){ownFilters[k]=v;filters[k]=v;return this},update(v){lastUpdate=v;filters={};return this},insert(v){if(table==='la_users'){userCreates++;assert(/^toss_|^fp_/.test(v.primary_user_key));assert(!v.primary_user_key.startsWith('pg_'));}if(table==='la_user_keys'){keyCreates++;assert.equal(v.user_id,canonical);}return this},single:async()=>({data:{id:canonical,user_id:canonical},error:null}),maybeSingle:async()=>({data:table==='la_user_keys'?(mode==='mapped'?{user_id:canonical}:null):inactive?null:ownFilters.primary_user_key&&mode==='new'?null:{id:canonical},error:null})};}
const db={from:table=>chain(table),rpc:async(name,params)=>{lastRpc={name,params};return {data:crypto.randomUUID(),error:rpcError};}};
const context={createClient:()=>db,Deno:{env:{get:()=> 'test-server-key'},serve:fn=>handler=fn},fetch:()=>{throw Error('Unexpected external auth request');},crypto,Date,Map,Set,JSON,Response,Request,console};vm.createContext(context);vm.runInContext(transformSync(source,{loader:'ts',format:'cjs'}).code,context);
const req=body=>new Request('http://local/playground',{method:'POST',body:JSON.stringify(body)});
(async()=>{
const body={action:'submit',user_key:'toss_existinguser123',campaign_id:crypto.randomUUID(),request_id:crypto.randomUUID(),nickname:'급식러',lines:['갈첫줄','비둘째','탕셋째'],user_id:crypto.randomUUID()};
for(const user_key of [undefined,'pg_'+crypto.randomUUID(),'bad',42])assert.equal((await handler(req({...body,user_key}))).status,400);
assert.equal((await handler(req({...body,campaign_id:'bad'}))).status,400);assert.equal(userCreates,0);
assert.equal((await handler(req(body))).status,200);assert.equal(lastRpc.params.p_user_id,canonical);assert.equal(userCreates,0);assert.equal(keyCreates,0);
await handler(req(body));assert.equal(userCreates,0);assert.equal(keyCreates,0);
mode='primary';await handler(req(body));assert.equal(userCreates,0);assert.equal(keyCreates,1);
mode='new';await handler(req({...body,user_key:'fp_newuser123456'}));assert.equal(userCreates,1);assert.equal(keyCreates,2);mode='mapped';
rpcError={message:'ALREADY_PARTICIPATED'};assert.equal((await handler(req(body))).status,409);rpcError=null;
inactive=true;assert.equal((await handler(req(body))).status,403);inactive=false;
assert.equal((await handler(req({action:'react',user_key:body.user_key,poem_id:crypto.randomUUID(),reaction:null,user_id:crypto.randomUUID()}))).status,200);assert.equal(lastRpc.params.p_user_id,canonical);assert.equal(lastRpc.params.p_reaction,null);
await handler(req({action:'hide-own',user_key:body.user_key,request_id:body.request_id}));assert.equal(lastUpdate.status,'deleted');assert.equal(filters.author_id,canonical);assert.equal(filters.request_id,body.request_id);
assert.equal((await handler(req({action:'session',user_key:body.user_key}))).status,400);
console.log('PASS: existing app key -> canonical user, no extra session/auth flow, mapped/primary user reuse, first-use common user, invalid input, weekly duplicate 409, inactive user, submit/react/hide ownership');
})().catch(e=>{console.error(e);process.exitCode=1});
