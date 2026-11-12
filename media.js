/* 사진·영상 올리기와 보기. 비공개 저장소라 볼 때마다 1시간짜리 서명 주소를 받는다. */
(function(){
  const BUCKET='pet-media';
  const MAX_VIDEO=50*1024*1024;
  const urlCache=new Map();

  function errorText(e){
    const m=String((e&&(e.message||e.error))||'');
    if(/quota_exceeded/.test(m))return '앨범 용량이 가득 찼어요. 앨범에서 용량을 늘리거나 사진을 정리해 주세요.';
    if(/file_too_large|exceeded the maximum|Payload too large/i.test(m))return '파일이 너무 커요. 영상은 50MB까지 올릴 수 있어요.';
    if(/invalid_type|mime/i.test(m))return '사진(jpg·png·webp)이나 영상(mp4·mov·webm)만 올릴 수 있어요.';
    return '올리지 못했어요. 잠시 뒤에 다시 시도해 주세요.';
  }

  /* 사진은 긴 변 1600px JPEG로 줄여서 올린다 */
  function compressImage(file){
    return new Promise((resolve,reject)=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onload=()=>{
        const s=Math.min(1,1600/Math.max(img.width,img.height));
        const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b=>b?resolve(b):reject(new Error('compress_failed')),'image/jpeg',.82);
      };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('invalid_type'));};
      img.src=url;
    });
  }
  function videoExt(file){
    const t=file.type;
    if(t==='video/mp4')return 'mp4';
    if(t==='video/quicktime')return 'mov';
    if(t==='video/webm')return 'webm';
    return null;
  }

  /* 자리 만들기 → 파일 올리기. 올리기에 실패하면 자리를 지운다 */
  async function upload(client,file,{conversationId=null,caption=''}={}){
    let blob,kind,ext,type;
    if(file.type.startsWith('image/')){blob=await compressImage(file);kind='image';ext='jpg';type='image/jpeg';}
    else if(file.type.startsWith('video/')){
      ext=videoExt(file);if(!ext)throw new Error('invalid_type');
      if(file.size>MAX_VIDEO)throw new Error('file_too_large');
      blob=file;kind='video';type=file.type;
    }else throw new Error('invalid_type');
    const {data,error}=await client.rpc('create_media',{p_conversation:conversationId,p_kind:kind,p_bytes:blob.size,p_ext:ext,p_caption:caption});
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    const up=await client.storage.from(BUCKET).upload(row.path,blob,{contentType:type,upsert:false});
    if(up.error){await client.rpc('delete_media',{p_id:row.id});throw up.error;}
    return {id:row.id,path:row.path,kind,bytes:blob.size};
  }

  async function urls(client,paths){
    const need=paths.filter(p=>{const c=urlCache.get(p);return !c||c.exp<Date.now()+60e3;});
    for(let i=0;i<need.length;i+=100){
      const chunk=need.slice(i,i+100);
      const {data,error}=await client.storage.from(BUCKET).createSignedUrls(chunk,3600);
      if(error)throw error;
      (data||[]).forEach(d=>{if(d.signedUrl)urlCache.set(d.path,{url:d.signedUrl,exp:Date.now()+3600e3});});
    }
    const out={};paths.forEach(p=>{const c=urlCache.get(p);if(c)out[p]=c.url;});
    return out;
  }

  async function remove(client,m){
    const s=await client.storage.from(BUCKET).remove([m.path]);
    if(s.error)throw s.error;
    const {error}=await client.rpc('delete_media',{p_id:m.id});
    if(error)throw error;
    urlCache.delete(m.path);
  }

  function size(n){
    if(n<1024*1024)return Math.max(1,Math.round(n/1024))+'KB';
    if(n<1024*1024*1024)return (n/1024/1024).toFixed(n<10*1024*1024?1:0)+'MB';
    return (n/1024/1024/1024).toFixed(1)+'GB';
  }

  window.Media={upload,urls,remove,errorText,size,BUCKET};
})();
