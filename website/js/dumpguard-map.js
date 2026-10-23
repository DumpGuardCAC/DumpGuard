/* Community map of illegal dumping reports.
 *
 * Public view: coarse areas (about 500 m) that have 3 or more reports, plus a count per town. Exact points, photos and
 * descriptions never reach the public endpoint.
 * The government area (dumpguard-gov.js) is where staff see exact points, details and photos.
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
  var COLOR = { new: '#c0392b', noticed: '#a86b0a', progress: '#1f5fa8', resolved: '#2f7a28' };
  var TOWN_AT = { // label anchors only
    edison: [40.5187, -74.4121], 'new-brunswick': [40.4862, -74.4518], woodbridge: [40.5576, -74.2846],
    'long-branch': [40.3043, -73.9924], 'asbury-park': [40.2204, -74.0121],
  };

  var map, layer, labels, labelsOn = true, pub = null, towns = [];

  function filters() { return { type: $('mfilter').value, town: $('mtown').value, status: $('mstat').value }; }

  function fillFilters() {
    var f = clear($('mfilter')); f.appendChild(h('option', { value: '' }, 'All types'));
    Object.keys(TYPES).forEach(function (k) { f.appendChild(h('option', { value: k }, TYPES[k])); });
    var t = clear($('mtown')); t.appendChild(h('option', { value: '' }, 'All towns'));
    towns.forEach(function (tw) { t.appendChild(h('option', { value: tw.town, 'data-n': tw.name }, tw.name)); });
  }

  // ---- drawing ----
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

  // ---- data ----
  function refreshPublic() {
    return DG.api.get('/dumping/map').then(function (r) { if (r.status === 200) { pub = r.body; towns = pub.towns; } return pub; });
  }

  // The town filter follows the shared town (nav dropdown); "All towns" is still one click away.
  function followTown() {
    var sel = $('mtown'), id = DG.townId(), has = false;
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value && (o.value === id || o.getAttribute('data-n') === DG.townName())) { sel.value = o.value; has = true; } });
    if (!has) sel.value = '';
    redraw();
    if (!pub) return;
    var f = filters().town, cells = pub.cells.filter(function (c) { return !f || cellTowns(c).indexOf(f) !== -1; });
    if (!cells.length) cells = pub.cells;
    if (cells.length) map.fitBounds(cells.map(function (c) { return [c.lat, c.lng]; }), { maxZoom: 13, padding: [40, 40] });
  }

  function init() {
    if (!$('gmap')) return;
    $('mbanner').style.display = 'none';
    map = L.map('gmap', { scrollWheelZoom: false }).setView([40.45, -74.25], 10);
    var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    var failed = 0;
    tiles.on('tileerror', function () {
      if (++failed > 3) { $('mbanner').textContent = 'Street map tiles could not load. Report areas still show.'; $('mbanner').style.display = 'block'; }
    });
    layer = L.layerGroup().addTo(map);

    ['mfilter', 'mtown', 'mstat'].forEach(function (id) { $(id).addEventListener('change', redraw); });

    refreshPublic().then(function () {
      fillFilters(); followTown();
    }).catch(function () {
      $('mbanner').textContent = 'The map could not load. Try again later.'; $('mbanner').style.display = 'block';
    });
    window.addEventListener('dg-town', function () { if (pub) followTown(); });
    window.addEventListener('dg-lang', function () { if (layer) redraw(); });
    // The map is created while its view is hidden, so resize it when the view becomes visible.
    if (window.ResizeObserver) new ResizeObserver(function () { map.invalidateSize(); }).observe($('gmap'));
  }
  window.addEventListener('load', init);
})();
