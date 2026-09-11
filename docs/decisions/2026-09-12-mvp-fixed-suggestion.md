# MVP 시연용 「AI 오늘의 제안」 고정 (2026-09-12)

## 결정
시연 시각이 **평일 16:30~17:30** 이라 홈 「AI 오늘의 제안」과 「지금 바로 시작하기」를
**「퇴근 전 어깨·목 풀기」(가이드 영상 있음) 하나로 고정**한다. 시각·요일·직군에 따라 제안이
달라지던 원래 설계는 **지우지 않고 플래그 뒤에 남긴다.**

- 플래그: `src/features/wellness/suggestion.ts` → `MVP_FIXED_SUGGESTION = true`
- 고정값: 교사 직군 3번째 항목(`ROLES.teacher.items[2]`), PAR-Q 해당자는 저강도판(`low[2]`) — 둘 다 같은 영상.
- 고정 시 `slot = 2`(퇴근 전 문구 세트) · `isWeekend = false`(주말이어도 제목의 "퇴근 전 "을 떼지 않고, 쉬는 날 문구로 바뀌지 않는다).

## 원래 설계 (복원 시 돌아오는 동작)
| 축 | 규칙 | 정의처 |
|---|---|---|
| 시간대 | 11시 전 `slot 0` · 15시 전 `slot 1` · 그 뒤 `slot 2` | `data.ts slotForHour` |
| 직군 | `ROLES[직군].items[slot]` — 교사·행정·급식/보건/조리 각 3개 | `data.ts ROLES` |
| PAR-Q | 해당 항목이 하나라도 있으면 `.low[slot]`(저강도판) | `suggestion.ts` |
| 주말 | 제목에서 "퇴근 전 " 제거 + 제안 문구가 쉬는 날용 | `WellnessApp.tsx compute / renderHome` |
| 제안 문구 | `LEAD_IN[slot] + BODY[직군][slot] + 날씨별 마무리` | `WellnessApp.tsx renderHome daySolution` |

⚠ 제안 **문구**(`daySolution`)의 직군별 본문은 고정하지 않았다 — 직군 선택은 자세 카드 등 다른 화면도 쓰므로
그대로 두고, `slot=2` 로만 묶어 "퇴근 전" 톤이 유지되게 했다.

## 복원 절차
1. `suggestion.ts` 의 `MVP_FIXED_SUGGESTION` 을 `false` 로.
2. `suggestion.test.ts` 의 「플래그가 켜져 있다」 단언을 `false` 로 바꾸거나 삭제.
3. 끝. 나머지 코드는 플래그 off 경로가 원래 설계 그대로다(테스트 「원래 설계(플래그 off)」가 지킨다).
