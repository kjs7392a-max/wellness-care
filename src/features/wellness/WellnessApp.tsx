"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sx } from "./sx";
import { StretchVideo } from "./StretchVideo";
import { CHARACTERS, CHARACTER_DISPLAY_NAME, characterOf, DEFAULT_CHARACTER, type CharacterId } from "./characters";
import { AXES, directing, EMPTY_SAM, samAnswered, samDone, samWeight, type SamAnswer, type SamScore } from "./sam";
import { bodyEvidence, bodyLevel, change, dayBodyEvidence, dayBodyLevel, dayMindEvidence, dayMindLevel, flowText, LEVEL_COLOR, LEVEL_LABEL, mindEvidence, mindLevel, overallLevel, yesterdayLabel } from "./condition";
import { resolveSuggestion } from "./suggestion";
import {
  AREAS, CHAT_BEATS, CONDITION_HISTORY, WEEK_FLOW, YESTERDAY, COLLECT, DONE_WEEK, doneTotals, LEAD_IN, MIND_DAYS,
  NUDGE, NUDGE_LOW, OB, PARQ, PRINCIPLES, PROGRAMS, ROLES,
  TEMP, WEATHER, WEEK_TEMP, type ContentState, type Role, type WeatherKey,
} from "./data";
import { riskLevel, RISK_REPLY } from "./risk";
import { canGoNext, canGoPrev, mockRecordsUntil, monthRange, monthSummary, ymAdd, ymLabel, ymOf, type YearMonth } from "./monthly";

const IMG = "/wellness/images";

