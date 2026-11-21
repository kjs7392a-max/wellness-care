"use client";
/**
 * 마음 쉼터 「함께 머무는 사람」 화면(2026-11-20 사용자 지시) — 캐릭터 고르기 · 같은 공간에 있는 사람 · 단체/1:1 대화 · 차단 · 신고.
 * 규칙은 space-together.ts(순수·테스트), 연결은 space-realtime.ts. 연결 정보가 없으면(space-config) 이 화면은 아예 안 나온다.
 * 🚫 메시지를 기기에 저장하지 말 것(localStorage·sessionStorage 금지) — 방을 나가면 사라지는 것이 약속이다.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { sx } from "./sx";
import { AVATARS, avatarOf, avatarSrc, avatarSvgSrc, figureSrc, FIGURE_VIEW, type AvatarId, type FigurePose } from "./space-avatars";
import { BUBBLE_MS, bubbleShift, bubbleText, doorPoint, figureHeight, resolveSeats, ROOM_LAYOUT, routeIn, routeMove, routeOut, seatHeading, sitPoint, toScreen, walkHeading, walkMs, type Heading, type Rect, type RoomLayout, type ScenePt, type Way } from "./space-seats";
import { CHAT_NOTICE, checkNickname, checkOutgoing, createRateLimiter, displayName, MAX_MESSAGE, NICK_MAX, NICK_MIN, NICK_PROBLEM_TEXT, REPORT_REASONS, type ChatMessage, type Presence, type ReportReason } from "./space-together";
import { fetchProfiles, joinRoom, saveMyProfile, type RoomSession, type RoomStatus, type SpaceProfile, type SpaceWho } from "./space-realtime";
import { RISK_REPLY } from "./risk";
import type { SpaceId } from "./space";

// ---- 내 이름·캐릭터(2026-11-20 "계속 고유 캐릭터와 아이디를") — 진짜는 서버(space_profiles) · 기기엔 빨리 보여 줄 사본만 ----
// 계정 = 기기에 아이디별로 · 둘러보기 = 그 기기(브라우저)에 하나. 🚫 메시지는 저장하지 않는다(이 사본만 쓴다).
const PROFILE_KEY = "wellness-care:space-profile:v1";
const whoKey = (who: SpaceWho) => (who.guest ? "guest" : who.loginId.trim().toLowerCase());
function readProfiles(): Record<string, unknown> {
  try { return JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "{}") as Record<string, unknown>; } catch { return {}; }
}
export function loadProfileLocal(who: SpaceWho): SpaceProfile | null {
  const v = readProfiles()[whoKey(who)] as Partial<SpaceProfile> | undefined;
  if (!v || typeof v.uid !== "string" || typeof v.nickname !== "string" || !avatarOf(v.avatar)) return null;
  return { uid: v.uid, nickname: v.nickname, avatar: v.avatar as AvatarId, updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : 0 };
}
export function saveProfileLocal(who: SpaceWho, p: SpaceProfile | null) {
  try {
    const o = readProfiles();
    if (p) o[whoKey(who)] = p; else delete o[whoKey(who)];
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(o));
  } catch { /* 못 저장해도 서버에 있으니 다음에 다시 읽는다 */ }
}

