/* gf-nebula3-20260719 : full-panel interactive nebula brain, seamless rounded feather */
(function(){
  "use strict";
  var GF_NEBULA3 = "20260719";
  function injectStyle(){
    if(document.getElementById("gf-nebula-style")) return;
    var st=document.createElement("style"); st.id="gf-nebula-style";
    st.textContent=".li-brain-bg{position:absolute;inset:1px;width:calc(100% - 2px);height:calc(100% - 2px);z-index:0;border-radius:35px}"
      +".living-intelligence{grid-template-columns:1.15fr 1fr}"
      +".living-intelligence .li-copy,.living-intelligence .li-metrics,.living-intelligence .li-foot{position:relative;z-index:1}"
      +"@media(max-width:980px){.living-intelligence{grid-template-columns:1fr}}";
    (document.body||document.documentElement).appendChild(st);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",injectStyle);
  else injectStyle();
  function drawRealBrain(canvas, graph){
    if(!canvas || !graph || !Array.isArray(graph.nodes) || !graph.nodes.length) return false;
    var ctx = canvas.getContext("2d");
    if(!ctx) return false;
    var TAU = Math.PI * 2;
    var reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch(e){}

    /* palette per node type */
    var PAL = {
      agent:[195,166,255], governance:[255,211,106], brain:[34,230,255], domain:[34,230,255],
      loop:[77,185,255], semantic:[126,231,135], topic:[126,231,135]
    };
    function col(t){ return PAL[t] || PAL.domain; }
    function rgba(c,a){ return "rgba("+c[0]+","+c[1]+","+c[2]+","+a+")"; }
    function hash(i){ return (((i|0)*2654435761)>>>16 & 1023)/1023; }

    /* devicePixelRatio-aware full-panel sizing + pre-rendered edge-dissolve mask */
    var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    var W=560, H=560, CX=280, CY=280, R=190, mask=null, amb=null;
    var narrowMQ=null; try{ narrowMQ=window.matchMedia("(max-width: 980px)"); }catch(e){}
    function buildMask(){
      /* rounded-rect signed-distance feather, smoothstep eased -- no straight seams */
      var sc=0.5, mw=Math.max(2,Math.round(W*sc)), mh=Math.max(2,Math.round(H*sc));
      mask=document.createElement("canvas"); mask.width=mw; mask.height=mh;
      var mc=mask.getContext("2d");
      var img=mc.createImageData(mw,mh), da=img.data;
      var hx=mw/2, hh=mh/2;
      var rr=Math.min(35*sc,hx,hh);
      var fe=0.22*Math.min(mw,mh);
      var k=3;
      for(var y=0;y<mh;y++){
        var py=Math.abs(y+0.5-hh)-(hh-rr);
        for(var x=0;x<mw;x++){
          var px=Math.abs(x+0.5-hx)-(hx-rr);
          var ax=px>0?px:0, ay=py>0?py:0;
          var sd=Math.sqrt(ax*ax+ay*ay)+Math.min(Math.max(px,py),0)-rr;
          var t=(-sd)/fe; if(t<0)t=0; if(t>1)t=1;
          var a=t*t*(3-2*t);
          da[k]=(a*255)|0; k+=4;
        }
      }
      mc.putImageData(img,0,0);
    }
    function buildAmb(){
      /* panel-ambience underlay: mirrors the section's own cyan/violet accents */
      var aw=Math.max(2,Math.round(W/2)), ah=Math.max(2,Math.round(H/2));
      amb=document.createElement("canvas"); amb.width=aw; amb.height=ah;
      var ac=amb.getContext("2d");
      var g1=ac.createRadialGradient(aw*0.18,ah*0.5,0,aw*0.18,ah*0.5,Math.max(aw,ah)*0.34);
      g1.addColorStop(0,"rgba(42,220,255,0.085)"); g1.addColorStop(1,"rgba(42,220,255,0)");
      ac.fillStyle=g1; ac.fillRect(0,0,aw,ah);
      var g2=ac.createRadialGradient(aw*0.84,ah*0.2,0,aw*0.84,ah*0.2,Math.max(aw,ah)*0.32);
      g2.addColorStop(0,"rgba(179,92,255,0.08)"); g2.addColorStop(1,"rgba(179,92,255,0)");
      ac.fillStyle=g2; ac.fillRect(0,0,aw,ah);
    }
    function resize(){
      var w=canvas.clientWidth||0, h=canvas.clientHeight||0;
      if(w<40) w=560;
      if(h<40) h=560;
      W=w; H=h; R=Math.min(W,H)*0.42;
      CX=(narrowMQ&&narrowMQ.matches)?W*0.5:W*0.62; CY=H*0.5;
      canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
      buildMask(); buildAmb();
    }
    resize();

    /* cluster anchors on the sphere -- constellations per type */
    var ANCH = {
      brain:[0,0,0], governance:[0,-0.22,0.05],
      agent:[0.9,-0.2,0.3], loop:[-0.85,-0.25,-0.35],
      domain:[0.12,0.72,-0.6], semantic:[-0.55,0.5,0.6], topic:[-0.1,-0.8,0.45]
    };
    function anchor(t){ return ANCH[t] || ANCH.domain; }

    var nodes = graph.nodes.slice(0,90).map(function(n,i){
      var a = anchor(n.type);
      return { id:n.id, label:String(n.label||n.id), type:n.type, w:n.weight||2,
        x:a[0]*0.62+(hash(i)-0.5)*0.6, y:a[1]*0.62+(hash(i+31)-0.5)*0.6, z:a[2]*0.62+(hash(i+77)-0.5)*0.6,
        vx:0, vy:0, vz:0, sx:0, sy:0, sd:1 };
    });
    var byId = {}; nodes.forEach(function(n){ byId[n.id]=n; });
    var edges = (graph.edges||[]).filter(function(e){ return byId[e.from] && byId[e.to]; })
      .map(function(e,i){ return { a:byId[e.from], b:byId[e.to], w:e.weight||1,
        bow:(hash(i+13)<0.5?-1:1)*(0.09+hash(i+41)*0.13), cx:0, cy:0 }; });

    /* force layout: repulsion + edge springs + type-cluster gravity */
    for(var it=0; it<170; it++){
      for(var i=0;i<nodes.length;i++){ var n1=nodes[i];
        for(var j=i+1;j<nodes.length;j++){ var n2=nodes[j];
          var dx=n1.x-n2.x, dy=n1.y-n2.y, dz=n1.z-n2.z;
          var d2=dx*dx+dy*dy+dz*dz+0.002, f=0.0011/d2;
          n1.vx+=dx*f; n1.vy+=dy*f; n1.vz+=dz*f;
          n2.vx-=dx*f; n2.vy-=dy*f; n2.vz-=dz*f;
        }
      }
      edges.forEach(function(e){
        var dx=e.a.x-e.b.x, dy=e.a.y-e.b.y, dz=e.a.z-e.b.z;
        var d=Math.sqrt(dx*dx+dy*dy+dz*dz)+1e-6, f=(d-0.32)*0.018*Math.min(3,e.w);
        e.a.vx-=dx/d*f; e.a.vy-=dy/d*f; e.a.vz-=dz/d*f;
        e.b.vx+=dx/d*f; e.b.vy+=dy/d*f; e.b.vz+=dz/d*f;
      });
      nodes.forEach(function(n){
        var a=anchor(n.type), g=(n.type==="brain"||n.type==="governance")?0.05:0.028;
        n.vx+=(a[0]*0.8-n.x)*g; n.vy+=(a[1]*0.8-n.y)*g; n.vz+=(a[2]*0.8-n.z)*g;
        n.x+=n.vx; n.y+=n.vy; n.z+=n.vz;
        n.vx*=0.78; n.vy*=0.78; n.vz*=0.78;
        var m=Math.sqrt(n.x*n.x+n.y*n.y+n.z*n.z);
        if(m>1.05){ n.x*=1.05/m; n.y*=1.05/m; n.z*=1.05/m; }
      });
    }

    /* cluster centroids for the nebula fog */
    var groups = {};
    nodes.forEach(function(n){
      var key=(n.type==="brain")?"domain":(n.type==="topic")?"semantic":n.type;
      var g=groups[key]=groups[key]||{c:col(n.type),x:0,y:0,z:0,n:0};
      g.x+=n.x; g.y+=n.y; g.z+=n.z; g.n++;
    });
    var fogClusters = [];
    Object.keys(groups).forEach(function(k,gi){
      var g=groups[k]; if(!g.n) return;
      var blobs=[], nb=3+(gi%2);
      for(var b=0;b<nb;b++){
        blobs.push({ ph:hash(gi*17+b*7)*TAU, ph2:hash(gi*29+b*11)*TAU,
          sp:0.00012+hash(gi+b)*0.0001, amp:18+hash(gi*3+b)*26, r:54+hash(gi*5+b)*46 });
      }
      fogClusters.push({ x:g.x/g.n*0.85, y:g.y/g.n*0.85, z:g.z/g.n*0.85, c:g.c, blobs:blobs });
    });

    /* pre-rendered sprites: no per-frame gradient creation */
    function glowSprite(c){
      var s=document.createElement("canvas"); s.width=s.height=64;
      var sc=s.getContext("2d");
      var g=sc.createRadialGradient(32,32,0,32,32,32);
      g.addColorStop(0,"rgba(255,255,255,0.95)");
      g.addColorStop(0.14,rgba(c,0.9));
      g.addColorStop(0.42,rgba(c,0.28));
      g.addColorStop(1,rgba(c,0));
      sc.fillStyle=g; sc.fillRect(0,0,64,64);
      return s;
    }
    function fogSprite(c){
      var s=document.createElement("canvas"); s.width=s.height=256;
      var sc=s.getContext("2d");
      var g=sc.createRadialGradient(128,128,0,128,128,128);
      g.addColorStop(0,rgba(c,0.13));
      g.addColorStop(0.55,rgba(c,0.055));
      g.addColorStop(1,rgba(c,0));
      sc.fillStyle=g; sc.fillRect(0,0,256,256);
      return s;
    }
    var sprCache={}, fogCache={};
    function sprFor(t){ var k=col(t).join(","); return sprCache[k]||(sprCache[k]=glowSprite(col(t))); }
    function fogFor(c){ var k=c.join(","); return fogCache[k]||(fogCache[k]=fogSprite(c)); }
    var pulseSpr=glowSprite([217,251,255]);

    /* background star field */
    var stars=[];
    for(var s2=0;s2<78;s2++){
      stars.push({ x:0.15+hash(s2*3+1)*0.7, y:0.15+hash(s2*5+2)*0.7, r:0.5+hash(s2*7+3)*1.1,
        ph:hash(s2*11+4)*TAU, sp:0.0006+hash(s2*13+5)*0.0018 });
    }

    /* pulses riding the filaments */
    var pulses=[];
    var np=Math.min(9,edges.length);
    for(var p=0;p<np;p++) pulses.push({ e:(p*7)%edges.length, t:hash(p*19+3), s:0.0035+(p%3)*0.0015 });

    /* interaction state */
    var rotY=0.3, rotX=0.38, velY=0, velX=0;
    var zoom=1, targetZoom=1;
    var engaged=false, hintA=1;
    var dragging=false, lastX=0, lastY=0;
    var hoverX=-1e4, hoverY=-1e4, hoverN=null;
    var lastInteract=-1e9;
    function bump(){ lastInteract=performance.now(); }

    if(!reduced){
      canvas.style.cursor="grab";
      canvas.style.touchAction="pan-y";
      canvas.addEventListener("pointerdown",function(e){
        engaged=true; dragging=true; bump();
        lastX=e.clientX; lastY=e.clientY; velX=0; velY=0;
        if(canvas.setPointerCapture){ try{ canvas.setPointerCapture(e.pointerId); }catch(err){} }
        canvas.style.cursor="grabbing";
      });
      canvas.addEventListener("pointermove",function(e){
        var r=canvas.getBoundingClientRect();
        if(r.width>0){ hoverX=(e.clientX-r.left)*(W/r.width); hoverY=(e.clientY-r.top)*(H/r.height); }
        if(dragging){
          bump();
          var dx=e.clientX-lastX, dy=e.clientY-lastY;
          lastX=e.clientX; lastY=e.clientY;
          velY=dx*0.005; velX=dy*0.005;
          rotY+=velY; rotX=Math.max(-1.3,Math.min(1.3,rotX+velX));
        }
      });
      function endDrag(){ dragging=false; canvas.style.cursor="grab"; bump(); }
      canvas.addEventListener("pointerup",endDrag);
      canvas.addEventListener("pointercancel",endDrag);
      canvas.addEventListener("pointerleave",function(){ hoverX=hoverY=-1e4; });
      canvas.addEventListener("wheel",function(e){
        if(!engaged || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault(); bump();
        targetZoom=Math.max(0.5,Math.min(3,targetZoom*Math.exp(-e.deltaY*0.0013)));
      },{passive:false});
      window.addEventListener("resize",resize);
    }

    function frame(ts){
      var now=(typeof ts==="number")?ts:performance.now();
      if(!reduced && !dragging){
        rotY+=velY; rotX=Math.max(-1.3,Math.min(1.3,rotX+velX));
        velY*=0.94; velX*=0.94;
        if(now-lastInteract>4000) rotY+=0.0022; /* idle auto-rotate */
      }
      zoom+=(targetZoom-zoom)*0.1;
      if(engaged && hintA>0) hintA=Math.max(0,hintA-0.02);

      var cs=Math.cos(rotY), sn=Math.sin(rotY), ct=Math.cos(rotX), st=Math.sin(rotX);
      var RZ=R*zoom;
      function proj(x,y,z,o){
        var X=x*cs-z*sn, Z=x*sn+z*cs, Y=y*ct-Z*st; Z=y*st+Z*ct;
        var d=1.7/(1.7+Z);
        o.sx=CX+X*RZ*d; o.sy=CY+Y*RZ*d; o.sd=d;
      }
      var i,n;
      for(i=0;i<nodes.length;i++){ n=nodes[i]; proj(n.x,n.y,n.z,n); }

      /* hover pick: nearest node within 24px */
      hoverN=null;
      var bestD=24*24;
      for(i=0;i<nodes.length;i++){ n=nodes[i];
        var hx=n.sx-hoverX, hy=n.sy-hoverY, hd=hx*hx+hy*hy;
        if(hd<bestD){ bestD=hd; hoverN=n; }
      }

      ctx.clearRect(0,0,W,H);
      ctx.globalCompositeOperation="lighter";

      /* panel ambience underlay -- the canvas is the panel's atmosphere */
      if(amb) ctx.drawImage(amb,0,0,W,H);

      /* twinkling stars */
      for(i=0;i<stars.length;i++){
        var stq=stars[i], sa=0.10+0.42*(0.5+0.5*Math.sin(now*stq.sp+stq.ph));
        ctx.globalAlpha=sa;
        ctx.drawImage(pulseSpr, stq.x*W-stq.r*2, stq.y*H-stq.r*2, stq.r*4, stq.r*4);
      }
      ctx.globalAlpha=1;

      /* drifting per-cluster nebula fog */
      var fo={sx:0,sy:0,sd:1};
      for(i=0;i<fogClusters.length;i++){
        var f=fogClusters[i];
        proj(f.x,f.y,f.z,fo);
        var fspr=fogFor(f.c), fz=(0.55+0.45*zoom)*1.4;
        for(var b=0;b<f.blobs.length;b++){
          var bl=f.blobs[b];
          var ox=Math.sin(now*bl.sp+bl.ph)*bl.amp, oy=Math.cos(now*bl.sp*0.8+bl.ph2)*bl.amp*0.7;
          var rr=bl.r*fz*fo.sd;
          ctx.globalAlpha=Math.max(0.25,Math.min(1,fo.sd));
          ctx.drawImage(fspr, fo.sx+ox*zoom-rr, fo.sy+oy*zoom-rr, rr*2, rr*2);
        }
      }
      ctx.globalAlpha=1;

      /* curved filaments (quadratic bezier, perpendicular bow) */
      var lw=Math.min(1.6,Math.max(0.7,zoom));
      for(i=0;i<edges.length;i++){
        var e=edges[i], A=e.a, B=e.b;
        var edx=B.sx-A.sx, edy=B.sy-A.sy;
        e.cx=(A.sx+B.sx)/2 - edy*e.bow;
        e.cy=(A.sy+B.sy)/2 + edx*e.bow;
        var depth=Math.max(0.1,(A.sd+B.sd)/2-0.45), ew=Math.min(1,e.w/5);
        var hot=hoverN&&(A===hoverN||B===hoverN);
        ctx.strokeStyle=hot?"rgba(190,242,255,0.65)":rgba(col(A.type),(0.05+0.20*ew*depth+0.05*depth));
        ctx.lineWidth=(hot?1.7:0.5+1.5*ew*depth)*lw;
        ctx.beginPath(); ctx.moveTo(A.sx,A.sy); ctx.quadraticCurveTo(e.cx,e.cy,B.sx,B.sy); ctx.stroke();
      }

      /* pulses ride the exact same curves */
      for(i=0;i<pulses.length;i++){
        var pu=pulses[i];
        if(!reduced){ pu.t+=pu.s; if(pu.t>1){ pu.t=0; pu.e=(pu.e+17)%edges.length; } }
        var E=edges[pu.e]; if(!E) continue;
        var t=pu.t, u=1-t;
        var px=u*u*E.a.sx+2*u*t*E.cx+t*t*E.b.sx;
        var py=u*u*E.a.sy+2*u*t*E.cy+t*t*E.b.sy;
        var pr=(3.4+2.6*((E.a.sd+E.b.sd)/2))*Math.min(1.5,zoom);
        ctx.globalAlpha=0.9;
        ctx.drawImage(pulseSpr,px-pr,py-pr,pr*2,pr*2);
      }
      ctx.globalAlpha=1;

      /* node cores: layered glow via pre-rendered sprites, depth-cued */
      var nz=Math.min(1.7,0.75+0.35*zoom);
      for(i=0;i<nodes.length;i++){ n=nodes[i];
        var rad=(1.5+Math.min(4.5,Math.sqrt(n.w)))*n.sd*nz;
        var hotN=(n===hoverN);
        ctx.globalAlpha=Math.max(0.22,Math.min(1,(n.sd-0.55)*1.6))*(hotN?1:0.92);
        var rr2=rad*3.2*(hotN?1.35:1);
        ctx.drawImage(sprFor(n.type),n.sx-rr2,n.sy-rr2,rr2*2,rr2*2);
        if(hotN){
          ctx.globalAlpha=0.5;
          ctx.drawImage(sprFor(n.type),n.sx-rr2*1.9,n.sy-rr2*1.9,rr2*3.8,rr2*3.8);
        }
      }
      ctx.globalAlpha=1;

      /* labels */
      ctx.globalCompositeOperation="source-over";
      var fs=(zoom>1.8)?10:9;
      ctx.font=fs+"px 'JetBrains Mono',monospace"; ctx.textAlign="center";
      for(i=0;i<nodes.length;i++){ n=nodes[i];
        var key=(n.type==="agent"||n.type==="governance"||n.type==="brain"||n.type==="loop");
        var hotL=(n===hoverN);
        if(!hotL && !(key&&zoom>1.2) && !(key&&zoom>0.85&&n.sd>1.02)) continue;
        var la=hotL?0.97:Math.max(0,Math.min(0.8,(0.2+0.55*(n.sd-0.8))*((zoom>1.2)?1:0.5)));
        if(la<=0.03) continue;
        ctx.fillStyle=hotL?"rgba(236,250,255,0.97)":"rgba(222,240,250,"+la.toFixed(2)+")";
        ctx.fillText(n.label.toUpperCase(), n.sx, n.sy-8-Math.sqrt(n.w)*1.6);
      }

      /* engagement hint */
      if(!reduced && hintA>0.01){
        ctx.globalAlpha=hintA*0.85;
        ctx.font="9px 'JetBrains Mono',monospace"; ctx.textAlign="center";
        ctx.fillStyle="rgba(180,220,240,0.9)";
        ctx.fillText("CLICK TO EXPLORE \u00b7 DRAG ROTATE \u00b7 SCROLL ZOOM", W*0.5, H-Math.max(24,H*0.14));
        ctx.globalAlpha=1;
      }

      /* soft edge dissolve: scene fades out before touching any border */
      if(mask){
        ctx.globalCompositeOperation="destination-in";
        ctx.drawImage(mask,0,0,W,H);
        ctx.globalCompositeOperation="source-over";
      }
    }

    if(reduced){
      zoom=targetZoom=1.3;
      frame(performance.now());
      return true;
    }
    var raf=0, running=true;
    function loop(ts){ raf=requestAnimationFrame(loop); frame(ts); }
    document.addEventListener("visibilitychange",function(){
      if(document.hidden){ if(running){ cancelAnimationFrame(raf); running=false; } }
      else if(!running){ running=true; bump(); raf=requestAnimationFrame(loop); }
    });
    raf=requestAnimationFrame(loop);
    return true;
  }
  window.__gfDrawRealBrain = drawRealBrain;
})();
(function(){
  function drawBrain(canvas, bb){
    if(!canvas) return;
    var ctx = canvas.getContext("2d"); if(!ctx) return;
    var W = canvas.width, H = canvas.height, CX = W/2, CY = H/2, R = Math.min(W,H)*0.36;
    var N = Math.max(48, Math.min(110, (bb && bb.semanticEntities ? bb.semanticEntities : 70)));
    var nodes = [];
    var GA = Math.PI * (3 - Math.sqrt(5));
    for(var i=0;i<N;i++){
      var y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y*y), th = GA * i;
      nodes.push({ x: Math.cos(th)*rr, y: y, z: Math.sin(th)*rr, m: 0.5 + ((i*2654435761)>>>16 & 255)/255 });
    }
    var edges = [];
    for(var a=0;a<N;a++){
      var best=[];
      for(var b2=0;b2<N;b2++){ if(a===b2) continue;
        var dx=nodes[a].x-nodes[b2].x, dy=nodes[a].y-nodes[b2].y, dz=nodes[a].z-nodes[b2].z;
        best.push([dx*dx+dy*dy+dz*dz, b2]);
      }
      best.sort(function(p,q){return p[0]-q[0];});
      for(var k=0;k<3;k++){ if(best[k] && a<best[k][1]) edges.push([a,best[k][1],0.4+0.6*((a*best[k][1])%7)/7]); }
    }
    var pulses = [];
    for(var p=0;p<10;p++) pulses.push({ e: (p*13) % edges.length, t: (p*0.1)%1, s: 0.0025 + (p%4)*0.0011 });
    var reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch(e){}
    var rot = 0.35;
    function frame(){
      rot += 0.0028;
      var cs = Math.cos(rot), sn = Math.sin(rot), tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
      var proj = nodes.map(function(n){
        var x = n.x*cs - n.z*sn, z = n.x*sn + n.z*cs;
        var y = n.y*ct - z*st;  z = n.y*st + z*ct;
        var d = 1.6 / (1.6 + z);
        return { sx: CX + x*R*d, sy: CY + y*R*d, d: d, z: z, m: n.m };
      });
      ctx.clearRect(0,0,W,H);
      ctx.globalCompositeOperation = "lighter";
      for(var e2=0;e2<edges.length;e2++){
        var A = proj[edges[e2][0]], B = proj[edges[e2][1]], w = edges[e2][2];
        var depth = Math.max(0.15, (A.d + B.d)/2 - 0.35);
        ctx.strokeStyle = "rgba(34,230,255," + (0.05 + 0.16*w*depth).toFixed(3) + ")";
        ctx.lineWidth = 0.5 + 1.3*w*depth;
        ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); ctx.stroke();
      }
      for(var p2=0;p2<pulses.length;p2++){
        var pu = pulses[p2]; pu.t += pu.s; if(pu.t > 1){ pu.t = 0; pu.e = (pu.e + 29) % edges.length; }
        var E = edges[pu.e], A2 = proj[E[0]], B2 = proj[E[1]];
        var px = A2.sx + (B2.sx - A2.sx)*pu.t, py = A2.sy + (B2.sy - A2.sy)*pu.t;
        var g = ctx.createRadialGradient(px,py,0,px,py,7);
        g.addColorStop(0,"rgba(217,251,255,0.9)"); g.addColorStop(0.4,"rgba(34,230,255,0.5)"); g.addColorStop(1,"rgba(34,230,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px,py,7,0,6.2832); ctx.fill();
      }
      for(var n2=0;n2<proj.length;n2++){
        var P = proj[n2], rad = (1.1 + 2.1*P.m) * P.d;
        var vio = n2 % 9 === 0;
        var g2 = ctx.createRadialGradient(P.sx,P.sy,0,P.sx,P.sy,rad*3.4);
        g2.addColorStop(0, vio ? "rgba(216,180,254,0.95)" : "rgba(217,251,255,0.9)");
        g2.addColorStop(0.35, vio ? "rgba(168,85,247,0.45)" : "rgba(34,230,255,0.5)");
        g2.addColorStop(1, "rgba(34,230,255,0)");
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(P.sx,P.sy,rad*3.4,0,6.2832); ctx.fill();
      }
      var core = ctx.createRadialGradient(CX,CY,0,CX,CY,R*0.55);
      core.addColorStop(0,"rgba(34,230,255,0.10)"); core.addColorStop(1,"rgba(34,230,255,0)");
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(CX,CY,R*0.55,0,6.2832); ctx.fill();
      if(!reduced) requestAnimationFrame(frame);
    }
    frame();
  }
  window.__gfDrawBrain = drawBrain;
})();
(function(){
  const fmt=v=>v==null?"—":new Intl.NumberFormat("en-US").format(v);
  async function boot(){
    const mount=document.querySelector("[data-living-intelligence]");if(!mount)return;
    try{
      const r=await fetch("/assets/living-intelligence.json",{cache:"no-store"});if(!r.ok)throw new Error("unavailable");
      const d=await r.json(),b=d.brain||{},l=d.loops||{};let bb={};try{const r2=await fetch("/assets/living-brain.json",{cache:"no-store"});if(r2.ok)bb=await r2.json()}catch{}
      mount.innerHTML=`<canvas class="li-brain-bg" aria-hidden="true" data-brain-canvas width="560" height="560"></canvas>
      <div class="li-copy"><span class="tag">Living intelligence · public-safe proof</span><h2 class="h-l">A fleet that remembers.<br>A system that proves.</h2><p class="lede">The HARMONIC Brain connects operational evidence into living knowledge. Its Loop Fabric converts repeated agent work into bounded systems with verification, memory, budgets and stop rules. And every night the Brain dreams: it replays the day, questions itself, and proposes improvements it later verifies.</p><div class="li-principles">${(d.principles||[]).map(x=>`<span>${x}</span>`).join("")}</div></div>
      <div class="li-metrics"><article><b>${fmt(b.events)}</b><span>governed evidence events</span></article><article><b>${fmt(b.currentFacts)}</b><span>current compiled facts</span></article><article><b>${fmt(b.graphNodes)}</b><span>visible knowledge nodes</span></article><article><b>${fmt(b.graphEdges)}</b><span>evidence connections</span></article><article><b>${fmt(l.active)}/${fmt(l.registered)}</b><span>active governed loops</span></article><article><b>${fmt(l.privilegedArmed)}</b><span>privileged planes armed</span></article>${bb.dreamsRecorded!=null?`<article><b>${fmt(bb.dreamsRecorded)}</b><span>nights of self-reflection recorded</span></article><article><b>${bb.retrievalEval&&bb.retrievalEval.groundedPct!=null?bb.retrievalEval.groundedPct+"%":"-"}</b><span>held-out questions answered from memory</span></article><article><b>${fmt(bb.improvementProposalsOpen)}</b><span>improvements it noticed and proposed</span></article>`:""}</div>
      <div class="li-foot"><span class="${b.fullyConnected?"live":""}">${b.fullyConnected?"Fully connected graph":"Topology verification pending"}</span><span>Aggregate telemetry only · no conversations, PII or private instructions exposed</span><span>${new Date(d.generatedAt).toLocaleString()}</span></div>`;
    try{var rg=await fetch("/assets/living-brain-graph.json",{cache:"no-store"});var rgj=rg.ok?await rg.json():null;var drew=window.__gfDrawRealBrain&&window.__gfDrawRealBrain(mount.querySelector("[data-brain-canvas]"),rgj);if(!drew&&window.__gfDrawBrain)window.__gfDrawBrain(mount.querySelector("[data-brain-canvas]"),bb);}catch(err){if(window.__gfDrawBrain)window.__gfDrawBrain(mount.querySelector("[data-brain-canvas]"),bb);}}catch{mount.innerHTML='<p class="lede">Living-intelligence proof is temporarily unavailable. No cached number is presented as live.</p>';}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
