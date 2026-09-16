import { describe, expect, it } from "vitest";
import { buildDaySolution, parqNotice, type DaySolutionArgs } from "./daySolution";
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

describe("buildDaySolution — 안전 확인 낮은 강도", () => {
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

  // 대조군 — 위 가드들이 문구를 통째로 죽인 게 아니라는 확인(날씨 문구는 여전히 본문에 들어간다).
  it("실내를 권하는 날씨면 평소 강도에서도 체감 문구가 들어간다", () => {
    const withFeels = allCases(false).filter((c) => buildDaySolution({ ...c, weatherPrefer: "indoor" }).includes("체감 25°"));
    expect(withFeels.length).toBeGreaterThan(0);
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

describe("parqNotice — 안전 확인 안내가 온보딩에서 끝나지 않게", () => {
  it("「예」가 하나도 없으면 아무것도 안 붙인다", () => {
    expect(parqNotice(0)).toBeNull();
  });

  it("1단계(조심)면 낮은 강도라는 사실과 상담 안내를 함께 말한다", () => {
    const txt = parqNotice(1);
    expect(txt).toContain("낮은 강도");
    expect(txt).toContain("주치의");
  });

  // 2026-09-16: 단계는 safety-screen.ts 가 문항 성격으로 정한다(개수 아님). 여기는 단계별 안내가 갈리는지만 본다.
  it("1단계와 2단계의 안내가 다르다", () => {
    expect(parqNotice(1)).not.toBe(parqNotice(2));
  });

  it("2단계(징후)면 숨 고르기만 내놓는다고 말하고, 상담을 더 강하게 권한다", () => {
    const txt = parqNotice(2)!;
    expect(txt).toContain("숨 고르기");
    expect(txt).toContain("꼭 먼저 상의");
  });
});

describe("buildDaySolution — 마무리 문장은 부위를 말하지 않는다", () => {
  // 마무리 문장은 세 직군이 공유한다. 거기서 「어깨」라고 말하면 행정(허리)·영양(다리) 제안과 어긋난다.
  // 직군만 바꾼 세 문장의 **공통 꼬리**가 곧 마무리 문장이므로, 거기에 부위 이름이 없어야 한다.
  const PARTS = ["어깨", "허리", "다리", "종아리", "손목", "눈", "목"];
  const commonSuffix = (xs: string[]) => {
    let n = 0;
    while (n < Math.min(...xs.map((x) => x.length)) && new Set(xs.map((x) => x[x.length - 1 - n])).size === 1) n++;
    return xs[0].slice(xs[0].length - n);
  };

  it("모든 조합에서 공통 꼬리에 부위 이름이 없다", () => {
    for (const low of [false, true]) {
      for (const slot of [0, 1, 2]) {
        for (const isWeekend of [false, true]) {
          for (const weatherPrefer of PREFERS) {
            const xs = ROLES.map((role) => buildDaySolution({ role, slot, isWeekend, low, weatherPrefer, feelsTxt: "체감 25°" }));
            const tail = commonSuffix(xs);
            for (const part of PARTS) {
              expect(tail, `low=${low}/slot${slot}/${isWeekend ? "주말" : "평일"}/${weatherPrefer} → ${tail}`).not.toContain(part);
            }
          }
        }
      }
    }
  });
});

describe("buildDaySolution — 카드 안에서 서로 다른 말을 하지 않게 (2026-09-13 사용자 지적)", () => {
  // ① 이 문구 바로 아래 버튼은 늘 「몸풀기(스트레칭)」다. 본문이 걷기를 권하면 한 카드가 두 가지를 말한다.
  it("어느 강도에서도 걷기·산책을 권하지 않는다", () => {
    for (const low of [false, true]) {
      for (const c of allCases(low)) {
        const txt = buildDaySolution(c);
        for (const w of ["걸어", "걷고", "산책"]) {
          expect(txt, `low=${low}/${c.role}/slot${c.slot}/${c.isWeekend ? "주말" : "평일"}/${c.weatherPrefer} → ${txt}`).not.toContain(w);
        }
      }
    }
  });

  // ② 한 편은 1분이고 영상도 1분에서 멈춘다. 본문이 3·5·10분을 말하면 앱이 못 지키는 약속이 된다.
  it("1분 말고 다른 시간을 말하지 않는다", () => {
    for (const low of [false, true]) {
      for (const c of allCases(low)) {
        const txt = buildDaySolution(c);
        const mins = txt.match(/\d+\s*분/g) ?? [];
        for (const m of mins) {
          expect(m.replace(/\s/g, ""), `low=${low}/${c.role}/slot${c.slot} → ${txt}`).toBe("1분");
        }
      }
    }
  });
});
