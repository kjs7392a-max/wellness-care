# 마음쉼터 소리 (2026-11-17)

사용자가 소리 듣기를 눌러야 재생한다. 공간을 나가거나 바꾸면 영상과 오디오를 정지하고, 늦게 완료된 play도 정지한다. 세 종교 공간은 다시 들어갈 때 항상 꺼진 상태이며 음량 설정만 이어 쓴다. 명상룸은 기존 영상의 싱잉볼 소리를 유지한다.

## 원본 스트림과 출처

- 불당: Kwan Um School of Zen, Heart Sutra (Korean), version 1. 공식 공개 오디오 플레이어의 MP3를 직접 스트리밍한다. 한국어 한자음 독경이며 앱 서버에 녹음물을 복제하거나 재배포하지 않는다. 공개 페이지가 재배포 라이선스를 명시하지 않아 Commons 음원과 같은 CC 라이선스로 표시하지 않는다. https://kwanumzen.org/resources-collection/2017/9/6/heart-sutra-in-korean
- 교회: Amazing Grace – Choir, Sain (Recordiau) Cyf., 원본 공개 합창 발췌(약30초)를 반복 재생한다. 영어 합창임을 화면에 표시한다. CC BY-SA 3.0, Wikimedia VRT 허가 확인. https://commons.wikimedia.org/wiki/File:Amazing_Grace_-_Choir.ogg
- 성당: Amazing Grace for solo organ, The Uninvited Co., Inc. (2005), 약33초 원본. CC BY-SA 2.5. https://commons.wikimedia.org/wiki/File:Amazing_Grace-organ.ogg

Commons 제공 MP3 변환본을 직접 스트리밍하고 출처·연주자·라이선스 링크를 표시한다. 앱은 음원을 편집하지 않는다. 새 공간 진입 시 소리를 자동으로 시작하지 않으며 preload=none을 사용한다. 외부 원본의 삭제/차단/연결 장애 시 재생 오류와 재시도 안내를 표시한다.

iOS처럼 HTMLMediaElement.volume을 설정할 수 없는 기기에서 별도 외부 오디오는 기기의 음량 버튼을 사용한다. 독경 원본은 CORS 헤더가 없으므로 Web Audio MediaElementSource로 연결하면 무음이 되는 문제를 피하기 위해, 외부 오디오에는 해당 연결을 하지 않는다. 로컬 명상 영상의 기존 Web Audio 음량 처리는 유지한다.

## 교회·성당 순차 재생 (2026-11-17)

- 교회는 Amazing Grace → Abide with Me → Adeste Fideles, 세 합창 발췌를 순환한다. 추가 두 곡은 Llanelli Male Voice Choir / Sain (Recordiau) Cyf., CC BY-SA 3.0이다. 각 약30초 원본 발췌이며 완곡으로 표시하지 않는다.
  - https://commons.wikimedia.org/wiki/File:Abide_With_Me_-_Llanelli_Male_Voice_Choir.ogg
  - https://commons.wikimedia.org/wiki/File:Adeste_Fideles_-_Llanelli_Male_Voice_Choir.ogg
- 성당은 Amazing Grace → 바흐 BWV632 (Mathsci, CC BY4.0, MIDI 오르간 렌더링) → Jesu, du zartes Lämblein (Peter Nahon / Arrastramiente, CC BY-SA4.0), 세 오르간 음원을 순환한다.
  - https://commons.wikimedia.org/wiki/File:BWV_632_organ.ogg
  - https://commons.wikimedia.org/wiki/File:Jesu_Du_zartes_L%C3%A4mblein_-_Peter_Nahon.ogg

곡 종료(ended) 시 다음 곡으로 이동하고, 마지막 곡 다음에는 첫 곡으로 돌아온다. 멈춘 상태에서 다음 곡을 선택하면 곡만 바뀌고 자동 재생하지 않는다. 새 공간 입장 시 첫 곡·소리 꺼짐으로 시작한다. 나가면 기존 RoomPlayback을 폐기하여 늦게 도착한 ended/play 결과도 다음 곡을 재생하지 못하게 한다. 출처와 라이선스는 현재 곡에 맞게 바뀐다. 불당의 독경 한 편 반복과 명상룸 영상 소리는 유지한다.

## 명상룸 음성 안내 (2026-11-19)

영상에 들어 있는 자막 세 줄(편안히 앉아… / 숨을 편하게… / 생각이 떠오르면…)을 **기기 내장 한국어 음성**(Web Speech API)으로 읽는다. 외부 TTS·음성 파일은 쓰지 않는다(사용자 선택 · 비용·라이선스 없음). 목소리는 기기마다 다르고, 더 자연스러운 것부터 고른다 — 엣지 Natural > 기기의 향상된/프리미엄 음성 > Google 음성 > 유나(맥의 장난 목소리 제외). 한국어 목소리가 없으면 읽지 않고 자막만 보인다.

- 명상룸 영상 = **30초**(10초 장면 ×3 · 자막 한 장 10초씩). 만든 방법은 `scripts/meditation-video-30s.py`(자막 없는 원본 + 옛 10초 영상과 같은 색 보정 + 같은 자막 상자).
- 들어올 때 한 바퀴(세 줄) 한 번 → 그 뒤엔 싱잉볼만. 머리줄 음성 단추로 다시 듣기·멈추기. 소리를 끄면 읽지 않는다.
- **끝나는 시각에 맞춘 속도**(사용자: "눈 감고 음성 따라 할 거니 끝나는 타임을 계산해서 속도 조절"): 문장마다 자막이 뜬 뒤 0.8초에 시작해 6초 안에 끝낸다. 두 마디(자막 두 줄)로 나눠, 첫 마디는 잔잔한 빠르기(초당 4음절이 되게, 속도 0.7 아래로는 안 내림)로, 마디 사이 쉼(0.6~2.2초)은 둘째 마디가 끝 시각에 끝나게 계산한다. 기기 목소리의 실제 빠르기는 읽을 때마다 재서 기기에 저장한다(`wellness-care:voice-pace:v1`).
- 코드: `src/features/wellness/meditation-voice.ts`(말·시점·속도·쉼·목소리 고르기·재생 제어, 순수·테스트) · 화면 연결은 `SpaceSheet.tsx`.
