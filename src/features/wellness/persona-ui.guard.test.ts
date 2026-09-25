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

// 2026-09-22 사용자 확정 「나」 = 이어 말하기 — 말로 묻고 답은 글로.
describe("음성 입력 — 마이크는 지원할 때만 · 판정은 speech.ts 한 곳 · 답을 읽어 주지 않는다", () => {
  it("micOk 일 때만 마이크를 그리고, 누르면 toggleMic", () => {
    expect(src).toMatch(/\{s\.micOk && \(/);
    expect(src).toMatch(/onClick=\{toggleMic\}/);
  });
  it("판정은 speech.ts 를 쓴다 — 화면이 다시 적지 않는다", () => {
    for (const fn of ["speechSupport(", "recognitionCtor(", "shouldSend(", "heardSince(", "mergeHeard(", "dropSentPrefix(", "sendDelay(", "steadyText(", "shouldResume(", "micHint(", "SILENT_STOP_MS"]) {
      expect(src, fn).toContain(fn);
    }
  });
  it("답이 온 뒤 다시 듣는 판단은 shouldResume 로만 한다(위험 응답이면 안 듣는다)", () => {
    expect(src).toMatch(/shouldResume\(\{ keepOn: s\.micKeep, riskShown: s\.riskShown \}\)/);
  });
  it("답을 소리로 읽어 주지 않는다 — 마이크가 제 소리를 되받는다", () => {
    expect(src).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/);
  });
});

// 2026-09-22 사용자 "구분이 겹쳐 보인다" → 마음 박스의 둘은 나란한 칩이 아니라 세로 줄 둘.
describe("케어 탭 마음 박스 — 대화·마음카드는 세로 줄 둘(가로 두 칸 금지)", () => {
  it("data-mind-row 두 줄이고 각각 sheet mind / picture 로 간다", () => {
    expect(src).toMatch(/data-mind-row=\{x\.id\}/);
    const i = src.indexOf('data-mind-row');
    const block = src.slice(src.lastIndexOf("flex-direction:column", i) - 200, i);
    expect(block).toMatch(/id: "talk"[\s\S]*sheet: "mind"/);
    expect(block).toMatch(/id: "card"[\s\S]*sheet: "picture", sam: EMPTY_SAM/);
    expect(block).toMatch(/flex-direction:column/);
  });
});

// 2026-09-22 폰에서 두 섹션이 겹쳤다 — flex:1 은 세로가 모자라면 박스를 내용보다 작게 줄인다(넘친 내용이 아래로 흘러나온다).
describe("마음 건강 시트 — 두 섹션은 줄어들지 않는다(flex:1 0 auto)", () => {
  it("min-height:230px 를 가진 두 섹션이 모두 flex:1 0 auto 다", () => {
    const hits = src.match(/flex:1 0 auto; min-height:230px/g) ?? [];
    expect(hits.length).toBe(2);
    expect(src).not.toMatch(/flex:1; min-height:230px/);
  });
});

// 2026-09-22 사용자 "말하고 나면 차단·허용이 계속 나온다" — 마디마다 인식을 새로 시작하면 브라우저가 매번 새 요청으로 본다.
describe("음성 입력 — 마이크는 한 번 열면 끝까지(허용 창이 매번 뜨지 않게)", () => {
  it("continuous 는 true 고, false 로 두지 않는다", () => {
    expect(src).toMatch(/rec\.continuous = true;/);
    expect(src).not.toMatch(/rec\.continuous = false/);
  });
  it("이미 인식기가 있으면 새로 만들지 않고 그것을 다시 start 한다", () => {
    expect(src).toMatch(/if \(recRef\.current\) \{[\s\S]{0,200}recRef\.current\.start\(\)/);
  });
  it("답을 쓰는 동안에도 인식기를 끊지 않는다 — 보내지만 않는다(waitingRef)", () => {
    expect(src).toMatch(/if \(waitingRef\.current\) \{ if \(pauseRef\.current\)/);
    expect(src).toMatch(/waitingRef\.current = true; patch\(\{ mic: "waiting" \}\)/);
  });
});

// 2026-09-25 사용자 "말하면 이어지지 않고 한단어씩 끊겨" — continuous 에서는 단어마다 isFinal 이 와서 그때마다 보냈다.
describe("음성 입력 — 조각마다 보내지 않고 말이 멈추면 한 번에(한 단어씩 끊김 방지)", () => {
  const onresult = src.slice(src.indexOf("rec.onresult ="), src.indexOf("rec.onerror ="));
  it("onresult 안에서 바로 보내지 않는다 — isFinal 은 기다릴 시간(lastFinalRef)을 정하는 데만 쓴다", () => {
    expect(onresult).not.toMatch(/sendRef\.current\(/);
    expect((onresult.match(/isFinal/g) ?? []).length).toBe(1);
    expect(onresult).toMatch(/lastFinalRef\.current = [^;]*isFinal/);
  });
  it("아직 안 보낸 조각은 heardSince 로 잇고 멈춘 뒤(sendDelay) 보낸다", () => {
    expect(onresult).toMatch(/heardSince\(e\.results, sentUpToRef\.current\)/);
    expect(onresult).toMatch(/armSend\(\)/);
    expect(src).toMatch(/function armSend\(\) \{[\s\S]{0,800}sendRef\.current\(said\)[\s\S]{0,40}sendDelay\(lastFinalRef\.current\)\)/);
  });
  it("인식기를 다시 start 할 때마다 newSession — 결과가 0부터라 못 보낸 말은 carry 로 넘긴다", () => {
    expect((src.match(/start\(\); newSession\(\);/g) ?? []).length).toBe(3);
    expect(src).toMatch(/function newSession\(\) \{\s*carryRef\.current = rawRef\.current;\s*sentUpToRef\.current = 0;/);
  });
  it("답을 쓰는 동안 한 말은 버리지 않고, 답이 온 뒤 armSend 로 보낸다", () => {
    expect(src).toMatch(/patch\(\{ mic: "listening" \}\);\s*[^\n]*\n\s*if \(shouldSend\(heardRef\.current\)\) armSend\(\);/);
  });
});

// 2026-09-25 사용자 "말하는 중 글자가 튐" — 화면은 steadyText, 보내는 말은 인식기 그대로.
describe("음성 입력 — 입력칸은 뒷걸음치지 않되 보내는 말은 인식기 그대로", () => {
  it("입력칸은 shownRef(steadyText) · 보내는 말은 heardRef", () => {
    expect(src).toMatch(/shownRef\.current = steadyText\(shownRef\.current, t\);\s*patch\(\{ input: shownRef\.current \}\);/);
    expect(src).toMatch(/const said = heardRef\.current;/);
    expect(src).not.toMatch(/sendRef\.current\(shownRef/);
  });
});

// 2026-09-25 사용자 "졸립다 → 졸립다 자야겠다" — 방금 보낸 말을 안드로이드가 다시 붙여 준다.
describe("음성 입력 — 방금 보낸 말은 떼어 내고 보낸다", () => {
  it("들은 말은 dropSentPrefix(…, lastSentRef.current) 를 거치고, 보낼 때 lastSentRef 를 기억한다", () => {
    expect(src).toMatch(/lastSentRef\.current = sentMemoryAfter\(merged, lastSentRef\.current\);\s*rawRef\.current = merged;\s*const t = dropSentPrefix\(merged, lastSentRef\.current\);/);
    expect(src).not.toMatch(/upToRef\.current = 0;\s*lastSentRef\.current = "";/);
    expect(src).toMatch(/lastSentRef\.current = rawRef\.current;/);
  });
});
