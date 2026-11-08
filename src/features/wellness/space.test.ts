import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SOUND, SPACE_ROOMS, clampVolume, fitRoomVideo, parseSoundPref, setVolume, spaceRoom, toggleSound } from "./space";

const PUBLIC = join(__dirname, "..", "..", "..", "public");
/** 머리줄(‹·이름·소리 단추)이 덮는 위쪽 높이 — SpaceSheet 의 HEADER_INSET 과 같아야 한다. */
const INSET_TOP = 100;
const INSET_BOTTOM = 8;
/** 폰 화면들(CSS px) — 웹 데스크톱 폰 틀(368×822) 포함. */
const SCREENS: Array<[number, number]> = [[390, 844], [368, 822], [360, 800], [375, 667], [430, 932], [320, 568], [412, 915]];

describe("마음 쉼터 — 공간 넷과 파일", () => {
  it("불당·교회·성당·명상룸 순서 넷", () => {
    expect(SPACE_ROOMS.map((r) => r.name)).toEqual(["불당", "교회", "성당", "명상룸"]);
  });

  it("소리는 명상룸만 — 나머지는 무음", () => {
    expect(SPACE_ROOMS.filter((r) => r.sound).map((r) => r.id)).toEqual(["meditation"]);
  });

  it("영상·포스터 파일이 실제로 있고, 영상은 H.264(avc1)다 — HEVC 10비트 원본을 그대로 넣으면 안드로이드·크롬에서 안 나온다", () => {
    for (const r of SPACE_ROOMS) {
      const vid = join(PUBLIC, r.src);
      const head = readFileSync(vid).subarray(0, 64 * 1024).toString("latin1");
      expect(head, r.id).toMatch(/avc1/);
      expect(head, r.id).not.toMatch(/hvc1|hev1/);
      // faststart — moov 가 앞에 있어야 받는 동안 바로 재생된다.
      expect(head.indexOf("moov"), r.id).toBeGreaterThan(-1);
      expect(statSync(vid).size, r.id).toBeLessThan(4 * 1024 * 1024);
      expect(statSync(join(PUBLIC, r.poster)).size, r.id).toBeGreaterThan(5000);
    }
  });

  it("소리 없는 공간 영상엔 소리 트랙이 없고, 명상룸엔 있다", () => {
    for (const r of SPACE_ROOMS) {
      const buf = readFileSync(join(PUBLIC, r.src)).toString("latin1");
      const hasAudio = /soun/.test(buf.slice(0, 64 * 1024));
      expect(hasAudio, r.id).toBe(r.sound);
    }
  });

  it("모르는 id 는 첫 공간으로", () => {
    expect(spaceRoom("meditation").name).toBe("명상룸");
    expect(spaceRoom("nope" as never).id).toBe("temple");
  });
});

describe("fitRoomVideo — 인물·십자가·불상·자막이 잘리지 않는다", () => {
  for (const r of SPACE_ROOMS) {
    for (const [W, H] of SCREENS) {
      it(`${r.name} ${W}×${H}`, () => {
        const v = fitRoomVideo(W, H, r.w, r.h, r.safe, INSET_TOP, INSET_BOTTOM);
        const sx0 = v.left + r.safe.x0 * v.width, sx1 = v.left + r.safe.x1 * v.width;
        const sy0 = v.top + r.safe.y0 * v.height, sy1 = v.top + r.safe.y1 * v.height;
        expect(sx0).toBeGreaterThanOrEqual(-0.01);
        expect(sx1).toBeLessThanOrEqual(W + 0.01);
        expect(sy0).toBeGreaterThanOrEqual(INSET_TOP - 0.01);
        expect(sy1).toBeLessThanOrEqual(H - INSET_BOTTOM + 0.01);
        // 비율은 그대로(늘이거나 찌그러뜨리지 않는다)
        expect(v.width / v.height).toBeCloseTo(r.w / r.h, 5);
      });
    }
  }

  it("불당·교회·성당은 보통 폰(390×844)에서 빈 띠 없이 화면을 꽉 채운다", () => {
    for (const id of ["temple", "church", "cathedral"] as const) {
      const r = spaceRoom(id);
      const v = fitRoomVideo(390, 844, r.w, r.h, r.safe, INSET_TOP, INSET_BOTTOM);
      expect(v.left, id).toBeLessThanOrEqual(0);
      expect(v.top, id).toBeLessThanOrEqual(0);
      expect(v.left + v.width, id).toBeGreaterThanOrEqual(390);
      expect(v.top + v.height, id).toBeGreaterThanOrEqual(844);
    }
  });

  it("성당은 오른쪽 의자의 사람 때문에 가운데에서 왼쪽으로 조금 민다(그냥 cover 면 잘린다)", () => {
    const r = spaceRoom("cathedral");
    const v = fitRoomVideo(360, 800, r.w, r.h, r.safe, INSET_TOP, INSET_BOTTOM);
    const centered = (360 - v.width) / 2;
    expect(v.left).toBeLessThan(centered);
    // 그냥 가운데였다면 사람(x .89)의 오른쪽 끝이 화면 밖
    expect(centered + 0.92 * v.width).toBeGreaterThan(360);
  });

  it("명상룸 자막 상자(x .055–.945)는 좌우 끝까지 화면 안", () => {
    const r = spaceRoom("meditation");
    for (const [W, H] of SCREENS) {
      const v = fitRoomVideo(W, H, r.w, r.h, r.safe, INSET_TOP, INSET_BOTTOM);
      expect(v.left + 0.055 * v.width).toBeGreaterThanOrEqual(0);
      expect(v.left + 0.945 * v.width).toBeLessThanOrEqual(W);
      expect(v.top + 0.952 * v.height).toBeLessThanOrEqual(H);
    }
  });

  it("크기를 모르면(0) 화면 크기 그대로", () => {
    expect(fitRoomVideo(0, 0, 1080, 1920, SPACE_ROOMS[0].safe)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });
});

describe("명상룸 소리 설정", () => {
  it("저장된 글이 없거나 깨졌으면 기본(켜짐 · 60%)", () => {
    expect(parseSoundPref(null)).toEqual(DEFAULT_SOUND);
    expect(parseSoundPref("{")).toEqual(DEFAULT_SOUND);
    expect(parseSoundPref(JSON.stringify({ on: false, volume: 0.3 }))).toEqual({ on: false, volume: 0.3 });
    expect(parseSoundPref(JSON.stringify({ on: "yes", volume: 9 }))).toEqual({ on: true, volume: 1 });
  });

  it("음량은 0~1 로 자른다", () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(DEFAULT_SOUND.volume);
    expect(clampVolume(0.456)).toBe(0.46);
  });

  it("끄기·켜기 — 음량 0 인 채로 켜면 기본 음량으로 올린다", () => {
    expect(toggleSound({ on: true, volume: 0.4 })).toEqual({ on: false, volume: 0.4 });
    expect(toggleSound({ on: false, volume: 0.4 })).toEqual({ on: true, volume: 0.4 });
    expect(toggleSound({ on: false, volume: 0 })).toEqual({ on: true, volume: DEFAULT_SOUND.volume });
  });

  it("음량 막대 — 0 이면 꺼짐, 올리면 켜짐", () => {
    expect(setVolume({ on: true, volume: 0.5 }, 0)).toEqual({ on: false, volume: 0 });
    expect(setVolume({ on: false, volume: 0.5 }, 0.8)).toEqual({ on: true, volume: 0.8 });
  });
});
