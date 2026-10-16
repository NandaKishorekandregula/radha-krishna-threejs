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
scene.background = new THREE.Color(0x12072e);
scene.fog = new THREE.FogExp2(0x1a0a3d, 0.03);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

// helpers
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// soft glow texture (halos and sparkles)
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
// LIGHTING
// ==========================================
scene.add(new THREE.AmbientLight(0xffeedd, 1.2)); 

const lightA = new THREE.PointLight(0xffeedd, 2.5, 30);
lightA.position.set(0, 3, 6); 
scene.add(lightA);

const lightB = new THREE.PointLight(0xff6fa5, 1.2, 30);
lightB.position.set(5, 2, 5); 
scene.add(lightB);

const lightC = new THREE.PointLight(0x3a7bff, 1.0, 30);
lightC.position.set(-5, 2, -3); 
scene.add(lightC);

/* =====================================================
   FLUTE (INTRO)
===================================================== */
const flute = new THREE.Group();
flute.position.z = 30;
scene.add(flute);

const tubeGeo = new THREE.CylinderGeometry(0.6, 0.6, 30, 48, 1, true);
tubeGeo.rotateX(Math.PI / 2);
const tubeMat = new THREE.MeshStandardMaterial({
  color: 0xf5cf7a, metalness: 0.9, roughness: 0.25,
  emissive: 0x7a4a00, emissiveIntensity: 0.4,
  side: THREE.DoubleSide, transparent: true,
});
flute.add(new THREE.Mesh(tubeGeo, tubeMat));

const ringMat = new THREE.MeshStandardMaterial({ color: 0xffe0a0, metalness: 1, roughness: 0.2 });
[-14, -7, 0, 7, 14].forEach((z) => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 12, 48), ringMat);
  ring.position.z = z;
  flute.add(ring);
});

const holeMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0, side: THREE.DoubleSide, transparent: true });
[-8, -4, 0, 4].forEach((z) => {
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), holeMat);
  hole.position.set(0, 0.59, z);
  hole.rotation.x = -Math.PI / 2;
  flute.add(hole);

  const l = new THREE.PointLight(0xff9a4a, 1.0, 6);
  l.position.set(0, 0.2, z);
  flute.add(l);
});

// notes flowing inside the flute
const NOTE_N = 300;
const notePos = new Float32Array(NOTE_N * 3);
for (let i = 0; i < NOTE_N; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * 0.45;
  notePos[i * 3] = Math.cos(a) * r;
  notePos[i * 3 + 1] = Math.sin(a) * r;
  notePos[i * 3 + 2] = 15 + Math.random() * 30;
}
const noteGeo = new THREE.BufferGeometry();
noteGeo.setAttribute('position', new THREE.BufferAttribute(notePos, 3));
const noteMat = new THREE.PointsMaterial({
  color: 0xffe6a8, size: 0.09, map: GLOW, transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
scene.add(new THREE.Points(noteGeo, noteMat));

// background stars
const STAR_N = 700;
const starPos = new Float32Array(STAR_N * 3);
for (let i = 0; i < STAR_N; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 70;
  starPos[i * 3 + 1] = (Math.random() - 0.3) * 35;
  starPos[i * 3 + 2] = Math.random() * 80 - 20;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0xffe6a8, size: 0.35, map: GLOW, transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false,
})));

/* =====================================================
   MAIN SCENE (revealed after the flute)
===================================================== */
const main = new THREE.Group();
main.visible = false;
scene.add(main);

// lotus
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

// mandala floor
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

// falling petals
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
   CAMERA PATH THROUGH THE FLUTE
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

function onResize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', onResize);
onResize();

const sections = [...document.querySelectorAll('.sec')];

