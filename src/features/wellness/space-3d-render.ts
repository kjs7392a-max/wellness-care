/**
 * 마음 쉼터 3D 캐릭터 그리기(2026-11-21 시안) — three.js. 이 파일은 3D 를 켤 때만 따로 불러온다(첫 화면 무게 그대로).
 *
 * 2D 장면(SpaceTogether 의 SpaceScene)이 지금처럼 사람마다 [data-space-actor] 상자를 놓고 CSS 로 걸어가게 하면,
 * 여기서는 매 장면마다 그 상자의 실제 자리(getBoundingClientRect — 걷는 도중도)를 읽어 3D 몸을 같은 자리·크기로 그린다.
 *   - 크기: 상자 폭 = 앉은 그림 상자 높이 × 100/126 → u(1/126) = 폭/100 px. 실사 크기 맞춤(space-seats)을 그대로 따른다.
 *   - 발밑: 상자 아래 가운데. 장의자에 앉으면 그 선 아래는 자르고(등받이), 줄 안을 걸으면 data-cut 만큼 자른다.
 *   - 걸음은 움직인 거리만큼 다리를 옮긴다(발이 미끄러지지 않게) · 도는 것·앉고 일어서는 것은 부드럽게 이어진다.
 * 이름표·말풍선·누르기는 2D 상자가 그대로 맡는다(3D 는 그림만).
 */
import * as THREE from "three";
import { AVATARS, avatarOf, type AvatarDef, type AvatarId } from "./space-avatars";
import type { SpaceId } from "./space";
import {
  blendMs, easeInOut, HAIR, mixAngles, poseAngles, RIG, STRIDE_U, targetYaw, turnToward,
  type Angles, type ArmAngles, type LegAngles, type Pose3D,
} from "./space-3d-rig";

// ── 방마다 빛 — 영상의 빛 방향·색에 맞춤(왼쪽 = 화면 왼쪽) ─────────────────────────────
interface Light3D { sky: string; ground: string; hemi: number; key: string; keyI: number; keyDir: [number, number, number]; rim: string; rimI: number; rimDir: [number, number, number]; tint: number }
const LIGHTS: Record<SpaceId, Light3D> = {
  // 저녁 명상룸 — 양쪽 벽 조명(따뜻) + 뒤 창문(푸른 저녁빛)
  meditation: { sky: "#ffe6c7", ground: "#6b5240", hemi: 1.05, key: "#ffd3a1", keyI: 1.6, keyDir: [-0.6, 0.55, 0.6], rim: "#9fb8e8", rimI: 0.75, rimDir: [0.2, 0.4, -1], tint: 1 },
  // 낮 법당 — 양옆 창호로 밝은 빛
  temple: { sky: "#fff1d8", ground: "#7a5232", hemi: 1.2, key: "#fff0d2", keyI: 1.5, keyDir: [-0.8, 0.5, 0.3], rim: "#ffd9a0", rimI: 0.8, rimDir: [0.8, 0.4, -0.4], tint: 1 },
  // 어스름한 교회 — 앞(십자가) 쪽 따뜻한 빛이 등 너머로
  church: { sky: "#e0d2bf", ground: "#3d322b", hemi: 0.85, key: "#ffe0b8", keyI: 0.9, keyDir: [0.3, 0.6, 0.7], rim: "#ffcf8a", rimI: 1.0, rimDir: [0, 0.5, -1], tint: 0.82 },
  // 어두운 성당 — 촛불·제대 쪽 주황빛
  cathedral: { sky: "#c9a37e", ground: "#2a1f18", hemi: 0.75, key: "#ffb877", keyI: 0.85, keyDir: [0.5, 0.5, 0.6], rim: "#ffa45c", rimI: 1.1, rimDir: [0.2, 0.5, -1], tint: 0.7 },
};

// ── 몸 만들기 ───────────────────────────────────────────────────────────────
const shade = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);
interface Rig3D {
  root: THREE.Group; tilt: THREE.Group; body: THREE.Group; torso: THREE.Group; head: THREE.Group; shadow: THREE.Mesh;
  hipL: THREE.Group; kneeL: THREE.Group; hipR: THREE.Group; kneeR: THREE.Group;
  shL: THREE.Group; elL: THREE.Group; shR: THREE.Group; elR: THREE.Group;
  materials: THREE.Material[];
}

function capsule(r: number, len: number, mat: THREE.Material, y: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat);
  m.position.y = y;
  return m;
}

