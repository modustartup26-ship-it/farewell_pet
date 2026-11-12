/* 문의함: 보호자(inbox.html)와 업체(partner.html)가 같은 코드를 쓴다. body의 data-role로 구분한다.
   메시지 종류: 글, 사진·영상, 입실, 퇴실, 돌봄 체크리스트 */
(function(){
  const {esc,icon,toast}=FP;
  const role=document.body.dataset.role;
  const isFacility=role==='facility';
  const app=document.querySelector('#chat-app');
  const chat=window.FPChat;
  const page=isFacility?'partner.html':'inbox.html';
  const TABLE='inquiry_messages';
  const COLS='id,sender_role,kind,body,payload,created_at';
  let user=null,conversations=[],facilityNames=new Map(),testIds=new Set(),staffIds=[];
  let activeId=new URLSearchParams(location.search).get('c'),messages=[],media=new Map(),threadChannel=null,listChannel=null,dueTimer=null;

  function when(iso){
    const d=new Date(iso),now=new Date();
    const time=d.toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'});
    return d.toDateString()===now.toDateString()?time:`${d.getMonth()+1}월 ${d.getDate()}일 ${time}`;
  }
  const hm=d=>d.toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'});
  function panel(html){app.innerHTML=`<section class="chat-gate">${html}</section>`;}
  function setUrl(id){const u=new URL(location.href);if(id)u.searchParams.set('c',id);else u.searchParams.delete('c');u.hash='';history.replaceState(null,'',u);}
  function linkError(){return /error_code=|error=/.test(location.hash)?'로그인 링크가 만료됐거나 이미 사용됐어요. 새 링크를 받아 주세요.':'';}

  /* ---------- 아래에서 올라오는 시트 ---------- */
  const sheet=document.createElement('dialog');
  sheet.className='sheet';sheet.id='cmodal';sheet.setAttribute('aria-labelledby','cmodal-title');
  sheet.innerHTML=`<div class="sheet-head"><span></span><h2 id="cmodal-title"></h2><button type="button" class="icon-btn" data-sheet-close aria-label="닫기">${icon('close')}</button></div><form class="sheet-body" id="cmodal-form" novalidate></form><div class="sheet-foot" id="cmodal-foot"></div>`;
  document.body.append(sheet);
  sheet.addEventListener('click',e=>{if(e.target===sheet||e.target.closest('[data-sheet-close]'))sheet.close();});
  function openSheet(title,body,foot,onSubmit){
    sheet.querySelector('#cmodal-title').textContent=title;
    const f=sheet.querySelector('#cmodal-form');f.innerHTML=body;
    sheet.querySelector('#cmodal-foot').innerHTML=foot;
    f.onsubmit=e=>{e.preventDefault();onSubmit&&onSubmit(new FormData(f),f);};
    if(!sheet.open)sheet.showModal();
    return f;
  }

  function renderLogin(){
    const err=linkError();
    panel(`<h1>${isFacility?'업체 문의함':'내 문의함'}</h1>
      <p>${isFacility?'보호자가 보낸 문의를 확인하고 답할 수 있어요.':'업체에 보낸 문의와 답변을 모아 볼 수 있어요.'} 이메일로 로그인 링크를 보내 드릴게요.</p>
      ${err?`<p class="chat-error" role="alert">${esc(err)}</p>`:''}
      <form id="login" class="chat-form"><label class="field-l">이메일<input type="email" name="email" required autocomplete="email" inputmode="email" placeholder="name@example.com"></label><button class="btn btn-primary" type="submit">로그인 링크 받기</button><p class="chat-error" id="login-error" role="alert" hidden></p></form>
      <a class="chat-switch" href="${isFacility?'inbox.html':'partner.html'}">${isFacility?'보호자이신가요? 내 문의함으로':'업체이신가요? 업체 문의함으로'}</a>`);
    document.querySelector('#login').addEventListener('submit',async e=>{
      e.preventDefault();
      const btn=e.target.querySelector('button'),errEl=document.querySelector('#login-error');
      btn.disabled=true;errEl.hidden=true;
      const email=new FormData(e.target).get('email').trim();
      const error=await chat.signIn(email,page);
      if(error){errEl.textContent=chat.loginErrorText(error);errEl.hidden=false;btn.disabled=false;return;}
      panel(`<h1>메일을 확인해 주세요</h1><p><b>${esc(email)}</b>로 로그인 링크를 보냈어요. 메일의 링크를 누르면 이 화면으로 돌아와요.</p><p class="muted">메일이 보이지 않으면 스팸함도 확인해 주세요.</p>`);
    });
  }

  function renderInvite(){
    panel(`<h1>업체 연결하기</h1><p>이 계정에 연결된 업체가 없어요. 안내받은 초대 코드를 입력해 주세요.</p>
      <form id="invite" class="chat-form"><label class="field-l">초대 코드<input name="code" required autocomplete="off" spellcheck="false" placeholder="FP-XXXX-XXXX-XXXX"></label><button class="btn btn-primary" type="submit">업체 연결하기</button><p class="chat-error" id="invite-error" role="alert" hidden></p></form>
      <button type="button" class="btn-ghost chat-out" id="logout">로그아웃</button>`);
    document.querySelector('#logout').onclick=logout;
    document.querySelector('#invite').addEventListener('submit',async e=>{
      e.preventDefault();
      const btn=e.target.querySelector('button'),errEl=document.querySelector('#invite-error');
      btn.disabled=true;errEl.hidden=true;
      const {error}=await chat.client.rpc('redeem_facility_invite',{p_code:new FormData(e.target).get('code')});
      if(error){errEl.textContent=/invalid_invite/.test(error.message||'')?'코드가 맞지 않거나 이미 사용됐어요.':'연결하지 못했어요. 잠시 뒤에 다시 시도해 주세요.';errEl.hidden=false;btn.disabled=false;return;}
      boot();
    });
  }

  async function logout(){
    closeChannels();
    const {error}=await chat.client.auth.signOut();
    if(error){console.error('Unable to sign out.',error);toast('로그아웃하지 못했어요. 잠시 뒤 다시 시도해 주세요.');return;}
    const cacheCleared=FP.clearPetCache();
    user=null;activeId=null;setUrl(null);renderLogin();
    if(!cacheCleared)toast('로그아웃했지만 이 기기의 아이 정보 캐시를 지우지 못했어요.');
  }
  function closeChannels(){
    closeThreadChannel();
    if(listChannel){chat.client.removeChannel(listChannel);listChannel=null;}
  }

  async function loadFacilities(){
    const {data,error}=await chat.client.from('facilities').select('id,name,is_test');
    if(error)throw error;
    facilityNames=new Map(data.map(f=>[f.id,f.name]));testIds=new Set(data.filter(f=>f.is_test).map(f=>f.id));
  }
  async function loadConversations(){
    let q=chat.client.from('conversations').select('id,facility_id,pet_name,last_message,last_message_at,care_plan').order('last_message_at',{ascending:false}).limit(100);
    q=isFacility?q.in('facility_id',staffIds):q.eq('guardian_id',user.id);
    const {data,error}=await q;
    if(error)throw error;
    conversations=data;
  }
  const titleOf=c=>isFacility?`${c.pet_name} 보호자`:(facilityNames.get(c.facility_id)||'업체');
  const active=()=>conversations.find(x=>x.id===activeId);

  function renderShell(){
    const who=isFacility?staffIds.map(id=>facilityNames.get(id)).filter(Boolean).join(', '):'';
    app.innerHTML=`<div class="chat-shell" id="shell">
      <aside class="chat-list"><div class="chat-list-head"><div><h1>${isFacility?'업체 문의함':'내 문의함'}</h1>${isFacility?`<p>${esc(who)}</p>`:'<p><a href="album.html">앨범 보기</a></p>'}</div><button type="button" class="btn-ghost chat-out" id="logout">로그아웃</button></div><div id="conv-list"></div></aside>
      <section class="chat-thread" id="thread" aria-live="polite"></section>
    </div>`;
    document.querySelector('#logout').onclick=logout;
    renderList();renderThread();
  }
  function renderList(){
    const box=document.querySelector('#conv-list');if(!box)return;
    box.innerHTML=conversations.length?conversations.map(c=>`<button type="button" class="conv" data-conv="${esc(c.id)}"${c.id===activeId?' aria-current="true"':''}><b>${esc(titleOf(c))}</b><span class="conv-last">${esc(c.last_message||'')}</span><time>${esc(when(c.last_message_at))}</time></button>`).join(''):
      `<div class="chat-empty"><b>아직 문의가 없어요</b>${isFacility?'<p>보호자가 문의를 보내면 여기에 바로 나타나요.</p>':'<p>산책 지도에서 업체를 고르고 문의를 보내 보세요.</p><a class="btn btn-soft" href="services.html">산책 지도로 가기</a>'}</div>`;
  }

  /* ---------- 메시지 ---------- */
  function bubble(m){
    const mine=m.sender_role===role;
    const t=`<time>${esc(when(m.created_at))}</time>`;
    if(m.kind==='checkin'||m.kind==='checkout'){
      const label=m.kind==='checkin'?'입실했어요':'퇴실했어요';
      return `<div class="msg-event ${m.kind}"><span>${icon(m.kind==='checkin'?'check':'clock')}${esc(label)} · ${esc(hm(new Date(m.created_at)))}</span>${m.payload&&m.payload.note?`<p>${esc(m.payload.note)}</p>`:''}</div>`;
    }
    if(m.kind==='checklist'){
      const ans=(m.payload&&m.payload.answers)||[];
      return `<div class="msg ${mine?'mine':'theirs'} card-msg"><div class="cl-card"><b>${icon('list')}돌봄 체크리스트</b><dl>${ans.map(a=>`<dt>${esc(a.q)}</dt><dd>${esc(a.id==='walk'&&/^\d+$/.test(a.a)?a.a+'분':a.a)}</dd>`).join('')}</dl>${isFacility?'':'<p class="cl-foot">산책 일기에도 기록됐어요.</p>'}</div>${t}</div>`;
    }
    if(m.kind==='media'){
      const md=media.get(m.payload&&m.payload.media_id);
      const inner=md?`<div class="media-slot" data-path="${esc(md.path)}" data-kind="${md.kind}"><span class="media-wait">불러오는 중</span></div>${md.caption?`<p>${esc(md.caption)}</p>`:''}`:`<p class="muted">사진을 볼 수 없어요.</p>`;
      return `<div class="msg ${mine?'mine':'theirs'} media-msg">${inner}${t}</div>`;
    }
    return `<div class="msg ${mine?'mine':'theirs'}"><p>${esc(m.body)}</p>${t}</div>`;
  }
  function bubbles(){
    if(!messages.length)return '<p class="chat-hint">아직 주고받은 메시지가 없어요.</p>';
    return messages.map(bubble).join('');
  }
  async function fillMedia(box){
    const slots=[...box.querySelectorAll('.media-slot:not(.ready)')];
    if(!slots.length)return;
    try{
      const map=await Media.urls(chat.client,slots.map(s=>s.dataset.path));
      slots.forEach(s=>{
        const u=map[s.dataset.path];if(!u){s.innerHTML='<span class="media-wait">볼 수 없어요</span>';return;}
        s.classList.add('ready');
        s.innerHTML=s.dataset.kind==='video'?`<video src="${esc(u)}" controls playsinline preload="metadata"></video>`:`<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="보낸 사진" loading="lazy"></a>`;
        const el=s.querySelector('img,video');
        el.addEventListener(s.dataset.kind==='video'?'loadedmetadata':'load',()=>{if(box.dataset.stick==='1')box.scrollTop=box.scrollHeight;},{once:true});
      });
    }catch{slots.forEach(s=>{s.innerHTML='<span class="media-wait">불러오지 못했어요</span>';});}
  }
  function renderMessages(){
    const box=document.querySelector('#messages');if(!box)return;
    box.innerHTML=bubbles();box.dataset.stick='1';box.scrollTop=box.scrollHeight;
    fillMedia(box);
    renderTools();
  }

  /* ---------- 대화 상단 도구 ---------- */
  function stayState(){
    let inAt=null;
    for(const m of messages){if(m.kind==='checkin')inAt=m.created_at;if(m.kind==='checkout')inAt=null;}
    return inAt;
  }
  function renderTools(){
    const el=document.querySelector('#thread-tools');if(!el)return;
    const c=active();if(!c)return;
    const plan=c.care_plan;
    if(isFacility){
      const inAt=stayState();
      const due=Checklist.nextDue(messages,plan);
      let dueText='';
      if(inAt&&plan){
        const late=due&&due<=new Date();
        dueText=`<span class="due ${late?'late':''}">${late?'체크리스트를 보낼 시간이에요':`다음 체크리스트 ${esc(hm(due))}`}</span>`;
      }else if(inAt)dueText='<span class="due">보호자가 체크리스트를 아직 정하지 않았어요</span>';
      el.innerHTML=`${inAt?`<button type="button" class="tool" data-tool="checkout">${icon('clock')}퇴실</button>`:`<button type="button" class="tool" data-tool="checkin">${icon('check')}입실</button>`}<button type="button" class="tool" data-tool="checklist" ${plan?'':'disabled'}>${icon('list')}체크리스트</button>${dueText}`;
    }else{
      el.innerHTML=`<button type="button" class="tool" data-tool="plan">${icon('list')}${plan?`체크리스트 ${plan.questions.length}개 · ${plan.interval_hours}시간마다`:'돌봄 체크리스트 정하기'}</button>${stayState()?'<span class="due">지금 맡겨진 중이에요</span>':''}`;
    }
  }
  function startDueTimer(){clearInterval(dueTimer);if(isFacility)dueTimer=setInterval(renderTools,30000);}

  function renderThread(){
    const shell=document.querySelector('#shell'),el=document.querySelector('#thread');if(!el)return;
    const c=active();
    shell.classList.toggle('thread-open',!!c);
    if(!c){el.innerHTML=`<div class="chat-empty wide"><p>${conversations.length?'대화를 골라 주세요.':''}</p></div>`;return;}
    el.innerHTML=`<header class="thread-head"><button type="button" class="icon-btn thread-back" id="thread-back" aria-label="목록으로">${icon('arrow-left')}</button><div><h2>${esc(titleOf(c))}</h2>${testIds.has(c.facility_id)?'<p>테스트용 가상 업체와의 대화예요.</p>':''}</div></header>
      <div class="thread-tools" id="thread-tools"></div>
      <div class="messages" id="messages"></div>
      <form class="compose" id="compose"><label class="icon-btn attach" title="사진·영상 보내기">${icon('camera')}<span class="sr-only">사진·영상 보내기</span><input type="file" id="attach" accept="image/*,video/mp4,video/quicktime,video/webm" hidden></label><label class="sr-only" for="compose-body">메시지</label><textarea id="compose-body" name="body" rows="1" maxlength="2000" required placeholder="메시지를 입력해 주세요"></textarea><button class="btn btn-primary" type="submit">보내기</button></form>`;
    renderMessages();
    document.querySelector('#thread-back').onclick=()=>{activeId=null;setUrl(null);closeThreadChannel();renderList();renderThread();};
    const form=document.querySelector('#compose'),ta=document.querySelector('#compose-body');
    ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&matchMedia('(pointer:fine)').matches){e.preventDefault();form.requestSubmit();}});
    form.addEventListener('submit',send);
    document.querySelector('#attach').addEventListener('change',sendFile);
    document.querySelector('#messages').addEventListener('scroll',e=>{const b=e.target;b.dataset.stick=b.scrollHeight-b.scrollTop-b.clientHeight<60?'1':'0';});
  }

  async function insertMessage(row){
    const {data,error}=await chat.client.from(TABLE).insert({conversation_id:activeId,sender_role:role,...row}).select(COLS).single();
    if(error)throw error;
    addMessage(data);
    const c=active();
    if(c){c.last_message=row.body.slice(0,80);c.last_message_at=data.created_at;conversations.sort((a,b)=>b.last_message_at.localeCompare(a.last_message_at));renderList();}
    return data;
  }
  async function send(e){
    e.preventDefault();
    const form=e.target,ta=form.querySelector('textarea'),btn=form.querySelector('button[type=submit]'),body=ta.value.trim();
    if(!body)return;
    btn.disabled=true;
    try{await insertMessage({kind:'text',body});ta.value='';ta.focus();}
    catch{toast('보내지 못했어요. 내용은 그대로 두었으니 다시 시도해 주세요.');}
    finally{btn.disabled=false;}
  }
  async function sendFile(e){
    const file=e.target.files[0];e.target.value='';if(!file)return;
    const label=document.querySelector('.attach');label.classList.add('busy');
    toast(file.type.startsWith('video/')?'영상을 올리는 중이에요.':'사진을 올리는 중이에요.');
    try{
      const up=await Media.upload(chat.client,file,{conversationId:activeId});
      media.set(up.id,{id:up.id,path:up.path,kind:up.kind,caption:''});
      await insertMessage({kind:'media',body:up.kind==='video'?'영상을 보냈어요':'사진을 보냈어요',payload:{media_id:up.id}});
    }catch(err){toast(Media.errorText(err));}
    finally{label.classList.remove('busy');}
  }

  /* ---------- 보호자: 체크리스트 정하기 ---------- */
  async function openPlan(){
    const c=active();if(!c)return;
    const current=c.care_plan;
    let pet={};
    try{const r=await chat.loadPetProfile(FP.load().pet);pet=r.pet||FP.load().pet||{};}catch{pet=FP.load().pet||{};}
    const render=(qs,by,hours)=>openSheet('돌봄 체크리스트',`
      <p class="muted">맡기는 동안 업체가 정해진 시간마다 답해 줄 질문이에요. 답은 대화와 산책 일기에 함께 남아요.</p>
      <p class="plan-by">${by==='ai'?'AI가 아이 프로필을 보고 골랐어요':by==='rule'?'아이 프로필을 기준으로 골랐어요':'지금 쓰고 있는 체크리스트예요'} · 필요 없는 질문은 빼 주세요.</p>
      <ul class="plan-qs">${qs.map((q,i)=>`<li><label><input type="checkbox" name="q" value="${i}" checked><span>${esc(q.q)}</span></label></li>`).join('')}</ul>
      <label class="field-l">몇 시간마다 받을까요?<select name="hours">${Checklist.INTERVALS.map(h=>`<option value="${h}" ${h===hours?'selected':''}>${h}시간마다</option>`).join('')}</select></label>
      <p class="muted small">체크리스트는 건강 상태를 판단하지 않아요. 걱정되는 답이 있으면 업체나 병원에 바로 물어봐 주세요.</p>
      <button type="button" class="btn-ghost" id="plan-regen">${icon('refresh')}프로필로 다시 고르기</button>`,
      `${current?'<button type="button" class="btn-ghost danger" id="plan-off">체크리스트 끄기</button>':''}<button type="submit" form="cmodal-form" class="btn btn-primary">${icon('check')}저장하기</button>`,
      async fd=>{
        const keep=fd.getAll('q').map(Number).map(i=>qs[i]);
        if(!keep.length){toast('질문을 하나 이상 골라 주세요.');return;}
        const plan={interval_hours:Number(fd.get('hours')),questions:keep,by,updated_at:new Date().toISOString()};
        const {error}=await chat.client.rpc('set_care_plan',{p_conversation:c.id,p_plan:plan});
        if(error){toast('저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.');return;}
        c.care_plan=plan;sheet.close();renderTools();toast('체크리스트를 저장했어요. 업체에도 바로 보여요.');
      });
    const wire=()=>{
      const regen=document.querySelector('#plan-regen');
      if(regen)regen.onclick=async()=>{regen.disabled=true;regen.lastChild.textContent='고르는 중…';const r=await Checklist.suggestAI(pet,chat.client);render(r.questions,r.by,Number(sheet.querySelector('[name=hours]').value)||3);wire();};
      const off=document.querySelector('#plan-off');
      if(off)off.onclick=async()=>{const {error}=await chat.client.rpc('set_care_plan',{p_conversation:c.id,p_plan:null});if(error){toast('끄지 못했어요.');return;}c.care_plan=null;sheet.close();renderTools();toast('체크리스트를 껐어요.');};
    };
    if(current){render(current.questions,'saved',current.interval_hours);wire();return;}
    openSheet('돌봄 체크리스트','<p class="muted">아이 프로필을 보고 질문을 고르는 중이에요.</p>','',null);
    const r=await Checklist.suggestAI(pet,chat.client);
    render(r.questions,r.by,3);wire();
  }

  /* ---------- 업체: 입실·퇴실·체크리스트 ---------- */
  function openStay(kind){
    const c=active();if(!c)return;
    openSheet(kind==='checkin'?'입실 기록':'퇴실 기록',`<p class="muted">${esc(c.pet_name)} 보호자에게 ${kind==='checkin'?'입실':'퇴실'} 소식이 전해지고, 보호자가 허용했다면 산책 일기에 자동으로 기록돼요.</p><label class="field-l">전할 말 <small>(선택)</small><textarea name="note" rows="3" maxlength="300" placeholder="${kind==='checkin'?'예: 처음엔 낯설어했는데 지금은 간식 먹고 쉬고 있어요.':'예: 오늘 친구들과 잘 놀았어요. 저녁 사료까지 먹었어요.'}"></textarea></label>`,
      `<button type="submit" form="cmodal-form" class="btn btn-primary">${icon('check')}${kind==='checkin'?'입실':'퇴실'} 알리기</button>`,
      async (fd,f)=>{
        const btn=sheet.querySelector('.sheet-foot .btn-primary');btn.disabled=true;
        const note=String(fd.get('note')||'').trim();
        try{await insertMessage({kind,body:kind==='checkin'?'입실했어요':'퇴실했어요',payload:note?{note}:{}});sheet.close();}
        catch{toast('보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.');btn.disabled=false;}
      });
  }
  function answerField(q,i){
    const name=`a${i}`;
    if(q.type==='choice')return `<fieldset class="cl-q"><legend>${esc(q.q)}</legend><div class="chips">${(q.options||[]).map(o=>`<label class="chip"><input type="radio" name="${name}" value="${esc(o)}">${esc(o)}</label>`).join('')}</div></fieldset>`;
    if(q.type==='minutes')return `<label class="field-l cl-q">${esc(q.q)}<span class="unit"><input type="number" name="${name}" min="0" max="600" inputmode="numeric" placeholder="0">분</span></label>`;
    return `<label class="field-l cl-q">${esc(q.q)}<input name="${name}" maxlength="200"></label>`;
  }
  function openChecklist(){
    const c=active();if(!c||!c.care_plan)return;
    const qs=c.care_plan.questions;
    openSheet('돌봄 체크리스트',`<p class="muted">${esc(c.pet_name)} 보호자가 정한 질문이에요. 답한 것만 전해져요.</p>${qs.map(answerField).join('')}`,
      `<button type="submit" form="cmodal-form" class="btn btn-primary">${icon('check')}보호자에게 보내기</button>`,
      async fd=>{
        const answers=qs.map((q,i)=>({id:q.id,q:q.q,a:String(fd.get('a'+i)||'').trim()})).filter(a=>a.a);
        if(!answers.length){toast('하나 이상 답해 주세요.');return;}
        const btn=sheet.querySelector('.sheet-foot .btn-primary');btn.disabled=true;
        const note=(answers.find(a=>a.id==='note')||{}).a||'';
        try{
          await insertMessage({kind:'checklist',body:'돌봄 체크리스트를 보냈어요',payload:{answers,activity:Checklist.activityFrom(answers),...(note?{note}:{})}});
          sheet.close();toast('체크리스트를 보냈어요.');
        }catch{toast('보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.');btn.disabled=false;}
      });
  }

  function addMessage(m){
    if(messages.some(x=>x.id===m.id))return;
    messages.push(m);
    if(m.kind==='media'&&!media.has(m.payload&&m.payload.media_id)){loadMedia().then(renderMessages);return;}
    renderMessages();
  }
  function closeThreadChannel(){if(threadChannel){chat.client.removeChannel(threadChannel);threadChannel=null;}clearInterval(dueTimer);}
  async function loadMedia(){
    const {data,error}=await chat.client.from('media').select('id,path,kind,caption').eq('conversation_id',activeId).limit(500);
    if(!error)data.forEach(d=>media.set(d.id,d));
  }
  async function loadMessages(){
    const id=activeId;
    const [{data,error}]=await Promise.all([
      chat.client.from(TABLE).select(COLS).eq('conversation_id',id).order('created_at',{ascending:true}).limit(500),
      loadMedia()
    ]);
    if(id!==activeId)return;
    if(error){toast('메시지를 불러오지 못했어요.');return;}
    messages=data;renderMessages();
  }
  async function openConversation(id){
    activeId=id;setUrl(id);messages=[];media=new Map();closeThreadChannel();
    renderList();renderThread();
    if(!conversations.some(c=>c.id===id)){activeId=null;setUrl(null);renderThread();return;}
    await loadMessages();
    startDueTimer();
    threadChannel=chat.client.channel('inquiry:'+id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:TABLE,filter:'conversation_id=eq.'+id},p=>addMessage(p.new))
      .subscribe();
  }
  async function refresh(){
    try{await loadConversations();renderList();if(activeId){await loadMessages();}}catch{}
  }

  async function sendPending(){
    const pending=chat.takePending();if(!pending||isFacility)return null;
    try{const id=await chat.sendInquiry(pending);toast('문의를 보냈어요.');return id;}
    catch{chat.savePending(pending);toast('문의를 보내지 못했어요. 산책 지도에서 다시 보내 주세요.');return null;}
  }

  async function boot(){
    closeChannels();
    panel('<p class="muted">불러오는 중이에요.</p>');
    try{
      user=await chat.currentUser();
      if(!user){renderLogin();return;}
      if(location.hash)setUrl(activeId);
      await loadFacilities();
      if(isFacility){
        const {data,error}=await chat.client.from('facility_staff').select('facility_id').eq('user_id',user.id);
        if(error)throw error;
        staffIds=data.map(s=>s.facility_id);
        if(!staffIds.length){renderInvite();return;}
      }
      const sentId=await sendPending();
      if(sentId)activeId=sentId;
      await loadConversations();
      if(activeId&&!conversations.some(c=>c.id===activeId)){activeId=null;setUrl(null);}
      renderShell();
      if(activeId)await openConversation(activeId);
      listChannel=chat.client.channel('conversations:'+user.id)
        .on('postgres_changes',{event:'*',schema:'public',table:'conversations'},()=>loadConversations().then(()=>{renderList();renderTools();}).catch(()=>{}))
        .subscribe();
    }catch{
      panel('<h1>문의함을 열지 못했어요</h1><p>잠시 뒤에 다시 시도해 주세요.</p><button type="button" class="btn btn-soft" id="retry">다시 시도</button>');
      document.querySelector('#retry').onclick=boot;
    }
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-conv]');if(b){openConversation(b.dataset.conv);return;}
    const t=e.target.closest('[data-tool]');if(!t)return;
    const k=t.dataset.tool;
    if(k==='plan')openPlan();
    if(k==='checkin'||k==='checkout')openStay(k);
    if(k==='checklist')openChecklist();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user&&document.querySelector('#shell'))refresh();});

  if(!chat){panel('<h1>문의함을 열지 못했어요</h1><p>연결에 문제가 있어요. 새로고침해 주세요.</p>');return;}
  chat.client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_IN'&&session&&(!user||user.id!==session.user.id))setTimeout(boot,0);
  });
  boot();
})();
