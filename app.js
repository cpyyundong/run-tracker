/* ================================================================
   DATA LAYER
   ================================================================ */
const USERS_KEY='rt_users', SESSION_KEY='rt_session', POSTS_KEY='rt_posts', KNOWLEDGE_KEY='rt_knowledge';
let currentUser=null, isGuest=false;
const load=k=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):null}catch{return null}};
const save=(k,v)=>{if(isGuest){saveGuest(k,v);return}localStorage.setItem(k,JSON.stringify(v))};
const loadGuest=k=>{try{const r=sessionStorage.getItem('guest_'+k);return r?JSON.parse(r):null}catch{return null}};
const saveGuest=(k,v)=>{sessionStorage.setItem('guest_'+k,JSON.stringify(v))};

function dataKey(base){return isGuest?('guest_'+base):(base+'_'+currentUser)}
const RK=()=>dataKey('rt_data');
const UK=()=>dataKey('rt_user');
const SK=()=>dataKey('rt_streak');
const AK=()=>isGuest?('guest_rt_avatar'):('rt_avatar_'+currentUser);

const runData=()=>{const k=RK();let d=isGuest?loadGuest(k):load(k);return d&&typeof d==='object'?d:{}};
const userData=()=>{const k=UK();let u=isGuest?loadGuest(k):load(k);return u&&typeof u==='object'?u:{name:currentUser||'游客',bio:'坚持跑步，热爱生活',motto:'',avatar:''}};
const postData=()=>{let p=load(POSTS_KEY);return Array.isArray(p)?p:[]};
const knowledgeData=()=>{let k=load(KNOWLEDGE_KEY);return Array.isArray(k)?k:[]};
const avatarData=()=>{const k=AK();let a=isGuest?loadGuest(k):load(k);return a||''};
function getUsers(){try{return JSON.parse(localStorage.getItem(USERS_KEY))||{}}catch{return{}}}
function saveUsers(u){localStorage.setItem(USERS_KEY,JSON.stringify(u))}
function getUserAvatar(uname){const u=getUsers();const entry=u[uname];if(entry&&entry.avatar)return entry.avatar;return''}

const estCal=d=>Math.round(d*60);
const dateKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const todayKey=()=>dateKey(new Date());
const esc=s=>{const d=document.createElement('div');d.textContent=s;return d.innerHTML};
const escAttr=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000);}

/* ================================================================
   STREAK CALCULATION
   ================================================================ */
function calcStreaks(data){
  const keys=Object.keys(data).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  if(!keys.length)return{current:0,longest:0};
  let current=0;
  const today=new Date();today.setHours(0,0,0,0);
  const yesterday=new Date(today);yesterday.setDate(today.getDate()-1);
  const yk=dateKey(yesterday),tk=dateKey(today);
  let checkDate=data[tk]?today:(data[yk]?yesterday:null);
  if(checkDate){let d=new Date(checkDate);while(true){const k=dateKey(d);if(data[k]){current++;d.setDate(d.getDate()-1);}else break;}}
  let longest=0,run=0;
  const allDates=keys.map(k=>new Date(k+'T00:00:00')).sort((a,b)=>a-b);
  for(let i=0;i<allDates.length;i++){
    if(i===0)run=1;
    else{const diff=(allDates[i]-allDates[i-1])/(1000*60*60*24);if(diff===1)run++;else{longest=Math.max(longest,run);run=1;}}
    longest=Math.max(longest,run);
  }
  longest=Math.max(current,longest);
  return{current,longest};
}

/* ================================================================
   AUTH
   ================================================================ */
function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));
  document.querySelector('.auth-tab:nth-child('+(tab==='login'?1:2)+')').classList.add('active');
  document.getElementById(tab==='login'?'authFormLogin':'authFormReg').classList.add('active');
  document.getElementById('loginError').textContent='';
  document.getElementById('regError').textContent='';
}

function doLogin(){
  try{
    const name=document.getElementById('loginUser').value.trim(),pass=document.getElementById('loginPass').value;
    document.getElementById('loginError').textContent='';
    if(!name||!pass){document.getElementById('loginError').textContent='请输入用户名和密码';return}
    const users=getUsers();
    if(!users[name]){document.getElementById('loginError').textContent='用户不存在，请先注册';return}
    if(users[name].password!==pass){document.getElementById('loginError').textContent='密码错误';return}
    currentUser=name;isGuest=false;
    localStorage.setItem(SESSION_KEY,JSON.stringify({user:name,time:Date.now()}));
    initApp();
  }catch(e){document.getElementById('loginError').textContent='登录失败，请刷新页面重试';}
}

function doRegister(){
  try{
    const name=document.getElementById('regUser').value.trim(),pass=document.getElementById('regPass').value,pass2=document.getElementById('regPass2').value;
    document.getElementById('regError').textContent='';
    if(!name){document.getElementById('regError').textContent='请输入用户名';return}
    if(name.length<2||name.length>20){document.getElementById('regError').textContent='用户名需要 2-20 个字符';return}
    if(!/^[一-龥a-zA-Z0-9_]+$/.test(name)){document.getElementById('regError').textContent='用户名只能包含中文、字母、数字和下划线';return}
    if(!pass||pass.length<6){document.getElementById('regError').textContent='密码至少需要 6 位';return}
    if(pass!==pass2){document.getElementById('regError').textContent='两次输入的密码不一致';return}
    const users=getUsers();
    if(users[name]){document.getElementById('regError').textContent='用户名已存在';return}
    users[name]={password:pass,createdAt:Date.now()};
    saveUsers(users);
    document.getElementById('regError').style.color='var(--green)';
    document.getElementById('regError').textContent='注册成功！正在自动登录...';
    // 注册后自动登录
    setTimeout(()=>{
      currentUser=name;isGuest=false;
      localStorage.setItem(SESSION_KEY,JSON.stringify({user:name,time:Date.now()}));
      initApp();
    },600);
  }catch(e){document.getElementById('regError').textContent='注册失败，请刷新页面重试';}
}

function enterGuestMode(){
  currentUser='游客'+Math.random().toString(36).slice(2,6);
  isGuest=true;
  initApp();
}

function showGuestLogin(){
  document.getElementById('authOverlay').style.display='flex';
  document.getElementById('mainApp').style.display='none';
  document.getElementById('bottomNav').style.display='none';
  switchAuthTab('login');
}
function showGuestRegister(){
  if(!isGuest)return;
  document.getElementById('authOverlay').style.display='flex';
  document.getElementById('mainApp').style.display='none';
  document.getElementById('bottomNav').style.display='none';
  switchAuthTab('register');
  toast('注册后可保存所有数据');
}

function doLogout(){
  if(!confirm('确定退出？'+(isGuest?'游客数据将丢失！':'')))return;
  if(isGuest)sessionStorage.clear();
  stopTimer();stopGPSTracking();
  currentUser=null;isGuest=false;
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('mainApp').style.display='none';
  document.getElementById('bottomNav').style.display='none';
  document.getElementById('authOverlay').style.display='flex';
  document.getElementById('loginUser').value='';
  document.getElementById('loginPass').value='';
}

/* ================================================================
   TAB SWITCHING
   ================================================================ */
