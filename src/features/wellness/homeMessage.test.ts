import { describe, expect, it } from "vitest";
import { HOME_MESSAGES, homeMessagePool, pickHomeMessage } from "./homeMessage";

// 2026-09-21 사용자 지시: 홈 인사말(시간대 한 줄) 아래에 30문장(출근·등교 전 10 · 퇴근 후 15 · 주말·휴일 5)을 랜덤으로.
const WEEKDAY = 1; // 월
const SAT = 6;
const SUN = 0;

describe("HOME_MESSAGES — 30문장 원문", () => {
  it("묶음 개수가 제목과 같다(출근 전 10 · 퇴근 후 15 · 주말 5)", () => {
    expect(HOME_MESSAGES.beforeWork).toHaveLength(10);
    expect(HOME_MESSAGES.afterWork).toHaveLength(15);
    expect(HOME_MESSAGES.holiday).toHaveLength(5);
  });
  it("30문장 전부 비어 있지 않고 서로 다르다", () => {
    const all = [...HOME_MESSAGES.beforeWork, ...HOME_MESSAGES.afterWork, ...HOME_MESSAGES.holiday];
    expect(all).toHaveLength(30);
    for (const m of all) expect(m.trim().length).toBeGreaterThan(0);
    expect(new Set(all).size).toBe(30);
  });
  it("줄바꿈을 살려 둔다(원문이 여러 줄 시)", () => {
    for (const m of HOME_MESSAGES.afterWork) expect(m).toContain("\n");
  });
});

describe("homeMessagePool — 요일·시간대로 묶음을 고른다", () => {
  it("주말(토·일)은 시간과 무관하게 주말·휴일 5개", () => {
    for (const h of [3, 8, 13, 20]) {
      expect(homeMessagePool({ hour: h, dow: SAT })).toBe(HOME_MESSAGES.holiday);
      expect(homeMessagePool({ hour: h, dow: SUN })).toBe(HOME_MESSAGES.holiday);
    }
  });
  it("평일 5~11시 = 출근·등교 전 10개", () => {
    expect(homeMessagePool({ hour: 5, dow: WEEKDAY })).toBe(HOME_MESSAGES.beforeWork);
    expect(homeMessagePool({ hour: 10, dow: WEEKDAY })).toBe(HOME_MESSAGES.beforeWork);
  });
  it("평일 18시~새벽 5시 미만 = 퇴근 후 15개", () => {
    for (const h of [18, 21, 23, 0, 4]) expect(homeMessagePool({ hour: h, dow: WEEKDAY }), `${h}시`).toBe(HOME_MESSAGES.afterWork);
  });
  it("평일 낮 11~18시 미만 = 30개 전부(사용자 확정 2026-09-21)", () => {
    for (const h of [11, 14, 17]) expect(homeMessagePool({ hour: h, dow: WEEKDAY }), `${h}시`).toHaveLength(30);
  });
});

describe("pickHomeMessage — 시드로 하나 고른다", () => {
  it("시드가 0~1 사이 어디여도 묶음 안의 문장을 준다", () => {
    const pool = homeMessagePool({ hour: 20, dow: WEEKDAY });
    for (const seed of [0, 0.001, 0.5, 0.999, 0.9999999]) expect(pool).toContain(pickHomeMessage({ hour: 20, dow: WEEKDAY }, seed));
  });
  it("같은 시드·같은 맥락이면 같은 문장(세션 동안 고정)", () => {
    expect(pickHomeMessage({ hour: 8, dow: WEEKDAY }, 0.37)).toBe(pickHomeMessage({ hour: 9, dow: WEEKDAY }, 0.37));
  });
  it("시드가 다르면 묶음의 모든 문장에 닿는다(한 문장만 나오는 결함 방지)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(pickHomeMessage({ hour: 20, dow: WEEKDAY }, i / 100));
    expect(seen.size).toBe(15);
  });
  it("시드 1 이상·음수는 밖으로 안 나간다(범위 밖 인덱스 방지)", () => {
    const pool = homeMessagePool({ hour: 8, dow: WEEKDAY });
    expect(pool).toContain(pickHomeMessage({ hour: 8, dow: WEEKDAY }, 1));
    expect(pool).toContain(pickHomeMessage({ hour: 8, dow: WEEKDAY }, -0.2));
  });
});

// ── 소스 가드(jsdom 없음 · 화면은 이것이 유일한 방어선) ──
import { readFileSync } from "node:fs";
import { join } from "node:path";
const appSrc = readFileSync(join(process.cwd(), "src/features/wellness/WellnessApp.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("WellnessApp — 홈 30문장 배선", () => {
  it("인사말 아래에 pickHomeMessage 로 고른 문장을 pre-line 으로 그린다", () => {
    expect(appSrc).toMatch(/pickHomeMessage\(\{\s*hour:\s*s\.now\.getHours\(\),\s*dow:\s*s\.now\.getDay\(\)\s*\},\s*s\.msgSeed\)/);
    expect(appSrc).toMatch(/\{homeMessage && \(/);
    expect(appSrc).toMatch(/white-space:pre-line[^"]*"\)\}>\{homeMessage\}/);
  });
  it("시드는 마운트 이펙트에서만 만들고(hydration) 렌더 안에서 Math.random 을 부르지 않는다", () => {
    expect(appSrc).toMatch(/msgSeed:\s*null,/);
    expect(appSrc).toMatch(/patch\(\{\s*now:\s*new Date\(\),\s*msgSeed:\s*Math\.random\(\)\s*\}\)/);
    const renderHome = appSrc.slice(appSrc.indexOf("function renderHome()"), appSrc.indexOf("function renderHome()") + 4000);
    expect(renderHome).not.toMatch(/Math\.random/);
    expect(renderHome).toMatch(/s\.msgSeed !== null \?/); // 시드 없으면(서버 렌더) 안 그린다
  });
});
