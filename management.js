'use strict';
function credit(amount){
 const n=Math.max(0,Math.floor(amount));state.cash+=n;state.earned+=n;return n
}
function know(key){if(!state.collection.includes(key))state.collection.push(key)}
const guestNames={walk:'Passant',guide:'Guide',fan:'Fan-club',idol:'Idole',parade:'Défilé',courier:'Coursier',robot:'Robot de maintenance',cargo:'Gros chargement',giant:'Géant',vip:'Client VIP',traveler:'Voyageur'};
function routesPanel(){
 const rows=routeTypes.map((id,i)=>{
  const level=routeLevel(state,id),cost=routeCost(state,id),open=routeOpen(state,id);
  const desc=id==='walk'?fmt(waveSize(state))+' par vague':level?fmt(routeBatch(state,id))+' voyageurs toutes les '+Math.round(routePeriod(state,id))+' s':'Nouvelle ligne';
  const caption=open?desc:'Publicité niv. '+routeThreshold(state,id)+' requise';
  return '<div class="option"><span><b>'+routeLabels[state.branch][i]+' · niv. '+fmt(level)+'</b><br><small>'+caption+'</small></span><button class="mini" data-line="'+id+'" '+(!open||state.cash<cost||paused||level>=80?'disabled':'')+'><i class="currency"></i> '+fmt(cost)+'</button></div>'
 }).join('');
 showDialog('Réseau de visiteurs',rows+'<div class="option"><span><b>Campagne publicitaire</b><br><small>Affluence doublée pendant 20 s et un ballon à éclater.</small></span><button class="mini" id="campaign" '+(paused||state.cash<campaignCost()||runtime.rush>0?'disabled':'')+'>'+ (runtime.rush>0?'En cours':fmt(campaignCost())+' crédits')+'</button></div>');
 $('dialog-body').querySelectorAll('[data-line]').forEach(b=>b.onclick=()=>purchaseRoute(b.dataset.line));$('campaign').onclick=launchCampaign;
}
function campaignCost(){return Math.ceil(45*(1+state.levels.promo)*routeDiscount(state))}
function launchCampaign(){
 const cost=campaignCost();if(paused||state.cash<cost||runtime.rush>0)return;
 state.cash-=cost;runtime.rush=20;scene.balloon();save();$('dialog').close();notify('Campagne lancée · cliquez sur le ballon')
}
function purchaseRoute(id){
 if(paused||!routeTypes.includes(id)||!routeOpen(state,id)||routeLevel(state,id)>=80)return;
 if(id==='walk'){buy('promo',true,true);routesPanel();return}
 const cost=routeCost(state,id);if(state.cash<cost)return;
 state.cash-=cost;state.routeLv[id]++;runtime.routes[id]=0;requestVehicle(id);
 updateHUD();refreshShop(true);tone('buy');save();routesPanel()
}
function routesUnlocked(){return state.levels.route>0||routeOpen(state,'bus')}
function requestVehicle(id){
 const idx=routeTypes.indexOf(id),level=id==='bus'?1:id==='train'?3:4;
 scene.transport(level,routeBatch(state,id),id);
 know('line-'+id);notify(routeLabels[state.branch][idx]+' en approche')
}
function localEffects(){
 const labels=[];
 if(runtime.gulp>0)labels.push('Aspiration '+Math.ceil(runtime.gulp)+' s');
 if(runtime.rush>0)labels.push('Affluence ×2 · '+Math.ceil(runtime.rush)+' s');
 if(festival>0)labels.push('Festival ×2 · '+Math.ceil(festival)+' s');
 if(repair>0)labels.push('Révision · '+Math.ceil(repair)+' s');
 if(runtime.opening>0)labels.push('Inauguration +60 % · '+Math.ceil(runtime.opening)+' s');
 if(scene.people.some(a=>a.type==='courier'&&a.mode==='queue'))labels.push('Coursier en attente');
 if(state.branch==='seaside')labels.push(windMultiplier()>1?'Vent arrière':'Vent de face');
 return labels
}
function incomeMinute(){return Math.max(ticketValue(state)*12,Math.floor(state.earned/Math.max(1,state.seconds/60)))}
function openPrizes(){
 let reward=state.pendingPrize;
 const pool=[1,3,25,2,5,1,25,3],active=reward!==null,idx=reward?.index??0;
 const labels=pool.map((v,i)=>'<span style="--pos:'+i+'"><b>'+v+'′</b></span>').join('');
 showDialog('Roue des prix','<div class="prize-frame"><div class="prize-wheel" id="prize-wheel" style="--angle:'+(-idx*45)+'deg">'+labels+'</div></div>'+
 '<p class="wheel-note">'+(active?'Gain du tirage · <strong>'+fmt(reward.amount)+' crédits</strong>':'Deux cases jackpot rapportent 25 minutes de recettes. Le combo reste en suspens pendant le tirage.')+'</p>'+
 record('Tickets disponibles',fmt(state.tickets)+' / 3')+'<button class="primary" id="wheel-action" '+(!active&&(paused||state.tickets<1)?'disabled':'')+'>'+(active?'Reprendre la partie':'Utiliser un ticket')+'</button>');
 $('wheel-action').onclick=()=>{
  if(state.pendingPrize){state.pendingPrize=null;save();$('dialog').close();return}
  if(paused||state.tickets<=0)return;
  const index=Math.floor(Math.random()*pool.length),amount=credit(incomeMinute()*pool[index]);
  state.tickets--;state.pendingPrize={index,amount};save();tone('goal');openPrizes();
  $('prize-wheel').classList.add('rolling');
 };
}
function purchasePerk(id){
 const def=perkDefs.find(p=>p[0]===id);if(!def||state.perks[id]>=def[4]||state.energy<perkPrice(def,state)||paused)return;
 state.energy-=perkPrice(def,state);state.perks[id]++;
 if(id==='draw')state.tickets=Math.min(3,state.tickets+1);
 save();refreshShop(true);perks()
}
function perks(){
 const list=perkDefs.map(d=>{const lvl=state.perks[d[0]],full=lvl>=d[4],cost=perkPrice(d,state);return '<div class="option"><span><b>'+d[1]+'</b><br><small>'+d[2]+'</small></span><button class="mini" data-perk="'+d[0]+'" '+(full||paused||state.energy<cost?'disabled':'')+'>'+(full?'Max.':cost+' ⚡')+'</button></div>'}).join('');
 showDialog('Avantages permanents',record('Énergie de rotation',fmt(state.energy))+'<p class="subtle">Une réouverture convertit les entrées de la session en énergie.</p>'+list);
 $('dialog-body').querySelectorAll('[data-perk]').forEach(b=>b.onclick=()=>purchasePerk(b.dataset.perk))
}
function gallery(){
 const counts=Object.entries(guestNames).map(([key,name])=>record(name,state.collection.includes(key)?'✓ Observé':'À découvrir')).join('');
 const blades=bladeNames.map((name,i)=>record(name,(i===0||state.collection.includes('blade-'+i)||state.levels.blade>=i)?'✓ Obtenue':'À découvrir')).join('');
 showDialog('Carnet de terrain','<p>Les visiteurs rencontrés et les pales débloquées restent dans le carnet à chaque réouverture.</p><div class="tableLabel">Visiteurs</div>'+counts+'<div class="tableLabel">Pales</div>'+blades+'<div class="tableLabel">Références du jeu</div><p class="credit">Mécaniques documentées par Murbong. Les durées, tarifs et trajectoires propres à cette adaptation sont ajustés pour le navigateur.</p><div class="sources"><a href="https://store.steampowered.com/app/5455960/Round_and_Round_Inc/" target="_blank" rel="noopener">Bande-annonce et captures</a><a href="https://steamcommunity.com/games/5455960/announcements/detail/1849192144187183" target="_blank" rel="noopener">Agences et événements · 1.1</a><a href="https://steamcommunity.com/games/5455960/announcements/detail/1849458702682774" target="_blank" rel="noopener">Réseau de visiteurs · 1.2</a><a href="https://steamcommunity.com/games/5455960/announcements/detail/1850460852984364" target="_blank" rel="noopener">Manivelle et tirages · 1.3.3</a></div>')
}
function windMultiplier(){return Math.sin(state.seconds*.12)>0?1.18:.89}
function awardBranch(){
 if(state.finished)return;state.finished=true;
 const points=1+Number(state.branchSeconds<=80*60)+Number(state.branchSeconds<=48*60);state.trust+=points;
 state.agencyRecord.push({site:state.branch,seconds:Math.round(state.branchSeconds),points});save();branchOffice();
}
function branchOffice(){
 const earned=state.finished;
 let html=record('Agence actuelle',branchNames[state.branch])+record('Confiance du siège',fmt(state.trust))+'<p class="subtle">'+(earned?'Votre agence peut continuer à accueillir des visiteurs. Choisir une nouvelle adresse recommence une agence.':'Accueillez 8,2 milliards de visiteurs pour choisir un nouvel emplacement. Une agence terminée rapporte un point de confiance, plus un en 80 min et un autre en 48 min.')+'</p>';
 for(const [id,name,desc] of contractDefs){const owned=state.contracts.includes(id),active=signed(state,id);html+='<div class="option"><span><b>'+name+'</b><br><small>'+desc+'</small></span><button class="mini" data-contract="'+id+'" '+(!owned&&state.trust<1?'disabled':'')+'>'+(owned?(active?'Activé':'Désactivé'):'1 point')+'</button></div>'}
 if(earned)html+='<div class="tableLabel">Emplacements</div><p class="subtle">Au bord de mer, le vent agit sur la rotation. En maison de luxe, les entrées valent ×1,8 et les VIP attendent une porte lente. À l’aéroport, les arrivées à temps et la prime de combo bénéficient d’un facteur ×1,5.</p><label class="option">Prochaine agence<select id="next-site">'+branches.filter(b=>b!==state.branch).map(b=>'<option value="'+b+'">'+branchNames[b]+'</option>').join('')+'</select></label><p class="subtle">Votre énergie, vos avantages, votre collection et vos contrats sont conservés. La porte et la trésorerie repartent de leur niveau initial.</p><button class="primary" id="next-branch">Ouvrir la nouvelle agence</button><button class="secondary" id="endless">Continuer ici</button>';
 showDialog('Siège de la compagnie',html);
 $('dialog-body').querySelectorAll('[data-contract]').forEach(b=>b.onclick=()=>{let id=b.dataset.contract;if(state.contracts.includes(id)){state.disabledContracts=signed(state,id)?[...state.disabledContracts,id]:state.disabledContracts.filter(x=>x!==id)}else if(state.trust>0){state.contracts.push(id);state.trust--}save();branchOffice()});
 if(earned){$('next-branch').onclick=()=>{const next=$('next-site').value;if(!branches.includes(next)||next===state.branch)return;beginRun(next,true);$('dialog').close();notify(branchNames[next]+' · agence ouverte')};$('endless').onclick=()=>$('dialog').close()}
}
function beginRun(branch,isBranch,contract=state.contract){
 const old=state,energy=old.energy+availableEnergy(old);state=newRun();
 for(const key of ['perks','contracts','disabledContracts','collection','agencyRecord','skipped','trust','deliveries','balloonsPopped'])state[key]=old[key];
 state.runs=old.runs+1;state.branch=branch;state.branchNumber=old.branchNumber+(isBranch?1:0);state.branchRuns=isBranch?0:old.branchRuns+1;state.branchSeconds=isBranch?0:old.branchSeconds;state.contract=contract;state.allTime=old.allTime+old.admitted;state.energy=energy;
 state.tickets=old.tickets;state.drawClock=old.drawClock;state.levels.promo=state.perks.regulars;state.levels.gear=state.perks.gearbox;state.levels.motor=state.perks.spare;state.levels.fly=state.perks.warehouse;state.cash+=Math.round(70*state.perks.initial**2.7);
 resetScene()
}
