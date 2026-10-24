import { describe, expect, it } from "vitest";
import { ALL_AXES, AXES, directing, EMPTY_SAM, quadrantOf, samAnswered, samDone, samWeight, type SamScore } from "./sam";

const S: SamScore[] = [1, 2, 3, 4, 5];
const full = (v: SamScore, a: SamScore, d: SamScore = 4, sl: SamScore = 4, sat: SamScore = 4) => ({ valence: v, arousal: a, dominance: d, sleep: sl, satisfaction: sat });

describe("축 정의", () => {
  it("옛 5축 정의는 남기고(라벨·자산) 지금 묻는 건 기분·긴장 둘 — 축마다 은유 질문·그림 이름표 5개·근거 표기가 있고 직접 질문('기분은 어느 쪽')이 없다", () => {
    expect(ALL_AXES).toHaveLength(5);
    expect(AXES.map((x) => x.key)).toEqual(["valence", "arousal"]);
    for (const x of ALL_AXES) {
      expect(x.labels).toHaveLength(5);
      expect(x.basis.length).toBeGreaterThan(2);
      expect(x.question).not.toMatch(/기분은 어느|몸은 어느/);
      expect(x.question.endsWith("?")).toBe(true);
    }
    expect(samDone(EMPTY_SAM)).toBe(false);
    expect(samAnswered({ ...EMPTY_SAM, valence: 3, sleep: 2 })).toBe(1);
    expect(samDone({ ...EMPTY_SAM, valence: 3 })).toBe(false);
    expect(samDone({ ...EMPTY_SAM, valence: 3, arousal: 4 })).toBe(true);
    expect(samDone(full(3, 3))).toBe(true);
  });
});

describe("SAM → 사분면", () => {
  it("기분×긴장 25조합이 전부 네 사분면 중 하나로 간다", () => {
    for (const v of S) for (const a of S) expect(["HP", "LP", "HN", "LN"]).toContain(quadrantOf(v, a));
  });
  it("불쾌+긴장 HN · 불쾌+처짐 LN · 유쾌+긴장 HP · 유쾌+차분 LP · 가운데(3)는 긴장 축이 정함", () => {
    expect(quadrantOf(1, 5)).toBe("HN"); expect(quadrantOf(2, 1)).toBe("LN");
    expect(quadrantOf(5, 4)).toBe("HP"); expect(quadrantOf(4, 2)).toBe("LP");
    expect(quadrantOf(3, 5)).toBe("HN"); expect(quadrantOf(3, 1)).toBe("LN"); expect(quadrantOf(3, 3)).toBe("LP"); expect(quadrantOf(4, 3)).toBe("LP");
  });
  it("마음 컨디션 재료는 기분 축만: ≤2 heavy · 3 neutral · ≥4 light", () => {
    expect(samWeight(1)).toBe("heavy"); expect(samWeight(3)).toBe("neutral"); expect(samWeight(5)).toBe("light");
  });
});

