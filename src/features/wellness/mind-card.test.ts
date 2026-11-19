import { describe, expect, it } from "vitest";
import { completeMindCard, dailyComplete, drawMindImageOrder, emptyMindCard, imagesComplete, MIND_IMAGES, MIND_TEST_IMAGE_COUNT, mindChatDraft, mindSolution, type DailyAnswer, type MindCardAnswer } from "./mind-card";
const now=new Date("2026-11-18T05:00:00Z");
const answer=(changes:Partial<MindCardAnswer>={}):MindCardAnswer=>{
  const imageOrder=changes.imageOrder ?? [0,1,2,3];
  return {...emptyMindCard(()=>0.99999),imageOrder,images:MIND_IMAGES.map((_,i)=>imageOrder.includes(i)?i%3:null),mood:3,stress:3,energy:3,...changes};
};
const done=(changes:Partial<MindCardAnswer>={})=>completeMindCard(answer(changes),now);
describe("무작위 그림 선택과 답변 무결성",()=>{
 it("12장 중 중복 없이 항상 4장을 뽑고, 서로 다른 그림 묶음을 만들 수 있다",()=>{
  expect(MIND_IMAGES).toHaveLength(12);expect(MIND_TEST_IMAGE_COUNT).toBe(4);
  let seed=123456;const rng=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const sets=new Set<string>(),seen=new Set<number>();
  for(let n=0;n<100;n++){
   const order=drawMindImageOrder(rng);expect(order).toHaveLength(4);expect(new Set(order).size).toBe(4);
   for(const i of order){expect(i).toBeGreaterThanOrEqual(0);expect(i).toBeLessThan(MIND_IMAGES.length);seen.add(i);}
   sets.add([...order].sort((a,b)=>a-b).join(","));
  }
  expect(seen.size).toBe(12);expect(sets.size).toBeGreaterThan(20);
 });
 it("고른 4장만 답하면 완료하고, 빠진 선택과 잘못된 길이는 거부한다",()=>{
  const a=answer();expect(a.images.filter(x=>x!==null)).toHaveLength(4);expect(imagesComplete(a)).toBe(true);
  for(const index of a.imageOrder){const images=[...a.images];images[index]=null;expect(completeMindCard({...a,images},now).completedAt).toBeNull();}
  expect(imagesComplete(answer({images:[0,0,0]}))).toBe(false);
  expect(imagesComplete(answer({images:[...a.images,0]}))).toBe(false);
 });
 it("진행 중 답변 변경과 완료가 선택된 그림의 종류와 순서를 바꾸지 않는다",()=>{
  const a=answer({imageOrder:[11,5,1,8]});const original=[...a.imageOrder];
  const changed={...a,images:a.images.map((v,i)=>i===11?2:v)};
  const completed=completeMindCard(changed,now);
  expect(completed.completedAt).toBe(now.toISOString());expect(completed.imageOrder).toEqual(original);expect(a.imageOrder).toEqual(original);
  expect(completed.images[11]).toBe(2);expect(completed.images[0]).toBeNull();
 });
 it("중복·범위 밖 순서와 고르지 않은 그림의 답을 유효한 테스트로 받지 않는다",()=>{
  for(const imageOrder of [[0,0,1,2],[0,1,2],[0,1,2,12],[0,1,2,-1],[0,1,2,0.5]])expect(imagesComplete(answer({imageOrder}))).toBe(false);
  const a=answer();a.images[11]=0;expect(imagesComplete(a)).toBe(false);
 });
 it("그림 또는 당일 상태가 빠지면 완료·추천하지 않는다",()=>{
  for(const a of [emptyMindCard(),answer({mood:null}),answer({stress:null}),answer({energy:null})]){
   expect(completeMindCard(a,now).completedAt).toBeNull();expect(mindSolution({...a,completedAt:now.toISOString()})).toBeNull();
  }
  expect(mindSolution(answer())).toBeNull();
 });
 it("명시적으로 건너뛴 상태는 완료할 수 있다",()=>{
  const a=done({mood:"skip",stress:"skip",energy:"skip"});expect(a.completedAt).toBe(now.toISOString());expect(mindSolution(a)?.destination).toBe("space");
 });
 it("선택 범위 밖 응답을 받지 않는다",()=>{
  for(const invalid of [-1,MIND_IMAGES[0].choices.length,NaN,Infinity,0.5]){const a=answer();a.images[0]=invalid;expect(imagesComplete(a)).toBe(false);}
  for(const invalid of [0,6,NaN,Infinity,2.5])expect(dailyComplete(answer({stress:invalid as DailyAnswer}))).toBe(false);
 });
 it("완료 시 원본을 변경하지 않고 완료 시각만 남긴다",()=>{
  const a=answer(),completed=completeMindCard(a,now);expect(a.completedAt).toBeNull();expect(completed.completedAt).toBe(now.toISOString());
 });
});
describe("그림과 순서는 임상 점수·활동 추천의 근거가 아니다",()=>{
 it("전체 그림 풀에서 어떤 그림과 선택지를 뽑아도 직접 상태가 같으면 같은 제안을 낸다",()=>{
  const expected=mindSolution(done({stress:5}));
  for(let index=0;index<MIND_IMAGES.length;index++)for(let choice=0;choice<MIND_IMAGES[index].choices.length;choice++){
   const imageOrder=[index,(index+1)%MIND_IMAGES.length,(index+2)%MIND_IMAGES.length,(index+3)%MIND_IMAGES.length];
   const images=MIND_IMAGES.map((_,i)=>i===index?choice:imageOrder.includes(i)?0:null);
   expect(mindSolution(done({imageOrder,images,stress:5}))).toEqual(expected);
  }
 });
 it("원인 항목으로 추천 상태를 추측하지 않는다",()=>{expect(mindSolution(done({causes:["업무","학부모와의 소통"]}))).toEqual(mindSolution(done()));});
 it("직접 응답 조합에도 점수·등급·질병 판정을 노출하지 않는다",()=>{
  const values:DailyAnswer[]=[1,2,3,4,5,"skip"];
  for(const mood of values)for(const stress of values)for(const energy of values){
   const result=mindSolution(done({mood,stress,energy}));expect(result).not.toBeNull();expect(Object.keys(result!)).toEqual(["title","message","steps","destination","action"]);expect(JSON.stringify(result)).not.toMatch(/우울|진단|점수|등급|위험군|\d+점/);
  }
 });
});
describe("직접 응답과 기존 안전 조건",()=>{
 it("직접 답한 상태만으로 기존 제안을 정한다",()=>{
  expect(mindSolution(done({stress:5}))?.destination).toBe("space");expect(mindSolution(done({energy:1}))?.title).toBe("오늘의 마무리는 작고 편안하게");expect(mindSolution(done({mood:1}))?.destination).toBe("talk");expect(mindSolution(done({mood:4,energy:4,stress:1}))?.destination).toBe("walk");
 });
 it("안전 확인 제한이나 응답 건너뛰기가 있으면 산책으로 정하지 않는다",()=>{
  expect(mindSolution(done({mood:5,energy:5,stress:1}),false)?.destination).toBe("space");
  for(const key of ["mood","stress","energy"] as const)expect(mindSolution(done({[key]:"skip"}))?.destination).toBe("space");
 });
 it("대화 초안에는 원시 응답이나 그림 해석을 붙이지 않는다",()=>{
  const draft=mindChatDraft(done({mood:1,stress:5,causes:["업무"]}));expect(draft).toContain("업무");expect(draft).not.toMatch(/stress|mood|energy|우울|점수|그림.*뜻|가라앉/);
 });
});
