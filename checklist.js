/* 돌봄 체크리스트: 검수용 질문 목록에서 아이 프로필에 맞는 5~10개를 고른다.
   AI는 이 목록 안에서만 고르고 말투를 다듬는다. 목록 밖 질문이나 진단처럼 들리는 질문은 쓰지 않는다. */
(function(){
  const MEAL=['다 먹었어요','절반쯤 먹었어요','조금 먹었어요','안 먹었어요'];
  const BANK=[
    {id:'meal',q:'식사는 얼마나 먹었나요?',type:'choice',options:MEAL,base:true,order:1},
    {id:'water',q:'물은 잘 마셨나요?',type:'choice',options:['평소처럼 마셨어요','적게 마셨어요','많이 마셨어요'],base:true,order:2},
    {id:'pee',q:'소변은 평소처럼 봤나요?',type:'choice',options:['평소처럼 봤어요','적게 봤어요','자주 봤어요'],base:true,order:3},
    {id:'poop',q:'대변 상태는 어땠나요?',type:'choice',options:['좋았어요','무른 편이었어요','설사를 했어요','아직 안 봤어요'],base:true,order:4},
    {id:'med',q:'약은 정해진 시간에 먹었나요?',type:'choice',options:['제시간에 먹었어요','늦게 먹었어요','못 먹었어요'],when:p=>p.hasMedication==='있음',order:5},
    {id:'med_time',q:'약을 먹은 시간을 적어 주세요.',type:'text',when:p=>p.hasMedication==='있음',order:6},
    {id:'vomit',q:'토하거나 헛구역질한 적이 있었나요?',type:'choice',options:['없었어요','한 번 있었어요','여러 번 있었어요'],when:p=>has(p,'digest','food'),order:7},
    {id:'joint',q:'계단이나 높은 곳 뛰어오르기는 피했나요?',type:'choice',options:['네, 피했어요','한두 번 있었어요','자주 했어요'],when:p=>has(p,'joint','aging')||senior(p),order:8},
    {id:'limp',q:'걸을 때 다리를 절거나 불편해 보였나요?',type:'choice',options:['아니요','조금 그랬어요','많이 불편해 보였어요'],when:p=>has(p,'joint'),order:9},
    {id:'night',q:'밤에 잠을 못 자고 돌아다니거나 헤맸나요?',type:'choice',options:['아니요','잠깐 그랬어요','자주 그랬어요'],when:p=>has(p,'cog')||Number(p.years)>=10,order:10},
    {id:'breath',q:'숨이 가쁘거나 기침을 했나요?',type:'choice',options:['아니요','잠깐 그랬어요','자주 그랬어요'],when:p=>has(p,'heart','breath'),order:11},
    {id:'scratch',q:'몸을 긁거나 핥는 모습이 있었나요?',type:'choice',options:['거의 없었어요','가끔 있었어요','자주 있었어요'],when:p=>has(p,'skin'),order:12},
    {id:'eyeear',q:'눈이나 귀를 비비거나 머리를 자주 흔들었나요?',type:'choice',options:['아니요','가끔 그랬어요','자주 그랬어요'],when:p=>has(p,'eye','ear'),order:13},
    {id:'separation',q:'보호자를 찾으며 짖거나 낑낑댔나요?',type:'choice',options:['거의 없었어요','잠깐 그랬어요','자주 그랬어요'],when:p=>/불안/.test(String(p.separation||'')),order:14},
    {id:'dogs',q:'다른 개와 떨어져 따로 지냈나요?',type:'choice',options:['따로 지냈어요','함께 지냈어요'],when:p=>/천천히|혼자/.test(String(p.dogs||'')),order:15},
    {id:'walk',q:'산책·놀이 시간은 얼마나 됐나요?',type:'minutes',base:true,order:20},
    {id:'rest',q:'잘 쉬거나 잤나요?',type:'choice',options:['푹 쉬었어요','자주 깼어요','거의 못 쉬었어요'],base:true,order:21},
    {id:'mood',q:'지금 기분은 어때 보이나요?',type:'choice',options:['편안해 보여요','조금 긴장했어요','불안해 보여요'],base:true,order:22},
    {id:'note',q:'보호자에게 전하고 싶은 말이 있나요?',type:'text',base:true,order:30}
  ];
  const CONCERN_LABELS={eye:'눈',joint:'뼈·관절',skin:'피부',teeth:'치아',ear:'귀',cog:'인지·수면',aging:'노화',heart:'심장',breath:'호흡',kidney:'신장·요로',digest:'소화·배변',weight:'체중',food:'식욕',lump:'혹',immune:'면역'};
  const INTERVALS=[2,3,4,6,8,12];
  function has(p,...ids){return Array.isArray(p.concerns)&&ids.some(id=>p.concerns.includes(id));}
  function senior(p){return Number(p.years)>=8;}

  /* 규칙으로 고르기: 기본 질문 + 해당하는 질문, 최대 10개 */
  function suggest(pet){
    const p=pet||{};
    const picked=BANK.filter(b=>b.base||(b.when&&b.when(p)));
    const extra=picked.filter(b=>!b.base);
    let list=picked;
    if(list.length>10){
      const keepBase=['meal','water','poop','walk','note'];
      list=[...BANK.filter(b=>keepBase.includes(b.id)),...extra].slice(0,10);
    }
    return list.sort((a,b)=>a.order-b.order).map(clean);
  }
  const clean=b=>({id:b.id,q:b.q,type:b.type,...(b.options?{options:b.options}:{})});
  const byId=id=>BANK.find(b=>b.id===id);

  /* AI로 고르기: 실패하면 규칙 결과를 그대로 쓴다 */
  async function suggestAI(pet,client){
    const fallback={questions:suggest(pet),by:'rule'};
    if(!client||!client.functions)return fallback;
    const p=pet||{};
    const summary={
      age_years:p.years===''||p.years==null?null:Number(p.years),
      size:p.size||null,
      concerns:(p.concerns||[]).map(c=>CONCERN_LABELS[c]).filter(Boolean),
      takes_medication:p.hasMedication==='있음',
      separation:p.separation||null,
      with_dogs:p.dogs||null
    };
    try{
      const res=await Promise.race([
        client.functions.invoke('checklist-ai',{body:{pet:summary,candidates:BANK.map(b=>({id:b.id,q:b.q}))}}),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),12000))
      ]);
      const out=res&&res.data;
      if(res.error||!out||!Array.isArray(out.ids))return fallback;
      const ids=[...new Set(out.ids.filter(id=>byId(id)))];
      if(ids.length<5||ids.length>10)return fallback;
      const questions=ids.map(id=>{
        const b=clean(byId(id));
        const r=out.rewrites&&typeof out.rewrites[id]==='string'?out.rewrites[id].trim():'';
        if(r&&r.length<=80&&/[?요]$/.test(r))b.q=r;
        return b;
      }).sort((a,b)=>byId(a.id).order-byId(b.id).order);
      return {questions,by:'ai'};
    }catch{return fallback;}
  }

  /* 답변에서 일기 활동 기록을 뽑는다 */
  function activityFrom(answers){
    const a={};
    for(const x of answers||[]){
      if(x.id==='walk'){const n=parseInt(x.a,10);if(n>=0&&n<=600)a.walk_min=n;}
      if(x.id==='meal')a.meal=x.a;
      if(x.id==='poop')a.poop=x.a;
      if(x.id==='water')a.water=x.a;
      if(x.id==='rest')a.rest=x.a;
      if(x.id==='med')a.med=x.a;
      if(x.id==='mood')a.mood=x.a;
    }
    return a;
  }
  /* 다음 작성 시각: 입실 또는 마지막 체크리스트 + 간격 */
  function nextDue(messages,plan){
    if(!plan||!plan.interval_hours)return null;
    let inAt=null,last=null;
    for(const m of messages){
      if(m.kind==='checkin'){inAt=m.created_at;last=m.created_at;}
      if(m.kind==='checkout'){inAt=null;}
      if(m.kind==='checklist'&&inAt)last=m.created_at;
    }
    if(!inAt)return null;
    return new Date(new Date(last).getTime()+plan.interval_hours*3600e3);
  }

  window.Checklist={BANK,INTERVALS,suggest,suggestAI,activityFrom,nextDue,CONCERN_LABELS};
})();
