// components/training/ThreeDriveScene.tsx
// Real OSM road geometry + photorealistic Three.js driver POV
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface DriveSceneHandle {
  setSteer: (v: number) => void;
  setThrottle: (v: number) => void;
  setBrake: (v: number) => void;
}

interface LatLng { lat: number; lng: number }

interface Props {
  speedKmh: number;
  isPaused: boolean;
  routeType: string;
  trafficSide: 'left' | 'right';
  laneStatus: 'correct' | 'warning' | 'violation';
  routeCoords: LatLng;   // real start coords
  onSpeedChange: (kmh: number) => void;
  sceneRef?: React.MutableRefObject<DriveSceneHandle | null>;
}

// ── OSM fetch ─────────────────────────────────────────────────────────────────
interface OSMWay { nodes: [number, number][] }

async function fetchRoadGeometry(lat: number, lng: number, radiusM = 600): Promise<OSMWay[]> {
  const query = `
    [out:json][timeout:20];
    way(around:${radiusM},${lat},${lng})["highway"~"^(primary|secondary|tertiary|residential|trunk|motorway)$"];
    out geom;
  `;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
    });
    const json = await res.json();
    return (json.elements ?? []).map((el: any) => ({
      nodes: (el.geometry ?? []).map((g: any) => [g.lat, g.lon] as [number, number]),
    })).filter((w: OSMWay) => w.nodes.length >= 2);
  } catch {
    return [];
  }
}

// ── Lat/Lng → local XZ (metres, flat-earth approx) ──────────────────────────
function toLocal(lat: number, lng: number, originLat: number, originLng: number): [number, number] {
  const x = (lng - originLng) * Math.cos((originLat * Math.PI) / 180) * 111_320;
  const z = -(lat - originLat) * 111_320;
  return [x, z];
}

// ── Geometry builders ─────────────────────────────────────────────────────────
const LANE_W   = 3.6;
const ROAD_W   = LANE_W * 2;
const DASH_LEN = 3.0;
const DASH_GAP = 5.0;

function buildRoadMesh(ways: OSMWay[], origin: LatLng, scene: THREE.Scene) {
  const asphaltMat   = new THREE.MeshLambertMaterial({ color: 0x1e1e1e });
  const centerLineMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const kerbMat      = new THREE.MeshLambertMaterial({ color: 0xdddddd });
  const dashMat      = new THREE.MeshLambertMaterial({ color: 0xffffff });

  for (const way of ways) {
    for (let i = 0; i < way.nodes.length - 1; i++) {
      const [ax, az] = toLocal(way.nodes[i][0],     way.nodes[i][1],     origin.lat, origin.lng);
      const [bx, bz] = toLocal(way.nodes[i + 1][0], way.nodes[i + 1][1], origin.lat, origin.lng);

      const dx  = bx - ax, dz = bz - az;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.5) continue;

      const angle = Math.atan2(dx, dz);
      const mx    = (ax + bx) / 2, mz = (az + bz) / 2;

      // Road surface
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, len), asphaltMat);
      seg.rotation.x = -Math.PI / 2;
      seg.rotation.z = -angle;  // note: PlaneGeometry lies in XY after rotX, so rotZ steers it
      // Actually for a plane rotated -PI/2 on X, forward is Z → we rotate Y
      seg.rotation.set(-Math.PI / 2, 0, 0);
      seg.position.set(mx, 0.01, mz);

      // Proper orientation: build as box so we can rotate cleanly
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(ROAD_W, 0.02, len),
        asphaltMat,
      );
      road.position.set(mx, 0, mz);
      road.rotation.y = angle;
      road.receiveShadow = true;
      scene.add(road);

      // Kerbs
      for (const side of [-1, 1]) {
        const perp = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)).multiplyScalar(side * ROAD_W / 2);
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, len), kerbMat);
        kerb.position.set(mx + perp.x, 0.04, mz + perp.z);
        kerb.rotation.y = angle;
        scene.add(kerb);
      }

      // Dashed centre line
      const dashCount = Math.floor(len / (DASH_LEN + DASH_GAP));
      for (let d = 0; d < dashCount; d++) {
        const t     = (d + 0.5) / dashCount;
        const dashX = ax + dx * t;
        const dashZ = az + dz * t;
        const dash  = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, DASH_LEN), dashMat);
        dash.position.set(dashX, 0.012, dashZ);
        dash.rotation.y = angle;
        scene.add(dash);
      }

      // Solid centre line
      const cl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.021, len), centerLineMat);
      cl.position.set(mx, 0.011, mz);
      cl.rotation.y = angle;
      scene.add(cl);
    }
  }
}