function switchTab(tid){
  document.querySelectorAll('.tab-page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById(tid).classList.add('active');
  document.querySelector('[data-tab="'+tid+'"]').classList.add('active');
  if(tid==='tab-checkin')renderCheckin();
  if(tid==='tab-community')renderPosts();
  if(tid==='tab-knowledge'){renderKnowledge();document.getElementById('knowledgeSearchResults').style.display='none';document.getElementById('knowledgeSearch').value='';}
  if(tid==='tab-promotion')renderPromotion();
  if(tid==='tab-profile')renderProfile();
}

/* ================================================================
   TIMER (0.01 sec precision)
   ================================================================ */
let timerRunning=false,timerPaused=false,timerStartTime=0,timerElapsed=0,timerInterval=null;
function toggleTimer(){
  if(!timerRunning){timerStartTime=Date.now()-timerElapsed;timerRunning=true;timerPaused=false;timerInterval=setInterval(updateTimer,10);
    document.getElementById('timerCircle').classList.add('running');document.getElementById('timerCircle').classList.remove('paused');
    document.getElementById('timerBtnMain').textContent='暂停';document.getElementById('timerBtnFill').style.display='none';
    document.getElementById('timerLabel').textContent='计时中...';return}
  if(!timerPaused){timerElapsed=Date.now()-timerStartTime;timerPaused=true;clearInterval(timerInterval);timerInterval=null;
    document.getElementById('timerCircle').classList.remove('running');document.getElementById('timerCircle').classList.add('paused');
    document.getElementById('timerBtnMain').textContent='继续';document.getElementById('timerBtnFill').style.display='inline-block';
    document.getElementById('timerLabel').textContent='已暂停';return}
  timerStartTime=Date.now()-timerElapsed;timerPaused=false;timerRunning=true;
  timerInterval=setInterval(updateTimer,10);
  document.getElementById('timerCircle').classList.add('running');document.getElementById('timerCircle').classList.remove('paused');
  document.getElementById('timerBtnMain').textContent='暂停';document.getElementById('timerBtnFill').style.display='none';
  document.getElementById('timerLabel').textContent='计时中...';
}
function updateTimer(){
  const ms=Date.now()-timerStartTime;timerElapsed=ms;
  const totalSec=Math.floor(ms/1000),m=Math.floor(totalSec/60),s=totalSec%60,cs=Math.floor((ms%1000)/10);
  document.getElementById('timerDisplay').innerHTML=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'<span class="ms">.'+String(cs).padStart(2,'0')+'</span>';
}
function resetTimer(){stopTimer();timerElapsed=0;
  document.getElementById('timerDisplay').innerHTML='00:00<span class="ms">.00</span>';
  document.getElementById('timerLabel').textContent='点击开始';
  document.getElementById('timerCircle').classList.remove('running','paused');
  document.getElementById('timerBtnMain').textContent='开始';document.getElementById('timerBtnFill').style.display='none';}
function stopTimer(){if(timerInterval){clearInterval(timerInterval);timerInterval=null}timerRunning=false;timerPaused=false;
  document.getElementById('timerCircle').classList.remove('running','paused');document.getElementById('timerBtnMain').textContent='开始';}
function fillTimerToForm(){const min=Math.ceil(timerElapsed/60000);document.getElementById('duration').value=min;triggerCal();}

/* ================================================================
   GPS
   ================================================================ */
let gpsWatchId=null,gpsPoints=[],gpsTracking=false;
function toggleGPS(){
  if(gpsTracking){stopGPSTracking();return}
  if(!navigator.geolocation){toast('浏览器不支持地理定位');return}
  gpsPoints=[];gpsTracking=true;
  document.getElementById('gpsToggle').classList.add('active');document.getElementById('gpsCanvasWrap').classList.add('show');
  document.getElementById('gpsInfo').classList.add('show');
  document.getElementById('gpsToggle').innerHTML='<span class="dot"></span> 停止追踪';
  navigator.geolocation.getCurrentPosition(gpsSuccess,gpsError,{enableHighAccuracy:true});
  gpsWatchId=navigator.geolocation.watchPosition(gpsSuccess,gpsError,{enableHighAccuracy:true,timeout:10000,maximumAge:0});
  drawGPSTrack();
}
function gpsSuccess(pos){
  gpsPoints.push({lat:pos.coords.latitude,lng:pos.coords.longitude,time:Date.now()});
  document.getElementById('gpsInfo').textContent='坐标: '+pos.coords.latitude.toFixed(5)+', '+pos.coords.longitude.toFixed(5)+' (共'+gpsPoints.length+'点)';
  drawGPSTrack();
}
function gpsError(err){stopGPSTracking();document.getElementById('gpsCard').style.display='none';toast('无法获取位置，GPS功能已隐藏');}
function stopGPSTracking(){
  if(gpsWatchId){navigator.geolocation.clearWatch(gpsWatchId);gpsWatchId=null}
  gpsTracking=false;
  document.getElementById('gpsToggle').classList.remove('active');
  document.getElementById('gpsToggle').innerHTML='<span class="dot"></span> 实时追踪轨迹';
  document.getElementById('gpsInfo').classList.remove('show');
  document.getElementById('gpsCanvasWrap').classList.remove('show');
}
function drawGPSTrack(){
  if(!gpsPoints.length)return;
  const c=document.getElementById('gpsCanvas'),ctx=c.getContext('2d');
  c.width=c.parentElement.clientWidth;c.height=200;
  if(!gpsPoints.length)return;
  const lats=gpsPoints.map(p=>p.lat),lngs=gpsPoints.map(p=>p.lng);
  const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
  const pad=0.0005,rlat=(maxLat-minLat+pad*2)||0.001,rlng=(maxLng-minLng+pad*2)||0.001;
  function x(lng){return((lng-minLng+pad)/rlng)*c.width}
  function y(lat){return c.height-((lat-minLat+pad)/rlat)*c.height}
  ctx.fillStyle='#0a0a10';ctx.fillRect(0,0,c.width,c.height);
  ctx.beginPath();ctx.strokeStyle='#ff6b35';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=0;i<gpsPoints.length;i++){const px=x(gpsPoints[i].lng),py=y(gpsPoints[i].lat);if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
  ctx.stroke();
  if(gpsPoints.length>0){ctx.beginPath();ctx.fillStyle='#2ecc71';ctx.arc(x(gpsPoints[0].lng),y(gpsPoints[0].lat),6,0,Math.PI*2);ctx.fill()}
  if(gpsPoints.length>1){ctx.beginPath();ctx.fillStyle='#e74c3c';ctx.arc(x(gpsPoints[gpsPoints.length-1].lng),y(gpsPoints[gpsPoints.length-1].lat),6,0,Math.PI*2);ctx.fill()}
}

/* ================================================================
   PHOTO HANDLING
   ================================================================ */
let checkinPhoto='',communityPhotos=[],knowledgePhoto='',avatarTemp='';

function compressImage(file,maxKB,cb){
  const reader=new FileReader();
  reader.onload=function(e){
    const img=new Image();
    img.onload=function(){
      const canvas=document.createElement('canvas');let w=img.width,h=img.height;
      const maxDim=800;if(w>maxDim||h>maxDim){const ratio=Math.min(maxDim/w,maxDim/h);w=Math.round(w*ratio);h=Math.round(h*ratio)}
      canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);
      let quality=0.85;let result;
      do{result=canvas.toDataURL('image/jpeg',quality);quality-=0.1;}while(result.length>maxKB*1024&&quality>0.2);
      cb(result);
    };img.src=e.target.result;
  };reader.readAsDataURL(file);
}

function handlePhotoSelect(e){
  const file=e.target.files[0];if(!file)return;
  compressImage(file,200,base64=>{
    checkinPhoto=base64;
    const prev=document.getElementById('photoPreview');
    prev.style.display='block';prev.innerHTML='<img src="'+escAttr(base64)+'" alt="预览"><button class="photo-remove" onclick="removeCheckinPhoto()">×</button>';
  });
}

