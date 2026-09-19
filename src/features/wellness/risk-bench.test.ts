import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { riskLevel } from "./risk";

/**
 * 위험어 판정 회귀 시험지 — AI Hub 데이터셋(NIA)에서 뽑은 발화로 재현율·오탐을 잰다.
 * 시험지 JSON 은 재배포 금지 조항 때문에 레포에 넣지 않고 `.bench/`(gitignore) 에 둔다. 없으면 skip.
 *   .bench/wellness_risk.json  { risk: string[], ctrl: string[] }   ← 웰니스 대화 스크립트
 *   .bench/counsel_normal.json { normal: string[], suicidal: string[] } ← 심리상담 데이터
 * 만드는 법: scratchpad `export_bench.py`(세션 임시) — 원본 xlsx·json 이 있으면 어디서든 다시 만들 수 있다.
 * 문턱은 2026-09-19 실측치에서 정했다(웰니스 재현율 54%→보강 목표 75% · 웰니스 대조군 진짜 오탐 3건 · 일반군 오탐율).
 * 🚫 문턱을 내려서 통과시키지 말 것 — 내려야 한다면 그 표현을 빼는 쪽이 맞다.
 */
const BENCH = join(process.cwd(), ".bench");
const has = (f: string) => existsSync(join(BENCH, f));
const load = <T,>(f: string): T => JSON.parse(readFileSync(join(BENCH, f), "utf8")) as T;

// 웰니스 대조군에서 라벨이 다른 의도로 붙었지만 실제로는 위험 진술인 문장(2026-09-19 육안 판정 10건)은 오탐으로 세지 않는다.
const CTRL_ACTUALLY_RISK = /(살고 싶지 않|자살할 것 같|극단적인 생각|자살했을 거|뛰어내리고 싶|왜 살지|살 이유가 없|죽어버리면 이 모든)/;

describe.skipIf(!has("wellness_risk.json"))("riskLevel — 웰니스 스크립트 시험지", () => {
  const { risk, ctrl } = load<{ risk: string[]; ctrl: string[] }>("wellness_risk.json");
  it("자살충동·시도·자해 발화 재현율 75% 이상", () => {
    const hit = risk.filter((t) => riskLevel(t) === 2).length;
    expect(hit / risk.length, `${hit}/${risk.length}`).toBeGreaterThanOrEqual(0.75);
  });
  it("대조군 진짜 오탐 3건 이하(부정문 2 · 타인 일반화 1 — 2026-09-19 기준선)", () => {
    const fp = ctrl.filter((t) => riskLevel(t) === 2 && !CTRL_ACTUALLY_RISK.test(t));
    expect(fp, fp.join(" | ")).toHaveLength(3);
  });
});

describe.skipIf(!has("counsel_normal.json"))("riskLevel — 심리상담 데이터 시험지", () => {
  const { normal, suicidal } = load<{ normal: string[]; suicidal: string[] }>("counsel_normal.json");
  it("일반군 내담자 발화 오탐율 0.15% 이하", () => {
    const fp = normal.filter((t) => riskLevel(t) === 2);
    expect(fp.length / normal.length, `${fp.length}/${normal.length}`).toBeLessThanOrEqual(0.0015);
  });
  it("자살 사고 라벨 발화 재현율 46% 이상(2026-09-19 기준선 60/128 · 09-12 의 48% 는 다른 부분집합)", () => {
    const hit = suicidal.filter((t) => riskLevel(t) === 2).length;
    expect(hit / suicidal.length, `${hit}/${suicidal.length}`).toBeGreaterThanOrEqual(0.46);
  });
});
