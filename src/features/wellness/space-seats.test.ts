import { describe, expect, it } from "vitest";
import { bubbleText, figureHeight, resolveSeats, ROOM_LAYOUT, toScreen, walkMs } from "./space-seats";
import { SPACE_ROOMS } from "./space";

describe("공간마다 자리", () => {
  it("네 공간 모두 자리 6~8개 · 문 하나", () => {
    for (const r of SPACE_ROOMS) {
      const L = ROOM_LAYOUT[r.id];
      expect(L.seats.length, r.id).toBeGreaterThanOrEqual(6);
      expect(L.seats.length, r.id).toBeLessThanOrEqual(8);
      expect(L.door).toBeTruthy();
    }
  });
  it("자리는 영상 안 · 겹치지 않음 · 멀수록(위일수록) 작게", () => {
    for (const r of SPACE_ROOMS) {
      const seats = ROOM_LAYOUT[r.id].seats;
      for (const s of seats) {
        expect(s.x).toBeGreaterThan(0.05); expect(s.x).toBeLessThan(0.95);
        expect(s.y).toBeGreaterThan(0.5); expect(s.y).toBeLessThan(0.9);
      }
      for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
        expect(Math.hypot(seats[i].x - seats[j].x, (seats[i].y - seats[j].y) * 1.8), `${r.id} ${i}-${j}`).toBeGreaterThan(0.08);
        if (seats[i].y < seats[j].y - 0.02) expect(seats[i].s).toBeLessThanOrEqual(seats[j].s);
      }
    }
  });
  it("🚫 명상룸 자리는 자막 상자(y .773~)를 가리지 않는다 · 영상 속 인물(x .7~.82, y .45~.58) 자리도 비운다", () => {
    for (const s of ROOM_LAYOUT.meditation.seats) {
      expect(s.y).toBeLessThan(0.773 - 0.03);
      expect(!(s.x > 0.68 && s.x < 0.84 && s.y < 0.6)).toBe(true);
    }
  });
});

describe("resolveSeats — 모두가 같은 답", () => {
  it("먼저 온 사람이 원하는 자리 · 겹치면 나중 사람은 빈 첫 자리", () => {
    const m = resolveSeats([{ uid: "b", seat: 2, since: 20 }, { uid: "a", seat: 2, since: 10 }, { uid: "c", seat: null, since: 30 }], 4);
    expect(m.get("a")).toBe(2);
    expect(m.get("b")).toBe(0);
    expect(m.get("c")).toBe(1);
  });
  it("넣는 순서가 달라도 같은 결과", () => {
    const ppl = [{ uid: "x", seat: 1, since: 5 }, { uid: "y", seat: 1, since: 5 }, { uid: "z", seat: 9, since: 1 }];
    const m1 = resolveSeats(ppl, 3), m2 = resolveSeats([...ppl].reverse(), 3);
    expect([...m1.entries()].sort()).toEqual([...m2.entries()].sort());
    expect(m1.get("z")).toBe(0); // 9 는 없는 자리 → 첫 빈자리
  });
  it("자리가 다 차면 null(장면엔 없고 목록에만)", () => {
    const m = resolveSeats([{ uid: "a", seat: 0, since: 1 }, { uid: "b", seat: 0, since: 2 }], 1);
    expect(m.get("a")).toBe(0);
    expect(m.get("b")).toBeNull();
  });
});

