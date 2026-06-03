// components/training/ThreeDriveScene.tsx
// Interactive 3D driving scene — Three.js 0.177, Node 22, Next 16
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface DriveSceneHandle {
  setSteer: (v: number) => void;   // -1 full left … +1 full right
  setThrottle: (v: number) => void; // 0 … 1
  setBrake: (v: number) => void;    // 0 … 1
}

interface Props {
  speedKmh: number;
  isPaused: boolean;
  routeType: 'urban' | 'highway' | 'rural' | 'roundabout' | 'motorway' | string;
  trafficSide: 'left' | 'right';
  laneStatus: 'correct' | 'warning' | 'violation';
  routeCoords: { lat: number; lng: number };
  onSpeedChange: (kmh: number) => void;
  sceneRef?: React.MutableRefObject<DriveSceneHandle | null>;
}

// ─── tuning constants ────────────────────────────────────────────────────────
const ROAD_WIDTH    = 12;
const ROAD_LEN      = 600;
const LANE_W        = ROAD_WIDTH / 2;
const DASH_LEN      = 3.5;
const DASH_GAP      = 6.0;
const DASH_COUNT    = 80;
const TOTAL_DASH_Z  = (DASH_LEN + DASH_GAP) * DASH_COUNT;
const CAR_COUNT     = 10;
const TREE_COUNT    = 120;
const BUILDING_COUNT = 40;

// ─── helpers ─────────────────────────────────────────────────────────────────
function buildRoad(): THREE.Group {
  const g = new THREE.Group();

  // Asphalt surface
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x252525 });
  const asphalt    = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LEN), asphaltMat);
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.z = -ROAD_LEN / 2;
  asphalt.receiveShadow = true;
  g.add(asphalt);

  // Edge kerbs (solid white lines)
  const kerbMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  for (const x of [-ROAD_WIDTH / 2, ROAD_WIDTH / 2]) {
    const k = new THREE.Mesh(new THREE.PlaneGeometry(0.25, ROAD_LEN), kerbMat);
    k.rotation.x = -Math.PI / 2;
    k.position.set(x, 0.012, -ROAD_LEN / 2);
    g.add(k);
  }

  // Shoulder lines
  const shoulderMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  for (const x of [-(ROAD_WIDTH / 2 - 1.4), ROAD_WIDTH / 2 - 1.4]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.1, ROAD_LEN), shoulderMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.013, -ROAD_LEN / 2);
    g.add(s);
  }

  return g;
}

function buildDashes(): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(0.14, DASH_LEN);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const im  = new THREE.InstancedMesh(geo, mat, DASH_COUNT);
  im.rotation.x = -Math.PI / 2;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < DASH_COUNT; i++) {
    dummy.position.set(0, 0.015, -(i * (DASH_LEN + DASH_GAP)));
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
  }
  im.instanceMatrix.needsUpdate = true;
  return im;
}

function buildTree(rng: () => number): THREE.Group {
  const g        = new THREE.Group();
  const trunkH   = 1.4 + rng() * 1.8;
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3317 });
  const trunk    = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, trunkH, 6), trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  g.add(trunk);

  const leafColors = [0x2d7a2d, 0x256025, 0x1e6b1e, 0x3a8a3a];
  const leafMat    = new THREE.MeshLambertMaterial({ color: leafColors[Math.floor(rng() * leafColors.length)] });
  const foliageH   = 1.8 + rng() * 2.8;
  for (let j = 0; j < 3; j++) {
    const r    = (foliageH * 0.55) * (1 - j * 0.22);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), leafMat);
    leaf.position.y = trunkH + j * foliageH * 0.28;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

function buildBuilding(rng: () => number): THREE.Group {
  const g     = new THREE.Group();
  const bW    = 4 + rng() * 9;
  const bH    = 6 + rng() * 22;
  const bD    = 4 + rng() * 9;
  const palette = [0x8090a0, 0x7a8898, 0x9aaab5, 0xb0a090, 0x888888, 0xa0a8b0];
  const bMat  = new THREE.MeshLambertMaterial({ color: palette[Math.floor(rng() * palette.length)] });
  const body  = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bMat);
  body.position.y = bH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Window grid
  const winMat = new THREE.MeshLambertMaterial({ color: 0xffffc8, emissive: 0xffff88, emissiveIntensity: 0.15 });
  const rowsN  = Math.floor(bH / 2.6);
  const colsN  = Math.floor(bW / 2.0);
  for (let row = 0; row < rowsN; row++) {
    for (let col = 0; col < colsN; col++) {
      if (rng() > 0.38) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.72), winMat);
        win.position.set(-bW / 2 + 1.2 + col * 2.0, 1.6 + row * 2.6, bD / 2 + 0.01);
        g.add(win);
      }
    }
  }
  return g;
}

