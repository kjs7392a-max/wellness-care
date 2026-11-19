import { describe, expect, it } from "vitest";
import { createMeditationGuide, GUIDE_LINES, GUIDE_LOOP_SECONDS, GUIDE_PITCH, GUIDE_RATE, GUIDE_VOLUME_RATIO, pickKoreanVoice, type UtteranceLike } from "./meditation-voice";

type U = UtteranceLike & { onstart: (() => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
function fake() {
  let clock = 0;
  const timers: { at: number; fn: () => void }[] = [];
  const spoken: U[] = [];
  let cancels = 0;
  const synth = { speak: (u: U) => { spoken.push(u); }, cancel: () => { cancels += 1; }, speaking: false, pending: false };
  const states: boolean[] = [];
  const voice = { name: "Yuna", lang: "ko-KR" };
  const guide = createMeditationGuide<U>({
    synth,
    makeUtterance: (text) => ({ text, lang: "", rate: 1, pitch: 1, volume: 1, voice: null, onstart: null, onend: null, onerror: null }),
    voice,
    onChange: (p) => states.push(p),
    now: () => clock,
    later: (fn, ms) => { timers.push({ at: clock + ms, fn }); },
  });
  /** 시계를 ms 만큼 — 그 사이 걸린 지연 작업 실행 */
  const advance = (ms: number) => {
    clock += ms;
    for (const t of timers.splice(0).filter((t) => { if (t.at <= clock) return true; timers.push(t); return false; })) t.fn();
  };
  /** 진짜로 읽고 끝남 — 시작 → (3초) → 끝 */
  const finish = (u: U) => { u.onstart?.(); advance(3000); u.onend?.(); };
  return { guide, spoken, synth, states, voice, cancels: () => cancels, advance, finish };
}
const texts = (us: U[]) => us.map((u) => u.text);

describe("명상룸 음성 안내 — 자막 세 줄(2026-11-19 사용자 지시)", () => {
  it("영상 자막과 같은 말 셋 · 시점은 차례로 · 한 바퀴(10.08초) 안", () => {
    expect(GUIDE_LINES.map((l) => l.text)).toEqual([
      "편안히 앉아 어깨의 힘을 빼세요.",
      "숨을 편하게 쉬며 소리의 여운을 느껴보세요.",
      "생각이 떠오르면 천천히 소리로 돌아오세요.",
    ]);
    const at = GUIDE_LINES.map((l) => l.at);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(at[0]).toBeGreaterThanOrEqual(0);
    expect(at[2]).toBeLessThan(GUIDE_LOOP_SECONDS - 3);
    // 🚫 쉼표 금지 — 줄마다 0.4~0.9초 길어져 셋째 줄이 다음 바퀴 첫 자막까지 넘어갔다(2026-11-19 실측)
    for (const l of GUIDE_LINES) expect(l.text).not.toContain(",");
    // 실측 자막 칸(글자 다 보임 0.21 · 3.42 · 6.83s) 보다 늦지 않게 — 떠오르기 시작할 때 읽는다
    expect(at[1]).toBeGreaterThan(3.04);
    expect(at[1]).toBeLessThanOrEqual(3.42);
    expect(at[2]).toBeGreaterThan(6.42);
    expect(at[2]).toBeLessThanOrEqual(6.83);
  });

  it("잔잔하게 — 느리게·조금 낮게·싱잉볼보다 작게", () => {
    expect(GUIDE_RATE).toBeLessThan(1);
    expect(GUIDE_PITCH).toBeLessThanOrEqual(1);
    expect(GUIDE_VOLUME_RATIO).toBeLessThan(1);
  });
});

describe("pickKoreanVoice", () => {
  it("한국어만 · 유나 > Google > 그 밖 · 장난 목소리는 뒤로", () => {
    const v = (name: string, lang = "ko-KR") => ({ name, lang });
    expect(pickKoreanVoice([v("Samantha", "en-US"), v("Google 한국의"), v("Yuna")])?.name).toBe("Yuna");
    expect(pickKoreanVoice([v("Grandpa (한국어(대한민국))"), v("Rocko (한국어(대한민국))"), v("Google 한국의")])?.name).toBe("Google 한국의");
    expect(pickKoreanVoice([v("Microsoft Heami"), v("Microsoft SunHi Online (Natural) - Korean (Korea)")])?.name).toMatch(/SunHi/);
    expect(pickKoreanVoice([v("Grandma", "ko-KR")])?.name).toBe("Grandma"); // 하나뿐이면 그거라도
    expect(pickKoreanVoice([v("ko voice", "ko_KR")])?.name).toBe("ko voice");
  });
  it("한국어 목소리가 없으면 null — 다른 말 목소리로 한국어를 읽히지 않는다", () => {
    expect(pickKoreanVoice([{ name: "Samantha", lang: "en-US" }])).toBeNull();
    expect(pickKoreanVoice([])).toBeNull();
  });
});

describe("createMeditationGuide — 영상 시간에 맞춰 한 바퀴", () => {
  it("처음부터: 자막 시점마다 한 줄씩 · 목소리·속도·높이·음량", () => {
    const f = fake();
    f.guide.setVolume(0.8);
    f.guide.start(0);
    expect(f.guide.playing).toBe(true);
    f.guide.tick(0.05);
    expect(f.spoken).toHaveLength(0);
    f.guide.tick(0.3);
    expect(texts(f.spoken)).toEqual([GUIDE_LINES[0].text]);
    f.guide.tick(2.9);
    expect(f.spoken).toHaveLength(1);
    f.guide.tick(3.3);
    f.guide.tick(6.7);
    expect(texts(f.spoken)).toEqual(GUIDE_LINES.map((l) => l.text));
    for (const u of f.spoken) {
      expect(u.lang).toBe("ko-KR");
      expect(u.voice).toBe(f.voice);
      expect(u.rate).toBe(GUIDE_RATE);
      expect(u.pitch).toBe(GUIDE_PITCH);
      expect(u.volume).toBeCloseTo(0.8 * GUIDE_VOLUME_RATIO);
    }
  });

  it("세 줄 다 읽은 뒤(끝 알림) 쉰다 · 다음 바퀴엔 다시 읽지 않는다(한 번만)", () => {
    const f = fake();
    f.guide.start(0);
    [0.2, 3.3, 6.7].forEach((t) => f.guide.tick(t));
    f.finish(f.spoken[0]);
    f.finish(f.spoken[1]);
    expect(f.guide.playing).toBe(true);
    f.finish(f.spoken[2]);
    expect(f.guide.playing).toBe(false);
    expect(f.states).toEqual([true, false]);
    [9.9, 0.1, 0.3, 3.3, 6.7].forEach((t) => f.guide.tick(t));
    expect(f.spoken).toHaveLength(3);
  });

  it("첫 줄을 한참 지나 시작하면 이번 바퀴는 기다렸다가 다음 바퀴 처음부터 세 줄", () => {
    const f = fake();
    f.guide.start(2);
    expect(f.guide.playing).toBe(true);
    [3.3, 6.7, 9.9].forEach((t) => f.guide.tick(t));
    expect(f.spoken).toHaveLength(0);
    [0.1, 0.3, 3.3, 6.7].forEach((t) => f.guide.tick(t));
    expect(texts(f.spoken)).toEqual(GUIDE_LINES.map((l) => l.text));
  });

  it("멈추기 = 음성 비움 · 쉼 · 그 뒤 시간이 흘러도 읽지 않음 · 늦게 온 끝 알림은 무시", () => {
    const f = fake();
    f.guide.start(0);
    f.guide.tick(0.3);
    f.guide.stop();
    expect(f.cancels()).toBeGreaterThan(0);
    expect(f.guide.playing).toBe(false);
    [3.3, 6.7].forEach((t) => f.guide.tick(t));
    expect(f.spoken).toHaveLength(1);
    // 다시 듣기 — 앞 바퀴의 늦은 끝 알림이 새 바퀴를 끝내면 안 된다
    f.guide.start(0);
    f.guide.tick(0.3);
    f.finish(f.spoken[0]);
    expect(f.guide.playing).toBe(true);
  });

  it("다 읽기 전에 바퀴가 넘어가면(되감김) 남은 줄은 버린다 — 자막과 어긋난 말 금지", () => {
    const f = fake();
    f.guide.start(0);
    f.guide.tick(0.3);
    f.guide.tick(2.0);
    f.guide.tick(0.2); // 둘째 줄 전에 처음으로 돌아갔다
    [3.3, 6.7].forEach((t) => f.guide.tick(t));
    expect(texts(f.spoken)).toEqual([GUIDE_LINES[0].text]);
    expect(f.guide.playing).toBe(true); // 첫 줄을 읽는 중
    f.finish(f.spoken[0]);
    expect(f.guide.playing).toBe(false);
  });

  it("음량 바꾸면 다음 줄부터 반영", () => {
    const f = fake();
    f.guide.setVolume(1);
    f.guide.start(0);
    f.guide.tick(0.3);
    f.guide.setVolume(0.4);
    f.guide.tick(3.3);
    expect(f.spoken[0].volume).toBeCloseTo(GUIDE_VOLUME_RATIO);
    expect(f.spoken[1].volume).toBeCloseTo(0.4 * GUIDE_VOLUME_RATIO);
  });

  it("★삼켜진 말(시작 없이 곧바로 끝남 · 크롬 실측) — 한 번만 다시 넣는다 · 진짜로 다 읽은 말은 다시 안 읽음", () => {
    const f = fake();
    f.guide.start(0);
    f.guide.tick(0.3);
    f.spoken[0].onend?.(); // 시작 없이 바로 끝 = 삼켜짐
    expect(f.spoken).toHaveLength(1);
    f.advance(300);
    expect(texts(f.spoken)).toEqual([GUIDE_LINES[0].text, GUIDE_LINES[0].text]);
    expect(f.guide.playing).toBe(true);
    f.spoken[1].onend?.(); // 다시 넣은 것도 삼켜지면 더는 안 넣는다(무한 반복 금지)
    f.advance(300);
    expect(f.spoken).toHaveLength(2);
    // 남은 두 줄은 제때 읽고, 다 끝나면 쉰다(삼켜진 줄 몫이 남아 '읽는 중'에 갇히지 않는다)
    f.guide.tick(3.3);
    f.guide.tick(6.7);
    expect(texts(f.spoken).slice(2)).toEqual([GUIDE_LINES[1].text, GUIDE_LINES[2].text]);
    f.finish(f.spoken[2]);
    f.finish(f.spoken[3]);
    expect(f.guide.playing).toBe(false);
  });

  it("삼켜진 뒤 다시 넣기 전에 멈추면 다시 넣지 않는다", () => {
    const f = fake();
    f.guide.start(0);
    f.guide.tick(0.3);
    f.spoken[0].onend?.();
    f.guide.stop();
    f.advance(300);
    expect(f.spoken).toHaveLength(1);
  });

  it("시작한 말은 짧게 끝나도 다시 넣지 않는다(같은 말 두 번 금지)", () => {
    const f = fake();
    f.guide.start(0);
    f.guide.tick(0.3);
    f.spoken[0].onstart?.();
    f.advance(100);
    f.spoken[0].onend?.();
    f.advance(300);
    expect(f.spoken).toHaveLength(1);
  });
});

