// Live playground: public reads and the app's existing user identity for mutations.
(function(){
  const page=document.getElementById('page-playground');
  let sharedIdentityReady=false;
  let campaign=null,participated=false,items=[],leaders=[],cursor=null,hasMore=false,sort='latest',pages=1;
  let draft=['','',''],requestId=crypto.randomUUID(),request=0,busy=false,clockOffset=0;
  const labels={funny:'재밌어요'};
  const icons={funny:'laugh'};
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const errors={INVALID_USER_KEY:'사용자 정보를 확인하지 못했어요. 화면을 새로 열어 주세요.',USER_INACTIVE:'현재 참여할 수 없는 사용자예요.',WRITING_CLOSED:'작성 기간이 끝났어요. 평가에 참여해 주세요.',VOTING_CLOSED:'평가 기간이 끝났어요.',SELF_REACTION_NOT_ALLOWED:'내 작품에는 반응할 수 없어요.',ALREADY_PARTICIPATED:'이번 주 삼행시는 이미 등록했어요. 한 사람당 한 작품만 참여할 수 있어요.',INVALID_LINES:'제시어로 시작하는 세 줄을 2~60자로 작성해 주세요.',USER_REQUIRED:'사용자 정보를 확인하지 못했어요. 다시 시도해 주세요.'};
  const safe=text=>escapeHtml(typeof safeCommunityText==='function'?safeCommunityText(text):text);
  function status(message){page.querySelector('#pg-status').textContent=message;}
  async function call(body){
    if(body.action!=='feed'&&!sharedIdentityReady)throw new Error('사용자 연결 업데이트를 준비하고 있어요. 잠시 후 다시 시도해 주세요.');
    const user=await getUserId();
    const result=await edge('playground',{...body,user_key:user.id});
    if(body.action==='feed')sharedIdentityReady=result?.identity_model==='app-user-key-v1';
    if(!result?.ok)throw new Error(errors[result?.error]||'정보를 저장하거나 불러오지 못했어요. 다시 시도해 주세요.');
    return result;
  }
  function phase(){
    if(!campaign)return 'waiting';const now=Date.now()+clockOffset;
    if(now<Date.parse(campaign.starts_at))return 'waiting';
    if(now<Date.parse(campaign.writing_ends_at))return 'writing';
    if(now<Date.parse(campaign.voting_ends_at))return 'voting';
    return 'closed';
  }
  function koreanTime(value){return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(value));}
  function updatePhase(){
    const current=phase(),write=page.querySelector('.pg-write');
    write.disabled=current!=='writing'||busy||participated;
    page.querySelector('.pg-phase').textContent=!campaign?'다음 주간 제시어를 준비하고 있어요.':current==='writing'?`작성 마감 · ${koreanTime(campaign.writing_ends_at)}`:current==='voting'?`평가 기간 · ${koreanTime(campaign.voting_ends_at)}까지`:current==='closed'?'이번 주 평가가 종료됐어요.':'제시어 시작을 기다리고 있어요.';
    write.innerHTML=icon('pencil')+(participated?'이번 주 참여 완료':current==='voting'?'작성 마감 · 평가에 참여해 주세요':current==='closed'?'작성·평가 종료':'나도 한 수 써보기');
    page.querySelectorAll('[data-reaction]').forEach(button=>{button.disabled=busy||!['writing','voting'].includes(current)||button.closest('[data-own="true"]')!==null;});
    lucide.createIcons();
  }
  function poemHtml(p,placement,rankLabel=''){
    return `<article class="pg-poem${placement==='leader'?' pg-poem-leader':''}" data-poem="${escapeHtml(p.id)}" data-placement="${placement}" data-own="${p.own}"><header><span class="pg-avatar">${icon('chef-hat')}</span><div><strong>${safe(p.nickname)}</strong><small>${p.own?'내 작품':'급식친구'}</small></div>${rankLabel?`<span class="pg-winner-badge">${icon('crown')}${escapeHtml(rankLabel)}</span>`:''}</header><div class="pg-lines">${p.lines.map((line,i)=>`<div><b>${escapeHtml(campaign.syllables[i])}</b><p>${safe(line.startsWith(campaign.syllables[i])?line.slice(campaign.syllables[i].length):line)}</p></div>`).join('')}</div><div class="pg-reactions" aria-label="작품 반응">${Object.keys(labels).map(kind=>`<button type="button" data-reaction="${kind}" aria-pressed="${p.selected===kind}" aria-label="${labels[kind]} ${p.counts[kind]}" ${p.selected===kind?'class="selected"':''}>${icon(icons[kind])}<span>${labels[kind]}</span><strong>${p.counts[kind]}</strong></button>`).join('')}</div>${p.own?'<p class="pg-own-note">내 작품에는 반응할 수 없어요.</p>':''}</article>`;
  }
  function render(){
    const joint=leaders.length>1,final=Boolean(campaign?.finalized_at);
    const rankLabel=(final?'최종 ':'현재 ')+(joint?'공동 1등':'1등');
    const winnerIds=new Set(leaders.map(p=>p.id));
    page.querySelector('.pg-syllables').setAttribute('aria-label',campaign?`제시어 ${campaign.word}`:'제시어 준비 중');
    page.querySelector('.pg-syllables').innerHTML=campaign?campaign.syllables.map(letter=>`<b>${escapeHtml(letter)}</b>`).join(''):'';
    page.querySelector('.pg-leader').innerHTML=`<div class="pg-section-heading"><h2>${icon('trophy')}${rankLabel}</h2><span>재밌어요 기준</span></div>${leaders.length?leaders.map(p=>poemHtml(p,'leader',rankLabel)).join(''):'<div class="pg-empty">아직 1등 작품이 없어요.</div>'}`;
    page.querySelector('.pg-list').innerHTML=items.length?items.map(p=>poemHtml(p,'latest',winnerIds.has(p.id)?rankLabel:'')).join(''):'<div class="pg-empty">첫 번째 삼행시의 주인공이 되어 보세요.</div>';
    page.querySelectorAll('[data-sort]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sort===sort)));
    const more=page.querySelector('.pg-more');more.hidden=!hasMore;more.disabled=busy;more.textContent='삼행시 더 보기';
    updatePhase();
  }
  async function load(append=false,restorePages=false){
    const current=++request;busy=true;page.querySelector('.pg-more').disabled=true;updatePhase();
    try{
      const response=await call({action:'feed',sort,cursor:append?cursor:null});
      if(current!==request)return;
      clockOffset=Date.parse(response.server_now)-Date.now();
      const changed=campaign?.id!==response.campaign?.id;
      campaign=response.campaign;participated=Boolean(response.participated);leaders=response.leaders;
      let newItems=append&&!changed?[...items,...response.items]:response.items;
      let nextCursor=response.cursor,nextHasMore=response.has_more;
      if(restorePages&&!changed){for(let i=1;i<pages&&nextHasMore;i++){const next=await call({action:'feed',sort,cursor:nextCursor});if(current!==request)return;newItems.push(...next.items);nextCursor=next.cursor;nextHasMore=next.has_more;}}
      items=[...new Map(newItems.map(p=>[p.id,p])).values()];cursor=nextCursor;hasMore=nextHasMore;
      if(append)pages++;else if(!restorePages||changed)pages=1;
      page.querySelector('.pg-retry').hidden=true;
      busy=false;render();
    }catch(error){if(current===request){busy=false;updatePhase();page.querySelector('.pg-more').disabled=false;page.querySelector('.pg-retry').hidden=false;status(error.message);}}
  }
  page.innerHTML=`<div class="container pg-container"><section class="pg-hero"><h1>급식 낙서장</h1><p class="pg-subtitle">급식으로 웃기는 세 줄</p><div class="pg-prompt">이번 주 제시어</div><div class="pg-syllables" aria-label="제시어 불러오는 중"></div><button type="button" class="pg-write" disabled>${icon('pencil')}제시어 불러오는 중</button></section><p class="pg-phase" role="status">주간 제시어를 불러오고 있어요.</p><section class="pg-leader" aria-label="현재 1등 작품"></section><section class="pg-latest" aria-label="삼행시 작품 목록"><div class="pg-section-heading"><h2>친구들의 삼행시</h2></div><div class="pg-sort" aria-label="작품 정렬"><button type="button" data-sort="latest" aria-pressed="true">최신순</button><button type="button" data-sort="popular" aria-pressed="false">인기순</button></div><div class="pg-list"><div class="pg-empty">작품을 불러오고 있어요.</div></div><button type="button" class="pg-more" hidden>삼행시 더 보기</button></section><p id="pg-status" role="status" aria-live="polite"></p><button type="button" class="pg-retry pg-more" hidden>다시 불러오기</button></div>`;
  page.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.sort){sort=button.dataset.sort;pages=1;void load();return;}
    if(button.classList.contains('pg-retry')){void load();return;}
    if(button.classList.contains('pg-more')){if(!busy)void load(true);return;}
    if(button.classList.contains('pg-write')){openComposer();return;}
    if(button.dataset.reaction&&!busy){
      const article=button.closest('[data-poem]'),top=button.getBoundingClientRect().top,y=scrollY;
      const post=[...items,...leaders].find(p=>p.id===article.dataset.poem);
      busy=true;updatePhase();
      try{
        await call({action:'react',poem_id:post.id,reaction:post.selected===button.dataset.reaction?null:button.dataset.reaction});
        await load(false,true);
        const copies=[...page.querySelectorAll('[data-poem]')].filter(el=>el.dataset.poem===article.dataset.poem);
        const next=copies.find(el=>el.dataset.placement===article.dataset.placement)||copies[0];
        const control=next?.querySelector(`[data-reaction="${button.dataset.reaction}"]`);
        if(control){control.focus({preventScroll:true});window.scrollTo(0,y+control.getBoundingClientRect().top-top);}
        status('반응을 반영했어요. 다시 누르면 취소돼요.');
      }catch(error){status(error.message);}finally{busy=false;updatePhase();}
    }
  });
  function openComposer(){
    const writingCampaign=campaign;
    const dialog=communityDialog('나도 한 수 써보기');dialog.classList.add('pg-dialog');const form=document.createElement('form');
    form.innerHTML=`<p class="pg-form-note">첫 글자를 포함해 문장을 입력해 주세요. 첫 글자가 빠지면 자동으로 붙여요.</p>${writingCampaign.syllables.map((letter,i)=>`<label class="pg-input"><b>${escapeHtml(letter)}</b><span class="sr-only">${escapeHtml(letter)} 로 시작하는 문장</span><input name="line${i}" required maxlength="60" value="${escapeHtml(draft[i])}" placeholder="${escapeHtml(letter)}로 시작하는 문장" autocomplete="off"></label>`).join('')}<p class="pg-form-error" role="alert"></p><button class="pg-submit" type="submit">삼행시 올리기</button><p class="pg-form-note">이번 주에는 한 사람당 한 작품만 등록할 수 있어요.</p>`;
    dialog.querySelector('.dialog-body').append(form);
    form.addEventListener('input',()=>{draft=writingCampaign.syllables.map((_,i)=>form.elements[`line${i}`].value);});
    form.onsubmit=async e=>{
      e.preventDefault();const button=form.querySelector('.pg-submit');if(button.disabled)return;button.disabled=true;
      try{
        const lines=writingCampaign.syllables.map((letter,i)=>{
          const value=form.elements[`line${i}`].value.trim();
          return value.startsWith(letter)?value:letter+value;
        });
        if(lines.some(line=>Array.from(line).length>60||Array.from(line).length<2))throw new Error('각 줄은 2~60자로 작성해 주세요.');
        await call({action:'submit',campaign_id:writingCampaign.id,nickname:ensureNickname(),lines,request_id:requestId});
        draft=['','',''];requestId=crypto.randomUUID();sort='latest';pages=1;
        dialog.close();await load();status('삼행시를 올렸어요!');
      }catch(error){form.querySelector('.pg-form-error').textContent=error.message;}finally{button.disabled=false;}
    };
  }
  const previousSwitch=switchTab;
  switchTab=function(tab,options={}){previousSwitch(tab,options);if(tab==='playground')void load();};
  setInterval(updatePhase,60000);
  lucide.createIcons();
  // Initial deep links are handled once by community initialization / handleUrlParam.
})();
