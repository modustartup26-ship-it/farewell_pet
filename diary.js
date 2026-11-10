/* 산책 일기: 다녀온 날과 다녀올 날을 한 권에. 달력 · 일기 · 구글 캘린더 추가 · .ics 내보내기 */
(function(){
  const {esc,icon,josa,toast}=FP;
  const MOODS={great:'신났어요',ok:'괜찮았어요',hard:'힘들어했어요'};
  const CAT={hospital:['병원','#1E56C2'],hotel:['호텔','#FFD400'],care:['호텔','#FFD400'],kindergarten:['유치원','#3E9B6F'],grooming:['미용','#E0738A'],etc:['기타','#8A93A3']};
  const TODOS=['투약 시간 다시 알려 주기','단독 돌봄 요청하기','좋아하는 담요 챙기기','다음 예약 잡기','사료 챙겨 보내기'];
  const WEEK=['일','월','화','수','목','금','토'];
  let ctx, month, selected=null;

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
    document.querySelector('#diary-sum').innerHTML=inMonth.length?`<b>이번 달 ${done.length}번 다녀왔어요</b>${Object.entries(counts).map(([k,v])=>`<span>${k} ${v}</span>`).join('')}${plans.length?`<span class="plan">예정 ${plans.length}</span>`:''}`:`<b>이번 달은 아직 기록이 없어요</b>`;
    const list=(selected?sorted().filter(e=>e.date===selected):sorted().filter(e=>e.date.startsWith(key)));
    document.querySelector('#diary-list').innerHTML=(selected?`<div class="day-filter">${nice(selected)} 기록 <button type="button" class="btn-ghost" data-clear-day>이번 달 전체 보기</button></div>`:'')+(list.length?list.map(entry).join(''):`<div class="empty">${Minimi.svg(Minimi.config(ctx.pet))}<b>${selected?'이 날은 아직 기록이 없어요':'아직 쓴 일기가 없어요'}</b><p>다녀온 곳의 기억이나 다녀올 예정을 남겨 보세요. 다음에 고를 때 참고할 수 있어요.</p><button type="button" class="btn btn-primary" data-diary-new="${selected||''}">${icon('edit')}일기 쓰기</button></div>`);
  }
  function entry(e){
    const c=CAT[e.cat]||CAT.etc, plan=isPlan(e), mm=Minimi.config(ctx.pet);
    const todos=(e.todos||[]);
    return `<article class="page ${plan?'is-plan':''}" data-id="${e.id}">
      <header class="page-head"><span class="date">${nice(e.date)}${e.time?` · ${esc(e.time)}`:''}</span>${plan?'<span class="tag plan">다녀올 예정</span>':`<span class="tag mood ${e.mood}">${MOODS[e.mood]||''}</span>`}</header>
      <div class="page-body">
        ${plan?'':`<div class="face">${Minimi.svg({...mm,mood:e.mood},{shadow:false})}</div>`}
        <div class="page-text">
          <p class="where"><span class="cat" style="--c:${c[1]}">${c[0]}</span>${e.placeId?`<button type="button" class="link" data-open="${e.placeId}">${esc(e.place)}</button>`:`<b>${esc(e.place)}</b>`}</p>
          ${e.text?`<p class="txt">${esc(e.text)}</p>`:''}
          ${todos.length?`<ul class="todos">${todos.map((t,i)=>`<li><label><input type="checkbox" data-todo="${e.id}:${i}" ${t.done?'checked':''}><span>${esc(t.t)}</span></label></li>`).join('')}</ul>`:''}
        </div>
        ${e.photo?`<figure class="polaroid"><img src="${e.photo}" alt="${esc(e.place)}에서 찍은 사진"></figure>`:''}
      </div>
      <footer class="page-foot"><a class="btn-ghost" href="${gcalUrl(e)}" target="_blank" rel="noopener noreferrer">${icon('calendar')}구글 캘린더에 추가</a><span class="sp"></span><button type="button" class="btn-ghost" data-diary-edit="${e.id}">${icon('edit')}고치기</button><button type="button" class="btn-ghost danger" data-diary-del="${e.id}">${icon('trash')}지우기</button></footer>
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
    let photo=v.photo||'';
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
      <div class="field-l" id="d-photo-wrap"><span>사진 <small>(선택)</small></span><div class="d-photo"><label class="photo-pick">${icon('camera')}<span>${photo?'사진 바꾸기':'사진 붙이기'}</span><input type="file" accept="image/*" id="d-photo"></label><div id="d-photo-prev">${photo?`<img src="${photo}" alt="">`:''}</div></div></div>
      <div class="field-l"><span>다음에 챙길 것</span><div class="chips">${TODOS.map(t=>`<label class="chip"><input type="checkbox" name="todo" value="${esc(t)}" ${checked.has(t)?'checked':''}>${esc(t)}</label>`).join('')}${extra.map(t=>`<label class="chip"><input type="checkbox" name="todo" value="${esc(t.t)}" checked>${esc(t.t)}</label>`).join('')}</div><input name="todoNew" maxlength="40" placeholder="직접 적기 (예: 산책 30분 더 부탁드리기)"></div>
      <div class="field-l" id="d-med" hidden><span>처방받은 약 <small>(병원)</small></span><input name="med" maxlength="60" placeholder="예: 피부약 7일분"><label class="check"><input type="checkbox" name="medToProfile" checked> ${esc(josa.of(ctx.petName))} 프로필 약 목록에도 넣기</label></div>`,
      `<button type="submit" form="modal-form" class="btn btn-primary">${icon('check')}일기 저장하기</button>`,
      fd=>{
        const date=fd.get('date');if(!date){toast('날짜를 골라 주세요.');return;}
        const pid=fd.get('placeId');const p=ctx.PLACES.find(x=>x.id===pid);
        const place=p?p.name:String(fd.get('place')||'').trim();
        if(!place){toast('어디에 갔는지 적어 주세요.');return;}
        const todos=fd.getAll('todo').map(t=>({t,done:!!(e&&(e.todos||[]).find(o=>o.t===t&&o.done))}));
        const nt=String(fd.get('todoNew')||'').trim();if(nt)todos.push({t:nt,done:false});
        const rec={id:e?e.id:'d'+Date.now(),date,time:fd.get('time')||'',placeId:p?p.id:null,place,cat:p?p.cat:'etc',mood:date>today()?'':(fd.get('mood')||'ok'),text:String(fd.get('text')||'').trim(),todos,photo};
        const med=String(fd.get('med')||'').trim();
        if(med){rec.text=(rec.text?rec.text+'\n':'')+'처방: '+med;if(fd.get('medToProfile')){ctx.pet.medications=[...(ctx.pet.medications||[]),{name:med,frequency:'',schedule:''}];ctx.pet.hasMedication='있음';ctx.state.pet=ctx.pet;}}
        if(e)Object.assign(e,rec);else ctx.state.diary.push(rec);
        ctx.save();ctx.close();month=new Date(parse(date).getFullYear(),parse(date).getMonth(),1);selected=null;
        ctx.setView('diary');toast(rec.date>today()?'다녀올 예정을 적어 뒀어요.':'일기를 저장했어요.');
      });
    const f=document.querySelector('#modal-form');
    const sync=()=>{const plan=f.date.value>today();document.querySelector('#d-mood').hidden=plan;document.querySelector('#d-photo-wrap').hidden=plan;document.querySelector('#plan-hint').hidden=!plan;const p=ctx.PLACES.find(x=>x.id===f.placeId.value);document.querySelector('#d-custom').hidden=f.placeId.value!=='__custom';document.querySelector('#d-med').hidden=!(p&&p.cat==='hospital')||plan;};
    f.date.addEventListener('change',sync);f.placeId.addEventListener('change',sync);sync();
    document.querySelector('#d-photo').addEventListener('change',ev=>{const file=ev.target.files[0];if(!file)return;const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const s=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);photo=c.toDataURL('image/jpeg',.8);URL.revokeObjectURL(url);document.querySelector('#d-photo-prev').innerHTML=`<img src="${photo}" alt="">`;};img.onerror=()=>toast('사진을 읽지 못했어요.');img.src=url;});
  }

  function bind(){
    document.querySelector('#view-diary').addEventListener('click',ev=>{
      const b=ev.target.closest('button,input');if(!b)return;
      if(b.dataset.cal){month=new Date(month.getFullYear(),month.getMonth()+Number(b.dataset.cal),1);selected=null;render();}
      if(b.dataset.day){selected=selected===b.dataset.day?null:b.dataset.day;render();}
      if(b.hasAttribute('data-clear-day')){selected=null;render();}
      if(b.dataset.diaryNew!==undefined){openForm(b.dataset.diaryNew?{date:b.dataset.diaryNew}:{});}
      if(b.dataset.diaryEdit)openForm({id:b.dataset.diaryEdit});
      if(b.dataset.diaryDel){const i=ctx.state.diary.findIndex(x=>x.id===b.dataset.diaryDel);if(i>-1&&confirmDelete(b)){ctx.state.diary.splice(i,1);ctx.save();render();toast('일기를 지웠어요.');}}
      if(b.dataset.todo){const [id,i]=b.dataset.todo.split(':');const e=ctx.state.diary.find(x=>x.id===id);if(e){e.todos[+i].done=b.checked;ctx.save();}}
    });
    document.querySelector('#diary-new').addEventListener('click',()=>openForm(selected?{date:selected}:{}));
    document.querySelector('#diary-ics').addEventListener('click',exportIcs);
  }
  /* 두 번 눌러야 지워지게 (브라우저 확인창 없이) */
  function confirmDelete(b){if(b.dataset.armed){return true;}b.dataset.armed='1';b.lastChild.textContent='한 번 더 누르면 지워져요';setTimeout(()=>{delete b.dataset.armed;b.lastChild.textContent='지우기';},2500);return false;}

  window.Diary={init(c){ctx=c;migrate(c.state);bind();},updatePetProfile(pet,petName){ctx.pet=pet;ctx.petName=petName;render();},render,openForm,forPlace,MOODS};
})();
