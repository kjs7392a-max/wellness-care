# Wellness dialogue engine

The chat route reconstructs state from the most recent 32 turns, using a structured model observation. Every fact and safety signal must quote an actual user turn; assistant guesses are not user evidence. No observation/state payload is returned to the client or persisted on the server.

`dialogue-state.ts` selects a response action: acknowledge, invite, bridge, close, offer, safety check, or safety support. It prioritizes safety and explicit user endings, suppresses consecutive questions and previously asked/answered question candidates, and distinguishes a short acknowledgment from ending a topic. Semantic interpretation still depends on the model and is not a clinical assessment.

`dialogue-engine.ts` asks the writer for the reaction only. Code appends the planned question exactly once. A topic closure without a grounded alternate topic gets a short invitation to other conversation. The assembled reply is checked for completion, length (72 code points), at most two sentences, question policy, and recent repetition. Failed text is regenerated once, never truncated. Persistent failure produces an honest connection message; immediate safety support keeps its full existing response.

The observer and writer each have bounded calls. Normal replies require two model calls; retries add latency. Diagnostics log only stage/error codes, never request or response bodies. Existing legacy SYSTEM_CORE/systemPromptFor prompts are not on this route's production generation path.

## Validation on 2026-11-02

- 383 unit/integration tests and TypeScript passed; production build passed.
- Fifteen-turn browser scenario covered relationship stress, short agreement, correction, topic closure, positive plans, and ending. Intermediate versions exposed strict planned-question generation failures; this motivated code-level question assembly.
- After the final change, turns 11–15 completed without failures, including topic closure and ending, in roughly 11–21 seconds. This is a small synthetic sample, not a production reliability or clinical safety evaluation.
- Browser visual check showed final replies within three lines in the app's current phone layout. Line wrapping can vary with font/viewport/accessibility settings.
- Korean composition handling has unit coverage for isComposing, composition state, keyCode 229, and repeated Enter. Browser fill tests do not simulate an actual Korean IME.

Run `npm test` and `npx tsc --noEmit --incremental false`. Recheck multi-turn cases when changing model, observer schema, or response policy; a one-turn snapshot cannot establish conversation quality.
