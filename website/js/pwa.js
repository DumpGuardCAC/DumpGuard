(function () {
  var root = document.documentElement;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (standalone) root.classList.add('installed');
  if (standalone && ios) root.classList.add('ios');

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }

  // iPhone and iPad: the site only opens from the Home Screen.
  if (!ios || standalone || window.Capacitor) return;
  root.classList.add('gated');

  var T = {
    en: {
      h: 'Add DumpGuard to your Home Screen',
      lead: 'On iPhone, DumpGuard runs as an app. Install it to continue.',
      s1: 'Tap the Share button in the Safari toolbar.',
      s2: 'Scroll down and tap Add to Home Screen.',
      s3: 'Open DumpGuard from your Home Screen.',
      safari: 'This page is not open in Safari. Open it in Safari first.',
    },
    es: {
      h: 'Agregue DumpGuard a su pantalla de inicio',
      lead: 'En iPhone, DumpGuard funciona como una app. Instálela para continuar.',
      s1: 'Toque el botón Compartir en la barra de Safari.',
      s2: 'Desplácese y toque Agregar a pantalla de inicio.',
      s3: 'Abra DumpGuard desde su pantalla de inicio.',
      safari: 'Esta página no está abierta en Safari. Ábrala primero en Safari.',
    },
  };
  var lang = 'en';
  try { lang = (localStorage.getItem('dg_lang') || (navigator.language || 'en').slice(0, 2)) === 'es' ? 'es' : 'en'; } catch (e) { /* storage can be blocked */ }
  var t = T[lang];
  var inApp = /FBAN|FBAV|Instagram|Snapchat|TikTok|Line\/|MicroMessenger|GSA\/|Twitter/.test(navigator.userAgent);

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function shareIcon() {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'gate-ico'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M12 15V3M8 7l4-4 4 4M7 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1');
    s.appendChild(p); return s;
  }
  function build() {
    var g = el('div', 'gate'); g.id = 'installgate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'gate-h');
    var logo = el('img', 'gate-logo'); logo.src = 'images/logo.png'; logo.alt = 'DumpGuard'; logo.height = 72;
    var h = el('h1', '', t.h); h.id = 'gate-h';
    g.appendChild(logo); g.appendChild(h); g.appendChild(el('p', 'gate-lead', t.lead));
    if (inApp) g.appendChild(el('p', 'gate-warn', t.safari));
    var ol = el('ol', 'gate-steps');
    var l1 = el('li'); l1.appendChild(shareIcon()); l1.appendChild(el('span', '', t.s1));
    ol.appendChild(l1); ol.appendChild(el('li', '', t.s2)); ol.appendChild(el('li', '', t.s3));
    g.appendChild(ol); document.body.appendChild(g);
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