function removeCheckinPhoto(){checkinPhoto='';document.getElementById('photoPreview').style.display='none';document.getElementById('photoPreview').innerHTML='';document.getElementById('photoInput').value='';}
function handleCommunityPhotoSelect(e){
  communityPhotos=[];const files=Array.from(e.target.files);if(!files.length)return;
  let done=0;
  files.forEach(file=>{compressImage(file,200,base64=>{communityPhotos.push(base64);done++;if(done===files.length)renderCommunityPhotoPreview()})});
}
function renderCommunityPhotoPreview(){
  const p=document.getElementById('communityPhotoPreview');
  p.innerHTML=communityPhotos.map((ph,i)=>'<div style="position:relative"><img class="photo-thumb" src="'+escAttr(ph)+'" style="width:56px;height:56px"><button class="photo-remove" style="top:-6px;right:-6px;width:20px;height:20px;font-size:11px" onclick="removeCommunityPhoto('+i+')">×</button></div>').join('');
}
function removeCommunityPhoto(i){communityPhotos.splice(i,1);renderCommunityPhotoPreview()}
function handleKnowPhotoSelect(e){
  const file=e.target.files[0];if(!file)return;
  compressImage(file,200,base64=>{
    knowledgePhoto=base64;
    document.getElementById('knowPhotoPreview').innerHTML='<img src="'+escAttr(base64)+'" style="max-width:120px;max-height:80px;border-radius:8px">';
  });
}
function handleAvatarUpload(e){
  const file=e.target.files[0];if(!file)return;
  compressImage(file,200,base64=>{avatarTemp=base64;highlightAvatarOption(-1)});
}

/* ================================================================
   CHECKIN
   ================================================================ */
function triggerCal(){
  const d=parseFloat(document.getElementById('distance').value)||0;
  document.getElementById('calories').value=d?estCal(d):'';
}

function doCheckin(){
  const dist=parseFloat(document.getElementById('distance').value),dur=parseFloat(document.getElementById('duration').value);
  if(!dist||dist<=0){toast('请输入跑步距离');return}
  if(!dur||dur<=0){toast('请输入用时（可用计时器）');return}
  const cal=estCal(dist);
  const data=runData(),tk=todayKey();
  if(data[tk]){toast('今天已打卡，可编辑记录');return}
  const rec={dist,dur,cal,photo:checkinPhoto,gps:gpsTracking&&gpsPoints.length>0?[...gpsPoints]:null,timerMs:timerElapsed||0,time:Date.now()};
  data[tk]=rec;save(RK(),data);
  const streaks=calcStreaks(data);save(SK(),streaks);
  updateUserStats(data);
  checkinPhoto='';document.getElementById('photoPreview').style.display='none';document.getElementById('photoPreview').innerHTML='';
  document.getElementById('photoInput').value='';
  if(gpsTracking){stopGPSTracking()}
  document.getElementById('distance').value='';document.getElementById('duration').value='';document.getElementById('calories').value='';
  resetTimer();
  toast('✅ 打卡成功！加油！');
  renderCheckin();renderProfile();renderPromotionStats();
}

function updateUserStats(data){
  const ud=userData();
  ud.totalDist=0;ud.totalDur=0;ud.totalDays=0;ud.longestDist=0;ud.totalTimerMs=0;ud.checkinDates=[];
  Object.entries(data).forEach(([k,v])=>{if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&v&&typeof v==='object'){ud.totalDays++;ud.totalDist+=v.dist||0;ud.totalDur+=v.dur||0;ud.totalTimerMs+=v.timerMs||0;ud.longestDist=Math.max(ud.longestDist,v.dist||0);ud.checkinDates.push(k)}});
  ud.totalDist=Math.round(ud.totalDist*10)/10;ud.totalDur=Math.round(ud.totalDur*10)/10;
  save(UK(),ud);
  const users=getUsers();
  if(currentUser&&!isGuest){
    if(!users[currentUser])users[currentUser]={password:'',createdAt:Date.now()};
    users[currentUser].totalDist=ud.totalDist;users[currentUser].totalDays=ud.totalDays;users[currentUser].updatedAt=Date.now();
    saveUsers(users);
  }
}

function renderCheckin(){
  const data=runData(),tk=todayKey(),checked=!!data[tk];
  const btn=document.getElementById('btnCheckin'),btnTxt=document.getElementById('btnCheckinText'),hint=document.getElementById('checkinHint');
  if(checked){btn.classList.add('checked-today');btnTxt.textContent='✅ 今日已打卡';hint.textContent='今天已完成打卡，明天继续加油！';btn.onclick=null;}
  else{btn.classList.remove('checked-today');btnTxt.textContent='打卡';hint.textContent='';btn.onclick=doCheckin;}
  document.getElementById('distance').value='';document.getElementById('duration').value='';document.getElementById('calories').value='';
  document.addEventListener('input',function(e){if(e.target.id==='distance'||e.target.id==='duration')triggerCal()});
  const ud=userData();
  const stats={days:ud.totalDays||0,dist:ud.totalDist||0,time:ud.totalDur||0};
  document.getElementById('statDays').textContent=stats.days;
  document.getElementById('statDist').textContent=stats.dist.toFixed(1);
  document.getElementById('statTime').textContent=Math.floor(stats.time/60)+'h'+(stats.time%60)+'min';
  const streaks=calcStreaks(data);save(SK(),streaks);
  document.getElementById('statStreak').textContent=streaks.current;
  document.getElementById('statStreakBadge').textContent=streaks.current>0?'🔥连续'+streaks.current+'天':'';
  document.getElementById('userBarStreak').textContent=streaks.current>0?'🔥 连续'+streaks.current+'天':'';
  renderCalendar();
  renderHistory();
}

let calYear=0,calMonth=0;
function renderCalendar(){
  const now=new Date();if(!calYear){calYear=now.getFullYear();calMonth=now.getMonth()}
  document.getElementById('calMonth').textContent=calYear+'年'+(calMonth+1)+'月';
  const grid=document.getElementById('calendarGrid');
  const data=runData();
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  let html='';
  for(let i=0;i<firstDay;i++)html+='<div class="cal-cell"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dk=dateKey(new Date(calYear,calMonth,d));
    let cls='cal-cell in-month';
    if(dk===todayKey())cls+=' today';
    if(data[dk])cls+=' checked';
    html+='<div class="'+cls+'">'+d+'</div>';
  }
  grid.innerHTML=html;
}
function changeMonth(dir){
  const d=new Date(calYear,calMonth+dir,1);
  calYear=d.getFullYear();calMonth=d.getMonth();renderCalendar();
}

