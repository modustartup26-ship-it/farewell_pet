const CACHE='farewell-pet-v2';
const CORE=[
  '/','/index.html','/theme.css','/intro.css','/ai-chat.css','/auth.css',
  '/common.js','/supabase-client.js','/auth-ui.js','/minimi.js','/trailmap.js',
  '/intro.js','/ai-chat.js','/manifest.webmanifest','/favicon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('farewell-pet-')&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok){
        const cache=await caches.open(CACHE);
        await cache.put(request,response.clone());
      }
      return response;
    }catch(error){
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==='navigate'&&url.pathname==='/'){
        const home=await caches.match('/index.html');
        if(home)return home;
      }
      return new Response('오프라인 상태예요. 연결을 확인한 뒤 다시 시도해 주세요.',{
        status:503,
        headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}
      });
    }
  })());
});
