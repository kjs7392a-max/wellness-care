/**
 * 마음 쉼터 3D 캐릭터를 켤지(2026-11-21 시안 — 미리보기 주소에서만 먼저) — three.js 를 부르지 않는 가벼운 판단만.
 *   - 주소에 ?3d=0 → 끔 · ?3d=1 → 켬(운영 주소에서도 시험해 볼 수 있게).
 *   - 그 밖엔 미리보기(*-git-*.vercel.app)·내 컴퓨터(localhost)에서만 켠다 — 운영(사용자) 화면은 그대로 2D.
 *   - WebGL 이 없거나 아주 낮은 사양(코어 4개 미만)이면 2D 로.
 */
export interface Space3DEnv { search: string; hostname: string; cores?: number; webgl: boolean }

export function space3dWanted(env: Space3DEnv): boolean {
  const q = new URLSearchParams(env.search).get("3d");
  if (q === "0") return false;
  if (!env.webgl) return false;
  if (q === "1") return true;
  if (typeof env.cores === "number" && env.cores > 0 && env.cores < 4) return false;
  const h = env.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || (h.endsWith(".vercel.app") && h.includes("-git-"));
}

/** 브라우저에서 — WebGL 이 되는지 한 번만 본다 */
let webglCache: boolean | null = null;
function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { webglCache = false; }
  return webglCache;
}
export function space3dEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return space3dWanted({ search: window.location.search, hostname: window.location.hostname, cores: navigator.hardwareConcurrency, webgl: hasWebGL() });
}