function renderHistory(){
  const data=runData(),list=document.getElementById('historyList');
  const items=Object.entries(data).filter(([k])=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,20);
  if(!items.length){list.innerHTML='<div class="empty-state"><svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg><p>还没有打卡记录</p></div>';return}
  list.innerHTML=items.map(([k,v])=>{
    const d=new Date(k+'T00:00:00'),wd='日一二三四五六'[d.getDay()];
    let html='<div class="history-item"><div class="history-date"><strong>'+d.getDate()+'</strong>'+d.getMonth()+1+'/'+wd+'</div><div class="history-stats"><span>距离 <strong>'+v.dist+'km</strong></span><span>用时 <strong>'+v.dur+'min</strong></span><span>卡路里 <strong>'+v.cal+'</strong></span></div>';
    if(v.photo)html+='<img class="photo-thumb" src="'+escAttr(v.photo)+'" onclick="showLightbox(\''+escAttr(v.photo)+'\')">';
    if(v.gps&&v.gps.length>0)html+='<button class="btn-sm" onclick="replayGPS('+JSON.stringify(v.gps).replace(/"/g,'&quot;')+')" style="font-size:0.7rem">回放轨迹</button>';
    html+='</div>';return html;
  }).join('');
}

function showLightbox(src){document.getElementById('lightboxImg').src=src;document.getElementById('photoLightbox').classList.add('show')}
function closeLightbox(){document.getElementById('photoLightbox').classList.remove('show')}

function replayGPS(pts){
  gpsPoints=pts;document.getElementById('gpsCanvasWrap').classList.add('show');
  const c=document.getElementById('gpsCard');c.scrollIntoView({behavior:'smooth'});
  drawGPSTrack();setTimeout(()=>{gpsPoints=[];document.getElementById('gpsCanvasWrap').classList.remove('show')},5000);
}

/* ================================================================
   COMMUNITY POSTS
   ================================================================ */
function publishPost(){
  const text=document.getElementById('postText').value.trim();
  if(!text){toast('请输入动态内容');return}
  const posts=postData();
  const hideLoc=document.getElementById('communityHideLoc').checked;
  const locInput=document.getElementById('communityLocation').value.trim();
  const location=hideLoc?'':locInput;
  const streaks=calcStreaks(runData());
  const record=runData()[todayKey()];
  const post={id:Date.now(),author:currentUser||'游客',avatar:avatarData()||getUserAvatar(currentUser),text,images:[...communityPhotos],
    location:location,streak:streaks.current,time:Date.now(),runData:record||null,likes:[],comments:[]};
  posts.unshift(post);save(POSTS_KEY,posts);
  document.getElementById('postText').value='';communityPhotos=[];renderCommunityPhotoPreview();
  document.getElementById('communityLocation').value='';document.getElementById('communityHideLoc').checked=false;
  document.getElementById('communityPhotoInput').value='';
  toast('发布成功！');
  renderPosts();
}

function renderPosts(){
  const posts=postData(),list=document.getElementById('postList');
  const streaks=calcStreaks(runData());
  if(!posts.length){list.innerHTML='<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><p>还没有动态，发布第一条吧！</p></div>';return}
  list.innerHTML=posts.map(p=>{
    const t=new Date(p.time);const likestr=p.likes.length>0?' ('+p.likes.length+')':'';
    const liked=p.likes.includes(currentUser);
    let imghtml='';
    if(p.images&&p.images.length){
      imghtml=('<div class="post-images">'+p.images.map(im=>'<img class="post-image" src="'+escAttr(im)+'" onclick="showLightbox(\''+escAttr(im)+'\')">').join('')+'</div>');
    }
    let runhtml='';
    if(p.runData){const r=p.runData;runhtml='<div class="post-run-tag">🏃 距离 '+r.dist+'km | 用时 '+r.dur+'min | '+r.cal+' 卡路里</div>'}
    const lochtml=p.location?'<div class="post-location">📍 '+esc(p.location)+'</div>':'';
    const streakBadge=p.streak>0?'<span class="user-badge-sm">🔥连续'+p.streak+'天</span>':'';
    let commentsHtml='';
    if(p.comments.length>0){
      commentsHtml='<div class="comments-section">'+p.comments.slice(-5).map(c=>'<div class="comment-item"><div class="comment-avatar">'+esc(c.author).charAt(0)+'</div><div class="comment-body"><strong>'+esc(c.author)+'</strong>'+esc(c.text)+'</div></div>').join('')+'</div>';
    }
    commentsHtml+='<div class="comment-input-row"><input id="cmt_'+p.id+'" placeholder="评论..."><button class="btn-sm" onclick="addComment('+p.id+')">发送</button></div>';
    return '<div class="post-card"><div class="post-header"><div class="post-avatar" onclick="showUserProfile(\''+escAttr(p.author)+'\')">'+(p.avatar?'<img src="'+escAttr(p.avatar)+'">':esc(p.author).charAt(0))+'</div><div class="post-meta"><strong>'+esc(p.author)+'</strong>'+streakBadge+'<br>'+t.toLocaleDateString('zh-CN')+' '+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')+'</div></div><div class="post-body">'+esc(p.text)+'</div>'+imghtml+runhtml+lochtml+'<div class="post-actions"><button class="'+(liked?'liked':'')+'" onclick="likePost('+p.id+')">❤️ '+likestr+'</button></div>'+commentsHtml+'</div>';
  }).join('');
}

function likePost(id){
  const posts=postData();const p=posts.find(x=>x.id===id);if(!p)return;
  const idx=p.likes.indexOf(currentUser);
  if(idx>-1)p.likes.splice(idx,1);else p.likes.push(currentUser);
  save(POSTS_KEY,posts);renderPosts();
}

function addComment(id){
  const input=document.getElementById('cmt_'+id);if(!input)return;
  const text=input.value.trim();if(!text)return;
  const posts=postData();const p=posts.find(x=>x.id===id);if(!p)return;
  p.comments.push({author:currentUser,text,time:Date.now()});
  save(POSTS_KEY,posts);renderPosts();
}

/* ================================================================
   KNOWLEDGE
   ================================================================ */
const builtinKnowledge=[
  {updateWeekly:true,title:'正确跑步姿势',cat:'入门',summary:'保持身体笔直略微前倾，头部自然抬起，目视前方20-30米。肩膀放松不耸肩，手臂自然摆动。步频约170-180步/分钟，落地时前脚掌或中足部先着地。',detail:'正确姿势能显著降低受伤风险并提高跑步经济性。核心要点：1)上半身稳定，避免左右晃动；2)臀部发力向前，而非向上；3)小跑步高步频，减少地面冲击。',source:'《跑步姿势与性能》美国跑步杂志'},
  {title:'腹式呼吸法',cat:'入门',summary:'用鼻子深吸气，感受腹部鼓起；用嘴缓慢呼气，腹部收缩。节奏建议2:2或3:2模式，即两步吸气两步呼气。',detail:'腹式呼吸能增加氧气摄入量，减少胁部疼痛。初学者可先在静态练习，再过渡到慢跑。',source:'《呼吸的科学》'},
  {title:'跑前热身与拉伸',cat:'安全',summary:'动态热身5-10分钟（高抬腿、开合跳、弓步行走），跑后静态拉伸3-5分钟。避免跑前静态拉伸！',detail:'跑前动态热身提高肌肉温度，激活神经系统。跑后拉伸帮助恢复，减少延迟性肌肉酸痛。',source:'美国运动医学学会'},
  {updateWeekly:true,title:'跑鞋选购指南',cat:'装备',summary:'根据足型、跑法、跑量选鞋。缓震鞋适合新手，赛鞋适合比赛，训练鞋日常使用。建议800公里更换一双。',detail:'选鞋要点：1)半码到一码的前掌空间；2)试穿时穿跑步袜；3)下午试鞋（脚会腨胀）。',source:'《Runner\'s World》跑鞋指南'},
  {title:'跑步饮食营养',cat:'进阶',summary:'跑前2小时进食碳水化合物（香蕉/全麦面包）。跑后30分钟内补充蛋白质+碳水。每日保证充足水分摄入。',detail:'长距离跑需要补充电解质，建议携带能量胶。日常多摄入蔬菜水果确保维生素充足。',source:'国际运动营养学会'},
  {title:'常见跑步伤病预防',cat:'安全',summary:'肫尾板综合症、跑者膝、足底筋膜炎是最常见的三种跑步伤病。核心预防：循序渐进增量+力量训练。',detail:'10%规则：每周跑量增加不超过10%。如果疼痛持续超过3天或影响步态，应就医。',source:'《跑步伤病防治》'},
  {title:'间歇训练法',cat:'进阶',summary:'高强度跑+短暂停，例如4×800米间歇跑，每组间歇2-3分钟。提升最大摄氧量和速度耐力。',detail:'间歇训练适合已有3个月以上基础的跑者。每周1-2次，勿连续两天。',source:'《丹尼尔斯跑步公式》'},
  {title:'心率训练法',cat:'专业',summary:'根据最大心率分区训练：E区(60-70%有氧)、M区(70-80%节奏跑)、T区(80-90%临界速度)、I区(90-100%间歇)。',detail:'多数训练应在E区，约80%时间。心率监测可用胸带或手表。配速策略建议参考丹尼尔斯理论。',source:'《丹尼尔斯跑步公式》'},
  {title:'坡道跑技巧',cat:'进阶',summary:'上坡缩短步幅、保持节奏，下坡控制速度、避免刹车。坡道跑能增强臀部和大腿后侧力量。',detail:'坡度训练建议先从5-8%的缓坡开始，逐渐增加坡度和距离。',source:'《Trail Running Magazine》'},
  {title:'夜跑安全指南',cat:'安全',summary:'穿反光/发光装备，选择照明充足路段，逆向行走（面向来车）。携带手机和身份证明。告知朋友路线。',detail:'夜跑时避免戴耳机，这会降低对周围环境的警觉。推荐结伴而行。',source:'中国跑步协会'},
  {title:'晨跑 vs 夜跑',cat:'入门',summary:'晨跑提神醒脑但需充分热身，夜跑放松压力但注意安全。根据个人生物钟和作息选择。',detail:'研究表明下午4-6点是人体运动表现最佳时段，但日常作息可能不允许。选择能持续坚持的时间段最重要。',source:'《运动生理学》'},
  {updateWeekly:true,title:'马拉松备赛指南',cat:'专业',summary:'提前16-20周开始备战。每周跑量逐步增加至峰值，赛前3周减量。最长训练32-35公里。碳负荷策略可选。',detail:'关键数据：周跑量、长距离训练、节奏跑、力量训练。赛前一周多摄入碳水。比赛日早餐提前2-3小时进食。',source:'《Advanced Marathoning》'},
  {title:'越野跑入门',cat:'进阶',summary:'从轻度徒步开始，逐渐过渡到越野跑。装备：越野跑鞋+水袋背包。注意路标辨认和天气。',detail:'越野跑对核心和踝关节稳定性要求更高。建议先在公园土路练习，再尝试山地路线。',source:'《Trail Runner》杂志'},
  {title:'跑步心理训练',cat:'进阶',summary:'正念、目标分解、可视化训练。通过心理技巧克服“撞墙”，提高比赛表现。',detail:'关键技巧：1)把距离拆解为小段；2)使用正面自我对话；3)建立跑步仪式感。',source:'《跑步心理学》'},
  {updateWeekly:true,title:'跑后恢复策略',cat:'安全',summary:'充分睡眠是最佳恢复。8小时以上。泡沫、按摩、压缩裤辅助。活动恢复比完全休息更好。',detail:'跑后补充蛋白质+碳水以加速恢复。主动恢复活动（如慢走、轻度游泳）更能促进血液循环清除代谢产物。',source:'《运动恢复学》'},
  {title:'跑者力量训练',cat:'进阶',summary:'每周2次全身力量训练：深蹲、硬拉、缩蹬、核心训练。力量能预防伤病并提高跑步经济性。',detail:'重点肌肉群：臀肌、股四头肌、脚踝、核心群。不必追求大重量，较高次数中等负荷更适合跑者。',source:'《Strength Training for Runners》'},
  {title:'配速策略与战术',cat:'专业',summary:'均速跑或负分割策略。前半程保守，后半程根据感觉加速。掌握不同比赛距离的配速策略。',detail:'5K比赛可用正分割：前3K保持目标配速，后2K全力加速。全马建议负分割（后半比前半快）。',source:'《竞技跑步战术》'},
  {title:'比赛日准备清单',cat:'装备',summary:'赛前1天：领取参赛包、准备装备、早睡。赛当天：提前2小时到达、涂凡士林、热身。',detail:'必备清单：参赛服、跑鞋、号码布、能量胶、盐丸、防晒、手机+充电宝。赛前不要尝试新装备或新食物。',source:'《马拉松完全指南》'},
  {title:'跑步装备清单',cat:'装备',summary:'必备装备：跑鞋、速干衣、跑步袜。可选装备：心率带/手表、水袋、能量胶、反光装备。根据跑量和天气调整。',detail:'入门套装预算约500-1500元。优先级：跑鞋>跑步衣物>监测设备>配件。夏季注意防晒，冬季注意保暖分层穿着。',source:'《Runner\'s World》装备专题'},\n  {title:'夏季&冬季跑步要点',cat:'安全',summary:'夏季：避开正午，多补水，穿透气速干衣物。冬季：三层穿衣法，充分热身，注意路面结冰。',detail:'夏季体感温度超过32℃时建议取消室外跑步。冬季戒指温度低于-15℃时可以在室内跑步机上训练。',source:'中国跑步协会安全指南'}
];

function renderKnowledge(){
  const search=document.getElementById('knowledgeSearch').value.trim();
  const list=document.getElementById('knowledgeList'),results=document.getElementById('knowledgeSearchResults');
  if(search){results.style.display='block';list.style.display='none';doKnowledgeSearch();return}
  results.style.display='none';list.style.display='block';
  const userKnow=knowledgeData();
  const all=[...userKnow.map(k=>({...k,user:true})),...builtinKnowledge.map((k,i)=>({...k,id:'bk'+i,user:false}))];
  list.innerHTML=all.map(k=>{
    const catColor={'入门':'#3498db','进阶':'#9b59b6','专业':'#e74c3c','安全':'#2ecc71','装备':'#f39c12'};
    const iconMap={'入门':'📖','进阶':'💪','专业':'🏆','安全':'🛡️','装备':'👟'};
    const color=catColor[k.cat]||'#8888a0';
    const userBadge=k.user?'<span style="font-size:0.65rem;background:var(--accent);color:#fff;padding:2px 6px;border-radius:6px;margin-left:6px">用户</span>':'';
    const weeklyTag=k.updateWeekly?' <span class="weekly-badge" style="margin-left:6px;font-size:0.6rem;padding:2px 8px">本周更新</span>':'';
    return '<div class="knowledge-card'+(k.updateWeekly?' featured':'')+'" onclick="toggleKnowledgeDetail(this)"><div class="kc-header"><div class="kc-icon" style="background:'+color+'20">'+(iconMap[k.cat]||'📚')+'</div><div class="kc-title">'+esc(k.title)+userBadge+weeklyTag+'</div><span class="kc-category" style="background:'+color+'20;color:'+color+'">'+esc(k.cat)+'</span></div><div class="kc-summary">'+esc(k.summary)+'</div><div class="kc-detail">'+esc(k.detail||k.summary)+'<div class="kc-source">来源: '+esc(k.source||'用户分享')+(k.location?' | 📍 '+esc(k.location):'')+(k.author?' | 作者: '+esc(k.author):'')+'</div></div></div>';
  }).join('');
}

function toggleKnowledgeDetail(el){el.querySelector('.kc-detail').classList.toggle('show')}

function doKnowledgeSearch(){
  const q=document.getElementById('knowledgeSearch').value.trim().toLowerCase();
  const results=document.getElementById('knowledgeSearchResults'),list=document.getElementById('knowledgeList');
  if(!q){renderKnowledge();return}
  results.style.display='block';list.style.display='none';
  const userKnow=knowledgeData(),posts=postData();
  const allKnow=[...userKnow.map(k=>({...k,user:true})),...builtinKnowledge.map((k,i)=>({...k,id:'bk'+i,user:false}))];
  const matchedKnow=allKnow.filter(k=>(k.title+k.summary+k.detail+k.cat).toLowerCase().includes(q));
  const matchedPosts=posts.filter(p=>(p.text+(p.author||'')).toLowerCase().includes(q));
  let html='';
  if(matchedKnow.length){html+='<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">📚 知识匹配 ('+matchedKnow.length+')</div>';matchedKnow.forEach(k=>{html+='<div class="knowledge-card" onclick="toggleKnowledgeDetail(this)"><div class="kc-header"><div class="kc-title">'+esc(k.title)+'</div><span class="kc-category">'+esc(k.cat)+'</span></div><div class="kc-summary">'+esc(k.summary)+'</div><div class="kc-detail">'+esc(k.detail||k.summary)+'</div></div>'});}
  if(matchedPosts.length){html+='<div style="font-size:0.8rem;color:var(--text-muted);margin:12px 0 8px">💬 社区动态匹配 ('+matchedPosts.length+')</div>';matchedPosts.forEach(p=>{html+='<div class="post-card"><div class="post-header"><div class="post-avatar">'+esc(p.author).charAt(0)+'</div><div class="post-meta"><strong>'+esc(p.author)+'</strong></div></div><div class="post-body">'+esc(p.text)+'</div></div>'});}
  if(!matchedKnow.length&&!matchedPosts.length)html='<div class="empty-state"><p>未找到匹配结果</p></div>';
  results.innerHTML=html;
}

function openAddKnowledge(){
  document.getElementById('knowledgeModalBg').classList.add('show');
  document.getElementById('knowTitle').value='';document.getElementById('knowContent').value='';
  document.getElementById('knowCategory').value='入门';
  knowledgePhoto='';document.getElementById('knowPhotoPreview').innerHTML='';
  document.getElementById('knowLocation').value='';document.getElementById('knowHideLoc').checked=false;
}

function closeKnowledgeModal(){document.getElementById('knowledgeModalBg').classList.remove('show')}

function publishKnowledge(){
  const title=document.getElementById('knowTitle').value.trim(),content=document.getElementById('knowContent').value.trim();
  if(!title||!content){toast('请填写标题和内容');return}
  const cat=document.getElementById('knowCategory').value;
  const hideLoc=document.getElementById('knowHideLoc').checked;
  const loc=hideLoc?'':document.getElementById('knowLocation').value.trim();
  const kl=knowledgeData();
  kl.unshift({title,summary:content.slice(0,100)+(content.length>100?'...':''),detail:content,cat,source:'用户分享',author:currentUser,location:loc,photo:knowledgePhoto,time:Date.now(),likes:[]});
  save(KNOWLEDGE_KEY,kl);
  closeKnowledgeModal();
  toast('知识帖发布成功！');
  renderKnowledge();
}

/* ================================================================
   LOCATION DETECT
   ================================================================ */
function detectLocation(type){
  if(!navigator.geolocation){toast('不支持地理定位');return}
  navigator.geolocation.getCurrentPosition(pos=>{
    fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+pos.coords.latitude+'&lon='+pos.coords.longitude+'&accept-language=zh')
    .then(r=>r.json()).then(data=>{
      const city=data.address&&(data.address.city||data.address.town||data.address.county||data.address.state||'');
      const dest=type==='community'?document.getElementById('communityLocation'):document.getElementById('knowLocation');
      if(dest&&city)dest.value=city;
    }).catch(()=>{toast('定位失败，请手动输入');});
  },()=>{toast('无法获取位置权限');},{enableHighAccuracy:false,timeout:5000});
}

