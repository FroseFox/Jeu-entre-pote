'use strict';
const $=id=>document.getElementById(id);
const storageKey='rr-inc-web-1';
const defaultOptions={sound:false,volume:35,dark:false,zoom:1,maxPeople:95,streetSize:0};
let state=newRun(),options={...defaultOptions},angle=.27,speed=0,waiting=0,turnPart=0;
let paused=false,tab='equip',audioContext=null,toastTimer=0,toastToken=0,storageOK=true,importing=false;
const positive=n=>Number.isFinite(n)&&n>=0;
function freshRuntime(){return {routes:{bus:0,train:0,air:0},balloonClock:0,gulp:0,charge:0,rush:0,opening:0,deliveryClock:0,upgradeAge:0,manual:0,drawPhase:0,adminClock:0,heliClock:0,eventIndex:0}}
let runtime=freshRuntime(),savedSession=null;
function restore(){
 try{
  const data=JSON.parse(localStorage.getItem(storageKey)||'null');if(!data||![1,2].includes(data.version))return;
  const prev=data.state;
  for(const k of ['cash','admitted','earned','seconds','turns','flings','bestCombo','energy','runs','allTime'])if(positive(prev[k]))state[k]=prev[k];
  for(const u of catalog)if(positive(prev.levels?.[u.id]))state.levels[u.id]=Math.min(200,Math.floor(prev.levels[u.id]));
  for(const k of Object.keys(state.perks))if(positive(prev.perks?.[k]))state.perks[k]=Math.floor(prev.perks[k]);
  state.finished=!!prev.finished;state.contract=['economy','premium','crowd'].includes(prev.contract)?prev.contract:'';
  for(const key of ['branchRuns','branchSeconds','branchNumber','trust','tickets','drawClock','balloonsPopped','deliveries'])if(positive(prev[key]))state[key]=prev[key];
  state.branchNumber=Math.max(1,state.branchNumber);state.branch=branches.includes(prev.branch)?prev.branch:'main';
  if(data.version===1){state.branchRuns=state.runs;state.branchSeconds=state.seconds}
  for(const id of ['bus','train','air']){const legacy=state.levels.route-(id==='bus'?0:id==='train'?1:3);state.routeLv[id]=positive(prev.routeLv?.[id])?Math.floor(prev.routeLv[id]):Math.max(0,legacy)}
  for(const k of ['skipped','collection','contracts','disabledContracts'])if(Array.isArray(prev[k]))state[k]=prev[k].filter(x=>typeof x==='string').slice(0,140);
  if(Array.isArray(prev.agencyRecord))state.agencyRecord=prev.agencyRecord.filter(v=>v&&branches.includes(v.site)&&positive(v.seconds)&&positive(v.points));
  if(prev.pendingPrize&&positive(prev.pendingPrize.amount)&&Number.isInteger(prev.pendingPrize.index)&&prev.pendingPrize.index<8&&prev.pendingPrize.index>=0)state.pendingPrize={index:prev.pendingPrize.index,amount:prev.pendingPrize.amount};
  for(const k of Object.keys(runtime))if(k!=='routes'&&positive(data.runtime?.[k]))runtime[k]=data.runtime[k];
  for(const id of ['bus','train','air'])if(positive(data.runtime?.routes?.[id]))runtime.routes[id]=data.runtime.routes[id];
  const o=data.options||{};options.sound=!!o.sound;options.dark=!!o.dark;
  if(positive(o.volume))options.volume=Math.min(100,o.volume);
  if(positive(o.zoom))options.zoom=Math.max(cameraStops[0],Math.min(1.5,o.zoom));
  if([45,95,180].includes(o.maxPeople))options.maxPeople=o.maxPeople;
  if([0,45,95,180,...crowdLimits].includes(o.streetSize))options.streetSize=o.streetSize;
  else if(o.maxPeople===45)options.streetSize=45;
  if(Number.isFinite(data.angle))angle=data.angle;
  if(positive(data.waiting))waiting=data.waiting;
  if(positive(data.turnPart))turnPart=data.turnPart%(Math.PI/2);
  // Older releases populated a brand-new idle game with 26 waiting customers.
  if(!data.session&&waiting===26&&!state.runs&&!state.turns&&!state.admitted&&state.seconds<1.35&&
     !Object.values(state.levels).some(Boolean))waiting=0;
  paused=!!data.paused;savedSession=data.session;
 }catch{storageOK=false}
}
function save(){
 if(importing)return;
 try{localStorage.setItem(storageKey,JSON.stringify(sessionSnapshot()));storageOK=true}catch{storageOK=false}
 $('save-label').textContent=storageOK?'Parties locales':'Sauvegarde indisponible';
}
restore();fillIcons();
const scene=new DoorScene($('world'));scene.maxPeople=options.maxPeople;
if(!savedSession?.world)scene.seed(waiting,state.admitted);
configureCrowd();
let rateEvents=[],spawnClock=0,transportClock=0,eventClock=0,restEvent=0,festival=0,repair=0,combo=0,comboClock=0;
let selectedItem=null,holding=null,pointer=null,keySpin=false,sessionClock=0,saveClock=0,uiClock=0,lastTime=0,frameClock=0;
const receipts=[];
let receiptSerial=0,treasuryTarget=null,targetBox=null;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
function receipt(amount){
 const last=receipts[receipts.length-1];
 if(last&&last.age<.24){last.money+=amount;return}
 receipts.push({money:amount,age:0,id:++receiptSerial,received:false})
}
function notify(msg,ms=2100){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);const id=++toastToken;toastTimer=setTimeout(()=>{if(id===toastToken)el.classList.remove('show')},ms)}
function tone(which){
 if(!options.sound||!options.volume)return;
 try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
 const ctx=audioContext,o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
 const f=which==='land'?110:which==='buy'?560:which==='coin'?360:which==='goal'?720:135;
 o.type=which==='spin'||which==='land'?'sine':'triangle';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(which==='land'?42:which==='spin'?77:f*1.3,t+.095);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.028*options.volume/100+.0001,t+.007);g.gain.exponentialRampToValueAtTime(.0001,t+.12);
 o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.13)}catch{}
}
function showDialog(title,html){$('dialog-title').textContent=title;$('dialog-body').innerHTML=html;fillIcons($('dialog-body'));if(!$('dialog').open)$('dialog').showModal();keySpin=false;holding=null;pointer=null}
$('close').onclick=()=>$('dialog').close();
$('dialog').addEventListener('click',e=>{if(e.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('dialog').close()}});
$('dialog').addEventListener('close',()=>{selectedItem=null});
function record(label,value,cls=''){return '<div class="record '+cls+'"><span>'+label+'</span><b>'+value+'</b></div>'}
function soundDisplay(){
 $('audio').innerHTML=icon(options.sound?'sound':'mute');let name=options.sound?'Couper le son':'Activer le son';$('audio').title=name;$('audio').setAttribute('aria-label',name);$('audio').setAttribute('aria-pressed',String(options.sound));
}
$('audio').onclick=()=>{options.sound=!options.sound;soundDisplay();if(options.sound)tone('coin');save()};
function controls(){
 $('live').classList.toggle('paused',paused);$('live').lastElementChild.textContent=paused?'En pause':'En activité';
 $('pause').innerHTML=icon(paused?'play':'pause')+'<span>'+(paused?'Reprendre':'Pause')+'</span>';$('pause').setAttribute('aria-label',paused?'Reprendre le jeu':'Mettre en pause');$('pause').setAttribute('aria-pressed',String(paused));
 $('zoomvalue').textContent=Math.round(options.zoom*100)+' %';document.documentElement.classList.toggle('dark',options.dark);soundDisplay()
}
function togglePause(){paused=!paused;keySpin=false;holding=null;pointer=null;controls();save()}
$('pause').onclick=togglePause;
function configureCrowd(){
 if([45,95,180].includes(options.streetSize)){
  options.maxPeople=options.streetSize;scene.maxPeople=options.maxPeople;
  // Keep guests and people crossing the door when reducing the old cap.
  let excess=scene.people.length-scene.maxPeople;
  for(let i=scene.people.length-1;i>=0&&excess>0;i--){
   const p=scene.people[i];
   if(p.type==='walk'&&p.mode!=='inside'&&p.mode!=='flung'){scene.people.splice(i,1);excess--}
  }
 }
 scene.crowd.limit=options.streetSize||crowdLimits[crowdLimits.length-1];
 scene.crowd.fixed=options.streetSize!==0;
 scene.crowd.init=false;
 scene.crowd.setPopulation(state,waiting,0)
}
function zoom(d){
 const next=Math.max(cameraStops[0],Math.min(1.5,d));
 if(Math.abs(next-options.zoom)<.0001)return;
 options.zoom=next;controls();scene.render(state,next);save()
}
function stepZoom(dir){
 const next=dir>0?cameraStops.find(n=>n>options.zoom+.001):cameraStops.slice().reverse().find(n=>n<options.zoom-.001);
 if(next!==undefined)zoom(next)
}
$('zoomin').onclick=()=>stepZoom(1);$('zoomout').onclick=()=>stepZoom(-1);$('zoomvalue').onclick=()=>zoom(1);
let lastTap=-Infinity,lastWheel=-Infinity;
function markTap(e){if(e.isPrimary!==false)lastTap=performance.now()}
for(const id of ['world','crank']){
 $(id).addEventListener('dblclick',e=>e.preventDefault());
 $(id).addEventListener('pointerup',markTap)
}
$('cards').addEventListener('dblclick',e=>e.preventDefault());
$('world').addEventListener('wheel',e=>{
 e.preventDefault();const now=performance.now();
 if(!e.deltaY||holding||pointer||now-lastTap<300||now-lastWheel<65)return;
 lastWheel=now;stepZoom(e.deltaY<0?1:-1)
},{passive:false});
function nextGoal(){return milestones.find(([goal])=>state.admitted<goal)||milestones[milestones.length-1]}
function updateHUD(){
 const [n,name]=nextGoal(),i=siteIndex(state);
 $('cash').textContent=fmt(state.cash);$('visits').textContent=fmt(state.admitted);$('flow').textContent=fmt(rateEvents.reduce((v,e)=>v+e.count,0));
 $('objective-name').textContent=state.finished?'Objectif accompli':name;$('objective-text').textContent='Accueillir '+fmt(n)+' visiteurs';
 $('objective-count').textContent=fmt(Math.min(n,state.admitted))+' / '+fmt(n);$('progress').style.width=Math.min(100,state.admitted/n*100)+'%';
 $('site-name').textContent=state.branch==='main'?sites[i]:branchNames[state.branch];$('siteline').textContent='Agence '+String(state.branchNumber).padStart(2,'0');
 const active=localEffects();$('timed-effects').textContent=active.join(' · ');$('timed-effects').hidden=!active.length;
 const showCombo=comboClock>0&&combo>0;$('combo-box').hidden=!showCombo;if(showCombo){$('combo-label').textContent='Éjection ×'+fmt(combo);$('combo-bonus').textContent='+'+Math.round(comboBonus()*100)+' %';$('combo-bar').style.width=Math.min(100,comboClock/(2.1+.3*state.perks.breath)*100)+'%'}
 $('gulp-info').hidden=!state.perks.gulp;if(state.perks.gulp)$('gulp-value').textContent=runtime.gulp>0?Math.ceil(runtime.gulp)+' s':Math.floor(runtime.charge)+' / 8 tours';
 $('draw-btn').hidden=!state.perks.draw;if(state.perks.draw)$('ticket-count').textContent=fmt(state.tickets);
 
}
function cardTemplate(u,i){
 const id=u.id,lvl=state.levels[id],max=lvl>=upgradeLimit(state,id),cost=price(state,u),network=id==='route'||(id==='promo'&&routesUnlocked());
 const tooltip=network?'Ouvrir les lignes de visiteurs':u.desc+' '+effectValue(state,id)+(max?'':' → '+predict(state,id));
 const body=network?'Lignes':max?'Maximum':'<i class="currency"></i>'+fmt(cost);
 return '<button class="card '+(!network&&!max&&state.cash>=cost?'ready':'')+'" data-buy="'+id+'" title="'+tooltip+'"><span class="cardTop"><span class="cardIcon">'+icon(u.icon)+'</span><span class="key">'+(state.perks.admin&&state.skipped.includes(id)?'Ⅱ':i+1)+'</span></span><strong>'+(id==='route'?'Réseau de visiteurs':u.name)+'</strong><span class="cardBottom"><span class="cost">'+body+'</span><span class="level">'+(network?'RÉSEAU':'NIV. '+lvl)+'</span></span></button>'

}
function managementCard(name,key,kind,val,unit,action){
 return '<button class="card" data-act="'+action+'"><span class="cardTop"><span class="cardIcon">'+icon(kind)+'</span><span class="key">'+key+'</span></span><strong>'+name+'</strong><span class="cardBottom"><span class="cost">'+val+'</span><span class="level">'+unit+'</span></span></button>'
}
function drawShop(){
 const us=tab==='equip'?catalog.slice(0,6):catalog.slice(6);let html=us.map(cardTemplate).join('');
 if(tab==='ops')html+=managementCard('Réouverture',4,'rotate','+'+availableEnergy(state),'ÉNERGIE','rebirth')+managementCard('Avantages',5,'award',fmt(state.energy),'ÉNERGIE','perks')+managementCard('Registre',6,'book',fmt(state.runs+1),'SESSION','ledger');
 $('cards').innerHTML=html;
}
let prevShopKey='';
function refreshShop(force=false){
 const set=tab==='equip'?catalog.slice(0,6):catalog.slice(6);
 const sig=[tab,routesUnlocked(),state.skipped.join(),...set.map(u=>state.levels[u.id]+':'+(state.cash>=price(state,u))),availableEnergy(state),state.energy,state.runs].join('/');
 if(force||sig!==prevShopKey){prevShopKey=sig;drawShop()}
}
function buy(id,fromDetail=false,fromNetwork=false,silent=false){
 const u=catalog.find(x=>x.id===id);if(!u)return false;
 if(id==='route'||(id==='promo'&&routesUnlocked()&&!fromNetwork)){routesPanel();return false}
 if(paused){notify('Reprenez la partie pour acheter.');return false}
 if(state.levels[id]>=upgradeLimit(state,id)){if(!silent)detail(u);return false}
 const cost=price(state,u);if(state.cash<cost){if(!silent)detail(u);return false}
 const before=effectValue(state,id);state.cash-=cost;state.levels[id]++;
 if(id==='promo'){waiting+=waveSize(state)*3;scene.arrive(4);if(state.levels.promo===1||state.levels.promo===3)scene.balloon()}
 if(id==='expand'&&signed(state,'expandParty'))runtime.opening=60;
 if(id==='blade')know('blade-'+state.levels.blade);
 if(fromDetail&&$('dialog').open)$('dialog').close();
 runtime.upgradeAge=1.1;
 if(!silent){notify(u.name+' · '+before+' → '+effectValue(state,id),2600);tone('buy')}
 refreshShop(true);updateHUD();save();return true
}
function detail(u){
 selectedItem=u;const max=state.levels[u.id]>=upgradeLimit(state,u.id),c=price(state,u),missing=Math.max(0,c-state.cash);showDialog(u.name,'<div class="pitch"><i class="cardIcon">'+icon(u.icon)+'</i><b>Niveau '+state.levels[u.id]+'</b></div><p>'+u.desc+'</p>'+record('Actuellement',effectValue(state,u.id))+(max?'':record('Prochain niveau',predict(state,u.id)))+record('Coût',max?'Maximum':fmt(c)+' crédits')+record('Trésorerie',fmt(state.cash)+' crédits')+'<button class="primary" id="buy-dialog" '+(missing||max?'disabled':'')+'>'+(max?'Niveau maximal':missing?'Encore '+fmt(missing)+' crédits':'Acheter')+'</button>');
 $('buy-dialog').onclick=()=>buy(u.id,true)
}
function ledger(){
 showDialog('Registre de l’entreprise',record('Établissement',sites[siteIndex(state)])+record('Visiteurs de cette session',fmt(state.admitted))+record('Recettes de cette session',fmt(state.earned))+record('Tours de porte',format.format(Math.floor(state.turns)))+record('Visiteurs éjectés',fmt(state.flings))+record('Meilleur combo','× '+fmt(state.bestCombo))+record('Réouvertures',fmt(state.runs))+record('Visiteurs au total',fmt(state.allTime+state.admitted))+record('Temps de jeu',Math.floor(state.seconds/60)+' min '+Math.floor(state.seconds%60)+' s')+record('Ballons éclatés',fmt(state.balloonsPopped))+record('Livraisons réussies',fmt(state.deliveries))+'<button class="secondary" id="to-gallery">Carnet de terrain</button><button class="secondary" id="to-office">Siège et contrats</button>');$('to-gallery').onclick=gallery;$('to-office').onclick=branchOffice
}
function goals(){
 const [active]=nextGoal();showDialog('Objectifs',milestones.map(([n,name])=>record(name,(state.admitted>=n?'✓ ':'')+fmt(n),n===active?'highlight':state.admitted>=n?'done':'')).join(''))
}
$('objective').onclick=goals;
function resetScene(){
 runtime=freshRuntime();
 speed=0;angle=.27;turnPart=0;waiting=0;combo=0;comboClock=0;restEvent=0;festival=0;repair=0;
 sessionClock=0;frameClock=0;spawnClock=0;transportClock=0;eventClock=0;rateEvents=[];receipts.length=0;
 holding=null;pointer=null;keySpin=false;options.streetSize=0;
 scene.time=0;scene.serial=0;scene.speed=0;scene.angle=angle;scene.effects={};
 scene.people=[];scene.cars=[];scene.bags=[];scene.balloons=[];scene.bursts=[];scene.labels=[];
 scene.crowd.reset();configureCrowd();scene.invalidate();paused=false;
 controls();updateHUD();refreshShop(true);scene.render(state,options.zoom);save()
}
function rebirth(){
 if(state.finished){branchOffice();return}const e=availableEnergy(state);if(!e){showDialog('Réouverture','<p>À partir de 1 000 visiteurs, vous pourrez rouvrir votre entreprise avec un nouveau contrat. L’énergie cumulée finance vos avantages permanents.</p>'+record('Visiteurs accueillis',fmt(state.admitted)+' / 1 000'));return}
 showDialog('Réouverture','<p>Vous recommencez avec une nouvelle porte et votre capital de départ. Vos avantages et votre registre sont conservés. Choisissez le contrat de votre prochaine session.</p>'+record('Énergie acquise','+'+fmt(e))+'<label class="option">Contrat<select id="contract"><option value="economy">Achats à −15 %</option><option value="premium">Recettes à +35 %</option><option value="crowd">Arrivées doublées</option></select></label><button class="primary" id="reopen">Rouvrir l’entreprise</button>');
 $('reopen').onclick=()=>{beginRun(state.branch,false,$('contract').value);perks()}
}
const management={rebirth,perks,ledger};
$('cards').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.buy)buy(b.dataset.buy);else management[b.dataset.act]?.()};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b))});refreshShop(true)});
$('cards').addEventListener('contextmenu',e=>{const id=e.target.closest('[data-buy]')?.dataset.buy;if(!id||!state.perks.admin)return;e.preventDefault();state.skipped=state.skipped.includes(id)?state.skipped.filter(k=>k!==id):[...state.skipped,id];refreshShop(true);save()});
$('journal').onclick=gallery;$('draw-btn').onclick=openPrizes;
function exportSave(){
 const json=JSON.stringify(sessionSnapshot());
 const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');
 a.href=url;a.download='round-and-round-sauvegarde.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)
}
function transferButtons(){
 return '<div class="save-pair"><button class="secondary" id="export-save">Exporter un fichier</button><button class="secondary" id="import-save">Importer un fichier</button></div><input type="file" id="save-file" accept=".json,application/json" hidden>'
}
function bindTransfer(back){
 $('export-save').onclick=exportSave;$('import-save').onclick=()=>$('save-file').click();
 $('save-file').onchange=e=>importSave(e.target.files[0],back)
}
async function importSave(file,back=settings){
 if(!file)return;
 try{
  if(file.size>1024*1024)throw Error();
  const json=await file.text(),data=JSON.parse(json);
  if(![1,2].includes(data.version)||!positive(data.state?.admitted)||!positive(data.state?.cash)||!data.state?.levels)throw Error();
  showDialog('Reprendre cette partie',record('Visiteurs admis',fmt(data.state.admitted))+record('Trésorerie',fmt(data.state.cash))+'<p>La partie actuelle sera conservée dans « Parties locales » avant le chargement.</p><button class="primary" id="accept-save">Charger cette partie</button><button class="secondary" id="cancel-save">Annuler</button>');
  $('cancel-save').onclick=back;$('accept-save').onclick=()=>{try{replaceCurrent(data)}catch{notify('Écriture de la sauvegarde impossible')}}
 }catch{notify('Fichier de sauvegarde invalide')}
}
function settings(){
 showDialog('Paramètres','<label class="option">Thème sombre<input id="dark-mode" type="checkbox" '+(options.dark?'checked':'')+'></label><label class="option">Effets sonores<input id="sound-mode" type="checkbox" '+(options.sound?'checked':'')+'></label><label class="option">Volume<input type="range" id="volume" min="0" max="100" value="'+options.volume+'"></label><label class="option">Foule dans la rue<select id="crowd"><option value="0">Selon l’affluence (jusqu’à 2 M)</option>'+[45,95,180,...crowdLimits].map(n=>'<option value="'+n+'">'+format.format(n)+' passants</option>').join('')+'</select></label><p class="subtle">La vue d’ensemble (bouton −) permet de voir les grandes foules. Les entrées et les recettes suivent la porte.</p><button class="secondary" id="open-slots">Parties locales</button><div class="tableLabel">Transférer une partie</div><p class="subtle">Utilisez un fichier pour reprendre votre progression sur un autre navigateur ou sur GitHub Pages.</p>'+transferButtons()+'<button class="secondary" id="reset">Nouvelle partie</button>');
 $('open-slots').onclick=()=>localSaves();bindTransfer(settings);
 $('dark-mode').onchange=e=>{options.dark=e.target.checked;controls();save()};$('sound-mode').onchange=e=>{options.sound=e.target.checked;soundDisplay();tone('coin');save()};$('volume').oninput=e=>{options.volume=Number(e.target.value);save()};$('volume').onchange=()=>tone('coin');
 $('crowd').value=String(options.streetSize);$('crowd').onchange=e=>{options.streetSize=Number(e.target.value);configureCrowd();scene.render(state,options.zoom);save()};
 $('reset').onclick=()=>{showDialog('Nouvelle partie','<p>Effacer cette sauvegarde et repartir dans la boutique de quartier avec une nouvelle porte ? Cette action efface également les avantages permanents.</p><button class="primary" id="confirm">Effacer et recommencer</button><button class="secondary" id="cancel">Garder ma partie</button>');$('confirm').onclick=()=>{state=newRun();resetScene();$('dialog').close();notify('Nouvelle partie')};$('cancel').onclick=settings}
}
$('saved-games').onclick=()=>localSaves();
$('settings').innerHTML=icon('settings');$('settings').onclick=settings;
$('help').onclick=()=>showDialog('Commandes','<p>Faites tourner la porte pour accueillir les visiteurs. Chaque entrée rapporte des crédits à dépenser dans l’atelier.</p>'+record('Tourner à la main','Tracer un cercle')+record('Donner une impulsion','Clic ou toucher')+record('Assistance de rotation','Maintenir Espace ou la porte')+record('Freiner','Tourner en sens inverse')+record('Éclater un ballon','Cliquer ou toucher')+record('Acheter dans l’atelier','Touches 1 à 6')+record('Pause / Reprendre','P')+record('Ajuster la vue','Molette ou + / −')+record('Fermer une fenêtre','Échap')+'<p class="credit">Adaptation web indépendante du jeu de Murbong. <a href="https://store.steampowered.com/app/5455960/Round_and_Round_Inc/" target="_blank" rel="noopener">Voir le jeu sur Steam</a></p>');
function canPlay(){return !paused&&!$('dialog').open&&!document.hidden}
function impulse(amount=1,dir=1){
 if(!canPlay())return;
 const cap=bladeOf(state).top*(state.perks.license?1.3:1);
 speed=Math.max(0,Math.min(cap,speed+dir*amount*(1+state.levels.gear*.25)*(1+state.perks.force*.25)));runtime.manual=.55;if(dir>0&&amount>.2)scene.crowd.pushWave(.8);tone('spin')
}
$('crank').addEventListener('pointerdown',e=>{if(e.isPrimary===false||e.button!==0||!canPlay())return;e.preventDefault();holding={id:e.pointerId,clock:0};$('crank').setPointerCapture(e.pointerId);impulse(1.55)});
$('crank').onclick=e=>{if(e.detail===0)impulse(1.55)};
for(let name of ['pointerup','pointercancel','lostpointercapture'])$('crank').addEventListener(name,e=>{if(holding?.id===e.pointerId)holding=null});
function point(e){const rect=$('world').getBoundingClientRect();return {x:e.clientX-rect.left-scene.cx,y:(e.clientY-rect.top-scene.cy+15*scene.scale)/.665}}
$('world').addEventListener('pointerdown',e=>{if(e.isPrimary===false||e.button!==0||!canPlay())return;e.preventDefault();const rect=$('world').getBoundingClientRect(),hit=scene.balloonAt(e.clientX-rect.left,e.clientY-rect.top);if(hit&&scene.pop(hit)){balloonReward();return}const q=point(e);pointer={clock:0,still:0,id:e.pointerId,startX:e.clientX,startY:e.clientY,angle:Math.atan2(q.y,q.x),travel:0};$('world').setPointerCapture(e.pointerId)});
$('world').addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId||!canPlay())return;const q=point(e),a=Math.atan2(q.y,q.x);let da=Math.atan2(Math.sin(a-pointer.angle),Math.cos(a-pointer.angle));pointer.angle=a;pointer.travel+=Math.abs(da);if(Math.hypot(q.x,q.y)>13&&Math.abs(da)>.007&&Math.abs(da)<1.9){pointer.still=0;impulse(Math.abs(da)*1.8,Math.sign(da))}});
$('world').addEventListener('pointerup',e=>{if(pointer?.id===e.pointerId){if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)<13&&pointer.travel<.3)impulse(1.6);pointer=null}});
for(const name of ['pointercancel','lostpointercapture'])$('world').addEventListener(name,e=>{if(pointer?.id===e.pointerId)pointer=null});
let holdTime=0;
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.altKey||e.metaKey||$('dialog').open||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
 if(e.code==='Space'){e.preventDefault();if(!e.repeat&&canPlay()){keySpin=true;holdTime=0;impulse(1.55)}return}
 if(e.repeat)return;if(e.code==='KeyB'&&canPlay()&&scene.balloons[0]&&scene.pop(scene.balloons[0]))balloonReward();if(e.code==='KeyP'){e.preventDefault();togglePause();return}
 const match=e.code.match(/^(?:Digit|Numpad)([1-6])$/);if(match)$('cards').children[Number(match[1])-1]?.click();
 if(e.key==='+')stepZoom(1);if(e.key==='-')stepZoom(-1)
});
document.addEventListener('keyup',e=>{if(e.code==='Space')keySpin=false});
window.addEventListener('blur',()=>{holding=null;keySpin=false;pointer=null;save()});
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){save();holding=null;keySpin=false;pointer=null}lastTime=0});
function comboBonus(){
 if(comboClock<=0||combo<1)return 0;
 let tier=combo>=500?5:combo>=250?4:combo>=100?3:combo>=50?2:combo>=10?1:0;
 return tier*(.1+.1*state.perks.fling)*(state.branch==='airport'?1.5:1)
}
function balloonReward(){
 const reward=credit(Math.max(6,ticketValue(state)*5));runtime.rush=Math.max(runtime.rush,12);state.balloonsPopped++;
 waiting+=waveSize(state)*4;scene.arrive(4);know('balloon');tone('goal');notify('Ballon éclaté · +'+fmt(reward)+' crédits et 12 s d’affluence');updateHUD();save()
}
function special(kind){
 const list=['courier','guide','robot','idol','parade'];
 if(state.branchNumber>=2)list.push('giant');
 const type=kind||list[runtime.eventIndex++%list.length];
 let count=1;
 if(type==='guide')count=8;if(type==='parade')count=6;
 const guest=scene.invite(type,count,{y:type==='cargo'?340:scene.radius+28,deadline:scene.time+18});
 if(!guest.length)return;
 if(type==='idol'){scene.invite('fan',6,{y:scene.radius+48});waiting+=6}
 if(type==='guide'){scene.arrive(5,'tour');waiting+=5}
 waiting+=count;notify(({courier:'Coursier express · 18 s pour le servir',guide:'Un guide arrive avec son groupe',robot:'Le robot vient régler la porte',idol:'Une idole arrive avec ses fans',parade:'Le défilé approche',cargo:'Un gros chargement approche',giant:'Un géant rejoint la file'})[type])
}
function guestReward(person,base){
 const type=person.type,age=scene.time-(person.born??scene.time),mult=1+.5*state.perks.vip;
 know(type);
 let bonus=0;
 if(type==='courier'&&scene.time<=person.deadline){bonus=base*12*mult;notify('Livraison à temps · pourboire +'+fmt(bonus));state.deliveries++}
 if(type==='robot'){repair=18;notify('Révision terminée · rotation accélérée pendant 18 s')}
 if(type==='parade'&&festival<=0){festival=18;notify('Le défilé franchit la porte · tarif doublé pendant 18 s')}
 if(type==='guide'){waiting+=waveSize(state)*2}
 if(type==='idol'){restEvent=14;notify('Fan-club · nouveaux visiteurs pendant 14 s')}
 if(type==='traveler'&&scene.time<=person.deadline)bonus+=base*.5;
 if(type==='vip')bonus+=base*2*mult;
 if(person.route==='bus'&&signed(state,'busPartner'))bonus+=base*.3;
 if(type==='giant'){bonus+=incomeMinute()*3*mult;notify('Géant accueilli · +'+fmt(bonus)+' crédits')}
 if(type==='cargo'){const factor=age<=12?4:age<=22?2:1;bonus+=incomeMinute()*5*factor;state.deliveries++;notify('Chargement livré · prime ×'+factor)}
 return Math.floor(bonus)
}
function admission(n,fast){
 if(n<1)return;
 const before=state.admitted,finalStretch=!state.finished&&humanity-before<=n;
 const transfer=scene.admit(n,fast&&!finalStretch),flung=transfer.flung;
 if(flung){combo=(comboClock>0?combo:0)+flung;comboClock=2.1+.3*state.perks.breath;state.flings+=flung;state.bestCombo=Math.max(combo,state.bestCombo);waiting+=flung}
 const limit=state.finished?n-flung:Math.min(n-flung,humanity-before);
 const base=ticketValue(state)*(festival>0?2:1)*(runtime.manual>0?1+.2*state.perks.crank:1);
 let extra=0;for(let person of transfer.passengers.slice(0,limit))extra+=guestReward(person,base);
 if(limit>0){
  const income=credit(base*limit*(1+comboBonus())+extra);state.admitted+=limit;
  rateEvents.push({time:sessionClock,count:limit});receipt(income);know('walk');tone('coin')
 }
 if(milestones.some(([g])=>before<g&&state.admitted>=g)){tone('goal');notify('Objectif atteint · '+fmt(milestones.filter(([g])=>g<=state.admitted).at(-1)[0])+' visiteurs');save()}
 if(!state.finished&&state.admitted>=humanity)awardBranch()
}
function adminTick(){
 const upgrades=catalog.filter(u=>u.id!=='route'&&!state.skipped.includes(u.id)&&state.levels[u.id]<upgradeLimit(state,u.id));
 const choices=upgrades.map(u=>({id:u.id,cost:price(state,u)}));
 if(!state.skipped.includes('route')&&!state.skipped.includes('promo')){
  for(const id of routeTypes.slice(1))if(routeOpen(state,id)&&routeLevel(state,id)<80)choices.push({id,cost:routeCost(state,id),line:true})
 }
 choices.sort((a,b)=>a.cost-b.cost);const best=choices[0];if(!best||best.cost>state.cash)return;
 if(best.line){state.cash-=best.cost;state.routeLv[best.id]++;requestVehicle(best.id);save()}else buy(best.id,false,true,true)
}
function tick(dt){
 state.seconds+=dt;state.branchSeconds+=dt;sessionClock+=dt;spawnClock+=dt;eventClock+=dt;
 for(const key of ['rush','gulp','opening','upgradeAge','manual'])runtime[key]=Math.max(0,runtime[key]-dt);
 festival=Math.max(0,festival-dt);repair=Math.max(0,repair-dt);restEvent=Math.max(0,restEvent-dt);comboClock=Math.max(0,comboClock-dt);
 if(pointer){pointer.clock+=dt;pointer.still+=dt}
 const hold=keySpin||!!holding||!!(pointer&&pointer.clock>.2&&pointer.still>.18),direct=runtime.manual>0&&!hold;
 const wind=state.branch==='seaside'?windMultiplier():1;
 const giantInside=scene.people.some(a=>a.type==='giant'&&a.mode==='inside');
 const friction=.86/((1+state.levels.fly*.27)*(1+.25*state.perks.flyMaster)),target=motorRate(state)*(repair>0?1.65:1)*wind;
 if(hold){
  runtime.manual=.3;
  const dest=assistRate(state)*wind*(repair>0?1.12:1);
  speed+=(dest-speed)*(1-Math.exp(-dt*(1.75+state.levels.gear*.08)))
 }else{speed=target+(speed-target)*Math.exp(-friction*dt)}
 if(giantInside)speed+=(Math.min(speed,direct||hold?4:1.7)-speed)*Math.min(1,dt*2);
 if(Math.abs(speed)<.013&&!target&&!hold)speed=0;
 const da=speed*dt;angle=(angle+da)%(Math.PI*2);state.turns+=Math.abs(da)/(Math.PI*2);turnPart+=Math.abs(da);
 if(state.perks.gulp&&!runtime.gulp&&(hold||direct)){
  runtime.charge+=hold?dt*.67:Math.abs(da)/(Math.PI*2);
  if(runtime.charge>=8){runtime.charge=0;runtime.gulp=25;notify('Aspiration · 25 s');tone('goal')}
 }
 scene.effects={gulp:runtime.gulp>0,manual:hold||direct,pointerAngle:pointer&&pointer.still<.18?pointer.angle-.38:null,upgradeAge:runtime.upgradeAge};
 const interval=Math.max(.23,1.35/(1+.16*state.levels.promo));
 if(spawnClock>=interval){
  spawnClock%=interval;const factor=(state.contract==='crowd'?2:1)*(restEvent>0?3:1)*(runtime.rush>0?2:1)*(runtime.opening>0?1.6:1)*(state.branch==='luxury'?.7:state.branch==='airport'?.5:1);
  let n=Math.max(1,Math.floor(waveSize(state)*factor));waiting=Math.min(1e13,waiting+n);
  if(scene.people.length<Math.min(scene.maxPeople,28+state.levels.promo*5)&&waiting>0){
   if(state.branch==='airport')scene.invite('traveler',Math.min(3,n),{x:(Math.random()>.5?1:-1)*180,y:200,deadline:scene.time+32});
   else if(state.branch==='seaside')scene.invite('walk',Math.min(3,n),{x:(Math.random()>.5?1:-1)*260,y:218});
   else scene.arrive(Math.min(3,n))
  }
 }
 for(const id of routeTypes.slice(1)){
  if(!state.routeLv[id])continue;runtime.routes[id]+=dt;
  if(runtime.routes[id]>=routePeriod(state,id)){runtime.routes[id]=0;requestVehicle(id)}
 }
 if(state.branch==='airport'){runtime.heliClock+=dt;if(runtime.heliClock>=25){runtime.heliClock=0;scene.transport(0,waveSize(state)*10,'heli')}}
 if(state.levels.promo>0){runtime.balloonClock+=dt;if(runtime.balloonClock>=Math.max(15,47-state.levels.promo*2)){runtime.balloonClock=0;scene.balloon()}}
 if(state.perks.drone&&scene.balloons.some(b=>b.age>6)){const b=scene.balloons.find(b=>b.age>6);if(scene.pop(b))balloonReward()}
 if(state.admitted>=25&&eventClock>Math.max(15,34-state.levels.promo)){eventClock=0;special()}
 if(state.perks.delivery){runtime.deliveryClock+=dt;if(runtime.deliveryClock>=300){runtime.deliveryClock=0;special('cargo')}}
 if(state.branchNumber>=2&&state.perks.giant&&Math.floor(state.seconds/90)!==Math.floor((state.seconds-dt)/90))special('giant');
 if(state.perks.draw&&state.tickets<3){state.drawClock+=dt;if(state.drawClock>=240){state.drawClock%=240;state.tickets++;notify('Un ticket pour la roue des prix');save()}}
 if(state.perks.admin){runtime.adminClock+=dt;if(runtime.adminClock>=2){runtime.adminClock=0;adminTick()}}
 const arc=Math.PI*2/bladeOf(state).count;
 while(turnPart>=arc){
  turnPart-=arc;const n=Math.min(waiting,Math.floor(capacity(state)*(runtime.gulp?2:1)));
  waiting-=n;const fast=speed>bladeOf(state).top*.56&&(Math.floor(state.turns*bladeOf(state).count)%3!==0);
  admission(n,fast)
 }
 while(rateEvents.length&&sessionClock-rateEvents[0].time>60)rateEvents.shift();
 let landed=false;
 for(const e of scene.update(dt,speed,angle)){
  if(e.kind==='land')landed=true;
  if(e.kind==='balloon')balloonReward();
  if(e.kind==='unload'){waiting+=e.count;notify('Arrivée · '+fmt(e.count)+' voyageurs')}
  if(e.kind==='vipLeft')notify('Cortège reparti · freinez pour accueillir les VIP')
 }
 if(landed)tone('land');
 scene.crowd.setPopulation(state,waiting,dt);
 for(const item of receipts){
  item.age+=dt;
  if(!item.received&&item.age>=.93){
   item.received=true;
   if(!reducedMotion?.matches)$('cash').animate?.([{transform:'scale(1.09)'},{transform:'scale(1)'}],{duration:175,easing:'ease-out'})
  }
 }
 while(receipts.length&&receipts[0].age>1.12)receipts.shift();
}

