import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AVATARS } from "./space-avatars";
import { blendMs, easeInOut, HAIR, headTop, mixAngles, PEW_HIP, poseAngles, RIG, SIT_HIP, STRIDE_U, targetYaw, turnToward, walkAngles } from "./space-3d-rig";
import { space3dWanted } from "./space-3d";

describe("3D 캐릭터 크기 — 2D 의 실사 크기 약속 그대로(2026-11-21)", () => {
  it("책상다리: 머리 꼭대기가 자리점 위 105u(엉덩이 밑 6u + 앉은 키 99u)", () => {
    expect(headTop(poseAngles("sit"))).toBeCloseTo(105, 0);
    expect(SIT_HIP).toBeGreaterThan(6); // 엉덩관절은 방석 위
  });
  it("장의자: 등받이 윗선(자리점) 위로 83u — 그 아래는 잘린다", () => {
    expect(headTop(poseAngles("pew"))).toBeCloseTo(83, 0);
    expect(PEW_HIP).toBeLessThan(0); // 엉덩이는 등받이 선 아래(가려짐)
  });
  it("서면 사람 비율 — 앉은 키의 1.6배 이상(2D 는 1.25배라 걸을 때 아이처럼 작았다)", () => {
    const stand = headTop(poseAngles("stand"));
    expect(stand).toBeGreaterThan(165);
    expect(stand).toBeLessThanOrEqual(RIG.height + 1);
    expect(stand / (headTop(poseAngles("sit")) - 6)).toBeGreaterThan(1.6);
    expect(RIG.height / (2 * RIG.headR)).toBeGreaterThan(4); // 머리 4개 넘게
  });
  it("숨 쉬어도 크게 흔들리지 않는다(1u 안)", () => {
    for (const p of ["sit", "pew", "stand"] as const) {
      const a = headTop(poseAngles(p, 0, 0)), b = headTop(poseAngles(p, 0, 0.25));
      expect(Math.abs(a - b)).toBeLessThan(1);
    }
  });
});

describe("걷기 — 발이 미끄러지지 않게", () => {
  it("한 주기 안에 두 다리가 번갈아 앞으로 · 팔은 반대 다리와", () => {
    const a0 = walkAngles(0), a5 = walkAngles(0.5);
    expect(a0.legL.pitch).toBeGreaterThan(0.3); // 왼발 앞
    expect(a0.legR.pitch).toBeLessThan(-0.3);
    expect(a5.legR.pitch).toBeGreaterThan(0.3); // 반 주기 뒤엔 오른발 앞
    expect(Math.sign(a0.armL.pitch)).toBe(-Math.sign(a0.legL.pitch)); // 왼팔은 뒤로
  });
  it("발을 들어 내딛는 동안 무릎이 접힌다 · 디딜 땐 거의 편다", () => {
    let maxKnee = 0;
    for (let i = 0; i < 40; i++) maxKnee = Math.max(maxKnee, walkAngles(i / 40).legL.knee);
    expect(maxKnee).toBeGreaterThan(0.7);
    expect(walkAngles(0).legL.knee).toBeLessThan(0.3);
  });
  it("두 걸음 보폭은 키의 0.6~0.9배(사람이 편히 걷는 정도)", () => {
    expect(STRIDE_U / RIG.height).toBeGreaterThan(0.6);
    expect(STRIDE_U / RIG.height).toBeLessThan(0.9);
  });
});

describe("앉고 일어서기 · 돌기 — 부드럽게 이어진다", () => {
  it("앉기 650ms · 일어서기 520ms(2D 의 멈춤 시간 안) · 섞으면 사이 값", () => {
    expect(blendMs("walk", "pew")).toBe(650);
    expect(blendMs("sit", "stand")).toBe(520);
    expect(blendMs("stand", "walk")).toBeLessThan(300);
    const m = mixAngles(poseAngles("stand"), poseAngles("sit"), 0.5);
    expect(m.hipY).toBeLessThan(RIG.hip);
    expect(m.hipY).toBeGreaterThan(SIT_HIP);
    expect(easeInOut(0)).toBe(0); expect(easeInOut(1)).toBe(1); expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });
  it("바라보는 쪽 — 앞 0 · 뒤 π · 옆 ±π/2(마주 보고 앉으면 화면 쪽으로 조금 돌림)", () => {
    expect(targetYaw("front", false)).toBe(0);
    expect(targetYaw("back", false)).toBe(Math.PI);
    expect(targetYaw("side", false)).toBeCloseTo(Math.PI / 2);
    expect(targetYaw("side", true)).toBeCloseTo(-Math.PI / 2);
    const seated = targetYaw("side", false, true);
    expect(seated).toBeLessThan(Math.PI / 2);
    expect(seated).toBeGreaterThan(Math.PI / 4);
  });
  it("가까운 쪽으로 돈다(뒤 → 왼쪽 옆은 반 바퀴 넘게 돌지 않는다)", () => {
    expect(turnToward(Math.PI, -Math.PI / 2, 10)).toBeCloseTo(1.5 * Math.PI); // = -π/2 와 같은 방향
    expect(turnToward(0, 1, 0.1)).toBeCloseTo(0.1);
  });
});