/* ================================================================
   PROFILE
   ================================================================ */
function renderProfile(){
  const ud=userData(),data=runData(),streaks=calcStreaks(data);
  document.getElementById('profileName').textContent=ud.name||currentUser;
  document.getElementById('profileBio').textContent=ud.bio||'坚持跑步，热爱生活';
  document.getElementById('profileMotto').textContent=ud.motto?'「'+ud.motto+'」':'';
  document.getElementById('psCurrentStreak').textContent=streaks.current;
  document.getElementById('psLongestStreak').textContent=streaks.longest;
  document.getElementById('psDays').textContent=ud.totalDays||0;
  document.getElementById('psDist').textContent=(ud.totalDist||0).toFixed(1);
  document.getElementById('psPosts').textContent=postData().filter(p=>p.author===currentUser).length;
  document.getElementById('psLongestDist').textContent=(ud.longestDist||0).toFixed(1);
  document.getElementById('psTotalDur').textContent=Math.floor((ud.totalDur||0)/60)+'h'+(ud.totalDur||0)%60+'min';
  if(ud.totalDist>0&&ud.totalDur>0){document.getElementById('psAvgPace').textContent=(ud.totalDur/ud.totalDist).toFixed(1)+'分/km'}
  else document.getElementById('psAvgPace').textContent='--';
  const av=avatarData()||getUserAvatar(currentUser);
  const pa=document.getElementById('profileAvatar');
  if(av){pa.innerHTML='<img src="'+escAttr(av)+'"><div class="edit-badge">✎</div>'}else pa.innerHTML='R<div class="edit-badge">✎</div>';
  renderMiniCalendar();
  updateAvatarGlobally();
}

