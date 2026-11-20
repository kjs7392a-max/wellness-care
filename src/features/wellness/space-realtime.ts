"use client";
/**
 * 마음 쉼터 실시간 연결(Supabase Realtime · 2026-11-20) — 같은 공간에 있는 사람(presence) · 단체 대화 · 1:1 대화.
 *
 * - 로그인: Supabase **익명 로그인**. 앱의 학교 계정은 아직 시제품이라 Supabase 계정과 잇지 않는다.
 *   · 계정 로그인 = 그 기기에 아이디별로 · 둘러보기 = 그 기기(브라우저)에 하나 — 둘 다 localStorage 라 다음에도 **같은 사람**이다.
 *     (2026-11-20 사용자 "계속 고유 캐릭터와 아이디를 가질 수 있게" — 예전엔 둘러보기는 이 탭 동안만이었다.)
 * - 내가 지은 이름: public.space_profiles(docs/space-profiles-setup.sql) — 모두 통틀어 하나뿐 · 내 것만 바꾼다(RLS).
 *   다른 사람 이름은 presence 가 아니라 이 표에서 읽는다(남의 이름을 흉내 낼 수 없게).
 * - 채널은 모두 비공개(private) — 누가 듣고 보낼 수 있는지는 docs/space-realtime-setup.sql 의 RLS 가 정한다.
 *   · 공간 방 space:<id> = presence + 단체 대화(msg) + 1:1 초대(dm-invite)
 *   · 1:1 dm:<방>:<id>:<id> = 그 두 사람만
 * - 메시지는 어디에도 저장하지 않는다. 보내기 전 검사(checkOutgoing) · 받은 뒤 검사(acceptIncoming)는 space-together.ts.
 */
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { SPACE_SUPABASE_KEY, SPACE_SUPABASE_URL } from "./space-config";
import { acceptIncoming, dmTopic, presenceList, roomTopic, type ChatMessage, type Presence, type ReportReason } from "./space-together";
import type { AvatarId } from "./space-avatars";
import type { SpaceId } from "./space";

export interface SpaceWho { guest: boolean; loginId: string }

const clients = new Map<string, SupabaseClient>();
function clientFor(who: SpaceWho): SupabaseClient {
  const key = who.guest ? "guest" : `acct:${who.loginId.trim().toLowerCase()}`;
  let c = clients.get(key);
  if (!c) {
    const storage = typeof window === "undefined" ? undefined : window.localStorage;
    c = createClient(SPACE_SUPABASE_URL, SPACE_SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: `wellness-care:space-auth:${key}`, storage },
      realtime: { params: { eventsPerSecond: 5 } },
    });
    clients.set(key, c);
  }
  return c;
}

/** 익명 로그인(이미 있으면 그대로) → 사용자 id */
async function ensureUser(sb: SupabaseClient): Promise<string> {
  const { data } = await sb.auth.getSession();
  if (data.session?.user?.id) return data.session.user.id;
  const r = await sb.auth.signInAnonymously();
  if (r.error || !r.data.user) throw r.error ?? new Error("anonymous sign-in failed");
  return r.data.user.id;
}

export type RoomStatus = "connecting" | "live" | "error";

export interface RoomHandlers {
  onStatus: (s: RoomStatus) => void;
  /** 이 방에 있는 사람 전부(나 · 차단한 사람 포함 — 자리 계산용). 화면이 거른다. */
  onPeople: (people: Presence[]) => void;
  onRoomMessage: (m: ChatMessage & { hidden: boolean }) => void;
  onDmMessage: (peer: string, m: ChatMessage & { hidden: boolean }) => void;
  /** 누군가 1:1 을 열었다(내가 열었을 때도) */
  onDmOpen: (peer: string, avatar: AvatarId | null) => void;
}

