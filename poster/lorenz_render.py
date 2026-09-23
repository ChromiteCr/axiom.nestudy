# 海报用的洛伦茨吸引子：多条轨道长曝光，按速度着色，再加一层辉光。
# 视角与网站首屏一致：x' = (x cosθ − y sinθ)，y' = z，θ = −π/4。
import numpy as np
from PIL import Image, ImageFilter

SIGMA, RHO, BETA = 10.0, 28.0, 8.0 / 3.0
W, H = 3000, 2500          # 输出像素
N = 520                    # 轨道条数，少一点才看得见一根一根
BURN = 16000               # 先跑一段（大步长），让点铺满吸引子
BURN_DT = 0.005
STEPS = 40000              # 曝光步数
DT = 0.0006                # 步长要小于一个像素，线才连得上
THETA = -np.pi / 4

rng = np.random.default_rng(20260922)
x = (rng.random(N) - 0.5) * 36.0
y = (rng.random(N) - 0.5) * 36.0
z = 5.0 + rng.random(N) * 40.0


def step(x, y, z, dt):
    # 四阶龙格库塔，步长大一点也稳
    def f(x, y, z):
        return SIGMA * (y - x), x * (RHO - z) - y, x * y - BETA * z
    k1 = f(x, y, z)
    k2 = f(x + dt / 2 * k1[0], y + dt / 2 * k1[1], z + dt / 2 * k1[2])
    k3 = f(x + dt / 2 * k2[0], y + dt / 2 * k2[1], z + dt / 2 * k2[2])
    k4 = f(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2])
    return (x + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
            y + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
            z + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]))


for _ in range(BURN):
    x, y, z = step(x, y, z, BURN_DT)

# 画面范围
XMIN, XMAX = -32.0, 32.0
ZMIN, ZMAX = -2.0, 52.0
sx = (W - 1) / (XMAX - XMIN)
sz = (H - 1) / (ZMAX - ZMIN)

acc = np.zeros((3, H * W), dtype=np.float32)
c, s = np.cos(THETA), np.sin(THETA)

# 调色：慢处偏紫，快处偏青，最快接近白
STOPS = np.array([[0.36, 0.29, 1.00],
                  [0.18, 0.82, 1.00],
                  [0.93, 0.97, 1.00]], dtype=np.float32)

BLOCK = 400
for start in range(0, STEPS, BLOCK):
    px_all, w_all, t_all = [], [], []
    for _ in range(min(BLOCK, STEPS - start)):
        x, y, z = step(x, y, z, DT)
        u = x * c - y * s
        fx = (u - XMIN) * sx
        fz = (ZMAX - z) * sz
        i0 = np.floor(fx).astype(np.int32)
        j0 = np.floor(fz).astype(np.int32)
        ax = fx - i0
        az = fz - j0
        v = np.sqrt((SIGMA * (y - x)) ** 2 + (x * (RHO - z) - y) ** 2 + (x * y - BETA * z) ** 2)
        tv = np.clip(v / 210.0, 0, 1)
        for di, dj, wq in ((0, 0, (1 - ax) * (1 - az)), (1, 0, ax * (1 - az)),
                           (0, 1, (1 - ax) * az), (1, 1, ax * az)):
            ii = i0 + di
            jj = j0 + dj
            ok = (ii >= 0) & (ii < W) & (jj >= 0) & (jj < H)
            px_all.append((jj[ok] * W + ii[ok]).astype(np.int64))
            w_all.append(wq[ok].astype(np.float32))
            t_all.append(tv[ok].astype(np.float32))
    idx = np.concatenate(px_all)
    wq = np.concatenate(w_all)
    t = np.concatenate(t_all)
    lo = np.where(t < 0.5, t * 2, 0.0)
    hi = np.where(t < 0.5, 0.0, (t - 0.5) * 2)
    col = np.where((t < 0.5)[:, None],
                   STOPS[0] + (STOPS[1] - STOPS[0]) * lo[:, None],
                   STOPS[1] + (STOPS[2] - STOPS[1]) * hi[:, None])
    for ch in range(3):
        acc[ch] += np.bincount(idx, weights=col[:, ch] * wq, minlength=H * W).astype(np.float32)

acc = acc.reshape(3, H, W)
lum = acc.sum(axis=0)
ref = np.percentile(lum[lum > 0], 99.0)
tone = 1.0 - np.exp(-3.1 * acc / max(ref, 1e-6))
tone = np.clip(tone, 0, 1) ** 0.92
img = Image.fromarray((np.moveaxis(tone, 0, -1) * 255).astype(np.uint8), "RGB")

# 辉光：模糊一份叠加回去
glow = img.filter(ImageFilter.GaussianBlur(11))
base = np.asarray(img, dtype=np.float32)
gl = np.asarray(glow, dtype=np.float32)
out = np.clip(base + gl * 0.30, 0, 255).astype(np.uint8)
Image.fromarray(out, "RGB").save("/Users/billgao/Documents/Coding/axiom.nestudy/poster/lorenz.png")
print("saved", out.shape)