describe("캐릭터 8명 모두 머리 모양이 있다(2D 와 같은 사람)", () => {
  it("긴 머리 하늘 · 올림머리 솔 · 곱슬 별 · 안경 노을·이슬", () => {
    for (const a of AVATARS) expect(HAIR[a.id], a.id).toBeTruthy();
    expect(HAIR.haneul.style).toBe("long");
    expect(HAIR.sol.style).toBe("bun");
    expect(HAIR.byeol.style).toBe("curly");
    expect(HAIR.noeul.glasses).toBeTruthy();
    expect(HAIR.iseul.glasses).toBeTruthy();
  });
});

describe("3D 를 켜는 곳 — 시안은 미리보기에서만(2026-11-21)", () => {
  const env = (hostname: string, search = "", webgl = true, cores = 8) => ({ hostname, search, webgl, cores });
  it("운영 주소는 2D 그대로 · 미리보기·내 컴퓨터는 3D", () => {
    expect(space3dWanted(env("wellness-care-zeta.vercel.app"))).toBe(false);
    expect(space3dWanted(env("wellness-care-git-space-together-kjs7392a-2011s-projects.vercel.app"))).toBe(true);
    expect(space3dWanted(env("localhost"))).toBe(true);
  });
  it("?3d=1 이면 운영에서도 켜고 ?3d=0 이면 끈다 · WebGL 없거나 낮은 사양이면 2D", () => {
    expect(space3dWanted(env("wellness-care-zeta.vercel.app", "?3d=1"))).toBe(true);
    expect(space3dWanted(env("localhost", "?3d=0"))).toBe(false);
    expect(space3dWanted(env("localhost", "?3d=1", false))).toBe(false);
    expect(space3dWanted(env("localhost", "", true, 2))).toBe(false);
  });
});

describe("🚫 three.js 는 3D 를 켤 때만 따로 불러온다(첫 화면 무게 그대로)", () => {
  const dir = join(__dirname);
  const read = (f: string) => readFileSync(join(dir, f), "utf8");
  it("three 를 바로 부르는 곳은 space-3d-render.ts 하나 · 3D 층은 import() 로", () => {
    expect(read("space-3d-render.ts")).toMatch(/import \* as THREE from "three"/);
    for (const f of ["SpaceTogether.tsx", "Space3DLayer.tsx", "space-3d.ts", "space-3d-rig.ts", "SpaceSheet.tsx"]) {
      expect(read(f), f).not.toMatch(/from "three"/);
      expect(read(f), f).not.toMatch(/from "\.\/space-3d-render"/);
    }
    expect(read("Space3DLayer.tsx")).toMatch(/import\("\.\/space-3d-render"\)/);
  });
  it("3D 가 안 되면 2D 로 돌아간다 · 사람 상자에 3D 가 읽을 값이 있다 · 3D 일 땐 2D 그림을 숨긴다", () => {
    const ui = read("SpaceTogether.tsx");
    expect(ui).toMatch(/\{three && <Space3DLayer boxRef=\{boxRef\} room=\{room\} onFail=\{\(\) => setThree\(false\)\} \/>\}/);
    expect(ui).toMatch(/data-uid=\{a\.uid\} data-avatar=\{a\.avatar\} data-pose=\{pose\} data-face=\{heading\.face\} data-flip=\{heading\.flip \? "1" : "0"\} data-cut=\{cut\}/);
    expect(ui).toMatch(/visibility: three \? "hidden" : undefined/);
    expect(read("space-3d-render.ts")).toMatch(/webglcontextlost/);
  });
});
