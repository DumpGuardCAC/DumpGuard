/* Spanish for every page except Identify (which dumpguard-api.js translates itself).
 *
 * Instead of threading a language switch through every script, this walks the page, swaps any text it has a Spanish
 * line for, and remembers the English original so switching back restores it. A MutationObserver re-runs it when the
 * other scripts draw new text (errors, map panels, dashboard rows). Text with no entry is left as it is.
 */
(function () {
  'use strict';

  var DG = window.DumpGuard;
  if (!DG) return;

  var ES = {
    // navigation + home
    'Home': 'Inicio', 'Identify': 'Identificar', 'Report': 'Reportar', 'Map': 'Mapa', 'About': 'Acerca de', 'Log in': 'Iniciar sesión', 'Dashboard': 'Panel',
    'Get started': 'Comenzar', 'Scroll ↓': 'Desplácese ↓', 'Dispose of anything, the right way': 'Deseche cualquier cosa, de la manera correcta',
    'How it works': 'Cómo funciona', 'Clear answers from': 'Respuestas claras de', 'your own district.': 'su propio distrito.',
    'Local disposal websites are outdated and hard to follow. DumpGuard replaces the confusion with one clear, sourced answer.': 'Los sitios web locales sobre desechos están desactualizados y son difíciles de seguir. DumpGuard reemplaza la confusión con una respuesta clara y con fuente.',
    'Snap or search': 'Tome una foto o busque', 'Photograph a couch, a battery, or 3D-printed robot parts. Or simply type it in.': 'Fotografíe un sofá, una batería o piezas de robot impresas en 3D. O simplemente escríbalo.',
    'Get exact steps': 'Obtenga pasos exactos', "What to do, what not to do, and why, based on your town's official rules.": 'Qué hacer, qué no hacer y por qué, según las reglas oficiales de su municipio.',
    'Report dumping': 'Reportar vertidos', 'Spot an illegal dump? Report it anonymously and help your community respond.': '¿Vio un vertido ilegal? Repórtelo de forma anónima y ayude a su comunidad a responder.',
    'Every kind of waste': 'Todo tipo de desechos', 'Color-coded so': 'Con colores para que', 'it makes sense.': 'tenga sentido.',
    'From electronics to yard trimmings, each category has its own rules in your town.': 'Desde electrónicos hasta restos de jardín, cada categoría tiene sus propias reglas en su municipio.',
    'Electronics': 'Electrónicos', 'Batteries': 'Baterías', 'Plastics': 'Plásticos', 'Yard waste': 'Desechos de jardín', 'Furniture': 'Muebles', 'Appliances': 'Electrodomésticos', 'Tires': 'Llantas',
    'For your community': 'Para su comunidad', 'Cleaner towns, with': 'Municipios más limpios,', 'privacy built in.': 'con privacidad incluida.',
    'Photos have location data removed, and public hotspot maps only show coarse zones once several people report the same area.': 'A las fotos se les quitan los datos de ubicación, y los mapas públicos solo muestran zonas aproximadas cuando varias personas reportan la misma área.',
    'Ready?': '¿Listo?', 'Find out how to dispose': 'Descubra cómo desechar', 'of anything in seconds.': 'cualquier cosa en segundos.',
    'Free for residents. Built for local government.': 'Gratis para residentes. Hecho para el gobierno local.', 'Create an account': 'Crear una cuenta',
    'Cleaner towns, one item at a time.': 'Municipios más limpios, un artículo a la vez.',
    // identify (labels only; results are translated by dumpguard-api.js)
    'What are you': '¿Qué quiere', 'getting rid of?': 'desechar?', 'Your town': 'Su municipio', 'Search an item': 'Busque un artículo', 'Or use a photo': 'O use una foto',
    'Not sure. Pick a category': 'No está seguro. Elija una categoría',
    // report
    'Report illegal dumping': 'Reportar vertido ilegal', 'Saw something dumped': '¿Vio algo tirado', "where it shouldn't be?": 'donde no debería estar?',
    'This form is only for illegal dumping: piles left on roadsides, lots, or private property. For everyday disposal questions, use': 'Este formulario es solo para vertidos ilegales: montones dejados en carreteras, terrenos o propiedad privada. Para preguntas cotidianas sobre desechos, use',
    'Town': 'Municipio', 'Street address or location': 'Dirección o ubicación', 'Type of dumping': 'Tipo de vertido', 'Description': 'Descripción',
    'Additional notes (optional)': 'Notas adicionales (opcional)', 'Photo (optional)': 'Foto (opcional)', 'Take or upload a picture': 'Tome o suba una foto', 'Take or upload a photo': 'Tome o suba una foto',
    'e.g. 120 Oak Tree Rd, or behind the strip mall on Route 1': 'p. ej., 120 Oak Tree Rd, o detrás del centro comercial en la Ruta 1',
    'What was dumped and roughly how much?': '¿Qué se tiró y aproximadamente cuánto?',
    "How long it's been there, how to access it, any hazards": 'Cuánto tiempo lleva ahí, cómo llegar, posibles peligros',
    'Privacy check: location data removed from photo.': 'Revisión de privacidad: se quitaron los datos de ubicación de la foto.',
    "Please don't include people, license plates, or names in your photo or notes.": 'Por favor, no incluya personas, placas ni nombres en su foto o notas.',
    'Submit report': 'Enviar reporte', 'Track a report': 'Seguir un reporte',
    'You get a tracking code when you submit, even without an account. Enter it to see whether officials have noticed or resolved the report.': 'Recibe un código de seguimiento al enviar, incluso sin cuenta. Escríbalo para ver si las autoridades notaron o resolvieron el reporte.',
    'e.g. DG-4F7K2': 'p. ej., DG-4F7K2', 'Check': 'Consultar', 'Tracking code': 'Código de seguimiento', 'Verification code': 'Código de verificación',
    'Choose your town': 'Elija su municipio', 'Could not load towns': 'No se pudieron cargar los municipios', 'Choose a type': 'Elija un tipo',
    'Household trash or bags': 'Basura doméstica o bolsas', 'Furniture or mattresses': 'Muebles o colchones', 'Construction or demolition debris': 'Escombros de construcción o demolición',
    'Chemicals or hazardous waste': 'Químicos o desechos peligrosos', 'Other': 'Otro',
    'Use my location': 'Usar mi ubicación', 'Finding your location...': 'Buscando su ubicación...', 'Location added. You can still describe the spot above.': 'Ubicación agregada. Aún puede describir el lugar arriba.',
    'Could not get your location. Type the address instead.': 'No se pudo obtener su ubicación. Escriba la dirección.', 'Selected photo': 'Foto seleccionada',
    'That photo could not be used. Try a different one.': 'No se pudo usar esa foto. Pruebe con otra.', 'That photo is too large.': 'Esa foto es demasiado grande.',
    'Choose your town.': 'Elija su municipio.', 'Choose the type of dumping.': 'Elija el tipo de vertido.', 'Describe where it is (at least 3 characters).': 'Describa dónde está (al menos 3 caracteres).',
    'Describe what was dumped (at least 3 characters).': 'Describa qué se tiró (al menos 3 caracteres).', 'Notes can be up to 500 characters.': 'Las notas pueden tener hasta 500 caracteres.',
    'Too many reports from this connection. Try again in an hour.': 'Demasiados reportes desde esta conexión. Intente de nuevo en una hora.',
    'Could not send the report. Try again.': 'No se pudo enviar el reporte. Intente de nuevo.', 'Could not reach the server. Try again.': 'No se pudo conectar con el servidor. Intente de nuevo.',
    'Report sent. Your tracking code is': 'Reporte enviado. Su código de seguimiento es',
    '. Save it to check on the report later. It is also saved in this browser.': '. Guárdelo para consultar el reporte después. También se guarda en este navegador.',
    'Codes look like DG-4F7K2.': 'Los códigos tienen este formato: DG-4F7K2.', 'Checking...': 'Consultando...', 'No report with that code.': 'No hay ningún reporte con ese código.',
    'Too many checks. Try again later.': 'Demasiadas consultas. Intente más tarde.', 'Could not check the report. Try again.': 'No se pudo consultar el reporte. Intente de nuevo.',
    'Reports from this browser': 'Reportes de este navegador',
    'Received': 'Recibido', 'Noticed by officials': 'Visto por las autoridades', 'In progress': 'En proceso', 'Resolved': 'Resuelto', 'New': 'Nuevo', 'Noticed': 'Visto',
    // map
    'Community map': 'Mapa comunitario', 'Illegal dumping spots.': 'Lugares de vertido ilegal.',
    'See where illegal dumping has been reported and whether officials have addressed it. Public locations are approximate, and photos and details are only visible to local staff.': 'Vea dónde se han reportado vertidos ilegales y si las autoridades los han atendido. Las ubicaciones públicas son aproximadas, y las fotos y los detalles solo los ve el personal local.',
    'Filter by type': 'Filtrar por tipo', 'Filter by town': 'Filtrar por municipio', 'Status': 'Estado', 'All statuses': 'Todos los estados', 'All types': 'Todos los tipos', 'All towns': 'Todos los municipios',
    'Government sign-in': 'Acceso para el gobierno', 'Sign out': 'Cerrar sesión', 'Government access': 'Acceso del gobierno',
    'Staff can see exact locations, photos and details, and update report status.': 'El personal puede ver ubicaciones exactas, fotos y detalles, y actualizar el estado de los reportes.',
    'Access code': 'Código de acceso', 'Staff access code': 'Código de acceso del personal', 'Unlock': 'Desbloquear',
    'Enter the access code.': 'Escriba el código de acceso.', 'Too many attempts. Try again later.': 'Demasiados intentos. Intente más tarde.', 'That code was not accepted.': 'No se aceptó ese código.',
    'Could not reach the server.': 'No se pudo conectar con el servidor.',
    'Street map tiles could not load. Report areas still show.': 'No se pudo cargar el mapa de calles. Las áreas de reportes se siguen mostrando.', 'The map could not load. Try again later.': 'No se pudo cargar el mapa. Intente más tarde.',
    'Household trash': 'Basura doméstica', 'Construction debris': 'Escombros de construcción', 'Hazardous waste': 'Desechos peligrosos',
    'Status colors': 'Colores de estado', 'By town': 'Por municipio', 'Staff view': 'Vista del personal',
    'Select a point or a row below to see details and update its status.': 'Seleccione un punto o una fila abajo para ver los detalles y actualizar su estado.',
    'Approximate area, not an address.': 'Área aproximada, no una dirección.', 'Reports': 'Reportes', 'No reports match these filters.': 'Ningún reporte coincide con estos filtros.',
    'Loading photo...': 'Cargando foto...', 'Photo could not be loaded.': 'No se pudo cargar la foto.', 'Update status': 'Actualizar estado', 'Could not update. Sign in again.': 'No se pudo actualizar. Inicie sesión de nuevo.',
    'Report photo': 'Foto del reporte',
    // about
    'Built for our community.': 'Hecho para nuestra comunidad.',
    'DumpGuard is a student-built project that makes waste disposal simple for residents and gives towns a clearer picture of where dumping happens.': 'DumpGuard es un proyecto hecho por estudiantes que simplifica el desecho de residuos para los residentes y le da a los municipios una imagen más clara de dónde ocurren los vertidos.',
    // dashboard
    'Your dashboard': 'Su panel', 'Hi,': 'Hola,', 'Items looked up': 'Artículos consultados', 'Reports filed': 'Reportes presentados', 'Look up an item': 'Buscar un artículo', 'Log out': 'Cerrar sesión',
    'My reports': 'Mis reportes', 'Disposal history': 'Historial de desechos', 'Nothing saved yet. Look up an item and choose Save to my history.': 'Aún no hay nada guardado. Busque un artículo y elija Guardar en mi historial.',
    'No reports from this device yet.': 'Aún no hay reportes desde este dispositivo.', 'Loading...': 'Cargando...', 'Could not load this report right now.': 'No se pudo cargar este reporte ahora.',
    'Save to my history': 'Guardar en mi historial', 'Saved': 'Guardado',
    // login / forgot / signup
    'Look up what goes where, find your pickup days, and report illegal dumping in your town.': 'Vea qué va dónde, encuentre sus días de recogida y reporte vertidos ilegales en su municipio.',
    'Dispose of anything,': 'Deseche cualquier cosa,', 'the right way.': 'de la manera correcta.', 'Welcome back': 'Bienvenido de nuevo', 'Accounts are stored on this device only': 'Las cuentas se guardan solo en este dispositivo',
    'Email or username': 'Correo o usuario', 'Password': 'Contraseña', "Verify you're human": 'Verifique que es una persona', 'Type the code above': 'Escriba el código de arriba', 'New code': 'Código nuevo',
    'Forgot password?': '¿Olvidó su contraseña?', 'Not a user yet?': '¿Aún no tiene cuenta?',
    'Enter a valid email.': 'Escriba un correo válido.', 'Enter your password.': 'Escriba su contraseña.', "Captcha didn't match. Try the new code.": 'El código no coincide. Pruebe con el código nuevo.',
    'No account with that email on this device. Create one below.': 'No hay una cuenta con ese correo en este dispositivo. Cree una abajo.', 'Wrong password.': 'Contraseña incorrecta.',
    'Reset password': 'Restablecer contraseña', 'Accounts are stored on this device only, so no reset email is sent. Enter your email to see your options.': 'Las cuentas se guardan solo en este dispositivo, por lo que no se envía correo de restablecimiento. Escriba su correo para ver sus opciones.',
    'Email': 'Correo', 'Continue': 'Continuar', '← Back to log in': '← Volver a iniciar sesión',
    'Accounts live only on this device and no email is sent. If you forgot the password, create a new account with a different email.': 'Las cuentas existen solo en este dispositivo y no se envía ningún correo. Si olvidó la contraseña, cree una cuenta nueva con otro correo.',
    'Create account': 'Crear cuenta', 'Save items and see your reports. Accounts are stored on this device only.': 'Guarde artículos y vea sus reportes. Las cuentas se guardan solo en este dispositivo.',
    'Send code': 'Enviar código', 'Email verification code': 'Código de verificación del correo', '6-digit code': 'Código de 6 dígitos', 'Confirm password': 'Confirmar contraseña', 'At least 8 characters': 'Al menos 8 caracteres',
    'Country': 'País', 'State / Region': 'Estado / Región', 'County': 'Condado', 'City / Town': 'Ciudad / Municipio', 'e.g. Middlesex': 'p. ej., Middlesex', 'e.g. Edison': 'p. ej., Edison',
    'Sign up': 'Registrarse', 'Already have an account?': '¿Ya tiene una cuenta?', 'United States': 'Estados Unidos', 'Canada': 'Canadá', 'United Kingdom': 'Reino Unido',
    'Enter a valid email first.': 'Primero escriba un correo válido.', 'That email already has an account. Log in instead.': 'Ese correo ya tiene una cuenta. Inicie sesión.',
    'Verification code is missing or incorrect.': 'Falta el código de verificación o es incorrecto.', 'Password must be at least 8 characters.': 'La contraseña debe tener al menos 8 caracteres.',
    "Passwords don't match.": 'Las contraseñas no coinciden.', 'Enter your city or town.': 'Escriba su ciudad o municipio.',
  };

  var TYPE_ES = {
    household: 'Basura doméstica', furniture: 'Muebles', appliances: 'Electrodomésticos', electronics: 'Electrónicos', tires: 'Llantas',
    construction: 'Escombros de construcción', yard: 'Desechos de jardín', hazardous: 'Desechos peligrosos', other: 'Otro',
  };
  var plural = function (n, one, many) { return n + ' ' + (Number(n) === 1 ? one : many); };
  var lit = function (s) { return ES[s] || s; };

  // Patterns for text with numbers, names or codes in it. Each returns the Spanish text.
  var RX = [
    [/^(\d+) reports? in this area$/, function (m) { return plural(m[1], 'reporte', 'reportes') + ' en esta área'; }],
    [/^(New|Noticed|In progress|Resolved): (\d+)$/, function (m) { return lit(m[1]) + ': ' + m[2]; }],
    [/^(\d+) areas? with (\d+) or more reports$/, function (m) { return plural(m[1], 'área', 'áreas') + ' con ' + m[2] + ' o más reportes'; }],
    [/^(\d+) reports?(?:, (\d+) without a map point)?$/, function (m) { return plural(m[1], 'reporte', 'reportes') + (m[2] ? ', ' + m[2] + ' sin punto en el mapa' : ''); }],
    [/^(.+): (\d+) open$/, function (m) { return m[1] + ': ' + m[2] + ' abiertos'; }],
    [/^(\d+) new, (\d+) noticed, (\d+) in progress, (\d+) resolved$/, function (m) { return m[1] + ' nuevos, ' + m[2] + ' vistos, ' + m[3] + ' en proceso, ' + m[4] + ' resueltos'; }],
    [/^Areas appear on the map once (\d+) or more reports are close together\.$/, function (m) { return 'Las áreas aparecen en el mapa cuando ' + m[1] + ' o más reportes están cerca unos de otros.'; }],
    [/^Town labels: (on|off)$/, function (m) { return 'Etiquetas de municipios: ' + (m[1] === 'on' ? 'sí' : 'no'); }],
    [/^Filed (.+?)(?:, last update (.+?))?(\. No map point\.)?$/, function (m) { return 'Presentado ' + m[1] + (m[2] ? ', última actualización ' + m[2] : '') + (m[3] ? '. Sin punto en el mapa.' : ''); }],
    [/^(DG-[A-Z0-9]{5}): (Received|Noticed by officials|In progress|Resolved)$/, function (m) { return m[1] + ': ' + lit(m[2]); }],
    [/^(DG-[A-Z0-9]{5}) - (.+?) - (.*)$/, function (m) { return m[1] + ' - ' + lit(m[2]) + ' - ' + m[3]; }],
    [/^in ([A-Z].*)$/, function (m) { return 'en ' + m[1]; }],
    [/^(.*) · filed (.+)$/, function (m) { return m[1] + ' · presentado ' + m[2]; }],
    [/^No email is sent\. Your code is (\d+)\.$/, function (m) { return 'No se envía ningún correo. Su código es ' + m[1] + '.'; }],
  ];

  function es(en) {
    var key = en.trim();
    if (!key) return en;
    var out = ES[key];
    if (!out) {
      for (var i = 0; i < RX.length; i++) {
        var m = RX[i][0].exec(key);
        if (m) { out = RX[i][1](m); break; }
      }
    }
    return out ? en.replace(key, function () { return out; }) : en;
  }

  var ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  var textRec = new WeakMap(); // text node -> { en, out }
  var attrRec = new WeakMap(); // element -> { attr: { en, out } }
  var observer = null, queued = false;

  function swap(cur, rec, spanish) {
    var en = rec && rec.out === cur ? rec.en : cur;
    var out = spanish ? es(en) : en;
    return { en: en, out: out };
  }

  function apply() {
    queued = false;
    var spanish = DG.lang() === 'es';
    if (observer) observer.disconnect();
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        return p === 'SCRIPT' || p === 'STYLE' || p === 'NOSCRIPT' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    var n;
    while ((n = walker.nextNode())) {
      var r = swap(n.nodeValue, textRec.get(n), spanish);
      if (r.out !== n.nodeValue) n.nodeValue = r.out;
      if (r.out !== r.en) textRec.set(n, r); else textRec.delete(n);
    }
    var els = document.body.querySelectorAll('[placeholder],[aria-label],[alt],[title]');
    Array.prototype.forEach.call(els, function (el) {
      var recs = attrRec.get(el) || {};
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        var cur = el.getAttribute(a), r = swap(cur, recs[a], spanish);
        if (r.out !== cur) el.setAttribute(a, r.out);
        if (r.out !== r.en) recs[a] = r; else delete recs[a];
      });
      attrRec.set(el, recs);
    });
    document.documentElement.lang = DG.lang();
    syncToggle();
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function queue() { if (!queued) { queued = true; setTimeout(apply, 40); } }

  // ---- language button in the nav (drives the same select the Identify page uses) ----
  var toggle = null;
  function syncToggle() { if (toggle) toggle.textContent = DG.lang() === 'es' ? 'English' : 'Español'; }
  function addToggle() {
    var ul = document.querySelector('#nav ul');
    if (!ul) return;
    var li = document.createElement('li');
    toggle = document.createElement('a');
    toggle.setAttribute('role', 'button'); toggle.setAttribute('tabindex', '0'); toggle.setAttribute('lang', DG.lang() === 'es' ? 'en' : 'es');
    var flip = function () {
      var sel = document.getElementById('lang');
      if (!sel) return;
      sel.value = DG.lang() === 'es' ? 'en' : 'es';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };
    toggle.addEventListener('click', function (e) { e.preventDefault(); flip(); });
    toggle.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    li.appendChild(toggle);
    ul.insertBefore(li, ul.lastElementChild);
    syncToggle();
  }

  function init() {
    addToggle();
    document.addEventListener('change', function (e) { if (e.target && e.target.id === 'lang') queue(); });
    observer = new MutationObserver(queue);
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
