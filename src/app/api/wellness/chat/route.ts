import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { riskLevel, RISK_REPLY } from "@/features/wellness/risk";
import { systemPromptFor } from "@/features/wellness/characters";
import { HISTORY_LIMIT } from "@/features/wellness/chat-store";

export const runtime = "nodejs";

/**
 * 「마음과 대화」 서버 중계. 캐릭터(character)는 허용 목록으로만 받고 모르면 기본 캐릭터.
 * - API 키는 서버 환경변수(ANTHROPIC_API_KEY)에서만 읽는다. 클라이언트에 노출하지 않는다.
 * - 위험어 판정을 서버에서도 다시 수행한다(클라 단독 판정은 우회 가능하므로 신뢰 불가).
 *   L2면 LLM을 건너뛰고 고정 응답만 반환한다.
 * - 대화는 처리만 하고 저장하지 않는다(개인정보 원칙). 요청 로그에도 본문을 남기지 않는다.
 * - 키 미설정/호출 실패 시 { fallback: true } — 클라이언트가 시나리오 응답으로 폴백한다.
 */

interface Turn {
  role: "me" | "bot";
  text: string;
}

interface ChatBody {
  history?: Turn[];
  message?: string;
  /** 캐릭터 id — 서버가 허용 목록으로 검증한다(characterOf). 없거나 모르면 기본 캐릭터. */
  character?: string;
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("no-key");
  return new Anthropic({ apiKey });
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });

  // 서버측 위험어 이중 판정 — 위험이면 LLM 미호출, 고정 응답.
  if (riskLevel(message) === 2) {
    return NextResponse.json({ risk: true, reply: RISK_REPLY });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-HISTORY_LIMIT) : [];
  const month = new Date().getMonth() + 1;
  const system = systemPromptFor(body.character, month);

  // 대화 이력을 messages 형태로 — 연속 같은 role은 없다는 전제(교대 대화). 방어적으로 병합.
  const messages: Anthropic.MessageParam[] = [];
  for (const t of [...history, { role: "me" as const, text: message }]) {
    const role = t.role === "me" ? "user" : "assistant";
    const text = (t.text || "").trim();
    if (!text) continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role) {
      last.content = `${last.content}\n${text}`;
    } else {
      messages.push({ role, content: text });
    }
  }
  // 첫 발화는 반드시 user여야 한다(캐릭터의 인사가 맨 앞이면 제거).
  while (messages.length && messages[0].role === "assistant") messages.shift();
  if (!messages.length) return NextResponse.json({ fallback: true });

  try {
    const msg = await client().messages.create({
      model: "claude-sonnet-5",
      max_tokens: 512,
      system,
      messages,
    });
    const reply = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!reply) {
      // 2026-09-12 라이브 시험 16건 중 1건이 여기로 왔다(오류 없이 빈 본문). 어떤 stop_reason 인지 남긴다(본문은 안 남김).
      console.warn("[wellness/chat] empty reply", { stop: msg.stop_reason, blocks: msg.content.map((b) => b.type) });
      return NextResponse.json({ fallback: true });
    }
    return NextResponse.json({ reply });
  } catch (e) {
    // 키 미설정·쿼터·네트워크 등 — 시나리오 폴백으로 넘긴다.
    // 원인은 로그에 남긴다(대화 본문은 절대 안 남긴다). 2026-09-12 에 라이브가 전부 fallback 인데
    // 로그에 200 만 남아 원인을 알 수 없었다 — 삼키기만 하면 죽은 키와 네트워크 장애를 구분 못 한다.
    const err = e as { status?: number; name?: string; message?: string };
    console.error("[wellness/chat] llm failed", { status: err?.status, name: err?.name, message: String(err?.message || "").slice(0, 200) });
    return NextResponse.json({ fallback: true });
  }
}
