// Test data is local to this browser. This adapter never sends production writes.
(function(root){
  const KEY='la_playground_demo_v1';
  const reactions=['like','dislike','funny'];
  const campaign={id:'demo-dongaseu',word:'돈가스',syllables:['돈','가','스']};
  function initial(){return {posts:[{id:'example-1',nickname:'급식천재',lines:['돈가스 나온다는 소식에','가방보다 먼저 챙긴 건','스푼 말고 포크'],created_at:new Date(Date.now()-3600000).toISOString(),example:true,base:{like:12,dislike:1,funny:28}}],reactions:{}};}
  function validate(lines){
    if(!Array.isArray(lines)||lines.length!==3)throw new Error('세 줄을 모두 채워 주세요.');
    const clean=lines.map(x=>String(x).trim());
    clean.forEach((line,i)=>{if(!line.startsWith(campaign.syllables[i])||line.length<2||Array.from(line).length>60||/[\r\n]/.test(line))throw new Error(`${campaign.syllables[i]} 줄을 2~60자로 작성해 주세요.`);});
    return clean;
  }
  function leadersOf(posts){
    const highest=posts.reduce((max,p)=>Math.max(max,p.counts.funny),0);
    return highest>0?posts.filter(p=>p.counts.funny===highest):[];
  }
  function pageOf(posts,sort='latest',limit=10){
    const ordered=[...posts].sort((a,b)=>(sort==='popular'?b.counts.funny-a.counts.funny:0)||b.created_at.localeCompare(a.created_at)||String(b.id).localeCompare(String(a.id)));
    return {items:ordered.slice(0,limit),hasMore:ordered.length>limit,total:ordered.length};
  }
  function create(storage){
    function read(){let raw;try{raw=storage.getItem(KEY);}catch{throw new Error('브라우저 저장 공간에 접근할 수 없어요.');}if(!raw)return initial();try{const state=JSON.parse(raw);if(!Array.isArray(state.posts)||!state.reactions)throw Error();return state;}catch{throw new Error('테스트 저장 데이터를 읽지 못했어요.');}}
    function save(state){try{storage.setItem(KEY,JSON.stringify(state));}catch{throw new Error('저장 공간이 부족해요. 작품은 저장되지 않았어요.');}}
    return {
      campaign,
      list(){const state=read();return state.posts.map(p=>{const selected=state.reactions[p.id]||null;const counts={like:p.base?.like||0,dislike:p.base?.dislike||0,funny:p.base?.funny||0};if(selected)counts[selected]++;return {...p,counts,selected};}).sort((a,b)=>b.created_at.localeCompare(a.created_at)||String(b.id).localeCompare(String(a.id)));},
      submit(lines,nickname){const clean=validate(lines),state=read();if(state.posts.some(p=>!p.example&&p.lines.join('').replace(/\s/g,'')===clean.join('').replace(/\s/g,'')))throw new Error('이미 올린 삼행시예요. 다른 작품을 써 주세요.');const p={id:crypto.randomUUID(),nickname:String(nickname||'급식러').trim().slice(0,12),lines:clean,created_at:new Date().toISOString(),example:false,base:{}};state.posts.push(p);save(state);return p;},
      react(id,reaction){if(!reactions.includes(reaction))throw new Error('잘못된 반응이에요.');const state=read();if(!state.posts.some(p=>p.id===id))throw new Error('작품을 찾지 못했어요.');if(state.reactions[id]===reaction)delete state.reactions[id];else state.reactions[id]=reaction;save(state);}
    };
  }
  root.PlaygroundStore={create,validate,campaign,leadersOf,pageOf};
  if(typeof module!=='undefined')module.exports=root.PlaygroundStore;
})(typeof window==='undefined'?globalThis:window);