export interface RoomSession {
  readonly uid: string;
  /** 내가 이 방에 들어온 시각(ms) */
  readonly since: number;
  /** 앉고 싶은 자리를 알린다(presence) — 모두가 resolveSeats 로 같은 자리를 계산한다. 처음 부르면 「고르는 중」이 끝난다. */
  moveTo(seat: number | null): void;
  sendRoom(text: string): ChatMessage | null;
  openDm(peer: string): void;
  sendDm(peer: string, text: string): ChatMessage | null;
  setBlocked(blocked: ReadonlySet<string>): void;
  report(peer: string, reason: ReportReason, excerpt: string): Promise<boolean>;
  leave(): void;
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** 공간에 들어간다 — 끝나면 leave() 를 꼭 부른다(화면이 닫힐 때) */
// ── 내가 지은 이름(space_profiles) ─────────────────────────────────────────────
export interface SpaceProfile { uid: string; nickname: string; avatar: AvatarId; /** 바꾼 시각(ms) */ updatedAt: number }
const PROFILE_COLS = "uid, nickname, avatar, updated_at";
function toProfile(r: { uid?: unknown; nickname?: unknown; avatar?: unknown; updated_at?: unknown } | null): SpaceProfile | null {
  if (!r || typeof r.uid !== "string" || typeof r.nickname !== "string" || typeof r.avatar !== "string") return null;
  const t = typeof r.updated_at === "string" ? Date.parse(r.updated_at) : NaN;
  return { uid: r.uid, nickname: r.nickname, avatar: r.avatar as AvatarId, updatedAt: Number.isFinite(t) ? t : 0 };
}

/** 내 이름(없으면 null) — 연결이 안 되면 throw */
export async function loadMyProfile(who: SpaceWho): Promise<SpaceProfile | null> {
  const sb = clientFor(who);
  const uid = await ensureUser(sb);
  const { data, error } = await sb.from("space_profiles").select(PROFILE_COLS).eq("uid", uid).maybeSingle();
  if (error) throw error;
  return toProfile(data);
}

export type SaveProfileResult = { ok: true; profile: SpaceProfile } | { ok: false; reason: "taken" | "invalid" | "network" };
/** 이름 짓기·바꾸기 — 이미 누가 쓰는 이름이면 taken */
export async function saveMyProfile(who: SpaceWho, nickname: string, avatar: AvatarId): Promise<SaveProfileResult> {
  try {
    const sb = clientFor(who);
    const uid = await ensureUser(sb);
    const { data, error } = await sb.from("space_profiles").upsert({ uid, nickname, avatar }, { onConflict: "uid" }).select(PROFILE_COLS).single();
    if (error) return { ok: false, reason: error.code === "23505" ? "taken" : error.code === "23514" ? "invalid" : "network" };
    const p = toProfile(data);
    return p ? { ok: true, profile: p } : { ok: false, reason: "network" };
  } catch { return { ok: false, reason: "network" }; }
}

/** 같은 방 사람들 이름 */
export async function fetchProfiles(who: SpaceWho, uids: readonly string[]): Promise<SpaceProfile[]> {
  const ids = [...new Set(uids)].filter((u) => /^[0-9a-f-]{36}$/i.test(u)).slice(0, 60);
  if (!ids.length) return [];
  const { data, error } = await clientFor(who).from("space_profiles").select(PROFILE_COLS).in("uid", ids);
  if (error || !data) return [];
  return data.map(toProfile).filter((p): p is SpaceProfile => !!p);
}

export async function joinRoom(who: SpaceWho, room: SpaceId, avatar: AvatarId, h: RoomHandlers, pv = 0): Promise<RoomSession> {
  const sb = clientFor(who);
  h.onStatus("connecting");
  const uid = await ensureUser(sb);
  await sb.realtime.setAuth();
  let left = false;
  let blocked: ReadonlySet<string> = new Set();
  const since = Date.now();
  const dms = new Map<string, RealtimeChannel>();

  const ch = sb.channel(roomTopic(room), { config: { private: true, presence: { key: uid, enabled: true }, broadcast: { self: false } } });
  let seat: number | null = null;
  // 들어오면 먼저 자리를 고른다(2026-11-20) — 고르는 동안은 다른 사람 장면에 안 나온다
  let picking = true;
  let at: number | null = null;
  const presence = () => ({ uid, avatar, since, seat, picking, at, pv });
  ch.on("presence", { event: "sync" }, () => {
    if (left) return;
    h.onPeople(presenceList(ch.presenceState() as Record<string, unknown[]>));
  });
  ch.on("broadcast", { event: "msg" }, ({ payload }) => {
    const m = acceptIncoming(payload);
    if (!left && m && m.from !== uid && !blocked.has(m.from)) h.onRoomMessage(m);
  });
  ch.on("broadcast", { event: "dm-invite" }, ({ payload }) => {
    const p = payload as { to?: unknown; from?: unknown; avatar?: unknown } | null;
    if (left || !p || p.to !== uid || typeof p.from !== "string" || p.from === uid || blocked.has(p.from)) return;
    ensureDm(p.from);
    h.onDmOpen(p.from, typeof p.avatar === "string" ? (p.avatar as AvatarId) : null);
  });
  ch.subscribe((status) => {
    if (left) return;
    if (status === "SUBSCRIBED") {
      void ch.track(presence());
      h.onStatus("live");
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") h.onStatus("error");
  });

  function ensureDm(peer: string): RealtimeChannel {
    let d = dms.get(peer);
    if (d) return d;
    d = sb.channel(dmTopic(room, uid, peer), { config: { private: true, broadcast: { self: false } } });
    d.on("broadcast", { event: "msg" }, ({ payload }) => {
      const m = acceptIncoming(payload);
      // 1:1 채널엔 두 사람뿐 — 그래도 보낸 사람이 상대가 아니면 버린다
      if (!left && m && m.from === peer && !blocked.has(peer)) h.onDmMessage(peer, m);
    });
    d.subscribe();
    dms.set(peer, d);
    return d;
  }

  const make = (text: string): ChatMessage => ({ id: newId(), from: uid, avatar, text, at: Date.now() });

  return {
    uid,
    since,
    moveTo(next) {
      if (left || (next === seat && !picking)) return;
      seat = next;
      if (picking) { picking = false; at = Date.now(); }
      void ch.track(presence());
    },
    sendRoom(text) {
      if (left) return null;
      const m = make(text);
      void ch.send({ type: "broadcast", event: "msg", payload: m });
      return m;
    },
    openDm(peer) {
      if (left || peer === uid || blocked.has(peer)) return;
      ensureDm(peer);
      void ch.send({ type: "broadcast", event: "dm-invite", payload: { to: peer, from: uid, avatar } });
      h.onDmOpen(peer, null);
    },
    sendDm(peer, text) {
      if (left || blocked.has(peer)) return null;
      const d = ensureDm(peer);
      const m = make(text);
      void d.send({ type: "broadcast", event: "msg", payload: m });
      return m;
    },
    setBlocked(next) {
      blocked = next;
      for (const peer of next) {
        const d = dms.get(peer);
        if (d) { void sb.removeChannel(d); dms.delete(peer); }
      }
      h.onPeople(presenceList(ch.presenceState() as Record<string, unknown[]>));
    },
    async report(peer, reason, excerpt) {
      const { error } = await sb.from("space_reports").insert({ reported: peer, room, reason, excerpt: excerpt.slice(0, 300) });
      return !error;
    },
    leave() {
      if (left) return;
      left = true;
      void ch.untrack();
      void sb.removeChannel(ch);
      for (const d of dms.values()) void sb.removeChannel(d);
      dms.clear();
    },
  };
}