let shadowTex: THREE.Texture | null = null;
function shadowTexture(): THREE.Texture {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, "rgba(0,0,0,0.55)");
  grd.addColorStop(0.6, "rgba(0,0,0,0.25)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

function buildHair(a: AvatarDef, mat: THREE.Material, head: THREE.Group) {
  const style = HAIR[a.id].style;
  const R = RIG.headR + 1.3;
  const W = 1.0; // 얼굴(앞) 쪽 비우는 반각
  const add = (g: THREE.BufferGeometry, setup?: (m: THREE.Mesh) => void) => { const m = new THREE.Mesh(g, mat); setup?.(m); head.add(m); return m; };
  // 정수리(앞 머리선은 조금 올린다)
  const topT = style === "thin" ? 0.95 : 1.12;
  add(new THREE.SphereGeometry(R, 32, 12, 0, Math.PI * 2, 0, topT), (m) => { m.rotation.x = -0.28; });
  // 옆·뒤(얼굴은 비움)
  const sideT = { long: 2.25, short: 1.8, bob: 2.2, bun: 1.85, curly: 1.75, curlyShort: 1.7, thin: 1.72 }[style];
  add(new THREE.SphereGeometry(R, 32, 16, Math.PI / 2 + W, Math.PI * 2 - 2 * W, 0, sideT));
  // 앞머리
  if (style === "long" || style === "bob" || style === "short") {
    add(new THREE.SphereGeometry(R + 0.4, 24, 6, Math.PI / 2 - 0.95, 1.9, 0.55, style === "short" ? 0.42 : 0.55), (m) => { m.rotation.x = -0.05; });
  }
  if (style === "long") {
    // 등까지 내려오는 긴 머리
    add(new THREE.CapsuleGeometry(14.5, 22, 8, 18), (m) => { m.scale.set(1.3, 1, 0.62); m.position.set(0, -17, -10.5); m.rotation.x = 0.1; });
  }
  if (style === "bob") {
    add(new THREE.CapsuleGeometry(10, 8, 6, 14), (m) => { m.scale.set(1.95, 1, 1.0); m.position.set(0, -8, -6); });
  }
  if (style === "bun") {
    add(new THREE.SphereGeometry(8.5, 20, 14), (m) => { m.position.set(0, 13, -14); });
  }
  if (style === "curly" || style === "curlyShort") {
    const r = style === "curly" ? 6 : 4.8;
    const rows = style === "curly" ? [0.25, 0.65, 1.05, 1.45, 1.8] : [0.25, 0.65, 1.05, 1.4];
    for (const th of rows) {
      const n = Math.max(4, Math.round(16 * Math.sin(th) + 2));
      for (let i = 0; i < n; i++) {
        const ph = (i / n) * Math.PI * 2;
        // 얼굴 앞(phi≈π/2 → +z)은 이마 위까지만
        const front = Math.abs(((ph - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (th > 1.0 && front < 1.05) continue;
        const rr = R + 0.5;
        add(new THREE.SphereGeometry(r, 10, 8), (m) => {
          m.position.set(-rr * Math.cos(ph) * Math.sin(th), rr * Math.cos(th), rr * Math.sin(ph) * Math.sin(th));
        });
      }
    }
  }
}

function buildFace(a: AvatarDef, head: THREE.Group, materials: THREE.Material[]) {
  const dark = new THREE.MeshStandardMaterial({ color: "#3a3340", roughness: 0.35 });
  const lip = new THREE.MeshStandardMaterial({ color: "#b5655a", roughness: 0.6 });
  const blush = new THREE.MeshBasicMaterial({ color: "#f2a39b", transparent: true, opacity: 0.42, depthWrite: false });
  const white = a.hair === "#eceae6" || a.hair === "#d8d4de";
  const brow = new THREE.MeshStandardMaterial({ color: white ? "#9a9590" : a.hair, roughness: 0.8 });
  const nose = new THREE.MeshStandardMaterial({ color: shade(a.skin, 0.93), roughness: 0.7 });
  materials.push(dark, lip, blush, brow, nose);
  const R = RIG.headR;
  const onFace = (x: number, y: number, lift = 0) => new THREE.Vector3(x, y, Math.sqrt(Math.max(0, R * R - x * x - y * y)) + lift);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 10), dark);
    eye.scale.set(1, 1.25, 0.55); eye.position.copy(onFace(s * 6.8, 1.2, -0.3)); head.add(eye);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.65, 3.6, 3, 6), brow);
    b.rotation.z = Math.PI / 2 + s * 0.12; b.position.copy(onFace(s * 6.8, 6.6, 0.1)); head.add(b);
    const ch = new THREE.Mesh(new THREE.CircleGeometry(3.1, 16), blush);
    const p = onFace(s * 10.6, -4.2, 0.25); ch.position.copy(p); ch.lookAt(p.clone().multiplyScalar(2)); head.add(ch);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.55, 6, 14, Math.PI), lip);
  mouth.rotation.z = Math.PI; mouth.position.copy(onFace(0, -6.2, -0.2)); head.add(mouth);
  const n = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), nose);
  n.position.copy(onFace(0, -1.8, 0.2)); head.add(n);
  const g = HAIR[a.id].glasses;
  if (g) {
    const gm = new THREE.MeshStandardMaterial({ color: g, roughness: 0.4 });
    materials.push(gm);
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.55, 6, 18), gm);
      ring.position.copy(onFace(s * 6.8, 1.2, 1.4)); ring.rotation.y = s * 0.3; head.add(ring);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4.6, 6), gm);
    bridge.rotation.z = Math.PI / 2; bridge.position.copy(onFace(0, 2.2, 1.6)); head.add(bridge);
  }
}

