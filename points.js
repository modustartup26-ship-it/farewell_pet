(function(){
  const today=()=>new Date().toISOString().slice(0,10);
  let state=FP.load();
  if(state.walkStepsDate!==today())Object.assign(state,{walkStepsDate:today(),stepsToday:0,walkPointsToday:0});

  function save(){FP.save(state);}
  function resetDay(){
    const d=today();
    if(state.walkStepsDate!==d)Object.assign(state,{walkStepsDate:d,stepsToday:0,walkPointsToday:0});
  }
  function addSteps(steps){
    resetDay();
    const before=Math.min(state.stepsToday||0,200000);
    const next=Math.min(before+Math.max(0,Math.floor(steps||0)),200000);
    const beforePoints=Math.floor(before/100);
    const nextPoints=Math.floor(next/100);
    const earned=Math.max(0,Math.min(nextPoints-beforePoints,2000-(state.walkPointsToday||0)));
    state.stepsToday=next;
    state.walkPointsToday=(state.walkPointsToday||0)+earned;
    state.points=(state.points||0)+earned;
    save();
    dispatch();
    return earned;
  }
  function spend(cost){
    resetDay();
    if((state.points||0)<cost)return false;
    state.points-=cost;save();dispatch();return true;
  }
  function dispatch(){
    window.dispatchEvent(new CustomEvent('fp-points',{detail:{points:state.points||0,steps:state.stepsToday||0,earnedToday:state.walkPointsToday||0}}));
  }
  let motionInstalled=false,peak=false,lastPeak=0;
  function installMotion(){
    if(motionInstalled||!window.DeviceMotionEvent)return;
    motionInstalled=true;
    window.addEventListener('devicemotion',event=>{
      const a=event.accelerationIncludingGravity;if(!a)return;
      const magnitude=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2);
      const now=Date.now();
      if(magnitude>11.8&&!peak&&now-lastPeak>420){peak=true;lastPeak=now;addSteps(1);}
      if(magnitude<10.5)peak=false;
    });
  }
  async function enableMotion(){
    try{
      if(typeof DeviceMotionEvent.requestPermission==='function'){
        const permission=await DeviceMotionEvent.requestPermission();
        if(permission!=='granted')throw new Error('permission_denied');
      }
      installMotion();
      return true;
    }catch(error){return false;}
  }
  window.FPPoints={get(){resetDay();return {points:state.points||0,steps:state.stepsToday||0,earnedToday:state.walkPointsToday||0};},addSteps,spend,enableMotion,dispatch};
  dispatch();
})();
