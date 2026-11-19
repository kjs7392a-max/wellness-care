import {describe,expect,it} from "vitest";
import {chooseRainOption,completeRainStory,emptyRainStory,RAIN_DIMENSIONS,rainStoryReady,rainStoryResult,rainStoryNarrative,type RainStoryAnswer} from "./rain-story";
const now=new Date("2026-11-18T00:00:00Z");
const done=(changes:Partial<RainStoryAnswer>={})=>completeRainStory({...emptyRainStory(),rain:"steady",exposure:"partial",protection:"limited",...changes},now);
describe("PDF 채점 요소를 응용한 그림 조합",()=>{
 it("모든 축의 유효한 선택이 있어야 완료하며 미완료 해설은 없다",()=>{
  for(const a of [emptyRainStory(),{...done(),rain:null},{...done(),exposure:null},{...done(),protection:null},{...done(),version:1} as unknown as RainStoryAnswer]){
   expect(rainStoryReady(a)).toBe(false);expect(rainStoryResult(a)).toBeNull();expect(rainStoryNarrative(a)).toBe("");
  }
  expect(done().completedAt).toBe(now.toISOString());expect(rainStoryResult({...done(),completedAt:null})).toBeNull();
 });
 it("선택값은 해당 축에서만 유효하며 변경하면 완료 상태를 해제한다",()=>{
  const a=done();expect(chooseRainOption(a,"rain","enough")).toBe(a);
  expect(chooseRainOption(a,"rain","heavy")).toEqual({...a,rain:"heavy",completedAt:null});
  for(const d of RAIN_DIMENSIONS)for(const invalid of ["unknown",1,null])expect(rainStoryReady({...a,[d.key]:invalid} as unknown as RainStoryAnswer)).toBe(false);
 });
 it("부담에 비해 보호가 적음·비슷함·큼을 구분하되 수치를 반환하지 않는다",()=>{
  expect(rainStoryResult(done({rain:"heavy",exposure:"soaked",protection:"none"}))?.title).toContain("감당할 몫");
  expect(rainStoryResult(done({rain:"light",exposure:"dry",protection:"enough"}))?.title).toContain("지킬 여유");
  expect(rainStoryResult(done())?.title).toContain("여유가 빠듯");
  expect(Object.keys(rainStoryResult(done())!)).toEqual(["title","text"]);
 });
 it("같은 거센 비에서도 직접 받는 영향과 보호 선택을 각각 해설한다",()=>{
  const distance=rainStoryNarrative(done({rain:"heavy",exposure:"dry",protection:"enough"}));
  const exposed=rainStoryNarrative(done({rain:"heavy",exposure:"soaked",protection:"none"}));
  expect(distance).toContain("주변의 분주함과 내가 실제로 받는 영향 사이에 간격");
  expect(distance).toContain("부담을 나눌 도움");expect(exposed).toContain("일들의 무게가 가까이");expect(exposed).toContain("내 힘으로 감당해야 하는 몫");
  expect(exposed).not.toBe(distance);
 });
 it("약한 비를 온몸으로 맞는 경우와 이미 영향받으면서도 보호를 가진 경우를 따로 설명한다",()=>{
  expect(rainStoryNarrative(done({rain:"light",exposure:"soaked"}))).toContain("상황의 크기보다 마음에 남는 영향");
  const mixed=rainStoryNarrative(done({rain:"heavy",exposure:"soaked",protection:"enough"}));
  expect(mixed).toContain("‘괜찮다’와 ‘힘들다’가 함께");
  expect(mixed).toContain("버틸 수 있다는 이유로 힘들지 않은 것은 아닙니다");
 });
 it("부담과 보호가 함께 작은 조합과 함께 큰 조합을 같은 해설로 묶지 않는다",()=>{
  const small=rainStoryNarrative(done({rain:"light",exposure:"dry",protection:"none"}));
  const large=rainStoryNarrative(done({rain:"heavy",exposure:"soaked",protection:"enough"}));
  expect(small).toContain("지금 크게 힘들지 않은 것과");expect(large).toContain("그 무게까지 가벼워진 건 아닙니다");
 });
 it("27개 조합 모두 서로 다른 해설이며 점수·질병·등급·인물관계 해석을 내놓지 않는다",()=>{
  const texts:string[]=[];
  for(const rain of RAIN_DIMENSIONS[0].options)for(const exposure of RAIN_DIMENSIONS[1].options)for(const protection of RAIN_DIMENSIONS[2].options){
   const result=rainStoryResult(done({rain:rain.id,exposure:exposure.id,protection:protection.id}))!;
   expect(result.text.length).toBeGreaterThan(120);texts.push(result.text);
   expect(JSON.stringify(result)).not.toMatch(/\d|점수|등급|위험군|우울증|무의식|성격유형|두 사람|서먹|읽어볼|읽을 수|읽었|표현했|표현됐|고르셨|골랐|조합의 중심|드러나요|\n/);
  }
  expect(texts).toHaveLength(27);expect(new Set(texts).size).toBe(27);
 });
});
