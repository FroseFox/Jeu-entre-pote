'use strict';
const catalog=[
 {id:'promo',name:'Publicité',icon:'promo',base:25,ratio:1.65,desc:'Attire davantage de passants et augmente la fréquence des arrivées.'},
 {id:'gear',name:'Engrenages',icon:'gear',base:20,ratio:1.62,desc:'Chaque geste transmet plus de force à la porte.'},
 {id:'fly',name:'Volant d’inertie',icon:'fly',base:120,ratio:1.72,desc:'La porte conserve son élan plus longtemps entre deux impulsions.'},
 {id:'motor',name:'Motorisation',icon:'bolt',base:90,ratio:1.8,desc:'Un moteur fait tourner la porte en continu, même quand vous relâchez la commande.'},
 {id:'expand',name:'Agrandissement',icon:'expand',base:180,ratio:1.92,desc:'Agrandit le diamètre de la porte et augmente sa capacité par passage.'},
 {id:'blade',name:'Pales',icon:'blade',base:260,ratio:2.1,desc:'Remplace les pales pour accueillir plusieurs visiteurs par compartiment.'},
 {id:'fee',name:'Tarif d’entrée',icon:'ticket',base:45,ratio:1.85,desc:'Augmente la recette pour chaque visiteur admis.'},
 {id:'group',name:'Groupes',icon:'users',base:150,ratio:2,desc:'Accueille des groupes de plus en plus nombreux à chaque passage.'},
 {id:'route',name:'Transports',icon:'bus',base:320,ratio:2.15,desc:'Ouvre les lignes de bus, de métro, de train puis d’avion. Chaque arrivée apporte un groupe de visiteurs.'}
];
const milestones=[
 [25,'Premiers pas'],[100,'Une bonne adresse'],[500,'Du monde à la porte'],[1000,'Commerce florissant'],[10000,'À guichets ouverts'],[100000,'Toute la ville'],[1000000,'Un million d’entrées'],[10000000,'Une foule immense'],[100000000,'Sans frontières'],[1000000000,'À l’échelle du monde'],[8200000000,'Toute l’humanité']
];
const humanity=milestones[milestones.length-1][0], bladeNames=['Droites','Cuillères','Impulseurs','Spirales','Turbines'];
const routeNames=['Bus','Métro','Train','Avion'];
const format=new Intl.NumberFormat('fr-FR'), shortFormat=new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1});
function fmt(n){return n>=100000?shortFormat.format(Math.floor(n)):format.format(Math.floor(n))}
const bladeSpecs=[
 {count:4,bend:0,curve:1,grip:.63,top:8,slots:1},
 {count:4,bend:.83,curve:3,grip:.76,top:9,slots:2},
 {count:4,bend:1.18,curve:1.5,grip:.70,top:10,slots:4},
 {count:6,bend:1.75,curve:1,grip:.54,top:11,slots:6},
 {count:10,bend:1.38,curve:.72,grip:.64,top:13,slots:10}
];
const bladeOf=s=>bladeSpecs[Math.min(4,s.levels.blade)];
const branchNames={main:'Agence principale',seaside:'Bord de mer',luxury:'Maison de luxe',airport:'Aéroport'};
const branches=Object.keys(branchNames);
const routeTypes=['walk','bus','train','air'];
const routeLabels={
 main:['Passants','Bus','Trains','Avions'],seaside:['Promeneurs','Bateaux-taxis','Barges','Paquebots'],
 luxury:['Passants','Berlines','Autocars','Cortèges VIP'],airport:['Terminal','Chasseurs','Avions de ligne','Gros-porteurs']
};
const perkDefs=[
 ['gulp','Aspiration','8 tours de manivelle attirent la file vers l’entrée pendant 25 s.',2,1],
 ['drone','Drone publicitaire','Survole la place et éclate les ballons publicitaires.',3,1],
 ['draw','Roue des prix','Un ticket à l’achat, puis toutes les 4 min de jeu. Réserve de 3 tickets.',4,1],
 ['fling','Prime de combo','Augmente de 10 points la prime de chaque palier d’éjections.',2,5],
 ['breath','Temps de reprise','Prolonge le combo de 0,3 s par niveau.',2,3],
 ['flyMaster','Inertie prolongée','Prolonge la roue libre de 25 % par niveau.',3,4],
 ['license','Permis de vitesse','À la main, les pales peuvent atteindre 130 % de leur vitesse maximale.',7,1],
 ['routes','Réseau de transport','Augmente la taille des arrivées et rapproche les rotations des lignes.',3,5],
 ['vip','Invitations VIP','Augmente les primes des visiteurs spéciaux.',3,3],
 ['delivery','Contrat de livraison','Un gros chargement toutes les 5 min. Un passage rapide rapporte jusqu’à quatre fois la prime.',6,1],
 ['giant','Invitation des géants','Les géants rendent visite plus souvent à partir de la deuxième agence.',5,1],
 ['regulars','Habitués','Une réouverture démarre avec davantage de publicité.',2,2],
 ['gearbox','Boîte de rechange','Démarre avec un niveau d’engrenages supplémentaire.',2,3],
 ['spare','Moteur de secours','Démarre avec la motorisation au niveau 1.',3,1],
 ['warehouse','Réserve de volants','Démarre avec le volant d’inertie au niveau 1.',2,1],
 ['initial','Capital de départ','Augmente les crédits disponibles après une réouverture.',3,5],
 ['crank','Maîtrise de la manivelle','Ajoute 20 % au tarif pendant la rotation manuelle.',3,10],
 ['royalty','Redevances','Accorde 10 % d’énergie supplémentaire à chaque réouverture.',5,5],
 ['admin','Équipe administrative','Achète automatiquement l’amélioration admissible la moins chère. Clic droit pour exclure une carte.',150,1],
 ['force','Manivelle renforcée','Augmente la force transmise de 25 % par niveau.',1,12],
 ['profit','Accord tarifaire','Augmente la recette de base de 22 % par niveau.',1,12],
 ['capacity','Accueil collectif','Augmente la capacité de 35 % par niveau.',1,12]
];
const contractDefs=[
 ['expandParty','Inauguration','Chaque agrandissement attire 60 % de visiteurs en plus pendant 60 s.'],
 ['guild','Guilde des engrenages','Chaque engrenage acheté réduit les tarifs de promotion de 10 %, jusqu’à 50 %.'],
 ['busPartner','Partenaire des bus','Ouvre les bus deux niveaux de publicité plus tôt. Leurs passagers paient 30 % de plus.']
];
function newRun(){
 return {cash:0,admitted:0,earned:0,seconds:0,turns:0,flings:0,bestCombo:0,levels:Object.fromEntries(catalog.map(u=>[u.id,0])),energy:0,runs:0,allTime:0,contract:'',perks:Object.fromEntries(perkDefs.map(([id])=>[id,0])),finished:false,
  branch:'main',branchNumber:1,branchRuns:0,branchSeconds:0,trust:0,contracts:[],disabledContracts:[],routeLv:{bus:0,train:0,air:0},skipped:[],collection:[],tickets:0,drawClock:0,pendingPrize:null,balloonsPopped:0,deliveries:0,agencyRecord:[]}
}
function signed(s,id){return s.contracts.includes(id)&&!s.disabledContracts.includes(id)}
function routeDiscount(s){return signed(s,'guild')?1-.1*Math.min(5,s.levels.gear):1}
function price(s,u){return Math.ceil(u.base*u.ratio**s.levels[u.id]*(s.contract==='economy'?.85:1)*(u.id==='promo'?routeDiscount(s):1))}
function groupFactor(s){return 2**Math.min(s.levels.group,40)}
function groupLimit(s){return Math.max(s.levels.group,4+s.branchRuns*2)}
function upgradeLimit(s,id){return id==='blade'?4:id==='gear'?10:id==='group'?groupLimit(s):80}
function capacity(s){return Math.max(1,Math.floor((1+s.levels.expand*.68)*bladeOf(s).slots*groupFactor(s)*(1+s.perks.capacity*.35)))}
function ticketValue(s){return Math.max(1,Math.floor(3*1.7**s.levels.fee*(1+.22*s.perks.profit)*(s.contract==='premium'?1.35:1)*(s.branch==='luxury'?1.8:1)))}
function waveSize(s){return Math.max(1,Math.ceil(1.62**s.levels.promo*(1+s.levels.route*.75)*(1+s.perks.routes*.14)))}
function motorRate(s){return s.levels.motor?Math.min(bladeOf(s).top*.85,.63+.39*s.levels.motor):0}
function assistRate(s){return bladeOf(s).top*(.6+.04*Math.min(10,s.levels.gear))}
function siteIndex(s){return [0,500,10000,1000000].reduce((a,n,i)=>s.admitted>=n?i:a,0)}
const sites=['Boutique de quartier','Grand magasin','Terminal international','Siège de la compagnie'];
function availableEnergy(s){const scaled=Math.sqrt(s.admitted/250);return s.admitted<1000?0:Math.floor(scaled*(1+s.perks.royalty*.1)*(.785**Math.max(0,s.levels.group-3)))}
function routeLevel(s,id){return id==='walk'?s.levels.promo:s.routeLv[id]}
function routeThreshold(s,id){return {walk:0,bus:signed(s,'busPartner')?1:3,train:6,air:9}[id]}
function routeOpen(s,id){return id==='walk'||s.routeLv[id]>0||s.levels.promo>=routeThreshold(s,id)}
function routeCost(s,id){return id==='walk'?price(s,catalog[0]):Math.ceil(({bus:110,train:480,air:1600})[id]*1.78**routeLevel(s,id)*routeDiscount(s)*(s.contract==='economy'?.85:1))}
function routePeriod(s,id){return Math.max(7,({bus:22,train:35,air:48})[id]*.94**Math.min(14,routeLevel(s,id)-1)*.93**s.perks.routes)}
function routeBatch(s,id){return Math.ceil(({bus:8,train:25,air:62})[id]*1.65**Math.min(55,routeLevel(s,id)-1)*(1+.25*s.perks.routes)*Math.max(1,Math.sqrt(groupFactor(s))))}
function perkPrice(def,s){return def[3]*(1+s.perks[def[0]])}
function effectValue(s,id){
 switch(id){
 case 'promo':return fmt(waveSize(s))+' / vague';
 case 'gear':return Math.round(assistRate(s)/bladeOf(s).top*100)+' % de la vitesse';
 case 'fly':return ((1+s.levels.fly*.27)*(1+s.perks.flyMaster*.25)/.86).toLocaleString('fr-FR',{maximumFractionDigits:1})+' s d’inertie';
 case 'motor':return Math.round(motorRate(s)*60/(2*Math.PI))+' tr/min';
 case 'expand':return fmt(capacity(s))+' / passage';
 case 'blade':return bladeNames[Math.min(4,s.levels.blade)]+' · '+bladeOf(s).count+' pales';
 case 'fee':return fmt(ticketValue(s))+' crédits / entrée';
 case 'group':return '×'+fmt(groupFactor(s))+' visiteurs';
 default:return '';
 }
}
function predict(s,id){return effectValue({...s,levels:{...s.levels,[id]:s.levels[id]+1}},id)}
