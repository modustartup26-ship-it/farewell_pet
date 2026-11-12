/* 강아지 전용 앨범: 업체가 보낸 사진·영상과 보호자가 올린 사진을 한곳에.
   용량 추가·포토북·생애 기록은 결제 연동 전이라 신청만 받고 운영팀이 연락한다. */
(function(){
  const {esc,icon,toast,josa}=FP;
  const app=document.querySelector('#album-app');
  const chat=window.FPChat;
  const PLANS=[
    {id:'free',name:'기본',gb:0.5,price:0,label:'무료'},
    {id:'plus',name:'플러스',gb:30,price:1500,label:'월 1,500원'},
    {id:'pro',name:'프로',gb:200,price:4900,label:'월 4,900원'}
  ];
  const BOOKS=[
    {id:'soft-a5',name:'소프트커버 A5 · 24쪽',price:'29,000원 예정',max:40},
    {id:'hard-a4',name:'하드커버 A4 · 40쪽',price:'59,000원 예정',max:80}
  ];
  let user=null,pet={},items=[],usage={used_bytes:0,quota_bytes:524288000},orders=[],filter='all',selecting=null,selected=new Set(),diaryStats=null;

  const WEEK=['일','월','화','수','목','금','토'];
  const monthKey=d=>d.slice(0,7);
  const niceMonth=k=>`${k.slice(0,4)}년 ${Number(k.slice(5))}월`;
  const niceDay=d=>{const x=new Date(d+'T00:00:00');return `${x.getMonth()+1}월 ${x.getDate()}일 (${WEEK[x.getDay()]})`;};
  const petName=()=>pet.name||'우리 아이';

  /* ---------- 시트 ---------- */
  const sheet=document.createElement('dialog');
  sheet.className='sheet';sheet.id='amodal';sheet.setAttribute('aria-labelledby','amodal-title');
  sheet.innerHTML=`<div class="sheet-head"><span></span><h2 id="amodal-title"></h2><button type="button" class="icon-btn" data-sheet-close aria-label="닫기">${icon('close')}</button></div><form class="sheet-body" id="amodal-form" novalidate></form><div class="sheet-foot" id="amodal-foot"></div>`;
  document.body.append(sheet);
  sheet.addEventListener('click',e=>{if(e.target===sheet||e.target.closest('[data-sheet-close]'))sheet.close();});
  function openSheet(title,body,foot,onSubmit){
    sheet.querySelector('#amodal-title').textContent=title;
    const f=sheet.querySelector('#amodal-form');f.innerHTML=body;
    sheet.querySelector('#amodal-foot').innerHTML=foot;sheet.querySelector('#amodal-foot').hidden=!foot;
    f.onsubmit=e=>{e.preventDefault();onSubmit&&onSubmit(new FormData(f));};
    if(!sheet.open)sheet.showModal();
  }

  /* ---------- 로그인 ---------- */
  function renderLogin(){
    app.innerHTML=`<section class="chat-gate"><h1>${icon('camera')}우리 아이 앨범</h1><p>업체가 보낸 사진과 내가 찍은 사진을 한곳에 모아요.</p>
      <button class="btn btn-primary" id="album-auth" type="button">로그인 · 회원가입</button></section>`;
    document.querySelector('#album-auth').addEventListener('click',()=>window.FPAuth.open({onSuccess:boot}));
  }

  /* ---------- 데이터 ---------- */
  async function load(){
    const [m,u,o]=await Promise.all([
      chat.client.from('media').select('id,path,kind,bytes,taken_on,caption,conversation_id,uploader_id,created_at').eq('owner_id',user.id).order('taken_on',{ascending:false}).order('created_at',{ascending:false}).limit(1000),
      chat.client.rpc('storage_usage'),
      chat.client.from('orders').select('id,kind,details,status,created_at').order('created_at',{ascending:false}).limit(20)
    ]);
    if(m.error)throw m.error;
    items=m.data;
    if(!u.error&&u.data)usage=Array.isArray(u.data)?u.data[0]:u.data;
    orders=o.error?[]:o.data;
  }
  const visible=()=>items.filter(it=>filter==='all'||(filter==='facility'&&it.uploader_id!==user.id)||(filter==='mine'&&it.uploader_id===user.id)||(filter==='video'&&it.kind==='video'));

  /* ---------- 화면 ---------- */
  function usageBar(){
    const pct=Math.min(100,Math.round(usage.used_bytes/usage.quota_bytes*100));
    return `<div class="usage ${pct>=90?'full':''}"><div class="usage-top"><b>앨범 용량</b><span>${Media.size(usage.used_bytes)} / ${Media.size(usage.quota_bytes)}</span></div><div class="bar"><i style="width:${pct}%"></i></div><p>업체가 보낸 사진·영상은 용량에 포함되지 않아요.${pct>=80?' <button type="button" class="link" data-act="plans">용량 늘리기</button>':''}</p></div>`;
  }
  function grid(){
    const list=visible();
    if(!list.length)return `<div class="chat-empty"><b>${filter==='all'?'아직 사진이 없어요':'이 분류에는 사진이 없어요'}</b><p>업체가 대화에서 보낸 사진이나 일기에 붙인 사진이 여기에 모여요. 직접 올릴 수도 있어요.</p></div>`;
    const groups=new Map();list.forEach(it=>{const k=monthKey(it.taken_on);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(it);});
    return [...groups].map(([k,arr])=>`<section class="month"><h2>${niceMonth(k)} <small>${arr.length}</small></h2><div class="tiles">${arr.map(tile).join('')}</div></section>`).join('');
  }
  function tile(it){
    const sel=selected.has(it.id);
    const disabled=selecting&&it.kind==='video';
    return `<button type="button" class="tile ${sel?'sel':''} ${disabled?'off':''}" data-item="${esc(it.id)}" aria-pressed="${sel}" aria-label="${niceDay(it.taken_on)} ${it.kind==='video'?'영상':'사진'}${it.uploader_id!==user.id?', 업체가 보냄':''}" ${disabled?'disabled':''}>
      <span class="thumb" data-path="${esc(it.path)}" data-kind="${it.kind}"></span>
      ${it.kind==='video'?`<span class="badge-v">${icon('play')}</span>`:''}${it.uploader_id!==user.id?'<span class="badge-f">업체</span>':''}
      ${selecting?`<span class="check">${sel?icon('check'):''}</span>`:''}
    </button>`;
  }
  function render(){
    if(selecting){renderSelecting();return;}
    app.innerHTML=`<div class="album">
      <header class="album-head"><div><h1>${esc(josa.of(petName()))} 앨범</h1><p>${items.length}개의 순간을 모았어요.</p></div>
        <label class="btn btn-primary upload">${icon('plus')}사진·영상 올리기<input type="file" id="up" accept="image/*,video/mp4,video/quicktime,video/webm" multiple hidden></label></header>
      ${usageBar()}
      <div class="filters chips" role="group" aria-label="보기">${[['all','전체'],['facility','업체가 보낸'],['mine','내가 올린'],['video','영상']].map(([k,l])=>`<button type="button" class="chip" data-filter="${k}" aria-pressed="${filter===k}">${l}</button>`).join('')}</div>
      <div id="grid">${grid()}</div>
      <section class="make">
        <div class="make-card"><b>${icon('book')}포토북 만들기</b><p>고른 사진에 일기와 체크리스트 기록을 곁들여 한 권으로 만들어 보내 드려요.</p><button type="button" class="btn btn-soft" data-act="book">사진 고르기</button></div>
        <div class="make-card"><b>${icon('camera')}용량 늘리기</b><p>기본 500MB가 넘으면 원하는 만큼 늘릴 수 있어요.</p><button type="button" class="btn btn-soft" data-act="plans">요금 보기</button></div>
      </section>
      ${orders.length?`<section class="orders"><h2>신청 내역</h2><ul>${orders.map(o=>`<li><b>${{storage:'용량 추가',photobook:'포토북',memorial:'생애 기록'}[o.kind]}</b><span>${new Date(o.created_at).toLocaleDateString('ko-KR')}</span><em>${{requested:'접수됨',contacted:'연락드렸어요',paid:'결제 완료',in_production:'제작 중',shipped:'보냈어요',cancelled:'취소됨'}[o.status]}</em></li>`).join('')}</ul></section>`:''}
      <p class="memorial-link"><button type="button" class="link" data-act="memorial">아이가 무지개다리를 건넜나요?</button></p>
    </div>`;
    document.querySelector('#up').addEventListener('change',upload);
    fillThumbs();
  }
  async function fillThumbs(){
    const slots=[...document.querySelectorAll('.thumb:not(.ready)')];if(!slots.length)return;
    try{
      const map=await Media.urls(chat.client,slots.map(s=>s.dataset.path));
      slots.forEach(s=>{const u=map[s.dataset.path];if(!u)return;s.classList.add('ready');
        s.innerHTML=s.dataset.kind==='video'?`<video src="${esc(u)}#t=0.1" muted playsinline preload="metadata"></video>`:`<img src="${esc(u)}" alt="" loading="lazy">`;});
    }catch{}
  }

  async function upload(e){
    const files=[...e.target.files];e.target.value='';if(!files.length)return;
    let ok=0;
    for(const [i,f] of files.entries()){
      toast(`${i+1}/${files.length} 올리는 중이에요.`);
      try{await Media.upload(chat.client,f);ok++;}
      catch(err){toast(Media.errorText(err));if(/quota/.test(String(err&&err.message)))break;}
    }
    await load();render();
    if(ok)toast(`${ok}개를 앨범에 담았어요.`);
  }

  /* ---------- 크게 보기 ---------- */
  async function view(id){
    const it=items.find(x=>x.id===id);if(!it)return;
    const map=await Media.urls(chat.client,[it.path]).catch(()=>({}));
    const u=map[it.path];
    openSheet(niceDay(it.taken_on),`<div class="viewer">${u?(it.kind==='video'?`<video src="${esc(u)}" controls playsinline autoplay></video>`:`<img src="${esc(u)}" alt="">`):'<p class="muted">불러오지 못했어요.</p>'}</div>
      <p class="muted">${it.uploader_id===user.id?'내가 올렸어요':'업체가 대화에서 보냈어요'} · ${Media.size(it.bytes)}${it.caption?` · ${esc(it.caption)}`:''}</p>`,
      `${u?`<a class="btn-ghost" href="${esc(u)}" download target="_blank" rel="noopener">${icon('download')}저장</a>`:''}<span class="sp"></span><button type="button" class="btn-ghost danger" id="del">${icon('trash')}지우기</button>`,null);
    const del=document.querySelector('#del');
    del.onclick=async()=>{
      if(!del.dataset.armed){del.dataset.armed='1';del.lastChild.textContent=it.conversation_id?'대화에서도 사라져요. 한 번 더 누르기':'한 번 더 누르면 지워져요';return;}
      try{await Media.remove(chat.client,it);sheet.close();await load();render();toast('지웠어요.');}
      catch{toast('지우지 못했어요. 잠시 뒤에 다시 시도해 주세요.');}
    };
  }

  /* ---------- 사진 고르기 (포토북·생애 기록) ---------- */
  function renderSelecting(){
    const max=selecting==='book'?80:60;
    app.innerHTML=`<div class="album selecting">
      <header class="album-head"><div><h1>${selecting==='book'?'포토북에 넣을 사진':'생애 기록에 담을 사진'}</h1><p>사진을 눌러 골라 주세요. 최대 ${max}장까지 고를 수 있어요.</p></div><button type="button" class="btn-ghost" data-act="cancel-select">취소</button></header>
      <div id="grid">${grid()}</div>
      <div class="select-bar"><span><b>${selected.size}</b>장 골랐어요</span><button type="button" class="btn btn-primary" data-act="select-done" ${selected.size?'':'disabled'}>다음</button></div>
    </div>`;
    fillThumbs();
  }
  function toggle(id){
    const max=selecting==='book'?80:60;
    if(selected.has(id))selected.delete(id);
    else{if(selected.size>=max){toast(`최대 ${max}장까지 고를 수 있어요.`);return;}selected.add(id);}
    const t=document.querySelector(`[data-item="${CSS.escape(id)}"]`);
    if(t){t.classList.toggle('sel',selected.has(id));t.setAttribute('aria-pressed',selected.has(id));t.querySelector('.check').innerHTML=selected.has(id)?icon('check'):'';}
    document.querySelector('.select-bar b').textContent=selected.size;
    document.querySelector('[data-act="select-done"]').disabled=!selected.size;
  }

  async function placeOrder(kind,details){
    const {error}=await chat.client.from('orders').insert({kind,details});
    if(error){toast('신청하지 못했어요. 잠시 뒤에 다시 시도해 주세요.');return false;}
    return true;
  }
  function bookForm(){
    openSheet('포토북 신청',`<p class="muted">${selected.size}장을 골랐어요. 결제 연동 전이라 지금은 신청만 받고, 운영팀이 시안과 결제 방법을 메일로 안내드려요.</p>
      <fieldset class="opts"><legend>크기</legend>${BOOKS.map((b,i)=>`<label class="opt"><input type="radio" name="size" value="${b.id}" ${i===0?'checked':''}><span><b>${b.name}</b><small>${b.price} · 사진 ${b.max}장까지</small></span></label>`).join('')}</fieldset>
      <label class="check"><input type="checkbox" name="diary" checked> 같은 날의 산책 일기와 체크리스트 기록도 함께 넣기</label>
      <label class="field-l">요청 사항 <small>(선택)</small><textarea name="note" rows="3" maxlength="300" placeholder="예: 표지는 첫 번째 사진으로 해 주세요."></textarea></label>
      <p class="muted small">주소 같은 배송 정보는 결제 단계에서 따로 받아요.</p>`,
      `<button type="submit" form="amodal-form" class="btn btn-primary">${icon('check')}신청하기</button>`,
      async fd=>{
        const size=BOOKS.find(b=>b.id===fd.get('size'));
        if(selected.size>size.max){toast(`${size.name}에는 ${size.max}장까지 넣을 수 있어요.`);return;}
        if(await placeOrder('photobook',{size:size.id,media_ids:[...selected],include_diary:!!fd.get('diary'),note:String(fd.get('note')||'').trim()})){
          sheet.close();selecting=null;selected.clear();await load();render();toast('포토북 신청을 받았어요. 메일로 안내드릴게요.');
        }
      });
  }
  function plans(){
    const quotaGb=usage.quota_bytes/1024/1024/1024;
    openSheet('앨범 용량',`<p class="muted">지금 ${Media.size(usage.used_bytes)}를 쓰고 있어요. 업체가 보낸 사진·영상은 빼고 계산해요.</p>
      <div class="plans">${PLANS.map(p=>`<label class="plan ${Math.abs(p.gb-quotaGb)<0.01?'cur':''}"><input type="radio" name="plan" value="${p.id}" ${p.id==='plus'?'checked':''} ${p.id==='free'?'disabled':''}><b>${p.name}</b><span class="gb">${p.gb<1?p.gb*1000+'MB':p.gb+'GB'}</span><span class="price">${p.label}</span>${Math.abs(p.gb-quotaGb)<0.01?'<em>사용 중</em>':''}</label>`).join('')}</div>
      <p class="muted small">결제 연동 전이라 지금은 신청만 받아요. 운영팀이 결제 방법을 안내하고, 결제가 끝나면 용량을 늘려 드려요. 요금은 시범 운영 기준이라 바뀔 수 있어요.</p>`,
      `<button type="submit" form="amodal-form" class="btn btn-primary">${icon('check')}신청하기</button>`,
      async fd=>{const plan=PLANS.find(p=>p.id===fd.get('plan'));if(!plan||!plan.price)return;
        if(await placeOrder('storage',{plan:plan.id,gb:plan.gb,monthly_krw:plan.price})){sheet.close();await load();render();toast('용량 추가 신청을 받았어요.');}});
  }

  /* ---------- 생애 기록 (보호자가 먼저 찾아올 때만 보여 준다) ---------- */
  async function loadDiaryStats(){
    const {data}=await chat.client.from('diary_entries').select('entry_date,place,activity,source').order('entry_date',{ascending:true}).limit(1000);
    const rows=data||[];
    const walk=rows.reduce((a,r)=>a+(Number(r.activity&&r.activity.walk_min)||0),0);
    diaryStats={count:rows.length,first:rows[0]&&rows[0].entry_date,last:rows.length?rows[rows.length-1].entry_date:null,places:new Set(rows.map(r=>r.place)).size,walk};
  }
  async function memorial(){
    if(!diaryStats)await loadDiaryStats().catch(()=>{diaryStats={count:0,places:0,walk:0};});
    const s=diaryStats,photos=items.filter(i=>i.kind==='image').length;
    app.innerHTML=`<div class="album memorial">
      <header class="album-head"><div><h1>${esc(josa.of(petName()))} 생애 기록</h1><p>함께한 시간을 천천히 돌아볼 수 있게 모아 두었어요.</p></div><button type="button" class="btn-ghost" data-act="back">앨범으로</button></header>
      <div class="life">
        ${s.first?`<p class="life-range">${niceDay(s.first)}부터 ${niceDay(s.last)}까지 남긴 기록</p>`:''}
        <ul class="life-stats"><li><b>${s.count}</b><span>일기</span></li><li><b>${photos}</b><span>사진</span></li><li><b>${s.places}</b><span>함께 간 곳</span></li><li><b>${s.walk?Math.round(s.walk/60):0}</b><span>산책 시간(시간)</span></li></ul>
        <p>원하시면 이 기록과 사진을 한 권의 생애 기록집으로 만들어 보내 드려요. 서두르지 않으셔도 괜찮아요. 신청해도 바로 결제되지 않고, 운영팀이 먼저 제작 방법과 비용을 메일로 여쭤봐요.</p>
        <button type="button" class="btn btn-soft" data-act="memorial-pick">${icon('camera')}담을 사진 고르기</button>
      </div>
    </div>`;
  }
  function memorialForm(){
    openSheet('생애 기록집 신청',`<p class="muted">${selected.size}장의 사진과 산책 일기를 담아요.</p>
      <label class="field-l">함께한 기간 <small>(선택)</small><input name="period" maxlength="60" placeholder="예: 2015년 봄 ~ 2026년 가을"></label>
      <label class="field-l">마지막 장에 넣을 편지 <small>(선택)</small><textarea name="letter" rows="5" maxlength="1000" placeholder="하고 싶은 말을 적어 주세요."></textarea></label>
      <label class="check"><input type="checkbox" name="diary" checked> 산책 일기와 체크리스트 기록도 함께 담기</label>`,
      `<button type="submit" form="amodal-form" class="btn btn-primary">신청하기</button>`,
      async fd=>{
        if(await placeOrder('memorial',{media_ids:[...selected],period:String(fd.get('period')||'').trim(),letter:String(fd.get('letter')||'').trim(),include_diary:!!fd.get('diary')})){
          sheet.close();selecting=null;selected.clear();await load();render();toast('신청을 받았어요. 천천히 연락드릴게요.');
        }
      });
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-item],[data-filter],[data-act]');if(!t||!app.contains(t)&&!sheet.contains(t))return;
    if(t.dataset.item){if(selecting)toggle(t.dataset.item);else view(t.dataset.item);return;}
    if(t.dataset.filter){filter=t.dataset.filter;render();return;}
    const a=t.dataset.act;
    if(a==='plans')plans();
    if(a==='book'){selecting='book';selected.clear();filter='all';render();}
    if(a==='cancel-select'){const m=selecting;selecting=null;selected.clear();m==='memorial'?memorial():render();}
    if(a==='select-done'){selecting==='book'?bookForm():memorialForm();}
    if(a==='memorial')memorial();
    if(a==='memorial-pick'){selecting='memorial';selected.clear();filter='all';render();}
    if(a==='back')render();
  });

  async function boot(){
    app.innerHTML='<section class="chat-gate"><p class="muted">불러오는 중이에요.</p></section>';
    if(!chat){app.innerHTML='<section class="chat-gate"><h1>앨범을 열지 못했어요</h1><p>연결에 문제가 있어요. 새로고침해 주세요.</p></section>';return;}
    try{
      user=await chat.currentUser();
      if(!user){renderLogin();return;}
      try{const r=await chat.loadPetProfile(FP.load().pet);pet=r.pet||FP.load().pet||{};}catch{pet=FP.load().pet||{};}
      await load();render();
    }catch{
      app.innerHTML='<section class="chat-gate"><h1>앨범을 열지 못했어요</h1><p>잠시 뒤에 다시 시도해 주세요.</p><button type="button" class="btn btn-soft" id="retry">다시 시도</button></section>';
      document.querySelector('#retry').onclick=boot;
    }
  }
  chat&&chat.client.auth.onAuthStateChange((ev,s)=>{if(ev==='SIGNED_IN'&&s&&(!user||user.id!==s.user.id))setTimeout(boot,0);});
  boot();
})();
