/* 시작 화면(스플래시)
   - 앱을 처음 열 때(브라우저 탭 세션당 한 번) 약 5초 동안 보여 준 뒤 메인 화면으로 넘어간다.
   - 화면을 누르거나 '건너뛰기'를 누르면 바로 넘어간다.
   - 주소 끝에 ?splash 를 붙이면 언제든 다시 볼 수 있다. */
(function(){
  const KEY='fp-splash-seen';
  const force=/[?&]splash\b/.test(location.search);
  let seen=false;
  try{seen=sessionStorage.getItem(KEY)==='1';}catch(e){}
  if(seen&&!force)return;
  try{sessionStorage.setItem(KEY,'1');}catch(e){}

  const root=document.documentElement;
  root.classList.add('splash-on');

  const LINE1='일상으로 시작하는 우리 강아지 맞춤형';
  // 글자마다 시간차를 두고 나타나게 해서 왼쪽에서 오른쪽으로 써지는 효과를 낸다
  const LINE2='CARE&CONNECTION';
  const STEP=0.035, START=0.1;
  let i=0;
  const chars=(text,cls)=>[...text].map(c=>`<span class="ch${cls?' '+cls:''}" style="animation-delay:${(START+(i++)*STEP).toFixed(3)}s">${c===' '?' ':c.replace('&','&amp;')}</span>`).join('');
  // '일상'과 '맞춤형'은 파란색, 나머지는 검은색
  // 단어 단위로 묶어 줄바꿈이 단어 중간에서 일어나지 않게 한다
  const word=html=>`<span class="w">${html}</span>`;
  const line1=[word(chars('일상','blue')+chars('으로')),word(chars('시작하는')),word(chars('우리')),word(chars('강아지')),word(chars('맞춤형','blue'))].join(' ');
  const line2=word(chars(LINE2,'blue'));

  const tuft=(x,y)=>`<path class="tuft" d="M${x} ${y} q2 -9 5 -12 M${x+5} ${y} q0 -10 -1 -14 M${x+9} ${y} q-1 -8 -4 -11"/>`;
  const place=(n,x,y,label,icon,roof)=>`
    <g class="place p${n}">
      <path d="M${x} ${y+56} V${y+16} L${x+36} ${y-4} L${x+72} ${y+16} V${y+56} Z" fill="#fff" stroke="#1A2233" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M${x-4} ${y+18} L${x+36} ${y-6} L${x+76} ${y+18}" fill="none" stroke="${roof}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <g transform="translate(${x+36} ${y+34})">${icon}</g>
      <text class="place-label" x="${x+36}" y="${y+74}">${label}</text>
    </g>`;
  const ICON={
    hospital:'<path d="M-4 -12h8v8h8v8h-8v8h-8v-8h-8v-8h8z" fill="#E0483A"/>',
    hotel:'<rect x="-14" y="-4" width="28" height="10" rx="2" fill="#1E56C2"/><rect x="-14" y="-10" width="9" height="7" rx="3" fill="#1E56C2"/><path d="M-14 6v6M14 6v6" stroke="#1E56C2" stroke-width="3" stroke-linecap="round"/>',
    kinder:'<circle r="11" fill="#FFD400" stroke="#1A2233" stroke-width="2"/><path d="M-11 0h22M0 -11c-5 6 -5 16 0 22M0 -11c5 6 5 16 0 22" fill="none" stroke="#1A2233" stroke-width="1.6"/>',
    grooming:'<circle cx="-7" cy="8" r="5" fill="none" stroke="#1E56C2" stroke-width="2.6"/><circle cx="7" cy="8" r="5" fill="none" stroke="#1E56C2" stroke-width="2.6"/><path d="M-4 4L9 -13M4 4L-9 -13" stroke="#1A2233" stroke-width="2.6" stroke-linecap="round"/>'
  };

  const scene=`
  <svg class="splash-scene" viewBox="0 0 760 250" aria-hidden="true">
    <g class="field">
      <path class="hill" d="M0 214 C40 168 120 160 180 184 C215 197 240 205 250 214 Z"/>
      ${tuft(18,214)}${tuft(70,212)}${tuft(140,212)}${tuft(205,213)}${tuft(110,190)}${tuft(45,196)}
      <circle cx="60" cy="40" r="16" fill="#FFD400"/>
    </g>
    <line class="ground" x1="6" y1="214" x2="754" y2="214"/>

    <!-- 집 (가운데) -->
    <path class="house-fill" d="M262 214 V118 H428 V214 Z"/>
    <path class="roof-fill" d="M250 120 L345 52 L440 120 Z"/>
    <path class="house-line" d="M262 214 V118 M428 118 V214 M250 120 L345 52 L440 120 Z"/>
    <g class="item water">
      <path d="M270 212 h30 l-4 -13 h-22 z" fill="#fff" stroke="#1A2233" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M275 200 q10 -5 20 0" fill="none" stroke="#3B82F6" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g class="item food">
      <path d="M392 212 h32 l-4 -13 h-24 z" fill="#fff" stroke="#1A2233" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="401" cy="198" r="3.2" fill="#A8691E"/><circle cx="408" cy="196" r="3.2" fill="#C47F2C"/><circle cx="415" cy="198" r="3.2" fill="#A8691E"/>
    </g>
    <g class="item treat">
      <path d="M380 150 h40" stroke="#1A2233" stroke-width="2.2" stroke-linecap="round"/>
      <g transform="translate(400 140)">
        <rect x="-11" y="-3.5" width="22" height="7" rx="3" fill="#F7D46A" stroke="#8A6400" stroke-width="1.6"/>
        <circle cx="-12" cy="-3.5" r="4" fill="#F7D46A" stroke="#8A6400" stroke-width="1.6"/><circle cx="-12" cy="3.5" r="4" fill="#F7D46A" stroke="#8A6400" stroke-width="1.6"/>
        <circle cx="12" cy="-3.5" r="4" fill="#F7D46A" stroke="#8A6400" stroke-width="1.6"/><circle cx="12" cy="3.5" r="4" fill="#F7D46A" stroke="#8A6400" stroke-width="1.6"/>
      </g>
    </g>

    <!-- 집 앞 시설 4곳 -->
    ${place(1,530,22,'병원',ICON.hospital,'#E0483A')}
    ${place(2,640,22,'호텔',ICON.hotel,'#1E56C2')}
    ${place(3,530,124,'유치원',ICON.kinder,'#FFD400')}
    ${place(4,640,124,'미용실',ICON.grooming,'#1E56C2')}

    <!-- 사람 + 목줄 + 강아지 -->
    <g class="walker" id="sp-walker">
      <!-- 보호자 캐릭터: 포니테일 머리, 파란 원피스 -->
      <g class="leg-a"><path d="M27 176 V205" stroke="#FFD9BF" stroke-width="5" stroke-linecap="round"/><ellipse cx="29" cy="208" rx="5" ry="3.4" fill="#1A2233"/></g>
      <g class="leg-b"><path d="M33 176 V205" stroke="#F5C9AA" stroke-width="5" stroke-linecap="round"/><ellipse cx="35" cy="208" rx="5" ry="3.4" fill="#1A2233"/></g>
      <g class="bob">
        <path d="M25 156 L16 168" stroke="#FFD9BF" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M23 153 h14 l7 25 h-28 z" fill="#1E56C2" stroke="#13305F" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M36 156 L45 167" stroke="#FFD9BF" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="45.5" cy="167.5" r="2.6" fill="#FFD9BF"/>
        <path d="M45 168 Q70 168 88 189" fill="none" stroke="#D99A00" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 128 q-12 6 -9 20 q3 -6 9 -8 z" fill="#5B3A29"/>
        <circle cx="16" cy="131" r="3" fill="#FFD400"/>
        <circle cx="30" cy="138" r="13" fill="#FFE5D0" stroke="#1A2233" stroke-width="1.8"/>
        <path d="M17 138 a13 13 0 0 1 26 -2 q-5 -6 -13 -5 q-2 5 -8 6 q-2 2 -5 1 z" fill="#5B3A29"/>
        <circle cx="34" cy="140" r="1.7" fill="#1A2233"/><circle cx="40" cy="140" r="1.7" fill="#1A2233"/>
        <circle cx="32" cy="145" r="2.4" fill="#F5A9BC" opacity=".8"/><circle cx="41.5" cy="145" r="2" fill="#F5A9BC" opacity=".8"/>
        <path d="M35.5 145.5 q1.8 1.8 3.6 0" fill="none" stroke="#1A2233" stroke-width="1.4" stroke-linecap="round"/>
      </g>
      <!-- 강아지 다리: 통통한 다리 + 발바닥 -->
      <g class="leg-b"><rect x="68.8" y="197" width="6.4" height="13" rx="3.2" fill="#E8B800" stroke="#1A2233" stroke-width="1.8"/><ellipse cx="72.8" cy="210.5" rx="4.4" ry="2.8" fill="#FFF5D1" stroke="#1A2233" stroke-width="1.6"/></g>
      <g class="leg-b"><rect x="84.8" y="197" width="6.4" height="13" rx="3.2" fill="#E8B800" stroke="#1A2233" stroke-width="1.8"/><ellipse cx="88.8" cy="210.5" rx="4.4" ry="2.8" fill="#FFF5D1" stroke="#1A2233" stroke-width="1.6"/></g>
      <g class="leg-a"><rect x="63.8" y="197" width="6.4" height="13" rx="3.2" fill="#FFD400" stroke="#1A2233" stroke-width="1.8"/><ellipse cx="67.8" cy="210.5" rx="4.4" ry="2.8" fill="#FFF5D1" stroke="#1A2233" stroke-width="1.6"/></g>
      <g class="leg-a"><rect x="89.8" y="197" width="6.4" height="13" rx="3.2" fill="#FFD400" stroke="#1A2233" stroke-width="1.8"/><ellipse cx="93.8" cy="210.5" rx="4.4" ry="2.8" fill="#FFF5D1" stroke="#1A2233" stroke-width="1.6"/></g>
      <g class="bob dog">
        <path d="M63 188 q-9 -10 -4 -18" fill="none" stroke="#1A2233" stroke-width="7" stroke-linecap="round"/><path d="M63 188 q-9 -10 -4 -18" fill="none" stroke="#FFD400" stroke-width="3.6" stroke-linecap="round"/>
        <ellipse cx="78" cy="194" rx="16" ry="9" fill="#FFD400" stroke="#1A2233" stroke-width="2.4"/>
        <circle cx="96" cy="184" r="9" fill="#FFD400" stroke="#1A2233" stroke-width="2.4"/>
        <path d="M91 177 q-5 4 -3 12" fill="#C98A00" stroke="#1A2233" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="99" cy="182" r="1.6" fill="#1A2233"/><path d="M100 188 q2.5 2.5 5 0" fill="none" stroke="#1A2233" stroke-width="1.4" stroke-linecap="round"/><circle cx="98" cy="187" r="1.8" fill="#F5A9BC" opacity=".8"/><circle cx="105" cy="186" r="2" fill="#1A2233"/>
        <path d="M89 190 q2 2 0 4" stroke="#E0483A" stroke-width="3" fill="none"/>
      </g>
    </g>
  </svg>`;

  const el=document.createElement('div');
  el.className='splash';
  el.id='splash';
  el.setAttribute('role','dialog');
  el.setAttribute('aria-label',`${LINE1} ${LINE2}`);
  el.innerHTML=`<h1 class="splash-title" aria-hidden="true">${line1}<span class="line2">${line2}</span></h1>${scene}<button class="splash-skip" type="button">건너뛰기</button>`;

  let done=false;
  const timers=[];
  function close(){
    if(done)return;done=true;
    timers.forEach(clearTimeout);
    el.classList.add('out');
    setTimeout(()=>{root.classList.remove('splash-on');el.remove();},560);
  }
  function mount(){
    (document.body||root).appendChild(el);
    el.addEventListener('click',close);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const walker=el.querySelector('#sp-walker');
    const walk=on=>()=>walker&&walker.classList.toggle('stop',!on);
    timers.push(setTimeout(walk(false),2500)); // 집 안에서 잠깐 멈춤
    timers.push(setTimeout(walk(true),3400));  // 다시 걸어 나감
    timers.push(setTimeout(walk(false),4200)); // 시설 앞 도착
    timers.push(setTimeout(close,reduced?1500:5300));
  }
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
