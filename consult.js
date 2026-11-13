(function(){
  const app=document.querySelector('#consult-app');
  const chat=window.FPChat;
  const {esc,toast,call}=window.FP;
  const params=new URLSearchParams(location.search);
  const requestedVet=params.get('vet');
  let user=null,vetProfile=null,application=null,petProfile={},clientTab='vets';
  let selectedConversation=null,conversationChannel=null,inboxChannel=null,currentConversation=null;
  const renderedMessages=new Set();

  const resultError=(error,fallback)=>{
    console.error(fallback,error);
    return error&&error.message?error.message:fallback;
  };
  const renderError=message=>{
    app.innerHTML=`<div class="consult-error" role="alert">${esc(message)}</div>`;
  };
  const minutes=value=>Number(value)===0?'대기 없음':`예상 대기 ${Number(value)}분`;
  /* 상담 활동 등급: 답변 수·답변 속도·응답률·보호자 평가로 자동 계산 (돈으로 바꿀 수 없음, 진료 실력 평가 아님) */
  const TIERS={
    new:{label:'새로 합류',rank:0,icon:'🌱'},bronze:{label:'브론즈',rank:1,icon:'🥉'},silver:{label:'실버',rank:2,icon:'🥈'},gold:{label:'골드',rank:3,icon:'🥇'},diamond:{label:'다이아',rank:4,icon:'💎'}
  };
  const TIER_RULES=[
    ['bronze','답변한 상담 3건 이상'],
    ['silver','답변 10건 이상 · 24시간 안 응답률 70% 이상 · 보통 6시간 안에 답변'],
    ['gold','답변 30건 이상 · 응답률 85% 이상 · 보통 2시간 안에 답변 · “도움이 됐어요” 80% 이상'],
    ['diamond','답변 100건 이상 · 응답률 95% 이상 · 보통 1시간 안에 답변 · 평가 20개 이상 중 “도움이 됐어요” 90% 이상 · 최근 30일 답변 5건 이상']
  ];
  const span=m=>m<60?`${Math.max(1,Math.round(m))}분`:m<1440?`${Math.round(m/60)}시간`:`${Math.round(m/1440)}일`;
  const pct=v=>`${Math.round(Number(v)*100)}%`;
  function tierBadge(stat){
    const t=TIERS[stat&&stat.tier]||TIERS.new;
    return `<span class="tier tier-${esc(stat&&stat.tier||'new')}" title="상담 활동 등급"><span aria-hidden="true">${t.icon}</span>${esc(t.label)}</span>`;
  }
  function statFacts(stat){
    if(!stat||stat.tier==='new')return '';
    const facts=[];
    if(stat.median_reply_minutes!=null)facts.push(`보통 ${span(Number(stat.median_reply_minutes))} 안에 답해요`);
    if(stat.reply_rate!=null)facts.push(`24시간 안 응답률 ${pct(stat.reply_rate)}`);
    if(stat.feedback_count>=5&&stat.helpful_rate!=null)facts.push(`도움이 됐어요 ${pct(stat.helpful_rate)}`);
    facts.push(`답변한 상담 ${stat.answered}건`);
    return `<ul class="vet-facts">${facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`;
  }
  function tierGuide(){
    return `<details class="tier-guide"><summary>등급은 어떻게 정해지나요?</summary>
      <p>수의사 목록은 <b>답변이 활발한 순</b>으로 보여 드려요. 등급은 상담 기록(답변 수, 첫 답변까지 걸린 시간, 24시간 안 응답률, 보호자 평가)으로 자동으로 정해져요. 진료 실력이나 치료 결과를 평가하는 등급이 아니며, 돈을 내고 올리거나 바꿀 수 없어요.</p>
      <ul>${TIER_RULES.map(([k,t])=>`<li>${tierBadge({tier:k})}<span>${esc(t)}</span></li>`).join('')}</ul>
      <p class="muted">답변한 상담이 3건 미만인 수의사는 ‘새로 합류한 수의사’에 따로 보여 드려요.</p></details>`;
  }
  async function loadActivity(vetId){
    const {data,error}=await chat.client.rpc('vet_activity',vetId?{p_vet:vetId}:{});
    if(error){console.error('Unable to load vet activity.',error);return new Map();}
    return new Map((data||[]).map(s=>[s.user_id,s]));
  }
  const timeLabel=value=>{
    const time=new Date(value);
    return Number.isNaN(time.getTime())?'':time.toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  };
  const statusTarget=()=>app.querySelector('#consult-feedback');
  function feedback(message,error){
    const target=statusTarget();
    if(!target){if(message)toast(message);return;}
    target.textContent=message;
    target.classList.toggle('error',!!error);
  }
  function accountActions(){
    return user?`<div class="consult-account"><span>${esc(user.email||'로그인됨')}</span><button type="button" class="consult-btn ghost" data-action="sign-out">로그아웃</button></div>`
      :`<div class="consult-account"><span>로그인 후 상담을 이용할 수 있어요</span></div>`;
  }
  function header(title,subtitle){
    return `<div class="consult-heading"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${accountActions()}</div>`;
  }
  function renderLogin(){
    app.innerHTML='<p class="consult-loading">로그인하면 상담을 시작할 수 있어요.</p>';
    window.FPAuth.open({onSuccess:initialize});
  }
  function applicationFields(data){
    const item=data||{};
    const specialties=Array.isArray(item.specialties)?item.specialties.join(', '):'';
    return `<label class="consult-field">이름 / 표시 이름<input name="display_name" maxlength="40" required value="${esc(item.display_name||'')}" placeholder="예: 김수의"></label>
      <label class="consult-field">동물병원 이름<input name="clinic_name" maxlength="80" required value="${esc(item.clinic_name||'')}" placeholder="예: 다정한 동물병원"></label>
      <label class="consult-field wide">진료 분야<input name="specialties" maxlength="240" required value="${esc(specialties)}" placeholder="쉼표로 구분해 주세요 (예: 내과, 피부과)"></label>
      <label class="consult-field wide">강점<input name="strengths" maxlength="300" required value="${esc(item.strengths||'')}" placeholder="어떤 상담을 특히 잘 도와주시는지 적어 주세요"></label>
      <label class="consult-field wide">간단한 소개<textarea name="bio" maxlength="500" required placeholder="보호자에게 전하고 싶은 소개">${esc(item.bio||'')}</textarea></label>
      <label class="consult-field">수의사 면허 번호<input name="license_number" maxlength="40" required value="${esc(item.license_number||'')}" autocomplete="off"></label>`;
  }
  function renderApplication(){
    if(application&&application.status==='rejected'){
      app.innerHTML=`${header('수의사 상담 신청','수의사 전용 계정')}
        <section class="consult-pending"><span class="status">승인되지 않음</span><h2>신청 내용을 확인해 주세요</h2><p>수의사 면허 확인 또는 프로필 정보에 문제가 있어 승인이 완료되지 않았어요. 운영자에게 문의해 주세요.</p><button class="consult-btn ghost" data-action="sign-out" type="button">로그아웃</button></section>`;
      return;
    }
    const pending=application&&application.status==='pending';
    app.innerHTML=`${header(pending?'수의사 등록 심사 중':'수의사 상담 신청','이메일 인증 후 신청 내용을 제출하면 운영자 승인 뒤 상담을 시작할 수 있어요.')}
      <section class="consult-pending">
        ${pending?'<span class="status">승인 대기 중</span><h2>신청 내용을 수정할 수 있어요</h2><p>면허를 확인한 뒤 운영자가 프로필을 공개하고 상담을 활성화해 드려요.</p>':''}
        <form class="consult-form-card" id="application-form">
          ${pending?'':'<h2>수의사 정보</h2><p>수의사 면허 번호는 공개 프로필에 표시되지 않으며 승인 확인에만 사용됩니다.</p>'}
          <div class="consult-form">${applicationFields(application)}
            <div class="consult-form-actions"><button class="consult-btn" type="submit">${pending?'신청 내용 저장':'심사 신청'}</button><p class="consult-small-error" id="application-feedback" role="alert"></p></div>
          </div>
        </form>
      </section>`;
  }
  function vetCard(vet,stat){
    const available=vet.accepting_consultations;
    const specialties=(vet.specialties||[]).map(item=>`<span class="vet-tag">${esc(item)}</span>`).join('');
    return `<article class="vet-card">
      <div class="vet-card-top"><div><h3>${esc(vet.display_name)} ${tierBadge(stat)}</h3><p class="clinic">${esc(vet.clinic_name)}</p></div><span class="vet-state ${available?'':'off'}">${available?'상담 가능':'상담 준비 중'}</span></div>
      ${statFacts(stat)}
      <div class="vet-tags">${specialties}</div>
      <p class="vet-strength"><b>강점</b> · ${esc(vet.strengths)}</p>
      <p class="vet-strength">${esc(vet.bio)}</p>
      <p class="vet-wait">${esc(minutes(vet.estimated_wait_minutes))}</p>
      <button class="consult-btn ${available?'':'ghost'}" type="button" data-action="start" data-vet="${esc(vet.user_id)}" ${available?'':'disabled'}>${available?'1:1 상담 시작':'현재 상담을 받고 있지 않아요'}</button>
    </article>`;
  }
  async function getClientConversations(){
    const {data,error}=await chat.client.from('vet_consultations')
      .select('id,veterinarian_id,pet_name,last_message,last_message_at')
      .eq('guardian_id',user.id).order('last_message_at',{ascending:false}).limit(100);
    if(error)throw error;
    return data||[];
  }
  async function getVetsByIds(ids){
    if(!ids.length)return new Map();
    const {data,error}=await chat.client.from('veterinarian_profiles')
      .select('user_id,display_name,clinic_name,accepting_consultations')
      .in('user_id',ids);
    if(error)throw error;
    return new Map((data||[]).map(vet=>[vet.user_id,vet]));
  }
  async function renderClient(){
    let listMarkup='';
    if(clientTab==='vets'){
      const {data,error}=await chat.client.from('veterinarian_profiles')
        .select('user_id,display_name,clinic_name,specialties,strengths,bio,estimated_wait_minutes,accepting_consultations')
        .eq('is_listed',true).order('display_name').limit(100);
      if(error)throw error;
      const vets=data||[];
      const stats=await loadActivity();
      const statOf=v=>stats.get(v.user_id)||{tier:'new',score:0};
      const order=(a,b)=>(b.accepting_consultations-a.accepting_consultations)||(TIERS[statOf(b).tier].rank-TIERS[statOf(a).tier].rank)||(Number(statOf(b).score)-Number(statOf(a).score));
      const active=vets.filter(v=>statOf(v).tier!=='new').sort(order);
      const fresh=vets.filter(v=>statOf(v).tier==='new').sort(order);
      listMarkup=vets.length?`${tierGuide()}${active.map(v=>vetCard(v,statOf(v))).join('')}${fresh.length?`<h3 class="vet-section">새로 합류한 수의사</h3>${fresh.map(v=>vetCard(v,statOf(v))).join('')}`:''}`:'<p class="consult-empty">아직 등록된 수의사가 없어요. 나중에 다시 확인해 주세요.</p>';
    }else{
      if(!user){
        listMarkup='<p class="consult-empty">상담 내역을 보려면 로그인해 주세요.</p>';
      }else{
        const consultations=await getClientConversations();
        const vetMap=await getVetsByIds([...new Set(consultations.map(item=>item.veterinarian_id))]);
        listMarkup=consultations.length?consultations.map(item=>{
          const vet=vetMap.get(item.veterinarian_id);
          return `<button type="button" class="consult-row" data-action="open-client-chat" data-id="${esc(item.id)}" aria-current="${item.id===selectedConversation?'true':'false'}">
            <b>${esc(vet?vet.display_name:'수의사')} · ${esc(item.pet_name)}</b><time>${esc(timeLabel(item.last_message_at))}</time>
            <span>${esc(item.last_message||'대화를 시작해 보세요.')}</span>
          </button>`;
        }).join(''):'<p class="consult-empty">아직 상담 내역이 없어요. 수의사를 골라 상담을 시작해 보세요.</p>';
      }
    }
    app.innerHTML=`${header('수의사 1:1 상담','강점과 예상 대기 시간을 확인하고 원하는 수의사와 상담해 보세요.')}
      <div class="consult-tabs"><button type="button" data-action="client-tab" data-tab="vets" aria-pressed="${clientTab==='vets'}">수의사 찾기</button><button type="button" data-action="client-tab" data-tab="chats" aria-pressed="${clientTab==='chats'}">내 상담</button></div>
      <section class="consult-layout ${selectedConversation?'thread-open':''}">
        <aside class="consult-list"><div class="consult-list-head"><h2>${clientTab==='vets'?'상담 가능한 수의사':'내 상담 목록'}</h2><small>${user?'이메일 인증됨':'상담 시작 시 로그인 필요'}</small></div>${listMarkup}</aside>
        <section class="consult-thread" id="consult-thread"><div class="consult-thread-empty"><b>원하는 수의사를 선택해 주세요</b><p>상담 내용은 보호자와 담당 수의사만 볼 수 있어요.</p></div></section>
      </section>
      <p class="consult-notice">이 채팅은 일반 상담용이며 진단이나 응급 처치를 대신하지 않아요. 위급하면 가까운 동물병원에 바로 연락해 주세요.</p>`;
    if(selectedConversation)await openThread(selectedConversation,'client');
    if(user)subscribeInbox();
  }
  async function getVetConversations(){
    const {data,error}=await chat.client.from('vet_consultations')
      .select('id,guardian_id,veterinarian_id,pet_name,last_message,last_message_at')
      .eq('veterinarian_id',user.id).order('last_message_at',{ascending:false}).limit(100);
    if(error)throw error;
    return data||[];
  }
  async function renderVetDashboard(tab){
    const activeTab=tab||'chats';
    if(activeTab==='profile'){
      const {data,error}=await chat.client.from('veterinarian_profiles')
        .select('display_name,clinic_name,specialties,strengths,bio,estimated_wait_minutes,accepting_consultations')
        .eq('user_id',user.id).single();
      if(error)throw error;
      vetProfile=data;
      app.innerHTML=`${header('내 상담 공간','수의사 계정 · 승인 완료')}
        <div class="consult-tabs"><button type="button" data-action="vet-tab" data-tab="chats" aria-pressed="false">상담 목록</button><button type="button" data-action="vet-tab" data-tab="profile" aria-pressed="true">내 프로필</button></div>
        <section class="consult-profile-card"><h2>상담 프로필 관리</h2><p>상담자에게 공개되는 정보와 상담 가능 여부를 관리해요.</p>
          <form id="vet-profile-form" class="consult-form">
            ${applicationFields({...vetProfile,license_number:application&&application.license_number||''})}
            <label class="consult-check wide"><input type="checkbox" name="accepting_consultations" ${vetProfile.accepting_consultations?'checked':''}> 지금 상담 요청 받기</label>
            <div class="consult-form-actions"><button class="consult-btn" type="submit">프로필 저장</button><p class="consult-small-error" id="profile-feedback" role="alert"></p></div>
          </form>
        </section>`;
      return;
    }
    const conversations=await getVetConversations();
    const items=conversations.length?conversations.map(item=>`<button type="button" class="consult-row" data-action="open-vet-chat" data-id="${esc(item.id)}" aria-current="${item.id===selectedConversation?'true':'false'}">
      <b>${esc(call(item.pet_name))} 보호자</b><time>${esc(timeLabel(item.last_message_at))}</time><span>${esc(item.last_message||'새 상담 요청')}</span>
    </button>`).join(''):'<p class="consult-empty">아직 상담 요청이 없어요.</p>';
    const mine=(await loadActivity(user.id)).get(user.id)||{tier:'new',answered:0};
    app.innerHTML=`${header('내 상담 공간','수의사 계정 · 승인 완료')}
      <div class="consult-tabs"><button type="button" data-action="vet-tab" data-tab="chats" aria-pressed="true">상담 목록</button><button type="button" data-action="vet-tab" data-tab="profile" aria-pressed="false">내 프로필</button></div>
      <section class="consult-layout ${selectedConversation?'thread-open':''}">
        <aside class="consult-list">${myActivity(mine)}<div class="consult-list-head"><h2>고객 상담</h2><small>${conversations.length}개</small></div>${items}</aside>
        <section class="consult-thread" id="consult-thread"><div class="consult-thread-empty"><b>대화를 선택해 주세요</b><p>새 상담 요청이 오면 이 목록에 표시돼요.</p></div></section>
      </section>`;
    subscribeInbox();
    if(selectedConversation)await openThread(selectedConversation,'vet');
  }
  function myActivity(stat){
    const idx=TIER_RULES.findIndex(([k])=>k===stat.tier);
    const next=TIER_RULES[idx+1];
    const facts=[`답변한 상담 ${stat.answered||0}건`];
    if(stat.median_reply_minutes!=null)facts.push(`보통 ${span(Number(stat.median_reply_minutes))} 안에 답변`);
    if(stat.reply_rate!=null)facts.push(`24시간 안 응답률 ${pct(stat.reply_rate)}`);
    if(stat.feedback_count)facts.push(`평가 ${stat.feedback_count}개 · 도움이 됐어요 ${pct(stat.helpful_rate)}`);
    return `<section class="my-tier"><div class="my-tier-top"><b>내 상담 활동 등급</b>${tierBadge(stat)}</div><ul class="vet-facts">${facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>${next?`<p class="next">다음 등급 ${tierBadge({tier:next[0]})} ${esc(next[1])}</p>`:'<p class="next">가장 높은 등급이에요.</p>'}</section>`;
  }
  async function feedbackBar(conversation){
    const box=app.querySelector('#consult-rate');if(!box||!user||conversation.guardian_id!==user.id)return;
    const {data}=await chat.client.from('vet_consult_feedback').select('helpful').eq('consultation_id',conversation.id).maybeSingle();
    if(data){box.innerHTML=`<p class="rate-done">평가해 주셔서 고마워요. (${data.helpful?'도움이 됐어요':'아쉬워요'})</p>`;box.hidden=false;return;}
    box.innerHTML=`<span>상담이 도움이 됐나요?</span><button type="button" class="consult-btn ghost" data-action="rate" data-helpful="1">도움이 됐어요</button><button type="button" class="consult-btn ghost" data-action="rate" data-helpful="0">아쉬워요</button>`;
    box.hidden=false;
  }
  async function renderApplicationAfterLogin(){
    const {data:profile,error:profileError}=await chat.client.from('veterinarian_profiles')
      .select('user_id').eq('user_id',user.id).maybeSingle();
    if(profileError)throw profileError;
    if(profile){
      vetProfile=profile;
      const {data:appData,error:applicationError}=await chat.client.from('veterinarian_applications')
        .select('display_name,clinic_name,specialties,strengths,bio,license_number,estimated_wait_minutes,status')
        .eq('user_id',user.id).maybeSingle();
      if(applicationError)throw applicationError;
      application=appData;
      await renderVetDashboard('chats');
      return;
    }
    const {data:appData,error}=await chat.client.from('veterinarian_applications')
      .select('display_name,clinic_name,specialties,strengths,bio,license_number,estimated_wait_minutes,status')
      .eq('user_id',user.id).maybeSingle();
    if(error)throw error;
    application=appData;
    renderApplication();
  }
  async function startConsultation(veterinarianId){
    if(!user){
      openLogin();
      return;
    }
    const petName=String(petProfile.name||'우리 아이').trim().slice(0,40)||'우리 아이';
    const find=()=>chat.client.from('vet_consultations').select('id')
      .eq('guardian_id',user.id).eq('veterinarian_id',veterinarianId).maybeSingle();
    let {data:conversation,error}=await find();
    if(error)throw error;
    if(!conversation){
      const inserted=await chat.client.from('vet_consultations')
        .insert({guardian_id:user.id,veterinarian_id:veterinarianId,pet_name:petName})
        .select('id').single();
      if(inserted.error&&inserted.error.code==='23505'){
        const again=await find();
        if(again.error)throw again.error;
        conversation=again.data;
      }else if(inserted.error)throw inserted.error;
      else conversation=inserted.data;
    }
    selectedConversation=conversation.id;
    clientTab='chats';
    history.replaceState(null,'','consult.html?c='+encodeURIComponent(selectedConversation));
    await renderClient();
    await openThread(selectedConversation,'client');
  }
  async function openThread(id,role){
    selectedConversation=id;
    const panel=app.querySelector('#consult-thread');
    if(!panel)return;
    const conversationQuery=chat.client.from('vet_consultations')
      .select('id,guardian_id,veterinarian_id,pet_name')
      .eq('id',id).maybeSingle();
    const {data:conversation,error}=await conversationQuery;
    if(error)throw error;
    if(!conversation){panel.innerHTML='<div class="consult-error">상담을 찾을 수 없거나 접근 권한이 없어요.</div>';return;}
    let partnerName,subtitle;
    if(role==='vet'){
      partnerName=call(conversation.pet_name)+' 보호자';
      subtitle='보호자와의 1:1 수의사 상담';
    }else{
      const {data:vet,error:vetError}=await chat.client.from('veterinarian_profiles')
        .select('display_name,clinic_name').eq('user_id',conversation.veterinarian_id).maybeSingle();
      if(vetError)throw vetError;
      partnerName=vet?vet.display_name:'수의사';
      subtitle=vet?vet.clinic_name:'상담 프로필';
    }
    panel.innerHTML=`<header class="consult-thread-head"><button type="button" class="consult-back" data-action="back-to-list" aria-label="목록으로">‹</button><div><h2>${esc(partnerName)}</h2><p>${esc(subtitle)}</p></div></header>
      <div class="consult-messages" id="consult-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <div class="consult-rate" id="consult-rate" hidden></div>
      <p class="consult-status" id="consult-feedback" role="status"></p>
      <form class="consult-compose" id="message-form"><label class="sr-only" for="consult-message">메시지</label><textarea id="consult-message" name="body" rows="1" maxlength="2000" placeholder="메시지를 입력해 주세요" required></textarea><button class="consult-btn" type="submit">전송</button></form>`;
    renderedMessages.clear();
    const {data:messages,error:messageError}=await chat.client.from('vet_consult_messages')
      .select('id,sender_id,body,created_at').eq('consultation_id',id).order('created_at',{ascending:true}).limit(500);
    if(messageError)throw messageError;
    (messages||[]).forEach(addMessage);
    currentConversation=conversation;
    if(role!=='vet'&&(messages||[]).some(m=>m.sender_id===conversation.veterinarian_id))await feedbackBar(conversation);
    if(conversationChannel)await chat.client.removeChannel(conversationChannel);
    conversationChannel=chat.client.channel('vet-consult-'+id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'vet_consult_messages',filter:'consultation_id=eq.'+id},payload=>addMessage(payload.new))
      .subscribe(status=>{
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')feedback('실시간 연결이 끊겼어요. 페이지를 새로고침해 주세요.',true);
      });
    const layout=app.querySelector('.consult-layout');
    if(layout)layout.classList.add('thread-open');
  }
  function addMessage(message){
    if(renderedMessages.has(message.id))return;
    renderedMessages.add(message.id);
    const list=app.querySelector('#consult-messages');
    if(!list)return;
    const item=document.createElement('article');
    item.className='consult-msg '+(message.sender_id===user.id?'mine':'theirs');
    const body=document.createElement('p');
    body.textContent=message.body;
    const time=document.createElement('time');
    time.dateTime=message.created_at;
    time.textContent=timeLabel(message.created_at);
    item.append(body,time);
    list.append(item);
    const rate=app.querySelector('#consult-rate');
    if(rate&&rate.hidden&&currentConversation&&message.sender_id===currentConversation.veterinarian_id&&currentConversation.guardian_id===user.id)feedbackBar(currentConversation);
    list.scrollTop=list.scrollHeight;
  }
  function subscribeInbox(){
    if(inboxChannel||!user)return;
    const filter=vetProfile?'veterinarian_id=eq.'+user.id:'guardian_id=eq.'+user.id;
    inboxChannel=chat.client.channel('vet-consult-inbox-'+user.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'vet_consultations',filter},()=>{
        if(vetProfile)renderVetDashboard('chats').catch(error=>renderError(resultError(error,'상담 목록을 새로 불러오지 못했어요.')));
        else renderClient().catch(error=>renderError(resultError(error,'상담 목록을 새로 불러오지 못했어요.')));
      })
      .subscribe();
  }
  function openLogin(){
    window.FPAuth.open({onSuccess:initialize});
  }
  function parseApplication(form){
    const data=new FormData(form);
    const specialties=String(data.get('specialties')||'').split(',').map(value=>value.trim()).filter(Boolean);
    const application={
      display_name:String(data.get('display_name')||'').trim(),
      clinic_name:String(data.get('clinic_name')||'').trim(),
      specialties,
      strengths:String(data.get('strengths')||'').trim(),
      bio:String(data.get('bio')||'').trim(),
      license_number:String(data.get('license_number')||'').trim()
    };
    if(form.elements.estimated_wait_minutes){
      application.estimated_wait_minutes=Number(data.get('estimated_wait_minutes'));
    }
    return application;
  }
  async function submitApplication(form){
    const data=parseApplication(form);
    if(!data.specialties.length||data.specialties.length>8)throw new Error('진료 분야를 1~8개 입력해 주세요.');
    const query=application
      ?chat.client.from('veterinarian_applications').update(data).eq('user_id',user.id)
      :chat.client.from('veterinarian_applications').insert({user_id:user.id,...data});
    const {error}=await query;
    if(error)throw error;
    const {data:saved,error:loadError}=await chat.client.from('veterinarian_applications')
      .select('display_name,clinic_name,specialties,strengths,bio,license_number,estimated_wait_minutes,status')
      .eq('user_id',user.id).single();
    if(loadError)throw loadError;
    application=saved;
    renderApplication();
  }
  async function submitVetProfile(form){
    const data=parseApplication(form);
    if(!data.specialties.length||data.specialties.length>8)throw new Error('진료 분야를 1~8개 입력해 주세요.');
    const {error:applicationError}=await chat.client.from('veterinarian_applications')
      .update(data).eq('user_id',user.id);
    if(applicationError)throw applicationError;
    const {license_number,...profileData}=data;
    const {error:profileError}=await chat.client.from('veterinarian_profiles')
      .update({...profileData,accepting_consultations:form.elements.accepting_consultations.checked})
      .eq('user_id',user.id);
    if(profileError)throw profileError;
    const {data:updated,error:loadError}=await chat.client.from('veterinarian_applications')
      .select('display_name,clinic_name,specialties,strengths,bio,license_number,estimated_wait_minutes,status')
      .eq('user_id',user.id).single();
    if(loadError)throw loadError;
    application=updated;
    feedback('프로필을 저장했어요.',false);
  }
  async function handleSubmit(event){
    const form=event.target;
    if(!(form instanceof HTMLFormElement))return;
    if(form.id==='application-form'){
      event.preventDefault();
      const button=form.querySelector('button[type=submit]');
      button.disabled=true;
      try{await submitApplication(form);}
      catch(error){const target=app.querySelector('#application-feedback');if(target)target.textContent=resultError(error,'신청을 저장하지 못했어요.');}
      finally{const current=app.querySelector('#application-form button[type=submit]');if(current)current.disabled=false;}
      return;
    }
    if(form.id==='vet-profile-form'){
      event.preventDefault();
      const button=form.querySelector('button[type=submit]');
      button.disabled=true;
      try{await submitVetProfile(form);}
      catch(error){const target=app.querySelector('#profile-feedback');if(target)target.textContent=resultError(error,'프로필을 저장하지 못했어요.');}
      finally{const current=app.querySelector('#vet-profile-form button[type=submit]');if(current)current.disabled=false;}
      return;
    }
    if(form.id==='message-form'){
      event.preventDefault();
      const input=form.elements.body;
      const body=input.value.trim();
      if(!body)return;
      const button=form.querySelector('button[type=submit]');
      button.disabled=true;
      const {error}=await chat.client.from('vet_consult_messages')
        .insert({consultation_id:selectedConversation,body});
      button.disabled=false;
      if(error){feedback(resultError(error,'메시지를 보내지 못했어요.'),true);input.focus();return;}
      input.value='';
      input.focus();
      feedback('',false);
    }
  }
  async function handleClick(event){
    const button=event.target.closest('[data-action]');
    if(!button)return;
    const action=button.dataset.action;
    try{
      if(action==='sign-out'){
        const {error}=await chat.client.auth.signOut();
        if(error)throw error;
        if(!FP.clearPetCache())toast('로그아웃했지만 이 기기의 아이 정보 캐시를 지우지 못했어요.');
        user=null;vetProfile=null;application=null;selectedConversation=null;
        if(inboxChannel){await chat.client.removeChannel(inboxChannel);inboxChannel=null;}
        if(conversationChannel){await chat.client.removeChannel(conversationChannel);conversationChannel=null;}
        history.replaceState(null,'','consult.html');
        renderLogin();
      }else if(action==='vet-login'){
        if(user)await renderApplicationAfterLogin();
        else openLogin();
      }
      else if(action==='close-auth'){const auth=app.querySelector('#consult-auth');if(auth)auth.hidden=true;}
      else if(action==='client-tab'){
        clientTab=button.dataset.tab;selectedConversation=null;
        if(conversationChannel){await chat.client.removeChannel(conversationChannel);conversationChannel=null;}
        history.replaceState(null,'','consult.html');
        await renderClient();
      }else if(action==='start')await startConsultation(button.dataset.vet);
      else if(action==='rate'){
        const helpful=button.dataset.helpful==='1';
        app.querySelectorAll('[data-action=rate]').forEach(b=>{b.disabled=true;});
        const {error}=await chat.client.from('vet_consult_feedback').insert({consultation_id:selectedConversation,helpful});
        if(error&&error.code!=='23505'){app.querySelectorAll('[data-action=rate]').forEach(b=>{b.disabled=false;});feedback('평가를 저장하지 못했어요.',true);}
        else if(currentConversation)await feedbackBar(currentConversation);
      }
      else if(action==='open-client-chat'||action==='open-vet-chat'){
        selectedConversation=button.dataset.id;
        const role=action==='open-vet-chat'?'vet':'client';
        if(role==='client')clientTab='chats';
        if(role==='client')await renderClient();
        else await renderVetDashboard('chats');
        await openThread(selectedConversation,role);
        history.replaceState(null,'','consult.html?c='+encodeURIComponent(selectedConversation));
      }else if(action==='back-to-list'){
        selectedConversation=null;
        if(conversationChannel){await chat.client.removeChannel(conversationChannel);conversationChannel=null;}
        const layout=app.querySelector('.consult-layout');
        if(layout)layout.classList.remove('thread-open');
        const panel=app.querySelector('#consult-thread');
        if(panel)panel.innerHTML='<div class="consult-thread-empty"><b>대화를 선택해 주세요</b><p>상담 내용은 보호자와 담당 수의사만 볼 수 있어요.</p></div>';
        history.replaceState(null,'','consult.html');
      }else if(action==='vet-tab'){
        selectedConversation=null;
        if(conversationChannel){await chat.client.removeChannel(conversationChannel);conversationChannel=null;}
        await renderVetDashboard(button.dataset.tab);
      }
    }catch(error){renderError(resultError(error,'요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.'));}
  }
  async function initialize(){
    if(!chat||!chat.client){
      renderError('Supabase에 연결할 수 없어요. 연결 설정을 확인해 주세요.');
      return;
    }
    const {data,error}=await chat.client.auth.getSession();
    if(error)throw error;
    user=data.session?data.session.user:null;
    if(user){
      const {data:profile,error:profileError}=await chat.client.from('veterinarian_profiles')
        .select('user_id').eq('user_id',user.id).maybeSingle();
      if(profileError)throw profileError;
      if(profile){
        vetProfile=profile;
        const {data:appData,error:applicationError}=await chat.client.from('veterinarian_applications')
          .select('display_name,clinic_name,specialties,strengths,bio,license_number,estimated_wait_minutes,status')
          .eq('user_id',user.id).maybeSingle();
        if(applicationError)throw applicationError;
        application=appData;
        const urlConversation=params.get('c');
        selectedConversation=urlConversation;
        await renderVetDashboard('chats');
        if(requestedVet)history.replaceState(null,'','consult.html');
        return;
      }
      const {data:appData,error:applicationError}=await chat.client.from('veterinarian_applications')
        .select('display_name,clinic_name,specialties,strengths,bio,license_number,estimated_wait_minutes,status')
        .eq('user_id',user.id).maybeSingle();
      if(applicationError)throw applicationError;
      application=appData;
      if(application){
        renderApplication();
        return;
      }
      if(params.get('mode')==='vet'){
        renderApplication();
        return;
      }
    }
    selectedConversation=params.get('c');
    if(!user){renderLogin();return;}
    const loaded=await chat.loadPetProfile(FP.load().pet);
    petProfile=loaded.pet||{};
    if(loaded.pet){
      const state=FP.load();
      state.pet=petProfile;
      if(!FP.save(state))toast('아이 정보는 계정에 저장돼 있지만 이 기기에 표시용 정보를 저장하지 못했어요.');
    }
    await renderClient();
    if(requestedVet)await startConsultation(requestedVet);
  }

  app.addEventListener('click',event=>handleClick(event).catch(error=>renderError(resultError(error,'요청을 처리하지 못했어요.'))));
  app.addEventListener('submit',event=>handleSubmit(event).catch(error=>renderError(resultError(error,'요청을 처리하지 못했어요.'))));
  app.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey&&event.target.matches('#consult-message')){
      event.preventDefault();
      event.target.form.requestSubmit();
    }
  });
  initialize().catch(error=>renderError(resultError(error,'상담 공간을 불러오지 못했어요.')));
})();
