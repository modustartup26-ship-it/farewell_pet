/* 가족 방: 셋로그처럼 지금 모습을 짧은 영상(최대 10초)·사진으로 바로 나눈다.
   - 가족·함께 키우는 사람은 초대 코드로 들어온다.
   - 돌봄시설에 맡기면 시설이 '임시가족'으로 들어와 맡긴 기간 동안 같은 화면에 올린다. 기간이 끝나면 자동으로 나가진다.
   두 가지 방식으로 돈다.
   - 로그인: Supabase(families·family_members·family_invites·family_posts, 버킷 family-media, Realtime)로 실제 가족끼리 나눈다.
     권한은 RLS가 맡는다(supabase/migrations/20261120_family_room.sql).
   - 로그인 안 함: 시연용. 이 기기 브라우저(localStorage·IndexedDB)에만 두고, 같은 브라우저 탭끼리 BroadcastChannel로 알린다. */
(function(){
  const {icon,esc,toast}=FP;
  const $=s=>document.querySelector(s);
  const KEY='farewell-pet-family-v1',ME_KEY='farewell-pet-family-me',PICK_KEY='farewell-pet-family-pick';
  const MAX_SEC=10;
  const TAGS=['산책','밥','놀이','낮잠','약','병원','기타'];
  const ROLE={owner:'보호자',family:'가족',co:'함께 키우는 사람',temp:'임시가족'};
  const COLORS=['#1E56C2','#E08A00','#2F8F5B','#C2456B','#6B4FC8','#0E8A9A'];
  const HOUR=36e5,DAY=864e5;
  const now=()=>Date.now();

  const localPet=FP.load().pet||{};
  const demoPet={name:'초롱',years:11,weight:13,medications:[{name:'관절 영양제'},{name:'신장 처방식'}],separation:'혼자 있으면 조금 불안해해요'};

  /* 화면이 쓰는 모양: members[{id,name,role,rel,color,facility,from,to,perms,joined}], posts[{id,by,kind,url|src|mid,dur,tag,cap,at}] */
  let S={members:[],posts:[],invites:[],seen:{}};
  let meId='';
  let mode='local';            // 'local' | 'cloud' | 'gate'(로그인했지만 가족 방이 없음)
  let petName=localPet.name||demoPet.name;
  let snapshot=null;           // 클라우드: family_snapshot 결과
  let fams=[];                 // 클라우드: 내가 속한 가족 방들
  let fid=null;
  const petCall=()=>FP.call(petName);
  const ga=n=>{const c=String(n).trim().slice(-1).charCodeAt(0);return n+(c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?'이':'가');};
  const member=id=>S.members.find(m=>m.id===id);
  const me=()=>member(meId)||S.members[0]||{id:'',name:'나',role:'owner',color:COLORS[0]};
  const active=m=>m.role!=='temp'||(now()>=m.from&&now()<=m.to);
  const ended=m=>m.role==='temp'&&now()>m.to;

  /* 시각 표시 */
  const W='일월화수목금토';
  const two=n=>String(n).padStart(2,'0');
  const hm=t=>{const d=new Date(t);return `${two(d.getHours())}:${two(d.getMinutes())}`;};
  const md=t=>{const d=new Date(t);return `${d.getMonth()+1}.${d.getDate()}(${W[d.getDay()]})`;};
  const ago=t=>{const s=(now()-t)/1e3;if(s<60)return '방금';if(s<3600)return `${Math.floor(s/60)}분 전`;if(s<86400)return `${Math.floor(s/3600)}시간 전`;return md(t)+' '+hm(t);};
  const dayKey=t=>{const d=new Date(t);return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`;};
  const dayLabel=t=>{const k=dayKey(t);if(k===dayKey(now()))return '오늘';if(k===dayKey(now()-DAY))return '어제';return md(t);};
  const toLocalInput=t=>{const d=new Date(t);return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;};
  const seenKey=()=>`farewell-pet-family-seen:${fid||'local'}:${meId}`;
  const getSeen=()=>Number(localStorage.getItem(seenKey()))||0;
  const setSeen=t=>{try{localStorage.setItem(seenKey(),String(t));}catch{}};

  /* ───────── 시연(로컬) 저장소 ───────── */
  const DB={
    db:null,
    open(){if(this.db)return Promise.resolve(this.db);return new Promise((ok,no)=>{const r=indexedDB.open('fp-family',1);r.onupgradeneeded=()=>r.result.createObjectStore('media');r.onsuccess=()=>ok(this.db=r.result);r.onerror=()=>no(r.error);});},
    async put(k,v){const db=await this.open();return new Promise((ok,no)=>{const t=db.transaction('media','readwrite');t.objectStore('media').put(v,k);t.oncomplete=ok;t.onerror=()=>no(t.error);});},
    async get(k){const db=await this.open();return new Promise((ok,no)=>{const r=db.transaction('media').objectStore('media').get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});},
    async del(k){const db=await this.open();return new Promise(ok=>{const t=db.transaction('media','readwrite');t.objectStore('media').delete(k);t.oncomplete=ok;t.onerror=ok;});}
  };
  function seed(){
    const t=now();
    return {v:1,
      members:[
        {id:'m-me',name:'나',role:'owner',rel:'보호자',color:COLORS[0],joined:t-90*DAY},
        {id:'m-mom',name:'엄마',role:'family',rel:'엄마',color:COLORS[1],joined:t-60*DAY},
        {id:'m-sis',name:'동생',role:'co',rel:'주말 산책 담당',color:COLORS[2],joined:t-30*DAY},
        {id:'m-hotel',name:'해피독 호텔',role:'temp',facility:true,color:COLORS[4],from:t-20*HOUR,to:t+50*HOUR,perms:{today:true,profile:true,history:false},joined:t-20*HOUR},
        {id:'m-kinder',name:'초록 유치원',role:'temp',facility:true,color:COLORS[5],from:t-12*DAY,to:t-11*DAY,perms:{today:true,profile:true,history:false},joined:t-12*DAY}
      ],
      invites:[],
      posts:[
        {id:'s1',by:'m-hotel',kind:'photo',tag:'놀이',cap:'다른 친구들과 떨어져 혼자 공놀이 했어요. 단독 돌봄 중이에요.',at:t-40*60e3,sample:true},
        {id:'s2',by:'m-hotel',kind:'photo',tag:'약',cap:'저녁 처방식 다 먹고 약도 먹었어요.',at:t-5*HOUR,sample:true},
        {id:'s3',by:'m-mom',kind:'photo',src:'assets/chorong-now.jpg',tag:'산책',cap:'호텔 가기 전 아침 산책 30분. 컨디션 좋아요.',at:t-21*HOUR,sample:true},
        {id:'s4',by:'m-sis',kind:'photo',tag:'낮잠',cap:'소파에서 코 골며 자는 중',at:t-30*HOUR,sample:true},
        {id:'s5',by:'m-kinder',kind:'photo',tag:'놀이',cap:'유치원 첫날, 처음엔 구석에 있다가 오후엔 잘 놀았어요.',at:t-11.5*DAY,sample:true}
      ]};
  }
  const readLocal=()=>{try{return JSON.parse(localStorage.getItem(KEY));}catch{return null;}};
  const saveLocal=()=>{if(mode!=='local')return;try{localStorage.setItem(KEY,JSON.stringify({v:1,members:S.members,invites:S.invites,posts:S.posts}));}catch{toast('이 기기에 더 저장할 공간이 없어요.');}};
  const chan='BroadcastChannel' in window?new BroadcastChannel('fp-family'):null;

  const LocalAPI={
    async load(){
      const d=readLocal()||seed();
      S={members:d.members,invites:d.invites||[],posts:d.posts};saveLocal();
      meId=sessionStorage.getItem(ME_KEY)||'m-me';
      if(!localStorage.getItem(seenKey()))setSeen(now()-6*HOUR);
    },
    async publish({blob,kind,dur,tag,cap}){
      const id='p'+now().toString(36)+Math.random().toString(36).slice(2,5);
      await DB.put(id,blob);
      const p={id,by:meId,kind,mid:id,dur:dur||0,tag,cap,at:now()};
      S.posts.push(p);saveLocal();if(chan)chan.postMessage({t:'post',id});return p;
    },
    async invite(inv){inv.code=makeCode();inv.exp=now()+DAY;S.invites.push(inv);saveLocal();return inv;},
    async join(code,name){
      const inv=S.invites.find(i=>i.code===code&&i.exp>now());
      const m={id:'m'+now().toString(36),name,color:COLORS[S.members.length%COLORS.length],joined:now()};
      if(inv&&inv.role==='temp')Object.assign(m,{role:'temp',facility:true,from:inv.from,to:inv.to,perms:inv.perms});
      else Object.assign(m,{role:inv?inv.role:'family',rel:inv?inv.rel:''});
      S.members.push(m);S.invites=S.invites.filter(i=>i!==inv);saveLocal();
      meId=m.id;sessionStorage.setItem(ME_KEY,meId);if(chan)chan.postMessage({t:'member'});
    },
    async removeMember(id){S.members=S.members.filter(x=>x.id!==id);saveLocal();},
    async endNow(id){const m=member(id);m.to=now()-1000;saveLocal();},
    async deletePost(id){S.posts=S.posts.filter(p=>p.id!==id);saveLocal();DB.del(id).catch(()=>{});if(chan)chan.postMessage({t:'del'});},
    async leave(){}
  };

  /* ───────── Supabase 저장소 ───────── */
  const sb=window.FPChat&&FPChat.client;
  let user=null,rt=null;
  const signed=new Map();      // storage_path → {url, exp}
  const fromMember=r=>({id:r.user_id,name:r.display_name,role:r.role,rel:r.rel||'',color:r.color||COLORS[0],facility:r.is_facility,
    from:r.starts_at?Date.parse(r.starts_at):0,to:r.ends_at?Date.parse(r.ends_at):0,
    perms:{today:r.can_today,profile:r.can_profile,history:r.can_history},joined:Date.parse(r.joined_at)});
  const fromPost=r=>({id:r.id,by:r.author_id,kind:r.kind,path:r.storage_path,dur:Number(r.duration_sec)||0,tag:r.tag,cap:r.caption||'',at:Date.parse(r.created_at)});
  async function sign(paths){
    const need=paths.filter(p=>{const s=signed.get(p);return !s||s.exp<now()+5*60e3;});
    if(need.length){
      const {data,error}=await sb.storage.from('family-media').createSignedUrls(need,3600);
      if(!error&&data)data.forEach(d=>{if(d.signedUrl)signed.set(d.path,{url:d.signedUrl,exp:now()+3600e3});});
    }
  }
  const urlOf=p=>{const s=signed.get(p.path);return s?s.url:'';};
  const errMsg=(e,fallback)=>{const m=String(e&&e.message||'');
    if(/invalid_code/.test(m))return '쓸 수 없는 코드예요. 이미 쓰였거나 기간이 지났는지 확인해 주세요.';
    if(/already_member/.test(m))return '이미 이 가족 방에 있어요.';
    if(/name_required/.test(m))return '이름을 적어 주세요.';
    if(/family_|relation .* does not exist|PGRST205/.test(m))return '가족 방 기능이 아직 준비되지 않았어요.';
    return fallback;};

  const CloudAPI={
    async memberships(){
      const {data,error}=await sb.from('family_members').select('*, families(id,pet_name,owner_id)').eq('user_id',user.id).order('joined_at');
      if(error)throw error;
      return data||[];
    },
    async load(){
      fams=await this.memberships();
      if(!fams.length){mode='gate';return;}
      const want=localStorage.getItem(PICK_KEY);
      const live=fams.filter(f=>f.role!=='temp'||Date.parse(f.ends_at)>now());
      const pick=fams.find(f=>f.family_id===want)||live.find(f=>f.role==='owner')||live[0]||fams[0];
      fid=pick.family_id;meId=user.id;mode='cloud';
      petName=(pick.families&&pick.families.pet_name)||petName;
      const mine=fromMember(pick);
      if(ended(mine)){S={members:[mine],posts:[],invites:[]};snapshot=null;subscribe();return;}
      const [mem,posts,snap]=await Promise.all([
        sb.from('family_members').select('*').eq('family_id',fid).order('joined_at'),
        sb.from('family_posts').select('*').eq('family_id',fid).order('created_at',{ascending:false}).limit(80),
        sb.rpc('family_snapshot',{fid})
      ]);
      if(mem.error)throw mem.error;if(posts.error)throw posts.error;
      S={members:mem.data.map(fromMember),posts:posts.data.map(fromPost),invites:[]};
      snapshot=snap.error?null:snap.data;
      await sign(S.posts.map(p=>p.path));
      subscribe();
    },
    async create(name){
      const {error}=await sb.rpc('create_family',{p_pet_name:localPet.name||'우리 아이',p_display_name:name});
      if(error)throw error;
    },
    async publish({blob,kind,dur,tag,cap}){
      const ext=kind==='video'?(/mp4|quicktime/.test(blob.type)?(blob.type.includes('quicktime')?'mov':'mp4'):'webm'):(/png/.test(blob.type)?'png':/webp/.test(blob.type)?'webp':'jpg');
      const type=blob.type||(kind==='video'?'video/webm':'image/jpeg');
      const path=`${fid}/${crypto.randomUUID()}.${ext}`;
      const up=await sb.storage.from('family-media').upload(path,blob,{contentType:type.split(';')[0],upsert:false});
      if(up.error)throw up.error;
      const {data,error}=await sb.from('family_posts').insert({family_id:fid,kind,storage_path:path,duration_sec:kind==='video'?Math.round(Math.min(MAX_SEC,dur||0)*10)/10:null,tag,caption:cap||null}).select('*').single();
      if(error){await sb.storage.from('family-media').remove([path]);throw error;}
      const p=fromPost(data);
      signed.set(path,{url:URL.createObjectURL(blob),exp:now()+3600e3});
      if(!S.posts.some(x=>x.id===p.id))S.posts.unshift(p);
      return p;
    },
    async invite(inv){
      for(let i=0;i<4;i++){
        const code=makeCode();
        const row={code,family_id:fid,role:inv.role,rel:inv.rel||null};
        if(inv.role==='temp')Object.assign(row,{facility_name:inv.facility,starts_at:new Date(inv.from).toISOString(),ends_at:new Date(inv.to).toISOString(),can_today:inv.perms.today,can_profile:inv.perms.profile,can_history:inv.perms.history});
        const {data,error}=await sb.from('family_invites').insert(row).select('code,expires_at').single();
        if(!error){inv.code=data.code;inv.exp=Date.parse(data.expires_at);return inv;}
        if(error.code!=='23505')throw error;
      }
      throw new Error('code_collision');
    },
    async join(code,name){
      const {data,error}=await sb.rpc('redeem_family_invite',{p_code:code,p_display_name:name});
      if(error)throw error;
      localStorage.setItem(PICK_KEY,data);
      await this.load();
    },
    async removeMember(id){const {error}=await sb.from('family_members').delete().eq('family_id',fid).eq('user_id',id);if(error)throw error;S.members=S.members.filter(x=>x.id!==id);},
    async endNow(id){const t=new Date(now()-1000).toISOString();const {error}=await sb.from('family_members').update({ends_at:t}).eq('family_id',fid).eq('user_id',id);if(error)throw error;const m=member(id);if(m)m.to=now()-1000;},
    async deletePost(id){
      const p=S.posts.find(x=>x.id===id);if(!p)return;
      const {error}=await sb.from('family_posts').delete().eq('id',id);if(error)throw error;
      await sb.storage.from('family-media').remove([p.path]);
      S.posts=S.posts.filter(x=>x.id!==id);
    },
    async leave(){const {error}=await sb.from('family_members').delete().eq('family_id',fid).eq('user_id',user.id);if(error)throw error;localStorage.removeItem(PICK_KEY);}
  };
  function subscribe(){
    if(rt){sb.removeChannel(rt);rt=null;}
    if(!fid)return;
    rt=sb.channel('family:'+fid)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'family_posts',filter:`family_id=eq.${fid}`},async({new:r})=>{
        if(S.posts.some(p=>p.id===r.id))return;
        const p=fromPost(r);await sign([p.path]);S.posts.unshift(p);render();notify(p);
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'family_posts'},({old:r})=>{
        if(r&&S.posts.some(p=>p.id===r.id)){S.posts=S.posts.filter(p=>p.id!==r.id);render();}
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'family_members',filter:`family_id=eq.${fid}`},async()=>{
        const {data}=await sb.from('family_members').select('*').eq('family_id',fid).order('joined_at');
        if(data){S.members=data.map(fromMember);if(!member(meId)){toast('가족 방에서 나가졌어요.');boot();return;}render();}
      })
      .subscribe();
  }
  let API=LocalAPI;

  /* ───────── 화면 ───────── */
  function visiblePosts(){
    const m=me();
    let list=[...S.posts].sort((a,b)=>b.at-a.at);
    if(mode==='local'&&m.role==='temp'&&!(m.perms&&m.perms.history))list=list.filter(p=>p.by===m.id||(p.at>=m.from&&p.at<=m.to));
    return list;
  }
  const unseen=()=>{const t=getSeen();return visiblePosts().filter(p=>p.by!==meId&&p.at>t);};
  const av=(m,big)=>`<span class="av${big?' big':''}${m.role==='temp'?' temp':''}" style="--c:${m.color}">${m.facility?icon('building'):esc((m.name||'?').slice(0,1))}</span>`;
  const roleChip=m=>m.role==='temp'?`<span class="role temp">${icon('clock')}임시가족${ended(m)?' · 끝남':''}</span>`:`<span class="role">${ROLE[m.role]}</span>`;
  const petInfo=()=>{
    if(mode==='cloud')return snapshot&&snapshot.pet?{weight:snapshot.pet.weight,separation:snapshot.pet.separation,meds:snapshot.pet.medications||[]}:null;
    const p=localPet.name?localPet:demoPet;return {weight:p.weight,separation:p.separation,meds:(p.medications||[]).map(x=>x.name).filter(Boolean)};
  };
  function today(){
    if(mode==='cloud'){const t=snapshot&&snapshot.today;return t?{meal:t.meal||'',walk:Number(t.walk_min)||0,poop:Number(t.poop)||0}:null;}
    const st=FP.load(),k=dayKey(now()),logs=(st.daily||[]).filter(l=>l.date===k);
    const meal=logs.filter(l=>l.type==='meal').map(l=>l.time||'').sort().pop()||'';
    return {meal,walk:logs.filter(l=>l.type==='walk').reduce((a,l)=>a+(Number(l.min)||0),0),poop:logs.filter(l=>l.type==='poop'&&l.kind!=='소변').length};
  }

  function status(){
    const t=today()||{meal:'',walk:0,poop:0};
    const k=dayKey(now());
    const posts=S.posts.filter(p=>dayKey(p.at)===k);
    const lastTag=(...tags)=>posts.filter(p=>tags.includes(p.tag)).sort((a,b)=>b.at-a.at)[0];
    const mealPost=lastTag('밥','약'),walkPost=lastTag('산책');
    const latest=visiblePosts()[0];
    const by=p=>p&&member(p.by)?member(p.by).name:'';
    const cell=(ic,label,val,sub)=>`<div class="st"><span class="st-i">${icon(ic)}</span><span><small>${label}</small><b>${val}</b>${sub?`<em>${esc(sub)}</em>`:''}</span></div>`;
    const isOwner=me().role==='owner';
    return `<section class="fam-status" aria-labelledby="st-h">
      <div class="st-head"><h2 id="st-h">지금 ${esc(petCall())}는</h2>${latest?`<span>마지막 소식 ${ago(latest.at)} · ${esc(by(latest))}</span>`:''}</div>
      <div class="st-grid">
        ${cell('bowl','밥',t.meal||(mealPost?hm(mealPost.at):'아직'),t.meal?'하루 기록':mealPost?by(mealPost)+' 올림':'')}
        ${cell('walk','산책',t.walk?`${t.walk}분`:walkPost?hm(walkPost.at):'아직',t.walk?'하루 기록':walkPost?by(walkPost)+' 올림':'')}
        ${cell('poop','배변',t.poop?`${t.poop}번`:'아직',t.poop?'하루 기록':'')}
      </div>
      ${isOwner||mode==='local'?`<a class="st-link" href="services.html?go=diary">하루 기록 열기 ${icon('chev-right')}</a>`:'<p class="st-note">보호자가 남긴 하루 기록이에요.</p>'}
    </section>`;
  }
  function tempBanner(m){
    const p=petInfo();
    return `<section class="temp-banner">
      <div class="tb-top">${av(m,true)}<div><b>${esc(m.name)} · 임시가족</b><span>${md(m.from)} ${hm(m.from)} ~ ${md(m.to)} ${hm(m.to)}</span></div></div>
      <p>${esc(petCall())}를 맡아 주셔서 고마워요. 보호자 가족이 보는 화면에 그대로 올라가요. 기간이 끝나면 자동으로 나가지고, ${m.perms&&m.perms.history?'맡기기 전 기록도 볼 수 있어요':'맡기기 전 기록은 보이지 않아요'}.</p>
      ${m.perms&&m.perms.profile&&p?`<div class="tb-care"><span>${icon('pill')}${p.meds.length?esc(p.meds.join(', ')):'먹는 약 없음'}</span>${p.weight?`<span>${icon('paw')}${esc(p.weight)}kg</span>`:''}${p.separation?`<span>${icon('heart')}${esc(p.separation)}</span>`:''}</div>`:''}
    </section>`;
  }
  function topBar(){
    if(mode==='local')return `<aside class="demo">
        <label>${icon('user')}<span>시안 보기</span><select id="as">${S.members.map(x=>`<option value="${x.id}"${x.id===meId?' selected':''}>${esc(x.name)} · ${ROLE[x.role]}${ended(x)?'(끝남)':''}</option>`).join('')}</select><span>입장</span></label>
        <button type="button" class="link" id="sim">${icon('bell')} 다른 가족이 올렸을 때</button>
        <p class="demo-login">지금은 이 기기에서만 보이는 시연이에요. <button type="button" class="link" id="login">로그인</button>하면 실제 가족과 나눠요.</p>
      </aside>`;
    const live=fams.filter(f=>f.role!=='temp'||Date.parse(f.ends_at)>now());
    return live.length>1?`<aside class="demo cloud"><label>${icon('home')}<span>가족 방</span><select id="fam">${live.map(f=>`<option value="${f.family_id}"${f.family_id===fid?' selected':''}>${esc((f.families&&f.families.pet_name)||'가족 방')} · ${ROLE[f.role]}</option>`).join('')}</select></label></aside>`:'';
  }

  function render(){
    const m=me();
    const app=$('#family-app');
    if(mode==='gate'){$('#fab').hidden=true;app.innerHTML=gate();bindTop();badge();return;}
    if(ended(m)){
      app.innerHTML=`<section class="ended">${av(m,true)}<h1>임시가족 기간이 끝났어요</h1><p>${esc(m.name)}의 ${esc(petCall())} 돌봄은 ${md(m.to)} ${hm(m.to)}에 끝났어요. 이제 가족 방 글이 보이지 않아요. 올린 사진·영상은 가족 방에 남아요.</p>${mode==='cloud'?`<button type="button" class="btn btn-soft" id="leave">${icon('close')} 이 가족 방 목록에서 지우기</button>`:''}${topBar()}</section>`;
      $('#fab').hidden=true;bindTop();badge();return;
    }
    if(m.role==='temp'&&now()<m.from){
      app.innerHTML=`<section class="ended">${av(m,true)}<h1>${md(m.from)} ${hm(m.from)}부터 함께해요</h1><p>${esc(m.name)}의 임시가족 기간이 아직 시작되지 않았어요. 입실 시각이 되면 ${esc(petCall())}의 가족 방이 열려요.</p>${topBar()}</section>`;
      $('#fab').hidden=true;bindTop();badge();clearTimeout(render.openT);render.openT=setTimeout(boot,Math.min(m.from-now()+1500,2**31-1));return;
    }
    $('#fab').hidden=false;
    const ms=S.members.filter(x=>!ended(x));
    const past=S.members.filter(ended);
    const canInvite=m.role==='owner'||m.role==='family';
    const recent=id=>S.posts.some(p=>p.by===id&&now()-p.at<DAY);
    const posts=visiblePosts();
    const t=getSeen();
    let lastDay='';
    app.innerHTML=`
      <section class="room-head">
        <h1>${esc(petCall())}네 가족 방</h1>
        <p class="lead">누가 돌보고 있든, 지금 모습을 10초 영상이나 사진으로 바로 나눠요.</p>
      </section>
      <section class="members" aria-label="가족 구성원">
        <ul>
          ${ms.map(x=>`<li><button type="button" class="mem${recent(x.id)?' new':''}${x.id===meId?' me':''}" data-member="${x.id}">${av(x)}<b>${esc(x.id===meId&&x.name!=='나'?x.name+' (나)':x.name)}</b>${x.role==='temp'?`<small class="tmp">~${md(x.to)}</small>`:`<small>${ROLE[x.role]}</small>`}</button></li>`).join('')}
          ${canInvite?`<li><button type="button" class="mem add" id="invite"><span class="av plus">${icon('plus')}</span><b>초대하기</b><small>코드로</small></button></li>`:''}
        </ul>
        <div class="mem-foot">${past.length?`<button type="button" class="link" id="past">지난 임시가족 ${past.length}곳</button>`:'<span></span>'}<button type="button" class="link" id="join">${icon('ticket')} 초대 코드로 들어가기</button></div>
      </section>
      ${m.role==='temp'?tempBanner(m):''}
      ${m.role!=='temp'||(m.perms&&m.perms.today)?status():''}
      ${topBar()}
      <section class="feed" aria-label="가족이 올린 사진과 영상">
        ${posts.length?posts.map(p=>{
          const who=member(p.by)||{name:'나간 구성원',color:'#8A93A3',role:'family'};
          const d=dayLabel(p.at);const head=d!==lastDay?`<h2 class="day">${d}</h2>`:'';lastDay=d;
          const fresh=p.by!==meId&&p.at>t;
          const canDel=p.by===meId||(mode==='cloud'&&m.role==='owner');
          return `${head}<article class="post${fresh?' fresh':''}" id="post-${p.id}">
            <div class="media">${media(p)}<span class="tag">${esc(p.tag)}</span>${p.kind==='video'?`<span class="dur tnum">${icon('video')}0:${two(Math.round(p.dur||0))}</span><button type="button" class="vol" data-vol aria-label="소리 켜기">${icon('mute')}</button>`:''}${fresh?'<span class="fresh-dot">새 글</span>':''}</div>
            <div class="post-meta">${av(who)}<b>${esc(who.name)}</b>${who.role==='temp'?roleChip(who):''}<time datetime="${new Date(p.at).toISOString()}">${ago(p.at)}</time>${canDel?`<button type="button" class="icon-btn del" data-del="${p.id}" aria-label="이 글 지우기">${icon('trash')}</button>`:''}</div>
            ${p.cap?`<p class="cap">${esc(p.cap)}</p>`:''}
          </article>`;}).join(''):`<div class="empty-feed">${icon('camera')}<b>아직 올린 모습이 없어요</b><p>아래 버튼으로 10초 영상이나 사진을 남겨 보세요.</p></div>`}
      </section>
      ${mode==='cloud'&&m.role!=='owner'?`<p class="leave-row"><button type="button" class="link danger" id="leave">${icon('close')} 이 가족 방에서 나가기</button></p>`:''}`;
    hydrate();bindTop();badge();
    clearTimeout(render.seenT);render.seenT=setTimeout(()=>{setSeen(now());badge();},2500);
  }
  function gate(){
    return `<section class="gate">
      <span class="gate-ico">${icon('family')}</span>
      <h1>가족 방을 만들어 볼까요?</h1>
      <p>가족이나 함께 키우는 사람을 초대하면, 누가 돌보든 ${esc(petCall())}의 지금 모습이 모두에게 바로 보여요. 돌봄시설에 맡길 땐 시설을 임시가족으로 초대해요.</p>
      <form class="gate-form" id="gate-form"><label><span>가족 방에서 쓸 내 이름</span><input class="field" name="name" maxlength="20" placeholder="예: 예서" required></label>
      <button type="submit" class="btn btn-primary">${icon('home')} ${esc(petCall())}네 가족 방 만들기</button></form>
      <button type="button" class="btn btn-soft" id="join">${icon('ticket')} 초대 코드로 들어가기</button>
      ${localPet.name?'':'<p class="hint">아이를 먼저 등록하면 이름이 가족 방에 들어가요. <a href="profile.html">아이 등록하기</a></p>'}
    </section>`;
  }
  function media(p){
    const u=p.url||p.src||(mode==='cloud'?urlOf(p):'');
    if(u)return p.kind==='video'?`<video src="${esc(u)}" muted playsinline loop preload="metadata" aria-label="${esc(p.tag)} 영상"></video>`:`<img src="${esc(u)}" alt="${esc(p.tag)} 사진" loading="lazy">`;
    if(p.mid)return p.kind==='video'?`<video data-mid="${p.id}" muted playsinline loop preload="metadata" aria-label="${esc(p.tag)} 영상"></video>`:`<img data-mid="${p.id}" alt="${esc(p.tag)} 사진">`;
    const w=member(p.by);
    return `<div class="ph" style="--c:${w?w.color:'#1E56C2'}">${window.Minimi?Minimi.svg(Minimi.config(localPet.name?localPet:{})):icon('paw')}<small>${p.sample?'예시 사진 자리':'불러오지 못했어요'}</small></div>`;
  }
  const urls=new Map();
  const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{const v=e.target;if(e.isIntersecting)v.play().catch(()=>{});else v.pause();}),{threshold:.6}):null;
  async function hydrate(){
    for(const el of document.querySelectorAll('[data-mid]')){
      const id=el.dataset.mid;let u=urls.get(id);
      if(!u){try{const b=await DB.get(id);if(!b)continue;u=URL.createObjectURL(b);urls.set(id,u);}catch{continue;}}
      el.src=u;
    }
    document.querySelectorAll('.media video').forEach(v=>{
      if(v.dataset.bound)return;v.dataset.bound='1';
      v.addEventListener('timeupdate',()=>{if(v.currentTime>MAX_SEC)v.currentTime=0;});
      io?io.observe(v):v.play().catch(()=>{});
    });
  }
  function badge(){const n=mode==='gate'?0:unseen().length;const b=$('#new-count');b.hidden=!n;b.textContent=n;}

  function bindTop(){
    const as=$('#as');if(as)as.onchange=()=>{meId=as.value;sessionStorage.setItem(ME_KEY,meId);render();toast(`${me().name} 입장으로 바꿨어요.`);};
    const fam=$('#fam');if(fam)fam.onchange=()=>{localStorage.setItem(PICK_KEY,fam.value);boot();};
    const lg=$('#login');if(lg)lg.onclick=()=>window.FPAuth?FPAuth.open({onSuccess:()=>location.reload()}):location.assign('signup.html');
    const gf=$('#gate-form');if(gf)gf.onsubmit=async e=>{
      e.preventDefault();const b=gf.querySelector('button');b.disabled=true;
      try{await CloudAPI.create(gf.name.value.trim());await boot();toast('가족 방을 만들었어요. 가족을 초대해 보세요.');}
      catch(err){toast(errMsg(err,'가족 방을 만들지 못했어요. 잠시 뒤 다시 해 주세요.'));b.disabled=false;}
    };
    const lv=$('#leave');if(lv)lv.onclick=async()=>{if(!confirm('이 가족 방에서 나갈까요? 다시 들어오려면 새 초대 코드가 필요해요.'))return;try{await API.leave();toast('나갔어요.');boot();}catch(err){toast(errMsg(err,'나가지 못했어요.'));}};
    const sim=$('#sim');if(sim)sim.onclick=()=>{
      const others=S.members.filter(x=>x.id!==meId&&active(x));
      const who=others.find(x=>x.role==='temp')||others[0];if(!who){toast('함께하는 가족이 없어요.');return;}
      toast('3초 뒤 새 글이 올라와요. 다른 탭으로 가 있어도 알려 드려요.');
      setTimeout(()=>{
        const p={id:'p'+now().toString(36),by:who.id,kind:'photo',tag:who.role==='temp'?'밥':'산책',cap:who.role==='temp'?'점심 다 먹었어요. 물도 잘 마셔요.':'퇴근길에 잠깐 산책했어요.',at:now(),sample:true};
        S.posts.push(p);saveLocal();render();notify(p);
      },3000);
    };
  }

  /* 알림 */
  function notify(p){
    if(p.by===meId)return;
    const who=member(p.by);const name=who?who.name:'가족';
    const text=`${who&&who.role==='temp'?name+'(임시가족)이':ga(name)} ${petCall()} ${p.kind==='video'?'영상':'사진'}을 올렸어요 · ${p.tag}`;
    if(document.hidden&&'Notification' in window&&Notification.permission==='granted'){
      try{const n=new Notification('farewell pet 가족 방',{body:text+(p.cap?`\n${p.cap}`:''),icon:'favicon.svg',tag:p.id});n.onclick=()=>{window.focus();jump(p.id);n.close();};}catch{}
    }
    banner(text,p.id);badge();
  }
  function banner(text,id){
    let b=$('#live-banner');
    if(!b){b=document.createElement('button');b.type='button';b.id='live-banner';b.className='live-banner';b.setAttribute('role','status');document.body.append(b);}
    b.innerHTML=`${icon('bell')}<span>${esc(text)}</span>${icon('chev-right')}`;
    b.onclick=()=>{jump(id);b.classList.remove('show');};
    b.classList.add('show');clearTimeout(banner.t);banner.t=setTimeout(()=>b.classList.remove('show'),6000);
  }
  function jump(id){const el=document.getElementById('post-'+id);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600);}}
  if(chan)chan.onmessage=e=>{
    if(mode!=='local')return;
    const d=readLocal();if(d)S={members:d.members,invites:d.invites||[],posts:d.posts};render();
    if(e.data&&e.data.t==='post'){const p=S.posts.find(x=>x.id===e.data.id);if(p){const m=me();if(!(m.role==='temp'&&!(p.at>=m.from&&p.at<=m.to)))notify(p);}}
  };
  function bellState(){
    const b=$('#bell');const on='Notification' in window&&Notification.permission==='granted';
    b.classList.toggle('on',on);b.setAttribute('aria-label',on?'새 글 알림 켜짐':'새 글 알림 켜기');
  }
  $('#bell').onclick=async()=>{
    if(!('Notification' in window)){toast('이 브라우저는 알림을 지원하지 않아요. 앱 안에서는 계속 알려 드려요.');return;}
    if(Notification.permission==='granted'){toast('알림이 켜져 있어요. 끄려면 브라우저 사이트 설정에서 바꿔 주세요.');return;}
    const r=await Notification.requestPermission();bellState();
    toast(r==='granted'?'가족이 올리면 바로 알려 드릴게요.':'알림을 허용하지 않았어요. 앱 안 알림은 계속 보여 드려요.');
  };
  bellState();

  /* 올리기 */
  async function publish(x){
    try{
      const p=await API.publish(x);
      render();toast('가족에게 올렸어요. 모두에게 알림이 가요.');setTimeout(()=>jump(p.id),200);return true;
    }catch(err){console.error(err);toast(errMsg(err,mode==='cloud'?'올리지 못했어요. 연결을 확인하고 다시 해 주세요.':'이 기기에 저장하지 못했어요.'));return false;}
  }

  /* 카메라 */
  const cam=$('#cam');
  let stream=null,rec=null,chunks=[],camMode='video',facing='environment',timer=null,started=0;
  const RING=2*Math.PI*36;
  function stopStream(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}
  async function startStream(){
    stopStream();
    const v={facingMode:facing,width:{ideal:1080},height:{ideal:1440}};
    try{stream=await navigator.mediaDevices.getUserMedia({video:v,audio:true});}
    catch{stream=await navigator.mediaDevices.getUserMedia({video:v,audio:false});}
    const el=$('#cam-v');el.srcObject=stream;el.classList.toggle('mirror',facing==='user');
  }
  function camUI(){
    const m=me();
    cam.innerHTML=`<div class="cam-stage"><video id="cam-v" autoplay playsinline muted></video><div class="cam-time tnum" id="cam-time" hidden>0.0초 / ${MAX_SEC}초</div></div>
      <div class="cam-top"><button type="button" class="cam-btn" data-x aria-label="닫기">${icon('close')}</button><span class="cam-who">${av(m)}${esc(m.name)}${m.role==='temp'?' · 임시가족':''}로 올려요</span><button type="button" class="cam-btn" id="cam-flip" aria-label="카메라 전환">${icon('flip')}</button></div>
      <div class="cam-bottom">
        <div class="modes" role="radiogroup" aria-label="찍는 방식"><button type="button" role="radio" data-mode="photo" aria-checked="${camMode==='photo'}">사진</button><button type="button" role="radio" data-mode="video" aria-checked="${camMode==='video'}">${MAX_SEC}초 영상</button></div>
        <div class="cam-row"><button type="button" class="cam-btn" id="cam-pick" aria-label="앨범에서 고르기">${icon('grid')}</button>
        <button type="button" class="shoot ${camMode}" id="shoot" aria-label="${camMode==='video'?'녹화 시작':'사진 찍기'}"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="36" class="track"/><circle cx="40" cy="40" r="36" class="prog" id="prog" style="stroke-dasharray:${RING};stroke-dashoffset:${RING}"/></svg><span class="core"></span></button>
        <span class="cam-btn ghost" aria-hidden="true"></span></div>
      </div>`;
  }
  async function openCam(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$('#pick').click();return;}
    camUI();cam.showModal();
    try{await startStream();}
    catch{cam.close();toast('카메라를 쓸 수 없어 기기 카메라·앨범으로 열어요.');$('#pick').click();}
  }
  function closeCam(){clearInterval(timer);timer=null;if(rec&&rec.state==='recording'){rec.onstop=null;rec.stop();}rec=null;stopStream();cam.classList.remove('recording');if(cam.open)cam.close();}
  cam.addEventListener('close',()=>{clearInterval(timer);stopStream();});
  cam.addEventListener('click',async e=>{
    const recording=rec&&rec.state==='recording';
    if(e.target.closest('[data-x]')){closeCam();return;}
    const md_=e.target.closest('[data-mode]');if(md_&&!recording){camMode=md_.dataset.mode;const keep=stream;camUI();$('#cam-v').srcObject=keep;$('#cam-v').classList.toggle('mirror',facing==='user');return;}
    if(e.target.closest('#cam-flip')&&!recording){facing=facing==='user'?'environment':'user';try{await startStream();}catch{toast('카메라를 바꾸지 못했어요.');}return;}
    if(e.target.closest('#cam-pick')){closeCam();$('#pick').click();return;}
    if(e.target.closest('#shoot')){camMode==='photo'?snap():(recording?rec.stop():record());return;}
    if(e.target.closest('#rv-retake')){camUI();try{await startStream();}catch{closeCam();}return;}
    const tg=e.target.closest('[data-tag]');if(tg)cam.querySelectorAll('[data-tag]').forEach(b=>b.setAttribute('aria-pressed',b===tg));
  });
  function snap(){
    const v=$('#cam-v');if(!v.videoWidth)return;
    const s=Math.min(1,1080/Math.max(v.videoWidth,v.videoHeight));
    const c=document.createElement('canvas');c.width=Math.round(v.videoWidth*s);c.height=Math.round(v.videoHeight*s);
    const g=c.getContext('2d');if(facing==='user'){g.translate(c.width,0);g.scale(-1,1);}g.drawImage(v,0,0,c.width,c.height);
    c.toBlob(b=>{stopStream();review({blob:b,kind:'photo'});},'image/jpeg',.86);
  }
  function pickType(){const ts=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm'];return ts.find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';}
  function record(){
    if(!window.MediaRecorder){toast('이 브라우저는 영상 녹화를 지원하지 않아요. 사진으로 남겨 주세요.');return;}
    const type=pickType();chunks=[];
    try{rec=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:2.5e6}:undefined);}catch{toast('녹화를 시작하지 못했어요.');return;}
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
    rec.onstop=()=>{clearInterval(timer);timer=null;const dur=Math.min(MAX_SEC,(now()-started)/1e3);const blob=new Blob(chunks,{type:(rec.mimeType||type||'video/webm')});stopStream();if(dur<.6){toast('너무 짧아요. 다시 찍어 주세요.');cam.classList.remove('recording');camUI();startStream().catch(closeCam);return;}review({blob,kind:'video',dur});};
    rec.start(250);started=now();
    const sh=$('#shoot'),prog=$('#prog'),tm=$('#cam-time');
    sh.classList.add('rec');sh.setAttribute('aria-label','녹화 멈추기');tm.hidden=false;cam.classList.add('recording');
    timer=setInterval(()=>{const s=(now()-started)/1e3;prog.style.strokeDashoffset=RING*(1-Math.min(1,s/MAX_SEC));tm.textContent=`${Math.min(s,MAX_SEC).toFixed(1)}초 / ${MAX_SEC}초`;if(s>=MAX_SEC&&rec.state==='recording')rec.stop();},100);
  }
  function review({blob,kind,dur}){
    cam.classList.remove('recording');
    const u=URL.createObjectURL(blob);
    const m=me();
    const def=m.role==='temp'?'밥':'산책';
    cam.innerHTML=`<div class="rv">
      <div class="rv-media">${kind==='video'?`<video src="${u}" autoplay loop playsinline controls></video>`:`<img src="${u}" alt="찍은 사진 미리보기">`}</div>
      <div class="rv-panel">
        <div class="rv-top"><button type="button" class="cam-btn dark" data-x aria-label="닫기">${icon('close')}</button><b>가족에게 올리기</b><span class="tnum">${kind==='video'?`0:${two(Math.round(dur))}`:'사진'}</span></div>
        <p class="rv-q">무엇을 하고 있나요?</p>
        <div class="rv-tags">${TAGS.map(t=>`<button type="button" class="chip" data-tag="${t}" aria-pressed="${t===def}">${t}</button>`).join('')}</div>
        <label class="rv-cap"><span class="sr-only">한 줄 남기기</span><input id="rv-cap" maxlength="60" placeholder="한 줄 남기기 (선택)" autocomplete="off"></label>
        <div class="rv-actions"><button type="button" class="btn btn-soft" id="rv-retake">${icon('refresh')} 다시</button><button type="button" class="btn btn-primary" id="rv-send">${icon('share')} 올리기</button></div>
        <p class="rv-note">${icon('lock')} 이 가족 방 사람${m.role==='temp'?'(보호자 가족)':''}만 볼 수 있어요.</p>
      </div></div>`;
    if(!cam.open)cam.showModal();
    $('#rv-send').onclick=async()=>{
      const tag=(cam.querySelector('[data-tag][aria-pressed=true]')||{}).dataset?.tag||'기타';
      const b=$('#rv-send');b.disabled=true;b.textContent='올리는 중…';
      const ok=await publish({blob,kind,dur,tag,cap:$('#rv-cap').value.trim()});
      URL.revokeObjectURL(u);if(ok)closeCam();else{b.disabled=false;b.innerHTML=`${icon('share')} 다시 올리기`;}
    };
  }
  $('#pick').addEventListener('change',e=>{
    const f=e.target.files[0];e.target.value='';if(!f)return;
    if(f.size>50*1024*1024){toast('50MB 이하 파일만 올릴 수 있어요.');return;}
    if(f.type.startsWith('video/')){
      const v=document.createElement('video');v.preload='metadata';v.src=URL.createObjectURL(f);
      v.onloadedmetadata=()=>{const d=v.duration;URL.revokeObjectURL(v.src);if(d>MAX_SEC+.5)toast(`${MAX_SEC}초가 넘는 영상은 앞 ${MAX_SEC}초만 보여요.`);review({blob:f,kind:'video',dur:Math.min(MAX_SEC,d||MAX_SEC)});};
      v.onerror=()=>review({blob:f,kind:'video',dur:MAX_SEC});
    }else review({blob:f,kind:'photo'});
  });
  $('#fab').onclick=openCam;

  /* 시트 */
  const sheet=$('#sheet');
  function openSheet(title,body,foot){$('#sheet-title').textContent=title;$('#sheet-form').innerHTML=body;$('#sheet-foot').innerHTML=foot||'';$('#sheet-foot').hidden=!foot;if(!sheet.open)sheet.showModal();}
  sheet.addEventListener('click',e=>{if(e.target===sheet||e.target.closest('[data-close]'))sheet.close();});
  $('#sheet-form').addEventListener('submit',e=>e.preventDefault());

  const ALPHA='ACDEFGHJKLMNPQRTUVWXY3479';
  function makeCode(){let c='';const a=new Uint32Array(6);crypto.getRandomValues(a);a.forEach(n=>c+=ALPHA[n%ALPHA.length]);return c.slice(0,3)+'-'+c.slice(3);}
  const normCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^(.{3})(.{1,3}).*$/,'$1-$2');

  function inviteSheet(){
    const s=new Date();s.setSeconds(0,0);
    const e=new Date(s.getTime()+2*DAY);e.setHours(18);
    const isOwner=me().role==='owner';
    openSheet('가족 초대하기',`
      <div class="group"><h3>누구를 초대하나요?</h3>
        <div class="chips role-pick">
          <label class="chip"><input type="radio" name="role" value="family" checked>${icon('home')}가족</label>
          <label class="chip"><input type="radio" name="role" value="co">${icon('family')}함께 키우는 사람</label>
          ${isOwner||mode==='local'?`<label class="chip"><input type="radio" name="role" value="temp">${icon('building')}임시가족 (돌봄시설)</label>`:''}
        </div>
        <p class="hint" id="role-hint"></p>
      </div>
      <div class="group" id="g-rel"><h3>부르는 이름 <small>선택</small></h3><input class="field" name="rel" maxlength="12" placeholder="예: 엄마, 할머니, 주말 산책 담당"></div>
      <div id="g-temp" hidden>
        <div class="group"><h3>시설 이름</h3><input class="field" name="facility" maxlength="20" placeholder="예: 해피독 호텔"></div>
        <div class="group"><h3>맡기는 기간 <small>끝나면 자동으로 나가져요</small></h3>
          <div class="period"><label>입실<input class="field" type="datetime-local" name="from" value="${toLocalInput(s)}"></label><label>퇴실<input class="field" type="datetime-local" name="to" value="${toLocalInput(e)}"></label></div></div>
        <div class="group"><h3>시설에 보여 줄 것</h3>
          <label class="perm"><input type="checkbox" checked disabled><span><b>사진·영상 올리기</b><small>가족이 보는 화면에 그대로 올라가요</small></span></label>
          <label class="perm"><input type="checkbox" name="p-today" checked><span><b>오늘 밥·산책·배변</b><small>집에서 남긴 오늘 기록</small></span></label>
          <label class="perm"><input type="checkbox" name="p-profile" checked><span><b>돌봄 정보</b><small>먹는 약, 몸무게, 성격</small></span></label>
          <label class="perm"><input type="checkbox" name="p-history"><span><b>맡기기 전 영상·사진</b><small>꺼 두면 맡긴 기간 글만 보여요</small></span></label>
        </div>
      </div>`,
      `<button type="button" class="btn btn-primary" id="mk">${icon('ticket')} 초대 코드 만들기</button>`);
    const f=$('#sheet-form');
    const hint={family:'가족은 모든 사진·영상과 하루 기록을 보고, 다른 가족도 초대할 수 있어요.',co:'함께 키우는 사람도 가족과 똑같이 보고 올려요. 가족을 초대하지는 못해요.',temp:'돌봄시설이 맡은 기간에만 들어와 가족 화면에 올려요. 기간이 끝나면 자동으로 나가져요.'};
    const sync=()=>{const r=f.role.value;$('#g-temp').hidden=r!=='temp';$('#g-rel').hidden=r==='temp';$('#role-hint').textContent=hint[r];};
    f.querySelectorAll('[name=role]').forEach(r=>r.onchange=sync);sync();
    $('#mk').onclick=async()=>{
      const r=f.role.value;const inv={role:r};
      if(r==='temp'){
        const from=new Date(f.from.value).getTime(),to=new Date(f.to.value).getTime();
        if(!f.facility.value.trim()){toast('시설 이름을 적어 주세요.');f.facility.focus();return;}
        if(!(to>from)){toast('퇴실이 입실보다 뒤여야 해요.');return;}
        if(to<now()){toast('이미 지난 기간이에요.');return;}
        Object.assign(inv,{facility:f.facility.value.trim(),from,to,perms:{today:f['p-today'].checked,profile:f['p-profile'].checked,history:f['p-history'].checked}});
      }else inv.rel=f.rel.value.trim();
      const b=$('#mk');b.disabled=true;
      try{codeSheet(await API.invite(inv));}
      catch(err){console.error(err);toast(errMsg(err,'초대 코드를 만들지 못했어요. 다시 해 주세요.'));b.disabled=false;}
    };
  }
  function codeSheet(inv){
    const link=`${location.origin}${location.pathname}?invite=${inv.code}`;
    const who=inv.role==='temp'?`${inv.facility} (임시가족 · ${md(inv.from)} ~ ${md(inv.to)})`:(inv.rel||ROLE[inv.role]);
    openSheet('초대 코드',`
      <div class="code-card"><small>${esc(who)}</small><b class="code tnum">${inv.code}</b><span>${md(inv.exp)} ${hm(inv.exp)}까지 한 번 쓸 수 있어요</span></div>
      <ol class="steps"><li>코드나 링크를 보내요.</li><li>받은 사람이 farewell pet에 로그인하고 <b>초대 코드로 들어가기</b>를 눌러 입력해요.</li><li>들어오면 ${esc(petCall())}의 하루와 사진·영상이 바로 보여요.</li></ol>
      ${inv.role==='temp'?`<p class="hint">${icon('clock')} ${md(inv.to)} ${hm(inv.to)}가 지나면 자동으로 나가지고, 이후 글은 보이지 않아요.</p>`:''}`,
      `<button type="button" class="btn btn-soft" id="cp">${icon('copy')} 코드 복사</button><button type="button" class="btn btn-primary" id="sh">${icon('share')} 링크 보내기</button>`);
    $('#cp').onclick=()=>navigator.clipboard?.writeText(inv.code).then(()=>toast('코드를 복사했어요.'),()=>toast(inv.code));
    $('#sh').onclick=async()=>{
      const text=`${petCall()}네 가족 방에 초대해요. 초대 코드: ${inv.code}`;
      if(navigator.share){try{await navigator.share({title:'farewell pet 가족 방 초대',text,url:link});}catch{}}
      else navigator.clipboard?.writeText(`${text}\n${link}`).then(()=>toast('초대 문구와 링크를 복사했어요.'));
    };
  }
  function joinSheet(code=''){
    if(mode==='local'&&sb){
      openSheet('초대 코드로 들어가기',`<p class="hint">${icon('lock')} 실제 가족 방에 들어가려면 먼저 로그인해 주세요. 로그인하면 이 코드를 그대로 이어서 넣어 드려요.</p>${code?`<div class="code-card"><b class="code tnum">${esc(normCode(code))}</b></div>`:''}`,
        `<button type="button" class="btn btn-soft" id="demo-join">시연으로 들어가기</button><button type="button" class="btn btn-primary" id="go-login">${icon('user')} 로그인</button>`);
      $('#go-login').onclick=()=>{if(code)sessionStorage.setItem('farewell-pet-family-invite',code);sheet.close();window.FPAuth?FPAuth.open({onSuccess:()=>location.reload()}):location.assign('signup.html');};
      $('#demo-join').onclick=()=>joinForm(code);
      return;
    }
    joinForm(code);
  }
  function joinForm(code){
    openSheet('초대 코드로 들어가기',`
      <div class="group"><h3>초대 코드</h3><input class="field code-in tnum" name="code" value="${esc(normCode(code))}" maxlength="7" placeholder="ABC-123" autocomplete="off" autocapitalize="characters"></div>
      <div class="group"><h3>가족 방에서 쓸 이름</h3><input class="field" name="name" maxlength="20" placeholder="예: 아빠, 해피독 호텔"></div>
      <p class="hint" id="join-hint"></p>`,
      `<button type="button" class="btn btn-primary" id="go">${icon('arrow-right')} 들어가기</button>`);
    const f=$('#sheet-form');
    const look=()=>{
      if(mode!=='local')return;
      const c=normCode(f.code.value);const inv=S.invites.find(i=>i.code===c&&i.exp>now());const h=$('#join-hint');
      if(!inv){h.textContent=c.length===7?'이 기기 시연에서 만든 코드가 아니에요. 시연으로는 그대로 들어갈 수 있어요.':'';return;}
      if(inv.role==='temp'){f.name.value=f.name.value||inv.facility;h.textContent=`${inv.facility} · 임시가족으로 들어가요. ${md(inv.to)} ${hm(inv.to)}에 자동으로 나가져요.`;}
      else h.textContent=`${ROLE[inv.role]}${inv.rel?` (${inv.rel})`:''}으로 들어가요.`;
    };
    f.code.oninput=()=>{f.code.value=normCode(f.code.value);look();};look();
    $('#go').onclick=async()=>{
      const c=normCode(f.code.value);if(c.length!==7){toast('코드 6자리를 넣어 주세요.');f.code.focus();return;}
      const name=f.name.value.trim();if(!name){toast('이름을 적어 주세요.');f.name.focus();return;}
      const b=$('#go');b.disabled=true;
      try{
        if(mode==='gate')API=CloudAPI;
        await API.join(c,name);
        sheet.close();history.replaceState(null,'',location.pathname);render();
        toast(`${petCall()}네 가족 방에 들어왔어요.`);
      }catch(err){toast(errMsg(err,'들어가지 못했어요. 코드를 다시 확인해 주세요.'));b.disabled=false;}
    };
  }
  function memberSheet(id){
    const m=member(id);if(!m)return;
    const owner=me().role==='owner';
    const n=S.posts.filter(p=>p.by===id).length;
    openSheet(m.name,`
      <div class="mem-card">${av(m,true)}<div><b>${esc(m.name)}</b>${roleChip(m)}${m.rel?`<small>${esc(m.rel)}</small>`:''}</div></div>
      <ul class="mem-facts">
        ${m.role==='temp'?`<li>${icon('clock')}<span>${md(m.from)} ${hm(m.from)} ~ ${md(m.to)} ${hm(m.to)}${ended(m)?' · 끝남':active(m)?' · 돌보는 중':' · 시작 전'}</span></li>
        <li>${icon('lock')}<span>${['오늘 기록','돌봄 정보','맡기기 전 글'].filter((_,i)=>m.perms&&[m.perms.today,m.perms.profile,m.perms.history][i]).join(', ')||'사진·영상 올리기만'}${m.perms&&(m.perms.today||m.perms.profile||m.perms.history)?' 볼 수 있어요':''}</span></li>`:`<li>${icon('calendar')}<span>${md(m.joined)}부터 함께해요</span></li>`}
        <li>${icon('camera')}<span>올린 사진·영상 ${n}개</span></li>
      </ul>`,
      owner&&id!==meId&&m.role!=='owner'?`<button type="button" class="btn btn-ghost danger" id="kick">${icon('close')} 내보내기</button>${m.role==='temp'&&!ended(m)?`<button type="button" class="btn btn-soft" id="endnow">${icon('check')} 지금 돌봄 끝내기</button>`:''}`:'');
    const k=$('#kick');if(k)k.onclick=async()=>{if(!confirm(`${m.name}을(를) 내보낼까요? 올린 글은 남아요.`))return;try{await API.removeMember(id);sheet.close();render();toast('내보냈어요.');}catch(err){toast(errMsg(err,'내보내지 못했어요.'));}};
    const en=$('#endnow');if(en)en.onclick=async()=>{try{await API.endNow(id);sheet.close();render();toast(`${m.name} 임시가족 기간을 끝냈어요.`);}catch(err){toast(errMsg(err,'끝내지 못했어요.'));}};
  }
  function pastSheet(){
    const past=S.members.filter(ended);
    openSheet('지난 임시가족',`<ul class="past">${past.map(m=>`<li><button type="button" data-member="${m.id}">${av(m)}<span><b>${esc(m.name)}</b><small>${md(m.from)} ~ ${md(m.to)} · 올린 글 ${S.posts.filter(p=>p.by===m.id).length}개</small></span>${icon('chev-right')}</button></li>`).join('')}</ul><p class="hint">맡겼던 기간에 시설이 올린 사진·영상은 가족 방에 그대로 남아요.</p>`);
  }

  document.addEventListener('click',async e=>{
    const t=e.target;
    if(t.closest('#invite'))inviteSheet();
    else if(t.closest('#join'))joinSheet();
    else if(t.closest('#past'))pastSheet();
    else if(t.closest('[data-member]'))memberSheet(t.closest('[data-member]').dataset.member);
    else if(t.closest('[data-del]')){const id=t.closest('[data-del]').dataset.del;if(!confirm('이 글을 지울까요? 가족 모두에게서 사라져요.'))return;try{await API.deletePost(id);render();}catch(err){toast(errMsg(err,'지우지 못했어요.'));}}
    else if(t.closest('[data-vol]')){const b=t.closest('[data-vol]');const v=b.parentNode.querySelector('video');if(!v)return;v.muted=!v.muted;b.innerHTML=icon(v.muted?'mute':'volume');b.setAttribute('aria-label',v.muted?'소리 켜기':'소리 끄기');if(!v.muted)v.play().catch(()=>{});}
  });

  /* 임시가족 기간이 끝나는 순간 화면을 바꾸고, 서명 URL이 만료되기 전에 다시 받는다 */
  setInterval(async()=>{
    const m=me();if(m.role==='temp'&&ended(m)&&!document.querySelector('.ended'))render();
    if(mode==='cloud'){const before=S.posts.map(urlOf).join();await sign(S.posts.map(p=>p.path));if(S.posts.map(urlOf).join()!==before)render();}
  },60e3);

  async function boot(){
    $('#family-app').innerHTML='<p class="loading">가족 방을 불러오는 중…</p>';
    try{user=sb?await FPChat.currentUser():null;}catch{user=null;}
    try{
      if(user){
        API=CloudAPI;
        if(!localPet.name){try{const r=await FPChat.loadPetProfile(null);if(r&&r.pet)Object.assign(localPet,r.pet);}catch{}}
        petName=localPet.name||'우리 아이';
        await CloudAPI.load();
      }
      else{mode='local';API=LocalAPI;await LocalAPI.load();}
    }catch(err){
      console.error(err);
      toast(errMsg(err,'가족 방을 불러오지 못해 시연 화면으로 보여 드려요.'));
      mode='local';API=LocalAPI;await LocalAPI.load();
    }
    render();
    const inv=new URLSearchParams(location.search).get('invite')||sessionStorage.getItem('farewell-pet-family-invite');
    if(inv){sessionStorage.removeItem('farewell-pet-family-invite');if(mode!=='cloud'||!S.members.length)joinSheet(inv);else joinForm(inv);}
  }
  boot();
})();
