const esReady = fetch('es.json').then(r => r.json()).catch(() => ({}));

(() => {
  const root = document.documentElement;
  const native = !!window.Capacitor || location.protocol === 'capacitor:' || (location.hostname === 'localhost' && location.protocol === 'https:');
  const standalone = native || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (standalone) root.classList.add('installed');
  if (standalone && ios) root.classList.add('ios');

  if (native) {
    window.DUMPGUARD_API = 'https://dumpguard.vercel.app/api/v1';
    return;
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  if (!ios || standalone) return;
  root.classList.add('gated');

  const T = {
    en: {
      h: 'Add DumpGuard to your Home Screen',
      lead: 'On iPhone, DumpGuard runs as an app. Install it to continue.',
      s1: 'Tap the Share button in the Safari toolbar.',
      s2: 'Scroll down and tap Add to Home Screen.',
      s3: 'Open DumpGuard from your Home Screen.',
      safari: 'This page is not open in Safari. Open it in Safari first.',
    },
  };
  let lang = 'en';
  try { lang = (localStorage.getItem('dg_lang') || (navigator.language || 'en').slice(0, 2)) === 'es' ? 'es' : 'en'; } catch {}
  let t = T.en;
  const inApp = /FBAN|FBAV|Instagram|Snapchat|TikTok|Line\/|MicroMessenger|GSA\/|Twitter/.test(navigator.userAgent);

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const shareIcon = () => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'gate-ico');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M12 15V3M8 7l4-4 4 4M7 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1');
    svg.append(path);
    return svg;
  };
  const build = () => {
    const gate = el('div', 'gate');
    gate.id = 'installgate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'gate-h');
    const logo = el('img', 'gate-logo');
    logo.src = 'icon.png';
    logo.alt = 'DumpGuard';
    logo.height = 72;
    const title = el('h1', '', t.h);
    title.id = 'gate-h';
    gate.append(logo, title, el('p', 'gate-lead', t.lead));
    if (inApp) gate.append(el('p', 'gate-warn', t.safari));
    const first = el('li');
    first.append(shareIcon(), el('span', '', t.s1));
    const steps = el('ol', 'gate-steps');
    steps.append(first, el('li', '', t.s2), el('li', '', t.s3));
    gate.append(steps);
    document.body.append(gate);
  };
  esReady.then(es => {
    T.es = es.install ?? T.en;
    t = T[lang];
    build();
  });
})();

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

(() => {
  'use strict';

  const TFJS = 'lib/tf.min.js';
  const MODEL_URL = 'lib/model.json';
  const CLASSES = ['rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard', 'no_object'];
  const SIZE = 224;
  const TEMPERATURE = 1.9;
  const THRESHOLD = 0.65;

  const S = {
    en: {
      prompt: 'Take or upload a photo', reading: 'Loading the photo model...', looking: 'Looking at the photo...',
      sure: 'Looks like', unsure: 'Not sure what this is. Pick a category below.', none: 'No item found in the photo. Try a closer picture, or pick a category below.',
      fail: 'Photo recognition could not start. Pick a category below.', local: 'The photo stays on your device.', another: 'Try another photo',
    },
  };
  const str = key => (S[window.DumpGuard.lang()] || S.en)[key];

  let tfPromise = null;
  let modelPromise = null;
  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.integrity = 'sha384-L8voclkoniuFcRcupWcIj6Z2X9BjaujQTgwjRJl5LjC7tJ/By8Kkl+nf64+2IVjS';
    script.onload = resolve;
    script.onerror = () => reject(new Error('script'));
    document.head.appendChild(script);
  });
  const loadModel = () => {
    modelPromise ||= (async () => {
      try {
        if (!window.tf) await (tfPromise ||= loadScript(TFJS));
        return await window.tf.loadGraphModel(MODEL_URL);
      } catch (e) {
        modelPromise = null;
        tfPromise = null;
        throw e;
      }
    })();
    return modelPromise;
  };

  const calibrate = (probs, temperature) => {
    const logits = probs.map(p => Math.log(Math.max(p, 1e-9)) / temperature);
    const max = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  };
  const decide = probs => {
    const p = calibrate(probs, TEMPERATURE);
    const best = p.indexOf(Math.max(...p));
    return { cls: CLASSES[best], confidence: p[best], sure: p[best] >= THRESHOLD };
  };

  const classify = async img => {
    const model = await loadModel();
    const { tf } = window;
    const out = tf.tidy(() => model.predict(tf.image.resizeBilinear(tf.browser.fromPixels(img), [SIZE, SIZE]).toFloat().expandDims(0)));
    const data = await out.data();
    out.dispose();
    return decide(Array.from(data));
  };

  const init = () => {
    const input = document.getElementById('photo');
    const label = document.getElementById('droptxt');
    if (!input || !label || !window.DumpGuard) return;
    const DG = window.DumpGuard;
    const { h } = DG;
    let mine = 0;
    const note = h('p', { class: 'sm', 'aria-live': 'polite' });
    input.parentNode.parentNode.insertBefore(note, input.parentNode.nextSibling);
    label.textContent = str('prompt');

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const run = ++mine;
      DG.showCategoryPicker(false);
      note.className = 'sm';
      note.textContent = str('reading');
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => {
        URL.revokeObjectURL(url);
        note.textContent = str('fail');
        DG.showCategoryPicker(true);
      };
      img.onload = async () => {
        if (run !== mine) return;
        DG.clear(label).appendChild(h('img', { src: url, alt: '' }));
        note.textContent = str('looking');
        try {
          const r = await classify(img);
          if (run !== mine) return;
          if (r.cls === 'no_object') {
            note.textContent = str('none');
            DG.showCategoryPicker(true);
          } else if (!r.sure) {
            note.textContent = str('unsure');
            DG.showCategoryPicker(true);
          } else {
            note.textContent = `${str('sure')}: ${DG.material(r.cls)} (${Math.round(r.confidence * 100)}%). ${str('local')}`;
            DG.showMaterial(r.cls);
          }
        } catch {
          if (run !== mine) return;
          note.className = 'err';
          note.textContent = str('fail');
          DG.showCategoryPicker(true);
        }
      };
      img.src = url;
      input.value = '';
    });
  };

  esReady.then(es => {
    S.es = es.photo ?? S.en;
    init();
  });
})();

