/* GridFleet — "Living Fleet" hero engine.
   Raw WebGL2, zero dependencies:
   - fragment-shader Tron grid plane (ray/plane, fwidth AA, distance fog, scanline sweep)
   - GPGPU ping-pong FBO node simulation (curl noise + fBM octaves, cursor force)
   - node field rendered as GL_POINTS in a single draw call
   - connection pulses between nearest active nodes (GL_LINES + travelling spark)
   - periodic node flash -> emits "gf:receipt" for the DOM ledger rail
   Honors prefers-reduced-motion (single luminous still frame). */
(function () {
  "use strict";

  var canvas = document.getElementById("fleet-canvas");
  if (!canvas) return;

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MOBILE = window.matchMedia("(max-width: 820px)").matches ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(pointer: coarse)").matches);

  var gl = canvas.getContext("webgl2", {
    antialias: false, alpha: false, depth: false, stencil: false,
    powerPreference: "high-performance", preserveDrawingBuffer: false
  });
  if (!gl) { document.documentElement.classList.add("no-webgl"); return; }
  document.documentElement.classList.add("has-webgl");

  /* ---------------- config ---------------- */
  var SIM = MOBILE ? 16 : 32;          // sim texture side => SIM*SIM nodes
  var COUNT = SIM * SIM;
  var DPR_CAP = MOBILE ? 1.5 : 2;
  var LINES_ON = !MOBILE;
  var MAXP = 14;                       // concurrent connection pulses
  var PULSE_LIFE = 1.8;

  var floatExt = gl.getExtension("EXT_color_buffer_float");
  var GPGPU = !!floatExt;

  /* ---------------- shader sources ---------------- */
  var NOISE = [
    "vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }",
    "vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }",
    "float snoise(vec3 v){",
    "  const vec2 C = vec2(1.0/6.0, 1.0/3.0);",
    "  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);",
    "  vec3 i  = floor(v + dot(v, C.yyy));",
    "  vec3 x0 = v - i + dot(i, C.xxx);",
    "  vec3 g = step(x0.yzx, x0.xyz);",
    "  vec3 l = 1.0 - g;",
    "  vec3 i1 = min(g.xyz, l.zxy);",
    "  vec3 i2 = max(g.xyz, l.zxy);",
    "  vec3 x1 = x0 - i1 + 1.0*C.xxx;",
    "  vec3 x2 = x0 - i2 + 2.0*C.xxx;",
    "  vec3 x3 = x0 - 1.0 + 3.0*C.xxx;",
    "  i = mod(i, 289.0);",
    "  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));",
    "  float n_ = 1.0/7.0;",
    "  vec3 ns = n_ * D.wyz - D.xzx;",
    "  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);",
    "  vec4 x_ = floor(j * ns.z);",
    "  vec4 y_ = floor(j - 7.0 * x_);",
    "  vec4 x = x_ * ns.x + ns.yyyy;",
    "  vec4 y = y_ * ns.x + ns.yyyy;",
    "  vec4 h = 1.0 - abs(x) - abs(y);",
    "  vec4 b0 = vec4(x.xy, y.xy);",
    "  vec4 b1 = vec4(x.zw, y.zw);",
    "  vec4 s0 = floor(b0)*2.0 + 1.0;",
    "  vec4 s1 = floor(b1)*2.0 + 1.0;",
    "  vec4 sh = -step(h, vec4(0.0));",
    "  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;",
    "  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;",
    "  vec3 p0 = vec3(a0.xy, h.x);",
    "  vec3 p1 = vec3(a0.zw, h.y);",
    "  vec3 p2 = vec3(a1.xy, h.z);",
    "  vec3 p3 = vec3(a1.zw, h.w);",
    "  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));",
    "  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;",
    "  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);",
    "  m = m * m;",
    "  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));",
    "}"
  ].join("\n");

  var SHARED = [
    "float h11(float n){ return fract(sin(n) * 43758.5453123); }",
    "vec3 homeFor(float id){",
    "  float hx = h11(id * 12.9898 + 78.233);",
    "  float hy = h11(id * 39.3468 + 11.135);",
    "  float hz = h11(id * 73.156  + 52.715);",
    "  float x = hx * 2.0 - 1.0;",
    "  x = sign(x) * pow(abs(x), 0.8) * 19.0;",
    "  float z = -3.5 - hz * 27.0;",
    "  float y = 0.25 + pow(hy, 1.7) * 3.9;",
    "  return vec3(x, y, z);",
    "}",
    "vec3 procPos(float id, float t){",
    "  vec3 h = homeFor(id);",
    "  float s1 = h11(id * 3.7 + 1.3), s2 = h11(id * 9.1 + 4.2);",
    "  return h + vec3(",
    "    sin(t * (0.18 + s1 * 0.30) + s1 * 6.2832) * 0.9,",
    "    sin(t * (0.22 + s2 * 0.25) + s2 * 6.2832) * 0.35,",
    "    cos(t * (0.15 + s1 * 0.20) + s2 * 6.2832) * 0.9);",
    "}"
  ].join("\n");

  var VS_QUAD = [
    "#version 300 es",
    "void main(){",
    "  vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)) * 2.0 - 1.0;",
    "  gl_Position = vec4(p, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FS_SIM = [
    "#version 300 es",
    "precision highp float;",
    "out vec4 O;",
    "uniform highp sampler2D uPos;",
    "uniform float uTime, uDt;",
    "uniform vec3 uCursor;",
    "uniform float uCursorOn;",
    "uniform int uSim;",
    NOISE,
    SHARED,
    "vec3 curl(vec3 p){",
    "  float e = 0.16; float n1, n2;",
    "  n1 = snoise(p + vec3(0., e, 0.)); n2 = snoise(p - vec3(0., e, 0.));",
    "  float dydn = (n1 - n2) / (2. * e);",
    "  vec3 pb = p + vec3(31.416, -47.853, 12.793);",
    "  n1 = snoise(pb + vec3(0., 0., e)); n2 = snoise(pb - vec3(0., 0., e));",
    "  float dzdn = (n1 - n2) / (2. * e);",
    "  n1 = snoise(pb + vec3(e, 0., 0.)); n2 = snoise(pb - vec3(e, 0., 0.));",
    "  float dxdn = (n1 - n2) / (2. * e);",
    "  vec3 pc = p + vec3(-233.2, 78.11, 53.4);",
    "  n1 = snoise(pc + vec3(e, 0., 0.)); n2 = snoise(pc - vec3(e, 0., 0.));",
    "  float dxc = (n1 - n2) / (2. * e);",
    "  n1 = snoise(pc + vec3(0., e, 0.)); n2 = snoise(pc - vec3(0., e, 0.));",
    "  float dyc = (n1 - n2) / (2. * e);",
    "  n1 = snoise(p + vec3(0., 0., e)); n2 = snoise(p - vec3(0., 0., e));",
    "  float dza = (n1 - n2) / (2. * e);",
    "  return vec3(dydn - dza, dzdn - dxdn, dxc - dyc);",
    "}",
    "void main(){",
    "  ivec2 uv = ivec2(gl_FragCoord.xy);",
    "  vec4 P = texelFetch(uPos, uv, 0);",
    "  float id = float(uv.y * uSim + uv.x);",
    "  vec3 pos = P.xyz; float seed = P.w;",
    "  vec3 home = homeFor(id);",
    "  vec3 q = pos * 0.13 + vec3(0.0, 0.0, uTime * 0.045);",
    "  vec3 flow = curl(q) + curl(q * 2.0 + 5.7) * 0.5;",   // fBM: 0.5x per octave
    "  flow *= 0.55 + 0.5 * seed;",
    "  vec3 v = flow * 0.9;",
    "  v += (home - pos) * 0.55;",
    "  vec3 dv = pos - uCursor;",
    "  float dl = max(length(dv), 0.0001);",
    "  v += (dv / dl) * exp(-dl * dl * 0.14) * 6.0 * uCursorOn;",
    "  pos += v * uDt;",
    "  O = vec4(pos, seed);",
    "}"
  ].join("\n");

  var FS_GRID = [
    "#version 300 es",
    "precision highp float;",
    "out vec4 O;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform vec3 uRo, uFwd, uRight, uUp;",
    "uniform float uTanF, uAspect;",
    "uniform vec2 uCursorXZ;",
    "uniform float uCursorOn;",
    "float hash21(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }",
    "float gridLine(vec2 q, float w){",
    "  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);",
    "  return 1.0 - smoothstep(0.0, w, min(g.x, g.y));",
    "}",
    "void main(){",
    "  vec2 ndc = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;",
    "  vec3 rd = normalize(uFwd + uRight * ndc.x * uTanF * uAspect + uUp * ndc.y * uTanF);",
    "  vec3 col = vec3(0.0196, 0.0275, 0.0392);",
    "  vec3 cyan = vec3(0.133, 0.902, 1.0);",
    "  float horizon = exp(-abs(rd.y + 0.02) * 24.0);",
    "  if (rd.y < -0.002) {",
    "    float t = -(uRo.y) / rd.y;",
    "    vec3 p = uRo + rd * t;",
    "    float fog = exp(-t * 0.052);",
    "    float major = gridLine(p.xz / 2.4, 1.25);",
    "    float minor = gridLine(p.xz / 0.6, 1.1) * 0.32;",
    "    float zb = -2.0 - mod(uTime * 6.5, 46.0);",
    "    float scan = exp(-pow((p.z - zb) * 0.30, 2.0));",
    "    float cd = length(p.xz - uCursorXZ);",
    "    float pool = exp(-cd * cd * 0.10) * uCursorOn;",
    "    float glow = major * (0.40 + scan * 0.95 + pool * 0.60) + minor * (0.30 + scan * 0.35 + pool * 0.25);",
    "    col += cyan * glow * fog;",
    "    col += cyan * pool * 0.05 * fog;",
    "    col += cyan * scan * 0.03 * fog;",
    "  }",
    "  col += cyan * horizon * 0.14;",
    "  vec2 vq = gl_FragCoord.xy / uRes - 0.5;",
    "  col *= 1.0 - dot(vq, vq) * 0.9;",
    "  col += (hash21(gl_FragCoord.xy + fract(uTime) * 61.7) - 0.5) * 0.014;",
    "  O = vec4(col, 1.0);",
    "}"
  ].join("\n");

  var VS_POINTS = [
    "#version 300 es",
    "precision highp float;",
    "uniform highp sampler2D uPos;",
    "uniform mat4 uVP;",
    "uniform int uSim;",
    "uniform float uTime, uDpr, uProc;",
    "uniform vec4 uFlash[4];",
    "out float vSeed;",
    "out float vDist;",
    "out float vFlash;",
    SHARED,
    "void main(){",
    "  int id = gl_VertexID;",
    "  float fid = float(id);",
    "  vec3 pos; float seed;",
    "  if (uProc > 0.5) { pos = procPos(fid, uTime); seed = h11(fid * 7.77 + 0.123); }",
    "  else { vec4 P = texelFetch(uPos, ivec2(id % uSim, id / uSim), 0); pos = P.xyz; seed = P.w; }",
    "  vec4 clip = uVP * vec4(pos, 1.0);",
    "  gl_Position = clip;",
    "  float w = max(clip.w, 0.0001);",
    "  vDist = w; vSeed = seed;",
    "  float fl = 0.0;",
    "  for (int i = 0; i < 4; i++) {",
    "    if (abs(uFlash[i].x - fid) < 0.5) {",
    "      float age = uTime - uFlash[i].y;",
    "      if (age >= 0.0 && age < 1.6) fl = max(fl, 1.0 - age / 1.6);",
    "    }",
    "  }",
    "  vFlash = fl;",
    "  float size = (16.0 + 34.0 * fract(seed * 13.7)) / w;",
    "  size *= 1.0 + fl * 2.4;",
    "  gl_PointSize = clamp(size * uDpr, 1.75, 48.0 * uDpr);",
    "}"
  ].join("\n");

  var FS_POINTS = [
    "#version 300 es",
    "precision highp float;",
    "in float vSeed; in float vDist; in float vFlash;",
    "uniform float uTime;",
    "out vec4 O;",
    "void main(){",
    "  vec2 q = gl_PointCoord - 0.5;",
    "  float d = length(q);",
    "  if (d > 0.5) discard;",
    "  float glow = pow(1.0 - d * 2.0, 2.6);",
    "  float core = smoothstep(0.17, 0.02, d);",
    "  float tw = 0.74 + 0.26 * sin(uTime * (0.6 + vSeed * 2.4) + vSeed * 41.0);",
    "  float fog = exp(-vDist * 0.036);",
    "  vec3 cyan = vec3(0.133, 0.902, 1.0);",
    "  vec3 lime = vec3(0.714, 1.0, 0.235);",
    "  vec3 col = mix(cyan, lime, step(0.93, vSeed) * 0.85);",
    "  col = mix(col, vec3(1.0), core * 0.75 + vFlash * 0.6);",
    "  float a = (glow * 0.72 + core) * tw * fog + vFlash * glow * 1.5;",
    "  O = vec4(col * a, a);",
    "}"
  ].join("\n");

  var VS_LINES = [
    "#version 300 es",
    "precision highp float;",
    "layout(location=0) in vec3 aData;",   // id, end(0|1), born
    "uniform highp sampler2D uPos;",
    "uniform mat4 uVP;",
    "uniform int uSim;",
    "uniform float uTime, uProc;",
    "out float vT; out float vBorn;",
    SHARED,
    "void main(){",
    "  int id = int(aData.x + 0.5);",
    "  vec3 pos;",
    "  if (uProc > 0.5) pos = procPos(float(id), uTime);",
    "  else pos = texelFetch(uPos, ivec2(id % uSim, id / uSim), 0).xyz;",
    "  gl_Position = uVP * vec4(pos, 1.0);",
    "  vT = aData.y; vBorn = aData.z;",
    "}"
  ].join("\n");

  var FS_LINES = [
    "#version 300 es",
    "precision highp float;",
    "in float vT; in float vBorn;",
    "uniform float uTime;",
    "out vec4 O;",
    "void main(){",
    "  float age = uTime - vBorn;",
    "  if (vBorn < -900.0 || age < 0.0 || age > 1.8) discard;",
    "  float env = smoothstep(0.0, 0.25, age) * (1.0 - smoothstep(1.2, 1.8, age));",
    "  float pp = clamp(age / 1.4, 0.0, 1.0);",
    "  float spark = exp(-pow((vT - pp) * 9.0, 2.0));",
    "  float a = env * (0.05 + spark * 0.85);",
    "  vec3 cyan = vec3(0.133, 0.902, 1.0);",
    "  O = vec4(cyan * a, a);",
    "}"
  ].join("\n");

  /* ---------------- GL helpers ---------------- */
  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("[fleet-gl] shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function program(vsSrc, fsSrc) {
    var vs = compile(gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error("[fleet-gl] link:", gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }
  function U(p) {
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), out = {};
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      out[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, info.name);
    }
    return out;
  }

  /* graceful death: if the context is ever lost, fall back to the CSS scene */
  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    document.documentElement.classList.add("no-webgl");
    canvas.style.display = "none";
  });

  var progGrid = program(VS_QUAD, FS_GRID);
  var progSim = GPGPU ? program(VS_QUAD, FS_SIM) : null;
  var progPts = program(VS_POINTS, FS_POINTS);
  var progLin = program(VS_LINES, FS_LINES);
  if (!progGrid || !progPts) { document.documentElement.classList.add("no-webgl"); return; }
  if (GPGPU && !progSim) GPGPU = false;
  var uGrid = U(progGrid), uPts = U(progPts), uLin = progLin ? U(progLin) : null;
  var uSim = progSim ? U(progSim) : null;

  /* ---------------- math ---------------- */
  function h11(n) { var x = Math.sin(n) * 43758.5453123; return x - Math.floor(x); }
  function homeFor(id) {
    var hx = h11(id * 12.9898 + 78.233);
    var hy = h11(id * 39.3468 + 11.135);
    var hz = h11(id * 73.156 + 52.715);
    var x = hx * 2 - 1;
    x = (x < 0 ? -1 : 1) * Math.pow(Math.abs(x), 0.8) * 19;
    return [x, 0.25 + Math.pow(hy, 1.7) * 3.9, -3.5 - hz * 27];
  }
  function procPos(id, t) {
    var h = homeFor(id);
    var s1 = h11(id * 3.7 + 1.3), s2 = h11(id * 9.1 + 4.2);
    return [
      h[0] + Math.sin(t * (0.18 + s1 * 0.30) + s1 * 6.2832) * 0.9,
      h[1] + Math.sin(t * (0.22 + s2 * 0.25) + s2 * 6.2832) * 0.35,
      h[2] + Math.cos(t * (0.15 + s1 * 0.20) + s2 * 6.2832) * 0.9
    ];
  }
  function persp(fov, aspect, n, f) {
    var t = 1 / Math.tan(fov / 2), d = 1 / (n - f);
    return new Float32Array([t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (n + f) * d, -1, 0, 0, 2 * n * f * d, 0]);
  }
  function norm3(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function lookAt(eye, tgt) {
    var f = norm3(sub3(tgt, eye));
    var r = norm3(cross(f, [0, 1, 0]));
    var u = cross(r, f);
    return {
      r: r, u: u, f: f,
      m: new Float32Array([
        r[0], u[0], -f[0], 0,
        r[1], u[1], -f[1], 0,
        r[2], u[2], -f[2], 0,
        -dot3(r, eye), -dot3(u, eye), dot3(f, eye), 1
      ])
    };
  }
  function mul4(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }

  /* ---------------- sim state ---------------- */
  var seeds = new Float32Array(COUNT);
  var hotIds = [];
  var init = new Float32Array(COUNT * 4);
  for (var i = 0; i < COUNT; i++) {
    var hm = homeFor(i);
    var sd = Math.random();
    seeds[i] = sd;
    if (sd > 0.93) hotIds.push(i);
    init[i * 4] = hm[0] + (Math.random() - 0.5);
    init[i * 4 + 1] = hm[1] + (Math.random() - 0.5) * 0.4;
    init[i * 4 + 2] = hm[2] + (Math.random() - 0.5);
    init[i * 4 + 3] = sd;
  }

  var posTex = [], fbo = [], readIdx = 0;
  if (GPGPU) {
    for (var k = 0; k < 2; k++) {
      var tx = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SIM, SIM, 0, gl.RGBA, gl.FLOAT, init);
      var fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { GPGPU = false; }
      posTex.push(tx); fbo.push(fb);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  var emptyVAO = gl.createVertexArray();

  /* lines */
  var lineVAO = null, lineBuf = null;
  var pulses = [];   // {slot,born}
  var pulseSlot = 0;
  if (LINES_ON && progLin) {
    lineVAO = gl.createVertexArray();
    gl.bindVertexArray(lineVAO);
    lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    var blank = new Float32Array(MAXP * 2 * 3);
    for (var b = 0; b < MAXP * 2; b++) blank[b * 3 + 2] = -999;
    gl.bufferData(gl.ARRAY_BUFFER, blank, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    gl.bindVertexArray(null);
  }

  /* ---------------- runtime state ---------------- */
  var dpr = 1, W = 0, H = 0, aspect = 1;
  var FOV = 58 * Math.PI / 180;
  var mirror = new Float32Array(COUNT * 4);
  var mirrorFresh = false, lastMirror = 0;
  var NEED_MIRROR = GPGPU && (LINES_ON || (!MOBILE && !REDUCED));
  var mirrorPBO = null, mirrorFence = null;
  if (NEED_MIRROR) {
    mirrorPBO = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, mirrorPBO);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, COUNT * 16, gl.STREAM_READ);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  }
  var mx = 0, my = 0, smx = 0, smy = 0;         // cursor ndc
  var cursorWorld = [0, 0, -8], cursorOn = 0, cursorTarget = 0;
  var flashes = new Float32Array(8);            // 4x (id, t0)
  for (var fi = 0; fi < 4; fi++) { flashes[fi * 2] = -1; flashes[fi * 2 + 1] = -99; }
  var flashIdx = 0;
  var lastPulse = 0, nextReceipt = 4.5, visible = true, running = false;
  var startT = performance.now(), lastT = startT;
  var cam = null, VP = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    var r = canvas.getBoundingClientRect();
    W = Math.max(2, Math.round(r.width * dpr));
    H = Math.max(2, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    aspect = W / H;
  }

  function camera(t) {
    var px = smx * 0.55, py = smy * 0.22;
    var ro = [Math.sin(t * 0.05) * 0.35 + px * 0.8, 1.52 + py * 0.3, 4.3];
    var la = lookAt(ro, [px * 2.2, 0.85 + py * 1.2, -9]);
    var P = persp(FOV, aspect, 0.1, 130);
    VP = mul4(P, la.m);
    cam = { ro: ro, r: la.r, u: la.u, f: la.f };
    /* cursor ray -> plane y=0 */
    var tanF = Math.tan(FOV / 2);
    var rd = norm3([
      la.f[0] + la.r[0] * smx * tanF * aspect + la.u[0] * smy * tanF,
      la.f[1] + la.r[1] * smx * tanF * aspect + la.u[1] * smy * tanF,
      la.f[2] + la.r[2] * smx * tanF * aspect + la.u[2] * smy * tanF
    ]);
    if (rd[1] < -0.02) {
      var tt = -ro[1] / rd[1];
      if (tt > 0 && tt < 80) {
        cursorWorld[0] += (ro[0] + rd[0] * tt - cursorWorld[0]) * 0.12;
        cursorWorld[2] += (ro[2] + rd[2] * tt - cursorWorld[2]) * 0.12;
      }
    }
  }

  function stepSim(t, dt) {
    if (!GPGPU) return;
    var w = 1 - readIdx;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[w]);
    gl.viewport(0, 0, SIM, SIM);
    gl.disable(gl.BLEND);
    gl.useProgram(progSim);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, posTex[readIdx]);
    gl.uniform1i(uSim.uPos, 0);
    gl.uniform1f(uSim.uTime, t);
    gl.uniform1f(uSim.uDt, Math.min(dt, 0.033));
    gl.uniform3f(uSim.uCursor, cursorWorld[0], 0.8, cursorWorld[2]);
    gl.uniform1f(uSim.uCursorOn, cursorOn);
    gl.uniform1i(uSim.uSim, SIM);
    gl.bindVertexArray(emptyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    readIdx = w;
    /* periodic async CPU mirror (PBO + fence — no GPU stall) for pulses + receipt projection */
    if (NEED_MIRROR) {
      var now = performance.now();
      if (mirrorFence) {
        var st = gl.clientWaitSync(mirrorFence, 0, 0);
        if (st === gl.ALREADY_SIGNALED || st === gl.CONDITION_SATISFIED) {
          gl.deleteSync(mirrorFence);
          mirrorFence = null;
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, mirrorPBO);
          gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, mirror);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
          mirrorFresh = true;
        }
      } else if (now - lastMirror > 700) {
        lastMirror = now;
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, mirrorPBO);
        gl.readPixels(0, 0, SIM, SIM, gl.RGBA, gl.FLOAT, 0);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        mirrorFence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function nodePos(id, t) {
    if (GPGPU && mirrorFresh) return [mirror[id * 4], mirror[id * 4 + 1], mirror[id * 4 + 2]];
    return procPos(id, t);
  }

  function spawnPulse(t) {
    if (!LINES_ON || !progLin) return;
    var a = (Math.random() * COUNT) | 0;
    var pa = nodePos(a, t);
    var best = -1, bd = 1e9;
    for (var c = 0; c < 22; c++) {
      var b2 = (Math.random() * COUNT) | 0;
      if (b2 === a) continue;
      var pb = nodePos(b2, t);
      var d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
      if (d > 1.1 && d < 5.2 && d < bd) { bd = d; best = b2; }
    }
    if (best < 0) return;
    var slot = pulseSlot; pulseSlot = (pulseSlot + 1) % MAXP;
    var data = new Float32Array([a, 0, t, best, 1, t]);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, slot * 2 * 3 * 4, data);
  }

  function project(p) {
    var x = VP[0] * p[0] + VP[4] * p[1] + VP[8] * p[2] + VP[12];
    var y = VP[1] * p[0] + VP[5] * p[1] + VP[9] * p[2] + VP[13];
    var w = VP[3] * p[0] + VP[7] * p[1] + VP[11] * p[2] + VP[15];
    if (w <= 0.001) return null;
    var r = canvas.getBoundingClientRect();
    return { x: r.left + (x / w * 0.5 + 0.5) * r.width, y: r.top + (0.5 - y / w * 0.5) * r.height };
  }

  function fireReceipt(t) {
    if (MOBILE || REDUCED || !hotIds.length) return;
    /* prefer a hot node reasonably close to camera & in frame */
    var tries = 8, chosen = -1, pos = null;
    while (tries-- > 0) {
      var id = hotIds[(Math.random() * hotIds.length) | 0];
      var p = nodePos(id, t);
      if (p[2] > -18 && p[2] < -3) {
        var sc = project(p);
        if (sc && sc.x > innerWidth * 0.12 && sc.x < innerWidth * 0.88 && sc.y > innerHeight * 0.15 && sc.y < innerHeight * 0.8) {
          chosen = id; pos = p; break;
        }
      }
    }
    if (chosen < 0) return;
    flashes[flashIdx * 2] = chosen;
    flashes[flashIdx * 2 + 1] = t;
    flashIdx = (flashIdx + 1) % 4;
    var nodeId = chosen;
    setTimeout(function () {
      var p2 = nodePos(nodeId, (performance.now() - startT) / 1000);
      var sc2 = project(p2);
      if (sc2) window.dispatchEvent(new CustomEvent("gf:receipt", { detail: { x: sc2.x, y: sc2.y } }));
    }, 360);
  }

  function draw(t) {
    gl.viewport(0, 0, W, H);
    gl.clearColor(0.0196, 0.0275, 0.0392, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    /* grid */
    gl.disable(gl.BLEND);
    gl.useProgram(progGrid);
    gl.uniform2f(uGrid.uRes, W, H);
    gl.uniform1f(uGrid.uTime, t);
    gl.uniform3f(uGrid.uRo, cam.ro[0], cam.ro[1], cam.ro[2]);
    gl.uniform3f(uGrid.uFwd, cam.f[0], cam.f[1], cam.f[2]);
    gl.uniform3f(uGrid.uRight, cam.r[0], cam.r[1], cam.r[2]);
    gl.uniform3f(uGrid.uUp, cam.u[0], cam.u[1], cam.u[2]);
    gl.uniform1f(uGrid.uTanF, Math.tan(FOV / 2));
    gl.uniform1f(uGrid.uAspect, aspect);
    gl.uniform2f(uGrid.uCursorXZ, cursorWorld[0], cursorWorld[2]);
    gl.uniform1f(uGrid.uCursorOn, cursorOn);
    gl.bindVertexArray(emptyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    /* connection pulses */
    if (LINES_ON && progLin) {
      gl.useProgram(progLin);
      if (GPGPU) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, posTex[readIdx]);
        gl.uniform1i(uLin.uPos, 0);
      }
      gl.uniformMatrix4fv(uLin.uVP, false, VP);
      gl.uniform1i(uLin.uSim, SIM);
      gl.uniform1f(uLin.uTime, t);
      gl.uniform1f(uLin.uProc, GPGPU ? 0 : 1);
      gl.bindVertexArray(lineVAO);
      gl.drawArrays(gl.LINES, 0, MAXP * 2);
      gl.bindVertexArray(null);
    }

    /* node field — one draw call */
    gl.useProgram(progPts);
    if (GPGPU) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, posTex[readIdx]);
      gl.uniform1i(uPts.uPos, 0);
    }
    gl.uniformMatrix4fv(uPts.uVP, false, VP);
    gl.uniform1i(uPts.uSim, SIM);
    gl.uniform1f(uPts.uTime, t);
    gl.uniform1f(uPts.uDpr, dpr);
    gl.uniform1f(uPts.uProc, GPGPU ? 0 : 1);
    gl.uniform4fv(uPts.uFlash, packFlash());
    gl.bindVertexArray(emptyVAO);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  }

  /* uFlash is declared vec4[4] => pack (id, t0) pairs into 16 floats */
  var flashPacked = new Float32Array(16);
  function packFlash() {
    for (var i = 0; i < 4; i++) {
      flashPacked[i * 4] = flashes[i * 2];
      flashPacked[i * 4 + 1] = flashes[i * 2 + 1];
    }
    return flashPacked;
  }

  function frame() {
    if (!running) return;
    var now = performance.now();
    var t = (now - startT) / 1000;
    var dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;

    smx += (mx - smx) * 0.06;
    smy += (my - smy) * 0.06;
    cursorOn += (cursorTarget - cursorOn) * 0.05;
    cursorTarget *= 0.985;

    camera(t);
    stepSim(t, dt);

    if (t - lastPulse > 0.55 + Math.random() * 0.5) { lastPulse = t; spawnPulse(t); }
    if (t > nextReceipt) { nextReceipt = t + 6 + Math.random() * 3; fireReceipt(t); }

    draw(t);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  /* ---------------- events ---------------- */
  window.addEventListener("pointermove", function (e) {
    mx = (e.clientX / innerWidth) * 2 - 1;
    my = 1 - (e.clientY / innerHeight) * 2;
    cursorTarget = 1;
  }, { passive: true });

  var ro2 = new ResizeObserver(function () { resize(); });
  ro2.observe(canvas);
  resize();

  if (REDUCED) {
    /* luminous still: warm the sim a little, seed pulses, render once */
    camera(14);
    if (GPGPU) for (var s = 0; s < 30; s++) stepSim(14 + s * 0.03, 0.03);
    if (LINES_ON && progLin) { lastPulse = 13; spawnPulse(13.4); spawnPulse(13.6); spawnPulse(13.8); }
    packFlash();
    camera(14);
    draw(14);
    window.dispatchEvent(new CustomEvent("gf:static"));
    return;
  }

  var io = new IntersectionObserver(function (en) {
    visible = en[0].isIntersecting;
    if (visible && !document.hidden) start(); else stop();
  }, { threshold: 0.02 });
  io.observe(canvas);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else if (visible) start();
  });

  start();
})();
