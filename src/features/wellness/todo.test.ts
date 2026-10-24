import { describe, expect, it } from "vitest";
import { TODO_POOL, todoFor, type PoolKey, type Tone } from "./todo";
import { readPicks } from "./needs";
import type { SamScore } from "./sam";

const KEYS: PoolKey[] = ["HP", "LP", "HN", "LN", "NONE"];
const TONES: Tone[] = ["calm", "move", "connect", "mind"];

describe("todo — 오늘 해볼 것은 성향이 아니라 상태로", () => {
  it("풀마다 톤 네 가지가 각각 하나 이상 · 제목·이유가 있다 · 진단·치료 말투 없음", () => {
    for (const k of KEYS) {
      for (const tone of TONES) expect(TODO_POOL[k].some((x) => x.tone === tone), `${k} ${tone}`).toBe(true);
      for (const x of TODO_POOL[k]) {
        expect(x.title.trim().length, `${k} ${x.title}`).toBeGreaterThan(0);
        expect(x.why.trim().length).toBeGreaterThan(0);
        expect(`${x.title} ${x.why}`).not.toMatch(/진단|치료|증상|장애|병원|약|우울증|불안증/);
        expect(x.title).not.toMatch(/(하세요|해야|하십시오|해라)$/);
      }
    }
  });
  it("항상 셋 · 서로 다른 제목 · 서로 다른 톤", () => {
    for (const k of KEYS) for (let seed = 0; seed < 12; seed++) {
      const q = k === "NONE" ? null : k;
      const r = readPicks(3, [seed % 5], seed % 6);
      const items = todoFor(q, r, seed);
      expect(items, `${k}${seed}`).toHaveLength(3);
      expect(new Set(items.map((x) => x.title)).size).toBe(3);
      expect(new Set(items.map((x) => x.tone)).size).toBe(3);
    }
  });
  it("방향을 따른다 — 차분을 찾으면 차분이 먼저, 활기를 찾으면 움직임이 먼저", () => {
    expect(todoFor("HN", readPicks(5, [3], 4), 100)[0].tone).toBe("calm");
    expect(todoFor("LN", readPicks(1, [4], 0), 100)[0].tone).toBe("move");
    expect(todoFor("HN", readPicks(3, [3], 0), 100)[0].tone).toBe("calm"); // 두 갈래도 차분 먼저
  });
  it("상태가 다르면 내용이 다르다 — 같은 사람이 아니라 오늘이 정한다", () => {
    const hn = todoFor("HN", null, 100).map((x) => x.title).join();
    const ln = todoFor("LN", null, 100).map((x) => x.title).join();
    const hp = todoFor("HP", null, 100).map((x) => x.title).join();
    expect(new Set([hn, ln, hp]).size).toBe(3);
  });
  it("같은 상태도 날짜가 바뀌면 달라진다 · 같은 날은 같다", () => {
    const days = new Set<string>();
    for (let d = 0; d < 10; d++) days.add(todoFor("HN", readPicks(5, [3], 4), 20000 + d).map((x) => x.title).join());
    expect(days.size).toBeGreaterThanOrEqual(2);
    expect(todoFor("HN", null, 20000)).toEqual(todoFor("HN", null, 20000));
  });
  it("사람 쪽이 뚜렷하면 사람 톤이 들어가고 혼자 쪽이면 빠진다", () => {
    const withSoc = todoFor("LP", readPicks(3 as SamScore, [0], 1), 5);
    expect(withSoc.some((x) => x.tone === "connect")).toBe(true);
    const solo = todoFor("HP", readPicks(3 as SamScore, [2], 5), 5);
    expect(solo.some((x) => x.tone === "connect")).toBe(false);
  });
  it("마음카드 없는 날(q 없음)도 무난한 셋이 나온다", () => {
    const items = todoFor(null, null, 7);
    expect(items).toHaveLength(3);
    for (const x of items) expect(TODO_POOL.NONE).toContain(x);
  });
});
