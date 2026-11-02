(function () {
  "use strict";
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- dynamic strings ---------- */
  var S = {
    ar: {
      days: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
      openNow: "مفتوح الآن · حتى ", opensToday: "مغلق الآن · يفتح اليوم ", opensTomorrow: "مغلق الآن · يفتح غداً ", opensOn: "مغلق الآن · يفتح ",
      am: "ص", pm: "م", at: " ",
      pickDate: "اختر التاريخ لعرض الأوقات المتاحة.", closedDay: "العيادة مغلقة في هذا اليوم، اختر يوماً آخر.", noSlots: "لا توجد أوقات متاحة اليوم، اختر يوماً آخر.",
      needAll: "من فضلك أكمل الاسم ورقم الجوال والتاريخ واختر وقتاً.", badPhone: "رقم الجوال غير صحيح.",
      sent: "تم فتح واتساب برسالة الحجز، اضغط إرسال لإتمام الطلب.",
      msgHi: "السلام عليكم، أود حجز موعد.", name: "الاسم", phone: "الجوال", service: "الخدمة", date: "التاريخ", time: "الوقت", notes: "ملاحظات",
      pause: "إيقاف الفيديو", play: "تشغيل الفيديو", langBtn: "EN", swLabel: "الوضع الداكن"
    },
    en: {
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      openNow: "Open now · until ", opensToday: "Closed · opens today at ", opensTomorrow: "Closed · opens tomorrow at ", opensOn: "Closed · opens ",
      am: "AM", pm: "PM", at: " at ",
      pickDate: "Pick a date to see available times.", closedDay: "The clinic is closed that day, please pick another.", noSlots: "No slots left today, please pick another day.",
      needAll: "Please complete your name, mobile, date and pick a time.", badPhone: "Please enter a valid mobile number.",
      sent: "WhatsApp opened with your booking message — press send to finish.",
      msgHi: "Hello, I would like to book an appointment.", name: "Name", phone: "Mobile", service: "Service", date: "Date", time: "Time", notes: "Notes",
      pause: "Pause video", play: "Play video", langBtn: "عربي", swLabel: "Dark mode"
    }
  };
  var HOURS = { 0: [14, 21], 1: [14, 21], 2: [14, 21], 3: [14, 21], 4: [12, 20], 5: null, 6: [14, 21] };
  var WA = "966582106015";

  var lang = root.getAttribute("lang") === "en" ? "en" : "ar";
  function T() { return S[lang]; }
  function fmt(h, m) {
    var s = T(), suffix = h < 12 ? s.am : s.pm, h12 = h % 12 || 12;
    return h12 + ":" + (m < 10 ? "0" + m : m) + " " + suffix;
  }
  function riyadhNow() {
    var parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Riyadh", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { dow: map[o.weekday], h: +o.hour % 24, m: +o.minute, date: o.year + "-" + o.month + "-" + o.day };
  }

  /* ---------- language ---------- */
  function applyLang(l) {
    lang = l;
    root.setAttribute("lang", l);
    root.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
    $$("[data-ar]").forEach(function (el) {
      var v = el.getAttribute("data-" + l);
      if (v == null) return;
      if (el.hasAttribute("data-html")) el.innerHTML = v; else el.textContent = v;
    });
    $$("[data-ph-ar]").forEach(function (el) { el.setAttribute("placeholder", el.getAttribute("data-ph-" + l)); });
    $$("[data-aria-ar]").forEach(function (el) { el.setAttribute("aria-label", el.getAttribute("data-aria-" + l)); });
    var lb = $("#langBtn"); if (lb) lb.textContent = T().langBtn;
    var sw = $("#themeSwitch"); if (sw) sw.setAttribute("aria-label", T().swLabel);
    store.set("cw-lang", l);
    renderStatus(); renderSlots(); syncVideoLabel();
  }

  /* ---------- theme ---------- */
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    store.set("cw-theme", t);
    var sw = $("#themeSwitch"); if (sw) sw.setAttribute("aria-checked", t === "dark" ? "true" : "false");
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", t === "dark" ? "#070c19" : "#f6f3ee");
  }

  /* ---------- header ---------- */
  var header = $(".site-header");
  function onScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var nav = $("#nav"), menuBtn = $("#menuBtn");
  function setMenu(open) {
    if (!nav) return;
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    var ic = $(".ms", menuBtn); if (ic) ic.textContent = open ? "close" : "menu";
  }
  if (menuBtn) menuBtn.addEventListener("click", function (e) { e.stopPropagation(); setMenu(!nav.classList.contains("open")); });
  document.addEventListener("click", function (e) { if (nav && nav.classList.contains("open") && !nav.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  if (nav) $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });

  var sw = $("#themeSwitch");
  if (sw) sw.addEventListener("click", function () { applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); });
  var lb = $("#langBtn");
  if (lb) lb.addEventListener("click", function () { applyLang(lang === "ar" ? "en" : "ar"); });

  /* ---------- reveal ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else { reveals.forEach(function (el) { el.classList.add("in"); }); }

  /* ---------- hero video (laptop / mobile) ---------- */
  var video = $("#heroVideo"), vbtn = $("#vidToggle");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mq = window.matchMedia("(max-width: 760px)");
  var currentKind = "";
  function pickVideo() {
    if (!video) return;
    var kind = mq.matches ? "mobile" : "laptop";
    if (kind === currentKind) return;
    currentKind = kind;
    video.setAttribute("poster", "assets/poster-" + kind + ".jpg");
    video.style.backgroundImage = "url(assets/poster-" + kind + ".jpg)";
    video.src = "assets/hero-" + kind + ".mp4";
    video.load();
    if (!reduce) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    syncVideoLabel();
  }
  function syncVideoLabel() {
    if (!vbtn || !video) return;
    var playing = !video.paused;
    var ic = $(".ms", vbtn); if (ic) ic.textContent = playing ? "pause" : "play_arrow";
    vbtn.setAttribute("aria-label", playing ? T().pause : T().play);
  }
  if (video) {
    video.muted = true;
    pickVideo();
    if (mq.addEventListener) mq.addEventListener("change", pickVideo); else mq.addListener(pickVideo);
    video.addEventListener("play", syncVideoLabel); video.addEventListener("pause", syncVideoLabel);
    if (vbtn) vbtn.addEventListener("click", function () { if (video.paused) { video.dataset.userPaused = ""; video.play(); } else { video.dataset.userPaused = "1"; video.pause(); } });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && !reduce && video.paused && !video.dataset.userPaused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); } });
  }

  /* ---------- open / closed status + today row ---------- */
  function renderStatus() {
    var n = riyadhNow(), el = $("#openStatus");
    $$("tr[data-d]").forEach(function (tr) { tr.classList.toggle("today", +tr.getAttribute("data-d") === n.dow); });
    if (!el) return;
    var s = T(), hrs = HOURS[n.dow], cur = n.h + n.m / 60, txt, open = false;
    if (hrs && cur >= hrs[0] && cur < hrs[1]) { open = true; txt = s.openNow + fmt(hrs[1], 0); }
    else if (hrs && cur < hrs[0]) { txt = s.opensToday + fmt(hrs[0], 0); }
    else {
      for (var i = 1; i <= 7; i++) {
        var d = (n.dow + i) % 7, h = HOURS[d];
        if (h) { txt = (i === 1 ? s.opensTomorrow : s.opensOn + s.days[d] + s.at) + fmt(h[0], 0); break; }
      }
    }
    el.classList.toggle("open", open); el.classList.toggle("closed", !open);
    var t = $(".txt", el); if (t) t.textContent = txt;
  }
  renderStatus(); setInterval(renderStatus, 60000);

  /* ---------- booking ---------- */
  var dateInput = $("#bDate"), slotsBox = $("#slots"), chosen = "";
  function renderSlots() {
    if (!slotsBox) return;
    var s = T(); slotsBox.innerHTML = "";
    if (!dateInput || !dateInput.value) { slotsBox.innerHTML = '<p class="slot-msg">' + s.pickDate + "</p>"; return; }
    var p = dateInput.value.split("-"), dow = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(), hrs = HOURS[dow];
    if (!hrs) { slotsBox.innerHTML = '<p class="slot-msg warn">' + s.closedDay + "</p>"; chosen = ""; return; }
    var n = riyadhNow(), isToday = dateInput.value === n.date, count = 0, found = false;
    for (var m = hrs[0] * 60; m <= hrs[1] * 60 - 30; m += 30) {
      if (isToday && m < n.h * 60 + n.m + 30) continue;
      var label = fmt(Math.floor(m / 60), m % 60), b = document.createElement("button");
      b.type = "button"; b.className = "slot"; b.textContent = label;
      var on = chosen === dateInput.value + "|" + m;
      b.setAttribute("aria-pressed", on ? "true" : "false"); if (on) found = true;
      (function (btn, mm) { btn.addEventListener("click", function () {
        chosen = dateInput.value + "|" + mm;
        $$(".slot", slotsBox).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
      }); })(b, m);
      slotsBox.appendChild(b); count++;
    }
    if (!found) chosen = "";
    if (!count) slotsBox.innerHTML = '<p class="slot-msg warn">' + s.noSlots + "</p>";
  }
  if (dateInput) {
    var nn = riyadhNow(); dateInput.min = nn.date;
    dateInput.addEventListener("change", function () { chosen = ""; renderSlots(); });
  }
  var toast = $("#toast");
  function showToast(msg) {
    if (!toast) return;
    $(".t", toast).textContent = msg; toast.classList.add("show");
    clearTimeout(showToast._t); showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 5200);
  }
  var form = $("#bookForm");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var s = T(), name = $("#bName").value.trim(), phone = $("#bPhone").value.replace(/[^\d+]/g, ""), svc = $("#bService"), notes = $("#bNotes").value.trim();
    if (!name || !phone || !dateInput.value || !chosen) { showToast(s.needAll); return; }
    if (phone.replace(/\D/g, "").length < 9) { showToast(s.badPhone); return; }
    var mm = +chosen.split("|")[1];
    var msg = s.msgHi + "\n" + s.name + ": " + name + "\n" + s.phone + ": " + phone + "\n" + s.service + ": " + svc.options[svc.selectedIndex].text + "\n" + s.date + ": " + dateInput.value + "\n" + s.time + ": " + fmt(Math.floor(mm / 60), mm % 60) + (notes ? "\n" + s.notes + ": " + notes : "");
    window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
    showToast(s.sent);
  });

  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* ---------- init ---------- */
  applyTheme(root.getAttribute("data-theme") || "dark");
  applyLang(lang);
})();