function buildCharacter(id: AvatarId): Rig3D {
  const a = avatarOf(id) ?? AVATARS[0];
  const std = (color: THREE.ColorRepresentation, roughness = 0.62) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const skin = std(a.skin, 0.55), skinShade = std(shade(a.skin, 0.9), 0.6), shirt = std(a.shirt, 0.7), sleeve = std(shade(a.shirt, 0.95), 0.7);
  const pants = std(a.pants, 0.75), shoe = std("#3a3236", 0.5), hair = std(a.hair, 0.78);
  hair.side = THREE.DoubleSide;
  const materials: THREE.Material[] = [skin, skinShade, shirt, sleeve, pants, shoe, hair];

  const root = new THREE.Group();
  const tilt = new THREE.Group(); // 카메라가 조금 위에서 보는 것처럼
  root.add(tilt);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  materials.push(shadow.material as THREE.Material);
  // 카메라가 거의 수평으로 보므로 바닥 그림자는 화면을 향한 납작한 타원으로(몸 뒤에 둔다)
  shadow.position.z = -45;
  shadow.renderOrder = -1;
  root.add(shadow);

  const body = new THREE.Group(); // = 엉덩관절 가운데
  tilt.add(body);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(13, 20, 14), pants);
  pelvis.scale.set(1.06, 0.78, 0.8);
  body.add(pelvis);

  const torso = new THREE.Group();
  body.add(torso);
  // 몸통 — 허리에서 어깨까지 둥글게(앞뒤로 조금 납작)
  const profile = [[0, -9], [13.4, -8.5], [14.4, 2], [13.6, 16], [14.6, 30], [15.6, 40], [14.4, 46], [10, 50], [4, 52], [0, 52.4]].map(([x, y]) => new THREE.Vector2(x, y));
  const chest = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), shirt);
  chest.scale.set(1.08, 1, 0.74);
  torso.add(chest);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 6, 12, 14), skinShade);
  neck.position.y = RIG.neckTop - RIG.hip - 6;
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = RIG.headY - RIG.hip;
  torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(RIG.headR, 32, 24), skin);
  skull.scale.set(1, 1.04, 1);
  head.add(skull);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 10), skinShade);
    ear.scale.set(0.55, 1, 0.8); ear.position.set(s * 19, -0.5, 0); head.add(ear);
  }
  buildHair(a, hair, head);
  buildFace(a, head, materials);

  const arm = (side: number) => {
    const sh = new THREE.Group();
    sh.position.set(side * RIG.shoulderHalf, RIG.shoulder - RIG.hip - 3, 0);
    torso.add(sh);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(6.4, 16, 12), sleeve); // 어깨를 둥글게
    sh.add(cap);
    sh.add(capsule(5.7, RIG.upperArm - 8, sleeve, -RIG.upperArm / 2));
    const el = new THREE.Group();
    el.position.y = -RIG.upperArm;
    sh.add(el);
    el.add(capsule(5.1, RIG.foreArm - 9, sleeve, -RIG.foreArm / 2 + 1));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(5.1, 14, 12), skin);
    hand.position.y = -RIG.foreArm - 1; hand.scale.set(0.9, 1.05, 0.8);
    el.add(hand);
    return { sh, el };
  };
  const legB = (side: number) => {
    const hip = new THREE.Group();
    hip.rotation.order = "YXZ";
    hip.position.set(side * RIG.hipHalf, 0, 0);
    body.add(hip);
    hip.add(capsule(7.7, RIG.thigh - 10, pants, -RIG.thigh / 2));
    const knee = new THREE.Group();
    knee.rotation.order = "YXZ";
    knee.position.y = -RIG.thigh;
    hip.add(knee);
    knee.add(capsule(6.7, RIG.shin - 10, pants, -RIG.shin / 2));
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(5, 9, 4, 10), shoe);
    foot.rotation.x = Math.PI / 2; foot.position.set(0, -RIG.shin - 1, 4);
    knee.add(foot);
    return { hip, knee };
  };
  const L = arm(1), R = arm(-1), LL = legB(1), LR = legB(-1);
  return { root, tilt, body, torso, head, shadow, hipL: LL.hip, kneeL: LL.knee, hipR: LR.hip, kneeR: LR.knee, shL: L.sh, elL: L.el, shR: R.sh, elR: R.el, materials };
}

