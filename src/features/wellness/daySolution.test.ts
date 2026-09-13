import { describe, expect, it } from "vitest";
import { buildDaySolution, type DaySolutionArgs } from "./daySolution";
import { WEATHER, type Role, type WeatherKey } from "./data";

const ROLES: Role[] = ["teacher", "admin", "care"];

/**
 * 낮은 강도에서 쓰면 안 되는 말. 부분문자열로 잡는다 — 영리한 판정보다 놓치지 않는 판정이 낫다.
 * 단 "일어서지 않으셔도 돼요" 처럼 **하지 말라는 문장**은 금지 대상이 아니므로 먼저 걷어낸다.
 */
const BANNED = ["걸어", "산책", "일어나", "일어서"];
const strip = (txt: string) => txt.replace(/일어(서|나)지 않[^.]*\./g, "");
const PREFERS: DaySolutionArgs["weatherPrefer"][] = ["indoor", "outdoor"];

/** 36가지 조합 = 직군 3 × 시간대 3 × 주말 2 × 날씨 2. */
function allCases(low: boolean): DaySolutionArgs[] {
  const out: DaySolutionArgs[] = [];
  for (const role of ROLES) {
    for (const slot of [0, 1, 2]) {
      for (const isWeekend of [false, true]) {
        for (const weatherPrefer of PREFERS) {
          out.push({ role, slot, isWeekend, low, weatherPrefer, feelsTxt: "체감 25°" });
        }
      }
    }
  }
  return out;
}

describe("buildDaySolution — PAR-Q+ 낮은 강도", () => {
  // 이 앱은 PAR-Q+ 에 「예」가 있으면 "앉은 자리에서 하는 낮은 강도만 제안해 드립니다" 라고 약속한다.
  // 홈 본문이 같은 화면에서 걷기·산책·일어서기를 권하면 그 약속이 거짓이 된다.
  it("낮은 강도에서는 36가지 조합 어디에서도 걷기·산책·일어서기를 권하지 않는다", () => {
    for (const c of allCases(true)) {
      const txt = strip(buildDaySolution(c));
      for (const w of BANNED) {
        expect(txt, `${c.role}/slot${c.slot}/${c.isWeekend ? "주말" : "평일"}/${c.weatherPrefer} → ${txt}`).not.toContain(w);
      }
    }
  });

  // 위 가드는 이 함수가 **스스로 쓴 말**만 본다(feelsTxt 는 바깥에서 들어오는 날씨 문구).
  // 실제 WEATHER 값이 끼어들어도 금지어가 새지 않는지는 따로 확인한다 — fine 의 note 가 "산책하기 좋은 날" 이다.
  it("실제 날씨 문구가 들어가도 낮은 강도 본문에 금지어가 새지 않는다", () => {
    for (const key of Object.keys(WEATHER) as WeatherKey[]) {
      const w = WEATHER[key];
      for (const c of allCases(true)) {
        const txt = strip(buildDaySolution({ ...c, weatherPrefer: w.prefer, feelsTxt: w.note }));
        for (const b of BANNED) expect(txt, `${key}/${c.role}/slot${c.slot} → ${txt}`).not.toContain(b);
      }
    }
  });

  it("평소 강도에서는 날이 좋으면 걷기를 권한다(대조군 — 위 가드가 통째로 문구를 죽인 게 아님)", () => {
    const walked = allCases(false).filter((c) => buildDaySolution(c).includes("걸어"));
    expect(walked.length).toBeGreaterThan(0);
  });

  it("같은 상황이라도 낮은 강도면 문구가 달라진다", () => {
    const base: DaySolutionArgs = { role: "teacher", slot: 2, isWeekend: false, low: false, weatherPrefer: "outdoor", feelsTxt: "체감 25°" };
    expect(buildDaySolution({ ...base, low: true })).not.toBe(buildDaySolution(base));
  });

  it("모든 조합에서 빈 문자열·undefined 가 새지 않는다", () => {
    for (const low of [false, true]) {
      for (const c of allCases(low)) {
        const txt = buildDaySolution(c);
        expect(txt.length).toBeGreaterThan(30);
        expect(txt).not.toContain("undefined");
      }
    }
  });
});

describe("buildDaySolution — 기존 동작 유지", () => {
  it("평일은 시간대 인사말로 시작한다", () => {
    const txt = buildDaySolution({ role: "admin", slot: 0, isWeekend: false, low: false, weatherPrefer: "outdoor", feelsTxt: "체감 22°" });
    expect(txt.startsWith("오늘 하루가 이제 시작이네요.")).toBe(true);
  });

  it("주말은 인사말 없이 쉬는 날 문구로 시작한다", () => {
    const txt = buildDaySolution({ role: "admin", slot: 0, isWeekend: true, low: false, weatherPrefer: "outdoor", feelsTxt: "체감 22°" });
    expect(txt.startsWith("오늘은 쉬는 날이네요.")).toBe(true);
  });

  it("실내를 권하는 날씨면 체감 문구가 본문에 들어간다", () => {
    const txt = buildDaySolution({ role: "care", slot: 1, isWeekend: false, low: false, weatherPrefer: "indoor", feelsTxt: "체감 35° · 낮 외출 주의" });
    expect(txt).toContain("체감 35° · 낮 외출 주의");
  });

  it("직군마다 평일 본문이 다르다", () => {
    const mk = (role: Role) => buildDaySolution({ role, slot: 2, isWeekend: false, low: false, weatherPrefer: "outdoor", feelsTxt: "체감 22°" });
    expect(new Set(ROLES.map(mk)).size).toBe(3);
  });
});
