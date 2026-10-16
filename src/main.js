import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './style.css';

/* =====================================================
   SETUP
===================================================== */
const canvas = document.getElementById('c');
const flashEl = document.getElementById('flash');
const hintEl = document.getElementById('hint');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f2537); // Twilight mystical blue
scene.fog = new THREE.FogExp2(0x0f2537, 0.025);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.3, 'rgba(255,255,255,0.35)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const GLOW = makeGlowTexture();

function makeHalo(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW, color, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

// ==========================================
// LIGHTING: GENTLE, WARM & ATMOSPHERIC
// ==========================================
scene.add(new THREE.AmbientLight(0xffeedd, 0.7)); 

const lightA = new THREE.PointLight(0xffeedd, 2.0, 30);
lightA.position.set(0, 3, 6); 
scene.add(lightA);

const lightB = new THREE.PointLight(0xff6fa5, 1.0, 30);
lightB.position.set(5, 2, 5); 
scene.add(lightB);

const lightC = new THREE.PointLight(0x3a7bff, 0.8, 30);
lightC.position.set(-5, 2, -3); 
scene.add(lightC);

const fluteLight = new THREE.PointLight(0xffe0b0, 1.0, 35);
fluteLight.position.set(3, 4, 45);
scene.add(fluteLight);

// Warm directional highlight for glossy reflections on the flute
const fluteHighlight = new THREE.DirectionalLight(0xffdfaa, 1.0);
fluteHighlight.position.set(10, 15, 50);
fluteHighlight.target.position.set(0, 0, 30);
scene.add(fluteHighlight);
scene.add(fluteHighlight.target);

/* =====================================================
/* =====================================================
   REALISTIC BAMBOO TEXTURE & FLUTE SETUP
===================================================== */
function createBambooTextures() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base warm honey/amber bamboo wood tones
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, '#c28345');
  grad.addColorStop(0.2, '#d49852');
  grad.addColorStop(0.4, '#b57434');
  grad.addColorStop(0.7, '#dda85e');
  grad.addColorStop(0.9, '#c88748');
  grad.addColorStop(1, '#c28345');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Fine longitudinal bamboo vascular fibers
  for (let i = 0; i < 450; i++) {
    const y = Math.random() * 512;
    const isDark = Math.random() > 0.45;
    ctx.strokeStyle = isDark ? 'rgba(75, 38, 12, 0.07)' : 'rgba(255, 235, 190, 0.06)';
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }

  // Realistic bamboo nodes / rings with natural joint darkening
  const nodePositions = [140, 360, 580, 800, 960];
  nodePositions.forEach((nx) => {
    const ng = ctx.createLinearGradient(nx - 28, 0, nx + 28, 0);
    ng.addColorStop(0, 'rgba(60, 28, 8, 0)');
    ng.addColorStop(0.35, 'rgba(80, 38, 10, 0.28)');
    ng.addColorStop(0.5, 'rgba(235, 195, 135, 0.38)');
    ng.addColorStop(0.65, 'rgba(80, 38, 10, 0.28)');
    ng.addColorStop(1, 'rgba(60, 28, 8, 0)');
    ctx.fillStyle = ng;
    ctx.fillRect(nx - 28, 0, 56, 512);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);

  // Subtle bump map for tactile micro-grooves
  const bCanvas = document.createElement('canvas');
  bCanvas.width = 512;
  bCanvas.height = 256;
  const bctx = bCanvas.getContext('2d');
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 200; i++) {
    const y = Math.random() * 256;
    bctx.strokeStyle = Math.random() > 0.5 ? 'rgba(30,30,30,0.12)' : 'rgba(225,225,225,0.12)';
    bctx.lineWidth = 1;
    bctx.beginPath();
    bctx.moveTo(0, y);
    bctx.lineTo(512, y);
    bctx.stroke();
  }
  const bumpTex = new THREE.CanvasTexture(bCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(2, 1);

  return { tex, bumpTex };
}

const { tex: bambooTex, bumpTex: bambooBump } = createBambooTextures();

const flute = new THREE.Group();
flute.position.z = 30;
scene.add(flute);

