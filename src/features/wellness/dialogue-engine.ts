import type { Turn } from "./chat-store";
import { parseObservation, selectPlan, type Observation, type Plan, hasQuestion } from "./dialogue-state";
import { OBSERVER_PROMPT, writerPrompt } from "./dialogue-prompts";

import { REPLY_MAX_CHARS, normalizeReply } from "./short-reply";
export type Draft = { text: string; complete: boolean };
export interface DialogueTransport {
  observe(system: string, turns: Turn[]): Promise<Draft>;
  write(system: string, turns: Turn[]): Promise<Draft>;
}
export type DialogueResult = {
  reply: string;
  plan: Plan;
  observation: Observation;
  attempts: number;
  repairedIssues: string[];
} | { risk: true; plan: Plan; observation: Observation };

const normalized = (s: string) => s.replace(/[\s\p{P}]/gu, "");
function similarity(a: string, b: string): number {
  const grams = (v: string) => new Set(Array.from(v).slice(1).map((c, i) => v[i] + c));
  const x = grams(normalized(a)), y = grams(normalized(b));
  if (!x.size || !y.size) return a === b ? 1 : 0;
  return 2 * [...x].filter((g) => y.has(g)).length / (x.size + y.size);
}
export function sentenceCount(text: string): number {
  return [...new Intl.Segmenter("ko", { granularity: "sentence" }).segment(text)].filter((s) => s.segment.trim()).length;
}
export function replyIssues(draft: Draft, plan: Plan, turns: Turn[]): string[] {
  const text = normalizeReply(draft.text);
  const issues: string[] = [];
  if (!draft.complete) issues.push("incomplete");
  if (!text) issues.push("empty");
  if (Array.from(text).length > REPLY_MAX_CHARS || sentenceCount(text) > 2 || /\n\s*\n/.test(draft.text)) issues.push("too-long");
  if (/^(?:[-*#]|\d+[.)]|```|\{)/u.test(text)) issues.push("not-conversation");
  const questions = (text.match(/[?？]/gu) ?? []).length;
  if (plan.question) {
    if (!text.includes(plan.question) || questions !== 1) issues.push("missing-planned-question");
  } else if (questions || hasQuestion(text)) issues.push("unplanned-question");
  if (turns.filter((t) => t.role === "bot").slice(-3).some((t) => similarity(text, t.text) > 0.88)) issues.push("repeated-reply");
  if (/우울증(?:입니다|이에요|이네요)|(?:점수|등급|확률)는?\s*\d/u.test(text)) issues.push("diagnostic-claim");
  return issues;
}

/** Stateless: reconstruct from bounded messages for this request; do not persist or return observations to the UI. */
export async function runDialogue(transport: DialogueTransport, turns: Turn[], character: unknown, month: number): Promise<DialogueResult> {
  let observation: Observation | undefined;
  let observationIssue = "invalid-observation";
  for (let attempt = 0; attempt < 2; attempt++) {
    const draft = await transport.observe(OBSERVER_PROMPT + (attempt ? `\n앞 출력 검증에 실패했습니다(${observationIssue}). 모든 인용과 turn을 원문과 정확히 대조하고 필수 필드를 빠짐없이 채우세요.` : ""), turns);
    if (!draft.complete) { observationIssue = "incomplete"; continue; }
    try { observation = parseObservation(JSON.parse(draft.text), turns); break; }
    catch (error) {
      const code = error instanceof Error ? error.message : "";
      observationIssue = /^(?:invalid-(?:observation|evidence|intent|evidence-list|bridge|followup|followup-question|safety)|ungrounded-(?:evidence|safety)|stale-new-detail)$/.test(code) ? code : "invalid-json";
    }
  }
  if (!observation) {
    console.warn("[dialogue] observation rejected", observationIssue);
    throw new Error("observation-validation-failed");
  }
  const plan = selectPlan(observation, turns);
  if (plan.action === "safety_support") return { risk: true, plan, observation };
  const base = writerPrompt(character, month, observation, plan);
  let issues: string[] = [];
  const repairedIssues: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const correction = attempt ? `\n이전 출력의 문제: ${issues.join(", ")}. 선택한 행동과 질문을 유지하되 질문은 프로그램이 붙이므로 출력하지 마세요. 물음표나 의문형 없이 짧은 반응 한 문장만 새로 쓰세요. 앞 문장을 잘라내지 마세요.` : "";
    const transition = plan.action === "bridge" && !plan.bridge ? "다른 이야기도 편하게 해주세요." : "";
    const suffix = plan.question ?? transition;
    const budget = REPLY_MAX_CHARS - Array.from(suffix).length - (suffix ? 1 : 0);
    const reaction = await transport.write(`${base}\n반응 부분만 최대 ${budget}자, ${suffix ? "한 문장" : "두 문장"} 이하로 쓰세요. 질문이나 물음표는 쓰지 마세요.${correction}`, turns);
    const draft = { ...reaction, text: [normalizeReply(reaction.text), suffix].filter(Boolean).join(" ") };
    issues = replyIssues(draft, plan, turns);
    if (!issues.length) return { reply: normalizeReply(draft.text), plan, observation, attempts: attempt + 1, repairedIssues };
    repairedIssues.push(...issues);
  }
  // Do not turn a failed rewrite into a clipped reflection, or silently lose a safety check.
  if (plan.action === "safety_check") return { reply: plan.question!, plan, observation, attempts: 2, repairedIssues };
  console.warn("[dialogue] reply rejected", issues.join(","));
  throw new Error("reply-validation-failed");
}
