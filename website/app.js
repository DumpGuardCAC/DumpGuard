(function () {
  var root = document.documentElement;
  var native = !!window.Capacitor || location.protocol === 'capacitor:' || (location.hostname === 'localhost' && location.protocol === 'https:');
  var standalone = native || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (standalone) root.classList.add('installed');
  if (standalone && ios) root.classList.add('ios');

  if (native) {
    window.DUMPGUARD_API = 'https://dumpguard.vercel.app/api/v1';
    return;
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }

  if (!ios || standalone) return;
  root.classList.add('gated');

  var T = {
    en: {
      h: 'Add DumpGuard to your Home Screen',
      lead: 'On iPhone, DumpGuard runs as an app. Install it to continue.',
      s1: 'Tap the Share button in the Safari toolbar.',
      s2: 'Scroll down and tap Add to Home Screen.',
      s3: 'Open DumpGuard from your Home Screen.',
      safari: 'This page is not open in Safari. Open it in Safari first.',
    },
    es: {
      h: 'Agregue DumpGuard a su pantalla de inicio',
      lead: 'En iPhone, DumpGuard funciona como una app. Instálela para continuar.',
      s1: 'Toque el botón Compartir en la barra de Safari.',
      s2: 'Desplácese y toque Agregar a pantalla de inicio.',
      s3: 'Abra DumpGuard desde su pantalla de inicio.',
      safari: 'Esta página no está abierta en Safari. Ábrala primero en Safari.',
    },
  };
  var lang = 'en';
  try { lang = (localStorage.getItem('dg_lang') || (navigator.language || 'en').slice(0, 2)) === 'es' ? 'es' : 'en'; } catch {}
  var t = T[lang];
  var inApp = /FBAN|FBAV|Instagram|Snapchat|TikTok|Line\/|MicroMessenger|GSA\/|Twitter/.test(navigator.userAgent);

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function shareIcon() {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'gate-ico'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M12 15V3M8 7l4-4 4 4M7 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1');
    s.appendChild(p); return s;
  }
  function build() {
    var g = el('div', 'gate'); g.id = 'installgate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'gate-h');
    var logo = el('img', 'gate-logo'); logo.src = 'icon.png'; logo.alt = 'DumpGuard'; logo.height = 72;
    var h = el('h1', '', t.h); h.id = 'gate-h';
    g.appendChild(logo); g.appendChild(h); g.appendChild(el('p', 'gate-lead', t.lead));
    if (inApp) g.appendChild(el('p', 'gate-warn', t.safari));
    var ol = el('ol', 'gate-steps');
    var l1 = el('li'); l1.appendChild(shareIcon()); l1.appendChild(el('span', '', t.s1));
    ol.appendChild(l1); ol.appendChild(el('li', '', t.s2)); ol.appendChild(el('li', '', t.s3));
    g.appendChild(ol); document.body.appendChild(g);
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();

(function () {
  'use strict';

  var BASE = (window.DUMPGUARD_API || '/api/v1').replace(/\/$/, '');
  var $ = function (id) { return document.getElementById(id); };

  var T = {
    en: {
      empty: 'Your disposal guide will appear here.', searching: 'Searching...', none: 'No match. Pick a category instead, or try another word.',
      didyou: 'Other matches', recycling: 'Recycle', trash: 'Trash', special_dropoff: 'Special drop-off', hazard: 'Hazardous: do not put in the bin',
      gotit: 'Got it, counted anonymously', thanks: 'Thanks, counted anonymously.',
      wrong: 'Report a wrong answer', send: 'Send', cancel: 'Cancel', whatwrong: 'What is wrong or missing?', sent: 'Thanks. A person will check it against the official source.',
      tooLong: 'Use 3 to 500 characters.',
      where: 'Where to take it', openNow: 'open now', closed: 'closed now', km: 'km', residents: 'Residents only',
      cat: 'Category', catPick: 'Pick a category', fail: 'Could not reach the server. Try again.',
      zipHelp: 'Enter your ZIP code to see pickup days.', pickTown: 'Which town?', pickArea: 'Which one is yours?', choose: 'Choose...',
      next: 'Next pickups', moved: 'moved', calendar: 'Add to my calendar', calNote: 'The calendar updates itself when holidays shift pickups.', notListed: 'not listed here yet. Check your town website or call public works.',
      noZip: 'We are still finding verified pickup data for this area. Check back soon.', badZip: 'Enter a 5 digit ZIP code.', lookup: 'Look up',
      trashS: 'Trash', areaS: 'Area', recyclingS: 'Recycling', bulk: 'Bulk pickup', yard: 'Yard waste', alerts: 'Notices', counted: 'items sorted with DumpGuard, about', lb: 'lb diverted (estimate)',
      materials: { rigid_plastic: 'Hard plastic', soft_plastic_foam: 'Soft plastic or foam', cardboard_paper: 'Cardboard or paper', metal: 'Metal', glass: 'Glass', ewaste_hazard: 'Electronics or hazardous', other: 'Other' },
      consensus: 'In your town most of these are:', basedOn: 'based on', items: 'verified items',
    },
    es: {
      empty: 'Su guía de desecho aparecerá aquí.', searching: 'Buscando...', none: 'Sin resultados. Elija una categoría o pruebe otra palabra.',
      didyou: 'Otras coincidencias', recycling: 'Reciclar', trash: 'Basura', special_dropoff: 'Punto de entrega especial', hazard: 'Peligroso: no lo ponga en el contenedor',
      gotit: 'Listo, contar de forma anónima', thanks: 'Gracias, contado de forma anónima.',
      wrong: 'Informar de una respuesta incorrecta', send: 'Enviar', cancel: 'Cancelar', whatwrong: '¿Qué está mal o falta?', sent: 'Gracias. Una persona lo revisará con la fuente oficial.',
      tooLong: 'Use de 3 a 500 caracteres.',
      where: 'Dónde llevarlo', openNow: 'abierto ahora', closed: 'cerrado ahora', km: 'km', residents: 'Solo residentes',
      cat: 'Categoría', catPick: 'Elija una categoría', fail: 'No se pudo conectar con el servidor. Intente de nuevo.',
      zipHelp: 'Escriba su código postal para ver los días de recogida.', pickTown: '¿Qué municipio?', pickArea: '¿Cuál es el suyo?', choose: 'Elija...',
      next: 'Próximas recogidas', moved: 'cambiada', calendar: 'Agregar a mi calendario', calNote: 'El calendario se actualiza solo cuando los feriados cambian las recogidas.', notListed: 'todavía no aparece aquí. Consulte el sitio web de su municipio o llame a obras públicas.',
      noZip: 'Todavía estamos buscando datos de recogida verificados para esta zona. Vuelva a consultar pronto.', badZip: 'Escriba un código postal de 5 dígitos.', lookup: 'Buscar',
      trashS: 'Basura', areaS: 'Zona', recyclingS: 'Reciclaje', bulk: 'Objetos grandes', yard: 'Desechos de jardín', alerts: 'Avisos', counted: 'artículos clasificados con DumpGuard, unas', lb: 'libras desviadas (estimado)',
      materials: { rigid_plastic: 'Plástico duro', soft_plastic_foam: 'Plástico blando o espuma', cardboard_paper: 'Cartón o papel', metal: 'Metal', glass: 'Vidrio', ewaste_hazard: 'Electrónicos o peligrosos', other: 'Otro' },
      consensus: 'En su municipio la mayoría de estos son:', basedOn: 'según', items: 'artículos verificados',
    },
  };
  var COLORS = { recycling: '#15803d', trash: '#4b5563', special_dropoff: '#dc2626' };

  var state = { lang: 'en', town: null, towns: [], counted: {} };
  try { state.lang = (localStorage.getItem('dg_lang') || (navigator.language || 'en').slice(0, 2)) === 'es' ? 'es' : 'en'; state.town = localStorage.getItem('dg_town'); } catch {}
  var t = function (k) { return T[state.lang][k]; };
  var pick = function (o) { return o ? (o[state.lang] || o.en || '') : ''; };

  function h(tag, attrs) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'style') el.style.cssText = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    if (attrs && attrs.role === 'button' && typeof attrs.onclick === 'function' && !attrs.onkeydown) {
      var click = attrs.onclick;
      el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.key === ' ') e.preventDefault();
        click.call(el, e);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  var clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  function request(path, opts) {
    return fetch(BASE + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; });
    });
  }
  var api = {
    get: function (path) { return request(path); },
    post: function (path, data) {
      return request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    },
  };

  function loadTowns() {
    return api.get('/towns').then(function (r) {
      state.towns = r.body.towns || [];
      var sel = $('town');
      if (!sel || !state.towns.length) return;
      clear(sel);
      state.towns.forEach(function (tw) { sel.appendChild(h('option', { value: tw.id }, tw.name)); });
      if (!state.towns.some(function (tw) { return tw.id === state.town; })) state.town = state.towns.some(function (tw) { return tw.id === 'edison'; }) ? 'edison' : state.towns[0].id;
      sel.value = state.town;
      if (!sel.dataset.bound) { sel.dataset.bound = '1'; sel.addEventListener('change', function () { setTown(sel.value); }); }
    });
  }
  function townName(id) { var tw = state.towns.filter(function (x) { return x.id === id; })[0]; return tw ? tw.name : ''; }
  function loadPickup() {
    var tw = state.towns.filter(function (x) { return x.id === state.town; })[0];
    if (!$('zresult') || !tw || !tw.zips || !tw.zips.length) return;
    $('zip').value = '';
    lookupZip(tw.zips[0], tw.id, []);
  }
  function setTown(id) {
    state.town = id;
    try { localStorage.setItem('dg_town', id); } catch {}
    if ($('town')) $('town').value = id;
    runSearch();
    loadPickup();
    window.dispatchEvent(new Event('dg-town'));
    var cat = $('cat');
    if (cat && cat.value) showMaterial(cat.value);
  }
  function setLang(lang) {
    state.lang = lang === 'es' ? 'es' : 'en';
    document.documentElement.lang = state.lang;
    try { localStorage.setItem('dg_lang', state.lang); } catch {}
    translateStatic();
    runSearch();
    if (lastZip && $('zresult')) lookupZip(lastZip.zip, lastZip.town, lastZip.areas);
    window.dispatchEvent(new Event('dg-lang'));
  }
  function translateStatic() {
    var q = $('q'); if (q) q.placeholder = state.lang === 'es' ? 'sofá, TV, batería' : 'couch, TV, battery';
    var btn = $('zgo'); if (btn) btn.textContent = t('lookup');
    var res = $('result'); if (res && res.querySelector('.empty')) emptyState();
    fillCategories();
  }

  var seq = 0, timer = null;
  function emptyState() {
    clear($('result')).appendChild(h('p', { class: 'empty' }, t('empty')));
  }
  function runSearch() {
    var q = $('q') ? $('q').value.trim() : '';
    if (!q) { emptyState(); return; }
    var mine = ++seq;
    clear($('result')).appendChild(h('p', { class: 'empty' }, t('searching')));
    api.get('/search?q=' + encodeURIComponent(q) + (state.town ? '&town=' + encodeURIComponent(state.town) : '') + '&limit=6').then(function (r) {
      if (mine !== seq) return;
      if (r.status !== 200) { clear($('result')).appendChild(h('p', { class: 'err' }, t('fail'))); return; }
      renderResults(r.body.results || []);
    }).catch(function () {
      if (mine === seq) clear($('result')).appendChild(h('p', { class: 'err' }, t('fail')));
    });
  }

  function renderResults(results) {
    var box = clear($('result'));
    if (!results.length) {
      box.appendChild(h('p', { class: 'empty' }, t('none')));
      showCategoryPicker(true);
      return;
    }
    box.appendChild(card(results[0]));
    if (results.length > 1) {
      box.appendChild(h('p', { class: 'sm gap' }, t('didyou')));
      results.slice(1).forEach(function (it) {
        box.appendChild(h('div', { class: 'li', role: 'button', tabindex: '0', onclick: function () { renderResults([it].concat(results.filter(function (x) { return x !== it; }))); } },
          h('span', { class: 'dot', style: 'background:' + COLORS[it.resolved.rule] }), h('span', {}, pick(it.name)),
          h('span', { class: 'badge', style: 'background:' + COLORS[it.resolved.rule] }, t(it.resolved.rule))));
      });
    }
  }

  function card(it) {
    var r = it.resolved, rule = r.rule;
    var el = h('div', {},
      h('span', { class: 'tag', style: 'background:' + COLORS[rule] }, t(rule)),
      h('h3', {}, pick(it.name)));
    if (it.hazard && rule === 'special_dropoff') el.appendChild(h('p', { class: 'err' }, t('hazard')));
    var note = pick(r.note);
    if (note) el.appendChild(h('p', {}, note));
    if (r.check_local) el.appendChild(h('p', { class: 'notice show' }, pick(r.message)));
    var holder = h('div', {});
    el.appendChild(holder);
    if (rule === 'special_dropoff' && state.town) loadFacilities(holder, it.material);
    el.appendChild(actions(it, rule));
    return el;
  }

  function actions(it, rule) {
    var row = h('div', { class: 'row' });
    var done = state.counted[it.id];
    var count = h('button', { class: 'btn dark small', type: 'button' }, done ? t('thanks') : t('gotit'));
    count.disabled = !!done;
    count.addEventListener('click', function () {
      count.disabled = true;
      state.counted[it.id] = true;
      api.post('/events', { outcome: rule, material: it.material, town: state.town || undefined }).then(function () { count.textContent = t('thanks'); });
    });
    var slot = h('div', { style: 'flex-basis:100%' });
    var wrong = h('button', { class: 'btn small outline', type: 'button' }, t('wrong'));
    wrong.addEventListener('click', function () { reportForm(slot, 'item_rule', { item: it.id }); });
    row.appendChild(count); row.appendChild(wrong); row.appendChild(slot);
    return row;
  }

  function reportForm(slot, kind, ids) {
    clear(slot);
    var ta = h('textarea', { rows: '2', maxlength: '500', 'aria-label': t('whatwrong'), placeholder: t('whatwrong') });
    var msg = h('p', { class: 'sm' });
    var send = h('button', { class: 'btn dark small', type: 'button' }, t('send'));
    var cancel = h('button', { class: 'btn small', type: 'button' }, t('cancel'));
    cancel.addEventListener('click', function () { clear(slot); });
    send.addEventListener('click', function () {
      var body = { kind: kind, message: ta.value.trim() };
      if (ids.item) body.item = ids.item;
      if (state.town) body.town = state.town;
      send.disabled = true;
      api.post('/reports', body).then(function (r) {
        if (r.status === 201) { clear(slot).appendChild(h('p', { class: 'ok' }, t('sent'))); return; }
        send.disabled = false;
        msg.className = 'err';
        var raw = (r.body && r.body.message) || '';
        msg.textContent = r.status === 429 ? t('fail') : (raw === 'Use 3 to 500 characters.' ? t('tooLong') : (raw || t('fail')));
      }).catch(function () { send.disabled = false; msg.className = 'err'; msg.textContent = t('fail'); });
    });
    slot.appendChild(ta); slot.appendChild(msg); slot.appendChild(h('div', { class: 'row' }, send, cancel));
    ta.focus();
  }

  var facCache = {};
  function loadFacilities(holder, material) {
    var key = state.town + '|' + material;
    var p = facCache[key] || (facCache[key] = api.get('/facilities?town=' + encodeURIComponent(state.town) + '&material=' + encodeURIComponent(material)));
    p.then(function (r) {
      var list = (r.body.facilities || []).slice(0, 2);
      if (!list.length) return;
      holder.appendChild(h('p', { class: 'sm', style: 'margin-top:14px' }, t('where')));
      list.forEach(function (f) {
        var line = h('div', { class: 'item' }, h('b', {}, f.name), h('small', {}, f.address + (f.phone ? ' - ' + f.phone : '')),
          h('small', {}, f.hours + (f.open_now === true ? ' - ' + t('openNow') : f.open_now === false ? ' - ' + t('closed') : '')));
        if (f.residents_only) line.appendChild(h('small', {}, t('residents')));
        holder.appendChild(line);
      });
    }).catch(function () { });
  }

  var MATERIAL_ORDER = ['rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard'];
  function fillCategories() {
    var cat = $('cat');
    if (!cat) return;
    var cur = cat.value;
    clear(cat);
    cat.appendChild(h('option', { value: '' }, t('catPick')));
    MATERIAL_ORDER.forEach(function (m) { cat.appendChild(h('option', { value: m }, t('materials')[m])); });
    cat.value = cur;
  }
  function showCategoryPicker(show) { if ($('pick')) $('pick').style.display = show ? 'block' : 'none'; }
  function showMaterial(cls) {
    if (cls === 'no_object' || !cls) return;
    showCategoryPicker(true);
    if ($('cat')) $('cat').value = cls;
    var mine = ++seq;
    api.get('/materials/' + encodeURIComponent(cls) + (state.town ? '?town=' + encodeURIComponent(state.town) : '')).then(function (r) {
      if (mine !== seq) return;
      var box = clear($('result'));
      if (r.status !== 200) { box.appendChild(h('p', { class: 'err' }, t('fail'))); return; }
      var b = r.body;
      box.appendChild(h('h3', {}, t('materials')[cls] || cls));
      if (b.consensus) {
        box.appendChild(h('span', { class: 'tag', style: 'background:' + COLORS[b.consensus.rule] }, t(b.consensus.rule)));
        box.appendChild(h('p', { class: 'sm' }, t('consensus') + ' (' + t('basedOn') + ' ' + b.consensus.based_on + ' ' + t('items') + ')'));
      }
      b.items.slice(0, 8).forEach(function (it) {
        box.appendChild(h('div', { class: 'li', role: 'button', tabindex: '0', onclick: function () { renderResults([{ id: it.id, name: it.name, material: cls, hazard: it.hazard, resolved: it.resolved }]); } },
          h('span', { class: 'dot', style: 'background:' + COLORS[it.resolved.rule] }), h('span', {}, pick(it.name)),
          h('span', { class: 'badge', style: 'background:' + COLORS[it.resolved.rule] }, t(it.resolved.rule))));
      });
    }).catch(function () { if (mine !== seq) return; clear($('result')).appendChild(h('p', { class: 'err' }, t('fail'))); });
  }

  var lastZip = null, zipSeq = 0;
  var STREAM = function (s) { return ({ trash: t('trashS'), garbage: t('trashS'), area: t('areaS'), recycling: t('recyclingS'), bulk: t('bulk'), yard: t('yard') })[s] || s; };
  var fmt = function (iso) { return new Date(iso + 'T12:00:00').toLocaleDateString(state.lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };

  function lookupZip(zip, town, areas) {
    var box = clear($('zresult'));
    if (!/^\d{5}$/.test(zip)) { box.appendChild(h('p', { class: 'err' }, t('badZip'))); return; }
    var mine = ++zipSeq;
    lastZip = { zip: zip, town: town, areas: areas || [] };
    var qs = [];
    if (town) qs.push('town=' + encodeURIComponent(town));
    (areas || []).forEach(function (a) { qs.push('area=' + encodeURIComponent(a)); });
    api.get('/schedule/' + zip + (qs.length ? '?' + qs.join('&') : '')).then(function (r) {
      if (mine !== zipSeq) return;
      var b = r.body;
      clear(box);
      if (r.status === 404) { box.appendChild(h('p', { class: 'err' }, t('noZip'))); return; }
      if (r.status !== 200) { box.appendChild(h('p', { class: 'err' }, t('fail'))); return; }
      if (b.town && b.town.id && b.town.id !== state.town) { state.town = b.town.id; try { localStorage.setItem('dg_town', state.town); } catch {} if ($('town')) $('town').value = state.town; runSearch(); window.dispatchEvent(new Event('dg-town')); }
      if (b.needs === 'town') {
        box.appendChild(h('p', {}, t('pickTown')));
        b.towns.forEach(function (tw) { box.appendChild(h('button', { class: 'btn dark small town', type: 'button', onclick: function () { lookupZip(zip, tw.id, []); } }, tw.name)); });
        return;
      }
      if (b.needs === 'area') { renderAreas(box, b, zip, areas || []); return; }
      renderSchedule(box, b, zip, town, areas || [], mine);
    }).catch(function () { if (mine !== zipSeq) return; clear(box).appendChild(h('p', { class: 'err' }, t('fail'))); });
  }

  function renderAreas(box, b, zip, chosen) {
    box.appendChild(h('h3', {}, b.town.name));
    box.appendChild(h('p', {}, t('pickArea')));
    var picks = {};
    chosen.forEach(function (k) { picks[k.indexOf(':') > -1 ? k.split(':')[0] : 'area'] = k; });
    b.groups.forEach(function (g) {
      var sel = h('select', { 'aria-label': STREAM(g) }, h('option', { value: '' }, t('choose')));
      if (b.groups.length > 1) box.appendChild(h('label', { class: 'pick-label' }, STREAM(g)));
      b.areas.filter(function (a) { return a.group === g; }).forEach(function (a) {
        var label = (state.lang === 'es' ? a.label_es : a.label) || a.label;
        var desc = (state.lang === 'es' ? a.description_es : a.description) || '';
        sel.appendChild(h('option', { value: a.key }, desc ? label + ': ' + (desc.length > 60 ? desc.slice(0, 57) + '...' : desc) : label));
      });
      sel.value = picks[g] || '';
      sel.addEventListener('change', function () {
        if (sel.value) picks[g] = sel.value; else delete picks[g];
        if (b.groups.every(function (x) { return picks[x]; })) lookupZip(zip, b.town.id, b.groups.map(function (x) { return picks[x]; }));
      });
      box.appendChild(sel);
    });
  }

  function renderSchedule(box, b, zip, town, areas, mine) {
    box.appendChild(h('h3', {}, b.town.name));
    b.schedules.forEach(function (s) {
      var line = h('div', { class: 'item' }, h('b', {}, STREAM(s.stream)));
      var next = (s.next || []).slice(0, 3);
      if (next.length) {
        line.appendChild(h('small', {}, t('next') + ': ' + next.map(function (o) {
          return fmt(o.date) + (o.moved ? ' (' + t('moved') + ': ' + (state.lang === 'es' ? o.reason_es : o.reason) + ')' : '');
        }).join('; ')));
      }
      var note = state.lang === 'es' ? s.note_es : s.note_en;
      if (note) line.appendChild(h('small', {}, note));
      box.appendChild(line);
    });
    ['trash', 'recycling'].forEach(function (st) {
      if (b.schedules.some(function (s) { return s.stream === st; })) return;
      box.appendChild(h('div', { class: 'item' }, h('b', {}, STREAM(st)), h('small', {}, t('notListed'))));
    });
    if (b.calendar) {
      box.appendChild(h('p', {}, h('a', { class: 'btn dark small', href: b.calendar.webcal }, t('calendar'))));
    }
    var qs = ['town=' + encodeURIComponent(b.town.id)].concat(areas.map(function (a) { return 'area=' + encodeURIComponent(a); }));
    api.get('/alerts?' + qs.join('&')).then(function (r) {
      if (mine !== zipSeq) return;
      var list = (r.body && r.body.announcements) || [];
      if (!list.length) return;
      var note = h('div', { class: 'notice show' }, h('b', {}, t('alerts') + ': '));
      note.appendChild(document.createTextNode(list.map(function (a) { return pick(a.message); }).join(' ')));
      box.insertBefore(note, box.children[1] || null);
    }).catch(function () { });
  }
  function wireSchedule() {
    if (!$('zgo')) return;
    $('zgo').addEventListener('click', function () { lookupZip($('zip').value.trim()); });
    $('zip').addEventListener('keydown', function (e) { if (e.key === 'Enter') lookupZip($('zip').value.trim()); });
  }

  function init() {
    wireSchedule();
    fillCategories();
    translateStatic();
    loadTowns().then(function () { runSearch(); loadPickup(); window.dispatchEvent(new Event('dg-town')); }).catch(function () { });
    if ($('q')) $('q').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(runSearch, 250); });
    if ($('cat')) $('cat').addEventListener('change', function () { if ($('cat').value) showMaterial($('cat').value); });
  }

  var dumpTypes = {
    household: 'Household trash', furniture: 'Furniture', appliances: 'Appliances', electronics: 'Electronics', tires: 'Tires',
    construction: 'Construction debris', yard: 'Yard waste', hazardous: 'Hazardous waste', other: 'Other',
  };
  var statusColor = { new: '#c0392b', noticed: '#a86b0a', progress: '#1f5fa8', resolved: '#2f7a28' };
  function when(iso) {
    return new Date(iso).toLocaleString(state.lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function tileMap(id, onTilesFail) {
    var map = L.map(id, { scrollWheelZoom: false }).setView([40.45, -74.25], 10);
    var failed = 0;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
      .on('tileerror', function () { if (++failed > 3) onTilesFail(); });
    if (window.ResizeObserver) new ResizeObserver(function () { map.invalidateSize(); }).observe($(id));
    return map;
  }

  window.DumpGuard = {
    material: function (m) { return T[state.lang].materials[m]; }, dumpTypes: dumpTypes, statusColor: statusColor, when: when, tileMap: tileMap,
    api: api, request: request, setTown: setTown, showMaterial: showMaterial, showCategoryPicker: showCategoryPicker,
    h: h, clear: clear, lang: function () { return state.lang; }, setLang: setLang, townId: function () { return state.town; }, townName: function () { return townName(state.town); },
  };
  document.addEventListener('DOMContentLoaded', init);
})();

