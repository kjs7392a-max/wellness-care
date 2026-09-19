import type { CharacterId } from "./characters";

/**
 * 「마음과 대화」 기기 저장 — 그 폰의 localStorage 에만 남기고 다음에 이어간다. 순수 모듈(테스트 chat-store.test.ts).
 *
 * 2026-09-19 사용자 확정: "채팅의 내용을 기록하려고 하는 거야" — DB 는 아직 안 한다(서버 저장 0 · 대화 미저장 원칙은 서버 쪽에서 그대로).
 *   · 캐릭터별로 갈라 저장한다(옆반 동료와 한 얘기는 옆반 동료가 기억).
 *   · 서버로 보내는 history 는 최근 HISTORY_LIMIT 개 — 라우트가 자르는 수와 **같은 하나의 정의**(route.ts 가 이걸 import).
 *   · 위험(L2) 으로 판정된 질문과 그 고정 안내 말풍선은 `risk: true` 로 표시해 두고 history 에서 뺀다(이어갈 맥락이 아니고 모델에 다시 보낼 이유가 없다).
 *   · 「계정 없이 둘러보기」는 저장하지 않는다 · 로그아웃·전체 파기 = 삭제(공용 기기 보호 · SOMANG 09-17 교훈) — 이건 화면(WellnessApp)이 지킨다.
 *   · 폰 저장 공간: 캐릭터당 최근 MAX_PER_CHARACTER 개만.
 * ⚠ 폰을 바꾸거나 브라우저 데이터를 지우면 사라진다 — DB 가 오면 이 표를 그대로 올린다.
 */
export const CHAT_STORE_KEY = "wellness-care:chat:v1";
export const HISTORY_LIMIT = 20;
export const MAX_PER_CHARACTER = 200;

export interface StoredMsg { role: "me" | "bot"; text: string; at: string; risk?: true }
export interface ChatStore { v: 1; byCharacter: Partial<Record<CharacterId, StoredMsg[]>> }
/** 서버 라우트가 받는 한 턴(role·text 만 — 시각·위험 표시는 폰에만 남는다). */
export interface Turn { role: "me" | "bot"; text: string }

export const emptyChatStore = (): ChatStore => ({ v: 1, byCharacter: {} });

function isMsg(x: unknown): x is StoredMsg {
  if (!x || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  return (m.role === "me" || m.role === "bot") && typeof m.text === "string" && typeof m.at === "string";
}

/** 깨진 JSON·다른 버전·이상한 모양은 전부 빈 저장소로 — 저장소 때문에 앱이 죽지 않는다. */
export function parseChatStore(raw: string | null): ChatStore {
  if (!raw) return emptyChatStore();
  try {
    const j = JSON.parse(raw) as { v?: unknown; byCharacter?: unknown };
    if (!j || j.v !== 1 || !j.byCharacter || typeof j.byCharacter !== "object") return emptyChatStore();
    const out = emptyChatStore();
    for (const [id, msgs] of Object.entries(j.byCharacter as Record<string, unknown>)) {
      if (!Array.isArray(msgs)) continue;
      const clean = msgs.filter(isMsg).map((m) => (m.risk ? { role: m.role, text: m.text, at: m.at, risk: true as const } : { role: m.role, text: m.text, at: m.at }));
      if (clean.length) out.byCharacter[id as CharacterId] = clean;
    }
    return out;
  } catch {
    return emptyChatStore();
  }
}

export const serializeChatStore = (store: ChatStore): string => JSON.stringify(store);

export function setCharacterChat(store: ChatStore, id: CharacterId, msgs: StoredMsg[]): ChatStore {
  return { v: 1, byCharacter: { ...store.byCharacter, [id]: msgs.slice(-MAX_PER_CHARACTER) } };
}

export function clearCharacterChat(store: ChatStore, id: CharacterId): ChatStore {
  const rest = { ...store.byCharacter };
  delete rest[id];
  return { v: 1, byCharacter: rest };
}

export const clearAllChats = (): ChatStore => emptyChatStore();

/** 서버로 보낼 최근 대화 — 위험 표시 말풍선 제외 · 상한 · role/text 만. */
export function historyFor(msgs: StoredMsg[], limit: number = HISTORY_LIMIT): Turn[] {
  return msgs.filter((m) => !m.risk).slice(-limit).map((m) => ({ role: m.role, text: m.text }));
}
