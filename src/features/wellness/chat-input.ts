/** 한글 확정 Enter와 전송 Enter를 구분한다. Safari의 조합 종료 키는 229일 수 있다. */
export function shouldSubmitChatKey(event: {
  key: string;
  isComposing?: boolean;
  keyCode?: number;
  repeat?: boolean;
}, composing: boolean): boolean {
  return event.key === "Enter" && !composing && !event.isComposing && event.keyCode !== 229 && !event.repeat;
}
