/* 研究分页里的三张可交互插图：
   acq  抗体筛选中 μ + βσ 的取舍
   spec 非谐性把泛音推离整数倍
   heat 几种供暖方案的年度支出
   没有依赖，参数一动就当场重画。数值都是示意用的，页面上写明了。 */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var draws = [];

  function mk(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] !== null) e.setAttribute(k, attrs[k]);
    return e;
  }
  function lang() { return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "zh"; }
  function t(zh, en) { return lang() === "zh" ? zh : en; }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  // 固定种子的伪随机：每次打开，图形都一样
  function rand(seed) {
    return function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  }
  function num(v, d) { return v.toFixed(d === undefined ? 2 : d); }

  /* ---------- 一、抗体：μ + βσ 挑出哪几条 ---------- */
  function acqFig(root) {
    var svg = root.querySelector("svg");
    var beta = root.querySelector('[data-ctl="beta"]');
    var out = root.querySelector('[data-out="beta"]');
    var read = root.querySelector(".readout");
    var W = 640, H = 300, L = 40, R = 16, T = 18, B = 30, K = 8;
    var r = rand(20260922), pts = [], i;
    for (i = 0; i < 86; i++) {
      pts.push({
        x: 0.03 + 0.94 * r(),
        mu: 0.12 + 0.76 * Math.pow(r(), 1.35),
        sg: 0.025 + 0.20 * Math.pow(r(), 1.9)
      });
    }
    var px = function (p) { return L + p.x * (W - L - R); };
    var py = function (v) { return H - B - v * (H - T - B); };
    var hover = -1;

    function draw() {
      var b = +beta.value / 100;
      var order = pts.map(function (p, j) { return { j: j, a: p.mu + b * p.sg }; });
      order.sort(function (m, n) { return n.a - m.a; });
      var chosen = {}, sm = 0, ss = 0;
      for (i = 0; i < K; i++) { chosen[order[i].j] = 1; sm += pts[order[i].j].mu; ss += pts[order[i].j].sg; }

      clear(svg);
      svg.appendChild(mk("path", { class: "axis", d: "M" + L + " " + T + " L" + L + " " + (H - B) + " L" + (W - R) + " " + (H - B) }));
      svg.appendChild(mk("text", { x: L - 8, y: py(1) + 4, "text-anchor": "end", class: "cm" })).textContent = "1.0";
      svg.appendChild(mk("text", { x: L - 8, y: py(0) + 4, "text-anchor": "end", class: "cm" })).textContent = "0";
      var lab = mk("text", { x: L + 4, y: T + 2, class: "fig-lab" });
      lab.textContent = t("纵轴：预测亲和力 μ；竖线为 ±σ", "Vertical axis: predicted affinity μ, bars are ±σ");
      svg.appendChild(lab);

      for (i = 0; i < pts.length; i++) {
        var p = pts[i], on = chosen[i] === 1, x = px(p), g = mk("g", {
          class: "cand" + (on ? " is-on" : "") + (hover === i ? " is-hover" : ""), "data-i": i
        });
        g.appendChild(mk("line", { x1: x, y1: py(Math.min(1, p.mu + p.sg)), x2: x, y2: py(Math.max(0, p.mu - p.sg)), class: "bar" }));
        g.appendChild(mk("circle", { cx: x, cy: py(p.mu), r: on ? 5 : 3.6, class: "dot" }));
        g.appendChild(mk("circle", { cx: x, cy: py(p.mu), r: 11, class: "hit" }));
        svg.appendChild(g);
      }

      out.textContent = "β = " + num(b);
      if (hover >= 0) {
        var h = pts[hover];
        read.textContent = t("所指候选：μ = " + num(h.mu) + "，σ = " + num(h.sg) + "，μ + βσ = " + num(h.mu + b * h.sg),
          "This one: μ = " + num(h.mu) + ", σ = " + num(h.sg) + ", μ + βσ = " + num(h.mu + b * h.sg));
      } else {
        read.textContent = t("入选 " + K + " 条，平均 μ = " + num(sm / K) + "，平均 σ = " + num(ss / K) + "。β 增大，选择转向模型尚无把握的候选。",
          "Selected " + K + ": mean μ = " + num(sm / K) + ", mean σ = " + num(ss / K) + ". Raise β and the model starts picking the ones it is unsure about.");
      }
    }

    svg.addEventListener("pointerover", function (e) {
      var g = e.target.parentNode;
      if (g && g.classList && g.classList.contains("cand")) { hover = +g.getAttribute("data-i"); draw(); }
    });
    svg.addEventListener("pointerleave", function () { if (hover !== -1) { hover = -1; draw(); } });
    beta.addEventListener("input", function () { hover = -1; draw(); });
    draws.push(draw);
    draw();
  }

  /* ---------- 二、弦：非谐性把泛音推高 ---------- */
  function specFig(root) {
    var svg = root.querySelector("svg");
    var ctl = root.querySelector('[data-ctl="binh"]');
    var out = root.querySelector('[data-out="binh"]');
    var read = root.querySelector(".readout");
    var W = 640, H = 250, L = 34, BASE = 196, SPAN = 480, N = 16;
    var hover = -1;

    function ratio(n, b) { return Math.sqrt((1 + b * n * n) / (1 + b)); }
    function height(n) { return 148 / (1 + 0.30 * (n - 1)) + 12; }

    function draw() {
      var b = +ctl.value / 1000000;
      clear(svg);
      svg.appendChild(mk("line", { x1: L - 8, y1: BASE, x2: W - 10, y2: BASE, class: "axis" }));
      var n, x, h;
      for (n = 1; n <= N; n++) {
        x = L + (n / N) * SPAN; h = height(n);
        svg.appendChild(mk("line", { x1: x, y1: BASE, x2: x, y2: BASE - h, class: "ideal" }));
      }
      for (n = 1; n <= N; n++) {
        h = height(n);
        x = L + (n / N) * SPAN * ratio(n, b);
        var g = mk("g", { class: "part" + (hover === n ? " is-hover" : ""), "data-n": n });
        g.appendChild(mk("line", { x1: x, y1: BASE, x2: x, y2: BASE - h, class: "line" }));
        g.appendChild(mk("rect", { x: x - 9, y: BASE - h - 6, width: 18, height: h + 14, class: "hit" }));
        svg.appendChild(g);
      }
      svg.appendChild(mk("text", { x: L, y: BASE + 22, class: "fig-lab" })).textContent =
        t("虚线：整数倍的理想位置　实线：实际泛音", "Dashed: ideal integer multiples　Solid: actual partials");
      svg.appendChild(mk("text", { x: W - 10, y: BASE + 22, "text-anchor": "end", class: "fig-lab" })).textContent =
        t("频率 →", "frequency →");

      var cents = function (n) { return 1200 * Math.log(ratio(n, b)) / Math.LN2; };
      out.innerHTML = "B = " + (b === 0 ? "0" : num(b * 1000, 2) + " × 10<sup>−3</sup>");
      if (hover > 0) {
        read.textContent = t("第 " + hover + " 次泛音：较整数倍高 " + Math.round(cents(hover)) + " 音分。",
          "Partial " + hover + ": " + Math.round(cents(hover)) + " cents above the integer multiple.");
      } else {
        read.textContent = t("第 16 次泛音较整数倍高 " + Math.round(cents(N)) + " 音分。低次几乎重合，差异要到高次才显现。",
          "The 16th partial sits " + Math.round(cents(N)) + " cents above its integer multiple. The low partials nearly coincide; the gap only opens up higher.");
      }
    }

    svg.addEventListener("pointerover", function (e) {
      var g = e.target.parentNode;
      if (g && g.classList && g.classList.contains("part")) { hover = +g.getAttribute("data-n"); draw(); }
    });
    svg.addEventListener("pointerleave", function () { if (hover !== -1) { hover = -1; draw(); } });
    ctl.addEventListener("input", function () { draw(); });
    draws.push(draw);
    draw();
  }

  /* ---------- 三、供暖：三条路径的年度支出 ---------- */
  function heatFig(root) {
    var svg = root.querySelector("svg");
    var yr = root.querySelector('[data-ctl="exit"]');
    var cop = root.querySelector('[data-ctl="cop"]');
    var outY = root.querySelector('[data-out="exit"]');
    var outC = root.querySelector('[data-out="cop"]');
    var read = root.querySelector(".readout");
    var seg = root.querySelector(".seg");
    var W = 640, H = 280, L = 44, R = 14, T = 16, B = 34, YEARS = 12;
    var pick = "hp";
    var PLAN = {
      gas: { zh: "煤改气", en: "Coal to gas", retro: 2.0, run: function () { return 1.15; } },
      ele: { zh: "煤改电", en: "Coal to electricity", retro: 1.5, run: function () { return 1.6; } },
      hp: { zh: "热泵", en: "Heat pump", retro: 4.0, run: function (c) { return 1.6 / c; } }
    };
    var keys = ["gas", "ele", "hp"];

    function series(key, exit, c) {
      var p = PLAN[key], a = [], i;
      for (i = 1; i <= YEARS; i++) {
        var sub = i <= exit;
        var v = p.run(c) * (sub ? 0.6 : 1) + (i === 1 ? p.retro * (exit > 0 ? 0.5 : 1) : 0);
        a.push(v);
      }
      return a;
    }
    function total(a) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i]; return s; }

    function draw() {
      var exit = +yr.value, c = +cop.value / 10;
      var data = {}, top = 1.2, i, k;
      for (i = 0; i < keys.length; i++) {
        data[keys[i]] = series(keys[i], exit, c);
        for (k = 0; k < YEARS; k++) top = Math.max(top, data[keys[i]][k]);
      }
      top = Math.ceil(top * 2) / 2;
      var px = function (i) { return L + (i / YEARS) * (W - L - R); };
      var py = function (v) { return H - B - (v / top) * (H - T - B); };

      clear(svg);
      svg.appendChild(mk("path", { class: "axis", d: "M" + L + " " + T + " L" + L + " " + (H - B) + " L" + (W - R) + " " + (H - B) }));
      svg.appendChild(mk("line", { x1: L, y1: py(1), x2: W - R, y2: py(1), class: "grid" }));
      svg.appendChild(mk("text", { x: W - R, y: py(1) - 8, "text-anchor": "end", class: "fig-lab" })).textContent =
        t("继续烧煤 = 1", "staying on coal = 1");
      if (exit > 0) {
        svg.appendChild(mk("line", { x1: px(exit), y1: T, x2: px(exit), y2: H - B, class: "grid" }));
        svg.appendChild(mk("text", { x: px(exit) + 6, y: T + 12, class: "fig-lab" })).textContent =
          t("补贴退出", "subsidy ends");
      }
      for (i = 0; i <= YEARS; i += 4) {
        var tick = i === 0 ? "1" : String(i);
        svg.appendChild(mk("text", { x: px(i), y: H - B + 20, "text-anchor": i === YEARS ? "end" : "middle", class: "cm" }))
          .textContent = i === YEARS ? tick + t(" 年", " yr") : tick;
      }
      svg.appendChild(mk("text", { x: L - 8, y: py(top) + 4, "text-anchor": "end", class: "cm" })).textContent = num(top, 1);

      for (i = 0; i < keys.length; i++) {
        var key = keys[i], a = data[key], d = "";
        for (k = 0; k < YEARS; k++) {
          d += (k ? " L" : "M") + px(k) + " " + py(a[k]) + " L" + px(k + 1) + " " + py(a[k]);
        }
        svg.appendChild(mk("path", { d: d, class: "plan" + (key === pick ? " is-on" : "") , "data-k": key }));
      }
      svg.appendChild(mk("text", { x: L + 4, y: T + 2, class: "fig-lab" })).textContent =
        t("纵轴：年度支出，以继续烧煤为 1", "Vertical axis: yearly spend, coal = 1");

      var best = keys[0], bt = total(data[best]);
      for (i = 1; i < keys.length; i++) { var v = total(data[keys[i]]); if (v < bt) { bt = v; best = keys[i]; } }
      outY.textContent = exit === 0 ? t("没有补贴", "none") : t("第 " + exit + " 年", "year " + exit);
      outC.textContent = "COP " + num(c, 1);
      var mine = total(data[pick]);
      read.textContent = best === pick
        ? t(PLAN[pick].zh + "十二年累计 " + num(mine, 1) + "，为三者最低。调整补贴年限与能效，名次随之改变。",
            PLAN[pick].en + " totals " + num(mine, 1) + " over twelve years, the lowest of the three. Move the subsidy or the efficiency and the order changes.")
        : t(PLAN[pick].zh + "十二年累计 " + num(mine, 1) + "；最低的是" + PLAN[best].zh + "，" + num(bt, 1) + "。调整补贴年限与能效，名次随之改变。",
            PLAN[pick].en + " totals " + num(mine, 1) + " over twelve years; the lowest is " + PLAN[best].en + " at " + num(bt, 1) + ". Move the subsidy or the efficiency and the order changes.");
      var btns = seg.querySelectorAll("button");
      for (i = 0; i < btns.length; i++) btns[i].setAttribute("aria-pressed", btns[i].getAttribute("data-k") === pick ? "true" : "false");
    }

    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      pick = b.getAttribute("data-k");
      draw();
    });
    yr.addEventListener("input", draw);
    cop.addEventListener("input", draw);
    draws.push(draw);
    draw();
  }

  var starters = { acq: acqFig, spec: specFig, heat: heatFig };
  var figs = document.querySelectorAll("[data-fig]");
  for (var i = 0; i < figs.length; i++) {
    var kind = figs[i].getAttribute("data-fig");
    if (starters[kind]) starters[kind](figs[i]);
  }
  if (draws.length && "MutationObserver" in window) {
    new MutationObserver(function () {
      for (var j = 0; j < draws.length; j++) draws[j]();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-lang"] });
  }
})();
