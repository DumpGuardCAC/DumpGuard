/* Navigation, device-local accounts and the dashboard.
 * Everything else (search, schedules, photo model, reports, map) lives in the dumpguard-*.js files and the API.
 * Accounts are stored only in this browser (localStorage). There is no server-side login: reports are anonymous and
 * staff use the token on the Map page. The account is a convenience for keeping a saved-items list on one device. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var DG = window.DumpGuard;
  var mem = {};
  var S = {
    get: function (k, d) { try { var v = localStorage.getItem(k); if (v !== null) return JSON.parse(v); } catch (e) { /* blocked */ } return k in mem ? mem[k] : d; },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* blocked */ } },
    del: function (k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { /* blocked */ } }
  };
  var me = function () { var e = S.get('dg_s', null); return e ? (S.get('dg_u', []).find(function (u) { return u.email === e; }) || null) : null; };
  var emailOk = function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); };
  async function hash(email, pw) {
    try {
      var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dumpguard:' + email + ':' + pw));
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    } catch (e) { return 'plain:' + pw; }
  }

  // ---- navigation ----
  function go(v) {
    if (v === 'dash' && !me()) v = 'login';
    if (!$('v-' + v)) v = 'home';
    Array.prototype.forEach.call(document.querySelectorAll('.view'), function (e) { e.classList.toggle('on', e.id === 'v-' + v); });
    Array.prototype.forEach.call(document.querySelectorAll('nav a'), function (a) { a.classList.toggle('act', a.getAttribute('data-go') === v || (v === 'dash' && a.id === 'pill')); });
    var u = me(), pill = $('pill');
    if (pill) { pill.textContent = u ? 'Dashboard' : 'Log in'; pill.setAttribute('data-go', u ? 'dash' : 'login'); }
    try { history.replaceState(null, '', '#' + v); } catch (e) { /* ignore */ }
    window.scrollTo(0, 0);
    navStyle();
    if (v === 'login') { cap('lcap'); setMode(false); }
    if (v === 'dash') dash();
    if (v === 'map') setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
  }
  function navStyle() {
    var home = $('v-home');
    $('nav').classList.toggle('solid', !(home && home.classList.contains('on')) || window.scrollY > window.innerHeight - 120);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-go]') : null;
    if (t) { e.preventDefault(); go(t.getAttribute('data-go')); }
    var c = e.target.closest ? e.target.closest('[data-cap]') : null;
    if (c) cap(c.getAttribute('data-cap'));
  });
  window.addEventListener('scroll', navStyle);

  // ---- captcha (a simple human check on the device-local login) ----
  var caps = {};
  function cap(id) {
    var ch = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    caps[id] = Array.from({ length: 5 }, function () { return ch[Math.random() * ch.length | 0]; }).join('');
    $(id).textContent = caps[id];
  }

  // ---- accounts ----
  // A built-in demo account (user "demo", password "demo") so the dashboard can be shown without signing up.
  var DEMO_USER = 'demo', DEMO_EMAIL = 'demo@dumpguard.app';
  (async function seedDemo() {
    var us = S.get('dg_u', []);
    if (us.some(function (u) { return u.email === DEMO_EMAIL; })) return;
    us.push({ email: DEMO_EMAIL, pw: await hash(DEMO_EMAIL, 'demo'), country: 'United States', state: 'New Jersey', county: 'Middlesex', city: 'Edison' });
    S.set('dg_u', us);
  })();
  function signedIn(email) {
    S.set('dg_s', email);
    go('dash');
  }
  // Government tab: same screen, username + password, opens the Map in staff view.
  var gov = false;
  function setMode(g) {
    gov = g; $('lerr').textContent = ''; $('le').value = ''; $('lp').value = '';
    $('mres').setAttribute('aria-pressed', String(!g)); $('mgov').setAttribute('aria-pressed', String(g));
    $('lh').textContent = g ? 'Government sign-in' : 'Welcome back';
    $('lsub').textContent = g ? 'Staff can see exact locations, photos and details, and update report status.' : 'Accounts are stored on this device only';
    $('lle').textContent = g ? 'Username' : 'Email or username';
    $('le').setAttribute('autocomplete', 'username'); $('le').setAttribute('inputmode', g ? 'text' : 'email');
    $('lhuman').style.display = g ? 'none' : ''; $('lalts').style.display = g ? 'none' : '';
    $('lgo').textContent = g ? 'Sign in' : 'Log in';
  }
  $('mres').onclick = function () { setMode(false); };
  $('mgov').onclick = function () { setMode(true); };
  window.addEventListener('dg-gov-login', function () { go('login'); setMode(true); });
  async function govLogin() {
    var e = $('lerr'), u = $('le').value.trim(), pw = $('lp').value;
    if (!u || !pw) return void (e.textContent = 'Enter the username and password.');
    $('lgo').disabled = true;
    var r = await DG.staffLogin(u, pw);
    $('lgo').disabled = false;
    if (!r.ok) return void (e.textContent = r.message);
    e.textContent = ''; $('le').value = ''; $('lp').value = ''; go('map');
  }
  $('lgo').onclick = async function () {
    if (gov) return govLogin();
    var e = $('lerr'), em = $('le').value.trim().toLowerCase();
    if (em === DEMO_USER) em = DEMO_EMAIL;
    if (!emailOk(em)) return void (e.textContent = 'Enter a valid email.');
    if (!$('lp').value) return void (e.textContent = 'Enter your password.');
    if ($('lci').value.trim().toUpperCase() !== caps.lcap) { cap('lcap'); $('lci').value = ''; return void (e.textContent = "Captcha didn't match. Try the new code."); }
    var u = S.get('dg_u', []).find(function (x) { return x.email === em; });
    if (!u) return void (e.textContent = 'No account with that email on this device. Create one below.');
    if (u.pw !== await hash(em, $('lp').value)) { cap('lcap'); $('lci').value = ''; return void (e.textContent = 'Wrong password.'); }
    e.textContent = ''; $('lp').value = ''; signedIn(em);
  };
  $('fgo').onclick = function () {
    $('ferr').textContent = ''; $('fok').textContent = '';
    if (!emailOk($('fe').value)) return void ($('ferr').textContent = 'Enter a valid email.');
    $('fok').textContent = 'Accounts live only on this device and no email is sent. If you forgot the password, create a new account with a different email.';
  };
  var sentCode = null;
  $('scode').onclick = function () {
    if (!emailOk($('se').value)) return void ($('serr').textContent = 'Enter a valid email first.');
    $('serr').textContent = '';
    sentCode = String(100000 + Math.random() * 900000 | 0);
    $('cmsg').textContent = 'No email is sent. Your code is ' + sentCode + '.';
  };
  $('sgo').onclick = async function () {
    var e = $('serr'), em = $('se').value.trim().toLowerCase();
    if (!emailOk(em)) return void (e.textContent = 'Enter a valid email.');
    if (S.get('dg_u', []).some(function (x) { return x.email === em; })) return void (e.textContent = 'That email already has an account. Log in instead.');
    if (!sentCode || $('sc').value !== sentCode) return void (e.textContent = 'Verification code is missing or incorrect.');
    if ($('sp').value.length < 8) return void (e.textContent = 'Password must be at least 8 characters.');
    if ($('sp').value !== $('sp2').value) return void (e.textContent = "Passwords don't match.");
    if (!$('sci').value.trim()) return void (e.textContent = 'Enter your city or town.');
    var us = S.get('dg_u', []);
    us.push({ email: em, pw: await hash(em, $('sp').value), country: $('sco').value, state: $('sst').value, county: $('sct').value, city: $('sci').value.trim() });
    S.set('dg_u', us);
    e.textContent = ''; sentCode = null; signedIn(em);
  };
  $('logout').onclick = function () { S.del('dg_s'); go('home'); };

  // ---- sign-up pickers ----
  function opt(a) { return a.map(function (t) { return '<option>' + t + '</option>'; }).join(''); }
  $('states').innerHTML = 'Alabama,Alaska,Arizona,Arkansas,California,Colorado,Connecticut,Delaware,Florida,Georgia,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Ohio,Oklahoma,Oregon,Pennsylvania,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Washington,West Virginia,Wisconsin,Wyoming'.split(',').map(function (s) { return '<option>' + s + '</option>'; }).join('');
  var NJ = 'Atlantic,Bergen,Burlington,Camden,Cape May,Cumberland,Essex,Gloucester,Hudson,Hunterdon,Mercer,Middlesex,Monmouth,Morris,Ocean,Passaic,Salem,Somerset,Sussex,Union,Warren'.split(',');
  var counties = function () { $('counties').innerHTML = $('sst').value === 'New Jersey' ? opt(NJ) : ''; };
  $('sst').oninput = counties; counties();
  function fillTowns() {
    var sel = $('town');
    if (sel && sel.options.length) $('towns').innerHTML = Array.prototype.map.call(sel.options, function (o) { return o.value ? '<option>' + o.textContent + '</option>' : ''; }).join('');
  }
  fillTowns(); setTimeout(fillTowns, 1500); setTimeout(fillTowns, 4000);

  // ---- saved items (history) ----
  // When signed in, a "Save to my history" button follows each result on the Identify page.
  var result = $('result');
  function saveButton() {
    var u = me();
    if (!result || !u || result.querySelector('#savebtn') || !result.firstChild || !result.querySelector('h3')) return;
    var label = result.querySelector('h3').textContent.trim();
    if (!label) return;
    var b = document.createElement('button');
    b.className = 'btn dark'; b.id = 'savebtn'; b.type = 'button'; b.style.marginTop = '16px'; b.textContent = 'Save to my history';
    b.onclick = function () {
      var k = 'dg_h_' + u.email, hh = S.get(k, []);
      hh.unshift({ label: label, town: DG && DG.townId() || '', at: new Date().toLocaleString() });
      S.set(k, hh.slice(0, 100));
      b.disabled = true; b.textContent = 'Saved';
    };
    result.appendChild(b);
  }
  if (result && window.MutationObserver) {
    var busy = false;
    new MutationObserver(function () { if (busy) return; busy = true; saveButton(); busy = false; }).observe(result, { childList: true });
  }

  // ---- dashboard ----
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  var STAT = { new: ['New', '#dc2626'], noticed: ['Noticed', '#f59e0b'], progress: ['In progress', '#0284c7'], resolved: ['Resolved', '#16a34a'] };
  function dash() {
    var u = me(); if (!u) return;
    $('dname').textContent = u.email.split('@')[0];
    $('dloc').textContent = [u.city, u.county && u.county + ' County', u.state].filter(Boolean).join(', ');
    var h = S.get('dg_h_' + u.email, []);
    $('st1').textContent = h.length;
    $('hist').innerHTML = h.length ? h.map(function (i) { return '<div class="item"><b>' + esc(i.label) + '</b><small>' + esc(i.town) + ' &middot; ' + esc(i.at) + '</small></div>'; }).join('') : '<p class="empty">Nothing saved yet. Look up an item and choose Save to my history.</p>';
    var codes = S.get('dg_dump_codes', []);
    $('st2').textContent = codes.length; $('st3').textContent = 0;
    $('myrep').innerHTML = codes.length ? '<p class="empty">Loading...</p>' : '<p class="empty">No reports from this device yet.</p>';
    if (!codes.length || !DG) return;
    Promise.all(codes.map(function (c) {
      return DG.api.get('/dumping/track?code=' + encodeURIComponent(c.code)).then(function (r) { return r.status === 200 ? r.body : { code: c.code, gone: true }; }).catch(function () { return { code: c.code, gone: true }; });
    })).then(function (rs) {
      $('st3').textContent = rs.filter(function (r) { return r.status === 'resolved'; }).length;
      $('myrep').innerHTML = rs.map(function (r) {
        if (r.gone) return '<div class="item"><b>' + esc(r.code) + '</b><small>Could not load this report right now.</small></div>';
        var s = STAT[r.status] || STAT.new;
        return '<div class="item"><span class="badge" style="background:' + s[1] + '">' + s[0] + '</span> <b>' + esc(r.code) + '</b> &middot; ' + esc(r.type) + '<small>' + esc(r.town) + ' &middot; filed ' + esc(String(r.created_at).slice(0, 10)) + '</small></div>';
      }).join('');
    });
  }

  go(location.hash.slice(1) || 'home');
})();