const tubeGeo = new THREE.CylinderGeometry(0.6, 0.6, 30, 48, 1, true);
tubeGeo.rotateX(Math.PI / 2);

const tubeMat = new THREE.MeshPhysicalMaterial({
  map: bambooTex,
  bumpMap: bambooBump,
  bumpScale: 0.012,
  roughness: 0.32,
  metalness: 0.03,
  clearcoat: 0.65,
  clearcoatRoughness: 0.15,
  side: THREE.DoubleSide,
  transparent: true,
});
flute.add(new THREE.Mesh(tubeGeo, tubeMat));

// Authentic wall thickness rim at the mouth opening
const mouthRim = new THREE.Mesh(new THREE.TorusGeometry(0.575, 0.025, 16, 48), tubeMat);
mouthRim.position.z = 15;
flute.add(mouthRim);

// Natural closed bamboo septum cap at head end
const headCap = new THREE.Mesh(new THREE.CircleGeometry(0.585, 32), tubeMat);
headCap.position.z = -15;
flute.add(headCap);

// Sacred red silk thread bindings with gold zari accents
const ringMat = new THREE.MeshPhysicalMaterial({ 
  color: 0xb51a1a, roughness: 0.6, metalness: 0.1, 
  clearcoat: 0.3, clearcoatRoughness: 0.2, transparent: true 
});
const goldThreadMat = new THREE.MeshStandardMaterial({
  color: 0xd4af37,
  roughness: 0.25,
  metalness: 0.85,
  transparent: true,
});

const threadPositions = [-14, -13.8, -13.6, -7, -6.8, -0.2, 0, 0.2, 7, 7.2, 14, 14.2];
threadPositions.forEach((z) => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.605, 0.032, 12, 48), ringMat);
  ring.position.z = z;
  flute.add(ring);
});

const goldThreadPositions = [-14.3, -13.3, -7.3, -6.5, -0.5, 0.5, 6.7, 7.5, 13.7, 14.5];
goldThreadPositions.forEach((z) => {
  const gRing = new THREE.Mesh(new THREE.TorusGeometry(0.604, 0.012, 10, 48), goldThreadMat);
  gRing.position.z = z;
  flute.add(gRing);
});

// Hole rims with realistic flame-scorched bevels
const holeMat = new THREE.MeshBasicMaterial({ color: 0x110800, side: THREE.DoubleSide, transparent: true });
const holeRimMat = new THREE.MeshStandardMaterial({
  color: 0x3d200a,
  roughness: 0.75,
  metalness: 0.1,
  transparent: true,
});
const holePositions = [10, 7.5, 5, 2.5, 0, -2.5, -11]; 
const holeLights = [];
const innerHoles = [];

holePositions.forEach((z, index) => {
  const isBlowingHole = index === 6;
  const size = isBlowingHole ? 0.22 : 0.16;

  // Flame-burnished hole bevel rim
  const holeRim = new THREE.Mesh(new THREE.TorusGeometry(size + 0.012, 0.015, 8, 32), holeRimMat);
  holeRim.position.set(0, 0.605, z);
  holeRim.rotation.x = -Math.PI / 2;
  flute.add(holeRim);

  const outerHole = new THREE.Mesh(new THREE.CircleGeometry(size, 32), holeMat);
  outerHole.position.set(0, 0.605, z); 
  outerHole.rotation.x = -Math.PI / 2;
  flute.add(outerHole);

  const innerHole = new THREE.Mesh(
    new THREE.CircleGeometry(size, 32), 
    new THREE.MeshBasicMaterial({ color: 0xffeedd, side: THREE.DoubleSide, transparent: true })
  );
  innerHole.position.set(0, 0.59, z);
  innerHole.rotation.x = Math.PI / 2;
  flute.add(innerHole);
  innerHoles.push(innerHole);

  const l = new THREE.PointLight(0xffdfaa, 0.35, 3.5);
  l.position.set(0, 0.2, z);
  flute.add(l);
  holeLights.push(l);
});

