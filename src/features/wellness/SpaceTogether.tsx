"use client";
/**
 * 마음 쉼터 「함께 머무는 사람」 화면(2026-11-20 사용자 지시) — 캐릭터 고르기 · 같은 공간에 있는 사람 · 단체/1:1 대화 · 차단 · 신고.
 * 규칙은 space-together.ts(순수·테스트), 연결은 space-realtime.ts. 연결 정보가 없으면(space-config) 이 화면은 아예 안 나온다.
 * 🚫 메시지를 기기에 저장하지 말 것(localStorage·sessionStorage 금지) — 방을 나가면 사라지는 것이 약속이다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { sx } from "./sx";
import { AVATARS, avatarOf, avatarSrc, type AvatarId } from "./space-avatars";
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
export function TogetherLayer({ who, room, avatar, onPickAvatar }: { who: SpaceWho; room: SpaceId; avatar: AvatarId | null; onPickAvatar: (id: AvatarId) => void }) {
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
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
      session?.leave();
      sessionRef.current = null;
      setPeople([]); setRoomMsgs([]); setThreads({}); setRoomUnread(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar, room, who.guest, who.loginId]);

  useEffect(() => { sessionRef.current?.setBlocked(blocked); }, [blocked]);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6 }); }, [roomMsgs, threads, tab, open]);

  const me = sessionRef.current?.uid ?? "";
  const peopleShown = people.filter((p) => !blocked.has(p.uid));
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
