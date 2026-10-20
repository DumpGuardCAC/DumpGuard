/* DumpGuard backend client and the Identify / pickup-day screens.
 *
 * API base: window.DUMPGUARD_API, else /api/v1 (same origin; scripts/dev-server.mjs in website/backend/api serves both).
 * Everything the API returns is put on the page with textContent, never innerHTML.
 * Exposes window.DumpGuard (api, request, setTown, showMaterial, DOM helpers) for the report form, map and photo model scripts.
 */
(function () {
  'use strict';

  var BASE = (window.DUMPGUARD_API || '/api/v1').replace(/\/$/, '');
  var $ = function (id) { return document.getElementById(id); };

  // ---- strings (Spanish is machine-drafted, as on the server) ----
  var T = {
    en: {
      empty: 'Your disposal guide will appear here.', searching: 'Searching...', none: 'No match. Pick a category instead, or try another word.',
      didyou: 'Other matches', recycling: 'Recycle', trash: 'Trash', special_dropoff: 'Special drop-off', hazard: 'Hazardous: do not put in the bin',
      source: 'Source', verified: 'verified', gotit: 'Got it, counted anonymously', thanks: 'Thanks, counted anonymously.',
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
      source: 'Fuente', verified: 'verificado', gotit: 'Listo, contar de forma anónima', thanks: 'Gracias, contado de forma anónima.',
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
  try { state.lang = (localStorage.getItem('dg_lang') || (navigator.language || 'en').slice(0, 2)) === 'es' ? 'es' : 'en'; state.town = localStorage.getItem('dg_town'); } catch (e) { /* storage can be blocked */ }
  var t = function (k) { return T[state.lang][k]; };
  var pick = function (o) { return o ? (o[state.lang] || o.en || '') : ''; };

  // ---- tiny DOM helper ----
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

  // ---- API ----
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

  // ---- town + language pickers ----
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
  // The Pickup days page follows the shared town: it loads that town's first ZIP, and says so when there is no data yet.
  function townName(id) { var tw = state.towns.filter(function (x) { return x.id === id; })[0]; return tw ? tw.name : ''; }
  function loadPickup() {
    var tw = state.towns.filter(function (x) { return x.id === state.town; })[0];
    if (!$('zresult') || !tw || !tw.zips || !tw.zips.length) return;
    $('zip').value = '';
    lookupZip(tw.zips[0], tw.id, []);
  }
  function setTown(id) {
    state.town = id;
    try { localStorage.setItem('dg_town', id); } catch (e) { /* ignore */ }
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
    try { localStorage.setItem('dg_lang', state.lang); } catch (e) { /* ignore */ }
    translateStatic();
    runSearch();
    if (lastZip && $('zresult')) lookupZip(lastZip.zip, lastZip.town, lastZip.areas);
    window.dispatchEvent(new Event('dg-lang'));
  }
  function translateStatic() {
    var q = $('q'); if (q) q.placeholder = state.lang === 'es' ? 'sofá, TV, batería, partes impresas en 3D...' : 'couch, TV, battery, 3D printed parts…';
    var z = $('zip'); if (z) z.placeholder = '08817';
    var btn = $('zgo'); if (btn) btn.textContent = t('lookup');
    var res = $('result'); if (res && res.querySelector('.empty')) emptyState();
    fillCategories();
  }

  // ---- Identify ----
  var seq = 0, timer = null;
  function emptyState() {
    var box = clear($('result'));
    box.appendChild(h('p', { class: 'empty' }, t('empty')));
    api.get('/stats').then(function (r) {
      if (r.body && r.body.items_sorted > 0 && box.querySelector('.empty')) {
        box.appendChild(h('p', { class: 'sm' }, r.body.items_sorted + ' ' + t('counted') + ' ' + r.body.estimated_pounds_diverted + ' ' + t('lb')));
      }
    }).catch(function () { /* stats are optional */ });
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
      box.appendChild(h('p', { class: 'sm', style: 'margin-top:18px' }, t('didyou')));
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
    if (r.check_local) el.appendChild(h('p', { class: 'notice', style: 'display:block' }, pick(r.message)));
    if (r.source_url) {
      el.appendChild(h('p', { class: 'sm' }, t('source') + ': ', h('a', { class: 'link', href: r.source_url, target: '_blank', rel: 'noopener noreferrer' }, hostOf(r.source_url)), ' (' + t('verified') + ' ' + r.last_verified + ')'));
    }
    var holder = h('div', {});
    el.appendChild(holder);
    if (rule === 'special_dropoff' && state.town) loadFacilities(holder, it.material);
    el.appendChild(actions(it, rule));
    return el;
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

  function actions(it, rule) {
    var row = h('div', { class: 'row' });
    var done = state.counted[it.id];
    var count = h('button', { class: 'btn dark', type: 'button', style: 'padding:10px 22px' }, done ? t('thanks') : t('gotit'));
    count.disabled = !!done;
    count.addEventListener('click', function () {
      count.disabled = true;
      state.counted[it.id] = true;
      api.post('/events', { outcome: rule, material: it.material, town: state.town || undefined }).then(function () { count.textContent = t('thanks'); });
    });
    var slot = h('div', { style: 'flex-basis:100%' });
    var wrong = h('button', { class: 'btn', type: 'button', style: 'border:1px solid #cbd5e1;padding:10px 22px' }, t('wrong'));
    wrong.addEventListener('click', function () { reportForm(slot, 'item_rule', { item: it.id }); });
    row.appendChild(count); row.appendChild(wrong); row.appendChild(slot);
    return row;
  }

  function reportForm(slot, kind, ids) {
    clear(slot);
    var ta = h('textarea', { rows: '2', maxlength: '500', 'aria-label': t('whatwrong'), placeholder: t('whatwrong') });
    var msg = h('p', { class: 'sm' });
    var send = h('button', { class: 'btn dark', type: 'button', style: 'padding:10px 22px' }, t('send'));
    var cancel = h('button', { class: 'btn', type: 'button', style: 'padding:10px 22px' }, t('cancel'));
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
    }).catch(function () { /* facilities are a bonus */ });
  }

  // ---- category picker (stands in for photo recognition) ----
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

  // ---- pickup days by ZIP ----
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
      if (b.town && b.town.id && b.town.id !== state.town) { state.town = b.town.id; try { localStorage.setItem('dg_town', state.town); } catch (e) { /* ignore */ } if ($('town')) $('town').value = state.town; runSearch(); window.dispatchEvent(new Event('dg-town')); }
      if (b.needs === 'town') {
        box.appendChild(h('p', {}, t('pickTown')));
        b.towns.forEach(function (tw) { box.appendChild(h('button', { class: 'btn dark', type: 'button', style: 'margin:0 8px 8px 0;padding:10px 22px', onclick: function () { lookupZip(zip, tw.id, []); } }, tw.name)); });
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
      box.appendChild(h('p', {}, h('a', { class: 'btn dark', href: b.calendar.webcal, style: 'padding:10px 22px' }, t('calendar'))));
      box.appendChild(h('p', { class: 'sm' }, t('calNote')));
    }
    var src = b.schedules[0];
    if (src && src.source_url) box.appendChild(h('p', { class: 'sm' }, t('source') + ': ', h('a', { class: 'link', href: src.source_url, target: '_blank', rel: 'noopener noreferrer' }, hostOf(src.source_url))));
    var qs = ['town=' + encodeURIComponent(b.town.id)].concat(areas.map(function (a) { return 'area=' + encodeURIComponent(a); }));
    api.get('/alerts?' + qs.join('&')).then(function (r) {
      if (mine !== zipSeq) return;
      var list = (r.body && r.body.announcements) || [];
      if (!list.length) return;
      var note = h('div', { class: 'notice', style: 'display:block' }, h('b', {}, t('alerts') + ': '));
      note.appendChild(document.createTextNode(list.map(function (a) { return pick(a.message); }).join(' ')));
      box.insertBefore(note, box.children[1] || null);
    }).catch(function () { /* notices are a bonus */ });
  }
  // ---- pickup-days page: the markup is in index.html, this wires it up ----
  function wireSchedule() {
    if (!$('zgo')) return;
    $('zgo').addEventListener('click', function () { lookupZip($('zip').value.trim()); });
    $('zip').addEventListener('keydown', function (e) { if (e.key === 'Enter') lookupZip($('zip').value.trim()); });
  }

  function init() {
    wireSchedule();
    fillCategories();
    translateStatic();
    loadTowns().then(function () { runSearch(); loadPickup(); window.dispatchEvent(new Event('dg-town')); }).catch(function () { /* the page still renders; searches will report the error */ });
    if ($('q')) $('q').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(runSearch, 250); });
    if ($('cat')) $('cat').addEventListener('change', function () { if ($('cat').value) showMaterial($('cat').value); });
  }

  window.DumpGuard = {
    api: api, request: request, setTown: setTown, showMaterial: showMaterial, showCategoryPicker: showCategoryPicker,
    h: h, clear: clear, lang: function () { return state.lang; }, setLang: setLang, townId: function () { return state.town; }, townName: function () { return townName(state.town); },
  };
  document.addEventListener('DOMContentLoaded', init);
})();
