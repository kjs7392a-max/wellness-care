import type { Turn } from "./chat-store";

export type Evidence = { turn: number; quote: string };
export const INTENTS = ["new_topic", "elaborating", "answering", "acknowledging", "repeating", "closing_topic", "ending", "asking_advice"] as const;
export type Intent = typeof INTENTS[number];
export type Observation = {
  topic: Evidence;
  intent: Intent;
  newDetail: Evidence | null;
  facts: Evidence[];
  feelings: Evidence[];
  followUp: { text: string; basis: Evidence; alreadyAskedOrAnswered: boolean } | null;
  bridge: Evidence | null;
  signals: Evidence[];
  safety: { level: "none" | "check" | "urgent"; evidence: Evidence | null };
};
export type Action = "acknowledge" | "invite" | "bridge" | "close" | "offer" | "safety_check" | "safety_support";
export type Plan = { action: Action; question: string | null; bridge: Evidence | null; reason: string };

const object = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const evidenceSchema = object({ turn: { type: "integer" }, quote: { type: "string" } });
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });
const evidenceArray = { type: "array", items: evidenceSchema };
export const OBSERVATION_SCHEMA = object({
  topic: evidenceSchema,
  intent: { type: "string", enum: [...INTENTS] },
  newDetail: nullable(evidenceSchema),
  facts: evidenceArray,
  feelings: evidenceArray,
  followUp: nullable(object({ text: { type: "string" }, basis: evidenceSchema, alreadyAskedOrAnswered: { type: "boolean" } })),
  bridge: nullable(evidenceSchema),
  signals: evidenceArray,
  safety: object({ level: { type: "string", enum: ["none", "check", "urgent"] }, evidence: nullable(evidenceSchema) }),
});

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid-observation");
  return value as Record<string, unknown>;
}
function evidence(value: unknown, turns: Turn[]): Evidence {
  const e = record(value);
  if (!Number.isInteger(e.turn) || typeof e.quote !== "string" || !e.quote.trim() || e.quote.length > 500) throw new Error("invalid-evidence");
  const turn = turns[e.turn as number];
  if (!turn || turn.role !== "me" || !turn.text.includes(e.quote)) throw new Error("ungrounded-evidence");
  return { turn: e.turn as number, quote: e.quote };
}
export function parseObservation(value: unknown, turns: Turn[]): Observation {
  const o = record(value);
  if (!INTENTS.includes(o.intent as Intent)) throw new Error("invalid-intent");
  const optional = (v: unknown) => v === null ? null : evidence(v, turns);
  const list = (v: unknown): Evidence[] => {
    if (!Array.isArray(v) || v.length > 12) throw new Error("invalid-evidence-list");
    return v.map((e) => evidence(e, turns));
  };
  const topic = evidence(o.topic, turns);
  const newDetail = optional(o.newDetail);
  if (newDetail && newDetail.turn !== turns.length - 1) throw new Error("stale-new-detail");
  const bridge = optional(o.bridge);
  if (bridge && (bridge.turn >= turns.length - 1 || bridge.quote === topic.quote)) throw new Error("invalid-bridge");
  let followUp: Observation["followUp"] = null;
  if (o.followUp !== null) {
    const q = record(o.followUp);
    if (typeof q.text !== "string" || q.text.length > 65 || !q.text.trim() || typeof q.alreadyAskedOrAnswered !== "boolean") throw new Error("invalid-followup");
    if ((q.text.match(/[?？]/gu) ?? []).length !== 1 || !/[?？]$/.test(q.text.trim())) throw new Error("invalid-followup-question");
    followUp = { text: q.text.trim(), basis: evidence(q.basis, turns), alreadyAskedOrAnswered: q.alreadyAskedOrAnswered };
  }
  const safety = record(o.safety);
  if (!["none", "check", "urgent"].includes(safety.level as string)) throw new Error("invalid-safety");
  const safetyEvidence = optional(safety.evidence);
  if (safety.level !== "none" && !safetyEvidence) throw new Error("ungrounded-safety");
  return { topic, intent: o.intent as Intent, newDetail, facts: list(o.facts), feelings: list(o.feelings), followUp, bridge, signals: list(o.signals), safety: { level: safety.level as Observation["safety"]["level"], evidence: safetyEvidence } };
}

export const hasQuestion = (s: string): boolean => /[?？]|(?:인가요|일까요|어떤가요)\s*$/u.test(s.trim());
const compact = (s: string) => s.replace(/[\s\p{P}]/gu, "");
export function selectPlan(o: Observation, turns: Turn[]): Plan {
  const bots = turns.filter((t) => t.role === "bot");
  const last = bots.at(-1)?.text ?? "";
  const plan = (action: Action, reason: string, question: string | null = null, bridge: Evidence | null = null): Plan => ({ action, reason, question, bridge });
  // Safety signals never force a diagnosis, and take priority over topic rhythm.
  if (o.safety.level === "urgent") return plan("safety_support", "contextual-safety");
  if (o.safety.level === "check") return plan("safety_check", "clarify-safety", "지금 스스로를 해칠 생각이 있으세요?");
  if (o.intent === "ending") return plan("close", "user-ended");
  if (o.intent === "closing_topic" || (o.intent === "repeating" && !o.newDetail)) return plan("bridge", "topic-complete", null, o.bridge);
  if (o.intent === "asking_advice") return plan("offer", "explicit-advice-request");
  const candidate = o.followUp;
  const repeated = candidate && bots.some((t) => compact(t.text).includes(compact(candidate.text)));
  const recentQuestions = bots.slice(-3).filter((t) => hasQuestion(t.text)).length;
  const canAsk = !hasQuestion(last) && recentQuestions < 2;
  if (candidate && !candidate.alreadyAskedOrAnswered && !repeated && canAsk &&
      (o.newDetail || o.intent === "new_topic" || o.intent === "acknowledging")) {
    return plan("invite", "unexplored-detail", candidate.text);
  }
  return plan("acknowledge", hasQuestion(last) ? "listen-after-question" : "leave-room");
}
