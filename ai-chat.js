(function(){
  const STORAGE_KEY='farewell-pet-ai-chat-v2';
  const LEGACY_STORAGE_KEY='farewell-pet-ai-chat-v1';
  const CHAT_TTL=24*60*60*1000;
  const MAX_HISTORY=12;
  const WELCOME='안녕하세요! 반려동물 돌봄이나 farewell pet 이용에 대해 궁금한 점을 편하게 물어보세요. 메세지는 24시간 이후 자동 삭제됩니다.';
  const host=document.createElement('div');
  host.className='ai-chat';
  host.innerHTML=`
    <button class="ai-chat-toggle" type="button" aria-label="AI 상담 열기" aria-expanded="false" aria-controls="ai-chat-panel">
      <svg class="i" aria-hidden="true"><use href="#i-chat"/></svg><span>AI 상담</span>
    </button>
    <section class="ai-chat-panel" id="ai-chat-panel" role="dialog" aria-labelledby="ai-chat-title" hidden>
      <header class="ai-chat-head">
        <div><h2 id="ai-chat-title">무엇이든 물어보세요</h2><p>farewell pet AI 상담</p></div>
        <div class="ai-chat-actions">
          <button class="ai-chat-clear" type="button">대화 지우기</button>
          <button class="ai-chat-close" type="button" aria-label="AI 상담 닫기">×</button>
        </div>
      </header>
      <div class="ai-chat-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <p class="ai-chat-note">일반 정보 안내용 AI예요. 진단·응급 상황은 동물병원에 문의해 주세요. 질문은 Google Gemini에 전송돼요. 무료 등급은 대화가 Google 제품 개선에 사용될 수 있으니 민감한 정보를 입력하지 마세요. 대화는 마지막 메시지 후 24시간이 지나면 자동 삭제돼요.</p>
      <p class="ai-chat-status" role="status" aria-live="polite"></p>
      <form class="ai-chat-compose">
        <label class="sr-only" for="ai-chat-input">메시지</label>
        <textarea id="ai-chat-input" rows="1" maxlength="2000" placeholder="궁금한 점을 입력해 주세요" required></textarea>
        <button class="ai-chat-send" type="submit">보내기</button>
      </form>
    </section>`;
  document.body.append(host);

  const toggle=host.querySelector('.ai-chat-toggle');
  const panel=host.querySelector('.ai-chat-panel');
  const close=host.querySelector('.ai-chat-close');
  const clear=host.querySelector('.ai-chat-clear');
  const messages=host.querySelector('.ai-chat-messages');
  const status=host.querySelector('.ai-chat-status');
  const form=host.querySelector('.ai-chat-compose');
  const input=host.querySelector('#ai-chat-input');
  const send=host.querySelector('.ai-chat-send');
  let history=loadHistory();
  let busy=false;
  let expiryTimer;

  function loadHistory(){
    try{
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(!saved||!Number.isFinite(saved.updatedAt)||saved.updatedAt>Date.now()||Date.now()-saved.updatedAt>=CHAT_TTL){
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }
      if(!Array.isArray(saved.messages)){
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }
      scheduleExpiration(saved.updatedAt);
      return saved.messages.filter(message=>message&&
        (message.role==='user'||message.role==='assistant')&&
        typeof message.content==='string').slice(-MAX_HISTORY);
    }catch{return [];}
  }
  function saveHistory(){
    try{
      const updatedAt=Date.now();
      localStorage.setItem(STORAGE_KEY,JSON.stringify({updatedAt,messages:history}));
      scheduleExpiration(updatedAt);
    }catch{}
  }
  function scheduleExpiration(updatedAt){
    clearTimeout(expiryTimer);
    expiryTimer=setTimeout(()=>{
      try{
        const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
        if(saved&&saved.updatedAt===updatedAt){
          localStorage.removeItem(STORAGE_KEY);
          history=[];
          renderHistory();
        }
      }catch{}
    },Math.max(0,updatedAt+CHAT_TTL-Date.now()));
  }
  function addMessage(role,text){
    const item=document.createElement('div');
    item.className='ai-chat-message '+(role==='user'?'user':'assistant');
    const body=document.createElement('p');
    body.textContent=text;
    item.append(body);
    messages.append(item);
    messages.scrollTop=messages.scrollHeight;
    return item;
  }
  function renderHistory(){
    messages.replaceChildren();
    addMessage('assistant',WELCOME);
    history.forEach(message=>addMessage(message.role,message.content));
  }
  function setOpen(open){
    panel.hidden=!open;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'AI 상담 닫기':'AI 상담 열기');
    if(open)input.focus();
    else toggle.focus();
  }
  function setBusy(value){
    busy=value;
    input.disabled=value;
    send.disabled=value;
    clear.disabled=value;
    send.textContent=value?'답변 중…':'보내기';
  }

  renderHistory();
  toggle.addEventListener('click',()=>setOpen(panel.hidden));
  close.addEventListener('click',()=>setOpen(false));
  clear.addEventListener('click',()=>{
    if(busy)return;
    history=[];
    saveHistory();
    status.textContent='';
    renderHistory();
    input.focus();
  });
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey){
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const content=input.value.trim();
    if(!content||busy)return;

    input.value='';
    status.textContent='';
    addMessage('user',content);
    const typing=addMessage('assistant','답변을 준비하고 있어요…');
    const nextHistory=[...history,{role:'user',content}].slice(-MAX_HISTORY);
    setBusy(true);
    try{
      const endpoint=new URL('./api/chat',location.href);
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:nextHistory})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'AI 답변을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      if(typeof data.reply!=='string'||!data.reply.trim())throw new Error('AI 답변을 받지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      typing.querySelector('p').textContent=data.reply;
      history=[...nextHistory,{role:'assistant',content:data.reply}].slice(-MAX_HISTORY);
      saveHistory();
    }catch(error){
      typing.remove();
      status.textContent=error.message==='Failed to fetch'
        ?'AI 상담 서버에 연결할 수 없어요. 서버 설정을 확인해 주세요.'
        :error.message;
    }finally{
      setBusy(false);
      if(!panel.hidden)input.focus();
      messages.scrollTop=messages.scrollHeight;
    }
  });
})();
