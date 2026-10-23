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
    map = L.map('gmap', { scrollWheelZoom: false }).setView(REGION, 10);
    addLegend();
    var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    var failed = 0;
    tiles.on('tileerror', function () {
      if (++failed > 3) { $('mbanner').textContent = 'Street map tiles could not load. Report areas still show.'; $('mbanner').style.display = 'block'; }
    });
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
    if (window.ResizeObserver) new ResizeObserver(function () { map.invalidateSize(); }).observe($('gmap'));
  }
  window.addEventListener('load', init);
})();
