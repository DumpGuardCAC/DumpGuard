(() => {
  const root = document.documentElement;
  const native = !!window.Capacitor || location.protocol === 'capacitor:' || (location.hostname === 'localhost' && location.protocol === 'https:');
  const standalone = native || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (standalone) root.classList.add('installed');
  if (standalone && ios) root.classList.add('ios');

  if (native) {
    window.DUMPGUARD_API = 'https://dumpguard.vercel.app/api/v1';
    return;
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  if (!ios || standalone) return;
  root.classList.add('gated');

  const T = {
    en: {
      h: 'Add DumpGuard to your Home Screen',
      lead: 'On iPhone, DumpGuard runs as an app. Install it to continue.',
      s1: 'Tap the Share button in the Safari toolbar.',
      s2: 'Scroll down and tap Add to Home Screen.',
      s3: 'Open DumpGuard from your Home Screen.',
      safari: 'This page is not open in Safari. Open it in Safari first.',
    },
  };
  let lang = 'en';
  try { lang = (localStorage.getItem('dg_lang') || (navigator.language || 'en').slice(0, 2)) === 'es' ? 'es' : 'en'; } catch {}
  let t = T.en;
  const inApp = /FBAN|FBAV|Instagram|Snapchat|TikTok|Line\/|MicroMessenger|GSA\/|Twitter/.test(navigator.userAgent);

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const shareIcon = () => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'gate-ico');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M12 15V3M8 7l4-4 4 4M7 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1');
    svg.append(path);
    return svg;
  };
  const build = () => {
    const gate = el('div', 'gate');
    gate.id = 'installgate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'gate-h');
    const logo = el('img', 'gate-logo');
    logo.src = 'icon.png';
    logo.alt = 'DumpGuard';
    logo.height = 72;
    const title = el('h1', '', t.h);
    title.id = 'gate-h';
    gate.append(logo, title, el('p', 'gate-lead', t.lead));
    if (inApp) gate.append(el('p', 'gate-warn', t.safari));
    const first = el('li');
    first.append(shareIcon(), el('span', '', t.s1));
    const steps = el('ol', 'gate-steps');
    steps.append(first, el('li', '', t.s2), el('li', '', t.s3));
    gate.append(steps);
    document.body.append(gate);
  };
  esReady.then(es => {
    T.es = es.install ?? T.en;
    t = T[lang];
    build();
  });
})();
