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

/**
 * 교회·성당 음악(2026-11-23 사용자 "찬송가와 성당 음악 종류를 20곡 정도") — 위키미디어 공용(Wikimedia Commons)의
 * 자유 이용 허락 녹음만 쓴다: 퍼블릭 도메인·CC0·CC BY·CC BY-SA(🚫 NC·ND 없음) · 곡 자체도 저작권이 끝난 옛 찬송·성가만
 * (🚫 How Great Thou Art 처럼 아직 보호되는 현대 곡 · 🚫 컴퓨터 MIDI 연주는 뺐다). 파일은 서버에 두지 않고 공용의 mp3 변환본을 바로 튼다.
 * 출처·지은이·허락 조건은 「음원 출처」에 곡마다 보인다(CC BY 계열은 출처 표시가 조건).
 * 한글 찬송가 제목은 새찬송가와 가락이 같다고 확인한 곡만 붙였다(예: 165장 주님께 영광 · 369장 죄짐 맡은 우리 구주) — 나머지는 영어 제목.
 * 2026-11-23 브라우저에서 40곡 모두 실제로 불러와지는 것 확인(파일 이름 → 저장 폴더 md5 도 테스트로 묶음).
 */
const LIC = {
  CC0: { label: "CC0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  BY_25: { label: "CC BY 2.5", url: "https://creativecommons.org/licenses/by/2.5/" },
  BY_3: { label: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" },
  BY_SA_25: { label: "CC BY-SA 2.5", url: "https://creativecommons.org/licenses/by-sa/2.5/" },
  BY_SA_3: { label: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
  BY_SA_4: { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
} as const;
const COMMONS_MP3 = "https://upload.wikimedia.org/wikipedia/commons/transcoded/";
/** 공용 녹음 한 곡 — hash = 저장 폴더(md5 앞 1·2자 "a/ab") · file = 주소에 쓰는 파일 이름(%인코딩) */
function commons(hash: string, file: string, title: string, artist: string, license: { label: string; url: string }): SpaceTrack {
  return { src: `${COMMONS_MP3}${hash}/${file}/${file}.mp3`, title, artist, sourceUrl: `https://commons.wikimedia.org/wiki/File:${file}`, license };
}

export const SPACE_ROOMS: readonly SpaceRoom[] = [
  { id: "temple", name: "불당", hint: "반야심경 독경 · 눌러서 듣기", src: `${SPACE_DIR}/temple.mp4`, poster: `${SPACE_DIR}/temple.jpg`, w: 1080, h: 1920, sound: false,
    audio: [{ src: "https://static1.squarespace.com/static/58d013bbe58c6272b30dad0b/t/59b04b3f8419c24d57a36c06/1504725831272/04-heart-sutra-korean%2BV1.mp3",
      title: "반야심경 독경 · 한국어", artist: "Kwan Um School of Zen",
      sourceUrl: "https://kwanumzen.org/resources-collection/2017/9/6/heart-sutra-in-korean" }],
    safe: { x0: 0.24, x1: 0.64, y0: 0.33, y1: 0.6 }, thumbPos: "50% 45%" },
  { id: "church", name: "교회", hint: "찬송가 20곡 · 차례로 듣기", src: `${SPACE_DIR}/church.mp4`, poster: `${SPACE_DIR}/church.jpg`, w: 1080, h: 1920, sound: false,
    audio: [
      commons("6/6a", "Amazing_Grace_-_Choir.ogg", "찬송가 · 나 같은 죄인 살리신 (Amazing Grace · 영어 합창 발췌)", "Choir / Sain (Recordiau) Cyf.", LIC.BY_SA_3),
      commons("b/b8", "HWW_What_A_Friend_We_Have_In_Jesus.ogg", "찬송가 · 죄짐 맡은 우리 구주 (What a Friend We Have in Jesus · 연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("6/61", "Abide_With_Me_-_Llanelli_Male_Voice_Choir.ogg", "찬송가 · Abide with Me (합창 발췌)", "Llanelli Male Voice Choir / Sain (Recordiau) Cyf.", LIC.BY_SA_3),
      commons("5/56", "HWW_When_I_survey_the_wondrous_cross_%28Rockingham_LM%29.ogg", "찬송가 · When I Survey the Wondrous Cross (Rockingham · 연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("4/45", "Ein%27_Feste_Burg.ogg", "찬송가 · 내 주는 강한 성이요 (Ein feste Burg · 독창)", "Gareth Hughes", LIC.BY_SA_3),
      commons("1/1c", "HWW_The_Lords_My_Shepherd_Crimond.ogg", "찬송가 · 시편 23편 (The Lord's My Shepherd · Crimond · 연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("8/80", "Crown_Him_with_many_Crowns.ogg", "찬송가 · Crown Him with Many Crowns (교회 찬양)", "Vallejo Drive Church SDA", LIC.BY_3),
      commons("c/ce", "HWW_O_God_our_help_in_ages_past.ogg", "찬송가 · O God, Our Help in Ages Past (연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("5/59", "Let_saints_on_earth_in_concert_sing.ogg", "찬송가 · Let Saints on Earth in Concert Sing (성가대)", "St. Paul's Episcopal Church, Indianapolis", LIC.CC0),
      commons("5/5d", "HWW_The_Churchs_one_foundation.ogg", "찬송가 · 교회의 참된 터는 (The Church's One Foundation · 연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("7/78", "HWW_Love_divine_all_loves_excelling.ogg", "찬송가 · Love Divine, All Loves Excelling (연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("8/84", "HWW_Thine_be_the_glory.ogg", "찬송가 · 주님께 영광 (Thine Be the Glory · 연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("8/8e", "HWW_Jesus_Christ_is_risen_today.ogg", "찬송가 · Jesus Christ Is Risen Today (부활 찬송 · 연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("9/90", "HWW_There_is_a_green_hill_far_away.ogg", "찬송가 · There Is a Green Hill Far Away (연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("b/b1", "HWW_To_God_Be_The_Glory.ogg", "찬송가 · To God Be the Glory (연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("b/bb", "HWW_Just_as_I_am_Saffron_Walden.ogg", "찬송가 · Just as I Am (Saffron Walden · 연주)", "Arthur Henry Brown(곡) · Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("d/d2", "HWW_For_The_Beauty_Of_The_Earth.ogg", "찬송가 · For the Beauty of the Earth (연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("6/61", "Adeste_Fideles_-_Llanelli_Male_Voice_Choir.ogg", "찬송가 · 참 반가운 신도여 (Adeste Fideles · 합창 발췌)", "Llanelli Male Voice Choir / Sain (Recordiau) Cyf.", LIC.BY_SA_3),
      commons("2/25", "HWW_Silent_Night.ogg", "찬송가 · 고요한 밤 거룩한 밤 (Silent Night · 연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
      commons("3/3e", "HWW_Joy_To_The_World.ogg", "찬송가 · 기쁘다 구주 오셨네 (Joy to the World · 연주)", "Richard MS Irwin (hymnswithoutwords.com)", LIC.BY_SA_4),
    ],
    safe: { x0: 0.28, x1: 0.7, y0: 0.15, y1: 0.57 }, thumbPos: "50% 36%" },
  { id: "cathedral", name: "성당", hint: "오르간·성가 20곡 · 차례로 듣기", src: `${SPACE_DIR}/cathedral.mp4`, poster: `${SPACE_DIR}/cathedral.jpg`, w: 1080, h: 1920, sound: false,
    audio: [
      commons("8/88", "Amazing_Grace-organ.ogg", "오르간 연주 · Amazing Grace", "The Uninvited Co., Inc.", LIC.BY_SA_25),
      commons("f/f8", "Rorate_Caeli_~_Gregorian_Chant.ogg", "그레고리오 성가 · Rorate Caeli (대림 성가)", "Inritter", LIC.BY_SA_4),
      commons("e/e1", "Missa_Papae_Marcelli_-_I._Kyrie.flac", "팔레스트리나 · 교황 마르첼루스 미사 — Kyrie", "European Archive / Musopen", LIC.CC0),
      commons("4/47", "Jesu_Du_zartes_L%C3%A4mblein_-_Peter_Nahon.ogg", "오르간 · Jesu, du zartes Lämblein", "Peter Nahon / Arrastramiente", LIC.BY_SA_4),
      commons("1/11", "Byrd_-_Ave_Verum_Corpus_%28Stile_Antico%29.ogg", "버드 · Ave verum corpus (합창)", "Stile Antico (StPaulsIndy 녹화)", LIC.CC0),
      commons("0/01", "Pange_Lingua_Latin_in_Latin.ogg", "그레고리오 성가 · Pange lingua", "Gareth Hughes", LIC.BY_SA_3),
      commons("3/37", "Tomas_Luis_de_Victoria_O_vos_omnes_%28The_Tudor_Consort%29.ogg", "빅토리아 · O vos omnes (합창)", "The Tudor Consort", LIC.BY_25),
      commons("2/2c", "Johann_Pachelbel_Nun_komm_der_Heiden_Heiland.ogg", "오르간 · 파헬벨 「Nun komm, der Heiden Heiland」", "Burghard Fischer", LIC.BY_SA_3),
      commons("7/77", "Ave_verum_Mozart_Senftenberg2008.ogg", "모차르트 · Ave verum corpus (합창·관현악)", "Senftenberg 합창단·관현악단 / Metzner", LIC.BY_SA_3),
      commons("7/7b", "Sanantimo_gregorian.ogg", "그레고리오 성가 · 산탄티모 수도원 주일 미사", "Zyance", LIC.BY_SA_3),
      commons("2/29", "Tallis_-_If_ye_love_me.ogg", "탈리스 · If ye love me (합창)", "Coro Santa Pazienza", LIC.BY_3),
      commons("a/ae", "Panis_Angelicus_Cesar_Frank.webm", "프랑크 · Panis angelicus (합창)", "Coral Ahots-Argiak / Mentxuwiki", LIC.CC0),
      commons("2/27", "Bach%2C_BWV_147%2C_10._Jesus_bleibet_meine_Freude.ogg", "바흐 · Jesus bleibet meine Freude (BWV 147)", "Orchestra Gli Armonici", LIC.CC0),
      commons("9/90", "The_Tudor_Consort_-_01_-_Palestrina_-_Sicut_lilium_inter_spinas.ogg", "팔레스트리나 · Sicut lilium inter spinas (합창)", "The Tudor Consort", LIC.BY_3),
      commons("d/d2", "Gregorian_chant_-_Procedamus_in_pace_-_Cum_angelis_-_Psalm_24_%2823%29_%28German-Polish_accent%29.ogg", "그레고리오 성가 · Cum angelis", "Paterm", LIC.BY_SA_3),
      commons("7/78", "Byrd_4-Part_Mass_-_Agnus_Dei.ogg", "버드 · 4성부 미사 — Agnus Dei", "Ensemble Morales", LIC.BY_3),
      commons("2/20", "Temple_neuf_de_Metz_-_Orgue_-_C%C3%A9sar_Franck.wav", "오르간 · 프랑크 변주 (메츠 템플 뇌프)", "Fredamas", LIC.BY_SA_4),
      commons("8/8c", "Kyrie_de_Tomas_Luis_de_Victoria.webm", "빅토리아 · Kyrie (합창)", "Coral Ahots-Argiak / Mentxuwiki", LIC.CC0),
      commons("d/d7", "Allegri_-_Miserere_Mei%2C_Deus_-_Ensamble_Esc%C3%A9nico_Vocal_%28audio%29.ogg", "알레그리 · Miserere mei, Deus (합창)", "Ensamble Escénico Vocal", LIC.BY_3),
      commons("0/04", "Missa_Papae_Marcelli_-_V._Agnus_Dei_I.flac", "팔레스트리나 · 교황 마르첼루스 미사 — Agnus Dei", "European Archive / Musopen", LIC.CC0),
    ],
    safe: { x0: 0.14, x1: 0.92, y0: 0.16, y1: 0.72 }, thumbPos: "50% 42%" },
  // 명상룸 영상 = 30초(2026-11-19 · 10초 장면 ×3, 자막 한 장 10초씩 — 음성 안내가 서두르지 않게). 원본(05 · 자막 없음) + 지금 영상과 같은 색 보정 + 같은 자막 상자.
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
