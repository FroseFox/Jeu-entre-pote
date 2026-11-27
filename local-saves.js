'use strict';

const slotPrefix='rr-inc-profile-';
const recoverySlot=slotPrefix+'previous';
const saveDate=new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short'});

function sessionSnapshot(){
 const {time,serial,people,cars,balloons,bursts,bags,crowd}=scene;
 const world={time,serial,people,cars,balloons,bursts,bags,crowd:{
  serial:crowd.serial,front:crowd.front,rear:crowd.rear,departures:crowd.departures,
  inFlow:crowd.inFlow,outFlow:crowd.outFlow,gate:crowd.gate,waves:crowd.waves
 }};
 return {version:2,state,options,angle,waiting,turnPart,paused,runtime,
  session:{speed,sessionClock,spawnClock,transportClock,eventClock,restEvent,festival,repair,combo,comboClock,rateEvents,world}}
}

function resumeSession(session){
 if(!session)return;
 const nonnegative=n=>positive(n)?n:0;
 speed=nonnegative(session.speed);sessionClock=nonnegative(session.sessionClock);
 spawnClock=nonnegative(session.spawnClock);transportClock=nonnegative(session.transportClock);eventClock=nonnegative(session.eventClock);
 restEvent=nonnegative(session.restEvent);festival=nonnegative(session.festival);repair=nonnegative(session.repair);
 combo=nonnegative(session.combo);comboClock=nonnegative(session.comboClock);
 if(Array.isArray(session.rateEvents))rateEvents=session.rateEvents.filter(e=>positive(e?.time)&&positive(e?.count)&&sessionClock-e.time<=60).slice(-2000);
 const w=session.world;
 if(!w||!positive(w.time)||!positive(w.serial)||!w.crowd)return;
 const finite=(o,keys)=>o&&keys.every(k=>Number.isFinite(o[k]));
 const list=(array,limit,check)=>Array.isArray(array)&&array.length<=limit&&array.every(check);
 const actor=p=>finite(p,['id','x','y','tx','ty','age','phase','move','fly'])&&['queue','out','inside','flung','recover'].includes(p.mode)&&
  (p.mode!=='inside'||finite(p,['radial','orbit','direction']))&&(p.mode!=='flung'||finite(p,['startX','startY','vx','vy','airTime'])&&p.airTime>0);
 const ride=p=>finite(p,['id','x','y','startX','startY','reach','entryTime','time','turn','lane','sink'])&&
  ['entry','turn','exit','stairs'].includes(p.phase)&&(p.phase!=='exit'||p.walkTime>0)&&(!p.pose||actor(p.pose));
 if(!list(w.people,200,actor)||!list(w.crowd.gate,600,ride)||!list(w.cars,200,o=>finite(o,['age','count','level','wait']))||
    !list(w.balloons,4,o=>finite(o,['x','y','z','age']))||!list(w.bursts,64,o=>finite(o,['x','y','z','age']))||
    !list(w.bags,200,o=>finite(o,['x','y','z','vx','vy','age'])))return;
 scene.time=w.time;scene.serial=w.serial;scene.people=w.people;scene.cars=w.cars;
 scene.balloons=w.balloons;scene.bursts=w.bursts;scene.bags=w.bags;scene.speed=speed;
 for(const k of ['serial','front','rear','departures','inFlow','outFlow'])scene.crowd[k]=nonnegative(w.crowd[k]);
 scene.crowd.gate=w.crowd.gate;
 scene.crowd.waves=list(w.crowd.waves,8,o=>finite(o,['time','strength']))?w.crowd.waves:[];
 scene.effects={gulp:runtime.gulp>0,manual:false,upgradeAge:runtime.upgradeAge};
}

function saveText(text){
 return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}
