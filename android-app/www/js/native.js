// Native shell: use the installed-app styling (safe areas, glass on iOS).
(function () {
  var root = document.documentElement;
  root.classList.add('installed');
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) root.classList.add('ios');
})();
