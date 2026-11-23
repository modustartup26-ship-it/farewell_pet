(function(){
  const $=s=>document.querySelector(s);
  const products=[
    {id:'snack-chicken',type:'snack',name:'닭가슴살 간식',desc:'휴대용 보상 간식',price:120,icon:'🍗'},
    {id:'snack-cheese',type:'snack',name:'치즈 큐브',desc:'훈련용 소량 간식',price:180,icon:'🧀'},
    {id:'snack-treat',type:'snack',name:'노즈워크 쿠키',desc:'냄새 맡기 간식',price:260,icon:'🥨'},
    {id:'toy-ball',type:'toy',name:'공 놀이 세트',desc:'실내·외 겸용 공',price:300,icon:'🎾'},
    {id:'toy-rope',type:'toy',name:'터그 로프',desc:'함께 놀기 장난감',price:420,icon:'🪢'},
    {id:'toy-puzzle',type:'toy',name:'노즈워크 퍼즐',desc:'간식 찾기 퍼즐',price:650,icon:'🧩'}
  ];
  function render(){
    const p=FPPoints.get();
    $('#owner-points').textContent=p.points+' P';
    $('#today-steps').textContent=p.steps.toLocaleString();
    $('#today-earned').textContent=`오늘 ${p.earnedToday} P 획득`;
    const pct=Math.min(100,Math.round(p.steps/200000*100));
    $('#step-percent').textContent=pct+'%';
    $('#step-ring').style.background=`conic-gradient(var(--primary) ${pct*3.6}deg,var(--line) 0deg)`;
  }
  function card(p){
    return `<article class="product"><div class="product-icon">${p.icon}</div><h3>${FP.esc(p.name)}</h3><p>${FP.esc(p.desc)}</p><div class="product-foot"><span class="product-price tnum">${p.price} P</span><button type="button" class="btn btn-primary buy" data-buy="${p.id}">구매</button></div></article>`;
  }
  $('#snacks').innerHTML=products.filter(p=>p.type==='snack').map(card).join('');
  $('#toys').innerHTML=products.filter(p=>p.type==='toy').map(card).join('');
  document.addEventListener('click',e=>{
    const buy=e.target.closest('[data-buy]');if(!buy)return;
    const p=products.find(x=>x.id===buy.dataset.buy);
    if(!FPPoints.spend(p.price)){FP.toast('포인트가 부족해요.');return;}
    FP.toast(`${p.name}을(를) 교환 목록에 담았어요.`);
  });
  $('#enable-steps').addEventListener('click',async()=>{
    const ok=await FPPoints.enableMotion();
    FP.toast(ok?'걸음 센서를 켰어요. 산책 화면을 열어 두세요.':'센서 권한을 허용해 주세요.');
  });
  $('#test-step').addEventListener('click',()=>{FPPoints.addSteps(100);FP.toast('100걸음과 포인트를 테스트로 반영했어요.');});
  window.addEventListener('fp-points',render);
  render();
})();
