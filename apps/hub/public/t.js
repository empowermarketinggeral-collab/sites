/* Empower Hub — tracking sem cookies. Uso:
   <script defer src="https://HUB/t.js" data-site="ID-DO-SITE"></script>
   Eventos: data-track="nome_evento" num link/botão, ou window.empowerTrack('nome_evento'). */
(function () {
  var s = document.currentScript;
  if (!s || navigator.webdriver) return;
  var site = s.getAttribute('data-site');
  var endpoint = new URL('/api/collect', s.src).href;
  var lastPath = null;

  function send(name) {
    try {
      fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s: site, n: name, u: location.href, r: document.referrer }),
      }).catch(function () {});
    } catch (e) {}
  }

  function pageview() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    send('pageview');
  }

  window.empowerTrack = send;
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-track]');
    if (el) send(el.getAttribute('data-track'));
  });
  var push = history.pushState;
  history.pushState = function () { push.apply(this, arguments); pageview(); };
  addEventListener('popstate', pageview);
  pageview();
})();
