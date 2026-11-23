/* 건강토픽: 몸 부위로 모은 보호자 이야기. 프로필의 건강 고민·나이·약으로 토픽을 미리 구독해 둔다.
   게시글 수와 글은 화면 설명용 예시다. 진단이 아니라 경험 나눔·상담 연결용이다. */
(function(){
  const {icon,esc,toast}=FP;
  const $=s=>document.querySelector(s);
  const STORE='farewell-pet-topics-v1';

  /* 옆모습 강아지 한 장. 고른 부위만 진노랑으로 칠한다(진노랑·파랑은 강아지 눈에도 잘 보이는 색). */
  const PARTS={
    brain:'<ellipse cx="60" cy="35" rx="12" ry="8.5"/>',
    eye:'<circle cx="47" cy="45" r="5.6"/>',
    ear:'<path d="M66 30c8-4 15 2 14 12-1 9-5 16-10 17-5 0-7-8-7-16 0-6 0-11 3-13z"/>',
    teeth:'<path d="M24 61h21c1 0 1.5 1 1 2-2 4-6 5-11 5s-9-1-11-5c-.5-1 0-2 0-2z"/>',
    breath:'<ellipse cx="100" cy="70" rx="14" ry="11"/>',
    heart:'<path d="M88 69c-2-4-8-3-8 2 0 4 8 9 8 9s8-5 8-9c0-5-6-6-8-2z"/>',
    digest:'<ellipse cx="124" cy="84" rx="15" ry="8.5"/>',
    kidney:'<path d="M141 61c3-4 10-3 11 2 1 4-2 8-6 8-2 0-2-2-4-2s-3 1-4-1c-1-3 1-5 3-7z"/>',
    joint:'<circle cx="86" cy="106" r="5.5"/><circle cx="148" cy="104" r="5.5"/>',
    skin:'<path d="M98 51c14-5 40-6 58-1 3 1 3 5 0 6-18 4-42 4-58 1-3-1-3-5 0-6z"/>',
    lump:'<circle cx="110" cy="97" r="4.6"/>'
  };
  function dog(part,{interactive=false,label=''}={}){
    const regions=Object.entries(PARTS).map(([k,d])=>{
      const on=k===part;
      if(!interactive&&!on)return '';
      return interactive
        ?`<g class="rg${on?' on':''}" data-part="${k}" tabindex="0" role="button" aria-label="${esc(PART_INFO[k].name)}" aria-pressed="${on}">${d}</g>`
        :`<g class="rg on">${d}</g>`;
    }).join('');
    return `<svg class="dog" viewBox="0 0 200 140" ${label?`role="img" aria-label="${esc(label)}"`:'aria-hidden="true"'}>
      <path class="d-tail" d="M164 64c10-4 16-14 22-26"/>
      <g class="d-body">
        <rect x="78" y="86" width="13" height="40" rx="6.5"/><rect x="141" y="84" width="13" height="42" rx="6.5"/>
        <rect x="93" y="88" width="12" height="36" rx="6" class="d-far"/><rect x="155" y="86" width="12" height="38" rx="6" class="d-far"/>
        <ellipse cx="120" cy="74" rx="50" ry="25"/>
        <path d="M70 66c-6-10-8-20-6-30l22 22z"/>
        <circle cx="58" cy="46" r="23"/>
        <path d="M44 50h-18c-5 0-7 4-6 8s4 8 9 9h17z"/>
      </g>
      <circle class="d-nose" cx="21" cy="55" r="4.2"/>
      <circle class="d-eye" cx="47" cy="45" r="2.7"/>
      <path class="d-ear" d="M66 30c8-4 15 2 14 12-1 9-5 16-10 17-5 0-7-8-7-16 0-6 0-11 3-13z"/>
      <path class="d-mouth" d="M30 63c4 2 9 2 13 0"/>
      ${regions}
    </svg>`;
  }

  const PART_INFO={
    general:{name:'종합 관리',sub:['홈케어','영양제','식이관리','투약'],emblem:'bowl'},
    eye:{name:'안구',sub:['백내장','녹내장','결막염','안구건조증']},
    ear:{name:'귀',sub:['외이염','청력 저하']},
    teeth:{name:'치아·구강',sub:['치주질환','스케일링','구취']},
    brain:{name:'뇌신경·인지',sub:['인지장애','특발성 간질','수면 변화']},
    heart:{name:'심장',sub:['이첨판 폐쇄부전증','심장약']},
    breath:{name:'호흡기',sub:['기관허탈','기침']},
    digest:{name:'소화기',sub:['췌장염','장염','변비·설사']},
    kidney:{name:'신장·비뇨',sub:['신부전','요로결석','방광염']},
    joint:{name:'근골격',sub:['슬개골탈구','관절염','디스크']},
    skin:{name:'피부',sub:['아토피','알레르기','핫스팟']},
    lump:{name:'혹·종양',sub:['유선종양','지방종']}
  };
  /* 건강 고민(concerns.js) id → 부위 */
  const CONCERN_PART={eye:'eye',ear:'ear',teeth:'teeth',cog:'brain',heart:'heart',breath:'breath',digest:'digest',kidney:'kidney',joint:'joint',skin:'skin',lump:'lump',aging:'general',weight:'general',food:'general',immune:'general'};

  /* 토픽: 종합 관리 토픽은 서로 다른 아이콘을 줘서 한눈에 구분되게 한다. 수치는 예시. */
  const T=(id,name,part,posts,extra={})=>({id,name,part,posts,...extra});
  const TOPICS=[
    T('homecare','홈케어','general',1768,{icon:'home'}),
    T('supp','영양제','general',1404,{icon:'pill'}),
    T('diet','식이관리','general',932,{icon:'bowl'}),
    T('walk','산책·운동','general',688,{icon:'walk'}),
    T('hospital','병원 고르기','general',359,{icon:'building-h'}),
    T('meds','투약','general',220,{icon:'clock'}),
    T('senior','노령견 돌봄','general',512,{icon:'leaf'}),
    T('stay','맡기기·호텔','general',301,{icon:'building'}),
    T('cataract','백내장','eye',96),T('glaucoma','녹내장','eye',41),T('conj','결막염','eye',22),T('dryeye','안구건조증','eye',18),
    T('otitis','외이염','ear',84),T('hearing','청력 저하','ear',27),
    T('perio','치주질환','teeth',143),T('scaling','스케일링','teeth',121),T('breathodor','구취','teeth',38),
    T('ccd','인지장애','brain',77),T('epilepsy','특발성 간질','brain',31),T('sleep','수면 변화','brain',24),
    T('mvd','이첨판 폐쇄부전증','heart',158),T('heartmed','심장약','heart',66),
    T('trachea','기관허탈','breath',104),T('cough','기침','breath',35),
    T('pancreatitis','췌장염','digest',131),T('enteritis','장염','digest',72),T('stool','변비·설사','digest',90),
    T('ckd','신부전','kidney',167),T('stone','요로결석','kidney',58),T('cystitis','방광염','kidney',29),
    T('patella','슬개골탈구','joint',116),T('arthritis','관절염','joint',97),T('disc','디스크','joint',63),
    T('atopy','아토피','skin',110),T('allergy','알레르기','skin',88),T('hotspot','핫스팟','skin',19),
    T('mammary','유선종양','lump',47),T('lipoma','지방종','lump',36)
  ];
  const byId=Object.fromEntries(TOPICS.map(t=>[t.id,t]));
  const partPosts=p=>TOPICS.filter(t=>t.part===p).reduce((a,t)=>a+t.posts,0);

  /* 토픽에서 시설 고르기로 이어지는 조건 */
  const CARE={
    patella:{conds:['미끄럽지 않은 바닥','계단·소파 점프 제한','짧게 여러 번 산책'],go:'hotel'},
    arthritis:{conds:['미끄럽지 않은 바닥','푹신한 잠자리','짧게 여러 번 산책'],go:'hotel'},
    disc:{conds:['안아서 옮기기','점프 놀이 제한','하네스 사용'],go:'hotel'},
    ckd:{conds:['투약 지원','물 섭취 기록','처방식 지참 허용'],go:'hotel'},
    mvd:{conds:['투약 지원','흥분·과격한 놀이 피하기','야간 관리'],go:'hotel'},
    trachea:{conds:['하네스 사용','더운 시간 산책 피하기','짖음 많은 합사 피하기'],go:'kinder'},
    pancreatitis:{conds:['간식 금지 지켜 주기','처방식 지참 허용','구토·설사 바로 알림'],go:'hotel'},
    ccd:{conds:['단독 돌봄','야간 관리','익숙한 담요 지참'],go:'hotel'},
    cataract:{conds:['가구 배치 바꾸지 않기','단독 돌봄','안약 투약 지원'],go:'hotel'},
    meds:{conds:['투약 지원','투약 시각 기록','약 보관(냉장)'],go:'hotel'},
    senior:{conds:['단독 돌봄','야간 관리','응급 병원 연계'],go:'hotel'},
    stay:{conds:['단독 돌봄','합사 방식 확인','사진·영상 공유'],go:'hotel'},
    hospital:{conds:['야간 진료','노령견 진료 경험','주차'],go:'hospital'},
    atopy:{conds:['샴푸·약욕 지참 허용','알레르기 간식 금지'],go:'grooming'}
  };
  const GO_LABEL={hotel:'호텔',kinder:'유치원',hospital:'병원',grooming:'미용실'};

  /* 상태 */
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORE))||{};}catch{return {};}};
  const store={subs:[],off:[],...read()};
  const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(store));}catch{}};

  const real=FP.load().pet||{};
  const hasPet=!!real.name;
  const pet=hasPet?real:{name:'초롱',years:11,breed:'믹스',weight:13,concerns:['joint','kidney','aging'],hasMedication:'있음'};
  const petName=FP.call(pet.name);

  /* 프로필이 정해 준 토픽과 그 이유 */
  function auto(){
    const out=new Map();
    const add=(id,why)=>{if(byId[id]&&!out.has(id))out.set(id,why);};
    const first={eye:'cataract',ear:'otitis',teeth:'perio',brain:'ccd',heart:'mvd',breath:'trachea',digest:'stool',kidney:'ckd',joint:'patella',skin:'atopy',lump:'mammary'};
    (pet.concerns||[]).forEach(c=>{
      const p=CONCERN_PART[c];if(!p)return;
      const label=PART_INFO[p].name;
      if(c==='aging')add('senior','건강 고민에서 ‘노화’를 골랐어요');
      else if(c==='weight'||c==='food')add('diet','건강 고민에서 식욕·체중을 골랐어요');
      else if(c==='immune')add('supp','건강 고민에서 ‘면역력’을 골랐어요');
      else if(first[p])add(first[p],`건강 고민에서 ‘${label}’을 골랐어요`);
      if(p==='joint')add('arthritis','건강 고민에서 ‘근골격’을 골랐어요');
    });
    if(Number(pet.years)>=8){add('senior',`${pet.years}살, 노령기에 들어섰어요`);add('ccd',`${pet.years}살부터는 인지 변화를 함께 살펴요`);}
    if(pet.hasMedication==='있음')add('meds','먹는 약이 있다고 알려 주셨어요');
    if(Number(pet.weight)&&Number(pet.weight)<5)add('patella','소형견에서 흔한 편이에요');
    add('homecare','모든 보호자가 함께 보는 토픽이에요');
    return out;
  }
  const AUTO=auto();
  const isSub=id=>(AUTO.has(id)&&!store.off.includes(id))||store.subs.includes(id);
  function toggle(id){
    if(isSub(id)){store.subs=store.subs.filter(x=>x!==id);if(AUTO.has(id)&&!store.off.includes(id))store.off.push(id);toast(`‘${byId[id].name}’ 구독을 껐어요.`);}
    else{store.off=store.off.filter(x=>x!==id);if(!AUTO.has(id))store.subs.push(id);toast(`‘${byId[id].name}’ 새 글을 알려 드릴게요.`);}
    persist();render();if($('#topic').open)openTopic(id);
  }

  const n=v=>v.toLocaleString('ko-KR');
  const topicIcon=t=>t.part==='general'
    ?`<span class="t-ico gen">${icon(t.icon)}</span>`
    :`<span class="t-ico">${dog(t.part)}</span>`;
  const subBtn=t=>`<button type="button" class="sub${isSub(t.id)?' on':''}" data-sub="${t.id}" aria-pressed="${isSub(t.id)}" aria-label="${esc(t.name)} ${isSub(t.id)?'구독 중':'구독하기'}">${isSub(t.id)?icon('check')+'구독 중':icon('plus')+'구독'}</button>`;
  const row=(t,why)=>`<li class="t-row">
      <button type="button" class="t-open" data-topic="${t.id}">${topicIcon(t)}<span class="t-txt"><b>${esc(t.name)}</b><small>${esc(PART_INFO[t.part].name)} · 게시글 <span class="tnum">${n(t.posts)}</span></small>${why?`<em>${icon('sparkle')}${esc(why)}</em>`:''}</span></button>
      ${subBtn(t)}
    </li>`;

  let part='joint';
  function render(){
    const mine=[...AUTO.keys()].filter(id=>!store.off.includes(id)).concat(store.subs.filter(id=>!AUTO.has(id)));
    const hot=[...TOPICS].sort((a,b)=>b.posts-a.posts).slice(0,9);
    const parts=Object.keys(PART_INFO);
    $('#topics-app').innerHTML=`
      <section class="t-hero">
        <div>
          <p class="eyebrow">${icon('heart')} 건강토픽</p>
          <h1>${esc(petName)}에게 맞춘 이야기부터 보여 드려요</h1>
          <p class="lead">프로필의 건강 고민, 나이, 먹는 약으로 토픽을 미리 구독해 두었어요. 필요 없으면 끄면 돼요.</p>
          ${hasPet?'':`<p class="demo-note">${icon('question')} 아직 등록한 아이가 없어 예시(초롱이 · 11살 · 관절·신장 고민)로 보여 드려요. <a href="profile.html">우리 아이 등록하기</a></p>`}
        </div>
      </section>

      <section class="t-sec" aria-labelledby="mine-h">
        <div class="t-sec-head"><h2 id="mine-h">${esc(petName)}의 토픽</h2><span class="count tnum">${mine.length}개 구독 중</span></div>
        ${mine.length?`<ul class="t-list mine">${mine.map(id=>row(byId[id],AUTO.get(id)||'직접 구독했어요')).join('')}</ul>`:`<p class="empty-line">구독한 토픽이 없어요. 아래에서 골라 보세요.</p>`}
      </section>

      <section class="t-sec" aria-labelledby="hot-h">
        <div class="t-sec-head"><h2 id="hot-h">지금 활발한 토픽</h2><span class="note">게시글 수는 예시예요</span></div>
        <ul class="t-list grid">${hot.map(t=>row(t)).join('')}</ul>
      </section>

      <section class="t-sec body-sec" aria-labelledby="body-h">
        <div class="t-sec-head"><h2 id="body-h">몸 부위로 찾기</h2><span class="note">그림에서 부위를 눌러 보세요</span></div>
        <div class="body-pick">
          <div class="body-art">${dog(part,{interactive:true,label:`강아지 몸 그림. 지금 ${PART_INFO[part].name} 선택됨`})}</div>
          <div class="body-panel" aria-live="polite">${panel(part)}</div>
        </div>
      </section>

      <section class="t-sec" aria-labelledby="all-h">
        <div class="t-sec-head"><h2 id="all-h">전체 건강토픽</h2></div>
        <div class="p-grid">${parts.map(p=>`
          <button type="button" class="p-card${p===part?' sel':''}" data-part-card="${p}">
            <span class="p-txt"><b>${esc(PART_INFO[p].name)}</b><small>게시글 <span class="tnum">${n(partPosts(p))}</span></small></span>
            <span class="p-art">${p==='general'?`${dog('')}<span class="emblem">${icon('bowl')}</span>`:dog(p)}</span>
            <span class="p-chips">${PART_INFO[p].sub.slice(0,3).map(s=>`<i>${esc(s)}</i>`).join('')}</span>
          </button>`).join('')}
        </div>
      </section>
      <p class="t-foot">${icon('question')} 토픽 글은 보호자 경험이에요. 진단이나 처방이 아니에요. 걱정되는 증상은 <a href="consult.html">수의사 상담</a>이나 다니는 병원에 물어봐 주세요.</p>`;
  }
  function panel(p){
    const list=p==='general'?TOPICS.filter(t=>t.part==='general'):TOPICS.filter(t=>t.part===p);
    return `<h3>${esc(PART_INFO[p].name)} <small class="tnum">게시글 ${n(partPosts(p))}</small></h3>
      <ul class="t-list">${list.map(t=>row(t,AUTO.get(t.id))).join('')}</ul>`;
  }
  function pickPart(p){
    part=p;
    $('.body-art').innerHTML=dog(p,{interactive:true,label:`강아지 몸 그림. 지금 ${PART_INFO[p].name} 선택됨`});
    $('.body-panel').innerHTML=panel(p);
    document.querySelectorAll('.p-card').forEach(c=>c.classList.toggle('sel',c.dataset.partCard===p));
  }

  /* 토픽 안: 예시 글 + 수의사 답변 + 시설 조건 */
  const TIERS=[['다이아','dia'],['골드','gold'],['실버','silver']];
  function posts(t){
    const nm=t.name;
    return [
      {who:'11살 믹스 보호자',when:'2시간 전',title:`${nm} 진단받고 산책은 얼마나 하세요?`,body:'짧게 여러 번 나누라는 말을 들었는데, 하루에 몇 번이 적당한지 궁금해요.',likes:24,vet:{name:'김OO 수의사',tier:TIERS[1],text:'아이마다 달라요. 산책 뒤 다리를 들거나 절면 시간을 줄이고, 하루 기록에 남겨 진료 때 보여 주세요.'}},
      {who:'8살 말티즈 보호자',when:'어제',title:`${nm} 관리하면서 바꾼 사료·간식 공유해요`,body:'바꾸기 전에 꼭 주치의와 상의했어요. 바꾼 뒤 2주 동안 배변을 기록했어요.',likes:41},
      {who:'13살 시추 보호자',when:'3일 전',title:`${nm} 있는 아이, 호텔 맡길 때 뭘 물어보셨어요?`,body:'투약 시간, 바닥 재질, 밤에 누가 있는지 물어봤어요. 체크리스트로 만들어 두면 편해요.',likes:57}
    ];
  }
  function openTopic(id){
    const t=byId[id];if(!t)return;
    const care=CARE[id];
    $('#topic-title').textContent=t.name;
    $('#topic-body').innerHTML=`
      <div class="tp-head">${topicIcon(t)}<div><b>${esc(t.name)}</b><small>${esc(PART_INFO[t.part].name)} · 게시글 <span class="tnum">${n(t.posts)}</span></small>${AUTO.get(id)?`<em>${icon('sparkle')}${esc(AUTO.get(id))}</em>`:''}</div>${subBtn(t)}</div>
      ${care?`<div class="tp-care">
        <h3>${icon('paw')} ${esc(t.name)} 있는 아이를 맡길 때 볼 조건</h3>
        <div class="tp-conds">${care.conds.map(c=>`<span>${icon('check')}${esc(c)}</span>`).join('')}</div>
        <a class="btn btn-soft" href="index.html?go=${care.go}">${icon('map')} 이 조건으로 ${GO_LABEL[care.go]} 찾기</a>
      </div>`:''}
      <h3 class="tp-sub">보호자 이야기 <small>예시 글</small></h3>
      <ul class="tp-posts">${posts(t).map(p=>`<li>
        <p class="tp-meta">${esc(p.who)} · ${esc(p.when)}</p>
        <b>${esc(p.title)}</b><p>${esc(p.body)}</p>
        ${p.vet?`<div class="tp-vet"><span class="tier ${p.vet.tier[1]}">${esc(p.vet.tier[0])}</span><span><b>${esc(p.vet.name)} 답변</b>${esc(p.vet.text)}</span></div>`:''}
        <p class="tp-like">${icon('heart')} <span class="tnum">${p.likes}</span></p>
      </li>`).join('')}</ul>
      <div class="tp-actions"><button type="button" class="btn btn-primary" id="write">${icon('edit')} 글쓰기</button><a class="btn btn-soft" href="consult.html">${icon('chat')} 수의사에게 묻기</a></div>
      <p class="t-foot">보호자 경험 나눔이에요. 진단이나 처방이 아니에요.</p>`;
    if(!$('#topic').open)$('#topic').showModal();
    $('#topic-body').scrollTop=0;
  }

  document.addEventListener('click',e=>{
    const s=e.target.closest('[data-sub]');if(s){toggle(s.dataset.sub);return;}
    const o=e.target.closest('[data-topic]');if(o){openTopic(o.dataset.topic);return;}
    const r=e.target.closest('.rg[data-part]');if(r){pickPart(r.dataset.part);return;}
    const c=e.target.closest('[data-part-card]');if(c){pickPart(c.dataset.partCard);$('.body-sec').scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(e.target.closest('[data-close]')){e.target.closest('dialog').close();return;}
    if(e.target.id==='write'||e.target.closest('#write'))toast('글쓰기는 시안이라 아직 저장되지 않아요.');
  });
  document.addEventListener('keydown',e=>{
    const r=e.target.closest&&e.target.closest('.rg[data-part]');
    if(r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pickPart(r.dataset.part);document.querySelector(`.rg[data-part="${r.dataset.part}"]`)?.focus();}
  });
  $('#topic').addEventListener('click',e=>{if(e.target===$('#topic'))$('#topic').close();});

  window.FPDog=dog;
  render();
})();