// ==========================================
// FLUTE INTERIOR: ARCHITECTURAL SACRED HARMONY
// ==========================================

// 1. Volumetric Sunlight Shafts through the 7 Flute Holes
function makeBeamTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255, 245, 215, 0.9)');
  g.addColorStop(0.25, 'rgba(255, 225, 150, 0.5)');
  g.addColorStop(0.7, 'rgba(255, 190, 110, 0.15)');
  g.addColorStop(1, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}
const beamTex = makeBeamTexture();
const beamMat = new THREE.MeshBasicMaterial({
  map: beamTex,
  color: 0xffe8b8,
  transparent: true,
  opacity: 0.35,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const beamGeo = new THREE.CylinderGeometry(0.12, 0.26, 0.9, 20, 1, true);

holePositions.forEach((z) => {
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 0.15, z);
  flute.add(beam);
});

// 2. Inner Golden Resonance Rings (Perspective & Speed Rings)
const innerRingGeo = new THREE.TorusGeometry(0.582, 0.009, 10, 48);
const innerRingMat = new THREE.MeshBasicMaterial({
  color: 0xffd27d,
  transparent: true,
  opacity: 0.45,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const ringZPositions = [-13, -10.5, -8, -5.5, -3, -0.5, 2, 4.5, 7, 9.5, 12];
ringZPositions.forEach((z) => {
  const ring = new THREE.Mesh(innerRingGeo, innerRingMat);
  ring.position.z = z;
  flute.add(ring);
});

// 3. Sacred Double-Helix Filigree along the Tube Walls
const helixPointsA = [];
const helixPointsB = [];
const HELIX_STEPS = 160;
for (let i = 0; i <= HELIX_STEPS; i++) {
  const t = i / HELIX_STEPS;
  const z = 14.5 - t * 29;
  const theta = t * Math.PI * 7;
  const r = 0.53;
  helixPointsA.push(new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, z));
  helixPointsB.push(new THREE.Vector3(Math.cos(theta + Math.PI) * r, Math.sin(theta + Math.PI) * r, z));
}
const helixMat = new THREE.LineBasicMaterial({
  color: 0xffdf88,
  transparent: true,
  opacity: 0.35,
  blending: THREE.AdditiveBlending,
});
const helixA = new THREE.Line(new THREE.BufferGeometry().setFromPoints(helixPointsA), helixMat);
const helixB = new THREE.Line(new THREE.BufferGeometry().setFromPoints(helixPointsB), helixMat);
flute.add(helixA);
flute.add(helixB);

// 4. Distant Sacred Golden Portal (The Light at the End of the Flute)
const exitPortal = makeHalo(0xffd58a, 3.2);
exitPortal.position.set(0, 0, -14.8);
flute.add(exitPortal);

// 5. Layered Peripheral Celestial Stardust (Center tunnel remains clear)
const STARDUST_N = 360;
const stardustPos = new Float32Array(STARDUST_N * 3);
const stardustCols = new Float32Array(STARDUST_N * 3);
const stardustData = [];

const goldTone = new THREE.Color(0xf6d388);
const ivoryTone = new THREE.Color(0xfff6e8);
const roseTone = new THREE.Color(0xff9ec4);

for (let i = 0; i < STARDUST_N; i++) {
  const z = 22 - Math.random() * 38;
  const radRatio = 0.42 + Math.random() * 0.46; // Peripheral zone: keeps camera center clear
  const speed = 0.018 + Math.random() * 0.022;
  const baseAngle = Math.random() * Math.PI * 2;
  const randCol = Math.random();
  const baseColor = randCol < 0.5 ? goldTone : (randCol < 0.8 ? ivoryTone : roseTone);
  const twinkleSpeed = 1.6 + Math.random() * 2.8;
  const twinklePhase = Math.random() * Math.PI * 2;

  stardustData.push({ z, radRatio, speed, baseAngle, baseColor, twinkleSpeed, twinklePhase });

  stardustPos[i * 3] = 0;
  stardustPos[i * 3 + 1] = 0;
  stardustPos[i * 3 + 2] = z;

  stardustCols[i * 3] = baseColor.r;
  stardustCols[i * 3 + 1] = baseColor.g;
  stardustCols[i * 3 + 2] = baseColor.b;
}

const stardustGeo = new THREE.BufferGeometry();
stardustGeo.setAttribute('position', new THREE.BufferAttribute(stardustPos, 3));
stardustGeo.setAttribute('color', new THREE.BufferAttribute(stardustCols, 3));

const stardustMat = new THREE.PointsMaterial({
  size: 0.05,
  map: GLOW,
  vertexColors: true,
  transparent: true,
  opacity: 0.7,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const stardustMesh = new THREE.Points(stardustGeo, stardustMat);
flute.add(stardustMesh);

// ==========================================
// MUSICAL PARTICLES FLOWING IN (♪ ♫ ✦ ♬)
// ==========================================
function makeMiniNoteTexture(glyph) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 72px "Cinzel Decorative", Georgia, serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 215, 110, 0.95)';
  ctx.shadowBlur = 16;
  ctx.fillText(glyph, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

const noteGlyphs = ['♪', '♫', '✦', '♬', '✧'];
const noteTexList = noteGlyphs.map(makeMiniNoteTexture);

const MUSIC_PARTICLES_N = 28;
const musicNotes = [];

for (let i = 0; i < MUSIC_PARTICLES_N; i++) {
  const tex = noteTexList[i % noteTexList.length];
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color: 0xfff0cc,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const scale = 0.22 + Math.random() * 0.08;
  sprite.scale.set(scale, scale, 1);

  // Position starts distributed from outside mouth (z=25) into the flute (z=-14)
  const z = 25 - Math.random() * 39;
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.026 + Math.random() * 0.02;

  sprite.userData = {
    z,
    angle,
    speed,
    baseScale: scale,
    phase: Math.random() * Math.PI * 2,
    swirlRate: 1.2 + Math.random() * 0.8,
  };
  flute.add(sprite);
  musicNotes.push(sprite);
}

// Fireflies background
const FIREFLY_N = 400;
const fireflyPos = new Float32Array(FIREFLY_N * 3);
for (let i = 0; i < FIREFLY_N; i++) {
  fireflyPos[i * 3] = (Math.random() - 0.5) * 60;
  fireflyPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
  fireflyPos[i * 3 + 2] = Math.random() * 80 - 30;
}
const fireflyGeo = new THREE.BufferGeometry();
fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
const fireflies = new THREE.Points(fireflyGeo, new THREE.PointsMaterial({
  color: 0xaaff88, size: 0.5, map: GLOW, transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(fireflies);

/* =====================================================
   MAIN SCENE (revealed after the flute)
===================================================== */
const main = new THREE.Group();
main.visible = false;
scene.add(main);

function petalGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.55, 0.5, 0.5, 1.4, 0, 2);
  s.bezierCurveTo(-0.5, 1.4, -0.55, 0.5, 0, 0);
  return new THREE.ShapeGeometry(s, 16);
}
const PG = petalGeometry();

const lotus = new THREE.Group();
lotus.position.y = -1.5; 
main.add(lotus);

const petals = [];
[
  [12, 1.0, 0xff9cc2],
  [10, 0.8, 0xff6fa5],
  [8, 0.6, 0xffd1e3],
  [6, 0.4, 0xfff0c9],
].forEach(([count, size, color], ring) => {
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.15, 
    side: THREE.DoubleSide, roughness: 0.5,
  });
  for (let i = 0; i < count; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / count) * Math.PI * 2 + ring * 0.3;
    const mesh = new THREE.Mesh(PG, mat);
    mesh.scale.setScalar(size * 1.5);
    pivot.add(mesh);
    lotus.add(pivot);
    petals.push({ mesh, ring });
  }
});

const mandala = new THREE.Group();
mandala.position.y = -1.65; 
main.add(mandala);
const goldMat = new THREE.MeshBasicMaterial({
  color: 0xf5cf7a, side: THREE.DoubleSide, transparent: true, opacity: 0.6,
});
[3, 4.2, 5.6, 7.2, 9].forEach((r, i) => {
  const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.03, 128), goldMat);
  ring.rotation.x = -Math.PI / 2;
  mandala.add(ring);

  const n = 16 + i * 8;
  const pos = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    pos.push(Math.cos(a) * (r + 0.25), 0, Math.sin(a) * (r + 0.25));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  mandala.add(new THREE.Points(g, new THREE.PointsMaterial({
    color: i % 2 ? 0xff6fa5 : 0xf5cf7a, size: 0.12, map: GLOW,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })));
});

