/* 산책 일기: 다녀온 날과 다녀올 날을 한 권에. 달력 · 일기 · 활동 기록 · 구글 캘린더 추가·구독 · .ics 내보내기
   로그인하면 일기는 계정에 저장되고, 업체의 입실·퇴실·체크리스트가 자동으로 들어온다. */
(function(){
  const {esc,icon,josa,toast}=FP;
  const MOODS={great:'신났어요',ok:'괜찮았어요',hard:'힘들어했어요'};
  const CAT={hospital:['병원','#1E56C2'],hotel:['호텔','#FFD400'],care:['호텔','#FFD400'],kindergarten:['유치원','#3E9B6F'],grooming:['미용','#E0738A'],etc:['기타','#8A93A3']};
  const TODOS=['투약 시간 다시 알려 주기','단독 돌봄 요청하기','좋아하는 담요 챙기기','다음 예약 잡기','사료 챙겨 보내기'];
  const WEEK=['일','월','화','수','목','금','토'];
  let ctx, month, selected=null;
  const MEALS=['다 먹었어요','절반쯤 먹었어요','조금 먹었어요','안 먹었어요'];
  const POOPS=['좋았어요','무른 편이었어요','설사를 했어요','아직 안 봤어요'];
  const MEDS=['제시간에 먹었어요','늦게 먹었어요','못 먹었어요'];
  const SOURCE={checkin:'입실',checkout:'퇴실',checklist:'돌봄 체크리스트'};
  const cloud={user:null,client:null,channel:null,mediaRows:new Map(),hasFeed:null,auto:true};
  const FEED_BASE='https://wowiqauwcxmhrgpltqey.supabase.co/functions/v1/calendar-feed?t=';

  const pad=n=>String(n).padStart(2,'0');
  const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today=()=>ymd(new Date());
  const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
  const isPlan=e=>e.date>today();
  const nice=s=>{const d=parse(s);return `${d.getMonth()+1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;};

  function migrate(state){
    if(!Array.isArray(state.diary)){
      const map={'잘 적응했어요':'great','시간이 필요했어요':'ok','힘들어했어요':'hard'};
      state.diary=(state.records||[]).map((r,i)=>({id:'m'+i+Date.now(),date:r.date,time:'',placeId:null,place:r.place,cat:'etc',mood:map[r.mood]||'ok',text:r.memo||'',todos:[],photo:''}));
    }
  }
  const sorted=()=>ctx.state.diary.slice().sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||'')));
  function forPlace(id){return sorted().filter(e=>e.placeId===id&&!isPlan(e));}

  /* ---------- 계정 저장 ---------- */
  function toRec(r){return {id:r.client_id||r.id,serverId:r.id,date:r.entry_date,time:r.entry_time||'',placeId:r.place_id,place:r.place,cat:r.cat,mood:r.mood||'',text:r.body||'',todos:r.todos||[],activity:r.activity||{},answers:r.answers||[],mediaIds:r.media_ids||[],source:r.source||'manual',photo:''};}
  function toRow(e){return {entry_date:e.date,entry_time:e.time||'',place:String(e.place).slice(0,60),place_id:e.placeId||null,cat:e.cat||'etc',mood:e.mood||'',body:e.text||'',todos:e.todos||[],activity:e.activity||{},media_ids:e.mediaIds||[]};}
  async function dataUrlFile(url){const b=await (await fetch(url)).blob();return new File([b],'diary.jpg',{type:b.type||'image/jpeg'});}
  async function loadCloud(){
    const {data,error}=await cloud.client.from('diary_entries').select('*').order('entry_date',{ascending:false}).limit(1000);
    if(error)throw error;
    const known=new Set(data.map(r=>r.client_id).filter(Boolean));
    /* 로그인 전에 이 탭에 쓴 일기를 계정으로 옮긴다 */
    const local=(ctx.state.diary||[]).filter(e=>!e.serverId&&(!e.source||e.source==='manual')&&!known.has(e.id));
    for(const e of local){
      try{
        if(e.photo&&!(e.mediaIds||[]).length){const up=await Media.upload(cloud.client,await dataUrlFile(e.photo));e.mediaIds=[up.id];}
        const {data:row,error:err}=await cloud.client.from('diary_entries').insert({client_id:e.id,...toRow(e)}).select('*').single();
        if(!err)data.push(row);
      }catch{}
    }
    ctx.state.diary=data.map(toRec);ctx.save();
    await loadMediaRows();
  }
  async function loadMediaRows(){
    const ids=[...new Set(ctx.state.diary.flatMap(e=>e.mediaIds||[]))].filter(id=>!cloud.mediaRows.has(id));
    if(!ids.length)return;
    const {data}=await cloud.client.from('media').select('id,path,kind').in('id',ids);
    (data||[]).forEach(m=>cloud.mediaRows.set(m.id,m));
  }
  async function pushEntry(e){
    if(!cloud.user)return true;
    if(e.serverId){
      const {error}=await cloud.client.from('diary_entries').update({...toRow(e),updated_at:new Date().toISOString()}).eq('id',e.serverId);
      if(error){toast('계정에 저장하지 못했어요. 연결을 확인해 주세요.');return false;}
      return true;
    }
    const {data,error}=await cloud.client.from('diary_entries').insert({client_id:e.id,...toRow(e)}).select('id').single();
    if(error){toast('계정에 저장하지 못했어요. 연결을 확인해 주세요.');return false;}
    e.serverId=data.id;ctx.save();return true;
  }
  async function removeEntry(e){
    if(!cloud.user||!e.serverId)return true;
    const {error}=await cloud.client.from('diary_entries').delete().eq('id',e.serverId);
    if(error){toast('지우지 못했어요. 잠시 뒤에 다시 시도해 주세요.');return false;}
    return true;
  }
  async function fillPhotos(){
    const slots=[...document.querySelectorAll('#diary-list img[data-media]')];
    if(!slots.length||!cloud.client)return;
    const paths=slots.map(i=>(cloud.mediaRows.get(i.dataset.media)||{}).path).filter(Boolean);
    try{const map=await Media.urls(cloud.client,paths);slots.forEach(i=>{const m=cloud.mediaRows.get(i.dataset.media);if(m&&map[m.path])i.src=map[m.path];});}catch{}
  }

  /* ---------- 활동 추이: 정답 시간 대신 우리 아이의 평소와 비교 ---------- */
  function weekStart(d){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
  function trend(){
    const walks=ctx.state.diary.filter(e=>!isPlan(e)&&e.activity&&Number.isFinite(Number(e.activity.walk_min))&&e.activity.walk_min!=='');
    if(!walks.length)return '';
    const now=weekStart(new Date()),sums=new Map();
    walks.forEach(e=>{const k=weekStart(parse(e.date)).getTime();sums.set(k,(sums.get(k)||0)+Number(e.activity.walk_min));});
    const thisWeek=sums.get(now.getTime())||0;
    const prev=[1,2,3,4].map(i=>sums.get(now.getTime()-i*7*864e5)).filter(v=>v!=null);
    let compare='';
    if(prev.length>=2){
      const avg=prev.reduce((a,b)=>a+b,0)/prev.length;
      const diff=avg?Math.round((thisWeek-avg)/avg*100):0;
      const day=(new Date().getDay()+6)%7+1;
      compare=Math.abs(diff)<10?`평소(주 ${Math.round(avg)}분)와 비슷해요.`:diff<0?`평소(주 ${Math.round(avg)}분)보다 ${-diff}% 적어요${day<7?' — 아직 이번 주가 남았어요':''}.`:`평소(주 ${Math.round(avg)}분)보다 ${diff}% 많아요.`;
    }else compare='2주 이상 기록이 쌓이면 평소와 비교해 드려요.';
    return `<div class="trend"><b>${icon('clock')}이번 주 산책·놀이 ${thisWeek}분</b><span>${compare}</span><small>필요한 운동량은 나이·체급·건강에 따라 크게 달라서, 평균 대신 ${esc(josa.of(ctx.petName))} 평소 기록과 비교해요. 갑자기 크게 줄면 몸 상태를 한 번 살펴봐 주세요.</small></div>`;
  }
  function activityChips(a){
    if(!a)return '';
    const out=[];
    if(a.walk_min!=null&&a.walk_min!=='')out.push(`산책·놀이 ${a.walk_min}분${a.walk_count?` · ${a.walk_count}번`:''}`);
    if(a.meal)out.push('식사: '+a.meal);
    if(a.poop)out.push('대변: '+a.poop);
    if(a.water)out.push('물: '+a.water);
    if(a.rest)out.push('휴식: '+a.rest);
    if(a.med)out.push('약: '+a.med);
    return out.length?`<ul class="act">${out.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  }

  /* ---------- 캘린더 연결 ---------- */
  async function renderSync(){
    const el=document.querySelector('#cal-sync');if(!el)return;
    const fileBtn=`<button type="button" class="btn btn-soft" id="diary-ics">${icon('calendar')}캘린더 파일(.ics) 받기</button>`;
    if(!cloud.user){
      el.innerHTML=`<div><b>구글 캘린더와 연결</b><p>일기마다 ‘구글 캘린더에 추가’를 누르면 내 캘린더에 일정이 들어가요. 로그인하면 구독 링크로 자동으로 이어지고, 업체 입실·퇴실도 일기에 자동으로 기록돼요.</p></div>${fileBtn}`;
      return;
    }
    if(cloud.hasFeed===null){const {data}=await cloud.client.rpc('has_calendar_token');cloud.hasFeed=!!data;}
    el.innerHTML=`<div class="sync-col"><b>구글 캘린더 자동 연결</b><p>구독 링크를 한 번 등록하면 새 일기와 업체 입실·퇴실이 내 캘린더에 자동으로 들어가요. 구글 캘린더가 몇 시간마다 새로 가져와서 바로 보이지는 않아요.</p>
      <div class="sync-actions">${cloud.hasFeed?`<button type="button" class="btn btn-primary" data-feed="new">${icon('refresh')}새 구독 링크 만들기</button><button type="button" class="btn-ghost danger" data-feed="off">구독 끊기</button>`:`<button type="button" class="btn btn-primary" data-feed="new">${icon('calendar')}구독 링크 만들기</button>`}${fileBtn}</div>
      <div id="feed-out"></div>
      <label class="check auto-toggle"><input type="checkbox" id="auto-diary" ${cloud.auto?'checked':''}> 업체의 입실·퇴실·체크리스트를 일기에 자동으로 기록하기</label></div>`;
  }
  async function feed(action){
    if(action==='off'){
      const {error}=await cloud.client.rpc('revoke_calendar_token');
      if(error){toast('끊지 못했어요.');return;}
      cloud.hasFeed=false;renderSync();toast('구독 링크를 끊었어요. 캘린더에서도 구독을 지워 주세요.');return;
    }
    const {data,error}=await cloud.client.rpc('issue_calendar_token');
    if(error||!data){toast('링크를 만들지 못했어요.');return;}
    cloud.hasFeed=true;await renderSync();
    const url=FEED_BASE+data;
    const g='https://calendar.google.com/calendar/render?cid='+encodeURIComponent(url.replace(/^https:/,'webcal:'));
    document.querySelector('#feed-out').innerHTML=`<p class="feed-note">이 링크는 지금 한 번만 보여요. 다른 사람에게 알려 주지 마세요. 예전 링크는 더 이상 쓸 수 없어요.</p><div class="feed-url"><input readonly value="${esc(url)}" aria-label="캘린더 구독 링크"><button type="button" class="btn-ghost" data-feed="copy">복사</button></div><a class="btn btn-soft" href="${esc(g)}" target="_blank" rel="noopener noreferrer">${icon('calendar')}구글 캘린더에 추가</a>`;
  }

  /* ---------- 구글 캘린더 · ics ---------- */
  function title(e){return `${josa.name(ctx.petName)} · ${e.place}`;}
  function details(e){
    const lines=[];if(e.text)lines.push(e.text);
    const todo=(e.todos||[]).filter(t=>!t.done).map(t=>'- '+t.t);if(todo.length)lines.push('','챙길 것',...todo);
    lines.push('','farewell pet 산책 일기에서 추가했어요.');return lines.join('\n');
  }
  function stamp(e){
    const d=e.date.replace(/-/g,'');
    if(!e.time){const n=parse(e.date);n.setDate(n.getDate()+1);return {start:d,end:ymd(n).replace(/-/g,''),allDay:true};}
    const [h,m]=e.time.split(':').map(Number);const end=new Date(2000,0,1,h+1,m);
    return {start:`${d}T${pad(h)}${pad(m)}00`,end:`${d}T${pad(end.getHours())}${pad(end.getMinutes())}00`,allDay:false};
  }
  function gcalUrl(e){
    const t=stamp(e), p=ctx.PLACES.find(x=>x.id===e.placeId);
    const q=new URLSearchParams({action:'TEMPLATE',text:title(e),dates:`${t.start}/${t.end}`,details:details(e),ctz:'Asia/Seoul'});
    if(p&&p.address)q.set('location',p.address);
    return 'https://calendar.google.com/calendar/render?'+q.toString();
  }
  function ics(list){
    const x=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const now=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
    const ev=list.map(e=>{const t=stamp(e),p=ctx.PLACES.find(y=>y.id===e.placeId);return ['BEGIN:VEVENT',`UID:${e.id}@farewellpet`,`DTSTAMP:${now}`,t.allDay?`DTSTART;VALUE=DATE:${t.start}`:`DTSTART;TZID=Asia/Seoul:${t.start}`,t.allDay?`DTEND;VALUE=DATE:${t.end}`:`DTEND;TZID=Asia/Seoul:${t.end}`,`SUMMARY:${x(title(e))}`,`DESCRIPTION:${x(details(e))}`,p&&p.address?`LOCATION:${x(p.address)}`:'','END:VEVENT'].filter(Boolean).join('\r\n');});
    return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//farewell pet//산책 일기//KO','CALSCALE:GREGORIAN',...ev,'END:VCALENDAR'].join('\r\n');
  }
  function exportIcs(){
    const list=ctx.state.diary;if(!list.length){toast('내보낼 일기가 아직 없어요.');return;}
    const blob=new Blob([ics(list)],{type:'text/calendar;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='farewell-pet-산책일기.ics';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
    toast('캘린더 파일을 받았어요. 구글 캘린더 설정의 ‘가져오기’에서 열어 주세요.');
  }

  /* ---------- 화면 ---------- */
  function render(){
    if(!month){const t=new Date();month=new Date(t.getFullYear(),t.getMonth(),1);}
    document.querySelector('#diary-title').textContent=`${josa.of(ctx.petName)} 산책 일기`;
    const y=month.getFullYear(),m=month.getMonth();
    const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();
    const key=`${y}-${pad(m+1)}`;
    const inMonth=ctx.state.diary.filter(e=>e.date.startsWith(key));
    const byDay={};inMonth.forEach(e=>(byDay[e.date]=byDay[e.date]||[]).push(e));
    let cells='';for(let i=0;i<first;i++)cells+='<span class="cal-pad"></span>';
    for(let d=1;d<=days;d++){
      const ds=`${key}-${pad(d)}`, es=byDay[ds]||[];
      const marks=es.slice(0,3).map(e=>{const c=CAT[e.cat]||CAT.etc;return `<i class="paw ${isPlan(e)?'plan':''}" style="--c:${c[1]}" title="${esc(e.place)}"><svg viewBox="0 0 24 24"><use href="#i-paw"/></svg></i>`;}).join('');
      cells+=`<button type="button" class="cal-day ${ds===today()?'today':''} ${ds===selected?'sel':''} ${es.length?'has':''}" data-day="${ds}" aria-label="${m+1}월 ${d}일${es.length?`, 기록 ${es.length}개`:''}"><span class="n">${d}</span><span class="marks">${marks}</span></button>`;
    }
    document.querySelector('#cal').innerHTML=`<div class="cal-head"><button type="button" class="icon-btn" data-cal="-1" aria-label="이전 달">${icon('arrow-left')}</button><b>${y}년 ${m+1}월</b><button type="button" class="icon-btn" data-cal="1" aria-label="다음 달">${icon('chev-right')}</button></div><div class="cal-week">${WEEK.map(w=>`<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells}</div>`;
    const done=inMonth.filter(e=>!isPlan(e)), plans=inMonth.filter(isPlan);
    const counts={};done.forEach(e=>{const l=(CAT[e.cat]||CAT.etc)[0];counts[l]=(counts[l]||0)+1;});
    document.querySelector('#diary-trend').innerHTML=trend();
    document.querySelector('#diary-sum').innerHTML=inMonth.length?`<b>이번 달 ${done.length}번 다녀왔어요</b>${Object.entries(counts).map(([k,v])=>`<span>${k} ${v}</span>`).join('')}${plans.length?`<span class="plan">예정 ${plans.length}</span>`:''}`:`<b>이번 달은 아직 기록이 없어요</b>`;
    const list=(selected?sorted().filter(e=>e.date===selected):sorted().filter(e=>e.date.startsWith(key)));
    document.querySelector('#diary-list').innerHTML=(selected?`<div class="day-filter">${nice(selected)} 기록 <button type="button" class="btn-ghost" data-clear-day>이번 달 전체 보기</button></div>`:'')+(list.length?list.map(entry).join(''):`<div class="empty">${Minimi.svg(Minimi.config(ctx.pet))}<b>${selected?'이 날은 아직 기록이 없어요':'아직 쓴 일기가 없어요'}</b><p>다녀온 곳의 기억이나 다녀올 예정을 남겨 보세요. 다음에 고를 때 참고할 수 있어요.</p><button type="button" class="btn btn-primary" data-diary-new="${selected||''}">${icon('edit')}일기 쓰기</button></div>`);
    fillPhotos();
  }
  function entry(e){
    const c=CAT[e.cat]||CAT.etc, plan=isPlan(e), mm=Minimi.config(ctx.pet);
    const todos=(e.todos||[]), auto=e.source&&e.source!=='manual';
    const answers=(e.answers||[]).filter(a=>a.id!=='note');
    const photo=e.photo?`<figure class="polaroid"><img src="${e.photo}" alt="${esc(e.place)}에서 찍은 사진"></figure>`:(e.mediaIds||[]).length?`<figure class="polaroid"><img data-media="${esc(e.mediaIds[0])}" alt="${esc(e.place)}에서 찍은 사진"></figure>`:'';
    return `<article class="page ${plan?'is-plan':''}" data-id="${e.id}">
      <header class="page-head"><span class="date">${nice(e.date)}${e.time?` · ${esc(e.time)}`:''}</span>${plan?'<span class="tag plan">다녀올 예정</span>':auto?`<span class="tag auto">업체 기록 · ${SOURCE[e.source]}</span>`:e.mood?`<span class="tag mood ${e.mood}">${MOODS[e.mood]||''}</span>`:''}</header>
      <div class="page-body">
        ${plan||auto?'':`<div class="face">${Minimi.svg({...mm,mood:e.mood||'ok'},{shadow:false})}</div>`}
        <div class="page-text">
          <p class="where"><span class="cat" style="--c:${c[1]}">${c[0]}</span>${e.placeId?`<button type="button" class="link" data-open="${e.placeId}">${esc(e.place)}</button>`:`<b>${esc(e.place)}</b>`}</p>
          ${e.text?`<p class="txt">${esc(e.text)}</p>`:''}
          ${activityChips(e.activity)}
          ${answers.length?`<details class="answers"><summary>체크리스트 답변 ${answers.length}개</summary><dl>${answers.map(a=>`<dt>${esc(a.q)}</dt><dd>${esc(a.id==='walk'&&/^\d+$/.test(a.a)?a.a+'분':a.a)}</dd>`).join('')}</dl></details>`:''}
          ${todos.length?`<ul class="todos">${todos.map((t,i)=>`<li><label><input type="checkbox" data-todo="${e.id}:${i}" ${t.done?'checked':''}><span>${esc(t.t)}</span></label></li>`).join('')}</ul>`:''}
        </div>
        ${photo}
      </div>
      <footer class="page-foot"><a class="btn-ghost" href="${gcalUrl(e)}" target="_blank" rel="noopener noreferrer">${icon('calendar')}구글 캘린더에 추가</a><span class="sp"></span>${auto?'':`<button type="button" class="btn-ghost" data-diary-edit="${e.id}">${icon('edit')}고치기</button>`}<button type="button" class="btn-ghost danger" data-diary-del="${e.id}">${icon('trash')}지우기</button></footer>
    </article>`;
  }

  /* ---------- 일기 쓰기 ---------- */
  function placeOptions(sel){
    const groups=[['hospital','병원'],['hotel','호텔·돌봄'],['kinder','유치원'],['grooming','미용']];
    const seen=new Set();
    return groups.map(([k,l])=>`<optgroup label="${l}">${ctx.PLACES.filter(p=>p.kinds.includes(k)&&!seen.has(p.id)&&seen.add(p.id)).map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${esc(p.name)}</option>`).join('')}</optgroup>`).join('')+`<option value="__custom" ${sel==='__custom'?'selected':''}>직접 입력</option>`;
  }
  function openForm(pre={}){
    const e=pre.id?ctx.state.diary.find(x=>x.id===pre.id):null;
    const v={date:today(),time:'',placeId:'',place:'',mood:'great',text:'',todos:[],photo:'',...(e||{}),...pre};
    if(!v.placeId&&v.place)v.placeId='__custom';
    let photo=v.photo||'', mediaIds=[...(v.mediaIds||[])], uploading=false;
    const a=v.activity||{};
    const opt=(list,sel)=>`<option value="">고르지 않음</option>${list.map(o=>`<option ${o===sel?'selected':''}>${esc(o)}</option>`).join('')}`;
    const takesMed=ctx.pet&&ctx.pet.hasMedication==='있음';
    const checked=new Set((v.todos||[]).map(t=>t.t));
    const extra=(v.todos||[]).filter(t=>!TODOS.includes(t.t));
    const mm=Minimi.config(ctx.pet);
    ctx.modal(e?'일기 고치기':'산책 일기 쓰기',`
      <div class="row2f"><label class="field-l">날짜<input type="date" name="date" value="${esc(v.date)}" required></label><label class="field-l">시간 <small>(선택)</small><input type="time" name="time" value="${esc(v.time)}"></label></div>
      <p class="plan-hint" id="plan-hint" hidden>앞으로의 날짜예요. ‘다녀올 예정’으로 저장되고, 구글 캘린더에 일정으로 넣을 수 있어요.</p>
      <label class="field-l">어디에 갔나요<select name="placeId" id="d-place">${placeOptions(v.placeId)}</select></label>
      <label class="field-l" id="d-custom" ${v.placeId==='__custom'?'':'hidden'}>장소 이름<input name="place" maxlength="60" value="${esc(v.placeId==='__custom'?v.place:'')}" placeholder="예: 빛가람 호수공원"></label>
      <div class="field-l" id="d-mood"><span>${esc(josa.topic(ctx.petName))} 어땠나요?</span><div class="moods">${Object.entries(MOODS).map(([k,l])=>`<label class="mood-opt"><input type="radio" name="mood" value="${k}" ${v.mood===k?'checked':''}>${Minimi.svg({...mm,mood:k},{shadow:false})}<span>${l}</span></label>`).join('')}</div></div>
      <label class="field-l">한 줄 일기<textarea name="text" rows="3" maxlength="600" placeholder="예: 처음엔 낑낑댔는데 오후엔 친구랑 잘 놀았대요.">${esc(v.text)}</textarea></label>
      <details class="field-l act-form" id="d-act" ${a.walk_min!=null||a.meal||a.poop?'open':''}><summary>오늘 활동 기록 <small>(선택)</small></summary>
        <div class="row2f"><label class="field-l">산책·놀이 시간<span class="unit"><input type="number" name="walk_min" min="0" max="600" inputmode="numeric" value="${esc(a.walk_min??'')}">분</span></label><label class="field-l">산책 횟수<span class="unit"><input type="number" name="walk_count" min="0" max="20" inputmode="numeric" value="${esc(a.walk_count??'')}">번</span></label></div>
        <div class="row2f"><label class="field-l">식사<select name="meal">${opt(MEALS,a.meal)}</select></label><label class="field-l">대변<select name="poop">${opt(POOPS,a.poop)}</select></label></div>
        ${takesMed?`<label class="field-l">약<select name="med_taken">${opt(MEDS,a.med)}</select></label>`:''}
      </details>
      <div class="field-l" id="d-photo-wrap"><span>사진 <small>(선택${cloud.user?' · 앨범에도 저장돼요':''})</small></span><div class="d-photo"><label class="photo-pick">${icon('camera')}<span>${photo||mediaIds.length?'사진 바꾸기':'사진 붙이기'}</span><input type="file" accept="image/*" id="d-photo"></label><div id="d-photo-prev">${photo?`<img src="${photo}" alt="">`:''}</div></div></div>
      <div class="field-l"><span>다음에 챙길 것</span><div class="chips">${TODOS.map(t=>`<label class="chip"><input type="checkbox" name="todo" value="${esc(t)}" ${checked.has(t)?'checked':''}>${esc(t)}</label>`).join('')}${extra.map(t=>`<label class="chip"><input type="checkbox" name="todo" value="${esc(t.t)}" checked>${esc(t.t)}</label>`).join('')}</div><input name="todoNew" maxlength="40" placeholder="직접 적기 (예: 산책 30분 더 부탁드리기)"></div>
      <div class="field-l" id="d-med" hidden><span>처방받은 약 <small>(병원)</small></span><input name="med" maxlength="60" placeholder="예: 피부약 7일분"><label class="check"><input type="checkbox" name="medToProfile" checked> ${esc(josa.of(ctx.petName))} 프로필 약 목록에도 넣기</label></div>`,
      `<button type="submit" form="modal-form" class="btn btn-primary">${icon('check')}일기 저장하기</button>`,
      async fd=>{
        if(uploading){toast('사진을 올리는 중이에요. 잠시만 기다려 주세요.');return;}
        const date=fd.get('date');if(!date){toast('날짜를 골라 주세요.');return;}
        const pid=fd.get('placeId');const p=ctx.PLACES.find(x=>x.id===pid);
        const place=p?p.name:String(fd.get('place')||'').trim();
        if(!place){toast('어디에 갔는지 적어 주세요.');return;}
        const todos=fd.getAll('todo').map(t=>({t,done:!!(e&&(e.todos||[]).find(o=>o.t===t&&o.done))}));
        const nt=String(fd.get('todoNew')||'').trim();if(nt)todos.push({t:nt,done:false});
        const activity={};
        const wm=String(fd.get('walk_min')||'').trim(),wc=String(fd.get('walk_count')||'').trim();
        if(wm!==''&&Number(wm)>=0&&Number(wm)<=600)activity.walk_min=Math.round(Number(wm));
        if(wc!==''&&Number(wc)>=0&&Number(wc)<=20)activity.walk_count=Math.round(Number(wc));
        ['meal','poop'].forEach(k=>{if(fd.get(k))activity[k]=fd.get(k);});
        if(fd.get('med_taken'))activity.med=fd.get('med_taken');
        const rec={id:e?e.id:'d'+Date.now(),date,time:fd.get('time')||'',placeId:p?p.id:null,place,cat:p?p.cat:'etc',mood:date>today()?'':(fd.get('mood')||'ok'),text:String(fd.get('text')||'').trim(),todos,photo:cloud.user?'':photo,activity:date>today()?{}:activity,mediaIds:cloud.user?mediaIds:[],source:'manual'};
        const med=String(fd.get('med')||'').trim();
        if(med){rec.text=(rec.text?rec.text+'\n':'')+'처방: '+med;if(fd.get('medToProfile')){ctx.pet.medications=[...(ctx.pet.medications||[]),{name:med,frequency:'',schedule:''}];ctx.pet.hasMedication='있음';ctx.state.pet=ctx.pet;}}
        const target=e?Object.assign(e,rec):rec;
        if(!e)ctx.state.diary.push(rec);
        ctx.save();ctx.close();pushEntry(target).then(()=>render());month=new Date(parse(date).getFullYear(),parse(date).getMonth(),1);selected=null;
        ctx.setView('diary');toast(rec.date>today()?'다녀올 예정을 적어 뒀어요.':'일기를 저장했어요.');
      });
    const f=document.querySelector('#modal-form');
    const sync=()=>{const plan=f.date.value>today();document.querySelector('#d-mood').hidden=plan;document.querySelector('#d-photo-wrap').hidden=plan;document.querySelector('#d-act').hidden=plan;document.querySelector('#plan-hint').hidden=!plan;const p=ctx.PLACES.find(x=>x.id===f.placeId.value);document.querySelector('#d-custom').hidden=f.placeId.value!=='__custom';document.querySelector('#d-med').hidden=!(p&&p.cat==='hospital')||plan;};
    f.date.addEventListener('change',sync);f.placeId.addEventListener('change',sync);sync();
    document.querySelector('#d-photo').addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;
      if(cloud.user){
        uploading=true;const prev=document.querySelector('#d-photo-prev');prev.innerHTML='<span class="muted">올리는 중…</span>';
        try{const up=await Media.upload(cloud.client,file);mediaIds=[up.id];cloud.mediaRows.set(up.id,{id:up.id,path:up.path,kind:up.kind});prev.innerHTML=`<img src="${URL.createObjectURL(file)}" alt="">`;}
        catch(err){prev.innerHTML='';toast(Media.errorText(err));}
        finally{uploading=false;}
        return;
      }
      const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const s=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);photo=c.toDataURL('image/jpeg',.8);URL.revokeObjectURL(url);document.querySelector('#d-photo-prev').innerHTML=`<img src="${photo}" alt="">`;};img.onerror=()=>toast('사진을 읽지 못했어요.');img.src=url;});
  }

  function bind(){
    document.querySelector('#view-diary').addEventListener('click',ev=>{
      const b=ev.target.closest('button,input');if(!b)return;
      if(b.dataset.cal){month=new Date(month.getFullYear(),month.getMonth()+Number(b.dataset.cal),1);selected=null;render();}
      if(b.dataset.day){selected=selected===b.dataset.day?null:b.dataset.day;render();}
      if(b.hasAttribute('data-clear-day')){selected=null;render();}
      if(b.dataset.diaryNew!==undefined){openForm(b.dataset.diaryNew?{date:b.dataset.diaryNew}:{});}
      if(b.dataset.diaryEdit)openForm({id:b.dataset.diaryEdit});
      if(b.dataset.diaryDel){const i=ctx.state.diary.findIndex(x=>x.id===b.dataset.diaryDel);if(i>-1&&confirmDelete(b)){const e=ctx.state.diary[i];removeEntry(e).then(ok=>{if(!ok)return;const j=ctx.state.diary.indexOf(e);if(j>-1)ctx.state.diary.splice(j,1);ctx.save();render();toast('일기를 지웠어요.');});}}
      if(b.dataset.todo){const [id,i]=b.dataset.todo.split(':');const e=ctx.state.diary.find(x=>x.id===id);if(e){e.todos[+i].done=b.checked;ctx.save();pushEntry(e);}}
      if(b.dataset.feed==='copy'){const inp=document.querySelector('.feed-url input');inp.select();(navigator.clipboard?navigator.clipboard.writeText(inp.value):Promise.reject()).then(()=>toast('링크를 복사했어요.'),()=>toast('링크를 길게 눌러 복사해 주세요.'));}
      else if(b.dataset.feed)feed(b.dataset.feed);
      if(b.id==='diary-ics')exportIcs();
      if(b.id==='auto-diary'){const on=b.checked;cloud.client.rpc('set_auto_diary',{p_on:on}).then(({error})=>{if(error){b.checked=!on;toast('설정을 바꾸지 못했어요.');return;}cloud.auto=on;toast(on?'업체 기록을 일기에 자동으로 남겨요.':'이제 업체 기록은 대화에만 남아요.');});}
    });
    document.querySelector('#diary-new').addEventListener('click',()=>openForm(selected?{date:selected}:{}));
  }
  /* 두 번 눌러야 지워지게 (브라우저 확인창 없이) */
  function confirmDelete(b){if(b.dataset.armed){return true;}b.dataset.armed='1';b.lastChild.textContent='한 번 더 누르면 지워져요';setTimeout(()=>{delete b.dataset.armed;b.lastChild.textContent='지우기';},2500);return false;}

  async function connect(user){
    cloud.user=user;cloud.client=window.FPChat&&FPChat.client;
    if(cloud.channel){cloud.client.removeChannel(cloud.channel);cloud.channel=null;}
    if(!user||!cloud.client){cloud.hasFeed=null;renderSync();return;}
    try{
      const [, s]=await Promise.all([loadCloud(),cloud.client.from('guardian_settings').select('auto_diary').maybeSingle()]);
      cloud.auto=s&&s.data?s.data.auto_diary:true;
    }catch{toast('계정의 일기를 불러오지 못해 이 탭의 일기로 보여 드려요.');}
    renderSync();render();
    cloud.channel=cloud.client.channel('diary:'+user.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'diary_entries',filter:'guardian_id=eq.'+user.id},p=>{
        const r=p.new;if(ctx.state.diary.some(e=>e.serverId===r.id))return;
        ctx.state.diary.push(toRec(r));ctx.save();loadMediaRows().then(render);
        if(r.source!=='manual')toast(`${r.place}에서 ${SOURCE[r.source]||'기록'}을 남겼어요.`);
      }).subscribe();
  }
  window.Diary={init(c){ctx=c;migrate(c.state);bind();connect(c.user||null);},setUser:connect,updatePetProfile(pet,petName){ctx.pet=pet;ctx.petName=petName;render();},render,openForm,forPlace,MOODS};
})();
