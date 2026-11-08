import Anthropic from "@anthropic-ai/sdk";
import type { Turn } from "./chat-store";
import { OBSERVATION_SCHEMA } from "./dialogue-state";
import type { DialogueTransport, Draft } from "./dialogue-engine";

function draft(message: Anthropic.Message): Draft {
  return { text: message.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim(), complete: message.stop_reason === "end_turn" };
}
function messagesFor(turns: Turn[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  for (const turn of turns) {
    const role = turn.role === "me" ? "user" : "assistant";
    if (!messages.length && role === "assistant") continue;
    const last = messages.at(-1);
    if (last?.role === role) last.content = `${last.content}\n${turn.text}`;
    else messages.push({ role, content: turn.text });
  }
  return messages;
}
async function requestDraft(stage: "observe" | "write", request: () => Promise<Anthropic.Message>): Promise<Draft> {
  try { return draft(await request()); }
  catch (error) {
    const kind = error instanceof Anthropic.APIConnectionTimeoutError ? "timeout" : error instanceof Anthropic.APIError ? `http-${error.status ?? "unknown"}` : "transport";
    console.warn("[dialogue] request failed", stage, kind);
    throw error;
  }
}
export function anthropicDialogue(api: Anthropic): DialogueTransport {
  return {
    async observe(system, turns) {
      return requestDraft("observe", () => api.messages.create({
        model: "claude-sonnet-5", max_tokens: 1800, system,
        messages: [{ role: "user", content: JSON.stringify(turns.map((t, i) => ({ turn: i, ...t }))) }],
        output_config: { format: { type: "json_schema", schema: OBSERVATION_SCHEMA } },
      }, { timeout: 35000, maxRetries: 0 }));
    },
    async write(system, turns) {
      return requestDraft("write", () => api.messages.create({ model: "claude-sonnet-5", max_tokens: 400, system, messages: messagesFor(turns) }, { timeout: 20000, maxRetries: 0 }));
    },
  };
}
