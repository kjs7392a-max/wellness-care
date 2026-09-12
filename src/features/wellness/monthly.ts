/**
 * 나의 기록 — 월별 기록장 (2026-09-12 사용자 지시 "말 그대로 기록을 봐야 하니까 월별로").
 *
 * 하루 한 줄(DayRecord)이 원장이고, 화면은 고른 달의 줄들을 모아 요약한다.
 * 단계 규칙은 condition.ts 의 주간 규칙을 그대로 쓴다 — 주차별은 그 주 재료로, 달 전체는 「주당 평균」 재료로.
 * (규칙을 따로 적으면 홈·상세와 갈린다.)
 *
 * ⚠ 지금은 실데이터가 없어 `mockRecordsUntil(now)` 가 두 달 전 1일 ~ 어제까지 규칙적으로 만든 목업이다.
 *   실데이터가 붙으면 DayRecord[] 를 주는 쪽만 바꾸면 되고 이 파일의 요약 함수는 그대로다.
 */
import { bodyLevel, heavySignal, levelFromSum, mindLevel, overallLevel, recordSignal, type Level } from "./condition";
import { AXES, quadrantOf, samWeight, type Quadrant, type SamScore } from "./sam";
import { PROGRAMS } from "./data";

export interface DayRecord {
  /** YYYY-MM-DD */
  date: string;
  steps: number;
  /** 그날 한 몸풀기 — 프로그램 id 와 횟수 */
  done: { id: string; n: number }[];
  /** 오늘의 마음카드(기분·긴장). 안 한 날은 null */
  sam: { valence: SamScore; arousal: SamScore } | null;
  /** 마음과 대화 횟수(내용은 안 담는다) */
  chats: number;
}

export interface YearMonth { y: number; m: number } // m = 1~12

export const ymKey = (ym: YearMonth) => `${ym.y}-${String(ym.m).padStart(2, "0")}`;
export const ymLabel = (ym: YearMonth) => `${ym.y}년 ${ym.m}월`;
export const ymOf = (d: Date): YearMonth => ({ y: d.getFullYear(), m: d.getMonth() + 1 });
export const ymEq = (a: YearMonth, b: YearMonth) => a.y === b.y && a.m === b.m;
export const ymAdd = (ym: YearMonth, k: number): YearMonth => {
  const idx = ym.y * 12 + (ym.m - 1) + k;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
};
const ymCmp = (a: YearMonth, b: YearMonth) => a.y * 12 + a.m - (b.y * 12 + b.m);

const pad2 = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** 기록이 있는 첫 달 ~ 이번 달. 화살표는 이 범위 밖으로 못 나간다. */
export function monthRange(records: DayRecord[], now: Date): { first: YearMonth; last: YearMonth } {
  const last = ymOf(now);
  if (records.length === 0) return { first: last, last };
  const firstDate = records.map((r) => r.date).sort()[0];
  const first = { y: Number(firstDate.slice(0, 4)), m: Number(firstDate.slice(5, 7)) };
  return { first: ymCmp(first, last) < 0 ? first : last, last };
}
export const canGoPrev = (ym: YearMonth, range: { first: YearMonth }) => ymCmp(ym, range.first) > 0;
export const canGoNext = (ym: YearMonth, range: { last: YearMonth }) => ymCmp(ym, range.last) < 0;

export const recordsOfMonth = (records: DayRecord[], ym: YearMonth) => records.filter((r) => r.date.startsWith(ymKey(ym) + "-"));

/** 그 달 며칠이 몇 주차인지 — 1일부터 7일씩(달력 주가 아니라 「그 달의 n주차」). */
export const weekOfMonth = (date: string) => Math.floor((Number(date.slice(8, 10)) - 1) / 7) + 1;

export interface WeekSummary {
  week: number; // 1~5
  days: number;
  stretch: number;
  pictureDays: number;
  heavyDays: number;
  chats: number;
  body: Level | null;
  mind: Level | null;
  overall: Level | null;
}

export interface MonthSummary {
  ym: YearMonth;
  days: number;
  steps: number;
  stepsPerDay: number;
  stretch: number; // 회 (= 분, 한 편 1분)
  byProgram: { id: string; title: string; n: number }[];
  pictureDays: number;
  heavyDays: number;
  chats: number;
  weeks: WeekSummary[];
  body: Level | null;
  mind: Level | null;
  overall: Level | null;
  /** 날짜별 한 줄(최근 날이 위) */
  days_: DayLine[];
}