function feedback(){
 if(!receipts.length)return;
 // Canvas coordinates are local to the play area. Measure the counter only
 // when its layout changes, even if a whole group pays in one frame.
 if(targetBox!==scene.boxSize){
  const marker=$('cash-coin')?.getBoundingClientRect?.();
  const box=scene.canvas.getBoundingClientRect();
  treasuryTarget=marker?[marker.left+marker.width/2-box.left,marker.top+marker.height/2-box.top]:[47,70];
  targetBox=scene.boxSize
 }
 const c=scene.c,[sx,sy]=scene.p(9,-scene.radius*.70,42),[tx,ty]=treasuryTarget;
 for(const item of receipts){
  const t=item.age,spread=((item.id%3)-1)*19;
  const labelY=sy-9-Math.min(1,t/.72)*24;
  c.save();
  if(t<.84){
   c.globalAlpha=Math.min(1,t/.07,(.84-t)/.2);
   c.translate(sx+spread,labelY-(item.id%2)*9);const pop=1+.12*Math.sin(Math.min(1,t/.25)*Math.PI);
   c.scale(pop,pop);c.font='bold 12px DM, sans-serif';
   const label='+'+fmt(item.money),w=c.measureText(label).width+13;
   c.fillStyle='#fbfbf7';c.strokeStyle='#35382f';c.lineWidth=1;
   c.beginPath();c.roundRect(-w/2,-10,w,18,5);c.fill();c.stroke();c.fillStyle='#252820';c.textAlign='center';c.fillText(label,0,3);
  }
  c.restore();
  if(reducedMotion?.matches)continue;
  const count=item.money<4?1:item.money<40?2:3;
  for(let j=0;j<count;j++){
   const u=Math.min(1,Math.max(0,(t-.055*j)/.93));if(u<=0||u>=1)continue;
   const h=u*u*(3-2*u),bow=4*u*(1-u);
   const x=sx+(tx-sx)*h+(spread+j*9)*bow,y=sy+(ty-sy)*h-bow*(44+j*13);
   const size=(4.6+Math.sin(Math.PI*u)*1.1)*Math.min(1,u/.08);
   const rx=size*(.35+.65*Math.abs(Math.cos(2*Math.PI*u+j*.5)));
   scene.dot(x,y,rx,size,'#30332b','#f5f6ee',1);scene.dot(x,y,rx*.31,size*.31,'#f1f2e9')
  }
 }
}
function loop(now){
 let dt=lastTime?Math.min(.12,(now-lastTime)/1000):0;lastTime=now;if(canPlay())tick(dt);
 frameClock+=dt;if((canPlay()&&frameClock>=1/45)||!scene.back){scene.render(state,options.zoom);feedback();frameClock%=1/45}
 uiClock+=dt;if(uiClock>.13){uiClock=0;updateHUD();refreshShop()}saveClock+=dt;if(saveClock>4){saveClock=0;save()}
 requestAnimationFrame(loop)
}
resumeSession(savedSession);savedSession=null;controls();updateHUD();refreshShop(true);scene.angle=angle;scene.render(state,options.zoom);document.fonts.ready.then(()=>scene.invalidate());requestAnimationFrame(loop);
