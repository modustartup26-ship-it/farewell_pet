(function(){
  const chat=window.FPChat;
  if(!chat||!chat.client)return;

  const dialog=document.createElement('dialog');
  dialog.className='auth-dialog';
  dialog.setAttribute('aria-labelledby','auth-title');
  dialog.innerHTML=`<form class="auth-card" id="auth-form">
    <button class="auth-close" type="button" aria-label="닫기">×</button>
    <h2 id="auth-title">로그인</h2>
    <p class="auth-intro">이메일과 비밀번호로 로그인하거나 새 계정을 만들 수 있어요.</p>
    <label>이메일<input name="email" type="email" autocomplete="email" inputmode="email" required placeholder="name@example.com"></label>
    <label data-auth-field="password">비밀번호<input name="password" type="password" autocomplete="current-password" minlength="8" placeholder="8자 이상"></label>
    <label data-auth-field="confirm" hidden>비밀번호 확인<input name="confirm" type="password" autocomplete="new-password" minlength="8" placeholder="비밀번호를 다시 입력해 주세요"></label>
    <label data-auth-field="code" hidden>이메일 인증 코드<input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="인증 코드를 받은 뒤 입력해 주세요"></label>
    <p class="auth-info" id="auth-info" role="status" hidden></p>
    <p class="auth-error" id="auth-error" role="alert" hidden></p>
    <button class="auth-submit" type="submit">로그인</button>
    <button class="auth-resend" type="button" hidden>인증 코드 다시 보내기</button>
    <button class="auth-switch" type="button">계정이 없으신가요? 회원가입</button>
  </form>`;
  document.body.append(dialog);

  let mode='login',stage='details',signupEmail='',onSuccess=()=>location.reload();
  const form=dialog.querySelector('#auth-form');
  const title=dialog.querySelector('#auth-title');
  const email=form.elements.email;
  const password=form.elements.password;
  const confirm=form.elements.confirm;
  const code=form.elements.code;
  const intro=dialog.querySelector('.auth-intro');
  const infoEl=dialog.querySelector('#auth-info');
  const errorEl=dialog.querySelector('#auth-error');
  const submit=form.querySelector('.auth-submit');
  const resend=form.querySelector('.auth-resend');
  const toggle=form.querySelector('.auth-switch');
  const passwordField=form.querySelector('[data-auth-field="password"]');
  const confirmField=form.querySelector('[data-auth-field="confirm"]');
  const codeField=form.querySelector('[data-auth-field="code"]');

  function showError(message){
    errorEl.textContent=message;
    errorEl.hidden=!message;
    if(message)showInfo('');
  }
  function showInfo(message){
    infoEl.textContent=message;
    infoEl.hidden=!message;
  }
  function renderMode(){
    const signup=mode==='signup';
    const verifying=signup&&stage==='verify';
    title.textContent=signup?'회원가입':'로그인';
    intro.textContent=signup
      ?'이메일로 받은 인증 코드를 확인한 뒤 회원가입이 완료돼요. 이미 계정이 있다면 아래에서 로그인으로 전환해 주세요.'
      :'가입한 이메일과 비밀번호로 로그인해 주세요.';
    passwordField.hidden=false;
    confirmField.hidden=!signup;
    codeField.hidden=!signup;
    password.required=true;
    confirm.required=signup&&!verifying;
    code.required=verifying;
    password.disabled=verifying;
    confirm.disabled=verifying;
    code.disabled=!verifying;
    email.disabled=verifying;
    submit.textContent=signup?(verifying?'인증하고 회원가입':'인증 코드 받기'):'로그인';
    password.autocomplete=signup?'new-password':'current-password';
    password.placeholder=signup?'8자 이상':'비밀번호';
    resend.hidden=!verifying;
    toggle.hidden=verifying;
    toggle.textContent=signup?'이미 계정이 있으신가요? 로그인':'계정이 없으신가요? 회원가입';
    showError('');
    showInfo('');
  }
  async function finishAuthentication(user){
    dialog.close();
    try{
      await onSuccess(user);
    }catch(error){
      console.error('Authentication succeeded but the next page could not be opened.',error);
      if(!dialog.open)dialog.showModal();
      showError('로그인했지만 다음 화면을 열지 못했어요. 페이지를 새로고침해 주세요.');
    }
  }
  async function requestCode(){
    const nextEmail=email.value.trim();
    const nextPassword=password.value;
    if(nextPassword!==confirm.value){
      showError('비밀번호 확인이 일치하지 않아요.');
      return;
    }
    signupEmail=nextEmail;
    const {data,error}=await chat.client.auth.signUp({email:signupEmail,password:nextPassword});
    if(error)throw error;
    if(data.session){
      await chat.client.auth.signOut({scope:'local'});
      throw new Error('email_confirmation_disabled');
    }
    stage='verify';
    code.value='';
    renderMode();
    showInfo('인증 코드를 이메일로 보냈어요. 코드를 입력해 회원가입을 완료해 주세요.');
  }
  async function verifyCode(){
    const {data,error}=await chat.client.auth.verifyOtp({
      email:signupEmail,
      token:code.value.trim(),
      type:'signup'
    });
    if(error)throw error;
    if(!data.session)throw new Error('verification_session_missing');
    await finishAuthentication(data.user);
  }
  async function handleSubmit(event){
    event.preventDefault();
    submit.disabled=true;
    showError('');
    try{
      if(mode==='signup'){
        if(stage==='details')await requestCode();
        else await verifyCode();
      }else{
        const {data,error}=await chat.client.auth.signInWithPassword({
          email:email.value.trim(),
          password:password.value
        });
        if(error)throw error;
        await finishAuthentication(data.user);
      }
    }catch(error){
      console.error('Unable to authenticate with email and password.',error);
      if(error.message==='email_confirmation_disabled'){
        showError('이메일 인증이 꺼져 있어요. Supabase에서 Email provider의 Confirm email을 켜고 다시 시도해 주세요.');
      }else if(error.code==='email_not_confirmed'){
        showError('이메일 인증이 완료되지 않은 계정이에요. 회원가입 화면에서 인증 코드를 받아 주세요.');
      }else if(mode==='signup'&&stage==='verify'){
        showError('인증 코드가 올바르지 않거나 만료됐어요. 코드를 확인하거나 다시 보내 주세요.');
      }else{
        showError(mode==='signup'
          ?'인증 코드를 보내지 못했어요. 이메일 주소와 비밀번호를 확인해 주세요.'
          :'로그인하지 못했어요. 이메일과 비밀번호를 확인해 주세요.');
      }
    }finally{
      submit.disabled=false;
    }
  }

  dialog.querySelector('.auth-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  toggle.addEventListener('click',()=>{
    mode=mode==='login'?'signup':'login';
    stage='details';
    signupEmail='';
    form.reset();
    renderMode();
  });
  resend.addEventListener('click',async()=>{
    resend.disabled=true;
    showError('');
    try{
      const {error}=await chat.client.auth.resend({type:'signup',email:signupEmail});
      if(error)throw error;
      showInfo('새 인증 코드를 이메일로 보냈어요.');
    }catch(error){
      console.error('Unable to resend the email verification code.',error);
      showError('인증 코드를 다시 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    }finally{
      resend.disabled=false;
    }
  });
  form.addEventListener('submit',handleSubmit);

  window.FPAuth={open(options={}){
    mode=options.mode==='signup'?'signup':'login';
    stage='details';
    signupEmail='';
    onSuccess=typeof options.onSuccess==='function'?options.onSuccess:()=>location.reload();
    form.reset();
    renderMode();
    if(!dialog.open)dialog.showModal();
    email.focus();
  }};
})();
