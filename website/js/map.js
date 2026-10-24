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
