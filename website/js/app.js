(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var DG = window.DumpGuard;

  var ALIAS = { about: 'home', login: 'gov', signup: 'home', forgot: 'home', dash: 'home' };

  function go(v) {
    v = ALIAS[v] || v;
    if (!$('v-' + v)) v = 'home';
    Array.prototype.forEach.call(document.querySelectorAll('.view'), function (e) { e.classList.toggle('on', e.id === 'v-' + v); });
    Array.prototype.forEach.call(document.querySelectorAll('nav a, #tabs a'), function (a) { a.classList.toggle('act', a.getAttribute('data-go') === v); });
    try { history.replaceState(null, '', '#' + v); } catch (e) { }
    window.scrollTo(0, 0);
    var view = $('v-' + v);
    var heading = view ? view.querySelector('h1, h2') : null;
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    navStyle();
    if (v === 'map') setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
  }
  function navStyle() {
    var home = $('v-home');
    $('nav').classList.toggle('solid', !(home && home.classList.contains('on')) || window.scrollY > window.innerHeight - 120);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-go]') : null;
    if (t) { e.preventDefault(); go(t.getAttribute('data-go')); }
  });
  window.addEventListener('scroll', navStyle);

  async function govLogin() {
    var e = $('lerr'), u = $('le').value.trim(), pw = $('lp').value;
    if (!u || !pw) return void (e.textContent = 'Enter the username and password.');
    $('lgo').disabled = true;
    var r = await DG.staffLogin(u, pw);
    $('lgo').disabled = false;
    if (!r.ok) return void (e.textContent = r.message);
    e.textContent = ''; $('le').value = ''; $('lp').value = '';
  }
  $('lgo').onclick = govLogin;
  $('lp').addEventListener('keydown', function (e) { if (e.key === 'Enter') govLogin(); });
  $('le').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('lp').focus(); });

  go(location.hash.slice(1) || 'home');
})();
