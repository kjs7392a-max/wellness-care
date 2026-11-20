/**
 * 마음 쉼터 「함께 머무는 사람」(2026-11-20 사용자 지시) — 같은 공간에 들어온 사람끼리 캐릭터가 서로 보이고,
 * 단체 대화와 1:1 대화를 한다. 계정 없이 둘러보기여도 캐릭터를 고르면 된다.
 *
 * 이 파일은 순수 규칙만(테스트 space-together.test.ts) — 실시간 연결은 space-realtime.ts, 화면은 SpaceSheet.tsx.
 * ★안전(정신건강 앱 · 모르는 사람끼리 대화):
 *   - 메시지는 저장하지 않는다(실시간 전달만). 방을 나가면 사라진다.
 *   - 위험한 표현(risk.ts L2)은 **다른 사람에게 보내지 않고** 보낸 사람에게 상담 안내(109)를 보여 준다. 받은 쪽에서도 한 번 더 걸러 가린다.
 *   - 전화번호·이메일·링크·메신저 아이디는 가린 뒤 보낸다(개인정보 · 외부로 끌어내기 방지).
 *   - 글자 수 제한 · 연속 전송 제한 · 차단 · 신고.
 *   - 실명 대신 내가 지은 이름(모두 통틀어 하나뿐 · checkNickname)만 보인다. 이름을 아직 못 읽었으면 캐릭터 이름 + 짧은 번호.
 */
import { riskLevel } from "./risk";
import { AVATARS, type AvatarId } from "./space-avatars";
import type { SpaceId } from "./space";

export const SPACE_IDS: readonly SpaceId[] = ["temple", "church", "cathedral", "meditation"];
export const MAX_MESSAGE = 120;

/** 공간 방 채널 — docs/space-realtime-setup.sql 의 정책과 같은 이름 */
export const roomTopic = (room: SpaceId) => `space:${room}`;
/** 1:1 채널 — dm:<방>:<작은 id>:<큰 id> (두 사람만 듣고 보낼 수 있다 · SQL 정책) */
export function dmTopic(room: SpaceId, a: string, b: string): string {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `dm:${room}:${x}:${y}`;
}

// ── 내가 지은 이름(2026-11-20 사용자 "캐릭터 이름을 지을 수 있게 해서 계속 고유 캐릭터와 아이디를") ──────────
// 서버(docs/space-profiles-setup.sql)가 모두 통틀어 하나뿐인 이름으로 지킨다 · 여기 규칙은 그 표의 check 와 같다.
export const NICK_MIN = 2;
export const NICK_MAX = 10;
export type NickProblem = "short" | "long" | "chars" | "reserved" | "unsafe";
export const NICK_PROBLEM_TEXT: Record<NickProblem, string> = {
  short: `이름은 ${NICK_MIN}자 넘게 지어 주세요.`,
  long: `이름은 ${NICK_MAX}자까지예요.`,
  chars: "한글·영문·숫자만 쓸 수 있어요(띄어쓰기·기호 없이).",
  reserved: "운영자처럼 보이는 이름은 쓸 수 없어요.",
  unsafe: "쓸 수 없는 말이 들어 있어요. 다른 이름을 지어 주세요.",
};
/** 운영자·상담사·회사로 오해할 이름(소문자로 견줌) */
const RESERVED_NICKS = ["관리자", "운영자", "운영진", "운영팀", "상담사", "상담원", "상담선생", "의사", "admin", "administrator", "manager", "moderator", "staff", "official", "닥터포레스트", "dr4rest", "drforest", "웰니스케어", "시스템", "공지", "system", "notice"];
/** 욕설·성적 표현(짧게) — 위험한 말은 risk.ts 가 따로 본다 */
const BAD_NICK = ["씨발", "시발", "씨팔", "병신", "븅신", "좆", "개새", "새끼", "니미", "지랄", "섹스", "sex", "fuck", "shit", "bitch", "자살", "자해"];
export function checkNickname(raw: string): { ok: true; nickname: string } | { ok: false; reason: NickProblem } {
  const nickname = (raw ?? "").normalize("NFC").trim();
  if ([...nickname].length < NICK_MIN) return { ok: false, reason: "short" };
  if ([...nickname].length > NICK_MAX) return { ok: false, reason: "long" };
  if (!/^[가-힣A-Za-z0-9]+$/.test(nickname)) return { ok: false, reason: "chars" };
  const low = nickname.toLowerCase();
  if (RESERVED_NICKS.some((w) => low.includes(w))) return { ok: false, reason: "reserved" };
  if (BAD_NICK.some((w) => low.includes(w)) || riskLevel(nickname) === 2) return { ok: false, reason: "unsafe" };
  if (/\d{6,}/.test(nickname)) return { ok: false, reason: "unsafe" }; // 전화번호·계좌처럼 긴 숫자
  return { ok: true, nickname };
}

