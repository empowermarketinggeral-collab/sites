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

  // Formulários: <form data-hub-form="newsletter" data-tags="a,b" data-success="Obrigado!" data-redirect="/obrigado">
  // envia os campos para /api/lead (back-office do hub e Big Boss) e conta um evento "lead".
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches || !form.matches('form[data-hub-form]')) return;
    e.preventDefault();
    var data = {};
    new FormData(form).forEach(function (v, k) {
      if (typeof v === 'string') data[k] = data[k] ? data[k] + ', ' + v : v;
    });
    data.source = form.getAttribute('data-hub-form');
    var tags = (form.getAttribute('data-tags') || '').split(',').concat(String(data.tags || '').split(','))
      .map(function (t) { return t.trim(); }).filter(Boolean);
    if (tags.length) data.tags = tags;
    var button = form.querySelector('[type=submit], button:not([type])');
    if (button) button.disabled = true;
    fetch(new URL('/api/lead?site=' + encodeURIComponent(site), s.src).href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      send('lead');
      var to = form.getAttribute('data-redirect');
      if (to) { location.href = to; return; }
      var done = document.createElement('p');
      done.className = 'hub-form-ok';
      done.textContent = form.getAttribute('data-success') || 'Obrigado! Recebemos o teu pedido.';
      form.replaceWith(done);
    }).catch(function () {
      if (button) button.disabled = false;
      var err = form.querySelector('.hub-form-error') || document.createElement('p');
      err.className = 'hub-form-error';
      err.setAttribute('role', 'alert');
      err.textContent = form.getAttribute('data-error') || 'Não foi possível enviar. Tenta de novo.';
      form.appendChild(err);
    });
  });

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
