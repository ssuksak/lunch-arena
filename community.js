// Presentation layer over the existing LA runtime; mutations retain Edge APIs.
// 앱 내비게이션이 주소의 쿼리를 지우기 전에 광고 위치 확인 모드를 읽어 둔다.
const AD_SLOTS_PREVIEW=new URLSearchParams(location.search).get('adSlots')==='1';
const communityReviewCache = new Map();
const communityScroll = new Map();
const communityPending = new Set();
let communityTab = 'home';
let communityFilter = 'all';
let communityFeedRequest = 0;

function communityError(el, retry) {
  el.innerHTML = '<div class="ranking-error">정보를 불러오지 못했어요</div>';
  const button = document.createElement('button');
  button.className = 'rating-launch'; button.textContent = '다시 불러오기';
  button.onclick = retry; el.append(button);
}

function communityDialog(title) {
  document.querySelector('.community-dialog')?.close();
  const opener = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'community-dialog';
  dialog.innerHTML = `<div class="dialog-heading"><h2>${escapeHtml(title)}</h2><button class="dialog-close" aria-label="닫기">×</button></div><div class="dialog-body"></div>`;
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.addEventListener('click', e => { if (e.target === dialog && e.clientY < dialog.getBoundingClientRect().top) dialog.close(); });
  dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus({ preventScroll:true }); });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

