const esReady = fetch('es.json').then(r => r.json()).catch(() => ({}));
