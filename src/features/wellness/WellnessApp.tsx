"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sx } from "./sx";
import { StretchVideo } from "./StretchVideo";
import { CHARACTERS, CHARACTER_DISPLAY_NAME, characterOf, charactersInDisplayOrder, DEFAULT_CHARACTER, type CharacterId } from "./characters";
import { AXES, directing, EMPTY_SAM, samAnswered, samDone, samWeight, type SamAnswer, type SamScore } from "./sam";
import { bodyEvidence, bodyLevel, change, dayBodyLevel, dayMindLevel, LEVEL_COLOR, LEVEL_LABEL, mindEvidence, mindLevel, overallLevel, yesterdayLabel } from "./condition";
import { resolveSuggestion, suggestionChoices } from "./suggestion";
import { buildDaySolution, parqNotice } from "./daySolution";
import {
  AREAS, CHAT_BEATS, CONDITION_HISTORY, YESTERDAY, DONE_WEEK, doneTotals, MIND_DAYS,
  // ⚠ NUDGE·NUDGE_LOW 는 아직 어느 화면에도 안 붙어 있다(CONTENT_STATE 별 넛지 문구·낮은 강도판).
  //    지우지 않고 둔 것은 데이터가 이미 다 쓰여 있어서다 — 넛지를 켤 때 여기서부터 시작하면 된다.
  NUDGE, NUDGE_LOW, OB, OB_AT, PRINCIPLES, PROGRAMS, ROLES,
  TEMP, WEATHER, WEEK_TEMP, type ContentState, type Role, type WeatherKey,
  type StretchItem,
} from "./data";
import { DELAY_QUESTIONS, FOLLOW_UPS, SAFETY_QUESTIONS, delayActive, delayNotice, followUpGroupsFor, safetyComplete, safetyTier, type DelayAnswers } from "./safety-screen";
import { greetingForHour } from "./greeting";
import { pickHomeMessage } from "./homeMessage";
import { CHAT_STORE_KEY, clearAllChats, clearCharacterChat, historyFor, parseChatStore, serializeChatStore, setCharacterChat, type StoredMsg } from "./chat-store";
import { MUSIC_CHANNELS, embedSrc, type MusicChannel, type Playlist } from "./music";
import { PERSONA_CODES, PERSONA_ITEMS, PERSONA_NOTICE, PERSONA_SCALE, PERSONA_SOURCE, PERSONA_TYPES, bookSearchUrl, personaDirecting, personaResult, pickedPersona, type PersonaAnswers, type PersonaDone } from "./persona";

/**
 * 데일리 힐링 추천 음악 — 유튜브 채널 emptysilver(@emptysilver · UCyvNK9b_Rs7djuIQ4a7i5aw)의 긴 플레이리스트 영상만 우리 순서로.
 *   채널 업로드 목록(UU…)을 그대로 걸면 첫 곡이 쇼츠(세로 짧은 영상)라(실측 09-17) `playlist=` 파라미터로 골라 돌린다.
 *   2026-09-17 실측: 긴 영상 12편 중 임베드 허용 11편 · 5aSlkBcvWVQ 는 차단(playableInEmbed:false) · UIBMm0R0CpM 는 53초라 제외 → 10편.
 *   ⚠컴포넌트 안에 두면 렌더보다 늦게 초기화돼 TDZ 오류(실측) — 모듈 최상위에 둔다. 채널에 새 영상이 오르면 여기 id 만 더한다.
 */
import { riskLevel, RISK_REPLY } from "./risk";
import { canGoNext, canGoPrev, mockRecordsUntil, monthRange, monthSummary, weekConditions, ymAdd, ymLabel, ymOf, type YearMonth } from "./monthly";

const IMG = "/wellness/images";

// 온보딩 마지막 장의 번호(= 여기서 「시작하기」를 누르면 앱으로 들어간다).
// 2026-09-13: 장 번호를 손으로 적지 말 것 — 순서가 바뀌면 조용히 엉뚱한 장을 가리킨다.
//   어느 장인지를 말해야 할 때는 OB_AT.parq 처럼 **이름**으로 부른다(data.ts).
const OB_LAST = OB.length - 1;

// 프로토타입 Tweaks 기본값(고정). 실제 데이터 연동 전까지 신체 지표는 목 데이터.
const DEFAULT_ROLE: Role = "teacher";
const CONTENT_STATE: ContentState = "STABLE";
const EMPTY_STATE = false;

interface Session { title: string; time: string }