/** 같은 캐릭터가 여럿이어도 갈리게 — 사용자 id 에서 두 자리 번호 */
export function shortTag(uid: string): string {
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(h % 100).padStart(2, "0");
}
export function displayName(avatar: AvatarId, uid: string): string {
  const a = AVATARS.find((v) => v.id === avatar);
  return `${a ? a.name : "손님"} ${shortTag(uid)}`;
}

// ── 메시지 ────────────────────────────────────────────────────────────────────

const PII: { re: RegExp }[] = [
  { re: /(?:\+?82[-\s.]?)?0?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g },            // 휴대전화
  { re: /\b0\d{1,2}[-\s.]\d{3,4}[-\s.]\d{4}\b/g },                               // 일반 전화
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },                   // 이메일
  { re: /\b(?:https?:\/\/|www\.)\S+/gi },                                       // 링크
  { re: /\b[\w-]+\.(?:com|net|org|kr|co\.kr|io|me|ly|gg|link)(?:\/\S*)?/gi },    // 도메인
  { re: /(?:카톡|카카오톡|카카오|라인|텔레|텔레그램|인스타|insta|kakao|line|telegram)\s*(?:아이디|id|ID|:)?\s*[:：]?\s*[@\w.-]{3,}/gi }, // 메신저 아이디
];
export const PII_MASK = "(연락처 가림)";

/** 연락처·링크를 가린다 */
export function maskContacts(text: string): { text: string; masked: boolean } {
  let out = text;
  let masked = false;
  for (const { re } of PII) {
    out = out.replace(re, () => { masked = true; return PII_MASK; });
  }
  return { text: out, masked };
}

export type OutgoingCheck =
  | { ok: true; text: string; masked: boolean }
  | { ok: false; reason: "empty" | "too-long" | "risk" | "rate" };

/** 보내기 전에 — 비었나 · 너무 긴가 · 위험한 표현인가(보내지 않음) · 연락처 가리기 */
export function checkOutgoing(raw: string): OutgoingCheck {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "empty" };
  if ([...text].length > MAX_MESSAGE) return { ok: false, reason: "too-long" };
  if (riskLevel(text) === 2) return { ok: false, reason: "risk" };
  const m = maskContacts(text);
  return { ok: true, text: m.text, masked: m.masked };
}

export interface ChatMessage {
  id: string;
  /** 보낸 사람 사용자 id */
  from: string;
  avatar: AvatarId;
  text: string;
  /** 보낸 시각(ms) */
  at: number;
}

const AVATAR_IDS = new Set<string>(AVATARS.map((a) => a.id));

/** 받은 메시지 — 모양이 맞는지 · 한 번 더 거른다(다른 앱이 규칙을 안 지켜도 화면은 지킨다). 위험하면 hidden. */
export function acceptIncoming(raw: unknown): (ChatMessage & { hidden: boolean }) | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== "string" || m.id.length > 64) return null;
  if (typeof m.from !== "string" || m.from.length > 64) return null;
  if (typeof m.avatar !== "string" || !AVATAR_IDS.has(m.avatar)) return null;
  if (typeof m.text !== "string") return null;
  if (typeof m.at !== "number" || !Number.isFinite(m.at)) return null;
  const text = m.text.replace(/\s+/g, " ").trim();
  if (!text || [...text].length > MAX_MESSAGE) return null;
  const hidden = riskLevel(text) === 2;
  return { id: m.id, from: m.from, avatar: m.avatar as AvatarId, text: hidden ? "" : maskContacts(text).text, at: m.at, hidden };
}

