/** 홈 인사말 — 접속 시각에 맞춘다(2026-09-17 사용자 지시 · 전엔 「오늘도 한 걸음 왔네요」 고정). 순수 · 테스트 greeting.test.ts */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 11) return "좋은 아침이에요";
  if (hour >= 11 && hour < 14) return "점심은 잘 챙기셨어요?";
  if (hour >= 14 && hour < 18) return "오후도 잘 버티고 계세요";
  if (hour >= 18 && hour < 22) return "오늘 하루도 고생 많으셨어요";
  return "이제 쉬어도 되는 시간이에요";
}