export interface DayLine {
  date: string;
  /** "9/11 (목)" */
  label: string;
  steps: number;
  done: { title: string; n: number }[];
  stretch: number;
  sam: { valence: SamScore; arousal: SamScore; sky: string; water: string; quadrant: Quadrant; reading: string } | null;
  chats: number;
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const dayLabel = (date: string) => {
  const d = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  return `${d.getMonth() + 1}/${d.getDate()} (${DOW[d.getDay()]})`;
};

/** 마음 줄 한 문장 — 사분면(Russell)별. 해석이 아니라 그날 고른 그림을 받아 적는 정도. */
const READING: Record<Quadrant, string> = {
  HP: "힘이 있고 마음도 가벼웠던 날이에요.",
  LP: "차분하고 편안한 쪽에 있던 날이에요.",
  HN: "마음이 바쁘고 조금 눌려 있던 날이에요.",
  LN: "기운이 가라앉고 무거웠던 날이에요.",
};

function weekSummary(week: number, rows: DayRecord[]): WeekSummary {
  const stretch = rows.reduce((a, r) => a + r.done.reduce((b, d) => b + d.n, 0), 0);
  const withSam = rows.filter((r) => r.sam);
  const heavyDays = withSam.filter((r) => samWeight(r.sam!.valence) === "heavy").length;
  const chats = rows.reduce((a, r) => a + r.chats, 0);
  const body = rows.length ? bodyLevel({ stretchCount: stretch, moveVsUsual: 0, stepsVsUsual: 0 }) : null;
  const mind = rows.length ? mindLevel({ pictureDays: withSam.length, heavyDays, chatCount: chats, riskFlagged: false }) : null;
  return { week, days: rows.length, stretch, pictureDays: withSam.length, heavyDays, chats, body, mind, overall: overallLevel(body, mind) };
}

export function monthSummary(records: DayRecord[], ym: YearMonth): MonthSummary {
  const rows = recordsOfMonth(records, ym).sort((a, b) => a.date.localeCompare(b.date));
  const steps = rows.reduce((a, r) => a + r.steps, 0);
  const byId = new Map<string, number>();
  for (const r of rows) for (const d of r.done) byId.set(d.id, (byId.get(d.id) || 0) + d.n);
  const byProgram = [...byId.entries()]
    .map(([id, n]) => ({ id, title: PROGRAMS.find((p) => p.id === id)?.title ?? id, n }))
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title));
  const stretch = byProgram.reduce((a, p) => a + p.n, 0);
  const withSam = rows.filter((r) => r.sam);
  const heavyDays = withSam.filter((r) => samWeight(r.sam!.valence) === "heavy").length;
  const chats = rows.reduce((a, r) => a + r.chats, 0);

  const weekNos = [...new Set(rows.map((r) => weekOfMonth(r.date)))].sort((a, b) => a - b);
  const weeks = weekNos.map((w) => weekSummary(w, rows.filter((r) => weekOfMonth(r.date) === w)));

  // 달 전체 단계 = 주간 규칙에 「주당 평균」 재료(기록이 있는 주 수로 나눔). 주가 하나면 그 주 그대로.
  const nWeeks = Math.max(weeks.length, 1);
  const body = rows.length ? bodyLevel({ stretchCount: Math.round(stretch / nWeeks), moveVsUsual: 0, stepsVsUsual: 0 }) : null;
  const mind = rows.length
    ? withSam.length + chats > 0
      ? levelFromSum(heavySignal(withSam.length, heavyDays) + recordSignal(Math.round(withSam.length / nWeeks)))
      : null
    : null;

  const days_ = [...rows].reverse().map<DayLine>((r) => ({
    date: r.date,
    label: dayLabel(r.date),
    steps: r.steps,
    done: r.done.map((d) => ({ title: PROGRAMS.find((p) => p.id === d.id)?.title ?? d.id, n: d.n })),
    stretch: r.done.reduce((a, d) => a + d.n, 0),
    sam: r.sam
      ? (() => {
          const q = quadrantOf(r.sam.valence, r.sam.arousal);
          return { ...r.sam, sky: AXES[0].labels[r.sam.valence - 1], water: AXES[1].labels[r.sam.arousal - 1], quadrant: q, reading: READING[q] };
        })()
      : null,
    chats: r.chats,
  }));

  return {
    ym, days: rows.length, steps, stepsPerDay: rows.length ? Math.round(steps / rows.length) : 0,
    stretch, byProgram, pictureDays: withSam.length, heavyDays, chats, weeks, body, mind, overall: overallLevel(body, mind), days_,
  };
}

// ── 목업 원장 ──────────────────────────────────────────────────────────────────────────────
// 실데이터 전까지. 같은 날짜엔 항상 같은 값이 나오도록 날짜에서 씨앗을 뽑는다(새로고침마다 바뀌면 기록장이 아니다).
function seeded(date: string) {
  let h = 2166136261;
  for (const ch of date) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const MOCK_POOL = ["p1", "p2", "p6", "p11", "p15", "p12", "p5", "p10", "p13"]; // 자주 고르는 것부터

export function mockDay(date: string): DayRecord {
  const rnd = seeded(date);
  const d = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const steps = Math.round((weekend ? 2400 : 3600) + rnd() * (weekend ? 3200 : 3400));
  const nDone = weekend ? (rnd() < 0.55 ? 0 : 1) : rnd() < 0.15 ? 0 : rnd() < 0.5 ? 1 : rnd() < 0.8 ? 2 : 3;
  const done: { id: string; n: number }[] = [];
  for (let i = 0; i < nDone; i++) {
    const id = MOCK_POOL[Math.floor(Math.pow(rnd(), 1.6) * MOCK_POOL.length)];
    const hit = done.find((x) => x.id === id);
    if (hit) hit.n += 1; else done.push({ id, n: 1 });
  }
  const hasSam = rnd() < (weekend ? 0.45 : 0.72);
  const v = Math.min(5, Math.max(1, Math.round(3.3 + (rnd() - 0.5) * 3.2))) as SamScore;
  const a = Math.min(5, Math.max(1, Math.round(3 + (rnd() - 0.5) * 3.4))) as SamScore;
  const chats = rnd() < 0.22 ? 1 : 0;
  return { date, steps, done, sam: hasSam ? { valence: v, arousal: a } : null, chats };
}

/** 두 달 전 1일 ~ 어제. 오늘은 아직 안 끝났으니 원장에 없다. */
export function mockRecordsUntil(now: Date): DayRecord[] {
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const out: DayRecord[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(mockDay(dateKey(d)));
  return out;
}