const sun = makeHalo(0xff8fb8, 10); 
sun.position.set(0, 2, 0);
main.add(sun);

const PETAL_N = 160;
const fallingPetals = new THREE.InstancedMesh(
  PG,
  new THREE.MeshStandardMaterial({ color: 0xff8fb8, emissive: 0xff4f90, emissiveIntensity: 0.2, side: THREE.DoubleSide }),
  PETAL_N
);
main.add(fallingPetals);
const petalData = [];
for (let i = 0; i < PETAL_N; i++) {
  petalData.push({
    x: (Math.random() - 0.5) * 20,
    y: Math.random() * 14,
    z: (Math.random() - 0.5) * 20,
    s: 0.4 + Math.random() * 0.8,
    r: Math.random() * 6,
    w: Math.random() * 2 + 0.5,
  });
}
const dummy = new THREE.Object3D();

/* =====================================================
   RADHA KRISHNA MODEL
===================================================== */
const MODEL_PATH = '/models/radha-krishna.glb';
const MODEL_HEIGHT = 3; 

const modelHolder = new THREE.Group();
modelHolder.visible = false;
main.add(modelHolder);

const modelGlow = makeHalo(0xffd98a, 4); 
modelGlow.position.set(0, 1.8, -0.3);
modelHolder.add(modelGlow);