function applyLeg(hip: THREE.Group, knee: THREE.Group, l: LegAngles, side: number) {
  hip.rotation.set(-l.pitch, side * l.out, 0);
  knee.rotation.set(l.knee, side * l.twist, 0);
}
function applyArm(sh: THREE.Group, el: THREE.Group, a: ArmAngles, side: number) {
  sh.rotation.set(-a.pitch, 0, side * a.out);
  el.rotation.set(-a.elbow, 0, 0);
}
function applyAngles(r: Rig3D, a: Angles) {
  r.body.position.set(a.sway, a.hipY + a.bob, 0);
  r.torso.rotation.set(a.lean, 0, 0);
  r.head.rotation.set(a.headPitch, a.headTurn, 0);
  applyLeg(r.hipL, r.kneeL, a.legL, 1);
  applyLeg(r.hipR, r.kneeR, a.legR, -1);
  applyArm(r.shL, r.elL, a.armL, 1);
  applyArm(r.shR, r.elR, a.armR, -1);
}

// ── 장면 ───────────────────────────────────────────────────────────────────
interface Char {
  uid: string; avatar: AvatarId; rig: Rig3D; clip: THREE.Plane;
  pose: Pose3D; from: Angles | null; blendT0: number; blendMs: number; shown: Angles | null;
  yaw: number; phase: number; last: { x: number; y: number } | null; jump: { x: number; y: number }; seen: number;
}

const CAMERA_TILT = 0.16; // 위에서 조금 내려다보는 각(머리·어깨 윗면이 보이게)

export interface Space3DHandle { stop: () => void }

/**
 * box 안의 [data-space-actor] 상자들을 따라 canvas 에 3D 캐릭터를 그린다.
 * onFail — WebGL 을 못 쓰면 한 번 부른다(2D 로 돌아가게).
 */