interface State {
  now: Date;
  /** 홈 30문장 랜덤 시드 — 마운트 때 한 번(homeMessage.ts). null = 아직 마운트 전(서버 렌더)이라 안 그린다. */
  msgSeed: number | null;
  parq: Record<number, boolean>;
  /** 2단(후속) 답. 키 = "묶음.하위". 안 뜬 묶음의 옛 답이 남아도 판정은 뜬 묶음만 본다(safety-screen.ts). */
  parq2: Record<string, boolean>;
  /** 오늘 몸 상태(미루기) — 안전 확인 문진 안에서 답한다(2026-09-17). 해제는 「안전 확인 다시 답하기」. */
  delay: DelayAnswers;
  /** 「지금 바로 시작하기」에서 고른 항목(3개 중 하나). 시트가 열릴 때만 뜻이 있다. */
  pick: StretchItem | null;
  parqOnly: boolean;
  perms: Record<number, boolean>;
  area: string;
  program: (typeof PROGRAMS)[number] | null;
  authed: boolean;
  loginId: string;
  loginPw: string;
  ob: number;
  /**
   * 아래 탭. 2026-09-13 사용자 지시로 바뀌었다 — 설정은 **상단 톱니**로 빠지고, 기록 탭은 없앴다.
   * 홈 · 데일리케어(신체·마음 카드) · my(월간 기록). 홈의 「기록 보기」 버튼도 같은 화면을 시트로 연다(주간 시트는 2026-09-17 삭제).
   */
  tab: "home" | "daily" | "my";
  sheet: null | "library" | "content" | "mind" | "talk" | "picture" | "condition" | "month" | "settings" | "persona" | "personaPick" | "personaResult";
  /**
   * 마음 성향 — 답(40) · 지금 보는 문항 · 결과(기기 메모리). 유형은 말투·「오늘 해볼 것」·마음카드 밑 한 줄에만 쓴다(persona.ts 머리 주석).
   * 2026-09-19: 결과는 테스트(lean 있음) 또는 **직접 선택**(lean null · `personaPick` 시트) — 사용자 "직접 선택하게 하고 테스트는 모르면".
   */
  persona: PersonaAnswers;
  personaIdx: number;
  personaDone: PersonaDone | null;
  personaPage: 1 | 2;
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
  /** 대화 말풍선 — 기기 저장(chat-store)과 같은 모양. `risk: true` 는 위험 판정 질문·고정 안내(서버 history 에서 뺀다). */
  chat: StoredMsg[];
  /** 「계정 없이 둘러보기」 — 저장하지 않는다(공용 기기 보호). 로그인 화면에서 정해진다. */
  guest: boolean;
  /** 추천 음악 — 고른 채널 · 서버(`/api/wellness/music`)가 준 플레이리스트(오기 전엔 각 채널 고정 목록). 2026-09-19. */
  musicKey: MusicChannel["key"];
  music: Record<string, Playlist> | null;
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
    msgSeed: null,
    parq: {}, parq2: {}, delay: {}, pick: null, persona: {}, personaIdx: 0, personaDone: null, personaPage: 1, parqOnly: false, perms: {}, area: "all", program: null,
    musicKey: "emptysilver", music: null,
    authed: false, guest: true, loginId: "", loginPw: "", ob: 0, tab: "home", sheet: null,
    sam: EMPTY_SAM, minutes: 1, remaining: 60, running: false, notifOff: false, wiped: false,
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
    patch({ now: new Date(), msgSeed: Math.random() });
    const clock = setInterval(() => patch({ now: new Date() }), 10000);
    loadWeather();
    loadMusic();
    return () => { clearInterval(clock); if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 대화 기기 저장(2026-09-19) — 그 폰의 localStorage 에만. 캐릭터별 · 둘러보기(guest)는 안 남긴다 · 접근은 전부 이 두 함수로.
  const storage = () => (typeof window === "undefined" ? null : window.localStorage);
  const readChatStore = () => { try { return parseChatStore(storage()?.getItem(CHAT_STORE_KEY) ?? null); } catch { return parseChatStore(null); } };
  const writeChatStore = (st: ReturnType<typeof parseChatStore>) => { try { storage()?.setItem(CHAT_STORE_KEY, serializeChatStore(st)); } catch { /* 저장 공간·사생활 모드 — 저장 못 해도 대화는 계속 */ } };
  useEffect(() => {
    if (!s.authed || s.guest || s.sheet !== "talk") return;
    writeChatStore(setCharacterChat(readChatStore(), s.character, s.chat));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.chat, s.character, s.authed, s.guest, s.sheet]);

  // 채팅 자동 스크롤.
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.chat, s.typing, s.sheet]);

  /** 추천 음악 플레이리스트 — 실패하면 music 은 null 그대로(화면이 각 채널 고정 목록으로 그린다). */
  async function loadMusic() {
    try {
      const r = await fetch("/api/wellness/music");
      if (!r.ok) return;
      const j = (await r.json()) as { channels?: Record<string, Playlist> };
      if (j.channels) patch({ music: j.channels });
    } catch { /* 폴백 */ }
  }

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
    const risky = riskLevel(t) === 2;
    patchFn((st) => ({
      chat: st.chat.concat([{ role: "me", text: t, at: stampAt(st.chat.length, st.now), ...(risky ? { risk: true as const } : {}) }]),
      input: "", typing: true,
    }));

    // 클라 위험 판정 — 즉시 고정 응답(네트워크 없이). 질문·안내 둘 다 risk 표시(기기엔 남고 서버 history 엔 안 실린다).
    if (risky) {
      setTimeout(() => patchFn((st) => ({
        chat: st.chat.concat(RISK_REPLY.map((b, j) => ({ role: "bot" as const, text: b, at: stampAt(st.chat.length + j, st.now), risk: true as const }))),
        typing: false, riskShown: true, beat: Math.max(st.beat, 4),
      })), 700);
      return;
    }

    try {
      const r = await fetch("/api/wellness/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: historyFor(s.chat), message: t, character: s.character }),
      });
      const j = await r.json();
      if (j.risk && Array.isArray(j.reply)) {
        patchFn((st) => ({
          chat: st.chat.map((m, i) => (i === st.chat.length - 1 && m.role === "me" ? { ...m, risk: true as const } : m))
            .concat(j.reply.map((b: string, k: number) => ({ role: "bot" as const, text: b, at: stampAt(st.chat.length + k, st.now), risk: true as const }))),
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
    // 2026-09-16: 안전 확인 단계(0 평소 · 1 낮은 강도 · 2 숨 고르기)는 safetyTier 가 **문항 성격**으로 정한다 — 예 개수를 세지 않는다.
    // 2단 문진(2026-09-16): 1단 「예」한 질환 묶음의 후속까지 답해야 완료. 판정은 safetyTier 한 곳.
    const tier = safetyTier(st.parq, st.parq2);
    const parqAll = safetyComplete(st.parq, st.parq2, st.delay);
    // 미루기(오늘 몸 상태) — 문진에서 답한다. 켜지면 제안이 쉬기로 바뀐다(라이브러리는 그대로).
    const delayOn = delayActive(st.delay);
    const delayMsg = delayNotice(st.delay);
    // 제안 항목·시간대·주말 판정은 resolveSuggestion 한 곳 — MVP 시연 동안은 하나로 고정돼 있다(suggestion.ts 참고).
    const sug = resolveSuggestion({ role: roleKey, tier, hour: st.now.getHours(), dow: st.now.getDay() });
    const choices = suggestionChoices({ role: roleKey, tier, hour: st.now.getHours(), dow: st.now.getDay() });
    const slot = sug.slot;
    const liveKey = st.live && st.live.key;
    const wxBase = WEATHER[(liveKey as WeatherKey) || "hot"] || WEATHER.hot;
    const wx = st.live
      ? { ...wxBase, label: st.live.temp + "° " + wxBase.word, note: (st.live.feels !== st.live.temp ? "체감 " + st.live.feels + "° · " : "") + wxBase.plain }
      : wxBase;
    const feelsTxt = st.live ? "체감 " + st.live.feels + "도" : "체감 35도";
    const item = st.program || st.pick || sug.item;
    // 주말·휴일엔 프로그램 이름의 평일 표현("퇴근 전 ")을 떼서 상황과 어긋나지 않게 한다.
    // (직접 고른 프로그램 st.program은 사용자가 고른 원래 이름 그대로 둔다.)
    const isWeekend = sug.isWeekend;
    // 요일·시각에 맞는 제목은 suggestion.ts `contextualItem` 이 sug.item 에 이미 적용했다(2026-09-19) — 여기서 다시 바꾸지 않는다.
    const itemTitle = item.title;
    const area = st.area || "all";
    const libList = PROGRAMS
      .filter((pg) => area === "all" || pg.area === area)
      .filter((pg) => !(tier > 0 && !pg.low))
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
    // 이번 주 흐름 — ★원장에서 뽑는다. 2026-09-13 까지는 `WEEK_FLOW` 목업 상수였는데,
    //   같은 화면 아래 「하루씩 보기」가 원장을 보므로 바와 목록이 서로 다른 주를 말하게 된다.
    //   어제 칸만 세션 값(위험어 등)이 반영된 dayOverall 로 덮는다.
    const weekDays = weekConditions(mockRecordsUntil(st.now), 5).reverse(); // 오래된 → 어제
    const weekFlow = weekDays.map((d, i) => (i === weekDays.length - 1 ? dayOverall : d.overall));
    const cond = {
      dayBodyIn, dayMindIn, dayBody, dayMind, dayOverall, weekFlow, yesterday: yesterdayLabel(st.now),
      bodyIn, mindIn, body, mind, overall, overallHistory,
      bodyChange: change(CONDITION_HISTORY.body[CONDITION_HISTORY.body.length - 1], body),
      mindChange: change(CONDITION_HISTORY.mind[CONDITION_HISTORY.mind.length - 1], mind),
      overallChange: change(overallHistory[overallHistory.length - 1], overall),
    };
    return { roleKey, role, authed, onboarding, tier, parqAll, delayOn, delayMsg, choices, slot, wx, feelsTxt, item, itemTitle, isWeekend, libList, totals, answered, cond };
  }

  const nowTime = `${s.now.getHours()}:${String(s.now.getMinutes()).padStart(2, "0")}`;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const todayLabel = `${s.now.getMonth() + 1}월 ${s.now.getDate()}일 ${days[s.now.getDay()]}요일`;
  const chatDateLabel = `${s.now.getFullYear()}년 ${s.now.getMonth() + 1}월 ${s.now.getDate()}일 ${days[s.now.getDay()]}요일`;

  const step = OB[Math.max(0, s.ob)] || OB[0];
  // 온보딩 단계: 약속 → 동의·권한 → 안전 확인(옛 PAR-Q+, 2026-09-16 부터 APSS·ACSM 기반) → 직군 (2026-09-13 사용자 지시로 안전 확인이 직군 앞)
  const canNext = s.ob === OB_AT.consent ? s.consent[0] : s.ob === OB_AT.parq ? v.parqAll : true;

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
          {v.authed && !v.onboarding && s.tab === "daily" && renderDaily()}
          {/* my = 월간 기록(2026-09-13 사용자 지시로 주간 → 월간). 주간 흐름은 그 화면 맨 위(2026-09-17). */}
          {v.authed && !v.onboarding && s.tab === "my" && renderRecords()}
          {v.authed && !v.onboarding && renderTabs()}

          {s.sheet === "picture" && renderPicture()}
          {s.sheet === "content" && renderContent()}
          {s.sheet === "library" && renderLibrary()}
          {s.sheet === "mind" && renderMind()}
          {s.sheet === "talk" && renderTalk()}
          {s.sheet === "settings" && renderSettings()}
          {/* 월간 기록 시트 — 홈의 「기록 보기」 버튼이 연다(my 탭과 같은 renderRecords). */}
          {s.sheet === "month" && renderRecords(true)}
          {s.sheet === "persona" && renderPersonaTest()}
          {s.sheet === "personaPick" && renderPersonaPick()}
          {s.sheet === "personaResult" && renderPersonaResult()}
        </div>
      </div>
    </div>
  );

  function renderLogin() {
    const loginBtnBg = s.loginId && s.loginPw ? "#7a6bc4" : "#cdc3ea";
    const doLogin = () => patch({ authed: true, ob: 0, guest: s.loginId.trim() === "" });
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
    const obBtn = s.parqOnly ? "저장하고 돌아가기" : step.btn;
    const obBtnBg = canNext ? "#7a6bc4" : "#cdc3ea";
    const obBackLabel = s.parqOnly ? "취소" : s.ob === OB_AT.promise ? "나중에 볼게요" : "이전";
    const obNext = () => {
      if (!canNext) return;
      patchFn((st) => st.parqOnly ? { ob: -1, parqOnly: false, sheet: "settings" } : { ob: st.ob >= OB_LAST ? -1 : st.ob + 1 });
    };
    const obBack = () => patchFn((st) => st.parqOnly ? { ob: -1, parqOnly: false, sheet: "settings" } : { ob: st.ob <= 0 ? -1 : st.ob - 1 });

    return (
      <div style={sx("flex:1; display:flex; flex-direction:column; min-height:0")}>
        <div style={sx("display:flex; gap:5px; padding:12px 24px 0; flex:none")}>
          {steps.map((it, i) => (<div key={i} style={{ ...sx("flex:1; height:3px; border-radius:2px; transition:background 0.3s"), background: it.bg }} />))}
        </div>

        <div style={sx("flex:1; overflow-y:auto; padding:26px 24px 0; display:flex; flex-direction:column; gap:20px")}>
          <div style={sx("display:flex; flex-direction:column; gap:9px")}>
            {/* 약속 장은 kicker 를 비웠다(사용자 지시 2026-09-16) — 빈 줄이 자리를 먹지 않게 있을 때만 그린다. */}
            {step.kicker && <div style={sx("font-size:12px; font-weight:700; color:#8ba8b3; letter-spacing:0.04em")}>{step.kicker}</div>}
            <div style={sx("font-size:24px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; line-height:1.35; text-wrap:pretty")}>{step.title}</div>
            {/* 직군 장은 카드에서 설명을 걷어냈으므로(위 주석) 이 한 줄이 설명의 전부다 → 진하게(사용자 지시). */}
            {step.body && <div style={{ ...sx("font-size:14px; line-height:1.65; text-wrap:pretty"), color: step.id === "role" ? "#2d5c6e" : "#6b8c9a", fontWeight: step.id === "role" ? 600 : 400 }}>{step.body}</div>}
          </div>

          {step.id === "promise" && (
            <div style={sx("display:flex; flex-direction:column; gap:9px")}>
              {PRINCIPLES.map((text, i) => (
                <div key={i} style={sx("display:flex; gap:11px; align-items:flex-start; padding:15px 16px; border-radius:15px; background:#fff; border:1px solid #c9d6dc")}>
                  <div style={sx("width:6px; height:6px; border-radius:50%; background:#7a6bc4; margin-top:7px; flex:none")} />
                  <div style={sx("flex:1; font-size:14px; color:#2d5c6e; line-height:1.55; font-weight:500; text-wrap:pretty")}>{text}</div>
                </div>
              ))}
            </div>
          )}

          {step.id === "consent" && (
            <div style={sx("display:flex; flex-direction:column; gap:11px")}>
              {/* 2026-09-16: 「모으는 것은 이만큼이 전부예요」 목록과 장 본문을 삭제(사용자 지시) — 이 장은 동의·권한만 받는다. */}
              <div style={sx("font-size:13px; font-weight:700; color:#6b8c9a; padding:0 2px")}>동의</div>
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

          {step.id === "role" && (
            <div style={sx("display:flex; flex-direction:column; gap:10px")}>
              {(Object.keys(ROLES) as Role[]).map((k) => {
                const on = v.roleKey === k && !!s.role;
                // 2026-09-13 사용자 지시: 테두리를 진하게 + 세 카드의 색을 나눈다.
                // 안 고른 카드도 자기 색을 갖되 같은 색을 옅게(알파) 쓴다 — 새 hex 를 만들지 않으려는 것이다(data.ts 주석).
                const ac = ROLES[k].accent;
                return (
                  <div key={k} onClick={() => patch({ role: k })} style={{ ...sx("cursor:pointer; display:flex; flex-direction:column; gap:5px; padding:17px 18px; border-radius:16px; border:2px solid; transition:all 0.2s"), background: on ? ac.line + "14" : "#fff", borderColor: on ? ac.line : ac.line + "b3" }}>
                    <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>{ROLES[k].label}</div>
                    <div style={sx("font-size:12.5px; color:#6b8c9a; line-height:1.55; text-wrap:pretty")}>{ROLES[k].hint}</div>
                    {/* 🚫 2026-09-13: 여기에 「이런 걸 제안해 드려요」를 적지 말 것(사용자 지시로 삭제).
                        이 시점엔 걸음도 기록도 아무것도 없다 — 직군만 고른 상태에서 제안부터 말하면 말이 안 된다.
                        고른 티는 테두리·배경색이 낸다. 무엇이 달라지는지는 위 본문 한 줄이 말한다. */}
                  </div>
                );
              })}
            </div>
          )}

          {step.id === "parq" && (
            <div style={sx("display:flex; flex-direction:column; gap:9px")}>
              {SAFETY_QUESTIONS.map(({ text }, i) => {
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
              {/* 2단 — 「예」한 질환 묶음만 「지금 통제되는가」를 묻는다(오리지널 2·3쪽 논리). 1단을 아니오로 되돌리면 그 묶음은 사라진다. */}
              {followUpGroupsFor(s.parq).map((g) => (
                <div key={g} style={sx("display:flex; flex-direction:column; gap:8px; padding:14px 15px; border-radius:15px; background:#f7f5fc; border:1.5px solid #c4b8ec; animation:wRise 0.3s ease-out both")}>
                  <div style={sx("font-size:13px; font-weight:700; color:#5a4aa8")}>{FOLLOW_UPS[g].title}</div>
                  {FOLLOW_UPS[g].items.map((text, j) => {
                    const key = `${g}.${j}`;
                    const val = s.parq2[key];
                    const btn = (label: string, on: boolean, v2: boolean) => (
                      <div onClick={() => patchFn((sti) => ({ parq2: { ...sti.parq2, [key]: v2 } }))} style={{ ...sx("cursor:pointer; white-space:nowrap; min-height:40px; min-width:52px; padding:0 12px; border-radius:11px; font-size:12.5px; font-weight:700; display:flex; align-items:center; justify-content:center; border:1.5px solid; transition:all 0.18s"), background: on ? "#f2edfa" : "#fff", color: on ? "#7a6bc4" : "#8ba8b3", borderColor: on ? "#7a6bc4" : "#c9d6dc" }}>{label}</div>
                    );
                    return (
                      <div key={key} style={sx("display:flex; align-items:center; gap:10px")}>
                        <div style={sx("flex:1; min-width:0; font-size:13px; color:#2d5c6e; line-height:1.5; font-weight:500; text-wrap:pretty")}>{text}</div>
                        <div style={sx("flex:none; display:flex; gap:6px")}>
                          {btn("아니오", val === false, false)}
                          {btn("예", val === true, true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* 미루기(오늘 몸 상태) — 2026-09-17 사용자 지시로 홈에서 여기로. 하나라도 예면 제안이 쉬기로 바뀐다. */}
              <div style={sx("display:flex; flex-direction:column; gap:8px; padding:14px 15px; border-radius:15px; background:#fff7ed; border:1.5px solid #f3c98b")}>
                <div style={sx("font-size:13px; font-weight:700; color:#7a4a00")}>오늘 몸 상태</div>
                {DELAY_QUESTIONS.map(({ text }, i) => {
                  const val = s.delay[i];
                  const btn = (label: string, on: boolean, val2: boolean) => (
                    <div onClick={() => patchFn((sti) => ({ delay: { ...sti.delay, [i]: val2 } }))} style={{ ...sx("cursor:pointer; white-space:nowrap; min-height:40px; min-width:52px; padding:0 12px; border-radius:11px; font-size:12.5px; font-weight:700; display:flex; align-items:center; justify-content:center; border:1.5px solid; transition:all 0.18s"), background: on ? "#f2edfa" : "#fff", color: on ? "#7a6bc4" : "#8ba8b3", borderColor: on ? "#7a6bc4" : "#c9d6dc" }}>{label}</div>
                  );
                  return (
                    <div key={i} style={sx("display:flex; align-items:center; gap:10px")}>
                      <div style={sx("flex:1; min-width:0; font-size:13px; color:#2d5c6e; line-height:1.5; font-weight:500; text-wrap:pretty")}>{text}</div>
                      <div style={sx("flex:none; display:flex; gap:6px")}>{btn("아니오", val === false, false)}{btn("예", val === true, true)}</div>
                    </div>
                  );
                })}
              </div>
              {v.parqAll && (
                <div style={sx("display:flex; flex-direction:column; gap:8px; padding:16px; border-radius:16px; background:#f2edfa; border:1px solid #c9d6dc; animation:wRise 0.4s ease-out both")}>
                  <div style={sx("font-size:13.5px; font-weight:700; color:#2d5c6e")}>{v.delayOn ? "오늘은 쉬어 가셔도 좋아요" : v.tier > 0 ? "가벼운 것부터 함께할게요" : "편하게 시작하셔도 좋아요"}</div>
                  <div style={sx("font-size:13px; color:#4d7c8c; line-height:1.6; text-wrap:pretty")}>{v.delayMsg ?? parqNotice(v.tier) ?? "특별히 걸리는 것이 없어 평소 강도로 제안해 드릴게요. 몸이 무거운 날에는 언제든 더 낮은 강도를 고르실 수 있어요."}</div>
                </div>
              )}
              <div style={sx("font-size:13px; color:#2d5c6e; font-weight:600; line-height:1.65; padding:2px; text-wrap:pretty")}>호주 ESSA 성인 사전운동 문진(APSS)과 미국 ACSM 사전참여 기준을 참고해 만든 문항으로, 건강검진이나 진단이 아닙니다. 이 답은 활동 강도를 정하는 데만 쓰이고, 본인 외에는 누구도 볼 수 없습니다. 설정에서 언제든 다시 답할 수 있어요.</div>
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
    const greeting = EMPTY_STATE ? "천천히 시작해요" : greetingForHour(s.now.getHours());
    // 인사말 아래 30문장 중 하나 — 요일·시간대 묶음에서 마운트 시드로 고른다(2026-09-21 사용자 지시 · homeMessage.ts).
    const homeMessage = !EMPTY_STATE && s.msgSeed !== null ? pickHomeMessage({ hour: s.now.getHours(), dow: s.now.getDay() }, s.msgSeed) : null;
    // AI 오늘의 제안 문구 — 요일(주말/평일)·시간대·직군 + ★안전 확인 강도. 조립은 daySolution.ts(순수·테스트).
    // ⚠ 걸음·활동 수치는 아직 목업이라, 문구도 단정("~했어요") 대신 추정("~기 쉬워요")으로 둔다.
    //    공휴일(평일 중 쉬는 날)은 학사일정 연동 전이라 감지 못 함 — 주말만 '쉬는 날'로 처리(Phase 2에서 확장).
    // 🚫 이 문구를 화면 안에서 다시 조립하지 말 것 — 2026-09-13 까지 여기 있던 판이 안전 확인 답을 보지 않아,
    //    "낮은 강도만 제안한다"고 약속한 분께 같은 화면이 걷기를 권하고 있었다.
    const isWeekend = v.isWeekend;
    const daySolution = buildDaySolution({
      role: v.roleKey,
      slot: v.slot,
      isWeekend,
      low: v.tier > 0,
      weatherPrefer: wx.prefer,
      feelsTxt: v.feelsTxt,
    });
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
          {/* 2026-09-13 사용자 지시: 아래 탭에서 설정을 빼는 대신 **톱니 옆에 「설정」이라고 적는다** — 아이콘만으로는 못 찾는다. */}
          <div onClick={() => patch({ sheet: "settings" })} style={sx("cursor:pointer; flex:none; height:42px; padding:0 13px 0 10px; border-radius:999px; background:#fff; border:1px solid #c9d6dc; display:flex; align-items:center; gap:6px; box-shadow:0 2px 8px rgba(45,92,110,0.06)")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#7a6bc4" strokeWidth="1.9" strokeLinecap="round" style={{ width: 19, height: 19, flex: "none" }}>
              <path d="M12 4.2l1.5 1.9 2.4-.5.5 2.4 1.9 1.5-1.1 2.2 1.1 2.2-1.9 1.5-.5 2.4-2.4-.5L12 19.8l-1.5-1.9-2.4.5-.5-2.4-1.9-1.5L6.8 12 5.7 9.8l1.9-1.5.5-2.4 2.4.5z" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
            <div style={sx("font-size:12.5px; font-weight:700; color:#7a6bc4; white-space:nowrap")}>설정</div>
          </div>
        </div>

        {/* 인사말 아래 한 토막 — 머리줄 안(설정 단추 옆 좁은 칸)에 넣으면 5~6줄이 세로로 길게 접혀 머리줄 전체를 밀어내므로 한 줄 아래 전폭으로. 줄바꿈은 원문대로(pre-line). */}
        {homeMessage && (
          <div style={sx("margin-top:-4px; padding:12px 16px; border-radius:16px; background:#fff; border:1px solid #d9e6ea; font-size:14px; line-height:1.75; font-weight:500; color:#3f6b7c; white-space:pre-line; text-wrap:pretty; letter-spacing:-0.01em")}>{homeMessage}</div>
        )}

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
              {/* 스트레칭 — 설명 없이 읽히게 「몇 번 / 오늘 총 몇 분」만(사용자: 점·배지·부위 개수 전부 뜻이 안 읽힘)
                  ⚠ 한 편 = 1분이므로 회수와 분이 같아야 한다(2026-09-13: 「3회 · 7분」으로 어긋나 있었다). */}
              <div style={sx("display:flex; flex-direction:column; align-items:center; justify-content:space-between; gap:4px; padding:0 4px; border-right:1px solid #ece8f5")}>
                <div style={sx("font-size:11.5px; font-weight:600; color:#8ba8b3")}>스트레칭</div>
                <div style={sx("display:flex; flex-direction:column; gap:2px; align-items:center; padding-top:4px")}>
                  <div style={sx("font-size:11px; color:#4d7c8c; white-space:nowrap")}>목풀기 2회</div>
                  <div style={sx("font-size:11px; color:#4d7c8c; white-space:nowrap")}>어깨풀기 1회</div>
                </div>
                <div style={sx("font-size:17px; font-weight:700; color:#3a4a72; letter-spacing:-0.03em; line-height:1; white-space:nowrap")}>총 3회 · 3분</div>
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
              <div onClick={() => patch({ sheet: "content", program: null, pick: null })} style={sx("cursor:pointer; text-align:center; padding:13px; border-radius:13px; background:#f2edfa; border:1px solid #cfc5ea; font-size:14px; font-weight:700; color:#7a6bc4")}>1분 기지개부터</div>
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
        {/* 주간 흐름 박스 — 2026-09-17 사용자 지시: 옛 종합 컨디션 박스에서 큰 단계 글자·「최근 흐름」 한 줄·신체/마음 칩·「주간 기록 보기」를
            없애고, **이번 주 흐름 막대 + 범례**와 「월간 기록 보기」 버튼만 남긴다(처음엔 막대를 월간 화면으로 옮겼다가 사용자 정정 —
            "주간 흐름 슬라이드바와 범례는 보이게"). 🚫 홈에 단계 글자를 되살리지 말 것. */}
        {renderWeekFlow(
          // 2026-09-19 사용자 지시: 「월간 기록 보기」를 반으로 줄이고 옆에 「케어&힐링 가기」 — 한 줄에 반씩.
          <div style={sx("display:flex; gap:8px; margin-top:4px")}>
            <div onClick={() => patch({ sheet: "month" })} style={sx("flex:1; cursor:pointer; text-align:center; padding:13px 8px; border-radius:13px; font-size:14px; font-weight:800; letter-spacing:-0.01em; background:#7a6bc4; color:#fff; box-shadow:0 4px 12px rgba(122,107,196,0.32)")}>월간 기록 보기 ›</div>
            <div onClick={() => patch({ tab: "daily", sheet: null })} style={sx("flex:1; cursor:pointer; text-align:center; padding:13px 8px; border-radius:13px; font-size:14px; font-weight:800; letter-spacing:-0.01em; background:#2d7a5f; color:#fff; box-shadow:0 4px 12px rgba(45,122,95,0.28)")}>케어&힐링 가기 ›</div>
          </div>,
        )}

        {/* 날씨 — 맨 위 한 줄(사용자 지시). 제안 카드 안에 있을 땐 시작 버튼을 아래로 밀었다. */}
        <div style={sx("display:flex; align-items:center; gap:9px; margin-top:-4px")}>
          <div style={sx("flex:none; display:flex; align-items:center; gap:8px; min-height:32px; padding:0 13px; border-radius:999px; background:#fff; border:1px solid #c9d6dc")}>
            <div style={{ ...sx("width:9px; height:9px; border-radius:50%; flex:none"), background: wx.dot }} />
            <div style={sx("font-size:13px; font-weight:700; color:#3a4a72; white-space:nowrap")}>{wx.label}</div>
          </div>
          <div style={sx("flex:1; min-width:0; font-size:12.5px; font-weight:500; color:#4d5578; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{wx.note}</div>
        </div>

        {/* 「신체 건강을 위한 운동 N가지 제안」(2026-09-17 사용자 지시 · N = 실제 선택지 수라 숨 고르기 단계면 1가지) — 「AI」 표기는 뺐다.
            ★미루기가 켜져도 제안·선택지는 그대로 두고 쉬어도 좋다는 안내 한 줄만 얹는다 — "제안을 한 거지 하는 건 그 사람 마음"(사용자 2026-09-17).
            🚫 미루기로 제안을 치우지 말 것(한 번 그렇게 했다가 지적받았다). */}
        <div style={sx("display:flex; flex-direction:column; gap:14px; padding:18px; border-radius:22px; background:linear-gradient(140deg,#eaf6fb 0%,#f2edfa 62%,#fdf0f4 100%); border:1px solid #c9d6dc; box-shadow:0 4px 16px rgba(122,138,196,0.12)")}>
          <div style={sx("display:flex; align-items:center; gap:9px")}>
            <div style={sx("flex:none; padding:6px 13px; border-radius:999px; background:#4a3f80; font-size:12px; font-weight:800; color:#fff; white-space:nowrap; letter-spacing:0.02em")}>{`신체 건강을 위한 운동 ${v.choices.length}가지 제안`}</div>
            <div style={sx("flex:1; height:1px; background:rgba(122,107,196,0.22)")} />
          </div>
            <div style={sx("font-size:15.5px; font-weight:600; color:#3a4a72; line-height:1.7; letter-spacing:-0.01em; text-wrap:pretty")}>{daySolution}</div>
            {/* 지금 바로 시작하기 — 시간대 항목 1(진하게) + 부위 프로세스 3(목·어깨·자세, 흰 버튼 · 부위를 앞에 붙인다). suggestion.ts 참고. */}
            <div style={sx("display:flex; flex-direction:column; gap:8px")}>
              <div style={sx("font-size:10.5px; font-weight:700; color:#4a3f80; letter-spacing:0.03em; padding:0 2px")}>지금 바로 시작하기 · 하나를 골라 주세요</div>
              {v.choices.map(({ item: it, part }, i) => {
                const first = i === 0;
                return (
                  <div key={it.title} onClick={() => patch({ sheet: "content", program: null, pick: it })} style={{ ...sx("cursor:pointer; display:flex; align-items:center; gap:12px; min-height:54px; padding:0 14px; border-radius:15px; border:1.5px solid"), background: first ? "#7a6bc4" : "#fff", borderColor: first ? "#7a6bc4" : "#cfc5ea", boxShadow: first ? "0 6px 16px rgba(122,107,196,0.32)" : "none" }}>
                    <div style={{ ...sx("flex:none; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center"), background: first ? "rgba(255,255,255,0.22)" : "#f2edfa" }}>
                      <div style={{ ...sx("width:0; height:0; margin-left:3px; border-top:6px solid transparent; border-bottom:6px solid transparent"), borderLeft: `10px solid ${first ? "#fff" : "#7a6bc4"}` }} />
                    </div>
                    <div style={{ ...sx("flex:1; min-width:0; font-size:14px; font-weight:700; text-wrap:pretty"), color: first ? "#fff" : "#4a3f80" }}>{part && <><span style={sx("color:#7a6bc4")}>{part}</span>{" · "}</>}{it.title}</div>
                    <div style={{ ...sx("flex:none; font-size:16px"), color: first ? "rgba(255,255,255,0.8)" : "#7a6bc4" }}>›</div>
                  </div>
                );
              })}
            </div>
          {v.delayMsg && (
            <div style={sx("display:flex; gap:9px; align-items:flex-start; padding:12px 13px; border-radius:14px; background:#fff7ed; border:1px solid #f3c98b")}>
              <div style={sx("flex:none; width:18px; height:18px; margin-top:1px; border-radius:50%; background:#f3c98b; color:#7a4a00; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center")}>!</div>
              <div style={sx("flex:1; min-width:0; font-size:12.5px; font-weight:500; color:#7a4a00; line-height:1.6; text-wrap:pretty")}>{v.delayMsg}</div>
            </div>
          )}
          {/* 2026-09-13: 안전 확인 안내가 온보딩에서 한 번 스쳐 지나가고 끝이었다 → 제안을 읽는 그 자리에 상시로 둔다. */}
          {parqNotice(v.tier) && (
            <div style={sx("display:flex; gap:9px; align-items:flex-start; padding:12px 13px; border-radius:14px; background:rgba(255,255,255,0.72); border:1px solid #c4b8ec")}>
              <div style={sx("flex:none; width:18px; height:18px; margin-top:1px; border-radius:50%; background:#7a6bc4; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center")}>!</div>
              <div style={sx("flex:1; min-width:0; font-size:12.5px; font-weight:500; color:#4a3f80; line-height:1.6; text-wrap:pretty")}>{parqNotice(v.tier)}</div>
            </div>
          )}
        </div>

        {/* 2단 타일(신체 건강·마음 건강)은 2026-09-13 사용자 지시로 **데일리케어 탭**으로 옮겼다 — renderDaily 참고. 🚫 홈에 되돌리지 말 것.
        */}

      </div>
    );
  }

  /** 월별 기록장. `inSheet` 면 홈의 「기록 보기」가 띄우는 시트로, 아니면 **my 탭**의 화면으로. 내용은 같은 코드다. */
  /**
   * 데일리케어 — 신체 건강·마음 건강으로 들어가는 자리(2026-09-13 사용자 지시로 홈에서 옮겨 왔다).
   * 🚫 홈에 같은 카드를 다시 두지 말 것.
   */
  function renderDaily() {
    return (
      <div style={sx("flex:1; overflow-y:auto; display:flex; flex-direction:column; padding:14px 20px 96px")}>
        {/* 2026-09-17 사용자 지시: 탭 = 「케어&힐링」, 페이지는 구분선으로 「데일리케어」(케어 카드 둘) / 「데일리 힐링」(성향 테스트·추천 음악) 두 절. */}
        <div style={sx("flex:none; display:flex; flex-direction:column; gap:5px; padding-top:6px")}>
          <div style={sx("font-size:22px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em")}>데일리케어</div>
          <div style={sx("font-size:13px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>몸과 마음, 오늘 챙기고 싶은 쪽을 골라보세요. 한 번에 1분이면 충분합니다.</div>
        </div>
        {/* 2026-09-13 사용자 지시: 나란히가 아니라 **위아래로**, 그리고 **가운데로**.
            이 탭엔 카드 둘뿐이라 위에 붙여 두면 아래가 통째로 빈다 → 제목은 위에 두고 카드는 남은 높이의 가운데.
            ⚠ 카드를 더 키워도 봤는데(아이콘 60px) **부제가 두 줄로 접혀** 되돌렸다 — 폭이 좁아 「…운동 / · 15가지」처럼 꼬리만 남는다.
            화면이 짧으면 `overflow-y:auto` 로 그대로 스크롤된다. */}
        <div style={sx("flex:none; display:flex; flex-direction:column; gap:16px; padding:14px 0 22px")}>
          {/* 가로로 길어졌으므로 아이콘 → 글 → 화살표 **한 줄**로. 세로 2열 시절의 「아이콘 위 / 글 아래」는 옆이 텅 빈다. */}
          <div onClick={() => patch({ sheet: "library" })} style={sx("cursor:pointer; display:flex; align-items:center; gap:14px; padding:26px 18px; border-radius:22px; background:linear-gradient(120deg,#fff1e4 0%,#ffe6ec 100%); border:1px solid #f6cfc4; box-shadow:0 10px 24px rgba(214,130,108,0.26), 0 2px 6px rgba(214,130,108,0.16)")}>
            <div style={sx(`width:50px; height:50px; flex:none; border-radius:15px; overflow:hidden; background:url(${IMG}/icon-physical.png) center/cover`)} />
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:4px")}>
              <div style={sx("font-size:16px; font-weight:700; color:#8a4a3c")}>신체 건강 케어</div>
              {/* ⚠ 한글은 아무 데서나 끊긴다 — 「15 / 가지」로 갈라졌었다. keep-all 로 낱말을 붙여 둔다. */}
              <div style={sx("font-size:12.5px; color:#9a5f4c; line-height:1.55; text-wrap:pretty; word-break:keep-all")}>신체건강을 위한 간단한 운동 · {v.libList.length}가지</div>
            </div>
            <div style={sx("flex:none; font-size:17px; color:#e0876c")}>↗</div>
          </div>
          <div onClick={() => patch({ sheet: "mind" })} style={sx("cursor:pointer; display:flex; align-items:center; gap:14px; padding:26px 18px; border-radius:22px; background:linear-gradient(120deg,#e8f3ff 0%,#ede7fb 100%); border:1px solid #d2cbf0; box-shadow:0 10px 24px rgba(110,95,190,0.26), 0 2px 6px rgba(110,95,190,0.16)")}>
            <div style={sx(`width:50px; height:50px; flex:none; border-radius:50%; overflow:hidden; background:url(${IMG}/icon-mind.png) center/cover`)} />
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:4px")}>
              <div style={sx("font-size:16px; font-weight:700; color:#4a3f80")}>마음 건강 케어</div>
              <div style={sx("font-size:12.5px; color:#5f5397; line-height:1.55; text-wrap:pretty; word-break:keep-all")}>마음건강을 위한 짧은 대화와 마음카드</div>
            </div>
            <div style={sx("flex:none; font-size:17px; color:#8a7cd0")}>↗</div>
          </div>
        </div>

        {/* ── 데일리 힐링 ── 「케어」가 아니라 잠깐 쉬고 나를 들여다보는 것(성향 테스트 · 시간대 추천 음악). 이름은 사용자 확정(「데일리 쉼표」는 케어와 결이 안 맞아 반려). */}
        <div style={sx("flex:none; height:1px; background:#d9d2ec; margin:2px 0 18px")} />
        <div style={sx("flex:none; display:flex; flex-direction:column; gap:5px")}>
          <div style={sx("font-size:22px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em")}>데일리 힐링</div>
          <div style={sx("font-size:13px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>가볍게 나를 알아보고, 잠시 음악으로 쉬어 가요.</div>
        </div>
        <div style={sx("flex:none; display:flex; flex-direction:column; gap:16px; padding:14px 0 8px")}>
          {renderHealingCards()}
        </div>
      </div>
    );
  }

  /**
   * 추천 음악 — 채널 칩 셋(emptysilver · 클래식 · 가요) + 플레이어 하나. 목록은 서버가 하루 한 번 최신으로(music.ts) · 오기 전엔 고정 목록.
   * 자리 = 성향 결과 2/2 「문장과 책」의 추천 도서 바로 아래(2026-09-19 사용자 지시 "다음 페이지 추천 도서 아래" — 데일리 힐링에선 뺐다).
   */
  function renderMusicCard() {
          const ch = MUSIC_CHANNELS.find((c) => c.key === s.musicKey) ?? MUSIC_CHANNELS[0];
          const pl = s.music?.[ch.key];
          const ids = pl && pl.ids.length ? pl.ids : ch.fallbackIds;
          return (
            <div style={sx("display:flex; flex-direction:column; gap:10px; padding:16px 16px 14px; border-radius:22px; background:#fff; border:1px solid #c9d6dc; box-shadow:0 6px 18px rgba(45,92,110,0.08)")}>
              <div style={sx("display:flex; align-items:center; gap:10px")}>
                <div style={sx("width:34px; height:34px; flex:none; border-radius:11px; background:#f2edfa; display:flex; align-items:center; justify-content:center; font-size:16px")}>🎧</div>
                <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
                  <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>추천 음악 · {ch.label}</div>
                  <div style={sx("font-size:12px; color:#6b8c9a; line-height:1.5; text-wrap:pretty")}>{ch.note} — 최신 {ids.length}편</div>
                </div>
              </div>
              <div style={sx("display:flex; gap:6px")}>
                {MUSIC_CHANNELS.map((c) => {
                  const on = c.key === ch.key;
                  return (
                    <div key={c.key} onClick={() => patch({ musicKey: c.key })} style={{ ...sx("cursor:pointer; flex:1; text-align:center; padding:9px 4px; border-radius:11px; font-size:12.5px; font-weight:700; border:1.5px solid"), background: on ? "#7a6bc4" : "#fff", color: on ? "#fff" : "#7a6bc4", borderColor: on ? "#7a6bc4" : "#cfc5ea" }}>
                      {c.key === "emptysilver" ? "emptysilver" : c.key === "classical" ? "클래식" : "가요"}
                    </div>
                  );
                })}
              </div>
              <div style={sx("position:relative; width:100%; padding-top:56.25%; border-radius:14px; overflow:hidden; background:#0f0f0f")}>
                <iframe
                  key={ch.key}
                  title={`추천 음악 · ${ch.label}`}
                  src={embedSrc(ids)}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div style={sx("font-size:11px; color:#8ba8b3; line-height:1.5")}>유튜브에서 재생됩니다 · 소리는 ▶ 를 누른 뒤에만 납니다 · 목록은 하루 한 번 채널 최신 영상으로 바뀝니다</div>
            </div>
          );
  }

  /**
   * 데일리 힐링 카드 — 성향 테스트 + 추천 음악.
   * 음악(2026-09-17 사용자 지시 "일단 이거 하나만 임베딩") = 유튜브 채널 **emptysilver**(@emptysilver · 채널 ID UCyvNK9b_Rs7djuIQ4a7i5aw)의
   *   업로드 목록을 플레이어 하나로. 목록 ID = 채널 ID 의 UC→UU(유튜브 규칙). 음원을 담지 않고 유튜브 공식 임베드로만 재생 — 저작권·약관 문제 없음.
   *   youtube-nocookie 도메인(추적 최소화) · 자동재생 없음 · 실측(09-17): 채널 긴 영상 11편 임베드 허용, 1편(5aSlkBcvWVQ) 차단 — 목록 재생 시 그 편은 건너뛴다.
   *   ⚠ 시간대별 3편 선곡은 보류(사용자 "일단 하나만"). 나중에 바꾸면 이 상수만.
   */
  function renderHealingCards() {
    const done = s.personaDone;
    const t = done ? PERSONA_TYPES[done.type] : null;
    return (
      <>
        {/* 마음 성향 — 유형이 없으면 두 갈래(내 유형 알아요 → 16개 고르기 / 모르겠어요 → 40문항). 테스트는 찾을 때만(2026-09-19 사용자 확정). */}
        {/* 2026-09-19 사용자: 데일리 힐링 박스도 위 「신체 건강 케어」처럼 그림자 카드로 · 앞에 이모티콘 · 「모르겠어요 / 5분 테스트」 두 줄. 카드 껍데기는 데일리케어 카드와 같은 여백 · 색은 초록 축 · 테두리 1.5px·그림자는 한 단계 진하게(2026-09-19 사용자 "조금 더 진하게"). */}
        <div style={sx("display:flex; flex-direction:column; gap:14px; padding:26px 18px; border-radius:22px; background:linear-gradient(120deg,#dff3ea 0%,#dbe9f8 100%); border:1.5px solid #9ccdb8; box-shadow:0 12px 28px rgba(60,140,110,0.34), 0 2px 8px rgba(60,140,110,0.22)")}>
          <div onClick={() => done && patch({ sheet: "personaResult", personaPage: 1 })} style={sx(`display:flex; align-items:center; gap:14px; ${done ? "cursor:pointer" : ""}`)}>
            <div style={sx(`width:50px; height:50px; flex:none; border-radius:15px; overflow:hidden; background:url(${IMG}/icon-healing.png) center/cover`)} />
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:4px")}>
              <div style={sx("font-size:16px; font-weight:700; color:#245c48")}>마음 성향</div>
              <div style={sx("font-size:12.5px; color:#3f7a64; line-height:1.55; text-wrap:pretty; word-break:keep-all")}>{done && t ? `${done.type} · ${t.name} — 결과 다시 보기` : "16가지 성향 중 내 것을 고르거나, 40문항으로 알아봐요"}</div>
            </div>
            {done && <div style={sx("flex:none; font-size:17px; color:#4fa585")}>↗</div>}
          </div>
          {!done && (
            <div style={sx("display:flex; gap:8px")}>
              <div onClick={() => patch({ sheet: "personaPick" })} style={sx("cursor:pointer; flex:1; display:flex; align-items:center; justify-content:center; text-align:center; padding:13px 8px; border-radius:14px; background:#2d7a5f; color:#fff; font-size:13.5px; font-weight:800")}>내 유형 알아요</div>
              <div onClick={() => patch({ sheet: "persona", persona: {}, personaIdx: 0 })} style={sx("cursor:pointer; flex:1; text-align:center; padding:13px 8px; border-radius:14px; background:#fff; border:1.5px solid #9ccdb8; color:#2d7a5f; font-size:13.5px; font-weight:800; line-height:1.35")}>모르겠어요<br />5분 테스트</div>
            </div>
          )}
        </div>
        {/* 오늘 해볼 것 — 유형별 3가지(제안 · 마음온도 「TO do it」에서 골라 온 자리). 유형이 있을 때만. */}
        {done && t && (
          <div style={sx("display:flex; flex-direction:column; gap:12px; padding:26px 18px 20px; border-radius:22px; background:linear-gradient(120deg,#e6f5ee 0%,#e2edf9 100%); border:1.5px solid #9ccdb8; box-shadow:0 12px 28px rgba(60,140,110,0.34), 0 2px 8px rgba(60,140,110,0.22)")}>
            <div style={sx("display:flex; align-items:center; gap:14px")}>
              <div style={sx("width:50px; height:50px; flex:none; border-radius:15px; background:#fff; display:flex; align-items:center; justify-content:center; font-size:26px; box-shadow:0 2px 6px rgba(80,160,130,0.18)")}>☘</div>
              <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
                <div style={sx("font-size:16px; font-weight:700; color:#245c48")}>오늘 해볼 것 · {t.name}</div>
                <div style={sx("font-size:12px; color:#6b8c9a; line-height:1.5")}>이 성향에 잘 맞는 작은 것 셋 — 하나만 골라도, 안 해도 괜찮아요</div>
              </div>
            </div>
            {t.todo.map((x) => (
              <div key={x.title} style={sx("display:flex; flex-direction:column; gap:3px; padding:11px 12px; border-radius:13px; background:#f7fbf9; border:1px solid #d7ebe2")}>
                <div style={sx("font-size:14px; font-weight:700; color:#245c48; line-height:1.5; text-wrap:pretty")}>{x.title}</div>
                <div style={sx("font-size:12.5px; color:#3f7a64; line-height:1.55; text-wrap:pretty")}>{x.why}</div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  /** 유형 직접 고르기 — 16개 격자(4×4 · I 줄 → E 줄). 고르면 lean 없이 저장하고 결과 시트로. 2026-09-19. */
  function renderPersonaPick() {
    const cur = s.personaDone?.type ?? null;
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(180deg,#fdfbff 0%,#f4f8fc 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; padding:48px 16px 12px; display:flex; align-items:center; gap:11px; background:#fff; border-bottom:1px solid #d9d2ec")}>
          <div onClick={() => patch({ sheet: cur ? "personaResult" : null })} style={sx("cursor:pointer; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
          <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>내 유형 고르기</div>
            <div style={sx("font-size:11px; color:#8ba8b3")}>아는 유형을 누르면 바로 저장돼요 · 모르면 테스트로</div>
          </div>
        </div>
        <div style={sx("flex:1; overflow-y:auto; padding:18px 20px 28px; display:flex; flex-direction:column; gap:14px")}>
          <div style={sx("display:grid; grid-template-columns:repeat(4,1fr); gap:9px")}>
            {PERSONA_CODES.map((code) => {
              const on = code === cur;
              return (
                <div key={code} onClick={() => patch({ personaDone: pickedPersona(code), sheet: "personaResult", personaPage: 1 })}
                  style={{ ...sx("cursor:pointer; text-align:center; padding:15px 0; border-radius:14px; font-size:14.5px; font-weight:800; letter-spacing:0.04em; border:1.5px solid"), background: on ? "#7a6bc4" : "#fff", color: on ? "#fff" : "#4a3f80", borderColor: on ? "#7a6bc4" : "#cfc5ea" }}>
                  {code}
                </div>
              );
            })}
          </div>
          <div onClick={() => patch({ sheet: "persona", persona: {}, personaIdx: 0 })} style={sx("cursor:pointer; text-align:center; padding:13px; border-radius:14px; background:#fff; border:1.5px solid #cfc5ea; color:#7a6bc4; font-size:14px; font-weight:800")}>모르겠어요 · 40문항으로 알아보기</div>
          <div style={sx("font-size:12px; font-weight:600; color:#6b8c9a; line-height:1.6; text-wrap:pretty; padding:0 4px")}>{PERSONA_NOTICE}</div>
        </div>
      </div>
    );
  }

  /** 마음 성향 테스트 — 한 문항씩, 5점 척도. 다 답하면 결과를 저장하고 결과 시트로. */
  function renderPersonaTest() {
    const i = s.personaIdx;
    const item = PERSONA_ITEMS[i];
    const total = PERSONA_ITEMS.length;
    const answered = Object.keys(s.persona).length;
    const pick = (score: number) => patchFn((st) => {
      const persona = { ...st.persona, [i]: score };
      const res = personaResult(persona);
      if (res && i === total - 1) return { persona, personaDone: { ...res, source: "test" as const, at: new Date().toISOString() }, sheet: "personaResult" as const, personaPage: 1 as const };
      return { persona, personaIdx: Math.min(total - 1, i + 1) };
    });
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(180deg,#fdfbff 0%,#f4f8fc 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; padding:48px 16px 12px; display:flex; align-items:center; gap:11px; background:#fff; border-bottom:1px solid #d9d2ec")}>
          <div onClick={() => patch({ sheet: null })} style={sx("cursor:pointer; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
          <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>마음 성향 테스트</div>
            <div style={sx("font-size:11px; color:#8ba8b3")}>정답은 없어요 · 평소의 나에 가까운 쪽으로</div>
          </div>
          <div style={sx("flex:none; font-size:12px; font-weight:700; color:#7a6bc4")}>{i + 1} / {total}</div>
        </div>
        <div style={sx("flex:none; height:4px; background:#eee9f7")}><div style={{ ...sx("height:100%; background:#7a6bc4; transition:width 0.25s"), width: `${Math.round((answered / total) * 100)}%` }} /></div>
        <div style={sx("flex:1; overflow-y:auto; padding:26px 20px 28px; display:flex; flex-direction:column; gap:18px")}>
          <div style={sx("font-size:12px; font-weight:700; color:#8ba8b3; letter-spacing:0.04em")}>나는 …</div>
          <div style={sx("font-size:21px; font-weight:700; color:#2d5c6e; line-height:1.5; letter-spacing:-0.02em; text-wrap:pretty; word-break:keep-all")}>{item.text}</div>
          <div style={sx("display:flex; flex-direction:column; gap:9px; padding-top:6px")}>
            {PERSONA_SCALE.map((label, k) => {
              const score = k + 1;
              const on = s.persona[i] === score;
              return (
                <div key={score} onClick={() => pick(score)} style={{ ...sx("cursor:pointer; min-height:50px; padding:0 16px; border-radius:14px; display:flex; align-items:center; justify-content:space-between; border:1.5px solid; transition:all 0.15s"), background: on ? "#f2edfa" : "#fff", borderColor: on ? "#7a6bc4" : "#c9d6dc" }}>
                  <div style={{ ...sx("font-size:14.5px; font-weight:700"), color: on ? "#7a6bc4" : "#2d5c6e" }}>{label}</div>
                  <div style={{ ...sx("width:18px; height:18px; border-radius:50%; border:1.5px solid"), background: on ? "#7a6bc4" : "#fff", borderColor: on ? "#7a6bc4" : "#c9d6dc" }} />
                </div>
              );
            })}
          </div>
          <div style={sx("display:flex; justify-content:space-between; padding-top:4px")}>
            <div onClick={() => patch({ personaIdx: Math.max(0, i - 1) })} style={{ ...sx("cursor:pointer; font-size:13px; font-weight:700; padding:8px 4px"), color: i === 0 ? "#c9d6dc" : "#7a6bc4" }}>‹ 이전</div>
            {s.persona[i] !== undefined && i < total - 1 && <div onClick={() => patch({ personaIdx: i + 1 })} style={sx("cursor:pointer; font-size:13px; font-weight:700; color:#7a6bc4; padding:8px 4px")}>다음 ›</div>}
          </div>
        </div>
      </div>
    );
  }

  /** 결과 — 1페이지 유형·기울기·성향·위로 / 2페이지 문장·도서·출처·고지. */
  function renderPersonaResult() {
    const done = s.personaDone;
    if (!done) return null;
    const t = PERSONA_TYPES[done.type];
    const close = () => patch({ sheet: null });
    const axes: Array<{ key: "E" | "N" | "F" | "J"; left: string; right: string }> = [
      { key: "E", left: "E 외향", right: "I 내향" }, { key: "N", left: "N 직관", right: "S 감각" }, { key: "F", left: "F 감정", right: "T 사고" }, { key: "J", left: "J 계획", right: "P 유연" },
    ];
    const card = "display:flex; flex-direction:column; gap:10px; padding:17px 16px; border-radius:20px; background:#fff; border:1px solid #c9d6dc";
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(180deg,#fdfbff 0%,#f4f8fc 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; padding:48px 16px 12px; display:flex; align-items:center; gap:11px; background:#fff; border-bottom:1px solid #d9d2ec")}>
          <div onClick={close} style={sx("cursor:pointer; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
          <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>나의 마음 성향</div>
            <div style={sx("font-size:11px; color:#8ba8b3")}>{s.personaPage === 1 ? "성향과 위로" : "문장과 책"} · {s.personaPage}/2</div>
          </div>
        </div>
        <div style={sx("flex:1; overflow-y:auto; padding:18px 20px 28px; display:flex; flex-direction:column; gap:14px")}>
          {s.personaPage === 1 ? (
            <>
              <div style={sx("display:flex; flex-direction:column; align-items:center; gap:6px; padding:22px 16px; border-radius:22px; background:linear-gradient(120deg,#e9f7f1 0%,#e6f0fb 100%); border:1px solid #c5e3d6")}>
                <div style={sx("font-size:34px; font-weight:800; color:#245c48; letter-spacing:0.04em")}>{done.type}</div>
                <div style={sx("font-size:17px; font-weight:700; color:#2d7a5f")}>{t.name}</div>
              </div>
              {/* 기울기 — 막대만, 숫자·% 없음(앱 원칙). 가운데가 중립. 직접 고른 유형(lean null)엔 그릴 근거가 없어 안 그린다. */}
              {done.lean && <div style={sx(card)}>
                {axes.map(({ key, left, right }) => {
                  const v2 = done.lean![key]; // -1~1 · 양수 = 왼쪽(앞 글자)
                  const w = Math.round(Math.abs(v2) * 50);
                  return (
                    <div key={key} style={sx("display:flex; flex-direction:column; gap:4px")}>
                      <div style={sx("display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#2d5c6e")}><span style={{ opacity: v2 >= 0 ? 1 : 0.45 }}>{left}</span><span style={{ opacity: v2 < 0 ? 1 : 0.45 }}>{right}</span></div>
                      <div style={sx("position:relative; height:9px; border-radius:999px; background:#eef3f5")}>
                        <div style={sx("position:absolute; left:50%; top:-2px; width:1px; height:13px; background:#c9d6dc")} />
                        <div style={{ ...sx("position:absolute; top:0; height:100%; border-radius:999px; background:#7a6bc4"), left: v2 >= 0 ? `${50 - w}%` : "50%", width: `${w}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>}
              {!done.lean && <div style={sx("font-size:12px; color:#8ba8b3; line-height:1.6; text-wrap:pretty; padding:0 4px")}>직접 고른 유형이에요 · 40문항 테스트를 하면 네 축의 기울기도 함께 보여요.</div>}
              <div style={sx(card)}>
                <div style={sx("font-size:13px; font-weight:800; color:#2d5c6e")}>이런 편이에요</div>
                <div style={sx("font-size:14px; color:#3a4a72; line-height:1.75; text-wrap:pretty")}>{t.traits}</div>
              </div>
              <div style={{ ...sx(card), background: "#f2edfa", borderColor: "#cfc5ea" }}>
                <div style={sx("font-size:13px; font-weight:800; color:#4a3f80")}>위로 한 조각</div>
                <div style={sx("font-size:14px; color:#4a3f80; line-height:1.75; text-wrap:pretty")}>{t.comfort}</div>
              </div>
              <div onClick={() => patch({ personaPage: 2 })} style={sx("cursor:pointer; text-align:center; padding:14px; border-radius:15px; background:#7a6bc4; color:#fff; font-size:14.5px; font-weight:800")}>다음 ›</div>
            </>
          ) : (
            <>
              <div style={{ ...sx(card), background: "#fff7ed", borderColor: "#f3c98b" }}>
                <div style={sx("font-size:13px; font-weight:800; color:#7a4a00")}>마음과 닮은 문장</div>
                <div style={sx("font-size:16px; font-weight:600; color:#7a4a00; line-height:1.7; text-wrap:pretty")}>{t.quote}</div>
              </div>
              <div style={sx(card)}>
                <div style={sx("font-size:13px; font-weight:800; color:#2d5c6e")}>추천 도서</div>
                {t.books.map((b) => (
                  <a key={b} href={bookSearchUrl(b)} target="_blank" rel="noreferrer" style={sx("display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:14px; color:#3a4a72; line-height:1.6; text-decoration:none")}>
                    <span>{b}</span><span style={sx("flex:none; font-size:11.5px; font-weight:700; color:#03c75a")}>네이버에서 보기 ›</span>
                  </a>
                ))}
              </div>
              {renderMusicCard()}
              <div style={sx("font-size:11.5px; color:#8ba8b3; line-height:1.6; text-wrap:pretty; padding:0 4px")}>{PERSONA_SOURCE}</div>
              <div style={sx("font-size:12px; font-weight:600; color:#6b8c9a; line-height:1.6; text-wrap:pretty; padding:0 4px")}>{PERSONA_NOTICE}</div>
              {/* 버튼은 「유형 바꾸기 · 닫기」 둘만 — 결과 화면 끝의 「테스트로/다시 하기」는 사용자 지시로 뺐다(2026-09-19). 테스트 입구는 카드·격자 화면에만. */}
              <div style={sx("display:flex; gap:8px; padding-top:4px")}>
                <div onClick={() => patch({ sheet: "personaPick" })} style={sx("cursor:pointer; flex:1; text-align:center; padding:13px; border-radius:14px; background:#fff; border:1.5px solid #cfc5ea; color:#7a6bc4; font-size:14px; font-weight:800")}>유형 바꾸기</div>
                <div onClick={close} style={sx("cursor:pointer; flex:1; text-align:center; padding:13px; border-radius:14px; background:#7a6bc4; color:#fff; font-size:14px; font-weight:800")}>닫기</div>
              </div>
              <div onClick={() => patch({ personaPage: 1 })} style={sx("cursor:pointer; text-align:center; font-size:13px; font-weight:700; color:#7a6bc4; padding:6px")}>‹ 앞 장</div>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderRecords(inSheet = false) {
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

    const body = (
      <div style={{ ...sx("flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:13px; padding:14px 20px"), paddingBottom: inSheet ? 28 : 96 }}>
        {/* 시트로 열 때는 위 머리줄이 제목을 맡으므로 여기 제목은 안 그린다. */}
        {!inSheet && <div style={sx("font-size:22px; font-weight:700; color:#2d5c6e; letter-spacing:-0.025em; padding-top:6px")}>나의 기록</div>}

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
    if (!inSheet) return body;
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(175deg,#fdfbff 0%,#f4f8fc 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; padding:48px 16px 12px; display:flex; align-items:center; gap:11px; background:#fff; border-bottom:1px solid #d9d2ec")}>
          <div onClick={() => patch({ sheet: null })} style={sx("cursor:pointer; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
          <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>월간 기록</div>
            <div style={sx("font-size:11px; color:#8ba8b3")}>달을 넘겨 볼 수 있어요 · my 탭과 같은 화면</div>
          </div>
        </div>
        {body}
      </div>
    );
  }

  /**
   * 설정 — 2026-09-13 사용자 지시로 **아래 탭에서 빠지고 상단 톱니(「설정」 글자 포함)가 여는 시트**가 됐다.
   * ⚠ 시트 자리에 그냥 두면 덮이지 않고 아래에 쌓인다(실측) → 다른 시트들처럼 `position:absolute; inset:0` 껍데기가 필요하다.
   */
  function renderSettings() {
    // 2026-09-16: 2단계(숨 고르기)를 「낮은 강도」로 뭉개 보이던 것을 셋으로 갈랐다.
    const parqStatus = !v.parqAll ? "미완료" : v.tier === 2 ? "숨 고르기만" : v.tier === 1 ? "낮은 강도" : "평소 강도";
    return (
      <div style={sx("position:absolute; inset:0; background:linear-gradient(180deg,#fdfbff 0%,#f4f8fc 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
        <div style={sx("flex:none; padding:48px 16px 12px; display:flex; align-items:center; gap:11px; background:#fff; border-bottom:1px solid #d9d2ec")}>
          <div onClick={() => patch({ sheet: null })} style={sx("cursor:pointer; font-size:20px; color:#7a6bc4; padding:0 4px 0 0")}>‹</div>
          <div style={sx("flex:1; min-width:0; font-size:15px; font-weight:700; color:#2d5c6e")}>설정</div>
        </div>
      <div style={sx("flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:16px; padding:14px 20px 28px")}>

        <div style={sx("display:flex; flex-direction:column; gap:10px; padding:18px; border-radius:18px; background:#f2edfa; border:1px solid #c9d6dc")}>
          <div style={sx("font-size:14px; font-weight:700; color:#2d5c6e")}>개인정보 3대 원칙</div>
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
          <div onClick={() => patch({ ob: OB_AT.parq, parq: {}, parq2: {}, delay: {}, parqOnly: true })} style={sx("cursor:pointer; display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid #eef4f6")}>
            <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:3px")}>
              <div style={sx("font-size:14px; font-weight:600; color:#2d5c6e")}>안전 확인 다시 답하기</div>
              <div style={sx("font-size:12px; color:#8ba8b3")}>안전 확인 9문항 + 후속 · 활동 강도 기준</div>
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
          <div onClick={() => { writeChatStore(clearAllChats()); patch({ wiped: true }); }} style={sx("cursor:pointer; text-align:center; padding:14px; border-radius:13px; border:1.5px solid #c9d6dc; background:#f6fafb; font-size:14px; font-weight:700; color:#2d5c6e")}>{s.wiped ? "모두 지웠어요" : "전체 파기하기"}</div>
          <div onClick={() => { writeChatStore(clearAllChats()); patchFn((st) => ({ chat: [{ role: "bot", text: characterOf(st.character).intro, at: stampAt(0, st.now) }], riskShown: false, beat: 0 })); }} style={sx("cursor:pointer; text-align:center; padding:14px; border-radius:13px; border:1.5px solid #c9d6dc; background:#fff; font-size:14px; font-weight:700; color:#2d5c6e")}>이 기기 대화 전부 지우기</div>
        </div>

        <div style={sx("display:flex; gap:10px; padding:4px 0 8px")}>
          <div onClick={() => patch({ ob: 0 })} style={sx("flex:1; cursor:pointer; text-align:center; min-height:46px; display:flex; align-items:center; justify-content:center; border-radius:13px; background:#fff; border:1px solid #c9d6dc; font-size:13px; font-weight:600; color:#8ba8b3")}>온보딩 다시 보기</div>
          <div onClick={() => { writeChatStore(clearAllChats()); patch({ authed: false, guest: true, loginId: "", loginPw: "", ob: 0, tab: "home", sheet: null }); }} style={sx("flex:1; cursor:pointer; text-align:center; min-height:46px; display:flex; align-items:center; justify-content:center; border-radius:13px; background:#fff; border:1px solid #c9d6dc; font-size:13px; font-weight:600; color:#8ba8b3")}>로그아웃</div>
        </div>
      </div>
      </div>
    );
  }

  /** 아래 탭 — 홈 · 데일리케어 · my. 설정은 상단 톱니로 빠졌다(2026-09-13 사용자 지시). */
  function renderTabs() {
    const ink = (t: State["tab"]) => (s.tab === t ? "#7a6bc4" : "#b5c8d0");
    const tab = (t: State["tab"], label: string, icon: (c: string) => React.ReactNode) => {
      const c = ink(t);
      return (
        <div onClick={() => patch({ tab: t })} style={sx("flex:1; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:5px")}>
          {icon(c)}
          <div style={{ ...sx("font-size:11px; font-weight:600"), color: c }}>{label}</div>
        </div>
      );
    };
    return (
      <div style={sx("position:absolute; left:0; right:0; bottom:0; display:flex; align-items:center; padding:10px 16px 26px; background:rgba(255,255,255,0.96); border-top:1px solid #eaf2f5; backdrop-filter:blur(12px)")}>
        {tab("home", "홈", (c) => <div style={{ ...sx("width:20px; height:20px; border-radius:6px; border:2px solid"), borderColor: c }} />)}
        {tab("daily", "케어&힐링", (c) => (
          <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
            <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z" />
          </svg>
        ))}
        {tab("my", "my", (c) => (
          <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
            <circle cx="12" cy="8.5" r="3.4" />
            <path d="M5 19.5c1.1-3.3 3.7-5 7-5s5.9 1.7 7 5" />
          </svg>
        ))}
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
                {/* 유형×시간대 한 줄(마음온도 「디렉팅」에서 골라 온 자리) — 유형이 있을 때만. 판정엔 안 들어가고 말투만(persona.ts 머리 주석). */}
                {s.personaDone && <div style={sx("font-size:13.5px; font-weight:600; line-height:1.7; color:#5f5397; text-wrap:pretty; padding:10px 12px; border-radius:12px; background:#f2edfa; border:1px solid #cfc5ea")}>{PERSONA_TYPES[s.personaDone.type].name} · {personaDirecting(s.personaDone.type, s.now.getHours())}</div>}
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
            <div style={sx("font-size:14px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>{item.desc + " 1분만 채워도 오늘 몫은 다 한 거예요. 더 걷고 싶으시면 시간을 늘리셔도 좋아요."}</div>
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
              <div key={pg.id} onClick={() => { if (timerRef.current) clearInterval(timerRef.current); patch({ sheet: "content", program: pg, pick: null, minutes: pg.min, remaining: pg.min * 60, running: false }); }} style={sx("cursor:pointer; display:flex; align-items:center; gap:13px; padding:15px 16px; border-radius:18px; background:#fff; border:1px solid #e2cec7; box-shadow:0 2px 8px rgba(196,150,140,0.08)")}>
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
    patchFn((st) => {
      // 2026-09-19: 계정 로그인이면 그 캐릭터의 지난 대화를 기기에서 이어간다(같은 상대 다시 눌러도 이어짐). 둘러보기는 늘 새 대화.
      const saved = !st.guest ? readChatStore().byCharacter[id] : undefined;
      const chat = saved && saved.length ? saved : [{ role: "bot" as const, text: c.intro, at: stampAt(0, st.now) }];
      return { sheet: "talk", character: id, beat: 0, typing: false, riskShown: saved?.some((m) => m.risk) ?? false, chat };
    });
  }

  /** 대화 지우기 — 그 캐릭터의 기기 저장 삭제 + 화면은 첫 인사부터. */
  function clearTalk(id: CharacterId) {
    writeChatStore(clearCharacterChat(readChatStore(), id));
    const c = characterOf(id);
    patchFn((st) => ({ beat: 0, typing: false, riskShown: false, chat: [{ role: "bot", text: c.intro, at: stampAt(0, st.now) }] }));
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
            {(() => {
              // 칸 수는 캐릭터 수를 따라가되 **한 줄에 다섯까지**.
              // ⚠ 실측: 여섯을 한 줄에 놓으면 지름이 41px 로 떨어진다 — 탭 최소 44px 미만이고 얼굴도 안 보인다.
              //   여섯부터는 3열 2줄(지름 ~100px). 🚫 캐릭터 수를 코드에 못박지 말 것.
              const cols = CHARACTERS.length <= 5 ? CHARACTERS.length : 3;
              return (
            <div style={{ ...sx("display:grid; gap:12px; padding:0 2px"), gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {charactersInDisplayOrder().map((c) => {
                // 전부 같은 흰 테두리 — 「지난번 상대」 보라 링은 뺀다(사용자 지시). 누르면 바로 새 대화라 고른 상태가 없다.
                // ★ 칸 수는 캐릭터 수를 따라간다 — 4개로 못박아 두면 한 명 늘 때 마지막 한 장이 혼자 다음 줄로 내려간다.
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
              );
            })()}
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

  /** 주간 흐름 막대 + 범례 — 2026-09-17 사용자 지시로 「주간 기록 보기」 시트를 없애고 홈 박스에 둔다(footer = 「월간 기록 보기」 버튼). */
  function renderWeekFlow(footer: React.ReactNode) {
    const flow = v.cond.weekFlow;
    const oc = v.cond.dayOverall ? LEVEL_COLOR[v.cond.dayOverall] : { bg: "#eef3f5", fg: "#6b8c9a" };
    const dowLabels = (() => {
      // 이번 주 흐름 라벨: 어제로 끝나는 flow.length 일치 요일
      const d = new Date(s.now.getFullYear(), s.now.getMonth(), s.now.getDate() - 1);
      const names = ["일", "월", "화", "수", "목", "금", "토"];
      return flow.map((_, i) => names[(d.getDay() - (flow.length - 1 - i) + 14) % 7]);
    })();
    return (
      <div style={{ ...sx("display:flex; flex-direction:column; gap:10px; padding:15px 16px 13px; border-radius:18px; border:2px solid rgba(45,92,110,0.45)"), background: oc.bg }}>
            <div style={{ ...sx("font-size:12.5px; font-weight:700; opacity:0.8; "), color: oc.fg }}>이번 주 흐름</div>
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
        {footer}
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
              <div style={sx("font-size:11px; color:#8ba8b3")}>{s.guest ? "둘러보기 중엔 대화가 저장되지 않아요" : "대화는 이 기기에만 저장돼요 · 서버에는 남지 않아요"}</div>
            </div>
            {!s.guest && s.chat.length > 1 && (
              <div onClick={() => clearTalk(s.character)} style={sx("cursor:pointer; flex:none; font-size:11.5px; font-weight:700; color:#8ba8b3; border:1px solid #c9d6dc; border-radius:999px; padding:5px 10px; background:#fff")}>대화 지우기</div>
            )}
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
