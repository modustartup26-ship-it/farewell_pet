/* 보호자 이용기록: 다녀온 보호자가 시설의 실제 돌봄 조건을 알려 주고, 시설 상세에서 모아 보여 준다.
   - 질문은 산책 일기를 쓸 때 장소 종류에 맞춰 2~4개만 묻는다. 모두 선택 사항.
   - 답은 로그인한 계정의 place_reports에 저장되고, 다른 사람에게는 시설별 집계만 보인다.
   - 업체가 확인한 정보가 아니므로 '조건에 맞아요' 판정에는 쓰지 않고, 근거로만 나란히 보여 준다. */
(function(){
  const {esc,icon}=FP;
  const DONT='잘 모르겠어요';
  /* kind: care(호텔·돌봄·유치원) · grooming · hospital
     need: 필터 조건 이름과 이어 주는 열쇠. good: 그 조건을 뒷받침하는 답 */
  const Q={
    care:[
      {k:'together',q:'다른 아이들과 어떻게 지냈나요?',opts:['다른 아이들과 함께 지냈어요','따로 지냈어요',DONT],need:'단독 돌봄',good:'따로 지냈어요'},
      {k:'med',q:'약을 부탁드렸나요?',opts:['부탁드렸고 챙겨 주셨어요','부탁드렸지만 어렵다고 하셨어요','부탁하지 않았어요'],need:'투약 지원',good:'부탁드렸고 챙겨 주셨어요',bad:'부탁드렸지만 어렵다고 하셨어요'},
      {k:'night',q:'밤에도 돌봐 주는 사람이 있었나요?',opts:['밤에도 사람이 있었어요','밤에는 사람이 없었어요','밤을 보내지 않았어요'],need:'야간 관리',good:'밤에도 사람이 있었어요',bad:'밤에는 사람이 없었어요'},
      {k:'extras',q:'받은 돌봄을 모두 골라 주세요',multi:true,opts:['산책','목욕','실내 놀이','실외 놀이','사진·영상 소식','픽업']}
    ],
    grooming:[
      {k:'extras',q:'받은 미용을 모두 골라 주세요',multi:true,opts:['가위컷','클리퍼(기계) 미용','목욕만','스파','특수견 미용','노령견 배려']},
      {k:'watch',q:'미용하는 동안 어땠나요?',opts:['미용하는 걸 볼 수 있었어요','맡기고 다녀왔어요']}
    ],
    hospital:[
      {k:'extras',q:'어떤 진료를 받았나요? (모두 골라 주세요)',multi:true,opts:['예방접종','건강검진','피부·귀','치과','외과·수술','노령견 진료','야간·응급 진료']},
      {k:'explain',q:'진료비를 미리 설명해 주셨나요?',opts:['미리 설명해 주셨어요','설명 없이 진행됐어요',DONT]}
    ]
  };
  const KIND_LABEL={care:'맡기기(호텔·유치원)',grooming:'미용',hospital:'진료'};
  /* 장소가 받을 수 있는 질문 종류 */
  function kindsFor(p){
    if(!p)return [];
    const out=[];
    if(p.kinds.includes('hospital'))out.push('hospital');
    if(p.kinds.includes('hotel')||p.kinds.includes('kinder'))out.push('care');
    if(p.kinds.includes('grooming'))out.push('grooming');
    if(p.cat==='grooming'&&out[0]==='care')out.reverse();
    return out;
  }

  /* ---------- 일기 양식 ---------- */
  function formHtml(p,rep,pet){
    const kinds=kindsFor(p);if(!kinds.length)return '';
    const kind=rep&&kinds.includes(rep.kind)?rep.kind:kinds[0];
    const size=rep?rep.size||'':FP.sizeFromWeight(pet&&pet.weight)||'';
    const a=(rep&&rep.answers)||{};
    const pick=kinds.length>1?`<div class="rep-q"><span>무엇을 이용했나요?</span><div class="chips">${kinds.map(k=>`<label class="chip"><input type="radio" name="rep_kind" value="${k}" ${k===kind?'checked':''}>${KIND_LABEL[k]}</label>`).join('')}</div></div>`:`<input type="hidden" name="rep_kind" value="${kind}">`;
    const qs=kinds.map(k=>`<div class="rep-set" data-kind="${k}" ${k===kind?'':'hidden'}>${(k==='hospital'?[]:[{k:'size',q:'이용할 때 체급은요?',opts:['소형견','중형견','대형견']}]).concat(Q[k]).map(q=>{
      const cur=q.k==='size'?size:a[q.k];
      return `<div class="rep-q"><span>${esc(q.q)}${q.k==='size'&&!rep&&size?' <small>프로필 몸무게로 골라 뒀어요</small>':''}</span><div class="chips">${q.opts.map(o=>`<label class="chip"><input type="${q.multi?'checkbox':'radio'}" name="rep_${k}_${q.k}" value="${esc(o)}" ${(q.multi?(cur||[]).includes(o):cur===o)?'checked':''}>${esc(o)}</label>`).join('')}</div></div>`;}).join('')}</div>`).join('');
    return `<details class="field-l rep-form" id="d-rep" ${rep||!p.public?'open':''}>
      <summary>${icon('check')}이곳, 다음 보호자에게 알려 주기 <small>(선택 · 1분)</small></summary>
      <p class="rep-why">알려 주신 내용은 이름 없이 숫자로만 모여서, 다른 보호자가 ‘투약 가능?’, ‘따로 지내?’ 같은 걸 미리 알 수 있게 돼요.</p>
      ${pick}${qs}</details>`;
  }
  function bindForm(root){
    const sync=()=>{const k=(root.querySelector('input[name=rep_kind]:checked')||root.querySelector('input[name=rep_kind]')||{}).value;root.querySelectorAll('.rep-set').forEach(s=>s.hidden=s.dataset.kind!==k);};
    root.querySelectorAll('input[name=rep_kind]').forEach(i=>i.addEventListener('change',sync));sync();
  }
  /* 양식에서 답을 읽는다. 아무것도 안 골랐으면 null */
  function read(fd){
    const kind=fd.get('rep_kind');if(!kind||!Q[kind])return null;
    const answers={};
    Q[kind].forEach(q=>{
      if(q.multi){const v=fd.getAll(`rep_${kind}_${q.k}`).filter(o=>q.opts.includes(o));if(v.length)answers[q.k]=v;}
      else{const v=fd.get(`rep_${kind}_${q.k}`);if(v&&q.opts.includes(v))answers[q.k]=v;}
    });
    const size=kind==='hospital'?null:fd.get(`rep_${kind}_size`)||null;
    return Object.keys(answers).length||size?{kind,size,answers}:null;
  }

  /* ---------- 저장 ---------- */
  async function push(client,e){
    if(!client)return;
    try{
      if(!e.report||!e.placeId){await client.from('place_reports').delete().eq('diary_client_id',e.id);return;}
      const row={place_id:e.placeId,diary_client_id:e.id,visited_on:e.date,kind:e.report.kind,size:e.report.size,answers:e.report.answers};
      const {data}=await client.from('place_reports').select('id').eq('diary_client_id',e.id).maybeSingle();
      if(data)await client.from('place_reports').update({...row,updated_at:new Date().toISOString()}).eq('id',data.id);
      else await client.from('place_reports').insert(row);
      delete cache[e.placeId];
    }catch{}
  }
  async function loadMine(client){
    try{const {data}=await client.from('place_reports').select('diary_client_id,place_id,kind,size,answers');return data||[];}catch{return [];}
  }

  /* ---------- 집계 ---------- */
  const cache={};
  async function summaries(ids){
    const client=window.FPChat&&FPChat.client;
    const need=[...new Set(ids)].filter(id=>!(id in cache)).slice(0,300);
    if(client&&need.length){
      try{
        const {data,error}=await client.rpc('place_report_summaries',{p_ids:need});
        if(!error){need.forEach(id=>cache[id]=null);(data||[]).forEach(r=>cache[r.place_id]={n:r.guardians,s:r.summary||{}});}
      }catch{}
    }
    const out={};ids.forEach(id=>{if(cache[id])out[id]=cache[id];});return out;
  }
  const count=(s,k,v)=>((s[k]||{})[v])||0;
  /* 필터 조건 하나에 대한 보호자 근거. 없으면 null */
  function evidence(sum,req){
    if(!sum)return null;
    if(req.startsWith('size:')){const n=count(sum.s,'size',req.slice(5));return n?{text:`${req.slice(5)}을 맡긴 보호자 ${n}명`,good:true}:null;}
    for(const kind of Object.keys(Q))for(const q of Q[kind]){
      if(q.need!==req)continue;
      const g=count(sum.s,q.k,q.good),b=q.bad?count(sum.s,q.k,q.bad):0;
      if(g||b)return {text:[g&&`보호자 ${g}명이 ‘${q.good}’`,b&&`${b}명이 ‘${q.bad}’`].filter(Boolean).join(' · '),good:g>=b};
    }
    return null;
  }
  function sectionHtml(p,sum,pet){
    const kinds=kindsFor(p);if(!kinds.length)return '';
    const head=`<h3>다녀온 보호자들이 알려 줬어요${sum?` <small>${sum.n}명</small>`:''}</h3>`;
    if(!sum)return `<section class="d-sec rep-sec" id="rep-sec">${head}<p class="muted">아직 알려 준 보호자가 없어요. 다녀오셨다면 산책 일기에 ‘다음 보호자에게 알려 주기’를 채워 주세요. 첫 번째로 알려 주시는 거예요.</p></section>`;
    const rows=[];
    const sz=sum.s.size;if(sz)rows.push(['이용한 체급',Object.entries(sz)]);
    kinds.forEach(k=>Q[k].forEach(q=>{const o=sum.s[q.k];if(!o)return;const list=q.opts.map(v=>[v,o[v]||0]).filter(([v,n])=>n&&v!==DONT&&v!=='밤을 보내지 않았어요'&&v!=='부탁하지 않았어요');if(list.length)rows.push([q.q.replace(/\s*\(.*\)$/,'').replace(/(을|를) 모두 골라 주세요$/,'').replace(/\?$/,''),list]);}));
    const mine=pet&&FP.sizeFromWeight(pet.weight);
    return `<section class="d-sec rep-sec" id="rep-sec">${head}
      ${rows.length?`<dl class="rep-sum">${rows.map(([t,list])=>`<div><dt>${esc(t)}</dt><dd>${list.sort((a,b)=>b[1]-a[1]).map(([v,n])=>`<span class="${v===mine?'mine':''}">${esc(v)} <b class="tnum">${n}</b></span>`).join('')}</dd></div>`).join('')}</dl>`:'<p class="muted">아직 고른 답이 많지 않아요.</p>'}
      <p class="note">업체가 확인한 정보가 아니라, 다녀온 보호자들의 경험이에요. 맡기기 전에 업체에 한 번 더 확인해 주세요.</p></section>`;
  }

  /* ---------- 나눔 기록 ---------- */
  const TIERS=[[10,'산책로 지킴이'],[3,'동네 길잡이'],[1,'첫 발자국']];
  /* 혜택 문구는 여기 한 곳에서 바꾼다 */
  const PERK='알려 주신 곳 1곳마다 앨범 용량 100MB를 더 드릴 예정이에요 (최대 1GB · 준비 중).';
  function stats(entries){
    const places=new Set(entries.filter(e=>e.report&&e.placeId).map(e=>e.placeId));
    const n=places.size,tier=TIERS.find(([m])=>n>=m),next=[...TIERS].reverse().find(([m])=>n<m);
    return {n,tier:tier?tier[1]:null,next:next?{left:next[0]-n,name:next[1]}:null};
  }
  function statsHtml(entries){
    const s=stats(entries);
    return `<div class="rep-stats">${icon('heart')}<div><b>${s.n?`정보 나눔 ${s.n}곳${s.tier?` · ${esc(s.tier)}`:''}`:'다녀온 곳을 다음 보호자에게 알려 주세요'}</b><span>${s.next?`${s.next.left}곳 더 알려 주면 ‘${esc(s.next.name)}’이 돼요. `:''}${esc(PERK)}</span></div></div>`;
  }

  window.Reports={Q,kindsFor,formHtml,bindForm,read,push,loadMine,summaries,evidence,sectionHtml,stats,statsHtml};
})();
