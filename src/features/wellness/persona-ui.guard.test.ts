import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 소스 가드 — jsdom 이 없어 화면은 이 파일이 유일한 방어선. 2026-09-19 마음온도 이식 3건.
 * 주석은 걷어내고 코드만 본다(주석에서 이름을 불러도 통과하지 않게).
 */
const src = readFileSync(join(process.cwd(), "src/features/wellness/WellnessApp.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("WellnessApp — 유형 직접 선택", () => {
  it("케어&힐링 카드에 「내 유형 알아요」·「모르겠어요」 두 갈래가 있고 16개 격자는 PERSONA_CODES 로 그린다", () => {
    expect(src).toMatch(/내 유형 알아요/);
    expect(src).toMatch(/모르겠어요/);
    expect(src).toMatch(/PERSONA_CODES\.map\(/);
    expect(src).toMatch(/pickedPersona\(/);
    // 2026-09-22 사용자: 「내 유형 알아요」로 고르면 피드백(결과) 화면 없이 바로 디렉팅으로 — 격자 클릭이 personaResult 를 열지 않는다
    expect(src).toMatch(/personaDone: pickedPersona\(code\), sheet: null/);
    expect(src).not.toMatch(/pickedPersona\(code\), sheet: "personaResult"/);
    expect(src).toMatch(/done\.source === "picked" \? \{ sheet: "personaPick" \}/);
  });
  it("결과 화면은 기울기(lean)가 있을 때만 막대를 그리고, 「유형 바꾸기」가 있다", () => {
    expect(src).toMatch(/done\.lean\s*(&&|\?)/);
    expect(src).toMatch(/유형 바꾸기/);
    expect(src).not.toMatch(/"테스트로"|"다시 하기"/); // 결과 화면 끝 버튼은 「유형 바꾸기 · 닫기」 둘만(사용자 지시 2026-09-19)
  });
});

describe("WellnessApp — 오늘 해볼 것 · 디렉팅 한 줄 · 도서 링크", () => {
  it("데일리 힐링에 「오늘 해볼 것」 카드가 유형의 todo 를 그린다", () => {
    expect(src).toMatch(/오늘 해볼 것/);
    expect(src).toMatch(/\.todo\.map\(/);
  });
  it("마음카드 디렉팅 뒤에 personaDirecting 한 줄이 붙는다(유형이 있을 때만)", () => {
    expect(src).toMatch(/personaDirecting\(/);
  });
  it("추천 도서는 bookSearchUrl 링크로 새 창", () => {
    expect(src).toMatch(/bookSearchUrl\(/);
    expect(src).toMatch(/target="_blank"/);
  });
});

describe("주간 흐름 박스 — 「월간 기록 보기 ›」 + 그 밑 「데일리케어 바로가기」·「디렉팅 바로가기」(2026-09-22 사용자 지시)", () => {
  it("월간은 sheet month · 바로가기 둘은 tab care / tab healing · 옛 「케어 가기」·「케어&힐링 가기」는 없다", () => {
    const i = src.indexOf("월간 기록 보기 ›");
    expect(i).toBeGreaterThan(0);
    const block = src.slice(src.lastIndexOf("renderWeekFlow(", i), src.indexOf("디렉팅 바로가기 ›", i) + 20);
    expect(block).toMatch(/sheet: "month"/);
    expect(block).toMatch(/patch\(\{ tab: "care" \}\)\} style=[^>]*>데일리케어 바로가기 ›/);
    expect(block).toMatch(/patch\(\{ tab: "healing" \}\)\} style=[^>]*>디렉팅 바로가기 ›/);
    expect(src).not.toMatch(/케어 가기|케어&힐링 가기/);
  });
});

describe("홈 웰컴 문장(30문장 카드) — 인사말과 균형(2026-09-21 사용자 지시 '조금 더 진하고 크게')", () => {
  it("글자 15px 이상 · 굵기 600 이상 · 인사말과 같은 진한 색", () => {
    const m = src.match(/<div style=\{sx\("([^"]*white-space:pre-line[^"]*)"\)\}>\{homeMessage\}/);
    expect(m).not.toBeNull();
    const css = m![1];
    const size = Number(/font-size:([\d.]+)px/.exec(css)?.[1]);
    const weight = Number(/font-weight:(\d+)/.exec(css)?.[1]);
    expect(size).toBeGreaterThanOrEqual(15);
    expect(weight).toBeGreaterThanOrEqual(600);
    expect(css).toMatch(/color:#2d5c6e/);
  });
});

// 2026-09-21 사용자 지시: 홈 = 「오늘의 기록」까지만 · 케어(신체·마음 카드 둘) 한 페이지 · 데일리 힐링 한 페이지. 나머지(주간 흐름·날씨·운동 제안)가 들어갈 페이지는 다음 단계.
describe("페이지 분할 — 홈은 오늘의 기록까지 · 케어 · 디렉팅(데일리 힐링) 탭", () => {
  const fn = (name: string) => {
    const a = src.indexOf(`function ${name}(`);
    expect(a, name).toBeGreaterThan(0);
    const b = src.indexOf("\n  function ", a + 10);
    return src.slice(a, b < 0 ? undefined : b);
  };
  it("탭은 home · care · healing · my 넷이고 라벨은 홈·데일리 케어·디렉팅·my(2026-09-22 케어→데일리 케어)", () => {
    expect(src).toMatch(/tab: "home" \| "care" \| "healing" \| "my"/);
    const tabs = fn("renderTabs");
    expect(tabs).toMatch(/tab\("care", "데일리 케어"/);
    expect(tabs).toMatch(/tab\("healing", "디렉팅"/);
    expect(tabs).not.toMatch(/"daily"|케어&힐링/);
  });
  // 2026-09-21 사용자 2차 지시: "그래프는 오늘 하루도 고생 많으셨어요 페이지(홈)에, 제안과 운동 4가지는 케어 페이지에".
  it("홈 = 오늘의 기록 + 주간 흐름 그래프 — 날씨·운동 제안은 없다(케어로 갔다)", () => {
    const home = fn("renderHome");
    expect(home).toMatch(/오늘의 기록/);
    expect(home).toMatch(/renderWeekFlow\(/);
    expect(home).not.toMatch(/buildDaySolution\(|v\.choices\.map/);
    expect(src).not.toMatch(/renderHomeMore/); // 대기 코드는 다 제자리를 찾았다
  });
  it("케어 페이지 = 신체·마음 카드 둘 + 날씨 + 운동 N가지 제안 · 데일리 힐링 페이지 = 힐링 카드 — 서로 섞이지 않는다", () => {
    const care = fn("renderCare");
    expect(care).toMatch(/신체 건강 케어/);
    expect(care).toMatch(/마음 건강 케어/);
    expect(care).toMatch(/buildDaySolution\(/);
    expect(care).toMatch(/v\.choices\.map/);
    // 2026-09-21 사용자 3차 지시: 「신체 건강 케어 + 운동 N가지 제안」이 한 박스, 「마음 건강 케어」가 한 박스.
    // → 순서 = 신체 제목 → 제안(선택지) → 마음 제목. 신체 박스 안에서 library 로 가는 클릭은 머리줄에만.
    const a = care.indexOf("신체 건강 케어"), b = care.indexOf("v.choices.map"), c = care.indexOf("마음 건강 케어");
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(care).toMatch(/data-box="physical"/);
    expect(care).toMatch(/data-box="mind"/);
    // 신체 박스 하나 안에 제안이 있다 = physical 여는 자리와 mind 여는 자리 사이에 choices 가 있다
    const p = care.indexOf('data-box="physical"'), m = care.indexOf('data-box="mind"');
    expect(p).toBeLessThan(b);
    expect(b).toBeLessThan(m);
    // 2026-09-21 사용자 5차 지시: 신체 박스 부제 「신체건강을 위한 간단한 운동 · N가지」 → 누르는 칩 「더 다양한 운동 N가지를 해보세요」(→ 운동 목록).
    const physBox = care.slice(p, m);
    expect(physBox).not.toMatch(/간단한 운동/);
    expect(physBox).toMatch(/더 다양한 운동 \{v\.libList\.length\}가지를 해보세요/);
    expect(physBox).toMatch(/onClick=\{\(\) => patch\(\{ sheet: "library" \}\)\}[^\n]*더 다양한 운동/);
    // 2026-09-21 사용자 4차 지시: 「데일리케어」 제목 삭제 · 날씨 한 줄(온도·산책하기 좋은 날) 삭제 · 마음 박스에 칩 둘.
    expect(care).not.toMatch(/데일리케어/);
    expect(care).not.toMatch(/wx\.label|wx\.note|wx\.dot/);
    const mindBox = care.slice(m);
    expect(mindBox).toMatch(/오늘, 어떤 하루였나요\?/);
    expect(mindBox).toMatch(/오늘의 마음카드/);
    expect(mindBox).toMatch(/sheet: "picture"/); // 마음카드 칩은 바로 그림 고르기로
    expect(mindBox).toMatch(/sheet: "mind"/);    // 대화 칩은 상대 고르기(마음 건강 시트)로
    expect(care).not.toMatch(/renderPersonaCard\(|renderTodoCard\(|나를 위한 디렉팅/);
    const healing = fn("renderHealing");
    // 2026-09-21 사용자 지시: 제목 「데일리 힐링」 → 「나를 위한 디렉팅」(일단 제목만).
    expect(healing).toMatch(/>나를 위한 디렉팅</);
    expect(healing).not.toMatch(/>데일리 힐링</);
    // 2026-09-21 마음온도 「피드백」 이식 — 디렉팅 페이지는 탭 7개(마음 성향·TO do it·추천 음악·메이크업·코디·문장·산책)에 한 페이지씩.
    // 2026-09-21 사용자 정정 "칩을 만들지 말고 마음 성향 박스 아래 탭으로 · 수직 배열" → 마음 성향 카드는 항상 위 · 그 아래 세로 줄 6개(누르면 그 아래 펼침).
    expect(healing).not.toMatch(/data-dir-tab|overflow-x:auto/);
    const rowsFn = fn("directingRows"); // 줄 목록은 헬퍼 하나 — 목록 화면과 페이지가 같이 쓴다(2026-09-22)
    for (const id of ["todo", "music", "makeup", "outfit", "sentences", "walk"]) expect(rowsFn, id).toContain(`{ id: "${id}"`);
    expect(rowsFn).not.toContain(`{ id: "persona"`);
    expect(healing).toMatch(/directingRows\(\)/);
    expect(healing).toMatch(/\{renderPersonaCard\(\)\}/);
    // 2026-09-22 사용자 "탭을 누르면 아예 새로운 페이지에서" → 줄을 누르면 sheet "directing"(전체 화면 · ‹ 로 복귀) · 본문은 renderDirectingBody 한 곳.
    expect(healing).toMatch(/data-dir-row=\{x\.id\} onClick=\{\(\) => patch\(\{ dirTab: x\.id, sheet: "directing" \}\)\}/);
    expect(healing).toMatch(/flex-direction:column/); // 세로 배열
    expect(healing).not.toMatch(/renderTodoCard\(|renderMusicCard\(|renderMakeupTab\(|renderOutfitTab\(|renderSentencesTab\(|renderWalkTab\(/); // 목록 화면엔 본문이 없다
    expect(src).toMatch(/s\.sheet === "directing" && renderDirectingSheet\(\)/);
    const body = fn("renderDirectingBody");
    expect(body).toMatch(/id === "todo"\) return renderTodoCard\(\)/);
    expect(body).toMatch(/id === "music"\) return <>\{renderMusicCard\(\)\}\{renderBooksCard\(\)\}<\/>/);
    // 2026-09-22 사용자 "전부 성별 나이는 물어야" → 여섯 페이지 전부 프로필이 없으면 프로필 화면부터 · 목록에 「내 프로필」 카드
    expect(body).toMatch(/if \(!s\.dirProfile\) return renderProfilePick\(\);/);
    expect(body).toMatch(/id === "makeup"\) return renderMakeupTab\(s\.dirProfile\)/);
    expect(body).toMatch(/id === "outfit"\) return renderOutfitTab\(s\.dirProfile\)/);
    expect(healing).toMatch(/data-profile-card/);
    expect(healing).toMatch(/renderProfilePick\(\)/);
    expect(body).toMatch(/id === "sentences"\) return renderSentencesTab\(\)/);
    expect(body).toMatch(/return renderWalkTab\(\)/);
    expect(fn("renderDirectingSheet")).toMatch(/onClick=\{\(\) => patch\(\{ sheet: null \}\)\}[^\n]*‹/);
    expect(src).toContain('label: "오늘의 추천음악&추천도서"');
    expect(fn("renderBooksCard")).toMatch(/t\.books\.map\(/);
    expect(fn("renderBooksCard")).toMatch(/bookSearchUrl\(b\)/);
    // 유형 전에도 여섯 줄 전부 열린다(잠금 없음)
    expect(healing).not.toMatch(/opacity: done|if \(!done\) return/);
    // 유형이 꼭 필요한 TO do it 만 안내 · 유형은 기기에 저장(마운트 로드 · 바뀔 때 저장 · 설정 「유형 바꾸기/지우기」 · 전체 파기 포함)
    expect(fn("renderTodoCard")).toMatch(/내 유형을 먼저 골라 주세요/);
    expect(src).toMatch(/parsePersonaDone\(window\.localStorage\.getItem\(PERSONA_STORE_KEY\)\)/);
    expect(src).toMatch(/setItem\(PERSONA_STORE_KEY, serializePersonaDone\(s\.personaDone\)\)/);
    expect(fn("renderSettings")).toMatch(/유형 지우기/);
    expect(fn("renderSettings")).toMatch(/removeItem\(PERSONA_STORE_KEY\)[\s\S]{0,400}wiped: true/);
    // 규칙은 화면에서 다시 적지 않는다 — 순수 모듈 호출만
    expect(src).toMatch(/pickMakeup\(profile\.gender, ans as MakeupAnswers\)/);
    expect(src).toMatch(/outfitCards\(\{ temperature, weatherCode, gender: profile\.gender, ageBand: profile\.ageBand, mbti \}\)/);
    expect(src).toMatch(/sentencesFor\(input\)/);
    expect(src).toMatch(/WALK_COURSES\.map\(/);
    expect(healing).not.toMatch(/신체 건강 케어|마음 건강 케어/);
    expect(src).toMatch(/s\.tab === "care" && renderCare\(\)/);
    expect(src).toMatch(/s\.tab === "healing" && renderHealing\(\)/);
    expect(src).not.toMatch(/function renderDaily\(/);
  });
});

describe("추천 음악 — 채널 셋 · 서버 목록(2026-09-19)", () => {
  it("고정 상수(MUSIC_EMBED)는 사라지고, 라우트에서 목록을 받아 MUSIC_CHANNELS 칩으로 그린다", () => {
    expect(src).not.toMatch(/MUSIC_EMBED/);
    expect(src).toMatch(/fetch\("\/api\/wellness\/music"\)/);
    expect(src).toMatch(/MUSIC_CHANNELS\.map\(/);
    expect(src).toMatch(/embedSrc\(ids\)/);
    expect(src).not.toMatch(/autoplay=1/);
  });
  it("자리 = 성향 결과 2/2 의 추천 도서 카드 바로 아래(2026-09-19 사용자 지시) — 데일리 힐링 카드 목록에는 없다", () => {
    const books = src.indexOf(">추천 도서</div>");
    const call = src.indexOf("{renderMusicCard()}", books); // 디렉팅 페이지(renderDirectingBody)에도 같은 호출이 있어 도서 뒤에서 찾는다(2026-09-22)
    expect(books).toBeGreaterThan(0);
    expect(call).toBeGreaterThan(books);
    expect(call - books).toBeLessThan(900);
    // 2026-09-21: 「추천 음악」은 디렉팅 탭(renderHealing 의 tab === "music")에서도 그린다 — 마음 성향·TO do it 카드 안에는 여전히 없다.
    const healing = src.slice(src.indexOf("function renderPersonaCard()"), src.indexOf("function renderPersonaPick()"));
    expect(healing).not.toMatch(/renderMusicCard|MUSIC_CHANNELS/);
  });
});

describe("운동 제안 제목 — 요일·시각 규칙은 suggestion.ts 한 곳(2026-09-19)", () => {
  it("화면에서 제목을 따로 고치지 않는다(「퇴근 전」 replace 없음)", () => {
    expect(src).not.toMatch(/replace\(\/\^퇴근 전 \//);
  });
});

// 2026-09-22 사용자 지시: 「마음과 대화」 → 「오늘, 어떤 하루였나요?」 · 캐릭터 고르고 들어간 대화 화면엔 탭 줄 없음.
describe("마음 건강 — 이름은 「오늘, 어떤 하루였나요?」 하나 · 대화 화면엔 탭 줄 없음", () => {
  it("화면 코드 어디에도 「마음과 대화」 글자가 없다", () => {
    expect(src).not.toMatch(/마음과 대화/);
  });
  it("대화 화면(chatRef 가 있는 블록) 머리줄에 「오늘의 마음카드」 탭이 없다", () => {
    const i = src.indexOf("ref={chatRef}");
    expect(i).toBeGreaterThan(0);
    const head = src.slice(src.lastIndexOf("animation:wFade 0.2s", i), i);
    expect(head).not.toMatch(/오늘의 마음카드/);
    expect(head).not.toMatch(/sheet: "picture"/);
    expect(head).toMatch(/sheet: "mind"/); // 돌아가는 길(‹)은 남는다
  });
});
