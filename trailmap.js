/* 산책 지도: 가운데 미니미에서 흙길 산책로가 시설로 뻗어 나가는 SVG 장면 */
(function(){
  const OUT='#3A2B20';
  const NS='http://www.w3.org/2000/svg';

  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

  const ART={
    hospital:`<rect x="-25" y="-40" width="50" height="70" rx="6" fill="#FFFFFF" stroke="${OUT}" stroke-width="3"/><rect x="-13" y="-58" width="26" height="22" rx="6" fill="#FFFFFF" stroke="${OUT}" stroke-width="3"/><path d="M0 -53v12M-6 -47h12" stroke="#E0503F" stroke-width="4.5" stroke-linecap="round"/><rect x="-17" y="-28" width="12" height="10" rx="2" fill="#CFE3F5"/><rect x="5" y="-28" width="12" height="10" rx="2" fill="#CFE3F5"/><rect x="-17" y="-11" width="12" height="10" rx="2" fill="#CFE3F5"/><rect x="5" y="-11" width="12" height="10" rx="2" fill="#CFE3F5"/><rect x="-8" y="10" width="16" height="20" rx="2" fill="#9CC3E6" stroke="${OUT}" stroke-width="2.4"/>`,
    grooming:`<path d="M-34 -24 L-26 -38 L38 -38 L34 -24 Z" fill="#F7D8E1" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M34 -24 L38 -38 L38 22 L34 30 Z" fill="#E8B9C7" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><rect x="-34" y="-24" width="68" height="54" rx="3" fill="#FFF1F5" stroke="${OUT}" stroke-width="3"/><path d="M-34 -24 h68 v9 q-5.6 6 -11.3 0 q-5.6 6 -11.3 0 q-5.6 6 -11.3 0 q-5.6 6 -11.3 0 q-5.6 6 -11.3 0 q-5.6 6 -11.3 0 z" fill="#F07C99" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/><rect x="-24" y="-4" width="26" height="22" rx="3" fill="#CFE3F5" stroke="${OUT}" stroke-width="2.2"/><g transform="translate(-11 7)" stroke="${OUT}" stroke-width="2.2" fill="none" stroke-linecap="round"><circle cx="-4" cy="5" r="3"/><circle cx="4" cy="5" r="3"/><path d="M-2.5 2.5 L5 -7 M2.5 2.5 L-5 -7"/></g><rect x="9" y="4" width="16" height="26" rx="2" fill="#F07C99" stroke="${OUT}" stroke-width="2.4"/>`,
    consult:`<path d="M-40 -18 a40 27 0 1 1 22 24 l-16 12 4 -16 a40 27 0 0 1 -10 -20z" fill="#FFFFFF" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><circle cx="-16" cy="-18" r="4" fill="#3E7A39"/><circle cx="0" cy="-18" r="4" fill="#3E7A39"/><circle cx="16" cy="-18" r="4" fill="#3E7A39"/><path d="M24 -44 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#FFD400" stroke="${OUT}" stroke-width="2"/>`,
    hotel:`<rect x="-30" y="-12" width="60" height="42" rx="3" fill="#FFF4DA" stroke="${OUT}" stroke-width="3"/><path d="M-40 -10 L0 -44 L40 -10" fill="#D86A4A" stroke="${OUT}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M-40 -10 L0 -44 L40 -10 Z" fill="#D86A4A"/><path d="M-40 -10 L0 -44 L40 -10" fill="none" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/><rect x="-21" y="-2" width="16" height="13" rx="2" fill="#FFD567" stroke="${OUT}" stroke-width="2.2"/><rect x="6" y="6" width="15" height="24" rx="2" fill="#B07A4A" stroke="${OUT}" stroke-width="2.4"/><path d="M4 -30 a6 6 0 1 0 6 -7 a4.6 4.6 0 0 1 -6 7z" fill="#FFD400" stroke="${OUT}" stroke-width="1.8"/>`,
    kinder:`<path d="M-34 -18 L0 -40 L34 -18" fill="#7FB3E8" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><rect x="-32" y="-18" width="64" height="48" rx="3" fill="#E7F1FC" stroke="${OUT}" stroke-width="3"/><circle cx="0" cy="-20" r="11" fill="#FFFFFF" stroke="${OUT}" stroke-width="2.8"/><path d="M0 -26v6l4 3" stroke="${OUT}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M0 -40 v-14 l12 4 -12 4" fill="#FFD400" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/><rect x="-24" y="0" width="13" height="12" rx="2" fill="#CFE3F5" stroke="${OUT}" stroke-width="2"/><rect x="11" y="0" width="13" height="12" rx="2" fill="#CFE3F5" stroke="${OUT}" stroke-width="2"/><path d="M-8 30 v-12 a8 8 0 0 1 16 0 v12" fill="#FFD400" stroke="${OUT}" stroke-width="2.4"/>`,
    together:`<rect x="-4" y="-6" width="8" height="34" rx="3" fill="#9A6B43" stroke="${OUT}" stroke-width="2.6"/><circle cx="-12" cy="-22" r="18" fill="#7DB356" stroke="${OUT}" stroke-width="3"/><circle cx="12" cy="-26" r="20" fill="#8CC062" stroke="${OUT}" stroke-width="3"/><circle cx="0" cy="-40" r="16" fill="#9ACB6E" stroke="${OUT}" stroke-width="3"/><path d="M14 20 h28 M16 20 v10 M40 20 v10 M14 13 h28" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/><path d="M-40 26 q4 -10 8 0 q4 -10 8 0" fill="#F5A9BC" stroke="${OUT}" stroke-width="2"/>`,
    star:`<path d="M-42 30 q42 -34 84 0 z" fill="#C9DDB0" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M0 -50 l8.5 17 18.8 2.7 -13.6 13.3 3.2 18.7L0 -7.2 -16.9 1.7l3.2 -18.7 -13.6 -13.3 18.8 -2.7z" fill="#FFD400" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M-30 -36 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z M32 -22 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#FFE07A" stroke="${OUT}" stroke-width="1.6"/>`
  };

  function el(tag,attrs={},html){const n=document.createElementNS(NS,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);if(html!=null)n.innerHTML=html;return n;}

  function create(host,opts){
    const o={nodes:[],interactive:true,hidden:false,seed:7,...opts};
    const isInteractive=n=>typeof o.interactive==='function'?o.interactive(n):o.interactive;
    const svg=el('svg',{class:'trailmap',role:o.interactive?'group':'img','aria-label':o.label||'산책 지도'});
    host.append(svg);
    const state={revealed:new Set(o.hidden?[]:o.nodes.map(n=>n.id)),geo:{},walking:false};
    let W=0,H=0,k=1,C={x:0,y:0},R=60;

    function layout(){
      W=host.clientWidth;H=host.clientHeight;if(!W||!H)return false;
      k=Math.max(.62,Math.min(1.12,Math.min(W/980,H/620)*1.18));
      const compact=W<520;svg.classList.toggle('compact',compact);o._cw=compact?18:15.5;
      if(compact)k=Math.max(.62,Math.min(.82,W/500));
      C={x:W/2,y:H*(o.centerY||.5)};R=60*k;
      const mx=Math.max(64*k,56),my=88*k;
      const rx=W/2-mx, ry=Math.min(H*(o.centerY||.5),H*(1-(o.centerY||.5)))-my;
      o.nodes.forEach((n,i)=>{
        const lines=(compact&&n.clines)||[n.label];const nk=k*(compact&&n.detached?.88:1);
        const half=Math.max(66,Math.max(...lines.map(l=>l.length))*o._cw+26)/2*nk+(n.soon?22*nk:0)+6;
        const x=Math.min(W-half,Math.max(half,C.x+((compact&&n.cpos)||n.pos)[0]*rx)), y=C.y+((compact&&n.cpos)||n.pos)[1]*ry;
        const ex=x, ey=y+18*k;
        const dx=ex-C.x, dy=ey-C.y, len=Math.hypot(dx,dy)||1;
        const px=-dy/len, py=dx/len, w=len*.2*(n.bend||(i%2?1:-1));
        const sx=C.x+dx/len*R*.82, sy=C.y+dy/len*R*.82;
        const c1=[C.x+dx*.36+px*w, C.y+dy*.36+py*w], c2=[C.x+dx*.68-px*w, C.y+dy*.68-py*w];
        state.geo[n.id]={x,y,d:`M${sx.toFixed(1)} ${sy.toFixed(1)} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`};
      });
      return true;
    }

    function decorations(trailEls){
      const r=rng(o.seed), g=el('g',{class:'deco','aria-hidden':'true'});
      const samples=[];trailEls.forEach(p=>{const L=p.getTotalLength();for(let t=0;t<=L;t+=14)samples.push(p.getPointAtLength(t));});
      const blocked=(x,y,pad)=>{
        if(Math.hypot(x-C.x,y-C.y)<R+pad)return true;
        for(const n of o.nodes){const q=state.geo[n.id];if(Math.abs(x-q.x)<62*k+pad*.4&&y>q.y-70*k&&y<q.y+68*k)return true;}
        for(const s of samples){if(Math.hypot(x-s.x,y-s.y)<22*k+pad*.5)return true;}
        return false;
      };
      /* 잔디 결 */

      let tufts='',flowers='',stones='';
      const area=W*H, nT=Math.round(area/26000*(o.density||1)), nF=Math.round(area/30000*(o.density||1));
      for(let i=0,tries=0;i<nT&&tries<nT*6;tries++){const x=r()*W,y=r()*H;if(blocked(x,y,6))continue;i++;const s=(.7+r()*.6)*k,c=r()>.4?'#6FA64B':'#4F8C3F';tufts+=`<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})" d="M0 0 q-3 -8 -8 -12 M0 0 q0 -11 1.5 -16 M0 0 q3 -8 8 -11" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;}
      const petals=['#FFFFFF','#F5A9BC','#FFD54A','#C9B8F0','#FFFFFF'];
      for(let i=0,tries=0;i<nF&&tries<nF*8;tries++){const x=r()*W,y=r()*H;if(blocked(x,y,10))continue;i++;const s=(.75+r()*.55)*k,c=petals[Math.floor(r()*petals.length)];let pp='';for(let j=0;j<5;j++){const a=j/5*Math.PI*2-.3;pp+=`<circle cx="${(Math.cos(a)*4.2).toFixed(2)}" cy="${(Math.sin(a)*4.2).toFixed(2)}" r="3.3" fill="${c}" stroke="rgba(58,43,32,.35)" stroke-width=".8"/>`;}flowers+=`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})"><path d="M0 4 v9" stroke="#5E9A45" stroke-width="2" stroke-linecap="round"/>${pp}<circle r="2.6" fill="${c==='#FFD54A'?'#E08A1E':'#FFD400'}"/></g>`;}
      for(let i=0,tries=0;i<Math.round(area/240000);tries++){if(tries>200)break;const x=r()*W,y=r()*H;if(blocked(x,y,4))continue;i++;stones+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(4+r()*4)*k}" ry="${(3+r()*2)*k}" fill="#D9D3C4" stroke="rgba(58,43,32,.3)" stroke-width="1"/>`;}
      g.insertAdjacentHTML('beforeend',stones+tufts+flowers);
      return g;
    }

    function draw(){
      if(!layout())return;
      svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width',W);svg.setAttribute('height',H);
      svg.innerHTML='';
      const trails=el('g',{class:'trails'});
      const trailEls=[];
      o.nodes.filter(n=>!n.detached).forEach(n=>{
        const g=el('g',{class:'trail'+(state.revealed.has(n.id)?' on':''),'data-id':n.id});
        const sw=k;
        g.innerHTML=`<path class="t-edge" d="${state.geo[n.id].d}" stroke-width="${(28*sw).toFixed(1)}" pathLength="1"/><path class="t-soil" d="${state.geo[n.id].d}" stroke-width="${(21*sw).toFixed(1)}" pathLength="1"/><path class="t-pebble" d="${state.geo[n.id].d}" stroke-width="${(3.2*sw).toFixed(1)}"/>`;
        trails.append(g);trailEls.push(g.querySelector('.t-soil'));
      });
      svg.append(trails);
      svg.insertBefore(decorations(trailEls),trails);
      /* 가운데 광장과 미니미 */
      const hub=el('g',{class:'hub',transform:`translate(${C.x} ${C.y})`});
      hub.innerHTML=`<circle r="${R}" fill="#E2C69C" stroke="${OUT}" stroke-width="3"/><circle r="${R-9*k}" fill="#F1E1C6" stroke="#C9A676" stroke-width="2" stroke-dasharray="3 6"/>`;
      svg.append(hub);
      const walker=el('g',{class:'walker'});
      const mw=R*2.25;
      walker.innerHTML=`<g transform="translate(${-mw/2} ${-mw*194/168*.64})"><svg width="${mw}" height="${mw*194/168}" viewBox="${window.Minimi?Minimi.BOX:'16 22 168 194'}" overflow="visible">${o.center?o.center():''}</svg></g>`;
      walker.setAttribute('transform',`translate(${C.x} ${C.y})`);
      /* 시설 노드 */
      const nodes=el('g',{class:'nodes'});
      o.nodes.forEach(n=>{
        const q=state.geo[n.id];
        const g=el('g',{class:'node'+(state.revealed.has(n.id)?' on':'')+(n.soon?' soon':'')+(n.detached?' detached':''),'data-id':n.id,transform:`translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) scale(${(k*(svg.classList.contains('compact')&&n.detached?.88:1)).toFixed(3)})`});
        if(isInteractive(n)){g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',n.label+(n.soon?' (준비 중)':''));}
        const compact=svg.classList.contains('compact');const lines=(compact&&n.clines)||[n.label];const ph=30+(lines.length-1)*21;
        const tw=Math.max(66,Math.max(...lines.map(l=>l.length))*(o._cw||15.5)+26);
        g.innerHTML=`<g class="lift"><rect class="hit" x="${-Math.max(60,tw/2)}" y="-66" width="${Math.max(120,tw)}" height="136" fill="transparent"/>${n.detached?'<ellipse cx="0" cy="32" rx="58" ry="15" fill="#F6FAEE" stroke="#BCD39E" stroke-width="2" stroke-dasharray="5 7"/>':'<ellipse cx="0" cy="32" rx="46" ry="11" fill="#D8BC93" opacity=".9"/>'}${ART[n.kind]||''}<g class="plate" transform="translate(0 52)"><rect x="${-tw/2}" y="-15" width="${tw}" height="${ph}" rx="15" fill="#FFFFFF" stroke="${OUT}" stroke-width="2.6"/>${lines.map((l,j)=>`<text y="${5.5+j*21}" text-anchor="middle">${l}</text>`).join('')}${n.soon?`<g transform="translate(${tw/2-4} -15)"><rect x="-14" y="-10" width="40" height="18" rx="9" fill="#FFD400" stroke="${OUT}" stroke-width="2"/><text class="soon-t" x="6" y="3.5" text-anchor="middle">준비중</text></g>`:''}</g></g>`;
        nodes.append(g);
      });
      svg.append(nodes);svg.append(walker);
      state.walker=walker;
      if(o.interactive){
        nodes.querySelectorAll('.node').forEach(g=>{
          const id=g.dataset.id;
          const node=o.nodes.find(n=>n.id===id);
          if(!isInteractive(node))return;
          const go=()=>{if(!state.walking&&o.onSelect)o.onSelect(id);};
          g.addEventListener('click',go);
          g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
          const hl=on=>svg.querySelector(`.trail[data-id="${id}"]`)?.classList.toggle('hl',on);
          g.addEventListener('pointerenter',()=>hl(true));g.addEventListener('pointerleave',()=>hl(false));
          g.addEventListener('focus',()=>hl(true));g.addEventListener('blur',()=>hl(false));
        });
      }
    }

    function reveal(id){state.revealed.add(id);svg.querySelector(`.trail[data-id="${id}"]`)?.classList.add('on');svg.querySelector(`.node[data-id="${id}"]`)?.classList.add('on');}
    function revealAll(){o.nodes.forEach(n=>reveal(n.id));}
    function reset(){state.revealed.clear();svg.querySelectorAll('.trail,.node').forEach(e=>e.classList.remove('on'));}
    function walkTo(id,done){
      const path=svg.querySelector(`.trail[data-id="${id}"] .t-soil`);
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(!path||reduced){done&&done();return;}
      state.walking=true;svg.classList.add('walking');
      const L=path.getTotalLength(), stop=L-26*k, dur=Math.min(1100,380+L*1.6), t0=performance.now();
      svg.querySelector(`.trail[data-id="${id}"]`).classList.add('hl');
      function step(t){
        const p=Math.min(1,(t-t0)/dur), e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
        const pt=path.getPointAtLength(stop*e), bob=Math.sin(p*Math.PI*8)*2.2*k;
        state.walker.setAttribute('transform',`translate(${pt.x.toFixed(1)} ${(pt.y-6*k*Math.sin(p*Math.PI)+bob).toFixed(1)}) scale(${(1-.38*e).toFixed(3)})`);
        if(p<1)requestAnimationFrame(step);else{state.walking=false;done&&done();}
      }
      requestAnimationFrame(step);
    }
    function home(){
      svg.classList.remove('walking');svg.querySelectorAll('.trail.hl').forEach(t=>t.classList.remove('hl'));
      if(state.walker)state.walker.setAttribute('transform',`translate(${C.x} ${C.y})`);
    }
    function setCenter(fn){o.center=fn;draw();}
    let raf;const ro=new ResizeObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(draw);});ro.observe(host);
    draw();
    return {reveal,revealAll,reset,walkTo,home,setCenter,redraw:draw,svg};
  }
  window.TrailMap={create,art:(kind)=>ART[kind]||''};
})();
