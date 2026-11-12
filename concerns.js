/* 건강 고민: 보호자가 고른 관심 항목. 진단이 아니라 돌봄·문의에 참고하는 정보다. */
(function(){
  const OUT='stroke="#3A2B20" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const LINE=`fill="none" ${OUT}`;
  const ITEMS=[
    {id:'eye',label:'눈',art:`<path d="M6 24 Q24 6 42 24 Q24 42 6 24Z" fill="#fff" ${OUT}/><circle cx="24" cy="24" r="8" fill="#6F9FC9" ${OUT}/><circle cx="24" cy="24" r="3.4" fill="#24180F"/><circle cx="26.6" cy="21.4" r="1.6" fill="#fff"/>`},
    {id:'joint',label:'뼈/관절',art:`<g transform="rotate(-40 24 24)"><circle cx="10" cy="19" r="5.4" fill="#FBF7EF" ${OUT}/><circle cx="10" cy="29" r="5.4" fill="#FBF7EF" ${OUT}/><circle cx="38" cy="19" r="5.4" fill="#FBF7EF" ${OUT}/><circle cx="38" cy="29" r="5.4" fill="#FBF7EF" ${OUT}/><rect x="9" y="19.8" width="30" height="8.4" fill="#FBF7EF"/><path d="M13 19.8H35M13 28.2H35" ${LINE}/></g>`},
    {id:'skin',label:'피부/피모',art:`<path d="M16 25 q-4 -7 0 -14 M25 25 q-4 -8 1 -17 M34 25 q-4 -7 0 -14" fill="none" stroke="#A9632E" stroke-width="3" stroke-linecap="round"/><rect x="6" y="25" width="36" height="15" rx="5" fill="#F7C4B8" ${OUT}/><path d="M12 33q3-2 6 0t6 0 6 0 6 0" fill="none" stroke="#E08F80" stroke-width="2" stroke-linecap="round"/>`},
    {id:'teeth',label:'치아/구강',art:`<path d="M24 12 C19 8 10 8 9 17 C8 25 12 28 13 34 C14 40 17 42 19 38 C20 34 21 29 24 29 C27 29 28 34 29 38 C31 42 34 40 35 34 C36 28 40 25 39 17 C38 8 29 8 24 12Z" fill="#fff" ${OUT}/><path d="M16 15q3-2 6 0" fill="none" stroke="#B9C5D2" stroke-width="2" stroke-linecap="round"/>`},
    {id:'ear',label:'귀/청력',art:`<path d="M13 22 C12 11 21 6 29 8 C38 10 41 20 36 27 C32 32 31 36 28 40 C24 44 18 41 19 36" fill="#F7C4B8" ${OUT}/><path d="M20 21 C20 15 27 13 30 18 C32 22 28 25 26 28" ${LINE}/>`},
    {id:'cog',label:'인지/수면',art:`<path d="M31 8 A17 17 0 1 0 41 31 A14 14 0 0 1 31 8Z" fill="#F7D46A" ${OUT}/><path d="M36 9v6M33 12h6" fill="none" stroke="#3C6FD6" stroke-width="2.4" stroke-linecap="round"/>`},
    {id:'aging',label:'노화',art:`<circle cx="24" cy="24" r="17" fill="#CFE0F5" ${OUT}/><path d="M24 13v11l7 5" ${LINE}/><path d="M24 7v2M24 39v2M7 24h2M39 24h2" ${LINE}/>`},
    {id:'heart',label:'심장',art:`<path d="M24 41 C9 31 6 24 6 17 C6 10 12 7 16 7 C20 7 23 9 24 13 C25 9 28 7 32 7 C36 7 42 10 42 17 C42 24 39 31 24 41Z" fill="#EE6A6A" ${OUT}/><path d="M13 21h7l2-4 4 8 2-4h7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`},
    {id:'breath',label:'호흡/기침',art:`<path d="M5 18 H28 a5.5 5.5 0 1 0 -5.5 -5.5" fill="none" stroke="#3C6FD6" stroke-width="3.4" stroke-linecap="round"/><path d="M5 26 H36 a5.5 5.5 0 1 1 -5.5 5.5" fill="none" stroke="#6F9FC9" stroke-width="3.4" stroke-linecap="round"/><path d="M5 34 H20 a4.5 4.5 0 1 1 -4.5 4.5" fill="none" stroke="#3C6FD6" stroke-width="3.4" stroke-linecap="round"/>`},
    {id:'kidney',label:'신장/요로',art:`<path d="M24 6 C24 6 10 22 10 30 A14 14 0 0 0 38 30 C38 22 24 6 24 6Z" fill="#F7C93F" ${OUT}/><path d="M17 31 a7.5 7.5 0 0 0 6 6.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`},
    {id:'digest',label:'소화/배변',art:`<path d="M9 40 Q5 40 5 35.5 Q5 31 10 31 L38 31 Q43 31 43 35.5 Q43 40 39 40Z" fill="#A9734A" ${OUT}/><path d="M13 31 Q10 31 10 27 Q10 22 15 22 L33 22 Q38 22 38 27 Q38 31 35 31Z" fill="#B98258" ${OUT}/><path d="M18 22 Q15 21 16 17 Q17 13 22 12 Q26 11 27 8 Q33 14 31 18 Q30 22 30 22Z" fill="#C99468" ${OUT}/>`},
    {id:'weight',label:'비만/체중',art:`<rect x="7" y="7" width="34" height="34" rx="8" fill="#E7EEF7" ${OUT}/><path d="M14 22 a10 10 0 0 1 20 0Z" fill="#fff" ${OUT}/><path d="M24 22l3-6" ${LINE}/>`},
    {id:'food',label:'식욕/영양',art:`<path d="M6 25 H42 L37 41 H11Z" fill="#F0924B" ${OUT}/><rect x="17" y="30" width="14" height="5" rx="2" fill="#fff"/><circle cx="17" cy="19" r="5" fill="#B5773F" ${OUT}/><circle cx="28" cy="18" r="6" fill="#C98E55" ${OUT}/><path d="M34 15 q6 -7 9 -7 q0 7 -8 10" fill="#6FA64B" ${OUT}/>`},
    {id:'lump',label:'혹/종양',art:`<path d="M5 38 H43 V31 H34 C32 20 16 20 14 31 H5Z" fill="#F7C4B8" ${OUT}/><circle cx="24" cy="29" r="3" fill="#E08F80"/><path d="M24 7v6M16 10l2 5M32 10l-2 5" fill="none" stroke="#3C6FD6" stroke-width="2.4" stroke-linecap="round"/>`},
    {id:'immune',label:'면역력',art:`<path d="M24 6 L39 11 V23 C39 32 33 38 24 42 C15 38 9 32 9 23 V11Z" fill="#6FBF7B" ${OUT}/><path d="M16 24l6 6 11-12" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`}
  ];
  const MAX=5;
  const SENIOR_AGE=8;

  /* 참고한 연구. 규칙의 src가 이 키를 가리킨다. 해외 연구는 국내 분포와 다를 수 있다. */
  const SOURCES={
    park:{cite:'Park JY 외(2026). 국내 27개 동물병원 진료 기록 222,706건의 생애주기별 진단 분석. J Vet Sci 27(1):e5.',url:'https://doi.org/10.4142/jvs.25144'},
    yi:{cite:'Yi SW 외(2023). 국내 16개 병원 말티즈·미니어처 푸들·시추 진료 기록 40,785건의 연령별 질병 분석. Korean J Vet Res.',url:'https://www.kjvr.org/m/journal/view.php?number=3940'},
    oneillPerio:{cite:"O'Neill DG 외(2021). 영국 1차 진료 개 22,333마리의 치주 질환 역학. J Small Anim Pract.",url:'https://doi.org/10.1111/jsap.13405'},
    oneillPatella:{cite:"O'Neill DG 외(2016). 영국 1차 진료 개 210,824마리의 슬개골 탈구 역학. Canine Genet Epidemiol.",url:'https://doi.org/10.1186/s40575-016-0034-0'},
    mattin:{cite:'Mattin MJ 외(2015). 영국 1차 진료 개의 퇴행성 승모판 질환 유병률과 위험 요인. J Vet Intern Med 29(3).',url:'https://academic.oup.com/jvim/article/29/3/847/8452548'},
    dapSize:{cite:'Dog Aging Project(2024). 미국 개 27,541마리의 체격·나이별 질환 이력(보호자 보고). PLOS ONE.',url:'https://doi.org/10.1371/journal.pone.0295840'},
    dapCog:{cite:'Dog Aging Project(2022). 미국 개 15,019마리의 인지 기능 평가. Sci Rep.',url:'https://doi.org/10.1038/s41598-022-15837-9'},
    anderson:{cite:'Anderson KL 외(2020). 개 골관절염 위험 요인 체계적 문헌 고찰. Front Vet Sci.',url:'https://doi.org/10.3389/fvets.2020.00220'},
    egenvall:{cite:'Egenvall A 외(2005). 스웨덴 보험 가입 암컷 8만여 마리의 유선 종양 발생. Prev Vet Med.',url:'https://www.sciencedirect.com/science/article/abs/pii/S0167587705000383'},
    hunprasit:{cite:'Hunprasit V 외(2019). 미국 칼슘옥살레이트 요로 결석 역학. J Vet Intern Med 33(5).',url:'https://academic.oup.com/jvim/article/33/5/2090/8470257'},
    thomsen:{cite:'Thomsen M 외(2023). 시바견 아토피 피부염 미생물군 연구. Microbiome 11:232.',url:'https://doi.org/10.1186/s40168-023-01671-2'},
    ryu:{cite:'Ryu 외(2025). 국내 소·중형견 아토피 피부염 331마리의 품종별 유병률과 병변 분포. Vet Dermatol.',url:'https://doi.org/10.1111/vde.13329'},
    bergknut:{cite:'Bergknut N 외(2012). 스웨덴 보험 가입 개 66만여 마리의 추간판 질환 발생률. JAVMA 240(11).',url:'https://utrecht-main-test.atmire.com/items/0098ee89-68e1-49b9-a8f9-ca8bec026e09'},
    kent:{cite:'미국 대학 동물병원 골든 리트리버 부검 655건의 암 관련 사망 분석(2018). PLOS ONE.',url:'https://doaj.org/article/b9937efac1d2485d96bf889fae38a43c'}
  };

  /* 규칙: [항목, 점수, 조건, 이유, 출처]. 점수는 위험도가 아니라 우선순위를 정하는 가중치다(국내 진료 순위와 효과 크기를 참고해 수동 설정, 수의사 검토 필요). 합이 2 이상인 항목 중 상위 3개를 추천한다. */
  const age=p=>(p&&p.years!==''&&p.years!=null&&!Number.isNaN(Number(p.years)))?Number(p.years):null;
  const between=(a,b)=>p=>{const y=age(p);return y!==null&&y>=a&&y<=b;};
  const from=a=>between(a,99);
  const notPuppy=p=>{const y=age(p);return y===null||y>=2;};
  const small=p=>p.size==='소형견'||p.size==='중형견';
  const large=p=>p.size==='대형견';
  const female=p=>p.sex==='암컷';
  const male=p=>p.sex==='수컷';
  const and=(...fs)=>p=>fs.every(f=>f(p));
  const always=()=>true;
  const AGE_SIZE_SEX=[
    ['teeth',3,between(0,1),'1살 이하 국내 진료에서 유치 잔존이 두드러져요','park'],
    ['ear',2,between(0,5),'외이염은 어릴 때부터 국내 진료 기록에 많이 나와요','park'],
    ['joint',2,between(0,5),'슬개골 탈구는 어린 나이부터 국내 진료 기록에 많이 나와요','park'],
    ['skin',3,between(2,5),'2~5살 국내 진료에서 피부 질환이 두드러져요','park'],
    ['skin',2,between(6,10),'6~10살에도 피부 질환이 국내 진료 기록에 많이 나와요','park'],
    ['heart',2,between(6,10),'6살 무렵부터 심장 판막 질환이 나타나기 시작해요','park'],
    ['kidney',2,between(6,10),'6살 무렵부터 방광·신장 결석 기록이 나타나요','park'],
    ['teeth',1,from(6),'6살 이상은 2~4살보다 치주 질환 기록 가능성이 약 3~4배예요(영국)','oneillPerio'],
    ['heart',4,from(11),'11살 이상 국내 진료 기록 1위가 심장 판막 질환이에요','park'],
    ['kidney',4,from(11),'11살 이상 국내 진료에서 만성 콩팥병이 많이 나와요','park'],
    ['eye',3,from(11),'11살 이상 국내 진료에서 백내장이 많이 나와요','park'],
    ['cog',2,from(11),'인지 기능 저하 위험은 나이가 한 살 늘 때마다 약 1.5배씩 커져요(미국)','dapCog'],
    ['teeth',2,and(small,notPuppy),'15kg 미만은 30~40kg 개보다 치주 질환 기록 가능성이 약 2.5~3배예요(영국)','oneillPerio'],
    ['heart',1,and(small,from(6)),'작은 개일수록 심장 질환 이력이 많아요(미국)','dapSize'],
    ['eye',1,and(small,from(6)),'작은 개일수록 눈 질환 이력이 많아요(미국)','dapSize'],
    ['breath',1,and(small,from(6)),'작은 개일수록 호흡기 질환 이력이 많아요(미국)','dapSize'],
    ['joint',1,and(large,from(6)),'체중이 많이 나갈수록 골관절염 위험이 커져요','anderson'],
    ['joint',1,and(large,from(6)),'큰 개일수록 나이가 들며 관절 질환 이력이 빠르게 늘어요(미국)','dapSize'],
    ['lump',2,and(large,from(6)),'큰 개일수록 나이가 들며 암 이력이 빠르게 늘어요(미국)','dapSize'],
    ['skin',1,and(large,notPuppy),'큰 개일수록 피부 질환 이력이 조금 더 많아요(미국)','dapSize'],
    ['lump',3,and(female,from(8)),'암컷은 8살까지 약 6%, 10살까지 약 13%에서 유선 종양 청구가 있었어요(스웨덴 보험)','egenvall'],
    ['heart',1,and(male,from(6)),'수컷은 암컷보다 승모판 질환 진단 가능성이 약 1.4배예요(영국)','mattin'],
    ['kidney',1,and(male,from(6)),'칼슘옥살레이트 결석 사례의 약 73%가 수컷이에요(미국)','hunprasit']
  ];
  const BREEDS=[
    [/말티즈/,[
      ['ear',2,always,'국내 말티즈 내원 사유 1위가 외이염이에요(9.9%)','yi'],
      ['skin',1,always,'국내 말티즈에서 피부 질환 비중이 가장 커요(14.0%)','yi'],
      ['kidney',1,from(6),'말티즈는 칼슘옥살레이트 결석 고위험 품종이에요(미국)','hunprasit'],
      ['heart',1,from(9),'국내 9~13살 말티즈에서 심장 질환 기록이 늘어요(5.8%)','yi']]],
    [/푸들/,[
      ['teeth',2,always,'토이 푸들은 믹스견보다 치주 질환 기록 가능성이 약 4배예요(영국)','oneillPerio'],
      ['digest',2,always,'국내 미니어처 푸들에서 소화기 질환 비중이 가장 커요(15.4%)','yi'],
      ['ear',1,always,'국내 미니어처 푸들 내원 사유 1위가 외이염이에요(9.2%)','yi'],
      ['heart',1,from(6),'푸들은 믹스견보다 승모판 질환 진단 가능성이 약 2.9배예요(영국)','mattin']]],
    [/시[추츄]/,[
      ['skin',2,always,'국내 시추에서 피부 질환 비중이 가장 커요(18.08%)','yi'],
      ['eye',2,always,'국내 시추에서 눈 질환 비중이 두 번째로 커요(14.0%)','yi'],
      ['heart',1,from(6),'시추는 믹스견보다 승모판 질환 진단 가능성이 약 2.9배예요(영국)','mattin']]],
    [/포메/,[
      ['joint',3,always,'포메라니안은 믹스견보다 슬개골 탈구 가능성이 약 6.5배예요(영국)','oneillPatella'],
      ['kidney',1,from(6),'포메라니안은 칼슘옥살레이트 결석 고위험 품종이에요(미국)','hunprasit']]],
    [/비숑/,[
      ['joint',2,always,'비숑은 믹스견보다 슬개골 탈구 가능성이 약 3배예요(영국)','oneillPatella'],
      ['kidney',1,from(6),'비숑은 칼슘옥살레이트 결석 고위험 품종이에요(미국)','hunprasit']]],
    [/치와와/,[
      ['joint',3,always,'치와와는 믹스견보다 슬개골 탈구 가능성이 약 5.9배예요(영국)','oneillPatella'],
      ['heart',2,from(6),'치와와는 믹스견보다 승모판 질환 진단 가능성이 약 6.2배예요(영국)','mattin']]],
    [/요크/,[
      ['joint',3,always,'요크셔테리어는 믹스견보다 슬개골 탈구 가능성이 약 5.5배예요(영국)','oneillPatella'],
      ['teeth',2,always,'요크셔테리어는 믹스견보다 치주 질환 기록 가능성이 약 2.2배예요(영국)','oneillPerio'],
      ['heart',1,from(6),'요크셔테리어는 믹스견보다 승모판 질환 진단 가능성이 약 2.2배예요(영국)','mattin']]],
    [/카발리에|캐벌리어/,[
      ['heart',4,from(4),'카발리에는 믹스견보다 승모판 질환 진단 가능성이 약 47배예요(영국)','mattin'],
      ['teeth',1,always,'카발리에는 믹스견보다 치주 질환 기록 가능성이 약 2.4배예요(영국)','oneillPerio']]],
    [/시바/,[
      ['skin',2,always,'시바견은 특히 일본에서 아토피 피부염 사례가 많이 보고됐어요','thomsen']]],
    [/코카|코커/,[
      ['skin',2,always,'코카스패니얼은 국내 아토피 피부염 환견에서 등록 비율보다 많이 나타났어요','ryu']]],
    [/프렌치/,[
      ['joint',3,always,'프렌치불독은 믹스견보다 슬개골 탈구 가능성이 약 5.4배예요(영국)','oneillPatella'],
      ['skin',2,always,'프렌치불독은 국내 아토피 피부염 환견에서 등록 비율보다 많이 나타났어요','ryu']]],
    [/퍼그/,[
      ['joint',2,always,'퍼그는 믹스견보다 슬개골 탈구 가능성이 약 3.7배예요(영국)','oneillPatella']]],
    [/닥스/,[
      ['joint',3,always,'닥스훈트는 디스크 질환 발생률이 전체 평균보다 약 5~8.5배 높았어요(스웨덴 보험)','bergknut']]],
    [/슈나우저/,[
      ['heart',1,from(6),'미니어처 슈나우저는 믹스견보다 심잡음 기록 가능성이 약 2.2배예요(영국)','mattin']]],
    [/보더/,[
      ['heart',1,from(6),'보더콜리는 믹스견보다 승모판 질환 진단 가능성이 약 2배예요(영국)','mattin']]],
    [/셰퍼드|세퍼드/,[
      ['joint',3,from(6),'저먼셰퍼드는 골관절염 위험이 약 5배 높다는 연구가 있어요','anderson']]],
    [/골든/,[
      ['lump',3,from(6),'미국 대학병원 부검 자료에서 골든 리트리버 사망의 65%가 암과 관련됐어요','kent']]]
  ];
  const TOP=3;
  /* 조건에 맞는 규칙을 합산해 추천 항목과 이유를 돌려준다. 입력이 없으면 추천하지 않는다. */
  function explain(pet){
    pet=pet||{};
    const rules=[...AGE_SIZE_SEX];
    BREEDS.forEach(([re,list])=>{if(re.test(pet.breed||''))rules.push(...list);});
    const hits={};
    rules.forEach(([id,w,when,why,src])=>{if(!when(pet))return;(hits[id]=hits[id]||{id,score:0,reasons:[]});hits[id].score+=w;hits[id].reasons.push({w,why,src});});
    const rank=id=>ITEMS.findIndex(i=>i.id===id);
    return Object.values(hits).filter(h=>h.score>=2).sort((a,b)=>b.score-a.score||rank(a.id)-rank(b.id)).slice(0,TOP).map(h=>({...h,reasons:h.reasons.sort((a,b)=>b.w-a.w)}));
  }
  function recommended(pet){return explain(pet).map(h=>h.id);}
  function ordered(pet){
    const rec=recommended(pet);
    return [...rec.map(id=>ITEMS.find(i=>i.id===id)),...ITEMS.filter(i=>!rec.includes(i.id))];
  }
  function labels(ids){return (ids||[]).map(id=>(ITEMS.find(i=>i.id===id)||{}).label).filter(Boolean);}
  /* 추천을 더 맞추려면 필요한 입력 */
  function missing(pet){
    pet=pet||{};
    return [age(pet)===null?'나이':'',pet.size?'':'몸무게',pet.sex?'':'성별',pet.breed?'':'견종'].filter(Boolean);
  }
  function usedSources(list){return [...new Set(list.flatMap(h=>h.reasons.map(r=>r.src)))].map(k=>SOURCES[k]);}
  /* 노령견 맞춤 질문에 쓰는 선택지와 판별. profile.js(입력)와 app.js(조건 대조)가 함께 쓴다. */
  const SENIOR={
    NONE:'해당 없어요',
    MOBILITY:['계단을 힘들어해요','미끄러운 바닥에서 자주 미끄러져요','보행 보조가 필요해요'],
    NIGHT:['밤에 배뇨·배변 도움이 필요해요','밤에 불안해하거나 낑낑대요'],
    METHODS:['알약','가루·액상','주사','수액']
  };
  const isSenior=p=>Number(p&&p.years)>=SENIOR_AGE||((p&&p.concerns)||[]).includes('aging');
  window.Concerns={ITEMS,MAX,SENIOR_AGE,SENIOR,isSenior,SOURCES,explain,recommended,ordered,labels,missing,usedSources,icon:it=>`<svg viewBox="0 0 48 48" aria-hidden="true">${it.art}</svg>`};
})();