(function () {
  'use strict';

  var TFJS = 'lib/tf.min.js';
  var MODEL_URL = 'lib/model.json';
  var CLASSES = ['rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard', 'no_object'];
  var SIZE = 224, TEMPERATURE = 1.9, THRESHOLD = 0.65;

  var S = {
    en: {
      prompt: 'Take or upload a photo', reading: 'Loading the photo model...', looking: 'Looking at the photo...',
      sure: 'Looks like', unsure: 'Not sure what this is. Pick a category below.', none: 'No item found in the photo. Try a closer picture, or pick a category below.',
      fail: 'Photo recognition could not start. Pick a category below.', local: 'The photo stays on your device.', another: 'Try another photo',
    },
    es: {
      prompt: 'Tome o suba una foto', reading: 'Cargando el modelo de fotos...', looking: 'Mirando la foto...',
      sure: 'Parece', unsure: 'No estoy seguro de qué es. Elija una categoría abajo.', none: 'No se encontró ningún objeto en la foto. Pruebe una foto más cercana o elija una categoría abajo.',
      fail: 'No se pudo iniciar el reconocimiento de fotos. Elija una categoría abajo.', local: 'La foto se queda en su dispositivo.', another: 'Probar otra foto',
    },
  };
  var s = function () { return S[window.DumpGuard.lang()] || S.en; };

  var tfPromise = null, modelPromise = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src; el.async = true; el.crossOrigin = 'anonymous';
      el.integrity = 'sha384-L8voclkoniuFcRcupWcIj6Z2X9BjaujQTgwjRJl5LjC7tJ/By8Kkl+nf64+2IVjS';
      el.onload = resolve;
      el.onerror = function () { reject(new Error('script')); };
      document.head.appendChild(el);
    });
  }
  function loadModel() {
    if (!modelPromise) {
      modelPromise = (window.tf ? Promise.resolve() : (tfPromise = tfPromise || loadScript(TFJS)))
        .then(function () { return window.tf.loadGraphModel(MODEL_URL); })
        .catch(function (e) { modelPromise = null; tfPromise = null; throw e; });
    }
    return modelPromise;
  }

  function calibrate(probs, T) {
    var logits = probs.map(function (p) { return Math.log(Math.max(p, 1e-9)) / T; });
    var max = Math.max.apply(null, logits);
    var exps = logits.map(function (l) { return Math.exp(l - max); });
    var sum = exps.reduce(function (a, b) { return a + b; }, 0);
    return exps.map(function (e) { return e / sum; });
  }
  function decide(probs) {
    var p = calibrate(probs, TEMPERATURE);
    var best = 0;
    for (var i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
    return { cls: CLASSES[best], confidence: p[best], sure: p[best] >= THRESHOLD };
  }

  function classify(img) {
    return loadModel().then(function (model) {
      var tf = window.tf;
      var out = tf.tidy(function () {
        var x = tf.image.resizeBilinear(tf.browser.fromPixels(img), [SIZE, SIZE]).toFloat().expandDims(0);
        return model.predict(x);
      });
      return out.data().then(function (d) { out.dispose(); return decide(Array.prototype.slice.call(d)); });
    });
  }

  function init() {
    var input = document.getElementById('photo'), label = document.getElementById('droptxt');
    if (!input || !label || !window.DumpGuard) return;
    var DG = window.DumpGuard, h = DG.h;
    var mine = 0;
    var note = h('p', { class: 'sm', 'aria-live': 'polite' });
    input.parentNode.parentNode.insertBefore(note, input.parentNode.nextSibling);
    label.textContent = s().prompt;

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var run = ++mine;
      DG.showCategoryPicker(false);
      note.className = 'sm'; note.textContent = s().reading;
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); note.textContent = s().fail; DG.showCategoryPicker(true); };
      img.onload = function () {
        if (run !== mine) return;
        DG.clear(label).appendChild(h('img', { src: url, alt: '' }));
        note.textContent = s().looking;
        classify(img).then(function (r) {
          if (run !== mine) return;
          if (r.cls === 'no_object') { note.textContent = s().none; DG.showCategoryPicker(true); return; }
          if (!r.sure) { note.textContent = s().unsure; DG.showCategoryPicker(true); return; }
          note.textContent = s().sure + ': ' + DG.material(r.cls) + ' (' + Math.round(r.confidence * 100) + '%). ' + s().local;
          DG.showMaterial(r.cls);
        }).catch(function () {
          if (run !== mine) return;
          note.className = 'err'; note.textContent = s().fail; DG.showCategoryPicker(true);
        });
      };
      img.src = url;
      input.value = '';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

