(function(){
  const {esc,icon,josa,toast}=FP;
  const $=s=>document.querySelector(s);
  const state=FP.load();
  const legacyPet={...state.pet};
  const pet={};
  let hasPet=false,petName='우리 아이',user=null,lastPetSnapshot='{}';
  let view='map', current=null, filterState={}, lastResults=null;

  const save=()=>{
    if(!FP.save(state))toast('저장 공간을 쓸 수 없어 이 화면에서만 유지돼요.');
    const snapshot=JSON.stringify(pet);
    if(user&&snapshot!==lastPetSnapshot){
      const previousSnapshot=lastPetSnapshot;
      lastPetSnapshot=snapshot;
      FPChat.savePetProfile(pet).catch(error=>{
        lastPetSnapshot=previousSnapshot;
        console.error('Unable to save pet profile.',error);
        toast('아이 정보를 계정에 저장하지 못했어요. 연결을 확인해 주세요.');
      });
    }
  };
  function switchPet(id){
    const next=(state.pets||[]).find(p=>p.id===id);
    if(!next)return;
    state.activePetId=id;
    Object.keys(pet).forEach(key=>delete pet[key]);
    Object.assign(pet,next);
    state.pet={...next};
    save();
    petName=pet.name||'우리 아이';
    hasPet=!!pet.name;
    const reload=()=>location.reload();
    /* 로그인한 경우 계정의 '지금 보는 아이'도 바꿔 둬야 새로고침 뒤에도 유지된다 */
    if(user&&window.FPChat)FPChat.savePetProfile({...next,_pets:state.pets.map(p=>({...p})),_activePetId:id}).catch(err=>{console.error(err);toast('계정에 반영하지 못해 이 기기에서만 바뀌었어요.');}).finally(reload);
    else reload();
  }
  const FREE_PETS=2;
  const DIST=['우리 동네','가까운 동네','옆 동네','시내','먼 동네'];

  /* ---------- 상단 · 프로필 ---------- */
  function avatar(){return pet.photo?`<img src="${pet.photo}" alt="">`:Minimi.svg(Minimi.config(pet));}
  function renderHeader(){
    map.svg.setAttribute('aria-label',`${josa.name(petName)} 맞춤 시설 찾기 지도`);
    $('#me').innerHTML=`<span class="me-avatar">${avatar()}</span><span class="me-name">${hasPet?esc(josa.name(pet.name)):'아이 등록'}</span>`;
    $('#me').setAttribute('aria-label',`${hasPet?pet.name+' 메뉴':'아이 메뉴'} 열기`);
    const accountAction=user
      ?`<button type="button" id="logout"><svg class="i" aria-hidden="true"><use href="#i-user"/></svg><span>로그아웃</span></button>`
      :`<a href="inbox.html"><svg class="i" aria-hidden="true"><use href="#i-user"/></svg><span>로그인</span></a>`;
    const petSwitch=state.pets&&state.pets.length>1
      ?`<div class="pet-switch">${state.pets.map(p=>`<button type="button" data-pet-switch="${esc(p.id||p.name)}" ${p.id===state.activePetId?'aria-current="true"':''}>${esc(p.name||'이름 없음')}</button>`).join('')}</div>`
      :'';
    const points=(window.FPPoints&&FPPoints.get().points)||state.points||0;
    $('#profile-menu').innerHTML=hasPet
      ?`<span class="profile-menu-pet">${esc(josa.name(pet.name))} · <b class="tnum">${points}P</b></span>${petSwitch}
        <a href="profile.html"><svg class="i" aria-hidden="true"><use href="#i-edit"/></svg><span>아이 정보 수정</span></a>
        ${(state.pets||[]).length>=FREE_PETS&&!state.extraPetSlots?`<button type="button" data-act="pet-paywall"><svg class="i" aria-hidden="true"><use href="#i-lock"/></svg><span>아이 추가하기 (유료)</span></button>`:`<a href="profile.html?add=1"><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg><span>아이 추가하기</span></a>`}
        <a href="shop.html"><svg class="i" aria-hidden="true"><use href="#i-bone"/></svg><span>포인트 샵</span></a>
        <a href="intro.html"><svg class="i" aria-hidden="true"><use href="#i-paw"/></svg><span>farewell pet 이야기</span></a>${accountAction}`
      :`<a href="profile.html"><svg class="i" aria-hidden="true"><use href="#i-edit"/></svg><span>아이 등록</span></a><a href="intro.html"><svg class="i" aria-hidden="true"><use href="#i-paw"/></svg><span>farewell pet 이야기</span></a>${accountAction}`;
    $('#saved-count').textContent=state.saved.length;
    $('#saved-count').hidden=true;
    const si=$('#saved-inline');if(si)si.textContent=state.saved.length;
    renderMy();
    $('#map-title').textContent=`${hasPet?josa.name(pet.name):'우리 아이'} 맞춤 시설 찾기`;
    $('#map-hint').textContent=hasPet?`가고 싶은 곳을 누르면 ${josa.name(pet.name)}에게 맞는 곳을 찾아 드려요.`:'가고 싶은 곳을 누르면 우리 아이에게 맞는 곳을 찾아 드려요.';
    const facts=[];
    if(hasPet){
      if(pet.size||pet.weight)facts.push([pet.weight?`${pet.weight}kg · ${pet.size}`:pet.size]);
      if(pet.years!==''&&pet.years!=null)facts.push([`${pet.years}살`]);
      if(pet.breed)facts.push([pet.breed]);
      if(pet.concerns&&pet.concerns.length)facts.push([`건강 고민 ${pet.concerns.length}가지`,'sun']);
      if(pet.hasMedication==='있음')facts.push(['약 먹는 중','sun']);
      if(pet.mcpq&&pet.mcpq.type)facts.push([pet.mcpq.type,'type']);
      if(pet.dogs)facts.push([`다른 개와 ${pet.dogs.replace('요','').replace('잘 어울려','잘 어울림').replace('천천히 적응해','천천히 적응').replace('혼자가 편해','혼자가 편함')}`]);
      $('#pet-strip').innerHTML=facts.map(([t,c])=>`<span class="fact ${c||''}">${esc(t)}</span>`).join('')+`<a class="fact edit" href="profile.html">${icon('edit')}프로필 수정</a>`;
    }else{
      $('#pet-strip').innerHTML='';
    }
    registerNotice(!hasPet);
  }
  /* 아이 등록 전이면 화면 위에 알림창으로 안내한다. '나중에'를 누르면 이 탭에서는 다시 띄우지 않는다 */
  const NOTICE_KEY='fp-register-notice-closed';
  function registerNotice(show){
    let n=document.getElementById('reg-notice');
    let closed=false;try{closed=sessionStorage.getItem(NOTICE_KEY)==='1';}catch{}
    if(!show||closed){if(n)n.remove();return;}
    if(n)return;
    n=document.createElement('div');
    n.id='reg-notice';n.className='reg-notice';n.setAttribute('role','alertdialog');n.setAttribute('aria-labelledby','reg-notice-t');n.setAttribute('aria-describedby','reg-notice-d');
    n.innerHTML=`<span class="rn-face" aria-hidden="true">${Minimi.svg(Minimi.config({}))}</span><div class="rn-tx"><b id="reg-notice-t">우리 아이를 등록해 주세요</b><p id="reg-notice-d">몸무게, 약, 성격을 알려주시면 맞는 곳인지 하나씩 대조해 드려요.</p><div class="rn-act"><a class="btn btn-primary" href="profile.html">${icon('edit')}등록하기</a><button type="button" class="btn-ghost" data-rn-close>나중에</button></div></div><button type="button" class="icon-btn rn-x" data-rn-close aria-label="알림 닫기">${icon('close')}</button>`;
    n.addEventListener('click',e=>{if(!e.target.closest('[data-rn-close]'))return;try{sessionStorage.setItem(NOTICE_KEY,'1');}catch{}n.classList.add('out');setTimeout(()=>n.remove(),200);});
    document.body.append(n);
  }

  /* ---------- 산책 지도 ---------- */
  /* 맞춤 시설 찾기: 호텔·병원 / 유치원·미용실 네 곳만 2×2로, 가운데에 아이. 별들의 공간은 지도 아래 카드로,
     수의사 상담은 상단 메뉴의 '수의사 상담'(consult.html)에서 다룬다. intro 장면은 FP.NODES 원래 자리를 그대로 쓴다 */
  const HOME_LAYOUT={hotel:[-.56,-.92],hospital:[.56,-.92],kinder:[-.56,.78],grooming:[.56,.78]};
  const HOME_NODES=['hotel','hospital','kinder','grooming'].map(id=>{const n=FP.NODES.find(x=>x.id===id);return {...n,pos:HOME_LAYOUT[id],cpos:HOME_LAYOUT[id]};});
  const map=TrailMap.create($('#map'),{
    nodes:HOME_NODES,interactive:true,seed:23,trails:false,centerY:.5,
    label:`${josa.name(petName)} 맞춤 시설 찾기 지도`,
    center:()=>Minimi.svg(Minimi.config(pet),{inner:true}),
    onSelect:id=>{
      if(id==='consult'){location.href='consult.html';return;}
      map.walkTo(id,()=>openNode(id));
    }
  });

  /* 문의함 새 답장: 문의함을 마지막으로 연 뒤 업체가 보낸 메시지가 있으면 '마이' 탭에 빨간 점 */
  let inboxUnread=0;
  async function checkInbox(){
    inboxUnread=0;
    const c=window.FPChat&&FPChat.client;
    if(user&&c){
      try{
        let seen='1970-01-01T00:00:00Z';try{seen=localStorage.getItem('fp-inbox-seen:'+user.id)||seen;}catch{}
        const {data:convs,error}=await c.from('conversations').select('id').eq('guardian_id',user.id).gt('last_message_at',seen).limit(50);
        if(error)throw error;
        if(convs&&convs.length){
          const {count,error:e2}=await c.from('inquiry_messages').select('id',{count:'exact',head:true}).in('conversation_id',convs.map(x=>x.id)).eq('sender_role','facility').gt('created_at',seen);
          if(e2)throw e2;inboxUnread=count||0;
        }
      }catch(err){console.warn('문의함 새 답장을 확인하지 못했어요.',err);}
    }
    const tab=document.querySelector('.tabbar [data-view="my"]');
    if(tab){let d=tab.querySelector('.tab-dot');if(inboxUnread&&!d){d=document.createElement('i');d.className='tab-dot';tab.append(d);}if(!inboxUnread&&d)d.remove();tab.setAttribute('aria-label',inboxUnread?`마이, 새 답장 ${inboxUnread}개`:'마이');}
    renderMy();
  }
  /* 마이: 아이 정보와 가끔 확인하는 것들(찜한 곳·문의함·포인트샵·이야기) */
  function renderMy(){
    const el=$('#my-root');if(!el)return;
    const points=(window.FPPoints&&FPPoints.get().points)||state.points||0;
    const facts=hasPet?[pet.breed,pet.years!==''&&pet.years!=null?`${pet.years}살`:'',pet.weight?`${pet.weight}kg`:'',pet.size,pet.sex?pet.sex+(pet.neutered==='했어요'?' · 중성화':''):''].filter(Boolean).join(' · '):'';
    const row=(href,ic,label,sub,attr='')=>`<${href?`a href="${href}"`:`button type="button" ${attr}`} class="my-row">${icon(ic)}<span class="my-l">${label}</span>${sub?`<span class="my-sub tnum">${sub}</span>`:''}${icon('chev-right')}</${href?'a':'button'}>`;
    const pets=state.pets||[];
    const locked=pets.length>=FREE_PETS&&!state.extraPetSlots;
    const tile=p=>`<button type="button" class="pf-tile${p.id===state.activePetId||(!state.activePetId&&p.name===pet.name)?' on':''}" data-pet-switch="${esc(p.id||p.name)}" aria-label="${esc(p.name||'이름 없음')} 프로필로 바꾸기"${p.id===state.activePetId?' aria-current="true"':''}><span class="pf-av">${p.photo?`<img src="${p.photo}" alt="">`:Minimi.svg(Minimi.config(p))}</span><b>${esc(p.name||'이름 없음')}</b></button>`;
    const switcher=hasPet?`<section class="pf-switch" aria-label="아이 프로필 전환">
        <h2>누구의 하루를 볼까요?</h2>
        <div class="pf-row">${pets.map(tile).join('')}
          <${locked?'button type="button" data-act="pet-paywall"':'a href="profile.html?add=1"'} class="pf-tile pf-add"><span class="pf-av">${icon(locked?'lock':'plus')}</span><b>${locked?'아이 추가':'아이 추가'}</b>${locked?'<small>유료</small>':`<small>${pets.length}/${FREE_PETS} 무료</small>`}</${locked?'button':'a'}>
        </div>
      </section>`:'';
    el.innerHTML=`
      ${switcher}
      <section class="my-card">
        <span class="my-avatar">${avatar()}</span>
        <div class="my-who"><b>${hasPet?esc(josa.name(pet.name)):'아직 등록한 아이가 없어요'}</b><span>${hasPet?esc(facts||'프로필을 채워 주세요'):'몸무게, 약, 성격을 알려주시면 맞는 곳을 찾아 드려요.'}</span></div>
        <a class="btn btn-primary" href="profile.html">${icon('edit')}${hasPet?'프로필 수정':'아이 등록'}</a>
      </section>
      <nav class="my-list" aria-label="마이 메뉴">
        ${row('','heart','찜한 곳',`${state.saved.length}곳`,'data-view="saved"')}
        ${row('inbox.html','chat','문의함',inboxUnread?`<span class="new-badge">새 답장 ${inboxUnread}</span>`:'업체와 주고받은 대화')}
        ${row('shop.html','bone','포인트샵',`${points}P`)}
        ${row('intro.html','paw','farewell pet 이야기','')}
        ${user?row('','user','로그아웃','','data-logout'):row('inbox.html','user','로그인','')}
      </nav>`;
  }
  function renderStar(){
    const el=$('#star-card');if(!el)return;const st=SOON.star;
    el.innerHTML=`<svg class="star-art" viewBox="-60 -66 120 116" aria-hidden="true">${TrailMap.art('star')}</svg><div class="star-tx"><h2 id="star-title">${esc(st.title)}<span class="soon-tag">준비 중</span></h2><p>${esc(st.body)}</p><p class="muted">준비가 끝나면 여기에서 만날 수 있어요.</p></div>`;
  }
  renderStar();
  function openNode(id){
    if(FILTERS[id]){current=id;openFilter();}
    else if(id==='consult')location.href='consult.html';
    else if(SOON[id])openSoon(id);
  }

  /* ---------- 필터링 시트 ---------- */
  function needsFromPet(cat){
    const n=new Set();
    if(!hasPet)return n;
    if((cat==='hotel'||cat==='kinder')&&pet.hasMedication==='있음')n.add('투약 지원');
    if((cat==='hotel'||cat==='kinder')&&(pet.dogs==='혼자가 편해요'||pet.separation==='많이 불안해해요'))n.add('단독 돌봄');
    if(cat==='hotel'&&pet.separation==='많이 불안해해요')n.add('야간 관리');
    if(cat==='hospital'&&(Number(pet.years)>=Concerns.SENIOR_AGE||(pet.concerns||[]).includes('aging')))n.add('노령견 진료');
    return n;
  }
  function defaults(cat){
    const sel=new Set(needsFromPet(cat));
    if(pet.size&&cat!=='hospital')sel.add('size:'+pet.size);
    return {dist:3,region:'나주시',sel,auto:new Set(sel)};
  }
  function openFilter(){
    const cfg=FILTERS[current];
    const f=filterState[current]||(filterState[current]=defaults(current));
    $('#filter-title').textContent=`${cfg.title} 필터링`;
    const chip=(value,label,auto)=>`<label class="chip"><input type="checkbox" value="${esc(value)}" ${f.sel.has(value)?'checked':''}>${esc(label)}${auto?'<span class="auto">우리 아이</span>':''}</label>`;
    const needs=cfg.needs.length?`<section class="group needs"><h3>${esc(josa.of(petName))} 돌봄 조건 <small>${hasPet?'프로필에서 가져왔어요':'필요한 조건을 골라 주세요'}</small></h3><div class="chips">${cfg.needs.map(n=>chip(n,n,f.auto.has(n))).join('')}</div></section>`:'';
    $('#filter-form').innerHTML=`
      <section class="group"><h3>지역 <small id="dist-label">${DIST[f.dist-1]}까지</small></h3>
        <div class="range"><input type="range" min="1" max="5" step="1" value="${f.dist}" id="dist" aria-label="찾을 거리" aria-valuetext="${DIST[f.dist-1]}"></div>
        <div class="range-ends"><span>우리 동네</span><b>먼 동네</b></div>
        <label class="region"><span>${icon('pin')}특정 지역으로 검색하기</span><select id="region">${REGIONS.map(([g,rs])=>`<optgroup label="${g}">${rs.map(r=>`<option ${r===f.region?'selected':''}>${r}</option>`).join('')}</optgroup>`).join('')}</select></label>
        <p class="note">위치 연결 전이라 거리는 나주시는 빛가람동, 다른 지역은 시·군·구 중심가를 기준으로 어림한 값이에요.</p>
      </section>
      ${needs}
      ${cfg.groups.map(g=>`<section class="group"><h3>${esc(g.title)}</h3><div class="chips ${g.grid?'grid'+g.grid:''}">${g.opts.map(o=>chip(g.key==='size'?'size:'+o:o,o,f.auto.has(g.key==='size'?'size:'+o:o))).join('')}</div></section>`).join('')}`;
    const range=$('#dist');
    const paint=()=>{range.style.setProperty('--p',((range.value-1)/4*100)+'%');$('#dist-label').textContent=DIST[range.value-1]+'까지';range.setAttribute('aria-valuetext',DIST[range.value-1]);};
    range.addEventListener('input',paint);paint();
    updateCount();
    if(!$('#filter').open)$('#filter').showModal();
    $('#filter .sheet-body').scrollTop=0;
  }
  function readFilter(){
    const f=filterState[current];
    f.dist=+$('#dist').value;f.region=$('#region').value;
    f.sel=new Set([...$('#filter-form').querySelectorAll('input[type=checkbox]:checked')].map(i=>i.value));
    return f;
  }
  function updateCount(){
    const f=readFilter();const r=evaluate(current,f);
    $('#filter-apply').textContent=r.shown.length?`${r.shown.length}곳 보기`:'적용하기';
  }
  $('#filter-form').addEventListener('input',updateCount);
  $('#filter-form').addEventListener('change',updateCount);
  $('#filter-reset').addEventListener('click',()=>{filterState[current]={...defaults(current),sel:new Set(),auto:new Set()};openFilter();});
  $('#filter-form').addEventListener('submit',e=>{e.preventDefault();readFilter();$('#filter').close('next');openResults();});

  /* ---------- 조건 대조 ---------- */
  function check(place,req){
    if(req.startsWith('size:')){const s=req.slice(5);const v=place.sizes[s];return {req,label:v===false?`${s} 이용 불가`:v?`${s} 이용 가능`:`${s} 확인 필요`,v};}
    const v=place.attrs[req];
    return {req,label:v===false?`${req} 없음`:v?req:`${req} 확인 필요`,v};
  }
  function verdict(place,reqs){
    const sizeReqs=reqs.filter(r=>r.startsWith('size:')), rest=reqs.filter(r=>!r.startsWith('size:'));
    const rows=[];
    if(sizeReqs.length){const cs=sizeReqs.map(r=>check(place,r));const ok=cs.find(c=>c.v===true);rows.push(ok?ok:cs.every(c=>c.v===false)?cs[0]:cs.find(c=>c.v===undefined));}
    rest.forEach(r=>rows.push(check(place,r)));
    const status=!reqs.length?'none':rows.some(r=>r.v===false)?'no':rows.some(r=>r.v===undefined)?'unknown':'ok';
    return {rows,status};
  }
  function evaluate(cat,f){
    const reqs=[...f.sel];
    const pool=PLACES.filter(p=>p.kinds.includes(cat));
    const shown=pool.filter(p=>p.region===f.region&&p.dist<=f.dist).map(p=>({p,...verdict(p,reqs)}));
    return {reqs,shown,hiddenByDist:pool.filter(p=>p.region===f.region&&p.dist>f.dist).length};
  }

  /* ---------- 결과 ---------- */
  function thumb(p){return p.image?`<img src="${p.image}" alt="" loading="lazy">`:`<svg viewBox="-60 -70 120 130" aria-hidden="true">${TrailMap.art(kindArt(p))}</svg>`;}
  function kindArt(p){return {hotel:'hotel',care:'together',kindergarten:'kinder',grooming:'grooming',hospital:'hospital'}[p.cat];}
  const MARK={true:['ok','check'],false:['no','no'],undefined:['unknown','question']};
  /* ev: 보호자 이용기록 근거. 판정(ok/unknown/no)은 바꾸지 않고 옆에 덧붙인다 */
  function markRow(r,ev){const [c,i]=MARK[r.v];return `<li><span class="mark ${c}">${icon(i)}</span><span>${esc(r.label)}${ev?`<small class="ev ${ev.good?'good':'bad'}">${icon('heart')}${esc(ev.text)}</small>`:''}</span></li>`;}
  function card(x){
    const p=x.p, saved=state.saved.includes(p.id);
    const rows=(x.rows||[]).slice().sort((a,b)=>(a.v===false?0:a.v===undefined?1:2)-(b.v===false?0:b.v===undefined?1:2)).slice(0,3);
    return `<article class="place" data-id="${p.id}">
      <button type="button" class="place-main" data-open="${p.id}" aria-label="${esc(p.name)} 자세히 보기">
        <span class="thumb ${p.image?'photo':'art'}">${thumb(p)}</span>
        <span class="place-text">
          <span class="place-name">${esc(p.name)}${p.example?'<span class="ex">예시</span>':p.public?'<span class="ex pub">공공데이터</span>':''}</span>
          <span class="place-meta">${esc(p.address)}</span>${visitBadge(p)}
          ${rows.length?`<ul class="checks">${rows.map(r=>markRow(r)).join('')}</ul>`:`<span class="place-meta">${p.cat==='hospital'?'진료 조건은 병원에 확인해 주세요':'조건을 고르면 하나씩 대조해 드려요'}</span>`}
        </span>
      </button>
      <button type="button" class="icon-btn heart-btn" data-save="${p.id}" aria-pressed="${saved}" aria-label="${esc(p.name)} 찜하기">${icon('heart')}</button>
    </article>`;
  }
  function openResults(){
    const cfg=FILTERS[current], f=filterState[current], r=evaluate(current,f);lastResults=r;
    $('#results-title').textContent=`${cfg.title} ${r.shown.length}곳`;
    const labels=[f.region+' · '+DIST[f.dist-1]+'까지',...r.reqs.map(q=>q.replace('size:',''))];
    $('#applied').innerHTML=`<div class="applied-row">${labels.map(l=>`<span>${esc(l)}</span>`).join('')}</div><button type="button" class="btn-ghost" id="results-mode" aria-pressed="false">${icon('map')}지도로 보기</button><button type="button" class="btn-ghost" id="refilter">${icon('edit')}필터 다시 고르기</button>`;
    $('#refilter').onclick=back2filter;
    const groups=[['ok','조건에 맞아요'],['unknown','확인이 필요해요'],['none','둘러보기'],['no','조건이 맞지 않아요']];
    let html='';
    if(!r.shown.length){
      html=`<div class="empty">${Minimi.svg(Minimi.config(pet))}<b>${r.hiddenByDist?'이 거리 안에는 아직 등록된 곳이 없어요':`${esc(f.region)}의 ${esc(cfg.title)} 정보는 아직 모으고 있어요`}</b><p>${r.hiddenByDist?`거리를 넓히면 ${r.hiddenByDist}곳이 보여요.`:'공공데이터에 등록된 곳이 아직 없는 지역이에요. 가까운 다른 지역도 골라 보세요.'}</p><button type="button" class="btn btn-soft" id="widen">필터 다시 고르기</button></div>`;
    }else{
      groups.forEach(([k,t])=>{const list=r.shown.filter(x=>x.status===k);if(!list.length)return;html+=`<section class="result-group ${k}"><h3>${t} <span class="tnum">${list.length}</span></h3>${k==='unknown'?`<p class="note">물음표 항목은 업체에서 아직 확인되지 않은 정보예요. 문의할 때 꼭 물어보세요.</p>`:''}${list.map(card).join('')}</section>`;});
      if(r.hiddenByDist)html+=`<p class="note center">${r.hiddenByDist}곳은 더 먼 동네에 있어요. 거리를 넓히면 함께 보여요.</p>`;
      if(r.shown.some(x=>x.p.example))html+=`<p class="note center">‘예시’ 표시가 있는 곳은 화면 설명을 위한 가상의 업체예요.</p>`;
      if(r.shown.some(x=>x.p.public))html+=`<p class="note center">‘공공데이터’ 표시가 있는 곳은 지자체 인허가 자료에서 가져온 영업 중인 업체예요. 세부 조건은 아직 확인 전이에요.</p>`;
    }
    $('#results-body').innerHTML=`<div id="results-list">${html}</div><div id="results-map-wrap" hidden><div class="kmap kmap-tall" id="results-map">지도를 불러오는 중이에요.</div><p class="note center" id="results-map-note"></p></div>`;
    const real=r.shown.map(x=>x.p).filter(x=>!x.example);
    let mapDrawn=false;
    $('#results-mode').hidden=!real.length;
    $('#results-mode').onclick=async e=>{
      const btn=e.currentTarget,on=btn.getAttribute('aria-pressed')!=='true';
      btn.setAttribute('aria-pressed',on);
      btn.innerHTML=on?`${icon('list')}목록으로 보기`:`${icon('map')}지도로 보기`;
      $('#results-list').hidden=on;$('#results-map-wrap').hidden=!on;
      if(on&&!mapDrawn){
        mapDrawn=true;
        const res=await KMap.showMany($('#results-map'),real,openDetail);
        const note=$('#results-map-note');
        if(note)note.textContent=`핀을 누르면 업체 이름이 보여요.${res.missing?` ${res.missing}곳은 위치를 찾지 못해 목록에서만 보여요.`:''}`;
      }
    };
    const w=$('#widen');if(w)w.onclick=back2filter;
    /* 보호자가 알려 준 곳은 카드에 표시 */
    Reports.summaries(real.map(p=>p.id)).then(m=>Object.entries(m).forEach(([id,sum])=>{
      const t=document.querySelector(`#results-list .place[data-id="${CSS.escape(id)}"] .place-name`);
      if(t&&!t.querySelector('.rep-badge'))t.insertAdjacentHTML('beforeend',`<span class="ex rep-badge">보호자 ${sum.n}명이 알려 줬어요</span>`);
    }));
    if(!$('#results').open)$('#results').showModal();
    $('#results-body').scrollTop=0;
  }
  function back2filter(){$('#results').close('back');openFilter();}
  $('#results-back').addEventListener('click',back2filter);


  /* ---------- 산책 일기 연결 ---------- */
  function visitBadge(p){const v=Diary.forPlace(p.id)[0];if(!v)return '';return `<span class="visit ${v.mood}">${icon('book')}지난번 ${esc(Diary.MOODS[v.mood]||'다녀왔어요')}</span>`;}
  function diarySec(p){
    const vs=Diary.forPlace(p.id);
    return `<section class="d-sec diary-sec"><h3>${esc(josa.of(petName))} 산책 일기</h3>${vs.length?`<ul class="visits">${vs.slice(0,3).map(v=>`<li><span class="dt">${esc(v.date.slice(5).replace('-','/'))}</span><span class="mood ${v.mood}">${esc(Diary.MOODS[v.mood]||'')}</span>${v.text?`<span class="tx">${esc(v.text)}</span>`:''}</li>`).join('')}</ul>`:'<p class="muted">아직 다녀온 기록이 없어요. 다녀왔다면 일기로 남겨 두세요. 다음에 고를 때 함께 보여 드려요.</p>'}<button type="button" class="btn btn-soft" id="diary-write">${icon('edit')}다녀왔어요 · 일기 쓰기</button></section>`;
  }

  /* ---------- 상세 ---------- */
  let detailPlace=null;
  function openDetail(id){
    const p=PLACES.find(x=>x.id===id);if(!p)return;detailPlace=p;
    const f=filterState[current]||{sel:new Set()};
    const v=current&&p.kinds.includes(current)?verdict(p,[...f.sel]):{rows:[],status:'none'};
    const yes=k=>Object.entries(p.attrs).filter(([a,val])=>val===true&&k(a)).map(([a])=>a);
    const facilities=yes(a=>FACILITY_ICONS[a]&&!['주차장','반려동물 용품 판매','애견카페'].includes(a));
    const amen=yes(a=>['주차장','반려동물 용품 판매','애견카페'].includes(a));
    const services=yes(a=>!FACILITY_ICONS[a]);
    const unknown=Object.entries(p.attrs).filter(([,val])=>val===undefined).map(([a])=>a);
    const sizes=Object.entries(p.sizes).filter(([,val])=>val).map(([s])=>s);
    const info=`
      <section class="d-sec match"><h3>${esc(josa.of(petName))} 조건 대조</h3>${v.rows.length?`<ul class="checks big" id="match-list">${v.rows.map(r=>markRow(r)).join('')}</ul>`:`<p class="muted">필터에서 조건을 고르면 여기서 하나씩 대조해 드려요.</p>`}</section><div id="rep-wrap"></div>${diarySec(p)}
      <section class="d-sec"><h3>정보</h3><p class="line">${icon('clock')}${esc(p.hours||'영업시간은 아직 확인하지 못했어요. 방문 전에 전화로 확인해 주세요.')}</p>${sizes.length?`<p class="line">${icon('paw')}${sizes.map(esc).join(' · ')} 이용 가능</p>`:''}${p.description?`<p class="muted">${esc(p.description)}</p>`:''}</section>
      ${services.length?`<section class="d-sec"><h3>주요 서비스</h3><div class="tags">${services.map(s=>`<span>${esc(s)}</span>`).join('')}</div></section>`:''}
      ${facilities.length?`<section class="d-sec"><h3>돌봄 시설</h3><div class="facil">${facilities.map(a=>`<span>${icon(FACILITY_ICONS[a])}${esc(a)}</span>`).join('')}</div></section>`:''}
      ${amen.length?`<section class="d-sec"><h3>편의 시설</h3><div class="facil row">${amen.map(a=>`<span>${icon(FACILITY_ICONS[a])}${esc(a)}</span>`).join('')}</div></section>`:''}
      ${unknown.length||p.cat==='hospital'?`<section class="d-sec"><h3>아직 확인되지 않은 정보</h3><p class="muted">${p.cat==='hospital'?'진료 항목, 야간·응급 진료, 노령견 진료 여부는 아직 확인되지 않았어요. 방문 전에 전화로 확인해 주세요.':esc(unknown.join(', '))+'은(는) 업체에 문의해 확인해 주세요.'}</p></section>`:''}
      <section class="d-sec"><h3>위치</h3><p class="line">${icon('pin')}<span>${esc(p.address)}</span>${p.example?'':`<button type="button" class="icon-btn small" id="copy-addr" aria-label="주소 복사">${icon('copy')}</button>`}</p>${p.example?'':`<div class="kmap" id="detail-map" role="img" aria-label="${esc(p.name)} 위치 지도">지도를 불러오는 중이에요.</div><a class="btn btn-soft route-btn" id="route" href="${KMap.routeUrl(p)}" target="_blank" rel="noopener noreferrer">${icon('map')}카카오맵으로 길찾기</a><p class="note">${p.addrNote?esc(p.addrNote):p.lat?'인허가 자료의 등록 좌표로 표시한 위치예요. 방문 전에 입구를 한 번 더 확인해 주세요.':'주소를 기준으로 표시한 위치예요. 방문 전에 입구를 한 번 더 확인해 주세요.'}</p>`}</section>
      ${p.source?`<p class="source">정보 확인일 ${esc(p.checked)} · <a href="${p.source}" target="_blank" rel="noopener noreferrer">${esc(p.sourceLabel)} ${icon('external')}</a></p>`:p.checked?`<p class="source">정보 확인일 ${esc(p.checked)} · 출처: ${esc(p.sourceLabel||'')}</p>`:''}`;
    const price=p.prices?`${p.example?'<p class="note">예시 요금이에요. 실제 업체 요금이 아니에요.</p>':p.priceNote?`<p class="note">${esc(p.priceNote)}</p>`:''}${p.prices.map(([g,rows])=>`<section class="price"><h3>${esc(g)}</h3><dl>${rows.map(([k,val])=>`<div><dt>${esc(k)}</dt><dd class="tnum">${esc(val)}</dd></div>`).join('')}</dl></section>`).join('')}`:(p.cat==='hospital'?`<div class="empty small"><b>진료비는 병원마다 달라요</b><p>같은 진료라도 병원별 차이가 커요. 방문 전에 예상 비용을 꼭 물어보세요.</p></div>`:`<div class="empty small"><b>요금은 아직 확인 전이에요</b><p>미용 종류와 아이의 체중·털 상태에 따라 달라져요. 예약할 때 예상 요금을 물어보세요.</p></div>`);
    const reviews=`<div class="empty small">${icon('chat')}<b>아직 연결된 후기가 없어요</b><p>블로그 후기 연결은 준비 중이에요. 다녀온 뒤 산책 일기에 남겨 두면 다음 선택에 도움이 돼요.</p><button type="button" class="btn btn-soft" id="review-record">산책 일기 쓰기</button></div>`;
    $('#detail-body').innerHTML=`
      <div class="d-hero ${p.image?'photo':'art'}">${p.image?`<img src="${p.image}" alt="${esc(p.name)} 외관">`:`<svg viewBox="-80 -80 160 140" aria-hidden="true">${TrailMap.art(kindArt(p))}</svg>`}</div>
      <div class="d-title"><span class="kind">${esc(p.kindLabel||{hotel:'호텔',care:'가정 돌봄',kindergarten:'유치원',grooming:'미용실',hospital:'동물병원'}[p.cat])}</span><h2 id="detail-title">${esc(p.name)}${p.example?'<span class="ex">예시</span>':''}</h2>${v.status!=='none'?`<span class="status ${v.status}">${{ok:'조건에 맞아요',unknown:'확인이 필요해요',no:'조건이 맞지 않아요'}[v.status]}</span>`:''}</div>
      <div class="d-tabs" role="tablist">${['정보','요금','후기'].map((t,i)=>`<button type="button" role="tab" id="dt-${i}" aria-controls="dp-${i}" aria-selected="${i===0}">${t}</button>`).join('')}</div>
      <div class="d-panel" role="tabpanel" id="dp-0" aria-labelledby="dt-0">${info}</div>
      <div class="d-panel" role="tabpanel" id="dp-1" aria-labelledby="dt-1" hidden>${price}</div>
      <div class="d-panel" role="tabpanel" id="dp-2" aria-labelledby="dt-2" hidden>${reviews}</div>`;
    $('#detail-body').querySelectorAll('[role=tab]').forEach((t,i,all)=>t.addEventListener('click',()=>{all.forEach((x,j)=>{x.setAttribute('aria-selected',i===j);$('#dp-'+j).hidden=i!==j;});}));
    const ca=$('#copy-addr');if(ca)ca.onclick=()=>copy(p.address,'주소를 복사했어요.');
    $('#review-record').onclick=()=>{$('#detail').close();Diary.openForm({placeId:p.id});};
    const dw=$('#diary-write');if(dw)dw.onclick=()=>{$('#detail').close();Diary.openForm({placeId:p.id});};
    const call=$('#call');
    if(p.phone){call.href='tel:'+p.phone;call.removeAttribute('aria-disabled');call.title='';call.classList.remove('disabled');}
    else{call.removeAttribute('href');call.setAttribute('aria-disabled','true');call.classList.add('disabled');call.title=p.example?'예시 업체라 전화할 수 없어요':'전화번호 확인 전이에요';}
    heartState();
    if(!$('#detail').open)$('#detail').showModal();
    $('#detail-body').scrollTop=0;
    const dm=$('#detail-map');
    if(dm)KMap.showOne(dm,p,pos=>{const r=$('#route');if(r)r.href=KMap.routeUrl(p,pos);});
    /* 보호자 이용기록 집계를 불러와 조건 대조 옆에 근거로 붙인다 */
    const rw=$('#rep-wrap');
    if(rw&&!p.example)Reports.summaries([p.id]).then(m=>{
      if(detailPlace!==p||!rw.isConnected)return;
      const sum=m[p.id];rw.innerHTML=Reports.sectionHtml(p,sum,pet);
      const ml=$('#match-list');if(ml&&sum)ml.innerHTML=v.rows.map(r=>markRow(r,Reports.evidence(sum,r.req))).join('');
    });
  }
  function heartState(){const on=detailPlace&&state.saved.includes(detailPlace.id);$('#detail-heart').setAttribute('aria-pressed',on);$('#detail-heart').setAttribute('aria-label',on?'찜 해제':'찜하기');}
  $('#detail-heart').addEventListener('click',()=>toggleSave(detailPlace.id));
  $('#call').addEventListener('click',e=>{if($('#call').classList.contains('disabled')){e.preventDefault();toast(detailPlace&&detailPlace.example?'예시 업체라 전화 연결은 할 수 없어요.':'전화번호를 아직 확인하지 못했어요. 아래 출처 링크로 문의해 주세요.');}});
  $('#ask').addEventListener('click',()=>inquiry(detailPlace));

  /* ---------- 문의 · 기록 · 준비 중 (공용 시트) ---------- */
  function modal(title,body,foot,onSubmit){
    $('#modal-title').textContent=title;$('#modal-form').innerHTML=body;$('#modal-foot').innerHTML=foot;
    $('#modal-form').onsubmit=e=>{e.preventDefault();onSubmit&&onSubmit(new FormData($('#modal-form')));};
    if(!$('#modal').open)$('#modal').showModal();
  }
  function inquiryText(p,date){
    const lines=[`안녕하세요. ${josa.name(petName)} 보호자예요.`];
    const facts=[pet.breed,pet.years!==''&&pet.years!=null?`${pet.years}살`:'',pet.weight?`${pet.weight}kg`:'',pet.sex?pet.sex+(pet.neutered==='했어요'?'(중성화)':pet.neutered==='안 했어요'?'(중성화 안 함)':''):''].filter(Boolean).join(', ');
    if(facts)lines.push(`${josa.topic(petName)} ${facts}이에요.`);
    lines.push(`${date?date+'에 ':''}${p.cat==='hospital'?'진료':'이용'}가 가능할지 문의드려요.`);
    const asks=[];
    if(pet.concerns&&pet.concerns.length)asks.push(`건강 고민: ${Concerns.labels(pet.concerns).join(', ')}`);
    if(pet.hasMedication==='있음'&&pet.medications&&pet.medications.length)asks.push(`투약 도움: ${pet.medications.map(m=>[m.name,m.frequency,m.schedule].filter(Boolean).join(' ')).join(' / ')}`);
    if(pet.dogs)asks.push(`다른 개와는 ${pet.dogs.replace(/요$/,'')}요. 합사 방식이 궁금해요.`);
    if(pet.separation&&pet.separation!=='잘 기다려요')asks.push(`보호자와 떨어지면 ${pet.separation.replace(/요$/,'')}요.`);
    const f=current&&filterState[current];
    if(f){const v=verdict(p,[...f.sel]);v.rows.filter(r=>r.v===undefined).forEach(r=>asks.push(r.label.replace(' 확인 필요','')+' 가능 여부'));}
    if(asks.length)lines.push('','확인하고 싶은 점',...asks.map(a=>'- '+a));
    lines.push('','감사합니다.');
    return lines.join('\n');
  }
  async function inquiry(p){
    const chat=window.FPChat, open=chat?await chat.isAccepting(p.id):false;
    const fields=`<label class="field-l">희망 날짜<input type="date" name="date" id="ask-date"></label><label class="field-l">문의 내용<textarea name="memo" id="ask-memo" rows="9" maxlength="2000" required></textarea></label>`;
    if(open)modal('간편 돌봄문의',`<p class="muted">${esc(p.name)}에 보낼 문의를 ${esc(josa.of(petName))} 프로필로 미리 채웠어요. 보내면 아래 내용이 그대로 업체에 전달돼요. 건강이나 약 정보는 원하는 만큼만 남겨 주세요.</p>${fields}`,`<button type="submit" form="modal-form" class="btn btn-primary" id="ask-send">${icon('chat')}문의 보내기</button>`,fd=>sendAsk(p,fd.get('memo')));
    else modal('간편 돌봄문의',`<p class="muted">${esc(p.name)}에 보낼 문의를 ${esc(josa.of(petName))} 프로필로 미리 채웠어요. 이곳은 아직 앱으로 문의를 받지 않아요. 복사해서 문자나 메시지로 보내 주세요.</p>${fields}`,`<button type="submit" form="modal-form" class="btn btn-primary">${icon('copy')}문의 내용 복사하기</button>`,fd=>copy(fd.get('memo'),'문의 내용을 복사했어요.',true));
    const fill=()=>{$('#ask-memo').value=inquiryText(p,$('#ask-date').value?$('#ask-date').value.replace(/-/g,'.'):'');};
    $('#ask-date').addEventListener('change',fill);fill();
  }
  async function sendAsk(p,memo){
    const chat=window.FPChat, body=String(memo||'').trim();
    if(!body)return;
    const btn=$('#ask-send');if(btn)btn.disabled=true;
    const inquiry={facilityId:p.id,petName,body};
    try{
      if(!await chat.currentUser()){chat.savePending(inquiry);askLogin();return;}
      const id=await chat.sendInquiry(inquiry);
      location.href='inbox.html?c='+encodeURIComponent(id);
    }catch{
      if(btn)btn.disabled=false;
      toast('문의를 보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
    }
  }
  function askLogin(){
    window.FPAuth.open({onSuccess:()=>{location.href='inbox.html';}});
  }
  async function copy(text,msg,close){try{await navigator.clipboard.writeText(text);toast(msg);if(close)$('#modal').close();}catch{toast('복사하지 못했어요. 내용을 길게 눌러 직접 복사해 주세요.');}}
  function openSoon(id){
    const s=SOON[id];
    modal(s.title,`<div class="soon"><svg viewBox="-60 -66 120 116" aria-hidden="true">${TrailMap.art(s.kind)}</svg><span class="soon-tag">준비 중</span><p>${esc(s.body)}</p><p class="muted">${esc(s.note)}</p></div>`,`<button type="button" class="btn btn-primary" data-close>맞춤 시설 찾기로 돌아가기</button>`);
  }


  /* ---------- 찜 · 기록 화면 ---------- */
  function toggleSave(id){
    state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];save();
    document.querySelectorAll(`[data-save="${id}"]`).forEach(b=>b.setAttribute('aria-pressed',state.saved.includes(id)));
    heartState();renderHeader();if(view==='saved')renderSaved();
    toast(state.saved.includes(id)?'찜한 곳에 담았어요.':'찜한 곳에서 뺐어요.');
  }
  function renderSaved(){
    const list=state.saved.map(id=>PLACES.find(p=>p.id===id)).filter(Boolean);
    $('#saved-list').innerHTML=list.length?list.map(p=>card({p,rows:[]})).join(''):`<div class="empty">${Minimi.svg(Minimi.config(pet))}<b>아직 찜한 곳이 없어요</b><p>홈의 맞춤 시설 찾기에서 마음에 드는 곳의 하트를 눌러 담아 보세요.</p><button type="button" class="btn btn-soft" data-goto="map">홈으로 가기</button></div>`;
  }

  function setView(v){
    /* 산책 일기는 홈 왼쪽에 함께 있다 */
    if(v==='diary')v='map';
    view=v;
    document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-'+v);
    const tab=v==='saved'?'my':v;
    document.querySelectorAll('.tabbar button').forEach(b=>{if(b.dataset.view===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(v==='my')renderMy();
    if(v==='saved')renderSaved();if(v==='map'||v==='calendar')Daily.render();
    if(v==='map')map.redraw();
    window.scrollTo(0,0);
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click',e=>{
    const menu=$('#profile-menu'),menuButton=$('#me');
    const petSwitch=e.target.closest('[data-pet-switch]');
    if(petSwitch){e.preventDefault();switchPet(petSwitch.dataset.petSwitch);return;}
    if(!e.target.closest('.me-menu-wrap')){
      menu.hidden=true;
      menuButton.setAttribute('aria-expanded','false');
    }
    if(e.target.closest('#me')){
      menu.hidden=!menu.hidden;
      menuButton.setAttribute('aria-expanded',String(!menu.hidden));
      return;
    }
    if(e.target.closest('[data-act="pet-paywall"]')){
      modal('세 번째 아이부터는 유료예요',`<div class="soon"><p>아이 프로필은 두 마리까지 무료예요. 세 번째 아이부터는 유료 플랜으로 추가할 수 있어요.</p><p class="muted">결제 기능은 준비 중이에요. 열리면 바로 알려 드릴게요.</p></div>`,`<button type="button" class="btn btn-primary" data-close>알겠어요</button>`);
      return;
    }
    if(e.target.closest('[data-act="ai"]')){const t=document.querySelector('.ai-chat-toggle');if(t){t.click();}else toast('AI 상담을 불러오지 못했어요.');return;}
    if(e.target.closest('#logout,[data-logout]')){
      const client=window.FPChat&&window.FPChat.client;
      if(!client){toast('로그인 연결을 사용할 수 없어요.');return;}
      const button=e.target.closest('#logout,[data-logout]');
      button.disabled=true;
      client.auth.signOut().then(({error})=>{
        if(error){console.error('Unable to sign out.',error);toast('로그아웃하지 못했어요. 잠시 뒤 다시 시도해 주세요.');return;}
        const cacheCleared=FP.clearPetCache(state);
        Object.keys(pet).forEach(key=>delete pet[key]);
        user=null;hasPet=false;petName='우리 아이';lastPetSnapshot='{}';
        menu.hidden=true;
        menuButton.setAttribute('aria-expanded','false');
        Diary.updatePetProfile(pet,petName);Diary.setUser(null);Daily.updatePetProfile(pet,petName);Daily.setUser(null);
        renderHeader();map.redraw();
        toast(cacheCleared?'로그아웃했어요. 아이 정보는 계정에 저장돼 있어요.':'로그아웃했지만 이 기기의 아이 정보 캐시를 지우지 못했어요.');
      }).catch(error=>{
        console.error('Unable to sign out.',error);
        toast('로그아웃하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      }).finally(()=>{button.disabled=false;});
      return;
    }
    const t=e.target.closest('button,a');if(!t)return;
    if(t.dataset.view)setView(t.dataset.view);
    if(t.dataset.goto)setView(t.dataset.goto);
    if(t.dataset.save){e.stopPropagation();toggleSave(t.dataset.save);}
    if(t.dataset.open)openDetail(t.dataset.open);
    if(t.hasAttribute('data-close'))t.closest('dialog').close();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!$('#profile-menu').hidden){
      $('#profile-menu').hidden=true;
      $('#me').setAttribute('aria-expanded','false');
      $('#me').focus();
    }
  });
  
  document.querySelectorAll('dialog').forEach(d=>{
    d.addEventListener('click',e=>{if(e.target===d)d.close();});
    d.addEventListener('close',()=>{if(![...document.querySelectorAll('dialog')].some(x=>x.open))map.home();});
  });

  async function initializeProfile(){
    try{
      if(!window.FPChat||!FPChat.client)throw new Error('supabase_unavailable');
      const result=await FPChat.loadPetProfile(legacyPet);
      user=result.user;
      const payload=result.pet||legacyPet;
      if(payload&&payload._pets){
        state.pets=payload._pets;
        state.activePetId=payload._activePetId||payload._pets[0].id||payload._pets[0].name;
      }else if(payload&&payload.name){
        const id=payload.id||payload.name;
        payload.id=id;
        state.pets=[payload];
        state.activePetId=id;
      }
      const active=state.pets.find(p=>p.id===state.activePetId)||state.pets[0];
      if(active)Object.assign(pet,active);
      if(user){
        state.pet=pet;
        FP.markSignedIn(state);
        if(!FP.save(state))toast('아이 정보는 계정에 저장돼 있지만 이 기기에 표시용 정보를 저장하지 못했어요.');
      }
    }catch(error){
      console.error('Unable to load pet profile.',error);
      if(legacyPet.name){
        Object.assign(pet,legacyPet);
        toast('계정 정보를 불러오지 못해 이 기기에 저장된 아이 정보로 표시해요.');
      }else toast('아이 정보를 불러오지 못했어요. 연결을 확인해 주세요.');
    }
    hasPet=!!pet.name;
    petName=hasPet?pet.name:'우리 아이';
    lastPetSnapshot=JSON.stringify(pet);
    Diary.init({state,save,PLACES,pet,petName,modal,toast,setView,user,close:()=>$('#modal').close()});
    Daily.init({state,save,pet,petName,modal,toast,user,setView,close:()=>$('#modal').close()});
    renderHeader();map.redraw();
    checkInbox();
    const go=new URLSearchParams(location.search).get('go');
    if(go==='diary')setView('diary');
    if(['calendar','health','my','saved'].includes(go))setView(go);
    if(go&&FILTERS[go])setTimeout(()=>map.walkTo(go,()=>openNode(go)),500);
  }
  initializeProfile();
})();
