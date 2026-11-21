import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 화면(jsdom 없음)은 소스로 지킨다 — 2026-11-20 「함께 머무는 사람」. 주석은 걷어내고 코드만 본다.
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const ui = strip(readFileSync(join(__dirname, "SpaceTogether.tsx"), "utf8"));
const rt = strip(readFileSync(join(__dirname, "space-realtime.ts"), "utf8"));
const sheet = strip(readFileSync(join(__dirname, "SpaceSheet.tsx"), "utf8"));
const app = readFileSync(join(__dirname, "WellnessApp.tsx"), "utf8");
const cfg = strip(readFileSync(join(__dirname, "space-config.ts"), "utf8"));

describe("함께 머무는 사람 — 연결", () => {
  it("연결 정보가 없으면 기능이 안 나온다(spaceRealtimeReady)", () => {
    expect(sheet).toMatch(/const together = spaceRealtimeReady\(\)/);
    expect(sheet).toMatch(/together \? \{ who, profile, onProfile: saved \} : null/);
    expect(sheet).toMatch(/\{together && \(/);
  });
  it("앱이 계정/둘러보기를 넘긴다", () => {
    const line = app.split("\n").find((l) => l.includes("<SpaceSheet onClose=")) ?? "";
    expect(line).toContain("who={{ guest: s.guest, loginId: s.loginId }}");
  });
  it("모든 채널은 비공개(private) · 익명 로그인 · 둘러보기도 기기에 남아 다음에도 같은 사람(2026-11-20)", () => {
    const channels = rt.match(/sb\.channel\([^\n]*/g) ?? [];
    expect(channels.length).toBeGreaterThanOrEqual(2);
    for (const c of channels) expect(c).toMatch(/private: true/);
    expect(rt).toMatch(/signInAnonymously\(\)/);
    expect(rt).toMatch(/const storage = typeof window === "undefined" \? undefined : window\.localStorage;/);
    expect(rt).not.toMatch(/sessionStorage/);
  });
  it("🚫 secret·service_role 키를 코드에 두지 않는다", () => {
    expect(cfg + rt).not.toMatch(/service_role|sb_secret_/);
  });
  it("공간을 나가면(화면이 사라지면) 연결을 끊는다", () => {
    expect(ui).toMatch(/return \(\) => \{\s*cancelled = true;\s*session\?\.leave\(\);/);
    expect(rt).toMatch(/leave\(\) \{[\s\S]*?untrack\(\)[\s\S]*?removeChannel\(ch\)/);
  });
});

describe("함께 머무는 사람 — 안전", () => {
  it("보내기 전 checkOutgoing · 연속 전송 제한 · 받은 건 acceptIncoming", () => {
    expect(ui).toMatch(/const c = checkOutgoing\(input\)/);
    expect(ui).toMatch(/limiter\.take\(\)/);
    expect(rt.match(/acceptIncoming\(payload\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it("★위험한 말은 안 보내고 상담 안내(RISK_REPLY)를 보여 준다", () => {
    const send = ui.slice(ui.indexOf("const send = () =>"), ui.indexOf("const msgs ="));
    expect(send).toMatch(/c\.reason === "risk" \? "risk"/);
    expect(send.indexOf('setNotice(c.reason === "risk"')).toBeLessThan(send.indexOf("s.sendRoom("));
    expect(ui).toMatch(/RISK_REPLY\.slice\(0, 2\)/);
  });
  it("가려진 메시지는 글을 보여 주지 않는다", () => {
    expect(ui).toMatch(/m\.hidden \? "안전을 위해 가려진 메시지예요\." : m\.text/);
  });
  it("🚫 메시지를 기기에 저장하지 않는다 — 저장소에 쓰는 건 고른 캐릭터뿐", () => {
    const writes = ui.match(/setItem\([^)]*\)/g) ?? [];
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/PROFILE_KEY/); // 내 이름·캐릭터 사본뿐
    expect(rt).not.toMatch(/localStorage\.setItem|sessionStorage\.setItem/);
  });
  it("차단·신고가 있다 · 신고하면 차단도", () => {
    expect(ui).toMatch(/>차단</);
    expect(ui).toMatch(/>신고</);
    expect(ui).toMatch(/if \(ok\) block\(peer\)/);
  });
  it("🚫 공간 화면(RoomView)에 명상 안내 글을 얹지 않는다는 기존 약속 그대로 — 함께하기 화면은 다른 파일", () => {
    const roomView = sheet.slice(sheet.indexOf("function RoomView"), sheet.indexOf("function SpeakerIcon"));
    expect(roomView).not.toMatch(/호흡|숨을|소리로 돌아|여운|싱잉볼 명상|명상 안내/);
    expect(roomView).toMatch(/<TogetherLayer /);
  });
});

describe("함께 머무는 사람 — 장면 속 움직임(2026-11-20)", () => {
  const scene = ui.slice(ui.indexOf("function SpaceScene"), ui.indexOf("function Notice"));
  it("공간 화면이 영상 자리(rect)를 넘긴다", () => {
    expect(sheet).toMatch(/<TogetherLayer [^\n]*rect=\{rect\}/);
  });
  it("자리는 모두(나·차단 포함)로 계산해 기기마다 같은 답 · 장면과 목록엔 차단한 사람이 없다", () => {
    expect(ui).toMatch(/resolveSeats\(seated, layout\.seats\.length\)/);
    expect(ui).toMatch(/scenePeople = useMemo\(\(\) => seated\.filter\(\(p\) => !blocked\.has\(p\.uid\)\)/);
    expect(ui).toMatch(/peopleShown = people\.filter\(\(p\) => p\.uid !== me && !blocked\.has\(p\.uid\)\)/);
  });
  it("들어오면 화면 밖 입구에서 길 따라 걸어 들어와 앉고, 나가면 일어나 들어온 길을 거꾸로 걸어 나간다", () => {
    expect(scene).toMatch(/const ways = routeIn\(layout, seat\), door = doorPoint\(layout\)/);
    expect(scene).toMatch(/walk\(p\.uid, ways, \(\) => sitDown\(p\.uid, seat\)\)/);
    expect(scene).toMatch(/const out = routeOut\(layout, a\.seat\)/);
    expect(scene).toMatch(/walk\(uid, out\.ways, \(\) => drop\(uid\), STAND_PAUSE_MS\)/);
    expect(scene).toMatch(/walk\(uid, \[\.\.\.backToAisle\(a\), \{ to: doorPoint\(layout\), clip: false \}\]/); // 걷던 중에 나가도 통로로
    expect(scene).toMatch(/if \(p\.y >= 1\) y = Math\.max\(y, h \+ walkH\(p\.s\) \* \(threeRef\.current \? 1\.2 : 1\) \+ \(threeRef\.current \? 30 : 8\)\)/); // 입구는 화면 밖(3D 는 키·이름표까지)
  });
  it("🚫 귀신처럼 흐려지며 사라지지 않는다 · 걸음 빠르기는 키에 맞춘다", () => {
    const actor = scene.slice(scene.indexOf("data-space-actor="), scene.indexOf("data-space-actor=") + 1200);
    expect(actor).not.toMatch(/opacity/); // 캐릭터 자체를 흐리게 하지 않는다(원 깜빡임은 따로)
    expect(scene).toMatch(/walkMs\(from, to, \(walkH\(cur\.pos\.s\) \+ walkH\(w\.to\.s\)\) \/ 2\)/);
    // 천천히 출발 · 천천히 멈춤 · 일어서서/도착해서 잠깐 서 있기
    expect(scene).toMatch(/const ease = first && last \? EASE_BOTH : first \? EASE_START : last \? EASE_STOP : "linear"/);
    expect(scene).toMatch(/const t = a\.ms > 0 \? `\$\{a\.ms\}ms \$\{a\.ease\}` : "0s"/);
    expect(scene).toMatch(/a\.walking \? \(a\.ms > 0 \? "walk" : "stand"\)/);
    expect(scene).not.toMatch(/wcBob/); // 몸 오르내림은 그림 속 걸음과 같은 박자(space-avatars walkStyle)
  });
  it("움직임 줄이기 설정을 따른다", () => {
    expect(ui).toMatch(/matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
    expect(scene).toMatch(/const walkIn = !still &&/);
  });
  it("말풍선은 단체 대화만 · 가려진 메시지는 말풍선도 없다 · 짧게 자른다", () => {
    expect(ui.match(/showBubble\(/g)).toHaveLength(2);
    expect(ui).toMatch(/if \(!m\.hidden\) showBubble\(m\.from, m\.text, m\.id\)/);
    expect(ui).toMatch(/if \(tab === "room"\) showBubble\(me, m\.text, m\.id\)/);
    expect(ui).toMatch(/text: bubbleText\(text\)/);
  });
  it("빈자리 원은 들어올 때 자리를 고르는 동안만 · 앉은 뒤엔 옮기기 없음 · 안 고르면 20초 뒤 자동 · 고르는 사람은 장면·자리 계산에서 빠짐", () => {
    expect(scene).toMatch(/\{choices && choices\.length > 0 && \(/);
    expect(scene).toMatch(/onClick=\{\(\) => onChoose\(i\)\}/);
    expect(ui).toMatch(/choices=\{choosing \? freeSeats : null\}/);
    expect(ui).toMatch(/const choosing = !!me && status === "live" && !!avatar && !seatChosen/);
    expect(ui).toMatch(/if \(!s \|\| !me \|\| seatChosen\) return;/); // 한 번만
    expect(ui).toMatch(/setTimeout\(\(\) => chooseSeat\(freeRef\.current\[0\] \?\? null\), CHOOSE_MS\)/);
    expect(ui).toMatch(/const seated = useMemo\(\(\) => people\.filter\(\(p\) => !p\.picking\)/);
    expect(ui).toMatch(/resolveSeats\(seated, layout\.seats\.length\)/);
    expect(scene).toMatch(/\(p\.at \?\? p\.since\) > myJoin \+ 1500/); // 고른 때부터 걸어 들어온다
    expect(ui).not.toMatch(/onSeatTap|PICK_MS|togglePicking|옮겨 앉기/);
    expect(rt).toMatch(/let picking = true;/);
    expect(rt).toMatch(/if \(picking\) \{ picking = false; at = Date\.now\(\); \}/);
  });
  it("다른 사람을 누르면 그 사람 메뉴(1:1·차단·신고)", () => {
    expect(scene).toMatch(/onClick=\{mine \|\| a\.leaving \? undefined : \(\) => onPersonTap\(a\.uid\)\}/);
    expect(ui).toMatch(/const openPeer = \(uid: string\) => \{ openSheet\(\); setPeerMenu\(uid\); \}/);
  });
});

describe("함께 머무는 사람 — 방향·이름표(2026-11-20)", () => {
  const scene = ui.slice(ui.indexOf("function SpaceScene"), ui.indexOf("function Notice"));
  it("앉으면 방에 맞는 방향, 걸을 땐 가는 쪽 · 왼쪽은 좌우 뒤집기", () => {
    expect(scene).toMatch(/const heading = a\.walking \? a\.head : seatHeading\(layout, a\.seat\)/);
    expect(scene).toMatch(/figureSrc\(a\.avatar, pose, heading\.face\)/);
    expect(scene).toMatch(/transform: heading\.flip \? "scaleX\(-1\)" : undefined/);
    expect(scene).toMatch(/head: ms > 0 \? walkHeading\(from, to\) : cur\.head/); // 구간마다 가는 쪽
  });
  it("이름표는 머리 위, 말풍선은 그 위", () => {
    const name = scene.slice(scene.indexOf("data-space-name"), scene.indexOf("data-space-name") + 400);
    expect(name).toMatch(/bottom: `calc\(100% - \$\{headGap\}px \+ 1px\)`/);
    expect(name).not.toMatch(/top:100%/);
    expect(scene).toMatch(/bottom: `calc\(100% - \$\{headGap\}px \+ 17px\)`/);
  });
});

describe("함께 머무는 사람 — 교회·성당 장의자(2026-11-20)", () => {
  it("앉으면 방의 sitOn 대로(pew 면 윗몸만) · 장의자·줄 안에선 바닥 그림자 없음 · 줄 안을 걸을 땐 아랫몸을 자른다", () => {
    expect(ui).toMatch(/const pose: FigurePose = a\.walking \? \(a\.ms > 0 \? "walk" : "stand"\) : layout\.sitOn === "pew" \? "pew" : "sit"/);
    expect(ui).toMatch(/\{!three && !a\.clip && pose !== "pew" && <div style=\{\{ \.\.\.sx\("position:absolute; left:15%; right:15%;[^"]*"\), height: shadowH/);
    expect(ui).toMatch(/const cut = a\.clip \? \(\(a\.pos\.sink \?\? 0\) \* FIGURE_VIEW\.sit\.h\) \/ FIGURE_VIEW\[pose\]\.h : 0/);
  });
});

describe("대화 단추(2026-11-20 — 말풍선만)", () => {
  it("🚫 「아직 혼자예요」「n명과 함께」 같은 글을 화면에 쓰지 않는다 · 말풍선 그림 + 새 메시지 숫자 · 읽는 이름은 aria-label", () => {
    const pill = ui.slice(ui.indexOf("const pill = ("), ui.indexOf("const pill = (") + 1400);
    expect(ui).not.toMatch(/아직 혼자예요|명과 함께 · 대화|함께하기 · 캐릭터 고르기/);
    expect(pill).toMatch(/<ChatBubbleIcon \/>/);
    expect(pill).toMatch(/aria-label=\{pillLabel\}/);
    expect(pill).toMatch(/unread > 0 &&/);
  });
});

describe("캐릭터 이름(2026-11-20 — 「나」 대신 이름)", () => {
  it("장면 이름표는 나도 남도 캐릭터 이름(다른 사람에게 보이는 그대로) · 내 것만 보라색으로 구분", () => {
    const name = ui.slice(ui.indexOf("data-space-name"), ui.indexOf("data-space-name") + 500);
    expect(name).toMatch(/\{label\(a\.uid, a\.avatar\)\}/);
    expect(name).not.toMatch(/mine \? "나"/);
    expect(name).toMatch(/background: mine \?/);
    expect(ui).toMatch(/data-space-my-name[^\n]*profile\?\.nickname/);
  });
});

describe("내가 지은 이름(2026-11-20 — 고유한 이름 · 다음에도 그대로)", () => {
  const sql = readFileSync(join(__dirname, "../../../docs/space-profiles-setup.sql"), "utf8");
  it("서버 표: 이름은 모두 통틀어 하나뿐(대소문자 무시) · 모양 검사 · 내 것만 만들고 바꾼다 · 읽기는 로그인한 사람", () => {
    expect(sql).toMatch(/create unique index if not exists space_profiles_nickname_unique on public\.space_profiles \(lower\(nickname\)\)/);
    expect(sql).toMatch(/check \(nickname ~ '\^\[가-힣A-Za-z0-9\]\{2,10\}\$'\)/);
    expect(sql).toMatch(/for insert to authenticated\s+with check \(uid = \(select auth\.uid\(\)\)\)/);
    expect(sql).toMatch(/for update to authenticated\s+using \(uid = \(select auth\.uid\(\)\)\)\s+with check \(uid = \(select auth\.uid\(\)\)\)/);
    expect(sql).toMatch(/revoke all on public\.space_profiles from anon, authenticated;/);
    expect(sql).not.toMatch(/for delete/);
  });
  it("짓기 전에 앱 규칙(checkNickname)으로 먼저 거르고, 이미 있는 이름이면 다시 짓게", () => {
    const ed = ui.slice(ui.indexOf("export function ProfileEditor"), ui.indexOf("interface Thread"));
    expect(ed.indexOf("checkNickname(name)")).toBeLessThan(ed.indexOf("saveMyProfile("));
    expect(ed).toMatch(/r\.reason === "taken" \? "이미 누가 쓰고 있는 이름이에요/);
    expect(rt).toMatch(/error\.code === "23505" \? "taken"/);
  });
  it("다른 사람 이름은 presence 가 아니라 서버 표에서 uid 로 읽는다(남의 이름 흉내 막기)", () => {
    expect(ui).toMatch(/void fetchProfiles\(who, need\)/);
    expect(rt).toMatch(/const presence = \(\) => \(\{ uid, avatar, since, seat, picking, at, pv \}\)/);
    expect(rt).not.toMatch(/nickname[^\n]*track|track\([^\n]*nickname/);
  });
  it("이름을 지어야 함께할 수 있다(캐릭터는 내 프로필에서)", () => {
    expect(ui).toMatch(/const avatar = profile\?\.avatar \?\? null;/);
    expect(ui).toMatch(/<ProfileEditor who=\{who\} initial=\{profile\}/);
    expect(sheet).toMatch(/loadMyProfile\(who\)/);
  });
});
