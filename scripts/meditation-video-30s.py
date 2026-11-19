"""명상룸 30초 영상(2026-11-19) — 자막 없는 원본 ×3 + 10초 영상과 같은 색 보정 + 10초 영상의 자막 상자를 그대로 오려 10초씩.

쓰는 법: python3 scripts/meditation-video-30s.py <10초 자막 영상(옛 meditation.mp4)> <자막 없는 원본> <출력.mp4> [CRF=21]
  - 10초 자막 영상 = git 37401ed 의 public/wellness/space/meditation.mp4
  - 자막 없는 원본 = output/exports/wellness-all-media-2026-11-08.zip 의 02_이전영상/05_명상룸_원본소리.mp4
  - 필요: ffmpeg · numpy · Pillow
한 바퀴 = 옛 영상과 같은 242프레임(소리와 맞춤) · 소리는 바퀴마다 정확히 그 자리에서 다시 시작.
메모리를 아끼려고 원본은 한 장씩 흘려 읽는다."""
import subprocess, sys, numpy as np
cur, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
crf = sys.argv[4] if len(sys.argv) > 4 else "21"
W, H, FPS = 720, 1280, 24
DEC = f"in_color_matrix=bt709:in_range=tv,format=rgb24"

def decode_all(path, w, h, extra=""):
    vf = f"scale={w}:{h}:{DEC}" + extra
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", vf, "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)

def stream(path):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}:{DEC}", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
    p.wait()

# 1) 색 보정 LUT — 저해상도로(자막 상자 위쪽만)
cl, sl = decode_all(cur, 180, 320), decode_all(src, 180, 320)
LOOP = len(cl)
idx = [min(i, len(sl) - 1) for i in range(LOOP)]   # 한 바퀴 = 지금 영상과 같은 프레임 수(소리와 맞춤)
top = int(320 * 0.74)
A = cl[:, :top].reshape(-1, 3).astype(np.float64); B = sl[idx][:, :top].reshape(-1, 3).astype(np.int64)
lut = np.zeros((256, 3))
for c in range(3):
    s = np.bincount(B[:, c], weights=A[:, c], minlength=256); k = np.bincount(B[:, c], minlength=256)
    have = k > 20; xs = np.nonzero(have)[0]; ys = np.maximum.accumulate(s[have] / k[have])
    lut[:, c] = np.interp(np.arange(256), xs, ys)
lut = np.clip(np.round(lut), 0, 255).astype(np.uint8)
grade = lambda f: np.stack([lut[f[..., ch], ch] for ch in range(3)], axis=-1)
print("frames cur", LOOP, "src", len(sl), "grade diff(top, low-res)", round(float(np.abs(cl[:, :top].astype(np.int16) - grade(sl[idx])[:, :top]).mean()), 2))
del cl, sl, A, B

# 2) 지금 영상에서 상자 자리 네 장 — 빈 상자(0초) · 01(1.5초) · 02(5.0초) · 03(8.5초)
pick = [0, 36, 120, 204]
sel = "select='" + "+".join(f"eq(n\\,{n})" for n in pick) + "'"
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", cur, "-vf", f"{sel},scale={W}:{H}:{DEC}", "-vsync", "0", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
P = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
assert len(P) == 4, len(P)
y0 = 940
first_src = next(stream(src))
g0 = grade(first_src)
d = np.abs(P[0, y0:].astype(np.int16) - g0[y0:]).mean(axis=2)
inside = np.median(d[60:110, 120:600])
alpha = np.clip((d - 6) / max(1.0, inside - 6), 0, 1)
ys, xs = np.nonzero(alpha > 0.5)
print("box y", ys.min() + y0, ys.max() + y0, "x", xs.min(), xs.max(), "inside diff", round(float(inside), 1))
# 상자 = 둥근 사각형. 안쪽은 전부 지금 영상의 상자(알파 1), 가장자리만 부드럽게 — 반지름은 차이 지도와 가장 잘 맞는 값
from PIL import Image, ImageDraw
x0b, x1b, y0b, y1b = xs.min(), xs.max(), ys.min(), ys.max()
target = (d > 0.5 * inside)
def rr(r, ss=4):
    im = Image.new("L", (W * ss, (H - y0) * ss), 0)
    ImageDraw.Draw(im).rounded_rectangle([x0b * ss, y0b * ss, (x1b + 1) * ss - 1, (y1b + 1) * ss - 1], radius=r * ss, fill=255)
    return np.asarray(im.resize((W, H - y0), Image.LANCZOS), dtype=np.float32) / 255
best = min(range(8, 33), key=lambda r: np.abs((rr(r, 1) > 0.5) != target).sum())
alpha = rr(best)[..., None]
print("corner radius", best, "mask mismatch px", int(np.abs((alpha[..., 0] > 0.5) != target).sum()))
empty = P[0, y0:].astype(np.float32)
cards = [P[i, y0:].astype(np.float32) for i in (1, 2, 3)]

FADE_IN, FADE_OUT_AT, FADE_OUT = 0.25, 9.75, 0.30
def weight(local):
    if local < FADE_IN: return local / FADE_IN
    if local < FADE_OUT_AT: return 1.0
    return max(0.0, 1 - (local - FADE_OUT_AT) / FADE_OUT)

# 3) 30초 — 원본을 세 번 흘려 읽으며 합성
total = LOOP * 3
enc = subprocess.Popen([
    "ffmpeg", "-v", "error", "-y",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
    "-i", cur,
    # 소리는 바퀴마다 정확히 한 바퀴(242프레임 = 10.0833초) 자리에서 다시 시작 — 그냥 이어 붙이면 바퀴마다 0.04초씩 밀린다
    "-filter_complex", f"[0:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v];[1:a]apad=whole_dur={LOOP / FPS:.6f},atrim=0:{LOOP / FPS:.6f},asplit=3[a0][a1][a2];[a0][a1][a2]concat=n=3:v=0:a=1[a]",
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", crf, "-profile:v", "high", "-g", "48",
    "-colorspace", "bt709", "-color_trc", "bt709", "-color_primaries", "bt709", "-color_range", "tv",
    "-c:a", "aac", "-b:a", "96k", "-ar", "32000",
    "-frames:v", str(total), "-movflags", "+faststart", out], stdin=subprocess.PIPE)
for k in range(3):
    last = None
    frames = stream(src)
    for i in range(LOOP):
        f = next(frames, None)
        if f is None: f = last            # 원본이 한 장 짧다 — 마지막 장을 한 번 더
        last = f
        frame = grade(f)
        w = weight(i / FPS)
        region = empty * (1 - w) + cards[k] * w
        base = frame[y0:].astype(np.float32)
        frame[y0:] = np.clip(base * (1 - alpha) + region * alpha + 0.5, 0, 255).astype(np.uint8)
        enc.stdin.write(frame.tobytes())
    for _ in frames: pass
enc.stdin.close(); enc.wait()
print("written", out, "exit", enc.returncode)
