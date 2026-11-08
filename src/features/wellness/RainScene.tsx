import { useId } from "react";
import type { SceneChoice } from "./rain-card";

/** Same person, palette and framing; only the requested scene feature changes. */
export function RainScene({ rain = 1, place = 0 }: { rain?: SceneChoice; place?: SceneChoice }) {
  const id = useId().replace(/:/g, "");
  const count = [16, 36, 65, 100][rain];
  return <svg viewBox="0 0 320 240" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#d9e3ed"/><stop offset="1" stopColor="#f4eee5"/></linearGradient>
      <linearGradient id={`${id}-coat`} x2="1" y2="1"><stop stopColor="#c4b2a5"/><stop offset="1" stopColor="#9c8e89"/></linearGradient>
      <pattern id={`${id}-grain`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".6" fill="#60777d" opacity=".10"/></pattern>
    </defs>
    <rect width="320" height="240" fill={`url(#${id}-sky)`}/>
    <path d="M0 145 Q45 132 89 145 T190 144 T320 140 V240 H0Z" fill="#bacbc8"/>
    <path d="M0 179 Q80 161 170 178 T320 171 V240 H0Z" fill="#d9dcda"/>
    <path d="M66 240 L136 166 H186 L262 240" fill="#ebe8e3"/>
    <g opacity=".5" fill="#8fa8a4"><path d="M15 148 V85 Q38 48 54 83 V148Z"/><path d="M266 145 V75 Q289 34 313 80 V145Z"/></g>
    <g stroke="#718b9d" strokeWidth={rain === 3 ? 1.7 : 1.2} opacity=".48" strokeLinecap="round">
      {Array.from({ length: count }, (_, i) => { const x = (i * 79 + 13) % 332; const y = (i * 47 + 7) % 235; return <path key={i} d={`M${x} ${y} l-4 ${[7, 11, 15, 20][rain]}`}/>; })}
    </g>
    {place === 2 && <g><path d="M40 177 V70 H280 V177" fill="#ece4da" stroke="#a79b90" strokeWidth="4"/><path d="M26 77 L55 48 H264 L293 77Z" fill="#8a9699"/><rect x="63" y="92" width="48" height="60" rx="3" fill="#c9d7da"/><path d="M87 92 V152 M63 122 H111" stroke="#a79b90" strokeWidth="3"/></g>}
    {place === 3 && <g><rect x="52" y="67" width="216" height="109" fill="#e5eae7" opacity=".85"/><path d="M52 190 V62 H268 V190 M109 62 V177 M215 62 V177" fill="none" stroke="#899b9d" strokeWidth="5"/><path d="M40 60 H281" stroke="#758b90" strokeWidth="12" strokeLinecap="round"/><path d="M80 166 H240 M90 166 V187 M230 166 V187" stroke="#aa9484" strokeWidth="6"/></g>}
    <ellipse cx="164" cy="213" rx="41" ry="6" fill="#849c9e" opacity=".15"/>
    <g stroke="#655f60" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M148 175 L146 206 L156 208 L165 177 M169 176 L177 207 L187 205 L182 171" fill="#586575"/>
      <path d="M146 204 L142 212 Q150 216 159 211 L157 205 M176 205 L179 213 Q188 214 194 210 L186 204" fill="#535d66"/>
      <path d="M144 118 Q164 110 180 120 L190 177 Q165 189 137 177Z" fill={`url(#${id}-coat)`}/>
      <path d="M146 123 L134 155 L143 163 L155 140 M180 123 L190 149 L181 155 L171 135" fill={`url(#${id}-coat)`}/>
      <path d="M151 115 L162 128 L174 116 M162 128 V178" fill="none" stroke="#887d79"/>
      <path d="M156 105 V119 Q164 127 172 116 V104" fill="#e8c9b4"/>
      <path d="M143 87 Q139 65 160 62 Q186 63 184 88 L182 118 L173 108 L148 112Z" fill="#605653"/>
      <ellipse cx="163" cy="91" rx="17" ry="23" fill="#efd7c4"/>
      <path d="M144 88 Q144 62 164 64 Q185 65 182 90 Q168 82 163 73 Q159 84 144 88" fill="#605653"/>
      <path d="M154 92 h2 M170 92 h2" stroke="#5d5350" strokeWidth="2" strokeLinecap="round"/>
      <path d="M159 103 Q163 105 167 103" fill="none" stroke="#b1857b"/>
    </g>
    {place === 0 && <g stroke="#8e7d6e" strokeWidth="1.6"><path d="M182 60 V149 Q181 158 174 154" fill="none"/><path d="M110 76 Q180 -5 250 76 Q230 65 214 76 Q197 64 181 76 Q164 64 146 76 Q128 65 110 76Z" fill="#e9ca91"/><path d="M181 28 Q156 40 146 76 M181 28 V76 M181 28 Q205 42 214 76" fill="none" opacity=".6"/><path d="M181 29 V23" strokeLinecap="round"/><ellipse cx="182" cy="147" rx="5" ry="7" fill="#efd7c4"/></g>}
    <g stroke="#94a9b0" opacity=".5" fill="none"><ellipse cx="72" cy="204" rx="18" ry="2"/><ellipse cx="246" cy="223" rx="26" ry="3"/></g>
    <rect width="320" height="240" fill={`url(#${id}-grain)`}/>
  </svg>;
}
