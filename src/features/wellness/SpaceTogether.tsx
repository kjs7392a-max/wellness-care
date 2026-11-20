"use client";
/**
 * 마음 쉼터 「함께 머무는 사람」 화면(2026-11-20 사용자 지시) — 캐릭터 고르기 · 같은 공간에 있는 사람 · 단체/1:1 대화 · 차단 · 신고.
 * 규칙은 space-together.ts(순수·테스트), 연결은 space-realtime.ts. 연결 정보가 없으면(space-config) 이 화면은 아예 안 나온다.
 * 🚫 메시지를 기기에 저장하지 말 것(localStorage·sessionStorage 금지) — 방을 나가면 사라지는 것이 약속이다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { sx } from "./sx";
import { AVATARS, avatarOf, avatarSrc, figureSrc, FIGURE_VIEW, type AvatarId } from "./space-avatars";
import { BUBBLE_MS, bubbleShift, bubbleText, figureHeight, resolveSeats, ROOM_LAYOUT, seatHeading, toScreen, walkHeading, walkMs, type Heading, type Rect, type RoomLayout } from "./space-seats";
import { CHAT_NOTICE, checkOutgoing, createRateLimiter, displayName, MAX_MESSAGE, REPORT_REASONS, type ChatMessage, type Presence, type ReportReason } from "./space-together";
import { joinRoom, type RoomSession, type RoomStatus, type SpaceWho } from "./space-realtime";
import { RISK_REPLY } from "./risk";
import type { SpaceId } from "./space";

// ---- 고른 캐릭터(계정 = 기기에 아이디별 · 둘러보기 = 이 탭 동안만) ----
const AVATAR_KEY = "wellness-care:space-avatar:v1";
function storeFor(who: SpaceWho): Storage | null {
  try { return who.guest ? window.sessionStorage : window.localStorage; } catch { return null; }
}
const whoKey = (who: SpaceWho) => (who.guest ? "guest" : who.loginId.trim().toLowerCase());
export function loadAvatar(who: SpaceWho): AvatarId | null {
  try {
    const o = JSON.parse(storeFor(who)?.getItem(AVATAR_KEY) ?? "{}") as Record<string, unknown>;
    const v = o[whoKey(who)];
    return typeof v === "string" && avatarOf(v) ? (v as AvatarId) : null;
  } catch { return null; }
}
export function saveAvatar(who: SpaceWho, id: AvatarId) {
  try {
    const st = storeFor(who);
    const o = JSON.parse(st?.getItem(AVATAR_KEY) ?? "{}") as Record<string, unknown>;
    st?.setItem(AVATAR_KEY, JSON.stringify({ ...o, [whoKey(who)]: id }));
  } catch { /* 못 저장해도 이번엔 그대로 */ }
}