function buildPlaceholder() {
  const g = new THREE.Group();
  [[-0.5, 0x2b7bff], [0.5, 0xff6fa5]].forEach(([x, color]) => {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.42, 1.8, 24),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15, roughness: 0.5 })
    );
    body.position.set(x, 0.9, 0);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffd9b0, roughness: 0.6 })
    );
    head.position.set(x, 2.05, 0);
    g.add(body, head);
  });
  return g;
}
const placeholder = buildPlaceholder();
modelHolder.add(placeholder);

new GLTFLoader().load(
  MODEL_PATH,
  (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = MODEL_HEIGHT / size.y;
    model.scale.setScalar(k);
    model.position.set(-center.x * k, -box.min.y * k, -center.z * k);

    modelHolder.remove(placeholder);
    modelHolder.add(model);
  },
  undefined,
  () => console.warn('Model not found at ' + MODEL_PATH + ', using placeholder.')
);

/* =====================================================
   CAMERA PATH
===================================================== */
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(6, 2, 52),
  new THREE.Vector3(2, 1, 47),
  new THREE.Vector3(0, 0, 44),
  new THREE.Vector3(0, 0, 30),
  new THREE.Vector3(0, 0, 17),
  new THREE.Vector3(1.5, 1.5, 13),
  new THREE.Vector3(4.3, 3.2, 10.1),
]);

/* =====================================================
   SCROLL + RESIZE 
===================================================== */
let progress = 0;
let current = 0;

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress = max > 0 ? scrollY / max : 0;
  hintEl.style.opacity = scrollY > 40 ? 0 : 1;
}
addEventListener('scroll', onScroll);
onScroll();

function getResponsiveFov() {
  const aspect = innerWidth / innerHeight;
  if (aspect < 0.6) {
    // Tall portrait mobile (e.g. 9:19.5, 9:20 phones)
    return clamp(55 / (aspect * 1.15), 65, 82);
  } else if (aspect < 1.0) {
    // Standard portrait tablets / large phones
    return clamp(55 / (aspect * 1.05), 60, 72);
  } else if (aspect < 1.35) {
    // iPads / tablets in landscape
    return 58;
  }
  // Standard laptop/desktop (16:9, 16:10, ultrawide)
  return 55;
}

