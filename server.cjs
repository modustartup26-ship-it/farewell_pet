const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,port=Number(process.env.PORT)||5175;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const MAX_BODY_BYTES=128*1024;
const MAX_MESSAGES=12;
const MAX_MESSAGE_LENGTH=4000;
const PROVIDER_TIMEOUT_MS=20000;
const SYSTEM_PROMPT='당신은 farewell pet 웹사이트의 따뜻하고 신중한 한국어 반려동물 돌봄 안내 도우미입니다. 사용자의 언어에 맞춰 답하세요. 사이트에 명시된 정보만 확실한 사실로 말하고, 모르는 업체 정보나 기능은 확인이 필요하다고 밝히세요. 수의사의 진단이나 처방을 대신하지 말고, 증상이 심하거나 응급이면 즉시 동물병원에 연락하도록 안내하세요. 약의 용량 변경, 치료 중단, 위험한 민간요법을 권하지 마세요. 공감하며 간결하고 실용적으로 답하세요.';

function sendJson(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(body));
}
async function readJson(req){
  const chunks=[];
  let size=0;
  for await(const chunk of req){
    size+=chunk.length;
    if(size>MAX_BODY_BYTES)throw Object.assign(new Error('request_too_large'),{status:413});
    chunks.push(chunk);
  }
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch{throw Object.assign(new Error('invalid_json'),{status:400});}
}
async function handleChat(req,res){
  if(req.method!=='POST'){
    res.writeHead(405,{'Allow':'POST'}).end();
    return;
  }
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')){
    sendJson(res,415,{error:'JSON 형식의 요청만 지원해요.'});
    return;
  }
  let body;
  try{body=await readJson(req);}
  catch(error){
    if(error.status===413){sendJson(res,413,{error:'요청이 너무 커요. 대화를 지우고 다시 시도해 주세요.'});return;}
    sendJson(res,400,{error:'요청을 읽지 못했어요. 다시 시도해 주세요.'});
    return;
  }
  const messages=body&&body.messages;
  if(!Array.isArray(messages)||messages.length<1||messages.length>MAX_MESSAGES||
    messages.some(message=>!message||!['user','assistant'].includes(message.role)||
      typeof message.content!=='string'||!message.content.trim()||message.content.length>MAX_MESSAGE_LENGTH)||
    messages[messages.length-1].role!=='user'){
    sendJson(res,400,{error:'대화 내용이 올바르지 않아요. 다시 시도해 주세요.'});
    return;
  }
  const apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey){
    sendJson(res,503,{error:'AI 상담 서버가 아직 설정되지 않았어요. 운영자에게 문의해 주세요.'});
    return;
  }
  const model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite';
  try{
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
      method:'POST',
      headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:SYSTEM_PROMPT}]},
        contents:messages.map(message=>({
          role:message.role==='assistant'?'model':'user',
          parts:[{text:message.content}]
        })),
        generationConfig:{maxOutputTokens:700,temperature:0.5}
      }),
      signal:AbortSignal.timeout(PROVIDER_TIMEOUT_MS)
    });
    if(!response.ok){
      let providerMessage='';
      try{
        const errorBody=await response.json();
        providerMessage=errorBody&&errorBody.error&&typeof errorBody.error.message==='string'
          ?errorBody.error.message
          :'';
      }catch{}
      console.error('Gemini API request failed with status '+response.status+(providerMessage?': '+providerMessage:''));
      if(response.status===429){
        sendJson(res,429,{error:'Gemini 무료 이용 한도에 도달했거나 요청이 많아요. 잠시 뒤 다시 시도해 주세요.'});
        return;
      }
      if(response.status===401||response.status===403){
        sendJson(res,503,{error:'Gemini API 키를 확인해 주세요. 서버 관리자에게 문의해 주세요.'});
        return;
      }
      if(response.status===400||response.status===404){
        sendJson(res,502,{error:'Gemini 모델 또는 요청을 사용할 수 없어요. 서버의 GEMINI_MODEL 설정을 확인해 주세요.'});
        return;
      }
      sendJson(res,502,{error:'AI 답변을 가져오지 못했어요. 잠시 뒤 다시 시도해 주세요.'});
      return;
    }
    const result=await response.json();
    const parts=result&&result.candidates&&result.candidates[0]&&result.candidates[0].content&&result.candidates[0].content.parts;
    const reply=Array.isArray(parts)?parts.map(part=>typeof part.text==='string'?part.text:'').join(''):'';
    if(!reply.trim()){
      console.error('AI provider returned an empty or unsupported response');
      sendJson(res,502,{error:'AI 답변을 받지 못했어요. 잠시 뒤 다시 시도해 주세요.'});
      return;
    }
    sendJson(res,200,{reply:reply.trim()});
  }catch(error){
    console.error('Gemini API request failed:',error.message);
    if(error.name==='TimeoutError'||error.name==='AbortError'){
      sendJson(res,504,{error:'Gemini 응답이 오래 걸려 연결을 종료했어요. 잠시 뒤 다시 시도해 주세요.'});
      return;
    }
    sendJson(res,502,{error:'AI 상담 서버에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.'});
  }
}

http.createServer((req,res)=>{
  let pathname;
  try{pathname=new URL(req.url,'http://localhost').pathname;}
  catch{res.writeHead(400).end();return;}
  if(pathname==='/api/chat'){handleChat(req,res);return;}
  let file;
  try{file=path.resolve(root,'.'+decodeURIComponent(pathname));}
  catch{res.writeHead(400).end();return;}
  if(file===root)file=path.join(root,'index.html');
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404).end('Not found');return;}
    res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');
    res.end(data);
  });
}).listen(port, '0.0.0.0', () => console.log('Server listening on ' + port));
