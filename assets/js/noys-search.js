/* =========================================================
   NOYS - جست‌وجوی سمت مرورگر (بدون سرور، بدون کتابخانه)
   داده از /search.json خونده میشه. نرمال‌سازی فارسی:
   ي/ك عربی، اعراب، کشیده، نیم‌فاصله، ارقام عربی/فارسی.
   ========================================================= */
(function (root) {
  'use strict';

  /* ---------- نرمال‌سازی ---------- */

  var CHAR_MAP = {
    '\u064A': '\u06CC', /* ي → ی */
    '\u0649': '\u06CC', /* ى → ی */
    '\u0643': '\u06A9', /* ك → ک */
    '\u0629': '\u0647', /* ة → ه */
    '\u0623': '\u0627', /* أ → ا */
    '\u0625': '\u0627', /* إ → ا */
    '\u0622': '\u0627', /* آ → ا */
    '\u0624': '\u0648'  /* ؤ → و */
  };

  function isDropped(code) {
    return (
      code === 0x200C || /* نیم‌فاصله */
      code === 0x200D || /* ZWJ */
      code === 0x200F || code === 0x200E || /* علامت جهت */
      code === 0x0640 || /* کشیده */
      (code >= 0x064B && code <= 0x065F) || /* اعراب */
      code === 0x0670
    );
  }

  /* خروجی: متن نرمال‌شده + نقشه‌ی «اندیس نرمال → اندیس اصلی» برای هایلایت دقیق */
  function normWithMap(str) {
    str = String(str == null ? '' : str);
    var out = [];
    var map = [];
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      var code = str.charCodeAt(i);
      if (isDropped(code)) continue;
      if (code >= 0x06F0 && code <= 0x06F9) ch = String(code - 0x06F0); /* ۰-۹ */
      else if (code >= 0x0660 && code <= 0x0669) ch = String(code - 0x0660); /* ٠-٩ */
      else if (CHAR_MAP[ch]) ch = CHAR_MAP[ch];
      else ch = ch.toLowerCase();
      out.push(ch);
      map.push(i);
    }
    return { text: out.join(''), map: map };
  }

  function norm(str) {
    return normWithMap(str).text;
  }

  function tokenize(query) {
    var q = String(query == null ? '' : query)
      .replace(/\u200C/g, '') /* «میکردند» و «می‌کردند» یکی حساب بشن */
      .trim();
    if (!q) return [];
    var parts = q.split(/\s+/);
    var tokens = [];
    for (var i = 0; i < parts.length; i++) {
      var t = norm(parts[i]);
      if (t) tokens.push(t);
    }
    return tokens;
  }

  /* ---------- ایندکس و امتیازدهی ---------- */

  function buildIndex(docs) {
    var idx = [];
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i];
      idx.push({
        doc: d,
        t: norm(d.title),
        d: norm(d.desc),
        k: norm((d.tags || []).concat(d.cats || []).join(' ')),
        b: norm(d.content)
      });
    }
    return idx;
  }

  function countOcc(hay, needle, cap) {
    var n = 0, pos = 0;
    while (n < cap) {
      pos = hay.indexOf(needle, pos);
      if (pos === -1) break;
      n++;
      pos += needle.length;
    }
    return n;
  }

  function search(index, query) {
    var tokens = tokenize(query);
    if (!tokens.length) return { tokens: tokens, results: [] };
    var results = [];
    for (var i = 0; i < index.length; i++) {
      var e = index[i];
      var score = 0;
      var ok = true;
      for (var j = 0; j < tokens.length; j++) {
        var tk = tokens[j];
        var s = 0;
        if (e.t.indexOf(tk) !== -1) s += 10 + (e.t.indexOf(tk) === 0 ? 3 : 0);
        if (e.k.indexOf(tk) !== -1) s += 5;
        if (e.d.indexOf(tk) !== -1) s += 3;
        var c = countOcc(e.b, tk, 5);
        if (c) s += Math.min(c, 5);
        if (!s) { ok = false; break; }
        score += s;
      }
      if (ok) results.push({ entry: e, score: score });
    }
    results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.entry.doc.date).localeCompare(String(a.entry.doc.date));
    });
    return { tokens: tokens, results: results };
  }

  /* ---------- هایلایت و خلاصه‌ی متن ---------- */

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* بازه‌هایی (روی متن اصلی) که با توکن‌ها می‌خونن */
  function findRanges(original, tokens) {
    var nm = normWithMap(original);
    var ranges = [];
    for (var j = 0; j < tokens.length; j++) {
      var tk = tokens[j], pos = 0;
      while ((pos = nm.text.indexOf(tk, pos)) !== -1) {
        var s = nm.map[pos];
        var e = nm.map[pos + tk.length - 1] + 1;
        ranges.push([s, e]);
        pos += tk.length;
      }
    }
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    for (var k = 0; k < ranges.length; k++) {
      var r = ranges[k], last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    }
    return merged;
  }

  function highlight(original, tokens) {
    var ranges = findRanges(original, tokens);
    var out = '', cur = 0;
    for (var i = 0; i < ranges.length; i++) {
      out += escapeHtml(original.slice(cur, ranges[i][0]));
      out += '<mark>' + escapeHtml(original.slice(ranges[i][0], ranges[i][1])) + '</mark>';
      cur = ranges[i][1];
    }
    return out + escapeHtml(original.slice(cur));
  }

  /* خلاصه: دور اولین تطابق در متن (یا توضیح پست اگه تطابقی در متن نبود) */
  function snippet(doc, tokens) {
    var body = String(doc.content || '');
    var ranges = findRanges(body, tokens);
    var text;
    if (ranges.length) {
      var start = Math.max(0, ranges[0][0] - 70);
      var end = Math.min(body.length, ranges[0][1] + 110);
      text = (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
    } else {
      text = String(doc.desc || '');
    }
    return highlight(text, tokens);
  }

  var api = {
    norm: norm,
    tokenize: tokenize,
    buildIndex: buildIndex,
    search: search,
    highlight: highlight,
    snippet: snippet
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NoysSearch = api;

  /* ---------- رابط کاربری (فقط روی صفحه‌ی /search/) ---------- */

  function toFa(n) {
    return String(n).replace(/\d/g, function (d) { return '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'.charAt(d); });
  }

  function init() {
    var wrap = document.getElementById('noysSearchApp');
    if (!wrap) return;
    var input = document.getElementById('noysSearchPageInput');
    var status = document.getElementById('noysSearchStatus');
    var list = document.getElementById('noysSearchResults');
    var help = document.getElementById('noysSearchHelp');
    var jsonUrl = wrap.getAttribute('data-search-json');
    var base = wrap.getAttribute('data-baseurl') || '';
    var index = null;
    var timer = null;

    function setStatus(msg) { status.textContent = msg; }

    function render() {
      var q = input.value;
      try {
        var u = new URL(window.location.href);
        if (q.trim()) u.searchParams.set('q', q.trim()); else u.searchParams.delete('q');
        window.history.replaceState(null, '', u.toString());
      } catch (e) { /* مرورگر قدیمی */ }

      if (!index) return;
      var res = search(index, q);
      list.innerHTML = '';
      if (!res.tokens.length) {
        help.hidden = false;
        setStatus('');
        return;
      }
      help.hidden = true;
      if (!res.results.length) {
        setStatus('نتیجه‌ای پیدا نشد. با کلمه‌ی کوتاه‌تر یا نام اشخاص و کارتل‌ها امتحان کن.');
        return;
      }
      setStatus(toFa(res.results.length) + ' نتیجه');
      var html = '';
      var max = Math.min(res.results.length, 30);
      for (var i = 0; i < max; i++) {
        var d = res.results[i].entry.doc;
        var img = d.img ? '<img src="' + escapeHtml(base + '/assets/img/' + d.img) + '" alt="" loading="lazy" width="120" height="68">' : '';
        html += '<li class="noys-search-result"><a href="' + escapeHtml(base + d.url) + '">' + img +
          '<span class="noys-search-result-body">' +
          '<span class="noys-search-result-title">' + highlight(d.title, res.tokens) + '</span>' +
          '<span class="noys-search-result-meta">' + escapeHtml(d.date || '') + '</span>' +
          '<span class="noys-search-result-snippet">' + snippet(d, res.tokens) + '</span>' +
          '</span></a></li>';
      }
      list.innerHTML = html;
    }

    function onInput() {
      clearTimeout(timer);
      timer = setTimeout(render, 120);
    }

    input.addEventListener('input', onInput);
    var form = document.getElementById('noysSearchPageForm');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); render(); });

    try {
      var initial = new URL(window.location.href).searchParams.get('q');
      if (initial) input.value = initial;
    } catch (e) { /* مرورگر قدیمی */ }

    setStatus('در حال بارگذاری فهرست مطالب…');
    fetch(jsonUrl)
      .then(function (r) { return r.json(); })
      .then(function (docs) {
        index = buildIndex(docs);
        setStatus('');
        render();
        input.focus();
      })
      .catch(function () {
        setStatus('بارگذاری جست‌وجو ناموفق بود. صفحه رو دوباره باز کن.');
      });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : this);
