/* Illegal dumping report form and report tracking.
 *
 * Photos are re-encoded in the browser (canvas -> JPEG), which drops EXIF and GPS data before upload; the API strips
 * metadata again on its side. The exact location is only used if the person taps "Use my location" or types an address.
 * The tracking code is kept in this browser (localStorage) so people can check back without an account.
 */
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

  function saved() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function remember(code, town) {
    try { localStorage.setItem(KEY, JSON.stringify([{ code: code, town: town, at: new Date().toISOString().slice(0, 10) }].concat(saved()).slice(0, 20))); } catch (e) { /* storage can be blocked */ }
  }

  function showTown() {
    var note = $('rtownnote'), name = DG.townName();
    if (note) note.textContent = name ? 'Reporting in: ' + name + '. Change the town from the menu.' : '';
  }
  function fillTypes() {
    var sel = $('rcat');
    clear(sel).appendChild(h('option', { value: '' }, 'Choose a type'));
    TYPES.forEach(function (t) { sel.appendChild(h('option', { value: t[0] }, t[1])); });
  }

  // ---- location ----
  function addLocationButton() {
    var where = $('rwhere');
    var msg = h('p', { class: 'sm', id: 'rpoint', 'aria-live': 'polite' });
    var btn = h('button', { class: 'btn', type: 'button', style: 'border:1px solid #cbd5e1;padding:10px 22px;margin-top:10px' }, 'Use my location');
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

  // ---- photo: downscale and re-encode, which removes EXIF/GPS ----
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
  function onPhoto() {
    var input = $('rphoto'), file = input.files && input.files[0];
    photo = null; $('priv').style.display = 'none';
    if (!file) return;
    $('rerr').textContent = '';
    $('send').disabled = true; // wait for the photo to be cleaned before it can be sent
    reencode(file).then(function (r) {
      if (r.blob.size > 1900000) throw new Error('big');
      return toBase64(r.blob).then(function (b64) {
        photo = b64;
        var holder = $('rtxt'); clear(holder);
        holder.appendChild(h('img', { src: r.canvas.toDataURL('image/jpeg', 0.5), alt: 'Selected photo' }));
        $('priv').style.display = 'block';
      });
    }).catch(function () { $('rerr').textContent = 'That photo could not be used. Try a different one.'; })
      .then(function () { $('send').disabled = false; });
  }

  // ---- submit ----
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

  // ---- tracking ----
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
    }).catch(function () { clear(out).appendChild(h('p', { class: 'err' }, 'Could not reach the server. Try again.')); });
  }
  function renderMine() {
    var box = clear($('tmine')), list = saved();
    if (!list.length) return;
    box.appendChild(h('p', { class: 'sm', style: 'margin-top:18px' }, 'Reports from this browser'));
    list.forEach(function (x) {
      box.appendChild(h('div', { class: 'li', role: 'button', tabindex: '0', onclick: function () { $('tcode').value = x.code; lookup(x.code); } },
        h('span', {}, x.code), h('small', {}, x.at)));
    });
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