(function () {
  'use strict';

  var DG = window.DumpGuard;
  if (!DG) return;
  var h = DG.h, clear = DG.clear;
  var $ = function (id) { return document.getElementById(id); };

  var TYPES = [
    ['household', 'Household trash or bags'], ['furniture', 'Furniture or mattresses'], ['appliances', 'Appliances'], ['electronics', 'Electronics'],
    ['tires', 'Tires'], ['construction', 'Construction or demolition debris'], ['yard', 'Yard waste'], ['hazardous', 'Chemicals or hazardous waste'], ['other', 'Other'],
  ];
  var STATUS = { new: 'Received', noticed: 'Noticed by officials', progress: 'In progress', resolved: 'Resolved' };
  var KEY = 'dg_dump_codes';
  var photo = null, point = null;

  function saved() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function remember(code, town) {
    try { localStorage.setItem(KEY, JSON.stringify([{ code: code, town: town, at: new Date().toISOString().slice(0, 10) }].concat(saved()).slice(0, 20))); } catch {}
  }

  function showTown() {
    var note = $('rtownnote'), name = DG.townName();
    if (note) note.textContent = name ? 'Reporting in ' + name : '';
  }
  function fillTypes() {
    var sel = $('rcat');
    clear(sel).appendChild(h('option', { value: '' }, 'Choose a type'));
    TYPES.forEach(function (t) { sel.appendChild(h('option', { value: t[0] }, t[1])); });
  }

  function addLocationButton() {
    var where = $('rwhere');
    var msg = h('p', { class: 'sm', id: 'rpoint', 'aria-live': 'polite' });
    var btn = h('button', { class: 'btn ghost', type: 'button', style: 'margin-top:10px' }, 'Use my location');
    if (!navigator.geolocation) return;
    btn.addEventListener('click', function () {
      msg.className = 'sm'; msg.textContent = 'Finding your location...';
      navigator.geolocation.getCurrentPosition(function (p) {
        point = { lat: p.coords.latitude, lng: p.coords.longitude };
        msg.textContent = 'Location added. You can still describe the spot above.';
      }, function () {
        point = null; msg.className = 'err'; msg.textContent = 'Could not get your location. Type the address instead.';
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    });
    where.parentNode.insertBefore(btn, where.nextSibling);
    where.parentNode.insertBefore(msg, btn.nextSibling);
  }

  function reencode(file) {
    var load = window.createImageBitmap
      ? createImageBitmap(file, { imageOrientation: 'from-image' })
      : new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = function () { reject(new Error('image')); };
        img.src = url;
      });
    return load.then(function (img) {
      var w = img.width, hgt = img.height, scale = Math.min(1, 1280 / Math.max(w, hgt));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(hgt * scale));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return new Promise(function (resolve, reject) {
        c.toBlob(function (b) { b ? resolve({ blob: b, canvas: c }) : reject(new Error('encode')); }, 'image/jpeg', 0.8);
      });
    });
  }
  function toBase64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1] || ''); };
      fr.onerror = function () { reject(new Error('read')); };
      fr.readAsDataURL(blob);
    });
  }
  var photoSeq = 0;
  function onPhoto() {
    var input = $('rphoto'), file = input.files && input.files[0];
    photo = null; $('priv').style.display = 'none';
    if (!file) return;
    var mine = ++photoSeq;
    $('rerr').textContent = '';
    $('send').disabled = true;
    reencode(file).then(function (r) {
      if (mine !== photoSeq) return;
      if (r.blob.size > 1900000) throw new Error('big');
      return toBase64(r.blob).then(function (b64) {
        if (mine !== photoSeq) return;
        photo = b64;
        var holder = $('rtxt'); clear(holder);
        holder.appendChild(h('img', { src: r.canvas.toDataURL('image/jpeg', 0.5), alt: 'Selected photo' }));
        $('priv').style.display = 'block';
      });
    }).catch(function () {
      if (mine !== photoSeq) return;
      $('rerr').textContent = 'That photo could not be used. Try a different one.';
    }).then(function () {
      if (mine !== photoSeq) return;
      $('send').disabled = false;
    });
  }

  var MSG = {
    invalid_town: 'Choose your town.', invalid_type: 'Choose the type of dumping.', invalid_location: 'Describe where it is (at least 3 characters).',
    invalid_description: 'Describe what was dumped (at least 3 characters).', invalid_notes: 'Notes can be up to 500 characters.', rate_limited: 'Too many reports from this connection. Try again in an hour.',
  };
  function submit() {
    var err = $('rerr'), ok = $('sent'), btn = $('send');
    err.textContent = ''; ok.style.display = 'none';
    var body = { town: DG.townId() || '', type: $('rcat').value, where: $('rwhere').value.trim(), description: $('rdesc').value.trim() };
    var note = $('rnote').value.trim();
    if (note) body.notes = note;
    if (point) { body.lat = point.lat; body.lng = point.lng; }
    if (photo) body.photo = photo;
    var first = !body.town ? 'invalid_town' : !body.type ? 'invalid_type' : body.where.length < 3 ? 'invalid_location' : body.description.length < 3 ? 'invalid_description' : '';
    if (first) { err.textContent = MSG[first]; return; }
    btn.disabled = true;
    DG.api.post('/dumping', body).then(function (r) {
      btn.disabled = false;
      if (r.status === 201) {
        remember(r.body.code, body.town);
        clear(ok).appendChild(document.createTextNode('Report sent. Your tracking code is '));
        ok.appendChild(h('b', {}, r.body.code));
        ok.appendChild(document.createTextNode('. Save it to check on the report later. It is also saved in this browser.'));
        ok.style.display = 'block';
        ['rwhere', 'rdesc', 'rnote'].forEach(function (id) { $(id).value = ''; });
        photo = null; point = null; $('priv').style.display = 'none';
        clear($('rtxt')).appendChild(document.createTextNode('Take or upload a picture'));
        if ($('rpoint')) $('rpoint').textContent = '';
        renderMine();
        return;
      }
      err.textContent = r.status === 413 ? 'That photo is too large.' : MSG[r.body && r.body.error] || (r.body && r.body.message) || 'Could not send the report. Try again.';
    }).catch(function () { btn.disabled = false; err.textContent = 'Could not reach the server. Try again.'; });
  }

  function lookup(code) {
    var out = clear($('tres'));
    code = code.trim().toUpperCase();
    if (!/^DG-[A-Z0-9]{5}$/.test(code)) { out.appendChild(h('p', { class: 'err' }, 'Codes look like DG-4F7K2.')); return; }
    out.appendChild(h('p', { class: 'sm' }, 'Checking...'));
    DG.api.get('/dumping/track?code=' + encodeURIComponent(code)).then(function (r) {
      clear(out);
      if (r.status === 404) { out.appendChild(h('p', { class: 'err' }, 'No report with that code.')); return; }
      if (r.status === 429) { out.appendChild(h('p', { class: 'err' }, 'Too many checks. Try again later.')); return; }
      if (r.status !== 200) { out.appendChild(h('p', { class: 'err' }, 'Could not check the report. Try again.')); return; }
      var b = r.body, d = function (iso) { return new Date(iso).toLocaleDateString(DG.lang() === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
      out.appendChild(h('div', { class: 'item' }, h('b', {}, b.code + ': ' + (STATUS[b.status] || b.status)),
        h('small', {}, 'Filed ' + d(b.created_at) + (b.updated_at !== b.created_at ? ', last update ' + d(b.updated_at) : ''))));
      showThread(code, out);
    }).catch(function () { clear(out).appendChild(h('p', { class: 'err' }, 'Could not reach the server. Try again.')); });
  }
  var when = DG.when;
  function showThread(code, out) {
    DG.api.get('/dumping/messages?code=' + encodeURIComponent(code)).then(function (r) {
      if (r.status !== 200 || !r.body.messages.length) return;
      var list = r.body.messages, box = h('div', { class: 'thread', 'aria-live': 'polite' });
      out.appendChild(h('h4', {}, 'Messages from officials'));
      list.forEach(function (m) {
        box.appendChild(h('div', { class: 'msg ' + (m.from === 'staff' ? 'in' : 'out') },
          h('small', {}, (m.from === 'staff' ? 'Officials' : 'You') + ' - ' + when(m.at)), h('p', {}, m.body)));
      });
      out.appendChild(box);
      var text = h('textarea', { rows: '3', maxlength: '500', 'aria-label': 'Your reply', placeholder: 'Write a reply. Please do not include your name or phone number.' });
      var err = h('p', { class: 'err', 'aria-live': 'polite' });
      var send = h('button', { class: 'btn dark', type: 'button' }, 'Send reply');
      send.addEventListener('click', function () {
        var body = text.value.trim();
        if (!body) { err.textContent = 'Write a reply first.'; return; }
        err.textContent = ''; send.disabled = true;
        DG.api.post('/dumping/reply', { code: code, body: body }).then(function (res) {
          send.disabled = false;
          if (res.status === 201) { lookup(code); return; }
          err.textContent = res.status === 429 ? 'Too many replies. Try again later.' : res.status === 409 ? 'This conversation is full.' : 'Could not send the reply. Try again.';
        }).catch(function () { send.disabled = false; err.textContent = 'Could not reach the server.'; });
      });
      out.appendChild(text); out.appendChild(h('div', { class: 'row tight' }, send)); out.appendChild(err);
    }).catch(function () { });
  }
  function markReplies(box, list) {
    list.slice(0, 5).forEach(function (x, i) {
      DG.api.get('/dumping/messages?code=' + encodeURIComponent(x.code)).then(function (r) {
        if (r.status !== 200 || !r.body.messages.length) return;
        var last = r.body.messages[r.body.messages.length - 1];
        if (last.from !== 'staff') return;
        var row = box.querySelectorAll('.li')[i];
        if (row) row.appendChild(h('span', { class: 'msgmark new' }, 'New message'));
      }).catch(function () {});
    });
  }
  function renderMine() {
    var box = clear($('tmine')), list = saved();
    if (!list.length) return;
    box.appendChild(h('p', { class: 'sm gap' }, 'Reports from this browser'));
    list.forEach(function (x) {
      box.appendChild(h('div', { class: 'li', role: 'button', tabindex: '0', onclick: function () { $('tcode').value = x.code; lookup(x.code); } },
        h('span', {}, x.code), h('small', {}, x.at)));
    });
    markReplies(box, list);
  }

  function init() {
    if (!$('send')) return;
    showTown(); window.addEventListener('dg-town', showTown); window.addEventListener('dg-lang', showTown); fillTypes(); addLocationButton(); renderMine();
    $('rphoto').addEventListener('change', onPhoto);
    $('send').addEventListener('click', submit);
    $('tgo').addEventListener('click', function () { lookup($('tcode').value); });
    $('tcode').addEventListener('keydown', function (e) { if (e.key === 'Enter') lookup($('tcode').value); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();

(function () {
  'use strict';

  var DG = window.DumpGuard;
  if (!DG || !window.L) return;
  var h = DG.h, clear = DG.clear;
  var $ = function (id) { return document.getElementById(id); };

  var TYPES = DG.dumpTypes;
  var STATUS = { new: 'New', noticed: 'Noticed', progress: 'In progress', resolved: 'Resolved' };
  var COLOR = DG.statusColor;
  var TOWN_AT = {
    edison: [40.5187, -74.4121], 'new-brunswick': [40.4862, -74.4518], woodbridge: [40.5576, -74.2846],
    'long-branch': [40.3043, -73.9924], 'asbury-park': [40.2204, -74.0121],
  };

  var CENTER = {
    aberdeen: [40.4101, -74.2224], allenhurst: [40.2362, -74.0112], 'asbury-park': [40.2204, -74.0121], 'atlantic-highlands': [40.4084, -74.0335],
    'bradley-beach': [40.2007, -74.0123], carteret: [40.5773, -74.2285], deal: [40.2543, -74.0001], edison: [40.5187, -74.4121],
    'fair-haven': [40.3626, -74.0385], hazlet: [40.4263, -74.1760], 'highland-park': [40.4995, -74.4260], highlands: [40.4040, -73.9918],
    interlaken: [40.2290, -74.0090], keansburg: [40.4412, -74.1301], keyport: [40.4376, -74.2002], 'little-silver': [40.3395, -74.0412],
    'loch-arbour': [40.2326, -74.0049], 'long-branch': [40.3043, -73.9924], matawan: [40.4143, -74.2285], metuchen: [40.5432, -74.3638],
    middletown: [40.3943, -74.1170], 'monmouth-beach': [40.3326, -73.9818], 'neptune-city': [40.2132, -74.0292], 'neptune-township': [40.2078, -74.0537],
    'new-brunswick': [40.4862, -74.4518], oceanport: [40.3140, -74.0100], 'old-bridge': [40.4140, -74.3350], 'perth-amboy': [40.5068, -74.2654],
    piscataway: [40.5500, -74.4600], 'red-bank': [40.3471, -74.0643], rumson: [40.3715, -74.0043], sayreville: [40.4590, -74.3600],
    'sea-bright': [40.3626, -73.9724], 'south-amboy': [40.4837, -74.2802], 'south-plainfield': [40.5793, -74.4118], 'union-beach': [40.4476, -74.1685],
    'west-long-branch': [40.2893, -74.0210], woodbridge: [40.5576, -74.2846],
  };
  var REGION = [40.45, -74.25];

  var map, layer, labels, labelsOn = true, pub = null, towns = [];

  function filters() { return { type: $('mfilter').value, town: $('mtown').value, status: $('mstat').value }; }

  function fillFilters() {
    var f = clear($('mfilter')); f.appendChild(h('option', { value: '' }, 'All types'));
    Object.keys(TYPES).forEach(function (k) { f.appendChild(h('option', { value: k }, TYPES[k])); });
    var t = clear($('mtown')); t.appendChild(h('option', { value: '' }, 'All towns'));
    towns.forEach(function (tw) { t.appendChild(h('option', { value: tw.town, 'data-n': tw.name }, tw.name)); });
  }

  function cellTowns(c) {
    if (c.towns && c.towns.length) return c.towns;
    return c.town ? [c.town] : [];
  }
  function dominant(counts) {
    var best = null;
    ['new', 'noticed', 'progress', 'resolved'].forEach(function (s) { if (counts[s] && (!best || counts[s] > counts[best])) best = s; });
    return best;
  }
  function drawPublic() {
    var f = filters(), shown = 0;
    pub.cells.forEach(function (c) {
      if (f.town && cellTowns(c).indexOf(f.town) === -1) return;
      var by = {}, n = 0;
      c.groups.forEach(function (g) {
        if ((f.type && g.type !== f.type) || (f.status && g.status !== f.status)) return;
        by[g.status] = (by[g.status] || 0) + g.n; n += g.n;
      });
      if (!n) return;
      shown++;
      var all = {}; c.groups.forEach(function (g) { all[g.status] = (all[g.status] || 0) + g.n; });
      var col = COLOR[dominant(by)];
      var circle = L.circle([c.lat, c.lng], { radius: c.radius_m, color: col, weight: 2, fillColor: col, fillOpacity: 0.28 }).addTo(layer);
      var pop = h('div', {}, h('b', {}, c.n + ' reports in this area'));
      Object.keys(STATUS).forEach(function (s) { if (all[s]) pop.appendChild(h('div', {}, STATUS[s] + ': ' + all[s])); });
      pop.appendChild(h('small', {}, 'Approximate area, not an address.'));
      circle.bindPopup(pop);
    });
    $('mcount').textContent = shown + (shown === 1 ? ' area' : ' areas') + ' with ' + pub.min_group + ' or more reports';
  }

  function redraw() {
    if (!layer) return;
    layer.clearLayers();
    if (pub) drawPublic();
    renderPanel();
    renderLabels();
  }

  function renderLabels() {
    if (labels) { map.removeLayer(labels); labels = null; }
    if (!labelsOn || !pub) return;
    labels = L.layerGroup().addTo(map);
    pub.towns.forEach(function (tw) {
      var at = TOWN_AT[tw.town]; if (!at) return;
      var open = tw.counts.new + tw.counts.noticed + tw.counts.progress;
      var tip = document.createElement('span');
      tip.textContent = tw.name + (open ? ': ' + open + ' open' : '');
      L.marker(at, { interactive: false, opacity: 0, icon: L.divIcon({ className: '', iconSize: [0, 0]}) })
        .bindTooltip(tip, { permanent: true, direction: 'center' }).addTo(labels);
    });
  }

  function addLegend() {
    var ctl = L.control({ position: 'bottomleft' });
    ctl.onAdd = function () {
      var box = h('div', { class: 'maplegend' });
      Object.keys(STATUS).forEach(function (s) {
        box.appendChild(h('div', {}, h('span', { class: 'dot', style: 'background:' + COLOR[s] }), h('span', {}, STATUS[s])));
      });
      L.DomEvent.disableClickPropagation(box);
      return box;
    };
    ctl.addTo(map);
  }
  function renderPanel() {
    var panel = $('gpanel'), box = clear(panel);
    var rows = pub && !filters().town ? pub.towns.filter(function (tw) {
      var c = tw.counts; return c.new + c.noticed + c.progress + c.resolved > 0;
    }) : [];
    panel.style.display = rows.length ? '' : 'none';
    panel.parentNode.classList.toggle('solo', !rows.length);
    if (!rows.length) return;
    box.appendChild(h('h3', {}, 'By town'));
    rows.forEach(function (tw) {
      var c = tw.counts;
      box.appendChild(h('div', { class: 'item' }, h('b', {}, tw.name),
        h('small', {}, c.new + ' new, ' + c.noticed + ' noticed, ' + c.progress + ' in progress, ' + c.resolved + ' resolved')));
    });
  }

  function refreshPublic() {
    return DG.api.get('/dumping/map').then(function (r) { if (r.status === 200) { pub = r.body; towns = pub.towns; } return pub; });
  }

  function followTown() {
    var sel = $('mtown'), id = DG.townId(), has = false;
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value && (o.value === id || o.getAttribute('data-n') === DG.townName())) { sel.value = o.value; has = true; } });
    if (!has) sel.value = '';
    redraw();
    zoomToTown();
  }
  function zoomToTown() {
    var t = filters().town;
    if (t && CENTER[t]) map.setView(CENTER[t], 14);
    else map.setView(REGION, 10);
  }

  function init() {
    if (!$('gmap')) return;
    $('mbanner').style.display = 'none';
    map = DG.tileMap('gmap', function () { $('mbanner').style.display = 'block'; });
    addLegend();
    layer = L.layerGroup().addTo(map);

    ['mfilter', 'mstat'].forEach(function (id) { $(id).addEventListener('change', redraw); });
    $('mtown').addEventListener('change', function () { redraw(); zoomToTown(); });

    refreshPublic().then(function () {
      fillFilters(); followTown();
    }).catch(function () {
      $('mbanner').textContent = 'The map could not load. Try again later.'; $('mbanner').style.display = 'block';
    });
    window.addEventListener('dg-town', function () { if (pub) followTown(); });
    window.addEventListener('dg-lang', function () { if (layer) redraw(); });
  }
  window.addEventListener('load', init);
})();

(function () {
  'use strict';

  var DG = window.DumpGuard;
  if (!DG || !window.L) return;
  var h = DG.h, clear = DG.clear;
  var $ = function (id) { return document.getElementById(id); };

  var TYPES = DG.dumpTypes;
  var STATUS = { new: 'New', noticed: 'Noticed', progress: 'In progress', resolved: 'Resolved' };
  var COLOR = DG.statusColor;

  var token = null, reports = [], towns = [], selected = null, map = null, layer = null;

  function base() { return (window.DUMPGUARD_API || '/api/v1').replace(/\/$/, ''); }
  function authFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers, { authorization: 'Bearer ' + token });
    return DG.request(path, opts);
  }
  function jsonPost(path, data) {
    return authFetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  }
  var when = DG.when;
  function townName(id) { var t = towns.filter(function (x) { return x.town === id; })[0]; return t ? t.name : id; }

  function filters() { return { type: $('gftype').value, town: $('gftown').value, status: $('gfstat').value }; }
  function visible() {
    var f = filters();
    return reports.filter(function (r) { return (!f.type || r.dump_type === f.type) && (!f.town || r.region_id === f.town) && (!f.status || r.status === f.status); });
  }

  function fillFilters() {
    var t = clear($('gftype')); t.appendChild(h('option', { value: '' }, 'All types'));
    Object.keys(TYPES).forEach(function (k) { t.appendChild(h('option', { value: k }, TYPES[k])); });
    var w = clear($('gftown')); w.appendChild(h('option', { value: '' }, 'All towns'));
    towns.forEach(function (tw) { w.appendChild(h('option', { value: tw.town }, tw.name)); });
  }

  function ensureMap() {
    if (map) return;
    map = DG.tileMap('gvmap', function () { $('gvbanner').style.display = 'block'; });
    layer = L.layerGroup().addTo(map);
  }
  function drawMap(refit) {
    layer.clearLayers();
    var rows = visible(), pts = [];
    rows.forEach(function (r) {
      if (r.lat == null) return;
      var on = selected && selected.id === r.id;
      L.circleMarker([r.lat, r.lng], { radius: on ? 11 : 7, color: on ? '#1f3a2a' : '#fff', weight: on ? 3 : 2, fillColor: COLOR[r.status], fillOpacity: 1 })
        .addTo(layer).on('click', function () { select(r, false); });
      pts.push([r.lat, r.lng]);
    });
    var missing = rows.length - pts.length;
    $('gvcount').textContent = rows.length + (rows.length === 1 ? ' report' : ' reports') + (missing ? ', ' + missing + ' without a map point' : '');
    if (refit && pts.length) map.fitBounds(pts, { maxZoom: 15, padding: [40, 40] });
  }

  function renderList() {
    var box = clear($('gvlist')), rows = visible();
    if (!rows.length) { box.appendChild(h('p', { class: 'sm' }, 'No reports match these filters.')); return; }
    rows.forEach(function (r) {
      var row = h('div', { class: 'li' + (selected && selected.id === r.id ? ' on' : ''), role: 'button', tabindex: '0', onclick: function () { select(r, true); } },
        h('span', { class: 'dot', style: 'background:' + COLOR[r.status] }),
        h('span', { class: 'grow' }, h('b', {}, r.code), ' ' + (TYPES[r.dump_type] || r.dump_type) + ', ' + r.location_text,
          h('small', {}, townName(r.region_id) + ' - ' + when(r.created_at))));
      if (r.msg_count) row.appendChild(h('span', { class: 'msgmark' + (r.last_from_staff === false ? ' new' : '') }, r.last_from_staff === false ? 'Reporter replied' : 'Messaged'));
      row.appendChild(h('span', { class: 'badge', style: 'background:' + COLOR[r.status] }, STATUS[r.status]));
      box.appendChild(row);
    });
  }

  function redraw(refit) {
    if (!token) return;
    drawMap(refit);
    renderList();
    renderPanel();
  }

  function renderPanel() {
    var box = clear($('gvpanel'));
    if (!selected) {
      box.appendChild(h('h3', {}, 'Select a report'));
      var key = h('div', { class: 'key' });
      Object.keys(STATUS).forEach(function (s) { key.appendChild(h('span', {}, h('i', { class: 'dot', style: 'background:' + COLOR[s] }), STATUS[s])); });
      box.appendChild(key);
      return;
    }
    box.appendChild(detail(selected));
  }

  function detail(r) {
    var box = h('div', {}, h('div', { class: 'dhead' }, h('h3', {}, r.code), h('span', { class: 'badge', style: 'background:' + COLOR[r.status] }, STATUS[r.status])));
    box.appendChild(h('p', {}, h('b', {}, TYPES[r.dump_type] || r.dump_type), (DG.lang() === 'es' ? ' en ' : ' in ') + townName(r.region_id)));
    box.appendChild(h('p', {}, r.location_text));
    box.appendChild(h('p', {}, r.description));
    if (r.notes) box.appendChild(h('p', { class: 'sm' }, r.notes));
    box.appendChild(h('p', { class: 'sm' }, 'Filed ' + when(r.created_at) + (r.lat == null ? '. No map point.' : '')));
    if (r.has_photo) {
      var img = h('img', { alt: 'Report photo', class: 'shot', style: 'display:none' });
      var msg = h('p', { class: 'sm' }, 'Loading photo...');
      box.appendChild(msg); box.appendChild(img);
      fetch(base() + '/admin/dumping/photo?id=' + encodeURIComponent(r.id), { headers: { authorization: 'Bearer ' + token } })
        .then(function (res) { if (!res.ok) throw new Error('photo'); return res.blob(); })
        .then(function (b) { img.src = URL.createObjectURL(b); img.style.display = 'block'; msg.remove(); })
        .catch(function () { msg.textContent = 'Photo could not be loaded.'; });
    }

    var sel = h('select', { 'aria-label': 'Status' });
    Object.keys(STATUS).forEach(function (s) { sel.appendChild(h('option', { value: s }, STATUS[s])); });
    sel.value = r.status;
    var out = h('p', { class: 'sm', 'aria-live': 'polite' });
    var save = h('button', { class: 'btn dark', type: 'button' }, 'Update status');
    save.addEventListener('click', function () {
      save.disabled = true;
      jsonPost('/admin/dumping/status', { id: r.id, status: sel.value }).then(function (res) {
        save.disabled = false;
        if (res.status === 200) { r.status = sel.value; redraw(false); return; }
        out.className = 'err'; out.textContent = 'Could not update. Sign in again.';
      }).catch(function () { save.disabled = false; out.className = 'err'; out.textContent = 'Could not reach the server.'; });
    });
    box.appendChild(h('div', { class: 'row tight' }, sel, save)); box.appendChild(out);

    box.appendChild(h('h4', {}, 'Messages with the reporter'));
    var thread = h('div', { class: 'thread', 'aria-live': 'polite' }, h('p', { class: 'sm' }, 'Loading messages...'));
    box.appendChild(thread);
    loadThread(r, thread);
    var text = h('textarea', { rows: '3', maxlength: '500', 'aria-label': 'Message to the reporter', placeholder: 'Ask a question or give an update. Keep it short.' });
    var err = h('p', { class: 'err', 'aria-live': 'polite' });
    var send = h('button', { class: 'btn dark', type: 'button' }, 'Send message');
    send.addEventListener('click', function () {
      var body = text.value.trim();
      if (!body) { err.textContent = 'Write a message first.'; return; }
      err.textContent = ''; send.disabled = true;
      jsonPost('/admin/dumping/message', { id: r.id, body: body }).then(function (res) {
        send.disabled = false;
        if (res.status === 201) { text.value = ''; r.msg_count = (r.msg_count || 0) + 1; r.last_from_staff = true; loadThread(r, thread); renderList(); return; }
        err.textContent = res.status === 409 ? 'This conversation is full.' : res.status === 401 ? 'Sign in again.' : 'Could not send the message. Try again.';
      }).catch(function () { send.disabled = false; err.textContent = 'Could not reach the server.'; });
    });
    box.appendChild(text); box.appendChild(h('div', { class: 'row tight' }, send)); box.appendChild(err);
    return box;
  }

  function loadThread(r, el) {
    authFetch('/admin/dumping/messages?id=' + encodeURIComponent(r.id)).then(function (res) {
      if (selected !== r) return;
      clear(el);
      if (res.status !== 200) { el.appendChild(h('p', { class: 'sm' }, 'Messages are not available right now.')); return; }
      var list = res.body.messages;
      if (!list.length) { el.appendChild(h('p', { class: 'sm' }, 'No messages yet.')); return; }
      list.forEach(function (m) {
        el.appendChild(h('div', { class: 'msg ' + (m.from === 'staff' ? 'out' : 'in') },
          h('small', {}, (m.from === 'staff' ? 'Staff' : 'Reporter') + ' - ' + when(m.at)), h('p', {}, m.body)));
      });
      el.scrollTop = el.scrollHeight;
    }).catch(function () { if (selected === r) { clear(el).appendChild(h('p', { class: 'sm' }, 'Messages are not available right now.')); } });
  }

  function select(r, pan) {
    selected = r;
    if (pan && r.lat != null) map.setView([r.lat, r.lng], Math.max(map.getZoom(), 15));
    redraw(false);
    if (pan) $('gvpanel').scrollIntoView({ block: 'nearest' });
  }

  function show(on) {
    $('gsign').style.display = on ? 'none' : '';
    $('gdash').style.display = on ? 'block' : 'none';
  }
  function load() {
    return authFetch('/admin/dumping').then(function (r) {
      if (r.status === 200) reports = r.body.reports;
      return r.status;
    });
  }
  function staffLogin(user, pw) {
    token = user + ':' + pw;
    return load().then(function (status) {
      if (status !== 200) {
        token = null;
        return { ok: false, message: status === 429 ? 'Too many attempts. Try again later.' : 'That username or password was not accepted.' };
      }
      return DG.api.get('/dumping/map').then(function (m) { if (m.status === 200) towns = m.body.towns; }).catch(function () {}).then(function () {
        show(true); ensureMap(); fillFilters(); selected = null;
        redraw(true);
        setTimeout(function () { map.invalidateSize(); drawMap(true); }, 80);
        return { ok: true };
      });
    }).catch(function () { token = null; return { ok: false, message: 'Could not reach the server.' }; });
  }
  DG.staffLogin = staffLogin;

  function signOut() {
    token = null; reports = []; selected = null;
    clear($('gvlist')); clear($('gvpanel'));
    if (layer) layer.clearLayers();
    show(false);
  }

  function refresh() {
    $('gvrefresh').disabled = true;
    load().then(function () {
      $('gvrefresh').disabled = false;
      if (selected) selected = reports.filter(function (x) { return x.id === selected.id; })[0] || null;
      redraw(false);
    }).catch(function () { $('gvrefresh').disabled = false; });
  }

  function init() {
    if (!$('gdash')) return;
    show(false);
    ['gftype', 'gftown', 'gfstat'].forEach(function (id) { $(id).addEventListener('change', function () { selected = null; redraw(true); }); });
    $('gvout').addEventListener('click', signOut);
    $('gvrefresh').addEventListener('click', refresh);
    window.addEventListener('dg-lang', function () { if (token) redraw(false); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();

(function () {
  'use strict';

  var DG = window.DumpGuard;
  if (!DG) return;

    var ES = {
    'Home': 'Inicio',
    'Pickup': 'Recogida',
    'Government sign-in': 'Inicio de sesión del gobierno',
    'Identify': 'Identificar',
    'Report': 'Reportar',
    'Map': 'Mapa',
    'Get started': 'Comenzar',
    'Electronics': 'Electrónicos',
    'Yard waste': 'Desechos de jardín',
    'Furniture': 'Muebles',
    'Appliances': 'Electrodomésticos',
    'Tires': 'Llantas',
    'Enter your ZIP code to see pickup days.': 'Escriba su código postal para ver los días de recogida.',
    'Pickup days': 'Días de recogida',
    'We are still finding verified pickup data for this area. Check back soon.': 'Todavía estamos buscando datos de recogida verificados para esta zona. Vuelva a consultar pronto.',
    'ZIP code (optional)': 'Código postal (opcional)',
    'Look up': 'Buscar',
    'Your town': 'Su municipio',
    'Refresh': 'Actualizar',
    'All reports': 'Todos los reportes',
    'Select a report': 'Seleccione un reporte',
    'Street map tiles could not load. Report points still show.': 'No se pudieron cargar los mosaicos del mapa. Los puntos de reporte siguen visibles.',
    'Messages with the reporter': 'Mensajes con quien reportó',
    'Loading messages...': 'Cargando mensajes...',
    'Messages are not available right now.': 'Los mensajes no están disponibles en este momento.',
    'No messages yet.': 'Aún no hay mensajes.',
    'Send message': 'Enviar mensaje',
    'Write a message first.': 'Escriba un mensaje primero.',
    'This conversation is full.': 'Esta conversación está llena.',
    'Sign in again.': 'Inicie sesión de nuevo.',
    'Could not send the message. Try again.': 'No se pudo enviar el mensaje. Inténtelo de nuevo.',
    'Ask a question or give an update. Keep it short.': 'Haga una pregunta o dé una novedad. Sea breve.',
    'Message to the reporter': 'Mensaje para quien reportó',
    'Reporter replied': 'Quien reportó respondió',
    'Messaged': 'Con mensaje',
    'New message': 'Mensaje nuevo',
    'Messages from officials': 'Mensajes de los funcionarios',
    'Send reply': 'Enviar respuesta',
    'Write a reply first.': 'Escriba una respuesta primero.',
    'Too many replies. Try again later.': 'Demasiadas respuestas. Inténtelo más tarde.',
    'Could not send the reply. Try again.': 'No se pudo enviar la respuesta. Inténtelo de nuevo.',
    'Write a reply. Please do not include your name or phone number.': 'Escriba una respuesta. No incluya su nombre ni su número de teléfono.',
    'Your reply': 'Su respuesta',
    'Search an item': 'Busque un artículo',
    'Or use a photo': 'O use una foto',
    'Not sure. Pick a category': 'No está seguro. Elija una categoría',
    'Report illegal dumping': 'Reportar tiro ilegal de basura',
    'Town': 'Municipio',
    'Street address or location': 'Dirección o ubicación',
    'Type of dumping': 'Tipo de basura',
    'Description': 'Descripción',
    'Additional notes (optional)': 'Notas adicionales (opcional)',
    'Photo (optional)': 'Foto (opcional)',
    'Take or upload a picture': 'Tome o suba una foto',
    'Take or upload a photo': 'Tome o suba una foto',
    'What was dumped and roughly how much?': '¿Qué se tiró y aproximadamente cuánto?',
    'Please don\'t include people, license plates, or names in your photo or notes.': 'Por favor, no incluya personas, placas ni nombres en su foto o notas.',
    'Submit report': 'Enviar reporte',
    'Track a report': 'Seguir un reporte',
    'Check': 'Consultar',
    'Tracking code': 'Código de seguimiento',
    'Choose your town': 'Elija su municipio',
    'Choose a type': 'Elija un tipo',
    'Household trash or bags': 'Basura doméstica o bolsas',
    'Furniture or mattresses': 'Muebles o colchones',
    'Construction or demolition debris': 'Escombros de construcción o demolición',
    'Chemicals or hazardous waste': 'Químicos o desechos peligrosos',
    'Other': 'Otro',
    'Use my location': 'Usar mi ubicación',
    'Finding your location...': 'Buscando su ubicación...',
    'Location added. You can still describe the spot above.': 'Ubicación agregada. Aún puede describir el lugar arriba.',
    'Could not get your location. Type the address instead.': 'No se pudo obtener su ubicación. Escriba la dirección.',
    'Selected photo': 'Foto seleccionada',
    'That photo could not be used. Try a different one.': 'No se pudo usar esa foto. Pruebe con otra.',
    'That photo is too large.': 'Esa foto es demasiado grande.',
    'Choose your town.': 'Elija su municipio.',
    'Choose the type of dumping.': 'Elija el tipo de basura.',
    'Describe where it is (at least 3 characters).': 'Describa dónde está (al menos 3 caracteres).',
    'Describe what was dumped (at least 3 characters).': 'Describa qué se tiró (al menos 3 caracteres).',
    'Notes can be up to 500 characters.': 'Las notas pueden tener hasta 500 caracteres.',
    'Too many reports from this connection. Try again in an hour.': 'Demasiados reportes desde esta conexión. Intente de nuevo en una hora.',
    'Could not send the report. Try again.': 'No se pudo enviar el reporte. Intente de nuevo.',
    'Could not reach the server. Try again.': 'No se pudo conectar con el servidor. Intente de nuevo.',
    'Report sent. Your tracking code is': 'Reporte enviado. Su código de seguimiento es',
    '. Save it to check on the report later. It is also saved in this browser.': '. Guárdelo para consultar el reporte después. También se guarda en este navegador.',
    'Codes look like DG-4F7K2.': 'Los códigos tienen este formato: DG-4F7K2.',
    'Checking...': 'Consultando...',
    'No report with that code.': 'No hay ningún reporte con ese código.',
    'Too many checks. Try again later.': 'Demasiadas consultas. Intente más tarde.',
    'Could not check the report. Try again.': 'No se pudo consultar el reporte. Intente de nuevo.',
    'Reports from this browser': 'Reportes de este navegador',
    'Received': 'Recibido',
    'Noticed by officials': 'Detectado por las autoridades',
    'In progress': 'En proceso',
    'Resolved': 'Resuelto',
    'New': 'Nuevo',
    'Noticed': 'Detectado',
    'Filter by type': 'Filtrar por tipo',
    'Filter by town': 'Filtrar por municipio',
    'Status': 'Estado',
    'All statuses': 'Todos los estados',
    'All types': 'Todos los tipos',
    'All towns': 'Todos los municipios',
    'Sign out': 'Cerrar sesión',
    'Government access': 'Acceso del gobierno',
    'Username': 'Usuario',
    'Resident': 'Residente',
    'Government': 'Gobierno',
    'Sign in': 'Iniciar sesión',
    'Enter the username and password.': 'Escriba el usuario y la contraseña.',
    'That username or password was not accepted.': 'No se aceptó ese usuario o contraseña.',
    'Too many attempts. Try again later.': 'Demasiados intentos. Intente más tarde.',
    'Could not reach the server.': 'No se pudo conectar con el servidor.',
    'Street map tiles could not load. Report areas still show.': 'No se pudo cargar el mapa de calles. Las áreas de reportes se siguen mostrando.',
    'The map could not load. Try again later.': 'No se pudo cargar el mapa. Intente más tarde.',
    'Household trash': 'Basura doméstica',
    'Construction debris': 'Escombros de construcción',
    'Hazardous waste': 'Desechos peligrosos',
    'By town': 'Por municipio',
    'Approximate area, not an address.': 'Área aproximada, no una dirección.',
    'Reports': 'Reportes',
    'No reports match these filters.': 'Ningún reporte coincide con estos filtros.',
    'Loading photo...': 'Cargando foto...',
    'Photo could not be loaded.': 'No se pudo cargar la foto.',
    'Update status': 'Actualizar estado',
    'Could not update. Sign in again.': 'No se pudo actualizar. Inicie sesión de nuevo.',
    'Report photo': 'Foto del reporte',
    'Look up an item': 'Busque un artículo',
    'Password': 'Contraseña',
    'An all-in-one solution for waste management in NJ-06 towns': 'Una solución integral para el manejo de desechos en los municipios de NJ-06',
    'Address or nearby landmark': 'Dirección o lugar de referencia cercano',
    'How long it has been there, any hazards': 'Cuánto tiempo lleva ahí, posibles peligros',
    'Reported dumping': 'Tiros de basura reportados',
    'Government dashboard': 'Panel del gobierno',
    'Location data removed from photo.': 'Se quitaron los datos de ubicación de la foto.',
    'couch, TV, battery': 'sofá, TV, batería',
    'What does DumpGuard do?': '¿Qué hace DumpGuard?',
    'Find where an item goes': 'Encuentre adónde va un artículo',
    'See your pickup days': 'Vea sus días de recogida',
  };

  var plural = function (n, one, many) { return n + ' ' + (Number(n) === 1 ? one : many); };
  var lit = function (s) { return ES[s] || s; };

  var RX = [
    [/^(\d+) reports? in this area$/, function (m) { return plural(m[1], 'reporte', 'reportes') + ' en esta área'; }],
    [/^(New|Noticed|In progress|Resolved): (\d+)$/, function (m) { return lit(m[1]) + ': ' + m[2]; }],
    [/^(\d+) areas? with (\d+) or more reports$/, function (m) { return plural(m[1], 'área', 'áreas') + ' con ' + m[2] + ' o más reportes'; }],
    [/^(\d+) reports?(?:, (\d+) without a map point)?$/, function (m) { return plural(m[1], 'reporte', 'reportes') + (m[2] ? ', ' + m[2] + ' sin punto en el mapa' : ''); }],
    [/^(.+): (\d+) open$/, function (m) { return m[1] + ': ' + m[2] + ' abiertos'; }],
    [/^(\d+) new, (\d+) noticed, (\d+) in progress, (\d+) resolved$/, function (m) { return m[1] + ' nuevos, ' + m[2] + ' detectados, ' + m[3] + ' en proceso, ' + m[4] + ' resueltos'; }],
    [/^Areas appear on the map once (\d+) or more reports are close together\.$/, function (m) { return 'Las áreas aparecen en el mapa cuando ' + m[1] + ' o más reportes están cerca unos de otros.'; }],
    [/^Town labels: (on|off)$/, function (m) { return 'Etiquetas de municipios: ' + (m[1] === 'on' ? 'sí' : 'no'); }],
    [/^Filed (.+?)(?:, last update (.+?))?(\. No map point\.)?$/, function (m) { return 'Presentado ' + m[1] + (m[2] ? ', última actualización ' + m[2] : '') + (m[3] ? '. Sin punto en el mapa.' : ''); }],
    [/^(DG-[A-Z0-9]{5}): (Received|Noticed by officials|In progress|Resolved)$/, function (m) { return m[1] + ': ' + lit(m[2]); }],
    [/^(DG-[A-Z0-9]{5}) - (.+?) - (.*)$/, function (m) { return m[1] + ' - ' + lit(m[2]) + ' - ' + m[3]; }],
    [/^(.+): We are still finding verified pickup data for this area\. Check back soon\.$/, function (m) { return m[1] + ': ' + ES['We are still finding verified pickup data for this area. Check back soon.']; }],
    [/^Reporting in (.+)$/, function (m) { return 'Reportando en ' + m[1]; }],
    [/^(.*) · filed (.+)$/, function (m) { return m[1] + ' · presentado ' + m[2]; }],
    [/^(Staff|Reporter|Officials|You) - (.+)$/, function (m) { return ({ Staff: 'Personal', Reporter: 'Quien reportó', Officials: 'Funcionarios', You: 'Usted' })[m[1]] + ' - ' + m[2]; }],
    [/^No email is sent\. Your code is (\d+)\.$/, function (m) { return 'No se envía ningún correo. Su código es ' + m[1] + '.'; }],
  ];

  function es(en) {
    var key = en.trim();
    if (!key) return en;
    var out = ES[key];
    if (!out) {
      for (var i = 0; i < RX.length; i++) {
        var m = RX[i][0].exec(key);
        if (m) { out = RX[i][1](m); break; }
      }
    }
    return out ? en.replace(key, function () { return out; }) : en;
  }

  var ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  var textRec = new WeakMap();
  var attrRec = new WeakMap();
  var observer = null, queued = false;

  function swap(cur, rec, spanish) {
    var en = rec && rec.out === cur ? rec.en : cur;
    var out = spanish ? es(en) : en;
    return { en: en, out: out };
  }

  function apply() {
    queued = false;
    var spanish = DG.lang() === 'es';
    if (observer) observer.disconnect();
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        return p === 'SCRIPT' || p === 'STYLE' || p === 'NOSCRIPT' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    var n;
    while ((n = walker.nextNode())) {
      var r = swap(n.nodeValue, textRec.get(n), spanish);
      if (r.out !== n.nodeValue) n.nodeValue = r.out;
      if (r.out !== r.en) textRec.set(n, r); else textRec.delete(n);
    }
    var els = document.body.querySelectorAll('[placeholder],[aria-label],[alt],[title]');
    Array.prototype.forEach.call(els, function (el) {
      var recs = attrRec.get(el) || {};
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        var cur = el.getAttribute(a), r = swap(cur, recs[a], spanish);
        if (r.out !== cur) el.setAttribute(a, r.out);
        if (r.out !== r.en) recs[a] = r; else delete recs[a];
      });
      attrRec.set(el, recs);
    });
    document.documentElement.lang = DG.lang();
    syncToggle();
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function queue() { if (!queued) { queued = true; setTimeout(apply, 40); } }

  var toggle = null;
  function syncToggle() { if (toggle) toggle.value = DG.lang(); }
  function addToggle() {
    var ul = document.querySelector('#nav ul');
    if (!ul) return;
    var li = document.createElement('li');
    toggle = document.createElement('select');
    toggle.id = 'navlang'; toggle.className = 'navlang'; toggle.setAttribute('aria-label', 'Language / Idioma');
    [['en', 'English'], ['es', 'Español']].forEach(function (o) {
      var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; op.lang = o[0]; toggle.appendChild(op);
    });
    toggle.addEventListener('change', function () { DG.setLang(toggle.value); });
    li.appendChild(toggle);
    ul.insertBefore(li, ul.lastElementChild);
    syncToggle();
  }

  function init() {
    addToggle();
    window.addEventListener('dg-lang', queue);
    observer = new MutationObserver(queue);
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var DG = window.DumpGuard;

  var ALIAS = { about: 'home', login: 'gov', signup: 'home', forgot: 'home', dash: 'home' };

  function go(v) {
    v = ALIAS[v] || v;
    if (!$('v-' + v)) v = 'home';
    Array.prototype.forEach.call(document.querySelectorAll('.view'), function (e) { e.classList.toggle('on', e.id === 'v-' + v); });
    Array.prototype.forEach.call(document.querySelectorAll('nav a, #tabs a'), function (a) { a.classList.toggle('act', a.getAttribute('data-go') === v); });
    try { history.replaceState(null, '', '#' + v); } catch {}
    window.scrollTo(0, 0);
    var view = $('v-' + v);
    var heading = view ? view.querySelector('h1, h2') : null;
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    navStyle();
    if (v === 'map') setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
  }
  function navStyle() {
    var home = $('v-home');
    $('nav').classList.toggle('solid', !(home && home.classList.contains('on')) || window.scrollY > window.innerHeight - 120);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-go]') : null;
    if (t) { e.preventDefault(); go(t.getAttribute('data-go')); }
  });
  window.addEventListener('scroll', navStyle);

  async function govLogin() {
    var e = $('lerr'), u = $('le').value.trim(), pw = $('lp').value;
    if (!u || !pw) return void (e.textContent = 'Enter the username and password.');
    $('lgo').disabled = true;
    var r = await DG.staffLogin(u, pw);
    $('lgo').disabled = false;
    if (!r.ok) return void (e.textContent = r.message);
    e.textContent = ''; $('le').value = ''; $('lp').value = '';
  }
  $('lgo').onclick = govLogin;
  $('lp').addEventListener('keydown', function (e) { if (e.key === 'Enter') govLogin(); });
  $('le').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('lp').focus(); });

  go(location.hash.slice(1) || 'home');
})();
