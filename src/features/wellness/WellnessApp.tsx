"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sx } from "./sx";
import { StretchVideo } from "./StretchVideo";
import { CHARACTERS, CHARACTER_DISPLAY_NAME, characterOf, DEFAULT_CHARACTER, type CharacterId } from "./characters";
import { resolveSuggestion } from "./suggestion";
import {
  AREAS, CHAT_BEATS, COLLECT, DONE_WEEK, doneTotals, LEAD_IN, MIND_DAYS,
  NUDGE, NUDGE_LOW, OB, PARQ, PRINCIPLES, PROBES, PROGRAMS, ROLES,
  TEMP, WEATHER, WEEK_TEMP, WEEKLY_PAST, type ContentState, type Role, type WeatherKey,
} from "./data";
import { riskLevel, RISK_REPLY } from "./risk";

const IMG = "/wellness/images";

// 프로토타입 Tweaks 기본값(고정). 실제 데이터 연동 전까지 신체 지표는 목 데이터.
const DEFAULT_ROLE: Role = "teacher";
const CONTENT_STATE: ContentState = "STABLE";
const EMPTY_STATE = false;

interface ChatMsg { role: "me" | "bot"; text: string; at: string }
interface Session { title: string; time: string }

interface State {
  now: Date;
  parq: Record<number, boolean>;
  parqOnly: boolean;
  perms: Record<number, boolean>;
  area: string;
  program: (typeof PROGRAMS)[number] | null;
  authed: boolean;
  loginId: string;
  loginPw: string;
  ob: number;
  tab: "home" | "records" | "settings";
  sheet: null | "library" | "content" | "mind" | "talk" | "picture";
  answers: Record<string, string>;
  minutes: number;
  remaining: number;
  running: boolean;
  notifOff: boolean;
  wiped: boolean;
  role: Role | null;
  consent: [boolean, boolean];
  sessions: Session[];
  pickedToday: boolean;
  chat: ChatMsg[];
  beat: number;
  typing: boolean;
  input: string;
  consultOpen: boolean;
  live: { key: WeatherKey; temp: number; feels: number } | null;
  recTab: "body" | "mind";
  riskShown: boolean;
  /** 「마음과 대화」 상대. 바꾸면 대화가 새로 시작된다. */
  character: CharacterId;
  /** 캐릭터 고르기 화면(대화 시트 위에 겹침) */
  pickingCharacter: boolean;
  /** 아바타 이미지를 못 읽은 캐릭터(파일 아직 없음) — 글자 아바타로 대신 그린다 */
  avatarMissing: Partial<Record<CharacterId, boolean>>;
}

