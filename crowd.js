'use strict';

// A lane is a sequence of rows. Each inner row has 8 + 2r places, so its first
// index is r(r+7). This lets the camera skip whole streets in constant time.
const crowdLimits=[2000,50000,250000,1000000,2000000];
const cameraStops=[.01,.02,.03,.05,.08,.12,.18,.25,.35,.5,.65,.8,.9,1,1.1,1.2,1.3,1.4,1.5];
const crowdStride=14, crowdRowHeight=6.8, crowdVariants=16, walkFrames=8;
const firstInRow=row=>row*(row+7);
const rowForIndex=index=>Math.max(0,Math.floor((Math.sqrt(49+4*index)-7)/2));
function crowdNoise(n){let v=Math.imul(n^(n>>>16),0x45d9f3b);v=Math.imul(v^(v>>>16),0x45d9f3b);return ((v^(v>>>16))>>>0)/4294967296}

class CrowdArt{
 constructor(scene){
  this.scene=scene;this.scale=2;this.w=32;this.h=42;this.frames=[];this.strips=new Map();this.fields=new Map();this.scaled=new Map();this.density=0;this.rows=new Map();this.rowDensity=0;
 }
 atlas(out,frame){
  const key=out*walkFrames+frame;
  if(this.frames[key])return this.frames[key];
  const sheet=document.createElement('canvas'),q=this.scale;
  sheet.width=this.w*q*crowdVariants;sheet.height=this.h*q;
  const actor=Object.create(this.scene);actor.c=sheet.getContext('2d');actor.scale=q;actor.time=0;
  for(let v=0;v<crowdVariants;v++){
   const p={id:3+v*13,type:'walk',x:0,y:0,fly:0,age:0,mode:out?'out':'queue',phase:(frame/walkFrames+crowdNoise(v+8))*Math.PI*2,move:1};
   actor.cx=(v*this.w+this.w/2)*q;actor.cy=32*q;
   actor.shadow(4,4,9.8,3.9,.27,.42);actor.person(p)
  }
  this.frames[key]=sheet;return sheet
 }
 actor(c,x,y,s,id,frame,out=0){
  const q=this.scale,sheet=this.atlas(out,frame),v=id%crowdVariants;
  c.drawImage(sheet,v*this.w*q,0,this.w*q,this.h*q,x-this.w*s/2,y-32*s,this.w*s,this.h*s)
 }
 strip(out,frame,variant,mini){
  const key=((out*walkFrames+frame)*6+variant)*2+Number(mini);
  let strip=this.strips.get(key);
  if(strip)return strip;
  const q=mini?.5:this.scale;
  const tile=document.createElement('canvas');tile.width=crowdVariants*crowdStride*q;tile.height=44*q;
  const c=tile.getContext('2d');
  for(let i=-1;i<=crowdVariants;i++){
   const col=(i+crowdVariants)%crowdVariants,seed=col+variant*71+out*197;
   const x=(i+.5)*crowdStride+(crowdNoise(seed+9)-.5)*5.5;
   const y=32+(crowdNoise(seed+47)-.5)*4.8;
   this.actor(c,x*q,y*q,q,(col*5+variant*3)%crowdVariants,frame,out)
  }
  strip={tile,pattern:this.scene.c.createPattern(tile,'repeat-x'),q,height:tile.height};this.strips.set(key,strip);return strip
 }
 scaledStrip(out,frame,variant,density){
  if(this.rowDensity!==density){this.rows.clear();this.rowDensity=density}
  const key=(out*walkFrames+frame)*6+variant;
  if(this.rows.has(key))return this.rows.get(key);
  const strip=this.strip(out,frame,variant,density<.4);
  const tile=document.createElement('canvas');
  tile.width=Math.max(1,Math.round(crowdVariants*crowdStride*density));
  tile.height=Math.max(1,Math.round(44*density));
  tile.getContext('2d').drawImage(strip.tile,0,0,tile.width,tile.height);
  const row={pattern:this.scene.c.createPattern(tile,'repeat-x'),width:tile.width,height:tile.height};
  this.rows.set(key,row);return row
 }
 // Composite eight overlapping rows once. A mip sized to actual screen pixels
 // preserves the average of subpixel bodies and eliminates distant shimmer.
 field(out,frame,density){
  const key=out*walkFrames+frame;
  if(this.density!==density){this.scaled.clear();this.density=density}
  if(this.scaled.has(key))return this.scaled.get(key);
  let source=this.fields.get(key);
  if(!source){
   const w=crowdStride*crowdVariants,h=Math.round(crowdRowHeight*8);
   source=document.createElement('canvas');source.width=w;source.height=h;
   const c=source.getContext('2d');
   for(let row=-2;row<=13;row++){
    const j=(row+16)%8,strip=this.strip(out,(frame+j*3)%8,(j+out)%6,true);
    const shift=(j*39)%w,y=row*h/8-32;
    for(let x=shift-w;x<w;x+=w)c.drawImage(strip.tile,x,y,w,44)
   }
   this.fields.set(key,source)
  }
  const w=Math.max(1,Math.round(crowdStride*crowdVariants*density)),h=Math.max(1,Math.round(crowdRowHeight*8*density));
  let prev=source;
  while(prev.width>w||prev.height>h){
   const level=document.createElement('canvas');level.width=Math.max(w,Math.ceil(prev.width/2));level.height=Math.max(h,Math.ceil(prev.height/2));
   level.getContext('2d').drawImage(prev,0,0,level.width,level.height);prev=level
  }
  const pattern=this.scene.c.createPattern(prev,'repeat');this.scaled.set(key,pattern);return pattern
 }

}

