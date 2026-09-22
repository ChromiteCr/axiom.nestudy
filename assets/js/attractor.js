/* 首屏：洛伦茨吸引子。
   粒子几乎从同一点出发，按洛伦茨方程运动，几秒后散成混沌。
   按住画面放下锚点：粒子按黄金角螺旋（向日葵的排法）收到锚点周围；松手，回到混沌。
   混合量用临界阻尼弹簧驱动，随时可以被新的按下或松开打断，从当前值接着走。 */
(function () {
  "use strict";
  var SIGMA = 10, RHO = 28, BETA = 8 / 3;
  var GOLDEN = Math.PI * (3 - Math.sqrt(5));
  var DT = 0.005;                // 积分步长（模型时间）
  var STEPS_PER_SEC = 240;       // 每秒积分步数：模型时间约 1.2 单位/秒
  var RESPONSE = 0.6;            // 弹簧响应时间（秒），阻尼比 1
  var FADE = "rgba(0,0,0,0.17)"; // 拖尾长度
  var STOPS = [[91, 75, 255], [47, 208, 255], [236, 247, 255]];
  var BUCKETS = 10;

  function palette() {
    var out = [];
    for (var k = 0; k < BUCKETS; k++) {
      var t = k / (BUCKETS - 1), a, b, u;
      if (t < 0.5) { a = STOPS[0]; b = STOPS[1]; u = t * 2; } else { a = STOPS[1]; b = STOPS[2]; u = (t - 0.5) * 2; }
      out.push("rgba(" + Math.round(a[0] + (b[0] - a[0]) * u) + "," + Math.round(a[1] + (b[1] - a[1]) * u) + "," + Math.round(a[2] + (b[2] - a[2]) * u) + ",0.9)");
    }
    return out;
  }

  function init(hero, canvas, hintBtn) {
    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var colors = palette();
    var W = 0, H = 0, dpr = 1, N = 0, cx = 0, cy = 0, scale = 1, radius = 1;
    var X, Y, Z, B, V, D, ORDER, SX, SY;
    var theta = -Math.PI / 4, spin = 0, running = false, visible = true, raf = 0, last = 0, now = 0, born = 0;
    var anchor = { on: false, x: 0, y: 0, since: 0, pinned: false };

    function seed(n) {
      N = n;
      X = new Float32Array(n); Y = new Float32Array(n); Z = new Float32Array(n);
      B = new Float32Array(n); V = new Float32Array(n); D = new Float32Array(n);
      SX = new Float32Array(n); SY = new Float32Array(n);
      ORDER = new Uint16Array(n);
      for (var i = 0; i < n; i++) {
        X[i] = 1 + (Math.random() - 0.5) * 1.4;
        Y[i] = 1 + (Math.random() - 0.5) * 1.4;
        Z[i] = 1 + (Math.random() - 0.5) * 1.4;
        ORDER[i] = i;
      }
      for (var j = n - 1; j > 0; j--) { var r = (Math.random() * (j + 1)) | 0, t = ORDER[j]; ORDER[j] = ORDER[r]; ORDER[r] = t; }
    }

    function layout() {
      var narrow = W < 800;
      cx = narrow ? W * 0.5 : W * 0.66;
      cy = narrow ? H * 0.36 : H * 0.53;
      scale = Math.min(narrow ? W * 0.95 : W * 0.46, H * (narrow ? 0.62 : 0.78)) / 52;
      radius = Math.min(W, H) * (narrow ? 0.3 : 0.27);
    }

    function size() {
      var r = hero.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      var want = Math.round(Math.min(2400, Math.max(700, (W * H) / 620)));
      if (!N || Math.abs(want - N) / N > 0.3) seed(want);
      layout();
    }

    function integrate(steps) {
      for (var s = 0; s < steps; s++) {
        for (var i = 0; i < N; i++) {
          var x = X[i], y = Y[i], z = Z[i];
          X[i] = x + SIGMA * (y - x) * DT;
          Y[i] = y + (x * (RHO - z) - y) * DT;
          Z[i] = z + (x * y - BETA * z) * DT;
        }
      }
    }

    function project() {
      var c = Math.cos(theta), s = Math.sin(theta);
      for (var i = 0; i < N; i++) {
        SX[i] = cx + (X[i] * c - Y[i] * s) * scale;
        SY[i] = cy - (Z[i] - 25) * scale;
      }
    }

    function draw() {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = FADE; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      var paths = [];
      for (var k = 0; k < BUCKETS; k++) paths.push(new Path2D());
      var c = Math.cos(theta), s = Math.sin(theta), step = radius / Math.sqrt(N);
      for (var i = 0; i < N; i++) {
        var x = X[i], y = Y[i], z = Z[i];
        var vx = SIGMA * (y - x), vy = x * (RHO - z) - y, vz = x * y - BETA * z;
        var speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        var bucket = Math.min(BUCKETS - 1, (speed / 190 * BUCKETS) | 0);
        var px = SX[i], py = SY[i];
        var b = B[i];
        if (b > 0.001) {
          var n = ORDER[i] + 1, ang = n * GOLDEN + spin, rr = step * Math.sqrt(n);
          px += (anchor.x + Math.cos(ang) * rr - px) * b;
          py += (anchor.y + Math.sin(ang) * rr - py) * b;
          bucket = Math.round(bucket + (BUCKETS - 1 - bucket) * Math.min(1, b));
        }
        var depth = (x * s + y * c) / 25;
        var dot = 1.15 + Math.max(0, depth) * 0.7;
        paths[bucket].rect(px, py, dot, dot);
      }
      for (var q = 0; q < BUCKETS; q++) { ctx.fillStyle = colors[q]; ctx.fill(paths[q]); }
    }

    function springs(dt) {
      var w = (2 * Math.PI) / RESPONSE, t = now - anchor.since;
      for (var i = 0; i < N; i++) {
        var target = anchor.on && t >= D[i] ? 1 : 0;
        var a = w * w * (target - B[i]) - 2 * w * V[i];
        V[i] += a * dt; B[i] += V[i] * dt;
      }
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, last ? (t - last) / 1000 : 1 / 60);
      last = t; now = t; if (!born) born = t;
      var warp = 1 + 2.5 * Math.exp(-(t - born) / 1500); // 开场先快进，让混沌在两三秒内铺开
      integrate(Math.max(1, Math.round(dt * STEPS_PER_SEC * warp)));
      theta += dt * 0.07; spin += dt * 0.22;
      project(); springs(dt); draw();
    }

    function start() { if (running || reduce) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { if (!running) return; running = false; cancelAnimationFrame(raf); }
    function sync() { if (visible && !document.hidden) start(); else stop(); }

    function drawStill() {
      size();
      integrate(1600);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (var pass = 0; pass < 70; pass++) {
        integrate(2); project();
        var p = new Path2D();
        for (var i = 0; i < N; i++) p.rect(SX[i], SY[i], 1, 1);
        ctx.fillStyle = "rgba(120,170,255,0.35)"; ctx.fill(p);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    // 锚点：离锚点近的粒子先被拉过去，像一圈涟漪
    function press(x, y, pinned) {
      project();
      anchor.x = x; anchor.y = y; anchor.on = true; anchor.pinned = !!pinned;
      anchor.since = now || performance.now();
      var far = Math.max(W, H);
      for (var i = 0; i < N; i++) {
        var dx = SX[i] - x, dy = SY[i] - y;
        D[i] = Math.min(320, (Math.sqrt(dx * dx + dy * dy) / far) * 520);
      }
      if (hintBtn && pinned) hintBtn.setAttribute("aria-pressed", "true");
    }
    function release() {
      anchor.on = false; anchor.pinned = false;
      if (hintBtn) hintBtn.setAttribute("aria-pressed", "false");
    }

    if (reduce) {
      drawStill();
      if (hintBtn) hintBtn.hidden = true;
      window.addEventListener("resize", function () { drawStill(); });
      return;
    }

    size();
    var pid = null, holdTimer = 0, sx = 0, sy = 0;
    function local(e) { var r = hero.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    hero.addEventListener("pointerdown", function (e) {
      if (e.button > 0 || e.target.closest("a, button")) return;
      pid = e.pointerId; sx = e.clientX; sy = e.clientY;
      var p = local(e);
      var begin = function () { holdTimer = 0; press(p[0], p[1], false); try { hero.setPointerCapture(pid); } catch (err) {} };
      if (e.pointerType === "mouse") begin(); else holdTimer = setTimeout(begin, 160);
    });
    hero.addEventListener("pointermove", function (e) {
      if (e.pointerId !== pid) return;
      if (!anchor.on || anchor.pinned) {
        if (holdTimer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) { clearTimeout(holdTimer); holdTimer = 0; }
        return;
      }
      var p = local(e); anchor.x = p[0]; anchor.y = p[1];
    });
    function end(e) {
      if (e.pointerId !== pid) return;
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
      pid = null;
      if (anchor.on && !anchor.pinned) release();
    }
    hero.addEventListener("pointerup", end);
    hero.addEventListener("pointercancel", end);
    hero.addEventListener("touchmove", function (e) { if (anchor.on && !anchor.pinned) e.preventDefault(); }, { passive: false });
    hero.addEventListener("contextmenu", function (e) { if (!e.target.closest("a, button")) e.preventDefault(); });
    if (hintBtn) hintBtn.addEventListener("click", function () {
      if (anchor.on) release(); else press(cx, cy, true);
    });

    var pending = 0;
    window.addEventListener("resize", function () {
      if (pending) return;
      pending = requestAnimationFrame(function () { pending = 0; size(); });
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", sync);
    sync();
  }

  window.AxiomAttractor = { init: init };
})();
