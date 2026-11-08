import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { riskLevel, RISK_REPLY } from "@/features/wellness/risk";
import { HISTORY_LIMIT, type Turn } from "@/features/wellness/chat-store";
import { runDialogue } from "@/features/wellness/dialogue-engine";
import { anthropicDialogue } from "@/features/wellness/dialogue-anthropic";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Server-only observation → policy → writing. No conversation/state payload is logged or persisted. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const value: unknown = await req.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid-body");
    body = value as Record<string, unknown>;
  } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  if (typeof body.message !== "string" || !body.message.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });
  const message = body.message.trim();
  if (message.length > 8000) return NextResponse.json({ error: "message too long" }, { status: 400 });
  // Existing immediate safety gate remains ahead of all model calls.
  if (riskLevel(message) === 2) return NextResponse.json({ risk: true, reply: RISK_REPLY });
  const history: Turn[] = [];
  for (const raw of Array.isArray(body.history) ? body.history.slice(-HISTORY_LIMIT) : []) {
    if (!raw || typeof raw !== "object") continue;
    const t = raw as Record<string, unknown>;
    if ((t.role !== "me" && t.role !== "bot") || typeof t.text !== "string" || !t.text.trim() || t.text.length > 8000) continue;
    history.push({ role: t.role, text: t.text.trim() });
  }
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("missing-key");
    const month = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", month: "numeric" }).format(new Date()));
    const result = await runDialogue(anthropicDialogue(new Anthropic({ apiKey })), [...history, { role: "me", text: message }], body.character, month);
    if ("risk" in result) return NextResponse.json({ risk: true, reply: RISK_REPLY });
    return NextResponse.json({ reply: result.reply });
  } catch {
    // Do not log SDK errors: they can contain request/response text. No fabricated fallback conversation.
    console.warn("[wellness/chat] dialogue unavailable");
    return NextResponse.json({ fallback: true });
  }
}
