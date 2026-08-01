import type { CSSProperties } from "react";

/**
 * 디자인 원본(웰니스케어-design.dc.html)은 모든 스타일이 인라인 CSS 문자열로 적혀 있다.
 * 픽셀 단위 재현을 위해 그 문자열을 거의 그대로 옮겨오려고, "prop:val; prop:val" 형태의
 * CSS 선언 문자열을 React style 객체로 변환한다. (React는 style에 문자열을 못 받으므로 필요)
 *
 * 값 안에 세미콜론이 없다는 전제(원본 인라인 스타일은 전부 단순 선언). 콜론은 첫 번째 것만 분리.
 */
export function sx(css: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const t = decl.trim();
    if (!t) continue;
    const i = t.indexOf(":");
    if (i < 0) continue;
    const rawKey = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    const key = rawKey.startsWith("--")
      ? rawKey
      : rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = val;
  }
  return out as CSSProperties;
}
