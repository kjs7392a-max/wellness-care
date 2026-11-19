"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { chooseRainOption, completeRainStory, emptyRainStory, RAIN_DIMENSIONS, rainStoryReady, rainStoryResult, type RainStoryAnswer } from "./rain-story";
import base from "./MindCard.module.css";
import styles from "./RainStory.module.css";

function Panel({src,index,alt}: {src:string;index:number;alt:string}) {
  return <span className={styles.panel}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} style={{left:`-${index*100}%`} as CSSProperties}/>
  </span>;
}
export function RainStory({value,onChange,onComplete,onClose}: {
  value:RainStoryAnswer;
  onChange:(answer:RainStoryAnswer)=>void;
  onComplete:(answer:RainStoryAnswer)=>void;
  onClose:()=>void;
}) {
  const [step,setStep]=useState(rainStoryResult(value) ? 3 : 0);
  const scroll=useRef<HTMLDivElement>(null), heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{scroll.current?.scrollTo({top:0});heading.current?.focus({preventScroll:true});},[step]);
  const dimension=step<3 ? RAIN_DIMENSIONS[step] : null;
  const ready=dimension ? dimension.options.some(o=>o.id===value[dimension.key]) : false;
  const result=rainStoryResult(value);
  const finish=()=>{const completed=completeRainStory(value,new Date());if(!completed.completedAt)return;onComplete(completed);setStep(3);};
  return <section className={base.sheet} aria-label="빗속의 나">
    <header className={base.header}>
      <button type="button" className={base.back} aria-label={step>0&&step<3 ? "이전 그림 선택" : "마음카드로 돌아가기"} onClick={()=>step>0&&step<3 ? setStep(step-1) : onClose()}>‹</button>
      <div><strong>빗속의 나</strong><span>부담과 나를 지켜주는 것</span></div>
      <button type="button" className={base.textButton} onClick={onClose}>마음카드</button>
    </header>
    <div className={`${base.content} ${styles.content}`} ref={scroll}>
      {dimension && <>
        <div className={base.progress} aria-label={`${step+1} / 3 그림 선택`}>{[0,1,2].map(n=><span key={n} className={n<=step ? base.progressActive : ""}/>)}</div>
        <div className={base.eyebrow}>{["오늘 느끼는 부담","내가 받는 영향","지금 쓸 수 있는 보호"][step]}</div>
        <h2 ref={heading} tabIndex={-1} className={base.title}>{dimension.title}</h2>
        <p className={base.description}>{dimension.hint}</p>
        <div className={styles.options} role="group" aria-label={dimension.title}>
          {dimension.options.map((option,index)=><button type="button" key={option.id} className={styles.option} aria-label={option.label} aria-pressed={value[dimension.key]===option.id} onClick={()=>onChange(chooseRainOption(value,dimension.key,option.id))}>
            <Panel src={dimension.image} index={index} alt={option.alt}/>
            <span className={styles.optionText}><strong>{option.label}</strong><span>{option.detail}</span><i aria-hidden="true">{value[dimension.key]===option.id ? "✓" : ""}</i></span>
          </button>)}
        </div>
        <p className={base.caption}>{step===0 ? "세 장면을 골라 오늘의 느낌을 표현해요. 그림의 인물보다 지금 내 느낌에 가까운 차이를 보세요." : "앞서 고른 그림과 꼭 같은 장면일 필요는 없어요. 이번 질문에서 내 느낌에 가까운 모습을 골라주세요."}</p>
      </>}
      {step===3 && result && <>
        <div className={base.eyebrow}>내가 고른 그림 조합</div>
        <div className={styles.summary} aria-label="선택한 그림 조합">
          {RAIN_DIMENSIONS.map(d=>{const index=d.options.findIndex(o=>o.id===value[d.key]);const option=d.options[index];return <div key={d.key}><Panel src={d.image} index={index} alt={option.alt}/><span>{option.label}</span></div>;})}
        </div>
        <h2 ref={heading} tabIndex={-1} className={base.resultTitle}>오늘의 마음 해설</h2>
        <p className={base.reading}><strong className={styles.readingLead}>{result.title}. </strong>{result.text}</p>
        <p className={base.caption}>PITR 자료의 부담·대처자원 구분을 참고한 선택형 자기탐색 해설이에요. 정식 그림검사의 채점 결과나 진단은 아니에요.</p>
        <div className={styles.resultTools}>
          <button type="button" className={base.textButton} onClick={()=>setStep(0)}>고른 그림 다시 살펴보기</button>
          <button type="button" className={base.textButton} onClick={()=>{onChange(emptyRainStory());setStep(0);}}>처음부터 다시 하기</button>
        </div>
      </>}
    </div>
    <footer className={base.footer}>
      {step<3 ? <button type="button" className={base.primary} disabled={!ready || (step===2&&!rainStoryReady(value))} onClick={()=>step===2 ? finish() : setStep(step+1)}>{["나에게 닿는 정도 고르기","나를 지켜주는 것 고르기","그림 조합 해설 보기"][step]}<span aria-hidden="true">→</span></button>
        : <button type="button" className={base.secondary} onClick={onClose}>테스트 선택으로 돌아가기</button>}
    </footer>
  </section>;
}