function slotData(key){
 const record=JSON.parse(localStorage.getItem(key)||'null');
 if(record&&typeof record.name==='string'&&positive(record.at)&&record.at<=8640000000000000&&positive(record.game?.state?.admitted)&&positive(record.game?.state?.cash))return record;
 return null
}
function storeSlot(key,name){
 localStorage.setItem(key,JSON.stringify({name,at:Date.now(),game:sessionSnapshot()}))
}
function replaceCurrent(game){
 // Stash the active session before changing the autosave. Reading the chosen
 // snapshot first also makes loading the recovery slot reversible.
 storeSlot(recoverySlot,'Avant le dernier chargement');
 localStorage.setItem(storageKey,JSON.stringify(game));
 importing=true;window.location.reload()
}
function localSaves(message=''){
 let slots=[];
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);if(!key?.startsWith(slotPrefix))continue;
   let data;try{data=slotData(key)}catch{continue}
   if(data)slots.push({key,name:data.name,at:data.at,visits:data.game.state.admitted,branch:data.game.state.branch})
  }
 }catch{message='Le navigateur bloque le stockage. Vous pouvez exporter un fichier depuis les paramètres.'}
 slots.sort((a,b)=>b.at-a.at);
 const cards=slots.map((s,i)=>'<div class="save-row"><div><strong>'+saveText(s.name)+'</strong><small>'+
  saveText(branchNames[s.branch]||branchNames.main)+' · '+fmt(s.visits)+' visiteurs · '+saveDate.format(s.at)+'</small></div>'+
  '<button class="slot-load" data-load="'+i+'">Charger</button><button class="slot-delete" data-remove="'+i+'" aria-label="Supprimer '+saveText(s.name)+'">×</button></div>').join('');
 showDialog('Parties locales','<p>La partie en cours reprend automatiquement sur ce navigateur. Enregistrez une copie pour revenir à cet instant.</p>'+
  '<form id="slot-form"><label for="slot-name">Nom de la partie</label><div><input id="slot-name" maxlength="48" autocomplete="off" placeholder="Agence '+state.branchNumber+'"><button class="primary" type="submit">Enregistrer</button></div></form>'+
  '<p id="slot-status" role="status">'+saveText(message)+'</p>'+cards+transferButtons());
 bindTransfer(()=>localSaves());
 const status=msg=>{$('slot-status').textContent=msg};
 const failure=()=>status('Écriture impossible. Vérifiez l’espace disponible ou exportez votre partie depuis les paramètres.');
 const write=(key,name)=>{try{storeSlot(key,name);localSaves('« '+name+' » enregistrée sur cet appareil.')}catch{if($('slot-status'))failure();else localSaves('Écriture impossible dans ce navigateur.')}};
 $('slot-form').onsubmit=e=>{
  e.preventDefault();
  const name=$('slot-name').value.trim()||'Agence '+state.branchNumber+' · '+saveDate.format(Date.now());
  const match=slots.find(s=>s.key!==recoverySlot&&s.name===name);
  if(!match){
   const id=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
   write(slotPrefix+id,name);return
  }
  showDialog('Remplacer cette copie','<p>Enregistrer la partie actuelle à la place de « '+saveText(name)+' » ?</p><button class="primary" id="slot-yes">Remplacer</button><button class="secondary" id="slot-no">Annuler</button>');
  $('slot-yes').onclick=()=>write(match.key,name);$('slot-no').onclick=()=>localSaves()
 };
 for(const btn of $('dialog-body').querySelectorAll('[data-load]'))btn.onclick=()=>{
  const slot=slots[Number(btn.dataset.load)];
  try{const data=slotData(slot.key);if(!data){localSaves('Cette copie est introuvable.');return}replaceCurrent(data.game)}
  catch{status('Chargement impossible. La partie en cours reste ouverte.')}
 };
 for(const btn of $('dialog-body').querySelectorAll('[data-remove]'))btn.onclick=()=>{
  const slot=slots[Number(btn.dataset.remove)];
  showDialog('Supprimer cette copie','<p>Supprimer « '+saveText(slot.name)+' » de cet appareil ?</p><button class="primary" id="slot-yes">Supprimer</button><button class="secondary" id="slot-no">Annuler</button>');
  $('slot-yes').onclick=()=>{try{localStorage.removeItem(slot.key);localSaves('Copie supprimée.')}catch{localSaves('Suppression impossible dans ce navigateur.')}};
  $('slot-no').onclick=()=>localSaves()
 }
}