// ── Route path (ordered spine for car to follow) ─────────────────────────────
function buildSpine(ways: OSMWay[], origin: LatLng): THREE.Vector3[] {
  if (!ways.length) {
    // Fallback: straight road
    return Array.from({ length: 60 }, (_, i) => new THREE.Vector3(0, 0, -i * 8));
  }
  // Use the longest way as the main spine
  const main = [...ways].sort((a, b) => b.nodes.length - a.nodes.length)[0];
  return main.nodes.map(([lat, lng]) => {
    const [x, z] = toLocal(lat, lng, origin.lat, origin.lng);
    return new THREE.Vector3(x, 0, z);
  });
}

// ── Car mesh ─────────────────────────────────────────────────────────────────
function buildTrafficCar(color: number): THREE.Group {
  const g   = new THREE.Group();
  const mat = new THREE.MeshPhongMaterial({ color, shininess: 80 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.62, 4.2), mat);
  body.position.y = 0.54; body.castShadow = true; g.add(body);

  const cabMat = new THREE.MeshPhongMaterial({ color: 0x88aacc, transparent: true, opacity: 0.45, shininess: 120 });
  const cab    = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 2.3), cabMat);
  cab.position.set(0, 1.08, -0.25); g.add(cab);

  const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[0.94, 1.3], [-0.94, 1.3], [0.94, -1.3], [-0.94, -1.3]] as [number, number][]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 14), wMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.28, wz); g.add(w);
  }

  const hlMat = new THREE.MeshPhongMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.8 });
  const tlMat = new THREE.MeshPhongMaterial({ color: 0xff1100, emissive: 0xff0000, emissiveIntensity: 0.6 });
  for (const x of [-0.58, 0.58]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.05), hlMat);
    hl.position.set(x, 0.54, 2.13); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.05), tlMat);
    tl.position.set(x, 0.54, -2.13); g.add(tl);
  }
  return g;
}

// ── Tree ─────────────────────────────────────────────────────────────────────
function buildTree(seed: number): THREE.Group {
  const rng  = (s: number) => ((s * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  const r1   = rng(seed), r2 = rng(seed + 1), r3 = rng(seed + 2);
  const g    = new THREE.Group();
  const tH   = 1.6 + r1 * 2.0;
  const tMat = new THREE.MeshLambertMaterial({ color: 0x4a2e10 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, tH, 7), tMat);
  trunk.position.y = tH / 2; trunk.castShadow = true; g.add(trunk);

  const lCols = [0x2d6e2d, 0x1e5e1e, 0x3a7e3a, 0x256825];
  const lMat  = new THREE.MeshLambertMaterial({ color: lCols[Math.floor(r2 * lCols.length)] });
  const fH    = 2.0 + r3 * 3.0;
  for (let j = 0; j < 3; j++) {
    const lf = new THREE.Mesh(new THREE.SphereGeometry(fH * 0.48 * (1 - j * 0.2), 7, 5), lMat);
    lf.position.y = tH + j * fH * 0.3; lf.castShadow = true; g.add(lf);
  }
  return g;
}

// ── Building ──────────────────────────────────────────────────────────────────
function buildBuilding(seed: number): THREE.Group {
  const rng = (s: number) => ((s * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  const g   = new THREE.Group();
  const bW  = 5 + rng(seed) * 10, bH = 7 + rng(seed + 1) * 25, bD = 5 + rng(seed + 2) * 10;
  const palette = [0x8090a0, 0x7a8898, 0x9aaab5, 0xc0b098, 0x909090, 0xa8b0b8];
  const bMat = new THREE.MeshPhongMaterial({ color: palette[Math.floor(rng(seed + 3) * palette.length)], shininess: 20 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bMat);
  body.position.y = bH / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);

  const wMat = new THREE.MeshPhongMaterial({ color: 0xfff8c8, emissive: 0xffee88, emissiveIntensity: 0.2 });
  const rows = Math.floor(bH / 2.8), cols = Math.floor(bW / 2.2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng(seed + r * 100 + c) > 0.35) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), wMat);
        win.position.set(-bW / 2 + 1.3 + c * 2.2, 1.8 + r * 2.8, bD / 2 + 0.01); g.add(win);
      }
    }
  }
  return g;
}

