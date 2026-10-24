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