describe("화면 계산", () => {
  const rect = { left: -40, top: 0, width: 460, height: 820 };
  it("영상 비율 → 화면 px", () => {
    expect(toScreen(rect, { x: 0.5, y: 0.5 })).toEqual({ x: 190, y: 410 });
  });
  it("멀수록 작게 · 걸음 시간은 0.9~3.2초", () => {
    expect(figureHeight(rect, 0.8)).toBeLessThan(figureHeight(rect, 1.1));
    expect(walkMs({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(900);
    expect(walkMs({ x: 0, y: 0 }, { x: 2000, y: 0 })).toBe(3200);
    expect(walkMs({ x: 0, y: 0 }, { x: 160, y: 0 })).toBe(2000);
  });
  it("말풍선은 짧게", () => {
    expect(bubbleText("안녕하세요")).toBe("안녕하세요");
    expect([...bubbleText("가".repeat(40))].length).toBe(27);
  });
});

describe("장면 속 캐릭터 그림(figureSrc)", () => {
  it("8명 모두 앉은/걷는 모습이 있고, 걷는 모습만 팔다리가 흔들린다", async () => {
    const { AVATARS, figureSvg, figureSrc, FIGURE_VIEW } = await import("./space-avatars");
    for (const a of AVATARS) {
      const sit = figureSvg(a.id, "sit"), walk = figureSvg(a.id, "walk");
      expect(sit).toContain(`viewBox="0 0 ${FIGURE_VIEW.sit.w} ${FIGURE_VIEW.sit.h}"`);
      expect(walk).toContain(`viewBox="0 0 ${FIGURE_VIEW.walk.w} ${FIGURE_VIEW.walk.h}"`);
      expect(walk).toMatch(/@keyframes/);
      expect(walk).toMatch(/prefers-reduced-motion/);
      expect(sit).not.toMatch(/@keyframes/);
      expect(figureSrc(a.id, "walk").startsWith("data:image/svg+xml")).toBe(true);
    }
  });
});

describe("말풍선 가장자리 밀기(bubbleShift)", () => {
  it("가운데면 그대로, 오른쪽 끝이면 왼쪽으로, 왼쪽 끝이면 오른쪽으로", async () => {
    const { bubbleShift } = await import("./space-seats");
    expect(bubbleShift(200, "안녕하세요", 400)).toBe(0);
    expect(bubbleShift(390, "같이 명상해요 🙂", 400)).toBeLessThan(0);
    expect(bubbleShift(10, "같이 명상해요 🙂", 400)).toBeGreaterThan(0);
    expect(bubbleShift(390, "안녕", 0)).toBe(0); // 폭을 아직 모르면 안 민다
    const t = "가".repeat(30), sh = bubbleShift(395, t, 400);
    expect(395 + sh + 75).toBeLessThanOrEqual(394); // 최대 폭 150 — 오른쪽 6px 안쪽
  });
});

describe("바라보는 쪽(2026-11-20 — 불당·교회·성당은 앞, 명상룸은 마주 보기)", () => {
  it("불당·교회·성당은 앉으면 뒷모습(앞을 봄), 명상룸은 가운데를 향한 옆모습", async () => {
    const { seatHeading } = await import("./space-seats");
    for (const room of ["temple", "church", "cathedral"] as const) {
      expect(ROOM_LAYOUT[room].face).toBe("forward");
      ROOM_LAYOUT[room].seats.forEach((_, i) => expect(seatHeading(ROOM_LAYOUT[room], i)).toEqual({ face: "back", flip: false }));
    }
    const m = ROOM_LAYOUT.meditation;
    expect(m.face).toBe("center");
    m.seats.forEach((seat, i) => expect(seatHeading(m, i)).toEqual({ face: "side", flip: seat.x > 0.5 }));
    // 왼쪽 자리와 오른쪽 자리가 서로 마주 본다
    expect(m.seats.some((s) => s.x < 0.5) && m.seats.some((s) => s.x > 0.5)).toBe(true);
  });
  it("걸을 땐 가는 쪽 — 옆으로는 옆모습(왼쪽이면 뒤집기), 안쪽으로는 뒷모습, 화면 쪽으로는 앞모습", async () => {
    const { walkHeading } = await import("./space-seats");
    expect(walkHeading({ x: 0, y: 100 }, { x: 200, y: 90 })).toEqual({ face: "side", flip: false });
    expect(walkHeading({ x: 200, y: 100 }, { x: 0, y: 110 })).toEqual({ face: "side", flip: true });
    expect(walkHeading({ x: 100, y: 400 }, { x: 90, y: 200 })).toEqual({ face: "back", flip: false }); // 문(아래) → 자리: 들어간다
    expect(walkHeading({ x: 90, y: 200 }, { x: 100, y: 400 })).toEqual({ face: "front", flip: false }); // 자리 → 문: 나온다
  });
  it("그림 — 앞모습은 눈 둘, 옆모습은 눈 하나, 뒷모습은 얼굴 없음(8명 × 앉음·걸음)", async () => {
    const { AVATARS, figureSvg } = await import("./space-avatars");
    const eyes = (svg: string) => (svg.match(/fill="#3a3340"/g) ?? []).length;
    for (const a of AVATARS) for (const pose of ["sit", "walk"] as const) {
      expect(eyes(figureSvg(a.id, pose, "front"))).toBe(2);
      expect(eyes(figureSvg(a.id, pose, "side"))).toBe(1);
      expect(eyes(figureSvg(a.id, pose, "back"))).toBe(0);
      expect(figureSvg(a.id, pose, "back")).not.toMatch(/#b5655a/); // 입도 없다
      expect(/@keyframes/.test(figureSvg(a.id, pose, "side"))).toBe(pose === "walk");
    }
  });
});

describe("앉는 곳(2026-11-20 — 교회·성당은 장의자)", () => {
  it("명상룸·불당은 바닥(책상다리), 교회·성당은 장의자", () => {
    expect(ROOM_LAYOUT.meditation.sitOn).toBe("floor");
    expect(ROOM_LAYOUT.temple.sitOn).toBe("floor");
    expect(ROOM_LAYOUT.church.sitOn).toBe("pew");
    expect(ROOM_LAYOUT.cathedral.sitOn).toBe("pew");
  });
  it("장의자 그림은 다리(바지) 없이 윗몸만 · 앞/옆/뒤 눈 2/1/0", async () => {
    const { AVATARS, figureSvg, FIGURE_VIEW } = await import("./space-avatars");
    const eyes = (svg: string) => (svg.match(/fill="#3a3340"/g) ?? []).length;
    expect(FIGURE_VIEW.pew).toEqual(FIGURE_VIEW.sit);
    for (const a of AVATARS) {
      for (const f of ["front", "side", "back"] as const) expect(figureSvg(a.id, "pew", f)).not.toContain(`fill="${a.pants}"`);
      expect(eyes(figureSvg(a.id, "pew", "front"))).toBe(2);
      expect(eyes(figureSvg(a.id, "pew", "side"))).toBe(1);
      expect(eyes(figureSvg(a.id, "pew", "back"))).toBe(0);
      expect(figureSvg(a.id, "sit", "back")).toContain(`fill="${a.pants}"`); // 바닥(불당)은 그대로 책상다리
    }
  });
});
