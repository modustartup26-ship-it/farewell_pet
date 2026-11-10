/* 문의함: 보호자(inbox.html)와 업체(partner.html)가 같은 코드를 쓴다. body의 data-role로 구분한다. */
(function(){
  const {esc,icon,toast}=FP;
  const role=document.body.dataset.role;
  const isFacility=role==='facility';
  const app=document.querySelector('#chat-app');
  const chat=window.FPChat;
  const page=isFacility?'partner.html':'inbox.html';
  let user=null,conversations=[],facilityNames=new Map(),testIds=new Set(),staffIds=[];
  let activeId=new URLSearchParams(location.search).get('c'),messages=[],threadChannel=null,listChannel=null;

  function when(iso){
    const d=new Date(iso),now=new Date();
    const time=d.toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'});
    return d.toDateString()===now.toDateString()?time:`${d.getMonth()+1}월 ${d.getDate()}일 ${time}`;
  }
  function panel(html){app.innerHTML=`<section class="chat-gate">${html}</section>`;}
  function setUrl(id){const u=new URL(location.href);if(id)u.searchParams.set('c',id);else u.searchParams.delete('c');u.hash='';history.replaceState(null,'',u);}
  function linkError(){return /error_code=|error=/.test(location.hash)?'로그인 링크가 만료됐거나 이미 사용됐어요. 새 링크를 받아 주세요.':'';}

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
    if(threadChannel){chat.client.removeChannel(threadChannel);threadChannel=null;}
    if(listChannel){chat.client.removeChannel(listChannel);listChannel=null;}
  }

  async function loadFacilities(){
    const {data,error}=await chat.client.from('facilities').select('id,name,is_test');
    if(error)throw error;
    facilityNames=new Map(data.map(f=>[f.id,f.name]));testIds=new Set(data.filter(f=>f.is_test).map(f=>f.id));
  }
  async function loadConversations(){
    let q=chat.client.from('conversations').select('id,facility_id,pet_name,last_message,last_message_at').order('last_message_at',{ascending:false}).limit(100);
    q=isFacility?q.in('facility_id',staffIds):q.eq('guardian_id',user.id);
    const {data,error}=await q;
    if(error)throw error;
    conversations=data;
  }
  const titleOf=c=>isFacility?`${c.pet_name} 보호자`:(facilityNames.get(c.facility_id)||'업체');

  function renderShell(){
    const who=isFacility?staffIds.map(id=>facilityNames.get(id)).filter(Boolean).join(', '):'내 문의함';
    app.innerHTML=`<div class="chat-shell" id="shell">
      <aside class="chat-list"><div class="chat-list-head"><div><h1>${isFacility?'업체 문의함':'내 문의함'}</h1>${isFacility?`<p>${esc(who)}</p>`:''}</div><button type="button" class="btn-ghost chat-out" id="logout">로그아웃</button></div><div id="conv-list"></div></aside>
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
  function bubbles(){
    if(!messages.length)return '<p class="chat-hint">아직 주고받은 메시지가 없어요.</p>';
    return messages.map(m=>`<div class="msg ${m.sender_role===role?'mine':'theirs'}"><p>${esc(m.body)}</p><time>${esc(when(m.created_at))}</time></div>`).join('');
  }
  function renderMessages(){
    const box=document.querySelector('#messages');if(!box)return;
    box.innerHTML=bubbles();box.scrollTop=box.scrollHeight;
  }
  function renderThread(){
    const shell=document.querySelector('#shell'),el=document.querySelector('#thread');if(!el)return;
    const c=conversations.find(x=>x.id===activeId);
    shell.classList.toggle('thread-open',!!c);
    if(!c){el.innerHTML=`<div class="chat-empty wide"><p>${conversations.length?'대화를 골라 주세요.':''}</p></div>`;return;}
    el.innerHTML=`<header class="thread-head"><button type="button" class="icon-btn thread-back" id="thread-back" aria-label="목록으로">${icon('arrow-left')}</button><div><h2>${esc(titleOf(c))}</h2>${testIds.has(c.facility_id)?'<p>테스트용 가상 업체와의 대화예요.</p>':''}</div></header>
      <div class="messages" id="messages"></div>
      <form class="compose" id="compose"><label class="sr-only" for="compose-body">메시지</label><textarea id="compose-body" name="body" rows="1" maxlength="2000" required placeholder="메시지를 입력해 주세요"></textarea><button class="btn btn-primary" type="submit">보내기</button></form>`;
    renderMessages();
    document.querySelector('#thread-back').onclick=()=>{activeId=null;setUrl(null);closeThreadChannel();renderList();renderThread();};
    const form=document.querySelector('#compose'),ta=document.querySelector('#compose-body');
    ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&matchMedia('(pointer:fine)').matches){e.preventDefault();form.requestSubmit();}});
    form.addEventListener('submit',send);
  }
  async function send(e){
    e.preventDefault();
    const form=e.target,ta=form.querySelector('textarea'),btn=form.querySelector('button'),body=ta.value.trim();
    if(!body)return;
    btn.disabled=true;
    const {data,error}=await chat.client.from('messages').insert({conversation_id:activeId,sender_role:role,body}).select('id,sender_role,body,created_at').single();
    btn.disabled=false;
    if(error){toast('보내지 못했어요. 내용은 그대로 두었으니 다시 시도해 주세요.');return;}
    ta.value='';ta.focus();addMessage(data);
    const c=conversations.find(x=>x.id===activeId);
    if(c){c.last_message=body.slice(0,80);c.last_message_at=data.created_at;conversations.sort((a,b)=>b.last_message_at.localeCompare(a.last_message_at));renderList();}
  }
  function addMessage(m){if(messages.some(x=>x.id===m.id))return;messages.push(m);renderMessages();}
  function closeThreadChannel(){if(threadChannel){chat.client.removeChannel(threadChannel);threadChannel=null;}}
  async function loadMessages(){
    const id=activeId;
    const {data,error}=await chat.client.from('messages').select('id,sender_role,body,created_at').eq('conversation_id',id).order('created_at',{ascending:true}).limit(500);
    if(id!==activeId)return;
    if(error){toast('메시지를 불러오지 못했어요.');return;}
    messages=data;renderMessages();
  }
  async function openConversation(id){
    activeId=id;setUrl(id);messages=[];closeThreadChannel();
    renderList();renderThread();
    if(!conversations.some(c=>c.id===id)){activeId=null;setUrl(null);renderThread();return;}
    await loadMessages();
    threadChannel=chat.client.channel('messages:'+id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+id},p=>addMessage(p.new))
      .subscribe();
  }
  async function refresh(){
    try{await loadConversations();renderList();if(activeId)await loadMessages();}catch{}
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
        .on('postgres_changes',{event:'*',schema:'public',table:'conversations'},()=>loadConversations().then(renderList).catch(()=>{}))
        .subscribe();
    }catch{
      panel('<h1>문의함을 열지 못했어요</h1><p>잠시 뒤에 다시 시도해 주세요.</p><button type="button" class="btn btn-soft" id="retry">다시 시도</button>');
      document.querySelector('#retry').onclick=boot;
    }
  }

  document.addEventListener('click',e=>{const b=e.target.closest('[data-conv]');if(b)openConversation(b.dataset.conv);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user&&document.querySelector('#shell'))refresh();});

  if(!chat){panel('<h1>문의함을 열지 못했어요</h1><p>연결에 문제가 있어요. 새로고침해 주세요.</p>');return;}
  chat.client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_IN'&&session&&(!user||user.id!==session.user.id))setTimeout(boot,0);
  });
  boot();
})();
