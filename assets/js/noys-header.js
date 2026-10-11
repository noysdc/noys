/* NOYS header: فقط فلش‌های باکس طبقه‌بندی‌ها و باز نگه داشتن کادر جستجو.
   تم / اندازه فونت / ریدینگ‌مود / منطق جستجو همان کدهای قبلی سایت‌اند (default.html و main.js). */
(function () {
  var sc = document.getElementById('nhScroll');
  var right = document.getElementById('nhRight');
  var left = document.getElementById('nhLeft');

  if (sc && right && left) {
    var step = function () { return Math.max(160, sc.clientWidth * 0.6); };
    var update = function () {
      var rtl = getComputedStyle(sc).direction === 'rtl';
      var max = sc.scrollWidth - sc.clientWidth, x = sc.scrollLeft;
      var atRight = rtl ? x >= -2 : x >= max - 2;
      var atLeft = rtl ? x <= -(max - 2) : x <= 2;
      var fits = max <= 2;
      right.disabled = fits || atRight;
      left.disabled = fits || atLeft;
      right.style.visibility = left.style.visibility = fits ? 'hidden' : 'visible';
    };
    right.addEventListener('click', function () { sc.scrollBy({ left: step() }); });
    left.addEventListener('click', function () { sc.scrollBy({ left: -step() }); });
    sc.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    update();
  }

  /* کادر جستجو همیشه باز است؛ اگر کد قبلی hidden گذاشت، برش می‌داریم */
  var panel = document.getElementById('noysSearchPanel');
  if (panel) {
    panel.hidden = false;
    var input = document.getElementById('noysSearchInput');
    if (input) input.addEventListener('focus', function () { panel.hidden = false; });
  }
})();
