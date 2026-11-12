/* Supabase 연결과 문의 전송. 아래 키는 브라우저 공개용(anon)이고, 데이터 보호는 RLS가 맡는다. */
(function(){
  const URL_='https://wowiqauwcxmhrgpltqey.supabase.co';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indvd2lxYXV3Y3htaHJncGx0cWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2OTg3MDcsImV4cCI6MjEwOTI3NDcwN30.KXJNAShiQX7ShaWNu55Vk253w-zv2i8sp25NOkBT3WE';
  const PENDING='farewell-pet-pending-inquiry';
  if(!window.supabase||!window.supabase.createClient)return;
  const client=window.supabase.createClient(URL_,KEY,{auth:{storage:window.sessionStorage}});

  async function currentUser(){
    if(!client)throw new Error('supabase_unavailable');
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    return data.session?data.session.user:null;
  }
  async function loadPetProfile(legacyPet){
    const user=await currentUser();
    if(!user)return {user:null,pet:null};
    const {data,error}=await client.from('pet_profiles').select('pet').eq('user_id',user.id).maybeSingle();
    if(error)throw error;
    if(data)return {user,pet:data.pet};
    if(legacyPet&&legacyPet.name){
      await savePetProfile(legacyPet);
      return {user,pet:legacyPet};
    }
    return {user,pet:null};
  }
  async function savePetProfile(pet){
    const user=await currentUser();
    if(!user)throw new Error('not_signed_in');
    const {error}=await client.from('pet_profiles').upsert({user_id:user.id,pet,updated_at:new Date().toISOString()});
    if(error)throw error;
  }
  let acceptingCache=null;
  function accepting(){
    if(!acceptingCache)acceptingCache=client.from('facilities').select('id').eq('accepting_inquiries',true)
      .then(({data,error})=>{if(error)throw error;return new Set(data.map(f=>f.id));})
      .catch(()=>{acceptingCache=null;return new Set();});
    return acceptingCache;
  }
  /* 네트워크가 느려도 문의 버튼이 멈추지 않게, 4초 안에 모르면 복사 방식으로 넘어간다 */
  function isAccepting(id){
    return Promise.race([accepting().then(s=>s.has(id)),new Promise(r=>setTimeout(()=>r(false),4000))]);
  }

  async function sendInquiry({facilityId,petName,body}){
    const user=await currentUser();if(!user)throw new Error('not_signed_in');
    const find=()=>client.from('conversations').select('id').eq('facility_id',facilityId).eq('guardian_id',user.id).maybeSingle();
    let {data:conv,error}=await find();
    if(error)throw error;
    if(!conv){
      const res=await client.from('conversations').insert({facility_id:facilityId,pet_name:String(petName||'우리 아이').slice(0,40)}).select('id').single();
      if(res.error&&res.error.code==='23505'){const again=await find();if(again.error)throw again.error;conv=again.data;}
      else if(res.error)throw res.error;
      else conv=res.data;
    }
    const sent=await client.from('inquiry_messages').insert({conversation_id:conv.id,sender_role:'guardian',kind:'text',body});
    if(sent.error)throw sent.error;
    return conv.id;
  }

  function savePending(p){try{localStorage.setItem(PENDING,JSON.stringify(p));return true;}catch{return false;}}
  function takePending(){try{const v=localStorage.getItem(PENDING);localStorage.removeItem(PENDING);return v?JSON.parse(v):null;}catch{return null;}}

  window.FPChat={client,currentUser,loadPetProfile,savePetProfile,isAccepting,sendInquiry,savePending,takePending};
})();
