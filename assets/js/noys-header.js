(function () {
  var d = document, root = d.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function $(id) { return d.getElementById(id); }

  /* ---------- تم ---------- */
  var themeBtn = $('nh-theme');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    set('noys-theme', next);
  });

  /* ---------- اندازه متن ---------- */
  function fs(delta) {
    var cur = parseFloat(get('noys-fs')) || 100;
    cur = Math.min(140, Math.max(85, cur + delta));
    root.style.fontSize = cur + '%';
    set('noys-fs', cur);
  }
  var up = $('nh-fs-up'), down = $('nh-fs-down');
  if (up) up.addEventListener('click', function () { fs(8); });
  if (down) down.addEventListener('click', function () { fs(-8); });

  /* ---------- حالت مطالعه ---------- */
  var rd = $('nh-reading');
  if (rd) {
    rd.setAttribute('aria-pressed', root.classList.contains('nh-reading') ? 'true' : 'false');
    rd.addEventListener('click', function () {
      var on = root.classList.toggle('nh-reading');
      rd.setAttribute('aria-pressed', on ? 'true' : 'false');
      set('noys-reading', on ? '1' : '0');
    });
  }

  /* ---------- منوی فعال ---------- */
  var path = location.pathname.replace(/index\.html$/, '');
  [].forEach.call(d.querySelectorAll('.nh-nav a'), function (a) {
    var p = a.getAttribute('href').replace(/index\.html$/, '');
    var home = p === '/' || p.replace(/\/+$/, '') === '';
    var on = home ? (path === '/' || /^\/page\/\d+\/?$/.test(path)) : path.indexOf(p) === 0;
    if (on) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
  });

  /* ---------- فلش‌های طبقه‌بندی ---------- */
  var sc = $('nh-scroll'), right = $('nh-right'), left = $('nh-left');
  function step() { return Math.max(160, sc.clientWidth * 0.6); }
  function updateArrows() {
    if (!sc) return;
    var rtl = getComputedStyle(sc).direction === 'rtl';
    var max = sc.scrollWidth - sc.clientWidth, x = sc.scrollLeft;
    var atRight = rtl ? x >= -2 : x >= max - 2;
    var atLeft = rtl ? x <= -(max - 2) : x <= 2;
    var fits = max <= 2;
    right.disabled = fits || atRight;
    left.disabled = fits || atLeft;
    right.hidden = left.hidden = false;
  }
  if (sc && right && left) {
    right.addEventListener('click', function () { sc.scrollBy({ left: step() }); });
    left.addEventListener('click', function () { sc.scrollBy({ left: -step() }); });
    sc.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }

  /* ---------- جستجو ---------- */
  var input = $('nh-q'), box = $('nh-results'), header = $('nh'), index = null, loading = false;
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u064b-\u065f]/g, '')
      .replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 1776; });
  }
  function load(cb) {
    if (index) return cb();
    if (loading) return;
    loading = true;
    fetch(header.getAttribute('data-index')).then(function (r) { return r.json(); }).then(function (j) {
      var arr = Array.isArray(j) ? j : (j.posts || j.items || j.documents || []);
      index = arr.map(function (p) {
        var title = p.title || p.name || '';
        return {
          title: title,
          url: p.url || p.link || p.href || '#',
          hay: norm([title, p.content, p.excerpt, p.description, p.summary, [].concat(p.tags || [], p.categories || p.category || []).join(' ')].join(' '))
        };
      });
      loading = false; cb();
    }).catch(function () { loading = false; index = []; cb(); });
  }
  function render(q) {
    var n = norm(q).trim();
    if (!n) { box.hidden = true; box.innerHTML = ''; return; }
    var words = n.split(/\s+/), hits = index.filter(function (p) {
      return words.every(function (w) { return p.hay.indexOf(w) > -1; });
    }).sort(function (a, b) {
      return (norm(b.title).indexOf(n) > -1) - (norm(a.title).indexOf(n) > -1);
    }).slice(0, 8);
    box.innerHTML = hits.length
      ? hits.map(function (p) {
          var li = d.createElement('li'), a = d.createElement('a');
          a.href = p.url; a.textContent = p.title; a.setAttribute('role', 'option'); li.appendChild(a);
          return li.outerHTML;
        }).join('')
      : '<li class="nh-empty">چیزی پیدا نشد</li>';
    box.hidden = false;
  }
  if (input && box) {
    input.addEventListener('input', function () { load(function () { render(input.value); }); });
    input.addEventListener('focus', function () { if (input.value) load(function () { render(input.value); }); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { box.hidden = true; input.blur(); }
      if (e.key === 'ArrowDown') { var a = box.querySelector('a'); if (a) { e.preventDefault(); a.focus(); } }
    });
    box.addEventListener('keydown', function (e) {
      var a = d.activeElement;
      if (e.key === 'ArrowDown' && a.parentNode.nextElementSibling) { e.preventDefault(); a.parentNode.nextElementSibling.firstChild.focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); var p = a.parentNode.previousElementSibling; (p ? p.firstChild : input).focus(); }
    });
    d.addEventListener('click', function (e) { if (!header.contains(e.target)) box.hidden = true; });
  }
})();
