(function(){
  let pet={};
  const startButton=document.querySelector('#start');
  const word=document.querySelector('#changing-word');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map=TrailMap.create(document.querySelector('#scene'),{
    nodes:FP.NODES,interactive:n=>n.id==='consult',hidden:true,seed:11,density:1.1,
    label:'가운데 강아지에게서 병원, 호텔, 미용실, 유치원 등으로 산책로가 이어지는 그림',
    center:()=>Minimi.svg(Minimi.config(pet),{inner:true}),
    onSelect:id=>{if(id==='consult')location.href='consult.html';}
  });
  async function loadAccountPet(){
    if(!window.FPChat||!FPChat.client)return;
    try{
      const {user,pet:profile}=await FPChat.loadPetProfile();
      if(!user||!profile||!profile.name)return;
      pet=profile;
      startButton.innerHTML=`${FP.esc(FP.josa.name(pet.name))} 산책 지도 보기 ${FP.icon('arrow-right')}`;
      startButton.href='services.html';
      map.redraw();
    }catch(error){
      console.error('Unable to load pet profile for the landing page.',error);
    }
  }
  const steps=[['병원과','hospital'],['호텔과','hotel'],['미용실과','grooming'],['유치원과','kinder']];
  let timers=[];
  function finish(){
    map.revealAll();word.textContent='함께';
    document.body.classList.add('complete');
  }
  function start(){
    timers.forEach(clearTimeout);timers=[];
    document.body.classList.remove('complete');map.reset();word.innerHTML='&nbsp;';
    if(reduced){finish();return;}
    steps.forEach(([text,id],i)=>{
      timers.push(setTimeout(()=>{
        word.classList.add('changing');
        timers.push(setTimeout(()=>{word.textContent=text;word.classList.remove('changing');map.reveal(id);},170));
      },900+i*1050));
    });
    timers.push(setTimeout(()=>{['star','consult','together'].forEach((id,i)=>timers.push(setTimeout(()=>map.reveal(id),i*160)));},900+4*1050));
    timers.push(setTimeout(finish,900+4*1050+700));
  }
  document.querySelector('#replay').addEventListener('click',start);
  start();
  loadAccountPet();
})();