function stampAt(n: number, ref?: Date): string {
  const d = ref || new Date();
  const base = d.getHours() * 60 + d.getMinutes() + n;
  const h = Math.floor(base / 60) % 24;
  const m = base % 60;
  const ampm = h < 12 ? "오전" : "오후";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${hh}:${String(m).padStart(2, "0")}`;
}

export default function WellnessApp() {
  const [s, setS] = useState<State>(() => ({
    now: new Date(0), // hydration 안전: 마운트 후 실제 시각으로 교체
    parq: {}, parqOnly: false, perms: {}, area: "all", program: null,
    authed: false, loginId: "", loginPw: "", ob: 0, tab: "home", sheet: null,
    answers: {}, minutes: 3, remaining: 180, running: false, notifOff: false, wiped: false,
    role: null, consent: [false, false], sessions: [], pickedToday: false,
    chat: [{ role: "bot" as const, text: characterOf(DEFAULT_CHARACTER).intro, at: stampAt(0, new Date(0)) }],
    beat: 0, typing: false, input: "", consultOpen: false, live: null, recTab: "body", riskShown: false,
    character: DEFAULT_CHARACTER, pickingCharacter: false, avatarMissing: {},
  }));

  const patch = (p: Partial<State>) => setS((st) => ({ ...st, ...p }));
  const patchFn = (fn: (st: State) => Partial<State> | null) =>
    setS((st) => { const r = fn(st); return r ? { ...st, ...r } : st; });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(false);

  // 마운트: 실제 시각으로 교체 + 10초 시계 + 날씨.
  useEffect(() => {
    mounted.current = true;
    patch({ now: new Date() });
    const clock = setInterval(() => patch({ now: new Date() }), 10000);
    loadWeather();
    return () => { clearInterval(clock); if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 채팅 자동 스크롤.
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.chat, s.typing, s.sheet]);

  async function loadWeather() {
    try {
      const pos = await new Promise<{ lat: number; lon: number }>((res) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return res({ lat: 37.5665, lon: 126.978 });
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
          () => res({ lat: 37.5665, lon: 126.978 }),
          { timeout: 5000 },
        );
      });
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=" + pos.lat +
        "&longitude=" + pos.lon +
        "&current=temperature_2m,apparent_temperature,precipitation,weather_code&timezone=auto";
      const r = await fetch(url);
      if (!r.ok) return;
      const j = await r.json();
      const c = j.current || {};
      const temp = Math.round(c.temperature_2m);
      const feels = Math.round(c.apparent_temperature);
      const code = c.weather_code;
      const rain = c.precipitation > 0 || (code >= 51 && code <= 82);
      let key: WeatherKey = "fine";
      if (rain) key = "rain";
      else if (feels >= 31) key = "hot";
      else if (temp <= 4) key = "cold";
      patch({ live: { key, temp, feels } });
    } catch { /* 기본값 유지 */ }
  }

  function scripted() {
    setS((st) => {
      const beat = CHAT_BEATS[st.beat];
      if (!beat) return { ...st, typing: false };
      return st; // 실제 push는 아래 setTimeout에서
    });
    setTimeout(() => {
      patchFn((st) => {
        const beat = CHAT_BEATS[st.beat];
        if (!beat) return { typing: false };
        return {
          chat: st.chat.concat(beat.map((b, j) => ({ role: "bot" as const, text: b, at: stampAt(st.chat.length + j, st.now) }))),
          typing: false,
          beat: st.beat + 1,
        };
      });
    }, 900);
  }

  async function send() {
    const t = (s.input || "").trim();
    if (!t || s.typing) return;
    const historyForServer = s.chat.map((m) => ({ role: m.role, text: m.text }));
    patchFn((st) => ({
      chat: st.chat.concat([{ role: "me", text: t, at: stampAt(st.chat.length, st.now) }]),
      input: "", typing: true,
    }));

    // 클라 위험 판정 — 즉시 고정 응답(네트워크 없이).
    if (riskLevel(t) === 2) {
      setTimeout(() => patchFn((st) => ({
        chat: st.chat.concat(RISK_REPLY.map((b, j) => ({ role: "bot" as const, text: b, at: stampAt(st.chat.length + j, st.now) }))),
        typing: false, riskShown: true, beat: Math.max(st.beat, 4),
      })), 700);
      return;
    }

    try {
      const r = await fetch("/api/wellness/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: historyForServer, message: t, character: s.character }),
      });
      const j = await r.json();
      if (j.risk && Array.isArray(j.reply)) {
        patchFn((st) => ({
          chat: st.chat.concat(j.reply.map((b: string, k: number) => ({ role: "bot" as const, text: b, at: stampAt(st.chat.length + k, st.now) }))),
          typing: false, riskShown: true, beat: Math.max(st.beat, 4),
        }));
        return;
      }
      if (j.reply && typeof j.reply === "string") {
        patchFn((st) => ({
          chat: st.chat.concat([{ role: "bot", text: j.reply, at: stampAt(st.chat.length, st.now) }]),
          typing: false, beat: st.beat + 1,
        }));
        return;
      }
      scripted();
    } catch {
      scripted();
    }
  }

  function tick() {
    patchFn((st) => {
      if (!st.running) return null;
      if (st.remaining <= 1) { if (timerRef.current) clearInterval(timerRef.current); return { remaining: 0, running: false }; }
      return { remaining: st.remaining - 1 };
    });
  }

  // ---- 파생값 (원본 renderVals) ----
  const v = useMemo(() => compute(s), [s]);

  function compute(st: State) {
    const roleKey: Role = st.role || DEFAULT_ROLE;
    const role = ROLES[roleKey];
    const authed = st.authed;
    const onboarding = authed && st.ob >= 0;
    const parqYes = Object.values(st.parq).filter(Boolean).length;
    const parqAll = Object.keys(st.parq).length === PARQ.length;
    // 제안 항목·시간대·주말 판정은 resolveSuggestion 한 곳 — MVP 시연 동안은 하나로 고정돼 있다(suggestion.ts 참고).
    const sug = resolveSuggestion({ role: roleKey, parqYes: parqYes > 0, hour: st.now.getHours(), dow: st.now.getDay() });
    const slot = sug.slot;
    const liveKey = st.live && st.live.key;
    const wxBase = WEATHER[(liveKey as WeatherKey) || "hot"] || WEATHER.hot;
    const wx = st.live
      ? { ...wxBase, label: st.live.temp + "° " + wxBase.word, note: (st.live.feels !== st.live.temp ? "체감 " + st.live.feels + "° · " : "") + wxBase.plain }
      : wxBase;
    const feelsTxt = st.live ? "체감 " + st.live.feels + "도" : "체감 35도";
    const item = st.program || sug.item;
    // 주말·휴일엔 프로그램 이름의 평일 표현("퇴근 전 ")을 떼서 상황과 어긋나지 않게 한다.
    // (직접 고른 프로그램 st.program은 사용자가 고른 원래 이름 그대로 둔다.)
    const isWeekend = sug.isWeekend;
    const itemTitle = isWeekend && !st.program ? item.title.replace(/^퇴근 전 /, "") : item.title;
    const area = st.area || "all";
    const libList = PROGRAMS
      .filter((pg) => area === "all" || pg.area === area)
      .filter((pg) => !(parqYes && !pg.low))
      .filter((pg) => !(wx.prefer === "indoor" && pg.place === "outdoor"));
    const totals = doneTotals();
    const maxByMin = Math.max(...Object.values(totals.byMin), 1);
    const answered = PROBES.filter((p) => st.answers[p.id]).length;
    return { roleKey, role, authed, onboarding, parqYes, parqAll, slot, wx, feelsTxt, item, itemTitle, isWeekend, libList, totals, maxByMin, answered };
  }

  const nowTime = `${s.now.getHours()}:${String(s.now.getMinutes()).padStart(2, "0")}`;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const todayLabel = `${s.now.getMonth() + 1}월 ${s.now.getDate()}일 ${days[s.now.getDay()]}요일`;
  const chatDateLabel = `${s.now.getFullYear()}년 ${s.now.getMonth() + 1}월 ${s.now.getDate()}일 ${days[s.now.getDay()]}요일`;

  const step = OB[Math.max(0, s.ob)] || OB[0];
  const canNext = s.ob === 2 ? s.consent[0] : s.ob === 4 ? v.parqAll : true;

  // ---- 렌더 ----
  return (
    <div className="wc-stage">
      <div className="wc-frame">
        <div className="wc-screen">
          {/* 상태바 */}
          <div style={sx("display:flex; align-items:center; justify-content:space-between; padding:14px 24px 6px; font-size:12px; font-weight:600; color:#2d5c6e; letter-spacing:0.02em; flex:none")}>
            <span>{nowTime}</span>
            <span style={{ opacity: 0.55 }}>●●●  ◗</span>
          </div>

          {!v.authed && renderLogin()}
          {v.onboarding && renderOnboarding()}
          {v.authed && !v.onboarding && s.tab === "home" && renderHome()}
          {v.authed && !v.onboarding && s.tab === "records" && renderRecords()}
          {v.authed && !v.onboarding && s.tab === "settings" && renderSettings()}
          {v.authed && !v.onboarding && renderTabs()}

          {s.sheet === "picture" && renderPicture()}
          {s.sheet === "content" && renderContent()}
          {s.sheet === "library" && renderLibrary()}
          {s.sheet === "mind" && renderMind()}
          {s.sheet === "talk" && renderTalk()}
        </div>
      </div>
    </div>
  );

  function renderLogin() {
    const loginBtnBg = s.loginId && s.loginPw ? "#7a6bc4" : "#cdc3ea";
    const doLogin = () => patch({ authed: true, ob: 0 });
    return (
      <div style={sx("flex:1; display:flex; flex-direction:column; min-height:0")}>
        <div style={sx("flex:1; display:flex; flex-direction:column; justify-content:center; gap:26px; padding:0 26px")}>
          <div style={sx("display:flex; flex-direction:column; gap:14px")}>
            <div style={sx("display:flex; align-items:center; gap:16px")}>
              <div style={sx(`flex:none; width:78px; height:78px; border-radius:22px; overflow:hidden; box-shadow:0 10px 26px rgba(23,185,138,0.3); background:url(${IMG}/app-icon.png) center/cover`)} />
              <div style={sx("flex:1; min-width:0; font-size:25px; font-weight:700; color:#2d5c6e; letter-spacing:-0.03em; line-height:1.35; text-wrap:pretty")}>안녕하세요<br />웰니스 케어입니다</div>
            </div>
            <div style={sx("font-size:14px; color:#6b8c9a; line-height:1.65; text-wrap:pretty")}>선생님의 하루를 대신 기억할게요.</div>
          </div>

          <div style={sx("display:flex; flex-direction:column; gap:10px")}>
            <input value={s.loginId} onChange={(e) => patch({ loginId: e.target.value })} placeholder="학교 계정 (nnn@sen.go.kr)" style={sx("width:100%; box-sizing:border-box; border:1.5px solid #e3eef1; background:#fff; border-radius:14px; padding:16px; font-size:14.5px; color:#2d5c6e; outline:none; font-family:inherit")} />
            <input value={s.loginPw} onChange={(e) => patch({ loginPw: e.target.value })} type="password" placeholder="비밀번호" style={sx("width:100%; box-sizing:border-box; border:1.5px solid #e3eef1; background:#fff; border-radius:14px; padding:16px; font-size:14.5px; color:#2d5c6e; outline:none; font-family:inherit")} />
            <div onClick={doLogin} style={{ ...sx("cursor:pointer; text-align:center; padding:17px; border-radius:16px; color:#fff; font-size:15px; font-weight:700; box-shadow:0 8px 20px rgba(91,181,207,0.26); transition:background 0.2s"), background: loginBtnBg }}>로그인</div>
          </div>

          <div style={sx("display:flex; align-items:center; gap:12px")}>
            <div style={sx("flex:1; height:1px; background:#e3eef1")} />
            <div style={sx("flex:none; white-space:nowrap; font-size:11.5px; color:#8ba8b3")}>또는</div>
            <div style={sx("flex:1; height:1px; background:#e3eef1")} />
          </div>

          <div style={sx("display:flex; flex-direction:column; gap:10px")}>
            <div onClick={doLogin} style={sx("cursor:pointer; text-align:center; padding:16px; border-radius:15px; background:#f4fafb; border:1px dashed #cfe6ee; font-size:14px; font-weight:600; color:#6b8c9a")}>계정 없이 둘러보기</div>
          </div>
        </div>
        <div style={sx("flex:none; padding:0 26px 30px; font-size:11.5px; color:#8ba8b3; line-height:1.65; text-wrap:pretty")}>로그인은 본인 확인만을 위해 쓰이고, 학교·교육청은 어떤 개인 기록도 볼 수 없습니다.</div>
      </div>
    );
  }

  function renderOnboarding() {
    const steps = s.parqOnly ? [{ bg: "#7a6bc4" }] : OB.map((_, i) => ({ bg: i <= s.ob ? "#7a6bc4" : "#dbe8ec" }));
    const obBtn = s.parqOnly && s.ob === 4 ? "저장하고 돌아가기" : step.btn;
    const obBtnBg = canNext ? "#7a6bc4" : "#cdc3ea";
    const obBackLabel = s.parqOnly ? "취소" : s.ob === 0 ? "나중에 볼게요" : "이전";
    const obNext = () => {
      if (!canNext) return;
      patchFn((st) => (st.parqOnly && st.ob === 4) ? { ob: -1, parqOnly: false, tab: "settings" } : { ob: st.ob >= 4 ? -1 : st.ob + 1 });
    };
    const obBack = () => patchFn((st) => st.parqOnly ? { ob: -1, parqOnly: false, tab: "settings" } : { ob: st.ob <= 0 ? -1 : st.ob - 1 });

    return (
      <div style={sx("flex:1; display:flex; flex-direction:column; min-height:0")}>
        <div style={sx("display:flex; gap:5px; padding:12px 24px 0; flex:none")}>
          {steps.map((it, i) => (<div key={i} style={{ ...sx("flex:1; height:3px; border-radius:2px; transition:background 0.3s"), background: it.bg }} />))}
        </div>

        <div style={sx("flex:1; overflow-y:auto; padding:26px 24px 0; display:flex; flex-direction:column; gap:20px")}>
          <div style={sx("display:flex; flex-direction:column; gap:9px")}>
            <div style={sx("font-size:12px; font-weight:700; color:#8ba8b3; letter-spacing:0.04em")}>{step.kicker}</div>
            <div style={sx("font-size:24px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; line-height:1.35; text-wrap:pretty")}>{step.title}</div>
            {step.body && <div style={sx("font-size:14px; color:#6b8c9a; line-height:1.65; text-wrap:pretty")}>{step.body}</div>}
          </div>

          {s.ob === 0 && (
            <div style={sx("display:flex; flex-direction:column; gap:9px")}>
              {PRINCIPLES.map((text, i) => (
                <div key={i} style={sx("display:flex; gap:11px; align-items:flex-start; padding:15px 16px; border-radius:15px; background:#fff; border:1px solid #e3eef1")}>
                  <div style={sx("width:6px; height:6px; border-radius:50%; background:#7a6bc4; margin-top:7px; flex:none")} />
                  <div style={sx("flex:1; font-size:14px; color:#2d5c6e; line-height:1.55; font-weight:500; text-wrap:pretty")}>{text}</div>
                </div>
              ))}
            </div>
          )}

          {s.ob === 1 && (
            <div style={sx("display:flex; flex-direction:column; gap:10px")}>
              {COLLECT.map((ci, i) => (
                <div key={i} style={sx("display:flex; flex-direction:column; gap:4px; padding:16px; border-radius:15px; background:#fff; border:1px solid #e3eef1")}>
                  <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>{ci.name}</div>
                  <div style={sx("font-size:13px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>{ci.why}</div>
                </div>
              ))}
            </div>
          )}

          {s.ob === 2 && (
            <div style={sx("display:flex; flex-direction:column; gap:11px")}>
              {[
                { title: "수집·이용 동의 (필수)", desc: "걸음·움직인 시간·앱에서 함께한 몸풀기 기록은 암호화되어 본인 계정에만 저장되며, 본인 외에는 누구도 열어볼 수 없습니다." },
              ].map((c, i) => {
                const on = s.consent[i];
                return (
                  <div key={i} onClick={() => patchFn((st) => { const c2 = st.consent.slice() as [boolean, boolean]; c2[i] = !c2[i]; return { consent: c2 }; })} style={{ ...sx("cursor:pointer; display:flex; gap:13px; align-items:flex-start; padding:17px 16px; border-radius:16px; background:#fff; border:1.5px solid; transition:border-color 0.2s"), borderColor: on ? "#c4b8ec" : "#e3eef1" }}>
                    <div style={{ ...sx("width:22px; height:22px; border-radius:7px; flex:none; margin-top:1px; color:#fff; font-size:13px; display:flex; align-items:center; justify-content:center; border:1.5px solid"), background: on ? "#7a6bc4" : "#fff", borderColor: on ? "#7a6bc4" : "#d9e7ec" }}>{on ? "✓" : ""}</div>
                    <div style={sx("flex:1; display:flex; flex-direction:column; gap:4px")}>
                      <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>{c.title}</div>
                      <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>{c.desc}</div>
                    </div>
                  </div>
                );
              })}
              <div style={sx("font-size:13px; font-weight:700; color:#6b8c9a; padding:8px 2px 0")}>권한</div>
              {[
                { name: "건강 데이터 (걸음)", note: "Health Connect를 통해 읽기만 합니다" },
                { name: "활동 인식", note: "걷기·계단 같은 움직임만 구분합니다" },
                { name: "알림", note: "정서와 관련된 제안은 알림으로 보내지 않아요" },
              ].map((pm, i) => {
                const on = s.perms[i] !== false;
                return (
                  <div key={i} onClick={() => patchFn((sti) => ({ perms: { ...sti.perms, [i]: !(sti.perms[i] !== false) } }))} style={{ ...sx("cursor:pointer; display:flex; align-items:center; gap:13px; padding:15px 16px; border-radius:15px; background:#fff; border:1.5px solid; transition:border-color 0.2s"), borderColor: on ? "#c4b8ec" : "#e3eef1" }}>
                    <div style={{ ...sx("width:22px; height:22px; border-radius:7px; flex:none; color:#fff; font-size:13px; display:flex; align-items:center; justify-content:center; border:1.5px solid"), background: on ? "#7a6bc4" : "#fff", borderColor: on ? "#7a6bc4" : "#d9e7ec" }}>{on ? "✓" : ""}</div>
                    <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:3px")}>
                      <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>{pm.name}</div>
                      <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.5; text-wrap:pretty")}>{pm.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {s.ob === 3 && (
            <div style={sx("display:flex; flex-direction:column; gap:10px")}>
              {(Object.keys(ROLES) as Role[]).map((k) => {
                const on = v.roleKey === k && !!s.role;
                return (
                  <div key={k} onClick={() => patch({ role: k })} style={{ ...sx("cursor:pointer; display:flex; flex-direction:column; gap:5px; padding:17px 18px; border-radius:16px; border:1.5px solid; transition:all 0.2s"), background: on ? "#f2edfa" : "#fff", borderColor: on ? "#c4b8ec" : "#e3eef1" }}>
                    <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>{ROLES[k].label}</div>
                    <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>{ROLES[k].hint}</div>
                  </div>
                );
              })}
            </div>
          )}

          {s.ob === 4 && (
            <div style={sx("display:flex; flex-direction:column; gap:9px")}>
              {PARQ.map((text, i) => {
                const val = s.parq[i];
                return (
                  <div key={i} style={{ ...sx("display:flex; align-items:center; gap:12px; padding:14px 15px; border-radius:15px; background:#fff; border:1.5px solid"), borderColor: val === undefined ? "#e3eef1" : "#dbedf2" }}>
                    <div style={sx("flex:1; min-width:0; font-size:13.5px; color:#2d5c6e; line-height:1.55; font-weight:500; text-wrap:pretty")}>{text}</div>
                    <div style={sx("flex:none; display:flex; gap:6px")}>
                      <div onClick={() => patchFn((sti) => ({ parq: { ...sti.parq, [i]: false } }))} style={{ ...sx("cursor:pointer; white-space:nowrap; min-height:44px; min-width:56px; padding:0 13px; border-radius:12px; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; border:1.5px solid; transition:all 0.18s"), background: val === false ? "#f2edfa" : "#fff", color: val === false ? "#7a6bc4" : "#8ba8b3", borderColor: val === false ? "#7a6bc4" : "#e3eef1" }}>아니오</div>
                      <div onClick={() => patchFn((sti) => ({ parq: { ...sti.parq, [i]: true } }))} style={{ ...sx("cursor:pointer; white-space:nowrap; min-height:44px; min-width:52px; padding:0 13px; border-radius:12px; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; border:1.5px solid; transition:all 0.18s"), background: val === true ? "#f2edfa" : "#fff", color: val === true ? "#7a6bc4" : "#8ba8b3", borderColor: val === true ? "#7a6bc4" : "#e3eef1" }}>예</div>
                    </div>
                  </div>
                );
              })}
              {v.parqAll && (
                <div style={sx("display:flex; flex-direction:column; gap:8px; padding:16px; border-radius:16px; background:#f2edfa; border:1px solid #dbedf2; animation:wRise 0.4s ease-out both")}>
                  <div style={sx("font-size:13.5px; font-weight:700; color:#2d5c6e")}>{v.parqYes ? "가벼운 것부터 함께할게요" : "편하게 시작하셔도 좋아요"}</div>
                  <div style={sx("font-size:13px; color:#4d7c8c; line-height:1.6; text-wrap:pretty")}>{v.parqYes ? "해당되는 항목이 있어 앉은 자리에서 하는 낮은 강도만 제안해 드립니다. 새로운 운동을 시작하기 전에는 주치의와 한 번 상의해 주세요." : "특별히 걸리는 것이 없어 평소 강도로 제안해 드릴게요. 몸이 무거운 날에는 언제든 더 낮은 강도를 고르실 수 있어요."}</div>
                </div>
              )}
              <div style={sx("font-size:13px; color:#2d5c6e; font-weight:600; line-height:1.65; padding:2px; text-wrap:pretty")}>PAR-Q+ (Physical Activity Readiness Questionnaire)는 캐나다운동생리학회가 만든 국제 표준 문항으로, 건강검진이나 진단이 아닙니다. 이 답은 활동 강도를 정하는 데만 쓰이고, 본인 외에는 누구도 볼 수 없습니다. 설정에서 언제든 다시 답할 수 있어요.</div>
            </div>
          )}

        </div>

        <div style={sx("flex:none; display:flex; flex-direction:column; gap:10px; padding:16px 24px 28px; background:linear-gradient(180deg,rgba(246,250,251,0) 0%,#f6fafb 22%)")}>
          <div onClick={obNext} style={{ ...sx("cursor:pointer; text-align:center; padding:17px; border-radius:16px; color:#fff; font-size:15px; font-weight:700; box-shadow:0 8px 20px rgba(91,181,207,0.24); transition:background 0.2s"), background: obBtnBg }}>{obBtn}</div>
          <div onClick={obBack} style={sx("cursor:pointer; text-align:center; font-size:13px; font-weight:600; color:#8ba8b3; padding:2px")}>{obBackLabel}</div>
        </div>
      </div>
    );
  }

  function renderHome() {
    const wx = v.wx;
    const item = v.item;
    const greeting = EMPTY_STATE ? "천천히 시작해요" : "오늘도 한 걸음 왔네요";
    // AI 오늘의 제안 문구 — 요일(주말/평일)·시간대·직군 맥락에 맞춰 조합한다.
    // ⚠ 걸음·활동 수치는 아직 목업이라, 문구도 단정("~했어요") 대신 추정("~기 쉬워요")으로 둔다.
    //    공휴일(평일 중 쉬는 날)은 학사일정 연동 전이라 감지 못 함 — 주말만 '쉬는 날'로 처리(Phase 2에서 확장).
    const isWeekend = v.isWeekend;
    const daySolution = (() => {
      if (isWeekend) {
        const rest = "오늘은 쉬는 날이네요. 학교 일은 잠시 내려놓으셔도 돼요. 몸이 뻐근하면 그때 잠깐만 움직여도 충분해요. ";
        const close = wx.prefer === "indoor"
          ? "바깥은 " + v.feelsTxt + "라 무리한 외출은 권하지 않아요. 집에서 3분만 가볍게 풀어보는 건 어떨까요?"
          : "날이 좋으니 잠깐 바깥 공기를 쐬며 걸어보기에도 좋은 날이에요.";
        return rest + close;
      }
      // 평일 — 시간대별 본문(추정형) + 직군
      const BODY: Record<Role, string[]> = {
        teacher: [
          "수업이 시작되기 전에 목·어깨를 미리 풀어두면 하루가 한결 수월해요. ",
          "오전 수업으로 목과 어깨가 뭉치기 쉬운 시간대예요. 점심 전후로 잠깐 풀어볼까요. ",
          "오후엔 오래 서 계셨을 시간대라 어깨가 굳기 쉬워요. ",
        ],
        admin: [
          "오전 화면 작업이 길어지기 쉬운 시간대예요. 시작 전에 눈과 손목을 잠깐 풀어두면 좋아요. ",
          "오전 내내 앉아 계시기 쉬운 시간대예요. 점심 전후로 잠깐 일어나 몸을 풀어볼까요. ",
          "오늘은 자리에 앉아 계신 시간이 길기 쉬운 하루죠. 걸음도 평소보다 적기 쉬워요. ",
        ],
        care: [
          "오전 준비로 분주하기 쉬운 시간대예요. 시작 전에 손목과 다리를 가볍게 풀어두면 좋아요. ",
          "오전 입식 근무로 다리가 뻐근하기 쉬운 시간대예요. 잠깐 앉아 풀어볼까요. ",
          "오래 서서 일하신 시간대라 다리가 뻐근하기 쉬워요. ",
        ],
      };
      const body = BODY[v.roleKey][v.slot];
      const close = v.slot === 2
        ? (wx.prefer === "indoor"
            ? "바깥은 " + v.feelsTxt + "라 나가시는 건 권하지 않아요. 대신 시원한 실내에서 3분만 풀어두시고, 걷고 싶으시면 해가 진 뒤가 좋겠어요."
            : "공기가 좋은 날이니 퇴근 전 복도 창가까지만 천천히 걸어보셔도 좋아요. 5분이면 충분합니다.")
        : (wx.prefer === "indoor"
            ? "바깥은 " + v.feelsTxt + "라 낮 외출은 권하지 않아요. 시원한 실내에서 3분이면 충분해요."
            : "공기가 좋으니 잠깐 창가나 복도에서 숨을 고르거나 짧게 걸어보셔도 좋아요.");
      return LEAD_IN[v.slot] + " " + body + close;
    })();
    const postureLabel = v.roleKey === "admin" ? "앉아 있던 시간" : "서 있던 시간";
    const postureValue = v.roleKey === "admin" ? "6시간 · 서 있던 2시간" : v.roleKey === "care" ? "6시간 30분 · 앉은 1시간 30분" : "5시간 · 앉은 2시간 30분";
    const standFlex = v.roleKey === "admin" ? 1 : v.roleKey === "care" ? 4 : 2;
    const sitFlex = v.roleKey === "admin" ? 3 : 1;
    const postureNote = v.roleKey === "admin" ? "가장 길게 앉아 있던 구간은 오후 2시–4시였어요" : "가장 길게 서 계셨던 구간은 3–4교시였어요";
    // 걸음 반원 게이지 — 3단계·3색 구간(적음 0~40% · 평소 40~80% · 많음 80~100%) + 오늘 위치 노브.
    // ⚠ 등급이 아니라 '개인 평소 범위' 대비 편차다(제안서 일상변화 관점). 라벨도 적음/평소/많음(descriptive)만 쓴다.
    const stepFrac = 0.515; // 오늘 걸음의 게이지 위치(목업). 실데이터 연동 시 계산으로 대체.
    const stepZones = [
      { color: "#a9c4e8", label: "적음", dash: "72.6 260", off: "0" },      // 평소보다 적음
      { color: "#8a7cd0", label: "평소", dash: "72.6 260", off: "-88.6" },  // 평소 범위
      { color: "#f5a98c", label: "많음", dash: "36.3 260", off: "-177.2" }, // 평소보다 많음
    ];
    const stepZoneLabel = stepFrac < 0.4 ? "평소보다 적음" : stepFrac <= 0.8 ? "평소 범위 안" : "평소보다 많음";
    const knobX = (80 - 68 * Math.cos(Math.PI * stepFrac)).toFixed(1);
    const knobY = (80 - 68 * Math.sin(Math.PI * stepFrac)).toFixed(1);
    const sleepBars = [9, 17, 6, 22, 13, 20, 26].map((h, i) => ({ h, bg: i === 6 ? "#8a7cd0" : "#e6e2f7" }));
    const moveBars = [11, 19, 8, 24, 14, 21, 26].map((h, i) => ({ h, bg: i === 6 ? "#5bc4b8" : "#daf0ec" }));
    const hourly = [4, 9, 26, 14, 7, 31, 11, 5, 19, 23, 8, 3].map((val, i) => ({
      h: Math.max(4, val),
      bg: val >= 20 ? "#f5a98c" : val >= 9 ? "#f8cbb6" : "#fbe6dc",
      label: 8 + i + (i % 3 === 0 ? "시" : ""),
    }));

    return (
      <div style={sx("flex:1; overflow-y:auto; display:grid; align-content:start; gap:16px; padding:10px 20px 96px")}>
        {/* 헤더 */}
        <div style={sx("display:flex; align-items:center; gap:12px; padding-top:6px")}>
          <div style={sx(`width:46px; height:46px; border-radius:16px; flex:none; overflow:hidden; background:url(${IMG}/app-icon.png) center/cover; box-shadow:0 4px 12px rgba(23,185,138,0.24)`)} />
          <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:3px")}>
            <div style={sx("font-size:12.5px; color:#8ba8b3; font-weight:500")}>{todayLabel} · {v.role.label}</div>
            <div style={sx("font-size:20px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; text-wrap:pretty")}>{greeting}</div>
          </div>
          <div onClick={() => patch({ tab: "settings" })} style={sx("cursor:pointer; width:42px; height:42px; flex:none; border-radius:50%; background:#fff; border:1px solid #e3eef1; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(45,92,110,0.06)")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#7a6bc4" strokeWidth="1.9" strokeLinecap="round" style={{ width: 19, height: 19 }}>
              <path d="M12 4.2l1.5 1.9 2.4-.5.5 2.4 1.9 1.5-1.1 2.2 1.1 2.2-1.9 1.5-.5 2.4-2.4-.5L12 19.8l-1.5-1.9-2.4.5-.5-2.4-1.9-1.5L6.8 12 5.7 9.8l1.9-1.5.5-2.4 2.4.5z" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
          </div>
        </div>

        {/* AI 오늘의 제안 */}
        <div style={sx("display:flex; flex-direction:column; gap:14px; padding:18px; border-radius:22px; background:linear-gradient(140deg,#eaf6fb 0%,#f2edfa 62%,#fdf0f4 100%); border:1px solid #e2e9f5; box-shadow:0 4px 16px rgba(122,138,196,0.12)")}>
          <div style={sx("display:flex; align-items:center; gap:9px")}>
            <div style={sx("flex:none; display:flex; align-items:center; gap:8px; min-height:34px; padding:0 14px; border-radius:999px; background:rgba(255,255,255,0.85); border:1px solid rgba(255,255,255,0.95)")}>
              <div style={{ ...sx("width:9px; height:9px; border-radius:50%; flex:none"), background: wx.dot }} />
              <div style={sx("font-size:13.5px; font-weight:700; color:#3a4a72; white-space:nowrap")}>{wx.label}</div>
            </div>
            <div style={sx("flex:1; min-width:0; font-size:13px; font-weight:500; color:#4d5578; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{wx.note}</div>
          </div>
          <div style={sx("display:flex; align-items:center; gap:9px")}>
            <div style={sx("flex:none; padding:6px 13px; border-radius:999px; background:#4a3f80; font-size:12px; font-weight:800; color:#fff; white-space:nowrap; letter-spacing:0.02em")}>AI 오늘의 제안</div>
            <div style={sx("flex:1; height:1px; background:rgba(122,107,196,0.22)")} />
          </div>
          <div style={sx("font-size:15.5px; font-weight:600; color:#3a4a72; line-height:1.7; letter-spacing:-0.01em; text-wrap:pretty")}>{daySolution}</div>
          <div onClick={() => patch({ sheet: "content", program: null })} style={sx("cursor:pointer; display:flex; align-items:center; gap:12px; min-height:60px; padding:0 16px; border-radius:16px; background:#7a6bc4; box-shadow:0 6px 16px rgba(122,107,196,0.32)")}>
            <div style={sx("flex:none; width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,0.22); display:flex; align-items:center; justify-content:center")}>
              <div style={sx("width:0; height:0; margin-left:3px; border-left:11px solid #fff; border-top:7px solid transparent; border-bottom:7px solid transparent")} />
            </div>
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
              <div style={sx("font-size:10.5px; font-weight:700; color:rgba(255,255,255,0.75); letter-spacing:0.03em")}>지금 바로 시작하기</div>
              <div style={sx("font-size:14.5px; font-weight:700; color:#fff; text-wrap:pretty")}>{v.itemTitle}</div>
            </div>
            <div style={sx("flex:none; font-size:16px; color:rgba(255,255,255,0.8)")}>›</div>
          </div>
        </div>

        {/* 2단 타일 */}
        <div style={sx("display:grid; grid-template-columns:1fr 1fr; gap:11px")}>
          <div onClick={() => patch({ sheet: "library" })} style={sx("cursor:pointer; display:flex; flex-direction:column; gap:18px; padding:16px; border-radius:22px; background:linear-gradient(150deg,#fff1e4 0%,#ffe6ec 100%); border:1px solid #f6cfc4; box-shadow:0 10px 24px rgba(214,130,108,0.26), 0 2px 6px rgba(214,130,108,0.16)")}>
            <div style={sx("display:flex; align-items:flex-start; gap:8px")}>
              <div style={sx(`width:36px; height:36px; flex:none; border-radius:11px; overflow:hidden; background:url(${IMG}/icon-physical.png) center/cover`)} />
              <div style={sx("flex:1; text-align:right; font-size:15px; color:#e0876c")}>↗</div>
            </div>
            <div style={sx("display:flex; flex-direction:column; gap:4px")}>
              <div style={sx("font-size:14.5px; font-weight:700; color:#8a4a3c")}>신체 건강</div>
              <div style={sx("font-size:12px; color:#9a5f4c; line-height:1.5")}>짧은 몸풀기 {v.libList.length}가지</div>
            </div>
          </div>
          <div onClick={() => patch({ sheet: "mind" })} style={sx("cursor:pointer; display:flex; flex-direction:column; gap:18px; padding:16px; border-radius:22px; background:linear-gradient(150deg,#e8f3ff 0%,#ede7fb 100%); border:1px solid #d2cbf0; box-shadow:0 10px 24px rgba(110,95,190,0.26), 0 2px 6px rgba(110,95,190,0.16)")}>
            <div style={sx("display:flex; align-items:flex-start; gap:8px")}>
              <div style={sx(`width:36px; height:36px; flex:none; border-radius:50%; overflow:hidden; background:url(${IMG}/icon-mind.png) center/cover`)} />
              <div style={sx("flex:1; text-align:right; font-size:15px; color:#8a7cd0")}>↗</div>
            </div>
            <div style={sx("display:flex; flex-direction:column; gap:4px")}>
              <div style={sx("font-size:14.5px; font-weight:700; color:#4a3f80")}>마음 건강</div>
              <div style={sx("font-size:12px; color:#5f5397; line-height:1.5")}>대화 · 오늘의 그림</div>
            </div>
          </div>
        </div>

        {/* 오늘의 기록 */}
        <div style={sx("display:grid; gap:11px")}>
          <div style={sx("display:flex; align-items:center; gap:9px; padding:0 2px")}>
            <div style={sx("flex:1; font-size:15px; font-weight:700; color:#2d5c6e")}>오늘의 기록</div>
          </div>

          {!EMPTY_STATE ? (
            <div style={sx("display:grid; grid-template-columns:1fr 1fr; gap:11px")}>
              {/* 걸음 (전폭) */}
              <div style={sx("grid-column:span 2; display:flex; align-items:center; gap:14px; padding:16px 18px; border-radius:20px; background:#fff; border:1.5px solid #dcd6ee; box-shadow:0 10px 22px rgba(80,88,140,0.2), 0 2px 5px rgba(80,88,140,0.14)")}>
                <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:5px")}>
                  <div style={sx("font-size:12px; font-weight:600; color:#8ba8b3")}>걸음</div>
                  <div style={sx("font-size:30px; font-weight:700; color:#2d5c6e; letter-spacing:-0.035em; line-height:1; font-variant-numeric:tabular-nums")}>4,120</div>
                  <div style={sx("font-size:11.5px; color:#8ba8b3; white-space:nowrap; padding-top:1px")}>평소 3,200 – 6,400</div>
                  <div style={sx("display:flex; align-items:center; gap:9px; flex-wrap:wrap; padding-top:4px")}>
                    {stepZones.map((z) => (
                      <div key={z.label} style={sx("display:flex; align-items:center; gap:4px")}>
                        <div style={{ ...sx("width:7px; height:7px; border-radius:50%; flex:none"), background: z.color }} />
                        <div style={sx("font-size:10.5px; color:#8ba8b3; white-space:nowrap")}>{z.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <svg viewBox="0 0 160 96" style={{ flex: "none", width: 150, height: "auto", overflow: "visible" }}>
                  <path d="M12 80 A68 68 0 0 1 148 80" fill="none" stroke="#eef2f4" strokeWidth="13" strokeLinecap="round" />
                  {stepZones.map((z, i) => (
                    <path key={i} d="M12 80 A68 68 0 0 1 148 80" fill="none" stroke={z.color} strokeWidth="13" strokeLinecap="round" strokeDasharray={z.dash} strokeDashoffset={z.off} />
                  ))}
                  <circle cx={knobX} cy={knobY} r="9" fill="#4a3f80" stroke="#fff" strokeWidth="3.5" />
                  <text x="80" y="74" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#6b8c9a">{stepZoneLabel}</text>
                </svg>
              </div>

              {/* 시간대별 움직임 (전폭) */}
              <div style={sx("grid-column:span 2; display:flex; flex-direction:column; gap:12px; padding:16px 18px; border-radius:20px; background:#fff; border:1.5px solid #dcd6ee; box-shadow:0 10px 22px rgba(80,88,140,0.2), 0 2px 5px rgba(80,88,140,0.14)")}>
                <div style={sx("display:flex; align-items:baseline; gap:9px")}>
                  <div style={sx("flex:1; min-width:0; font-size:12px; font-weight:600; color:#8ba8b3")}>시간대별 움직임</div>
                  <div style={sx("flex:none; white-space:nowrap; font-size:11.5px; font-weight:600; color:#e0876c")}>가장 활발했던 13시</div>
                </div>
                <div style={sx("display:flex; align-items:flex-end; gap:4px; height:62px")}>
                  {hourly.map((h, i) => (
                    <div key={i} style={sx("flex:1; display:flex; flex-direction:column; align-items:center; gap:6px")}>
                      <div style={{ ...sx("width:100%; border-radius:4px 4px 2px 2px"), height: h.h, background: h.bg }} />
                      <div style={sx("font-size:10.5px; color:#8ba8b3; white-space:nowrap")}>{h.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 함께한 몸풀기 */}
              <div style={sx("display:flex; flex-direction:column; gap:9px; padding:16px; border-radius:20px; background:#fff; border:1.5px solid #dcd6ee; box-shadow:0 10px 22px rgba(80,88,140,0.2), 0 2px 5px rgba(80,88,140,0.14)")}>
                <div style={sx("font-size:12px; font-weight:600; color:#8ba8b3")}>함께한 몸풀기</div>
                <div style={sx("font-size:22px; font-weight:700; color:#3a4a72; letter-spacing:-0.03em; line-height:1; white-space:nowrap")}>3회 · 7분</div>
                <div style={sx("display:flex; gap:3px; align-items:flex-end; height:26px; padding-top:2px")}>
                  {sleepBars.map((b, i) => (<div key={i} style={{ ...sx("flex:1; border-radius:3px"), height: b.h, background: b.bg }} />))}
                </div>
                <div style={sx("font-size:11px; color:#8ba8b3; white-space:nowrap")}>목·어깨 2회 · 눈 1회</div>
              </div>

              {/* 움직인 시간 */}
              <div style={sx("display:flex; flex-direction:column; gap:9px; padding:16px; border-radius:20px; background:#fff; border:1.5px solid #dcd6ee; box-shadow:0 10px 22px rgba(80,88,140,0.2), 0 2px 5px rgba(80,88,140,0.14)")}>
                <div style={sx("font-size:12px; font-weight:600; color:#8ba8b3")}>움직인 시간</div>
                <div style={sx("font-size:22px; font-weight:700; color:#3a4a72; letter-spacing:-0.03em; line-height:1; white-space:nowrap")}>42분</div>
                <div style={sx("display:flex; gap:3px; align-items:flex-end; height:26px; padding-top:2px")}>
                  {moveBars.map((b, i) => (<div key={i} style={{ ...sx("flex:1; border-radius:3px"), height: b.h, background: b.bg }} />))}
                </div>
                <div style={sx("font-size:11px; color:#8ba8b3; white-space:nowrap")}>걷기 34분 · 계단 8분</div>
              </div>

              {/* 자세 (전폭, 직군별 반전) */}
              <div style={sx("grid-column:span 2; display:flex; flex-direction:column; gap:11px; padding:16px 18px; border-radius:20px; background:#fff; border:1.5px solid #dcd6ee; box-shadow:0 10px 22px rgba(80,88,140,0.2), 0 2px 5px rgba(80,88,140,0.14)")}>
                <div style={sx("display:flex; align-items:baseline; gap:9px")}>
                  <div style={sx("flex:1; min-width:0; font-size:12px; font-weight:600; color:#8ba8b3")}>{postureLabel}</div>
                  <div style={sx("flex:none; white-space:nowrap; font-size:13.5px; font-weight:700; color:#2d5c6e")}>{postureValue}</div>
                </div>
                <div style={sx("display:flex; gap:3px; height:11px; border-radius:999px; overflow:hidden")}>
                  <div style={{ ...sx("background:#8a7cd0; border-radius:999px"), flex: standFlex }} />
                  <div style={{ ...sx("background:#f5a98c; border-radius:999px"), flex: sitFlex }} />
                </div>
                <div style={sx("font-size:11px; color:#8ba8b3; line-height:1.5")}>{postureNote}</div>
              </div>
            </div>
          ) : (
            <div style={sx("display:flex; flex-direction:column; gap:13px; padding:18px; border-radius:20px; background:#fff; border:1px solid #e3eef1")}>
              <div style={sx("font-size:14px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>오늘은 아직 조용해요. 시작은 1분이면 충분합니다.</div>
              <div onClick={() => patch({ sheet: "content", program: null })} style={sx("cursor:pointer; text-align:center; padding:13px; border-radius:13px; background:#f2edfa; border:1px solid #e0d9f2; font-size:14px; font-weight:700; color:#7a6bc4")}>1분 기지개부터</div>
            </div>
          )}

          {s.sessions.length > 0 && (
            <div style={sx("display:flex; flex-direction:column; gap:9px; padding:16px 18px; border-radius:20px; background:#fff; border:1.5px solid #dcd6ee; box-shadow:0 10px 22px rgba(80,88,140,0.2), 0 2px 5px rgba(80,88,140,0.14)")}>
              <div style={sx("font-size:12px; font-weight:600; color:#8ba8b3")}>오늘 함께한 몸풀기</div>
              {s.sessions.map((ss, i) => (
                <div key={i} style={sx("display:flex; align-items:center; gap:10px")}>
                  <div style={sx("width:28px; height:28px; border-radius:9px; flex:none; background:linear-gradient(140deg,#dbeef3,#a9d6e5)")} />
                  <div style={sx("flex:1; min-width:0; font-size:13.5px; font-weight:600; color:#2d5c6e")}>{ss.title}</div>
                  <div style={sx("font-size:12px; color:#8ba8b3; flex:none; white-space:nowrap")}>{ss.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderRecords() {
    const totals = v.totals;
    const maxByMin = v.maxByMin;
    const durationStats = [1, 3, 5, 10].map((m) => {
      const c = totals.byMin[m] || 0;
      return { label: m + "분", count: c + "회", pct: Math.round((c / maxByMin) * 100), bg: c === maxByMin ? "#7a6bc4" : c >= 2 ? "#a99ce0" : "#d8d0f2" };
    });
    const weeklyBars = WEEKLY_PAST.concat([{ label: "이번 주", v: totals.min }]).map((w) => ({ label: w.label, value: w.v, h: Math.round(w.v * 0.75) + 8, bg: w.label === "이번 주" ? "#7a6bc4" : "#e6e2f7" }));
    const doneList = DONE_WEEK.map((d) => {
      const pg = PROGRAMS.find((x) => x.id === d.id)!;
      return { title: pg.title, min: pg.min + "분", chipBg: pg.min <= 1 ? "#fdf1e6" : pg.min <= 3 ? "#ffe6ec" : "#f2edfa", chipInk: pg.min <= 3 ? "#8a4a3c" : "#4a3f80", n: d.n };
    });
    const item = v.item;
    const recIsBody = s.recTab === "body";
    const bodySolution = "이번 주는 3분짜리를 가장 자주 고르셨고, 오후 2시–4시에 앉아 계신 시간이 길었어요. 요즘처럼 더운 주에는 낮 시간대를 늘리기보다, 그 시간엔 실내에서 짧게 한 번 더 끼워 넣고 걷기는 해가 진 뒤로 옮기는 쪽이 잘 맞을 것 같아요.";
    const bodyActions = [
      { label: v.wx.prefer === "indoor" ? "낮에는 실내에서 3분 한 번 더" : "오후 3시에 3분 걷기 한 번 더", go: () => patch({ tab: "home" }) },
      { label: "오늘 " + v.itemTitle + " 해보기", go: () => patch({ sheet: "content" }) },
    ];
    const mindActions = [
      { label: "마음과 대화에 이번 주 이야기 꺼내보기", go: () => patch({ sheet: "talk" }) },
      { label: "오늘의 그림으로 지금 마음 확인하기", go: () => patch({ sheet: "picture", answers: {} }) },
    ];

    return (
      <div style={sx("flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:13px; padding:14px 20px 96px")}>
        <div style={sx("font-size:22px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; padding-top:6px")}>나의 기록</div>
        <div style={sx("font-size:13px; color:#8ba8b3; line-height:1.5; margin-bottom:2px")}>선생님만 볼 수 있어요. 학교와 교육청에는 어떤 형태로도 전달되지 않습니다.</div>
        <div style={sx("display:flex; gap:7px; padding-bottom:2px")}>
          <div onClick={() => patch({ recTab: "body" })} style={{ ...sx("cursor:pointer; flex:1; text-align:center; min-height:42px; display:flex; align-items:center; justify-content:center; border-radius:13px; font-size:13.5px; font-weight:700; border:1.5px solid; transition:all 0.18s"), background: recIsBody ? "#f2edfa" : "#fff", color: recIsBody ? "#7a6bc4" : "#8ba8b3", borderColor: recIsBody ? "#7a6bc4" : "#e3eef1" }}>몸의 기록</div>
          <div onClick={() => patch({ recTab: "mind" })} style={{ ...sx("cursor:pointer; flex:1; text-align:center; min-height:42px; display:flex; align-items:center; justify-content:center; border-radius:13px; font-size:13.5px; font-weight:700; border:1.5px solid; transition:all 0.18s"), background: !recIsBody ? "#f2edfa" : "#fff", color: !recIsBody ? "#7a6bc4" : "#8ba8b3", borderColor: !recIsBody ? "#7a6bc4" : "#e3eef1" }}>마음의 기록</div>
        </div>

        {recIsBody ? (
          <div style={sx("display:flex; flex-direction:column; gap:12px")}>
            <div style={sx("display:flex; gap:11px")}>
              <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; padding:16px; border-radius:20px; background:linear-gradient(150deg,#fff1e4 0%,#ffe6ec 100%); border:1px solid #fadbd3")}>
                <div style={sx("font-size:11.5px; font-weight:700; color:#9a5f4c")}>이번 주 걸음</div>
                <div style={sx("font-size:23px; font-weight:700; color:#8a4a3c; letter-spacing:-0.03em; line-height:1; white-space:nowrap")}>28,940</div>
                <div style={sx("font-size:11px; color:#9a5f4c; white-space:nowrap")}>하루 평균 4,134</div>
              </div>
              <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; padding:16px; border-radius:20px; background:linear-gradient(150deg,#e8f3ff 0%,#ede7fb 100%); border:1px solid #ddd9f3")}>
                <div style={sx("font-size:11.5px; font-weight:700; color:#5f5397")}>이번 주 실행</div>
                <div style={sx("font-size:23px; font-weight:700; color:#4a3f80; letter-spacing:-0.03em; line-height:1; white-space:nowrap")}>{totals.count}회</div>
                <div style={sx("font-size:11px; color:#5f5397; white-space:nowrap")}>모두 {totals.min}분</div>
              </div>
            </div>

            <div style={sx("display:flex; flex-direction:column; gap:13px; padding:17px 16px; border-radius:20px; background:#fff; border:1px solid #e3eef1")}>
              <div style={sx("font-size:13.5px; font-weight:700; color:#3a4a72")}>시간별로 얼마나 하셨나요</div>
              {durationStats.map((d, i) => (
                <div key={i} style={sx("display:flex; align-items:center; gap:11px")}>
                  <div style={sx("flex:none; width:34px; font-size:12.5px; font-weight:700; color:#7a6bc4; white-space:nowrap")}>{d.label}</div>
                  <div style={sx("flex:1; min-width:0; height:9px; border-radius:999px; background:#f0edf9; overflow:hidden")}>
                    <div style={{ ...sx("height:100%; border-radius:999px"), width: d.pct + "%", background: d.bg }} />
                  </div>
                  <div style={sx("flex:none; width:32px; text-align:right; font-size:12px; font-weight:600; color:#8ba8b3; white-space:nowrap")}>{d.count}</div>
                </div>
              ))}
              <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>3분짜리를 가장 자주 고르셨어요. 짧게 자주가 제일 잘 맞는 방식일 수 있어요.</div>
            </div>

            <div style={sx("display:flex; flex-direction:column; gap:12px; padding:17px 16px; border-radius:20px; background:#fff; border:1px solid #e3eef1")}>
              <div style={sx("display:flex; align-items:baseline; gap:9px")}>
                <div style={sx("flex:1; min-width:0; font-size:13.5px; font-weight:700; color:#3a4a72")}>어떤 걸 하셨나요</div>
                <div style={sx("flex:none; white-space:nowrap; font-size:11.5px; font-weight:600; color:#8ba8b3")}>{DONE_WEEK.length} / {PROGRAMS.length}가지</div>
              </div>
              {doneList.map((dn, i) => (
                <div key={i} style={sx("display:flex; align-items:center; gap:11px")}>
                  <div style={{ ...sx("flex:none; width:34px; height:26px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:10.5px; font-weight:800; white-space:nowrap"), background: dn.chipBg, color: dn.chipInk }}>{dn.min}</div>
                  <div style={sx("flex:1; min-width:0; font-size:13px; font-weight:600; color:#3a4a72; overflow:hidden; text-overflow:ellipsis; white-space:nowrap")}>{dn.title}</div>
                  <div style={sx("flex:none; display:flex; gap:3px")}>
                    {Array.from({ length: dn.n }).map((_, k) => (<div key={k} style={sx("width:7px; height:7px; border-radius:50%; background:#8a7cd0")} />))}
                  </div>
                </div>
              ))}
              <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>목·어깨와 호흡 쪽으로 손이 많이 가셨어요. 손목과 다리는 아직 안 해보셨는데, 한 번쯤 열어보셔도 좋아요.</div>
            </div>

            <div style={sx("display:flex; flex-direction:column; gap:13px; padding:17px 16px; border-radius:20px; background:#fff; border:1px solid #e3eef1")}>
              <div style={sx("display:flex; align-items:baseline; gap:9px")}>
                <div style={sx("flex:1; min-width:0; font-size:13.5px; font-weight:700; color:#3a4a72")}>최근 4주 실행 시간</div>
                <div style={sx("flex:none; white-space:nowrap; font-size:11.5px; font-weight:600; color:#8ba8b3")}>주별 합계 (분)</div>
              </div>
              <div style={sx("display:flex; align-items:flex-end; gap:9px; height:88px")}>
                {weeklyBars.map((w, i) => (
                  <div key={i} style={sx("flex:1; display:flex; flex-direction:column; align-items:center; gap:6px")}>
                    <div style={sx("font-size:11px; font-weight:700; color:#8ba8b3; white-space:nowrap")}>{w.value}</div>
                    <div style={{ ...sx("width:100%; border-radius:7px 7px 3px 3px"), height: w.h, background: w.bg }} />
                    <div style={sx("font-size:10.5px; color:#8ba8b3; white-space:nowrap")}>{w.label}</div>
                  </div>
                ))}
              </div>
              <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>이번 주는 지난주와 비슷한 정도예요.</div>
            </div>

            <div style={sx("display:flex; flex-direction:column; gap:14px; padding:18px 17px; border-radius:22px; background:linear-gradient(140deg,#fff1e4 0%,#f6edfa 60%,#eaf3fb 100%); border:1px solid #f0e0e0; box-shadow:0 4px 16px rgba(196,150,140,0.14)")}>
              <div style={sx("display:flex; align-items:center; gap:9px")}>
                <div style={sx("flex:none; padding:5px 11px; border-radius:999px; background:rgba(255,255,255,0.75); font-size:10.5px; font-weight:800; color:#8a4a3c; white-space:nowrap; letter-spacing:0.02em")}>AI 주간 제안</div>
                <div style={sx("flex:1; min-width:0; font-size:12.5px; color:#8a4a3c; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>이번 주 기록을 바탕으로</div>
              </div>
              <div style={sx("font-size:14.5px; color:#5a4a58; line-height:1.75; font-weight:500; text-wrap:pretty")}>{bodySolution}</div>
              <div style={sx("display:flex; flex-direction:column; gap:9px")}>
                {bodyActions.map((ba, i) => (
                  <div key={i} onClick={ba.go} style={sx("cursor:pointer; display:flex; align-items:center; gap:11px; min-height:52px; padding:0 15px; border-radius:15px; background:#fff; border:1px solid #f0e2e6")}>
                    <div style={sx("flex:none; width:7px; height:7px; border-radius:50%; background:#e0876c")} />
                    <div style={sx("flex:1; min-width:0; font-size:13.5px; font-weight:600; color:#5a4a58; text-wrap:pretty")}>{ba.label}</div>
                    <div style={sx("flex:none; font-size:14px; color:#c9b6b6")}>›</div>
                  </div>
                ))}
              </div>
              <div style={sx("font-size:12.5px; color:#6b5560; line-height:1.6; text-wrap:pretty")}>이 제안은 이 기기 안의 기록만 보고 만들어졌어요. 맞지 않으면 그냥 지나치셔도 됩니다.</div>
            </div>
          </div>
        ) : (
          <div style={sx("display:flex; flex-direction:column; gap:12px")}>
            <div style={sx("display:flex; flex-direction:column; gap:13px; padding:17px 16px; border-radius:20px; background:linear-gradient(140deg,#f3eefb 0%,#eaf3fb 100%); border:1px solid #e2e9f5")}>
              <div style={sx("font-size:13.5px; font-weight:700; color:#4a3f80")}>이번 주 마음은 이런 모양이었어요</div>
              <div style={sx("font-size:14px; color:#4d5578; line-height:1.7; text-wrap:pretty")}>주 초에는 버티는 쪽에 마음이 쏠려 있었고, 주 중반부터는 조금씩 정돈되는 쪽으로 옮겨갔어요. 읽어내려 애쓰지 않으셔도 괜찮아요.</div>
            </div>
            {MIND_DAYS.map((md, i) => (
              <div key={i} style={sx("display:flex; align-items:flex-start; gap:13px; padding:16px; border-radius:18px; background:#fff; border:1px solid #e3eef1")}>
                <div style={sx("flex:none; width:34px; padding-top:1px; font-size:12.5px; font-weight:700; color:#6b8c9a; white-space:nowrap")}>{md.day}</div>
                <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:7px")}>
                  <div style={sx("font-size:13.5px; color:#3a4a72; line-height:1.6; font-weight:500; text-wrap:pretty")}>{md.reading}</div>
                  <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.5; text-wrap:pretty")}>고른 것 · {md.picked}</div>
                </div>
              </div>
            ))}
            <div style={sx("display:flex; flex-direction:column; gap:14px; padding:18px 17px; border-radius:22px; background:linear-gradient(140deg,#f0eafc 0%,#eaf1fb 60%,#fdf0f4 100%); border:1px solid #e2e0f2; box-shadow:0 4px 16px rgba(122,107,196,0.14)")}>
              <div style={sx("display:flex; align-items:center; gap:9px")}>
                <div style={sx("flex:none; padding:5px 11px; border-radius:999px; background:rgba(255,255,255,0.8); font-size:10.5px; font-weight:800; color:#4a3f80; white-space:nowrap; letter-spacing:0.02em")}>AI 주간 제안</div>
                <div style={sx("flex:1; min-width:0; font-size:12.5px; color:#4a3f80; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>이번 주 고르신 것을 바탕으로</div>
              </div>
              <div style={sx("font-size:14.5px; color:#454767; line-height:1.75; font-weight:500; text-wrap:pretty")}>이런 주에는 무언가를 더 하기보다, 하루의 끝을 조금 일찍 닫아두는 편이 도움이 되더라고요. 퇴근 후 처음 30분은 아무 일정도 넣지 않는 쪽으로 다음 주를 잡아보시면 어떨까요.</div>
              <div style={sx("display:flex; flex-direction:column; gap:9px")}>
                {mindActions.map((ma, i) => (
                  <div key={i} onClick={ma.go} style={sx("cursor:pointer; display:flex; align-items:center; gap:11px; min-height:52px; padding:0 15px; border-radius:15px; background:#fff; border:1px solid #e6e2f2")}>
                    <div style={sx("flex:none; width:7px; height:7px; border-radius:50%; background:#8a7cd0")} />
                    <div style={sx("flex:1; min-width:0; font-size:13.5px; font-weight:600; color:#454767; text-wrap:pretty")}>{ma.label}</div>
                    <div style={sx("flex:none; font-size:14px; color:#bdb6d6")}>›</div>
                  </div>
                ))}
              </div>
              <div style={sx("font-size:12.5px; color:#5f5b7d; line-height:1.6; text-wrap:pretty")}>해석이 아니라 제안이에요. 맞지 않으면 그냥 지나치셔도 됩니다.</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSettings() {
    const parqStatus = v.parqAll ? (v.parqYes ? "낮은 강도" : "평소 강도") : "미완료";
    return (
      <div style={sx("flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:16px; padding:14px 20px 96px")}>
        <div style={sx("font-size:22px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; padding-top:6px")}>설정</div>

        <div style={sx("display:flex; flex-direction:column; gap:10px; padding:18px; border-radius:18px; background:#f2edfa; border:1px solid #dbedf2")}>
          <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>개인정보 5대 원칙</div>
          <div style={sx("display:flex; flex-direction:column; gap:7px")}>
            {PRINCIPLES.map((text, i) => (<div key={i} style={sx("font-size:13px; color:#4d7c8c; line-height:1.55; text-wrap:pretty")}>{text}</div>))}
          </div>
        </div>

        <div style={sx("display:flex; flex-direction:column; border-radius:18px; background:#fff; border:1px solid #e3eef1; overflow:hidden")}>
          <div style={sx("display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid #eef4f6")}>
            <div style={sx("flex:1; display:flex; flex-direction:column; gap:3px")}>
              <div style={sx("font-size:14px; font-weight:600; color:#2d5c6e")}>알림 받지 않기</div>
              <div style={sx("font-size:12px; color:#8ba8b3")}>앱 안에서는 그대로 이용할 수 있어요</div>
            </div>
            <div onClick={() => patch({ notifOff: !s.notifOff })} style={{ ...sx("cursor:pointer; width:46px; height:27px; border-radius:14px; padding:3px; display:flex; transition:background 0.2s"), justifyContent: s.notifOff ? "flex-end" : "flex-start", background: s.notifOff ? "#7a6bc4" : "#dbe8ec" }}>
              <div style={sx("width:21px; height:21px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(45,92,110,0.25)")} />
            </div>
          </div>
          <div style={sx("display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid #eef4f6")}>
            <div style={sx("flex:1; font-size:14px; font-weight:600; color:#2d5c6e")}>방해금지 시간대</div>
            <div style={sx("font-size:13px; color:#6b8c9a; flex:none; white-space:nowrap")}>밤 9시 – 아침 8시</div>
          </div>
          <div style={sx("display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid #eef4f6")}>
            <div style={sx("flex:1; font-size:14px; font-weight:600; color:#2d5c6e")}>직군</div>
            <div style={sx("font-size:13px; color:#6b8c9a; flex:none; white-space:nowrap")}>{v.role.label}</div>
          </div>
          <div onClick={() => patch({ ob: 4, parq: {}, parqOnly: true })} style={sx("cursor:pointer; display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid #eef4f6")}>
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:3px")}>
              <div style={sx("font-size:14px; font-weight:600; color:#2d5c6e")}>안전 확인 다시 답하기</div>
              <div style={sx("font-size:12px; color:#8ba8b3")}>PAR-Q+ 7문항 · 활동 강도 기준</div>
            </div>
            <div style={sx("flex:none; white-space:nowrap; font-size:13px; color:#6b8c9a")}>{parqStatus}</div>
          </div>
          <div style={sx("display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid #eef4f6")}>
            <div style={sx("flex:1; font-size:14px; font-weight:600; color:#2d5c6e")}>학기 · 방학 전환</div>
            <div style={sx("font-size:13px; color:#6b8c9a; flex:none; white-space:nowrap")}>학기 중</div>
          </div>
          <div style={sx("display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid #eef4f6")}>
            <div style={sx("flex:1; font-size:14px; font-weight:600; color:#2d5c6e")}>수집 현황 확인</div>
            <div style={sx("font-size:15px; color:#b5c8d0")}>›</div>
          </div>
          <div style={sx("display:flex; align-items:center; gap:12px; padding:16px 18px")}>
            <div style={sx("flex:1; font-size:14px; font-weight:600; color:#2d5c6e")}>수집 중단하기</div>
            <div style={sx("font-size:15px; color:#b5c8d0")}>›</div>
          </div>
        </div>

        <div style={sx("display:flex; flex-direction:column; gap:12px; padding:18px; border-radius:18px; background:#fff; border:1px solid #e3eef1")}>
          <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>전체 데이터 즉시 파기</div>
          <div style={sx("font-size:13px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>이 기기에 저장된 모든 기록을 지웁니다. 복구할 수 없고, 지운 사실도 남지 않습니다.</div>
          <div onClick={() => patch({ wiped: true })} style={sx("cursor:pointer; text-align:center; padding:14px; border-radius:13px; border:1.5px solid #d9e7ec; background:#f6fafb; font-size:14px; font-weight:700; color:#2d5c6e")}>{s.wiped ? "모두 지웠어요" : "전체 파기하기"}</div>
        </div>

        <div style={sx("display:flex; gap:10px; padding:4px 0 8px")}>
          <div onClick={() => patch({ ob: 0 })} style={sx("flex:1; cursor:pointer; text-align:center; min-height:46px; display:flex; align-items:center; justify-content:center; border-radius:13px; background:#fff; border:1px solid #e3eef1; font-size:13px; font-weight:600; color:#8ba8b3")}>온보딩 다시 보기</div>
          <div onClick={() => patch({ authed: false, loginId: "", loginPw: "", ob: 0, tab: "home", sheet: null })} style={sx("flex:1; cursor:pointer; text-align:center; min-height:46px; display:flex; align-items:center; justify-content:center; border-radius:13px; background:#fff; border:1px solid #e3eef1; font-size:13px; font-weight:600; color:#8ba8b3")}>로그아웃</div>
        </div>
      </div>
    );
  }

  function renderTabs() {
    const homeInk = s.tab === "home" ? "#7a6bc4" : "#b5c8d0";
    const recInk = s.tab === "records" ? "#7a6bc4" : "#b5c8d0";
    const setInk = s.tab === "settings" ? "#7a6bc4" : "#b5c8d0";
    return (
      <div style={sx("position:absolute; left:0; right:0; bottom:0; display:flex; align-items:center; padding:10px 16px 26px; background:rgba(255,255,255,0.96); border-top:1px solid #eaf2f5; backdrop-filter:blur(12px)")}>
        <div onClick={() => patch({ tab: "home" })} style={sx("flex:1; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:5px")}>
          <div style={{ ...sx("width:20px; height:20px; border-radius:6px; border:2px solid"), borderColor: homeInk }} />
          <div style={{ ...sx("font-size:11px; font-weight:600"), color: homeInk }}>홈</div>
        </div>
        <div onClick={() => patch({ tab: "records" })} style={sx("flex:1; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:5px")}>
          <div style={{ ...sx("width:20px; height:20px; border-radius:50%; border:2px solid"), borderColor: recInk }} />
          <div style={{ ...sx("font-size:11px; font-weight:600"), color: recInk }}>기록</div>
        </div>
        <div onClick={() => patch({ tab: "settings" })} style={sx("flex:1; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:5px")}>
          <div style={{ ...sx("width:20px; height:6px; border-radius:3px; border:2px solid; margin-top:7px"), borderColor: setInk }} />
          <div style={{ ...sx("font-size:11px; font-weight:600"), color: setInk }}>설정</div>
        </div>
      </div>
    );
  }

  function renderPicture() {
    const answered = v.answered;
    const shown = PROBES.slice(0, Math.min(answered + 1, PROBES.length));
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(180deg,#fdfbff 0%,#f1f6fc 100%); display:flex; flex-direction:column; animation:wFade 0.25s ease-out")}>
        <div style={sx("flex:none; display:flex; flex-direction:column; background:#fff; border-bottom:1px solid #eaf2f5")}>
          <div style={sx("padding:48px 16px 10px; display:flex; align-items:center; gap:11px")}>
            <div onClick={() => patch({ sheet: "mind" })} style={sx("cursor:pointer; flex:none; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
            <div style={sx(`width:38px; height:38px; border-radius:13px; flex:none; overflow:hidden; background:url(${IMG}/icon-mind.png) center/cover`)} />
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
              <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>마음 건강</div>
              <div style={sx("font-size:11px; color:#8ba8b3")}>기록은 선생님만 봅니다</div>
            </div>
          </div>
          <div style={sx("display:flex; gap:6px; padding:0 16px 12px")}>
            <div onClick={() => patch({ sheet: "talk" })} style={sx("cursor:pointer; flex:1; text-align:center; min-height:40px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-size:13.5px; font-weight:700; background:#fff; color:#8ba8b3; border:1.5px solid #e3eef1")}>마음과 대화</div>
            <div style={sx("flex:1; text-align:center; min-height:40px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-size:13.5px; font-weight:700; background:#f2edfa; color:#7a6bc4; border:1.5px solid #7a6bc4")}>오늘의 그림</div>
          </div>
        </div>

        <div style={sx("flex:none; padding:16px 22px 12px; display:flex; flex-direction:column; gap:5px")}>
          <div style={sx("font-size:13px; color:#8ba8b3; text-wrap:pretty")}>세 장을 보시고 지금 떠오르는 것을 골라주세요</div>
        </div>

        <div style={sx("flex:1; overflow-y:auto; padding:0 18px 20px; display:flex; flex-direction:column; gap:13px")}>
          {shown.map((p) => {
            const a = s.answers[p.id];
            const o = a ? p.options.find((x) => x.label === a) : null;
            return (
              <div key={p.id} style={sx("flex:none; display:flex; flex-direction:column; gap:12px; padding:17px 16px; border-radius:20px; background:#fff; border:1px solid #e3eef1; box-shadow:0 2px 10px rgba(45,92,110,0.05); animation:wRise 0.42s cubic-bezier(0.22,0.9,0.3,1) both")}>
                <div style={sx("display:flex; align-items:center; gap:9px")}>
                  <div style={sx("width:26px; height:26px; flex:none; border-radius:9px; background:#f2edfa; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:#7a6bc4")}>{p.n}</div>
                  <div style={sx("flex:1; min-width:0; font-size:15px; font-weight:700; color:#2d5c6e")}>{p.title}</div>
                  {a && (
                    <div onClick={() => patchFn((st) => { const next = { ...st.answers }; PROBES.slice(PROBES.indexOf(p)).forEach((q) => { delete next[q.id]; }); return { answers: next }; })} style={sx("cursor:pointer; flex:none; white-space:nowrap; font-size:11.5px; font-weight:600; color:#8ba8b3")}>다시 고르기</div>
                  )}
                </div>
                <div style={sx("font-size:13.5px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>{p.question}</div>
                <div style={{ ...sx("position:relative; border-radius:15px; overflow:hidden; background:#f2f7f9; transition:height 0.4s cubic-bezier(0.22,0.9,0.3,1)"), height: a ? 108 : 168 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/probe-${p.id}.png`} alt={p.slotHint} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                {!a && (
                  <div style={sx("display:grid; grid-template-columns:1fr 1fr; gap:8px")}>
                    {p.options.map((op) => (
                      <div key={op.label} onClick={() => patchFn((st) => ({ answers: { ...st.answers, [p.id]: op.label } }))} style={sx("cursor:pointer; text-align:center; padding:13px 6px; border-radius:13px; background:#fff; border:1.5px solid #e3eef1; font-size:13.5px; font-weight:600; color:#2d5c6e; transition:all 0.18s; text-wrap:pretty")}>{op.label}</div>
                    ))}
                  </div>
                )}
                {a && (
                  <div style={sx("display:flex; flex-direction:column; gap:10px; animation:wRise 0.4s cubic-bezier(0.22,0.9,0.3,1) both")}>
                    <div style={sx("align-self:flex-start; padding:8px 14px; border-radius:999px; background:#f2edfa; font-size:12.5px; font-weight:700; color:#7a6bc4; white-space:nowrap")}>{a}</div>
                    <div style={sx("font-size:14.5px; font-weight:500; line-height:1.65; color:#2d5c6e; letter-spacing:-0.01em; text-wrap:pretty")}>{o?.read}</div>
                  </div>
                )}
              </div>
            );
          })}

          {answered === 0 && (
            <div style={sx("flex:none; text-align:center; font-size:12.5px; color:#8ba8b3; padding:2px 16px; line-height:1.6; text-wrap:pretty")}>정확한 답이 아니어도 괜찮아요. 지금 느낌으로 골라주세요.</div>
          )}
          {answered >= PROBES.length && (
            <div style={sx("flex:none; display:flex; flex-direction:column; gap:14px; padding:18px 17px; border-radius:20px; background:#f2edfa; border:1px solid #dbedf2; animation:wRise 0.45s cubic-bezier(0.22,0.9,0.3,1) both")}>
              <div style={sx("font-size:15px; font-weight:600; line-height:1.65; color:#2d5c6e; letter-spacing:-0.01em; text-wrap:pretty")}>읽어내려 애쓰지 않으셔도 괜찮아요. 오늘은 이만큼만 알아두면 충분합니다.</div>
              <div onClick={() => patch({ sheet: null, answers: {}, pickedToday: true })} style={sx("cursor:pointer; text-align:center; padding:15px; border-radius:16px; background:#fff; border:1px solid #dbedf2; font-size:14.5px; font-weight:700; color:#2d5c6e")}>오늘은 여기까지</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderContent() {
    const item = v.item;
    // 가이드 영상이 있는 항목 = 타이머 없이 영상만(2026-09-12 사용자 지시). 분 선택·시계·기록 없음.
    if (item.video) {
      const close = () => { if (timerRef.current) clearInterval(timerRef.current); patch({ sheet: null, running: false, consultOpen: false }); };
      return (
        <div style={sx("position:absolute; inset:0; background:linear-gradient(180deg,#fdfbff 0%,#f4f8fc 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
          <div style={sx("display:flex; align-items:center; padding:40px 20px 6px")}>
            <div onClick={close} style={sx("cursor:pointer; font-size:15px; color:#6b8c9a; padding:4px 8px 4px 0")}>‹ 닫기</div>
          </div>
          {/* 열 전체가 화면 높이 안에 들어간다(min-height:0). 글은 최소로 두고 영상이 남는 높이를 다 쓴다(폰에서 영상이 너무 작았다). */}
          <div style={sx("flex:1; min-height:0; display:flex; flex-direction:column; gap:12px; padding:0 20px 20px")}>
            <div style={sx("flex:none; font-size:21px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; text-wrap:pretty")}>{v.itemTitle}</div>
            <StretchVideo guide={item.video} playing={s.running} onEnded={() => patch({ running: false, remaining: 0 })} />
            <div style={sx("flex:none; text-align:center; font-size:13px; color:#2d5c6e; line-height:1.5; text-wrap:pretty")}><b>영상을 따라 해보세요</b> · 1분이 지나면 멈춥니다. 계속하려면 「시작하기」를 다시 누르세요.</div>
            {/* 맨 아래 버튼: 「시작하기」가 영상을 틀고(끝난 뒤 다시 누르면 처음부터), 재생 중엔 「마치기」로 닫는다(사용자 지시). */}
            <div onClick={s.running ? close : () => patch({ running: true })} style={sx("flex:none; cursor:pointer; text-align:center; padding:15px; border-radius:16px; background:#7a6bc4; color:#fff; font-size:15px; font-weight:700; box-shadow:0 8px 20px rgba(91,181,207,0.28)")}>{s.running ? "마치기" : "시작하기"}</div>
          </div>
        </div>
      );
    }
    const mm = String(Math.floor(s.remaining / 60)).padStart(2, "0");
    const ss = String(s.remaining % 60).padStart(2, "0");
    const durations = [1, 3, 5, 10];
    const timerHint = s.remaining === 0 ? "오늘 몫은 여기까지로 충분해요" : "1분만 채워도 오늘은 다 한 거예요";
    const timerBtn = s.remaining === 0 ? "마치기" : s.running ? "잠시 멈추기" : "시작하기";
    const toggleTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (s.remaining === 0) {
        const now = new Date();
        const h = now.getHours();
        const ampm = h < 12 ? "오전" : "오후";
        const hh = h % 12 === 0 ? 12 : h % 12;
        const time = `${ampm} ${hh}:${String(now.getMinutes()).padStart(2, "0")}`;
        patchFn((st) => ({ sheet: null, remaining: st.minutes * 60, sessions: st.sessions.concat([{ title: st.minutes + "분 " + v.itemTitle, time }]) }));
        return;
      }
      if (s.running) { patch({ running: false }); return; }
      timerRef.current = setInterval(tick, 1000);
      patch({ running: true });
    };
    const closeSheet = () => { if (timerRef.current) clearInterval(timerRef.current); patch({ sheet: null, running: false, consultOpen: false }); };

    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(180deg,#fdfbff 0%,#f4f8fc 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("display:flex; align-items:center; padding:52px 20px 10px")}>
          <div onClick={closeSheet} style={sx("cursor:pointer; font-size:15px; color:#6b8c9a; padding:4px 8px 4px 0")}>‹ 닫기</div>
        </div>
        <div style={sx("flex:1; display:flex; flex-direction:column; gap:24px; padding:8px 24px 32px")}>
          <div style={sx("display:flex; flex-direction:column; gap:8px")}>
            <div style={sx("font-size:23px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; text-wrap:pretty")}>{v.itemTitle}</div>
            <div style={sx("font-size:14px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>{item.desc + " 10분을 고르셔도 1분만 채우면 오늘 몫은 다 한 거예요."}</div>
          </div>

          <div style={sx("display:flex; gap:8px")}>
            {durations.map((m) => {
              const on = s.minutes === m;
              return (
                <div key={m} onClick={() => { if (timerRef.current) clearInterval(timerRef.current); patch({ minutes: m, remaining: m * 60, running: false }); }} style={{ ...sx("cursor:pointer; flex:1; text-align:center; padding:13px 0; border-radius:14px; font-size:14px; font-weight:700; border:1.5px solid; transition:all 0.2s"), background: on ? "#f2edfa" : "#fff", color: on ? "#7a6bc4" : "#8ba8b3", borderColor: on ? "#c4b8ec" : "#e3eef1" }}>{m}분</div>
              );
            })}
          </div>

          <div style={sx("display:flex; flex-direction:column; align-items:center; gap:20px; padding:14px 0")}>
            <div style={sx("position:relative; width:206px; height:206px; border-radius:50%; background:linear-gradient(140deg,#eaf5f8,#d5eaf1); display:flex; align-items:center; justify-content:center; box-shadow:inset 0 2px 18px rgba(45,92,110,0.07)")}>
              <div style={sx("font-size:42px; font-weight:300; color:#2d5c6e; font-variant-numeric:tabular-nums")}>{mm}:{ss}</div>
            </div>
            <div style={sx("font-size:13px; color:#8ba8b3; text-align:center; text-wrap:pretty")}>{timerHint}</div>
          </div>

          <div onClick={toggleTimer} style={sx("cursor:pointer; text-align:center; padding:17px; border-radius:16px; background:#7a6bc4; color:#fff; font-size:15px; font-weight:700; box-shadow:0 8px 20px rgba(91,181,207,0.28)")}>{timerBtn}</div>
        </div>
      </div>
    );
  }

  function renderLibrary() {
    const wx = v.wx;
    const closeSheet = () => { if (timerRef.current) clearInterval(timerRef.current); patch({ sheet: null, running: false, consultOpen: false }); };
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(175deg,#fff8f4 0%,#f6f2fc 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; display:flex; flex-direction:column; background:#fff; border-bottom:1px solid #f3e8e4")}>
          <div style={sx("padding:48px 16px 12px; display:flex; align-items:center; gap:11px")}>
            <div onClick={closeSheet} style={sx("cursor:pointer; flex:none; font-size:20px; color:#e0876c; padding:0 4px 0 0")}>‹</div>
            <div style={sx(`width:38px; height:38px; border-radius:12px; flex:none; overflow:hidden; background:url(${IMG}/icon-physical.png) center/cover`)} />
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
              <div style={sx("font-size:15px; font-weight:700; color:#8a4a3c")}>신체 건강</div>
              <div style={sx("font-size:11.5px; color:#9a5f4c")}>짧은 몸풀기 {v.libList.length}가지 · 1~10분</div>
            </div>
          </div>
          <div style={sx("display:flex; gap:7px; overflow-x:auto; padding:0 16px 12px")}>
            {AREAS.map((a) => {
              const on = (s.area || "all") === a.id;
              return (
                <div key={a.id} onClick={() => patch({ area: a.id })} style={{ ...sx("cursor:pointer; flex:none; white-space:nowrap; min-height:36px; display:flex; align-items:center; padding:0 14px; border-radius:999px; font-size:12.5px; font-weight:700; border:1.5px solid; transition:all 0.18s"), background: on ? "#ffe6ec" : "#fff", color: on ? "#8a4a3c" : "#9a8590", borderColor: on ? "#e0876c" : "#f0e4e0" }}>{a.label}</div>
              );
            })}
          </div>
        </div>

        <div style={sx("flex:1; overflow-y:auto; padding:14px 16px 24px; display:flex; flex-direction:column; gap:10px")}>
          {v.libList.map((pg) => {
            const chipBg = pg.min <= 1 ? "#fdf1e6" : pg.min <= 3 ? "#ffe6ec" : "#f2edfa";
            const chipInk = pg.min <= 3 ? "#8a4a3c" : "#4a3f80";
            return (
              <div key={pg.id} onClick={() => { if (timerRef.current) clearInterval(timerRef.current); patch({ sheet: "content", program: pg, minutes: pg.min, remaining: pg.min * 60, running: false }); }} style={sx("cursor:pointer; display:flex; align-items:center; gap:13px; padding:15px 16px; border-radius:18px; background:#fff; border:1px solid #f0e4e0; box-shadow:0 2px 8px rgba(196,150,140,0.08)")}>
                <div style={{ ...sx("flex:none; width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:12.5px; font-weight:800; white-space:nowrap"), background: chipBg, color: chipInk }}>{pg.min}분</div>
                <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:4px")}>
                  <div style={sx("font-size:14.5px; font-weight:700; color:#5a4a58; text-wrap:pretty")}>{pg.title}</div>
                  <div style={sx("font-size:12px; color:#8a7078; line-height:1.5; text-wrap:pretty")}>{pg.desc}</div>
                </div>
                <div style={sx("flex:none; font-size:15px; color:#c9b6b6")}>›</div>
              </div>
            );
          })}
          <div style={sx("font-size:12.5px; color:#8a7078; line-height:1.6; padding:6px 4px; text-wrap:pretty")}>{wx.prefer === "indoor" ? "오늘은 바깥이 더워 실내에서 할 수 있는 것만 보여드렸어요." : "바깥 공기가 좋은 날이라 걷기도 함께 넣어두었어요."}</div>
        </div>
      </div>
    );
  }

  function renderMind() {
    const closeSheet = () => { if (timerRef.current) clearInterval(timerRef.current); patch({ sheet: null, running: false, consultOpen: false }); };
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(175deg,#f6f2fc 0%,#f0f7fb 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; display:flex; align-items:center; gap:11px; padding:48px 16px 14px; background:#fff; border-bottom:1px solid #eee9f7")}>
          <div onClick={closeSheet} style={sx("cursor:pointer; flex:none; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
          <div style={sx(`width:38px; height:38px; border-radius:13px; flex:none; overflow:hidden; background:url(${IMG}/icon-mind.png) center/cover`)} />
          <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>마음 건강</div>
            <div style={sx("font-size:11px; color:#8ba8b3")}>기록은 선생님만 봅니다</div>
          </div>
        </div>

        <div style={sx("flex:1; overflow-y:auto; padding:18px 18px 24px; display:flex; flex-direction:column; gap:12px")}>
          <div onClick={() => patch({ sheet: "talk" })} style={sx("cursor:pointer; display:flex; align-items:center; gap:14px; padding:18px 17px; border-radius:20px; background:#fff; border:1px solid #e3eef1; box-shadow:0 2px 10px rgba(45,92,110,0.05)")}>
            <div style={sx(`width:48px; height:48px; flex:none; border-radius:50%; overflow:hidden; background:#fbe3b4 url(${IMG}/shimpyo.png) center/contain no-repeat`)} />
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:4px")}>
              <div style={sx("font-size:15.5px; font-weight:700; color:#2d5c6e")}>마음과 대화</div>
              <div style={sx("font-size:13px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>스트레스, 답답함, 억울함 — 터놓고 말해도 되는 자리예요</div>
              <div style={sx("font-size:11.5px; color:#8ba8b3; line-height:1.5; text-wrap:pretty")}>옆반 동료 · 수석교사 · 동기 · 상담교사 중에서 상대를 고를 수 있어요</div>
            </div>
            <div style={sx("flex:none; font-size:16px; color:#b5c8d0")}>›</div>
          </div>

          <div onClick={() => patch({ sheet: "picture", answers: {} })} style={sx("cursor:pointer; display:flex; align-items:center; gap:14px; padding:18px 17px; border-radius:20px; background:#fff; border:1px solid #e3eef1; box-shadow:0 2px 10px rgba(45,92,110,0.05)")}>
            <div style={sx(`width:48px; height:48px; flex:none; border-radius:15px; overflow:hidden; background:url(${IMG}/probe-mood.png) center/cover`)} />
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:4px")}>
              <div style={sx("font-size:15.5px; font-weight:700; color:#2d5c6e")}>오늘의 그림</div>
              <div style={sx("font-size:13px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>말로 꺼내기 어려운 날엔 그림으로 골라보세요</div>
            </div>
            <div style={sx("flex:none; font-size:16px; color:#b5c8d0")}>›</div>
          </div>

          <div style={sx("font-size:12px; color:#8ba8b3; line-height:1.65; padding:4px 4px 0; text-wrap:pretty")}>두 가지 모두 선택입니다. 먼저 열지 않으면 아무 일도 일어나지 않아요.</div>
        </div>
      </div>
    );
  }

  function renderTalk() {
    const week = WEEK_TEMP.map((w) => ({ day: w.day, color: TEMP[w.temp] }));
    void week; // 주간 온도 미니바(원본 미표시)
    const ch = characterOf(s.character);
    // 아바타: 이미지가 오기 전까지 역할 첫 글자 + 캐릭터 색. 이미지가 생기면 characters.ts 의 avatar 에 경로만 넣으면 된다.
    // 이미지가 없거나 못 읽으면(아직 안 만든 캐릭터) 역할 첫 글자 + 색으로 — <img onError> 로 그 자리에서 전환.
    const avatar = (size: number, c = ch) => (
      <div style={{ ...sx(`position:relative; width:${size}px; height:${size}px; border-radius:50%; flex:none; overflow:hidden; display:flex; align-items:center; justify-content:center; font-weight:800; color:#2d5c6e`), background: c.color, fontSize: Math.round(size * 0.42) }}>
        {c.role.slice(0, 1)}
        {c.avatar && !s.avatarMissing[c.id] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatar} alt="" onError={() => patchFn((st) => ({ avatarMissing: { ...st.avatarMissing, [c.id]: true } }))} style={sx("position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block")} />
        )}
      </div>
    );
    // 상대 바꾸기 = 새 대화(인사부터). 위험 안내 상태도 초기화.
    const pickCharacter = (id: CharacterId) => {
      const c = characterOf(id);
      patchFn((st) => ({
        character: id, pickingCharacter: false, beat: 0, typing: false, riskShown: false,
        chat: [{ role: "bot", text: c.intro, at: stampAt(0, st.now) }],
      }));
    };
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(175deg,#f6f2fc 0%,#f0f7fb 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; display:flex; flex-direction:column; background:#fff; border-bottom:1px solid #eee9f7")}>
          <div style={sx("padding:48px 16px 10px; display:flex; align-items:center; gap:11px")}>
            <div onClick={() => patch({ sheet: "mind" })} style={sx("cursor:pointer; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
            {avatar(38)}
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
              <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>마음 건강</div>
              <div style={sx("font-size:11px; color:#8ba8b3")}>기록은 선생님만 봅니다</div>
            </div>
          </div>
          <div style={sx("display:flex; gap:6px; padding:0 16px 12px")}>
            <div style={sx("flex:1; text-align:center; min-height:40px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-size:13.5px; font-weight:700; background:#f2edfa; color:#7a6bc4; border:1.5px solid #7a6bc4")}>마음과 대화</div>
            <div onClick={() => patch({ sheet: "picture", answers: {} })} style={sx("cursor:pointer; flex:1; text-align:center; min-height:40px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-size:13.5px; font-weight:700; background:#fff; color:#8ba8b3; border:1.5px solid #e3eef1")}>오늘의 그림</div>
          </div>
        </div>

        <div ref={chatRef} style={sx("flex:1; overflow-y:auto; padding:18px 14px 14px; display:flex; flex-direction:column; gap:12px")}>
          <div style={sx("align-self:center; flex:none; font-size:11px; color:#7b78a6; background:#ece7f8; padding:5px 12px; border-radius:999px; white-space:nowrap")}>{chatDateLabel}</div>
          <div style={sx("flex:none; display:flex; align-items:center; justify-content:center; gap:8px; padding:2px 20px 4px")}>
            <div style={sx("font-size:12.5px; font-weight:600; color:#5f5397; text-wrap:pretty")}>{CHARACTER_DISPLAY_NAME} · {ch.role}</div>
            <div onClick={() => patch({ pickingCharacter: true })} style={sx("cursor:pointer; font-size:12px; font-weight:700; color:#7a6bc4; background:#f2edfa; border:1px solid #e0d9f2; border-radius:999px; padding:4px 10px; white-space:nowrap")}>상대 바꾸기</div>
          </div>

          {s.chat.map((m, i) => {
            const me = m.role === "me";
            return (
              <div key={i} style={{ ...sx("flex:none; display:flex; align-items:flex-start; gap:8px; animation:wRise 0.28s ease-out both"), flexDirection: me ? "row-reverse" : "row" }}>
                {!me && avatar(34)}
                <div style={{ ...sx("max-width:250px; padding:12px 15px; font-size:14.5px; line-height:1.65; white-space:pre-line; text-wrap:pretty"), borderRadius: me ? "16px 16px 5px 16px" : "16px 16px 16px 5px", background: me ? "#7a6bc4" : "#fff", color: me ? "#fff" : "#2d5c6e", boxShadow: me ? "0 2px 8px rgba(91,181,207,0.28)" : "0 1px 3px rgba(45,92,110,0.06)" }}>{m.text}</div>
                <div style={{ ...sx("font-size:10px; color:#8ba8b3; flex:none; white-space:nowrap"), alignSelf: "flex-end" }}>{m.at}</div>
              </div>
            );
          })}

          {s.typing && (
            <div style={sx("flex:none; display:flex; align-items:flex-start; gap:8px")}>
              {avatar(34)}
              <div style={sx("background:#fff; padding:13px 16px; border-radius:16px 16px 16px 5px; display:flex; gap:5px; box-shadow:0 1px 3px rgba(45,92,110,0.06)")}>
                <span style={sx("width:6px; height:6px; border-radius:50%; background:#8ba8b3; animation:dotPulse 1.2s infinite")} />
                <span style={sx("width:6px; height:6px; border-radius:50%; background:#8ba8b3; animation:dotPulse 1.2s infinite 0.15s")} />
                <span style={sx("width:6px; height:6px; border-radius:50%; background:#8ba8b3; animation:dotPulse 1.2s infinite 0.3s")} />
              </div>
            </div>
          )}
        </div>

        <div style={sx("flex:none; background:#fff; border-top:1px solid #eaf2f5")}>
          {s.riskShown && (
            <div style={sx("padding:12px 14px 0")}>
              <div onClick={() => patch({ consultOpen: true })} style={sx("cursor:pointer; text-align:center; border:1px solid #e0d9f2; background:#f8f5fd; color:#7a6bc4; font-size:13.5px; font-weight:700; padding:13px; border-radius:14px")}>🌿 마음쉼 상담 익명으로 신청하기</div>
            </div>
          )}
          <div style={sx("display:flex; align-items:center; gap:9px; padding:14px 14px 22px")}>
            <input value={s.input} onChange={(e) => patch({ input: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="아무 말이나 괜찮아요, 그냥 적어보세요" style={sx("flex:1; min-width:0; border:none; background:#f4f1fb; border-radius:999px; padding:13px 16px; font-size:14px; color:#2d5c6e; outline:none; font-family:inherit")} />
            <div onClick={send} style={sx("cursor:pointer; width:44px; height:44px; flex:none; border-radius:50%; background:#7a6bc4; color:#fff; font-size:16px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(91,181,207,0.35)")}>↑</div>
          </div>
        </div>

        {s.pickingCharacter && (
          <div style={sx("position:absolute; inset:0; background:rgba(45,92,110,0.35); display:flex; flex-direction:column; justify-content:flex-end; animation:wFade 0.2s ease-out")}>
            <div onClick={() => patch({ pickingCharacter: false })} style={sx("flex:1; cursor:pointer")} />
            <div style={sx("flex:none; display:flex; flex-direction:column; gap:12px; padding:22px 20px 26px; background:#fff; border-radius:24px 24px 0 0; animation:wRise 0.3s ease-out both")}>
              <div style={sx("width:38px; height:4px; border-radius:999px; background:#e0eff3; align-self:center")} />
              <div style={sx("font-size:19px; font-weight:800; color:#2d5c6e; letter-spacing:-0.02em")}>누구와 이야기할까요</div>
              <div style={sx("font-size:13px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>상대를 바꾸면 대화가 새로 시작돼요. 기록은 선생님만 봅니다.</div>
              {CHARACTERS.map((c) => {
                const on = c.id === s.character;
                return (
                  <div key={c.id} onClick={() => pickCharacter(c.id)} style={{ ...sx("cursor:pointer; display:flex; align-items:center; gap:13px; padding:13px 14px; border-radius:16px; background:#fff; border:1.5px solid; transition:border-color 0.2s"), borderColor: on ? "#7a6bc4" : "#e3eef1" }}>
                    {avatar(44, c)}
                    <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:3px")}>
                      <div style={sx("display:flex; align-items:baseline; gap:6px")}>
                        <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>{c.role}</div>
                        <div style={sx("font-size:12px; color:#8ba8b3")}>{c.title}</div>
                      </div>
                      <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.5; text-wrap:pretty")}>{c.blurb}</div>
                    </div>
                    {on && <div style={sx("flex:none; font-size:12px; font-weight:700; color:#7a6bc4")}>지금</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {s.consultOpen && (
          <div style={sx("position:absolute; inset:0; background:rgba(45,92,110,0.35); display:flex; flex-direction:column; justify-content:flex-end; animation:wFade 0.2s ease-out")}>
            <div onClick={() => patch({ consultOpen: false })} style={sx("flex:1; cursor:pointer")} />
            <div style={sx("flex:none; display:flex; flex-direction:column; gap:14px; padding:22px 20px 26px; background:#fff; border-radius:24px 24px 0 0; animation:wRise 0.3s ease-out both")}>
              <div style={sx("width:38px; height:4px; border-radius:999px; background:#e0eff3; align-self:center")} />
              <div style={sx("font-size:19px; font-weight:800; color:#2d5c6e; letter-spacing:-0.02em")}>마음쉼 상담 신청</div>
              <div style={sx("font-size:13.5px; color:#6b8c9a; line-height:1.7; text-wrap:pretty")}>소속 학교와 이름은 상담사에게 전달되지 않아요. 상담 이력은 인사 기록과 완전히 분리됩니다.</div>
              <div style={sx("display:flex; flex-direction:column; gap:9px; background:#f5f9fa; border-radius:14px; padding:16px")}>
                {[["지원 횟수", "연 8회 무료"], ["방식", "대면 · 화상 · 전화"], ["배정", "신청 후 2일 이내"]].map(([k, val]) => (
                  <div key={k} style={sx("display:flex; align-items:center; gap:12px")}>
                    <div style={sx("flex:1; font-size:13px; color:#6b8c9a")}>{k}</div>
                    <div style={sx("flex:none; white-space:nowrap; font-size:13px; font-weight:700; color:#2d5c6e")}>{val}</div>
                  </div>
                ))}
              </div>
              <div onClick={() => patchFn((st) => ({ consultOpen: false, chat: st.chat.concat([{ role: "bot", text: "신청이 전해졌어요. 이름과 학교는 함께 가지 않았습니다. 이틀 안에 상담 선생님이 배정될 거예요.", at: stampAt(st.chat.length, st.now) }]) }))} style={sx("cursor:pointer; text-align:center; padding:15px; border-radius:14px; background:#7a6bc4; color:#fff; font-size:15px; font-weight:700; box-shadow:0 6px 18px rgba(91,181,207,0.28)")}>익명으로 신청하기</div>
              <div onClick={() => patch({ consultOpen: false })} style={sx("cursor:pointer; text-align:center; padding:4px; font-size:14px; font-weight:600; color:#8ba8b3")}>다음에 할게요</div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
