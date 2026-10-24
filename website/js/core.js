(() => {
  'use strict';

  const BASE = (window.DUMPGUARD_API || '/api/v1').replace(/\/$/, '');
  const $ = id => document.getElementById(id);

  const T = {
    en: {
      placeholder: 'couch, TV, battery', empty: 'Your disposal guide will appear here.', searching: 'Searching...', none: 'No match. Pick a category instead, or try another word.',
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
  };
  const COLORS = { recycling: '#15803d', trash: '#4b5563', special_dropoff: '#dc2626' };

  const state = { lang: 'en', town: null, towns: [], counted: {} };
  try {
    state.lang = (localStorage.getItem('dg_lang') || (navigator.language || 'en').slice(0, 2)) === 'es' ? 'es' : 'en';
    state.town = localStorage.getItem('dg_town');
  } catch {}
  const spanish = () => state.lang === 'es';
  const locale = () => (spanish() ? 'es-US' : 'en-US');
  const t = key => T[state.lang][key];
  const pick = o => (o ? o[state.lang] || o.en || '' : '');
  const paint = color => `background:${color}`;

  const h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') el.className = value;
      else if (key === 'style') el.style.cssText = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value);
    }
    if (attrs.role === 'button' && typeof attrs.onclick === 'function' && !attrs.onkeydown) {
      el.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.key === ' ') e.preventDefault();
        attrs.onclick.call(el, e);
      });
    }
    el.append(...children.filter(c => c !== null && c !== undefined && c !== false));
    return el;
  };
  const clear = el => {
    el.replaceChildren();
    return el;
  };
  const showText = (box, cls, text) => clear(box).appendChild(h('p', { class: cls }, text));
  const showFail = box => showText(box, 'err', t('fail'));

  const request = async (path, opts) => {
    const r = await fetch(BASE + path, opts);
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body };
  };
  const api = {
    get: path => request(path),
    post: (path, data) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }),
  };

  const hasTown = id => state.towns.some(tw => tw.id === id);
  const loadTowns = async () => {
    const r = await api.get('/towns');
    state.towns = r.body.towns || [];
    const sel = $('town');
    if (!sel || !state.towns.length) return;
    clear(sel).append(...state.towns.map(tw => h('option', { value: tw.id }, tw.name)));
    if (!hasTown(state.town)) state.town = hasTown('edison') ? 'edison' : state.towns[0].id;
    sel.value = state.town;
    if (!sel.dataset.bound) {
      sel.dataset.bound = '1';
      sel.addEventListener('change', () => setTown(sel.value));
    }
  };
  const townName = id => state.towns.find(tw => tw.id === id)?.name ?? '';
  const loadPickup = () => {
    const tw = state.towns.find(x => x.id === state.town);
    if (!$('zresult') || !tw?.zips?.length) return;
    $('zip').value = '';
    lookupZip(tw.zips[0], tw.id, []);
  };
  const rememberTown = id => {
    state.town = id;
    try { localStorage.setItem('dg_town', id); } catch {}
    if ($('town')) $('town').value = id;
  };
  const setTown = id => {
    rememberTown(id);
    runSearch();
    loadPickup();
    window.dispatchEvent(new Event('dg-town'));
    const cat = $('cat');
    if (cat?.value) showMaterial(cat.value);
  };
  const setLang = lang => {
    state.lang = lang === 'es' ? 'es' : 'en';
    document.documentElement.lang = state.lang;
    try { localStorage.setItem('dg_lang', state.lang); } catch {}
    translateStatic();
    runSearch();
    if (lastZip && $('zresult')) lookupZip(lastZip.zip, lastZip.town, lastZip.areas);
    window.dispatchEvent(new Event('dg-lang'));
  };
  const translateStatic = () => {
    const q = $('q');
    if (q) q.placeholder = t('placeholder');
    const btn = $('zgo');
    if (btn) btn.textContent = t('lookup');
    if ($('result')?.querySelector('.empty')) emptyState();
    fillCategories();
  };

  let seq = 0;
  let timer = null;
  const emptyState = () => showText($('result'), 'empty', t('empty'));
  const runSearch = async () => {
    const q = $('q') ? $('q').value.trim() : '';
    if (!q) {
      emptyState();
      return;
    }
    const mine = ++seq;
    showText($('result'), 'empty', t('searching'));
    try {
      const r = await api.get(`/search?q=${encodeURIComponent(q)}${state.town ? `&town=${encodeURIComponent(state.town)}` : ''}&limit=6`);
      if (mine !== seq) return;
      if (r.status !== 200) showFail($('result'));
      else renderResults(r.body.results || []);
    } catch {
      if (mine === seq) showFail($('result'));
    }
  };

  const resultRow = (it, onclick) => {
    const color = paint(COLORS[it.resolved.rule]);
    return h('div', { class: 'li', role: 'button', tabindex: '0', onclick },
      h('span', { class: 'dot', style: color }), h('span', {}, pick(it.name)),
      h('span', { class: 'badge', style: color }, t(it.resolved.rule)));
  };

  const renderResults = results => {
    const box = clear($('result'));
    if (!results.length) {
      box.appendChild(h('p', { class: 'empty' }, t('none')));
      showCategoryPicker(true);
      return;
    }
    box.appendChild(card(results[0]));
    if (results.length === 1) return;
    box.appendChild(h('p', { class: 'sm gap' }, t('didyou')));
    for (const it of results.slice(1)) {
      box.appendChild(resultRow(it, () => renderResults([it, ...results.filter(x => x !== it)])));
    }
  };

  const card = it => {
    const r = it.resolved;
    const rule = r.rule;
    const el = h('div', {}, h('span', { class: 'tag', style: paint(COLORS[rule]) }, t(rule)), h('h3', {}, pick(it.name)));
    if (it.hazard && rule === 'special_dropoff') el.appendChild(h('p', { class: 'err' }, t('hazard')));
    const note = pick(r.note);
    if (note) el.appendChild(h('p', {}, note));
    if (r.check_local) el.appendChild(h('p', { class: 'notice show' }, pick(r.message)));
    const holder = h('div', {});
    el.appendChild(holder);
    if (rule === 'special_dropoff' && state.town) loadFacilities(holder, it.material);
    el.appendChild(actions(it, rule));
    return el;
  };

  const actions = (it, rule) => {
    const done = state.counted[it.id];
    const count = h('button', { class: 'btn dark small', type: 'button' }, done ? t('thanks') : t('gotit'));
    count.disabled = !!done;
    count.addEventListener('click', async () => {
      count.disabled = true;
      state.counted[it.id] = true;
      await api.post('/events', { outcome: rule, material: it.material, town: state.town || undefined });
      count.textContent = t('thanks');
    });
    const slot = h('div', { style: 'flex-basis:100%' });
    const wrong = h('button', { class: 'btn small outline', type: 'button' }, t('wrong'));
    wrong.addEventListener('click', () => reportForm(slot, 'item_rule', { item: it.id }));
    return h('div', { class: 'row' }, count, wrong, slot);
  };

  const reportForm = (slot, kind, ids) => {
    clear(slot);
    const ta = h('textarea', { rows: '2', maxlength: '500', 'aria-label': t('whatwrong'), placeholder: t('whatwrong') });
    const msg = h('p', { class: 'sm' });
    const send = h('button', { class: 'btn dark small', type: 'button' }, t('send'));
    const cancel = h('button', { class: 'btn small', type: 'button' }, t('cancel'));
    cancel.addEventListener('click', () => clear(slot));
    const showError = text => {
      send.disabled = false;
      msg.className = 'err';
      msg.textContent = text;
    };
    send.addEventListener('click', async () => {
      const body = { kind, message: ta.value.trim() };
      if (ids.item) body.item = ids.item;
      if (state.town) body.town = state.town;
      send.disabled = true;
      try {
        const r = await api.post('/reports', body);
        if (r.status === 201) {
          clear(slot).appendChild(h('p', { class: 'ok' }, t('sent')));
          return;
        }
        const raw = r.body?.message || '';
        showError(r.status === 429 ? t('fail') : raw === 'Use 3 to 500 characters.' ? t('tooLong') : raw || t('fail'));
      } catch {
        showError(t('fail'));
      }
    });
    slot.append(ta, msg, h('div', { class: 'row' }, send, cancel));
    ta.focus();
  };

  const facCache = {};
  const loadFacilities = async (holder, material) => {
    const key = `${state.town}|${material}`;
    facCache[key] ||= api.get(`/facilities?town=${encodeURIComponent(state.town)}&material=${encodeURIComponent(material)}`);
    try {
      const r = await facCache[key];
      const list = (r.body.facilities || []).slice(0, 2);
      if (!list.length) return;
      holder.appendChild(h('p', { class: 'sm', style: 'margin-top:14px' }, t('where')));
      for (const f of list) {
        const open = f.open_now === true ? t('openNow') : f.open_now === false ? t('closed') : '';
        const line = h('div', { class: 'item' }, h('b', {}, f.name), h('small', {}, `${f.address}${f.phone ? ` - ${f.phone}` : ''}`),
          h('small', {}, open ? `${f.hours} - ${open}` : f.hours));
        if (f.residents_only) line.appendChild(h('small', {}, t('residents')));
        holder.appendChild(line);
      }
    } catch {}
  };

  const MATERIAL_ORDER = ['rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard'];
  const fillCategories = () => {
    const cat = $('cat');
    if (!cat) return;
    const current = cat.value;
    clear(cat).append(h('option', { value: '' }, t('catPick')), ...MATERIAL_ORDER.map(m => h('option', { value: m }, t('materials')[m])));
    cat.value = current;
  };
  const showCategoryPicker = show => {
    if ($('pick')) $('pick').style.display = show ? 'block' : 'none';
  };
  const showMaterial = async cls => {
    if (cls === 'no_object' || !cls) return;
    showCategoryPicker(true);
    if ($('cat')) $('cat').value = cls;
    const mine = ++seq;
    try {
      const r = await api.get(`/materials/${encodeURIComponent(cls)}${state.town ? `?town=${encodeURIComponent(state.town)}` : ''}`);
      if (mine !== seq) return;
      const box = clear($('result'));
      if (r.status !== 200) {
        showFail(box);
        return;
      }
      const b = r.body;
      box.appendChild(h('h3', {}, t('materials')[cls] || cls));
      if (b.consensus) {
        box.appendChild(h('span', { class: 'tag', style: paint(COLORS[b.consensus.rule]) }, t(b.consensus.rule)));
        box.appendChild(h('p', { class: 'sm' }, `${t('consensus')} (${t('basedOn')} ${b.consensus.based_on} ${t('items')})`));
      }
      for (const it of b.items.slice(0, 8)) {
        box.appendChild(resultRow(it, () => renderResults([{ id: it.id, name: it.name, material: cls, hazard: it.hazard, resolved: it.resolved }])));
      }
    } catch {
      if (mine === seq) showFail($('result'));
    }
  };

  let lastZip = null;
  let zipSeq = 0;
  const streamName = s => ({ trash: t('trashS'), garbage: t('trashS'), area: t('areaS'), recycling: t('recyclingS'), bulk: t('bulk'), yard: t('yard') })[s] || s;
  const fmt = iso => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { weekday: 'short', month: 'short', day: 'numeric' });
  const areaParams = areas => areas.map(a => `area=${encodeURIComponent(a)}`);

  const lookupZip = async (zip, town, areas = []) => {
    const box = clear($('zresult'));
    if (!/^\d{5}$/.test(zip)) {
      box.appendChild(h('p', { class: 'err' }, t('badZip')));
      return;
    }
    const mine = ++zipSeq;
    lastZip = { zip, town, areas };
    const query = [town && `town=${encodeURIComponent(town)}`, ...areaParams(areas)].filter(Boolean);
    try {
      const r = await api.get(`/schedule/${zip}${query.length ? `?${query.join('&')}` : ''}`);
      if (mine !== zipSeq) return;
      const b = r.body;
      clear(box);
      if (r.status === 404) {
        showText(box, 'err', t('noZip'));
        return;
      }
      if (r.status !== 200) {
        showFail(box);
        return;
      }
      if (b.town?.id && b.town.id !== state.town) {
        rememberTown(b.town.id);
        runSearch();
        window.dispatchEvent(new Event('dg-town'));
      }
      if (b.needs === 'town') {
        box.appendChild(h('p', {}, t('pickTown')));
        for (const tw of b.towns) {
          box.appendChild(h('button', { class: 'btn dark small town', type: 'button', onclick: () => lookupZip(zip, tw.id, []) }, tw.name));
        }
      } else if (b.needs === 'area') {
        renderAreas(box, b, zip, areas);
      } else {
        renderSchedule(box, b, areas, mine);
      }
    } catch {
      if (mine === zipSeq) showFail(box);
    }
  };

  const renderAreas = (box, b, zip, chosen) => {
    box.appendChild(h('h3', {}, b.town.name));
    box.appendChild(h('p', {}, t('pickArea')));
    const picks = {};
    for (const k of chosen) picks[k.includes(':') ? k.split(':')[0] : 'area'] = k;
    for (const g of b.groups) {
      const sel = h('select', { 'aria-label': streamName(g) }, h('option', { value: '' }, t('choose')));
      if (b.groups.length > 1) box.appendChild(h('label', { class: 'pick-label' }, streamName(g)));
      for (const a of b.areas.filter(x => x.group === g)) {
        const label = (spanish() ? a.label_es : a.label) || a.label;
        const desc = (spanish() ? a.description_es : a.description) || '';
        sel.appendChild(h('option', { value: a.key }, desc ? `${label}: ${desc.length > 60 ? `${desc.slice(0, 57)}...` : desc}` : label));
      }
      sel.value = picks[g] || '';
      sel.addEventListener('change', () => {
        if (sel.value) picks[g] = sel.value; else delete picks[g];
        if (b.groups.every(x => picks[x])) lookupZip(zip, b.town.id, b.groups.map(x => picks[x]));
      });
      box.appendChild(sel);
    }
  };

  const renderSchedule = (box, b, areas, mine) => {
    box.appendChild(h('h3', {}, b.town.name));
    for (const s of b.schedules) {
      const line = h('div', { class: 'item' }, h('b', {}, streamName(s.stream)));
      const next = (s.next || []).slice(0, 3);
      if (next.length) {
        const dates = next.map(o => `${fmt(o.date)}${o.moved ? ` (${t('moved')}: ${spanish() ? o.reason_es : o.reason})` : ''}`);
        line.appendChild(h('small', {}, `${t('next')}: ${dates.join('; ')}`));
      }
      const note = spanish() ? s.note_es : s.note_en;
      if (note) line.appendChild(h('small', {}, note));
      box.appendChild(line);
    }
    for (const st of ['trash', 'recycling']) {
      if (b.schedules.some(s => s.stream === st)) continue;
      box.appendChild(h('div', { class: 'item' }, h('b', {}, streamName(st)), h('small', {}, t('notListed'))));
    }
    if (b.calendar) box.appendChild(h('p', {}, h('a', { class: 'btn dark small', href: b.calendar.webcal }, t('calendar'))));
    showAlerts(box, b, areas, mine);
  };

  const showAlerts = async (box, b, areas, mine) => {
    try {
      const query = [`town=${encodeURIComponent(b.town.id)}`, ...areaParams(areas)];
      const r = await api.get(`/alerts?${query.join('&')}`);
      if (mine !== zipSeq) return;
      const list = r.body?.announcements || [];
      if (!list.length) return;
      const note = h('div', { class: 'notice show' }, h('b', {}, `${t('alerts')}: `), list.map(a => pick(a.message)).join(' '));
      box.insertBefore(note, box.children[1] || null);
    } catch {}
  };

  const wireSchedule = () => {
    if (!$('zgo')) return;
    const search = () => lookupZip($('zip').value.trim());
    $('zgo').addEventListener('click', search);
    $('zip').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
  };

  const init = async () => {
    wireSchedule();
    fillCategories();
    translateStatic();
    if ($('q')) {
      $('q').addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(runSearch, 250);
      });
    }
    if ($('cat')) $('cat').addEventListener('change', () => { if ($('cat').value) showMaterial($('cat').value); });
    try {
      await loadTowns();
      runSearch();
      loadPickup();
      window.dispatchEvent(new Event('dg-town'));
    } catch {}
  };

  const dumpTypes = {
    household: 'Household trash', furniture: 'Furniture', appliances: 'Appliances', electronics: 'Electronics', tires: 'Tires',
    construction: 'Construction debris', yard: 'Yard waste', hazardous: 'Hazardous waste', other: 'Other',
  };
  const statusColor = { new: '#c0392b', noticed: '#a86b0a', progress: '#1f5fa8', resolved: '#2f7a28' };
  const when = iso => new Date(iso).toLocaleString(locale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const tileMap = (id, onTilesFail) => {
    const map = L.map(id, { scrollWheelZoom: false }).setView([40.45, -74.25], 10);
    let failed = 0;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
      .on('tileerror', () => { if (++failed > 3) onTilesFail(); });
    if (window.ResizeObserver) new ResizeObserver(() => map.invalidateSize()).observe($(id));
    return map;
  };

  window.DumpGuard = {
    material: m => T[state.lang].materials[m], dumpTypes, statusColor, when, tileMap, locale,
    api, request, setTown, showMaterial, showCategoryPicker,
    h, clear, lang: () => state.lang, setLang, townId: () => state.town, townName: () => townName(state.town),
  };
  esReady.then(es => {
    T.es = es.guide ?? T.en;
    init();
  });
})();
