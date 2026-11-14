/* 카카오맵: 지도 표시와 길찾기 링크. 아래 키는 등록한 도메인에서만 동작하는 공개용 JavaScript 키다. */
(function(){
  const APP_KEY='77dc2b5a82fe7ad1b2f9f86dfce6b10a';
  const GEO_KEY='farewell-pet-geo-v1';
  let sdk=null,cache={};
  try{cache=JSON.parse(localStorage.getItem(GEO_KEY))||{};}catch{}

  function ready(){
    if(sdk)return sdk;
    sdk=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('timeout')),8000);
      const s=document.createElement('script');
      s.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${APP_KEY}&libraries=services&autoload=false`;
      s.onload=()=>{if(!window.kakao||!kakao.maps){clearTimeout(timer);reject(new Error('sdk'));return;}kakao.maps.load(()=>{clearTimeout(timer);resolve(kakao.maps);});};
      s.onerror=()=>{clearTimeout(timer);reject(new Error('load'));};
      document.head.append(s);
    }).catch(e=>{sdk=null;throw e;});
    return sdk;
  }

  /* '시 길 10, 건물 3층 (동)'에서 도로명 주소까지만 남긴다 */
  const roadAddress=a=>String(a||'').split(',')[0].replace(/\s*\(.*$/,'').trim();
  function addressSearch(maps,q){
    return new Promise(res=>new maps.services.Geocoder().addressSearch(q,(r,st)=>res(st===maps.services.Status.OK&&r[0]?{lat:+r[0].y,lng:+r[0].x}:null)));
  }
  function keywordSearch(maps,q){
    return new Promise(res=>new maps.services.Places().keywordSearch(q,(r,st)=>res(st===maps.services.Status.OK&&r[0]?{lat:+r[0].y,lng:+r[0].x}:null)));
  }
  async function locate(place){
    if(place.lat&&place.lng)return {lat:place.lat,lng:place.lng};
    const key=place.id+'|'+place.address;
    if(cache[key])return cache[key];
    const maps=await ready();
    const pos=await addressSearch(maps,roadAddress(place.address))||await keywordSearch(maps,`${place.region||''} ${place.name}`.trim());
    if(pos){cache[key]=pos;try{localStorage.setItem(GEO_KEY,JSON.stringify(cache));}catch{}}
    return pos;
  }

  const routeUrl=(place,pos=place.lat&&place.lng?{lat:place.lat,lng:place.lng}:null)=>pos?`https://map.kakao.com/link/to/${encodeURIComponent(place.name.replace(/,/g,' '))},${pos.lat},${pos.lng}`:`https://map.kakao.com/?q=${encodeURIComponent(roadAddress(place.address)||place.name)}`;

  /* 상세 화면용: 한 곳 */
  async function showOne(el,place,onPos){
    try{
      const maps=await ready();
      const pos=await locate(place);
      if(!el.isConnected)return;
      if(!pos){el.classList.add('failed');el.textContent='이 주소의 위치를 지도에서 찾지 못했어요.';return;}
      const center=new maps.LatLng(pos.lat,pos.lng);
      el.textContent='';el.style.display='block';
      const map=new maps.Map(el,{center,level:4});
      new maps.Marker({map,position:center,title:place.name});
      map.addControl(new maps.ZoomControl(),maps.ControlPosition.RIGHT);
      onPos&&onPos(pos);
    }catch{
      if(el.isConnected){el.classList.add('failed');el.textContent='지도를 불러오지 못했어요. 아래 길찾기 링크는 그대로 쓸 수 있어요.';}
    }
  }

  /* 검색 결과용: 여러 곳 */
  async function showMany(el,places,onSelect){
    try{
      const maps=await ready();
      const found=(await Promise.all(places.map(async p=>[p,await locate(p).catch(()=>null)]))).filter(([,pos])=>pos);
      if(!el.isConnected)return {shown:0,missing:places.length};
      if(!found.length){el.classList.add('failed');el.textContent='지도에 표시할 수 있는 곳이 없어요.';return {shown:0,missing:places.length};}
      el.textContent='';el.style.display='block';
      const map=new maps.Map(el,{center:new maps.LatLng(found[0][1].lat,found[0][1].lng),level:6});
      map.addControl(new maps.ZoomControl(),maps.ControlPosition.RIGHT);
      const bounds=new maps.LatLngBounds();
      let open=null;
      found.forEach(([p,pos])=>{
        const position=new maps.LatLng(pos.lat,pos.lng);
        bounds.extend(position);
        const marker=new maps.Marker({map,position,title:p.name,clickable:true});
        const card=document.createElement('button');
        card.type='button';card.className='kmap-card';
        const name=document.createElement('b');name.textContent=p.name;
        const more=document.createElement('span');more.textContent='자세히 보기';
        card.append(name,more);
        card.addEventListener('click',()=>onSelect(p.id));
        const overlay=new maps.CustomOverlay({position,content:card,yAnchor:1.75,clickable:true,zIndex:3});
        maps.event.addListener(marker,'click',()=>{if(open)open.setMap(null);overlay.setMap(map);open=overlay;});
      });
      if(found.length>1)map.setBounds(bounds);
      return {shown:found.length,missing:places.length-found.length};
    }catch{
      if(el.isConnected){el.classList.add('failed');el.textContent='지도를 불러오지 못했어요. 목록으로 확인해 주세요.';}
      return {shown:0,missing:places.length};
    }
  }

  window.KMap={showOne,showMany,routeUrl,roadAddress};
})();
