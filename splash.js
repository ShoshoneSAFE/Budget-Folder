// S.A.F.E. Splash Screen — runSplash, skipSplash, showOutro
let splashTimeouts=[];
function skipSplash(){
  splashTimeouts.forEach(t=>clearTimeout(t));
  splashTimeouts=[];
  document.getElementById('splashSys').style.display='none';
  document.getElementById('app').style.display='flex';
  document.getElementById('loginOverlay').classList.add('open');
}

function runSplash(){
  const splash=document.getElementById('splashSys');
  const s1=document.getElementById('scr1');
  const s2=document.getElementById('scr2');
  const app=document.getElementById('app');
  const login=document.getElementById('loginOverlay');
  function showApp(){splash.style.display='none';app.style.display='flex';login.classList.add('open');}
  // scr1 already visible via CSS; fade to scr2 after 3s
  splashTimeouts.push(setTimeout(()=>{
    s1.style.opacity='0';
    splashTimeouts.push(setTimeout(()=>{s1.style.display='none';s2.style.opacity='1';},800));
  },3000));
  // hide splash, show app + login after 6.5s total
  splashTimeouts.push(setTimeout(()=>{s2.style.opacity='0';splashTimeouts.push(setTimeout(showApp,800));},6500));
}

function showOutro(){
  const s3=document.getElementById('scr3');
  const sys=document.getElementById('splashSys');
  sys.style.display='block';
  s3.style.opacity='1';s3.style.pointerEvents='auto';
  setTimeout(()=>document.getElementById('voteMsg').classList.add('go'),2500);
  setTimeout(()=>{s3.style.opacity='0';sys.style.background='#000';},11000);
  setTimeout(()=>{
    try{window.close();}catch(e){}
    document.body.innerHTML='<div style="background:#000;min-height:100vh;display:flex;align-items:center;justify-content:center;"><p style="color:rgba(201,168,76,0.4);font-family:Georgia,serif;font-size:20px;letter-spacing:6px;">Thanks for your VOTE &nbsp;★&nbsp; S.A.F.E.</p></div>';
  },12800);
}
