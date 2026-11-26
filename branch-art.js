'use strict';

const BranchArt = (() => {
  const ink = '#42443f';
  const pearl = '#efefea';
  const silver = '#bdc0b7';
  const glass = '#6a7068';
  const extent = scene => 650 + Math.ceil(Math.max(scene.width, scene.height) / Math.max(.4, scene.scale));
  const strip = (s, x0, x1, y0, y1, color) =>
    s.face([[x0,y0],[x1,y0],[x1,y1],[x0,y1]], color);

  function shoreY(x) {
    return 227 - 66 * Math.exp(-((x + 153) ** 2) / 8200) + 9 * Math.sin(x / 77);
  }

  function shoreline(range, time, offset, spacing = 24) {
    const points = [];
    for (let x = -range; x <= range + spacing; x += spacing) {
      const ripple = Math.sin(time * .9 + x / 62) * 3.5 + Math.cos(time * .66 + x / 28) * 1.8;
      points.push([x,shoreY(x) + offset + ripple]);
    }
    return points;
  }

  function seasideFloor(s, range) {
    strip(s,-range,range,104,range,'#e8e7e1');
    const wet = shoreline(range,0,-10);
    s.face([...wet,[range+24,range],[-range,range]],'#cecec8');
    const sea = shoreline(range,0,4);
    s.face([...sea,[range+24,range],[-range,range]],'#b7bcb7');
    for (let i = -15; i < 16; i++) {
      const x = i * 48;
      const y = 129 + Math.abs(Math.sin(i * 5.4)) * 35;
      s.edge([[x,y],[x+2,y-.5],[x+4,y]],'#bbbcb4',.65);
    }
    s.box(-132,126,0,18,67,2,'#eeeee8','#a8aaa1','#babcaf',ink,.65);
    for (let y = 130; y < 192; y += 6) s.edge([[-132,y,2.2],[-114,y,2.2]],'#a0a398',.65);
    for (const x of [-132,-115]) s.box(x,188,0,2,2,8,silver,glass,'#8a8e83',ink,.6);
  }

  function seaMotion(s, time) {
    const range = extent(s);
    const waterline = shoreline(range,time,0);
    const dryline = shoreline(range,time,-1.9);
    s.face([...dryline,...waterline.slice().reverse()],'#f3f4ed');
    const near = shoreline(range,time,2);
    const far = shoreline(range,0,12);
    s.face([...near,...far.reverse()],'#b7bcb7');
    for (let i = 0; i < 13; i++) {
      const x = -332 + (i % 6) * 120 + Math.sin(time / 4 + i) * 7;
      const y = shoreY(x) + 18 + (i * 29) % 89;
      const wave = Math.sin(time * 1.1 + i);
      s.edge([[x,y],[x+9,y+wave],[x+22,y+wave*1.2]],'#dee1db',.88);
    }
  }

  function luxuryFloor(s, range) {
    strip(s,-range,range,148,251,'#bfc2ba');
    for (const y of [148,159,239,250]) s.edge([[-range,y],[range,y]],y%2?'#efefe9':'#9a9d94',1.5);
    s.edge([[-range,208],[range,208]],'#eeeee7',1.4,[18*s.scale,20*s.scale]);
    // Inlaid paving and a runner lead from the drop-off to the revolving door.
    for (const x of [-93,93]) {
      s.edge([[x,63],[x,144]],'#92968a',.9);
      s.edge([[x+2,63],[x+2,144]],'#c8cbc0',1.15);
    }
    strip(s,-32,32,85,148,'#7c8076');
    for (const x of [-29,-25,25,29]) s.edge([[x,85],[x,148]],'#e0e1d8',.85);
    for (let y=157; y<249; y+=12) strip(s,-26,26,y,y+4,'#e0e2db');
    for (let x=-296; x<=296; x+=74) {
      const y=-152;
      s.face([[x,y],[x+5,y-5],[x+10,y],[x+5,y+5]],'#aeb2a8');
    }
  }

  function airfield(s, range) {
    strip(s,-range,range,142,range,'#c9ccc4');
    s.edge([[-range,143],[range,143]],'#92968b',1.15);
    for (let x=-512; x<550; x+=54) {
      s.edge([[x,146],[x+15,164]],'#dfe1da',1);
      s.edge([[x,162],[x+8,162]],'#8f9486',.8);
    }
    for (const y of [240,244]) s.edge([[-range,y],[range,y]],'#f5f5f0',1.4);
    for (let x=-600; x<600; x+=140) {
      s.edge([[x,159],[x,202],[x+24,202]],'#95998e',.85,[4*s.scale,3*s.scale]);
      s.edge([[x-7,174],[x+7,174]],'#e7e8e0',1.5);
    }
    s.ring(19,0,'#f1f2eb',1.45,[],-188,214);
    for (const x of [-194,-183]) s.edge([[x,207],[x,221]],'#f3f4ee',2.2);
    s.edge([[-194,214],[-183,214]],'#f3f4ee',2.2);
    s.textOnFloor('A1',-165,228,14,'#8c9285');
  }

  function windsock(s,t) {
    const x=174,y=-112;
    s.box(x-3,y-3,0,6,6,2.2,'#cecec6','#93978b','#b7baae',ink,.55);
    s.edge([[x,y,2],[x,y,43]],'#666b5e',1.35);
    const wave=Math.sin(t*2.2)*2;
    for (let k=0;k<5;k++) {
      const left = k*3.9, right = left+3.9;
      const h0=42-1.2*k+Math.sin(t*2.2+k*.4)*.75;
      const h1=42-1.2*(k+1)+Math.sin(t*2.2+(k+1)*.4)*.75;
      s.face([[x+left,y+wave*k/5,h0+2.9-k*.35],[x+right,y+wave*(k+1)/5,h1+2.9-(k+1)*.35],
        [x+right,y+wave*(k+1)/5,h1-2.9+(k+1)*.35],[x+left,y+wave*k/5,h0-2.9+k*.35]],
        k%2?'#686d60':'#eeefe7',ink,.38);
    }
  }

  function wheel(s,x,y,z,r) {
    const [px,py]=s.p(x,y,z);
    s.dot(px,py,r*s.scale,r*1.1*s.scale,'#343832',ink,.4*s.scale);
    s.dot(px,py,r*.43*s.scale,r*.49*s.scale,'#bcc0b4');
  }

  function roadVehicle(s,x,y,style) {
    const coach=style==='coach', limo=style==='limo', pale=style==='escort';
    const length=coach?64:limo?67:43, span=coach?17:14;
    const base=pale?'#d6d9d1':coach?'#d5d8cf':'#595e53';
    s.shadow(x+length*.54,y+span*.82,length*.58,8,.2,.24);
    s.box(x,y,3,length,span,coach?12:4.8,pale?'#e5e7df':'#9ca194','#73796d',base,ink,.6);
    const verts=(points)=>points.map(([a,b,z])=>[x+a,y+b,z]);
    if(coach){
      s.box(x+1,y+1,15,length-2,span-2,4,'#e5e7df','#a1a69b','#b8bcb1',ink,.6);
      s.face(verts([[3,span,10],[length-3,span,10],[length-3,span,16],[3,span,16]]),glass,ink,.45);
      for(let i=9;i<length-3;i+=7.2) s.edge(verts([[i,span+.1,10],[i,span+.1,16]]),'#d2d6ca',.7);
      s.box(x+15,y+4,19,19,7,2.2,'#c0c5b8','#7c8275','#a2a899',ink,.45);
    }else{
      const back=7,nose=length-7,roofEnd=length-14;
      s.face(verts([[back,span-1,8],[back+5,span-2,14],[roofEnd,span-2,14],[nose,span-1,8]]),glass,ink,.6);
      s.face(verts([[back+5,2,14],[roofEnd,2,14],[roofEnd,span-2,14],[back+5,span-2,14]]),pale?pearl:'#92988c',ink,.6);
      s.face(verts([[roofEnd,2,14],[nose,.6,8],[nose,span-1,8],[roofEnd,span-2,14]]),'#a6aea0',ink,.52);
      s.edge(verts([[length*.52,span-1,8],[length*.52,span-2,14]]),'#3e443a',1.05);
      s.edge(verts([[3,span+.1,6],[length-3,span+.1,6]]),'#cdd0c5',.6);
      if(limo)s.edge(verts([[length*.33,span-1,8],[length*.33,span-2,14]]),'#3e443a',1.05);
    }
    for(const offset of [8,length-8])wheel(s,x+offset,y+span+.1,3.4,coach?3.7:3);
    s.edge(verts([[length,span-5,6],[length,span-1,6]]),'#f2f3ec',1.3);
  }

  function vessel(s,x,y,level,t) {
    const decks=level>=4?3:level>=2?1:0;
    const length=decks===3?83:decks===1?62:44;
    const width=decks===3?21:decks===1?20:15;
    const bob=Math.sin(t*2)*.8;
    const pts=arr=>arr.map(([a,b,z])=>[x+a,y+b,z+bob]);
    const hull=[[0,4,7],[length-12,0,7],[length,width*.47,7],[length-12,width,7],[1,width,7]];
    s.face(pts([[1,width,7],[length-12,width,7],[length,width*.47,7],[length-14,width-2,.4],[4,width-1,.4]]),'#747b6d',ink,.72);
    s.face(pts(hull),'#dadcd3',ink,.7);
    s.edge(pts([[2,width,6],[length-12,width,6],[length,width*.47,6]]),'#eeeeea',.75);
    const underway=t<5||t>9;
    if(underway){
      for(let i=0;i<3;i++){
        const a=-5-i*5;
        s.edge(pts([[a+4,1,0],[a-5,3,0],[a-13,width*.4,0],[a-4,width+2,0]]),'#e7eae3',.65);
      }
    }
    if(decks===1){
      s.box(x+3,y+3,7+bob,15,width-5,8,pearl,'#989f8f','#d1d6c8',ink,.6);
      s.face(pts([[5,width-2,10],[15,width-2,10],[15,width-2,13],[5,width-2,13]]),glass);
      for(let i=0;i<4;i++)s.edge(pts([[25+i*6,2,8],[25+i*6,width-2,8]]),'#8e9586',.7);
      s.face(pts([[length-9,2,7],[length,6,7],[length,width-6,7],[length-9,width-1,7]]),'#9da493',ink,.48);
    }else{
      const count=decks===3?3:1;
      for(let k=0;k<count;k++){
        const left=5+k*5,d=width-4-k*3,w=length-16-8*k,z=7+bob+k*5;
        s.box(x+left,y+2+k,z,w,d,4.9,'#f5f5ed','#abb1a2','#e1e5d9',ink,.55);
        for(let j=0;j<Math.floor(w/6);j++) {
          s.face([[x+left+2+j*6,y+2+k+d,z+1],[x+left+5+j*6,y+2+k+d,z+1],[x+left+5+j*6,y+2+k+d,z+3.7],[x+left+2+j*6,y+2+k+d,z+3.7]],glass);
        }
      }
      if(decks===3)s.box(x+24,y+8,22+bob,8,5,6,'#8c9284','#51594b','#747c6c',ink,.55);
    }
    const flagX=x+length*.30,flagY=y+4;
    s.edge([[flagX,flagY,9+bob],[flagX,flagY,22+decks*3+bob]],ink,.72);
    s.face([[flagX,flagY,22+decks*3+bob],[flagX-7,flagY+Math.sin(t*3),20+decks*3+bob],[flagX,flagY,18+decks*3+bob]],ink);
  }

  function aircraft(s,x,y,level,t) {
    const fighter=level<=1, jumbo=level>=4;
    const length=fighter?53:jumbo?93:73, half=fighter?3.3:jumbo?6.6:4.9;
    const wing=fighter?17:jumbo?37:27;
    const gear=5;
    const local=points=>points.map(([a,b,z])=>[x+a,y+b,z]);
    s.shadow(x+length*.52,y+6,length*.57,wing*.47,.23,.2);
    for(const sign of [-1,1]){
      s.face(local([[length*.66,sign*2,gear+2],[length*.30,sign*wing,gear+2.8],[length*.21,sign*(wing-.8),gear+2.8],[length*.40,sign*2,gear+1.1]]),'#c4c9bd',ink,.75);
      s.face(local([[length*.22,sign,gear+2],[2,sign*wing*.5,gear+3],[0,sign*wing*.47,gear+3],[length*.08,sign,gear+1.5]]),'#abb3a3',ink,.65);
      if(!fighter){
        for(let i=0;i<(jumbo?2:1);i++){
          const yy=sign*(wing*(.43+i*.28));
          s.box(x+length*(.47-i*.09),y+yy,gear+.3,10,2.8,2.5,'#b0b6a8','#59614f','#89917e',ink,.46);
        }
      }
    }
    const profile=[[0,0,gear+3],[length*.08,-half*.7,gear+3],[length*.65,-half,gear+3],[length*.9,-half*.6,gear+3],[length,0,gear+2],[length*.91,half*.6,gear+2],[length*.65,half,gear+2],[length*.07,half*.7,gear+2]];
    s.face(local(profile),fighter?'#b7bfb0':pearl,ink,.8);
    s.face(local([[2,0,gear+2],[length*.07,half*.7,gear+2],[length*.65,half,gear+2],[length*.91,half*.6,gear+2],[length,0,gear+2],[length*.84,half*.5,gear-1.4],[length*.17,half*.65,gear-2]]),'#a9b1a1',ink,.55);
    s.face(local([[length*.72,-half*.68,gear+3.3],[length*.82,-half*.47,gear+4],[length*.9,0,gear+3],[length*.82,half*.57,gear+3],[length*.73,half*.65,gear+3]]),glass,ink,.4);
    s.face(local([[length*.08,0,gear+3],[2,0,gear+13],[length*.10,0,gear+13],[length*.25,0,gear+3]]),fighter?'#626a5a':'#8c9682',ink,.7);
    if(!fighter)for(let i=0;i<(jumbo?12:8);i++){
      const w=length*.23+i*3.4;
      s.edge(local([[w,half*.9,gear+2.5],[w+1.2,half*.9,gear+2.5]]),'#4d5547',.8);
    }
    const lights=Math.cos(t*4)>.8;
    if(lights){const [px,py]=s.p(x+length*.28,y+wing,gear+3);s.dot(px,py,1.3*s.scale,1.2*s.scale,'#fbfcf6')}
  }

  function helicopter(s,x,y,t) {
    const lift=t<5?Math.min(33,(5-t)*6.6):t>9?Math.min(39,(t-9)*8):0;
    const h=6+lift, pts=a=>a.map(([xx,yy,z])=>[x+xx,y+yy,h+z]);
    s.shadow(x+11,y+3,22,7,.23);
    for(const sign of [-1,1]){
      s.edge(pts([[-7,sign*5,-4],[15,sign*5,-4],[17,sign*5,-3]]),ink,.95);
      s.edge(pts([[-3,sign*3,-1],[-3,sign*5,-4],[11,sign*5,-4],[11,sign*3,-1]]),'#777f6c',.64);
    }
    s.face(pts([[-4,0,3],[-24,0,7],[-27,0,14],[-24,0,13],[-21,0,8],[0,0,7]]),silver,ink,.7);
    s.face(pts([[-6,-3,5],[0,-6,8],[13,-5,7],[20,0,4],[15,6,2],[0,6,2]]),pearl,ink,.78);
    s.face(pts([[-6,-3,5],[0,6,2],[15,6,2],[20,0,4],[16,3,0],[2,5,-1],[-5,2,1]]),'#929a88',ink,.7);
    s.face(pts([[9,-5,7],[14,-4,6.6],[20,0,4],[15,4.8,3],[10,4.8,4.6]]),glass,ink,.45);
    s.edge(pts([[6,0,7],[6,0,12]]),ink,1.2);
    const a=t*21;
    for(let i=0;i<2;i++){
      const v=a+i*Math.PI/2,dx=Math.cos(v)*25,dy=Math.sin(v)*25;
      s.edge(pts([[6-dx,-dy,12],[6+dx,dy,12]]),ink,1.25);
    }
  }

  function backdrop(scene,branch) {
    const range=extent(scene);
    if(branch==='seaside')seasideFloor(scene,range);
    if(branch==='luxury')luxuryFloor(scene,range);
    if(branch==='airport')airfield(scene,range);
  }

  function motion(scene,branch,time) {
    if(branch==='seaside')seaMotion(scene,time);
    if(branch==='luxury'){
      const x=(time*48)%1090-560;
      roadVehicle(scene,x,221,'escort');
    }
    if(branch==='airport')windsock(scene,time);
  }

  function vehicle(scene,branch,car) {
    const t=car.age;
    const x=t<5?-430+t*55:t<9?-155:-155+(t-9)*65;
    const y=185, level=car.level;
    switch(branch){
      case 'seaside':
        vessel(scene,x,y,level,t);
        return true;
      case 'luxury':
        if(level>=4)roadVehicle(scene,x-54,y+2,'escort');
        roadVehicle(scene,x,y,level>=4?'limo':level>=2?'coach':'sedan');
        return true;
      case 'airport':
        if(level===0)helicopter(scene,x,y,t);
        else aircraft(scene,x,y,level,t);
        return true;
      default:return false;
    }
  }

  return {backdrop,motion,vehicle};
})();