function buildCar(color: number): THREE.Group {
  const g   = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 4.2), mat);
  body.position.y = 0.52;
  body.castShadow = true;
  g.add(body);

  // Cabin
  const cabMat = new THREE.MeshLambertMaterial({ color: 0x88aacc, transparent: true, opacity: 0.55 });
  const cab    = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.52, 2.35), cabMat);
  cab.position.set(0, 1.06, -0.22);
  g.add(cab);

  // Wheels
  const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[0.93, 1.35], [-0.93, 1.35], [0.93, -1.35], [-0.93, -1.35]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.22, 12), wMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.27, wz);
    g.add(w);
  }

  // Headlights
  const hlMat = new THREE.MeshLambertMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.6 });
  for (const hx of [-0.58, 0.58]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.05), hlMat);
    hl.position.set(hx, 0.52, 2.12);
    g.add(hl);
  }

  // Tail lights
  const tlMat = new THREE.MeshLambertMaterial({ color: 0xff1800, emissive: 0xff0000, emissiveIntensity: 0.5 });
  for (const tx of [-0.58, 0.58]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.05), tlMat);
    tl.position.set(tx, 0.52, -2.12);
    g.add(tl);
  }

  return g;
}

// Seeded PRNG so scene is deterministic per route
function makePrng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// ─── component ───────────────────────────────────────────────────────────────
export function ThreeDriveScene({
  speedKmh, isPaused, routeType, trafficSide, laneStatus,
  routeCoords, onSpeedChange, sceneRef,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Mutable "hot" refs — read every frame without causing re-renders
  const steerRef    = useRef(0);   // -1 … +1
  const throttleRef = useRef(0);   // 0 … 1
  const brakeRef    = useRef(0);   // 0 … 1
  const speedRef    = useRef(speedKmh);
  const pausedRef   = useRef(isPaused);
  const laneRef     = useRef(laneStatus);

  useEffect(() => { speedRef.current  = speedKmh; },  [speedKmh]);
  useEffect(() => { pausedRef.current = isPaused; },  [isPaused]);
  useEffect(() => { laneRef.current   = laneStatus; }, [laneStatus]);

  // Expose steering handle to parent
  useEffect(() => {
    if (!sceneRef) return;
    sceneRef.current = {
      setSteer:    (v) => { steerRef.current    = Math.max(-1, Math.min(1, v)); },
      setThrottle: (v) => { throttleRef.current = Math.max(0,  Math.min(1, v)); },
      setBrake:    (v) => { brakeRef.current    = Math.max(0,  Math.min(1, v)); },
    };
  }, [sceneRef]);

  // Keyboard driving
  useEffect(() => {
    const keys = new Set<string>();
    const down = (e: KeyboardEvent) => { keys.add(e.key); apply(); };
    const up   = (e: KeyboardEvent) => { keys.delete(e.key); apply(); };
    function apply() {
      steerRef.current    = (keys.has('ArrowLeft')  || keys.has('a') ? -1 : 0)
                          + (keys.has('ArrowRight') || keys.has('d') ?  1 : 0);
      throttleRef.current = (keys.has('ArrowUp')   || keys.has('w')) ? 1 : 0;
      brakeRef.current    = (keys.has('ArrowDown')  || keys.has('s')) ? 1 : 0;
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Scene setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    if (!routeCoords) return;
    const W = el.clientWidth, H = el.clientHeight;
    const rng = makePrng(routeType.charCodeAt(0) * 17 + routeType.length * 31 + Math.round((routeCoords.lat + routeCoords.lng) * 100));

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87b8e8);
    scene.fog = new THREE.Fog(0x87b8e8, 50, 200);

    // Camera — driver POV
    const camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 600);
    camera.position.set(0, 1.72, 1.8);
    camera.lookAt(0, 1.6, -60);

    // ── Lighting ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xfff0d8, 0.65));

    const sun = new THREE.DirectionalLight(0xfff5e0, 2.2);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far  = 350;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -90;
    sun.shadow.camera.right = sun.shadow.camera.top   =  90;
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0xc5ddf5, 0.45);
fillLight.position.set(-40, 30, -20);
scene.add(fillLight);

    // ── Sky gradient dome ─────────────────────────────────────────────────────
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vPos;
        void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main(){
          float t=clamp((vPos.y+60.0)/300.0,0.0,1.0);
          gl_FragColor=vec4(mix(vec3(0.55,0.78,0.95),vec3(0.14,0.38,0.72),t),1.0);
        }
      `,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), skyMat));

    // ── Ground ────────────────────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshLambertMaterial({ color: 0x4a7c44 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Road ─────────────────────────────────────────────────────────────────
    const roadGroup = buildRoad();
    scene.add(roadGroup);

    // ── Dashed centre line (instanced) ───────────────────────────────────────
    const dashIM = buildDashes();
    scene.add(dashIM);
    const dummy  = new THREE.Object3D();
    let   dashOffset = 0;

    // ── Trees ────────────────────────────────────────────────────────────────
    for (let i = 0; i < TREE_COUNT; i++) {
      const tree  = buildTree(rng);
      const side  = i % 2 === 0 ? -1 : 1;
      const xBase = side * (ROAD_WIDTH / 2 + 1.5 + rng() * 20);
      const zPos  = -(rng() * ROAD_LEN * 0.92);
      tree.position.set(xBase, 0, zPos);
      tree.scale.setScalar(0.75 + rng() * 0.65);
      scene.add(tree);
    }

    // ── Buildings (urban / highway) ──────────────────────────────────────────
    if (routeType === 'urban' || routeType === 'highway' || routeType === 'motorway') {
      for (let i = 0; i < BUILDING_COUNT; i++) {
        const bld  = buildBuilding(rng);
        const side = i % 2 === 0 ? -1 : 1;
        const xOff = side * (ROAD_WIDTH / 2 + 6 + rng() * 28);
        bld.position.set(xOff, 0, -(rng() * ROAD_LEN * 0.9));
        scene.add(bld);
      }
    }

    // ── Road signs (speed limit boards every ~80 m) ───────────────────────────
    const signMat  = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const postMat  = new THREE.MeshLambertMaterial({ color: 0x888888 });
    for (let i = 0; i < 6; i++) {
      const sg = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), postMat);
      post.position.y = 1.2;
      sg.add(post);
      const board = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24), signMat);
      board.rotation.x = Math.PI / 2;
      board.position.y = 2.5;
      sg.add(board);
      const redRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.07, 8, 24),
        new THREE.MeshLambertMaterial({ color: 0xcc0000 }),
      );
      redRing.position.y = 2.5;
      sg.add(redRing);
      sg.position.set(-(ROAD_WIDTH / 2 + 1.0), 0, -(i * 80 + 30));
      scene.add(sg);
    }

    // ── Traffic cars ─────────────────────────────────────────────────────────
    const carColors = [0xcc2222, 0x2244cc, 0xcccccc, 0x111111, 0x22aa44, 0xdd8800, 0x8822cc, 0xcc4488];
    const traffic: { mesh: THREE.Group; lane: number; spd: number; z: number }[] = [];

    for (let i = 0; i < CAR_COUNT; i++) {
      const lane  = i % 2 === 0 ? -1 : 1;
      const color = carColors[i % carColors.length];
      const car   = buildCar(color);
      const zPos  = -(10 + i * 22 + rng() * 18);
      car.position.set(lane * LANE_W / 2, 0, zPos);
      // Oncoming traffic faces the other direction
      if (lane === (trafficSide === 'right' ? -1 : 1)) car.rotation.y = Math.PI;
      scene.add(car);
      traffic.push({ mesh: car, lane, spd: 38 + rng() * 35, z: zPos });
    }

    // ── Dashboard / cockpit (child of camera) ─────────────────────────────────
    const dashGroup  = new THREE.Group();

    // Main panel
    const dashBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.62, 0.45),
      new THREE.MeshLambertMaterial({ color: 0x16182a }),
    );
    dashBody.position.set(0, 0.48, 0.28);
    dashGroup.add(dashBody);

    // Top cap
    const dashCap = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.07, 0.52),
      new THREE.MeshLambertMaterial({ color: 0x0e0f1e }),
    );
    dashCap.position.set(0, 0.82, 0.22);
    dashCap.rotation.x = 0.14;
    dashGroup.add(dashCap);

    // Instrument cluster bezel ring
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.04, 10, 32),
      new THREE.MeshLambertMaterial({ color: 0x0a0a0a }),
    );
    bezel.position.set(0, 0.74, 0.08);
    dashGroup.add(bezel);

    // Cluster face (dark disc)
    const clusterFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.31, 0.03, 32),
      new THREE.MeshLambertMaterial({ color: 0x060610 }),
    );
    clusterFace.rotation.x = Math.PI / 2;
    clusterFace.position.set(0, 0.74, 0.09);
    dashGroup.add(clusterFace);

    // Steering wheel
    const swMat  = new THREE.MeshLambertMaterial({ color: 0x0d0d0d });
    const swRing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.034, 10, 36), swMat);

    // Spokes
    for (const [sx, sy] of [[0, 0.27], [0, -0.27], [0.27, 0]]) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.54, 8), swMat);
      spoke.position.set(sx, sy, 0);
      if (sx !== 0) spoke.rotation.z = Math.PI / 2;
      swRing.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.044, 16), swMat);
    hub.rotation.x = Math.PI / 2;
    swRing.add(hub);

    swRing.position.set(0, 0.26, 0.82);
    swRing.rotation.x = 0.44;
    dashGroup.add(swRing);

    // A-pillars
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x0f101e });
    for (const [px, pRot] of [[-1.22, 0.24], [1.22, -0.24]] as [number, number][]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.5, 0.07), pillarMat);
      p.position.set(px, 0.92, 0.58);
      p.rotation.z = pRot;
      dashGroup.add(p);
    }

    // Hood silhouette (bottom of viewport)
    const hoodMat = new THREE.MeshLambertMaterial({ color: 0x1a1c2e });
    const hood    = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.2), hoodMat);
    hood.position.set(0, -0.26, 0.5);
    hood.rotation.x = -0.18;
    dashGroup.add(hood);

    dashGroup.position.set(0, 0, 1.15);
    camera.add(dashGroup);
    scene.add(camera);

    // ── State for animation loop ─────────────────────────────────────────────
    let   carX      = 0;       // lateral car position
    let   targetX   = 0;
    let   simSpeed  = 0;       // km/h, driven by player input
    let   dashZ     = 0;       // accumulated z for dash scrolling
    let   time      = 0;
    let   animId    = 0;
    const clock     = new THREE.Clock();

    // Physics params
    const MAX_SPEED_KMH = 160;
    const ACCEL_KMH_S   = 28;   // km/h per second at full throttle
    const BRAKE_KMH_S   = 55;
    const DRAG_KMH_S    = 8;    // coast drag
    const STEER_RATE    = 3.5;  // m/s lateral

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      time += dt;

      if (pausedRef.current) {
        renderer.render(scene, camera);
        return;
      }

      // ── Player physics ──────────────────────────────────────────────────────
      const thr = throttleRef.current;
      const brk = brakeRef.current;

      if (thr > 0) {
        simSpeed = Math.min(simSpeed + ACCEL_KMH_S * thr * dt, MAX_SPEED_KMH);
      } else if (brk > 0) {
        simSpeed = Math.max(simSpeed - BRAKE_KMH_S * brk * dt, 0);
      } else {
        // If no external speed coming in (GPS mode not yet active), auto-drive
        const extSpeed = speedRef.current;
        if (extSpeed > 0 && thr === 0 && brk === 0) {
          simSpeed = simSpeed + (extSpeed - simSpeed) * 3 * dt;
        } else {
          simSpeed = Math.max(simSpeed - DRAG_KMH_S * dt, 0);
        }
      }

      onSpeedChange(simSpeed);

      const mps = simSpeed / 3.6;

      // ── Steering ──────────────────────────────────────────────────────────
      const steer = steerRef.current;
      targetX = Math.max(-LANE_W * 0.88, Math.min(LANE_W * 0.88, targetX + steer * STEER_RATE * dt));
      carX    = carX + (targetX - carX) * 5 * dt;

      camera.position.x = carX;
      // Suspension bob
      camera.position.y = 1.72 + Math.sin(time * 7) * 0.006 * Math.min(1, mps / 14);
      // Steering wheel rotation
      swRing.rotation.z = steer * 1.3;
      // Camera roll on steer
      camera.rotation.z = -steer * 0.035;

      // ── Dash scrolling ────────────────────────────────────────────────────
      dashOffset += mps * dt;
      if (dashOffset > TOTAL_DASH_Z) dashOffset -= TOTAL_DASH_Z;

      for (let i = 0; i < DASH_COUNT; i++) {
        let z = -(i * (DASH_LEN + DASH_GAP)) + dashOffset;
        if (z > 6) z -= TOTAL_DASH_Z;
        dummy.position.set(0, 0.015, z);
        dummy.updateMatrix();
        dashIM.setMatrixAt(i, dummy.matrix);
      }
      dashIM.instanceMatrix.needsUpdate = true;

      // ── Traffic cars ──────────────────────────────────────────────────────
      for (const car of traffic) {
        const relMps = mps - car.spd / 3.6;
        car.z += relMps * dt;

        // Oncoming: relative to player in opposite direction
        if (car.lane === (trafficSide === 'right' ? -1 : 1)) {
          car.z -= (car.spd / 3.6) * 2 * dt; // doubles perceived closing speed
        }

        if (car.z > 10)   car.z = -130 - rng() * 70;
        if (car.z < -160) car.z =   10 + rng() * 30;
        car.mesh.position.z = car.z;
      }

      // ── Lane violation shake ──────────────────────────────────────────────
      if (laneRef.current === 'violation') {
        camera.position.x += (Math.random() - 0.5) * 0.04;
        camera.position.y += (Math.random() - 0.5) * 0.02;
      }

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ────────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeType, trafficSide, routeCoords?.lat, routeCoords?.lng]);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full touch-none" />;
}