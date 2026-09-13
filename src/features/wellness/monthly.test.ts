import { describe, expect, it } from "vitest";
import { canGoNext, canGoPrev, dayConditionOf, mockDay, mockRecordsUntil, monthRange, monthSummary, weekConditions, weekOfMonth, ymAdd, ymLabel, type DayRecord } from "./monthly";
import { dayBodyLevel, dayMindLevel, overallLevel } from "./condition";
import { samWeight } from "./sam";
import { YESTERDAY } from "./data";

const NOW = new Date(2026, 8, 12); // 2026-09-12

describe("월 범위·이동", () => {
  it("목업 원장은 두 달 전 1일부터 어제까지, 오늘은 없다", () => {
    const rs = mockRecordsUntil(NOW);
    expect(rs[0].date).toBe("2026-07-01");
    expect(rs[rs.length - 1].date).toBe("2026-09-11");
    expect(rs.some((r) => r.date === "2026-09-12")).toBe(false);
    expect(rs).toHaveLength(31 + 31 + 11);
  });
  it("같은 날짜는 언제 만들어도 같은 값(기록장이 흔들리지 않는다)", () => {
    expect(mockDay("2026-08-03")).toEqual(mockDay("2026-08-03"));
    expect(mockDay("2026-08-03")).not.toEqual(mockDay("2026-08-04"));
  });
  it("화살표는 첫 기록 달 ~ 이번 달 사이에서만", () => {
    const rs = mockRecordsUntil(NOW);
    const range = monthRange(rs, NOW);
    expect(range.first).toEqual({ y: 2026, m: 7 });
    expect(range.last).toEqual({ y: 2026, m: 9 });
    expect(canGoPrev({ y: 2026, m: 7 }, range)).toBe(false);
    expect(canGoPrev({ y: 2026, m: 8 }, range)).toBe(true);
    expect(canGoNext({ y: 2026, m: 9 }, range)).toBe(false);
    expect(canGoNext({ y: 2026, m: 8 }, range)).toBe(true);
    expect(ymAdd({ y: 2026, m: 1 }, -1)).toEqual({ y: 2025, m: 12 });
    expect(ymAdd({ y: 2026, m: 12 }, 1)).toEqual({ y: 2027, m: 1 });
    expect(ymLabel({ y: 2026, m: 9 })).toBe("2026년 9월");
  });
  it("기록이 하나도 없으면 이번 달 하나만", () => {
    const range = monthRange([], NOW);
    expect(range.first).toEqual(range.last);
  });
});

describe("월 요약", () => {
  const rows: DayRecord[] = [
    { date: "2026-09-01", steps: 4000, done: [{ id: "p1", n: 2 }], sam: { valence: 4, arousal: 2 }, chats: 1 },
    { date: "2026-09-02", steps: 6000, done: [{ id: "p1", n: 1 }, { id: "p6", n: 1 }], sam: { valence: 2, arousal: 5 }, chats: 0 },
    { date: "2026-09-08", steps: 2000, done: [], sam: null, chats: 0 },
    { date: "2026-08-30", steps: 9999, done: [{ id: "p15", n: 5 }], sam: { valence: 1, arousal: 1 }, chats: 3 },
  ];
  it("고른 달 것만 모으고 다른 달은 섞이지 않는다", () => {
    const m = monthSummary(rows, { y: 2026, m: 9 });
    expect(m.days).toBe(3);
    expect(m.steps).toBe(12000);
    expect(m.stepsPerDay).toBe(4000);
    expect(m.stretch).toBe(4);
    expect(m.byProgram.map((p) => [p.title, p.n])).toEqual([["목·어깨 긴장 이완", 3], ["30초 눈 쉬기", 1]]);
    expect(m.pictureDays).toBe(2);
    expect(m.heavyDays).toBe(1);
    expect(m.chats).toBe(1);
  });
  it("주차는 1일부터 7일씩, 주차별 단계는 주간 규칙 그대로", () => {
    expect(weekOfMonth("2026-09-01")).toBe(1);
    expect(weekOfMonth("2026-09-07")).toBe(1);
    expect(weekOfMonth("2026-09-08")).toBe(2);
    expect(weekOfMonth("2026-09-31")).toBe(5);
    const m = monthSummary(rows, { y: 2026, m: 9 });
    expect(m.weeks.map((w) => w.week)).toEqual([1, 2]);
    expect(m.weeks[0].stretch).toBe(4); // ≥3 → 신체 좋음
    expect(m.weeks[0].body).toBe(4);
    expect(m.weeks[1].stretch).toBe(0); // 0 → 조금 지침
    expect(m.weeks[1].body).toBe(2);
    expect(m.weeks[1].mind).toBeNull(); // 기록 없음
  });
  it("날짜별 줄은 최근이 위, 라벨은 9/2 (수) 꼴, 마음 줄엔 하늘·물 이름표와 한 문장", () => {
    const m = monthSummary(rows, { y: 2026, m: 9 });
    expect(m.days_.map((d) => d.date)).toEqual(["2026-09-08", "2026-09-02", "2026-09-01"]);
    expect(m.days_[1].label).toBe("9/2 (수)");
    expect(m.days_[1].sam?.sky).toBe("흐림");
    expect(m.days_[1].sam?.water).toBe("폭포");
    expect(m.days_[1].sam?.quadrant).toBe("HN");
    expect(m.days_[1].sam?.reading.length).toBeGreaterThan(5);
    expect(m.days_[0].sam).toBeNull();
  });
  it("기록 없는 달은 전부 0·null", () => {
    const m = monthSummary(rows, { y: 2026, m: 6 });
    expect(m.days).toBe(0);
    expect(m.overall).toBeNull();
    expect(m.weeks).toEqual([]);
    expect(m.days_).toEqual([]);
  });
});

