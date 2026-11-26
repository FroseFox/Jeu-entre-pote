'use strict';

const EventArt = (() => {
  const ink = '#282b24', paper = '#f5f5ef', metal = '#aeb2a6';
  const tau = Math.PI * 2;

  // Coordinates inside a sprite are screen-facing scene units, like the visitor artwork.
  function sprite(scene, x, y, z, paint) {
    const [px, py] = scene.p(x, y, z);
    const c = scene.c;
    c.save();
    c.translate(px, py);
    c.scale(scene.scale, scene.scale);
    paint(c);
    c.restore();
  }

  function tag(c, text, x, y) {
    c.font = 'bold 6.8px DM, Arial, sans-serif';
    const w = Math.max(15, c.measureText(text).width + 6);
    c.fillStyle = paper;
    c.strokeStyle = ink;
    c.lineWidth = .75;
    c.beginPath();
    c.roundRect(x - w / 2, y - 5.4, w, 10.8, 3);
    c.fill();
    c.stroke();
    c.fillStyle = ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, y + .2);
  }

  function heart(c, x, y, size) {
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    c.beginPath();
    c.moveTo(0, 1);
    c.bezierCurveTo(-2.1, -.2, -1.7, -1.6, -.7, -1.55);
    c.quadraticCurveTo(-.2, -1.5, 0, -.95);
    c.bezierCurveTo(.95, -2.45, 2.35, -.8, 0, 1);
    c.fillStyle = ink;
    c.fill();
    c.restore();
  }

  function balloon(scene, b) {
    const sway = Math.sin(b.age * 1.75);
    sprite(scene, b.x, b.y, b.z, c => {
      c.rotate(sway * .045);
      c.beginPath();
      c.moveTo(0, 21);
      c.bezierCurveTo(2 + sway * 2, 28, -5, 29, -2 + sway * 2, 38);
      c.strokeStyle = '#62665c';
      c.lineWidth = .8;
      c.stroke();
      scene.poly([[-.4,25],[-6,26 + sway],[-.6,29]], ink);
      scene.poly([[-2,32],[3,32.3 - sway],[-2,36]], '#92978a', ink, .55);

      const skin = c.createRadialGradient(-7, -9, 1, 0, 1, 24);
      skin.addColorStop(0, '#fff');
      skin.addColorStop(.52, '#eeefe8');
      skin.addColorStop(1, '#babeb2');
      c.beginPath();
      c.moveTo(0, 21);
      c.bezierCurveTo(-11, 18, -18.4, 7, -18.4, -2.8);
      c.bezierCurveTo(-18.4, -13, -11.3, -20.8, -.6, -21);
      c.bezierCurveTo(10.7, -21.2, 18.2, -13.3, 18.2, -3);
      c.bezierCurveTo(18.2, 8.5, 10.7, 17.8, 0, 21);
      c.closePath();
      c.fillStyle = skin;
      c.fill();
      c.strokeStyle = ink;
      c.lineWidth = 1.15;
      c.stroke();
      c.beginPath();
      c.moveTo(-7, -18.8);
      c.bezierCurveTo(-18, -10, -17, 5, -9.3, 12.3);
      c.moveTo(9.5, -17);
      c.bezierCurveTo(17, -8, 14.4, 7.1, 8.3, 13.2);
      c.strokeStyle = '#999d90';
      c.lineWidth = .7;
      c.stroke();
      scene.dot(-7.8,-13.7,3.8,1.4,'#fff');
      scene.dot(0,-1.7,14,7.8,ink);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = 'bold 10px DM, Arial, sans-serif';
      c.fillStyle = paper;
      c.fillText('R&R', 0, -1.15);
      scene.poly([[0,20],[-2.1,23.1],[2.2,23.2]], ink);
    });
  }

  function burst(scene, e) {
    const t = Math.max(0, e.age / .9);
    if (t >= 1) return;
    sprite(scene, e.x, e.y, e.z, c => {
      c.globalAlpha *= Math.min(1, (1 - t) * 2);
      if (t < .33) {
        c.beginPath();
        c.arc(0, 0, 7 + 69 * t, 0, tau);
        c.strokeStyle = '#f8f8f3';
        c.lineWidth = 3.5 - 8 * t;
        c.stroke();
      }
      for (let i = 0; i < 17; i++) {
        const angle = i * 2.39996, len = (20 + (i * 17 % 27)) * (1 - Math.pow(1 - t, 2));
        const x = Math.cos(angle) * len, y = Math.sin(angle) * len + t * t * 22;
        c.save();
        c.translate(x, y);
        c.rotate(angle + (i % 3 - 1) * 7 * t);
        if (i % 3) {
          c.fillStyle = i % 2 ? ink : metal;
          c.fillRect(-1.7, -.7, 3.4, 1.5);
        } else {
          scene.poly([[0,-2.1],[1.3,0],[0,2.1],[-1.3,0]], paper, ink, .6);
        }
        c.restore();
      }
    });
  }

  function drone(scene, x, y, z) {
    sprite(scene, x, y, z, c => {
      const phase = scene.time * 35;
      for (const [dx,dy] of [[-9,-4],[8,-5],[-7,3],[11,2]]) {
        scene.line([[0,0],[dx,dy]],ink,1.6);
        scene.dot(dx,dy,3.9,1.2,'#d4d7cd','#696e61',.45);
        const span = Math.cos(phase + dx) * 4;
        scene.line([[dx-span,dy-.7],[dx+span,dy+.7]],ink,.8);
      }
      scene.line([[-3,2],[-4,5],[2,5]],ink,.8);
      scene.poly([[-5,-1],[0,-4],[6,-1.5],[4.4,2.1],[0,3],[-4,1]],paper,ink,.85);
      scene.dot(1.4,1.2,1.7,1.45,ink);
      scene.dot(1.3,1, .6,.5, '#fafff2');
    });
  }

  function courierBadge(scene, a, remaining) {
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    sprite(scene, a.x, a.y, a.fly || 0, c => {
      const urgent = remaining <= 4;
      const width = 17 + (remaining >= 10 ? 4 : 0), top = -39;
      c.fillStyle = urgent ? ink : paper;
      c.strokeStyle = ink;
      c.lineWidth = .7;
      c.beginPath(); c.roundRect(-width / 2, top, width, 10, 3); c.fill(); c.stroke();
      const sign = urgent ? paper : ink;
      scene.dot(-width / 2 + 5.4, top + 5.2, 2.6, 2.6, '', sign, .8);
      scene.line([[-width/2+5.4,top+3.4],[-width/2+5.4,top+5.2],[-width/2+6.65,top+5.9]], sign, .65);
      c.fillStyle = sign;
      c.font = 'bold 6.7px DM, Arial, sans-serif';
      c.textBaseline = 'middle';
      c.textAlign = 'center';
      c.fillText(String(Math.ceil(remaining)), 3.9, top + 5.4);
    });
  }

  function bagShell(scene, c) {
    scene.line([[-2,-7],[-2,-10],[1.7,-10],[1.7,-7]],ink,.75);
    scene.poly([[-3.8,-7.8],[-1.4,-9],[4.3,-7.8],[4.6,-.5],[2.3,1.2],[-3.6,.1]],metal,ink,.75);
    scene.poly([[-3.7,-7.6],[1.9,-6.6],[2.2,1],[-3.6,.1]],'#757a6d',ink,.55);
    for (const x of [-2.1,-.75,.6]) scene.line([[x,-6],[x+.13,-1.2]],'#acb1a2',.55);
    scene.dot(-2.6,.25,.77,.85,ink);
    scene.dot(2.3,1.2,.77,.85,ink);
  }

  function luggage(scene, bag) {
    sprite(scene, bag.x, bag.y, bag.z || 0, c => {
      c.rotate(bag.z > .1 ? (bag.age || 0) * 6 : -.12);
      bagShell(scene, c);
    });
  }

  function cargo(scene, a) {
    const {x,y} = a, z = a.fly || 0;
    const face = [[x+2,y+9,z+2],[x+18,y+9,z+2],[x+18,y+9,z+4],[x+2,y+9,z+4]];
    scene.face(face, '#505549', ink, .75);
    scene.box(x+2,y-3,z+4,16,12,13,'#e0e2d7','#a3a99a','#c2c7b8',ink,.8);
    scene.face([[x+8.2,y-3,z+17.15],[x+11,y-3,z+17.15],[x+11,y+9,z+17.15],[x+8.2,y+9,z+17.15]],'#777c70');
    scene.face([[x+8.2,y+9.1,z+17],[x+11,y+9.1,z+17],[x+11,y+9.1,z+4],[x+8.2,y+9.1,z+4]],'#8b9182');
    for (const dx of [4,16]) {
      const [px,py] = scene.p(x+dx,y+9,z+1);
      scene.dot(px,py,1.4*scene.scale,1.6*scene.scale,ink);
    }
    scene.edge([[x+2,y+7,z+3],[x-.5,y+7,z+11],[x-3,y+4,z+11]],ink,.95);
  }

  function entourage(scene, a) {
    // Most visitors have no animated accessory.
    if (!['guide','fan','idol','robot','repair','parade','cargo','giant','traveler','vip','courier'].includes(a.type)) return;
    if (a.type === 'cargo') { cargo(scene, a); return; }
    const stageTime = scene.time + (a.phase || 0) * .4;
    sprite(scene, a.x, a.y, a.fly || 0, c => {
      const sway = Math.sin(stageTime * 5.5);
      if (a.mode === 'flung') c.rotate(a.age * 6);
      switch (a.type) {
        case 'guide': {
          scene.line([[3,-12],[3.8,-32]],ink,1);
          scene.poly([[3.8,-32],[10,-32.5+sway],[13,-30],[9,-27.7+sway],[3.6,-27.5]],paper,ink,.75);
          scene.line([[5,-30],[8,-30]],ink,.8);
          break;
        }
        case 'idol':
        case 'fan': {
          if (a.type === 'idol') {
            scene.poly([[-4.8,-23.5],[-3.4,-28],[-.2,-25.3],[2.4,-28.5],[4.3,-24]],paper,ink,.7);
          } else {
            scene.line([[3,-11],[6,-17],[8,-18.5+sway]],ink,1.35);
          }
          const count = a.type === 'idol' ? 3 : 1;
          for (let i=0;i<count;i++) {
            const rise = (stageTime*.65+i/count)%1;
            c.save();
            c.globalAlpha *= Math.sin(Math.PI*rise);
            heart(c, (i%2?1:-1)*(5.5+4*rise), -24-12*rise, 1.25+.55*rise);
            c.restore();
          }
          break;
        }
        case 'repair':
        case 'robot': {
          scene.poly([[-4.5,-17],[-.4,-18.4],[4.4,-17],[4.7,-8.6],[.5,-7],[-4.2,-8.4]],metal,ink,.8);
          scene.dot(-.3,-20.4,5.4,4.65,'#d4d7cb',ink,.9);
          scene.poly([[-4.3,-20.7],[3.9,-20.9],[3.7,-18.5],[-4,-18.3]],ink);
          scene.dot(-1.6,-19.7,.75,.64,paper);
          scene.dot(1.4,-19.8,.75,.64,paper);
          scene.line([[-1.4,-24.6],[-1.9,-27]],ink,.7);
          scene.dot(-1.9,-27,.95,.95,ink);
          scene.line([[3.4,-13.5],[6,-13],[7,-16.6+sway]],ink,1.45);
          scene.line([[5.8,-18+sway],[6.6,-16.4+sway],[8,-16.2+sway],[8.9,-18.2+sway]],ink,1);
          break;
        }
        case 'parade': {
          scene.line([[-2.7,-11],[-6,-28],[-6.6,-32]],ink,.8);
          scene.poly([[-6.4,-32],[-2.5,-33+sway],[2.8,-31.6+sway],[7,-32+sway], [4,-29.6+sway],[6.5,-27.2+sway],[1.7,-27.7+sway],[-2.2,-28.5+sway],[-5.5,-27.5]],ink);
          scene.line([[-4.4,-30.7],[-1.8,-31.1+sway],[2.5,-30.1+sway]],paper,.7);
          scene.line([[-3,-17],[3.2,-9]],paper,1);
          break;
        }
        case 'giant': {
          // A tall overcoat silhouette preserves the giant's outline at distant zoom.
          c.save();
          const bob = Math.abs(sway) * (a.move ?? 1);
          c.scale(2.3,2.3);
          scene.line([[-2,-8],[-2.7,-4],[-3.5+sway,0]],ink,3.7);
          scene.line([[2,-8],[2.5,-4],[3.5-sway,-.3]],ink,3.7);
          c.translate(0,-bob*.48);
          scene.poly([[-4,-17],[-1,-18.1],[3.2,-17.3],[5.4,-8],[1,-6.2],[-5,-8]],'#55594e',ink,.75);
          scene.line([[-3.5,-16.2],[-5.5,-13],[-5,-9.4]],ink,2.1);
          scene.line([[3.2,-16],[5.45,-13],[5.6,-9.9]],'#45493f',2.2);
          scene.dot(-.4,-21,4.9,4.9,'#383b33',ink,.7);
          scene.line([[-3.8,-22.9],[-2.2,-24.3],[.4,-24.8]],'#8a9083',.6);
          scene.line([[-2.7,-17.3],[-.2,-16.35],[2.3,-17.2]],'#aeb3a4',.65);
          c.restore();
          break;
        }
        case 'traveler': {
          if (a.mode === 'flung' || a.luggageDetached) break;
          scene.line([[3.6,-10],[8,-7]],ink,.65);
          c.translate(9, -.15);
          c.rotate(-.12);
          bagShell(scene, c);
          break;
        }
        case 'vip': {
          scene.poly([[-3.6,-16.6],[-1.4,-17.3],[2.6,-16.6],[4,-8],[-3.5,-8.3]],paper,ink,.65);
          scene.poly([[-1.9,-16.9],[.2,-16],[1.55,-17],[.1,-13.2]],ink);
          scene.line([[-1.9,-16.7],[-.8,-14.5],[-1.45,-13.9],[.5,-11.4]],'#666a60',.48);
          tag(c, 'VIP', 0, -33.5);
          break;
        }
        case 'courier': {
          scene.poly([[2.2,-13.7],[5.3,-15.1],[9,-13.5],[9,-8.6],[5.9,-6.9],[2.2,-8.6]],metal,ink,.65);
          scene.line([[2.3,-13.7],[5.9,-12],[8.9,-13.4]],ink,.5);
          scene.line([[5.9,-12],[5.9,-7]],ink,.5);
          break;
        }
      }
    });
  }

  return { balloon, burst, drone, courierBadge, entourage, luggage };
})();