/* =====================================================
   SLIDE TO DETAILS
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

let sx = 0, sy = 0;
const swipeStart = (x, y) => { sx = x; sy = y; };
const swipeEnd = (x, y) => {
  const dx = x - sx, dy = y - sy;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx < 0 && ready) setSlide(1);
    if (dx > 0) setSlide(0);
  }
};
addEventListener('touchstart', (e) => swipeStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
addEventListener('touchend', (e) => swipeEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY));
addEventListener('mousedown', (e) => swipeStart(e.clientX, e.clientY));
addEventListener('mouseup', (e) => swipeEnd(e.clientX, e.clientY));

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
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  current += (progress - current) * 0.06;
  const p = current;

  // ----- PHASE 1 -----
  if (p < 0.5) {
    const t = clamp(p / 0.5, 0, 1);
    camera.position.copy(path.getPointAt(t));

    const ahead = path.getPointAt(Math.min(t + 0.04, 1));
    const target = ahead.lerp(new THREE.Vector3(0, 1.2, 0), smooth(0.75, 1, t));
    camera.lookAt(target);

    const inside = smooth(0.2, 0.35, t) * (1 - smooth(0.7, 0.85, t));
    camera.rotateZ(Math.sin(time * 1.5) * 0.04 * inside);
    camera.fov = lerp(55, 75, inside);
    camera.updateProjectionMatrix();
  }

  // ----- reveal -----
  const reveal = smooth(0.4, 0.52, p);
  main.visible = reveal > 0;
  main.scale.setScalar(lerp(0.2, 1, reveal));
  tubeMat.opacity = 1 - reveal;
  holeMat.opacity = 1 - reveal;
  noteMat.opacity = 1 - reveal;
  flute.visible = reveal < 1;
  flashEl.style.opacity = Math.sin(reveal * Math.PI) * 0.85;

  for (let i = 0; i < NOTE_N; i++) {
    notePos[i * 3 + 2] -= 0.05;
    if (notePos[i * 3 + 2] < 15) notePos[i * 3 + 2] = 45;
  }
  noteGeo.attributes.position.needsUpdate = true;

  // ----- PHASE 2 -----
  const q = clamp((p - 0.5) / 0.5, 0, 1);

  if (p >= 0.5) {
    const a = q * Math.PI * 2 * 0.85 + 0.4;
    const r = lerp(11, 6, smooth(0, 0.5, q)) - smooth(0.8, 1, q) * 1.5;
    const h = lerp(2, 7, Math.sin(q * Math.PI) * 0.8) + 1.2;
    camera.position.set(Math.sin(a) * r, h, Math.cos(a) * r);
    
    // ==========================================
    // FIXED CAMERA ANGLE: Looking higher up forces the 3D scene to move downward to the center
    // ==========================================
    camera.lookAt(0, lerp(0.5, 1.4, smooth(0.5, 1, q)), 0); 
    
    camera.fov = 55;
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
  sun.scale.setScalar(8 + Math.sin(time) + unite * 4); 
  
  lightA.intensity = 2.5 + unite * 1.0; 

  // falling petals
  petalData.forEach((d, i) => {
    const yy = (((d.y - time * d.w * 0.5 - q * 6) % 14) + 14) % 14 - 1;
    dummy.position.set(d.x + Math.sin(time * 0.6 + i) * 0.8, yy, d.z + Math.cos(time * 0.5 + i) * 0.8);
    dummy.rotation.set(time * d.w + d.r, time * 0.7 * d.w, d.r);
    dummy.scale.setScalar(0.12 * d.s);
    dummy.updateMatrix();
    fallingPetals.setMatrixAt(i, dummy.matrix);
  });
  fallingPetals.instanceMatrix.needsUpdate = true;

  // ==========================================
  // FIXED TEXT POSITION: Dynamically pushes text down by 35% of the screen height
  // ==========================================
  sections.forEach((el) => {
    const b = el.getBoundingClientRect();
    const c = (b.top + b.height / 2) / innerHeight - 0.5;
    el.style.opacity = clamp(1 - Math.abs(c) * 2.4, 0, 1);
    
    // Uses the window's height to push the text downward responsively
    el.style.transform = `translateY(${c * 60 + (innerHeight * 0.35)}px)`; 
  });

  // ----- model rises out of the lotus -----
  const modelIn = smooth(0.3, 0.6, q);
  modelHolder.visible = modelIn > 0.01 && main.visible;
  modelHolder.scale.setScalar(lerp(0.3, 1, modelIn));
  modelHolder.position.y = lerp(-1.2, 0.35, modelIn); 
  
  modelGlow.scale.setScalar(4 + Math.sin(time * 2) * 0.3);

  // ----- details slide -----
  ready = p > 0.62;
  slideBtn.classList.toggle('show', ready);
  if (!ready && slideTarget === 1) setSlide(0);

  slide += (slideTarget - slide) * 0.08;
  if (slide > 0.001) {
    camera.setViewOffset(innerWidth, innerHeight, slide * innerWidth * 0.2, 0, innerWidth, innerHeight);
  } else {
    camera.clearViewOffset();
  }
  mainEl.style.opacity = 1 - slide; 

  renderer.render(scene, camera);
}
animate();