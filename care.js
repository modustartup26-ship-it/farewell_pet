/* 돌봄 체크리스트 만들기: 업체와 연결되지 않아도 아이 프로필로 미리 만들어 저장해 둔다.
   로그인하면 계정에, 아니면 이 탭에 저장한다. 업체 문의함에서 체크리스트를 정할 때 이 내용으로 시작한다. */
(function(){
  const {esc,icon,toast,josa}=FP;
  const app=document.querySelector('#care-app');
  const chat=window.FPChat;
  let user=null,pet={},saved=null,draft=null,editing=false;

  const petName=()=>pet.name||'우리 아이';
  const typeLabel={choice:'고르기',minutes:'분 입력',text:'짧은 글'};

  /* ---------- 저장 ---------- */
  function localGet(){const s=FP.load();return s.careChecklist||null;}
  function localSet(plan){const s=FP.load();s.careChecklist=plan;FP.save(s);}
  async function loadSaved(){
    if(!user)return localGet();
    const {data,error}=await chat.client.from('care_checklists').select('plan').eq('user_id',user.id).maybeSingle();
    if(error)throw error;
    if(data)return data.plan;
    const local=localGet();
    if(local){await store(local).catch(()=>{});return local;}
    return null;
  }
  async function store(plan){
    if(!user){localSet(plan);return;}
    const now=new Date().toISOString();
    const {data:existing,error:e1}=await chat.client.from('care_checklists').select('user_id').eq('user_id',user.id).maybeSingle();
    if(e1)throw e1;
    const res=existing
      ?await chat.client.from('care_checklists').update({plan,updated_at:now}).eq('user_id',user.id)
      :await chat.client.from('care_checklists').insert({plan,updated_at:now});
    if(res.error)throw res.error;
    localSet(plan);
  }
  async function removeSaved(){
    if(user){const {error}=await chat.client.from('care_checklists').delete().eq('user_id',user.id);if(error)throw error;}
    localSet(null);
  }

  /* ---------- 문구 ---------- */
  function asText(plan){
    const lines=[`[${petName()} 돌봄 체크리스트]`,`${plan.interval_hours}시간마다 아래 내용을 알려 주세요.`,''];
    plan.questions.forEach((q,i)=>lines.push(`${i+1}. ${q.q}${q.type==='choice'&&q.options?` (${q.options.join(' / ')})`:q.type==='minutes'?' (분)':''}`));
    lines.push('','farewell pet에서 만든 체크리스트예요.');
    return lines.join('\n');
  }

  /* ---------- 화면: 저장된 체크리스트 ---------- */
  function renderSaved(){
    const p=saved;
    app.innerHTML=`<div class="care">
      <header class="care-head"><div><h1>${esc(josa.of(petName()))} 돌봄 체크리스트</h1><p>${p.interval_hours}시간마다 · 질문 ${p.questions.length}개 · ${new Date(p.updated_at||Date.now()).toLocaleDateString('ko-KR')} 저장</p></div></header>
      <ol class="care-list">${p.questions.map(q=>`<li><b>${esc(q.q)}</b>${q.type==='choice'&&q.options?`<span>${q.options.map(esc).join(' · ')}</span>`:`<span>${typeLabel[q.type]||''}</span>`}</li>`).join('')}</ol>
      <div class="care-actions">
        <button type="button" class="btn btn-primary" data-act="edit">${icon('edit')}고치기</button>
        <button type="button" class="btn btn-soft" data-act="copy">${icon('copy')}문구 복사하기</button>
      </div>
      <section class="care-note">
        <b>${icon('chat')}어떻게 쓰이나요?</b>
        <p>앱으로 문의를 받는 업체와 대화할 때 이 체크리스트가 그대로 채워져요. 아직 앱을 쓰지 않는 업체에는 ‘문구 복사하기’로 문자나 메시지에 붙여 보내 주세요.</p>
        <p class="muted">체크리스트는 건강 상태를 판단하지 않아요. 걱정되는 답이 있으면 업체나 병원에 바로 물어봐 주세요.</p>
      </section>
      ${user?'':`<p class="care-guest">지금은 이 탭에만 저장돼요. 탭을 닫으면 사라지니, 계속 쓰려면 <button type="button" class="link" data-act="login">로그인</button>해 주세요.</p>`}
      <p class="care-del"><button type="button" class="link" data-act="delete">체크리스트 지우기</button></p>
    </div>`;
  }

  /* ---------- 화면: 만들기·고치기 ---------- */
  function renderEdit(){
    const d=draft;
    app.innerHTML=`<div class="care">
      <header class="care-head"><div><h1>돌봄 체크리스트 ${saved?'고치기':'만들기'}</h1><p>${esc(josa.of(petName()))} 프로필을 보고 맡기는 동안 확인할 질문을 골랐어요. ${d.by==='ai'?'(AI 추천)':d.by==='rule'?'(프로필 기준)':''}</p></div></header>
      <form id="care-form" class="care-form" novalidate>
        <ul class="care-edit">${d.questions.map((q,i)=>`<li>
          <label class="care-q"><input type="checkbox" name="keep" value="${i}" ${q.off?'':'checked'}><span><b>${esc(q.q)}</b><small>${q.type==='choice'&&q.options?q.options.map(esc).join(' · '):typeLabel[q.type]}</small></span></label>
          ${q.custom?`<button type="button" class="icon-btn" data-del="${i}" aria-label="이 질문 지우기">${icon('close')}</button>`:''}
        </li>`).join('')}</ul>
        <div class="care-add"><label class="sr-only" for="add-q">질문 추가</label><input id="add-q" maxlength="80" placeholder="직접 질문 추가 (예: 하네스는 편하게 찼나요?)"><button type="button" class="btn btn-soft" data-act="add">${icon('plus')}추가</button></div>
        <label class="field-l">몇 시간마다 받을까요?<select name="hours">${Checklist.INTERVALS.map(h=>`<option value="${h}" ${h===d.interval_hours?'selected':''}>${h}시간마다</option>`).join('')}</select></label>
        <div class="care-actions">
          <button type="submit" class="btn btn-primary">${icon('check')}저장하기</button>
          <button type="button" class="btn-ghost" data-act="regen">${icon('refresh')}프로필로 다시 고르기</button>
          ${saved?'<button type="button" class="btn-ghost" data-act="cancel">취소</button>':''}
        </div>
      </form>
    </div>`;
    const f=document.querySelector('#care-form');
    f.addEventListener('change',e=>{if(e.target.name==='keep')draft.questions[+e.target.value].off=!e.target.checked;if(e.target.name==='hours')draft.interval_hours=Number(e.target.value);});
    f.addEventListener('submit',save);
    document.querySelector('#add-q').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();addQuestion();}});
  }
  function addQuestion(){
    const inp=document.querySelector('#add-q');const t=inp.value.trim();
    if(!t)return;
    if(draft.questions.filter(q=>!q.off).length>=12){toast('질문은 12개까지 넣을 수 있어요.');return;}
    draft.questions.push({id:'custom-'+Date.now(),q:/[?.!]$/.test(t)?t:t+'?',type:'text',custom:true});
    renderEdit();document.querySelector('#add-q').focus();
  }
  async function save(e){
    e.preventDefault();
    const qs=draft.questions.filter(q=>!q.off).map(({off,custom,...q})=>q);
    if(!qs.length){toast('질문을 하나 이상 골라 주세요.');return;}
    if(qs.length>12){toast('질문은 12개까지 넣을 수 있어요.');return;}
    const plan={interval_hours:draft.interval_hours,questions:qs,by:draft.by||'saved',updated_at:new Date().toISOString()};
    const btn=e.target.querySelector('[type=submit]');btn.disabled=true;
    try{await store(plan);saved=plan;editing=false;renderSaved();toast('체크리스트를 저장했어요.');}
    catch{btn.disabled=false;toast('저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.');}
  }
  async function startDraft(fromSaved){
    if(fromSaved&&saved){draft={interval_hours:saved.interval_hours,by:saved.by,questions:saved.questions.map(q=>({...q,custom:String(q.id).startsWith('custom-')}))};renderEdit();return;}
    app.innerHTML='<section class="chat-gate"><p class="muted">아이 프로필을 보고 질문을 고르는 중이에요.</p></section>';
    const r=await Checklist.suggestAI(pet,user?chat.client:null);
    draft={interval_hours:draft?draft.interval_hours:3,by:r.by,questions:r.questions};
    renderEdit();
  }

  document.addEventListener('click',async e=>{
    const del=e.target.closest('[data-del]');
    if(del){draft.questions.splice(+del.dataset.del,1);renderEdit();return;}
    const t=e.target.closest('[data-act]');if(!t)return;
    const a=t.dataset.act;
    if(a==='edit'){editing=true;startDraft(true);}
    if(a==='cancel'){editing=false;renderSaved();}
    if(a==='regen')startDraft(false);
    if(a==='add')addQuestion();
    if(a==='login')window.FPAuth&&window.FPAuth.open({onSuccess:boot});
    if(a==='copy'){
      const text=asText(saved);
      try{await navigator.clipboard.writeText(text);toast('체크리스트 문구를 복사했어요.');}
      catch{const ta=document.createElement('textarea');ta.value=text;document.body.append(ta);ta.select();try{document.execCommand('copy');toast('체크리스트 문구를 복사했어요.');}catch{toast('복사하지 못했어요.');}ta.remove();}
    }
    if(a==='delete'){
      if(!t.dataset.armed){t.dataset.armed='1';t.textContent='한 번 더 누르면 지워져요';return;}
      try{await removeSaved();saved=null;draft=null;startDraft(false);toast('체크리스트를 지웠어요.');}catch{toast('지우지 못했어요.');}
    }
  });

  async function boot(){
    app.innerHTML='<section class="chat-gate"><p class="muted">불러오는 중이에요.</p></section>';
    try{
      user=chat?await chat.currentUser():null;
      pet=FP.load().pet||{};
      if(user){try{const r=await chat.loadPetProfile(pet);pet=r.pet||pet;}catch{}}
      if(!pet.name){app.innerHTML=`<section class="chat-gate"><h1>먼저 아이를 등록해 주세요</h1><p>체크리스트는 아이 프로필(나이·건강 고민·약·성향)을 보고 만들어요.</p><a class="btn btn-primary" href="profile.html">아이 등록하기</a></section>`;return;}
      saved=await loadSaved();
      if(saved)renderSaved();else startDraft(false);
    }catch{
      app.innerHTML='<section class="chat-gate"><h1>체크리스트를 열지 못했어요</h1><p>잠시 뒤에 다시 시도해 주세요.</p><button type="button" class="btn btn-soft" id="retry">다시 시도</button></section>';
      document.querySelector('#retry').onclick=boot;
    }
  }
  chat&&chat.client.auth.onAuthStateChange((ev,s)=>{if(ev==='SIGNED_IN'&&s&&(!user||user.id!==s.user.id))setTimeout(boot,0);});
  boot();
})();
