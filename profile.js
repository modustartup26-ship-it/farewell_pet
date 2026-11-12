(function(){
  const {esc,icon,josa}=FP;
  const state=FP.load();
  const pet={breed:'',years:'',months:'',sex:'',dogs:'',people:'',separation:'',weight:'',concerns:[],hasMedication:'',medications:[],photo:'',...state.pet};
  const form=document.querySelector('#wizard');
  const shell=document.querySelector('#wizard-shell');
  const gate=document.querySelector('#profile-gate');
  const $=s=>document.querySelector(s);
  let guestMode=false;
  const BREEDS=['믹스견','말티즈','푸들','포메라니안','시추','치와와','요크셔테리어','비숑프리제','스피츠','닥스훈트','코카스패니얼','프렌치불독','퍼그','미니어처 슈나우저','카발리에','웰시코기','비글','시바견','진돗개','보더콜리','사모예드','골든리트리버','래브라도 리트리버','저먼셰퍼드','기타'];
  const radio=(name,values,selected)=>values.map(v=>`<label class="chip"><input type="radio" name="${name}" value="${esc(v)}" ${v===selected?'checked':''}>${esc(v)}</label>`).join('');

  async function persist(){
    state.pet=pet;
    if(!guestMode){
      try{await FPChat.savePetProfile(pet);}
      catch(error){console.error('Unable to save pet profile.',error);showError('아이 정보를 계정에 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');return false;}
    }
    if(!FP.save(state))FP.toast(guestMode?'아이 정보를 현재 탭에 저장하지 못했어요.':'계정에는 저장됐지만 이 기기에 표시용 정보를 저장하지 못했어요.');
    return true;
  }

  const steps=[
    {key:'name',
     q:()=>'우리 아이 이름을 알려주세요',
     hint:()=>'이름을 알려주시면 다음 질문부터 이름으로 불러 드릴게요.',
     render:()=>`<label class="field"><span class="sr-only">우리 아이 이름</span><input name="name" maxlength="20" placeholder="예: 초롱이" value="${esc(pet.name||'')}" enterkeyhint="next"></label>`,
     read:f=>{const v=f.name.value.trim();if(!v)return '이름을 입력해 주세요.';pet.name=v;}},
    {key:'breed',optional:true,
     q:p=>`${josa.of(p.name)} 견종은?`,
     hint:()=>'믹스견도 괜찮아요. 품종보다 실제 체급과 몸무게를 기준으로 맞는 곳을 찾아요.',
     render:p=>{const other=p.breed&&!BREEDS.includes(p.breed);return `<div class="chips grid3">${radio('breed',BREEDS,other?'기타':p.breed)}</div><label class="field" id="other-breed" style="margin-top:14px" ${other?'':'hidden'}><span class="sr-only">견종 직접 입력</span><input name="otherBreed" maxlength="30" placeholder="견종을 직접 입력해 주세요" value="${other?esc(p.breed):''}"></label>`;},
     bind:()=>$('#answer').querySelectorAll('input[name=breed]').forEach(r=>r.addEventListener('change',()=>{$('#other-breed').hidden=r.value!=='기타';if(r.value==='기타')form.elements.otherBreed.focus();})),
     read:f=>{const b=f.breed.value;if(!b)return;if(b==='기타'){const o=f.otherBreed.value.trim();if(!o)return '견종을 입력해 주세요.';pet.breed=o;}else pet.breed=b;}},
    {key:'age',optional:true,
     q:p=>`${josa.topic(p.name)} 몇 살이에요?`,
     hint:()=>'노령견 돌봄이 가능한 곳을 고를 때 참고해요. 정확하지 않아도 괜찮아요.',
     render:p=>`<div class="row2"><label class="field"><input name="years" type="number" inputmode="numeric" min="0" max="30" placeholder="0" value="${esc(p.years)}"><span class="unit">살</span></label><label class="field"><input name="months" type="number" inputmode="numeric" min="0" max="11" placeholder="0" value="${esc(p.months)}"><span class="unit">개월</span></label></div><p class="sub" style="margin-top:28px">성별</p><div class="chips grid3">${radio('sex',['암컷','수컷'],p.sex)}</div>`,
     read:f=>{const y=f.years.value,m=f.months.value;if(y!==''&&(+y<0||+y>30))return '나이는 0살에서 30살 사이로 입력해 주세요.';if(m!==''&&(+m<0||+m>11))return '개월은 0에서 11 사이로 입력해 주세요.';pet.years=y===''?'':+y;pet.months=m===''?'':+m;pet.sex=f.sex.value||pet.sex;}},
    {key:'temper',optional:true,
     q:p=>`${josa.of(p.name)} 성격은 어때요?`,
     hint:()=>'합사나 단독 돌봄이 필요한지 판단할 때 써요.',
     render:p=>`<p class="sub">다른 개와 만나면</p><div class="chips">${radio('dogs',['잘 어울려요','천천히 적응해요','혼자가 편해요'],p.dogs)}</div><p class="sub">낯선 사람에게는</p><div class="chips">${radio('people',['반가워해요','조금 경계해요','많이 무서워해요'],p.people)}</div><p class="sub">보호자와 떨어지면</p><div class="chips">${radio('separation',['잘 기다려요','조금 불안해해요','많이 불안해해요'],p.separation)}</div>`,
     read:f=>{pet.dogs=f.dogs.value||pet.dogs;pet.people=f.people.value||pet.people;pet.separation=f.separation.value||pet.separation;}},
    {key:'mcpq',optional:true,test:true,
     q:p=>`${josa.of(p.name)} 성격을 더 자세히 알아볼까요?`,
     hint:()=>'',
     render:()=>'',
     bind:()=>mcPaint(),
     onNext:()=>mcNext(),
     onBack:()=>mcBack(),
     read:()=>{if(mc.mode==='result'){const sc=MCPQ.score(mc.answers);pet.mcpq={answers:{...mc.answers},scores:sc,type:MCPQ.nickname(sc),date:new Date().toISOString().slice(0,10)};}}},
    {key:'weight',optional:true,
     q:p=>`${josa.of(p.name)} 몸무게는?`,
     hint:()=>'호텔과 돌봄 시설은 체중으로 받을 수 있는지 정해요. 최근에 잰 몸무게를 적어 주세요.',
     render:p=>`<label class="field"><span class="sr-only">몸무게</span><input name="weight" type="number" inputmode="decimal" step="0.1" min="0.3" max="100" placeholder="0.0" value="${esc(p.weight)}"><span class="unit">kg</span></label><div class="size-badge" id="size-badge" aria-live="polite"></div>`,
     bind:()=>{const upd=()=>{const kg=parseFloat(form.elements.weight.value);const size=FP.sizeFromWeight(kg);const m=Minimi.config({...pet,size});$('#size-badge').innerHTML=size?`${Minimi.svg({...m,size:size==='소형견'?'small':size==='대형견'?'large':'medium'})}<div><strong>${size}이에요</strong><span>${size==='소형견'?'5kg 미만':size==='중형견'?'5kg 이상 15kg 미만':'15kg 이상'} 기준으로 시설을 찾아요.</span></div>`:'<div><strong>몸무게를 입력하면</strong><span>체급(소형·중형·대형)을 알려 드려요.</span></div>';};form.elements.weight.addEventListener('input',upd);upd();},
     read:f=>{const v=f.weight.value;if(v==='')return;const kg=parseFloat(v);if(!(kg>=.3&&kg<=100))return '몸무게는 0.3kg에서 100kg 사이로 입력해 주세요.';pet.weight=Math.round(kg*10)/10;pet.size=FP.sizeFromWeight(kg);if(pet.minimi&&!pet.minimiSizeTouched)pet.minimi.size=undefined;}},
    {key:'concerns',optional:true,
     q:p=>`${josa.of(p.name)} 건강 고민을 알려주세요`,
     hint:()=>`최대 ${Concerns.MAX}개까지 고를 수 있어요.`,
     render:p=>{const why=Concerns.explain(p),rec=why.map(h=>h.id),sel=p.concerns||[],lack=Concerns.missing(p);
       const panel=why.length?`<section class="rec-why"><h3>${esc(josa.name(p.name))}에게 추천하는 이유</h3><ul>${why.map(h=>`<li><b>${esc(Concerns.labels([h.id])[0])}</b> ${h.reasons.slice(0,2).map(r=>esc(r.why)).join('<br>')}</li>`).join('')}</ul><p>연구 통계에서 많이 나타난 항목이고, ${esc(josa.name(p.name))}의 진단이 아니에요. 아직 수의사 검토 전인 프로토타입이에요.${lack.length?` ${esc(lack.join('·'))} 정보를 입력하면 더 맞춰 드려요.`:''}</p><details class="refs"><summary>참고한 연구</summary><ul>${Concerns.usedSources(why).map(s=>`<li>${esc(s.cite)} <a href="${s.url}" target="_blank" rel="noopener noreferrer">원문</a></li>`).join('')}</ul><p>해외 연구는 국내 반려견과 다를 수 있어요.</p></details></section>`:`<p class="rec-none">나이·몸무게·성별·견종을 입력하면 맞는 항목을 추천해 드려요.</p>`;
       return `${panel}<div class="concerns">${Concerns.ordered(p).map(it=>`<label class="concern">${rec.includes(it.id)?'<span class="rec">추천</span>':''}<input type="checkbox" name="concern" value="${it.id}" ${sel.includes(it.id)?'checked':''}>${Concerns.icon(it)}<span>${esc(it.label)}</span></label>`).join('')}</div><p class="concern-count tnum" id="concern-count" aria-live="polite"></p>`;},
     bind:()=>{
       const boxes=[...$('#answer').querySelectorAll('input[name=concern]')];
       const count=()=>{$('#concern-count').textContent=`${boxes.filter(b=>b.checked).length} / ${Concerns.MAX}개 선택`;};
       boxes.forEach(b=>b.addEventListener('change',()=>{if(boxes.filter(x=>x.checked).length>Concerns.MAX){b.checked=false;showError(`최대 ${Concerns.MAX}개까지 고를 수 있어요.`);}count();}));
       count();
     },
     read:()=>{pet.concerns=[...$('#answer').querySelectorAll('input[name=concern]:checked')].map(b=>b.value);}},
    {key:'meds',optional:true,
     q:p=>`${josa.subj(p.name)} 먹는 약이 있나요?`,
     hint:()=>'투약을 도와줄 수 있는 곳인지 확인할 때 써요. 병원에 문의할 때도 함께 전달할 수 있어요.',
     render:p=>`<div class="chips grid3">${radio('hasMedication',['없어요','있어요'],p.hasMedication==='있음'?'있어요':p.hasMedication==='없음'?'없어요':'')}</div><div id="meds" ${p.hasMedication==='있음'?'':'hidden'}><div class="med-list" id="med-list"></div><button type="button" class="btn btn-soft add-med" id="add-med">${icon('plus')} 약 추가</button></div>`,
     bind:()=>{
       const list=$('#med-list');
       const add=(m={})=>{const row=document.createElement('div');row.className='med';row.innerHTML=`<label>약 이름<input data-med="name" maxlength="60" placeholder="예: 심장약" value="${esc(m.name)}"></label><label class="freq">주기<select data-med="frequency">${['매일','매주','매월','필요할 때'].map(v=>`<option ${m.frequency===v?'selected':''}>${v}</option>`).join('')}</select></label><button type="button" class="icon-btn" aria-label="이 약 삭제">${icon('trash')}</button><label class="wide">먹는 시간·양<input data-med="schedule" maxlength="80" placeholder="예: 아침·저녁 반 알" value="${esc(m.schedule)}"></label>`;row.querySelector('button').onclick=()=>{row.remove();if(!list.children.length)add();};list.append(row);};
       (pet.medications&&pet.medications.length?pet.medications:[{}]).forEach(add);
       $('#add-med').onclick=()=>{add();list.lastElementChild.querySelector('input').focus();};
       $('#answer').querySelectorAll('input[name=hasMedication]').forEach(r=>r.addEventListener('change',()=>{$('#meds').hidden=r.value!=='있어요';}));
     },
     read:f=>{const v=f.hasMedication.value;if(!v)return;if(v==='없어요'){pet.hasMedication='없음';pet.medications=[];return;}const meds=[...document.querySelectorAll('.med')].map(r=>Object.fromEntries([...r.querySelectorAll('[data-med]')].map(i=>[i.dataset.med,i.value.trim()]))).filter(m=>m.name||m.schedule);if(!meds.length||meds.some(m=>!m.name))return '약 이름을 입력해 주세요.';pet.hasMedication='있음';pet.medications=meds;}},
    {key:'photo',optional:true,
     q:p=>`${josa.of(p.name)} 사진을 올려 주세요`,
     hint:()=>'프로필과 병원 문의에 쓰여요. 사진도 계정에 함께 저장돼요.',
     render:p=>`<label class="photo-drop" id="photo-drop">${p.photo?`<img src="${p.photo}" alt="${esc(p.name)} 사진">`:`${icon('camera')}<span>사진 고르기</span>`}<input type="file" name="photo" accept="image/*" aria-label="사진 고르기"></label><div class="photo-actions">${p.photo?`<button type="button" class="btn-ghost" id="photo-remove">${icon('trash')} 사진 지우기</button>`:''}</div>`,
     bind:()=>{
       form.elements.photo.addEventListener('change',async()=>{const file=form.elements.photo.files[0];if(!file)return;if(!file.type.startsWith('image/')){showError('이미지 파일을 골라 주세요.');return;}
         const img=new Image();const url=URL.createObjectURL(file);img.onload=async()=>{const max=420,s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);pet.photo=c.toDataURL('image/jpeg',.82);URL.revokeObjectURL(url);if(await persist())show(index,0);};img.onerror=()=>showError('사진을 읽지 못했어요. 다른 사진을 골라 주세요.');img.src=url;});
       const rm=$('#photo-remove');if(rm)rm.onclick=async()=>{pet.photo='';if(await persist())show(index,0);};
     },
     read:()=>{}},
    {key:'minimi',optional:true,studio:true,
     q:p=>`${josa.of(p.name)} 미니미를 꾸며 볼까요?`,
     hint:()=>'산책 지도 가운데에서 우리 아이 대신 걸어 다녀요.',
     render:()=>`<div class="studio"><div class="stage" id="stage"></div><div class="tabs" role="tablist" aria-label="꾸밀 부분">${[['face','얼굴'],['size','몸'],['color','색깔'],['acc','액세서리']].map(([k,l],i)=>`<button type="button" class="tab" role="tab" data-tab="${k}" aria-selected="${i===0}">${l}</button>`).join('')}</div><div id="options" role="tabpanel"></div></div>`,
     bind:()=>{
       const cfg=Minimi.config(pet);let tab='face';
       const tufts=[[8,'#6FA64B'],[22,'#4F8C3F'],[72,'#6FA64B'],[86,'#4F8C3F']].map(([x,c])=>`<svg class="tuft" style="left:${x}%" viewBox="-12 -18 24 20" aria-hidden="true"><path d="M0 0 q-3 -8 -8 -12 M0 0 q0 -11 1.5 -16 M0 0 q3 -8 8 -11" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/></svg>`).join('');
       const paint=(pop)=>{$('#stage').innerHTML=tufts+Minimi.svg(cfg,{title:`${josa.of(pet.name)} 미니미`,cls:pop?'pop':''});};
       const sets={face:Object.entries(Minimi.FACES),size:Object.entries(Minimi.SIZES),acc:Object.entries(Minimi.ACCS)};
       const colorOpts=()=>{
         const swatch=k=>Minimi.palette({...cfg,color:k}).swatch;
         $('#options').className='options colors';
         $('#options').innerHTML=Minimi.COLOR_GROUPS.map(([title,keys])=>`<h3 class="color-group">${title}</h3>${keys.map(k=>`<button type="button" class="opt" data-k="${k}" aria-pressed="${cfg.color===k}"><span class="swatch" ${k==='custom'?'id="custom-swatch" ':''}style="background:${swatch(k)}"></span>${esc(Minimi.COLORS[k].label)}</button>`).join('')}${keys.includes('custom')&&cfg.color==='custom'?`<label class="color-pick"><span>원하는 색을 골라 주세요</span><input type="color" id="custom-color" value="${esc(Minimi.palette(cfg).swatch)}" aria-label="털 색 직접 고르기"></label>`:''}`).join('');
         const pick=$('#custom-color');
         if(pick)pick.addEventListener('input',()=>{cfg.customColor=pick.value;pet.minimi={...cfg};$('#custom-swatch').style.background=pick.value;paint(false);});
       };
       const opts=()=>{if(tab==='color')return colorOpts();const list=sets[tab];$('#options').className='options'+(list.length>3?' five':'');$('#options').innerHTML=list.map(([k,l])=>`<button type="button" class="opt" data-k="${k}" aria-pressed="${cfg[tab]===k}">${Minimi.svg({...cfg,[tab]:k},{shadow:false})}${esc(l)}</button>`).join('');};
       $('#options').addEventListener('click',e=>{const b=e.target.closest('.opt');if(!b)return;cfg[tab]=b.dataset.k;if(tab==='size')pet.minimiSizeTouched=true;pet.minimi={...cfg};opts();paint(true);});
       document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;tab=b.dataset.tab;document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',t===b));opts();});
       paint(false);opts();
       steps[index]._cfg=cfg;
     },
     read:()=>{pet.minimi={...steps[index]._cfg};}}
  ];


  /* ---------- 성격 검사 (MCPQ-R) ---------- */
  const mc={mode:pet.mcpq&&pet.mcpq.scores?'result':'intro',i:0,answers:{...((pet.mcpq&&pet.mcpq.answers)||{})}};
  const N=MCPQ.ITEMS.length;
  const refsHTML=()=>`<details class="refs"><summary>참고한 연구</summary><ul>${MCPQ.refs.map((r,i)=>`<li>${esc(r)} <a href="${MCPQ.dois[i]}" target="_blank" rel="noopener noreferrer">DOI</a></li>`).join('')}</ul><p>질문의 한국어 표현과 해설은 이 서비스가 원문 단어를 바탕으로 쉽게 풀어 쓴 것이에요. 보호자의 관찰로 성향을 정리하는 도구이고, 행동 문제나 건강을 진단하지 않아요.</p></details>`;
  function mcPaint(){
    const name=pet.name;
    $('#next').disabled=false;$('#skip').hidden=false;
    if(mc.mode==='intro'){
      $('#question').textContent=`${josa.of(name)} 성격을 더 자세히 알아볼까요?`;
      $('#hint').textContent='보호자가 단어 26개에 답하면, 다섯 가지 성향으로 정리해 드려요. 3분쯤 걸려요.';
      $('#answer').innerHTML=`<div class="mc-intro"><div class="mc-factors">${MCPQ.ORDER.map(f=>`<span style="--c:${MCPQ.FACTORS[f].color}"><b>${MCPQ.FACTORS[f].name}</b>${MCPQ.FACTORS[f].nick}</span>`).join('')}</div><p class="mc-how">단어마다 <b>${esc(josa.name(name))}</b>를 얼마나 잘 설명하는지 여섯 단계 중에서 골라 주세요. 정답은 없어요. 평소 모습을 떠올리면 돼요.</p><p class="mc-src">호주 모내시 대학 연구진이 만든 <b>반려견 성격 질문지(MCPQ-R)</b>를 바탕으로 했어요.</p>${refsHTML()}</div>`;
      $('#next').textContent='검사 시작하기';$('#skip').textContent='건너뛸게요';
    }else if(mc.mode==='q'){
      const [id,f,word,gloss]=MCPQ.ITEMS[mc.i];const cur=mc.answers[id];
      $('#question').textContent=`‘${word}’`;
      $('#hint').textContent=gloss;
      $('#answer').innerHTML=`<div class="mc-q"><div class="mc-track" aria-hidden="true"><span style="width:${(mc.i/N*100).toFixed(1)}%"></span></div><p class="mc-count tnum">${mc.i+1} / ${N} · 이 말이 ${esc(josa.name(name))}를 얼마나 잘 설명하나요?</p><div class="mc-scale" role="radiogroup" aria-label="${esc(word)} 평가">${MCPQ.SCALE.map((l,k)=>`<button type="button" role="radio" class="mc-opt" data-v="${k+1}" aria-checked="${cur===k+1}" style="--s:${.7+k*.075}"><span class="mc-dot"></span><span class="mc-l">${l}</span></button>`).join('')}</div><p class="mc-tip">${MCPQ.FACTORS[f].nick} 관련 단어예요</p></div>`;
      $('#answer').querySelectorAll('.mc-opt').forEach(b=>b.addEventListener('click',()=>{mc.answers[id]=+b.dataset.v;$('#answer').querySelectorAll('.mc-opt').forEach(x=>x.setAttribute('aria-checked',x===b));setTimeout(()=>mcAdvance(1),200);}));
      $('#next').textContent=mc.i===N-1?'결과 보기':'다음 단어';$('#next').disabled=!cur;$('#skip').textContent='다음에 할게요';
    }else{
      const sc=MCPQ.score(mc.answers);const nick=MCPQ.nickname(sc);
      $('#question').textContent=`${josa.of(name)} 성격 프로필`;
      $('#hint').textContent='보호자가 답한 내용을 다섯 가지 성향으로 정리했어요. 점수는 0~100이에요.';
      $('#answer').innerHTML=`<div class="mc-result"><div class="mc-type"><span>재미로 붙인 별명</span><b>${esc(nick)}</b></div>${MCPQ.radar(sc,{label:josa.of(name)+' 성격 프로필'})}<div class="mc-bars">${MCPQ.ORDER.map(f=>{const F=MCPQ.FACTORS[f],v=sc[f];return `<section class="mc-bar" style="--c:${F.color}"><div class="mc-bar-head"><h3>${F.name} <small>${F.nick}</small></h3><span class="tnum"><b>${v}</b> · ${MCPQ.level(v)}</span></div><div class="mc-meter" aria-hidden="true"><span style="width:${v}%"></span><i style="left:${v}%"></i></div><p>${F.about}</p>${v>=65||v<35?`<p class="mc-care"><b>돌봄 시설 고를 때</b> ${v>=65?F.hi:F.lo}</p>`:''}</section>`;}).join('')}</div><button type="button" class="btn btn-soft" id="mc-retake">${icon('refresh')}다시 검사하기</button>${refsHTML()}</div>`;
      $('#mc-retake').onclick=()=>{mc.mode='q';mc.i=0;mcPaint();};
      $('#next').textContent='다음';$('#skip').hidden=true;
    }
  }
  function mcAdvance(d){
    form.classList.remove('enter','enter-back');void form.offsetWidth;form.classList.add(d>0?'enter':'enter-back');
    if(d>0){if(mc.i<N-1)mc.i++;else mc.mode='result';}
    else if(d<0){if(mc.i>0)mc.i--;else mc.mode='intro';}
    mcPaint();window.scrollTo(0,0);
  }
  function mcNext(){
    if(mc.mode==='intro'){mc.mode='q';const first=MCPQ.ITEMS.findIndex(it=>!mc.answers[it[0]]);mc.i=first<0?0:first;mcAdvance(0);return true;}
    if(mc.mode==='q'){const id=MCPQ.ITEMS[mc.i][0];if(!mc.answers[id]){showError('가장 가까운 답을 하나 골라 주세요.');return true;}mcAdvance(1);return true;}
    return false;
  }
  function mcBack(){if(mc.mode==='q'){mcAdvance(-1);return true;}if(mc.mode==='result'&&!(pet.mcpq&&pet.mcpq.scores)){mc.mode='q';mc.i=N-1;mcPaint();return true;}return false;}

  let index=0;
  const total=steps.length;
  function showError(msg){$('#error').textContent=msg||'';}
  function asker(){$('#asker').innerHTML=pet.photo?`<img src="${pet.photo}" alt="">`:Minimi.svg(Minimi.config(pet));}
  function progress(i){const p=Math.min(1,i/total);$('#progress-fill').style.width=(p*100)+'%';$('#progress-paw').style.left=(p*100)+'%';$('#count').textContent=i<total?`${i+1} / ${total}`:'';}

  function show(i,dir){
    index=i;const s=steps[i];showError('');
    form.classList.remove('enter','enter-back');void form.offsetWidth;if(dir)form.classList.add(dir>0?'enter':'enter-back');
    if(!s)return done();
    form.hidden=false;document.querySelector('.ask').hidden=false;
    $('#question').textContent=s.q(pet);$('#hint').textContent=s.hint(pet);
    $('#optional').hidden=!s.optional;
    $('#answer').innerHTML=s.render(pet);
    $('#skip').hidden=!s.optional;
    $('#skip').disabled=false;
    $('#skip').textContent=s.studio?'꾸미지 않고 넘어갈게요':'나중에 입력할게요';
    $('#next').textContent=i===total-1?'완성하기':'다음';$('#next').disabled=false;
    $('#back').style.visibility='visible';
    asker();progress(i);
    if(s.bind)s.bind();
    if(dir!==0){const first=$('#answer').querySelector('input:not([type=file]):not([type=radio]):not([type=checkbox])');if(first&&!matchMedia('(pointer:coarse)').matches)first.focus();else $('#question').focus({preventScroll:true});}
  }

  function done(){
    progress(total);
    $('#count').textContent='';$('#skip').hidden=true;
    const summary=[pet.breed,pet.years!==''&&pet.years!=null?`${pet.years}살${pet.months?` ${pet.months}개월`:''}`:'',pet.weight?`${pet.weight}kg · ${pet.size}`:'',pet.concerns&&pet.concerns.length?`건강 고민: ${Concerns.labels(pet.concerns).join(', ')}`:'',pet.hasMedication==='있음'?`약 ${pet.medications.length}가지`:pet.hasMedication==='없음'?'먹는 약 없음':'',pet.mcpq&&pet.mcpq.type?pet.mcpq.type:''].filter(Boolean);
    document.querySelector('.ask').hidden=true;showError('');
    $('#answer').innerHTML=`<div class="done">${Minimi.svg(Minimi.config(pet),{title:`${josa.of(pet.name)} 미니미`})}<div><h1>${esc(josa.name(pet.name))} 등록 완료!</h1><p>이제 산책로를 따라 ${esc(josa.name(pet.name))}에게 맞는 곳을 찾아볼까요?</p><div class="summary">${summary.map(t=>`<span>${esc(t)}</span>`).join('')||'<span>입력하지 않은 항목은 나중에 채울 수 있어요</span>'}</div></div></div>`;
    $('#next').textContent='산책 지도로 가기';
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(index>=total){location.href='services.html';return;}
    if(steps[index].onNext&&steps[index].onNext())return;
    const err=steps[index].read(form.elements);
    if(err){showError(err);const bad=form.querySelector('input:not([type=radio]):not([type=file])');if(bad)bad.focus();return;}
    $('#next').disabled=true;
    if(await persist())show(index+1,1);
    else $('#next').disabled=false;
  });
  $('#skip').addEventListener('click',async()=>{
    if(steps[index]&&steps[index].test&&mc.mode!=='intro')mc.mode=pet.mcpq&&pet.mcpq.scores?'result':'intro';
    $('#skip').disabled=true;
    if(await persist())show(index+1,1);
    else $('#skip').disabled=false;
  });
  $('#back').addEventListener('click',()=>{if(steps[index]&&steps[index].onBack&&steps[index].onBack())return;if(index===0){location.href=state.pet&&state.pet.name?'services.html':'index.html';return;}show(index-1,-1);});
  form.addEventListener('input',()=>showError(''));

  function showGate(message=''){
    shell.hidden=true;gate.hidden=false;
    const authError=$('#profile-auth-error');
    if(message){authError.textContent=message;authError.hidden=false;}
    $('#guest-profile').addEventListener('click',()=>{
      guestMode=true;
      gate.hidden=true;shell.hidden=false;
      const start=new URLSearchParams(location.search).get('step');
      const si=steps.findIndex(s=>s.key===start);
      show(si>0&&pet.name?si:0,0);
    },{once:true});
    $('#profile-auth').addEventListener('click',()=>window.FPAuth.open({onSuccess:initialize}));
  }

  async function initialize(){
    if(!window.FPChat||!FPChat.client){showGate('로그인 연결을 사용할 수 없어요. 로그인 없이 임시 등록은 계속할 수 있어요.');return;}
    try{
      const legacyPet={...state.pet};
      const result=await FPChat.loadPetProfile(legacyPet);
      if(!result.user){showGate();return;}
      for(const key of Object.keys(pet))delete pet[key];
      Object.assign(pet,result.pet||{});
      state.pet=pet;
      if(!FP.save(state))FP.toast('아이 정보는 계정에 저장돼 있지만 이 기기에 표시용 정보를 저장하지 못했어요.');
      gate.hidden=true;shell.hidden=false;
      const start=new URLSearchParams(location.search).get('step');
      const si=steps.findIndex(s=>s.key===start);
      show(si>0&&pet.name?si:0,0);
    }catch(error){
      console.error('Unable to load pet profile.',error);
      showGate('아이 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    }
  }
  initialize();
})();