function renderMiniCalendar(){
  const grid=document.getElementById('monthMiniCal'),data=runData(),now=new Date();
  const y=now.getFullYear(),m=now.getMonth(),firstDay=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  let html='';
  for(let i=0;i<firstDay;i++)html+='<div class="mcell"></div>';
  for(let d=1;d<=days;d++){const dk=dateKey(new Date(y,m,d));html+='<div class="mcell'+(data[dk]?' cked':'')+'">'+d+'</div>'}
  grid.innerHTML=html;
}

function openProfileEdit(){
  const ud=userData();
  document.getElementById('editName').value=ud.name||currentUser;
  document.getElementById('editBio').value=ud.bio||'';
  document.getElementById('editMotto').value=ud.motto||'';
  document.getElementById('profileModalBg').classList.add('show');
}

function closeProfileEdit(){document.getElementById('profileModalBg').classList.remove('show')}

function saveProfile(){
  const ud=userData();
  ud.name=document.getElementById('editName').value.trim()||currentUser;
  ud.bio=document.getElementById('editBio').value.trim()||'坚持跑步，热爱生活';
  ud.motto=document.getElementById('editMotto').value.trim();
  save(UK(),ud);
  closeProfileEdit();
  renderProfile();renderCheckin();
  toast('资料已保存');
}

/* ================================================================
   AVATAR
   ================================================================ */
const presetAvatars=[
  '<svg viewBox="0 0 64 64"><circle cx="32" cy="16" r="12" fill="#ff6b35"/><ellipse cx="32" cy="52" rx="20" ry="16" fill="#ff6b35"/><line x1="32" y1="36" x2="32" y2="24" stroke="#fff" stroke-width="3"/><line x1="32" y1="36" x2="22" y2="48" stroke="#fff" stroke-width="3"/><line x1="32" y1="36" x2="42" y2="48" stroke="#fff" stroke-width="3"/></svg>',
  '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#e74c3c"/><circle cx="32" cy="22" r="6" fill="#fff"/><path d="M20 36 Q32 46 44 36" stroke="#fff" stroke-width="3" fill="none"/></svg>',
  '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#3498db"/><circle cx="24" cy="24" r="5" fill="#fff"/><circle cx="40" cy="24" r="5" fill="#fff"/><path d="M22 42 Q32 50 42 42" stroke="#fff" stroke-width="3" fill="none"/></svg>',
  '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="28" fill="#2ecc71"/><text x="32" y="42" text-anchor="middle" font-size="28" fill="#fff" font-weight="bold">⚡</text></svg>',
  '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="28" fill="#9b59b6"/><text x="32" y="42" text-anchor="middle" font-size="28" fill="#fff" font-weight="bold">🏃</text></svg>',
  '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="28" fill="#f39c12"/><text x="32" y="42" text-anchor="middle" font-size="28" fill="#fff" font-weight="bold">🏆</text></svg>',
  '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="28" fill="#1abc9c"/><text x="32" y="42" text-anchor="middle" font-size="28" fill="#fff" font-weight="bold">🌟</text></svg>',
  '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="28" fill="#e67e22"/><text x="32" y="42" text-anchor="middle" font-size="28" fill="#fff" font-weight="bold">🔥</text></svg>',
  '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="28" fill="#2980b9"/><text x="32" y="42" text-anchor="middle" font-size="28" fill="#fff" font-weight="bold">💪</text></svg>',
  '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="28" fill="#8e44ad"/><text x="32" y="42" text-anchor="middle" font-size="28" fill="#fff" font-weight="bold">🌍</text></svg>',
  '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="28" fill="#27ae60"/><text x="32" y="42" text-anchor="middle" font-size="28" fill="#fff" font-weight="bold">✈️</text></svg>',
  '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="28" fill="#c0392b"/><text x="32" y="42" text-anchor="middle" font-size="28" fill="#fff" font-weight="bold">👟</text></svg>',
];