(() => {
  'use strict';

  const DG = window.DumpGuard;
  if (!DG) return;
  const { h, clear, when } = DG;
  const $ = id => document.getElementById(id);

  const TYPES = [
    ['household', 'Household trash or bags'], ['furniture', 'Furniture or mattresses'], ['appliances', 'Appliances'], ['electronics', 'Electronics'],
    ['tires', 'Tires'], ['construction', 'Construction or demolition debris'], ['yard', 'Yard waste'], ['hazardous', 'Chemicals or hazardous waste'], ['other', 'Other'],
  ];
  const STATUS = { new: 'Received', noticed: 'Noticed by officials', progress: 'In progress', resolved: 'Resolved' };
  const KEY = 'dg_dump_codes';
  const MSG = {
    invalid_town: 'Choose your town.', invalid_type: 'Choose the type of dumping.', invalid_location: 'Describe where it is (at least 3 characters).',
    invalid_description: 'Describe what was dumped (at least 3 characters).', invalid_notes: 'Notes can be up to 500 characters.', rate_limited: 'Too many reports from this connection. Try again in an hour.',
  };
  const CHECK_ERRORS = { 404: 'No report with that code.', 429: 'Too many checks. Try again later.' };
  const REPLY_ERRORS = { 429: 'Too many replies. Try again later.', 409: 'This conversation is full.' };
  let photo = null;
  let point = null;
  let photoSeq = 0;

  const showProblem = (box, text) => box.appendChild(h('p', { class: 'err' }, text));
  const day = iso => new Date(iso).toLocaleDateString(DG.locale(), { month: 'short', day: 'numeric', year: 'numeric' });

  const saved = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  };
  const remember = (code, town) => {
    try { localStorage.setItem(KEY, JSON.stringify([{ code, town, at: new Date().toISOString().slice(0, 10) }, ...saved()].slice(0, 20))); } catch {}
  };

  const showTown = () => {
    const note = $('rtownnote');
    const name = DG.townName();
    if (note) note.textContent = name ? `Reporting in ${name}` : '';
  };
  const fillTypes = () => {
    clear($('rcat')).append(h('option', { value: '' }, 'Choose a type'), ...TYPES.map(([value, label]) => h('option', { value }, label)));
  };

  const addLocationButton = () => {
    if (!navigator.geolocation) return;
    const where = $('rwhere');
    const msg = h('p', { class: 'sm', id: 'rpoint', 'aria-live': 'polite' });
    const btn = h('button', { class: 'btn ghost', type: 'button', style: 'margin-top:10px' }, 'Use my location');
    btn.addEventListener('click', () => {
      msg.className = 'sm';
      msg.textContent = 'Finding your location...';
      navigator.geolocation.getCurrentPosition(p => {
        point = { lat: p.coords.latitude, lng: p.coords.longitude };
        msg.textContent = 'Location added. You can still describe the spot above.';
      }, () => {
        point = null;
        msg.className = 'err';
        msg.textContent = 'Could not get your location. Type the address instead.';
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    });
    where.after(btn, msg);
  };

  const loadImage = file => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => reject(new Error('image'));
    img.src = url;
  });
  const reencode = async file => {
    const img = window.createImageBitmap ? await createImageBitmap(file, { imageOrientation: 'from-image' }) : await loadImage(file);
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob) throw new Error('encode');
    return { blob, canvas };
  };
  const toBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(blob);
  });

  const onPhoto = async () => {
    const file = $('rphoto').files?.[0];
    photo = null;
    $('priv').style.display = 'none';
    if (!file) return;
    const mine = ++photoSeq;
    $('rerr').textContent = '';
    $('send').disabled = true;
    try {
      const r = await reencode(file);
      if (mine !== photoSeq) return;
      if (r.blob.size > 1900000) throw new Error('big');
      const b64 = await toBase64(r.blob);
      if (mine !== photoSeq) return;
      photo = b64;
      clear($('rtxt')).appendChild(h('img', { src: r.canvas.toDataURL('image/jpeg', 0.5), alt: 'Selected photo' }));
      $('priv').style.display = 'block';
    } catch {
      if (mine === photoSeq) $('rerr').textContent = 'That photo could not be used. Try a different one.';
    } finally {
      if (mine === photoSeq) $('send').disabled = false;
    }
  };

  const submit = async () => {
    const err = $('rerr');
    const ok = $('sent');
    const btn = $('send');
    err.textContent = '';
    ok.style.display = 'none';
    const body = { town: DG.townId() || '', type: $('rcat').value, where: $('rwhere').value.trim(), description: $('rdesc').value.trim() };
    const note = $('rnote').value.trim();
    if (note) body.notes = note;
    if (point) {
      body.lat = point.lat;
      body.lng = point.lng;
    }
    if (photo) body.photo = photo;
    const first = !body.town ? 'invalid_town' : !body.type ? 'invalid_type' : body.where.length < 3 ? 'invalid_location' : body.description.length < 3 ? 'invalid_description' : '';
    if (first) {
      err.textContent = MSG[first];
      return;
    }
    btn.disabled = true;
    try {
      const r = await DG.api.post('/dumping', body);
      btn.disabled = false;
      if (r.status !== 201) {
        err.textContent = r.status === 413 ? 'That photo is too large.' : MSG[r.body?.error] || r.body?.message || 'Could not send the report. Try again.';
        return;
      }
      remember(r.body.code, body.town);
      clear(ok).append('Report sent. Your tracking code is ', h('b', {}, r.body.code), '. Save it to check on the report later. It is also saved in this browser.');
      ok.style.display = 'block';
      for (const id of ['rwhere', 'rdesc', 'rnote']) $(id).value = '';
      photo = null;
      point = null;
      $('priv').style.display = 'none';
      clear($('rtxt')).append('Take or upload a picture');
      if ($('rpoint')) $('rpoint').textContent = '';
      renderMine();
    } catch {
      btn.disabled = false;
      err.textContent = 'Could not reach the server. Try again.';
    }
  };

  const lookup = async raw => {
    const out = clear($('tres'));
    const code = raw.trim().toUpperCase();
    if (!/^DG-[A-Z0-9]{5}$/.test(code)) {
      showProblem(out, 'Codes look like DG-4F7K2.');
      return;
    }
    out.appendChild(h('p', { class: 'sm' }, 'Checking...'));
    try {
      const r = await DG.api.get(`/dumping/track?code=${encodeURIComponent(code)}`);
      clear(out);
      if (r.status !== 200) {
        showProblem(out, CHECK_ERRORS[r.status] || 'Could not check the report. Try again.');
        return;
      }
      const b = r.body;
      out.appendChild(h('div', { class: 'item' }, h('b', {}, `${b.code}: ${STATUS[b.status] || b.status}`),
        h('small', {}, `Filed ${day(b.created_at)}${b.updated_at !== b.created_at ? `, last update ${day(b.updated_at)}` : ''}`)));
      showThread(code, out);
    } catch {
      showProblem(clear(out), 'Could not reach the server. Try again.');
    }
  };

  const showThread = async (code, out) => {
    try {
      const r = await DG.api.get(`/dumping/messages?code=${encodeURIComponent(code)}`);
      if (r.status !== 200 || !r.body.messages.length) return;
      const box = h('div', { class: 'thread', 'aria-live': 'polite' });
      out.appendChild(h('h4', {}, 'Messages from officials'));
      for (const m of r.body.messages) {
        box.appendChild(h('div', { class: `msg ${m.from === 'staff' ? 'in' : 'out'}` },
          h('small', {}, `${m.from === 'staff' ? 'Officials' : 'You'} - ${when(m.at)}`), h('p', {}, m.body)));
      }
      out.appendChild(box);
      const text = h('textarea', { rows: '3', maxlength: '500', 'aria-label': 'Your reply', placeholder: 'Write a reply. Please do not include your name or phone number.' });
      const err = h('p', { class: 'err', 'aria-live': 'polite' });
      const send = h('button', { class: 'btn dark', type: 'button' }, 'Send reply');
      send.addEventListener('click', async () => {
        const body = text.value.trim();
        if (!body) {
          err.textContent = 'Write a reply first.';
          return;
        }
        err.textContent = '';
        send.disabled = true;
        try {
          const res = await DG.api.post('/dumping/reply', { code, body });
          send.disabled = false;
          if (res.status === 201) lookup(code);
          else err.textContent = REPLY_ERRORS[res.status] || 'Could not send the reply. Try again.';
        } catch {
          send.disabled = false;
          err.textContent = 'Could not reach the server.';
        }
      });
      out.append(text, h('div', { class: 'row tight' }, send), err);
    } catch {}
  };

  const markReplies = (box, list) => {
    list.slice(0, 5).forEach(async (x, i) => {
      try {
        const r = await DG.api.get(`/dumping/messages?code=${encodeURIComponent(x.code)}`);
        if (r.status !== 200 || !r.body.messages.length) return;
        if (r.body.messages.at(-1).from !== 'staff') return;
        box.querySelectorAll('.li')[i]?.appendChild(h('span', { class: 'msgmark new' }, 'New message'));
      } catch {}
    });
  };
  const renderMine = () => {
    const box = clear($('tmine'));
    const list = saved();
    if (!list.length) return;
    box.appendChild(h('p', { class: 'sm gap' }, 'Reports from this browser'));
    for (const x of list) {
      box.appendChild(h('div', { class: 'li', role: 'button', tabindex: '0', onclick: () => { $('tcode').value = x.code; lookup(x.code); } },
        h('span', {}, x.code), h('small', {}, x.at)));
    }
    markReplies(box, list);
  };

  const init = () => {
    if (!$('send')) return;
    showTown();
    window.addEventListener('dg-town', showTown);
    window.addEventListener('dg-lang', showTown);
    fillTypes();
    addLocationButton();
    renderMine();
    $('rphoto').addEventListener('change', onPhoto);
    $('send').addEventListener('click', submit);
    $('tgo').addEventListener('click', () => lookup($('tcode').value));
    $('tcode').addEventListener('keydown', e => { if (e.key === 'Enter') lookup($('tcode').value); });
  };
  esReady.then(init);
})();

