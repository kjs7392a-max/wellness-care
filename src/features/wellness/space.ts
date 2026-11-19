/**
 * 마음 쉼터 — 불당·교회·성당·명상룸(2026-11-08 사용자 지시: Higgsfield 영상 4개를 각 공간에 연결).
 *
 * - 영상은 반복 재생한다. 불당·교회·성당은 별도 소리 듣기를 누르면 오디오 재생, 명상룸은 영상의 싱잉볼 소리.
 * - 명상룸 영상엔 명상 안내 자막이 이미 들어 있다 → 🚫 앱이 같은 안내를 또 얹지 말 것.
 * - 세로 영상의 주요 인물·십자가·불상·자막이 잘리지 않게 공간마다 「지켜야 할 칸(safe)」을 적고,
 *   화면 크기에 맞춰 `fitRoomVideo` 가 영상 크기·위치를 정한다(순수 — 테스트 space.test.ts).
 *
 * 파일(public/wellness/space/): 원본은 HEVC Main10(10비트)이라 안드로이드·크롬에서 못 트는 기기가 많다 →
 * H.264 8비트(CRF 19 · faststart)로 바꿔 넣었다. 원본 대비 SSIM 0.991~0.992 · 2.2MB 이하(2026-11-08 실측).
 * 원본 zip = output/exports/wellness-final-videos-2026-11-08.zip.
 */

export type SpaceId = "temple" | "church" | "cathedral" | "meditation";

/** 영상 안에서 반드시 보여야 할 칸 — 영상 폭·높이에 대한 비율(0~1). */
export interface SafeBox { x0: number; x1: number; y0: number; y1: number }

export interface SpaceTrack {
  src: string; title: string; artist: string; sourceUrl: string;
  license?: { label: string; url: string };
}

export interface SpaceRoom {
  id: SpaceId;
  name: string;
  /** 고르는 화면의 한 줄 — 소리가 있는지 미리 알게. */
  hint: string;
  src: string;
  poster: string;
  /** 원본 영상 크기(px) — 비율만 쓴다. */
  w: number;
  h: number;
  /** 영상 자체의 소리 트랙 유무. 별도 소리는 audio에 둔다. */
  sound: boolean;
  /** 별도 오디오: 공간 입장 때는 꺼지고 소리 듣기를 눌러야 재생된다. */
  audio?: readonly [SpaceTrack, ...SpaceTrack[]];
  /** 영상 속 자막을 기기 내장 음성으로 읽어 준다(명상룸 · 2026-11-19 · meditation-voice.ts). */
  voiceGuide?: boolean;
  /**
   * 잘리면 안 되는 칸(2026-11-08 영상 프레임 0·2.5·5·7.5·9.9초 실측 + 여백).
   * - 불당: 불상(x .44–.52, y .37–.43) · 큰절하는 사람(x .28–.37, y .48–.56)
   * - 교회: 십자가(x .51–.65, y .18–.35) · 기도하는 사람(x .33–.44, y .46–.53)
   * - 성당: 십자고상(x .41–.56, y .19–.35) · 성모상(x .18–.21, y .47–.53) · 오른쪽 의자의 사람(x .75–.89, y .54–.69)
   * - 명상룸: 앉은 사람·싱잉볼(x .49–.83, y .37–.58) · **자막 상자(x .055–.945, y .773–.952)**
   */
  safe: SafeBox;
  /** 고르는 화면 사진(3:4로 잘림)의 세로 위치 — 주요 대상이 들어오게. 명상룸은 자막 상자가 안 보이게 맨 위. */
  thumbPos: string;
}

export const SPACE_DIR = "/wellness/space";