// ── Seeded PRNG ───────────────────────────────────────────────────────────────
function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// ─────────────────────────────────────────────────────────────────────────────
export function ThreeDriveScene({
  speedKmh, isPaused, routeType, trafficSide, laneStatus,
  routeCoords, onSpeedChange, sceneRef,
}: Props) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const steerRef    = useRef(0);
  const throttleRef = useRef(0);
  const brakeRef    = useRef(0);
  const speedRef    = useRef(speedKmh);
  const pausedRef   = useRef(isPaused);
  const laneRef     = useRef(laneStatus);

  useEffect(() => { speedRef.current  = speedKmh;   }, [speedKmh]);
  useEffect(() => { pausedRef.current = isPaused;    }, [isPaused]);
  useEffect(() => { laneRef.current   = laneStatus;  }, [laneStatus]);

  useEffect(() => {
    if (!sceneRef) return;
    sceneRef.current = {
      setSteer:    (v) => { steerRef.current    = Math.max(-1, Math.min(1, v)); },
      setThrottle: (v) => { throttleRef.current = Math.max(0,  Math.min(1, v)); },
      setBrake:    (v) => { brakeRef.current    = Math.max(0,  Math.min(1, v)); },
    };
  }, [sceneRef]);

  // Keyboard
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

  // ── Scene ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth, H = el.clientHeight;
    const rng = seededRng(routeCoords.lat * 1000 + routeCoords.lng * 100);

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    scene.background = new THREE.Color(0x7ab0d4);
    scene.fog = new THREE.FogExp2(0x9ec8e8, 0.006);

    const camera = new THREE.PerspectiveCamera(68, W / H, 0.05, 800);
    camera.position.set(0, 1.65, 1.6);
    camera.lookAt(0, 1.5, -40);

    // ── Lighting ──────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xfff0e0, 0.7);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff8e0, 2.4);
    sun.position.set(80, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far  = 400;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -120;
    sun.shadow.camera.right = sun.shadow.camera.top   =  120;
    sun.shadow.bias = -0.0002;
    scene.add(sun);

    const hemi = new THREE.HemisphereLight(0xc8e8ff, 0x557744, 0.5);
    scene.add(hemi);

    // ── Sky ───────────────────────────────────────────────────────────────────
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vP;
        void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
      `,
      fragmentShader: `
        varying vec3 vP;
        void main(){
          float t=clamp((vP.y+80.)/380.,0.,1.);
          vec3 horizon=vec3(0.62,0.82,0.96);
          vec3 zenith =vec3(0.12,0.36,0.72);
          // Sun disc
          vec3 sunDir=normalize(vec3(0.55,0.75,0.36));
          float sd=dot(normalize(vP),sunDir);
          vec3 col=mix(horizon,zenith,pow(t,0.6));
          col+=vec3(1.0,0.95,0.7)*pow(max(sd,0.),180.)*0.8; // sun
          col+=vec3(0.9,0.85,0.6)*pow(max(sd,0.),12.)*0.15;  // halo
          gl_FragColor=vec4(col,1.);
        }
      `,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat));

    // ── Clouds (billboard sprites) ────────────────────────────────────────────
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
    for (let i = 0; i < 14; i++) {
      const cg   = new THREE.Group();
      const clumps = 3 + Math.floor(rng() * 4);
      for (let j = 0; j < clumps; j++) {
        const r  = 12 + rng() * 18;
        const cm = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), cloudMat);
        cm.position.set((rng() - 0.5) * 40, (rng() - 0.5) * 10, (rng() - 0.5) * 30);
        cg.add(cm);
      }
      cg.position.set(
        (rng() - 0.5) * 600,
        80 + rng() * 60,
        -rng() * 500,
      );
      scene.add(cg);
    }

    // ── Ground ────────────────────────────────────────────────────────────────
    const groundTex = (() => {
      // Procedural grass texture
      const size = 256, data = new Uint8Array(size * size * 3);
      for (let i = 0; i < size * size; i++) {
        const v = 60 + Math.floor(Math.random() * 20);
        data[i * 3 + 0] = 30 + Math.floor(Math.random() * 15);
        data[i * 3 + 1] = v;
        data[i * 3 + 2] = 20 + Math.floor(Math.random() * 10);
      }
      const t = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(80, 80);
      t.needsUpdate = true;
      return t;
    })();

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200),
      new THREE.MeshLambertMaterial({ map: groundTex }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Road geometry (real OSM) ──────────────────────────────────────────────
    let spine: THREE.Vector3[] = Array.from({ length: 80 }, (_, i) =>
      new THREE.Vector3(0, 0, -i * 7)
    );

    fetchRoadGeometry(routeCoords.lat, routeCoords.lng, 500).then(ways => {
      if (ways.length > 0) {
        buildRoadMesh(ways, routeCoords, scene);
        spine = buildSpine(ways, routeCoords);
      }
    });

    // Fallback straight road (shown immediately while OSM loads)
    buildRoadMesh(
      [{ nodes: Array.from({ length: 40 }, (_, i): [number, number] => [
        routeCoords.lat - i * 0.0004,
        routeCoords.lng,
      ]) }],
      routeCoords, scene,
    );

    // ── Road-side environment ─────────────────────────────────────────────────
    const isUrban = routeType === 'urban' || routeType === 'motorway' || routeType === 'highway';

    for (let i = 0; i < 150; i++) {
      const side  = i % 2 === 0 ? -1 : 1;
      const xBase = side * (ROAD_W / 2 + 1.5 + rng() * (isUrban ? 22 : 30));
      const zPos  = -(rng() * 550 + 5);

      if (isUrban && rng() > 0.45) {
        const b = buildBuilding(Math.floor(rng() * 9999));
        b.position.set(xBase, 0, zPos);
        scene.add(b);
      } else {
        const t = buildTree(Math.floor(rng() * 9999));
        t.position.set(xBase, 0, zPos);
        t.scale.setScalar(0.7 + rng() * 0.7);
        scene.add(t);
      }
    }

    // Street lamps
    const lampPostMat  = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const lampHeadMat  = new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: 0xffff88, emissiveIntensity: 0.4 });
    for (let i = 0; i < 20; i++) {
      for (const side of [-1, 1]) {
        const lg = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.5, 8), lampPostMat);
        post.position.y = 2.75; lg.add(post);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), lampPostMat);
        arm.rotation.z = side > 0 ? -Math.PI / 2.5 : Math.PI / 2.5;
        arm.position.set(side * 0.6, 5.5, 0); lg.add(arm);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.55), lampHeadMat);
        head.position.set(side * 1.1, 5.55, 0); lg.add(head);
        lg.position.set(side * (ROAD_W / 2 + 0.7), 0, -(i * 28 + 14));
        scene.add(lg);
      }
    }

    // Speed limit signs
    const signPostMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const signFaceMat = new THREE.MeshLambertMaterial({ color: 0xfafafa });
    const signRingMat = new THREE.MeshLambertMaterial({ color: 0xcc0000 });
    for (let i = 0; i < 5; i++) {
      const sg = new THREE.Group();
      sg.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.5, 8), signPostMat), { position: new THREE.Vector3(0, 1.25, 0) }));
      sg.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 24), signFaceMat), { position: new THREE.Vector3(0, 2.65, 0), rotation: new THREE.Euler(Math.PI / 2, 0, 0) }));
      sg.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 8, 24), signRingMat), { position: new THREE.Vector3(0, 2.65, 0) }));
      sg.position.set(-(ROAD_W / 2 + 0.9), 0, -(i * 95 + 30));
      scene.add(sg);
    }

    // ── Traffic cars ─────────────────────────────────────────────────────────
    const carColors = [0xcc2222, 0x2244cc, 0xb0b0b0, 0x111111, 0x22aa44, 0xdd8800, 0x882299, 0xcc4477];
    const traffic: { mesh: THREE.Group; lane: number; spd: number; z: number }[] = [];

    for (let i = 0; i < 12; i++) {
      const lane  = i % 2 === 0 ? 1 : -1;
      const car   = buildTrafficCar(carColors[i % carColors.length]);
      const z     = -(12 + i * 25 + rng() * 20);
      car.position.set(lane * LANE_W / 2, 0, z);
      if (lane === (trafficSide === 'right' ? -1 : 1)) car.rotation.y = Math.PI;
      scene.add(car);
      traffic.push({ mesh: car, lane, spd: 35 + rng() * 40, z });
    }

    // ── Dashboard / cockpit (attached to camera) ──────────────────────────────
    const dashG = new THREE.Group();

    // Main panel — dark matte
    const panelMat  = new THREE.MeshPhongMaterial({ color: 0x0e1020, shininess: 15 });
    const leatherMat = new THREE.MeshPhongMaterial({ color: 0x1a1218, shininess: 5 });

    // Full dash body
    const dashBody = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.7, 0.5), panelMat);
    dashBody.position.set(0, 0.42, 0.22); dashG.add(dashBody);

    // Dash top leather roll
    const dashRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.0, 12), leatherMat);
    dashRoll.rotation.z = Math.PI / 2; dashRoll.position.set(0, 0.79, 0.02); dashG.add(dashRoll);

    // Instrument binnacle (cluster hood)
    const binnacleMat = new THREE.MeshPhongMaterial({ color: 0x080810, shininess: 5 });
    const binnacle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.32, 0.28), binnacleMat);
    binnacle.position.set(0, 0.76, 0.14); dashG.add(binnacle);

    // Instrument faces (two dials)
    const dialFaceMat = new THREE.MeshPhongMaterial({ color: 0x060610, shininess: 30 });
    const dialGlassMat = new THREE.MeshPhongMaterial({ color: 0x223344, transparent: true, opacity: 0.25, shininess: 200 });
    for (const dx of [-0.22, 0.22]) {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 28), new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 60 }));
      bezel.rotation.x = Math.PI / 2; bezel.position.set(dx, 0.76, 0.08); dashG.add(bezel);
      const face  = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28), dialFaceMat);
      face.position.set(dx, 0.76, 0.07); dashG.add(face);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.18, 28), dialGlassMat);
      glass.position.set(dx, 0.76, 0.092); dashG.add(glass);
      // Needle
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.14, 0.005), new THREE.MeshLambertMaterial({ color: 0xff3300 }));
      needle.position.set(dx, 0.76, 0.075); dashG.add(needle);
    }

    // AC/infotainment screen
    const screenMat = new THREE.MeshPhongMaterial({ color: 0x0a1428, emissive: 0x0a1428, emissiveIntensity: 0.6, shininess: 100 });
    const screen    = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.02), screenMat);
    screen.position.set(0.6, 0.58, 0.0); dashG.add(screen);
    // Screen glow
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.30, 0.001), new THREE.MeshPhongMaterial({ color: 0x1a3a6e, emissive: 0x0a2050, emissiveIntensity: 1.0, transparent: true, opacity: 0.9 }));
    glow.position.set(0.6, 0.58, 0.012); dashG.add(glow);

    // Steering column
    const colMat  = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 20 });
    const column  = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 10), colMat);
    column.rotation.x = 0.44; column.position.set(0, 0.12, 0.72); dashG.add(column);

    // Steering wheel rim
    const swMat  = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 40 });
    const swRim  = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.033, 12, 40), swMat);
    // Leather grip sections
    const gripMat = new THREE.MeshPhongMaterial({ color: 0x1a1218, shininess: 8 });
    for (let s = 0; s < 4; s++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.036, 8, 10, Math.PI * 0.4), gripMat);
      arc.rotation.z = s * Math.PI / 2; swRim.add(arc);
    }

    // Spokes (3-spoke)
    for (const [sx, sy, rot] of [[0, 0.27, 0], [0.23, -0.13, Math.PI * 2 / 3 * 1], [-0.23, -0.13, Math.PI * 2 / 3 * 2]] as [number, number, number][]) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.26, 0.018), swMat);
      spoke.position.set(sx * 0, sy * 0, 0); // centred spokes
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.26, 0.018), swMat);
      s2.position.set(sx, sy / 2, 0);
      s2.rotation.z = rot;
      swRim.add(s2);
    }

    // Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.042, 18), swMat);
    hub.rotation.x = Math.PI / 2; swRim.add(hub);
    // Hub badge (colour)
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshLambertMaterial({ color: 0x3355aa }));
    badge.position.z = 0.022; swRim.add(badge);

    swRim.position.set(0, 0.27, 0.82);
    swRim.rotation.x = 0.42;
    dashG.add(swRim);

    // A-pillars
    const pillarMat = new THREE.MeshPhongMaterial({ color: 0x0d0d14, shininess: 10 });
    for (const [px, tilt] of [[-1.3, 0.26], [1.3, -0.26]] as [number, number][]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.55, 0.07), pillarMat);
      p.position.set(px, 0.96, 0.52); p.rotation.z = tilt; dashG.add(p);
    }

    // Hood / bonnet
    const hoodMat = new THREE.MeshPhongMaterial({ color: 0x12141f, shininess: 60 });
    const hood    = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 1.0), hoodMat);
    hood.position.set(0, -0.25, 0.52); hood.rotation.x = -0.16; dashG.add(hood);

    // Side mirrors (visible at edge)
    for (const mx of [-1.38, 1.38]) {
      const mir = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.18), new THREE.MeshPhongMaterial({ color: 0x111111 }));
      mir.position.set(mx, 0.68, 0.3); dashG.add(mir);
    }

    dashG.position.set(0, 0, 1.12);
    camera.add(dashG);
    scene.add(camera);

    // ── Spine following ────────────────────────────────────────────────────────
    let   spineT     = 0;   // 0…1 along spine
    let   simSpeed   = 0;
    let   carX       = 0;
    let   targetX    = 0;
    let   time       = 0;
    let   animId     = 0;
    const clock      = new THREE.Clock();

    // Physics
    const ACCEL = 30, BRAKE_F = 60, DRAG = 10, MAX_SPD = 160;

    function getSpinePoint(t: number): THREE.Vector3 {
      if (spine.length < 2) return new THREE.Vector3(0, 0, -t * 300);
      const idx = Math.min(Math.floor(t * (spine.length - 1)), spine.length - 2);
      const frac = t * (spine.length - 1) - idx;
      return spine[idx].clone().lerp(spine[idx + 1], frac);
    }

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      time += dt;

      if (pausedRef.current) { renderer.render(scene, camera); return; }

      // Physics
      const thr = throttleRef.current, brk = brakeRef.current;
      if (thr > 0)      simSpeed = Math.min(simSpeed + ACCEL * thr * dt, MAX_SPD);
      else if (brk > 0) simSpeed = Math.max(simSpeed - BRAKE_F * brk * dt, 0);
      else {
        const ext = speedRef.current;
        simSpeed = ext > 0 ? simSpeed + (ext - simSpeed) * 2.5 * dt
                           : Math.max(simSpeed - DRAG * dt, 0);
      }
      onSpeedChange(simSpeed);
      const mps = simSpeed / 3.6;

      // Advance along spine
      const spineLen = spine.length > 1
        ? spine.reduce((acc, _, i) => i === 0 ? 0 : acc + spine[i - 1].distanceTo(spine[i]), 0)
        : 400;
      spineT = (spineT + mps * dt / spineLen) % 1;

      // Camera follows spine
      const pos  = getSpinePoint(spineT);
      const posF = getSpinePoint(Math.min(spineT + 0.02, 0.999));
      const dir  = posF.clone().sub(pos).normalize();

      // Steering offset perpendicular to road direction
      const perp = new THREE.Vector3(-dir.z, 0, dir.x);
      targetX = Math.max(-LANE_W * 0.85, Math.min(LANE_W * 0.85, targetX + steerRef.current * 3.5 * dt));
      carX    = carX + (targetX - carX) * 5 * dt;

      camera.position.set(
        pos.x + perp.x * carX,
        1.65 + Math.sin(time * 7) * 0.007 * Math.min(1, mps / 12),
        pos.z + perp.z * carX,
      );

      // Camera look-ahead along road
      const lookAt = posF.clone().add(new THREE.Vector3(perp.x * carX, 1.55, perp.z * carX));
      camera.lookAt(lookAt);
      camera.rotation.z = -steerRef.current * 0.032; // roll
      swRim.rotation.z  =  steerRef.current * 1.4;   // wheel turns

      // Traffic
      for (const car of traffic) {
        const relMps = mps - car.spd / 3.6;
        const oncoming = car.lane === (trafficSide === 'right' ? -1 : 1);
        car.z += (oncoming ? -(car.spd / 3.6) * 2 : relMps) * dt;
        if (car.z > 12) car.z = -160 - rng() * 60;
        if (car.z < -180) car.z = 12 + rng() * 30;
        car.mesh.position.z = car.z;
      }

      // Lane violation shake
      if (laneRef.current === 'violation') {
        camera.position.x += (Math.random() - 0.5) * 0.045;
        camera.position.y += (Math.random() - 0.5) * 0.022;
      }

      renderer.render(scene, camera);
    }
    animate();

    // Resize
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
  }, [routeType, routeCoords.lat, routeCoords.lng, trafficSide]);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full touch-none" />;
}