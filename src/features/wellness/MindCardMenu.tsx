"use client";

import base from "./MindCard.module.css";
import styles from "./MindCardMenu.module.css";

export function MindCardMenu({ pictureDone, rainDone, onPicture, onRain, onClose }: {
  pictureDone: boolean;
  rainDone: boolean;
  onPicture: () => void;
  onRain: () => void;
  onClose: () => void;
}) {
  return <section className={base.sheet} aria-label="오늘의 마음카드 선택">
    <header className={base.header}>
      <button type="button" className={base.back} aria-label="마음카드 닫기" onClick={onClose}>‹</button>
      <div><strong>오늘의 마음카드</strong><span>내 마음을 만나는 두 가지 방법</span></div>
    </header>
    <div className={base.content}>
      <div className={base.eyebrow}>A MOMENT FOR YOURSELF</div>
      <h1 className={base.introTitle}>오늘은 어떤 그림으로<br/>마음을 만나볼까요?</h1>
      <p className={base.description}>마음이 가는 테스트 하나를 골라주세요.<br/>마치고 나면 다른 테스트도 해볼 수 있어요.</p>
      <div className={styles.options}>
        <button type="button" className={styles.option} aria-label="그림 테스트 선택" onClick={onPicture}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wellness/mind-card/scene-forest.jpg" alt=""/>
          <span className={styles.details}><small>그림 테스트</small><strong>그림으로 보는 마음</strong><span>매번 달라지는 네 그림으로<br/>오늘의 마음을 살펴봐요.</span><b>{pictureDone ? "새 그림으로 시작하기" : "그림 고르러 가기"} <span aria-hidden="true">→</span></b></span>
        </button>
        <button type="button" className={styles.option} aria-label="빗속의 사람 테스트 선택" onClick={onRain}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wellness/rain-story/umbrella.jpg" alt=""/>
          <span className={styles.details}><small>빗속의 사람 테스트</small><strong>빗속의 나</strong><span>비·영향·보호 그림을 조합해<br/>부담과 버틸 여지를 살펴봐요.</span><b>{rainDone ? "마음풀이 다시 보기" : "장면 고르러 가기"} <span aria-hidden="true">→</span></b></span>
        </button>
      </div>
      <p className={base.caption}>정답이나 점수 없이, 내가 고른 느낌을 돌아보는 시간이에요.</p>
    </div>
  </section>;
}
