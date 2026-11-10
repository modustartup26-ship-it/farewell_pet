/* 공통: 저장소, 이름 조사, 아이콘, 토스트 */
(function(){
  const KEY='farewell-pet-v1';
  try{localStorage.removeItem(KEY);}catch(error){console.error('Unable to clear the previous browser profile cache.',error);}
  const ICONS={
    'arrow-left':'<path d="M15 5l-7 7 7 7"/>',
    'arrow-right':'<path d="M5 12h14M13 6l6 6-6 6"/>',
    'chev-right':'<path d="M9 6l6 6-6 6"/>',
    'chev-down':'<path d="M6 9l6 6 6-6"/>',
    'close':'<path d="M6 6l12 12M18 6L6 18"/>',
    'check':'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'question':'<path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1v.5"/><path d="M12 18h.01"/>',
    'no':'<path d="M7 7l10 10M17 7L7 17"/>',
    'heart':'<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
    'phone':'<path d="M6.6 3.8l2.6.4 1.3 4-2 1.5a12 12 0 0 0 5.8 5.8l1.5-2 4 1.3.4 2.6c.1.9-.6 1.7-1.5 1.7C10.4 19.1 4.9 13.6 4.9 5.3c0-.9.8-1.6 1.7-1.5z"/>',
    'chat':'<path d="M20 11.5c0 4-3.6 7-8 7-1 0-2-.1-2.9-.4L4.5 20l1.2-3.5A6.7 6.7 0 0 1 4 11.5c0-4 3.6-7 8-7s8 3 8 7z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
    'pin':'<path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    'clock':'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    'refresh':'<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
    'plus':'<path d="M12 5v14M5 12h14"/>',
    'minus':'<path d="M5 12h14"/>',
    'camera':'<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>',
    'paw':'<ellipse cx="12" cy="15.5" rx="4.2" ry="3.6"/><circle cx="6.6" cy="10.6" r="1.7"/><circle cx="9.6" cy="7" r="1.7"/><circle cx="14.4" cy="7" r="1.7"/><circle cx="17.4" cy="10.6" r="1.7"/>',
    'map':'<path d="M9 4.5L3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
    'list':'<path d="M9 7h11M9 12h11M9 17h11"/><path d="M4.5 7h.01M4.5 12h.01M4.5 17h.01"/>',
    'external':'<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    'edit':'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    'copy':'<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v8A1.5 1.5 0 0 0 6.5 16H8"/>',
    'trash':'<path d="M5 7h14M10 4h4M7 7l1 12.5h8L17 7"/>',
    'sparkle':'<path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9-1.9 5.6-1.9-5.6-5.6-1.9 5.6-1.9z"/>',
    'leaf':'<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19l7-7"/>',
    'slide':'<path d="M5 20V8h4v12M5 12h4"/><path d="M9 8c4 0 5 4 7 8 .8 1.6 2 2.5 3.5 2.5"/>',
    'umbrella':'<path d="M3.5 11a8.5 8.5 0 0 1 17 0z"/><path d="M12 11v7.5a1.8 1.8 0 0 1-3.6 0"/>',
    'tree':'<circle cx="12" cy="9" r="5.5"/><path d="M12 14.5V21M8 21h8"/>',
    'grid':'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16"/>',
    'building':'<path d="M5 20V6l7-2.5V20M12 8h7v12M3 20h18"/><path d="M8 9h.01M8 12.5h.01M8 16h.01M15.5 11.5h.01M15.5 15h.01"/>',
    'waves':'<path d="M3 9c2.2 0 2.2-1.5 4.5-1.5S9.8 9 12 9s2.2-1.5 4.5-1.5S18.8 9 21 9M3 14c2.2 0 2.2-1.5 4.5-1.5S9.8 14 12 14s2.2-1.5 4.5-1.5S18.8 14 21 14M3 19c2.2 0 2.2-1.5 4.5-1.5S9.8 19 12 19s2.2-1.5 4.5-1.5S18.8 19 21 19"/>',
    'parking':'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 16.5v-9h3a2.7 2.7 0 0 1 0 5.4h-3"/>',
    'bag':'<path d="M5.5 8h13l-1 12h-11z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
    'cup':'<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5v2M11 3.5v2"/>',
    'calendar':'<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    'book':'<path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H18"/><path d="M9 8.5h5"/>',
    'user':'<circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>'
  };
  function sprite(){
    if(document.getElementById('fp-icons'))return;
    const s=Object.entries(ICONS).map(([k,v])=>`<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
    document.body.insertAdjacentHTML('afterbegin',`<svg id="fp-icons" width="0" height="0" style="position:absolute" aria-hidden="true">${s}</svg>`);
  }
  const icon=(name,cls='')=>`<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function load(){let s={};try{s=JSON.parse(sessionStorage.getItem(KEY))||{};}catch{}return {saved:[],records:[],...s,pet:{...(s.pet||{})}};}
  function save(state){try{sessionStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
  function clearPetCache(state=load()){delete state.pet;return save(state);}
  /* 받침이 있으면 '이'를 붙여 부르는 이름으로: 콩 → 콩이, 초롱이 → 초롱이 */
  function hasBatchim(word){const ch=String(word).trim().slice(-1);const c=ch.charCodeAt(0);if(c<0xAC00||c>0xD7A3)return false;return (c-0xAC00)%28!==0;}
  const call=name=>{name=String(name||'').trim()||'우리 아이';return hasBatchim(name)?name+'이':name;};
  const josa={
    of:n=>call(n)+'의',
    topic:n=>call(n)+'는',
    subj:n=>call(n)+'가',
    name:n=>call(n)
  };
  function sizeFromWeight(kg){kg=Number(kg);if(!kg)return '';return kg<5?'소형견':kg<15?'중형견':'대형견';}
  let toastTimer;
  function toast(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.append(t);}t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000);}
  /* 산책 지도에 놓이는 시설 (손그림 배치를 따름) */
  const NODES=[
    {id:'grooming',kind:'grooming',label:'미용실',pos:[-.6,-.8],bend:1},
    {id:'hospital',kind:'hospital',label:'병원',pos:[.58,-.82],bend:-1},
    {id:'star',kind:'star',label:'별들의 공간',pos:[-.98,-.06],cpos:[-.8,.02],soon:true,detached:true},
    {id:'consult',kind:'consult',label:'실시간·전문가 상담',pos:[.96,-.06],cpos:[.8,.02],clines:['실시간·','전문가 상담'],detached:true},
    {id:'kinder',kind:'kinder',label:'유치원',pos:[-.66,.8],bend:1},
    {id:'hotel',kind:'hotel',label:'호텔',pos:[.64,.8],bend:-1},
    {id:'together',kind:'together',label:'커뮤니티',pos:[0,1.02],cpos:[0,1.02],soon:true,detached:true}
  ];
  window.FP={KEY,NODES,icon,esc,load,save,clearPetCache,josa,call,sizeFromWeight,toast,sprite};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sprite);else sprite();
})();
