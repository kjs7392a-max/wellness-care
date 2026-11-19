import { describe, expect, it } from "vitest";
import {
  calmRate, createMeditationGuide, DEFAULT_PACE, GUIDE_LINES, GUIDE_LOOP_SECONDS, GUIDE_VOLUME_RATIO, lineText, MAX_GAP, MIN_GAP, MIN_RATE,
  pickKoreanVoice, secondPhraseAt, syllables, type UtteranceLike,
} from "./meditation-voice";

type U = UtteranceLike & { onstart: (() => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

/**
 * 가짜 음성 엔진 + 시계. 영상 시간 = 벽시계(재생 중) 로 본다.
 * `engineSps` = 엔진의 실제 빠르기(속도 1 에서 음절/초) · `honorsRate` = 속도를 낮추면 정말 느려지나(크롬 맥은 일정 이하로 못 낮춘다)
 */
function rig(o: { pace?: number; engineSps?: number; honorsRate?: boolean } = {}) {
  let clock = 0;
  const timers: { at: number; fn: () => void }[] = [];
  const spoken: U[] = [];
  let cancels = 0;
  const synth = { speak: (u: U) => { spoken.push(u); }, cancel: () => { cancels += 1; }, speaking: false, pending: false };
  const states: boolean[] = [];
  const paces: number[] = [];
  const voice = { name: "유나", lang: "ko-KR" };
  const guide = createMeditationGuide<U>({
    synth,
    makeUtterance: (text) => ({ text, lang: "", rate: 1, pitch: 1, volume: 1, voice: null, onstart: null, onend: null, onerror: null }),
    voice,
    onChange: (p) => states.push(p),
    pace: o.pace,
    onPace: (p) => paces.push(p),
    now: () => clock,
    later: (fn, ms) => { timers.push({ at: clock + ms, fn }); },
  });
  const run = () => {
    for (;;) {
      const due = timers.filter((t) => t.at <= clock).sort((a, b) => a.at - b.at);
      if (!due.length) return;
      for (const t of due) { timers.splice(timers.indexOf(t), 1); t.fn(); }
    }
  };
  /** 영상을 t 초까지 재생 — 0.25초마다 tick(timeupdate), 읽는 말은 엔진 빠르기대로 끝난다 */
  const engine = { sps: o.engineSps ?? DEFAULT_PACE, honorsRate: o.honorsRate ?? true };
  const active: { u: U; endAt: number }[] = [];
  const endedAt = new Map<U, number>();
  const handled = new Set<U>();
  const pump = () => {
    for (const u of spoken) {
      if (handled.has(u)) continue;
      handled.add(u);
      u.onstart?.();
      const r = engine.honorsRate ? u.rate : Math.max(u.rate, 0.9);
      active.push({ u, endAt: clock + (syllables(u.text) / (engine.sps * r)) * 1000 });
    }
  };
  const playTo = (tSec: number, fromSec = clock / 1000) => {
    let t = fromSec;
    while (t < tSec - 1e-9) {
      t = Math.min(tSec, +(t + 0.05).toFixed(3));
      clock = Math.round(t * 1000);
      run();
      for (const a of active.splice(0).filter((a) => { if (a.endAt <= clock) return true; active.push(a); return false; })) { endedAt.set(a.u, clock / 1000); a.u.onend?.(); }
      pump();
      if (Math.round(t * 1000) % 250 === 0) guide.tick(t % GUIDE_LOOP_SECONDS);
      pump();
    }
  };
  return { guide, spoken, states, paces, voice, engine, playTo, cancels: () => cancels, clock: () => clock, endedAt };
}
const texts = (us: U[]) => us.map((u) => u.text);

describe("명상룸 음성 안내 — 말과 시점(2026-11-19)", () => {
  it("자막과 같은 말 셋 · 두 마디씩(자막 두 줄)", () => {
    expect(GUIDE_LINES.map(lineText)).toEqual([
      "편안히 앉아 어깨의 힘을 빼세요.",
      "숨을 편하게 쉬며 소리의 여운을 느껴보세요.",
      "생각이 떠오르면 천천히 소리로 돌아오세요.",
    ]);
    for (const l of GUIDE_LINES) expect(l.phrases).toHaveLength(2);
  });
  it("30초 영상 · 자막 한 장(10초) 안에서 시작하고 끝난다 — 실측 칸 0.21–9.83 · 10.33–19.92 · 20.38–30.0", () => {
    expect(GUIDE_LOOP_SECONDS).toBeCloseTo(30.25, 2);
    const cards = [[0.21, 9.83], [10.33, 19.92], [20.38, 30.0]];
    GUIDE_LINES.forEach((l, k) => {
      expect(l.at).toBeGreaterThanOrEqual(cards[k][0]);
      expect(l.end).toBeLessThanOrEqual(cards[k][1] - 2); // 끝나고 싱잉볼만 듣는 틈
      expect(l.end - l.at).toBeGreaterThanOrEqual(5); // 서두르지 않을 시간
    });
  });
  it("syllables — 한글 음절 수", () => {
    expect(syllables("편안히 앉아")).toBe(5);
    expect(syllables("어깨의 힘을 빼세요.")).toBe(8);
  });
});

describe("속도·쉼 계산 — 끝나는 시각에 맞춘다", () => {
  it("calmRate: 잔잔한 빠르기가 되게 낮추되 MIN_RATE 아래로는 안 내림 · 1 넘게 올리지 않음", () => {
    expect(calmRate(6.2)).toBe(MIN_RATE);
    expect(calmRate(4.4)).toBeCloseTo(4 / 4.4);
    expect(calmRate(2)).toBe(1);
  });
  it("secondPhraseAt: 둘째 마디가 end 에 끝나도록 · 쉼은 MIN_GAP~MAX_GAP", () => {
    const pace = 5, rate = 0.8; // 4 음절/초
    // "어깨의 힘을 빼세요." 8음절 → 2초 · end 6.8 → 4.8 에 시작
    expect(secondPhraseAt(3.5, 6.8, "어깨의 힘을 빼세요.", pace, rate)).toBeCloseTo(4.8);
    expect(secondPhraseAt(4.6, 6.8, "어깨의 힘을 빼세요.", pace, rate)).toBeCloseTo(4.6 + MIN_GAP); // 늦었으면 최소 쉼
    expect(secondPhraseAt(1.0, 6.8, "어깨의 힘을 빼세요.", pace, rate)).toBeCloseTo(1.0 + MAX_GAP); // 너무 이르면 최대 쉼
  });
});

describe("pickKoreanVoice — 더 자연스러운 목소리부터(\"기계음\" 피드백)", () => {
  const v = (name: string, lang = "ko-KR") => ({ name, lang });
  it("엣지 Natural > 향상됨/프리미엄 > Google > 유나 · 장난 목소리는 뒤로", () => {
    expect(pickKoreanVoice([v("유나"), v("Google 한국의"), v("Microsoft SunHi Online (Natural) - Korean (Korea)")])?.name).toMatch(/Natural/);
    expect(pickKoreanVoice([v("유나"), v("Google 한국의"), v("유나(향상됨)")])?.name).toBe("유나(향상됨)");
    expect(pickKoreanVoice([v("유나"), v("Google 한국의")])?.name).toBe("Google 한국의");
    expect(pickKoreanVoice([v("Grandpa (한국어(대한민국))"), v("Rocko (한국어(대한민국))"), v("유나")])?.name).toBe("유나");
    expect(pickKoreanVoice([v("Samantha", "en-US"), v("ko voice", "ko_KR")])?.name).toBe("ko voice");
  });
  it("한국어 목소리가 없으면 null", () => {
    expect(pickKoreanVoice([{ name: "Samantha", lang: "en-US" }])).toBeNull();
    expect(pickKoreanVoice([])).toBeNull();
  });
});

describe("createMeditationGuide — 한 바퀴", () => {
  it("문장마다 두 마디 · 첫 마디는 at 에 · 둘째 마디는 end 에 맞춰 끝난다(엔진이 속도를 따를 때)", () => {
    const r = rig({ engineSps: DEFAULT_PACE });
    const endTimes: number[] = [];
    r.guide.setVolume(0.8);
    r.guide.start(0);
    r.playTo(29);
    expect(texts(r.spoken)).toEqual(GUIDE_LINES.flatMap((l) => [...l.phrases]));
    for (const u of r.spoken) {
      expect(u.lang).toBe("ko-KR");
      expect(u.voice).toBe(r.voice);
      expect(u.rate).toBeGreaterThanOrEqual(MIN_RATE);
      expect(u.rate).toBeLessThanOrEqual(1);
      expect(u.volume).toBeCloseTo(0.8 * GUIDE_VOLUME_RATIO);
    }
    expect(r.guide.playing).toBe(false);
    expect(r.states).toEqual([true, false]);
    void endTimes;
  });

  it("★끝 시각 맞추기 — 둘째 마디 끝이 end 에서 ±0.3초 · 크롬처럼 속도를 못 낮추는 엔진이어도(쉼이 메운다)", () => {
    for (const [sps, honorsRate] of [[6.5, true], [6.5, false], [5.5, true], [8, false]] as const) {
      const r = rig({ engineSps: sps, honorsRate });
      r.guide.start(0);
      r.playTo(29);
      expect(r.spoken).toHaveLength(6);
      GUIDE_LINES.forEach((l, k) => {
        const first = r.endedAt.get(r.spoken[k * 2])!;
        const second = r.endedAt.get(r.spoken[k * 2 + 1])!;
        // 쉼이 범위 안이면 끝 시각을 지킨다 — 범위를 넘을 만큼 빠르거나 느린 엔진은 쉼 한도에서 멈춘다
        const gap = second - first - (syllables(l.phrases[1]) / (sps * (honorsRate ? r.spoken[k * 2 + 1].rate : Math.max(r.spoken[k * 2 + 1].rate, 0.9))));
        if (gap > MIN_GAP + 0.1 && gap < MAX_GAP - 0.1) expect(Math.abs(second - l.end)).toBeLessThan(0.3);
        expect(gap).toBeGreaterThanOrEqual(MIN_GAP - 0.06);
        expect(gap).toBeLessThanOrEqual(MAX_GAP + 0.06);
      });
    }
  });

  it("빠르기를 재서 고쳐 간다 — 엔진이 더 빠르면 pace 가 오르고 저장 알림", () => {
    const r = rig({ pace: 5, engineSps: 7, honorsRate: true });
    r.guide.start(0);
    r.playTo(8);
    expect(r.paces.length).toBeGreaterThan(0);
    expect(r.guide.pace).toBeGreaterThan(5);
  });

  it("첫 줄을 한참 지나 시작하면 이번 바퀴는 기다렸다가 다음 바퀴 처음부터", () => {
    const r = rig();
    r.guide.start(5);
    r.playTo(30.2, 5);
    expect(r.spoken).toHaveLength(0);
    r.playTo(31.5, 30.2); // 되감겨 0.0~1.25
    expect(texts(r.spoken)).toEqual([GUIDE_LINES[0].phrases[0]]);
  });

  it("멈추기 = 음성 비움 · 쉼 · 그 뒤 시간이 흘러도 읽지 않음 · 늦게 온 끝 알림 무시", () => {
    const r = rig();
    r.guide.start(0);
    r.playTo(1.0);
    expect(r.spoken).toHaveLength(1);
    r.guide.stop();
    expect(r.cancels()).toBeGreaterThan(0);
    expect(r.guide.playing).toBe(false);
    r.playTo(12, 1.0);
    expect(r.spoken).toHaveLength(1);
  });

  it("되감기면 남은 문장은 버리고, 읽던 마디가 끝나면 쉰다", () => {
    const r = rig();
    r.guide.start(0);
    r.playTo(1.5);
    expect(r.guide.playing).toBe(true); // 첫 마디 읽는 중
    r.guide.tick(0.1); // 1.5 → 0.1 되감김
    r.playTo(12, 1.5);
    expect(r.spoken).toHaveLength(1);
    expect(r.guide.playing).toBe(false);
  });

  it("음량 바꾸면 다음 마디부터", () => {
    const r = rig();
    r.guide.setVolume(1);
    r.guide.start(0);
    r.playTo(1.0);
    r.guide.setVolume(0.4);
    r.playTo(7, 1.0);
    expect(r.spoken[0].volume).toBeCloseTo(GUIDE_VOLUME_RATIO);
    expect(r.spoken[1].volume).toBeCloseTo(0.4 * GUIDE_VOLUME_RATIO);
  });
});

describe("★삼켜진 말(크롬 실측) — 시작 없이 곧바로 끝나면 한 번만 다시", () => {
  function manual() {
    let clock = 0;
    const timers: { at: number; fn: () => void }[] = [];
    const spoken: U[] = [];
    const guide = createMeditationGuide<U>({
      synth: { speak: (u: U) => { spoken.push(u); }, cancel: () => {} },
      makeUtterance: (text) => ({ text, lang: "", rate: 1, pitch: 1, volume: 1, voice: null, onstart: null, onend: null, onerror: null }),
      voice: null,
      now: () => clock,
      later: (fn, ms) => { timers.push({ at: clock + ms, fn }); },
    });
    const advance = (ms: number) => { clock += ms; for (const t of timers.splice(0)) { if (t.at <= clock) t.fn(); else timers.push(t); } };
    return { guide, spoken, advance };
  }
  it("다시 넣은 것도 삼켜지면 더는 안 넣는다", () => {
    const m = manual();
    m.guide.start(0);
    m.guide.tick(0.9);
    m.spoken[0].onend?.();
    m.advance(300);
    expect(texts(m.spoken)).toEqual([GUIDE_LINES[0].phrases[0], GUIDE_LINES[0].phrases[0]]);
    m.spoken[1].onend?.();
    m.advance(300);
    expect(m.spoken).toHaveLength(2);
  });
  it("시작한 말은 짧게 끝나도 다시 넣지 않는다 · 멈춘 뒤엔 다시 넣지 않는다", () => {
    const m = manual();
    m.guide.start(0);
    m.guide.tick(0.9);
    m.spoken[0].onstart?.();
    m.advance(100);
    m.spoken[0].onend?.();
    m.advance(300);
    expect(m.spoken).toHaveLength(1);
    const m2 = manual();
    m2.guide.start(0);
    m2.guide.tick(0.9);
    m2.spoken[0].onend?.();
    m2.guide.stop();
    m2.advance(300);
    expect(m2.spoken).toHaveLength(1);
  });
});
