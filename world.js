'use strict';
class DoorScene{
 constructor(canvas){
  this.canvas=canvas;this.c=canvas.getContext('2d');this.items=[];this.people=[];this.labels=[];this.cars=[];this.time=0;this.zoom=1;this.angle=.27;this.radius=116;this.width=0;this.height=0;this.cx=0;this.cy=0;this.scale=1;this.serial=0;this.back=null;this.maxPeople=95;this.branch='main';this.profile=bladeSpecs[0];this.balloons=[];this.bursts=[];this.bags=[];this.messages=[];this.effects={};
  this.crowd=new StreetCrowd(this);this.staticItems=null;this.sizeDirty=true;
  this.resize=new ResizeObserver(()=>{this.sizeDirty=true;this.invalidate()});this.resize.observe(canvas);
 }
 invalidate(){this.back=null;this.staticItems=null}
 p(x,y,z=0){return [this.cx+(x*.928-y*.373)*this.scale,this.cy+(x*.248+y*.617-z*.85)*this.scale]}
 plane(x,y){return x*.248+y*.617}
 poly(points,fill,stroke='',width=1){const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke()}}
 line(points,color,width=1,dash=[]){const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.setLineDash(dash);c.stroke();c.setLineDash([])}
 face(pts,fill,stroke='',width=1){this.poly(pts.map(p=>this.p(...p)),fill,stroke,width*this.scale)}
 edge(pts,color,width=1,dash=[]){this.line(pts.map(p=>this.p(...p)),color,width*this.scale,dash)}
 arc(r,a,b,z=0,n=48,x=0,y=0){return Array.from({length:n+1},(_,i)=>{let t=a+(b-a)*i/n;return [x+r*Math.cos(t),y+r*Math.sin(t),z]})}
 ring(r,z,color,width=1,dash=[],x=0,y=0){this.edge(this.arc(r,0,Math.PI*2,z,86,x,y),color,width,dash)}
 dot(x,y,rx,ry,fill,stroke='',width=.7){const c=this.c;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
 shadow(x,y,rx,ry,alpha=.23,slant=-.05){const c=this.c,[px,py]=this.p(x,y);c.save();c.translate(px,py);c.rotate(slant);c.scale(rx*this.scale,ry*this.scale);let g=c.createRadialGradient(0,0,.04,0,0,1);g.addColorStop(0,'rgba(31,32,29,'+alpha+')');g.addColorStop(.56,'rgba(31,32,29,'+(alpha*.52)+')');g.addColorStop(1,'rgba(31,32,29,0)');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore()}
 box(x,y,z,w,d,h,top,side,front,stroke='#464741',line=.8){
  this.face([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],front,stroke,line);
  this.face([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],side,stroke,line);
  this.face([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],top,stroke,line);
 }
 textOnFloor(str,x,y,size,shade,axis=0){const c=this.c,p=this.p(x,y),s=this.scale;c.save();c.transform(.928*s,.248*s,-.373*s,.617*s,p[0],p[1]);c.rotate(axis);c.fillStyle=shade;c.font='700 '+size+'px BC,Arial,sans-serif';c.letterSpacing='1.2px';c.fillText(str,0,0);c.restore()}
 seed(){
  for(let i=0;i<23;i++){let a=this.addPerson(-105+Math.random()*240,135+Math.random()*260);if(a){a.x=a.tx+(Math.random()-.5)*50;a.y=a.ty+Math.random()*45}}
  for(let i=0;i<9;i++){let a=this.addPerson(30+Math.random()*135,-135-Math.random()*230);if(a){a.mode='out';a.tx=a.x+110;a.ty=a.y-300}}
 }
 addPerson(x,y,type='walk'){
  if(this.people.length>=this.maxPeople)return;
  const id=++this.serial;const r=this.radius,k=this.people.filter(p=>p.mode==='queue').length;
  let a={id,type,x,y,tx:Math.sin(id*5.41)*Math.min(83,12+k*4)+3,ty:r+10+Math.min(k,26)*7.2+Math.sin(id*2)*9,mode:'queue',phase:id*1.382,move:1,age:0,fly:0};
  this.people.push(a);return a;
 }
 arrive(n=1,type='walk'){for(let i=0;i<n;i++)this.addPerson((Math.random()-.48)*270,295+Math.random()*210,type)}
 invite(type,count=1,extra={}){
  const spawned=[];
  for(let i=0;i<count;i++){
   if(this.people.length>=this.maxPeople){
    const idx=this.people.findIndex(p=>p.type==='walk'&&p.mode!=='inside');
    if(idx<0)break;this.people.splice(idx,1)
   }
   const a=this.addPerson(extra.x??((Math.random()-.5)*110),extra.y??(this.radius+40+i*5),type);
   if(a){Object.assign(a,extra,{born:this.time});spawned.push(a)}
  }
  return spawned
 }
 admit(n,fast){
  const result={flung:0,passengers:[]};
  if(!n)return result;
  const ready=[];
  for(const p of this.people){
   if(p.mode!=='queue'||(p.type==='cargo'&&p.y>this.radius+31))continue;
   p.doorDistance=p.x*p.x+p.y*p.y;
   let j=ready.length;
   if(j===8&&p.doorDistance>=ready[7].doorDistance)continue;
   while(j&&p.doorDistance<ready[j-1].doorDistance)j--;
   ready.splice(j,0,p);if(ready.length>8)ready.pop()
  }
  if(!ready.length){let p=this.addPerson(4,this.radius+15);if(p)ready.push(p)}
  const count=Math.min(ready.length,Math.min(8,n));
  for(let j=0;j<count;j++){
   const p=ready[j];
   p.mode='inside';p.age=0;p.direction=Math.sign(this.speed)||1;p.orbit=Math.atan2(p.y,p.x);
   p.radial=Math.min(this.radius-9,Math.hypot(p.x,p.y));
   p.fling=fast&&j===0&&!['giant','cargo','robot'].includes(p.type);
   if(p.fling)result.flung++;else result.passengers.push(p);
  }
  this.crowd.passage(n-result.flung,count);
  return result
 }
 transport(level,count=10,route='bus'){
  this.cars.push({age:0,level,count,route,unloaded:false,wait:0})
 }
 balloon(){
  if(this.balloons.length)return;
  this.balloons.push({x:-this.radius-55,y:38,z:64,age:0});
 }
 balloonAt(x,y){
  return this.balloons.find(b=>{const [bx,by]=this.p(b.x,b.y,b.z);return ((bx-x)/(23*this.scale))**2+((by-y)/(25*this.scale))**2<=1})
 }
 pop(b){
  const i=this.balloons.indexOf(b);if(i<0)return false;
  this.balloons.splice(i,1);this.bursts.push({...b,age:0});return true
 }
 update(dt,speed,angle){
  this.speed=speed;this.angle=angle;this.time+=dt;this.crowd.update(dt,speed);let k=0;const r=this.radius;
  const events=[];
  const giant=this.people.find(a=>a.type==='giant'&&a.mode!=='out'),cargo=this.people.find(a=>a.type==='cargo'&&a.mode!=='out');
  for(const a of this.people){
   a.age+=dt;a.fly=0;
   if(a.mode==='inside'){
    const inertia=a.type==='giant'?(.34+(this.effects.manual?.55:0)):1;
    a.orbit+=a.direction*dt*(Math.abs(speed)+.08)*inertia;
    a.radial+=(r*this.profile.grip-a.radial)*Math.min(1,dt*3);
    a.x=Math.cos(a.orbit)*a.radial;a.y=Math.sin(a.orbit)*a.radial;
    if(a.y<-r*.18){
     a.mode=a.fling?'flung':'out';a.age=0;
     if(a.fling){
      a.startX=a.x;a.startY=a.y;a.vx=(115+Math.random()*100)*(Math.random()<.5?-1:1);a.vy=-55-Math.random()*100;a.airTime=.88+Math.random()*.35;
      if(a.type==='traveler'){a.luggageDetached=true;this.bags.push({x:a.x,y:a.y,z:1,age:0,vx:-a.vx*.65,vy:a.vy*.5})}
     }else{a.tx=a.x+(Math.random()-.22)*220;a.ty=-480-Math.random()*125}
    }
    continue
   }
   if(a.mode==='flung'){
    const f=Math.min(1,a.age/a.airTime);a.x=a.startX+a.vx*a.age;a.y=a.startY+a.vy*a.age;a.fly=4*f*(1-f)*95;
    const [x,y]=this.p(a.x,a.y,a.fly+9);let hit=this.balloonAt(x,y);if(hit&&this.pop(hit))events.push({kind:'balloon'});
    if(f===1){a.mode='recover';a.age=0}continue
   }
   if(a.mode==='recover'){if(a.age>=.52){a.mode='queue';a.age=0}continue}
   if(a.mode==='queue'){
    const near=['guide','robot','cargo','giant','idol','courier','traveler','vip','parade'].includes(a.type);
    const corridor=k*(this.effects.gulp?.35:1);
    a.tx=Math.sin(a.id*5.41)*Math.min(86,13+corridor*3.7)+3;
    a.ty=r+(near?5:14)+Math.min(near?1:corridor,40)*6.9+Math.sin(a.id*2)*8;k++;
    if(a.type==='cargo')a.tx=0;
    if(cargo&&a!==cargo){const dx=a.x-cargo.x,dy=a.y-cargo.y;if(Math.abs(dx)<25&&Math.abs(dy)<19)a.x+=Math.sign(dx||1)*dt*28}
    if(giant&&a!==giant&&Math.hypot(a.x-giant.x,a.y-giant.y)<45)a.fly=5*Math.max(0,Math.sin(this.time*5))**3
   }
   let dx=a.tx-a.x,dy=a.ty-a.y,d=Math.hypot(dx,dy),v=(a.mode==='out'?32:22)+(a.id%5)*1.4;
   if(this.effects.gulp&&a.mode==='queue')v*=3;
   a.move=Math.min(1,d/12);if(d>1){let t=Math.min(1,dt*v/d);a.x+=dx*t;a.y+=dy*t}
  }
  this.people=this.people.filter(a=>!(a.mode==='out'&&Math.hypot(a.tx-a.x,a.ty-a.y)<4));
  for(const car of this.cars){
   car.age+=dt;
   if(car.age>=5&&!car.unloaded){
    const vip=this.branch==='luxury'&&car.level>=4;
    if(vip&&Math.abs(speed)>5){
     car.wait+=dt;car.age=5;if(car.wait<7)continue;car.unloaded=true;events.push({kind:'vipLeft'});continue
    }
    car.unloaded=true;const type=vip?'vip':this.branch==='airport'?'traveler':'walk';
    this.invite(type,Math.min(10,car.count),{x:-140,y:180,route:car.route,deadline:this.time+28});
    events.push({kind:'unload',count:car.count,route:car.route})
   }
  }
  this.cars=this.cars.filter(c=>c.age<15);
  for(const b of this.balloons){b.age+=dt;b.x+=dt*8;b.z=65+5*Math.sin(b.age*1.4);b.y=36+5*Math.sin(b.age*.7)}
  this.balloons=this.balloons.filter(b=>b.age<42);
  for(const e of this.bursts)e.age+=dt;this.bursts=this.bursts.filter(e=>e.age<.9);
  for(const b of this.bags){b.age+=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z=Math.max(0,Math.sin(Math.min(1,b.age/1.2)*Math.PI)*88)}
  this.bags=this.bags.filter(b=>b.age<2.1);
  return events
 }
 setSize(){
  const dpr=Math.min(2,window.devicePixelRatio||1);
  if(this.sizeDirty||this.dpr!==dpr){this.boxSize=this.canvas.getBoundingClientRect();this.sizeDirty=false}
  const w=Math.round(this.boxSize.width),h=Math.round(this.boxSize.height);
  if(w!==this.width||h!==this.height||dpr!==this.dpr){this.width=w;this.height=h;this.dpr=dpr;this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.invalidate()}
  const mobile=w<650;this.cx=w*(mobile?.51:.505);this.cy=h*(mobile?.53:.51)+13;
  this.scale=Math.min(mobile?w/490:w/870,h/(mobile?372:360),1.65)*this.zoom;
  this.c.setTransform(dpr,0,0,dpr,0,0)
 }
 floor(){
  const c=this.c,w=this.width,h=this.height,r=this.radius,range=Math.ceil(Math.max(w,h)/this.scale*2);
  c.fillStyle='#f2f2ef';c.fillRect(0,0,w,h);
  for(let i=-range-range%64;i<range;i+=64){
   this.edge([[i,-range,0],[i,range,0]],'#dbdcd6',.53);
   this.edge([[-range,i,0],[range,i,0]],'#dbdcd6',.53)
  }
  for(let x=-512;x<=512;x+=128)for(let y=-512;y<=512;y+=128){this.edge([[x-2,y],[x+2,y]],'#bcbeb5',.7);this.edge([[x,y-2],[x,y+2]],'#bcbeb5',.7)}
  BranchArt.backdrop(this,this.branch);
  // Painted guide lines mark the pedestrian lanes on both sides of the gate.
  for(let k of [-1,1]){
   this.edge([[k*(r*.7),r+21],[k*r*.7,390]],'#b8bab1',1.1,[6*this.scale,7*this.scale]);
   this.edge([[k*r*.7,-r-27],[k*r*.7,-330]],'#c5c6be',.95,[6*this.scale,7*this.scale]);
  }
  for(let y of [r+66,r+160,-r-88]){
   this.face([[-6,y+8],[6,y+8],[6,y-5],[13,y-5],[0,y-18],[-13,y-5],[-6,y-5]],'#b9bcb3')
  }
  this.textOnFloor('ENTRÉE',-39,r+121,21,'#a3a79c');this.textOnFloor('SORTIE',-36,-r-118,19,'#b5b8af');
  this.textOnFloor('R&R',-323,94,21,'#b7bab2');
  for(let side of [-1,1]){
   let a=side*r,b=side*(range+100);
   this.face([[a,-9],[b,-9],[b+12,22],[a+12,22]],'#cfd0c9');
   this.edge([[a+9,23],[b+9,23]],'#dbdcd6',4);
  }
  this.shadow(8,13,r*1.15,r*.73,.32);this.shadow(7,10,r*1.12,r*.72,.29);
  // The threshold is a recessed, riveted turntable.
  this.face(this.arc(r+4,0,Math.PI*2,.7,96),'#9b9e95','#454740',.9);
  this.face(this.arc(r+1,0,Math.PI*2,2,96),'#d8dad2','#f8f8f4',1.2);
  this.face(this.arc(r-5,0,Math.PI*2,2.4,96),'#ecece6','#81847a',.7);
  this.ring(r-11,2.4,'#cbcdc5',.8);this.ring(r*.51,2.4,'#acafa4',.7);
  this.ring(r*.47,2.4,'#fcfcf9',1.4);this.ring(r*.28,2.4,'#5d6056',.8);
  for(let i=0;i<60;i++){let t=i*Math.PI/30;this.edge([[(r-5)*Math.cos(t),(r-5)*Math.sin(t),2.5],[(r-(i%5?8:12))*Math.cos(t),(r-(i%5?8:12))*Math.sin(t),2.5]],'#85887f',i%5?.55:1)}
  for(let i=0;i<10;i++){let t=i*Math.PI/5;this.edge([[r*.53*Math.cos(t),r*.53*Math.sin(t),2.5],[(r-13)*Math.cos(t),(r-13)*Math.sin(t),2.5]],'#c3c6bc',.5)}
  // Cast shadows of street furniture.
  for(let [x,y] of [[226,76],[-226,-103],[330,-132]])this.shadow(x+12,y+10,38,11,.19);
  this.shadow(201,-129,26,11,.23);this.shadow(-258,108,23,11,.23)
 }
 buildFloor(){const b=document.createElement('canvas');b.width=this.canvas.width;b.height=this.canvas.height;const old=this.c;this.c=b.getContext('2d');this.c.setTransform(this.dpr,0,0,this.dpr,0,0);this.floor();this.c=old;this.back=b}
 rail(x,sign,index){
  let len=68,y=-4,h=25+this.siteTier*5;this.box(x,y-4,0,len,9,4,'#62655d','#34362f','#555850');
  this.box(x,y-2,4,len,5,h-5,'#f7f7f3','#989b92','#d8dad2');
  this.face([[x+3,y+3.2,6],[x+len-3,y+3.2,6],[x+len-3,y+3.2,h-3],[x+3,y+3.2,h-3]],index%3?'#c3c6bd':'#dfe1da','#72756b',.65);
  if(index%4===1){for(let j=0;j<9;j++)this.edge([[x+6+j*6,y+3.45,8],[x+6+j*6,y+3.45,h-5]],'#92968b',.7)}
  else {this.edge([[x+5,y+3.5,7],[x+len-5,y+3.5,7]],'#f3f3ed',.8);this.edge([[x+5,y+3.5,h-5],[x+len-6,y+3.5,h-5]],'#abafa3',.65)}
  this.box(x-1,y-4,h-1,len+1,9,3,'#f1f2eb','#979a90','#c5c7bd');
  this.box(x+1,y-4,2,2.4,9,h,'#edeee8','#55584f','#96998e', '#53564d',.55);
  if(index%5===0){for(let j=0;j<3;j++)this.face([[x+len-18+j*4,y+3.6,11],[x+len-16+j*4,y+3.6,11],[x+len-13+j*4,y+3.6,17],[x+len-15+j*4,y+3.6,17]],'#62665b')}
 }
 bench(x,y){
  for(let k of [5,37]){this.box(x+k,y,0,3,13,13,'#888b82','#32352e','#4b4e44');this.box(x+k,y,12,3,2,13,'#a4a69c','#45483f','#55584e')}
  for(let j=0;j<3;j++)this.box(x,y+j*4.3,13,46,3.5,1.5,'#bec0b6','#676b60','#909387','#494c43',.6);
  for(let j=0;j<2;j++)this.box(x,y-1,18+j*4.2,46,2,3,'#ced0c7','#707468','#a4a79a','#55594f',.6)
 }
 planter(x,y){
  this.box(x-11,y-10,0,23,21,15,'#f5f5ee','#b9bcb0','#cdd0c5','#74786b',.8);
  this.box(x-12,y-11,14,25,23,2,'#b2b5a9','#76796e','#999d90','#62665b',.65);
  this.face([[x-9,y-8,17],[x+10,y-8,17],[x+10,y+8,17],[x-9,y+8,17]],'#838879');
  for(let i=0;i<19;i++){let a=i*2.4,b=(i%5+2)*1.8,h=12+i%6*2.6,px=x+Math.cos(a)*b,py=y+Math.sin(a)*b;let ox=Math.cos(a)*7,oy=Math.sin(a)*7;
   this.face([[px,py,16],[px+ox-2,py+oy,20+h*.4],[px+ox,py+oy,h+17],[px+ox+2,py+oy,19+h*.42]],['#53584b','#686e60','#858b7e','#41463a'][i%4],'#53594b',.35)}
 }
 bollard(x,y){this.shadow(x+2,y+3,7,2,.3);this.box(x-2,y-2,0,4,4,15,'#ddd','#53564e','#72766a','#484b43',.6);this.box(x-2.1,y-2.1,10.7,4.2,4.2,2.4,'#f0f0ea','#a6a99d','#cbcdc2','',.5)}
 guard(a,b,i,n){
  const r=this.radius,z=40,curve=(rad,start,end,h)=>this.arc(rad,start,end,h,4);
  const cos=Math.cos((a+b)/2),sin=Math.sin((a+b)/2),light=Math.round(195-37*cos-14*sin);
  const shade=(v)=>'rgb('+v+','+(v+1)+','+Math.max(0,v-3)+')';
  this.face([...curve(r,a,b,3),...curve(r,b,a,z)],shade(light));
  this.face([...curve(r-4,a,b,3),...curve(r-4,b,a,z)],shade(Math.round(light*.90)));
  // Front-facing outer shell has a folded top lip and a dark protective shoe.
  if(this.plane(cos,sin)>0){this.face([...curve(r+.3,a,b,3.1),...curve(r+.3,b,a,z)],shade(light));
   this.face([...curve(r+.4,a,b,3),...curve(r+.4,b,a,6)],'#62655c');
   this.edge(curve(r+.5,a,b,8),'#eff0e9',.8);this.edge(curve(r+.4,a,b,z-3),'#edece7',.8);
  }
  this.face([...curve(r+1,a,b,z),...curve(r-4.7,b,a,z)],'#f5f5f0');
  this.edge(curve(r+1,a,b,z),'#292c24',1.1);this.edge(curve(r-4.7,a,b,z),'#373a32',.85);this.edge(curve(r+.4,a,b,3),'#3e4139',.9);
  if(i%4===0){this.edge([[r*Math.cos(a),r*Math.sin(a),7],[r*Math.cos(a),r*Math.sin(a),z-3]],'#888c80',.55);let [x,y]=this.p((r+.8)*Math.cos(a+.035),(r+.8)*Math.sin(a+.035),z-6);this.dot(x,y,.87*this.scale,.85*this.scale,'#666a5f')}
  if(i===0||i===n-1){let t=i===0?a:b;this.face([[r*Math.cos(t),r*Math.sin(t),3],[(r-4)*Math.cos(t),(r-4)*Math.sin(t),3],[(r-4)*Math.cos(t),(r-4)*Math.sin(t),z],[r*Math.cos(t),r*Math.sin(t),z]],'#afb3a6','#373b31',.85)}
 }
 blade(t,level){
  const r=this.radius,end=r-7,pts=[],wid=(u)=>2.7+(level===1?5.4:2.2)*u,arc=(u)=>t+this.profile.bend*Math.pow(u,this.profile.curve);
  const pos=(u,w,z)=>{let a=arc(u),d=16+(end-16)*u;return [Math.cos(a)*d-Math.sin(a)*w,Math.sin(a)*d+Math.cos(a)*w,z]};
  for(let i=0;i<=16;i++)pts.push(i/16);
  const wide=Math.sin(t+.37)>=0?1:-1,z=35;
  this.face([...pts.map(u=>pos(u,wide*wid(u),3.4)),...pts.slice().reverse().map(u=>pos(u,wide*wid(u),z))],wide===1?'#30322d':'#252722','#191b16',1);
  this.face([...pts.map(u=>pos(u,-wid(u),z)),...pts.slice().reverse().map(u=>pos(u,wid(u),z))],'#50534b','#1f211c',.85);
  this.edge(pts.map(u=>pos(u,-wide*(wid(u)-1),z+.2)),'#a3a69a',.7);
  this.edge(pts.map(u=>pos(u,wide*(wid(u)+.2),7.5)),'#171914',1.3);
  for(let u of [.18,.84]){let [x,y]=this.p(...pos(u,wide*(wid(u)+.4),z-4));this.dot(x,y,1.05*this.scale,.8*this.scale,'#a6aa9d')}
  this.face([pos(1,-wid(1),3),pos(1,wid(1),3),pos(1,wid(1),z),pos(1,-wid(1),z)],'#393c33','#161813',.7)
 }
 cylinder(r,z,h,front,top){
  const c=this.c,[x,y]=this.p(0,0,z),s=this.scale,ry=r*.665;let [tx,ty]=this.p(0,0,z+h);
  c.beginPath();c.moveTo(x-r*s,ty);c.lineTo(x-r*s,y);c.ellipse(x,y,r*s,ry*s,0,Math.PI,0,true);c.lineTo(x+r*s,ty);c.ellipse(tx,ty,r*s,ry*s,0,0,Math.PI);c.closePath();c.fillStyle=front;c.fill();c.strokeStyle='#30332a';c.lineWidth=.8*s;c.stroke();
  this.dot(tx,ty,r*s,ry*s,top,'#262920',s)
 }
 hub(){
  const s=this.scale;this.cylinder(29,3,4,'#606558','#c7cbc1');this.cylinder(24,7,3,'#73786b','#b0b5a7');this.cylinder(15,9,29,'#55594d','#929888');
  this.cylinder(25,38,3.5,'#34372e','#454a3f');this.cylinder(24,41.5,2.6,'#9a9e91','#d8dbd2');
  this.face(this.arc(19,0,Math.PI*2,44.3,50),'#494e41','#262a21',.7);
  for(let i=0;i<7;i++){let a=this.angle+i*Math.PI*2/7,off=.11;this.face([[18.8*Math.cos(a-off),18.8*Math.sin(a-off),44.5],[18.8*Math.cos(a+off),18.8*Math.sin(a+off),44.5],[5*Math.cos(a+.4),5*Math.sin(a+.4),44.5],[5*Math.cos(a-.4),5*Math.sin(a-.4),44.5]],'#e0e3d9','#33382c',.65)}
  this.cylinder(7,44.5,2.7,'#52564b','#f1f2ec');
  for(let i=0;i<8;i++){let a=i*Math.PI/4+.2,[x,y]=this.p(22*Math.cos(a),22*Math.sin(a),44.4);this.dot(x,y,1*s,.7*s,'#5b6053')}
 }
 person(a){
  const c=this.c,s=this.scale,[x,y]=this.p(a.x,a.y,a.fly),i=a.id,ss=s*(.87+(i%5)*.045);const step=Math.sin(this.time*5+a.phase)*3.1*a.move,bob=Math.abs(step)*.20;const turn=a.mode==='out'?-.76:1;
  c.save();c.translate(x,y);c.scale(ss*turn,ss);if(a.mode==='flung')c.rotate(a.age*8);if(a.mode==='recover')c.rotate(1.35*Math.max(0,1-a.age/.52));c.translate(0,-bob);
  const coat=a.type==='idol'?'#eceee7':['#343630','#20221d','#52554d','#171914','#45483f'][i%5],head=['#252720','#46483f','#161813','#33352d'][i%4];
  const leg=(px,py,to)=>{this.line([[px,-8],[px+to*.3,-4],[px+to,py]],'#171914',3.35);this.line([[px+to,py],[px+to-1.5,py+.2]],'#151712',2.65)};
  leg(2.2,-.9,-step);leg(-1.8,.2,step);
  this.poly([[-3.5,-17],[1,-18],[4,-15.2],[4.7,-8],[1,-6.5],[-3.8,-8.3]],coat,'#272922',.65);
  this.line([[-3.1,-15],[-4.9,-11.8+step*.12],[-4.3-step*.4,-8.7]],'#252720',2.4);
  this.line([[2.6,-15.7],[4.2,-12.2],[4.4+step*.35,-9.8]],coat,2.6);
  this.line([[-2.4,-15.7],[-.4,-16.6],[1.8,-15.9]],'#888b80',.75);
  if(i%6===0||a.type==='tour'){this.poly([[-3,-15.4],[.7,-15.8],[2.1,-10],[-2,-9.4],[-3.6,-10.5]],'#686c60','#26291f',.6);this.line([[-2.5,-13.1],[.7,-13.4]],'#93988b',.65)}
  this.dot(-.2,-20.4,4.5,4.7,head,'#1e2019',.65);
  c.beginPath();c.ellipse(-.3,-20.2,4,3.8,-.12,3.5,5.5);c.strokeStyle='#777b70';c.lineWidth=.72;c.stroke();
  if(i%7===0){this.dot(-.5,-22.2,5,1.8,'#262820');this.dot(-.4,-23.6,3.4,2.1,'#42463a')}
  if(a.type==='repair'){this.poly([[-4,-22],[4,-22],[5,-20],[-4,-20]],'#c8cbbf','#393d33',.5)}
  if(a.type==='idol'){this.poly([[-5,-24],[-3,-22],[0,-25],[2,-22],[4,-24],[3,-20],[-3,-20]],'#dadcd3','#404439',.5)}
  if(a.type==='courier'){this.poly([[2,-14],[7,-14],[8,-10],[3,-9]],'#adb2a2','#464b3f',.6)}
  if(i%7===3){this.dot(2.8,-19.3,2,2.3,'#25281f')}
  if(i%8===2){this.poly([[4,-9],[7,-8.5],[7.4,-4],[4,-4.8]],'#666a5d','#292c23',.7)}
  c.restore()
 }
 vehicle(car){
  if(BranchArt.vehicle(this,this.branch,car))return;let l=car.level,t=car.age,x= t<5? -430+t*55:t<9?-155:-155+(t-9)*65,y=185;
  if(l>=4){
   const points=(list,z)=>list.map(([a,b])=>[x+a,y+b,z]);
   this.shadow(x+20,y+14,48,15,.22);
   this.face(points([[1,7],[23,6],[38,-21],[44,-21],[38,6],[68,7],[76,11],[67,15],[39,15],[45,41],[40,42],[24,16],[5,15],[-5,24],[-9,24],[-5,11],[-10,-2],[-5,-2]],13),'#e7e8e2','#353832',.85);
   this.face(points([[-2,10],[61,9],[73,11],[65,14],[0,14]],14),'#e0e2d9','#676b60',.7);
   this.face(points([[60,9],[65,10],[68,12],[60,12]],14.5),'#41463b');
   for(let j=0;j<9;j++)this.edge([[x+8+j*5,y+14,14],[x+9+j*5,y+14,14]],'#42473e',.95);
   return
  }
  if(l===2||l===3){
   const count=l===2?2:3;
   for(let k=0;k<count;k++){
    let xx=x-k*45;
    this.box(xx,y,3,42,15,15,'#e4e6dc','#9fa494',l===2?'#cacdc1':'#b5bbab','#4c5146');
    for(let a=0;a<6;a++)this.face([[xx+3+a*6,y+15.2,10],[xx+7+a*6,y+15.2,10],[xx+7+a*6,y+15.2,15],[xx+3+a*6,y+15.2,15]],'#53594a');
    this.edge([[xx+1,y+15.3,7],[xx+40,y+15.3,7]],'#676e5f',1.5);
    for(let j of [7,35]){let [px,py]=this.p(xx+j,y+15,3);this.dot(px,py,2.7*this.scale,2.9*this.scale,'#363b30')}
   }
   return
  }
  this.box(x,y,4,53,19,16,'#f2f2ed','#a7ac9e','#bfc4b6');
  this.box(x,y,17,53,19,4,'#dedfd7','#868d7e','#adb3a4');
  for(let k=0;k<6;k++)this.face([[x+3+k*8,y+19.2,11],[x+9+k*8,y+19.2,11],[x+9+k*8,y+19.2,17],[x+3+k*8,y+19.2,17]],'#42483b');
  for(let k of [8,44]){let [px,py]=this.p(x+k,y+19,5);this.dot(px,py,3.8*this.scale,4.3*this.scale,'#282c23');this.dot(px,py,1.6*this.scale,1.8*this.scale,'#bec3b4')}
  if(l>1)this.box(x+16,y+4,21,16,9,2,'#959d8a','#686e5d','#7f8774')
 }
 // Rasterize immobile geometry once at its native pixel density. Thin depth
 // bands keep the original occlusion order with visitors and rotating blades.
 buildScenery(){
  const original=this.c,groups=new Map(),r=this.radius,q=this.dpr;
  const register=(depth,box,paint)=>{
   const [x0,y0,x1,y1]=box;
   if(x1<0||x0>this.width||y1<0||y0>this.height)return;
   const key=Math.floor(depth*this.scale/(this.scale<.3?4:1));
   let group=groups.get(key);
   if(!group){group={left:x0,top:y0,right:x1,bottom:y1,depth,paints:[]};groups.set(key,group)}
   else{group.left=Math.min(group.left,x0);group.top=Math.min(group.top,y0);group.right=Math.max(group.right,x1);group.bottom=Math.max(group.bottom,y1)}
   group.paints.push(paint)
  };
  const bounds=(x,y,w,d,h)=>{
   const [left]=this.p(x,y+d),[right]=this.p(x+w,y);
   const [,top]=this.p(x,y,h),[,bottom]=this.p(x+w,y+d);
   return [left-3,top-3,right+3,bottom+3]
  };
  // Remote stretches of railing repeat just eight panel designs. Rasterize
  // each in the original painter once as the overview may expose miles of it.
  const railTiles=new Map();
  const drawRail=(x,sign,i)=>{
   if(this.scale>=.4){this.rail(x,sign,i);return}
   const key=Number(i%3===0)+2*Number(i%4===1)+4*Number(i%5===0);
   let stamp=railTiles.get(key);
   if(!stamp){
    const [l,t,rr,b]=bounds(-2,-9,73,13,29+this.siteTier*5);
    const left=Math.floor((l-this.cx)*q),top=Math.floor((t-this.cy)*q);
    const tile=document.createElement('canvas');tile.width=Math.ceil((rr-this.cx)*q)-left;tile.height=Math.ceil((b-this.cy)*q)-top;
    const painter=Object.create(this);painter.cx=-left/q;painter.cy=-top/q;painter.c=tile.getContext('2d');painter.c.scale(q,q);
    painter.rail(0,sign,i);stamp={tile,left,top};railTiles.set(key,stamp)
   }
   const [px,py]=this.p(x,0),tile=stamp.tile;
   this.c.drawImage(tile,px+stamp.left/q,py+stamp.top/q,tile.width/q,tile.height/q)
  };
  const span=Math.ceil(this.width/(this.scale*62))+4;
  for(let i=0;i<span;i++)for(const sign of [-1,1]){
   const x=sign===1?r-1+68*i:-r-67-68*i;
   register(this.plane(x+34,0),bounds(x-2,-9,73,13,29+this.siteTier*5),()=>drawRail(x,sign,i))
  }
  for(const [x,y] of [[212,79],[-242,-102],[306,-131]])register(this.plane(x+23,y+5),bounds(x-2,y-3,51,19,30),()=>this.bench(x,y));
  for(const [x,y] of [[198,-128],[-258,108]])register(this.plane(x,y),bounds(x-22,y-22,44,44,52),()=>this.planter(x,y));
  for(const [x,y] of [[-160,56],[-196,56],[-232,56],[156,-52],[194,-52],[232,-52]])register(this.plane(x,y),bounds(x-9,y-10,23,23,21),()=>this.bollard(x,y));
  const n=16,gap=.88;
  for(const mid of [0,Math.PI])for(let i=0;i<n;i++){
   const a=mid-gap+2*gap*i/n,b=a+2*gap/n,m=(a+b)/2;
   const x=r*Math.cos(m),y=r*Math.sin(m),margin=r*(b-a)*.55+7;
   register(this.plane(x,y),bounds(x-margin,y-margin,2*margin,2*margin,43),()=>this.guard(a,b,i,n))
  }
  const result=[];
  for(const group of groups.values()){
   const x=Math.max(0,Math.floor(group.left*q)),y=Math.max(0,Math.floor(group.top*q));
   const tile=document.createElement('canvas');tile.width=Math.max(1,Math.min(this.canvas.width,Math.ceil(group.right*q))-x);tile.height=Math.max(1,Math.min(this.canvas.height,Math.ceil(group.bottom*q))-y);
   this.c=tile.getContext('2d');this.c.setTransform(q,0,0,q,-x,-y);
   for(const paint of group.paints)paint();
   result.push({depth:group.depth,fn:()=>original.drawImage(tile,x/q,y/q,tile.width/q,tile.height/q)})
  }
  this.c=original;this.staticItems=result
 }
 render(state,zoom){
  if(this.branch!==state.branch){this.branch=state.branch;this.invalidate()}this.profile=bladeOf(state);const tier=siteIndex(state);if(tier!==this.siteTier){this.siteTier=tier;this.staticItems=null}const r=116+Math.min(22,state.levels.expand)*2.1;if(this.zoom!==zoom||this.radius!==r){this.zoom=zoom;this.radius=r;this.invalidate()}this.setSize();if(!this.back)this.buildFloor();
  const c=this.c;c.drawImage(this.back,0,0,this.width,this.height);
  BranchArt.motion(this,this.branch,this.time);
  if(!this.staticItems)this.buildScenery();
  const items=this.staticItems.slice();const add=(depth,fn,texture=false)=>items.push({depth,fn,texture});
  this.crowd.collect(add);
  for(let car of this.cars)add(this.plane(-150,185),()=>this.vehicle(car));
  for(let a of this.people){this.shadow(a.x+4,a.y+4,9.8,3.9,.27,.42);add(this.plane(a.x,a.y),()=>{if(a.type!=='giant')this.person(a);EventArt.entourage(this,a);if(a.type==='courier'&&a.mode==='queue')EventArt.courierBadge(this,a,Math.max(0,(a.deadline||0)-this.time))})}
  const blades=this.profile.count;
  for(let j=0;j<blades;j++){let a=this.angle+j*Math.PI*2/blades;add(this.plane(r*.59*Math.cos(a+.08),r*.59*Math.sin(a+.08)),()=>this.blade(a,state.levels.blade))}
  add(0,()=>this.hub());items.sort((a,b)=>a.depth-b.depth);
  let rowTransform=false;
  for(const it of items){
   if(rowTransform&&!it.texture)c.setTransform(this.dpr,0,0,this.dpr,0,0);
   it.fn();rowTransform=it.texture
  }
  if(rowTransform)c.setTransform(this.dpr,0,0,this.dpr,0,0);

  // A small flywheel cap sits above every blade.
  const [hx,hy]=this.p(0,0,47.4);this.dot(hx,hy,5.8*this.scale,3.8*this.scale,'#e9ece1','#42483b',.65*this.scale);
  const f=this.effects;
  if(f.manual){
   const a=f.pointerAngle??this.angle;
   this.edge(this.arc(34,a-.9,a+.25,48,16),'#20211d',1.6);
   this.ring(34,48,'#545951',.65,[2*this.scale,4*this.scale]);
   const [px,py]=this.p(34*Math.cos(a),34*Math.sin(a),48);this.dot(px,py,3.5*this.scale,3.2*this.scale,'white','#252623',1.2*this.scale)
  }
  if(f.gulp){for(let i=0;i<7;i++){const a=this.time*1.8+i*.89;const pts=Array.from({length:18},(_,k)=>{const t=k/17,d=r*(1.18-.92*t);return [d*Math.cos(a+t*2.5),d*Math.sin(a+t*2.5),4]});this.edge(pts,'#7d8179',1,[3,4])}}
  if(f.upgradeAge>0){const t=1-f.upgradeAge/1.1;this.ring(r*(.45+t*.87),4,'rgba(44,47,39,'+Math.max(0,1-t)+')',1.3);for(let i=0;i<9;i++){let a=i*.698+t*.2,d=r*(.45+t*.62),[x,y]=this.p(d*Math.cos(a),d*Math.sin(a),32+t*19);const v=(1-t)*4*this.scale;this.line([[x-v,y],[x+v,y]],'#494c44',1);this.line([[x,y-v],[x,y+v]],'#494c44',1)}}
  for(const b of this.balloons)EventArt.balloon(this,b);for(const b of this.bursts)EventArt.burst(this,b);for(const b of this.bags)EventArt.luggage(this,b);
  if(state.perks.drone){const b=this.balloons[0];EventArt.drone(this,b?b.x+Math.max(0,55-b.age*8):r+28,b?b.y:18,b?b.z+8:71+3*Math.sin(this.time*2))}

 }
}
