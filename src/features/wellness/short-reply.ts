/** Shared display helpers; no sentence clipping. Generation policy lives on the server. */
export const REPLY_MAX_CHARS = 72;
export const REPLY_UNAVAILABLE = "답변 연결이 원활하지 않아요. 잠시 후 다시 보내 주세요.";
export const normalizeReply = (text: string): string => text.replace(/\s+/gu, " ").trim();