function openAvatarPicker(){
  avatarTemp=avatarData();
  const grid=document.getElementById('avatarGrid');
  grid.innerHTML=presetAvatars.map((svg,i)=>'<div class="avatar-option'+(avatarTemp===svg?' selected':'')+'" onclick="pickPresetAvatar('+i+')"><div style="width:56px;height:56px;border-radius:50%;overflow:hidden">'+svg+'</div></div>').join('');
  document.getElementById('avatarPickerOverlay').classList.add('show');
}

function pickPresetAvatar(i){avatarTemp=presetAvatars[i];highlightAvatarOption(i)}
function highlightAvatarOption(idx){
  document.querySelectorAll('.avatar-option').forEach(o=>o.classList.remove('selected'));
  if(idx>=0)document.querySelectorAll('.avatar-option')[idx].classList.add('selected');
}

function confirmAvatar(){
  save(AK(),avatarTemp);
  const uname=currentUser;if(!isGuest&&uname){const u=getUsers();if(!u[uname])u[uname]={password:'',createdAt:Date.now()};u[uname].avatar=avatarTemp;saveUsers(u)}
  closeAvatarPicker();
  updateAvatarGlobally();
  renderProfile();renderCheckin();
  toast('头像已更新');
}

function closeAvatarPicker(){document.getElementById('avatarPickerOverlay').classList.remove('show')}

function updateAvatarGlobally(){
  const av=avatarData()||getUserAvatar(currentUser);
  const uba=document.getElementById('userBarAvatar');
  if(av){uba.innerHTML='<img src="'+escAttr(av)+'">'}else{uba.textContent=(currentUser||'R').charAt(0).toUpperCase()}
  document.getElementById('userBarName').textContent=isGuest?'游客('+currentUser+')':userData().name||currentUser;
  if(isGuest){document.getElementById('guestBadge').style.display='inline-flex';document.getElementById('guestLoginBtn').style.display='inline-block';document.getElementById('guestRegBtn').style.display='inline-block'}
  else{document.getElementById('guestBadge').style.display='none';document.getElementById('guestLoginBtn').style.display='none';document.getElementById('guestRegBtn').style.display='none'}
}

/* ================================================================
   USER PROFILE POPUP
   ================================================================ */
function showUserProfile(uname){
  if(!uname)return;
  const users=getUsers();const entry=users[uname];
  if(!entry){toast('用户不存在');return}
  document.getElementById('popupName').textContent=uname;
  document.getElementById('popupBio').textContent='';
  const av=entry.avatar||'';
  const pa=document.getElementById('popupAvatar');
  if(av)pa.innerHTML='<img src="'+escAttr(av)+'">';else pa.textContent=uname.charAt(0).toUpperCase();
  document.getElementById('popupStreak').textContent='--';document.getElementById('popupLongestStreak').textContent='--';
  document.getElementById('popupDays').textContent=entry.totalDays||0;
  document.getElementById('popupDist').textContent=(entry.totalDist||0).toFixed(1);
  const ageDays=Math.floor((Date.now()-entry.createdAt)/(86400000));
  document.getElementById('popupAge').textContent='跑龄: '+(ageDays<1?'不到1天':ageDays+'天');
  const posts=postData();const userPosts=posts.filter(p=>p.author===uname).slice(0,2);
  document.getElementById('popupRecent').textContent=userPosts.length?'最近动态: '+userPosts.map(p=>p.text.slice(0,40)).join('； '):'暂无动态';
  document.getElementById('profilePopup').classList.add('show');
}
function closeProfilePopup(){document.getElementById('profilePopup').classList.remove('show')}

/* ================================================================
   PROMOTION
   ================================================================ */
function renderPromotion(){
  renderPromotionStats();
  renderLeaderboard();
  renderWeeklyChart();
}

function renderPromotionStats(){
  const users=getUsers();const userCount=Object.keys(users).length;
  let totalCheckins=0,totalDist=0;
  Object.values(users).forEach(u=>{totalCheckins+=u.totalDays||0;totalDist+=u.totalDist||0});
  const now=new Date();const mau=Object.values(users).filter(u=>u.updatedAt&&(now-Date.parse(new Date(u.updatedAt)))/(86400000)<=30).length;
  document.getElementById('promoUsers').textContent=userCount+(isGuest?0:0);
  document.getElementById('promoCheckins').textContent=totalCheckins;
  document.getElementById('promoDist').textContent=totalDist.toFixed(0)+' km';
  document.getElementById('promoMAU').textContent=mau;
}

function renderLeaderboard(){
  const users=getUsers();
  const sorted=Object.entries(users).sort((a,b)=>(b[1].totalDist||0)-(a[1].totalDist||0)).slice(0,10);
  const maxDist=sorted.length?sorted[0][1].totalDist||0:1;
  const el=document.getElementById('promoLeaderboard');
  if(!sorted.length){el.innerHTML='<div class="empty-state"><p>还没有数据</p></div>';return}
  el.innerHTML=sorted.map(([name,data],i)=>{
    const rank=i+1,dist=(data.totalDist||0).toFixed(1);
    let rankCls='normal';if(rank===1)rankCls='top1';else if(rank===2)rankCls='top2';else if(rank===3)rankCls='top3';
    const pct=maxDist>0?(data.totalDist||0)/maxDist*100:0;
    const av=data.avatar||'';
    return '<div class="leaderboard-item"><div class="leaderboard-rank '+rankCls+'">'+rank+'</div><div class="post-avatar" style="width:30px;height:30px;font-size:0.7rem;cursor:pointer" onclick="showUserProfile(\''+escAttr(name)+'\')">'+(av?'<img src="'+escAttr(av)+'">':name.charAt(0))+'</div><div style="flex:1;font-size:0.85rem">'+esc(name)+'</div><div style="font-size:0.82rem;font-weight:600;color:var(--accent);min-width:50px;text-align:right">'+dist+' km</div><div class="leaderboard-bar-wrap" style="max-width:60px"><div class="leaderboard-bar" style="width:'+pct+'%"></div></div></div>';
  }).join('');
}

function renderWeeklyChart(){
  const el=document.getElementById('weeklyChart');
  const days=['周一','周二','周三','周四','周五','周六','周日'];
  const now=new Date(),dow=now.getDay(),monday=new Date(now);monday.setDate(now.getDate()-(dow===0?6:dow-1));
  const data=runData();const vals=[];
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);const k=dateKey(d);vals.push(data[k]?data[k].dist||0:0)}
  const maxV=Math.max(...vals,1);
  el.innerHTML=vals.map((v,i)=>'<div class="chart-bar-col"><div class="chart-bar" style="height:'+(v/maxV*120+8)+'px" title="'+v.toFixed(1)+' km"></div><div class="chart-bar-label">'+days[i]+'</div></div>').join('');
}

function inviteFriend(){
  navigator.clipboard.writeText('https://runtrack.app/invite?ref='+(currentUser||'runner')).then(()=>toast('邀请链接已复制！')).catch(()=>toast('复制失败，请手动复制'));
}

/* ================================================================
   SHARE CARD (Canvas)
   ================================================================ */