export function startSpace3D(canvas: HTMLCanvasElement, box: HTMLElement, room: SpaceId, onFail: () => void): Space3DHandle {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch {
    onFail();
    return { stop: () => {} };
  }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const L = LIGHTS[room];
  scene.add(new THREE.HemisphereLight(shade(L.sky, L.tint), shade(L.ground, L.tint), L.hemi));
  const key = new THREE.DirectionalLight(shade(L.key, L.tint), L.keyI);
  key.position.set(...L.keyDir);
  scene.add(key);
  const rim = new THREE.DirectionalLight(shade(L.rim, L.tint), L.rimI);
  rim.position.set(...L.rimDir);
  scene.add(rim);

  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  camera.position.set(0, 0, 2000);
  let W = 0, H = 0;
  const resize = () => {
    const w = box.clientWidth, h = box.clientHeight;
    if (w === W && h === H) return;
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h;
    camera.updateProjectionMatrix();
  };
  resize();

  const chars = new Map<string, Char>();
  const make = (uid: string, avatar: AvatarId): Char => {
    const rig = buildCharacter(avatar);
    const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6);
    for (const m of rig.materials) m.clippingPlanes = [clip];
    scene.add(rig.root);
    return { uid, avatar, rig, clip, pose: "stand", from: null, blendT0: 0, blendMs: 0, shown: null, yaw: 0, phase: 0, last: null, jump: { x: 0, y: 0 }, seen: 0 };
  };
  const dispose = (c: Char) => {
    scene.remove(c.rig.root);
    c.rig.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    for (const m of c.rig.materials) m.dispose();
  };

  let raf = 0, lastT = performance.now(), lastDraw = 0, stopped = false, frame = 0;
  const tick = (now: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    if (document.hidden) return;
    resize();
    frame++;
    const b = box.getBoundingClientRect();
    const els = box.querySelectorAll<HTMLElement>("[data-space-actor]");
    let busy = false;
    const order: { c: Char; y: number; clipY: number | null }[] = [];
    for (const el of els) {
      const uid = el.dataset.uid, avatar = el.dataset.avatar as AvatarId | undefined;
      if (!uid || !avatar) continue;
      let c = chars.get(uid);
      if (c && c.avatar !== avatar) { dispose(c); chars.delete(uid); c = undefined; }
      if (!c) { c = make(uid, avatar); chars.set(uid, c); }
      c.seen = frame;
      const r = el.getBoundingClientRect();
      const u = r.width / 100; // px / u
      if (!(u > 0)) continue;
      const x = r.left - b.left + r.width / 2, y = r.bottom - b.top;
      const pose = (el.dataset.pose as Pose3D) || "stand";
      const face = el.dataset.face || "front", flip = el.dataset.flip === "1";
      const cut = Number(el.dataset.cut) || 0;
      // 자세가 바뀌면 지금 모습에서 새 자세로 이어간다(자리점이 뛰면 그만큼도 부드럽게)
      if (pose !== c.pose) {
        if (c.shown) { c.from = c.shown; c.blendT0 = now; c.blendMs = blendMs(c.pose, pose); }
        if (c.last) c.jump = { x: c.last.x - x, y: c.last.y - y };
        c.pose = pose;
      }
      // 걸음 — 움직인 거리만큼
      if (c.last && pose === "walk") {
        const d = Math.hypot(x - c.last.x, y - c.last.y) / u;
        if (d < 200) c.phase = (c.phase + d / STRIDE_U) % 1;
      }
      const moved = !c.last || Math.abs(x - c.last.x) + Math.abs(y - c.last.y) > 0.05;
      c.last = { x, y };
      const seatedSide = (pose === "sit" || pose === "pew") && face === "side";
      const ty = targetYaw(face, flip, seatedSide);
      c.yaw = turnToward(c.yaw === 0 && !c.shown ? ty : c.yaw, ty, 7 * dt);
      // 관절
      const target = poseAngles(pose, c.phase, (now / 4500) % 1);
      let shown = target, blending = false;
      let jx = 0, jy = 0;
      if (c.from && c.blendMs > 0) {
        const t = (now - c.blendT0) / c.blendMs;
        if (t < 1) {
          const e = easeInOut(t);
          shown = mixAngles(c.from, target, e);
          jx = c.jump.x * (1 - e); jy = c.jump.y * (1 - e);
          blending = true;
        } else { c.from = null; c.jump = { x: 0, y: 0 }; }
      }
      c.shown = shown;
      applyAngles(c.rig, shown);
      const rig = c.rig;
      rig.root.position.set(x + jx, -(y + jy), 0);
      rig.root.scale.setScalar(u);
      rig.root.rotation.set(0, 0, 0);
      rig.tilt.rotation.set(CAMERA_TILT, c.yaw, 0, "XYZ");
      // 발밑 그림자 — 바닥에 앉거나 서 있을 때만(장의자·줄 안은 등받이에 가림)
      rig.shadow.visible = pose !== "pew" && cut === 0;
      rig.shadow.position.y = pose === "sit" ? 4 : 0.5;
      rig.shadow.scale.set(pose === "sit" ? 92 : 52, pose === "sit" ? 18 : 11, 1);
      // 자르는 선(화면 y → 세계 y = -y)
      // 평면 n=(0,1,0): y_world + constant ≥ 0 인 곳만 그린다 → y_world ≥ -clipScreenY(선 위쪽)
      const clipScreenY = pose === "pew" ? y : cut > 0 ? r.top - b.top + r.height * (1 - cut) : null;
      c.clip.constant = clipScreenY === null ? 1e6 : clipScreenY;
      if (pose === "walk" || blending || moved || Math.abs(ty - c.yaw) > 0.01) busy = true;
      order.push({ c, y, clipY: clipScreenY });
    }
    for (const [uid, c] of chars) if (c.seen !== frame) { dispose(c); chars.delete(uid); }
    // 다 앉아 쉬는 동안은 숨만 — 초당 15번이면 충분하다
    if (!busy && now - lastDraw < 66) return;
    lastDraw = now;
    renderer.clear(true, true, true);
    order.sort((p, q) => p.y - q.y); // 뒤(위)부터 — 앞사람이 뒷사람을 가린다
    for (const o of order) {
      for (const { c } of order) c.rig.root.visible = c === o.c;
      renderer.clearDepth();
      renderer.render(scene, camera);
    }
  };
  raf = requestAnimationFrame(tick);
  // 첫 그림이 안 나오면(문맥을 잃음) 2D 로
  const lost = (e: Event) => { e.preventDefault(); onFail(); };
  canvas.addEventListener("webglcontextlost", lost);
  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", lost);
      for (const c of chars.values()) dispose(c);
      chars.clear();
      renderer.dispose();
    },
  };
}
