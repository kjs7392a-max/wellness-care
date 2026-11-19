"use client";

import { useEffect, useRef, useState } from "react";
import { completeMindCard, DAILY_QUESTIONS, dailyComplete, emptyMindCard, imagesComplete, MIND_TEST_IMAGE_COUNT, MIND_CAUSES, MIND_IMAGES, mindSolution, type DailyValue, type MindCardAnswer } from "./mind-card";
import { mindNarrative } from "./mind-reflection";
import styles from "./MindCard.module.css";

const DAILY_STEP = MIND_TEST_IMAGE_COUNT + 1;
const RESULT_STEP = DAILY_STEP + 1;
const PROGRESS_STEPS = Array.from({ length: DAILY_STEP }, (_, i) => i + 1);

export function MindCard({ value, allowWalk, onChange, onComplete, onClose }: {
  value: MindCardAnswer;
  allowWalk: boolean;
  onChange: (answer: MindCardAnswer) => void;
  onComplete: (answer: MindCardAnswer) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(value.completedAt ? RESULT_STEP : 1);
  const scroll = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
    if (step > 0) heading.current?.focus({ preventScroll: true });
  }, [step]);
  const imageIndex = value.imageOrder[step - 1];
  const image = step >= 1 && step <= MIND_TEST_IMAGE_COUNT ? MIND_IMAGES[imageIndex] : null;
  const solution = mindSolution(value, allowWalk);
  const narrative = mindNarrative(value, allowWalk);
  const ready = image ? value.images[imageIndex] !== null : step === DAILY_STEP && imagesComplete(value) && dailyComplete(value);
  function finish() {
    const completed = completeMindCard(value, new Date());
    if (!completed.completedAt) return;
    onComplete(completed);
    setStep(RESULT_STEP);
  }
  function restart() { onChange(emptyMindCard()); setStep(1); }
  return <section className={styles.sheet} aria-label="오늘의 마음카드">
    <header className={styles.header}>
      <button type="button" className={styles.back} aria-label={step > 1 && step < RESULT_STEP ? "이전 단계" : "테스트 선택으로 돌아가기"} onClick={() => step > 1 && step < RESULT_STEP ? setStep(step - 1) : onClose()}>‹</button>
      <div><strong>오늘의 마음카드</strong><span>그림으로 만나는 나의 하루</span></div>
      {step > 0 && step < RESULT_STEP && <button type="button" className={styles.textButton} onClick={onClose}>나가기</button>}
    </header>
    <div ref={scroll} className={styles.content}>
      {image && <>
        <div className={styles.progress} aria-label={`그림 탐색 ${step} / ${MIND_TEST_IMAGE_COUNT}, 이후 오늘의 상태 확인`}>
          {PROGRESS_STEPS.map(n => <span key={n} className={n <= step ? styles.progressActive : ""}/>)}
        </div>
        <div className={styles.eyebrow}>그림 탐색 · {step} / {MIND_TEST_IMAGE_COUNT}</div>
        <h2 ref={heading} tabIndex={-1} className={styles.title}>{image.question}</h2>
        <p className={styles.description}>잠시 바라보고, 가장 가까운 답을 골라주세요.<br/>정답도, 좋은 답이나 나쁜 답도 없어요.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={image.id} className={styles.artwork} src={image.src} alt={image.alt}/>
        <div className={styles.choices} role="group" aria-label={image.question}>
          {image.choices.map((label, i) => <button type="button" key={label} aria-pressed={value.images[imageIndex] === i} className={styles.choice} onClick={() => {
            const images = [...value.images] as MindCardAnswer["images"];
            images[imageIndex] = i;
            onChange({ ...value, images, completedAt: null });
          }}>{label}</button>)}
        </div>
        <p className={styles.caption}>무엇인지 맞히는 문제가 아니에요. 다른 모습이나 느낌을 골라도 괜찮아요.</p>
      </>}
      {step === DAILY_STEP && <>
        <div className={styles.progress} aria-label="마지막 단계, 오늘의 상태 확인">{PROGRESS_STEPS.map(n => <span key={n} className={styles.progressActive}/>)}</div>
        <div className={styles.eyebrow}>마지막으로 · 오늘의 나</div>
        <h2 ref={heading} tabIndex={-1} className={styles.title}>그림을 잠시 내려놓고,<br/>오늘 하루를 떠올려봐요</h2>
        <p className={styles.description}>더 잘 맞는 쉼을 제안하기 위한 질문이에요.<br/>답하기 어려운 항목은 건너뛰어도 괜찮아요.</p>
        {DAILY_QUESTIONS.map(({ key, question, labels }) => <fieldset className={styles.question} key={key}>
          <legend>{question}</legend>
          <div className={styles.dailyChoices}>
            {labels.map((label, i) => <button key={label} type="button" className={styles.dailyChoice} aria-pressed={value[key] === i + 1} onClick={() => onChange({ ...value, [key]: (i + 1) as DailyValue, completedAt: null })}><span className={styles.radio}/>{label}</button>)}
          </div>
          <button type="button" aria-pressed={value[key] === "skip"} className={styles.skip} onClick={() => onChange({ ...value, [key]: "skip", completedAt: null })}>이 질문은 건너뛰기{value[key] === "skip" ? " ✓" : ""}</button>
        </fieldset>)}
        <fieldset className={styles.question}>
          <legend>오늘 마음에 영향을 준 일이 있나요?</legend>
          <p className={styles.caption}>선택 사항 · 여러 개 골라도 괜찮아요</p>
          <div className={styles.causes}>
            {MIND_CAUSES.map(cause => <button type="button" key={cause} className={styles.cause} aria-pressed={value.causes.includes(cause)} onClick={() => {
              const causes = value.causes.includes(cause) ? value.causes.filter(c => c !== cause)
                : cause === "특별한 일 없음" ? [cause] : [...value.causes.filter(c => c !== "특별한 일 없음"), cause];
              onChange({ ...value, causes, completedAt: null });
            }}>{cause}</button>)}
          </div>
        </fieldset>
      </>}
      {step === RESULT_STEP && solution && <>
        <div className={styles.resultArt}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MIND_IMAGES[value.imageOrder[0]].src} alt=""/>
          <span>오늘, 나를 위한 제안</span>
        </div>
        <h2 ref={heading} tabIndex={-1} className={styles.resultTitle}>오늘의 마음풀이</h2>
        <p className={styles.reading}>{narrative}</p>
        <p className={styles.caption}>{DAILY_QUESTIONS.every(({key}) => value[key] === "skip") ? "오늘의 상태를 추정하지 않고, 부담 없이 선택할 수 있는 쉼을 제안해요." : "오늘 직접 선택한 상태를 바탕으로 한 생활 속 제안이에요."} 그림에 대한 반응만으로 성격이나 우울 수준을 판단하지 않아요.</p>
        <button type="button" className={styles.textButton} onClick={restart}>처음부터 다시 해보기</button>
      </>}
    </div>
    <footer className={styles.footer}>
      {step === RESULT_STEP ? <button type="button" className={styles.secondary} onClick={onClose}>테스트 선택으로 돌아가기</button>
        : <button type="button" className={styles.primary} disabled={!ready} onClick={() => step === DAILY_STEP ? finish() : setStep(step + 1)}>{step === DAILY_STEP ? "나를 위한 제안 보기" : step === MIND_TEST_IMAGE_COUNT ? "오늘의 상태 살펴보기" : "다음 그림 보기"}<span aria-hidden="true">→</span></button>}
    </footer>
  </section>;
}
