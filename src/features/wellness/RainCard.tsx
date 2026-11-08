import { sx } from "./sx";
import { RainScene } from "./RainScene";
import { changeScene, finishRainCard, PLACE_OPTIONS, RAIN_NOTE_MAX, RAIN_OPTIONS, sceneDescription, sceneReady, type RainCardAnswer, type SceneChoice } from "./rain-card";
const panel = "display:flex; flex-direction:column; gap:14px; padding:18px 14px; background:#fff; border:1px solid #d9dfe7; border-radius:20px";
const button = "font-family:inherit; font-size:14px; cursor:pointer; border:1px solid #d9dfe7; border-radius:14px; background:#fff; color:#2d5c6e; padding:12px; text-align:center";
export function RainCard({ value, onChange, onTalk, onFinish, onRestart }: {
  value: RainCardAnswer; onChange: (a: RainCardAnswer) => void; onTalk: () => void; onFinish: () => void; onRestart: () => void;
}) {
  const ready = sceneReady(value);
  const axis = value.rain === null ? "rain" : "place";
  const options = axis === "rain" ? RAIN_OPTIONS : PLACE_OPTIONS;
  return <div data-rain-card style={sx("display:flex; flex-direction:column; gap:12px")}>
    {(["rain", "place"] as const).map(key => value[key] === null ? null : <button key={key} type="button" onClick={() => onChange(changeScene(value, key, null))} aria-label={`${key === "rain" ? "비의 양" : "머물 곳"} 바꾸기`} style={sx(button + ";display:flex; justify-content:space-between; align-items:center; font-size:13px")}><span>{key === "rain" ? "비의 양" : "머물 곳"} · {(key === "rain" ? RAIN_OPTIONS : PLACE_OPTIONS)[value[key]!]}</span><span style={{color:"#7a6bc4"}}>바꾸기</span></button>)}
    {!ready && <section style={sx(panel)} aria-label={axis === "rain" ? "비의 양 선택" : "머물 곳 선택"}>
      <div style={sx("font-size:11px; font-weight:700; color:#8c7ca4; letter-spacing:.08em")}>빗속의 나 · {axis === "rain" ? "1 / 2" : "2 / 2"}</div>
      <h2 style={sx("margin:0; font-size:18px; line-height:1.5; color:#2d5c6e")}>{axis === "rain" ? "오늘 마음과 닮은 비는?" : "이 비 속에서 어디에 있고 싶나요?"}</h2>
      <p style={sx("margin:0; font-size:12px; color:#708590; line-height:1.6")}>끌리는 장면을 골라 주세요. 좋은 선택이나 나쁜 선택은 없어요.</p>
      <div style={sx("display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px")}>
        {options.map((label,i) => <button key={label} type="button" aria-label={label} onClick={() => onChange(changeScene(value, axis, i as SceneChoice))} style={sx(button + ";padding:0; overflow:hidden; display:flex; flex-direction:column; gap:0")}>
          <RainScene rain={axis === "rain" ? i as SceneChoice : value.rain!} place={axis === "place" ? i as SceneChoice : 0}/>
          <span style={sx("padding:10px 2px; font-size:13px; font-weight:700")}>{label}</span>
        </button>)}
      </div>
    </section>}
    {ready && <section style={sx(panel)} aria-label={value.finished ? "오늘의 마음카드 결과" : "장면에 마음 남기기"}>
      <div style={sx("font-size:11px; font-weight:700; color:#8c7ca4; letter-spacing:.08em")}>{value.finished ? "오늘의 마음카드" : "그림에 담긴 내 이야기"}</div>
      <div style={sx("border-radius:15px; overflow:hidden; background:#e7ecec")}><RainScene rain={value.rain!} place={value.place!}/></div>
      {!value.finished ? <>
        <label htmlFor="rain-note" style={sx("font-size:17px; font-weight:700; line-height:1.5; color:#2d5c6e")}>어떤 부분이 오늘 마음과 닮았나요?</label>
        <textarea id="rain-note" value={value.note} maxLength={RAIN_NOTE_MAX} onChange={e => onChange({...value,note:e.target.value})} rows={3} placeholder="그림을 고른 이유나 떠오른 이야기를 편하게 적어 주세요." style={sx("box-sizing:border-box; width:100%; resize:vertical; font-family:inherit; font-size:14px; font-size:14px; line-height:1.6; color:#2d5c6e; background:#faf8fd; border:1px solid #cfc6df; border-radius:12px; padding:12px")}/>
        <div style={sx("display:flex; justify-content:space-between; font-size:11px; color:#708590")}><span>한마디만 적어도, 건너뛰어도 괜찮아요.</span><span>{value.note.length}/{RAIN_NOTE_MAX}</span></div>
        <button type="button" onClick={() => onChange(finishRainCard(value))} disabled={!value.note.trim()} style={{...sx(button + ";background:#7a6bc4; border-color:#7a6bc4; color:#fff; font-weight:700"),opacity:value.note.trim()?1:.45}}>내 마음카드 보기</button>
        <button type="button" onClick={() => onChange(finishRainCard(value,true))} style={sx(button + ";border:none; color:#7a6bc4; padding:4px")}>지금은 건너뛰기</button>
      </> : <>
        <h2 style={sx("margin:0; font-size:18px; color:#2d5c6e")}>내가 고른 오늘의 장면</h2>
        <p style={sx("margin:0; font-size:13px; line-height:1.6; color:#708590")}>{sceneDescription(value)}을 골랐어요.</p>
        {value.note ? <blockquote style={sx("margin:0; border-left:3px solid #b4a5d6; padding:5px 0 5px 12px; font-size:15px; line-height:1.65; color:#2d5c6e; white-space:pre-wrap; overflow-wrap:anywhere")}>{value.note}</blockquote> : <p style={sx("margin:0; font-size:14px; line-height:1.65; color:#2d5c6e")}>오늘은 그림으로만 마음을 남겼어요. 말하고 싶을 때 천천히 이어가도 괜찮아요.</p>}
        {value.note && <button type="button" onClick={() => onChange({...value,finished:false})} style={sx(button + ";align-self:flex-start; border:none; padding:0; font-size:12px; color:#7a6bc4")}>내 한마디 수정하기</button>}
        <p style={sx("margin:0; font-size:11px; line-height:1.6; color:#708590")}>그림은 마음을 표현하는 소재예요. 선택만으로 심리 상태나 우울 정도를 판단하지 않아요.</p>
        <button type="button" onClick={onTalk} style={sx(button + ";background:#7a6bc4; border-color:#7a6bc4; color:#fff; font-weight:700")}>이 마음으로 대화 이어가기</button>
        <div style={sx("font-size:11px; text-align:center; color:#708590")}>적은 내용은 대화 입력창에서 확인한 뒤 보낼 수 있어요.</div>
        <button type="button" onClick={onFinish} style={sx(button)}>오늘은 여기까지</button>
        <button type="button" onClick={onRestart} style={sx(button + ";border:none; padding:4px; font-size:12px; color:#7a6bc4")}>다시 고르기</button>
      </>}
    </section>}
  </div>;
}
