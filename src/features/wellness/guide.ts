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
  /** public 아래 경로. 세로 9:16 영상 하나(소리 포함). */
  src: string;
  steps: GuideStep[];
  /**
   * 몇 번 이어 틀지. 20초 시범 영상은 3회 = 1분(사용자 확정 "전부 1분 리미트"). 없으면 1회.
   * 영상 파일 자체는 1회분이고 반복은 앱이 한다(StretchVideo).
   */
  playCount?: number;
}

/** 이 영상이 화면에서 차지하는 전체 시간(초) = 한 회 길이 × 반복 횟수 */
export function guideMaxSec(g: GuideVideo): number {
  return guideTotalSec(g.steps) * (g.playCount ?? 1);
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

/**
 * 신체 건강 라이브러리 20초 시범 영상(힉스필드 stretching-pack 2026-09-12, 12편).
 * 한 편 = 동작 하나 = 20초, 앱이 3회 반복해 1분에서 멈춘다. 안내 문구는 콘티 「앱 안내」 그대로.
 * p1 은 SHOULDER_RELEASE(1분 1회) 재사용, p13·p14(걷기)는 영상 없음.
 */
function demo(file: string, title: string, cue: string): GuideVideo {
  return { src: "/wellness/video/" + file, steps: [{ sec: 20, title, cue }], playCount: 3 };
}

export const PROGRAM_VIDEOS: Record<string, GuideVideo> = {
  p1: SHOULDER_RELEASE,
  p2: demo("p2-neck-tilt.mp4", "고개 옆으로 기울이기", "어깨는 그대로, 귀만 천천히 내려요"),
  p3: demo("p3-chin-tuck.mp4", "턱 당기기", "턱을 뒤로 당겨 3초, 천천히 풀어요"),
  p4: demo("p4-seated-twist.mp4", "앉아서 허리 비틀기", "숨을 내쉬며 천천히 돌리고, 끝에서 잠깐 머물러요"),
  p5: demo("p5-pelvic-tilt.mp4", "골반 기울이기", "등을 등받이에 붙이고, 허리만 살짝 세웠다 풀어요"),
  p6: demo("p6-eye-rest.mp4", "눈 쉬기", "손바닥으로 눈을 덮고, 멀리 한 번 봐요"),
  p7: demo("p7-wrist.mp4", "손목 이완", "손가락을 당겨 5초, 손등을 눌러 5초"),
  p8: demo("p8-calf.mp4", "종아리 늘리기", "뒤꿈치를 바닥에 붙이고, 종아리가 늘어나는 걸 느껴요"),
  p9: demo("p9-ankle-pump.mp4", "발끝 당기고 뻗기", "발끝을 당겼다 뻗어요. 천천히"),
  p10: demo("p10-voice-breath.mp4", "목소리 이완 호흡", "코로 4초, 입으로 6초"),
  p11: demo("p11-breath.mp4", "숨 고르기", "배에 손을 얹고, 숨이 손을 밀어 올리게"),
  p12: demo("p12-night-breath.mp4", "이완 호흡", "4초 들이쉬고, 8초 길게 내쉬어요"),
  p15: demo("p15-reach-up.mp4", "기지개", "팔을 위로, 숨을 크게 한 번"),
};