describe("weekConditions — 주간 일별 보기 (2026-09-13)", () => {
  const now = new Date(2026, 8, 13); // 9/13
  const records = mockRecordsUntil(now);

  it("어제까지 7일을 최근이 위로 돌려준다", () => {
    const w = weekConditions(records);
    expect(w).toHaveLength(7);
    expect(w[0].date).toBe("2026-09-12"); // 어제가 맨 위
    expect(w[6].date).toBe("2026-09-06");
    // 내림차순
    for (let i = 1; i < w.length; i++) expect(w[i].date < w[i - 1].date).toBe(true);
  });

  it("오늘은 들어가지 않는다 — 아직 끝나지 않은 하루다", () => {
    expect(weekConditions(records).some((d) => d.date === "2026-09-13")).toBe(false);
  });

  // ★ 단계는 새로 쓰지 않고 하루 규칙을 그대로 쓴다 — 홈 카드와 갈리면 안 된다.
  it("하루 판정 규칙(dayBodyLevel·dayMindLevel·overallLevel)과 같은 값이 나온다", () => {
    for (const d of weekConditions(records)) {
      const r = records.find((x) => x.date === d.date)!;
      const stretch = r.done.reduce((a, x) => a + x.n, 0);
      const body = dayBodyLevel({ stretchCount: stretch, moveVsUsual: 0, stepsVsUsual: 0 });
      const mind = dayMindLevel({ pick: r.sam ? samWeight(r.sam.valence) : "none", chatCount: r.chats, riskFlagged: false });
      expect(d.body).toBe(body);
      expect(d.mind).toBe(mind);
      expect(d.overall).toBe(overallLevel(body, mind));
      expect(d.stretch).toBe(stretch);
    }
  });

  // 마음카드 3점(neutral)을 「기록 없음」으로 적을 뻔했다 — 근거 문장이 그날을 맞게 말해야 한다.
  it("마음카드 3점인 날은 「그저 그런 결」로 적는다(기록 없음이 아니다)", () => {
    const d = dayConditionOf({ date: "2026-09-01", steps: 3000, done: [], sam: { valence: 3, arousal: 3 }, chats: 0 });
    expect(d.mindEvidence[0]).toBe("오늘의 마음카드: 그저 그런 결");
    expect(d.mind).toBe(3);
  });

  it("마음 기록이 하나도 없는 날은 단계가 없다", () => {
    const d = dayConditionOf({ date: "2026-09-01", steps: 3000, done: [], sam: null, chats: 0 });
    expect(d.mind).toBeNull();
  });

  it("날짜 이름표가 「9/12 (토)」 꼴이다", () => {
    expect(weekConditions(records)[0].label).toBe("9/12 (토)");
  });
});

describe("원장의 어제 = 홈 카드의 어제 (2026-09-13 실측으로 드러난 갈림)", () => {
  // 한 화면(주간 기록)에서 위 카드는 YESTERDAY 를, 아래 하루씩 보기는 원장을 보고 있어
  // 같은 날을 「좋음」과 「보통」으로 동시에 말했다. 목업 원장이 둘이었다.
  it("원장 마지막 줄의 판정이 YESTERDAY 로 낸 판정과 같다", () => {
    const now = new Date(2026, 8, 13);
    const y = weekConditions(mockRecordsUntil(now))[0];
    const body = dayBodyLevel(YESTERDAY.body);
    const mind = dayMindLevel({ ...YESTERDAY.mind, riskFlagged: false });
    expect(y.body).toBe(body);
    expect(y.mind).toBe(mind);
    expect(y.overall).toBe(overallLevel(body, mind));
  });

  it("마음카드 결도 같다 — heavy/light 를 바꾸면 원장도 따라온다", () => {
    const now = new Date(2026, 8, 13);
    const y = weekConditions(mockRecordsUntil(now))[0];
    const word = YESTERDAY.mind.pick === "light" ? "가벼운 결" : YESTERDAY.mind.pick === "heavy" ? "무거운 결" : "";
    if (word) expect(y.mindEvidence[0]).toContain(word);
  });
});