// 온보딩 마지막 장(PAR-Q+)의 번호. 단계를 합치거나 늘려도 여기가 따라오도록 OB 에서 파생시킨다.
// 2026-09-13: 「모으는 것」을 「수집동의서 및 권한허용」에 합치며 4 → 3 이 됐고, 그때 흩어진 숫자 4 를 이 하나로 모았다.
const OB_LAST = OB.length - 1;

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
  sheet: null | "library" | "content" | "mind" | "talk" | "picture" | "condition";
  /** 오늘의 마음카드(SAM) 답 — 기분·긴장 1~5. 둘 다 있으면 오늘 기록 */
  sam: SamAnswer;
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
  /** 나의 기록에서 보고 있는 달(기본 = 이번 달). 화살표로 첫 기록 달까지. */
  recMonth: YearMonth;
  riskShown: boolean;
  /** 「마음과 대화」 상대. 바꾸면 대화가 새로 시작된다. */
  character: CharacterId;
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
    sam: EMPTY_SAM, minutes: 3, remaining: 180, running: false, notifOff: false, wiped: false,
    role: null, consent: [false, false], sessions: [], pickedToday: false,
    chat: [{ role: "bot" as const, text: characterOf(DEFAULT_CHARACTER).intro, at: stampAt(0, new Date(0)) }],
    beat: 0, typing: false, input: "", consultOpen: false, live: null, recTab: "body", recMonth: ymOf(new Date()), riskShown: false,
    character: DEFAULT_CHARACTER, avatarMissing: {},
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
    const answered = samAnswered(st.sam);
    // 컨디션 단계 — 재료는 이번 주 기록. ⚠ 걸음·움직인 시간은 아직 목업이라 '평소 수준'(0)으로 둔다(실데이터 연동 시 여기만 바꾼다).
    //   몸풀기 = 주간 목업(DONE_WEEK) + 이 세션에서 실제로 한 것. 오늘의 마음카드 = 목업 5일 + 오늘 3문항을 다 답했으면 +1일.
    //   대화는 횟수만(내용 안 봄). 지난주 단계·최근 4주는 목업 상수(CONDITION_HISTORY).
    // 오늘 마음카드(SAM): 기분·긴장 둘 다 답했을 때만 오늘 기록. 기분 ≤2 면 무거운 날.
    const done = samDone(st.sam);
    const todayPicked = done ? [st.sam.valence as SamScore] : [];
    const heavyToday = done && samWeight(st.sam.valence as SamScore) === "heavy" ? 1 : 0;
    const heavyMock = MIND_DAYS.filter((d) => d.valence <= 2).length;
    const bodyIn = { stretchCount: totals.count + st.sessions.length, moveVsUsual: 0 as const, stepsVsUsual: 0 as const };
    const mindIn = { pictureDays: MIND_DAYS.length + (todayPicked.length ? 1 : 0), heavyDays: heavyMock + heavyToday, chatCount: st.chat.filter((m) => m.role === "me").length, riskFlagged: st.riskShown };
    const body = bodyLevel(bodyIn), mind = mindLevel(mindIn);
    const overall = overallLevel(body, mind, mindIn.riskFlagged);
    // 지난주·최근 4주 종합은 같은 규칙으로 목업 이력에서 계산한다(따로 적어 두면 두 곳이 갈린다).
    const overallHistory = CONDITION_HISTORY.body.map((b, i) => overallLevel(b, CONDITION_HISTORY.mind[i]));
    // 어제(하루 단위) — 홈 카드·상세 첫 칸. 재료는 목업 YESTERDAY + 이 세션의 위험어 여부.
    const dayBodyIn = YESTERDAY.body;
    const dayMindIn = { pick: YESTERDAY.mind.pick, chatCount: YESTERDAY.mind.chatCount, riskFlagged: st.riskShown };
    const dayBody = dayBodyLevel(dayBodyIn), dayMind = dayMindLevel(dayMindIn);
    const dayOverall = overallLevel(dayBody, dayMind, dayMindIn.riskFlagged);
    const weekFlow = [...WEEK_FLOW, dayOverall];
    const cond = {
      dayBodyIn, dayMindIn, dayBody, dayMind, dayOverall, weekFlow, yesterday: yesterdayLabel(st.now),
      bodyIn, mindIn, body, mind, overall, overallHistory,
      bodyChange: change(CONDITION_HISTORY.body[CONDITION_HISTORY.body.length - 1], body),
      mindChange: change(CONDITION_HISTORY.mind[CONDITION_HISTORY.mind.length - 1], mind),
      overallChange: change(overallHistory[overallHistory.length - 1], overall),
    };
    return { roleKey, role, authed, onboarding, parqYes, parqAll, slot, wx, feelsTxt, item, itemTitle, isWeekend, libList, totals, answered, cond };
  }

  const nowTime = `${s.now.getHours()}:${String(s.now.getMinutes()).padStart(2, "0")}`;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const todayLabel = `${s.now.getMonth() + 1}월 ${s.now.getDate()}일 ${days[s.now.getDay()]}요일`;
  const chatDateLabel = `${s.now.getFullYear()}년 ${s.now.getMonth() + 1}월 ${s.now.getDate()}일 ${days[s.now.getDay()]}요일`;

  const step = OB[Math.max(0, s.ob)] || OB[0];
  // 온보딩 단계: 0 약속 · 1 수집동의서 및 권한허용(모으는 것 포함) · 2 직군 · 3 PAR-Q+
  const canNext = s.ob === 1 ? s.consent[0] : s.ob === OB_LAST ? v.parqAll : true;

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
          {s.sheet === "condition" && renderCondition()}
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
            <input value={s.loginId} onChange={(e) => patch({ loginId: e.target.value })} placeholder="학교 계정 (nnn@sen.go.kr)" style={sx("width:100%; box-sizing:border-box; border:1.5px solid #c9d6dc; background:#fff; border-radius:14px; padding:16px; font-size:14.5px; color:#2d5c6e; outline:none; font-family:inherit")} />
            <input value={s.loginPw} onChange={(e) => patch({ loginPw: e.target.value })} type="password" placeholder="비밀번호" style={sx("width:100%; box-sizing:border-box; border:1.5px solid #c9d6dc; background:#fff; border-radius:14px; padding:16px; font-size:14.5px; color:#2d5c6e; outline:none; font-family:inherit")} />
            <div onClick={doLogin} style={{ ...sx("cursor:pointer; text-align:center; padding:17px; border-radius:16px; color:#fff; font-size:15px; font-weight:700; box-shadow:0 8px 20px rgba(91,181,207,0.26); transition:background 0.2s"), background: loginBtnBg }}>로그인</div>
          </div>

          {/* 학교 계정·비밀번호 블록과 둘러보기 사이 구분선(글자 없이 선만 — 사용자 지시) */}
          <div style={sx("height:1px; background:#c9d6dc")} />

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
    const obBtn = s.parqOnly && s.ob === OB_LAST ? "저장하고 돌아가기" : step.btn;
    const obBtnBg = canNext ? "#7a6bc4" : "#cdc3ea";
    const obBackLabel = s.parqOnly ? "취소" : s.ob === 0 ? "나중에 볼게요" : "이전";
    const obNext = () => {
      if (!canNext) return;
      patchFn((st) => (st.parqOnly && st.ob === OB_LAST) ? { ob: -1, parqOnly: false, tab: "settings" } : { ob: st.ob >= OB_LAST ? -1 : st.ob + 1 });
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
                <div key={i} style={sx("display:flex; gap:11px; align-items:flex-start; padding:15px 16px; border-radius:15px; background:#fff; border:1px solid #c9d6dc")}>
                  <div style={sx("width:6px; height:6px; border-radius:50%; background:#7a6bc4; margin-top:7px; flex:none")} />
                  <div style={sx("flex:1; font-size:14px; color:#2d5c6e; line-height:1.55; font-weight:500; text-wrap:pretty")}>{text}</div>
                </div>
              ))}
            </div>
          )}

          {s.ob === 1 && (
            <div style={sx("display:flex; flex-direction:column; gap:11px")}>
              {/* 2026-09-13: 옛 「모으는 것은 이만큼이 전부예요」 장. 무엇을 모으는지 보여준 뒤 그 자리에서 동의·권한까지 받는다. */}
              <div style={sx("font-size:13px; font-weight:700; color:#6b8c9a; padding:0 2px")}>모으는 것은 이만큼이 전부예요</div>
              {COLLECT.map((ci, i) => (
                <div key={i} style={sx("display:flex; flex-direction:column; gap:4px; padding:16px; border-radius:15px; background:#fff; border:1px solid #c9d6dc")}>
                  <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>{ci.name}</div>
                  <div style={sx("font-size:13px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>{ci.why}</div>
                </div>
              ))}
              <div style={sx("font-size:13px; font-weight:700; color:#6b8c9a; padding:8px 2px 0")}>동의</div>
              {[
                { title: "수집·이용 동의 (필수)", desc: "걸음·움직인 시간·앱에서 함께한 몸풀기 기록은 암호화되어 본인 계정에만 저장되며, 본인 외에는 누구도 열어볼 수 없습니다." },
              ].map((c, i) => {
                const on = s.consent[i];
                return (
                  <div key={i} onClick={() => patchFn((st) => { const c2 = st.consent.slice() as [boolean, boolean]; c2[i] = !c2[i]; return { consent: c2 }; })} style={{ ...sx("cursor:pointer; display:flex; gap:13px; align-items:flex-start; padding:17px 16px; border-radius:16px; background:#fff; border:1.5px solid; transition:border-color 0.2s"), borderColor: on ? "#c4b8ec" : "#c9d6dc" }}>
                    <div style={{ ...sx("width:22px; height:22px; border-radius:7px; flex:none; margin-top:1px; color:#fff; font-size:13px; display:flex; align-items:center; justify-content:center; border:1.5px solid"), background: on ? "#7a6bc4" : "#fff", borderColor: on ? "#7a6bc4" : "#c9d6dc" }}>{on ? "✓" : ""}</div>
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
                  <div key={i} onClick={() => patchFn((sti) => ({ perms: { ...sti.perms, [i]: !(sti.perms[i] !== false) } }))} style={{ ...sx("cursor:pointer; display:flex; align-items:center; gap:13px; padding:15px 16px; border-radius:15px; background:#fff; border:1.5px solid; transition:border-color 0.2s"), borderColor: on ? "#c4b8ec" : "#c9d6dc" }}>
                    <div style={{ ...sx("width:22px; height:22px; border-radius:7px; flex:none; color:#fff; font-size:13px; display:flex; align-items:center; justify-content:center; border:1.5px solid"), background: on ? "#7a6bc4" : "#fff", borderColor: on ? "#7a6bc4" : "#c9d6dc" }}>{on ? "✓" : ""}</div>
                    <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:3px")}>
                      <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>{pm.name}</div>
                      <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.5; text-wrap:pretty")}>{pm.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {s.ob === 2 && (
            <div style={sx("display:flex; flex-direction:column; gap:10px")}>
              {(Object.keys(ROLES) as Role[]).map((k) => {
                const on = v.roleKey === k && !!s.role;
                return (
                  <div key={k} onClick={() => patch({ role: k })} style={{ ...sx("cursor:pointer; display:flex; flex-direction:column; gap:5px; padding:17px 18px; border-radius:16px; border:1.5px solid; transition:all 0.2s"), background: on ? "#f2edfa" : "#fff", borderColor: on ? "#c4b8ec" : "#c9d6dc" }}>
                    <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>{ROLES[k].label}</div>
                    <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>{ROLES[k].hint}</div>
                  </div>
                );
              })}
            </div>
          )}

          {s.ob === OB_LAST && (
            <div style={sx("display:flex; flex-direction:column; gap:9px")}>
              {PARQ.map((text, i) => {
                const val = s.parq[i];
                return (
                  <div key={i} style={{ ...sx("display:flex; align-items:center; gap:12px; padding:14px 15px; border-radius:15px; background:#fff; border:1.5px solid"), borderColor: val === undefined ? "#c9d6dc" : "#c9d6dc" }}>
                    <div style={sx("flex:1; min-width:0; font-size:13.5px; color:#2d5c6e; line-height:1.55; font-weight:500; text-wrap:pretty")}>{text}</div>
                    <div style={sx("flex:none; display:flex; gap:6px")}>
                      <div onClick={() => patchFn((sti) => ({ parq: { ...sti.parq, [i]: false } }))} style={{ ...sx("cursor:pointer; white-space:nowrap; min-height:44px; min-width:56px; padding:0 13px; border-radius:12px; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; border:1.5px solid; transition:all 0.18s"), background: val === false ? "#f2edfa" : "#fff", color: val === false ? "#7a6bc4" : "#8ba8b3", borderColor: val === false ? "#7a6bc4" : "#c9d6dc" }}>아니오</div>
                      <div onClick={() => patchFn((sti) => ({ parq: { ...sti.parq, [i]: true } }))} style={{ ...sx("cursor:pointer; white-space:nowrap; min-height:44px; min-width:52px; padding:0 13px; border-radius:12px; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; border:1.5px solid; transition:all 0.18s"), background: val === true ? "#f2edfa" : "#fff", color: val === true ? "#7a6bc4" : "#8ba8b3", borderColor: val === true ? "#7a6bc4" : "#c9d6dc" }}>예</div>
                    </div>
                  </div>
                );
              })}
              {v.parqAll && (
                <div style={sx("display:flex; flex-direction:column; gap:8px; padding:16px; border-radius:16px; background:#f2edfa; border:1px solid #c9d6dc; animation:wRise 0.4s ease-out both")}>
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
    const moveBars = [11, 19, 8, 24, 14, 21, 26].map((h, i) => ({ h, bg: i === 6 ? "#5bc4b8" : "#daf0ec" }));

    return (
      <div style={sx("flex:1; overflow-y:auto; display:grid; align-content:start; gap:16px; padding:10px 20px 96px")}>
        {/* 헤더 */}
        <div style={sx("display:flex; align-items:center; gap:12px; padding-top:6px")}>
          <div style={sx(`width:46px; height:46px; border-radius:16px; flex:none; overflow:hidden; background:url(${IMG}/app-icon.png) center/cover; box-shadow:0 4px 12px rgba(23,185,138,0.24)`)} />
          <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:3px")}>
            <div style={sx("font-size:12.5px; color:#8ba8b3; font-weight:500")}>{todayLabel} · {v.role.label}</div>
            <div style={sx("font-size:20px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; text-wrap:pretty")}>{greeting}</div>
          </div>
          <div onClick={() => patch({ tab: "settings" })} style={sx("cursor:pointer; width:42px; height:42px; flex:none; border-radius:50%; background:#fff; border:1px solid #c9d6dc; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(45,92,110,0.06)")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#7a6bc4" strokeWidth="1.9" strokeLinecap="round" style={{ width: 19, height: 19 }}>
              <path d="M12 4.2l1.5 1.9 2.4-.5.5 2.4 1.9 1.5-1.1 2.2 1.1 2.2-1.9 1.5-.5 2.4-2.4-.5L12 19.8l-1.5-1.9-2.4.5-.5-2.4-1.9-1.5L6.8 12 5.7 9.8l1.9-1.5.5-2.4 2.4.5z" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
          </div>
        </div>

        {/* 날씨 — 맨 위 한 줄(사용자 지시). 제안 카드 안에 있을 땐 시작 버튼을 아래로 밀었다. */}
        <div style={sx("display:flex; align-items:center; gap:9px; margin-top:-4px")}>
          <div style={sx("flex:none; display:flex; align-items:center; gap:8px; min-height:32px; padding:0 13px; border-radius:999px; background:#fff; border:1px solid #c9d6dc")}>
            <div style={{ ...sx("width:9px; height:9px; border-radius:50%; flex:none"), background: wx.dot }} />
            <div style={sx("font-size:13px; font-weight:700; color:#3a4a72; white-space:nowrap")}>{wx.label}</div>
          </div>
          <div style={sx("flex:1; min-width:0; font-size:12.5px; font-weight:500; color:#4d5578; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{wx.note}</div>
        </div>

        {/* 종합 컨디션 카드 — 신체·마음을 합친 단계 하나가 주인공, 두 축은 칩으로. 숫자 없음(사용자 확정). 누르면 상세 시트. */}
        {(() => {
          const lv = v.cond.dayOverall;
          const c = lv ? LEVEL_COLOR[lv] : { bg: "#eef3f5", fg: "#6b8c9a" };
          const flow = flowText(v.cond.weekFlow.slice(-3));
          const chip = (name: string, l: typeof lv) => {
            const cc = l ? LEVEL_COLOR[l] : { bg: "#eef3f5", fg: "#6b8c9a" };
            return <div style={{ ...sx("flex:1; display:flex; align-items:center; justify-content:space-between; gap:6px; padding:9px 12px; border-radius:12px; font-size:12.5px; font-weight:700; border:2px solid rgba(45,92,110,0.6)"), background: "rgba(255,255,255,0.85)", color: cc.fg }}><span style={sx("color:#2d5c6e")}>{name}</span><span>{l ? LEVEL_LABEL[l] : "기록 부족"}</span></div>;
          };
          return (
            <div onClick={() => patch({ sheet: "condition" })} style={{ ...sx("cursor:pointer; display:flex; flex-direction:column; gap:12px; padding:17px 17px 15px; border-radius:20px; border:2px solid rgba(45,92,110,0.45); box-shadow:0 6px 18px rgba(45,92,110,0.10)"), background: c.bg }}>
              <div style={sx("display:flex; align-items:flex-start; justify-content:space-between; gap:10px")}>
                <div style={sx("display:flex; flex-direction:column; gap:4px")}>
                  <div style={{ ...sx("font-size:12.5px; font-weight:700; opacity:0.8"), color: c.fg }}>{v.cond.yesterday} 종합 컨디션</div>
                  <div style={{ ...sx("font-size:24px; font-weight:800; letter-spacing:-0.02em"), color: c.fg }}>{lv ? LEVEL_LABEL[lv] : "기록 부족"}</div>
                  <div style={{ ...sx("font-size:12px; line-height:1.4; opacity:0.85; text-wrap:pretty"), color: c.fg }}>최근 흐름 {flow}</div>
                </div>
                <div style={{ ...sx("flex:none; font-size:12px; font-weight:700; padding:7px 11px; border-radius:999px; border:1.5px solid rgba(45,92,110,0.45); background:rgba(255,255,255,0.7); white-space:nowrap"), color: c.fg }}>상세보기 ›</div>
              </div>
              <div style={sx("display:flex; gap:8px")}>
                {chip("신체건강", v.cond.dayBody)}
                {chip("마음건강", v.cond.dayMind)}
              </div>
            </div>
          );
        })()}

        {/* 오늘의 기록 */}
        <div style={sx("display:grid; gap:11px")}>
          <div style={sx("display:flex; align-items:center; gap:9px; padding:0 2px")}>
            <div style={sx("flex:1; font-size:15px; font-weight:700; color:#2d5c6e")}>오늘의 기록</div>
          </div>

          {!EMPTY_STATE ? (
            // 한 장 세 칸 — 홈은 '오늘'만 보여주고 누적은 기록 탭이 맡는다(2026-09-12 사용자 확정). 시각 요소는 작게 살린다.
            <div style={sx("display:grid; grid-template-columns:1.25fr 1fr 1fr; gap:6px; padding:14px 12px 13px; border-radius:20px; background:#fff; border:1.5px solid #c7c0e8; box-shadow:0 10px 22px rgba(80,88,140,0.16), 0 2px 5px rgba(80,88,140,0.08)")}>
              {/* 걸음 — 작은 반원 게이지(평소 범위 대비, 등급 아님) */}
              <div style={sx("display:flex; flex-direction:column; align-items:center; gap:2px; padding:0 4px; border-right:1px solid #ece8f5")}>
                <div style={sx("font-size:11.5px; font-weight:600; color:#8ba8b3")}>걸음</div>
                <svg viewBox="0 0 160 96" style={{ width: 84, height: "auto", overflow: "visible" }}>
                  <path d="M12 80 A68 68 0 0 1 148 80" fill="none" stroke="#eef2f4" strokeWidth="14" strokeLinecap="round" />
                  {stepZones.map((z, k) => (
                    <path key={k} d="M12 80 A68 68 0 0 1 148 80" fill="none" stroke={z.color} strokeWidth="14" strokeLinecap="round" strokeDasharray={z.dash} strokeDashoffset={z.off} />
                  ))}
                  <circle cx={knobX} cy={knobY} r="10" fill="#4a3f80" stroke="#fff" strokeWidth="4" />
                </svg>
                <div style={sx("font-size:19px; font-weight:700; color:#2d5c6e; letter-spacing:-0.03em; line-height:1; font-variant-numeric:tabular-nums; margin-top:-6px")}>4,120</div>
                <div style={sx("font-size:10.5px; color:#8ba8b3; white-space:nowrap")}>{stepZoneLabel}</div>
              </div>
              {/* 스트레칭 — 설명 없이 읽히게 「3번 / 오늘 총 7분」만(사용자: 점·배지·부위 개수 전부 뜻이 안 읽힘) */}
              <div style={sx("display:flex; flex-direction:column; align-items:center; justify-content:space-between; gap:4px; padding:0 4px; border-right:1px solid #ece8f5")}>
                <div style={sx("font-size:11.5px; font-weight:600; color:#8ba8b3")}>스트레칭</div>
                <div style={sx("display:flex; flex-direction:column; gap:2px; align-items:center; padding-top:4px")}>
                  <div style={sx("font-size:11px; color:#4d7c8c; white-space:nowrap")}>목풀기 2회</div>
                  <div style={sx("font-size:11px; color:#4d7c8c; white-space:nowrap")}>어깨풀기 1회</div>
                </div>
                <div style={sx("font-size:17px; font-weight:700; color:#3a4a72; letter-spacing:-0.03em; line-height:1; white-space:nowrap")}>총 3회 · 7분</div>
              </div>
              {/* 움직인 시간 */}
              <div style={sx("display:flex; flex-direction:column; align-items:center; justify-content:space-between; gap:4px; padding:0 4px")}>
                <div style={sx("font-size:11.5px; font-weight:600; color:#8ba8b3")}>움직인 시간</div>
                <div style={sx("display:flex; gap:3px; align-items:flex-end; height:22px; padding-top:4px")}>
                  {moveBars.map((b, k) => (<div key={k} style={{ ...sx("width:7px; border-radius:3px"), height: Math.round(b.h * 0.8), background: b.bg }} />))}
                </div>
                <div style={sx("font-size:19px; font-weight:700; color:#3a4a72; letter-spacing:-0.03em; line-height:1; white-space:nowrap")}>42분</div>
                <div style={sx("font-size:10.5px; color:#8ba8b3; white-space:nowrap")}>걷기 34 · 계단 8</div>
              </div>
            </div>
          ) : (
            <div style={sx("display:flex; flex-direction:column; gap:13px; padding:18px; border-radius:20px; background:#fff; border:1px solid #c9d6dc")}>
              <div style={sx("font-size:14px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>오늘은 아직 조용해요. 시작은 1분이면 충분합니다.</div>
              <div onClick={() => patch({ sheet: "content", program: null })} style={sx("cursor:pointer; text-align:center; padding:13px; border-radius:13px; background:#f2edfa; border:1px solid #cfc5ea; font-size:14px; font-weight:700; color:#7a6bc4")}>1분 기지개부터</div>
            </div>
          )}

          {s.sessions.length > 0 && (
            <div style={sx("display:flex; flex-direction:column; gap:9px; padding:16px 18px; border-radius:20px; background:#fff; border:1.5px solid #c7c0e8; box-shadow:0 10px 22px rgba(80,88,140,0.2), 0 2px 5px rgba(80,88,140,0.14)")}>
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
        {/* AI 오늘의 제안 */}
        <div style={sx("display:flex; flex-direction:column; gap:14px; padding:18px; border-radius:22px; background:linear-gradient(140deg,#eaf6fb 0%,#f2edfa 62%,#fdf0f4 100%); border:1px solid #c9d6dc; box-shadow:0 4px 16px rgba(122,138,196,0.12)")}>
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
              <div style={sx("font-size:12px; color:#5f5397; line-height:1.5")}>대화 · 오늘의 마음카드</div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  function renderRecords() {
    // 월별 기록장 — 원장(하루 한 줄)에서 고른 달만 모아 요약. 규칙은 monthly.ts(condition.ts 주간 규칙 재사용).
    const records = mockRecordsUntil(s.now);
    const range = monthRange(records, s.now);
    const ym = s.recMonth;
    const M = monthSummary(records, ym);
    const prevOk = canGoPrev(ym, range), nextOk = canGoNext(ym, range);
    const isThisMonth = !nextOk;
    const recIsBody = s.recTab === "body";
    const card = "display:flex; flex-direction:column; gap:12px; padding:17px 16px; border-radius:20px; background:#fff; border:1px solid #c9d6dc";
    const maxWeek = Math.max(1, ...M.weeks.map((w) => w.stretch));
    const top = M.byProgram[0];
    const bodySolution = M.days === 0 ? "" : top
      ? `${ym.m}월엔 「${top.title}」을 가장 자주 고르셨어요(${top.n}회). 짧게 자주가 잘 맞는 방식일 수 있어요. 아직 안 열어 본 동작이 있으면 한 번쯤 열어보셔도 좋아요.`
      : `${ym.m}월엔 아직 몸풀기 기록이 없어요. 1분 기지개 하나면 충분합니다.`;
    const bodyActions = [
      { label: v.wx.prefer === "indoor" ? "낮에는 실내에서 1분 한 번 더" : "오후 3시에 복도 한 바퀴 한 번 더", go: () => patch({ tab: "home" }) },
      { label: "오늘 " + v.itemTitle + " 해보기", go: () => patch({ sheet: "content" }) },
    ];
    const mindActions = [
      { label: "마음과 대화에 요즘 이야기 꺼내보기", go: () => patch({ sheet: "talk" }) },
      { label: "오늘의 마음카드로 지금 마음 확인하기", go: () => patch({ sheet: "picture", sam: EMPTY_SAM }) },
    ];
    const heavyRatio = M.pictureDays ? M.heavyDays / M.pictureDays : 0;
    const mindSolution = M.pictureDays === 0 ? `${ym.m}월엔 마음카드 기록이 아직 없어요. 말로 꺼내기 어려운 날, 그림 하나만 골라도 기록이 남아요.`
      : heavyRatio >= 0.4 ? "무거운 날이 꽤 있었어요. 이런 달에는 무언가를 더 하기보다 하루의 끝을 조금 일찍 닫아두는 편이 도움이 되더라고요. 퇴근 후 처음 30분은 아무 일정도 넣지 않는 쪽으로 잡아보시면 어떨까요."
      : heavyRatio >= 0.2 ? "가벼운 날과 무거운 날이 섞여 있었어요. 무거웠던 날이 어떤 날이었는지 한 번만 돌아봐도 다음 달이 조금 수월해져요."
      : "대체로 가벼운 쪽에 있던 달이에요. 지금 하던 대로만 이어가 보세요.";
    const arrow = (ok: boolean, go: () => void, ch: string) => (
      <div onClick={ok ? go : undefined} style={{ ...sx("width:36px; height:36px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; border:1.5px solid #c9d6dc; background:#fff"), color: ok ? "#2d5c6e" : "#c9d6dc", cursor: ok ? "pointer" : "default" }}>{ch}</div>
    );
    const levelChip = (name: string, l: typeof M.overall) => { const cc = l ? LEVEL_COLOR[l] : { bg: "#eef3f5", fg: "#6b8c9a" }; return <div style={{ ...sx("flex:1; display:flex; justify-content:space-between; padding:8px 11px; border-radius:11px; font-size:12px; font-weight:700; border:2px solid rgba(45,92,110,0.6)"), background: "rgba(255,255,255,0.85)", color: cc.fg }}><span style={sx("color:#2d5c6e")}>{name}</span><span>{l ? LEVEL_LABEL[l] : "기록 부족"}</span></div>; };
    const actionList = (items: { label: string; go: () => void }[], dot: string, border: string, ink: string) => (
      <div style={sx("display:flex; flex-direction:column; gap:9px")}>
        {items.map((it, i) => (
          <div key={i} onClick={it.go} style={sx(`cursor:pointer; display:flex; align-items:center; gap:11px; min-height:52px; padding:0 15px; border-radius:15px; background:#fff; border:1px solid ${border}`)}>
            <div style={sx(`flex:none; width:7px; height:7px; border-radius:50%; background:${dot}`)} />
            <div style={sx(`flex:1; min-width:0; font-size:13.5px; font-weight:600; color:${ink}; text-wrap:pretty`)}>{it.label}</div>
            <div style={sx("flex:none; font-size:14px; color:#c9b6b6")}>›</div>
          </div>
        ))}
      </div>
    );

    return (
      <div style={sx("flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:13px; padding:14px 20px 96px")}>
        <div style={sx("font-size:22px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; padding-top:6px")}>나의 기록</div>

        {/* 월 넘기기 — 첫 기록 달 ~ 이번 달 */}
        <div style={sx("display:flex; align-items:center; justify-content:space-between; gap:10px")}>
          {arrow(prevOk, () => patch({ recMonth: ymAdd(ym, -1) }), "‹")}
          <div style={sx("display:flex; flex-direction:column; align-items:center; gap:2px")}>
            <div style={sx("font-size:17px; font-weight:800; color:#2d5c6e; letter-spacing:-0.02em")}>{ymLabel(ym)}</div>
            <div style={sx("font-size:11px; color:#8ba8b3")}>{M.days === 0 ? "기록 없음" : `${M.days}일 기록` + (isThisMonth ? " · 어제까지" : "")}</div>
          </div>
          {arrow(nextOk, () => patch({ recMonth: ymAdd(ym, 1) }), "›")}
        </div>

        {/* 그 달 종합 컨디션 + 주차별 흐름 */}
        {(() => {
          const lv = M.overall;
          const c = lv ? LEVEL_COLOR[lv] : { bg: "#eef3f5", fg: "#6b8c9a" };
          return (
            <div style={{ ...sx("display:flex; flex-direction:column; gap:10px; padding:15px 16px 13px; border-radius:18px; border:2px solid rgba(45,92,110,0.45)"), background: c.bg }}>
              <div style={{ ...sx("font-size:12.5px; font-weight:700; opacity:0.8"), color: c.fg }}>{ym.m}월 종합 컨디션</div>
              <div style={{ ...sx("font-size:22px; font-weight:800; letter-spacing:-0.02em"), color: c.fg }}>{lv ? LEVEL_LABEL[lv] : "기록 부족"}</div>
              <div style={sx("display:flex; gap:8px")}>{levelChip("신체건강", M.body)}{levelChip("마음건강", M.mind)}</div>
              {M.weeks.length > 0 && (
                <div style={sx("display:flex; flex-direction:column; gap:6px; padding-top:4px")}>
                  <div style={{ ...sx("font-size:11.5px; font-weight:700; opacity:0.8"), color: c.fg }}>주차별 흐름</div>
                  {M.weeks.map((w) => {
                    const hc = w.overall ? LEVEL_COLOR[w.overall] : { bg: "#eef3f5", bar: "#d5dde2", fg: "#8ba8b3" };
                    return (
                      <div key={w.week} style={sx("display:flex; align-items:center; gap:9px")}>
                        <div style={{ ...sx("flex:none; width:34px; font-size:11.5px; font-weight:700; text-align:right"), color: c.fg }}>{w.week}주차</div>
                        <div style={sx("flex:1; height:9px; border-radius:999px; background:rgba(255,255,255,0.75); overflow:hidden")}>
                          <div style={{ ...sx("height:100%; border-radius:999px"), width: w.overall ? `${w.overall * 20}%` : "0%", background: hc.bar }} />
                        </div>
                        <div style={{ ...sx("flex:none; width:58px; font-size:11.5px; font-weight:700; white-space:nowrap"), color: hc.fg }}>{w.overall ? LEVEL_LABEL[w.overall] : "기록 없음"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
        <div style={sx("font-size:13px; color:#8ba8b3; line-height:1.5; margin-bottom:2px")}>선생님만 볼 수 있어요. 학교와 교육청에는 어떤 형태로도 전달되지 않습니다.</div>
        <div style={sx("display:flex; gap:7px; padding-bottom:2px")}>
          <div onClick={() => patch({ recTab: "body" })} style={{ ...sx("cursor:pointer; flex:1; text-align:center; min-height:42px; display:flex; align-items:center; justify-content:center; border-radius:13px; font-size:13.5px; font-weight:700; border:1.5px solid; transition:all 0.18s"), background: recIsBody ? "#f2edfa" : "#fff", color: recIsBody ? "#7a6bc4" : "#8ba8b3", borderColor: recIsBody ? "#7a6bc4" : "#c9d6dc" }}>신체 기록</div>
          <div onClick={() => patch({ recTab: "mind" })} style={{ ...sx("cursor:pointer; flex:1; text-align:center; min-height:42px; display:flex; align-items:center; justify-content:center; border-radius:13px; font-size:13.5px; font-weight:700; border:1.5px solid; transition:all 0.18s"), background: !recIsBody ? "#f2edfa" : "#fff", color: !recIsBody ? "#7a6bc4" : "#8ba8b3", borderColor: !recIsBody ? "#7a6bc4" : "#c9d6dc" }}>마음 기록</div>
        </div>

        {M.days === 0 ? (
          <div style={sx(card + "; align-items:center; text-align:center; padding:28px 16px; gap:6px")}>
            <div style={sx("font-size:14px; font-weight:700; color:#3a4a72")}>{ym.m}월엔 기록이 없어요</div>
            <div style={sx("font-size:12.5px; color:#8ba8b3; line-height:1.5")}>몸풀기·마음카드·대화를 하면 그날부터 여기에 쌓여요.</div>
          </div>
        ) : recIsBody ? (
          <div style={sx("display:flex; flex-direction:column; gap:12px")}>
            <div style={sx("display:flex; gap:11px")}>
              <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; padding:16px; border-radius:20px; background:linear-gradient(150deg,#fff1e4 0%,#ffe6ec 100%); border:1px solid #efc3b6")}>
                <div style={sx("font-size:11.5px; font-weight:700; color:#9a5f4c")}>{ym.m}월 걸음</div>
                <div style={sx("font-size:23px; font-weight:700; color:#8a4a3c; letter-spacing:-0.03em; line-height:1; white-space:nowrap")}>{M.steps.toLocaleString()}</div>
                <div style={sx("font-size:11px; color:#9a5f4c; white-space:nowrap")}>하루 평균 {M.stepsPerDay.toLocaleString()}</div>
              </div>
              <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; padding:16px; border-radius:20px; background:linear-gradient(150deg,#e8f3ff 0%,#ede7fb 100%); border:1px solid #c7c0e8")}>
                <div style={sx("font-size:11.5px; font-weight:700; color:#5f5397")}>{ym.m}월 실행</div>
                <div style={sx("font-size:23px; font-weight:700; color:#4a3f80; letter-spacing:-0.03em; line-height:1; white-space:nowrap")}>{M.stretch}회</div>
                <div style={sx("font-size:11px; color:#5f5397; white-space:nowrap")}>모두 {M.stretch}분 · 한 편 1분</div>
              </div>
            </div>

            <div style={sx(card)}>
              <div style={sx("display:flex; align-items:baseline; gap:9px")}>
                <div style={sx("flex:1; min-width:0; font-size:13.5px; font-weight:700; color:#3a4a72")}>어떤 걸 하셨나요</div>
                <div style={sx("flex:none; white-space:nowrap; font-size:11.5px; font-weight:600; color:#8ba8b3")}>{M.byProgram.length} / {PROGRAMS.length}가지</div>
              </div>
              {M.byProgram.length === 0 && <div style={sx("font-size:12.5px; color:#8ba8b3")}>이 달엔 몸풀기 기록이 없어요.</div>}
              {M.byProgram.map((p) => (
                <div key={p.id} style={sx("display:flex; align-items:center; gap:11px")}>
                  <div style={sx("flex:1; min-width:0; font-size:13.5px; font-weight:600; color:#3a4a72; overflow:hidden; text-overflow:ellipsis; white-space:nowrap")}>{p.title}</div>
                  <div style={sx("flex:none; font-size:13px; font-weight:800; color:#7a6bc4; white-space:nowrap")}>{p.n}회</div>
                </div>
              ))}
            </div>

            <div style={sx(card)}>
              <div style={sx("display:flex; align-items:baseline; gap:9px")}>
                <div style={sx("flex:1; min-width:0; font-size:13.5px; font-weight:700; color:#3a4a72")}>주차별 실행</div>
                <div style={sx("flex:none; white-space:nowrap; font-size:11.5px; font-weight:600; color:#8ba8b3")}>회 (= 분)</div>
              </div>
              <div style={sx("display:flex; align-items:flex-end; gap:9px; height:88px")}>
                {M.weeks.map((w) => (
                  <div key={w.week} style={sx("flex:1; display:flex; flex-direction:column; align-items:center; gap:6px")}>
                    <div style={sx("font-size:11px; font-weight:700; color:#8ba8b3; white-space:nowrap")}>{w.stretch}</div>
                    <div style={{ ...sx("width:100%; border-radius:7px 7px 3px 3px"), height: Math.round((w.stretch / maxWeek) * 56) + 8, background: "#7a6bc4" }} />
                    <div style={sx("font-size:10.5px; color:#8ba8b3; white-space:nowrap")}>{w.week}주차</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 날짜별 기록 — 말 그대로 기록장. 최근 날이 위. */}
            <div style={sx(card)}>
              <div style={sx("font-size:13.5px; font-weight:700; color:#3a4a72")}>날짜별 기록</div>
              {M.days_.map((d) => (
                <div key={d.date} style={sx("display:flex; align-items:flex-start; gap:11px; padding-top:9px; border-top:1px solid #eef3f5")}>
                  <div style={sx("flex:none; width:58px; font-size:12.5px; font-weight:700; color:#6b8c9a; white-space:nowrap; padding-top:1px")}>{d.label}</div>
                  <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:3px")}>
                    <div style={sx("font-size:13px; color:#3a4a72; line-height:1.5; text-wrap:pretty")}>{d.done.length ? d.done.map((x) => `${x.title} ${x.n}회`).join(" · ") : "몸풀기 없음"}</div>
                    <div style={sx("font-size:12px; color:#8ba8b3")}>{d.steps.toLocaleString()}걸음</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={sx("display:flex; flex-direction:column; gap:14px; padding:18px 17px; border-radius:22px; background:linear-gradient(140deg,#fff1e4 0%,#f6edfa 60%,#eaf3fb 100%); border:1px solid #f0e0e0; box-shadow:0 4px 16px rgba(196,150,140,0.14)")}>
              <div style={sx("display:flex; align-items:center; gap:9px")}>
                <div style={sx("flex:none; padding:5px 11px; border-radius:999px; background:rgba(255,255,255,0.75); font-size:10.5px; font-weight:800; color:#8a4a3c; white-space:nowrap; letter-spacing:0.02em")}>AI 이달의 제안</div>
                <div style={sx("flex:1; min-width:0; font-size:12.5px; color:#8a4a3c; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{ym.m}월 기록을 바탕으로</div>
              </div>
              <div style={sx("font-size:14.5px; color:#5a4a58; line-height:1.75; font-weight:500; text-wrap:pretty")}>{bodySolution}</div>
              {isThisMonth && actionList(bodyActions, "#e0876c", "#f0e2e6", "#5a4a58")}
              <div style={sx("font-size:12.5px; color:#6b5560; line-height:1.6; text-wrap:pretty")}>이 제안은 선생님의 기록만 보고 만들어졌어요. 맞지 않으면 그냥 지나치셔도 됩니다.</div>
            </div>
          </div>
        ) : (
          <div style={sx("display:flex; flex-direction:column; gap:12px")}>
            <div style={sx("display:flex; gap:11px")}>
              {[
                { k: "마음카드", v: `${M.pictureDays}일` },
                { k: "무거운 날", v: `${M.heavyDays}일` },
                { k: "마음과 대화", v: `${M.chats}번` },
              ].map((x) => (
                <div key={x.k} style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; padding:14px 12px; border-radius:18px; background:linear-gradient(150deg,#f3eefb 0%,#eaf3fb 100%); border:1px solid #c7c0e8")}>
                  <div style={sx("font-size:11px; font-weight:700; color:#5f5397; white-space:nowrap")}>{x.k}</div>
                  <div style={sx("font-size:19px; font-weight:800; color:#4a3f80; letter-spacing:-0.02em; line-height:1; white-space:nowrap")}>{x.v}</div>
                </div>
              ))}
            </div>

            {/* 날짜별 마음 — 그날 고른 그림 이름표 + 한 문장 */}
            <div style={sx(card)}>
              <div style={sx("font-size:13.5px; font-weight:700; color:#3a4a72")}>날짜별 마음</div>
              {M.days_.map((d) => (
                <div key={d.date} style={sx("display:flex; align-items:flex-start; gap:11px; padding-top:9px; border-top:1px solid #eef3f5")}>
                  <div style={sx("flex:none; width:58px; font-size:12.5px; font-weight:700; color:#6b8c9a; white-space:nowrap; padding-top:1px")}>{d.label}</div>
                  <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:3px")}>
                    {d.sam ? (
                      <>
                        <div style={sx("font-size:13px; color:#3a4a72; line-height:1.5; text-wrap:pretty")}>{d.sam.reading}</div>
                        <div style={sx("font-size:12px; color:#8ba8b3")}>하늘 {d.sam.sky} · 물 {d.sam.water}{d.chats ? ` · 대화 ${d.chats}번` : ""}</div>
                      </>
                    ) : (
                      <div style={sx("font-size:12.5px; color:#8ba8b3")}>마음카드 없음{d.chats ? ` · 대화 ${d.chats}번` : ""}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={sx("display:flex; flex-direction:column; gap:14px; padding:18px 17px; border-radius:22px; background:linear-gradient(140deg,#f0eafc 0%,#eaf1fb 60%,#fdf0f4 100%); border:1px solid #e2e0f2; box-shadow:0 4px 16px rgba(122,107,196,0.14)")}>
              <div style={sx("display:flex; align-items:center; gap:9px")}>
                <div style={sx("flex:none; padding:5px 11px; border-radius:999px; background:rgba(255,255,255,0.8); font-size:10.5px; font-weight:800; color:#4a3f80; white-space:nowrap; letter-spacing:0.02em")}>AI 이달의 제안</div>
                <div style={sx("flex:1; min-width:0; font-size:12.5px; color:#4a3f80; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{ym.m}월 고르신 것을 바탕으로</div>
              </div>
              <div style={sx("font-size:14.5px; color:#454767; line-height:1.75; font-weight:500; text-wrap:pretty")}>{mindSolution}</div>
              {isThisMonth && actionList(mindActions, "#8a7cd0", "#e6e2f2", "#454767")}
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

        <div style={sx("display:flex; flex-direction:column; gap:10px; padding:18px; border-radius:18px; background:#f2edfa; border:1px solid #c9d6dc")}>
          <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>개인정보 5대 원칙</div>
          <div style={sx("display:flex; flex-direction:column; gap:7px")}>
            {PRINCIPLES.map((text, i) => (<div key={i} style={sx("font-size:13px; color:#4d7c8c; line-height:1.55; text-wrap:pretty")}>{text}</div>))}
          </div>
        </div>

        <div style={sx("display:flex; flex-direction:column; border-radius:18px; background:#fff; border:1px solid #c9d6dc; overflow:hidden")}>
          <div style={sx("display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid #eef4f6")}>
            <div style={sx("flex:1; display:flex; flex-direction:column; gap:3px")}>
              <div style={sx("font-size:14px; font-weight:600; color:#2d5c6e")}>알림 받지 않기</div>
              <div style={sx("font-size:12px; color:#8ba8b3")}>앱 안에서는 그대로 이용할 수 있어요</div>
            </div>
            <div onClick={() => patch({ notifOff: !s.notifOff })} style={{ ...sx("cursor:pointer; width:46px; height:27px; border-radius:14px; padding:3px; display:flex; transition:background 0.2s"), justifyContent: s.notifOff ? "flex-end" : "flex-start", background: s.notifOff ? "#7a6bc4" : "#dbe8ec" }}>
              <div style={sx("width:21px; height:21px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(45,92,110,0.45)")} />
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
          <div onClick={() => patch({ ob: OB_LAST, parq: {}, parqOnly: true })} style={sx("cursor:pointer; display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid #eef4f6")}>
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

        <div style={sx("display:flex; flex-direction:column; gap:12px; padding:18px; border-radius:18px; background:#fff; border:1px solid #c9d6dc")}>
          <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>전체 데이터 즉시 파기</div>
          <div style={sx("font-size:13px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>이 기기에 저장된 모든 기록을 지웁니다. 복구할 수 없고, 지운 사실도 남지 않습니다.</div>
          <div onClick={() => patch({ wiped: true })} style={sx("cursor:pointer; text-align:center; padding:14px; border-radius:13px; border:1.5px solid #c9d6dc; background:#f6fafb; font-size:14px; font-weight:700; color:#2d5c6e")}>{s.wiped ? "모두 지웠어요" : "전체 파기하기"}</div>
        </div>

        <div style={sx("display:flex; gap:10px; padding:4px 0 8px")}>
          <div onClick={() => patch({ ob: 0 })} style={sx("flex:1; cursor:pointer; text-align:center; min-height:46px; display:flex; align-items:center; justify-content:center; border-radius:13px; background:#fff; border:1px solid #c9d6dc; font-size:13px; font-weight:600; color:#8ba8b3")}>온보딩 다시 보기</div>
          <div onClick={() => patch({ authed: false, loginId: "", loginPw: "", ob: 0, tab: "home", sheet: null })} style={sx("flex:1; cursor:pointer; text-align:center; min-height:46px; display:flex; align-items:center; justify-content:center; border-radius:13px; background:#fff; border:1px solid #c9d6dc; font-size:13px; font-weight:600; color:#8ba8b3")}>로그아웃</div>
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
    // 오늘의 마음카드 = 은유 그림 5줄(하늘·물·배·밤·교실 날씨) × 5장. 축은 SAM 3 + 수면 + Kunin Faces(sam.ts).
    // 줄은 앞 줄을 고르면 다음 줄이 나타난다. 5줄 다 고르면 디렉팅 하나.
    const answered = v.answered;
    const done = samDone(s.sam);
    const dir = done ? directing(s.sam as Required<{ [K in (typeof AXES)[number]["key"]]: SamScore }>, v.cond.dayBody, v.slot) : null;
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
            <div onClick={() => patch({ sheet: "talk" })} style={sx("cursor:pointer; flex:1; text-align:center; min-height:40px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-size:13.5px; font-weight:700; background:#fff; color:#8ba8b3; border:1.5px solid #c9d6dc")}>마음과 대화</div>
            <div style={sx("flex:1; text-align:center; min-height:40px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-size:13.5px; font-weight:700; background:#f2edfa; color:#7a6bc4; border:1.5px solid #7a6bc4")}>오늘의 마음카드</div>
          </div>
        </div>

        <div style={sx("flex:1; overflow-y:auto; padding:14px 18px 24px; display:flex; flex-direction:column; gap:12px")}>
          {/* 진행 점 5개 */}
          <div style={sx("display:flex; align-items:center; gap:6px; justify-content:center")}>
            {AXES.map((x, k) => (<div key={x.key} style={{ ...sx("height:6px; border-radius:999px; transition:all 0.25s"), width: k === answered && !done ? 22 : 8, background: k < answered || done ? "#7a6bc4" : k === answered ? "#b9aee6" : "#dfe6ea" }} />))}
          </div>
          {answered === 0 && (
            <div style={sx("flex:none; text-align:center; font-size:12.5px; color:#8ba8b3; padding:0 16px; line-height:1.6; text-wrap:pretty")}>정답은 없어요. 지금 느낌에 가장 가까운 그림을 고르면 됩니다. 다섯 번이면 오늘의 디렉팅이 나와요.</div>
          )}

          {/* 고른 줄은 한 줄로 접힘(바꾸기 가능) */}
          {AXES.filter((x, k) => s.sam[x.key] !== null && (k < answered || done)).map((x) => (
            <div key={x.key} onClick={() => patchFn((st) => ({ sam: { ...st.sam, [x.key]: null } }))} style={sx("cursor:pointer; flex:none; display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:14px; background:#fff; border:1px solid #c9d6dc")}>
              <div style={sx("width:34px; height:34px; border-radius:9px; overflow:hidden; flex:none; background:#eef3f5")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${IMG}/sam-${x.key}-${s.sam[x.key]}.png`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={sx("flex:1; min-width:0; font-size:12.5px; color:#6b8c9a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{x.question}</div>
              <div style={sx("flex:none; font-size:12.5px; font-weight:700; color:#2d5c6e")}>{x.labels[(s.sam[x.key] as SamScore) - 1]}</div>
              <div style={sx("flex:none; font-size:11px; font-weight:700; color:#7a6bc4")}>바꾸기</div>
            </div>
          ))}

          {/* 지금 답할 줄 — 그림 5장을 세로로 크게 */}
          {!done && (() => {
            const x = AXES.find((ax) => s.sam[ax.key] === null)!;
            return (
              <div key={x.key} style={sx("flex:none; display:flex; flex-direction:column; gap:10px; padding:16px 14px 14px; border-radius:20px; background:#fff; border:1px solid #c9d6dc; box-shadow:0 4px 14px rgba(45,92,110,0.06); animation:wRise 0.3s ease-out both")}>
                <div style={sx("font-size:16px; font-weight:700; color:#2d5c6e; text-wrap:pretty")}>{x.question}</div>
                <div style={sx("font-size:11.5px; color:#8ba8b3")}>{x.hint} · 지금 느낌에 가장 가까운 그림을 골라 주세요</div>
                <div style={sx("display:flex; flex-direction:column; gap:8px")}>
                  {([1, 2, 3, 4, 5] as SamScore[]).map((n) => (
                    <div key={n} onClick={() => patchFn((st) => ({ sam: { ...st.sam, [x.key]: n } }))} style={sx("cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:7px; padding:8px 8px 9px; border-radius:16px; border:1.5px solid #c9d6dc; background:#fff; transition:all 0.18s")}>
                      {/* 그림을 가운데 크게, 이름표는 아래(사용자 지시) */}
                      <div style={sx("width:100%; max-width:220px; aspect-ratio:2/1; border-radius:12px; overflow:hidden; background:#eef3f5")}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${IMG}/sam-${x.key}-${n}.png`} alt={x.labels[n - 1]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                      <div style={sx("font-size:13.5px; font-weight:700; color:#2d5c6e; text-align:center")}>{x.labels[n - 1]}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {dir && (
            <div style={sx("flex:none; display:flex; flex-direction:column; gap:14px; animation:wRise 0.4s ease-out both")}>
              <div style={sx("display:flex; flex-direction:column; gap:12px; padding:18px 17px; border-radius:20px; background:#f2edfa; border:1px solid #c9d6dc")}>
                <div style={sx("display:flex; align-items:center; gap:6px; flex-wrap:wrap")}>
                  <div style={sx("font-size:13px; font-weight:800; color:#5f5397; margin-right:2px")}>오늘의 디렉팅</div>
                  {AXES.map((x) => (<div key={x.key} style={sx("font-size:11px; font-weight:700; color:#7a6bc4; background:#fff; border:1px solid #cfc5ea; border-radius:999px; padding:3px 8px")}>{x.labels[(s.sam[x.key] as SamScore) - 1]}</div>))}
                </div>
                <div style={sx("font-size:14.5px; font-weight:500; line-height:1.75; color:#2d5c6e; letter-spacing:-0.01em; text-wrap:pretty; white-space:pre-line")}>{dir.text}</div>
                <div style={sx("font-size:11px; color:#8ba8b3; line-height:1.5; text-wrap:pretty")}>그림 척도로 물었어요 — 하늘·물·배는 SAM(Self-Assessment Manikin, Bradley &amp; Lang 1994)의 기분·긴장·통제감, 밤은 수면 문항, 교실 날씨는 Kunin Faces 만족 척도. 읽기는 정서 원형 모델(Russell 1980). 검사 결과가 아니라 지금 상태의 자가보고이고, 선생님만 봅니다.</div>
              </div>
              <div style={sx("display:flex; gap:8px")}>
                <div onClick={() => patch({ sam: EMPTY_SAM })} style={sx("cursor:pointer; flex:1; text-align:center; padding:14px; border-radius:15px; background:#fff; border:1.5px solid #c9d6dc; font-size:14px; font-weight:700; color:#8ba8b3")}>다시 고르기</div>
                <div onClick={() => patch({ sheet: null, pickedToday: true })} style={sx("cursor:pointer; flex:1.4; text-align:center; padding:14px; border-radius:15px; background:#7a6bc4; color:#fff; font-size:14px; font-weight:700")}>오늘 기록으로 남기기</div>
              </div>
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
                <div key={m} onClick={() => { if (timerRef.current) clearInterval(timerRef.current); patch({ minutes: m, remaining: m * 60, running: false }); }} style={{ ...sx("cursor:pointer; flex:1; text-align:center; padding:13px 0; border-radius:14px; font-size:14px; font-weight:700; border:1.5px solid; transition:all 0.2s"), background: on ? "#f2edfa" : "#fff", color: on ? "#7a6bc4" : "#8ba8b3", borderColor: on ? "#c4b8ec" : "#c9d6dc" }}>{m}분</div>
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
              <div style={sx("font-size:11.5px; color:#9a5f4c")}>짧은 몸풀기 {v.libList.length}가지 · 한 편 1분</div>
            </div>
          </div>
          <div style={sx("display:flex; gap:7px; overflow-x:auto; padding:0 16px 12px")}>
            {AREAS.map((a) => {
              const on = (s.area || "all") === a.id;
              return (
                <div key={a.id} onClick={() => patch({ area: a.id })} style={{ ...sx("cursor:pointer; flex:none; white-space:nowrap; min-height:36px; display:flex; align-items:center; padding:0 14px; border-radius:999px; font-size:12.5px; font-weight:700; border:1.5px solid; transition:all 0.18s"), background: on ? "#ffe6ec" : "#fff", color: on ? "#8a4a3c" : "#9a8590", borderColor: on ? "#e0876c" : "#e2cec7" }}>{a.label}</div>
              );
            })}
          </div>
        </div>

        <div style={sx("flex:1; overflow-y:auto; padding:14px 16px 24px; display:flex; flex-direction:column; gap:10px")}>
          {v.libList.map((pg) => {
            const chipBg = pg.min <= 1 ? "#fdf1e6" : pg.min <= 3 ? "#ffe6ec" : "#f2edfa";
            const chipInk = pg.min <= 3 ? "#8a4a3c" : "#4a3f80";
            return (
              <div key={pg.id} onClick={() => { if (timerRef.current) clearInterval(timerRef.current); patch({ sheet: "content", program: pg, minutes: pg.min, remaining: pg.min * 60, running: false }); }} style={sx("cursor:pointer; display:flex; align-items:center; gap:13px; padding:15px 16px; border-radius:18px; background:#fff; border:1px solid #e2cec7; box-shadow:0 2px 8px rgba(196,150,140,0.08)")}>
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

  // 마음 건강 시트에서 상대(캐릭터)를 골라 새 대화로 들어간다 — 같은 상대를 다시 눌러도 새 대화(인사부터). 위험 안내 상태 초기화.
  // 컴포넌트 return 뒤에 있으므로 반드시 function 선언(호이스팅) — const 면 클릭 때 TDZ 로 죽는다.
  function startTalkWith(id: CharacterId) {
    const c = characterOf(id);
    patchFn((st) => ({
      sheet: "talk", character: id, beat: 0, typing: false, riskShown: false,
      chat: [{ role: "bot", text: c.intro, at: stampAt(0, st.now) }],
    }));
  }

  function renderMind() {
    const closeSheet = () => { if (timerRef.current) clearInterval(timerRef.current); patch({ sheet: null, running: false, consultOpen: false }); };
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(175deg,#f6f2fc 0%,#f0f7fb 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; display:flex; align-items:center; gap:11px; padding:48px 16px 14px; background:#fff; border-bottom:1px solid #d9d2ec")}>
          <div onClick={closeSheet} style={sx("cursor:pointer; flex:none; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
          <div style={sx(`width:38px; height:38px; border-radius:13px; flex:none; overflow:hidden; background:url(${IMG}/icon-mind.png) center/cover`)} />
          <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>마음 건강</div>
            <div style={sx("font-size:11px; color:#8ba8b3")}>기록은 선생님만 봅니다</div>
          </div>
        </div>

        {/* 두 섹션이 화면을 반씩 꽉 채운다(사용자 지시) — 위 「마음과 대화」, 구분선, 아래 「오늘의 마음카드」. 세로가 모자란 폰에서만 스크롤. */}
        <div style={sx("flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column")}>
          {/* 마음과 대화 — 상대는 여기서 그림만 보고 고른다(이름·역할 표기 없음, 사용자 지시). 누르면 그 상대와 새 대화. */}
          <div style={sx("flex:1; min-height:230px; display:flex; flex-direction:column; justify-content:center; gap:18px; padding:22px 22px 20px")}>
            <div style={sx("display:flex; flex-direction:column; gap:6px; text-align:center")}>
              <div style={sx("font-size:18px; font-weight:800; color:#2d5c6e")}>마음과 대화</div>
              <div style={sx("font-size:13.5px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>일상대화를 편하게 할 수 있어요.<br />오늘 하루 선생님의 마음을 열어보세요.</div>
            </div>
            <div style={sx("display:grid; grid-template-columns:repeat(4,1fr); gap:12px; padding:0 4px")}>
              {CHARACTERS.map((c) => {
                // 네 개 다 같은 흰 테두리 — 「지난번 상대」 보라 링은 뺀다(사용자 지시). 누르면 바로 새 대화라 고른 상태가 없다.
                return (
                  <div key={c.id} onClick={() => startTalkWith(c.id)} style={{ ...sx("cursor:pointer; aspect-ratio:1; border-radius:50%; overflow:hidden; border:3px solid #fff; position:relative; display:flex; align-items:center; justify-content:center; font-weight:800; color:#2d5c6e; font-size:20px"), background: c.color, boxShadow: "0 2px 8px rgba(45,92,110,0.12)" }}>
                    {c.role.slice(0, 1)}
                    {c.avatar && !s.avatarMissing[c.id] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatar} alt="" onError={() => patchFn((st) => ({ avatarMissing: { ...st.avatarMissing, [c.id]: true } }))} style={sx("position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block")} />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={sx("text-align:center; font-size:12.5px; color:#7a6bc4; font-weight:600; line-height:1.5; text-wrap:pretty")}>마음에 드는 캐릭터를 선택하면 대화창으로 들어갑니다.</div>
          </div>

          {/* 구분선 */}
          <div style={sx("flex:none; height:2px; background:#b3c2cb; margin:0 22px; border-radius:2px")} />

          {/* 오늘의 마음카드 — 섹션 전체가 버튼 */}
          <div onClick={() => patch({ sheet: "picture", sam: EMPTY_SAM })} style={sx("cursor:pointer; flex:1; min-height:230px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:20px 22px 26px; text-align:center")}>
            <div style={sx("font-size:18px; font-weight:800; color:#2d5c6e")}>오늘의 마음카드</div>
            <div style={sx(`width:92px; height:92px; flex:none; border-radius:26px; overflow:hidden; background:url(${IMG}/probe-mood.png) center/cover; box-shadow:0 6px 18px rgba(45,92,110,0.14)`)} />
            <div style={sx("font-size:13.5px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>말로 꺼내기 어려운 날엔<br />끌리는 그림을 하나 골라 보세요</div>
          </div>
        </div>
      </div>
    );
  }

  function renderCondition() {
    const close = () => patch({ sheet: null });
    const box = (l: (typeof v.cond)["overall"]) => (l ? LEVEL_COLOR[l] : { bg: "#eef3f5", fg: "#6b8c9a" });
    const oc = box(v.cond.dayOverall);
    const flow = v.cond.weekFlow;
    const dowLabels = (() => {
      // 이번 주 흐름 라벨: 어제로 끝나는 flow.length 일치 요일
      const d = new Date(s.now.getFullYear(), s.now.getMonth(), s.now.getDate() - 1);
      const names = ["일", "월", "화", "수", "목", "금", "토"];
      return flow.map((_, i) => names[(d.getDay() - (flow.length - 1 - i) + 14) % 7]);
    })();
    const axis = (name: string, l: (typeof v.cond)["overall"], evidence: string[], cta: { label: string; go: () => void } | null) => {
      const c = box(l);
      return (
        <div style={sx("display:flex; flex-direction:column; gap:10px; padding:16px 17px; border-radius:18px; background:#fff; border:2px solid rgba(45,92,110,0.45)")}>
          <div style={sx("display:flex; align-items:center; justify-content:space-between; gap:8px")}>
            <div style={sx("font-size:14.5px; font-weight:800; color:#2d5c6e")}>{name}</div>
            <div style={{ ...sx("font-size:12.5px; font-weight:700; padding:6px 11px; border-radius:999px"), background: c.bg, color: c.fg }}>{l ? LEVEL_LABEL[l] : "기록 부족"}</div>
          </div>
          {evidence.map((e, i) => (<div key={i} style={sx("font-size:13.5px; color:#4d7c8c; line-height:1.55")}>· {e}</div>))}
          {/* 링크 없음 — 몸풀기·대화·마음쉼 안내는 홈·대화 화면에 있다(사용자 지시). 근거 문장만. */}
          {cta && <div onClick={cta.go} style={sx("cursor:pointer; align-self:flex-start; font-size:12.5px; font-weight:700; color:#7a6bc4; background:#f2edfa; border:1px solid #cfc5ea; border-radius:999px; padding:7px 12px")}>{cta.label} ›</div>}
        </div>
      );
    };
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(180deg,#fdfbff 0%,#f4f8fc 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; padding:48px 16px 12px; display:flex; align-items:center; gap:11px; background:#fff; border-bottom:1px solid #d9d2ec")}>
          <div onClick={close} style={sx("cursor:pointer; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
          <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>종합 컨디션</div>
            <div style={sx("font-size:11px; color:#8ba8b3")}>단계는 선생님만 봅니다 · 점수나 순위는 없어요</div>
          </div>
        </div>
        <div style={sx("flex:1; overflow-y:auto; padding:18px 18px 28px; display:flex; flex-direction:column; gap:14px")}>
          {/* 종합 */}
          <div style={{ ...sx("display:flex; flex-direction:column; gap:10px; padding:18px 18px 16px; border-radius:20px; border:2px solid rgba(45,92,110,0.45)"), background: oc.bg }}>
            <div style={{ ...sx("font-size:12.5px; font-weight:700; opacity:0.8"), color: oc.fg }}>{v.cond.yesterday}</div>
            <div style={{ ...sx("font-size:28px; font-weight:800; letter-spacing:-0.02em"), color: oc.fg }}>{v.cond.dayOverall ? LEVEL_LABEL[v.cond.dayOverall] : "아직 기록이 적어요"}</div>
            <div style={{ ...sx("font-size:12.5px; font-weight:700; opacity:0.8; margin-top:6px"), color: oc.fg }}>이번 주 흐름</div>
            {/* 요일마다 가로 바 — 채움 길이 = 단계(5칸), 숫자 없음. 영상 진행 바와 같은 결(사용자 지시). 어제 줄은 진하게. */}
            <div style={sx("display:flex; flex-direction:column; gap:7px")}>
              {flow.map((h, i) => {
                const hc = h ? LEVEL_COLOR[h] : { bg: "#eef3f5", bar: "#d5dde2", fg: "#8ba8b3" };
                const last = i === flow.length - 1;
                return (
                  <div key={i} style={{ ...sx("display:flex; align-items:center; gap:9px"), opacity: last ? 1 : 0.8 }}>
                    <div style={{ ...sx("flex:none; width:28px; font-size:11.5px; font-weight:700; text-align:right"), color: oc.fg }}>{last ? "어제" : dowLabels[i]}</div>
                    <div style={sx("flex:1; height:9px; border-radius:999px; background:rgba(255,255,255,0.75); overflow:hidden")}>
                      <div style={{ ...sx("height:100%; border-radius:999px; transition:width 0.4s"), width: h ? `${h * 20}%` : "0%", background: hc.bar, opacity: last ? 1 : 0.85 }} />
                    </div>
                    <div style={{ ...sx("flex:none; width:58px; font-size:11.5px; text-align:left; white-space:nowrap"), color: hc.fg, fontWeight: last ? 800 : 600 }}>{h ? LEVEL_LABEL[h] : "기록 없음"}</div>
                  </div>
                );
              })}
            </div>
            {/* 범례 — 단계 색 5개(사용자 지시). 바의 채움색과 같은 값(LEVEL_COLOR.fg). */}
            <div style={sx("display:flex; flex-wrap:wrap; gap:6px 12px; padding-top:2px")}>
              {([1, 2, 3, 4, 5] as const).map((l) => (
                <div key={l} style={sx("display:flex; align-items:center; gap:5px")}>
                  <div style={{ ...sx("width:14px; height:7px; border-radius:999px"), background: LEVEL_COLOR[l].bar }} />
                  <div style={{ ...sx("font-size:10.5px; font-weight:600; opacity:0.85"), color: oc.fg }}>{LEVEL_LABEL[l]}</div>
                </div>
              ))}
            </div>
            {/* 각주 — 단계 이름이 왜 나오는지(levelFromSum·dayMindLevel·overallLevel 규칙을 말로). 규칙을 바꾸면 이 글도 같이 바꿀 것. */}
            <div style={{ ...sx("display:flex; flex-direction:column; gap:6px; margin-top:4px; padding:12px 13px; border-radius:14px; background:rgba(255,255,255,0.6); border:1px solid rgba(45,92,110,0.25)"), color: oc.fg }}>
              <div style={sx("font-size:12px; font-weight:800")}>어떻게 정했나요</div>
              <div style={sx("font-size:11.5px; line-height:1.6; text-wrap:pretty")}><b>신체건강</b> — 스트레칭·움직인 시간·걸음 세 가지를 평소와 견줘요. 셋 다 평소만큼이면 <b>보통</b>, 하나가 평소보다 많으면 <b>좋음</b>, 둘 이상 많으면 <b>매우 좋음</b>. 반대로 하나가 적으면 <b>조금 지침</b>, 둘 이상 적으면 <b>휴식 필요</b>예요.</div>
              <div style={sx("font-size:11.5px; line-height:1.6; text-wrap:pretty")}><b>마음건강</b> — 오늘의 마음카드로 봐요. 가벼운 쪽 그림을 골랐으면 <b>좋음</b>, 중간이면 <b>보통</b>, 무거운 쪽이면 <b>조금 지침</b>. 많이 힘든 말이 보인 날은 <b>휴식 필요</b>로 두고 쉬라고 권해요.</div>
              <div style={sx("font-size:11.5px; line-height:1.6; text-wrap:pretty")}><b>종합</b> — 신체건강과 마음건강을 같이 봐요. 둘이 같으면 그대로, 다르면 낮은 쪽에 맞춰요.</div>
            </div>
          </div>

          {axis("신체건강", v.cond.dayBody, dayBodyEvidence(v.cond.dayBodyIn), null)}
          {axis("마음건강", v.cond.dayMind, dayMindEvidence(v.cond.dayMindIn), null)}
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
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(175deg,#f6f2fc 0%,#f0f7fb 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; display:flex; flex-direction:column; background:#fff; border-bottom:1px solid #d9d2ec")}>
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
            <div onClick={() => patch({ sheet: "picture", sam: EMPTY_SAM })} style={sx("cursor:pointer; flex:1; text-align:center; min-height:40px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-size:13.5px; font-weight:700; background:#fff; color:#8ba8b3; border:1.5px solid #c9d6dc")}>오늘의 마음카드</div>
          </div>
        </div>

        <div ref={chatRef} style={sx("flex:1; overflow-y:auto; padding:18px 14px 14px; display:flex; flex-direction:column; gap:12px")}>
          <div style={sx("align-self:center; flex:none; font-size:11px; color:#7b78a6; background:#ece7f8; padding:5px 12px; border-radius:999px; white-space:nowrap")}>{chatDateLabel}</div>
          <div style={sx("flex:none; text-align:center; font-size:12.5px; font-weight:600; color:#5f5397; padding:2px 20px 4px")}>{CHARACTER_DISPLAY_NAME}</div>

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
              <div onClick={() => patch({ consultOpen: true })} style={sx("cursor:pointer; text-align:center; border:1px solid #cfc5ea; background:#f8f5fd; color:#7a6bc4; font-size:13.5px; font-weight:700; padding:13px; border-radius:14px")}>🌿 마음쉼 상담 익명으로 신청하기</div>
            </div>
          )}
          <div style={sx("display:flex; align-items:center; gap:9px; padding:14px 14px 22px")}>
            <input value={s.input} onChange={(e) => patch({ input: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="아무 말이나 괜찮아요, 그냥 적어보세요" style={sx("flex:1; min-width:0; border:none; background:#f4f1fb; border-radius:999px; padding:13px 16px; font-size:14px; color:#2d5c6e; outline:none; font-family:inherit")} />
            <div onClick={send} style={sx("cursor:pointer; width:44px; height:44px; flex:none; border-radius:50%; background:#7a6bc4; color:#fff; font-size:16px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(91,181,207,0.35)")}>↑</div>
          </div>
        </div>

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
