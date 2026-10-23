/* Photo recognition for the Identify page.
 *
 * The model (website/model, MobileNetV3-Large, about 6 MB) runs in the browser with TensorFlow.js. The photo is read from the
 * chosen file, drawn to a canvas and classified on this device. It is never uploaded and never sent to the API; only the
 * predicted material class is used, to look up the town's rules. TensorFlow.js is loaded the first time a photo is picked.
 *
 * Output is calibrated: p = softmax(log(p) / T) with T = 1.9, and a class is only used at 65 percent or more. Anything
 * below that, or "no_object", falls back to the category picker.
 */
(function () {
  'use strict';

  var TFJS = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
  var MODEL_URL = 'model/model.json';
  var CLASSES = ['rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard', 'no_object'];
  var SIZE = 224, TEMPERATURE = 1.9, THRESHOLD = 0.65;

  var S = {
    en: {
      prompt: 'Take or upload a photo', reading: 'Loading the photo model...', looking: 'Looking at the photo...',
      sure: 'Looks like', unsure: 'Not sure what this is. Pick a category below.', none: 'No item found in the photo. Try a closer picture, or pick a category below.',
      fail: 'Photo recognition could not start. Pick a category below.', local: 'The photo stays on your device.', another: 'Try another photo',
      materials: { rigid_plastic: 'Hard plastic', soft_plastic_foam: 'Soft plastic or foam', cardboard_paper: 'Cardboard or paper', metal: 'Metal', glass: 'Glass', ewaste_hazard: 'Electronics or hazardous' },
    },
    es: {
      prompt: 'Tome o suba una foto', reading: 'Cargando el modelo de fotos...', looking: 'Mirando la foto...',
      sure: 'Parece', unsure: 'No estoy seguro de qué es. Elija una categoría abajo.', none: 'No se encontró ningún objeto en la foto. Pruebe una foto más cercana o elija una categoría abajo.',
      fail: 'No se pudo iniciar el reconocimiento de fotos. Elija una categoría abajo.', local: 'La foto se queda en su dispositivo.', another: 'Probar otra foto',
      materials: { rigid_plastic: 'Plástico duro', soft_plastic_foam: 'Plástico blando o espuma', cardboard_paper: 'Cartón o papel', metal: 'Metal', glass: 'Vidrio', ewaste_hazard: 'Electrónicos o peligrosos' },
    },
  };
  var s = function () { return S[window.DumpGuard.lang()] || S.en; };

  var tfPromise = null, modelPromise = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src; el.async = true; el.crossOrigin = 'anonymous';
      el.integrity = 'sha384-vE8hbVJ4lezako5rlvE7bY0BVzWlFhZncPlckrqNwcUQpVtgbENTgZ8TBbnPjZre';
      el.onload = resolve;
      el.onerror = function () { reject(new Error('script')); };
      document.head.appendChild(el);
    });
  }
  function loadModel() {
    if (!modelPromise) {
      modelPromise = (window.tf ? Promise.resolve() : (tfPromise = tfPromise || loadScript(TFJS)))
        .then(function () { return window.tf.loadGraphModel(MODEL_URL); })
        .catch(function (e) { modelPromise = null; tfPromise = null; throw e; });
    }
    return modelPromise;
  }

  // Temperature scaling on the model's softmax output.
  function calibrate(probs, T) {
    var logits = probs.map(function (p) { return Math.log(Math.max(p, 1e-9)) / T; });
    var max = Math.max.apply(null, logits);
    var exps = logits.map(function (l) { return Math.exp(l - max); });
    var sum = exps.reduce(function (a, b) { return a + b; }, 0);
    return exps.map(function (e) { return e / sum; });
  }
  function decide(probs) {
    var p = calibrate(probs, TEMPERATURE);
    var best = 0;
    for (var i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
    return { cls: CLASSES[best], confidence: p[best], sure: p[best] >= THRESHOLD };
  }

  function classify(img) {
    return loadModel().then(function (model) {
      var tf = window.tf;
      var out = tf.tidy(function () {
        var x = tf.image.resizeBilinear(tf.browser.fromPixels(img), [SIZE, SIZE]).toFloat().expandDims(0); // raw 0-255, the model rescales itself
        return model.predict(x);
      });
      return out.data().then(function (d) { out.dispose(); return decide(Array.prototype.slice.call(d)); });
    });
  }

  function init() {
    var input = document.getElementById('photo'), label = document.getElementById('droptxt');
    if (!input || !label || !window.DumpGuard) return;
    var DG = window.DumpGuard, h = DG.h;
    var mine = 0;
    var note = h('p', { class: 'sm', 'aria-live': 'polite' });
    input.parentNode.parentNode.insertBefore(note, input.parentNode.nextSibling);
    label.textContent = s().prompt;

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var run = ++mine;
      DG.showCategoryPicker(false);
      note.className = 'sm'; note.textContent = s().reading;
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); note.textContent = s().fail; DG.showCategoryPicker(true); };
      img.onload = function () {
        if (run !== mine) return;
        DG.clear(label).appendChild(h('img', { src: url, alt: '' }));
        note.textContent = s().looking;
        classify(img).then(function (r) {
          if (run !== mine) return;
          if (r.cls === 'no_object') { note.textContent = s().none; DG.showCategoryPicker(true); return; }
          if (!r.sure) { note.textContent = s().unsure; DG.showCategoryPicker(true); return; }
          note.textContent = s().sure + ': ' + s().materials[r.cls] + ' (' + Math.round(r.confidence * 100) + '%). ' + s().local;
          DG.showMaterial(r.cls);
        }).catch(function () {
          if (run !== mine) return;
          note.className = 'err'; note.textContent = s().fail; DG.showCategoryPicker(true);
        }).then(function () { /* object URL stays for the preview; released when the page unloads */ });
      };
      img.src = url;
      input.value = ''; // the same file can be chosen again
    });
  }

  window.DumpGuardModel = { decide: decide, calibrate: calibrate, classify: classify, CLASSES: CLASSES };
  document.addEventListener('DOMContentLoaded', init);
})();