export function AvatarImg({ id, size, ring }: { id: AvatarId; size: number; ring?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  // 마음의 대화 캐릭터 그림 — 못 읽으면 그린 얼굴로
  return <img src={avatarSrc(id)} alt="" width={size} height={size} onError={(e) => { const el = e.currentTarget; if (!el.src.startsWith("data:")) el.src = avatarSvgSrc(id); }}
    style={{ ...sx("flex:none; display:block; border-radius:50%; object-fit:cover"), width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }} />;
}

/** 캐릭터 고르기 — 3×2(윗줄 여성 · 아랫줄 남성 · 마음의 대화 캐릭터 6명) */
export function AvatarPicker({ value, onPick }: { value: AvatarId | null; onPick: (id: AvatarId) => void }) {
  return (
    <div data-space-avatar-picker style={sx("display:grid; grid-template-columns:repeat(3, 1fr); gap:10px 6px")}>
      {AVATARS.map((a) => {
        const on = a.id === value;
        return (
          <button key={a.id} type="button" onClick={() => onPick(a.id)} aria-pressed={on} aria-label={`${a.name} · ${a.hint}`}
            style={{ ...sx("cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 2px; border-radius:14px; background:transparent; border:1.5px solid transparent"), borderColor: on ? "#7a6bc4" : "transparent", background: on ? "#f2edfa" : "transparent" }}>
            <AvatarImg id={a.id} size={58} />
            <span style={sx("font-size:12.5px; font-weight:800; color:#4a3f80")}>{a.name}</span>
            <span style={sx("font-size:10px; color:#8ba8b3; white-space:nowrap")}>{a.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 캐릭터 고르기 + 이름 짓기(2026-11-20) — 이름은 모두 통틀어 하나뿐이라 서버에 맞춰 본다(이미 있으면 다시).
 * 한 번 지으면 다음에 들어와도 그 이름·캐릭터 그대로(같은 기기 · 계정은 아이디별).
 */
export function ProfileEditor({ who, initial, onSaved, onCancel }: { who: SpaceWho; initial: SpaceProfile | null; onSaved: (p: SpaceProfile) => void; onCancel?: () => void }) {
  const [avatar, setAvatar] = useState<AvatarId | null>(initial?.avatar ?? null);
  const [name, setName] = useState(initial?.nickname ?? "");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (busy) return;
    if (!avatar) { setProblem("캐릭터를 먼저 골라 주세요."); return; }
    const c = checkNickname(name);
    if (!c.ok) { setProblem(NICK_PROBLEM_TEXT[c.reason]); return; }
    setBusy(true); setProblem(null);
    const r = await saveMyProfile(who, c.nickname, avatar);
    setBusy(false);
    if (!r.ok) {
      setProblem(r.reason === "taken" ? "이미 누가 쓰고 있는 이름이에요. 다른 이름을 지어 주세요." : r.reason === "invalid" ? NICK_PROBLEM_TEXT.chars : "저장하지 못했어요. 잠시 뒤 다시 해 주세요.");
      return;
    }
    saveProfileLocal(who, r.profile);
    onSaved(r.profile);
  };
  return (
    <div data-space-profile-editor style={sx("display:flex; flex-direction:column; gap:12px")}>
      <AvatarPicker value={avatar} onPick={(id) => { setAvatar(id); setProblem(null); }} />
      <div style={sx("display:flex; flex-direction:column; gap:6px")}>
        <div style={sx("font-size:13px; font-weight:800; color:#4a3f80")}>이름 짓기</div>
        <div style={sx("display:flex; gap:8px")}>
          <input value={name} onChange={(e) => { setName(e.target.value); setProblem(null); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) void save(); }}
            maxLength={NICK_MAX} placeholder={`${NICK_MIN}~${NICK_MAX}자 · 한글·영문·숫자`} aria-label="내 이름" data-space-nickname
            style={sx("flex:1; min-width:0; padding:11px 13px; border-radius:12px; border:1.5px solid #d9d2ec; font-size:14px; outline:none; background:#fff; color:#2d3a4a")} />
          <button type="button" onClick={() => void save()} disabled={busy} data-space-profile-save
            style={{ ...sx("flex:none; cursor:pointer; padding:11px 14px; border-radius:12px; border:none; font-size:13.5px; font-weight:800; color:#fff"), background: busy ? "#c9c2e4" : "#7a6bc4" }}>{busy ? "확인 중…" : initial ? "바꾸기" : "이렇게 할게요"}</button>
        </div>
        {problem ? <div role="alert" style={sx("font-size:12px; color:#c0563f; line-height:1.5")}>{problem}</div>
          : <div style={sx("font-size:11.5px; color:#8ba8b3; line-height:1.55")}>다른 사람과 겹치지 않는 나만의 이름이에요. 실명이나 연락처는 쓰지 말아 주세요. 다음에 들어와도 이 이름 그대로예요.</div>}
        {onCancel && <button type="button" onClick={onCancel} style={sx("align-self:flex-start; cursor:pointer; padding:4px 0; border:none; background:transparent; color:#8a80b8; font-size:12px; font-weight:700")}>그대로 둘게요</button>}
      </div>
    </div>
  );
}

interface Thread { avatar: AvatarId | null; messages: (ChatMessage & { hidden?: boolean })[]; unread: number }

/**
 * 공간 안 — 머리줄 아래 「함께 있는 사람」 알약 + 대화 시트. 공간을 나가면(화면이 사라지면) 연결도 끊는다.
 * 대화 단추는 말풍선 그림만(글자 없음) · avatar 가 없으면 누르면 캐릭터 고르기 시트.
 */
export function TogetherLayer({ who, room, profile, onProfile, rect }: { who: SpaceWho; room: SpaceId; profile: SpaceProfile | null; onProfile: (p: SpaceProfile) => void; rect: Rect }) {
  // 이름을 지어야 함께할 수 있다(이름 = 모두 통틀어 하나뿐인 나)
  const avatar = profile?.avatar ?? null;
  const pv = profile?.updatedAt ?? 0;
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
  // 들어와서 자리를 골랐는지(2026-11-20 사용자 "처음 들어올 때 원을 줘야 자기가 고를 수 있겠네")
  const [seatChosen, setSeatChosen] = useState(false);
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
    }, pv).then((s) => {
      if (cancelled) { s.leave(); return; }
      session = s;
      sessionRef.current = s;
      trackedSeatRef.current = undefined;
      setSeatChosen(false);
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
  }, [avatar, pv, room, who.guest, who.loginId]);

  useEffect(() => { sessionRef.current?.setBlocked(blocked); }, [blocked]);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6 }); }, [roomMsgs, threads, tab, open]);

  const me = meUid;
  // 사람들 이름 — 서버 표(space_profiles)에서 uid 로 읽는다 · 이름을 바꾸면(pv) 다시 읽는다
  const [names, setNames] = useState<Record<string, { nickname: string; pv: number }>>({});
  const namesRef = useRef(names); namesRef.current = names;
  useEffect(() => {
    const need = people.filter((p) => p.uid !== me && (!namesRef.current[p.uid] || (p.pv ?? 0) !== namesRef.current[p.uid].pv)).map((p) => p.uid);
    if (!need.length) return;
    let off = false;
    const pvOf = new Map(people.map((p) => [p.uid, p.pv ?? 0]));
    void fetchProfiles(who, need).then((list) => {
      if (off) return;
      setNames((n) => {
        const m = { ...n };
        for (const uid of need) m[uid] = { nickname: m[uid]?.nickname ?? "", pv: pvOf.get(uid) ?? 0 }; // 못 읽어도 다시 묻지 않게
        for (const pr of list) m[pr.uid] = { nickname: pr.nickname, pv: pvOf.get(pr.uid) ?? 0 };
        return m;
      });
    });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, me]);
  /** 보이는 이름 — 내가 지은 이름 · 아직 못 읽었으면 캐릭터 이름 + 짧은 번호 */
  const label = (uid: string, av: AvatarId) => (uid === me && profile ? profile.nickname : names[uid]?.nickname) || displayName(av, uid);
  // people = 이 방 사람 전부(나·차단 포함). 목록에 보이는 건 나·차단 뺀 사람.
  const peopleShown = people.filter((p) => p.uid !== me && !blocked.has(p.uid));
  const layout = ROOM_LAYOUT[room];
  // 자리 — 자리를 고른 사람 모두(차단 포함)로 같은 답을 낸다 · 아직 고르는 중인 사람은 빠진다
  const seated = useMemo(() => people.filter((p) => !p.picking), [people]);
  const seats = useMemo(() => resolveSeats(seated, layout.seats.length), [seated, layout]);
  // 장면엔 차단한 사람 · 고르는 중인 사람을 그리지 않는다(자리는 위 계산대로 비워 둔다)
  const scenePeople = useMemo(() => seated.filter((p) => !blocked.has(p.uid)), [seated, blocked]);
  // 들어오면 빈자리 원이 보이고, 하나를 누르면 그리로 걸어 들어가 앉는다 · 안 누르면 20초 뒤 앞쪽 빈자리로
  const choosing = !!me && status === "live" && !!avatar && !seatChosen;
  const freeSeats = useMemo(() => {
    const taken = new Set([...seats.values()].filter((v): v is number => v !== null));
    return layout.seats.map((_, i) => i).filter((i) => !taken.has(i));
  }, [seats, layout]);
  const chooseSeat = (i: number | null) => {
    const s = sessionRef.current;
    if (!s || !me || seatChosen) return;
    trackedSeatRef.current = i;
    setSeatChosen(true);
    s.moveTo(i);
    const now = Date.now();
    setPeople((ps) => ps.map((p) => (p.uid === me ? { ...p, seat: i, picking: false, at: now } : p)));
  };
  const freeRef = useRef(freeSeats); freeRef.current = freeSeats;
  useEffect(() => {
    if (!choosing) return;
    if (!freeRef.current.length) { chooseSeat(null); return; } // 자리가 다 찼다 — 목록에만
    const t = setTimeout(() => chooseSeat(freeRef.current[0] ?? null), CHOOSE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choosing]);
  // 내 자리가 정해지면 알린다(먼저 온 사람에게 밀렸을 때도) — 같은 값이면 다시 안 보낸다
  useEffect(() => {
    const s = sessionRef.current;
    if (!s || !me) return;
    const mine = seats.get(me);
    if (mine === undefined || trackedSeatRef.current === mine) return;
    trackedSeatRef.current = mine;
    s.moveTo(mine);
  }, [seats, me]);
  const openPeer = (uid: string) => { openSheet(); setPeerMenu(uid); };
  const avatarFor = (uid: string): AvatarId | null => peopleShown.find((p) => p.uid === uid)?.avatar ?? threads[uid]?.avatar ?? null;
  const nameFor = (uid: string) => { const a = avatarFor(uid); return names[uid]?.nickname || (a ? displayName(a, uid) : "나간 사람"); };
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
  // 대화 단추 — 말풍선 그림만(2026-11-20 사용자 "아직 혼자예요 같은 말은 필요 없어 · 말풍선만") · 새 메시지는 빨간 숫자
  const pillLabel = !avatar ? "함께하기 — 캐릭터 고르기" : status === "error" ? "대화 — 연결하지 못했어요" : `대화${peopleShown.length ? ` — ${peopleShown.length}명과 함께` : ""}${unread ? ` · 새 메시지 ${unread}개` : ""}`;
  const pill = (
    <button type="button" data-space-together-pill aria-label={pillLabel} title={pillLabel} onClick={() => (avatar ? openSheet() : setPicking(true))}
      style={{ ...sx("position:absolute; left:14px; top:100px; z-index:3; cursor:pointer; width:42px; height:42px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:50%; border:1px solid rgba(255,255,255,0.4); background:rgba(14,22,30,0.42); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px)"), opacity: avatar && status !== "live" ? 0.55 : 1 }}>
      <ChatBubbleIcon />
      {unread > 0 && <span aria-hidden style={sx("position:absolute; top:-4px; right:-4px; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#ef7f6a; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; border:1.5px solid #fff")}>{unread > 99 ? "99+" : unread}</span>}
    </button>
  );

  return (
    <>
      {avatar && status === "live" && rect.width > 0 && (
        <SpaceScene layout={layout} rect={rect} me={me} myJoin={myJoin}
          people={scenePeople} seats={seats} bubbles={bubbles}
          choices={choosing ? freeSeats : null} onChoose={chooseSeat} label={label}
          onPersonTap={openPeer} />
      )}
      {pill}
      {picking && (
        <Sheet onClose={() => setPicking(false)} title="함께 머물 캐릭터">
          <div style={sx("padding:4px 18px 8px; font-size:12.5px; color:#6b8c9a; line-height:1.6")}>같은 공간에 있는 사람들끼리 캐릭터가 보이고 대화할 수 있어요. 실명 대신 캐릭터 이름만 보여요.</div>
          <div style={sx("padding:6px 14px 18px")}><ProfileEditor who={who} initial={profile} onSaved={(p) => { onProfile(p); setPicking(false); }} /></div>
        </Sheet>
      )}
      {open && avatar && (
        <Sheet onClose={() => { setOpen(false); setPeerMenu(null); setReporting(null); }} title="함께 머무는 사람" tall>
          {/* 사람 줄 — 나 + 함께 있는 사람(누르면 1:1 · 차단 · 신고) */}
          <div style={sx("flex:none; display:flex; gap:12px; overflow-x:auto; padding:2px 16px 10px")}>
            <div style={sx("flex:none; display:flex; flex-direction:column; align-items:center; gap:3px; width:56px")}>
              <AvatarImg id={avatar} size={40} ring="#7a6bc4" />
              {/* 내 캐릭터 이름(다른 사람에게 보이는 그대로) + (나) — 2026-11-20 사용자 "캐릭터 이름은 나오게" */}
              <span data-space-my-name style={sx("font-size:11px; font-weight:800; color:#4a3f80; white-space:nowrap")}>{profile?.nickname ?? (me ? displayName(avatar, me) : avatarOf(avatar)?.name)}</span>
              <span style={sx("font-size:10px; font-weight:700; color:#8a80b8; margin-top:-3px")}>나</span>
            </div>
            {peopleShown.map((p) => (
              <button key={p.uid} type="button" data-space-person onClick={() => setPeerMenu((m) => (m === p.uid ? null : p.uid))}
                style={sx("flex:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; width:60px; padding:0; border:none; background:transparent")}>
                <AvatarImg id={p.avatar} size={40} ring={peerMenu === p.uid ? "#7a6bc4" : undefined} />
                <span style={sx("font-size:11px; font-weight:700; color:#4a5f6a; white-space:nowrap")}>{label(p.uid, p.avatar)}</span>
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
                    {!mine && <span style={sx("font-size:10.5px; color:#8ba8b3; padding:0 4px")}>{label(m.from, m.avatar)}</span>}
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
// 같은 날 사용자: "자리를 옮기거나 할 필요는 없을 것 같아 · 원은 아예 안 보이게 · 귀신도 아니고 스르르 움직이지 말고 걷는 것처럼"
//   → 🚫 앉은 뒤 자리 옮기기 없음 · 🚫 나갈 때 흐려지며 사라지기 없음(입구가 화면 밖이라 걸어서 나간다)
// 이어서 사용자: "보통 처음 들어올 때 원형을 줘야지 자기가 고를 수 있겠네" → 들어올 때만 빈자리 원을 보여 주고 고르게 한다.
//   → 길을 따라 걷는다(교회·성당은 통로 → 줄 끝 → 옆으로, 줄 안에선 아랫몸이 등받이에 가림) · 걸음 빠르기는 키에 맞춤.
/** 장면 속 한 사람. pos = 지금 있는(걷는 중이면 가는) 곳 — CSS transition 이 ms 동안 그리로 옮긴다. */
interface Actor {
  uid: string; avatar: AvatarId;
  pos: ScenePt; ms: number; head: Heading;
  /** 이번 구간의 빠르기 곡선 — 처음은 천천히 출발, 마지막은 천천히 멈춘다 */
  ease: string;
  /** 장의자 줄 안 — 아랫몸이 등받이에 가린다 */
  clip: boolean;
  walking: boolean;
  /** 가는/앉은 자리 */
  seat: number;
  leaving: boolean;
}

/** 걷기 빠르기 곡선(2026-11-20 "자연스럽게") — 출발은 천천히, 멈출 땐 천천히. 이어지는 쪽 끝은 기울기 1(직선 구간과 매끄럽게). */
const EASE_START = "cubic-bezier(.45,0,.75,.75)";
const EASE_STOP = "cubic-bezier(.25,.25,.55,1)";
const EASE_BOTH = "cubic-bezier(.42,0,.58,1)";
/** 들어와서 자리를 안 고르면 이만큼 뒤 앞쪽 빈자리로 */
const CHOOSE_MS = 20000;
/** 일어선 뒤 걷기 전 · 도착해서 앉기 전 잠깐 서 있는 시간 */
const STAND_PAUSE_MS = 600;
const SIT_PAUSE_MS = 450;

const reducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

/**
 * 영상 위에 캐릭터를 자리(space-seats)에 앉힌다.
 * - 나보다 늦게 들어온 사람(그리고 나 자신)은 화면 밖 입구에서 걸어 들어와 앉는다 · 먼저 있던 사람은 처음부터 앉아 있다.
 * - 나가면(presence 에서 사라지면) 일어나 들어온 길을 거꾸로 걸어 화면 밖으로 나간다.
 * - 자리는 들어올 때 한 번 고른다(빈자리 원 · 2026-11-20 사용자) — 앉은 뒤엔 옮기지 않는다. 안 고르면 20초 뒤 앞쪽 빈자리.
 *   같은 자리를 동시에 고르면 먼저 온 사람이 앉고, 밀린 사람은 통로를 거쳐 다른 빈자리로 걸어간다.
 * - 다른 사람을 누르면 대화 시트(1:1·차단·신고).
 */
function SpaceScene({ layout, rect, me, myJoin, people, seats, bubbles, choices, onChoose, label, onPersonTap }: {
  layout: RoomLayout; rect: Rect; me: string; myJoin: number;
  people: Presence[]; seats: Map<string, number | null>; bubbles: Record<string, { text: string; id: string }>;
  /** 들어와서 자리를 고르는 동안만 — 빈자리 번호들(원으로 보인다) · 그 밖엔 null */
  choices: number[] | null; onChoose: (i: number) => void;
  /** 보이는 이름(내가 지은 이름) */
  label: (uid: string, avatar: AvatarId) => string;
  onPersonTap: (uid: string) => void;
}) {
  const actorsRef = useRef<Record<string, Actor>>({});
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rectRef = useRef(rect); rectRef.current = rect;
  const still = useMemo(() => reducedMotion(), []);
  useEffect(() => () => { for (const t of Object.values(timers.current)) clearTimeout(t); }, []);
  // 장면 크기 — 입구를 화면 밖으로 밀고, 가장자리 말풍선을 안쪽으로 민다
  const boxRef = useRef<HTMLDivElement | null>(null);
  const boxSize = useRef({ w: 0, h: 0 });
  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => { boxSize.current = { w: el.clientWidth, h: el.clientHeight }; setBoxW(el.clientWidth); };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const walkH = (s: number) => (figureHeight(rectRef.current, s) * FIGURE_VIEW.walk.h) / FIGURE_VIEW.sit.h;
  /** 화면 위치(발밑 가운데) — 장의자 줄은 sink 만큼 아래(바닥), 입구는 캐릭터가 다 숨도록 화면 밖 */
  const screenOf = (p: ScenePt) => {
    const r = rectRef.current;
    const base = figureHeight(r, p.s);
    let { x, y } = toScreen(r, p);
    y += (p.sink ?? 0) * base;
    if (p.door) {
      const { w, h } = boxSize.current;
      const half = (base * FIGURE_VIEW.sit.w) / FIGURE_VIEW.sit.h / 2;
      if (p.y >= 1) y = Math.max(y, h + walkH(p.s) + 8);
      if (p.x <= 0) x = Math.min(x, -half - 8);
      if (p.x >= 1) x = Math.max(x, w + half + 8);
    }
    return { x, y };
  };
  const put = (a: Actor) => { actorsRef.current = { ...actorsRef.current, [a.uid]: a }; redraw(); };
  const patch = (uid: string, p: Partial<Actor>) => { const cur = actorsRef.current[uid]; if (cur) put({ ...cur, ...p }); };
  const drop = (uid: string) => { clearTimeout(timers.current[uid]); const n = { ...actorsRef.current }; delete n[uid]; actorsRef.current = n; redraw(); };
  const headTo = (from: ScenePt, to: ScenePt | undefined, fallback: Heading) => (to ? walkHeading(screenOf(from), screenOf(to)) : fallback);

  /**
   * 길(ways)을 구간마다 걷는다 — 가는 쪽을 보고, 키에 맞는 빠르기로(2026-11-20 "천천히 자연스럽게").
   * 처음 구간은 천천히 출발하고 마지막 구간은 천천히 멈춘다(곡선만큼 조금 더 오래) · 멈춰 선 동안은 서 있는 모습(stand).
   * pauseMs = 출발 전에 서 있는 시간(일어선 뒤 잠깐) · 시작 모습이 한 번 그려진 뒤 출발해야 transition 이 걸린다.
   */
  const walk = (uid: string, ways: Way[], end: () => void, pauseMs = 60) => {
    clearTimeout(timers.current[uid]);
    let k = 0;
    const next = () => {
      const cur = actorsRef.current[uid];
      if (!cur) return;
      if (k >= ways.length) { patch(uid, { ms: 0 }); end(); return; }
      const first = k === 0, last = k === ways.length - 1;
      const w = ways[k++];
      const from = screenOf(cur.pos), to = screenOf(w.to);
      const base = still ? 0 : walkMs(from, to, (walkH(cur.pos.s) + walkH(w.to.s)) / 2);
      const ease = first && last ? EASE_BOTH : first ? EASE_START : last ? EASE_STOP : "linear";
      const ms = Math.round(base * (ease === "linear" ? 1 : ease === EASE_BOTH ? 1.2 : 1.1));
      patch(uid, { pos: w.to, ms, ease, clip: w.clip, walking: true, head: ms > 0 ? walkHeading(from, to) : cur.head });
      timers.current[uid] = setTimeout(next, ms);
    };
    timers.current[uid] = setTimeout(next, still ? 0 : pauseMs);
  };
  /** 도착하면 잠깐 섰다가 앉는다 */
  const sitDown = (uid: string, seat: number) => {
    clearTimeout(timers.current[uid]);
    timers.current[uid] = setTimeout(() => patch(uid, { pos: sitPoint(layout, seat), ms: 0, clip: false, walking: false, seat }), still ? 0 : SIT_PAUSE_MS);
  };

  const enter = (p: Presence, seat: number) => {
    clearTimeout(timers.current[p.uid]);
    const walkIn = !still && (p.uid === me || (p.at ?? p.since) > myJoin + 1500);
    if (!walkIn) {
      put({ uid: p.uid, avatar: p.avatar, pos: sitPoint(layout, seat), ms: 0, ease: "linear", head: seatHeading(layout, seat), clip: false, walking: false, seat, leaving: false });
      return;
    }
    const ways = routeIn(layout, seat), door = doorPoint(layout);
    put({ uid: p.uid, avatar: p.avatar, pos: door, ms: 0, ease: "linear", head: headTo(door, ways[0]?.to, seatHeading(layout, seat)), clip: false, walking: true, seat, leaving: false });
    walk(p.uid, ways, () => sitDown(p.uid, seat));
  };
  /** 걷던 사람이 지금 향하던 길목에서 통로까지 되짚는 길(입구는 빼고) */
  const backToAisle = (a: Actor): Way[] => {
    const inn = routeIn(layout, a.seat);
    const j = inn.findIndex((w) => w.to.x === a.pos.x && w.to.y === a.pos.y && !a.pos.door);
    const ways: Way[] = [];
    for (let k = j - 1; k >= 0; k--) ways.push({ to: inn[k].to, clip: inn[k + 1].clip });
    return ways;
  };
  const leave = (uid: string) => {
    const a = actorsRef.current[uid];
    if (!a || a.leaving) return;
    if (still) { drop(uid); return; }
    if (a.walking) { // 걷던 중 — 온 길을 되짚어(장의자를 가로지르지 않게) 입구로
      patch(uid, { leaving: true });
      walk(uid, [...backToAisle(a), { to: doorPoint(layout), clip: false }], () => drop(uid));
      return;
    }
    const out = routeOut(layout, a.seat); // 일어선다 → 들어온 길을 거꾸로
    patch(uid, { leaving: true, walking: true, ms: 0, pos: out.stand.to, clip: out.stand.clip, head: headTo(out.stand.to, out.ways[0]?.to, a.head) });
    walk(uid, out.ways, () => drop(uid), STAND_PAUSE_MS);
  };
  const reseat = (uid: string, seat: number) => {
    const a = actorsRef.current[uid];
    if (!a) return;
    if (a.walking) { // 걷던 중 — 온 길을 되짚어 통로로 나온 뒤 새 자리로
      patch(uid, { seat });
      walk(uid, [...backToAisle(a), ...routeIn(layout, seat)], () => sitDown(uid, seat));
      return;
    }
    const mv = routeMove(layout, a.seat, seat);
    patch(uid, { seat, walking: true, ms: 0, pos: mv.stand.to, clip: mv.stand.clip, head: headTo(mv.stand.to, mv.ways[0]?.to, a.head) });
    walk(uid, mv.ways, () => sitDown(uid, seat), STAND_PAUSE_MS);
  };

  // 사람 목록·자리가 바뀔 때 — 새로 온 사람 · 자리가 밀린 사람 · 나간 사람
  useEffect(() => {
    const present = new Set<string>();
    for (const p of people) {
      const seat = seats.get(p.uid);
      if (seat === null || seat === undefined) continue; // 자리가 다 찼다 — 장면엔 없고 목록에만
      present.add(p.uid);
      const a = actorsRef.current[p.uid];
      if (!a || a.leaving) { enter(p, seat); continue; }
      if (a.avatar !== p.avatar) patch(p.uid, { avatar: p.avatar });
      if (a.seat !== seat) reseat(p.uid, seat);
    }
    for (const uid of Object.keys(actorsRef.current)) if (!present.has(uid)) leave(uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, seats, me, myJoin, layout, still]);

  return (
    <div ref={boxRef} data-space-scene style={sx("position:absolute; inset:0; z-index:2; pointer-events:none; overflow:hidden")}>
      <style>{`@keyframes wcBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}@keyframes wcSeat{0%,100%{opacity:.75}50%{opacity:1}}@media (prefers-reduced-motion:reduce){[data-space-actor] *,[data-space-seat]{animation:none!important}}`}</style>
      {/* 들어와서 자리 고르기 — 빈자리 원(이때만 보인다) · 누르면 그리로 걸어 들어가 앉는다 */}
      {choices && choices.length > 0 && (
        <>
          <div data-space-choose-hint style={{ ...sx("position:absolute; left:50%; transform:translateX(-50%); padding:7px 14px; border-radius:999px; background:rgba(14,22,30,0.6); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); color:#fff; font-size:13px; font-weight:700; white-space:nowrap; pointer-events:none; animation:wFade 0.3s ease-out"), top: Math.max(150, Math.min(...choices.map((i) => toScreen(rect, layout.seats[i]).y)) - figureHeight(rect, Math.max(...choices.map((i) => layout.seats[i].s))) - 46) }}>
            앉고 싶은 자리를 눌러 주세요
          </div>
          {choices.map((i) => {
            const seat = layout.seats[i];
            const pt = toScreen(rect, seat);
            // 원 = 방석·좌복(장의자는 앉을 자리) 크기 — 캐릭터를 줄여도 원은 실사 크기 그대로(실사 상자 높이의 0.55배 폭)
            const h = Math.round(rect.height * seat.s);
            const w = Math.round(h * 0.55);
            const ch = Math.max(14, Math.round(h * 0.17));
            return (
              <button key={`seat-${i}`} type="button" data-space-seat={i} aria-label={`${i + 1}번 자리에 앉기`} onClick={() => onChoose(i)}
                style={{ ...sx("position:absolute; pointer-events:auto; cursor:pointer; padding:0; border-radius:50%; background:rgba(201,189,245,0.28); border:2px dashed rgba(255,255,255,0.85); box-shadow:0 0 10px rgba(201,189,245,0.6); animation:wcSeat 1.6s ease-in-out infinite"), left: pt.x - w / 2, top: pt.y - ch * 0.7, width: w, height: ch }} />
            );
          })}
        </>
      )}
      {Object.values(actorsRef.current).map((a) => {
        // 걷기 · 앉으면 방석·좌복은 책상다리, 교회·성당 장의자는 윗몸만(등받이에 가림)
        const pose: FigurePose = a.walking ? (a.ms > 0 ? "walk" : "stand") : layout.sitOn === "pew" ? "pew" : "sit";
        // 앉으면 방에 맞게(불당·교회·성당 = 앞을 봄 → 뒷모습 · 명상룸 = 마주 봄 → 옆모습), 걸을 땐 가는 쪽
        const heading = a.walking ? a.head : seatHeading(layout, a.seat);
        const pt = screenOf(a.pos);
        const base = figureHeight(rect, a.pos.s);
        const h = Math.round((base * FIGURE_VIEW[pose].h) / FIGURE_VIEW.sit.h);
        const w = Math.round((base * FIGURE_VIEW.sit.w) / FIGURE_VIEW.sit.h);
        const t = a.ms > 0 ? `${a.ms}ms ${a.ease}` : "0s";
        // 장의자 줄 안에선 sink 만큼(발~정강이) 잘라 등받이에 가린 것처럼
        const cut = a.clip ? ((a.pos.sink ?? 0) * FIGURE_VIEW.sit.h) / FIGURE_VIEW[pose].h : 0;
        const mine = a.uid === me;
        const bubble = bubbles[a.uid];
        const shift = bubble ? bubbleShift(pt.x, bubble.text, boxW) : 0;
        // 이름은 머리 바로 위(그림 위쪽 빈칸만큼 내림) · 말풍선은 그 위
        const headGap = Math.round(h * (pose === "walk" || pose === "stand" ? 0.12 : pose === "pew" ? 0.17 : 0.14));
        // 발밑 그림자 — 캐릭터 크기에 맞춰(실사 크기라 커졌다)
        const shadowH = Math.max(6, Math.round(w * 0.07));
        return (
          <div key={a.uid} data-space-actor={mine ? "me" : "other"} data-space-walking={a.walking ? "1" : "0"}
            onClick={mine || a.leaving ? undefined : () => onPersonTap(a.uid)}
            role={mine ? undefined : "button"} aria-label={mine ? undefined : `${label(a.uid, a.avatar)} 님 메뉴`}
            style={{
              ...sx("position:absolute"),
              left: pt.x - w / 2, top: pt.y - h, width: w, height: h, zIndex: Math.round(pt.y),
              transition: `left ${t}, top ${t}, width ${t}, height ${t}`,
              pointerEvents: mine || a.leaving ? "none" : "auto", cursor: mine ? "default" : "pointer",
            }}>
            {bubble && !a.leaving && (
              <div data-space-bubble style={{ ...sx("position:absolute; left:50%; max-width:150px; width:max-content; padding:5px 9px; border-radius:12px; background:rgba(255,255,255,0.95); color:#3a4a72; font-size:11.5px; font-weight:600; line-height:1.4; box-shadow:0 3px 10px rgba(0,0,0,0.25); word-break:keep-all; text-align:center"), bottom: `calc(100% - ${headGap}px + 17px)`, transform: `translateX(calc(-50% + ${shift}px))` }}>
                {bubble.text}
              </div>
            )}
            {!a.clip && pose !== "pew" && <div style={{ ...sx("position:absolute; left:15%; right:15%; border-radius:50%; background:radial-gradient(closest-side, rgba(0,0,0,0.38), rgba(0,0,0,0))"), height: shadowH, bottom: -Math.round(shadowH / 2) }} />}
            <div data-space-clip style={{ ...sx("position:absolute; left:0; right:0; top:0; overflow:hidden"), height: `${(1 - cut) * 100}%` }}>
              <div style={{ ...sx("position:absolute; left:0; right:0; top:0"), height: `${100 / (1 - cut)}%`, animation: a.walking ? undefined : "wcBreath 4.5s ease-in-out infinite", transformOrigin: "50% 100%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={figureSrc(a.avatar, pose, heading.face)} alt="" draggable={false} data-space-facing={heading.face + (heading.flip ? "-left" : "")}
                  style={{ ...sx("display:block; width:100%; height:100%"), transform: heading.flip ? "scaleX(-1)" : undefined, filter: mine ? "drop-shadow(0 0 3px rgba(201,189,245,0.95))" : "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }} />
              </div>
            </div>
            <div data-space-name style={{ ...sx("position:absolute; left:50%; transform:translateX(-50%); padding:1px 6px; border-radius:999px; font-size:9.5px; font-weight:700; line-height:1.25; white-space:nowrap; color:#fff"), bottom: `calc(100% - ${headGap}px + 1px)`, background: mine ? "rgba(122,107,196,0.92)" : "rgba(14,22,30,0.55)" }}>
              {label(a.uid, a.avatar)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 말풍선 그림(대화 단추) */
function ChatBubbleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5c-4.97 0-9 3.36-9 7.5 0 2.3 1.25 4.36 3.2 5.73-.12 1.13-.6 2.27-1.45 3.27 1.86-.1 3.37-.76 4.4-1.58.9.25 1.86.38 2.85.38 4.97 0 9-3.36 9-7.5s-4.03-7.8-9-7.8Z" fill="#fff" />
      <circle cx="8.2" cy="11.2" r="1.15" fill="#4a5a72" /><circle cx="12" cy="11.2" r="1.15" fill="#4a5a72" /><circle cx="15.8" cy="11.2" r="1.15" fill="#4a5a72" />
    </svg>
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
