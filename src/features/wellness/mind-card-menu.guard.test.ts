import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 2026-11-20 사용자 지시 — 오늘의 마음카드에서 「빗속의 나」 섹션 삭제(그림 테스트만 남김)
const menu = readFileSync(join(__dirname, "MindCardMenu.tsx"), "utf8").replace(/^\s*\/\/.*$/gm, "");
const app = readFileSync(join(__dirname, "WellnessApp.tsx"), "utf8");

describe("오늘의 마음카드 — 빗속의 나 없음", () => {
  it("🚫 메뉴에 빗속의 나(빗속의 사람 테스트)가 없다 · 그림 테스트는 그대로", () => {
    expect(menu).not.toMatch(/빗속의 나|빗속의 사람|rain-story\/umbrella|onRain/);
    expect(menu).toMatch(/그림으로 보는 마음/);
    expect(menu).not.toMatch(/두 가지 방법|다른 테스트도/);
  });
  it("🚫 앱에서 빗속의 나 화면으로 들어가는 길이 없다", () => {
    expect(app).not.toMatch(/sheet: "rain"/);
    expect(app).not.toMatch(/onRain=/);
  });
});
