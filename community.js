// Presentation layer over the existing LA runtime; mutations retain Edge APIs.
const communityReviewCache = new Map();
const communityScroll = new Map();
const communityPending = new Set();
let communityTab = 'home';
let communityFilter = 'all';
let communityScoreShown = false;
let communityFeedRequest = 0;

function communityError(el, retry) {
  el.innerHTML = '<div class="ranking-error">정보를 불러오지 못했어요.</div>';
  const button = document.createElement('button');
  button.className = 'rating-launch'; button.textContent = '다시 시도';
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

showRankEffect = function(rank, score) {
  if (communityScoreShown || document.querySelector('dialog[open]')) return;
  communityScoreShown = true;
  const dialog = communityDialog('오늘의 급식 점수');
  dialog.querySelector('.dialog-body').innerHTML = `<div class="score-presentation"><strong>${Number(score)}</strong><div class="score-grade">${escapeHtml(rank)}랭크</div><p>메뉴 구성으로 계산한 점수예요.<br>직접 먹어본 평가는 급식톡에 남겨주세요.</p></div><button class="rating-launch">식단 보기</button>`;
  dialog.querySelector('.rating-launch').onclick = () => dialog.close();
};

mealCardHtml = function(meal, footerRight = '') {
  const valid = meal.auto_score !== null && meal.auto_score !== undefined && Number.isFinite(Number(meal.auto_score));
  const rank = valid ? getRank(Number(meal.auto_score)) : null;
  return `<div class="meal-card"><div class="meal-score-row"><span class="meal-score-caption">${escapeHtml(mealTypeLabel(meal))} · 급식 점수</span><button class="meal-score-big" style="border:0;background:none;color:var(--blue)" ${valid ? `onclick="communityScoreShown=false;showRankEffect('${rank.r}',${Number(meal.auto_score)})" aria-label="급식 점수 자세히 보기"` : 'disabled'}>${valid ? Number(meal.auto_score) : '—'}<span style="font-size:12px">${valid ? '점' : ''}</span></button>${rank ? `<span class="meal-rank-badge">${escapeHtml(rank.r)}랭크</span>` : ''}</div><ul class="menu-list">${(Array.isArray(meal.menu)?meal.menu:[]).map(name=>`<li>${escapeHtml(name)}</li>`).join('')}</ul><div class="meal-footer"><span>${meal.calories == null ? '열량 정보 없음' : `${Number(meal.calories)} kcal`}</span><span>${escapeHtml(footerRight)}</span></div></div>`;
};

const communityRenderRating = renderRating;
renderRating = function(mealId, target, meal = null, scope = 'default') {
  if (!target) return;
  if (localStorage.getItem(`rated_${mealId}`) || !canWriteReviewForSchool(meal?.school_id || mySchool?.id)) {
    return communityRenderRating(mealId, target, meal, scope);
  }
  target.replaceChildren();
  const button = document.createElement('button');
  button.className = 'rating-launch'; button.textContent = `${mealTypeLabel(meal || {})} 한줄평 남기기`;
  button.onclick = () => {
    const dialog = communityDialog('오늘 급식 어땠어?');
    const body = dialog.querySelector('.dialog-body');
    communityRenderRating(mealId, body, meal, scope);
    const subtitle = body.querySelector('.rating-subtitle');
    if (subtitle) subtitle.textContent = '별점 · 필수';
    body.querySelectorAll('.rating-subtitle').forEach(el => { if (el.textContent.includes('메뉴')) el.textContent = '대표 메뉴 · 필수'; });
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
  const text = item.querySelector('.review-text');
  if (text) item.querySelector('.review-top-row').after(text);
  const actions = item.querySelectorAll('.review-action-btn');
  actions.forEach(button => {
    const handler = button.getAttribute('onclick') || '';
    if (handler.startsWith('startReviewEdit')) button.setAttribute('onclick', `startReviewEdit(${review.id},this)`);
    if (handler.startsWith('reactToReview')) {
      const kind = handler.includes("'dislike'") ? 'dislike' : 'like';
      button.setAttribute('onclick', `reactToReview(${review.id},'${kind}','',this)`);
      button.setAttribute('aria-pressed', String(review.my_reaction === kind));
      button.setAttribute('aria-label', `${kind==='like'?'좋아요':'싫어요'} ${review.reaction_counts?.[kind]||0}`);
    }
  });
  if (review.comments?.length && !openCommentThreads.has(String(review.id))) {
    const c = review.comments[review.comments.length-1];
    const preview = document.createElement('div'); preview.className='review-preview';
    preview.innerHTML=`<b>${escapeHtml(c.nickname||'급식러')}</b> ${escapeHtml(c.comment)}`;
    item.querySelector('.review-actions').after(preview);
  }
  return item.outerHTML;
};

function communityReplaceReview(review) {
  const nodes = [...document.querySelectorAll('.review-item')].filter(el=>el.id===`review-item-${review.id}`);
  const anchor = nodes.find(el=>el.getBoundingClientRect().height && el.closest('.page.active'));
  const top = anchor?.getBoundingClientRect().top;
  const y = window.scrollY;
  nodes.forEach(el=>{
    const input=el.querySelector('.review-comment-input');
    const draft=input?.value||'';
    const focused=document.activeElement===input;
    const open=!el.querySelector('.review-comments')?.classList.contains('hide');
    const template=document.createElement('template');template.innerHTML=renderReviewItem(review);
    const next=template.content.firstElementChild;
    next.querySelector('.review-comments')?.classList.toggle('hide',!open);
    if(next.querySelector('.review-comment-input')){next.querySelector('.review-comment-input').value=draft;updateReviewCommentSubmit(next.querySelector('.review-comment-input'));}
    el.replaceWith(next);
    if(focused)next.querySelector('.review-comment-input')?.focus({preventScroll:true});
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
  }catch(e){alert('반응을 저장하거나 확인하지 못했어요. 잠시 후 다시 확인해 주세요.');}
  finally{communityPending.delete(key);if(trigger?.isConnected)trigger.disabled=false;}
};

submitReviewComment = async function(id, trigger) {
  const item=trigger?.closest('.review-item'),input=item?.querySelector('.review-comment-input');
  const comment=input?.value.trim();const key=`comment-${id}`;
  if(!comment||communityPending.has(key))return;communityPending.add(key);
  const button=item.querySelector('.review-comment-submit');if(button)button.disabled=true;
  try{
    await getUserId();
    const result=await edge('create-review-comment',{rating_id:id,user_key:getInteractionUserKey(),nickname:ensureNickname(),comment});
    if(!result?.ok)throw new Error('Comment failed');
    input.value='';openCommentThreads.add(String(id));await communityRefreshOne(id);
    void logAitGoal('goal_review_comment',{rating_id:String(id),comment_length:comment.length});
  }catch(e){alert('댓글 저장 결과를 확인하지 못했어요. 다시 등록하기 전에 댓글을 확인해 주세요.');}
  finally{communityPending.delete(key);if(input?.isConnected)updateReviewCommentSubmit(input);}
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
  const states=[...document.querySelectorAll('.page.active .review-item')].map(el=>({id:el.id,draft:el.querySelector('.review-comment-input')?.value||''}));
  await communityRefreshAll();
  states.forEach(s=>{const el=[...document.querySelectorAll('.page.active .review-item')].find(x=>x.id===s.id);const input=el?.querySelector('.review-comment-input');if(input){input.value=s.draft;updateReviewCommentSubmit(input);}});
  window.scrollTo(0,y);
};

loadLatestReviews = async function(limit=5,targetId='latest-reviews-wrap',title='최신 급식톡') {
  const target=document.getElementById(targetId);if(!target)return;
  const request=String(++communityFeedRequest);target.dataset.request=request;
  try{
    const filter=communityFilter==='school'&&mySchool?.id?`&school_id=eq.${mySchool.id}`:'';
    const data=await sb(`la_reviews?order=created_at.desc&limit=${limit}${filter}&select=${REVIEW_SELECT}`);
    if(!Array.isArray(data))throw new Error('Feed query failed');
    const enriched=await enrichReviews(data);
    if(target.dataset.request===request)target.innerHTML=latestReviewsHtml(enriched,title);
  }catch(e){if(target.dataset.request===request)communityError(target,()=>loadLatestReviews(limit,targetId,title));}
};

function communityFilterBar(target) {
  const bar=document.createElement('div');bar.className='community-filters';
  for(const [value,label] of [['all','전체'],['school','우리학교']]){
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
function communityRankingRows(rows,unit){return rows.length?rows.slice(0,5).map((row,i)=>`<div class="ranking-card"><div class="rank-num">${i+1}</div><div class="rank-info"><div class="rank-school">${escapeHtml(row.name)}</div>${row.detail?`<div class="rank-menu-preview">${escapeHtml(row.detail)}</div>`:''}</div><div class="rank-score">${Number(row.value).toLocaleString()}<small>${unit}</small></div></div>`).join(''):'<div class="ranking-error">아직 참여 기록이 없어요.</div>';}
let communityRankingPromise;
function communityLoadRankings(){
  if(communityRankingPromise)return communityRankingPromise;
  communityRankingPromise=communityLoadRankingsInner().finally(()=>communityRankingPromise=null);return communityRankingPromise;
}
async function communityLoadRankingsInner(){
  const {month,start,end}=monthlyRange();
  const period=`created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}`;
  const tasks=[
    ['community-menu-rank',async()=>{
      const rows=await communityReadAll(`la_school_menu_stats_monthly?month=eq.${month}&select=school_id,menu_item,pick_count&order=school_id.asc,menu_item.asc`);
      const totals=new Map();rows.forEach(r=>{if(r.menu_item?.trim())totals.set(r.menu_item,(totals.get(r.menu_item)||0)+Number(r.pick_count||0));});
      return communityRankingRows([...totals].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)),'회');
    }],
    ['community-school-rank',async()=>{
      const rows=await sb(`la_school_engagement_monthly?month=eq.${month}&order=score.desc,school_id.asc&limit=5&select=score,review_count,comment_count,reaction_count,photo_count,schools:la_schools(name)`);
      if(!Array.isArray(rows))throw new Error('School ranking failed');
      return communityRankingRows(rows.map(r=>({name:r.schools?.name||'학교',value:r.score,detail:`리뷰 ${r.review_count} · 댓글 ${r.comment_count}`})),'점');
    }],
    ['community-person-rank',async()=>{
      const [reviews,comments]=await Promise.all(['la_reviews','la_review_comments'].map(table=>communityReadAll(`${table}?${period}&select=id,user_key,nickname,created_at&order=id.asc`)));
      const totals=new Map();[...reviews,...comments].forEach(r=>{if(!r.user_key)return;const old=totals.get(r.user_key)||{name:'급식러',value:0,time:''};old.value++;if(r.created_at>old.time&&r.nickname){old.name=r.nickname;old.time=r.created_at;}totals.set(r.user_key,old);});
      return communityRankingRows([...totals.values()].sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)),'회');
    }]
  ];
  await Promise.all(tasks.map(async([id,load])=>{const el=document.getElementById(id);try{el.innerHTML=await load();}catch(e){communityError(el,communityLoadRankings);}}));
}

const communitySwitchTab=switchTab;
switchTab=function(tab){communityScroll.set(communityTab,window.scrollY);communityTab=tab;communitySwitchTab(tab);if(tab==='ranking')communityLoadRankings();requestAnimationFrame(()=>window.scrollTo(0,communityScroll.get(tab)||0));};
const communityApplySchool=applyMySchool;
applyMySchool=function(){document.body.classList.add('has-school');communityApplySchool();};

// Remove duplicated discovery sections, retaining original targets for runtime compatibility.
document.querySelectorAll('#page-home .section-title').forEach(el=>el.hidden=true);
const homeFeed=document.getElementById('latest-reviews-wrap');
const divider=document.createElement('div');divider.className='community-divider';
document.querySelector('.home-live-title').before(divider);
communityFilterBar(homeFeed);communityFilterBar(document.getElementById('feed-reviews-wrap'));
const rankingContainer=document.querySelector('#page-ranking .container');
const legacy=document.createElement('details');legacy.className='legacy-ranking';legacy.innerHTML='<summary>자동 급식 점수 순위 · 지도 · 배틀</summary>';
while(rankingContainer.firstChild)legacy.append(rankingContainer.firstChild);
rankingContainer.innerHTML=`<div class="section-title">이달의 TOP 5</div><section class="ranking-block"><h2>식단 랭킹 · 대표 메뉴</h2><p class="ranking-note">같은 이름의 메뉴 선택 횟수</p><div id="community-menu-rank"></div></section><section class="ranking-block"><h2>학교 참여도</h2><p class="ranking-note">리뷰×10 · 댓글×3 · 반응×1 · 사진×5</p><div id="community-school-rank"></div></section><section class="ranking-block"><h2>개인 참여도</h2><p class="ranking-note">이달에 작성한 리뷰와 댓글 · 이용 식별자 기준</p><div id="community-person-rank"></div></section>`;
rankingContainer.append(legacy);
document.querySelectorAll('.tab-item').forEach(el=>{el.setAttribute('role','button');el.tabIndex=0;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}};});
loadMySchool().then(async()=>{await Promise.all([loadLatestReviews(),handleUrlParam()]);}).catch(e=>{console.error('Initialization failed',e);communityError(homeFeed,()=>location.reload());});