/** 연속 전송 제한 — 1초에 1개 · 1분에 15개 */
export function createRateLimiter(opts: { now?: () => number; perMinute?: number; minGapMs?: number } = {}) {
  const now = opts.now ?? (() => Date.now());
  const perMinute = opts.perMinute ?? 15;
  const minGap = opts.minGapMs ?? 1000;
  const sent: number[] = [];
  return {
    /** 지금 보내도 되나 — 되면 기록까지 한다 */
    take(): boolean {
      const t = now();
      while (sent.length && t - sent[0] > 60_000) sent.shift();
      if (sent.length && t - sent[sent.length - 1] < minGap) return false;
      if (sent.length >= perMinute) return false;
      sent.push(t);
      return true;
    },
  };
}

// ── 함께 있는 사람(presence) ──────────────────────────────────────────────────

export interface Presence {
  uid: string;
  avatar: AvatarId;
  /** 내가 지은 이름을 바꾼 시각(ms) — 바뀌면 다른 사람들이 이름을 다시 읽어 온다(이름 자체는 서버 표에서 읽는다 · 사칭 방지) */
  pv?: number;
  /** 들어온 시각(ms) — 줄 세우기 · 자리 먼저 차지하기 */
  since: number;
  /** 앉고 싶은 자리(장면 · space-seats) — 없으면 null */
  seat: number | null;
  /** 들어와서 아직 자리를 고르는 중(2026-11-20) — 장면엔 아직 안 나오고, 자리 계산에서도 빠진다 */
  picking?: boolean;
  /** 자리를 골라 장면에 들어온 시각(ms) — 이때부터 걸어 들어온다(늦게 온 사람만 걸어 들어오는 기준) */
  at?: number;
}

/** presence 상태(채널이 주는 모양) → 사람 목록 **전부**(나·차단한 사람 포함 — 자리 계산은 모두가 같은 목록으로). 모양이 틀린 것만 뺀다. 먼저 온 사람부터. */
export function presenceList(state: Record<string, unknown[]>): Presence[] {
  const out = new Map<string, Presence>();
  for (const metas of Object.values(state)) {
    for (const raw of metas ?? []) {
      if (!raw || typeof raw !== "object") continue;
      const p = raw as Record<string, unknown>;
      if (typeof p.uid !== "string" || p.uid.length > 64 || typeof p.avatar !== "string" || !AVATAR_IDS.has(p.avatar)) continue;
      const since = typeof p.since === "number" && Number.isFinite(p.since) ? p.since : 0;
      const seat = typeof p.seat === "number" && Number.isInteger(p.seat) && p.seat >= 0 && p.seat < 16 ? p.seat : null;
      const prev = out.get(p.uid);
      // 같은 사람이 탭 여럿이면 먼저 들어온 쪽 하나로
      const extra = {
        ...(p.picking === true ? { picking: true } : {}),
        ...(typeof p.at === "number" && Number.isFinite(p.at) ? { at: p.at } : {}),
        ...(typeof p.pv === "number" && Number.isFinite(p.pv) ? { pv: p.pv } : {}),
      };
      if (!prev || since < prev.since) out.set(p.uid, { uid: p.uid, avatar: p.avatar as AvatarId, since, seat, ...extra });
    }
  }
  return [...out.values()].sort((a, b) => a.since - b.since || a.uid.localeCompare(b.uid));
}

/** 나 · 차단한 사람을 뺀 사람 목록 */
export function peopleFromPresence(state: Record<string, unknown[]>, me: string, blocked: ReadonlySet<string>): Presence[] {
  return presenceList(state).filter((p) => p.uid !== me && !blocked.has(p.uid));
}

export const REPORT_REASONS = ["불쾌한 말", "개인정보 요구", "광고·도배", "그 밖의 문제"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** 처음 대화를 열 때 한 번 보이는 약속 */
export const CHAT_NOTICE = "실명·연락처는 나누지 말아 주세요. 대화는 저장되지 않고, 방을 나가면 사라져요. 불편한 사람은 차단·신고할 수 있어요.";