function onResize() {
  const aspect = innerWidth / innerHeight;
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = aspect;
  camera.fov = getResponsiveFov();
  camera.updateProjectionMatrix();
}
addEventListener('resize', onResize);
onResize();

const sections = [...document.querySelectorAll('.sec')];

/* =====================================================
   INTERACTIONS (TOUCH & MOUSE RESPONSIVE)
===================================================== */
const detailsEl = document.getElementById('details');
const slideBtn = document.getElementById('slideBtn');
const mainEl = document.querySelector('main');

let slide = 0;        
let slideTarget = 0;  
let ready = false;    

function setSlide(v) {
  slideTarget = v;
  detailsEl.classList.toggle('open', v === 1);
  slideBtn.textContent = v === 1 ? '‹ Back' : 'Details ›';
}
slideBtn.addEventListener('click', () => setSlide(slideTarget ? 0 : 1));

let isDraggingFlute = false;
let dragStartX = 0;
let dragStartY = 0;

let fluteTargetRotX = 0;
let fluteTargetRotY = 0;
let fluteRotX = 0;
let fluteRotY = 0;
let sx = 0, sy = 0;

addEventListener('pointerdown', (e) => {
  if (e.target.closest('#details') || e.target.closest('.slide-btn')) return;
  sx = e.clientX; sy = e.clientY;
  if (current < 0.05) {
    isDraggingFlute = true;
    dragStartX = e.clientX; dragStartY = e.clientY;
  }
});

addEventListener('pointermove', (e) => {
  if (!isDraggingFlute) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;

  // On touch devices, if swipe is predominantly vertical, release drag so native scroll continues smoothly
  if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 1.8) {
    isDraggingFlute = false;
    return;
  }

  fluteTargetRotY += dx * 0.008; 
  fluteTargetRotX += dy * 0.008; 
  dragStartX = e.clientX; dragStartY = e.clientY;
});

addEventListener('pointerup', (e) => {
  isDraggingFlute = false;
  if (e.target.closest('#details') || e.target.closest('.slide-btn')) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    if (dx < 0 && ready) setSlide(1);
    if (dx > 0) setSlide(0);
  }
});

addEventListener('pointercancel', () => {
  isDraggingFlute = false;
});

addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
    if (e.deltaX > 0 && ready) setSlide(1);
    if (e.deltaX < 0) setSlide(0);
  }
}, { passive: true });

addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' && ready) setSlide(1);
  if (e.key === 'ArrowLeft' || e.key === 'Escape') setSlide(0);
});

