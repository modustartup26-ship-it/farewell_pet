/* 하루 기록: 산책 일기의 메인 화면.
   밥·산책·배변·영양제·간식·놀이·물을 버튼 한 번으로 남기고, 산책·놀이·물을 링으로 채운다.
   시설 방문 일기(diary.js)는 '시설 기록' 창에서 따로 연다.
   로그인하면 daily_logs 테이블에 저장하고, 로그인하지 않으면 이 기기 브라우저에 둔다(FP의 게스트 저장). */
(function(){
  const {esc,icon,josa,toast}=FP;
  const WEEK=['일','월','화','수','목','금','토'];
  const pad=n=>String(n).padStart(2,'0');
  const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
  const today=()=>ymd(new Date());
  const nowHM=()=>{const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}`;};
  const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ymd(d);};
  const nice=s=>{const d=parse(s);return `${d.getMonth()+1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`;};

  /* ---------- 기록 종류 ---------- */
  const obj=w=>{const c=String(w).slice(-1).charCodeAt(0)-0xAC00;return c>=0&&c<11172&&c%28?'을':'를';};
  const TYPES={
    meal:{label:'밥',icon:'bowl',c:'#E89B2A'},
    walk:{label:'산책',icon:'walk',c:'#FF6B3D'},
    poop:{label:'배변',icon:'poop',c:'#8B5A2B'},
    supp:{label:'영양제',icon:'pill',c:'#7C5CD6'},
    snack:{label:'간식',icon:'bone',c:'#D9668A'},
    play:{label:'놀이',icon:'ball',c:'#5DAE2E'},
    water:{label:'물',icon:'drop',c:'#2BA7D9'},
    photo:{label:'사진',icon:'camera',c:'#13305F'}
  };
  const MEAL_AMT=['다 먹었어요','절반쯤','조금','안 먹었어요'];
  const PLAY_KIND=['터그 놀이','노즈워크·찾기','공 던지기','실내 달리기','친구랑 놀기','훈련·개인기'];
  /* 대변 모양: 브리스톨 척도를 5단계로 줄인 것 */
  const SHAPES=[
    {k:1,l:'딱딱해요',d:'토끼똥처럼 작고 단단'},
    {k:2,l:'조금 단단',d:'갈라진 덩어리'},
    {k:3,l:'좋아요',d:'촉촉하고 모양 유지'},
    {k:4,l:'무른 편',d:'모양이 퍼짐'},
    {k:5,l:'설사',d:'물처럼 흐름'}
  ];
  const COLORS=[
    {k:'brown',l:'갈색',hex:'#8B5A2B',ok:true},
    {k:'dark',l:'진한 갈색',hex:'#5A3A1E',ok:true},
    {k:'yellow',l:'노란빛',hex:'#D3A33A'},
    {k:'green',l:'초록빛',hex:'#6E8B3D'},
    {k:'black',l:'검은색',hex:'#231C18',alarm:true},
    {k:'red',l:'붉은빛',hex:'#B0342C',alarm:true},
    {k:'gray',l:'회백색',hex:'#CFC6B3',alarm:true}
  ];
  const FLAGS=['피가 보여요','점액이 있어요','이물질이 보여요','힘들게 눴어요'];
  const PEE=['맑은 노란색','진한 노란색','붉은빛','양이 아주 많아요','자주 마려워해요'];

  /* ---------- 견종·체급·나이·체형으로 산책 권장 범위 ----------
     흔히 쓰이는 일반 권장 범위(하루 총 산책 시간)를 참고값으로 둔다. 진료 기준이 아니다. */
  const GROUPS={
    toy:{name:'초소형·토이',lo:20,hi:40,play:15},
    small:{name:'소형 반려견',lo:30,hi:60,play:20},
    flat:{name:'단두종',lo:20,hi:40,play:15,heat:true},
    medium:{name:'활동적인 중형견',lo:60,hi:90,play:25},
    working:{name:'에너지 많은 작업견',lo:90,hi:120,play:30},
    mixS:{name:'소형 믹스견',lo:30,hi:60,play:20},
    mixM:{name:'중형 믹스견',lo:45,hi:90,play:25},
    mixL:{name:'대형 믹스견',lo:60,hi:120,play:30}
  };
  const BREED_GROUP={
    '치와와':'toy','요크셔테리어':'toy','말티즈':'toy','포메라니안':'toy',
    '푸들':'small','비숑프리제':'small','미니어처 슈나우저':'small','닥스훈트':'small','카발리에':'small','스피츠':'small',
    '시추':'flat','퍼그':'flat','프렌치불독':'flat',
    '코카스패니얼':'medium','웰시코기':'medium','비글':'medium','시바견':'medium','진돗개':'medium',
    '보더콜리':'working','사모예드':'working','골든리트리버':'working','래브라도 리트리버':'working','저먼셰퍼드':'working'
  };
  const BODY=['마른 편','적당해요','통통한 편','비만이에요'];
  function groupKey(pet){
    const g=BREED_GROUP[pet.breed];if(g)return g;
    const s=pet.size||FP.sizeFromWeight(pet.weight);
    return s==='소형견'?'mixS':s==='대형견'?'mixL':'mixM';
  }
  function guide(pet){
    const key=groupKey(pet), g=GROUPS[key];
    const size=pet.size||FP.sizeFromWeight(pet.weight)||'중형견';
    const yrs=Number(pet.years)||0, mon=yrs*12+(Number(pet.months)||0);
    let lo=g.lo,hi=g.hi,stage='성견';const notes=[];
    if(pet.years!==''&&pet.years!=null&&mon<12){
      /* 어린 강아지: 개월 수 × 5분을 하루 두 번 */
      stage='어린 강아지';const m=Math.max(2,mon);lo=Math.min(hi,m*5);hi=Math.min(g.hi,m*10);if(lo>hi)lo=hi;
      notes.push(`어린 강아지는 개월 수 × 5분씩 하루 두 번이 흔히 쓰이는 기준이에요(${m}개월 → 한 번에 ${m*5}분).`);
    }else{
      const senior=size==='대형견'?7:size==='소형견'?10:8;
      if(yrs>=senior){stage='노령견';lo=Math.round(lo*.6/5)*5;hi=Math.round(hi*.75/5)*5;notes.push('노령견은 한 번에 오래 걷기보다 짧게 여러 번 나누는 편이 관절과 심장에 부담이 적어요.');}
    }
    if(g.heat)notes.push('코가 짧은 아이는 더위와 숨차는 데 약해요. 여름 한낮은 피하고 숨소리가 거칠면 쉬어 주세요.');
    if(pet.body==='통통한 편'||pet.body==='비만이에요')notes.push('체중 관리 중이라면 한 번에 늘리기보다 주마다 10%쯤씩 늘리고, 평지 위주로 걸어 주세요.'+(pet.body==='비만이에요'?' 목표 체중은 수의사와 함께 정하는 게 안전해요.':''));
    if(pet.concerns&&pet.concerns.length)notes.push('건강 고민이 있다면 이 범위보다 수의사 안내가 먼저예요.');
    const goal=Math.max(10,Math.round((lo+hi)/2/5)*5);
    const kg=Number(pet.weight);
    const water=kg?Math.round(kg*60/50)*50:size==='소형견'?250:size==='대형견'?1500:600;
    return {key,group:g.name,size,stage,lo,hi,goal,play:stage==='노령견'?Math.round(g.play*.7/5)*5:g.play,water,meals:stage==='어린 강아지'?3:2,notes};
  }
  /* 권장 범위를 평균, 범위 폭의 절반을 표준편차로 본 정규분포에서의 위치 (실제 기록이 쌓이기 전 추정) */
  function erf(x){const s=Math.sign(x);x=Math.abs(x);const t=1/(1+.3275911*x);const y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);return s*y;}
  function estimateTop(avg,g){const mean=(g.lo+g.hi)/2,sd=Math.max(8,(g.hi-g.lo)/2);const p=.5*(1+erf((avg-mean)/sd/Math.SQRT2));return Math.min(99,Math.max(1,Math.round((1-p)*100)));}

  /* ---------- 상태 ---------- */
  let ctx, day=today(), rankCache={};
  const cloud={user:null,client:null,off:false,mediaRows:new Map()};
  const logs=()=>ctx.state.daily;
  const onDay=d=>logs().filter(l=>l.date===d).sort((a,b)=>(b.time||'').localeCompare(a.time||''));
  function totals(d){
    const t={walk:0,km:0,play:0,water:0,meal:0,poop:0,pee:0,supp:0,snack:0,photo:0,walks:0};
    onDay(d).forEach(l=>{
      if(l.type==='walk'){t.walk+=Number(l.min)||0;t.km+=Number(l.km)||0;t.walks++;}
      else if(l.type==='play')t.play+=Number(l.min)||0;
      else if(l.type==='water')t.water+=Number(l.ml)||0;
      else if(l.type==='meal')t.meal++;
      else if(l.type==='poop'){if(l.kind!=='소변')t.poop++;if(l.kind!=='대변')t.pee++;}
      else if(l.type==='supp')t.supp+=Number(l.count)||1;
      else if(l.type==='snack')t.snack+=Number(l.count)||1;
      else if(l.type==='photo')t.photo++;
    });
    /* 업체 체크리스트가 남긴 산책 시간도 합친다 */
    (ctx.state.diary||[]).filter(e=>e.date===d&&e.source&&e.source!=='manual'&&e.activity&&Number(e.activity.walk_min)).forEach(e=>{t.walk+=Number(e.activity.walk_min);});
    return t;
  }
  function weekAvg(end){let sum=0,days=0;const first=logs().filter(l=>l.type==='walk').map(l=>l.date).sort()[0];if(!first)return null;for(let i=0;i<7;i++){const d=addDays(end,-i);if(d<first)break;sum+=totals(d).walk;days++;}return days?Math.round(sum/days):null;}

  /* ---------- 저장 ---------- */
  const fromRow=r=>({...(r.data||{}),id:r.client_id||r.id,serverId:r.id,type:r.type,date:r.log_date,time:r.log_time||'',mediaId:r.media_id||null});
  function toRow(l){const {id,serverId,type,date,time,mediaId,photo,...data}=l;return {client_id:id,type,log_date:date,log_time:time||'',data,media_id:mediaId||null};}
  async function dataUrlFile(url){const b=await (await fetch(url)).blob();return new File([b],'moment.jpg',{type:'image/jpeg'});}
  async function push(l){
    if(!cloud.user||cloud.off)return;
    try{
      if(l.type==='photo'&&l.photo&&!l.mediaId){const up=await Media.upload(cloud.client,await dataUrlFile(l.photo),{caption:l.stamp||''});l.mediaId=up.id;cloud.mediaRows.set(up.id,{id:up.id,path:up.path});}
      const {data,error}=await cloud.client.from('daily_logs').upsert(toRow(l),{onConflict:'guardian_id,client_id'}).select('id').single();
      if(error)throw error;
      l.serverId=data.id;if(l.mediaId)l.photo='';ctx.save();
    }catch(err){handleCloudError(err);}
  }
  async function drop(l){
    if(!cloud.user||cloud.off||!l.serverId)return;
    const {error}=await cloud.client.from('daily_logs').delete().eq('id',l.serverId);
    if(error)handleCloudError(error);
  }
  function handleCloudError(err){
    if(err&&(err.code==='42P01'||err.code==='PGRST205'||/daily_logs/.test(err.message||''))){cloud.off=true;console.warn('daily_logs 테이블이 없어 하루 기록은 이 기기에만 저장해요. supabase/migrations/20261116_daily_logs.sql 을 실행하세요.');return;}
    console.error(err);toast('계정에 저장하지 못했어요. 이 화면에는 남아 있어요.');
  }
  async function connect(user){
    cloud.user=user;cloud.client=window.FPChat&&FPChat.client;cloud.off=false;rankCache={};
    if(!user||!cloud.client){render();return;}
    try{
      const since=addDays(today(),-120);
      const {data,error}=await cloud.client.from('daily_logs').select('*').gte('log_date',since).order('log_date',{ascending:false}).limit(3000);
      if(error)throw error;
      const known=new Set(data.map(r=>r.client_id));
      const local=logs().filter(l=>!l.serverId&&!known.has(l.id));
      ctx.state.daily=data.map(fromRow).concat(local);ctx.save();
      local.forEach(push);
      const ids=[...new Set(ctx.state.daily.map(l=>l.mediaId).filter(Boolean))];
      if(ids.length){const {data:m}=await cloud.client.from('media').select('id,path').in('id',ids);(m||[]).forEach(r=>cloud.mediaRows.set(r.id,r));}
    }catch(err){handleCloudError(err);}
    render();
  }
  function add(l){
    const rec={id:'l'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),date:day,time:day===today()?nowHM():'12:00',...l};
    logs().push(rec);ctx.save();render();push(rec);return rec;
  }

  /* ---------- 링 ---------- */
  function ringsSvg(rings,{size=220,stroke=22,gap=4}={}){
    const c=size/2;let out='';
    rings.forEach((r,i)=>{
      const rad=c-stroke/2-i*(stroke+gap), len=2*Math.PI*rad, p=Math.max(0,r.p||0);
      const a1=Math.min(p,1), a2=Math.min(Math.max(p-1,0),1);
      out+=`<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.c}" stroke-opacity=".2" stroke-width="${stroke}"/>`;
      if(a1>0)out+=`<circle class="ring-arc" cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.c}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(a1*len).toFixed(1)} ${len.toFixed(1)}" style="--len:${len.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>`;
      if(a2>0)out+=`<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.c}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(a2*len).toFixed(1)} ${len.toFixed(1)}" transform="rotate(-90 ${c} ${c})" style="filter:brightness(1.25) drop-shadow(0 0 3px rgba(0,0,0,.5))"/>`;
    });
    return `<svg class="rings" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${out}</svg>`;
  }
  const RING_C=['#FF6B3D','#A8E63D','#3FC8F0'];

  /* ---------- 화면 ---------- */
  function render(){
    const root=document.querySelector('#daily');if(!root||!ctx)return;
    const pet=ctx.pet||{}, g=guide(pet), t=totals(day), name=ctx.petName;
    const goals=ctx.state.dailyGoals||{};
    const goal={walk:goals.walk||g.goal,play:goals.play||g.play,water:goals.water||g.water};
    const isToday=day===today();
    document.querySelector('#diary-title').textContent=`${josa.of(name)} 하루`;
    /* 이번 주 링 줄 */
    /* 최근 7일: 고른 날이 오래전이면 그 날을 가운데쯤에 둔다 */
    let end=addDays(day,3);if(end>today())end=today();const start=addDays(end,-6);
    const strip=[...Array(7)].map((_,i)=>{const d=addDays(start,i),tt=totals(d),fut=d>today();
      return `<button type="button" class="wk-day ${d===day?'on':''}" data-day="${d}" ${fut?'disabled':''} aria-label="${nice(d)}${fut?'':`, 산책 ${tt.walk}분`}"><span>${WEEK[parse(d).getDay()]}</span>${ringsSvg([{p:tt.walk/goal.walk,c:RING_C[0]},{p:tt.play/goal.play,c:RING_C[1]},{p:tt.water/goal.water,c:RING_C[2]}],{size:40,stroke:4.5,gap:1.5})}</button>`;}).join('');
    const avg=weekAvg(day);
    const live=ctx.state.walkLive;
    root.innerHTML=`
      <div class="day-nav">
        <button type="button" class="icon-btn" data-shift="-1" aria-label="전날">${icon('arrow-left')}</button>
        <b class="tnum">${isToday?'오늘 · ':''}${nice(day)}</b>
        <button type="button" class="icon-btn" data-shift="1" aria-label="다음날" ${isToday?'disabled':''}>${icon('chev-right')}</button>
      </div>
      <div class="wk-strip">${strip}</div>
      ${cloud.user?'':`<aside class="guest-bar"><p><b>로그인 없이 쓰는 중이에요</b>기록은 이 기기 브라우저에 남아서 창을 닫아도 이어 쓸 수 있어요. 로그인하면 계정으로 옮겨서 다른 기기에서도 볼 수 있어요.</p><div><button type="button" class="btn btn-soft" data-act="login">로그인하고 옮기기</button><button type="button" class="btn-ghost" data-act="wipe">이 기기 기록 지우기</button></div></aside>`}

      <section class="ring-card" aria-label="오늘 채운 링">
        <div class="ring-wrap">${ringsSvg([{p:t.walk/goal.walk,c:RING_C[0]},{p:t.play/goal.play,c:RING_C[1]},{p:t.water/goal.water,c:RING_C[2]}])}<span class="ring-face">${Minimi.svg(Minimi.config(pet),{shadow:false})}</span></div>
        <dl class="ring-legend">
          <div style="--c:${RING_C[0]}"><dt>${icon('walk')}산책</dt><dd class="tnum"><b>${t.walk}</b>/${goal.walk}분${t.km?`<small>${t.km.toFixed(2)}km</small>`:''}</dd></div>
          <div style="--c:${RING_C[1]}"><dt>${icon('ball')}놀이</dt><dd class="tnum"><b>${t.play}</b>/${goal.play}분</dd></div>
          <div style="--c:${RING_C[2]}"><dt>${icon('drop')}물</dt><dd class="tnum"><b>${t.water}</b>/${goal.water}ml</dd></div>
        </dl>
        <button type="button" class="ring-goal" data-act="goals">${icon('edit')}목표 바꾸기</button>
      </section>

      ${live?`<button type="button" class="live-bar" data-act="walk-open"><span class="dot"></span>산책 중 · <span class="tnum" id="live-mini">${fmtDur(liveMs(live))}</span><span class="sp"></span>돌아가기 ${icon('chev-right')}</button>`:''}

      <section class="quick" aria-label="빠른 기록">
        ${['meal','walk','poop','supp','snack','play','water','photo'].map(k=>{const T=TYPES[k];return `<button type="button" class="q-btn" data-log="${k}" style="--c:${T.c}"><span class="q-ic">${icon(T.icon)}</span><span class="q-l">${T.label}</span><span class="q-v tnum">${quickValue(k,t,goal,g)}</span></button>`;}).join('')}
      </section>

      ${healthNote(day)}
      ${momentsHtml(day)}

      <section class="compare">
        <div class="cmp-head"><h2>${esc(josa.of(name))} 산책, 또래와 비교하면</h2><button type="button" class="btn-ghost" data-act="body">${icon('user')}체형 ${esc(pet.body||'알려 주기')}</button></div>
        ${compareHtml(g,avg,t.walk)}
        <p class="cmp-basis"><i class="sw-band"></i>${esc(g.group)} · ${esc(g.size)} · ${esc(g.stage)}${pet.breed&&BREED_GROUP[pet.breed]?` · ${esc(pet.breed)}`:''} 기준 하루 권장 ${g.lo}~${g.hi}분</p>
        ${g.notes.length?`<ul class="cmp-notes">${g.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}
      </section>

      <section class="timeline-sec">
        <div class="cmp-head"><h2>${isToday?'오늘':'이날'} 기록</h2><button type="button" class="btn btn-soft fac-btn" data-act="facility">${icon('building-h')}시설 기록</button></div>
        ${timelineHtml(day)}
      </section>`;
    fillPhotos();
    loadRank(g,avg);
  }
  function quickValue(k,t,goal,g){
    return k==='meal'?`${t.meal}/${g.meals}끼`:k==='walk'?`${t.walk}분`:k==='poop'?`대${t.poop}·소${t.pee}`:k==='supp'?`${t.supp}개`:k==='snack'?`${t.snack}개`:k==='play'?`${t.play}분`:k==='water'?`${t.water}ml`:t.photo?`${t.photo}장`:'바로 찍기';
  }
  function compareHtml(g,avg,todayWalk){
    const max=Math.max(g.hi*1.4,(avg||0)*1.1,todayWalk*1.1,30);
    const pos=v=>Math.min(100,v/max*100).toFixed(1);
    const rank=rankCache[g.key+':'+avg];
    const top=avg!=null?(rank&&rank.pct!=null?rank.pct:estimateTop(avg,g)):null;
    const head=avg==null?`<p class="cmp-big"><b>아직 산책 기록이 없어요</b><span>산책을 한 번 남기면 같은 체급 아이들과 비교해 드려요.</span></p>`
      :`<p class="cmp-big"><span class="cmp-top">상위 <b class="tnum">${top}</b>%</span><span>최근 7일 하루 평균 <b class="tnum">${avg}분</b> · ${avg<g.lo?`권장보다 ${g.lo-avg}분 적어요`:avg>g.hi?`권장보다 ${avg-g.hi}분 많아요`:'권장 범위 안이에요'}</span></p>`;
    return `${head}
      <div class="gauge" role="img" aria-label="권장 ${g.lo}에서 ${g.hi}분${avg!=null?`, 평균 ${avg}분`:''}, 오늘 ${todayWalk}분">
        <span class="g-band" style="left:${pos(g.lo)}%;width:${(pos(g.hi)-pos(g.lo)).toFixed(1)}%"></span>
        ${avg!=null?`<span class="g-mark avg" style="left:${pos(avg)}%"><i>평균 ${avg}</i></span>`:''}
        <span class="g-mark now" style="left:${pos(todayWalk)}%"><i>오늘 ${todayWalk}</i></span>
      </div>
      ${avg!=null?`<p class="cmp-src">${rank&&rank.pct!=null?`farewell pet에서 같은 체급 보호자 ${rank.n}명의 최근 7일 기록과 비교했어요.`:'추정치예요. 권장 범위를 기준으로 계산했고, 같은 체급 보호자 기록이 20명 이상 모이면 실제 순위로 바뀌어요.'}</p>`:''}`;
  }
  async function loadRank(g,avg){
    if(avg==null||!cloud.user||cloud.off)return;
    const k=g.key+':'+avg;if(k in rankCache)return;rankCache[k]=null;
    try{const {data,error}=await cloud.client.rpc('daily_walk_rank',{p_group:g.key,p_minutes:avg});if(error)throw error;const r=Array.isArray(data)?data[0]:data;if(r&&r.n>=20&&r.pct!=null){rankCache[k]={n:r.n,pct:Math.min(99,Math.max(1,Math.round(r.pct)))};render();}}
    catch{}
  }

  /* 배변 이상 신호 */
  function healthNote(d){
    const ps=onDay(d).filter(l=>l.type==='poop');
    const msgs=[];
    if(ps.some(l=>COLORS.find(c=>c.k===l.color&&c.alarm)))msgs.push('검은색·붉은빛·회백색 변은 출혈이나 간·담도 문제의 신호일 수 있어요.');
    if(ps.some(l=>(l.flags||[]).includes('피가 보여요')))msgs.push('변에 피가 보였어요.');
    if(ps.filter(l=>Number(l.shape)===5).length>=2)msgs.push('오늘 설사가 두 번 이상이에요. 물을 잘 마시는지 봐 주세요.');
    if(ps.some(l=>(l.pee||[]).includes('붉은빛')))msgs.push('소변이 붉은빛이었어요.');
    if(!msgs.length){
      /* 대변 기록을 꾸준히 해 온 경우에만 '이틀째 없음'을 알린다 */
      const poopDays=new Set(logs().filter(l=>l.type==='poop'&&l.kind!=='소변').map(l=>l.date));
      if(d===today()&&poopDays.size>=3&&!poopDays.has(d)&&!poopDays.has(addDays(d,-1)))msgs.push('이틀째 대변 기록이 없어요. 잊고 안 남긴 거라면 괜찮아요.');
      else return '';
    }
    return `<aside class="health-note" role="status">${icon('poop')}<div><b>배변 확인이 필요해요</b>${msgs.map(m=>`<p>${esc(m)}</p>`).join('')}<a href="consult.html">수의사에게 물어보기 ${icon('chev-right')}</a></div></aside>`;
  }

  /* 셋로그처럼 그 순간의 사진 */
  function photoSrc(l){return l.photo?`src="${l.photo}"`:l.mediaId?`data-media="${esc(l.mediaId)}"`:'';}
  function momentsHtml(d){
    const ps=onDay(d).filter(l=>l.type==='photo').reverse();
    if(!ps.length)return '';
    return `<section class="moments" aria-label="그 순간 사진"><h2>그 순간</h2><div class="m-row">${ps.map(l=>`<figure class="moment"><img ${photoSrc(l)} alt="${esc(l.time)}에 찍은 사진"><figcaption><b class="tnum">${esc(l.time)}</b>${l.stamp?`<span>${esc(l.stamp)}</span>`:''}</figcaption></figure>`).join('')}</div></section>`;
  }
  async function fillPhotos(){
    const slots=[...document.querySelectorAll('#daily img[data-media]')];
    if(!slots.length||!cloud.client)return;
    const paths=slots.map(i=>(cloud.mediaRows.get(i.dataset.media)||{}).path).filter(Boolean);
    try{const map=await Media.urls(cloud.client,paths);slots.forEach(i=>{const m=cloud.mediaRows.get(i.dataset.media);if(m&&map[m.path])i.src=map[m.path];});}catch{}
  }

  function summary(l){
    switch(l.type){
      case 'meal':return [l.food||'밥',[l.amount,l.grams?l.grams+'g':''].filter(Boolean).join(' · ')];
      case 'walk':return [`산책 ${l.min}분`,[l.km?Number(l.km).toFixed(2)+'km':'',l.poops?`대변 ${l.poops}`:'',l.pees?`소변 ${l.pees}`:'',l.where].filter(Boolean).join(' · ')];
      case 'poop':{const s=SHAPES.find(x=>x.k===Number(l.shape)),c=COLORS.find(x=>x.k===l.color);return [l.kind==='소변'?'소변':l.kind==='둘 다'?'대변 · 소변':'대변',[s?s.l:'',c?c.l:'',...(l.flags||[]),...(l.pee||[]),l.where].filter(Boolean).join(' · ')];}
      case 'supp':return [l.name||'영양제',l.count>1?`${l.count}개`:''];
      case 'snack':return [l.name||'간식',l.count>1?`${l.count}개`:''];
      case 'play':return [l.kind||'놀이',`${l.min}분`];
      case 'water':return ['물',`${l.ml}ml`];
      case 'photo':return ['사진',l.stamp||''];
    }
    return ['기록',''];
  }
  function pathSvg(path,w=96,h=64){
    if(!path||path.length<2)return '';
    const lats=path.map(p=>p[0]),lngs=path.map(p=>p[1]);
    const mnA=Math.min(...lats),mxA=Math.max(...lats),mnO=Math.min(...lngs),mxO=Math.max(...lngs);
    const k=Math.cos(mnA*Math.PI/180),sx=(mxO-mnO)*k||1e-6,sy=(mxA-mnA)||1e-6,s=Math.min((w-8)/sx,(h-8)/sy);
    const ox=(w-sx*s)/2,oy=(h-sy*s)/2;
    const pts=path.map(p=>`${(ox+(p[1]-mnO)*k*s).toFixed(1)},${(h-oy-(p[0]-mnA)*s).toFixed(1)}`).join(' ');
    return `<svg class="mini-path" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="#FF6B3D" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function timelineHtml(d){
    const list=onDay(d);
    const fac=(ctx.state.diary||[]).filter(e=>e.date===d);
    if(!list.length&&!fac.length)return `<div class="tl-empty"><b>${d===today()?'아직 오늘 기록이 없어요':'이날은 기록이 없어요'}</b><p>위 버튼을 누르면 지금 시각으로 바로 남겨요.</p></div>`;
    const rows=list.map(l=>{const T=TYPES[l.type]||TYPES.meal,[a,b]=summary(l);
      return `<li class="tl-row" style="--c:${T.c}"><span class="tl-time tnum">${esc(l.time)}</span><span class="tl-ic">${icon(T.icon)}</span><div class="tl-tx"><b>${esc(a)}</b>${b?`<span>${esc(b)}</span>`:''}${l.note?`<p>${esc(l.note)}</p>`:''}</div>${l.type==='walk'?pathSvg(l.path):''}${l.type==='photo'?`<img class="tl-photo" ${photoSrc(l)} alt="">`:''}<button type="button" class="icon-btn tl-del" data-del="${esc(l.id)}" aria-label="${esc(a)} 기록 지우기">${icon('trash')}</button></li>`;});
    const facRows=fac.map(e=>`<li class="tl-row fac" style="--c:#1E56C2"><span class="tl-time tnum">${esc(e.time||'')}</span><span class="tl-ic">${icon('building-h')}</span><div class="tl-tx"><b>${esc(e.place)}</b><span>시설 기록${e.mood&&Diary.MOODS[e.mood]?' · '+Diary.MOODS[e.mood]:''}</span></div><button type="button" class="btn-ghost" data-act="facility">보기</button></li>`);
    return `<ol class="timeline">${facRows.join('')}${rows.join('')}</ol>`;
  }

  /* ---------- 빠른 기록 창 ---------- */
  const chips=(name,list,sel,type='radio')=>list.map(o=>`<label class="chip"><input type="${type}" name="${name}" value="${esc(o)}" ${(Array.isArray(sel)?sel.includes(o):sel===o)?'checked':''}>${esc(o)}</label>`).join('');
  const recent=(type,key)=>[...new Set(logs().filter(l=>l.type===type&&l[key]).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).map(l=>l[key]))].slice(0,5);
  const timeField=()=>`<label class="field-l q-time">시각<input type="time" name="time" value="${day===today()?nowHM():'12:00'}" required></label>`;
  const stepper=(name,val,unit,step,max)=>`<div class="stepper"><button type="button" data-step="-${step}" data-for="${name}" aria-label="${step} 줄이기">${icon('minus')}</button><label><input type="number" name="${name}" value="${val}" min="0" max="${max}" inputmode="numeric"><span>${unit}</span></label><button type="button" data-step="${step}" data-for="${name}" aria-label="${step} 늘리기">${icon('plus')}</button></div>`;
  function openLog(type){
    const pet=ctx.pet||{},g=guide(pet),T=TYPES[type];
    if(type==='photo'){document.querySelector('#moment-file').click();return;}
    if(type==='walk'&&ctx.state.walkLive){openLive();return;}
    let body='';
    if(type==='meal'){const foods=recent('meal','food');body=`${timeField()}<div class="field-l"><span>얼마나 먹었나요</span><div class="chips">${chips('amount',MEAL_AMT,'다 먹었어요')}</div></div><div class="row2f"><label class="field-l">사료 <small>(선택)</small><input name="food" maxlength="40" list="dl-food" placeholder="예: 시니어 사료" value="${esc(foods[0]||'')}"><datalist id="dl-food">${foods.map(f=>`<option value="${esc(f)}">`).join('')}</datalist></label><label class="field-l">양 <small>(선택)</small><span class="unit"><input type="number" name="grams" min="0" max="2000" inputmode="numeric" placeholder="0">g</span></label></div>`;}
    if(type==='walk')body=`<button type="button" class="walk-start" data-act="walk-start">${icon('play')}<span><b>지금 산책 시작</b><small>시간·거리·경로를 재고, 배변과 사진도 바로 남겨요</small></span></button><p class="or"><span>또는 다녀온 산책 적기</span></p>${timeField()}<div class="field-l"><span>몇 분 걸었나요</span>${stepper('min',g.goal>40?30:20,'분',5,600)}</div><label class="field-l">거리 <small>(선택)</small><span class="unit"><input type="number" name="km" min="0" max="50" step="0.1" inputmode="decimal" placeholder="0.0">km</span></label>`;
    if(type==='poop')body=poopForm({});
    if(type==='supp'){const names=recent('supp','name');body=`${timeField()}<label class="field-l">어떤 영양제인가요<input name="name" maxlength="40" required placeholder="예: 관절 영양제" value="${esc(names[0]||'')}"></label>${names.length>1?`<div class="chips">${names.map(n=>`<button type="button" class="chip" data-fill="name" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>`:''}<div class="field-l"><span>개수</span>${stepper('count',1,'개',1,20)}</div>`;}
    if(type==='snack'){const names=recent('snack','name');body=`${timeField()}<label class="field-l">어떤 간식인가요<input name="name" maxlength="40" placeholder="예: 동결건조 닭가슴살" value="${esc(names[0]||'')}"></label>${names.length>1?`<div class="chips">${names.map(n=>`<button type="button" class="chip" data-fill="name" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>`:''}<div class="field-l"><span>개수</span>${stepper('count',1,'개',1,30)}</div>`;}
    if(type==='play')body=`${timeField()}<div class="field-l"><span>무슨 놀이를 했나요</span><div class="chips">${chips('kind',PLAY_KIND,recent('play','kind')[0]||'터그 놀이')}</div></div><div class="field-l"><span>몇 분 놀았나요</span>${stepper('min',10,'분',5,300)}</div>`;
    if(type==='water'){const left=Math.max(0,g.water-totals(day).water);body=`${timeField()}<div class="field-l"><span>얼마나 마셨나요 <small>(하루 목표 ${g.water}ml${left?` · ${left}ml 남음`:''})</small></span><div class="chips">${[50,100,200,300].map(v=>`<button type="button" class="chip" data-fill="ml" data-v="${v}">${v}ml</button>`).join('')}</div>${stepper('ml',100,'ml',50,3000)}</div><p class="hint">물그릇에 채운 양에서 남은 양을 빼면 돼요. 몸무게 1kg당 하루 50~60ml가 흔히 쓰는 기준이에요.</p>`;}
    body+=`<label class="field-l">메모 <small>(선택)</small><input name="note" maxlength="120" placeholder="특이사항이 있으면 적어 주세요"></label>`;
    ctx.modal(`${T.label} 기록`,body,`<button type="submit" form="modal-form" class="btn btn-primary">${icon('check')}${T.label} 남기기</button>`,fd=>{
      const rec={type,time:fd.get('time')||nowHM()};const note=String(fd.get('note')||'').trim();if(note)rec.note=note;
      const num=(k,max)=>{const v=Number(fd.get(k));return Number.isFinite(v)&&v>=0&&v<=max?Math.round(v*10)/10:0;};
      if(type==='meal'){rec.amount=fd.get('amount')||'';const f=String(fd.get('food')||'').trim();if(f)rec.food=f;const gr=num('grams',2000);if(gr)rec.grams=gr;}
      if(type==='walk'){rec.min=Math.round(num('min',600));if(!rec.min){toast('몇 분 걸었는지 적어 주세요.');return;}const km=num('km',50);if(km)rec.km=km;rec.group=g.key;}
      if(type==='poop')Object.assign(rec,readPoop(fd));
      if(type==='supp'){rec.name=String(fd.get('name')||'').trim();if(!rec.name){toast('영양제 이름을 적어 주세요.');return;}rec.count=Math.max(1,Math.round(num('count',20)));}
      if(type==='snack'){rec.name=String(fd.get('name')||'').trim()||'간식';rec.count=Math.max(1,Math.round(num('count',30)));}
      if(type==='play'){rec.kind=fd.get('kind')||'놀이';rec.min=Math.round(num('min',300));if(!rec.min){toast('몇 분 놀았는지 적어 주세요.');return;}}
      if(type==='water'){rec.ml=Math.round(num('ml',3000));if(!rec.ml){toast('마신 양을 적어 주세요.');return;}}
      if(type==='poop'&&!rec.kind){toast('대변인지 소변인지 골라 주세요.');return;}
      add(rec);ctx.close();toast(`${T.label}${obj(T.label)} 남겼어요.`);
    });
    bindForm(document.querySelector('#modal-form'));
  }
  function poopForm(v){
    return `${timeField()}
      <div class="field-l"><span>무엇을 했나요</span><div class="chips seg">${chips('kind',['대변','소변','둘 다'],v.kind||'대변')}</div></div>
      <div class="poop-detail" data-for="stool">
        <div class="field-l"><span>모양</span><div class="shapes">${SHAPES.map(s=>`<label class="shape"><input type="radio" name="shape" value="${s.k}" ${Number(v.shape||3)===s.k?'checked':''}>${shapeSvg(s.k)}<b>${s.l}</b><small>${s.d}</small></label>`).join('')}</div></div>
        <div class="field-l"><span>색깔</span><div class="swatches">${COLORS.map(c=>`<label class="swatch" title="${c.l}"><input type="radio" name="color" value="${c.k}" ${(v.color||'brown')===c.k?'checked':''}><i style="--sw:${c.hex}"></i><span>${c.l}</span></label>`).join('')}</div></div>
        <div class="field-l"><span>눈에 띈 것 <small>(선택)</small></span><div class="chips">${chips('flags',FLAGS,v.flags||[],'checkbox')}</div></div>
      </div>
      <div class="poop-detail" data-for="pee" hidden><div class="field-l"><span>소변 상태 <small>(선택)</small></span><div class="chips">${chips('pee',PEE,v.pee||[],'checkbox')}</div></div></div>
      <div class="field-l"><span>어디서</span><div class="chips">${chips('where',['산책 중','집 패드','집 밖 화장실'],v.where||'산책 중')}</div></div>`;
  }
  function readPoop(fd){
    const kind=fd.get('kind');const r={kind,where:fd.get('where')||''};
    if(kind!=='소변'){r.shape=Number(fd.get('shape'))||3;r.color=fd.get('color')||'brown';const f=fd.getAll('flags');if(f.length)r.flags=f;}
    if(kind!=='대변'){const p=fd.getAll('pee');if(p.length)r.pee=p;}
    return r;
  }
  function shapeSvg(k){
    const f='#8B5A2B';
    const art={
      1:`<circle cx="9" cy="17" r="3" fill="${f}"/><circle cx="16" cy="18" r="2.6" fill="${f}"/><circle cx="22" cy="16" r="2.8" fill="${f}"/><circle cx="13" cy="12" r="2.4" fill="${f}"/><circle cx="19" cy="11" r="2.2" fill="${f}"/>`,
      2:`<path d="M5 16c0-3 2-5 5-5h4l1-1 1 1h4l1-1 1 1c3 0 4 2 4 5s-2 4-5 4H9c-2.5 0-4-1.5-4-4z" fill="${f}"/><path d="M11 11v8M16 11v8M21 11v8" stroke="#fff" stroke-width="1.2" opacity=".6"/>`,
      3:`<path d="M4 17c0-2.8 2.4-4.5 6-4.5h10c3.6 0 6 1.7 6 4.5s-2.4 4-6 4H10c-3.6 0-6-1.2-6-4z" fill="${f}"/>`,
      4:`<path d="M5 18c0-2 2-3 3-4.5S10 10 13 10s4 2 5 3.5 4 1.5 5 3-1 4.5-5 4.5H10c-3 0-5-1-5-3z" fill="${f}" opacity=".85"/>`,
      5:`<path d="M3 19c2-2 5-1.5 7-3s4-2 6-.5 4 .5 6 .5 5 1 5 3-3 2-6 2H8c-3 0-6 0-5-2z" fill="${f}" opacity=".7"/><circle cx="25" cy="13" r="1.2" fill="${f}" opacity=".6"/><circle cx="6" cy="14" r="1" fill="${f}" opacity=".6"/>`
    };
    return `<svg viewBox="0 0 30 26" width="44" height="38" aria-hidden="true">${art[k]}</svg>`;
  }
  function bindForm(f){
    if(!f)return;
    f.addEventListener('click',e=>{
      const s=e.target.closest('[data-step]');
      if(s){const inp=f.elements[s.dataset.for];const max=Number(inp.max)||9999;inp.value=Math.min(max,Math.max(0,(Number(inp.value)||0)+Number(s.dataset.step)));return;}
      const fl=e.target.closest('[data-fill]');
      if(fl){f.elements[fl.dataset.fill].value=fl.dataset.v;return;}
      if(e.target.closest('[data-act="walk-start"]')){ctx.close();startWalk();}
    });
    const kind=f.querySelectorAll('input[name=kind]');
    if(f.querySelector('.poop-detail')){const sync=()=>{const k=(f.querySelector('input[name=kind]:checked')||{}).value;f.querySelector('[data-for=stool]').hidden=k==='소변';f.querySelector('[data-for=pee]').hidden=k==='대변';};kind.forEach(r=>r.addEventListener('change',sync));sync();}
  }

  /* ---------- 목표 · 체형 ---------- */
  function openGoals(){
    const g=guide(ctx.pet||{}),cur=ctx.state.dailyGoals||{};
    ctx.modal('링 목표',`<p class="hint">${esc(g.group)} · ${esc(g.stage)} 권장값으로 시작해요. 아이에게 맞게 바꿔도 돼요.</p>
      <div class="field-l"><span>산책 <small>(권장 ${g.lo}~${g.hi}분)</small></span>${stepper('walk',cur.walk||g.goal,'분',5,300)}</div>
      <div class="field-l"><span>놀이</span>${stepper('play',cur.play||g.play,'분',5,180)}</div>
      <div class="field-l"><span>물 <small>(몸무게 1kg당 약 60ml)</small></span>${stepper('water',cur.water||g.water,'ml',50,4000)}</div>`,
      `<button type="button" class="btn-ghost" id="goal-reset">${icon('refresh')}권장값으로</button><button type="submit" form="modal-form" class="btn btn-primary">${icon('check')}목표 저장</button>`,
      fd=>{const n=k=>Math.max(5,Math.round(Number(fd.get(k))||0));ctx.state.dailyGoals={walk:n('walk'),play:n('play'),water:n('water')};ctx.save();ctx.close();render();toast('목표를 바꿨어요.');});
    bindForm(document.querySelector('#modal-form'));
    document.querySelector('#goal-reset').onclick=()=>{delete ctx.state.dailyGoals;ctx.save();ctx.close();render();toast('권장값으로 돌렸어요.');};
  }
  function openBody(){
    const pet=ctx.pet||{};
    ctx.modal(`${josa.of(ctx.petName)} 체형`,`<p class="hint">위에서 내려다봤을 때 허리가 살짝 들어가고, 옆구리를 쓰다듬으면 갈비뼈가 만져지면 ‘적당해요’예요.</p><div class="chips grid2">${chips('body',BODY,pet.body||'')}</div>`,
      `<button type="submit" form="modal-form" class="btn btn-primary">${icon('check')}체형 저장</button>`,
      fd=>{const b=fd.get('body');if(!b){toast('체형을 골라 주세요.');return;}pet.body=b;ctx.state.pet=pet;ctx.save();ctx.close();render();toast('체형을 반영해 권장 산책 시간을 다시 계산했어요.');});
  }

  /* ---------- 실시간 산책 ---------- */
  const fmtDur=ms=>{const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h}:${pad(m)}:${pad(s%60)}`:`${pad(m)}:${pad(s%60)}`;};
  const liveMs=w=>w.acc+(w.paused?0:Date.now()-w.since);
  function hav(a,b){const R=6371,r=x=>x*Math.PI/180;const dA=r(b[0]-a[0]),dO=r(b[1]-a[1]);const h=Math.sin(dA/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dO/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
  let watchId=null,tick=null,wakeLock=null;
  function startWalk(){
    ctx.state.walkLive={startedAt:Date.now(),since:Date.now(),acc:0,paused:false,km:0,path:[],poops:0,pees:0,date:today(),start:nowHM()};
    ctx.save();openLive();
  }
  function startGps(){
    if(watchId!=null||!navigator.geolocation)return;
    watchId=navigator.geolocation.watchPosition(pos=>{
      const w=ctx.state.walkLive;if(!w||w.paused)return;
      const {latitude:la,longitude:lo,accuracy}=pos.coords;if(accuracy>60)return;
      const p=[+la.toFixed(6),+lo.toFixed(6)],last=w.path[w.path.length-1];
      if(last){const d=hav(last,p);if(d<.004||d>.5)return;w.km+=d;}
      w.path.push(p);if(w.path.length>1500)w.path=w.path.filter((_,i)=>i%2===0);
      ctx.save();paintLive();
    },err=>{const el=document.querySelector('#live-gps');if(el)el.textContent=err.code===1?'위치 권한이 꺼져 있어 시간만 재요.':'위치를 찾는 중이에요…';},{enableHighAccuracy:true,maximumAge:3000,timeout:20000});
  }
  function stopGps(){if(watchId!=null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null;}
  async function keepAwake(on){try{if(on&&'wakeLock' in navigator&&!wakeLock)wakeLock=await navigator.wakeLock.request('screen');else if(!on&&wakeLock){wakeLock.release();wakeLock=null;}}catch{}}
  function openLive(){
    const dlg=document.querySelector('#walk-live');
    dlg.innerHTML=`<div class="live-map" id="live-map"><div class="live-face">${Minimi.svg(Minimi.config(ctx.pet||{}),{shadow:false})}</div><p class="live-gps" id="live-gps">위치를 찾는 중이에요…</p></div>
      <div class="live-panel">
        <div class="live-stats"><div><b class="tnum" id="lv-km">0.00</b><span>거리(km)</span></div><div class="mid"><b class="tnum" id="lv-time">00:00</b><span>시간</span></div><div><b class="tnum" id="lv-poop">0</b><span>배변</span></div></div>
        <div class="live-quick"><button type="button" data-live="poop">${icon('poop')}대변</button><button type="button" data-live="pee">${icon('drop')}소변</button><button type="button" data-live="photo">${icon('camera')}사진</button></div>
        <div class="live-ctrl"><button type="button" class="lc" data-live="pause" id="lv-pause" aria-label="잠깐 멈추기">${icon('pause')}</button><button type="button" class="lc stop" data-live="stop" aria-label="산책 끝내기">${icon('stop')}</button><button type="button" class="lc" data-live="min" aria-label="작게 보기">${icon('chev-down')}</button></div>
      </div>`;
    if(!dlg.open)dlg.showModal();
    startGps();keepAwake(true);
    clearInterval(tick);tick=setInterval(paintLive,1000);paintLive();
  }
  function paintLive(){
    const w=ctx.state.walkLive;if(!w)return;
    const t=fmtDur(liveMs(w));
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('lv-time',t);set('lv-km',w.km.toFixed(2));set('lv-poop',w.poops+w.pees);set('live-mini',t);
    const pb=document.getElementById('lv-pause');if(pb){pb.innerHTML=icon(w.paused?'play':'pause');pb.setAttribute('aria-label',w.paused?'다시 걷기':'잠깐 멈추기');pb.classList.toggle('on',w.paused);}
    if(w.path.length){set('live-gps','');const m=document.getElementById('live-map');if(m){let svg=m.querySelector('.live-path');const html=pathSvg(w.path,320,320).replace('mini-path','live-path');if(svg)svg.outerHTML=html;else m.insertAdjacentHTML('afterbegin',html);}}
  }
  function liveAction(a){
    const w=ctx.state.walkLive;if(!w)return;
    if(a==='pause'){if(w.paused){w.since=Date.now();w.paused=false;}else{w.acc+=Date.now()-w.since;w.paused=true;}ctx.save();paintLive();}
    if(a==='min'){document.querySelector('#walk-live').close();render();}
    if(a==='poop'||a==='pee'){
      if(a==='poop')w.poops++;else w.pees++;ctx.save();paintLive();
      const last=w.path[w.path.length-1];
      const prevDay=day;day=today();
      add({type:'poop',kind:a==='poop'?'대변':'소변',where:'산책 중',...(a==='poop'?{shape:3,color:'brown'}:{}),...(last?{at:last}:{})});
      day=prevDay;
      toast(a==='poop'?'대변을 남겼어요.':'소변을 남겼어요.');
    }
    if(a==='photo')document.querySelector('#moment-file').click();
    if(a==='stop'){
      const ms=liveMs(w),min=Math.round(ms/60000);
      const b=document.querySelector('[data-live=stop]');
      if(!b.dataset.armed){b.dataset.armed='1';b.classList.add('armed');toast(min<1?'1분이 안 됐어요. 한 번 더 누르면 기록하지 않고 끝내요.':'한 번 더 누르면 산책을 끝내고 저장해요.');setTimeout(()=>{delete b.dataset.armed;b.classList.remove('armed');},2500);return;}
      stopGps();keepAwake(false);clearInterval(tick);
      ctx.state.walkLive=null;
      if(min>=1){
        const step=Math.ceil(w.path.length/200)||1;
        const prevDay=day;day=w.date;
        add({type:'walk',time:w.start,min,km:Math.round(w.km*100)/100,path:w.path.filter((_,i)=>i%step===0),poops:w.poops,pees:w.pees,group:guide(ctx.pet||{}).key,live:true});
        if(prevDay!==w.date)day=prevDay;
        toast(`산책 ${min}분${w.km>=.01?` · ${w.km.toFixed(2)}km`:''}을 남겼어요.`);
      }else{ctx.save();}
      document.querySelector('#walk-live').close();render();
    }
  }

  /* ---------- 그 순간 사진: 시각과 활동을 사진에 새긴다 ---------- */
  function stampText(){
    const w=ctx.state.walkLive;
    if(w)return `산책 ${Math.max(1,Math.round(liveMs(w)/60000))}분${w.km>=.01?` · ${w.km.toFixed(2)}km`:''}`;
    const t=totals(today());return t.walk?`오늘 산책 ${t.walk}분${t.km?` · ${t.km.toFixed(2)}km`:''}`:'';
  }
  function bake(file){
    return new Promise((res,rej)=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onload=()=>{
        const s=Math.min(1,960/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
        const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
        const time=nowHM(),stamp=stampText(),u=c.width/100,font=getComputedStyle(document.body).fontFamily;
        const grd=g.createLinearGradient(0,c.height*.55,0,c.height);grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=grd;g.fillRect(0,c.height*.55,c.width,c.height*.45);
        g.fillStyle='#fff';g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=u;g.textBaseline='alphabetic';
        g.font=`700 ${Math.round(u*13)}px ${font}`;g.fillText(time,u*5,c.height-u*(stamp?11:5));
        if(stamp){g.font=`500 ${Math.round(u*5.2)}px ${font}`;g.fillText(stamp,u*5.4,c.height-u*4.5);}
        g.shadowBlur=0;g.font=`700 ${Math.round(u*3.6)}px ${font}`;g.textAlign='right';g.globalAlpha=.85;g.fillText('farewell pet',c.width-u*4,u*7);
        res({photo:c.toDataURL('image/jpeg',.8),stamp,time});
      };
      img.onerror=()=>{URL.revokeObjectURL(url);rej();};img.src=url;
    });
  }
  async function onPhoto(file){
    if(!file)return;
    try{
      const b=await bake(file);
      const prevDay=day;day=today();
      add({type:'photo',time:b.time,photo:b.photo,stamp:b.stamp});
      day=prevDay;render();
      toast(cloud.user?'사진을 남겼어요. 앨범에도 저장해요.':'사진을 남겼어요.');
    }catch{toast('사진을 읽지 못했어요. 다른 사진으로 해 주세요.');}
  }

  /* ---------- 시설 기록 창 ---------- */
  function openFacility(){const d=document.querySelector('#facility');if(!d.open)d.showModal();Diary.render();}

  function bind(){
    document.querySelector('#daily').addEventListener('click',ev=>{
      const b=ev.target.closest('button');if(!b||b.disabled)return;
      if(b.dataset.shift){day=addDays(day,Number(b.dataset.shift));if(day>today())day=today();render();}
      if(b.dataset.day){day=b.dataset.day;render();}
      if(b.dataset.log)openLog(b.dataset.log);
      if(b.dataset.del){
        if(!b.dataset.armed){b.dataset.armed='1';b.classList.add('armed');b.setAttribute('aria-label','한 번 더 누르면 지워져요');setTimeout(()=>{delete b.dataset.armed;b.classList.remove('armed');},2500);return;}
        const i=logs().findIndex(l=>l.id===b.dataset.del);if(i>-1){const [l]=logs().splice(i,1);ctx.save();drop(l);render();toast('기록을 지웠어요.');}
      }
      const act=b.dataset.act;
      if(act==='login'&&window.FPAuth)FPAuth.open({onSuccess:()=>location.reload()});
      if(act==='wipe'){
        if(!b.dataset.armed){b.dataset.armed='1';b.textContent='한 번 더 누르면 모두 지워져요';setTimeout(()=>{delete b.dataset.armed;b.textContent='이 기기 기록 지우기';},3000);return;}
        FP.clearGuest(ctx.state);location.href='index.html';return;
      }
      if(act==='goals')openGoals();if(act==='body')openBody();if(act==='facility')openFacility();if(act==='walk-open')openLive();
    });
    document.querySelector('#moment-file').addEventListener('change',e=>{onPhoto(e.target.files[0]);e.target.value='';});
    document.querySelector('#walk-live').addEventListener('click',e=>{const b=e.target.closest('[data-live]');if(b)liveAction(b.dataset.live);});
    document.querySelector('#walk-live').addEventListener('cancel',e=>{e.preventDefault();liveAction('min');});
    document.querySelector('#diary-facility').addEventListener('click',openFacility);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx.state.walkLive)paintLive();});
  }

  window.Daily={
    init(c){
      ctx=c;if(!Array.isArray(ctx.state.daily))ctx.state.daily=[];
      render();bind();connect(c.user||null);
      if(ctx.state.walkLive){if(ctx.state.walkLive.date!==today()&&Date.now()-ctx.state.walkLive.startedAt>6*3600e3){ctx.state.walkLive=null;ctx.save();}else{startGps();clearInterval(tick);tick=setInterval(paintLive,1000);}}
    },
    setUser:connect,
    updatePetProfile(pet,petName){if(!ctx)return;ctx.pet=pet;ctx.petName=petName;render();},
    render,guide,estimateTop
  };
})();