// ===== 급식표: 메뉴 이름으로 메인/밥·국/반찬/김치/후식을 나눈다 =====
const TRAY_RICE_ONE_DISH = /(덮밥|볶음밥|비빔밥|김밥|주먹밥|국밥)$/;
const TRAY_SOUP = /(국|탕|찌개|전골|스프|수프|개장|국밥)$/;
const TRAY_KIMCHI = /(김치|깍두기|겉절이|석박지|섞박지|피클|단무지)$/;
const TRAY_DESSERT = /(우유|요구르트|요거트|주스|쥬스|음료|두유|아이스크림|빵|케이크|케익|쿠키|파이|푸딩|젤리|과일|배|사과|귤|감|포도|수박|참외|딸기|바나나|키위|파인애플|멜론|오렌지|복숭아|자두|마카롱|츄러스|꿀떡|와플|도넛|머핀|타르트|바게트|마들렌|쉐이크|에이드|스무디|브라우니|요플레|샤베트|화채)$/;
const TRAY_MAIN_STRONG = /(불고기|갈비|까스|가스|치킨|스테이크|강정|탕수|제육|오삼|주물럭|떡볶이|덮밥|볶음밥|비빔밥|카레|짜장|자장|라이스|국수|우동|파스타|스파게티|라면|버거|피자|함박|족발|보쌈|찜닭|닭갈비|돈육|미트볼|너겟|커틀릿|그라탕)/;
const TRAY_MAIN_WEAK = /(구이|찜|볶음|튀김|조림|전$)/;
function trayCleanName(name) {
  return String(name || '')
    .replace(/\([0-9.,\s]*\)/g, '')     // 알레르기 번호 (1.2.5)
    .replace(/[0-9.]+$/g, '')           // 끝에 붙은 알레르기 번호
    .replace(/^[*@#\s]+/, '')
    .replace(/-[^-]{1,6}$/, '')         // "-세종지원" 같은 꼬리표
    .trim();
}
function trayGroups(menu) {
  const g = { main: [], dessert: [], side: [], kimchi: [], rice: [], soup: [] };
  const rest = [];
  (Array.isArray(menu) ? menu : []).map(trayCleanName).filter(Boolean).forEach(name => {
    if (/밥(s*&.*)?$/.test(name) && !TRAY_RICE_ONE_DISH.test(name.split('&')[0].trim())) g.rice.push(name);
    else if (TRAY_SOUP.test(name)) g.soup.push(name);
    else if (TRAY_KIMCHI.test(name)) g.kimchi.push(name);
    else if (TRAY_DESSERT.test(name)) g.dessert.push(name);
    else rest.push(name);
  });
  let mainIdx = rest.findIndex(n => TRAY_MAIN_STRONG.test(n));
  if (mainIdx < 0) mainIdx = rest.findIndex(n => TRAY_MAIN_WEAK.test(n));
  if (mainIdx < 0 && rest.length) mainIdx = 0;
  if (mainIdx >= 0) g.main = rest.splice(mainIdx, 1);
  g.side = rest;
  return g;
}
// 메인은 위에 크게, 나머지는 분류별 한 줄씩. 어떤 메뉴 구성에도 모양이 깨지지 않는다.
function mealMenuRow(label, names) {
  return names.length ? `<div class="meal-row"><span>${label}</span><p>${names.map(escapeHtml).join(' · ')}</p></div>` : '';
}
function mealMenuHtml(menu) {
  const g = trayGroups(menu);
  const main = g.main.length ? `<div class="meal-main"><small>메인</small><b>${escapeHtml(g.main[0])}</b></div>` : '';
  const rows = mealMenuRow('밥·국', [...g.rice, ...g.soup]) + mealMenuRow('반찬', g.side) + mealMenuRow('김치', g.kimchi) + mealMenuRow('후식', g.dessert);
  return main || rows ? `${main}<div class="meal-rows">${rows}</div>` : '<div class="empty" style="padding:20px">메뉴 정보가 없어요</div>';
}
mealCardHtml = function(meal) {
  const kcal = meal.calories == null ? '' : ` · ${Number(meal.calories)} kcal`;
  return `<div class="meal-card">${mealMenuHtml(meal.menu)}<div class="meal-footer"><span>${escapeHtml(mealTypeLabel(meal))}${kcal}</span></div></div>`;
};

const communityRenderRating = renderRating;
renderRating = function(mealId, target, meal = null, scope = 'default') {
  if (!target) return;
  if (localStorage.getItem(`rated_${mealId}`) || !canWriteReviewForSchool(meal?.school_id || mySchool?.id)) {
    return communityRenderRating(mealId, target, meal, scope);
  }
  target.replaceChildren();
  const button = document.createElement('button');
  button.className = 'rating-launch'; button.textContent = '급식톡 쓰기';
  button.onclick = () => {
    const dialog = communityDialog('오늘 급식 어땠어요?');
    const body = dialog.querySelector('.dialog-body');
    communityRenderRating(mealId, body, meal, scope);
    const subtitle = body.querySelector('.rating-subtitle');
    if (subtitle) subtitle.textContent = '별점';
    body.querySelectorAll('.rating-subtitle').forEach(el => { if (el.textContent.includes('메뉴')) el.textContent = '제일 기억나는 메뉴'; });
  };
  target.append(button);
};
const communitySubmitRating = submitRating;
submitRating = async function(...args) {
  await communitySubmitRating(...args);
  if (localStorage.getItem(`rated_${args[0]}`)) document.querySelector('.community-dialog')?.close();
};

const communityOriginalReview = renderReviewItem;
renderReviewItem = function(review) {
  communityReviewCache.set(String(review.id), review);
  const template = document.createElement('template');
  template.innerHTML = communityOriginalReview(review);
  const item = template.content.firstElementChild;
  const actions = item.querySelectorAll('.review-action-btn');
  actions.forEach(button => {
    const handler = button.getAttribute('onclick') || '';
    if (handler.startsWith('startReviewEdit')) button.setAttribute('onclick', `startReviewEdit(${review.id},this)`);
    if (handler.startsWith('reactToReview')) {
      const kind = handler.includes("'dislike'") ? 'dislike' : 'like';
      button.setAttribute('onclick', `reactToReview(${review.id},'${kind}','',this)`);
      button.setAttribute('aria-pressed', String(review.my_reaction === kind));
      button.setAttribute('aria-label', `${kind==='like'?'공감':'별로'} ${review.reaction_counts?.[kind]||0}`);
    }
  });
  return item.outerHTML;
};

function communityReplaceReview(review) {
  const nodes = [...document.querySelectorAll('.review-item')].filter(el=>el.id===`review-item-${review.id}`);
  const anchor = nodes.find(el=>el.getBoundingClientRect().height && el.closest('.page.active'));
  const top = anchor?.getBoundingClientRect().top;
  const y = window.scrollY;
  nodes.forEach(el=>{
    const cardOpen=el.classList.contains('open');
    const template=document.createElement('template');template.innerHTML=renderReviewItem(review);
    const next=template.content.firstElementChild;
    next.classList.toggle('open',cardOpen);
    el.replaceWith(next);
  });
  if(anchor && top!==undefined){const next=nodes.length && [...document.querySelectorAll('.review-item')].find(el=>el.id===`review-item-${review.id}` && el.closest('.page.active'));if(next)window.scrollTo(0,y+next.getBoundingClientRect().top-top);}
}
async function communityRefreshOne(id) {
  const data=await sb(`la_reviews?id=eq.${Number(id)}&select=${REVIEW_SELECT}`);
  if(!Array.isArray(data))throw new Error('Review query failed');
  const [review]=await enrichReviews(data);
  if(review)communityReplaceReview(review);
}

reactToReview = async function(id, reaction, ignored, trigger) {
  const key=`reaction-${id}`;if(communityPending.has(key))return;communityPending.add(key);
  if(trigger)trigger.disabled=true;
  try {
    await getUserId();
    const result=await edge('react-review',{rating_id:id,user_key:getInteractionUserKey(),nickname:ensureNickname(),reaction});
    if(!result?.ok)throw new Error('Reaction failed');
    await communityRefreshOne(id);
    void logAitGoal('goal_review_reaction',{rating_id:String(id),reaction});
  }catch(e){alert('공감을 반영하지 못했어요. 잠시 후 다시 시도해 주세요.');}
  finally{communityPending.delete(key);if(trigger?.isConnected)trigger.disabled=false;}
};

startReviewEdit = function(id, trigger) {
  const item=trigger?.closest('.review-item'),review=communityReviewCache.get(String(id));
  if(!item||!review)return;
  const old=item.querySelector('.review-edit');
  if(old){old.remove();editingReviewIds.delete(String(id));return;}
  editingReviewIds.add(String(id));item.insertAdjacentHTML('beforeend',reviewEditHtml(review));
  item.querySelector('.review-edit-buttons button').onclick=()=>{item.querySelector('.review-edit')?.remove();editingReviewIds.delete(String(id));};
};

const communityRefreshAll = refreshVisibleReviews;
refreshVisibleReviews = async function(){
  const y=window.scrollY;
  await communityRefreshAll();
  window.scrollTo(0,y);
};

loadLatestReviews = async function(limit=3,targetId='latest-reviews-wrap',title='최신 급식톡') {
  const target=document.getElementById(targetId);if(!target)return;
  const request=String(++communityFeedRequest);target.dataset.request=request;
  try{
    const filter=communityFilter==='school'&&mySchool?.id?`&school_id=eq.${mySchool.id}`:'';
    const data=await sb(`la_reviews?order=created_at.desc&limit=${limit}${filter}&select=${REVIEW_SELECT}`);
    if(!Array.isArray(data))throw new Error('Feed query failed');
    const enriched=await enrichReviews(data);
    if(target.dataset.request===request){
      target.querySelector('.ad-slot')?._ad?.destroy?.();
      target.innerHTML=targetId==='latest-reviews-wrap'?communityRailHtml(enriched):latestReviewsHtml(enriched,title);
      if(targetId==='feed-reviews-wrap')communityInsertFeedAd(target);
    }
  }catch(e){if(target.dataset.request===request)communityError(target,()=>loadLatestReviews(limit,targetId,title));}
};

// 홈 급식톡: 옆으로 넘겨 보는 카드. 누르면 그 학교 급식으로 이동한다.
function communityRailHtml(reviews){
  if(!reviews.length)return '<div class="empty" style="padding:20px 8px"><div>아직 급식톡이 없어요</div></div>';
  return `<div class="rail">${reviews.map(r=>{
    const school=r.schools?`openReviewSchool(${JSON.stringify(r.schools).replace(/"/g,'&quot;')})`:'';
    const meal=reviewDisplayMeal(r);
    const menu=String(r.selected_menu_item||'').replace(/[*@#]+/g,'').trim()||reviewMetaText(meal,'');
    const stars=reviewStarsHtml(r.score);
    return `<button type="button" class="rail-card" onclick="${school}">${stars?`<span class="review-stars" aria-label="${Number(r.score)}점">${stars}</span>`:''}<span class="rail-text">${escapeHtml(r.comment?safeCommunityText(r.comment):menu)}</span><span class="rail-menu">${escapeHtml(menu)}</span><span class="rail-by">${reviewNickname(r)} · ${escapeHtml(r.schools?.name||'')}</span></button>`;
  }).join('')}</div>`;
}
// ===== 배너 광고 (앱인토스 TossAds) =====
// 콘솔에서 발급한 광고 그룹 ID를 넣으면 광고가 붙는다. 비어 있으면 자리를 숨긴다.
// 개발 중에는 테스트 ID('ait-ad-test-banner-id')를 쓰고, 실서비스에는 실제 ID만 넣는다.
// ?adSlots=1 로 열면 광고 대신 자리 표시가 보인다(위치 확인용).
const AD_GROUP_IDS={home:'',feed:'',ranking:''};
const AD_FEED_AFTER=5;
let communityAdsReady=null;
function communityAdsInit(){
  if(!communityAdsReady)communityAdsReady=new Promise(resolve=>{
    const ads=window.AITBridge?.TossAds;
    if(!ads?.initialize?.isSupported?.())return resolve(false);
    ads.initialize({callbacks:{onInitialized:()=>resolve(true),onInitializationFailed:()=>resolve(false)}});
  });
  return communityAdsReady;
}
function communityMountAd(el){
  if(!el||el.dataset.mounted)return;
  el.dataset.mounted='1';
  if(AD_SLOTS_PREVIEW){
    el.innerHTML='<div class="ad-slot-preview"><span>광고</span>배너 광고 자리</div>';el.hidden=false;return;
  }
  const id=AD_GROUP_IDS[el.dataset.adSlot],ads=window.AITBridge?.TossAds;
  if(!id||!ads?.attachBanner?.isSupported?.())return;
  communityAdsInit().then(ok=>{
    if(!ok||!el.isConnected)return;
    el.hidden=false;
    const hide=()=>{el.hidden=true;};
    el._ad=ads.attachBanner(id,el,{theme:'light',tone:'blackAndWhite',variant:'card',callbacks:{onAdFailedToRender:hide,onNoFill:hide}});
  });
}
function communityInsertFeedAd(target){
  const items=target.querySelectorAll('.review-item');
  if(!items.length)return;
  items[Math.min(AD_FEED_AFTER,items.length)-1].insertAdjacentHTML('afterend','<div class="ad-slot" data-ad-slot="feed" hidden></div>');
  communityMountAd(target.querySelector('.ad-slot'));
}
function communityFilterBar(target) {
  const bar=document.createElement('div');bar.className='community-filters';
  for(const [value,label] of [['all','전체'],['school','우리 학교']]){
    const button=document.createElement('button');button.textContent=label;button.dataset.filter=value;button.setAttribute('aria-pressed',String(communityFilter===value));
    button.onclick=()=>{if(value==='school'&&!mySchool){openSchoolSetSheet();return;}communityFilter=value;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===value)));loadLatestReviews();if(communityTab==='feed')loadFeedReviews();};bar.append(button);
  }target.before(bar);
}

async function communityReadAll(path) {
  const result=[];
  for(let offset=0;offset<50000;offset+=500){
    const page=await sb(`${path}&limit=500&offset=${offset}`);
    if(!Array.isArray(page))throw new Error('Ranking query failed');
    result.push(...page);if(page.length<500)return result;
  }
  throw new Error('Ranking requires server aggregation');
}
// 랭킹 줄: 값을 막대 길이로 보여준다. 동점은 같은 순위, 1위(공동 포함)만 오렌지 막대.
function communityRankingRows(rows,unit,limit=5){
  if(!rows.length)return '<div class="ranking-error">아직 참여 기록이 없어요</div>';
  const top=rows.slice(0,limit),max=Math.max(...top.map(r=>Number(r.value)||0),1);
  return top.map(row=>{
    const value=Number(row.value)||0,rank=1+top.filter(r=>(Number(r.value)||0)>value).length;
    const star=String(row.detail||'').startsWith('★')?`<small>${escapeHtml(row.detail)}</small>`:'';
    return `<div class="ranking-card rk${rank===1?' rk-top':''}"><span class="rank-num">${rank}</span><span class="rk-name"><b>${escapeHtml(row.name)}</b>${star}</span><span class="rank-score">${value.toLocaleString()}<small>${unit}</small></span><span class="rk-track" aria-hidden="true"><i style="width:${Math.max(4,Math.round(value/max*100))}%"></i></span></div>`;
  }).join('');
}
function communityEligibleReviews(rows){
  const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
  const counts=new Map();
  return [...rows].sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||Number(a.id)-Number(b.id)).filter(row=>{
    const key=`${row.user_key||'unknown'}:${dayFormat.format(new Date(row.created_at))}`;
    const used=counts.get(key)||0;counts.set(key,used+1);return used<3;
  });
}
async function communityMenuRankHtml(limit=5){
  const {start,end}=monthlyRange();
  const period=`created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}`;
  const rawReviews=await communityReadAll(`la_reviews?${period}&selected_menu_item=not.is.null&select=id,user_key,selected_menu_item,score,created_at&order=id.asc`);
  const reviews=communityEligibleReviews(rawReviews);
  const totals=new Map();
  reviews.forEach(r=>{
    const name=String(r.selected_menu_item||'').trim();
    if(!name)return;
    const key=name.replace(/\s+/g,' ').toLocaleLowerCase('ko');
    const old=totals.get(key)||{name,value:0,scoreTotal:0,scoreCount:0};
    old.value++;
    const score=Number(r.score);
    if(Number.isFinite(score)&&score>0){old.scoreTotal+=score;old.scoreCount++;}
    totals.set(key,old);
  });
  const rows=[...totals.values()].map(r=>({...r,detail:r.scoreCount?`★ ${(r.scoreTotal/r.scoreCount).toFixed(1)}`:'아직 별점이 없어요'}));
  return communityRankingRows(rows.sort((a,b)=>b.value-a.value||(b.scoreTotal/Math.max(b.scoreCount,1))-(a.scoreTotal/Math.max(a.scoreCount,1))||a.name.localeCompare(b.name,'ko')),'표',limit);
}
async function communityLoadHomeMenuRank(){
  const el=document.getElementById('home-menu-rank');if(!el)return;
  try{el.innerHTML=await communityMenuRankHtml(3);}catch(e){communityError(el,communityLoadHomeMenuRank);}
}
let communityRankingPromise;
function communityLoadRankings(){
  if(communityRankingPromise)return communityRankingPromise;
  communityRankingPromise=communityLoadRankingsInner().finally(()=>communityRankingPromise=null);return communityRankingPromise;
}
async function communityLoadRankingsInner(){
  const {month,start,end}=monthlyRange();
  const period=`created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}`;
  const tasks=[
    ['community-menu-rank',()=>communityMenuRankHtml()],
    ['community-school-rank',async()=>{
      const rows=await communityReadAll(`la_school_engagement_monthly?month=eq.${month}&order=school_id.asc&select=school_id,score,review_count,comment_count,reaction_count,photo_count`);
      if(!Array.isArray(rows))throw new Error('School ranking failed');
      const ids=rows.map(r=>Number(r.school_id)).filter(Number.isFinite);
      const schools=ids.length?await sb(`la_schools?id=in.(${ids.join(',')})&select=id,name`):[];
      const names=new Map((Array.isArray(schools)?schools:[]).map(s=>[Number(s.id),s.name]));
      return communityRankingRows(rows.map(r=>({name:names.get(Number(r.school_id))||'학교',value:Number(r.score||0)-3*Number(r.comment_count||0),detail:`급식톡 ${r.review_count} · 반응 ${r.reaction_count}`})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'ko')),'점');
    }],
    ['community-person-rank',async()=>{
      const [rawReviews,reactions]=await Promise.all([
        communityReadAll(`la_reviews?${period}&select=id,user_key,nickname,photo_url,created_at&order=id.asc`),
        communityReadAll(`la_review_reactions?${period}&select=id,user_key,created_at&order=id.asc`)
      ]);
      const reviews=communityEligibleReviews(rawReviews);
      const totals=new Map();
      const entry=(row)=>{if(!row.user_key)return null;const old=totals.get(row.user_key)||{name:'급식러',value:0,time:'',reviews:0,reactions:0};if(row.created_at>old.time&&row.nickname){old.name=row.nickname;old.time=row.created_at;}totals.set(row.user_key,old);return old;};
      reviews.forEach(r=>{const old=entry(r);if(!old)return;old.reviews++;old.value+=10+(r.photo_url?5:0);});
      reactions.forEach(r=>{const old=entry(r);if(!old)return;old.reactions++;old.value+=1;});
      const rows=[...totals.values()].map(r=>({...r,detail:`급식톡 ${r.reviews} · 반응 ${r.reactions}`}));
      return communityRankingRows(rows.sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)),'점');
    }]
  ];
  await Promise.all(tasks.map(async([id,load])=>{const el=document.getElementById(id);try{el.innerHTML=await load();}catch(e){communityError(el,communityLoadRankings);}}));
}

const communitySwitchTab=switchTab;
switchTab=function(tab,options={}){communityScroll.set(communityTab,window.scrollY);communityTab=tab;communitySwitchTab(tab,options);document.body.dataset.tab=activeTab;if(tab==='ranking')communityLoadRankings();requestAnimationFrame(()=>window.scrollTo(0,communityScroll.get(tab)||0));};
const communityApplySchool=applyMySchool;
applyMySchool=function(){document.body.classList.add('has-school');communityApplySchool();};

// Remove duplicated discovery sections, retaining original targets for runtime compatibility.
document.querySelectorAll('#page-home .section-title').forEach(el=>el.hidden=true);
const homeFeed=document.getElementById('latest-reviews-wrap');
const divider=document.createElement('div');divider.className='community-divider';
document.querySelector('.t-feed .home-live-title').before(divider);
communityFilterBar(homeFeed);communityFilterBar(document.getElementById('feed-reviews-wrap'));
const rankingContainer=document.querySelector('#page-ranking .container');
rankingContainer.replaceChildren();
const monthlyRanking=document.createElement('section');
monthlyRanking.className='monthly-ranking';
// 랭킹 세 개를 옆으로 넘기는 카드로 보여준다. 위 칩을 눌러도 넘어가고, 넘기면 칩이 따라 바뀐다.
monthlyRanking.innerHTML=`<header class="ranking-intro"><div class="section-title" data-month-label="랭킹">랭킹</div></header><div class="rank-chips" role="tablist"><button type="button" role="tab" aria-selected="true" data-rank-chip="0">학교</button><button type="button" role="tab" aria-selected="false" data-rank-chip="1">급식러</button><button type="button" role="tab" aria-selected="false" data-rank-chip="2">인기 메뉴</button></div><div class="rank-rail"><section class="ranking-block"><div class="ranking-block-heading"><h2>급식톡 많은 학교</h2><span>TOP 5</span></div><div id="community-school-rank"></div></section><section class="ranking-block"><div class="ranking-block-heading"><h2>급식톡 많이 쓴 급식러</h2><span>TOP 5</span></div><div id="community-person-rank"></div></section><section class="ranking-block"><div class="ranking-block-heading"><h2>인기 메뉴</h2><span>TOP 5</span></div><div id="community-menu-rank"></div></section></div>`;
monthlyRanking.querySelector('.rank-rail').insertAdjacentHTML('afterend','<div class="ad-slot" data-ad-slot="ranking" hidden></div>');
{
  const rail=monthlyRanking.querySelector('.rank-rail'),chipEls=[...monthlyRanking.querySelectorAll('[data-rank-chip]')],cards=[...rail.children];
  const select=k=>chipEls.forEach((b,j)=>b.setAttribute('aria-selected',String(j===k)));
  chipEls.forEach((b,k)=>b.onclick=()=>{rail.scrollTo({left:cards[k].offsetLeft-rail.offsetLeft-12,behavior:'smooth'});select(k);});
  // 다른 화면에서 특정 랭킹 카드로 바로 열 때 쓴다 (예: 홈 인기 메뉴의 전체보기).
  window.showRankCard=key=>{const k=cards.findIndex(s=>s.querySelector(`#community-${key}-rank`));if(k<0)return;requestAnimationFrame(()=>{rail.scrollLeft=cards[k].offsetLeft-rail.offsetLeft-12;select(k);});};
  rail.addEventListener('scroll',()=>{const w=cards[0].offsetWidth+12;select(Math.min(cards.length-1,Math.round(rail.scrollLeft/w)));},{passive:true});
}
rankingContainer.append(monthlyRanking);
// "10월 인기 메뉴", "10월 랭킹"처럼 이번 달(한국 시간)을 제목 앞에 붙인다.
const communityMonth=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long'}).format(new Date());
document.querySelectorAll('[data-month-label]').forEach(el=>{el.textContent=`${communityMonth} ${el.dataset.monthLabel}`;});
document.querySelectorAll('.tab-item').forEach(el=>{el.setAttribute('role','button');el.tabIndex=0;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}};});
initAppNavigation();
document.body.dataset.tab=activeTab||'home';
function isAdPreviewMode(){return new URLSearchParams(location.search).get('adPreview')==='1';}
let previewExitConfirmed=false;
function openPreviewExitModal(){
  if(!isAdPreviewMode()||previewExitConfirmed)return;
  document.getElementById('preview-exit-modal')?.classList.remove('hide');
}
window.closePreviewExitModal=function(){
  document.getElementById('preview-exit-modal')?.classList.add('hide');
  if(history.state?.adExitGuard!==true)history.pushState({laTab:activeTab||'home',adExitGuard:true},'',tabUrl(activeTab||'home'));
};
window.confirmPreviewExit=function(){
  previewExitConfirmed=true;
  document.getElementById('preview-exit-modal')?.classList.add('hide');
  history.back();
};
if(isAdPreviewMode()){
  document.body.classList.add('ad-preview-mode');
  document.querySelectorAll('.preview-ad-slot[hidden]').forEach(el=>el.hidden=false);
  history.pushState({laTab:activeTab||'home',adExitGuard:true},'',tabUrl(activeTab||'home'));
  window.addEventListener('popstate',event=>{
    if(previewExitConfirmed)return;
    if(activeTab==='home'&&event.state?.adExitGuard!==true){
      openPreviewExitModal();
      history.pushState({laTab:'home',adExitGuard:true},'',tabUrl('home'));
    }
  });
}
document.querySelectorAll('.ad-slot').forEach(communityMountAd);
loadMySchool().then(async()=>{await Promise.all([loadLatestReviews(),communityLoadHomeMenuRank(),handleUrlParam()]);}).catch(e=>{console.error('Initialization failed',e);communityError(homeFeed,()=>location.reload());});
lucide.createIcons();
document.querySelectorAll('.section-title,.home-live-main').forEach(heading=>{
  heading.textContent=heading.textContent.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u,'');
});