(() => {
  'use strict';

  const DG = window.DumpGuard;
  if (!DG || !window.L) return;
  const { h, clear } = DG;
  const $ = id => document.getElementById(id);

  const TYPES = DG.dumpTypes;
  const STATUS = { new: 'New', noticed: 'Noticed', progress: 'In progress', resolved: 'Resolved' };
  const COLOR = DG.statusColor;
  const TOWN_AT = {
    edison: [40.5187, -74.4121], 'new-brunswick': [40.4862, -74.4518], woodbridge: [40.5576, -74.2846],
    'long-branch': [40.3043, -73.9924], 'asbury-park': [40.2204, -74.0121],
  };

  const CENTER = {
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
  const REGION = [40.45, -74.25];

  let map;
  let layer;
  let labels;
  let pub = null;
  let towns = [];

  const filters = () => ({ type: $('mfilter').value, town: $('mtown').value, status: $('mstat').value });

  const fillFilters = () => {
    clear($('mfilter')).append(h('option', { value: '' }, 'All types'), ...Object.entries(TYPES).map(([value, label]) => h('option', { value }, label)));
    clear($('mtown')).append(h('option', { value: '' }, 'All towns'), ...towns.map(tw => h('option', { value: tw.town, 'data-n': tw.name }, tw.name)));
  };

  const cellTowns = c => (c.towns?.length ? c.towns : c.town ? [c.town] : []);
  const dominant = counts => ['new', 'noticed', 'progress', 'resolved'].reduce((best, s) => (counts[s] && (!best || counts[s] > counts[best]) ? s : best), null);
  const tally = (groups, keep = () => true) => {
    const by = {};
    let n = 0;
    for (const g of groups.filter(keep)) {
      by[g.status] = (by[g.status] || 0) + g.n;
      n += g.n;
    }
    return { by, n };
  };

  const drawPublic = () => {
    const f = filters();
    let shown = 0;
    for (const c of pub.cells) {
      if (f.town && !cellTowns(c).includes(f.town)) continue;
      const { by, n } = tally(c.groups, g => (!f.type || g.type === f.type) && (!f.status || g.status === f.status));
      if (!n) continue;
      shown++;
      const all = tally(c.groups).by;
      const color = COLOR[dominant(by)];
      const circle = L.circle([c.lat, c.lng], { radius: c.radius_m, color, weight: 2, fillColor: color, fillOpacity: 0.28 }).addTo(layer);
      const pop = h('div', {}, h('b', {}, `${c.n} reports in this area`));
      for (const s of Object.keys(STATUS)) if (all[s]) pop.appendChild(h('div', {}, `${STATUS[s]}: ${all[s]}`));
      pop.appendChild(h('small', {}, 'Approximate area, not an address.'));
      circle.bindPopup(pop);
    }
    $('mcount').textContent = `${shown} ${shown === 1 ? 'area' : 'areas'} with ${pub.min_group} or more reports`;
  };

  const redraw = () => {
    if (!layer) return;
    layer.clearLayers();
    if (pub) drawPublic();
    renderPanel();
    renderLabels();
  };

  const renderLabels = () => {
    if (labels) {
      map.removeLayer(labels);
      labels = null;
    }
    if (!pub) return;
    labels = L.layerGroup().addTo(map);
    for (const tw of pub.towns) {
      const at = TOWN_AT[tw.town];
      if (!at) continue;
      const open = tw.counts.new + tw.counts.noticed + tw.counts.progress;
      const tip = document.createElement('span');
      tip.textContent = `${tw.name}${open ? `: ${open} open` : ''}`;
      L.marker(at, { interactive: false, opacity: 0, icon: L.divIcon({ className: '', iconSize: [0, 0] }) })
        .bindTooltip(tip, { permanent: true, direction: 'center' }).addTo(labels);
    }
  };

  const addLegend = () => {
    const ctl = L.control({ position: 'bottomleft' });
    ctl.onAdd = () => {
      const box = h('div', { class: 'maplegend' },
        ...Object.entries(STATUS).map(([s, label]) => h('div', {}, h('span', { class: 'dot', style: `background:${COLOR[s]}` }), h('span', {}, label))));
      L.DomEvent.disableClickPropagation(box);
      return box;
    };
    ctl.addTo(map);
  };
  const renderPanel = () => {
    const panel = $('gpanel');
    const box = clear(panel);
    const rows = pub && !filters().town ? pub.towns.filter(({ counts: c }) => c.new + c.noticed + c.progress + c.resolved > 0) : [];
    panel.style.display = rows.length ? '' : 'none';
    panel.parentNode.classList.toggle('solo', !rows.length);
    if (!rows.length) return;
    box.appendChild(h('h3', {}, 'By town'));
    for (const tw of rows) {
      const c = tw.counts;
      box.appendChild(h('div', { class: 'item' }, h('b', {}, tw.name),
        h('small', {}, `${c.new} new, ${c.noticed} noticed, ${c.progress} in progress, ${c.resolved} resolved`)));
    }
  };

  const refreshPublic = async () => {
    const r = await DG.api.get('/dumping/map');
    if (r.status === 200) {
      pub = r.body;
      towns = pub.towns;
    }
    return pub;
  };

  const zoomToTown = () => {
    const id = filters().town;
    if (id && CENTER[id]) map.setView(CENTER[id], 14);
    else map.setView(REGION, 10);
  };
  const followTown = () => {
    const sel = $('mtown');
    const id = DG.townId();
    let has = false;
    for (const o of sel.options) {
      if (o.value && (o.value === id || o.getAttribute('data-n') === DG.townName())) {
        sel.value = o.value;
        has = true;
      }
    }
    if (!has) sel.value = '';
    redraw();
    zoomToTown();
  };

  const init = async () => {
    if (!$('gmap')) return;
    $('mbanner').style.display = 'none';
    map = DG.tileMap('gmap', () => { $('mbanner').style.display = 'block'; });
    addLegend();
    layer = L.layerGroup().addTo(map);

    for (const id of ['mfilter', 'mstat']) $(id).addEventListener('change', redraw);
    $('mtown').addEventListener('change', () => {
      redraw();
      zoomToTown();
    });
    window.addEventListener('dg-town', () => { if (pub) followTown(); });
    window.addEventListener('dg-lang', () => { if (layer) redraw(); });

    try {
      await refreshPublic();
      fillFilters();
      followTown();
    } catch {
      $('mbanner').textContent = 'The map could not load. Try again later.';
      $('mbanner').style.display = 'block';
    }
  };
  window.addEventListener('load', init);
})();

(() => {
  'use strict';

  const DG = window.DumpGuard;
  if (!DG || !window.L) return;
  const { h, clear, when } = DG;
  const $ = id => document.getElementById(id);
  let MISC = {};

  const TYPES = DG.dumpTypes;
  const STATUS = { new: 'New', noticed: 'Noticed', progress: 'In progress', resolved: 'Resolved' };
  const COLOR = DG.statusColor;

  let token = null;
  let reports = [];
  let towns = [];
  let selected = null;
  let map = null;
  let layer = null;

  const base = () => (window.DUMPGUARD_API || '/api/v1').replace(/\/$/, '');
  const authFetch = (path, opts = {}) => DG.request(path, { ...opts, headers: { ...opts.headers, authorization: `Bearer ${token}` } });
  const jsonPost = (path, data) => authFetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  const townName = id => towns.find(x => x.town === id)?.name ?? id;

  const filters = () => ({ type: $('gftype').value, town: $('gftown').value, status: $('gfstat').value });
  const visible = () => {
    const f = filters();
    return reports.filter(r => (!f.type || r.dump_type === f.type) && (!f.town || r.region_id === f.town) && (!f.status || r.status === f.status));
  };

  const fillFilters = () => {
    clear($('gftype')).append(h('option', { value: '' }, 'All types'), ...Object.entries(TYPES).map(([value, label]) => h('option', { value }, label)));
    clear($('gftown')).append(h('option', { value: '' }, 'All towns'), ...towns.map(tw => h('option', { value: tw.town }, tw.name)));
  };

  const ensureMap = () => {
    if (map) return;
    map = DG.tileMap('gvmap', () => { $('gvbanner').style.display = 'block'; });
    layer = L.layerGroup().addTo(map);
  };
  const drawMap = refit => {
    layer.clearLayers();
    const rows = visible();
    const pts = [];
    for (const r of rows) {
      if (r.lat == null) continue;
      const on = selected && selected.id === r.id;
      L.circleMarker([r.lat, r.lng], { radius: on ? 11 : 7, color: on ? '#1f3a2a' : '#fff', weight: on ? 3 : 2, fillColor: COLOR[r.status], fillOpacity: 1 })
        .addTo(layer).on('click', () => select(r, false));
      pts.push([r.lat, r.lng]);
    }
    const missing = rows.length - pts.length;
    $('gvcount').textContent = `${rows.length} ${rows.length === 1 ? 'report' : 'reports'}${missing ? `, ${missing} without a map point` : ''}`;
    if (refit && pts.length) map.fitBounds(pts, { maxZoom: 15, padding: [40, 40] });
  };

  const renderList = () => {
    const box = clear($('gvlist'));
    const rows = visible();
    if (!rows.length) {
      box.appendChild(h('p', { class: 'sm' }, 'No reports match these filters.'));
      return;
    }
    for (const r of rows) {
      const replied = r.last_from_staff === false;
      const row = h('div', { class: `li${selected && selected.id === r.id ? ' on' : ''}`, role: 'button', tabindex: '0', onclick: () => select(r, true) },
        h('span', { class: 'dot', style: `background:${COLOR[r.status]}` }),
        h('span', { class: 'grow' }, h('b', {}, r.code), ` ${TYPES[r.dump_type] || r.dump_type}, ${r.location_text}`,
          h('small', {}, `${townName(r.region_id)} - ${when(r.created_at)}`)));
      if (r.msg_count) row.appendChild(h('span', { class: `msgmark${replied ? ' new' : ''}` }, replied ? 'Reporter replied' : 'Messaged'));
      row.appendChild(h('span', { class: 'badge', style: `background:${COLOR[r.status]}` }, STATUS[r.status]));
      box.appendChild(row);
    }
  };

  const redraw = refit => {
    if (!token) return;
    drawMap(refit);
    renderList();
    renderPanel();
  };

  const renderPanel = () => {
    const box = clear($('gvpanel'));
    if (selected) {
      box.appendChild(detail(selected));
      return;
    }
    box.appendChild(h('h3', {}, 'Select a report'));
    box.appendChild(h('div', { class: 'key' },
      ...Object.entries(STATUS).map(([s, label]) => h('span', {}, h('i', { class: 'dot', style: `background:${COLOR[s]}` }), label))));
  };

  const loadPhoto = async (r, img, msg) => {
    try {
      const res = await fetch(`${base()}/admin/dumping/photo?id=${encodeURIComponent(r.id)}`, { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('photo');
      img.src = URL.createObjectURL(await res.blob());
      img.style.display = 'block';
      msg.remove();
    } catch {
      msg.textContent = 'Photo could not be loaded.';
    }
  };

  const detail = r => {
    const box = h('div', {}, h('div', { class: 'dhead' }, h('h3', {}, r.code), h('span', { class: 'badge', style: `background:${COLOR[r.status]}` }, STATUS[r.status])));
    box.append(
      h('p', {}, h('b', {}, TYPES[r.dump_type] || r.dump_type), `${DG.lang() === 'es' ? MISC.in ?? ' in ' : ' in '}${townName(r.region_id)}`),
      h('p', {}, r.location_text),
      h('p', {}, r.description));
    if (r.notes) box.appendChild(h('p', { class: 'sm' }, r.notes));
    box.appendChild(h('p', { class: 'sm' }, `Filed ${when(r.created_at)}${r.lat == null ? '. No map point.' : ''}`));
    if (r.has_photo) {
      const img = h('img', { alt: 'Report photo', class: 'shot', style: 'display:none' });
      const msg = h('p', { class: 'sm' }, 'Loading photo...');
      box.append(msg, img);
      loadPhoto(r, img, msg);
    }

    const sel = h('select', { 'aria-label': 'Status' }, ...Object.entries(STATUS).map(([value, label]) => h('option', { value }, label)));
    sel.value = r.status;
    const out = h('p', { class: 'sm', 'aria-live': 'polite' });
    const save = h('button', { class: 'btn dark', type: 'button' }, 'Update status');
    const showStatusError = text => {
      save.disabled = false;
      out.className = 'err';
      out.textContent = text;
    };
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        const res = await jsonPost('/admin/dumping/status', { id: r.id, status: sel.value });
        if (res.status !== 200) {
          showStatusError('Could not update. Sign in again.');
          return;
        }
        save.disabled = false;
        r.status = sel.value;
        redraw(false);
      } catch {
        showStatusError('Could not reach the server.');
      }
    });
    box.append(h('div', { class: 'row tight' }, sel, save), out, h('h4', {}, 'Messages with the reporter'));

    const thread = h('div', { class: 'thread', 'aria-live': 'polite' }, h('p', { class: 'sm' }, 'Loading messages...'));
    box.appendChild(thread);
    loadThread(r, thread);
    const text = h('textarea', { rows: '3', maxlength: '500', 'aria-label': 'Message to the reporter', placeholder: 'Ask a question or give an update. Keep it short.' });
    const err = h('p', { class: 'err', 'aria-live': 'polite' });
    const send = h('button', { class: 'btn dark', type: 'button' }, 'Send message');
    send.addEventListener('click', async () => {
      const body = text.value.trim();
      if (!body) {
        err.textContent = 'Write a message first.';
        return;
      }
      err.textContent = '';
      send.disabled = true;
      try {
        const res = await jsonPost('/admin/dumping/message', { id: r.id, body });
        send.disabled = false;
        if (res.status === 201) {
          text.value = '';
          r.msg_count = (r.msg_count || 0) + 1;
          r.last_from_staff = true;
          loadThread(r, thread);
          renderList();
        } else {
          err.textContent = res.status === 409 ? 'This conversation is full.' : res.status === 401 ? 'Sign in again.' : 'Could not send the message. Try again.';
        }
      } catch {
        send.disabled = false;
        err.textContent = 'Could not reach the server.';
      }
    });
    box.append(text, h('div', { class: 'row tight' }, send), err);
    return box;
  };

  const loadThread = async (r, el) => {
    try {
      const res = await authFetch(`/admin/dumping/messages?id=${encodeURIComponent(r.id)}`);
      if (selected !== r) return;
      clear(el);
      if (res.status !== 200) {
        el.appendChild(h('p', { class: 'sm' }, 'Messages are not available right now.'));
        return;
      }
      const list = res.body.messages;
      if (!list.length) {
        el.appendChild(h('p', { class: 'sm' }, 'No messages yet.'));
        return;
      }
      for (const m of list) {
        el.appendChild(h('div', { class: `msg ${m.from === 'staff' ? 'out' : 'in'}` },
          h('small', {}, `${m.from === 'staff' ? 'Staff' : 'Reporter'} - ${when(m.at)}`), h('p', {}, m.body)));
      }
      el.scrollTop = el.scrollHeight;
    } catch {
      if (selected === r) clear(el).appendChild(h('p', { class: 'sm' }, 'Messages are not available right now.'));
    }
  };

  const select = (r, pan) => {
    selected = r;
    if (pan && r.lat != null) map.setView([r.lat, r.lng], Math.max(map.getZoom(), 15));
    redraw(false);
    if (pan) $('gvpanel').scrollIntoView({ block: 'nearest' });
  };

  const show = on => {
    $('gsign').style.display = on ? 'none' : '';
    $('gdash').style.display = on ? 'block' : 'none';
  };
  const load = async () => {
    const r = await authFetch('/admin/dumping');
    if (r.status === 200) reports = r.body.reports;
    return r.status;
  };
  DG.staffLogin = async (user, pw) => {
    token = `${user}:${pw}`;
    try {
      const status = await load();
      if (status !== 200) {
        token = null;
        return { ok: false, message: status === 429 ? 'Too many attempts. Try again later.' : 'That username or password was not accepted.' };
      }
      try {
        const m = await DG.api.get('/dumping/map');
        if (m.status === 200) towns = m.body.towns;
      } catch {}
      show(true);
      ensureMap();
      fillFilters();
      selected = null;
      redraw(true);
      setTimeout(() => {
        map.invalidateSize();
        drawMap(true);
      }, 80);
      return { ok: true };
    } catch {
      token = null;
      return { ok: false, message: 'Could not reach the server.' };
    }
  };

  const signOut = () => {
    token = null;
    reports = [];
    selected = null;
    clear($('gvlist'));
    clear($('gvpanel'));
    if (layer) layer.clearLayers();
    show(false);
  };

  const refresh = async () => {
    $('gvrefresh').disabled = true;
    try {
      await load();
      if (selected) selected = reports.find(x => x.id === selected.id) || null;
      redraw(false);
    } catch {}
    $('gvrefresh').disabled = false;
  };

  const init = () => {
    if (!$('gdash')) return;
    show(false);
    for (const id of ['gftype', 'gftown', 'gfstat']) {
      $(id).addEventListener('change', () => {
        selected = null;
        redraw(true);
      });
    }
    $('gvout').addEventListener('click', signOut);
    $('gvrefresh').addEventListener('click', refresh);
    window.addEventListener('dg-lang', () => { if (token) redraw(false); });
  };
  esReady.then(es => {
    MISC = es.misc ?? {};
    init();
  });
})();

