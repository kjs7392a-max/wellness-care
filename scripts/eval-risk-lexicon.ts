/**
 * 위험어 판정(riskLevel) 평가 하네스 — AI Hub 「심리상담 데이터」 내담자 발화로.
 *
 * 실행: node --experimental-strip-types scripts/eval-risk-lexicon.ts <jsonl 폴더>
 *   폴더에 suicidal.jsonl(자살 사고 라벨) · normal.jsonl(일반군) · heavy.jsonl(우울감 라벨) — 한 줄에 발화 하나(JSON 문자열).
 *   원본 데이터는 저장소 밖(다운로드 폴더)에 두고, 추출본도 스크래치패드에만 둔다. 🚫 발화를 저장소에 넣지 말 것.
 *
 * 보는 것: suicidal 재현율(놓친 것 = 미탐), normal 오탐률(가벼운 말을 위험으로), heavy 오탐률.
 * 미탐·오탐 목록을 찍어 사전(RISK_PHRASES 등)을 고칠 근거로 쓴다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { riskLevel } from "../src/features/wellness/risk.ts";

const dir = process.argv[2];
if (!dir) { console.error("usage: node --experimental-strip-types scripts/eval-risk-lexicon.ts <dir>"); process.exit(2); }
const load = (name: string): string[] => readFileSync(join(dir, name), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as string);

const sui = load("suicidal.jsonl");
const normal = load("normal.jsonl");
const heavy = load("heavy.jsonl");

const hit = (arr: string[]) => arr.filter((t) => riskLevel(t) === 2);
const suiHit = hit(sui), normalHit = hit(normal), heavyHit = hit(heavy);

console.log(`suicidal  ${suiHit.length}/${sui.length} 검출 (재현율 ${(100 * suiHit.length / sui.length).toFixed(1)}%)`);
console.log(`normal    ${normalHit.length}/${normal.length} 오탐 (${(100 * normalHit.length / normal.length).toFixed(3)}%)`);
console.log(`heavy     ${heavyHit.length}/${heavy.length} 위험 판정 (${(100 * heavyHit.length / heavy.length).toFixed(2)}%)`);

const show = (title: string, arr: string[], n = 40) => { console.log(`\n== ${title} (${arr.length})`); for (const t of arr.slice(0, n)) console.log(" -", t.slice(0, 110)); };
if (process.argv.includes("--miss")) show("suicidal 미탐", sui.filter((t) => riskLevel(t) !== 2), 200);
if (process.argv.includes("--fp")) { show("normal 오탐", normalHit, 60); show("heavy 위험 판정", heavyHit, 60); }
