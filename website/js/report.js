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
