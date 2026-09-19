import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 소스 가드 — 대화 기기 저장(2026-09-19). jsdom 이 없어 화면 배선은 이 파일이 방어선. 주석은 걷어내고 코드만 본다.
 * 규칙(사용자 확정): 그 폰에만 저장 · 캐릭터별 · 위험 대화는 서버에 다시 안 보냄 · 둘러보기는 저장 안 함 · 로그아웃·전체 파기 = 삭제 · 지우기 단추.
 * ⚠ 뮤테이션(09-19)에서 「guest 글자가 있다」·「clearAllChats 가 2번 이상」 같은 느슨한 단언은 guest 조건 삭제·로그아웃 삭제 제거를 못 잡았다 → 자리를 못박는다.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const app = strip(readFileSync(join(process.cwd(), "src/features/wellness/WellnessApp.tsx"), "utf8"));
const route = strip(readFileSync(join(process.cwd(), "src/app/api/wellness/chat/route.ts"), "utf8"));

describe("WellnessApp — 대화 기기 저장", () => {
  it("저장·불러오기가 chat-store 를 통해서만 localStorage 에 닿는다(키 문자열을 화면에 다시 적지 않는다)", () => {
    expect(app).toMatch(/from "\.\/chat-store"/);
    expect(app).toMatch(/localStorage/);
    expect(app).not.toMatch(/wellness-care:chat/);
  });
  it("서버로 보내는 history 는 historyFor(위험 제외·상한)로 만든다", () => {
    expect(app).toMatch(/history:\s*historyFor\(/);
    expect(app).not.toMatch(/history:\s*historyForServer/);
  });
  it("위험 판정된 질문과 고정 안내 말풍선에 risk 표시가 붙는다", () => {
    expect((app.match(/risk:\s*true/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it("둘러보기(guest)면 저장하지 않는다 — 저장 effect 의 조건에 guest 가 있고 그 뒤에 바로 저장이 온다", () => {
    expect(app).toMatch(/if \(!s\.authed \|\| s\.guest \|\| s\.sheet !== "talk"\) return;\s+writeChatStore\(setCharacterChat\(/);
    expect(app).toMatch(/!st\.guest \? readChatStore\(\)/);
  });
  it("로그아웃·전체 파기가 기기 대화를 지우고(삭제 호출이 그 patch 바로 앞), 대화 화면에 「대화 지우기」·설정에 「이 기기 대화 전부 지우기」가 있다", () => {
    expect(app).toMatch(/writeChatStore\(clearAllChats\(\)\);\s*patch\(\{ authed: false, guest: true,/);
    expect(app).toMatch(/writeChatStore\(clearAllChats\(\)\);\s*patch\(\{ wiped: true \}\);/);
    expect(app).toMatch(/대화 지우기/);
    expect(app).toMatch(/이 기기 대화 전부 지우기/);
  });
  it("대화 화면이 「이 기기에만 저장」임을 말한다", () => {
    expect(app).toMatch(/이 기기에만 저장/);
  });
});

describe("route — history 상한은 chat-store 의 HISTORY_LIMIT 하나", () => {
  it("slice(-20) 같은 숫자를 라우트에 다시 적지 않는다", () => {
    expect(route).toMatch(/HISTORY_LIMIT/);
    expect(route).not.toMatch(/slice\(-20\)/);
  });
});
