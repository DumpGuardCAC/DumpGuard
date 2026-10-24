(() => {
  'use strict';

  const DG = window.DumpGuard;
  if (!DG) return;

  let ES = {};
  let TABLES = {};
  let PLURALS = {};
  let RX = [];
  let MISC = {};

  const lit = s => ES[s] || s;

  const expand = (template, m) => {
    let out = '';
    for (let i = 0; i < template.length; i++) {
      if (template[i] !== '{') {
        out += template[i];
        continue;
      }
      let depth = 1;
      let j = i + 1;
      while (depth) {
        if (template[j] === '{') depth++;
        else if (template[j] === '}') depth--;
        j++;
      }
      const [, n, op, arg] = /^(\d)(?:([?:#])(.*))?$/s.exec(template.slice(i + 1, j - 1));
      const v = m[n] ?? '';
      if (!op) out += v;
      else if (op === '?') out += v ? expand(arg, m) : '';
      else if (op === '#') out += `${v} ${PLURALS[arg][Number(v) === 1 ? 0 : 1]}`;
      else if (arg === '@lit') out += lit(v);
      else out += TABLES[arg][v] ?? v;
      i = j - 1;
    }
    return out;
  };

  const es = en => {
    const key = en.trim();
    if (!key) return en;
    let out = ES[key];
    if (!out) {
      for (const [pattern, template] of RX) {
        const m = pattern.exec(key);
        if (m) {
          out = expand(template, m);
          break;
        }
      }
    }
    return out ? en.replace(key, () => out) : en;
  };

  const ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  const textRec = new WeakMap();
  const attrRec = new WeakMap();
  let observer = null;
  let queued = false;
  let toggle = null;

  const swap = (cur, rec, spanish) => {
    const en = rec && rec.out === cur ? rec.en : cur;
    return { en, out: spanish ? es(en) : en };
  };

  const apply = () => {
    queued = false;
    const spanish = DG.lang() === 'es';
    if (observer) observer.disconnect();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        const parent = n.parentNode && n.parentNode.nodeName;
        return parent === 'SCRIPT' || parent === 'STYLE' || parent === 'NOSCRIPT' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const r = swap(n.nodeValue, textRec.get(n), spanish);
      if (r.out !== n.nodeValue) n.nodeValue = r.out;
      if (r.out !== r.en) textRec.set(n, r); else textRec.delete(n);
    }
    document.body.querySelectorAll('[placeholder],[aria-label],[alt],[title]').forEach(el => {
      const recs = attrRec.get(el) || {};
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        const cur = el.getAttribute(a);
        const r = swap(cur, recs[a], spanish);
        if (r.out !== cur) el.setAttribute(a, r.out);
        if (r.out !== r.en) recs[a] = r; else delete recs[a];
      }
      attrRec.set(el, recs);
    });
    document.documentElement.lang = DG.lang();
    syncToggle();
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    setTimeout(apply, 40);
  };

  const syncToggle = () => {
    if (toggle) toggle.value = DG.lang();
  };
  const addToggle = () => {
    const ul = document.querySelector('#nav ul');
    if (!ul) return;
    toggle = DG.h('select', { id: 'navlang', class: 'navlang', 'aria-label': MISC.language ?? 'Language', onchange: () => DG.setLang(toggle.value) },
      DG.h('option', { value: 'en', lang: 'en' }, 'English'), DG.h('option', { value: 'es', lang: 'es' }, MISC.spanish ?? 'Spanish'));
    ul.insertBefore(DG.h('li', {}, toggle), ul.lastElementChild);
    syncToggle();
  };

  const init = () => {
    addToggle();
    window.addEventListener('dg-lang', queue);
    observer = new MutationObserver(queue);
    apply();
  };
  esReady.then(es => {
    ES = es.labels ?? {};
    TABLES = es.tables ?? {};
    PLURALS = es.plurals ?? {};
    MISC = es.misc ?? {};
    RX = (es.patterns ?? []).map(p => [new RegExp(p.re), p.es]);
    init();
  });
})();