(() => {
  'use strict';

  const DG = window.DumpGuard;
  if (!DG) return;

  let ES = {};
  let TABLES = {};
  let PLURALS = {};
  let RX = [];
  let MISC = {};

  const lit = s => ES[s] || s;

  const expand = (template, m) => {
    let out = '';
    for (let i = 0; i < template.length; i++) {
      if (template[i] !== '{') {
        out += template[i];
        continue;
      }
      let depth = 1;
      let j = i + 1;
      while (depth) {
        if (template[j] === '{') depth++;
        else if (template[j] === '}') depth--;
        j++;
      }
      const [, n, op, arg] = /^(\d)(?:([?:#])(.*))?$/s.exec(template.slice(i + 1, j - 1));
      const v = m[n] ?? '';
      if (!op) out += v;
      else if (op === '?') out += v ? expand(arg, m) : '';
      else if (op === '#') out += `${v} ${PLURALS[arg][Number(v) === 1 ? 0 : 1]}`;
      else if (arg === '@lit') out += lit(v);
      else out += TABLES[arg][v] ?? v;
      i = j - 1;
    }
    return out;
  };

  const es = en => {
    const key = en.trim();
    if (!key) return en;
    let out = ES[key];
    if (!out) {
      for (const [pattern, template] of RX) {
        const m = pattern.exec(key);
        if (m) {
          out = expand(template, m);
          break;
        }
      }
    }
    return out ? en.replace(key, () => out) : en;
  };

  const ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  const textRec = new WeakMap();
  const attrRec = new WeakMap();
  let observer = null;
  let queued = false;
  let toggle = null;

  const swap = (cur, rec, spanish) => {
    const en = rec && rec.out === cur ? rec.en : cur;
    return { en, out: spanish ? es(en) : en };
  };

  const apply = () => {
    queued = false;
    const spanish = DG.lang() === 'es';
    if (observer) observer.disconnect();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        const parent = n.parentNode && n.parentNode.nodeName;
        return parent === 'SCRIPT' || parent === 'STYLE' || parent === 'NOSCRIPT' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const r = swap(n.nodeValue, textRec.get(n), spanish);
      if (r.out !== n.nodeValue) n.nodeValue = r.out;
      if (r.out !== r.en) textRec.set(n, r); else textRec.delete(n);
    }
    document.body.querySelectorAll('[placeholder],[aria-label],[alt],[title]').forEach(el => {
      const recs = attrRec.get(el) || {};
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        const cur = el.getAttribute(a);
        const r = swap(cur, recs[a], spanish);
        if (r.out !== cur) el.setAttribute(a, r.out);
        if (r.out !== r.en) recs[a] = r; else delete recs[a];
      }
      attrRec.set(el, recs);
    });
    document.documentElement.lang = DG.lang();
    syncToggle();
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    setTimeout(apply, 40);
  };

  const syncToggle = () => {
    if (toggle) toggle.value = DG.lang();
  };
  const addToggle = () => {
    const ul = document.querySelector('#nav ul');
    if (!ul) return;
    toggle = DG.h('select', { id: 'navlang', class: 'navlang', 'aria-label': MISC.language ?? 'Language', onchange: () => DG.setLang(toggle.value) },
      DG.h('option', { value: 'en', lang: 'en' }, 'English'), DG.h('option', { value: 'es', lang: 'es' }, MISC.spanish ?? 'Spanish'));
    ul.insertBefore(DG.h('li', {}, toggle), ul.lastElementChild);
    syncToggle();
  };

  const init = () => {
    addToggle();
    window.addEventListener('dg-lang', queue);
    observer = new MutationObserver(queue);
    apply();
  };
  esReady.then(es => {
    ES = es.labels ?? {};
    TABLES = es.tables ?? {};
    PLURALS = es.plurals ?? {};
    MISC = es.misc ?? {};
    RX = (es.patterns ?? []).map(p => [new RegExp(p.re), p.es]);
    init();
  });
})();

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DG = window.DumpGuard;

  const ALIAS = { about: 'home', login: 'gov', signup: 'home', forgot: 'home', dash: 'home' };

  const go = name => {
    const view = ALIAS[name] || name;
    const target = $(`v-${view}`) ? view : 'home';
    document.querySelectorAll('.view').forEach(e => e.classList.toggle('on', e.id === `v-${target}`));
    document.querySelectorAll('nav a, #tabs a').forEach(a => a.classList.toggle('act', a.getAttribute('data-go') === target));
    try { history.replaceState(null, '', `#${target}`); } catch {}
    window.scrollTo(0, 0);
    const heading = $(`v-${target}`)?.querySelector('h1, h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    navStyle();
    if (target === 'map') setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  };
  const navStyle = () => {
    const home = $('v-home');
    $('nav').classList.toggle('solid', !(home && home.classList.contains('on')) || window.scrollY > window.innerHeight - 120);
  };
  document.addEventListener('click', e => {
    const link = e.target.closest?.('[data-go]');
    if (!link) return;
    e.preventDefault();
    go(link.getAttribute('data-go'));
  });
  window.addEventListener('scroll', navStyle);

  const govLogin = async () => {
    const err = $('lerr');
    const user = $('le').value.trim();
    const pw = $('lp').value;
    if (!user || !pw) {
      err.textContent = 'Enter the username and password.';
      return;
    }
    $('lgo').disabled = true;
    const r = await DG.staffLogin(user, pw);
    $('lgo').disabled = false;
    if (!r.ok) {
      err.textContent = r.message;
      return;
    }
    err.textContent = '';
    $('le').value = '';
    $('lp').value = '';
  };
  $('lgo').onclick = govLogin;
  $('lp').addEventListener('keydown', e => { if (e.key === 'Enter') govLogin(); });
  $('le').addEventListener('keydown', e => { if (e.key === 'Enter') $('lp').focus(); });

  go(location.hash.slice(1) || 'home');
})();