export function AvatarImg({ id, size, ring }: { id: AvatarId; size: number; ring?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={avatarSrc(id)} alt="" width={size} height={size} style={{ ...sx("flex:none; display:block; border-radius:50%"), width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }} />;
}

/** 캐릭터 고르기 — 4×2 */
export function AvatarPicker({ value, onPick }: { value: AvatarId | null; onPick: (id: AvatarId) => void }) {
  return (
    <div data-space-avatar-picker style={sx("display:grid; grid-template-columns:repeat(4, 1fr); gap:10px 6px")}>
      {AVATARS.map((a) => {
        const on = a.id === value;
        return (
          <button key={a.id} type="button" onClick={() => onPick(a.id)} aria-pressed={on} aria-label={`${a.name} · ${a.hint}`}
            style={{ ...sx("cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 2px; border-radius:14px; background:transparent; border:1.5px solid transparent"), borderColor: on ? "#7a6bc4" : "transparent", background: on ? "#f2edfa" : "transparent" }}>
            <AvatarImg id={a.id} size={52} />
            <span style={sx("font-size:12.5px; font-weight:800; color:#4a3f80")}>{a.name}</span>
            <span style={sx("font-size:10px; color:#8ba8b3; white-space:nowrap")}>{a.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

interface Thread { avatar: AvatarId | null; messages: (ChatMessage & { hidden?: boolean })[]; unread: number }

/**
 * 공간 안 — 머리줄 아래 「함께 있는 사람」 알약 + 대화 시트. 공간을 나가면(화면이 사라지면) 연결도 끊는다.
 * avatar 가 없으면 알약이 「함께하기」 → 고르기 시트.
 */
export function TogetherLayer({ who, room, avatar, onPickAvatar, rect }: { who: SpaceWho; room: SpaceId; avatar: AvatarId | null; onPickAvatar: (id: AvatarId) => void; rect: Rect }) {
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [people, setPeople] = useState<Presence[]>([]);
  const [roomMsgs, setRoomMsgs] = useState<(ChatMessage & { hidden?: boolean })[]>([]);
  const [roomUnread, setRoomUnread] = useState(0);
  const [threads, setThreads] = useState<Record<string, Thread>>({});
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<"room" | string>("room");
  const [peerMenu, setPeerMenu] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<ReadonlySet<string>>(new Set());
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<null | "risk" | "masked" | "rate" | "too-long" | "reported" | "report-failed">(null);
  const sessionRef = useRef<RoomSession | null>(null);
  const limiter = useMemo(() => createRateLimiter(), []);
  const openRef = useRef(open); openRef.current = open;
  const tabRef = useRef(tab); tabRef.current = tab;
  const listRef = useRef<HTMLDivElement | null>(null);
  const [meUid, setMeUid] = useState("");
  const [myJoin, setMyJoin] = useState(0);
  const trackedSeatRef = useRef<number | null | undefined>(undefined);
  const [bubbles, setBubbles] = useState<Record<string, { text: string; id: string }>>({});
  const bubbleTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const showBubble = (uid: string, text: string, id: string) => {
    setBubbles((b) => ({ ...b, [uid]: { text: bubbleText(text), id } }));
    clearTimeout(bubbleTimers.current[uid]);
    bubbleTimers.current[uid] = setTimeout(() => setBubbles((b) => { if (b[uid]?.id !== id) return b; const n = { ...b }; delete n[uid]; return n; }), BUBBLE_MS);
  };
  useEffect(() => () => { for (const t of Object.values(bubbleTimers.current)) clearTimeout(t); }, []);

  useEffect(() => {
    if (!avatar) return;
    let cancelled = false;
    let session: RoomSession | null = null;
    joinRoom(who, room, avatar, {
      onStatus: (s) => { if (!cancelled) setStatus(s); },
      onPeople: (p) => { if (!cancelled) setPeople(p); },
      onRoomMessage: (m) => {
        if (cancelled) return;
        setRoomMsgs((l) => [...l, m].slice(-100));
        if (!m.hidden) showBubble(m.from, m.text, m.id);
        if (!(openRef.current && tabRef.current === "room")) setRoomUnread((n) => n + 1);
      },
      onDmMessage: (peer, m) => {
        if (cancelled) return;
        setThreads((t) => {
          const th = t[peer] ?? { avatar: m.avatar, messages: [], unread: 0 };
          const seen = openRef.current && tabRef.current === peer;
          return { ...t, [peer]: { avatar: th.avatar ?? m.avatar, messages: [...th.messages, m].slice(-100), unread: seen ? 0 : th.unread + 1 } };
        });
      },
      onDmOpen: (peer, av) => {
        if (cancelled) return;
        setThreads((t) => (t[peer] ? t : { ...t, [peer]: { avatar: av, messages: [], unread: 0 } }));
      },
    }).then((s) => {
      if (cancelled) { s.leave(); return; }
      session = s;
      sessionRef.current = s;
      trackedSeatRef.current = undefined;
      setMeUid(s.uid);
      setMyJoin(s.since);
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
      session?.leave();
      sessionRef.current = null;
      setPeople([]); setRoomMsgs([]); setThreads({}); setRoomUnread(0); setMeUid(""); setBubbles({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar, room, who.guest, who.loginId]);

  useEffect(() => { sessionRef.current?.setBlocked(blocked); }, [blocked]);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6 }); }, [roomMsgs, threads, tab, open]);

  const me = meUid;
  // people = 이 방 사람 전부(나·차단 포함). 목록에 보이는 건 나·차단 뺀 사람.
  const peopleShown = people.filter((p) => p.uid !== me && !blocked.has(p.uid));
  const layout = ROOM_LAYOUT[room];
  // 자리 — 모두가 같은 목록(차단한 사람 포함)으로 같은 답을 낸다
  const seats = useMemo(() => resolveSeats(people, layout.seats.length), [people, layout]);
  // 장면엔 차단한 사람을 그리지 않는다(자리는 위 계산대로 비워 둔다)
  const scenePeople = useMemo(() => people.filter((p) => !blocked.has(p.uid)), [people, blocked]);
  // 내 자리가 정해지면 알린다(먼저 온 사람에게 밀렸을 때도) — 같은 값이면 다시 안 보낸다
  useEffect(() => {
    const s = sessionRef.current;
    if (!s || !me) return;
    const mine = seats.get(me);
    if (mine === undefined || trackedSeatRef.current === mine) return;
    trackedSeatRef.current = mine;
    s.moveTo(mine);
  }, [seats, me]);
  const moveTo = (i: number) => {
    const s = sessionRef.current;
    if (!s || !me) return;
    trackedSeatRef.current = i;
    s.moveTo(i);
    setPeople((ps) => ps.map((p) => (p.uid === me ? { ...p, seat: i } : p)));
  };
  const openPeer = (uid: string) => { openSheet(); setPeerMenu(uid); };
  const avatarFor = (uid: string): AvatarId | null => peopleShown.find((p) => p.uid === uid)?.avatar ?? threads[uid]?.avatar ?? null;
  const nameFor = (uid: string) => { const a = avatarFor(uid); return a ? displayName(a, uid) : "나간 사람"; };
  const dmUnread = Object.values(threads).reduce((n, t) => n + t.unread, 0);
  const unread = roomUnread + dmUnread;

  const openSheet = () => { setOpen(true); if (tab === "room") setRoomUnread(0); else setThreads((t) => (t[tab] ? { ...t, [tab]: { ...t[tab], unread: 0 } } : t)); };
  const goTab = (next: "room" | string) => {
    setTab(next); setPeerMenu(null); setNotice(null);
    if (next === "room") setRoomUnread(0);
    else setThreads((t) => (t[next] ? { ...t, [next]: { ...t[next], unread: 0 } } : t));
  };
  const startDm = (peer: string) => { sessionRef.current?.openDm(peer); setThreads((t) => (t[peer] ? t : { ...t, [peer]: { avatar: avatarFor(peer), messages: [], unread: 0 } })); goTab(peer); };
  const block = (peer: string) => {
    setBlocked((b) => new Set([...b, peer]));
    setThreads((t) => { const n = { ...t }; delete n[peer]; return n; });
    setRoomMsgs((l) => l.filter((m) => m.from !== peer));
    if (tab === peer) setTab("room");
    setPeerMenu(null);
  };
  const report = async (peer: string, reason: ReportReason) => {
    const s = sessionRef.current;
    const said = [...roomMsgs, ...(threads[peer]?.messages ?? [])].filter((m) => m.from === peer && !m.hidden).slice(-3).map((m) => m.text).join(" / ");
    const ok = s ? await s.report(peer, reason, said) : false;
    setReporting(null);
    setNotice(ok ? "reported" : "report-failed");
    if (ok) block(peer);
  };
  const send = () => {
    const s = sessionRef.current;
    if (!s) return;
    const c = checkOutgoing(input);
    if (!c.ok) {
      if (c.reason === "empty") return;
      setNotice(c.reason === "risk" ? "risk" : c.reason === "too-long" ? "too-long" : "rate");
      if (c.reason === "risk") setInput("");
      return;
    }
    if (!limiter.take()) { setNotice("rate"); return; }
    const m = tab === "room" ? s.sendRoom(c.text) : s.sendDm(tab, c.text);
    if (!m) return;
    if (tab === "room") showBubble(me, m.text, m.id);
    if (tab === "room") setRoomMsgs((l) => [...l, m].slice(-100));
    else setThreads((t) => ({ ...t, [tab]: { ...(t[tab] ?? { avatar: avatarFor(tab), messages: [], unread: 0 }), messages: [...(t[tab]?.messages ?? []), m].slice(-100) } }));
    setInput("");
    setNotice(c.masked ? "masked" : null);
  };

  const msgs = tab === "room" ? roomMsgs : threads[tab]?.messages ?? [];
  const dmPeers = Object.keys(threads).filter((p) => !blocked.has(p));

  // ── 알약(머리줄 아래) ──
  const pill = (
    <button type="button" data-space-together-pill onClick={() => (avatar ? openSheet() : setPicking(true))}
      style={sx("position:absolute; left:14px; top:100px; z-index:3; cursor:pointer; display:flex; align-items:center; gap:8px; padding:5px 12px 5px 6px; border-radius:999px; border:1px solid rgba(255,255,255,0.35); background:rgba(14,22,30,0.42); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); color:#fff")}>
      {avatar ? (
        <>
          <span style={sx("display:flex; align-items:center")}>
            <AvatarImg id={avatar} size={26} ring="#fff" />
            {peopleShown.slice(0, 4).map((p) => <span key={p.uid} style={sx("margin-left:-8px; display:flex")}><AvatarImg id={p.avatar} size={26} ring="rgba(255,255,255,0.85)" /></span>)}
          </span>
          <span style={sx("font-size:12px; font-weight:700; white-space:nowrap")}>
            {status === "connecting" ? "함께하기 연결 중…" : status === "error" ? "연결하지 못했어요" : peopleShown.length ? `${peopleShown.length}명과 함께 · 대화` : "아직 혼자예요 · 대화"}
          </span>
          {unread > 0 && <span aria-label={`새 메시지 ${unread}개`} style={sx("min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#ef7f6a; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center")}>{unread > 99 ? "99+" : unread}</span>}
        </>
      ) : (
        <span style={sx("font-size:12px; font-weight:700; padding-left:6px")}>👥 함께하기 · 캐릭터 고르기</span>
      )}
    </button>
  );

  return (
    <>
      {avatar && status === "live" && rect.width > 0 && (
        <SpaceScene layout={layout} rect={rect} me={me} myJoin={myJoin}
          people={scenePeople} seats={seats} bubbles={bubbles}
          onSeatTap={moveTo} onPersonTap={openPeer} />
      )}
      {pill}
      {picking && (
        <Sheet onClose={() => setPicking(false)} title="함께 머물 캐릭터">
          <div style={sx("padding:4px 18px 8px; font-size:12.5px; color:#6b8c9a; line-height:1.6")}>같은 공간에 있는 사람들끼리 캐릭터가 보이고 대화할 수 있어요. 실명 대신 캐릭터 이름만 보여요.</div>
          <div style={sx("padding:6px 12px 18px")}><AvatarPicker value={avatar} onPick={(id) => { onPickAvatar(id); setPicking(false); }} /></div>
        </Sheet>
      )}
      {open && avatar && (
        <Sheet onClose={() => { setOpen(false); setPeerMenu(null); setReporting(null); }} title="함께 머무는 사람" tall>
          {/* 사람 줄 — 나 + 함께 있는 사람(누르면 1:1 · 차단 · 신고) */}
          <div style={sx("flex:none; display:flex; gap:12px; overflow-x:auto; padding:2px 16px 10px")}>
            <div style={sx("flex:none; display:flex; flex-direction:column; align-items:center; gap:3px; width:56px")}>
              <AvatarImg id={avatar} size={40} ring="#7a6bc4" />
              <span style={sx("font-size:11px; font-weight:800; color:#4a3f80")}>나</span>
            </div>
            {peopleShown.map((p) => (
              <button key={p.uid} type="button" data-space-person onClick={() => setPeerMenu((m) => (m === p.uid ? null : p.uid))}
                style={sx("flex:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; width:60px; padding:0; border:none; background:transparent")}>
                <AvatarImg id={p.avatar} size={40} ring={peerMenu === p.uid ? "#7a6bc4" : undefined} />
                <span style={sx("font-size:11px; font-weight:700; color:#4a5f6a; white-space:nowrap")}>{displayName(p.avatar, p.uid)}</span>
              </button>
            ))}
            {peopleShown.length === 0 && <div style={sx("align-self:center; font-size:12px; color:#8ba8b3")}>아직 아무도 없어요. 누가 들어오면 여기 보여요.</div>}
          </div>
          {peerMenu && (
            <div data-space-peer-menu style={sx("flex:none; display:flex; gap:8px; padding:0 16px 10px")}>
              <MenuBtn onClick={() => startDm(peerMenu)} strong>1:1 대화</MenuBtn>
              <MenuBtn onClick={() => block(peerMenu)}>차단</MenuBtn>
              <MenuBtn onClick={() => { setReporting(peerMenu); setPeerMenu(null); }}>신고</MenuBtn>
            </div>
          )}
          {reporting && (
            <div data-space-report style={sx("flex:none; margin:0 16px 10px; padding:10px 12px; border-radius:14px; background:#fff7ed; border:1px solid #f3c98b")}>
              <div style={sx("font-size:12.5px; font-weight:700; color:#7a4a00; margin-bottom:8px")}>{nameFor(reporting)} 님을 신고하는 까닭을 골라 주세요. 신고하면 차단도 같이 돼요.</div>
              <div style={sx("display:flex; flex-wrap:wrap; gap:6px")}>
                {REPORT_REASONS.map((r) => <MenuBtn key={r} onClick={() => void report(reporting, r)}>{r}</MenuBtn>)}
                <MenuBtn onClick={() => setReporting(null)}>그만두기</MenuBtn>
              </div>
            </div>
          )}
          {/* 대화 칸 — 모두 + 1:1 */}
          <div style={sx("flex:none; display:flex; gap:6px; overflow-x:auto; padding:0 16px 8px; border-bottom:1px solid #eee9f7")}>
            <TabBtn on={tab === "room"} onClick={() => goTab("room")} dot={roomUnread > 0}>모두</TabBtn>
            {dmPeers.map((p) => (
              <TabBtn key={p} on={tab === p} onClick={() => goTab(p)} dot={(threads[p]?.unread ?? 0) > 0}>
                {avatarFor(p) && <AvatarImg id={avatarFor(p)!} size={18} />}{nameFor(p)}
              </TabBtn>
            ))}
          </div>
          <div ref={listRef} data-space-messages style={sx("flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding:10px 16px")}>
            <div style={sx("font-size:11.5px; color:#8ba8b3; line-height:1.6; text-align:center; padding:2px 6px 6px")}>{CHAT_NOTICE}</div>
            {tab !== "room" && <div style={sx("font-size:11.5px; color:#8ba8b3; text-align:center")}>{nameFor(tab)} 님과 둘만 보는 대화예요.</div>}
            {msgs.map((m) => {
              const mine = m.from === me;
              return (
                <div key={m.id} style={{ ...sx("display:flex; gap:7px; align-items:flex-end"), flexDirection: mine ? "row-reverse" : "row" }}>
                  {!mine && <AvatarImg id={m.avatar} size={28} />}
                  <div style={{ ...sx("max-width:76%; display:flex; flex-direction:column; gap:2px"), alignItems: mine ? "flex-end" : "flex-start" }}>
                    {!mine && <span style={sx("font-size:10.5px; color:#8ba8b3; padding:0 4px")}>{displayName(m.avatar, m.from)}</span>}
                    <div style={{ ...sx("padding:8px 11px; border-radius:14px; font-size:13.5px; line-height:1.5; word-break:break-word; white-space:pre-wrap"), background: mine ? "#7a6bc4" : "#f2edfa", color: mine ? "#fff" : "#3a4a72", fontStyle: m.hidden ? "italic" : "normal" }}>
                      {m.hidden ? "안전을 위해 가려진 메시지예요." : m.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {notice && <Notice kind={notice} onClose={() => setNotice(null)} />}
          <div style={sx("flex:none; display:flex; gap:8px; align-items:center; padding:10px 14px 16px; border-top:1px solid #eee9f7")}>
            <input value={input} maxLength={MAX_MESSAGE + 20} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              placeholder={status === "live" ? (tab === "room" ? "모두에게 한마디" : `${nameFor(tab)} 님에게`) : "연결 중…"} disabled={status !== "live"} aria-label="메시지"
              style={sx("flex:1; min-width:0; box-sizing:border-box; padding:11px 13px; border-radius:14px; border:1.5px solid #d9d2ec; font-size:14px; outline:none; background:#fff")} />
            <button type="button" onClick={send} disabled={status !== "live" || !input.trim()} aria-label="보내기"
              style={{ ...sx("flex:none; cursor:pointer; padding:11px 14px; border-radius:14px; border:none; font-size:13.5px; font-weight:800; color:#fff"), background: status === "live" && input.trim() ? "#7a6bc4" : "#c9c2e4" }}>보내기</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

// ── 장면 속 캐릭터(2026-11-20 사용자 지시 "들어오는 게 보이고 퇴장할 때는 나가는 것처럼") ──────────────
type Loc = { kind: "seat"; i: number } | { kind: "door" };
/** head = 걸을 때 바라보는 쪽(가는 쪽). 앉아 있을 땐 방·자리로 정한다(seatHeading). */
interface Actor { uid: string; avatar: AvatarId; loc: Loc; moving: boolean; ms: number; leaving: boolean; pendingSeat: number | null; head: Heading }

const reducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

/**
 * 영상 위에 캐릭터를 자리(space-seats)에 앉힌다.
 * - 나보다 늦게 들어온 사람(그리고 나 자신)은 문에서 걸어 들어와 앉는다 · 먼저 있던 사람은 처음부터 앉아 있다.
 * - 자리가 바뀌면 걸어서 옮긴다 · 나가면(presence 에서 사라지면) 문으로 걸어 나가며 사라진다.
 * - 빈자리를 누르면 내가 옮겨 앉는다 · 다른 사람을 누르면 대화 시트(1:1·차단·신고).
 */
function SpaceScene({ layout, rect, me, myJoin, people, seats, bubbles, onSeatTap, onPersonTap }: {
  layout: RoomLayout; rect: Rect; me: string; myJoin: number;
  people: Presence[]; seats: Map<string, number | null>; bubbles: Record<string, { text: string; id: string }>;
  onSeatTap: (i: number) => void; onPersonTap: (uid: string) => void;
}) {
  const [actors, setActors] = useState<Record<string, Actor>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rectRef = useRef(rect); rectRef.current = rect;
  const still = useMemo(() => reducedMotion(), []);
  useEffect(() => () => { for (const t of Object.values(timers.current)) clearTimeout(t); }, []);
  // 화면 폭 — 가장자리 자리의 말풍선이 잘리지 않게 안쪽으로 민다
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    setBoxW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const px = (loc: Loc) => toScreen(rectRef.current, loc.kind === "seat" ? layout.seats[loc.i] : layout.door);
  const arriveLater = (uid: string, ms: number, leaving: boolean) => {
    clearTimeout(timers.current[uid]);
    timers.current[uid] = setTimeout(() => {
      setActors((a) => {
        const cur = a[uid];
        if (!cur) return a;
        if (leaving && cur.leaving) { const n = { ...a }; delete n[uid]; return n; }
        if (!leaving && !cur.leaving) return { ...a, [uid]: { ...cur, moving: false } };
        return a;
      });
    }, ms + (leaving ? 350 : 0));
  };

  // 사람 목록·자리가 바뀔 때 — 새로 온 사람 · 옮긴 사람 · 나간 사람
  useEffect(() => {
    setActors((prev) => {
      const next: Record<string, Actor> = { ...prev };
      const present = new Set<string>();
      let changed = false;
      for (const p of people) {
        const seat = seats.get(p.uid);
        if (seat === null || seat === undefined) continue; // 자리가 다 찼다 — 장면엔 없고 목록에만
        present.add(p.uid);
        const cur = next[p.uid];
        if (!cur || cur.leaving) {
          const walkIn = !still && (p.uid === me || p.since > myJoin + 1500);
          const head = walkIn ? walkHeading(px({ kind: "door" }), px({ kind: "seat", i: seat })) : seatHeading(layout, seat);
          next[p.uid] = { uid: p.uid, avatar: p.avatar, loc: walkIn ? { kind: "door" } : { kind: "seat", i: seat }, moving: false, ms: 0, leaving: false, pendingSeat: walkIn ? seat : null, head };
          changed = true;
          continue;
        }
        if (cur.avatar !== p.avatar) { next[p.uid] = { ...cur, avatar: p.avatar }; changed = true; }
        const target = cur.pendingSeat ?? (cur.loc.kind === "seat" ? cur.loc.i : null);
        if (target !== seat) {
          const from = px(cur.loc), to = px({ kind: "seat", i: seat });
          const ms = still ? 0 : walkMs(from, to);
          next[p.uid] = { ...next[p.uid], loc: { kind: "seat", i: seat }, moving: ms > 0, ms, pendingSeat: null, head: walkHeading(from, to) };
          changed = true;
          if (ms > 0) arriveLater(p.uid, ms, false);
        }
      }
      for (const uid of Object.keys(next)) {
        const a = next[uid];
        if (present.has(uid) || a.leaving) continue;
        const from = px(a.loc), to = px({ kind: "door" });
        const ms = still ? 0 : walkMs(from, to);
        next[uid] = { ...a, loc: { kind: "door" }, moving: ms > 0, ms, leaving: true, pendingSeat: null, head: walkHeading(from, to) };
        changed = true;
        arriveLater(uid, ms, true);
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, seats, me, myJoin, layout, still]);

  // 문 앞에 막 나타난 사람 → 다음 그림에서 자리로 걷기 시작
  useEffect(() => {
    const pending = Object.values(actors).filter((a) => a.pendingSeat !== null && !a.leaving);
    if (!pending.length) return;
    // 문 앞 모습이 한 번 그려진 뒤에 옮겨야 걷는 모습(transition)이 보인다
    const t = setTimeout(() => {
      setActors((prev) => {
        const next = { ...prev };
        for (const a of pending) {
          const cur = next[a.uid];
          if (!cur || cur.pendingSeat === null) continue;
          const seat = cur.pendingSeat;
          const ms = walkMs(px({ kind: "door" }), px({ kind: "seat", i: seat }));
          next[a.uid] = { ...cur, loc: { kind: "seat", i: seat }, moving: true, ms, pendingSeat: null };
          arriveLater(a.uid, ms, false);
        }
        return next;
      });
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actors]);

  const occupied = new Set<number>([...seats.values()].filter((v): v is number => v !== null));
  const mySeated = !!me && seats.get(me) !== null && seats.get(me) !== undefined;

  return (
    <div ref={boxRef} data-space-scene style={sx("position:absolute; inset:0; z-index:2; pointer-events:none; overflow:hidden")}>
      <style>{`@keyframes wcBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes wcBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}@media (prefers-reduced-motion:reduce){[data-space-actor] *{animation:none!important}}`}</style>
      {/* 빈자리 — 누르면 옮겨 앉는다(내가 앉아 있을 때만) */}
      {mySeated && layout.seats.map((seat, i) => {
        if (occupied.has(i)) return null;
        const pt = toScreen(rect, seat);
        const h = figureHeight(rect, seat.s);
        const w = Math.round(h * 0.78);
        return (
          <button key={`seat-${i}`} type="button" data-space-seat={i} aria-label="이 자리로 옮겨 앉기" onClick={() => onSeatTap(i)}
            style={{ ...sx("position:absolute; pointer-events:auto; cursor:pointer; padding:0; border-radius:50%; background:rgba(255,255,255,0.10); border:1.5px dashed rgba(255,255,255,0.55)"), left: pt.x - w / 2, top: pt.y - h * 0.16, width: w, height: Math.max(10, Math.round(h * 0.26)) }} />
        );
      })}
      {Object.values(actors).map((a) => {
        const p = a.loc.kind === "seat" ? layout.seats[a.loc.i] : layout.door;
        const pt = toScreen(rect, p);
        const pose = a.moving || a.pendingSeat !== null ? "walk" : "sit";
        // 앉으면 방에 맞게(불당·교회·성당 = 앞을 봄 → 뒷모습 · 명상룸 = 마주 봄 → 옆모습), 걸을 땐 가는 쪽
        const heading = pose === "walk" || a.loc.kind !== "seat" ? a.head : seatHeading(layout, a.loc.i);
        const base = figureHeight(rect, p.s);
        const h = Math.round(base * FIGURE_VIEW[pose].h / FIGURE_VIEW.sit.h);
        const w = Math.round(base * FIGURE_VIEW.sit.w / FIGURE_VIEW.sit.h);
        const t = a.moving ? `${a.ms}ms linear` : "0s";
        const mine = a.uid === me;
        const bubble = bubbles[a.uid];
        const shift = bubble ? bubbleShift(pt.x, bubble.text, boxW) : 0;
        // 이름은 머리 바로 위(그림 위쪽 빈칸만큼 내림) · 말풍선은 그 위
        const headGap = Math.round(h * (pose === "walk" ? 0.12 : 0.14));
        return (
          <div key={a.uid} data-space-actor={mine ? "me" : "other"}
            onClick={mine || a.leaving ? undefined : () => onPersonTap(a.uid)}
            style={{
              ...sx("position:absolute; display:flex; flex-direction:column; align-items:center"),
              left: pt.x - w / 2, top: pt.y - h, width: w, height: h, zIndex: Math.round(pt.y),
              transition: `left ${t}, top ${t}, height ${t}, opacity ${a.leaving ? Math.max(300, a.ms) : 300}ms ease-in`,
              opacity: a.leaving ? 0 : 1,
              pointerEvents: mine || a.leaving ? "none" : "auto", cursor: mine ? "default" : "pointer",
            }}>
            {bubble && !a.leaving && (
              <div data-space-bubble style={{ ...sx("position:absolute; left:50%; max-width:150px; width:max-content; padding:5px 9px; border-radius:12px; background:rgba(255,255,255,0.95); color:#3a4a72; font-size:11.5px; font-weight:600; line-height:1.4; box-shadow:0 3px 10px rgba(0,0,0,0.25); word-break:keep-all; text-align:center"), bottom: `calc(100% - ${headGap}px + 17px)`, transform: `translateX(calc(-50% + ${shift}px))` }}>
                {bubble.text}
              </div>
            )}
            <div style={{ ...sx("position:absolute; left:15%; right:15%; bottom:-3px; height:7px; border-radius:50%; background:radial-gradient(closest-side, rgba(0,0,0,0.38), rgba(0,0,0,0))") }} />
            <div style={{ ...sx("width:100%; height:100%"), animation: pose === "walk" ? "wcBob 0.42s ease-in-out infinite" : "wcBreath 4.5s ease-in-out infinite", transformOrigin: "50% 100%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={figureSrc(a.avatar, pose, heading.face)} alt="" draggable={false} data-space-facing={heading.face + (heading.flip ? "-left" : "")}
                style={{ ...sx("display:block; width:100%; height:100%"), transform: heading.flip ? "scaleX(-1)" : undefined, filter: mine ? "drop-shadow(0 0 3px rgba(201,189,245,0.95))" : "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }} />
            </div>
            <div data-space-name style={{ ...sx("position:absolute; left:50%; transform:translateX(-50%); padding:1px 6px; border-radius:999px; font-size:9.5px; font-weight:700; line-height:1.25; white-space:nowrap; color:#fff"), bottom: `calc(100% - ${headGap}px + 1px)`, background: mine ? "rgba(122,107,196,0.92)" : "rgba(14,22,30,0.55)" }}>
              {mine ? "나" : displayName(a.avatar, a.uid)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Notice({ kind, onClose }: { kind: "risk" | "masked" | "rate" | "too-long" | "reported" | "report-failed"; onClose: () => void }) {
  if (kind === "risk") {
    // 위험한 표현 — 다른 사람에게 보내지 않았다. 앱의 「오늘, 어떤 하루였나요?」와 같은 안내.
    return (
      <div role="alert" data-space-risk style={sx("flex:none; margin:0 14px; padding:12px 13px; border-radius:14px; background:#fdf2f0; border:1px solid #f5bfae; font-size:12.5px; color:#7a3b2e; line-height:1.6; white-space:pre-line")}>
        <div style={sx("font-weight:700; margin-bottom:4px")}>이 말은 다른 분들께 보내지 않았어요.</div>
        {RISK_REPLY.slice(0, 2).join("\n")}
        <div style={sx("text-align:right; margin-top:6px")}><button type="button" onClick={onClose} style={sx("cursor:pointer; border:none; background:transparent; color:#a1614f; font-weight:700; font-size:12px")}>닫기</button></div>
      </div>
    );
  }
  const text = kind === "masked" ? "연락처·링크는 가려서 보냈어요."
    : kind === "rate" ? "조금만 천천히 보내 주세요."
    : kind === "too-long" ? `한 번에 ${MAX_MESSAGE}자까지 보낼 수 있어요.`
    : kind === "reported" ? "신고했어요. 운영자가 확인할게요. 그분은 차단했어요."
    : "신고를 보내지 못했어요. 잠시 뒤 다시 해 주세요.";
  return (
    <div role="status" onClick={onClose} style={sx("flex:none; cursor:pointer; margin:0 14px; padding:8px 12px; border-radius:12px; background:#f4fafb; border:1px solid #d9e6ea; font-size:12px; color:#4d7c8c")}>{text}</div>
  );
}

function Sheet({ title, onClose, tall, children }: { title: string; onClose: () => void; tall?: boolean; children: React.ReactNode }) {
  return (
    <div style={sx("position:absolute; inset:0; z-index:5; display:flex; flex-direction:column; justify-content:flex-end")}>
      <div onClick={onClose} style={sx("position:absolute; inset:0; background:rgba(8,14,20,0.35)")} />
      <div role="dialog" aria-label={title} style={{ ...sx("position:relative; display:flex; flex-direction:column; background:#fff; border-radius:22px 22px 0 0; box-shadow:0 -8px 24px rgba(0,0,0,0.18); animation:wRise 0.2s ease-out"), height: tall ? "66%" : "auto", maxHeight: "86%" }}>
        <div style={sx("flex:none; display:flex; align-items:center; padding:14px 16px 10px")}>
          <div style={sx("flex:1; font-size:15px; font-weight:800; color:#2d5c6e")}>{title}</div>
          <button type="button" onClick={onClose} aria-label="닫기" style={sx("cursor:pointer; width:32px; height:32px; border-radius:50%; border:none; background:#f2f4f6; font-size:16px; color:#6b8c9a")}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MenuBtn({ onClick, strong, children }: { onClick: () => void; strong?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ ...sx("cursor:pointer; padding:7px 12px; border-radius:999px; font-size:12.5px; font-weight:700; border:1.5px solid #cfc5ea"), background: strong ? "#7a6bc4" : "#fff", color: strong ? "#fff" : "#4a3f80", borderColor: strong ? "#7a6bc4" : "#cfc5ea" }}>{children}</button>
  );
}

function TabBtn({ on, onClick, dot, children }: { on: boolean; onClick: () => void; dot?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      style={{ ...sx("flex:none; cursor:pointer; position:relative; display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:999px; font-size:12.5px; font-weight:700; white-space:nowrap; border:1.5px solid"), background: on ? "#4a3f80" : "#fff", color: on ? "#fff" : "#4a3f80", borderColor: on ? "#4a3f80" : "#d9d2ec" }}>
      {children}
      {dot && <span aria-hidden style={sx("position:absolute; top:-2px; right:-2px; width:9px; height:9px; border-radius:50%; background:#ef7f6a; border:2px solid #fff")} />}
    </button>
  );
}