class StreetCrowd{
 constructor(scene){
  this.scene=scene;this.art=new CrowdArt(scene);this.limit=2000000;this.fixed=false;this.reset();
 }
 reset(){
  this.front=0;this.rear=0;this.init=false;this.inFlow=0;this.outFlow=0;
  this.departures=0;this.gate=[];this.serial=0;this.visible=0;this.bands=0;
 }
 setPopulation(s,waiting,dt){
  // Pedestrians already in the neighbourhood and waiting customers share
  // the pavement. Only the game's existing admission code earns money.
  const residents=550+Math.min(this.limit,180*(waveSize(s)-1)+12*s.levels.expand);
  const close=this.scene.people.length,room=Math.max(0,this.limit-close-this.gate.length);
  const f=Math.min(this.limit,Math.max(0,waiting-close*.72)+residents*.64);
  const b=Math.min(this.limit,Math.max(0,this.departures-close*.28)+residents*.36);
  const ratio=this.fixed?room/Math.max(1,f+b):Math.min(1,room/Math.max(1,f+b));
  const step=this.init?1-Math.exp(-dt*2.7):1;
  this.front+=(f*ratio-this.front)*step;this.rear+=(b*ratio-this.rear)*step;
  if(this.front+this.rear>room){const k=room/(this.front+this.rear);this.front*=k;this.rear*=k}
  this.init=true;
 }
 passage(count,individuals){
  this.departures=Math.min(this.limit*3,this.departures+count);
  // These are representatives of a paid group, with no gameplay callbacks.
  const extra=Math.min(240-this.gate.length,Math.max(0,count-individuals));
  for(let i=0;i<extra;i++){
   const id=++this.serial;
   this.gate.push({id,travel:0,lane:crowdNoise(id+11),offset:crowdNoise(id+89),passed:0})
  }
 }
 update(dt,speed){
  const v=Math.abs(speed);
  this.departures*=Math.exp(-dt/18);
  this.inFlow=(this.inFlow+dt*(.16+Math.min(v,12)*.23))%1048576;
  this.outFlow=(this.outFlow+dt*(.65+Math.min(v,12)*.22))%1048576;
  let keep=0;
  for(const p of this.gate){
   if(p.travel<Math.PI)p.travel+=v*dt;else p.passed+=dt;
   if(p.passed<2.5)this.gate[keep++]=p
  }
  this.gate.length=keep
 }
 placeGate(add){
  const sc=this.scene,r=sc.radius;
  for(const p of this.gate){
   const angle=Math.PI/2+p.travel+(p.offset-.5)*.27;
   const reach=r*(.42+.48*p.lane);
   const x=Math.cos(angle)*reach+(p.passed?Math.sin(p.id)*12*p.passed:0);
   const y=Math.sin(angle)*reach-p.passed*60;
   const at=sc.p(x,y),face=Number(p.passed>0);
   add(sc.plane(x,y),()=>this.art.actor(sc.c,at[0],at[1],sc.scale,p.id,(Math.floor(sc.time*8)+p.id)%walkFrames,face))
  }
 }
 // A repeat of the row texture contains sixteen full drawings, including
 // their distinct silhouettes and feet. Clip to an integer number of places.
 drawLane(out,count,add){
  if(count<=0)return;
  const sc=this.scene,scale=sc.scale,w=sc.width,sign=out?-1:1;
  const flow=out?this.outFlow:this.inFlow;
  const whole=Math.floor(flow),frac=flow-whole;
  const offset=out?frac:-frac,base=sc.radius*.65+12;
  const low=-sc.cy/scale-10,high=(sc.height-sc.cy)/scale+38;
  // Round off the outside of the gathering. The integral of a quarter
  // ellipse distributes the remaining seats exactly across the outer rows.
  const apex=rowForIndex(Math.floor(count*.51)),inside=firstInRow(apex),tail=count-inside;
  const length=Math.max(1,Math.ceil(tail/((8+2*apex)*Math.PI/4))),far=apex+length-1;
  const before=row=>{
   if(row<=apex)return firstInRow(row);
   if(row>far)return count;
   const t=(row-apex)/length;
   return inside+Math.round(tail*(Math.asin(t)+t*Math.sqrt(1-t*t))*2/Math.PI)
  };
  // Wide pedestrian crossings separate blocks toward the outskirts.
  const distanceAt=r=>(r+offset)*crowdRowHeight+Math.floor(r/80)*7+Math.floor(r/320)*34;
  const rowAt=target=>{
   let lo=0,hi=far+1;
   while(lo<hi){const m=Math.floor((lo+hi)/2);if(distanceAt(m)<target)lo=m+1;else hi=m}
   return lo
  };
  const first=rowAt((out?-high:low)-base);
  const last=Math.min(far,rowAt((out?-low:high)-base));
  const leftBound=-sc.cx/scale-12,rightBound=(w-sc.cx)/scale+12;
  const density=scale*sc.dpr,frameBase=Math.floor(sc.time*8);
  const grouped=scale<.38;
  let batch=null;
  const flush=()=>{
   if(!batch)return;
   const group=batch;batch=null;this.bands++;
   add((group.first+group.last)/2,()=>{
    const c=sc.c,q=sc.dpr,k=scale*q;
    const xOrigin=Math.round(sc.cx*q),yOrigin=Math.round((sc.cy+(sign*base+sign*offset*crowdRowHeight)*scale)*q);
    c.setTransform(1,0,0,1,xOrigin,yOrigin);
    c.fillStyle=this.art.field(out,(frameBase+out)%walkFrames,density);
    c.beginPath();
    for(const lines of group.parts){
     if(!lines.length)continue;
     // Follow the edges of each block at regular samples and at the final row.
     for(let j=0;j<lines.length;j++){
      const [left,,depth]=lines[j],y=depth*k+sc.cy*q-yOrigin;
      if(!j)c.moveTo(left*k,y-(out?0:1)*crowdRowHeight*k-12*k);
      c.lineTo(left*k,y-12*k)
     }
     const last=lines[lines.length-1],end=last[2]*k+sc.cy*q-yOrigin+(out?-1:1)*crowdRowHeight*k-12*k;
     c.lineTo(last[0]*k,end);c.lineTo(last[1]*k,end);
     for(let j=lines.length-1;j>=0;j--){
      const [,right,depth]=lines[j];c.lineTo(right*k,depth*k+sc.cy*q-yOrigin-12*k)
     }
     const [,right,depth]=lines[0];c.lineTo(right*k,depth*k+sc.cy*q-yOrigin-(out?0:1)*crowdRowHeight*k-12*k);c.closePath()
    }
    c.fill()
   },true)
  };
  for(let r=first;r<=last;r++){
   const inRow=before(r+1)-before(r),distance=distanceAt(r);
   const depth=sign*(base+distance),rowID=(out?r-whole:r+whole)&65535;
   const sway=11*Math.sin(distance*.019+(out?1:0))+7*Math.sin(distance*.043);
   const center=sign*(-sc.radius*.373-.55*distance+sway)+Math.min(580,r*2.8)*Math.sin(r*.012+out);
   const gap=Math.min(190,Math.max(0,(r-23)*1.18))*(.75+.25*Math.sin(r*.017+out));
   const bankEdge=sc.branch==='seaside'?(depth*.928-141*.665)/.248:-Infinity;
   const start=Math.max(bankEdge,center-inRow*crowdStride/2-gap+(crowdNoise(rowID+13)-.5)*9);

   const side=Math.floor(inRow*(.26+.035*Math.sin(r*.014+out))),split=gap>0;
   const bounds=split?[0,side,inRow-side,inRow]:[0,inRow];
   const groupRow=grouped&&r>=8&&r!==far;
   if(!groupRow||r%80===0||r%24===0||batch&&batch.parts.length!==bounds.length-1)flush();
   if(groupRow&&!batch)batch={first:depth,last:depth,parts:Array.from({length:bounds.length-1},()=>[])};
   if(batch)batch.last=depth;
   for(let part=0;part<bounds.length-1;part++){
    const partStart=start+gap*part;
    const begin=Math.max(bounds[part],Math.floor((leftBound-partStart)/crowdStride));
    const end=Math.min(bounds[part+1],Math.ceil((rightBound-partStart)/crowdStride));
    if(end<=begin)continue;
    const cut=partStart+begin*crowdStride,amount=end-begin;
    this.visible+=amount;
    if(groupRow){batch.parts[part].push([cut,cut+amount*crowdStride,depth]);continue}
    this.bands++;
    const frame=(frameBase+(rowID*3)%walkFrames)%walkFrames,variant=(rowID%6+out)%6;
    add(depth,()=>{
     const tile=this.art.scaledStrip(out,frame,variant,density);
     const stride=tile.width/crowdVariants,phase=begin%crowdVariants;
     const x=(sc.cx+cut*scale)*sc.dpr-phase*stride,y=(sc.cy+(depth-32)*scale)*sc.dpr;
     const c=sc.c;c.setTransform(1,0,0,1,x,y);c.fillStyle=tile.pattern;
     c.fillRect(phase*stride,0,amount*crowdStride*density,tile.height)
    },true)
   }
  }
  flush()

 }
 collect(add){
  this.visible=0;this.bands=0;
  this.drawLane(1,Math.round(this.rear),add);this.drawLane(0,Math.round(this.front),add);
  this.placeGate(add)
 }
}
