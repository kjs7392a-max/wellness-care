/**
 * 스트레칭 가이드 영상의 구간(콘티) 타이밍.
 *
 * 영상은 1분짜리 한 세트이고, 사용자가 3·5·10분을 고르면 같은 세트를 반복 재생한다.
 * 화면에 겹쳐 띄우는 안내 문구는 "지금 몇 초째인가"로만 정하므로 순수 함수로 둔다
 * (이 저장소엔 jsdom 이 없어 화면 안에 두면 영원히 미검증으로 남는다).
 */

export interface GuideStep {
  /** 이 구간 길이(초) */
  sec: number;
  title: string;
  cue: string;
}

export interface GuideVideo {
  /** public 아래 경로. 1분짜리 무음 세로 영상 하나. */
  src: string;
  steps: GuideStep[];
}

/** 「퇴근 전 어깨·목 풀기」 — 힉스필드 제작본 stretch_60s_v2 (2026-09-12). 6구간 합계 60초. */
export const SHOULDER_RELEASE: GuideVideo = {
  src: "/wellness/video/shoulder-release-1m.mp4",
  steps: [
    { sec: 10, title: "어깨 힘 빼기", cue: "올려두었던 어깨, 내려놓을 시간이에요. 숨 한 번." },
    { sec: 15, title: "어깨 으쓱", cue: "올릴 때 들이쉬고, 내릴 때 툭 — 세 번" },
    { sec: 15, title: "어깨 뒤로 돌리기", cue: "천천히, 크게 — 네 번" },
    { sec: 8, title: "고개 오른쪽으로", cue: "어깨는 그대로, 귀만 내려요" },
    { sec: 7, title: "고개 왼쪽으로", cue: "반대쪽도 똑같이" },
    { sec: 5, title: "어깨 내려놓기", cue: "오늘 몫은 여기까지로 충분해요" },
  ],
};

export function guideTotalSec(steps: GuideStep[]): number {
  return steps.reduce((a, s) => a + s.sec, 0);
}

export interface GuidePosition {
  /** 몇 번째 반복인지 (0부터) */
  loop: number;
  index: number;
  step: GuideStep;
  /** 이 구간 안에서 흐른 초 */
  stepElapsed: number;
  /** 이 구간 진행률 0~1 */
  progress: number;
}

/**
 * 시작 후 elapsed 초가 지났을 때 어느 구간인지.
 * 세트 길이를 넘으면 처음부터 다시 센다(영상 loop 와 같은 주기).
 * 음수·NaN 은 0초로 본다.
 */
export function guideStepAt(steps: GuideStep[], elapsed: number): GuidePosition {
  const total = guideTotalSec(steps);
  const e = Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 0;
  const loop = Math.floor(e / total);
  let within = e - loop * total;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    if (within < st.sec) {
      return { loop, index: i, step: st, stepElapsed: within, progress: within / st.sec };
    }
    within -= st.sec;
  }
  // 도달 불가(within < total 이 보장됨)지만 타입을 위해 마지막 구간을 돌려준다.
  const last = steps[steps.length - 1];
  return { loop, index: steps.length - 1, step: last, stepElapsed: last.sec, progress: 1 };
}
