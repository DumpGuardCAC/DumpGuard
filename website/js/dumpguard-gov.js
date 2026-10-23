(function () {
  'use strict';

  var DG = window.DumpGuard;
  if (!DG || !window.L) return;
  var h = DG.h, clear = DG.clear;
  var $ = function (id) { return document.getElementById(id); };

  var TYPES = {
    household: 'Household trash', furniture: 'Furniture', appliances: 'Appliances', electronics: 'Electronics', tires: 'Tires',
    construction: 'Construction debris', yard: 'Yard waste', hazardous: 'Hazardous waste', other: 'Other',
  };
  var STATUS = { new: 'New', noticed: 'Noticed', progress: 'In progress', resolved: 'Resolved' };
  var COLOR = { new: '#c0392b', noticed: '#a86b0a', progress: '#1f5fa8', resolved: '#2f7a28' };

  var token = null, reports = [], towns = [], selected = null, map = null, layer = null, fitted = false;

  function base() { return (window.DUMPGUARD_API || '/api/v1').replace(/\/$/, ''); }
  function authFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers, { authorization: 'Bearer ' + token });
    return DG.request(path, opts);
  }
  function jsonPost(path, data) {
    return authFetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  }
  function when(iso) { return new Date(iso).toLocaleString(DG.lang() === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
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
    map = L.map('gvmap', { scrollWheelZoom: false }).setView([40.45, -74.25], 10);
    var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    var failed = 0;
    tiles.on('tileerror', function () { if (++failed > 3) $('gvbanner').style.display = 'block'; });
    layer = L.layerGroup().addTo(map);
    if (window.ResizeObserver) new ResizeObserver(function () { map.invalidateSize(); }).observe($('gvmap'));
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
        show(true); ensureMap(); fillFilters(); selected = null; fitted = false;
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
