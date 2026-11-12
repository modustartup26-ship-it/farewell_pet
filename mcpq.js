/* 반려견 성격 검사 — Monash Canine Personality Questionnaire-Revised (MCPQ-R)
   Ley, Bennett & Coleman (2009) Applied Animal Behaviour Science 116, 220–227
   Ley, McGreevy & Bennett (2009) Applied Animal Behaviour Science 119, 85–90
   26개 형용사를 보호자가 6점 척도(1 전혀 아니다 ~ 6 정말 그렇다)로 평가하고, 요인별 평균을 0–100으로 바꿔 보여준다.
   한국어 표현과 설명은 이 서비스에서 각색한 것이다. */
(function(){
  const FACTORS={
    E:{name:'외향성',nick:'활발함',color:'#E8A400',
       about:'얼마나 활발하고 에너지가 넘치는지 보여줘요. 높을수록 늘 무언가 하고 싶어 하고 작은 변화에도 금방 들뜨고, 낮을수록 차분한 속도로 하루를 보내요.',
       hi:'에너지를 풀 곳이 필요해요. 산책 횟수, 실외 놀이터나 마당이 있는지 먼저 확인해 보세요.',
       lo:'조용한 공간에서 더 편해할 수 있어요. 활동량이 많은 아이들과 종일 함께 지내는 곳인지 물어보세요.'},
    M:{name:'동기',nick:'끈기',color:'#B4834F',
       about:'관심이 생긴 일을 얼마나 끈질기게 해내는지 보여줘요. 높을수록 냄새 탐색이나 장난감에 오래 몰두하고, 낮을수록 관심을 쉽게 다른 곳으로 돌려요.',
       hi:'하고 싶은 게 분명한 아이예요. 노즈워크나 장난감처럼 몰두할 거리가 있는 곳이 잘 맞을 수 있어요.',
       lo:'흥미가 금방 바뀌는 편이라, 짧게 여러 번 바꿔 주는 놀이가 잘 맞을 수 있어요.'},
    T:{name:'훈련 집중력',nick:'집중',color:'#2F6B3F',
       about:'보호자에게 얼마나 주의를 기울이고 익숙한 신호에 반응하는지 보여줘요. 높을수록 꾸준히 반응하고, 낮을수록 상황에 따라 반응이 많이 달라져요.',
       hi:'익숙한 신호를 잘 따르는 편이에요. 맡길 때 평소 쓰는 신호를 함께 알려 주면 도움이 돼요.',
       lo:'낯선 곳에서는 신호가 잘 안 통할 수 있어요. 유치원이나 훈련사가 있는 곳의 교육 방식을 물어보세요.'},
    A:{name:'친화성',nick:'다정함',color:'#E0738A',
       about:'사람과 다른 개에게 얼마나 느긋하고 다정한지 보여줘요. 높을수록 처음 만난 상대에게도 편안하게 다가가고, 낮을수록 친해지는 데 시간이 필요해요.',
       hi:'다른 아이들과 어울리는 걸 즐길 수 있어요. 데이케어나 유치원도 후보로 살펴보세요.',
       lo:'합사보다 단독 돌봄이 편할 수 있어요. 다른 개와 공간을 나누는 방식을 꼭 확인해 보세요.'},
    N:{name:'신경증성',nick:'예민함',color:'#5A7FC2',
       about:'낯선 소리나 환경에서 얼마나 조심스럽고 긴장하는지 보여줘요. 높을수록 새로운 상황에서 주저하거나 불안해 보이고, 낮을수록 덤덤하게 받아들여요.',
       hi:'새로운 곳이 부담일 수 있어요. 짧은 체험 이용부터 시작하고, 조용한 단독 공간이 있는지 확인해 보세요.',
       lo:'새로운 환경에도 비교적 덤덤한 편이에요. 그래도 첫 이용 뒤에는 이용기록에 반응을 남겨 두세요.'}
  };
  /* 요인이 섞이도록 순서를 고정해 둔다 */
  const ITEMS=[
    ['active','E','활동적인','많이 움직이고 무언가 하길 좋아해요'],
    ['assertive','M','자기주장이 뚜렷한','원하는 걸 분명하게 표현해요'],
    ['attentive','T','주의 깊은','보호자의 말과 몸짓을 잘 지켜봐요'],
    ['easy-going','A','느긋한','웬만한 일에는 크게 신경 쓰지 않아요'],
    ['fearful','N','겁이 많은','작은 일에도 놀라거나 무서워해요'],
    ['energetic','E','에너지 넘치는','지치지 않고 오래 놀 수 있어요'],
    ['determined','M','마음먹은 건 해내는','하려던 일을 쉽게 포기하지 않아요'],
    ['biddable','T','말을 잘 따르는','부탁하면 순순히 따라 줘요'],
    ['friendly','A','다정한','사람이나 다른 개에게 살갑게 굴어요'],
    ['nervous','N','긴장을 잘하는','낯선 상황에서 쉽게 긴장해요'],
    ['excitable','E','쉽게 들뜨는','조금만 자극이 와도 금방 흥분해요'],
    ['independent','M','독립적인','혼자서도 알아서 잘 지내요'],
    ['intelligent','T','똑똑한','새로운 걸 빨리 알아차리고 배워요'],
    ['non-aggressive','A','공격적이지 않은','으르렁대거나 물려고 하지 않아요'],
    ['submissive','N','몸을 낮추는','다른 개나 사람 앞에서 쉽게 양보하고 몸을 낮춰요'],
    ['hyperactive','E','가만있지 못하는','지나칠 만큼 들떠서 진정하기 어려워해요'],
    ['persevering','M','꾸준한','잘 안 돼도 계속 다시 시도해요'],
    ['obedient','T','지시를 잘 지키는','앉아·기다려 같은 신호를 잘 지켜요'],
    ['relaxed','A','편안한','대체로 긴장을 풀고 느긋하게 지내요'],
    ['timid','N','소심한','처음 보는 것 앞에서 머뭇거려요'],
    ['lively','E','생기 있는','표정과 몸짓이 늘 밝고 활기차요'],
    ['tenacious','M','집요한','관심 가는 냄새나 장난감에서 쉽게 떨어지지 않아요'],
    ['reliable','T','믿음직한','어디서든 비슷하게 행동해서 예측하기 쉬워요'],
    ['sociable','A','사교적인','새로운 친구를 만나는 걸 좋아해요'],
    ['restless','E','들썩이는','한자리에 오래 있지 못하고 자꾸 움직여요'],
    ['trainable','T','잘 배우는','새로운 훈련을 금방 익혀요']
  ];
  const SCALE=['전혀 아니에요','아닌 편이에요','조금 아니에요','조금 그래요','그런 편이에요','정말 그래요'];
  const ORDER=['E','M','T','A','N'];

  function score(answers){
    const out={};
    ORDER.forEach(f=>{const vals=ITEMS.filter(it=>it[1]===f).map(it=>answers[it[0]]).filter(v=>v>=1&&v<=6);out[f]=vals.length?Math.round((vals.reduce((a,b)=>a+b,0)/vals.length-1)/5*100):null;});
    return out;
  }
  const level=v=>v>=65?'높은 편':v<35?'낮은 편':'보통';
  function nickname(s){
    const vals=ORDER.map(f=>s[f]);
    if(Math.max(...vals)-Math.min(...vals)<12)return '균형 잡힌 산책 친구';
    const top=ORDER.reduce((a,b)=>s[b]>s[a]?b:a);
    const base={E:'에너지 넘치는 탐험가',M:'끈기 있는 해결사',T:'눈치 빠른 모범생',A:'다정한 친구',N:'섬세한 감성파'}[top];
    if(top!=='N'&&s.N>=65)return '조심스러운 '+base.split(' ').pop();
    if(top!=='N'&&s.N<25)return '씩씩한 '+base.split(' ').pop();
    return base;
  }

  function radar(s,opt={}){
    const R=112, n=ORDER.length, ang=i=>(-90+i*72)*Math.PI/180;
    const pt=(i,v)=>[Math.cos(ang(i))*R*v/100,Math.sin(ang(i))*R*v/100];
    const ring=v=>ORDER.map((_,i)=>pt(i,v).map(x=>x.toFixed(1)).join(',')).join(' ');
    const poly=ORDER.map((f,i)=>pt(i,s[f]||0).map(x=>x.toFixed(1)).join(',')).join(' ');
    const labels=ORDER.map((f,i)=>{const [x,y]=pt(i,128);const a=Math.cos(ang(i));const anchor=Math.abs(a)<.2?'middle':a>0?'start':'end';const dy=y<-60?-22:y>60?6:-8;return `<g transform="translate(${x.toFixed(1)} ${(y+dy).toFixed(1)})"><text class="r-name" text-anchor="${anchor}">${FACTORS[f].name}</text><text class="r-val" y="24" text-anchor="${anchor}" fill="${FACTORS[f].color}">${s[f]}</text></g>`;}).join('');
    const dots=ORDER.map((f,i)=>{const [x,y]=pt(i,s[f]||0);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${FACTORS[f].color}" stroke="#fff" stroke-width="2.5"/>`;}).join('');
    return `<svg class="radar" viewBox="-200 -175 400 340" role="img" aria-label="${opt.label||'성격 프로필'}: ${ORDER.map(f=>FACTORS[f].name+' '+s[f]).join(', ')}">
      ${[25,50,75,100].map(v=>`<polygon points="${ring(v)}" fill="${v===100?'#FBF7EE':'none'}" stroke="#D9D2C2" stroke-width="${v===100?2:1.2}"/>`).join('')}
      ${ORDER.map((_,i)=>{const [x,y]=pt(i,100);return `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E4DDCD" stroke-width="1.2"/>`;}).join('')}
      <g class="r-shape"><polygon points="${poly}" fill="rgba(180,131,79,.22)" stroke="#8C5F36" stroke-width="3" stroke-linejoin="round"/>${dots}</g>
      ${labels}
    </svg>`;
  }

  /* 성향 점수 → 시설 조건 (가설 규칙)
     성격 질문지는 보호자가 본 성향을 정리하는 도구이고, 시설 적합성을 예측한다고 검증된 것이 아니다.
     그래서 아래 규칙은 '확인할 조건을 올려 주는' 용도로만 쓰고, 수의사·훈련사 검토와 업체 인터뷰로 고쳐 나간다. */
  function needs(s){
    const out=[];
    if(!s)return out;
    if(s.A!=null&&s.A<35)out.push({need:'단독 돌봄',why:`성격 검사에서 ${FACTORS.A.name}이 ${level(s.A)}이라, 다른 개와 공간을 나누지 않는지 확인해요.`});
    else if(s.N!=null&&s.N>=65)out.push({need:'단독 돌봄',why:`성격 검사에서 ${FACTORS.N.name}이 ${level(s.N)}이라, 조용한 단독 공간이 있는지 확인해요.`});
    return out;
  }
  window.MCPQ={FACTORS,ITEMS,SCALE,ORDER,score,level,nickname,radar,needs,
    refs:[
      'Ley, J. M., Bennett, P. C., & Coleman, G. J. (2009). A refinement and validation of the Monash Canine Personality Questionnaire (MCPQ). Applied Animal Behaviour Science, 116(2–4), 220–227.',
      'Ley, J. M., McGreevy, P., & Bennett, P. C. (2009). Inter-rater and test–retest reliability of the Monash Canine Personality Questionnaire-Revised (MCPQ-R). Applied Animal Behaviour Science, 119(1–2), 85–90.'
    ],
    dois:['https://doi.org/10.1016/j.applanim.2008.09.009','https://doi.org/10.1016/j.applanim.2009.02.027']};
})();
