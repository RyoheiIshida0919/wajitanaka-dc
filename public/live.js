// 更新ダッシュボード（wajitanaka-dashboard）の内容をページに反映する。
// 取得に失敗してもページに書かれている元の内容がそのまま残る。
(function () {
  var API = 'https://wajitanaka-dashboard.ishida-a0f.workers.dev/api/site';
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var DAYS = ['月', '火', '水', '木', '金', '土', '日'];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }

  function renderAlert(a) {
    if (!a || !a.on || !a.text) return;
    var bar = el('div');
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'background:#fff4cc;color:#3a2e00;border-bottom:1px solid #e0c15a;padding:12px 16px;text-align:center;font-size:15px;font-weight:700;line-height:1.6;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",sans-serif;white-space:pre-line;';
    bar.appendChild(document.createTextNode(a.text));
    var link = safeUrl(a.link);
    if (link) {
      var l = el('a', null, '　詳しくはこちら');
      l.href = link; l.style.cssText = 'color:#3a2e00;text-decoration:underline;white-space:nowrap;';
      bar.appendChild(l);
    }
    var skip = document.querySelector('.skip-link');
    document.body.insertBefore(bar, skip ? skip.nextSibling : document.body.firstChild);
  }

  function renderNews(list) {
    var ul = document.querySelector('[data-live="news"]');
    if (!ul || !list) return;
    var items = list.filter(function (n) { return n.visible; })
      .sort(function (a, b) { return (b.pinned - a.pinned) || b.date.localeCompare(a.date); }).slice(0, 5);
    if (!items.length) return;
    ul.textContent = '';
    items.forEach(function (n) {
      var li = el('li', 'news__item');
      var p = n.date.split('-');
      li.appendChild(el('p', 'news__date', p[0] + '.' + p[1] + '.' + p[2]));
      li.appendChild(el('p', 'news__title', n.title));
      if (n.body) li.appendChild(el('p', 'news__body', n.body));
      var link = safeUrl(n.link);
      if (link) { var a = el('a', 'news__more', '詳しくはこちら'); a.href = link; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.appendChild(a); }
      ul.appendChild(li);
    });
    ul.hidden = false;
  }

  function renderHours(h) {
    var body = document.querySelector('[data-live="hours-body"]');
    if (body && h && h.rows && h.rows.length) {
      body.textContent = '';
      h.rows.forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('td', null, r.label));
        for (var i = 0; i < 7; i++) tr.appendChild(el('td', null, r.days[i] ? '●' : ''));
        body.appendChild(tr);
      });
    }
    var note = document.querySelector('[data-live="hours-note"]');
    if (note && h && h.note) { note.textContent = h.note; note.hidden = false; }
  }

  function renderInfo(i) {
    if (!i) return;
    if (i.tel) {
      $$('[data-live="tel"]').forEach(function (a) { a.href = 'tel:' + i.tel; });
      $$('[data-live="tel-text"]').forEach(function (s) { s.textContent = i.tel; });
    }
    var r = safeUrl(i.reserveUrl), q = safeUrl(i.questionnaireUrl);
    if (r) $$('[data-live="reserve"]').forEach(function (a) { a.href = r; });
    if (q) $$('[data-live="questionnaire"]').forEach(function (a) { a.href = q; });
  }

  fetch(API, { cache: 'no-store' })
    .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
    .then(function (d) { renderAlert(d.alert); renderNews(d.news); renderHours(d.hours); renderInfo(d.info); })
    .catch(function () {});
})();