describe("directing", () => {
  it("고른 은유 이름(하늘·물) 수식어 없이 상태 말로 시작하고, 사분면 전략이 붙고, 임상 용어가 없다", () => {
    const d = directing(full(2, 5), 4, 2);
    expect(d.quadrant).toBe("HN");
    expect(d.weight).toBe("heavy");
    expect(d.text).not.toMatch(/오늘 하늘은|안의 물은/); // 2026-10-24 수식어 삭제
    expect(d.text.startsWith("겉보다 안이 더 요동친 날이에요.")).toBe(true);
    expect(d.text).toContain("숨 고르기");
    expect(d.text).not.toMatch(/\d점|등급|우울증|진단|각성/);
  });
  // 2026-09-13 사용자 지시로 **하나의 디렉팅**이 됐다 — 문항마다 문단을 세우지 않는다.
  // 전에는 5~7문단이었고 「어젯밤은 …」·「오늘은 …처럼 흘러갔다고 하셨어요」처럼 답을 하나씩 되읽어 줬다.
  it("답이 무엇이든 문단을 나누지 않는다 — 글 하나로 이어진다", () => {
    for (const [v, a, d, sl] of [[4, 2, 4, 4], [2, 4, 1, 1], [5, 5, 3, 3], [3, 3, 2, 2]] as const) {
      for (const body of [4, 1, null] as const) {
        const txt = directing(full(v, a, d, sl), body, 1).text;
        expect(txt, `v${v}a${a}d${d}s${sl}/body${body}`).not.toContain("\n");
      }
    }
  });

  it("잠·통제감·어제 몸은 「이유」로 엮여 같은 글 안에 들어간다", () => {
    const txt = directing(full(2, 4, 1, 1), 1, 1).text;
    expect(txt).toContain("어젯밤 잠이 뒤척인 밤");
    expect(txt).toContain("떠내려가는 종이배");
    expect(txt).toContain("어제 몸 컨디션이 낮은 쪽");
    expect(txt).toContain("아주 작은 선택 하나");
    // 🚫 답을 되읽어 주는 옛 말투로 돌아가지 말 것
    for (const o of ["어젯밤은 ", "흘러갔다고 하셨어요", "어제 몸 컨디션은 "]) expect(txt).not.toContain(o);
    // 상태 → 제안 → 안심 차례는 유지된다(문단만 안 나눌 뿐)
    expect(txt.indexOf("어젯밤 잠이")).toBeLessThan(txt.indexOf("아주 작은 선택 하나"));
    expect(txt.indexOf("아주 작은 선택 하나")).toBeLessThan(txt.indexOf("감정이 큰 건"));
  });

  it("잠·통제감이 좋으면 그 이유 문장이 아예 안 나온다", () => {
    const good = directing(full(4, 2, 5, 5), 3, 1).text;
    expect(good).not.toContain("어젯밤 잠이");
    expect(good).not.toContain("아주 작은 선택 하나");
  });
  it("LN 은 아주 작은 행동, HP 는 힘 쓸 곳, LP 는 유지·기록, 몸 낮으면 부담 낮게, 몸 기록 없으면 그 문단이 말해 준다", () => {
    expect(directing(full(2, 1), 4, 1).text).toContain("아주 작은 행동 하나");
    expect(directing(full(5, 5), 4, 2).text).toContain("쓸 곳이 있을 때");
    expect(directing(full(4, 2), 4, 0).text).toContain("기록해 두면");
    expect(directing(full(5, 5), 1, 2).text).toContain("힘을 아껴");
    expect(directing(full(3, 3), null, 1).text).toContain("어제 몸 기록이 아직 없어서");
  });
});

describe("요약(short) — 6줄 안쪽 · 천편일률 방지", () => {
  const sh = (v: SamScore, a: SamScore, bl: (number | null)[] = [2], c: number | null = 4, seed = 0) => directing({ valence: v, arousal: a }, 3, 1, bl, c, seed);
  it("상태·그림색·제안 한 덩어리 · 수식어 없음 · 길이 제한 · 전체 글은 그대로", () => {
    const d = sh(2, 5);
    expect(d.short).not.toMatch(/하늘은|물은|\n|undefined|null/);
    expect(d.short.startsWith("마음이 조금 가라앉고 몸에 힘이 가득 올라와 있어요.")).toBe(true);
    expect(d.short).toMatch(/그림과 색/);
    expect(d.short.length).toBeLessThanOrEqual(160);
    expect(d.short.length).toBeLessThan(d.text.length * 0.5);
    expect(d.text).toContain("이럴 땐 생각으로 정리하려 할수록");
  });
  it("기분×긴장 25가지가 서로 다른 첫 문장으로 시작한다", () => {
    const starts = new Set<string>();
    for (let v = 1; v <= 5; v++) for (let a = 1; a <= 5; a++) starts.add(sh(v as SamScore, a as SamScore, [null], null).short.split("요.")[0]);
    expect(starts.size).toBe(25);
  });
  it("같은 답도 날(seed)이 바뀌면 문장이 달라진다 · 같은 날은 같다", () => {
    const days = new Set<string>();
    for (let d = 0; d < 12; d++) days.add(sh(2, 5, [2], 4, 20000 + d).short);
    expect(days.size).toBeGreaterThanOrEqual(4);
    expect(sh(2, 5, [2], 4, 20000).short).toBe(sh(2, 5, [2], 4, 20000).short);
  });
  it("답 조합이 많을수록 요약이 다양하다(수천 가지) · 어느 조합도 160자 이하", () => {
    const set = new Set<string>();
    for (let v = 1; v <= 5; v++) for (let a = 1; a <= 5; a++) for (let c = 0; c < 6; c++) for (let b = 0; b < 5; b++) for (let d = 0; d < 3; d++) {
      const t = sh(v as SamScore, a as SamScore, [b], c, 20000 + d).short;
      expect(t.length, `${v}/${a}/${b}/${c}/${d}`).toBeLessThanOrEqual(160);
      set.add(t);
    }
    expect(set.size).toBeGreaterThan(1500);
  });
  it("그림·색을 건너뛰면 그 줄이 빠지고 그림만/색만이면 말이 맞는다", () => {
    expect(sh(4, 2, [-1], -1).short).not.toMatch(/그림|색/);
    expect(sh(4, 2, [1], -1).short).toMatch(/그림/);
    expect(sh(4, 2, [1], -1).short).not.toMatch(/그림과 색/);
    expect(sh(4, 2, [-1], 3).short).toMatch(/색/);
  });
});
