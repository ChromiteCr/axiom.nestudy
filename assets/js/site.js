/* 页面交互：语言切换、导航材质、菜单、证明逐行、训练营滑轨、线路图。 */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("touchstart", function () {}, { passive: true }); // 让 iOS 的 :active 生效

  /* ---------- 语言：一点就切，不刷新，记住选择 ---------- */
  // 分页在 <html> 上写自己的标题，主页用默认值
  var TITLES = {
    zh: doc.getAttribute("data-title-zh") || "Axiom 应用数学社",
    en: doc.getAttribute("data-title-en") || "Axiom Applied Mathematics Club"
  };
  var onLang = [];
  function lang() { return doc.getAttribute("data-lang") === "en" ? "en" : "zh"; }
  function applyLang(l, persist) {
    doc.setAttribute("data-lang", l);
    doc.lang = l === "zh" ? "zh-Hans" : "en";
    document.title = TITLES[l];
    var els = document.querySelectorAll("[data-aria-zh]");
    for (var i = 0; i < els.length; i++) els[i].setAttribute("aria-label", els[i].getAttribute("data-aria-" + l));
    if (persist) { try { localStorage.setItem("axiom-lang", l); } catch (e) {} }
    for (var k = 0; k < onLang.length; k++) onLang[k](l);
  }
  applyLang(lang(), false);
  var toggles = document.querySelectorAll("[data-lang-toggle]");
  for (var t = 0; t < toggles.length; t++) {
    toggles[t].addEventListener("click", function () { applyLang(lang() === "zh" ? "en" : "zh", true); });
  }

  /* ---------- 导航：压在首屏上用深色材质，之后换浅色 ---------- */
  var nav = document.querySelector(".nav");
  var hero = document.querySelector(".hero");
  var sheet = document.getElementById("sheet");
  var menuBtn = document.querySelector(".menu-btn");
  function tone() {
    var dark = hero && hero.getBoundingClientRect().bottom > 52 && !sheet.classList.contains("is-open");
    nav.setAttribute("data-tone", dark ? "dark" : "light");
  }

  /* ---------- 菜单（窄屏） ---------- */
  function setMenu(open) {
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    sheet.classList.toggle("is-open", open);
    tone();
  }
  menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
  sheet.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  document.addEventListener("pointerdown", function (e) {
    if (sheet.classList.contains("is-open") && !sheet.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });
  window.addEventListener("resize", function () { if (window.innerWidth > 800) setMenu(false); });

  /* ---------- 首屏 ---------- */
  if (hero && window.AxiomAttractor) {
    window.AxiomAttractor.init(hero, hero.querySelector("canvas"), hero.querySelector(".hint"));
  }
  var ready = function () { requestAnimationFrame(function () { doc.classList.add("is-ready"); }); };
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 700); })]).then(ready);
  } else { ready(); }

  /* ---------- 证明：滚到哪一行，哪一行亮起 ---------- */
  var steps = [].slice.call(document.querySelectorAll(".proof li"));
  function proof() {
    var mid = window.innerHeight * 0.62, cur = -1;
    for (var i = 0; i < steps.length; i++) if (steps[i].getBoundingClientRect().top < mid) cur = i;
    for (var j = 0; j < steps.length; j++) {
      steps[j].classList.toggle("is-lit", j <= cur);
      steps[j].classList.toggle("is-now", j === cur);
    }
  }
  if (reduce) steps.forEach(function (li) { li.classList.add("is-lit"); });

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; tone(); if (!reduce) proof(); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  tone(); if (!reduce) proof();

  /* ---------- 训练营滑轨 ---------- */
  var rail = document.querySelector(".rail");
  var prev = document.querySelector('[data-rail="prev"]');
  var next = document.querySelector('[data-rail="next"]');
  if (rail && prev && next) {
    var railState = function () {
      var max = rail.scrollWidth - rail.clientWidth - 4;
      prev.disabled = rail.scrollLeft <= 4;
      next.disabled = rail.scrollLeft >= max;
    };
    var by = function (dir) {
      var card = rail.querySelector(".phase");
      var w = card ? card.getBoundingClientRect().width + 16 : 320;
      rail.scrollBy({ left: dir * w, behavior: reduce ? "auto" : "smooth" });
    };
    prev.addEventListener("click", function () { by(-1); });
    next.addEventListener("click", function () { by(1); });
    rail.addEventListener("scroll", function () { requestAnimationFrame(railState); }, { passive: true });
    window.addEventListener("resize", railState);
    railState();
  }

  /* ---------- 线路图：移上去或点一下，看线名 ---------- */
  var svg = document.querySelector(".metro");
  if (svg) {
    var group = svg.querySelector(".lines");
    var label = document.querySelector(".ln-current");
    var dflt = document.querySelector(".ln-default");
    var lines = [].slice.call(svg.querySelectorAll(".ml"));
    var active = -1, lastType = "mouse";
    var show = function (i) {
      active = i;
      svg.classList.toggle("has-focus", i >= 0);
      for (var k = 0; k < lines.length; k++) lines[k].classList.toggle("is-on", k === i);
      if (i >= 0) {
        group.appendChild(lines[i]);
        label.textContent = lines[i].getAttribute("data-" + lang());
        dflt.hidden = true;
      } else {
        label.textContent = "";
        dflt.hidden = false;
      }
    };
    svg.addEventListener("pointerdown", function (e) { lastType = e.pointerType; });
    var hits = svg.querySelectorAll(".hit");
    for (var h = 0; h < hits.length; h++) {
      (function (el) {
        var i = +el.getAttribute("data-i");
        el.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") show(i); });
        el.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") show(-1); });
        el.addEventListener("click", function () { show(lastType === "mouse" ? i : (active === i ? -1 : i)); });
      })(hits[h]);
    }
    svg.addEventListener("click", function (e) { if (!e.target.classList.contains("hit")) show(-1); });
    onLang.push(function () { if (active >= 0) show(active); });
  }
})();
