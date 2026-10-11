import type { Role } from "./data";
import type { DelayAnswers, FollowUpAnswers, SafetyAnswers } from "./safety-screen";

/**
 * 처음 한 번 답한 온보딩(동의·권한·안전 확인·직군) 기기 저장 — 순수 모듈(테스트 onboard-store.test.ts).
 *
 * 2026-10-11 사용자 확정: "최초 1회 저장하고 다시 로그인 할 때는 그동안 상태가 변한 게 있는지를 물어보고
 *   있다면 다시 표를 띄우고 없다면 넘어가게".
 *   · 계정(아이디)별로 갈라 저장한다 — 같은 폰을 다른 사람이 써도 앞사람 답이 넘어가지 않는다.
 *   · 로그아웃해도 지우지 않는다(지우면 다음 로그인에 처음부터 다시 묻는다 = 이 기능의 이유가 사라진다).
 *     지우는 곳은 설정 「전체 데이터 즉시 파기」.
 *   · 「계정 없이 둘러보기」도 저장한다(2026-10-11 사용자 지시 "계정없이 들어가도 「그동안 몸 상태에 변화가 있나요?」를 물어보게") —
 *     그 폰의 둘러보기 한 칸(GUEST_ACCOUNT)에. 대화는 여전히 안 남긴다(chat-store).
 *   · 동의서 문구가 바뀌면 CONSENT_VERSION 을 올린다 → 옛 기록은 없는 것으로 보고 처음부터 다시 묻는다.
 * ⚠ 폰을 바꾸거나 브라우저 데이터를 지우면 사라진다 — DB(계정 저장)가 오면 이 기록을 그대로 올린다.
 */
export const ONBOARD_STORE_KEY = "wellness-care:onboard:v1";
export const CONSENT_VERSION = 1;
/** 둘러보기 저장 칸 — 실제 아이디에는 「@」가 들어가므로 겹치지 않는다. */
export const GUEST_ACCOUNT = "__guest__";

/** 저장 칸 이름 — 둘러보기면 GUEST_ACCOUNT, 아니면 입력한 아이디. */
export const onboardIdFor = (loginId: string, guest: boolean): string => (guest ? GUEST_ACCOUNT : loginId);

export interface OnboardRecord {
  consentVersion: number;
  consent: [boolean, boolean];
  perms: Record<number, boolean>;
  role: Role;
  parq: SafetyAnswers;
  parq2: FollowUpAnswers;
  delay: DelayAnswers;
  /** 마지막으로 저장한 시각(ISO) — 화면에 「지난번 답」 날짜로 보여준다. */
  savedAt: string;
}

export interface OnboardStore { v: 1; byAccount: Record<string, OnboardRecord> }

export const emptyOnboardStore = (): OnboardStore => ({ v: 1, byAccount: {} });

/** 아이디 → 저장 열쇠. 앞뒤 공백·대소문자 차이로 같은 사람이 남이 되지 않게. 빈 값 = 둘러보기(저장 안 함). */
export function accountKey(loginId: string): string | null {
  const k = loginId.trim().toLowerCase();
  return k === "" ? null : k;
}

const ROLE_KEYS: readonly Role[] = ["teacher", "admin", "care"];

function boolMap(x: unknown): Record<string, boolean> | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(x as Record<string, unknown>)) {
    if (typeof val !== "boolean") return null;
    out[k] = val;
  }
  return out;
}

function parseRecord(x: unknown): OnboardRecord | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const consent = r.consent;
  if (typeof r.consentVersion !== "number") return null;
  if (!Array.isArray(consent) || consent.length !== 2 || !consent.every((c) => typeof c === "boolean")) return null;
  if (typeof r.role !== "string" || !(ROLE_KEYS as readonly string[]).includes(r.role)) return null;
  if (typeof r.savedAt !== "string") return null;
  const perms = boolMap(r.perms);
  const parq = boolMap(r.parq);
  const parq2 = boolMap(r.parq2);
  const delay = boolMap(r.delay);
  if (!perms || !parq || !parq2 || !delay) return null;
  return {
    consentVersion: r.consentVersion,
    consent: [consent[0], consent[1]] as [boolean, boolean],
    perms: perms as unknown as Record<number, boolean>,
    role: r.role as Role,
    parq: parq as unknown as SafetyAnswers,
    parq2,
    delay: delay as unknown as DelayAnswers,
    savedAt: r.savedAt,
  };
}

/** 깨진 저장값은 빈 표로 — 저장소 때문에 앱이 죽지 않는다. 깨진 한 사람 기록만 버리고 나머지는 살린다. */
export function parseOnboardStore(raw: string | null): OnboardStore {
  if (!raw) return emptyOnboardStore();
  try {
    const j = JSON.parse(raw) as { v?: unknown; byAccount?: unknown };
    if (j.v !== 1 || !j.byAccount || typeof j.byAccount !== "object") return emptyOnboardStore();
    const byAccount: Record<string, OnboardRecord> = {};
    for (const [k, val] of Object.entries(j.byAccount as Record<string, unknown>)) {
      const rec = parseRecord(val);
      if (rec) byAccount[k] = rec;
    }
    return { v: 1, byAccount };
  } catch {
    return emptyOnboardStore();
  }
}

export const serializeOnboardStore = (st: OnboardStore): string => JSON.stringify(st);

/**
 * 다시 로그인했을 때 쓸 기록. 없거나 · 동의서 판이 다르거나 · 필수 동의가 빠졌으면 null(= 처음부터 다시 묻는다).
 * 안전 확인이 끝났는지는 화면이 safetyComplete 로 한 번 더 본다(판정을 여기 다시 적지 않는다).
 */
export function recordFor(st: OnboardStore, loginId: string): OnboardRecord | null {
  const k = accountKey(loginId);
  if (!k) return null;
  const rec = st.byAccount[k];
  if (!rec || rec.consentVersion !== CONSENT_VERSION || !rec.consent[0]) return null;
  return rec;
}

export function setRecord(st: OnboardStore, loginId: string, rec: Omit<OnboardRecord, "consentVersion">): OnboardStore {
  const k = accountKey(loginId);
  if (!k) return st;
  return { v: 1, byAccount: { ...st.byAccount, [k]: { ...rec, consentVersion: CONSENT_VERSION } } };
}

/** 「지난번 답」 날짜 — 2026.10.11 꼴(한국 시각). 못 읽으면 null. */
export function savedDateLabel(iso: string): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}