function showShareCard(record,dateKey){
  const modal=document.getElementById('shareModalBg');
  modal.classList.add('show');
  const c=document.getElementById('shareCanvas'),ctx=c.getContext('2d');
  constW=c.width,H=c.height;
  // Background
  if(record.photo){
    const img=new Image();img.onload=function(){
      ctx.drawImage(img,0,0,W,200);
      const grad=ctx.createLinearGradient(0,160,0,200);
      grad.addColorStop(0,'transparent');grad.addColorStop(1,'#0f0f14');
      ctx.fillStyle=grad;ctx.fillRect(0,160,W,40);
      drawTopAndData();
    };img.src=record.photo;
    function drawTopAndData(){ctx.fillStyle='#0f0f14';ctx.fillRect(0,200,W,H-200);drawCardContent(200)}
  }else{ctx.fillStyle='#0f0f14';ctx.fillRect(0,0,W,H);drawCardGradient();drawCardContent(0)}
  function drawCardGradient(){
    const g1=ctx.createLinearGradient(0,0,W,0);g1.addColorStop(0,'#ff6b35');g1.addColorStop(0.5,'#e55a2b');g1.addColorStop(1,'#ff6b35');
    ctx.fillStyle=g1;ctx.fillRect(0,0,W,4);
  }
  function drawCardContent(yOff){
    // Avatar
    const av=avatarData()||getUserAvatar(currentUser);
    ctx.save();ctx.beginPath();ctx.arc(40,yOff+40,26,0,Math.PI*2);ctx.closePath();ctx.clip();
    if(av){const avImg=new Image();avImg.onload=()=>{ctx.drawImage(avImg,14,yOff+14,52,52);drawText()};avImg.src=av}
    else{ctx.fillStyle='#ff6b35';ctx.fillRect(14,yOff+14,52,52);ctx.fillStyle='#fff';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText((currentUser||'R').charAt(0),40,yOff+52);drawText()}
    function drawText(){
      ctx.restore();
      // Username + date
      ctx.fillStyle='#e2e2e8';ctx.font='bold 18px sans-serif';ctx.textAlign='left';
      ctx.fillText(currentUser||'跑步者',80,yOff+50);
      ctx.font='11px sans-serif';ctx.fillStyle='#8888a0';ctx.fillText(dateKey,80,yOff+66);
      // Big distance
      ctx.fillStyle='#ff6b35';ctx.font='bold 64px sans-serif';ctx.textAlign='center';
      ctx.fillText(record.dist.toFixed(1),W/2,yOff+154);
      ctx.fillStyle='#e2e2e8';ctx.font='14px sans-serif';ctx.fillText('km',W/2+60,yOff+154);
      // Stats row
      ctx.fillStyle='#e2e2e8';ctx.font='15px sans-serif';ctx.textAlign='center';
      ctx.fillText(record.dur+' min',W/2-100,yOff+210);
      ctx.fillText(record.cal+' kcal',W/2,yOff+210);
      ctx.fillText((record.dur>0?(record.dur/record.dist).toFixed(1):'--')+' /km',W/2+100,yOff+210);
      ctx.fillStyle='#8888a0';ctx.font='10px sans-serif';
      ctx.fillText('用时',W/2-100,yOff+226);ctx.fillText('卡路里',W/2,yOff+226);ctx.fillText('配速',W/2+100,yOff+226);
      // Divider
      ctx.strokeStyle='#2a2a38';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(30,yOff+250);ctx.lineTo(W-30,yOff+250);ctx.stroke();
      // Signature
      const ud=userData();
      ctx.fillStyle='#e2e2e8';ctx.font='italic 13px sans-serif';ctx.textAlign='center';
      ctx.fillText(ud.motto?'「'+ud.motto+'」':'「每一步都算数」',W/2,yOff+280);
      // Footer
      ctx.fillStyle='#8888a0';ctx.font='10px sans-serif';ctx.textAlign='center';
      ctx.fillText('记录于 RunTrack · '+new Date().toLocaleDateString('zh-CN'),W/2,H-20);
    }
  }
}

function downloadShareCard(){
  const c=document.getElementById('shareCanvas');
  const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='runtrack_'+Date.now()+'.png';a.click();
}

function copyShareLink(){navigator.clipboard.writeText('我今天跑了 X km！来 RunTrack 一起打卡吧！').then(()=>toast('已复制')).catch(()=>toast('复制失败'))}
function closeShareModal(e){if(e&&e.target!==e.currentTarget)return;document.getElementById('shareModalBg').classList.remove('show')}

/* ================================================================
   CLEAR DATA
   ================================================================ */
function clearAllData(){
  if(!confirm('确定清除所有数据？此操作不可撤销！'))return;
  const rk=RK(),uk=UK(),sk=SK(),ak=AK();
  if(isGuest){sessionStorage.removeItem('guest_'+rk);sessionStorage.removeItem('guest_'+uk);sessionStorage.removeItem('guest_'+sk);sessionStorage.removeItem('guest_'+ak)}
  else{localStorage.removeItem(rk);localStorage.removeItem(uk);localStorage.removeItem(sk);localStorage.removeItem(ak)}
  toast('数据已清除');
  renderCheckin();renderProfile();
}

/* ================================================================
   INIT
   ================================================================ */
function initApp(){
  try{
    document.getElementById('authOverlay').style.display='none';
    document.getElementById('mainApp').style.display='block';
    document.getElementById('bottomNav').style.display='block';
    updateAvatarGlobally();
    renderCheckin();renderPosts();renderKnowledge();renderProfile();
    const posts=postData();
    if(!posts.length){
      const seed=[{id:1,author:'跑步达人',avatar:'',text:'今天早上跑了10公里，舒服！大家今天跑了吗？',images:[],location:'北京·朝阳',streak:30,time:Date.now()-86400000*2,runData:{dist:10,dur:55,cal:550},likes:[],comments:[]},
      {id:2,author:'健身爱好者',avatar:'',text:'刚入门跑步，求推荐好的跑鞋！',images:[],location:'上海',streak:5,time:Date.now()-86400000,likes:[],comments:[{author:'跑步达人',text:'推荐亚瑟士 GEL-Nimbus~',time:Date.now()-80000}]},
      {id:3,author:'马拉松备战中',avatar:'',text:'今天完成35公里LSD，距离比赛还有一个月，加油！',images:[],location:'广州·天河',streak:180,time:Date.now()-3600000,runData:{dist:35,dur:190,cal:1925},likes:[],comments:[]}];
      save(POSTS_KEY,seed);
    }
    renderPosts();
  }catch(e){toast('页面加载出错，请刷新重试');}
}

// Init: 默认游客模式直接进入，登录注册为可选弹窗
(function(){
  // 尝试恢复登录会话
  try {
    const session=load(SESSION_KEY);
    if(session&&session.user&&session.time&&Date.now()-session.time<86400000*7){
      currentUser=session.user;isGuest=false;
      document.getElementById('authOverlay').style.display='none';
      document.getElementById('mainApp').style.display='block';
      document.getElementById('bottomNav').style.display='block';
      initApp();
      return;
    }
  }catch(e){localStorage.removeItem(SESSION_KEY);}

  // 默认游客模式
  try {
    currentUser='游客'+Math.random().toString(36).slice(2,6);
    isGuest=true;
    document.getElementById('authOverlay').style.display='none';
    document.getElementById('mainApp').style.display='block';
    document.getElementById('bottomNav').style.display='block';
    initApp();
  }catch(e){
    // 极端情况：直接显示登录页
    document.getElementById('authOverlay').style.display='flex';
    document.getElementById('mainApp').style.display='none';
    document.getElementById('bottomNav').style.display='none';
  }

  // Enter key support
  try{
    document.getElementById('loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
    document.getElementById('regPass2').addEventListener('keydown',e=>{if(e.key==='Enter')doRegister()});
  }catch(e){}
})();