export const SPACE_ROOMS: readonly SpaceRoom[] = [
  { id: "temple", name: "불당", hint: "반야심경 독경 · 눌러서 듣기", src: `${SPACE_DIR}/temple.mp4`, poster: `${SPACE_DIR}/temple.jpg`, w: 1080, h: 1920, sound: false,
    audio: [{ src: "https://static1.squarespace.com/static/58d013bbe58c6272b30dad0b/t/59b04b3f8419c24d57a36c06/1504725831272/04-heart-sutra-korean%2BV1.mp3",
      title: "반야심경 독경 · 한국어", artist: "Kwan Um School of Zen",
      sourceUrl: "https://kwanumzen.org/resources-collection/2017/9/6/heart-sutra-in-korean" }],
    safe: { x0: 0.24, x1: 0.64, y0: 0.33, y1: 0.6 }, thumbPos: "50% 45%" },
  { id: "church", name: "교회", hint: "찬송가 합창 3곡 · 차례로 듣기", src: `${SPACE_DIR}/church.mp4`, poster: `${SPACE_DIR}/church.jpg`, w: 1080, h: 1920, sound: false,
    audio: [{ src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/6/6a/Amazing_Grace_-_Choir.ogg/Amazing_Grace_-_Choir.ogg.mp3",
      title: "찬송가 · Amazing Grace (영어 합창 발췌)", artist: "Choir / Sain (Recordiau) Cyf.",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Amazing_Grace_-_Choir.ogg",
      license: { label: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" } },
      { src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/6/61/Abide_With_Me_-_Llanelli_Male_Voice_Choir.ogg/Abide_With_Me_-_Llanelli_Male_Voice_Choir.ogg.mp3",
        title: "찬송가 · Abide with Me (합창 발췌)", artist: "Llanelli Male Voice Choir / Sain (Recordiau) Cyf.",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Abide_With_Me_-_Llanelli_Male_Voice_Choir.ogg",
        license: { label: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" } },
      { src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/6/61/Adeste_Fideles_-_Llanelli_Male_Voice_Choir.ogg/Adeste_Fideles_-_Llanelli_Male_Voice_Choir.ogg.mp3",
        title: "찬송가 · Adeste Fideles (합창 발췌)", artist: "Llanelli Male Voice Choir / Sain (Recordiau) Cyf.",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Adeste_Fideles_-_Llanelli_Male_Voice_Choir.ogg",
        license: { label: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" } }],
    safe: { x0: 0.28, x1: 0.7, y0: 0.15, y1: 0.57 }, thumbPos: "50% 36%" },
  { id: "cathedral", name: "성당", hint: "오르간 3곡 · 차례로 듣기", src: `${SPACE_DIR}/cathedral.mp4`, poster: `${SPACE_DIR}/cathedral.jpg`, w: 1080, h: 1920, sound: false,
    audio: [{ src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/8/88/Amazing_Grace-organ.ogg/Amazing_Grace-organ.ogg.mp3",
      title: "오르간 연주 · Amazing Grace", artist: "The Uninvited Co., Inc.",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Amazing_Grace-organ.ogg",
      license: { label: "CC BY-SA 2.5", url: "https://creativecommons.org/licenses/by-sa/2.5/" } },
      { src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/d/dd/BWV_632_organ.ogg/BWV_632_organ.ogg.mp3",
        title: "오르간 · 바흐 BWV 632", artist: "Mathsci (MIDI 오르간 연주)",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:BWV_632_organ.ogg",
        license: { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" } },
      { src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/4/47/Jesu_Du_zartes_L%C3%A4mblein_-_Peter_Nahon.ogg/Jesu_Du_zartes_L%C3%A4mblein_-_Peter_Nahon.ogg.mp3",
        title: "오르간 · Jesu, du zartes Lämblein", artist: "Peter Nahon / Arrastramiente",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Jesu_Du_zartes_L%C3%A4mblein_-_Peter_Nahon.ogg",
        license: { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" } }],
    safe: { x0: 0.14, x1: 0.92, y0: 0.16, y1: 0.72 }, thumbPos: "50% 42%" },
  { id: "meditation", name: "명상룸", hint: "싱잉볼 소리 · 명상 안내", src: `${SPACE_DIR}/meditation.mp4`, poster: `${SPACE_DIR}/meditation.jpg`, w: 720, h: 1280, sound: true, voiceGuide: true,
    safe: { x0: 0.04, x1: 0.96, y0: 0.34, y1: 0.965 }, thumbPos: "50% 0%" },
];

export function spaceRoom(id: SpaceId): SpaceRoom {
  return SPACE_ROOMS.find((r) => r.id === id) ?? SPACE_ROOMS[0];
}

export interface VideoRect { left: number; top: number; width: number; height: number }

/**
 * 영상을 화면(W×H)에 놓는 자리.
 * 1) 기본은 화면을 꽉 채운다(cover — 빈 띠 없이).
 * 2) 그러면 지켜야 할 칸이 화면 밖(또는 머리줄 아래 `insetTop`·아래 `insetBottom` 밖)으로 나가면, 그 칸이 다 들어올 만큼만 줄인다.
 *    줄어서 생긴 빈 띠는 화면이 흐린 포스터로 채운다.
 * 3) 위치는 영상 가운데를 화면 가운데에 두는 것이 기본(구도 유지). 지켜야 할 칸이 잘리는 쪽이 있으면 그만큼만 민다.
 *    덮기(빈 띠 없음)와 지킬 칸이 부딪히면 **지킬 칸이 이긴다**.
 */
export function fitRoomVideo(W: number, H: number, vw: number, vh: number, safe: SafeBox, insetTop = 0, insetBottom = 0): VideoRect {
  if (!(W > 0 && H > 0 && vw > 0 && vh > 0)) return { left: 0, top: 0, width: Math.max(0, W), height: Math.max(0, H) };
  const usableH = Math.max(1, H - insetTop - insetBottom);
  const cover = Math.max(W / vw, H / vh);
  const maxX = W / (Math.max(1e-6, safe.x1 - safe.x0) * vw);
  const maxY = usableH / (Math.max(1e-6, safe.y1 - safe.y0) * vh);
  const scale = Math.min(cover, maxX, maxY);
  const width = vw * scale;
  const height = vh * scale;
  const place = (size: number, view: number, a0: number, a1: number, lo: number, hi: number) => {
    // 덮기 구간(영상이 화면보다 클 때만) — 영상 가장자리가 화면 안으로 들어오지 않게.
    let p = (view - size) / 2;
    if (size >= view) p = Math.min(0, Math.max(view - size, p));
    // 지킬 칸 구간 — a0 은 lo 보다 아래, a1 은 hi 보다 위로 넘지 않게(이게 이긴다).
    const min = lo - a0 * size;
    const max = hi - a1 * size;
    return Math.min(Math.max(p, min), Math.max(min, max));
  };
  const left = place(width, W, safe.x0, safe.x1, 0, W);
  const top = place(height, H, safe.y0, safe.y1, insetTop, H - insetBottom);
  return { left, top, width, height };
}

/** 명상룸 소리 설정(기기에만 · 다음에 들어와도 같게). */
export interface SoundPref { on: boolean; volume: number }
export const SOUND_PREF_KEY = "wellness-care:space-sound:v1";
export const DEFAULT_SOUND: SoundPref = { on: true, volume: 0.6 };

export function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SOUND.volume;
  return Math.min(1, Math.max(0, Math.round(v * 100) / 100));
}

/** 저장된 글 → 설정. 깨졌거나 없으면 기본값. */
export function parseSoundPref(raw: string | null | undefined): SoundPref {
  if (!raw) return { ...DEFAULT_SOUND };
  try {
    const o = JSON.parse(raw) as Partial<SoundPref>;
    return {
      on: typeof o.on === "boolean" ? o.on : DEFAULT_SOUND.on,
      volume: typeof o.volume === "number" ? clampVolume(o.volume) : DEFAULT_SOUND.volume,
    };
  } catch {
    return { ...DEFAULT_SOUND };
  }
}

/** 소리 켜기·끄기 단추 — 음량이 0 인 채로 켜면 들리지 않으니 기본 음량으로 올린다. */
export function toggleSound(p: SoundPref): SoundPref {
  if (p.on) return { ...p, on: false };
  return { on: true, volume: p.volume > 0 ? p.volume : DEFAULT_SOUND.volume };
}

/** 음량 막대 — 0 으로 내리면 끈 것과 같게 보이고, 올리면 다시 켠다. */
export function setVolume(p: SoundPref, v: number): SoundPref {
  const volume = clampVolume(v);
  return { on: volume > 0, volume };
}
