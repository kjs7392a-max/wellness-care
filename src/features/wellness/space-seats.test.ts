import { describe, expect, it } from "vitest";
import { bubbleText, CHAR_SCALE, figureHeight, PEW_SINK, resolveSeats, ROOM_LAYOUT, routeIn, routeMove, routeOut, SCENE_PERSON, SEATED_VISIBLE, toScreen, walkMs } from "./space-seats";
import { SPACE_ROOMS } from "./space";

describe("공간마다 자리", () => {
  it("네 공간 모두 자리 6~8개(성당은 장의자 안쪽만 5개) · 문 하나", () => {
    for (const r of SPACE_ROOMS) {
      const L = ROOM_LAYOUT[r.id];
      expect(L.seats.length, r.id).toBeGreaterThanOrEqual(r.id === "cathedral" ? 5 : 6);
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
  it("실사 크기(2026-11-21) — 영상 속 앉은 사람보다 가까운 자리는 그보다 크게, 먼 자리는 작게 · 지나치게 크지 않게", () => {
    for (const r of SPACE_ROOMS) {
      const L = ROOM_LAYOUT[r.id], ref = SCENE_PERSON[r.id], frac = SEATED_VISIBLE[L.sitOn];
      for (const [i, s] of L.seats.entries()) {
        const h = s.s * frac; // 보이는 앉은 키(영상 높이 비율)
        if (s.y > ref.y + 0.005) expect(h, `${r.id} ${i} 가까운 자리`).toBeGreaterThanOrEqual(ref.h * 0.95);
        if (s.y < ref.y - 0.005) expect(h, `${r.id} ${i} 먼 자리`).toBeLessThanOrEqual(ref.h * 1.05);
        expect(h, `${r.id} ${i}`).toBeLessThan(ref.h * 2.6);
      }
      // 입구(화면 밖)에서 걸어 들어올 때도 자리보다 작지 않게 — 가까이 올수록 커 보인다
      expect(L.door.s, r.id).toBeGreaterThanOrEqual(Math.max(...L.seats.map((s) => s.s)) * 0.85);
    }
  });
  it("화면에선 실사 크기보다 조금 작게(0.8~0.95배 · 2026-11-21 사용자)", () => {
    expect(CHAR_SCALE).toBeGreaterThanOrEqual(0.8);
    expect(CHAR_SCALE).toBeLessThan(0.95);
  });
  it("명상룸·불당 — 책상다리 다리 폭이 방석·좌복 폭과 비슷하다(실측 폭 ±20% · 명상룸 옆모습 54/126 · 불당 뒷모습 74/126)", () => {
    const vw = (s: number, legs: number) => (s * legs / 126) * (16 / 9); // 상자 높이 → 다리 폭(영상 폭 비율, 9:16 영상)
    const near = (got: number, want: number) => { expect(got / want).toBeGreaterThan(0.8); expect(got / want).toBeLessThan(1.2); };
    near(vw(ROOM_LAYOUT.meditation.seats[0].s, 54), 0.225); // 왼쪽 가운데 방석 폭 .225
    near(vw(ROOM_LAYOUT.meditation.seats[5].s, 54), 0.222); // 오른쪽 가운데 .222
    near(vw(ROOM_LAYOUT.temple.seats[0].s, 74), 0.2); // 앞줄 좌복 .20
    near(vw(ROOM_LAYOUT.temple.seats[4].s, 74), 0.145); // 둘째 줄 .145
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
  it("멀수록 작게 · 걸음 시간은 캐릭터 키에 맞춘다(키 0.58배/초 — 천천히)", () => {
    expect(figureHeight(rect, 0.8)).toBeLessThan(figureHeight(rect, 1.1));
    expect(figureHeight(rect, 0.2)).toBe(139); // s = 영상 높이에 대한 비율(실사) × 0.85(사용자 "조금 작게")
    expect(walkMs({ x: 0, y: 0 }, { x: 58, y: 0 }, 100)).toBe(1000);
    expect(walkMs({ x: 0, y: 0 }, { x: 58, y: 0 }, 50)).toBe(2000); // 멀리 있는(작은) 사람은 화면에서 천천히
    expect(walkMs({ x: 0, y: 0 }, { x: 0.2, y: 0 }, 100)).toBe(0);
    expect(walkMs({ x: 0, y: 0 }, { x: 5, y: 0 }, 100)).toBe(300);
    expect(walkMs({ x: 0, y: 0 }, { x: 99999, y: 0 }, 100)).toBe(24000);
  });
  it("말풍선은 짧게", () => {
    expect(bubbleText("안녕하세요")).toBe("안녕하세요");
    expect([...bubbleText("가".repeat(70))].length).toBe(61);
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
    expect(395 + sh + 90).toBeLessThanOrEqual(394); // 최대 폭 180 — 오른쪽 6px 안쪽
  });
});

describe("머리 위 말풍선 대화(2026-11-22 — 창을 안 열고 바로)", () => {
  it("60자까지 보이고 길수록 오래(4.5~12초) · 길면 줄바꿈해 키가 커진다", async () => {
    const { bubbleText, bubbleMs, bubbleBox, BUBBLE_MAX_W } = await import("./space-seats");
    expect(bubbleText("가".repeat(60))).toBe("가".repeat(60));
    expect([...bubbleText("가".repeat(80))].length).toBe(61);
    expect(bubbleMs("안녕")).toBe(4500);
    expect(bubbleMs("가".repeat(40))).toBe(9500);
    expect(bubbleMs("가".repeat(120))).toBe(12000);
    expect(bubbleBox("안녕").w).toBeLessThan(60);
    expect(bubbleBox("가".repeat(60)).w).toBe(BUBBLE_MAX_W);
    expect(bubbleBox("가".repeat(60)).h).toBeGreaterThan(bubbleBox("가".repeat(10)).h);
  });
  it("옆자리 말풍선이 겹치면 나중 것을 위로 · 멀리 떨어져 있으면 그대로", async () => {
    const { stackBubbles } = await import("./space-seats");
    const lifts = stackBubbles([
      { key: "a", x: 100, y: 300, w: 120, h: 28 },
      { key: "b", x: 150, y: 302, w: 120, h: 28 }, // a 와 겹침 → 위로
      { key: "c", x: 330, y: 300, w: 80, h: 28 }, // 떨어져 있음
      { key: "d", x: 120, y: 300, w: 100, h: 28 }, // a·b 둘 다와 겹침 → 더 위로
    ]);
    expect(lifts.a).toBe(0);
    expect(lifts.b).toBeGreaterThanOrEqual(30);
    expect(lifts.c).toBe(0);
    expect(lifts.d).toBeGreaterThan(lifts.b);
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
      expect(/@keyframes/.test(figureSvg(a.id, pose, "back"))).toBe(pose === "walk");
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
    expect(FIGURE_VIEW.pew.w).toBe(FIGURE_VIEW.sit.w);
    expect(FIGURE_VIEW.pew.h).toBeLessThan(FIGURE_VIEW.sit.h); // 가슴께에서 잘린 윗몸
    for (const a of AVATARS) {
      for (const f of ["front", "side", "back"] as const) expect(figureSvg(a.id, "pew", f)).not.toContain(`fill="${a.pants}"`);
      expect(eyes(figureSvg(a.id, "pew", "front"))).toBe(2);
      expect(eyes(figureSvg(a.id, "pew", "side"))).toBe(1);
      expect(eyes(figureSvg(a.id, "pew", "back"))).toBe(0);
      expect(figureSvg(a.id, "sit", "back")).toContain(`fill="${a.pants}"`); // 바닥(불당)은 그대로 책상다리
    }
  });
});

describe("교회·성당 자리 — 통로·영상 속 사람·화면 가장자리를 피한다(2026-11-20 재실측)", () => {
  it("가운데 통로엔 자리가 없다", () => {
    for (const s of ROOM_LAYOUT.church.seats) expect(s.x < 0.47 || s.x > 0.74).toBe(true);
    for (const s of ROOM_LAYOUT.cathedral.seats) expect(s.x < 0.33 || s.x > 0.58).toBe(true);
  });
  it("성당 오른쪽 기도하는 사람 자리(x .74~.9 · y .55~.68)는 비운다 · 모든 자리는 화면 안쪽(x .12~.88)", () => {
    for (const s of ROOM_LAYOUT.cathedral.seats) expect(s.x > 0.72 && s.y > 0.55 && s.y < 0.7).toBe(false);
    for (const room of ["church", "cathedral"] as const) for (const s of ROOM_LAYOUT[room].seats) {
      expect(s.x).toBeGreaterThanOrEqual(0.15); // 좁은 화면에선 영상 양옆이 잘린다
      expect(s.x).toBeLessThanOrEqual(0.88);
    }
  });
});

describe("걷는 길(2026-11-20 — 장의자를 가로지르지 않는다)", () => {
  it("교회·성당: 통로로 올라가 줄 끝에서 옆으로 들어간다 · 줄 안에선 아랫몸이 가린다", () => {
    for (const room of ["church", "cathedral"] as const) {
      const L = ROOM_LAYOUT[room];
      expect(L.aisle).toBeTruthy();
      L.seats.forEach((seat, i) => {
        const w = routeIn(L, i);
        expect(w).toHaveLength(3);
        expect(w[0].to.x).toBe(L.aisle!.x); // 통로
        expect(w[0].clip).toBe(false);
        expect(w[1].to.x).toBe(seat.x < L.aisle!.x ? L.aisle!.left : L.aisle!.right); // 줄 끝
        expect(w[1].clip).toBe(false);
        expect(w[2].to.x).toBe(seat.x); // 자리
        expect(w[2].clip).toBe(true);
        for (const p of w) { expect(p.to.y).toBe(seat.y); expect(p.to.sink).toBe(PEW_SINK); }
      });
    }
  });
  it("명상룸·불당은 바닥이라 곧장 · 앉는 점은 자리 그대로", () => {
    for (const room of ["meditation", "temple"] as const) {
      const L = ROOM_LAYOUT[room];
      L.seats.forEach((seat, i) => expect(routeIn(L, i)).toEqual([{ to: { ...seat }, clip: false }]));
    }
  });
  it("나갈 땐 들어온 길을 거꾸로 · 마지막은 화면 밖 입구", () => {
    const L = ROOM_LAYOUT.church;
    const out = routeOut(L, 0);
    expect(out.stand).toEqual(routeIn(L, 0)[2]);
    expect(out.ways.map((w) => [w.to.x, w.clip])).toEqual([[L.aisle!.left, true], [L.aisle!.x, false], [L.door.x, false]]);
    expect(out.ways[2].to.door).toBe(true);
    const m = ROOM_LAYOUT.meditation, mo = routeOut(m, 1);
    expect(mo.stand.to).toEqual({ ...m.seats[1] });
    expect(mo.ways).toEqual([{ to: { ...m.door, door: true }, clip: false }]);
  });
  it("자리를 바꿀 땐 입구까지 안 가고 통로를 거쳐 새 자리로", () => {
    const L = ROOM_LAYOUT.church;
    const mv = routeMove(L, 0, 2);
    expect(mv.ways.some((w) => w.to.door)).toBe(false);
    expect(mv.ways[mv.ways.length - 1].to.x).toBe(L.seats[2].x);
  });
});

describe("걷는 그림(2026-11-20 — 스르르가 아니라 걸음)", () => {
  it("옆모습은 허벅지·정강이를 따로(무릎이 접힘) · 팔은 반대 박자 · 몸이 오르내림", async () => {
    const { figureSvg, WALK_CYCLE_S } = await import("./space-avatars");
    const side = figureSvg("bada", "walk", "side");
    for (const k of ["@keyframes th", "@keyframes kn", "@keyframes ar", "@keyframes bob", 'class="tn"', 'class="sn"', 'class="tf"', 'class="sf"', 'class="an"', 'class="af"', 'class="w"']) expect(side).toContain(k);
    expect(side).toContain(`animation-delay:-${WALK_CYCLE_S / 2}s`); // 반대쪽은 반 박자 늦게
    expect(side).toMatch(/64%\{transform:rotate\(55deg\)\}/); // 차올릴 때 무릎을 접는다
    expect(WALK_CYCLE_S).toBeGreaterThanOrEqual(0.85); // 천천히(예전 0.52초는 종종걸음)
  });
  it("앞·뒷모습은 다리 길이로 내딛기/들기 · 몸이 디딘 발 쪽으로 실림 · 앞과 뒤는 원근이 반대", async () => {
    const { figureSvg } = await import("./space-avatars");
    const front = figureSvg("sol", "walk", "front"), back = figureSvg("sol", "walk", "back");
    for (const svg of [front, back]) for (const k of ["@keyframes lg", "@keyframes sw", "@keyframes bob", 'class="ll"', 'class="lr"', 'class="al"', 'class="ar"', 'class="sw"']) expect(svg).toContain(k);
    expect(front).toMatch(/@keyframes lg\{0%\{transform:scaleY\(1\.04\)\}/); // 다가올 땐 내딛는 발이 가까워 길다
    expect(back).toMatch(/@keyframes lg\{0%\{transform:scaleY\(\.95\)\}/); // 멀어질 땐 내딛는 발이 멀어 짧다
    expect(front).toMatch(/prefers-reduced-motion/);
  });
  it("화면 이동 빠르기 = 그림 속 걸음 폭 ÷ 걸음 시간(발이 미끄러지지 않게)", async () => {
    const { WALK_CYCLE_S } = await import("./space-avatars");
    const { WALK_SPEED_H } = await import("./space-seats");
    const stepOfHeight = WALK_SPEED_H * (WALK_CYCLE_S / 2); // 한 걸음 = 키의 몇 배
    const legSpread = (40 * (Math.sin((31 * Math.PI) / 180) + Math.sin((26 * Math.PI) / 180))) / 150; // 옆모습 다리 벌림(앞 31° + 뒤 26°, 그림 단위 → 키 비율)
    expect(Math.abs(stepOfHeight - legSpread)).toBeLessThan(0.03);
  });
});

describe("멈춰 선 모습(stand) — 일어선 뒤·앉기 전 잠깐", () => {
  it("걷는 모습과 같은 그림인데 움직임만 없다", async () => {
    const { AVATARS, figureSvg, FIGURE_VIEW } = await import("./space-avatars");
    expect(FIGURE_VIEW.stand).toEqual(FIGURE_VIEW.walk);
    for (const a of AVATARS) for (const f of ["front", "back", "side"] as const) {
      const st = figureSvg(a.id, "stand", f);
      expect(st).not.toMatch(/@keyframes/);
      expect(st.replace(/<style>[\s\S]*?<\/style>/, "")).toBe(figureSvg(a.id, "walk", f).replace(/<style>[\s\S]*?<\/style>/, ""));
    }
  });
});
