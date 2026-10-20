/* NOYS - Liquid Glass: رفتارهای کوچک
   ۱) هماهنگ‌کردن رنگ نوار مرورگر با تم  ۲) نوار شناور پایین موبایل
   ۳) دکمه‌ی پخش/توقف روی پلیر مینی  ۴) براق‌شدن لبه‌ها با ماوس
   ۵) انتقال نرم بین صفحه‌ها (pjax) */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ۱) theme-color */
  function syncThemeColor() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#101216' : '#f3f4f7');
  }
  syncThemeColor();
  new MutationObserver(syncThemeColor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ۲) نوار پایین موبایل: کپی منوی اصلی (بیرون از باکس منو، چون backdrop-filter
        روی پدر باعث می‌شود position:fixed فرزند به پدر بچسبد) */
  function buildTabbar() {
    if (document.getElementById('lgTabbar')) return;
    var src = document.querySelector('.nh-menu .nh-nav');
    if (!src) return;
    var bar = src.cloneNode(true);
    bar.id = 'lgTabbar';
    bar.className = 'nh-nav lg-tabbar';
    bar.setAttribute('aria-label', 'ناوبری پایین');
    var icons = ['fa-newspaper-o', 'fa-podcast', 'fa-folder-open-o'];
    Array.prototype.forEach.call(bar.querySelectorAll('a'), function (a, i) {
      var ic = document.createElement('i');
      ic.className = 'fa ' + (icons[i] || 'fa-circle-o');
      ic.setAttribute('aria-hidden', 'true');
      a.insertBefore(ic, a.firstChild);
    });
    document.body.appendChild(bar);
  }

  /* ۳) پخش/توقف روی نوار پلیر شناور */
  function enhancePlayer() {
    var fp = document.getElementById('noysFloatingPlayer');
    if (!fp) return;
    var bar = fp.querySelector('.noys-floating-player-bar');
    var min = document.getElementById('noysFPMinimize');
    if (!bar || !min || bar.querySelector('.lg-fp-toggle')) return;

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'noys-floating-player-btn lg-fp-toggle';
    b.setAttribute('aria-label', 'پخش / توقف');
    b.innerHTML = '<i class="fa fa-pause" aria-hidden="true"></i>';
    bar.insertBefore(b, min);

    function getAudio() { return fp.querySelector('audio'); }
    function sync() {
      var a = getAudio();
      b.hidden = !a;
      b.firstChild.className = 'fa ' + (a && !a.paused ? 'fa-pause' : 'fa-play');
    }
    b.addEventListener('click', function () {
      var a = getAudio();
      if (!a) return;
      if (a.paused) { var p = a.play(); if (p && p.catch) p.catch(function () {}); }
      else a.pause();
    });
    ['play', 'pause', 'ended', 'emptied', 'loadstart'].forEach(function (ev) {
      document.addEventListener(ev, sync, true);
    });
    new MutationObserver(sync).observe(fp, { childList: true, subtree: true });
    sync();
  }

  /* ۴) براق‌شدن با ماوس (فقط دستگاه‌هایی با ماوس) */
  var SEL = '.nh-box,.posts-list>.post,.podcast-card,.noys-floating-player,.nh-btn,.nh-nav a,.nh-chip,' +
            '.noys-btn,.podcast-play-btn,.nf-links a,.nf-support,.noys-pagination-btn,.lg-tabbar,' +
            '.noys-start-card,.noys-related-card,.noys-hero-episode';
  if (!reduced && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ۵) انتقال نرم بین صفحه‌ها: pjax محتوای #noysWrapper را عوض می‌کند */
  function watchWrapper() {
    var w = document.getElementById('noysWrapper');
    if (!w || reduced) return;
    new MutationObserver(function () {
      w.classList.remove('lg-enter');
      void w.offsetWidth;
      w.classList.add('lg-enter');
    }).observe(w, { childList: true });
    w.addEventListener('animationend', function (e) {
      if (e.target === w) w.classList.remove('lg-enter');
    });
  }

  function init() { buildTabbar(); enhancePlayer(); watchWrapper(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