/* =====================================================
   ANIMATE
===================================================== */
const startTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const time = (performance.now() - startTime) * 0.001;

  current += (progress - current) * 0.06;
  const p = current;

  fireflies.rotation.y = time * 0.03;
  fireflies.rotation.z = Math.sin(time * 0.05) * 0.1;

  if (p > 0.01) {
    fluteTargetRotX = lerp(fluteTargetRotX, 0, 0.1);
    fluteTargetRotY = lerp(fluteTargetRotY, 0, 0.1);
  }

  fluteRotX += (fluteTargetRotX - fluteRotX) * 0.1;
  fluteRotY += (fluteTargetRotY - fluteRotY) * 0.1;
  flute.rotation.x = fluteRotX;
  flute.rotation.y = fluteRotY; 

  // Subtle weightless levitation of the flute
  const floatEase = (1 - smooth(0, 0.25, p));
  flute.position.y = Math.sin(time * 0.8) * 0.12 * floatEase;
  flute.rotation.z = Math.sin(time * 0.6) * 0.015 * floatEase;

  const baseFov = getResponsiveFov();

  // ----- PHASE 1 -----
  if (p < 0.5) {
    const t = clamp(p / 0.5, 0, 1);
    camera.position.copy(path.getPointAt(t));
    const ahead = path.getPointAt(Math.min(t + 0.04, 1));
    const target = ahead.lerp(new THREE.Vector3(0, 1.2, 0), smooth(0.75, 1, t));
    camera.lookAt(target);
    const inside = smooth(0.2, 0.35, t) * (1 - smooth(0.7, 0.85, t));
    camera.rotateZ(Math.sin(time * 1.5) * 0.04 * inside);
    camera.fov = lerp(baseFov, baseFov + 16, inside);
    camera.updateProjectionMatrix();
  }

  // ----- reveal -----
  const reveal = smooth(0.4, 0.52, p);
  main.visible = reveal > 0;
  main.scale.setScalar(lerp(0.2, 1, reveal));
  
  tubeMat.opacity = 1 - reveal;
  ringMat.opacity = 1 - reveal;
  holeMat.opacity = 1 - reveal;
  goldThreadMat.opacity = 1 - reveal;
  holeRimMat.opacity = 1 - reveal;
  flute.visible = reveal < 1;
  fluteLight.intensity = (1 - reveal) * 1.0;
  fluteHighlight.intensity = (1 - reveal) * 1.0;

  stardustMat.opacity = (1 - reveal) * 0.7;
  innerRingMat.opacity = (1 - reveal) * 0.45;
  beamMat.opacity = (1 - reveal) * (0.28 + Math.sin(time * 2.2) * 0.08);
  helixMat.opacity = (1 - reveal) * 0.35;
  exitPortal.material.opacity = (1 - reveal) * 0.85;

  helixA.rotation.z = time * 0.12;
  helixB.rotation.z = time * 0.12;

  holeLights.forEach((hl, idx) => {
    const wave = Math.sin(time * 2.5 - idx * 0.7);
    hl.intensity = (0.28 + wave * 0.12) * (1 - reveal);
  });
  innerHoles.forEach((ih, idx) => {
    const wave = Math.sin(time * 2.5 - idx * 0.7);
    ih.material.opacity = (0.5 + wave * 0.2) * (1 - reveal);
  });

  flashEl.style.opacity = Math.sin(reveal * Math.PI) * 0.85;

  // Gentle, serene celestial stardust flow
  const scrollDelta = Math.abs(progress - current) * 15;
  const speedMult = 1.0 + clamp(scrollDelta, 0, 2.0);

  for (let i = 0; i < STARDUST_N; i++) {
    const d = stardustData[i];
    d.z -= d.speed * speedMult;
    if (d.z < -17) {
      d.z = 19 + Math.random() * 2;
    }

    let maxR = 0.38;
    if (d.z > 14) {
      const t = clamp((d.z - 14) / 6, 0, 1);
      maxR = 0.38 + t * 0.8;
    } else if (d.z < -14) {
      const t = clamp((-14 - d.z) / 3, 0, 1);
      maxR = 0.38 + t * 0.3;
    }

    const r = maxR * d.radRatio;
    const angle = d.baseAngle + d.z * 0.25 + time * 0.8;

    stardustPos[i * 3] = Math.cos(angle) * r;
    stardustPos[i * 3 + 1] = Math.sin(angle) * r;
    stardustPos[i * 3 + 2] = d.z;

    const shimmer = 0.8 + Math.sin(time * d.twinkleSpeed + d.twinklePhase) * 0.2;
    stardustCols[i * 3] = d.baseColor.r * shimmer;
    stardustCols[i * 3 + 1] = d.baseColor.g * shimmer;
    stardustCols[i * 3 + 2] = d.baseColor.b * shimmer;
  }
  stardustGeo.attributes.position.needsUpdate = true;
  stardustGeo.attributes.color.needsUpdate = true;

  // Animate musical particles flowing into the flute
  musicNotes.forEach((sprite) => {
    const d = sprite.userData;
    d.z -= d.speed * speedMult;
    if (d.z < -14.8) {
      d.z = 24 + Math.random() * 2;
    }

    // Trajectory: outside mouth (z > 15), wide cosmic swirl flowing IN
    // Inside the tube (z <= 15), smooth travel along inner wall
    let r = 0.40;
    if (d.z > 15) {
      const t = clamp((d.z - 15) / 9, 0, 1);
      r = 0.40 + t * t * 1.1;
    } else if (d.z < -13) {
      const t = clamp((-13 - d.z) / 2, 0, 1);
      r = 0.40 + t * 0.12;
    }

    d.angle += 0.015 * d.swirlRate * speedMult;
    const currentAngle = d.angle + d.z * 0.22;

    sprite.position.set(Math.cos(currentAngle) * r, Math.sin(currentAngle) * r, d.z);

    const pulse = 1.0 + Math.sin(time * 3 + d.phase) * 0.15;
    sprite.scale.set(d.baseScale * pulse, d.baseScale * pulse, 1);
    sprite.material.opacity = (1 - reveal) * (0.75 + Math.sin(time * 2 + d.phase) * 0.15);
  });

  // ----- PHASE 2 -----
  const q = clamp((p - 0.5) / 0.5, 0, 1);

  if (p >= 0.5) {
    const a = q * Math.PI * 2 * 0.85 + 0.4;
    const isPortrait = innerWidth < innerHeight;
    const distBonus = isPortrait ? 1.4 : 0;
    const r = lerp(11 + distBonus, 6 + distBonus, smooth(0, 0.5, q)) - smooth(0.8, 1, q) * 1.5;
    const h = lerp(2, 7, Math.sin(q * Math.PI) * 0.8) + (isPortrait ? 1.5 : 1.2);
    camera.position.set(Math.sin(a) * r, h, Math.cos(a) * r);
    camera.lookAt(0, lerp(0.5, 1.4, smooth(0.5, 1, q)), 0); 
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
  }

  const open = smooth(0.05, 0.55, q);
  petals.forEach((o, i) => {
    o.mesh.rotation.x = lerp(1.4 - o.ring * 0.12, 0.45 + o.ring * 0.3, open) + Math.sin(time * 1.2 + i) * 0.02;
  });
  
  lotus.rotation.y = time * 0.12 + q * 2;
  lotus.scale.setScalar(1 + smooth(0.1, 0.6, q) * 0.4);
  mandala.rotation.y = -time * 0.08 - q * 1.5;

  const unite = smooth(0.55, 0.95, q);
  sun.scale.setScalar(5 + Math.sin(time) + unite * 2); 
  lightA.intensity = 1.5 + unite * 0.5; 

  petalData.forEach((d, i) => {
    const yy = (((d.y - time * d.w * 0.5 - q * 6) % 14) + 14) % 14 - 1;
    dummy.position.set(d.x + Math.sin(time * 0.6 + i) * 0.8, yy, d.z + Math.cos(time * 0.5 + i) * 0.8);
    dummy.rotation.set(time * d.w + d.r, time * 0.7 * d.w, d.r);
    dummy.scale.setScalar(0.12 * d.s);
    dummy.updateMatrix();
    fallingPetals.setMatrixAt(i, dummy.matrix);
  });
  fallingPetals.instanceMatrix.needsUpdate = true;

  sections.forEach((el) => {
    const b = el.getBoundingClientRect();
    const c = (b.top + b.height / 2) / innerHeight - 0.5;
    el.style.opacity = clamp(1 - Math.abs(c) * 2.4, 0, 1);
    el.style.transform = `translateY(${c * 60 + (innerHeight * 0.45)}px)`; 
  });

  const modelIn = smooth(0.3, 0.6, q);
  modelHolder.visible = modelIn > 0.01 && main.visible;
  modelHolder.scale.setScalar(lerp(0.3, 1, modelIn));
  modelHolder.position.y = lerp(-1.2, 0.35, modelIn); 
  modelGlow.scale.setScalar(4 + Math.sin(time * 2) * 0.3);

  ready = p > 0.62;
  slideBtn.classList.toggle('show', ready);
  if (!ready && slideTarget === 1) setSlide(0);
  slide += (slideTarget - slide) * 0.08;

  const slideOffsetFactor = innerWidth < 768 ? 0.06 : 0.2;
  if (slide > 0.001) {
    camera.setViewOffset(innerWidth, innerHeight, slide * innerWidth * slideOffsetFactor, 0, innerWidth, innerHeight);
  } else {
    camera.clearViewOffset();
  }
  mainEl.style.opacity = 1 - slide; 

  renderer.render(scene, camera);
}
animate();