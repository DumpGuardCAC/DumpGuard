/* Community map of illegal dumping reports.
 *
 * Public view: coarse areas (about 500 m) that have 3 or more reports, plus a count per town. Exact points, photos and
 * descriptions never reach the public endpoint.
 * Government view: sign in with the staff access token (sent as a Bearer header, kept in memory only, never stored) to
 * see exact points, details and photos, and to update a report's status.
 */
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
  var COLOR = { new: '#dc2626', noticed: '#b45309', progress: '#2563eb', resolved: '#15803d' };
  var TOWN_AT = { // label anchors only
    edison: [40.5187, -74.4121], 'new-brunswick': [40.4862, -74.4518], woodbridge: [40.5576, -74.2846],
    'long-branch': [40.3043, -73.9924], 'asbury-park': [40.2204, -74.0121],
  };

  var map, layer, labels, labelsOn = false, pub = null, staff = null, token = null, selected = null, towns = [];

  function filters() { return { type: $('mfilter').value, town: $('mtown').value, status: $('mstat').value }; }

  function fillFilters() {
    var f = clear($('mfilter')); f.appendChild(h('option', { value: '' }, 'All types'));
    Object.keys(TYPES).forEach(function (k) { f.appendChild(h('option', { value: k }, TYPES[k])); });
    var t = clear($('mtown')); t.appendChild(h('option', { value: '' }, 'All towns'));
    towns.forEach(function (tw) { t.appendChild(h('option', { value: tw.town, 'data-n': tw.name }, tw.name)); });
  }

  // ---- drawing ----
  function dominant(counts) {
    var best = null;
    ['new', 'noticed', 'progress', 'resolved'].forEach(function (s) { if (counts[s] && (!best || counts[s] > counts[best])) best = s; });
    return best;
  }
  function drawPublic() {
    var f = filters(), shown = 0;
    pub.cells.forEach(function (c) {
      if (f.town && c.town !== f.town) return;
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

  function drawStaff() {
    var f = filters(), n = 0;
    var rows = staff.filter(function (r) {
      return (!f.type || r.dump_type === f.type) && (!f.town || r.region_id === f.town) && (!f.status || r.status === f.status);
    });
    rows.forEach(function (r) {
      if (r.lat == null) return;
      var m = L.circleMarker([r.lat, r.lng], { radius: r.id === (selected && selected.id) ? 11 : 8, color: '#fff', weight: 2, fillColor: COLOR[r.status], fillOpacity: 0.95 }).addTo(layer);
      m.on('click', function () { select(r); });
      n++;
    });
    $('mcount').textContent = rows.length + (rows.length === 1 ? ' report' : ' reports') + (rows.length !== n ? ', ' + (rows.length - n) + ' without a map point' : '');
    renderList(rows);
  }

  function redraw() {
    if (!layer) return;
    layer.clearLayers();
    if (staff) drawStaff(); else if (pub) drawPublic();
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
      L.marker(at, { interactive: false, opacity: 0, icon: L.divIcon({ className: '', iconSize: [0, 0]}) })
        .bindTooltip(tw.name + (open ? ': ' + open + ' open' : ''), { permanent: true, direction: 'center' }).addTo(labels);
    });
  }

  // ---- side panel ----
  function legend() {
    var box = h('div', {}, h('h3', {}, 'Status colors'));
    Object.keys(STATUS).forEach(function (s) {
      box.appendChild(h('div', { class: 'li', style: 'cursor:default' }, h('span', { class: 'dot', style: 'background:' + COLOR[s] }), h('span', {}, STATUS[s])));
    });
    return box;
  }
  function renderPanel() {
    var box = clear($('gpanel'));
    if (staff && selected) { box.appendChild(detail(selected)); return; }
    if (staff) { box.appendChild(h('h3', {}, 'Staff view')); box.appendChild(h('p', { class: 'sm' }, 'Select a point or a row below to see details and update its status.')); box.appendChild(legend()); return; }
    box.appendChild(legend());
    if (pub && pub.towns.length) {
      box.appendChild(h('h3', { style: 'margin-top:22px' }, 'By town'));
      pub.towns.forEach(function (tw) {
        var c = tw.counts;
        box.appendChild(h('div', { class: 'item' }, h('b', {}, tw.name),
          h('small', {}, c.new + ' new, ' + c.noticed + ' noticed, ' + c.progress + ' in progress, ' + c.resolved + ' resolved')));
      });
    }
    box.appendChild(h('p', { class: 'sm' }, 'Areas appear on the map once ' + (pub ? pub.min_group : 3) + ' or more reports are close together.'));
  }

  function authFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers, { authorization: 'Bearer ' + token });
    return DG.request(path, opts);
  }
  function detail(r) {
    var box = h('div', {}, h('h3', {}, r.code), h('span', { class: 'badge', style: 'background:' + COLOR[r.status] }, STATUS[r.status]));
    var town = (towns.filter(function (t) { return t.town === r.region_id; })[0] || {}).name || r.region_id;
    box.appendChild(h('p', {}, h('b', {}, TYPES[r.dump_type] || r.dump_type), ' in ' + town));
    box.appendChild(h('p', {}, r.location_text));
    box.appendChild(h('p', {}, r.description));
    if (r.notes) box.appendChild(h('p', { class: 'sm' }, r.notes));
    box.appendChild(h('p', { class: 'sm' }, 'Filed ' + new Date(r.created_at).toLocaleString(DG.lang() === 'es' ? 'es-US' : 'en-US') + (r.lat == null ? '. No map point.' : '')));
    if (r.has_photo) {
      var img = h('img', { alt: 'Report photo', style: 'max-width:100%;border-radius:10px;display:none' });
      var msg = h('p', { class: 'sm' }, 'Loading photo...');
      box.appendChild(msg); box.appendChild(img);
      fetch(DG_BASE() + '/admin/dumping/photo?id=' + encodeURIComponent(r.id), { headers: { authorization: 'Bearer ' + token } })
        .then(function (res) { if (!res.ok) throw new Error('photo'); return res.blob(); })
        .then(function (b) { img.src = URL.createObjectURL(b); img.style.display = 'block'; msg.remove(); })
        .catch(function () { msg.textContent = 'Photo could not be loaded.'; });
    }
    var sel = h('select', { 'aria-label': 'Status' });
    Object.keys(STATUS).forEach(function (s) { sel.appendChild(h('option', { value: s }, STATUS[s])); });
    sel.value = r.status;
    var out = h('p', { class: 'sm', 'aria-live': 'polite' });
    var save = h('button', { class: 'btn dark', type: 'button', style: 'padding:10px 22px' }, 'Update status');
    save.addEventListener('click', function () {
      save.disabled = true;
      authFetch('/admin/dumping/status', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: r.id, status: sel.value }) }).then(function (res) {
        save.disabled = false;
        if (res.status === 200) { r.status = sel.value; refreshPublic(); redraw(); return; }
        out.className = 'err'; out.textContent = 'Could not update. Sign in again.';
      }).catch(function () { save.disabled = false; out.className = 'err'; out.textContent = 'Could not reach the server.'; });
    });
    box.appendChild(h('div', { class: 'row' }, sel, save)); box.appendChild(out);
    return box;
  }
  function DG_BASE() { return (window.DUMPGUARD_API || '/api/v1').replace(/\/$/, ''); }

  function renderList(rows) {
    var box = clear($('glist'));
    if (!staff) return;
    box.appendChild(h('h3', { style: 'margin-top:30px;font-size:1.8rem' }, 'Reports'));
    if (!rows.length) { box.appendChild(h('p', { class: 'sm' }, 'No reports match these filters.')); return; }
    rows.forEach(function (r) {
      box.appendChild(h('div', { class: 'li', role: 'button', tabindex: '0', onclick: function () { select(r); } },
        h('span', { class: 'dot', style: 'background:' + COLOR[r.status] }),
        h('span', {}, r.code + ' - ' + (TYPES[r.dump_type] || r.dump_type) + ' - ' + r.location_text),
        h('span', { class: 'badge', style: 'background:' + COLOR[r.status] }, STATUS[r.status])));
    });
  }
  function select(r) {
    selected = r;
    if (r.lat != null) map.setView([r.lat, r.lng], Math.max(map.getZoom(), 15));
    redraw();
    $('gpanel').scrollTop = 0;
  }

  // ---- data ----
  function refreshPublic() {
    return DG.api.get('/dumping/map').then(function (r) { if (r.status === 200) { pub = r.body; towns = pub.towns; } return pub; });
  }
  function refreshStaff() {
    return authFetch('/admin/dumping').then(function (r) {
      if (r.status === 200) staff = r.body.reports;
      return r.status;
    });
  }

  // ---- sign in ----
  function setLock(open) { $('lock').style.display = open ? 'block' : 'none'; }
  function signOut() {
    token = null; staff = null; selected = null;
    $('gtoggle').textContent = 'Government sign-in';
    $('gcode').value = '';
    clear($('glist'));
    redraw();
  }
  function unlock() {
    var code = $('gcode').value.trim(), err = $('gerr');
    err.textContent = '';
    if (!code) { err.textContent = 'Enter the access code.'; return; }
    token = code;
    refreshStaff().then(function (status) {
      if (status === 200) {
        setLock(false); $('gcode').value = '';
        $('gtoggle').textContent = 'Sign out';
        $('mbanner').style.display = 'none';
        redraw();
        return;
      }
      token = null;
      err.textContent = status === 429 ? 'Too many attempts. Try again later.' : 'That code was not accepted.';
    }).catch(function () { token = null; err.textContent = 'Could not reach the server.'; });
  }

  function init() {
    if (!$('gmap')) return;
    $('gcode').placeholder = 'Staff access code';
    $('mbanner').style.display = 'none';
    map = L.map('gmap', { scrollWheelZoom: false }).setView([40.45, -74.25], 10);
    var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    var failed = 0;
    tiles.on('tileerror', function () {
      if (++failed > 3) { $('mbanner').textContent = 'Street map tiles could not load. Report areas still show.'; $('mbanner').style.display = 'block'; }
    });
    layer = L.layerGroup().addTo(map);

    ['mfilter', 'mtown', 'mstat'].forEach(function (id) { $(id).addEventListener('change', redraw); });
    $('tltoggle').addEventListener('click', function () {
      labelsOn = !labelsOn; $('tltoggle').textContent = 'Town labels: ' + (labelsOn ? 'on' : 'off'); renderLabels();
    });
    $('gtoggle').addEventListener('click', function () { if (token) signOut(); else setLock($('lock').style.display === 'none'); });
    $('gunlock').addEventListener('click', unlock);
    $('gcode').addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });

    refreshPublic().then(function () {
      fillFilters(); redraw();
      if (pub && pub.cells.length) map.fitBounds(pub.cells.map(function (c) { return [c.lat, c.lng]; }), { maxZoom: 13, padding: [40, 40] });
    }).catch(function () {
      $('mbanner').textContent = 'The map could not load. Try again later.'; $('mbanner').style.display = 'block';
    });
    // The map is created while its view is hidden, so resize it when the view becomes visible.
    if (window.ResizeObserver) new ResizeObserver(function () { map.invalidateSize(); }).observe($('gmap'));
  }
  window.addEventListener('load', init);
})();
