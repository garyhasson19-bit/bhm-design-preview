/* BHM design — JS du site. Pas de dépendance. */
(function () {
  'use strict';
  var cfg = window.BHM_CONFIG || {};
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'off';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Menu mobile */
  var burger = $('[data-burger]'), nav = $('#nav');
  if (burger && nav) {
    var setMenu = function (open) { burger.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); };
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { setMenu(false); burger.focus(); } });
    nav.addEventListener('click', function (ev) { if (ev.target.closest('a')) setMenu(false); });
  }

  /* Révélations au scroll */
  var reveals = $$('[data-reveal]');
  if (reveals.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      reveals.forEach(function (el) { io.observe(el); });
      /* Filet de sécurité : un saut rapide (ancre, recherche dans la page) peut dépasser un élément sans
         que l'observateur ne le voie. On révèle alors tout ce qui est déjà au-dessus du bas de l'écran. */
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return; ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          reveals.forEach(function (el) {
            if (!el.classList.contains('in') && el.getBoundingClientRect().top < window.innerHeight * 0.92) { el.classList.add('in'); io.unobserve(el); }
          });
        });
      }, { passive: true });
    }
  }

  /* Boîte à question : la question écrite par le visiteur est reprise par les boutons vers les vrais services */
  $$('[data-askbox]').forEach(function (box) {
    var form = $('[data-ask-form]', box), input = $('#client-q', box), msg = $('[data-ask-msg]', box);
    var links = $$('[data-real]', box), examples = JSON.parse(box.getAttribute('data-examples') || '[]'), timer = null, stopped = false;
    var sync = function () {
      var q = input.value.trim();
      links.forEach(function (a) { a.href = a.getAttribute('data-base') + encodeURIComponent(q || examples[0]); });
      if (q) msg.textContent = '';
    };
    var stopTyping = function () { stopped = true; clearTimeout(timer); input.placeholder = examples[0]; };
    input.addEventListener('input', sync);
    input.addEventListener('focus', stopTyping);
    links.forEach(function (a) { a.addEventListener('click', function (ev) {
      if (!input.value.trim()) { ev.preventDefault(); stopTyping(); msg.textContent = box.getAttribute('data-empty'); input.focus(); }
    }); });
    form.addEventListener('submit', function (ev) { ev.preventDefault(); links[0].click(); });
    $$('[data-example]', box).forEach(function (b) { b.addEventListener('click', function () { stopTyping(); input.value = b.textContent; sync(); input.focus(); }); });
    /* Les exemples s'écrivent tour à tour dans le champ tant que le visiteur n'y a pas touché */
    if (reduce || !examples.length) return;
    var n = 0;
    (function cycle() {
      var text = examples[n % examples.length], i = 0;
      (function type() {
        if (stopped) return;
        input.placeholder = text.slice(0, ++i) || ' ';
        if (i < text.length) timer = setTimeout(type, 55); else { n++; timer = setTimeout(cycle, 2200); }
      })();
    })();
  });

  /* Phrases qui s'allument quand elles arrivent au milieu de l'écran */
  var lit = $$('[data-lit]');
  if (lit.length && !reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('can-lit');
    var lo = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting || x.boundingClientRect.top < 0) x.target.classList.add('lit'); }); }, { rootMargin: '0px 0px -30% 0px' });
    lit.forEach(function (el) { lo.observe(el); });
  }

  /* Bande des moteurs : bouton pause */
  $$('[data-ticker]').forEach(function (box) {
    var b = $('[data-pause]', box);
    if (reduce) { b.hidden = true; return; }
    b.addEventListener('click', function () { var on = box.classList.toggle('paused'); b.setAttribute('aria-pressed', String(on)); });
  });

  /* Rendez-vous : tableau des 5 prochains jours ouvrables ; le choix prépare un email (rien n'est réservé sans réponse) */
  $$('[data-booking]').forEach(function (box) {
    var lang = box.getAttribute('data-lang'), hours = box.getAttribute('data-hours').split(',');
    var send = $('[data-send]', box), pick = $('[data-pick]', box);
    var fmt = new Intl.DateTimeFormat(lang + (lang === 'en' ? '-GB' : '-BE'), { weekday: 'short', day: 'numeric', month: 'short' });
    var days = [], d = new Date();
    while (days.length < 5) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d)); }
    var el = function (tag, text) { var n = document.createElement(tag); if (text) n.textContent = text; return n; };
    var table = el('table'); table.className = 'slots';
    var cap = el('caption', box.getAttribute('data-cap')); cap.className = 'sr'; table.appendChild(cap);
    var head = table.createTHead().insertRow(); [box.getAttribute('data-day')].concat(hours).forEach(function (h) { var th = el('th', h); th.scope = 'col'; head.appendChild(th); });
    var body = table.createTBody();
    days.forEach(function (day) {
      var tr = body.insertRow(), th = el('th', fmt.format(day)); th.scope = 'row'; tr.appendChild(th);
      hours.forEach(function (h) {
        var btn = el('button', h); btn.type = 'button'; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', fmt.format(day) + ' ' + h);
        btn.addEventListener('click', function () {
          $$('button', table).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); btn.setAttribute('aria-pressed', 'true');
          var slot = fmt.format(day) + ' ' + day.getFullYear() + ', ' + h;
          pick.textContent = slot;
          send.href = 'mailto:' + box.getAttribute('data-email') + '?subject=' + encodeURIComponent(box.getAttribute('data-subject') + ' : ' + slot) + '&body=' + encodeURIComponent(box.getAttribute('data-body').replace('{slot}', slot));
          send.hidden = false;
          var wa = $('[data-send-wa]', box);
          if (wa) { wa.href = 'https://wa.me/' + wa.getAttribute('data-send-wa') + '?text=' + encodeURIComponent(box.getAttribute('data-subject') + ' : ' + slot); wa.hidden = false; }
        });
        tr.insertCell().appendChild(btn);
      });
    });
    $('[data-grid]', box).appendChild(table); $('[data-nojs]', box).hidden = true;
  });

  /* Calendly : chargé seulement après un clic (aucun script tiers avant) */
  $$('[data-calendly]').forEach(function (box) {
    var a = $('[data-cal-open]', box);
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      var f = document.createElement('iframe'); f.src = box.getAttribute('data-calendly'); f.title = 'Calendly'; f.className = 'cal-frame';
      box.innerHTML = ''; box.appendChild(f);
    });
  });

  /* Curseur avant / après */
  $$('[data-cmp]').forEach(function (box) {
    var input = $('.cmp-range', box);
    var set = function () { box.style.setProperty('--pos', input.value + '%'); };
    input.addEventListener('input', set); set();
  });

  /* Formulaire d'audit */
  var form = $('#audit-form');
  if (form) {
    var maps = form.elements.maps_url;
    var msg = function (k) { return form.getAttribute('data-msg-' + k) || ''; };
    var okMaps = function (v) {
      try {
        var u = new URL(v.trim());
        return u.protocol === 'https:' && /(^|\.)(google\.[a-z.]+|goo\.gl|g\.page)$/i.test(u.hostname);
      } catch (e) { return false; }
    };
    var setErr = function (name, text) {
      var el = $('[data-err="' + name + '"]', form), inp = form.elements[name];
      if (el) el.textContent = text || '';
      if (inp) { if (text) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
    };
    var checkMaps = function () {
      if (!maps.value.trim()) { setErr('maps_url', msg('required')); return false; }
      if (!okMaps(maps.value)) { setErr('maps_url', msg('maps')); return false; }
      setErr('maps_url', ''); return true;
    };
    form.classList.add('two-step');
    $('[data-next]', form).addEventListener('click', function () {
      if (!checkMaps()) { maps.focus(); return; }
      form.classList.add('step2'); form.elements.name.focus();
    });
    maps.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); $('[data-next]', form).click(); } });
    var bad = $('[data-form-error]', form);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault(); bad.textContent = '';
      var ok = checkMaps(), first = ok ? null : maps;
      ['name', 'venue', 'city'].forEach(function (n) {
        var empty = !form.elements[n].value.trim();
        setErr(n, empty ? msg('required') : ''); if (empty && !first) first = form.elements[n];
      });
      if (first) { if (first !== maps) form.classList.add('step2'); first.focus(); return; }
      if (!cfg.endpoint) {
        /* Pas de serveur branché : on prépare le message, le visiteur l'envoie lui-même */
        var box = $('[data-handoff]'), lines = [box.getAttribute('data-title')];
        ['maps_url', 'name', 'venue', 'city', 'lang', 'message'].forEach(function (n) {
          var field = form.elements[n], value = field.value.trim();
          if (value) lines.push($('label[for="' + field.id + '"]', form).textContent + ' : ' + value);
        });
        var text = lines.join('\n'), wa = $('[data-ho-wa]', box);
        if (wa) wa.href = 'https://wa.me/' + box.getAttribute('data-wa') + '?text=' + encodeURIComponent(text);
        $('[data-ho-mail]', box).href = 'mailto:' + box.getAttribute('data-email') + '?subject=' + encodeURIComponent(box.getAttribute('data-title')) + '&body=' + encodeURIComponent(text);
        form.hidden = true; box.hidden = false; box.focus(); return;
      }
      var submit = $('[type="submit"]', form), label = $('span', submit), old = label.textContent;
      submit.disabled = true; label.textContent = form.getAttribute('data-sending');
      var data = {
        maps_url: maps.value.trim(), name: form.elements.name.value.trim(), venue: form.elements.venue.value.trim(),
        city: form.elements.city.value.trim(), lang: form.elements.lang.value, message: form.elements.message.value.trim(),
        website: form.elements.website.value,
      };
      fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) {
          if (r.ok) { form.hidden = true; var s = $('[data-success]'); s.hidden = false; s.focus(); if (window.gtag) window.gtag('event', 'audit_request', { language: data.lang }); return; }
          bad.textContent = r.status === 429 ? msg('rate') : msg('generic');
        })
        .catch(function () { bad.textContent = msg('generic'); })
        .then(function () { submit.disabled = false; label.textContent = old; });
    });
  }

  /* Google Analytics 4, seulement après accord */
  if (cfg.ga4) {
    var KEY = 'bhm-consent', box = $('[data-consent]'), stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}
    var loadGA = function () {
      if (window.gtag) return;
      var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', cfg.ga4, { anonymize_ip: true });
    };
    var save = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };
    if (stored === 'yes') loadGA();
    else if (stored !== 'no' && box) {
      box.hidden = false;
      $('[data-consent-yes]', box).addEventListener('click', function () { save('yes'); box.hidden = true; loadGA(); });
      $('[data-consent-no]', box).addEventListener('click', function () { save('no'); box.hidden = true; });
    }
  }
})();
