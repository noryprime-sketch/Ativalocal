/* Ativa Local: aviso de cookies, Consent Mode v2, etiqueta do Google (gtag) e conversões.
   Tudo recusado por defeito. Sem AW_ID preenchido, a etiqueta do Google não carrega (só o aviso funciona).
   Para ligar: preencher AW_ID e os rótulos de CONVERSOES com o que o Google Ads dá
   (Metas > Conversões > a ação > Configuração da etiqueta > «send_to»: AW-123456789/AbCdEfGh → rótulo «AbCdEfGh»). */
(function () {
  "use strict";

  var AW_ID = "AW-18556597347";
  var CONVERSOES = {
    whatsapp: "o-o6CKThorIdEOPovJBF",    // principal: clique num link wa.me
    formulario: "",  // envio de um formulário de contacto (o site ainda não tem nenhum)
    telefone: "1wlLCKfhorIdEOPovJBF",    // clique num link tel:
    verificador: "ZDfNCKrhorIdEOPovJBF"  // uso do verificador de site (/ferramentas/verificador-site)
  };

  var CHAVE = "al-consent";
  var VERSAO = 1;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // 1. Consent Mode v2: tudo recusado antes de qualquer etiqueta
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500
  });
  gtag("set", "ads_data_redaction", true);
  gtag("set", "url_passthrough", true);

  function ler() {
    try {
      var v = JSON.parse(localStorage.getItem(CHAVE) || "null");
      return v && v.v === VERSAO ? v : null;
    } catch (e) { return null; }
  }
  function guardar(pub, est) {
    var v = { v: VERSAO, publicidade: !!pub, estatisticas: !!est, data: new Date().toISOString() };
    try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch (e) {}
    return v;
  }
  function aplicar(v) {
    var pub = v && v.publicidade ? "granted" : "denied";
    var est = v && v.estatisticas ? "granted" : "denied";
    gtag("consent", "update", {
      ad_storage: pub, ad_user_data: pub, ad_personalization: pub, analytics_storage: est
    });
    if (pub === "denied") apagarCookiesAnuncios();
  }
  // Quem recusa depois de ter aceitado não fica com os cookies do Google Ads
  function apagarCookiesAnuncios() {
    var d = location.hostname.replace(/^www\./, "");
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (!/^_gcl_/.test(n)) return;
      ["", "; domain=" + d, "; domain=." + d].forEach(function (dom) {
        document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + dom;
      });
    });
  }

  var escolha = ler();
  if (escolha) aplicar(escolha);

  // 2. Etiqueta do Google (só com AW_ID preenchido)
  if (AW_ID) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(AW_ID);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", AW_ID);
  }

  // 3. Conversões
  function converter(tipo, extra) {
    window.dataLayer.push({ event: "al_conversao", al_tipo: tipo, al_pagina: location.pathname });
    var rotulo = CONVERSOES[tipo];
    if (AW_ID && rotulo) {
      var p = { send_to: AW_ID + "/" + rotulo };
      if (extra) for (var k in extra) p[k] = extra[k];
      gtag("event", "conversion", p);
    }
  }
  window.alConverter = converter;

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(h)) converter("whatsapp");
    else if (/^tel:/i.test(h)) converter("telefone");
  }, true);

  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || f.tagName !== "FORM") return;
    if (f.id === "verif-form") {
      var u = document.getElementById("verif-url");
      if (u && u.value.trim()) converter("verificador");
    } else {
      converter("formulario");
    }
  }, true);

  // 4. Aviso de cookies
  var CSS =
    ".ck{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:60;max-width:560px;margin:0 auto;background:#14161f;color:#ffffffcc;border-radius:1rem;padding:1.25rem 1.25rem 1.1rem;box-shadow:0 20px 50px -20px #000a;font:500 .9rem/1.5 var(--body,Arial,sans-serif)}" +
    ".ck[hidden]{display:none}" +
    ".ck h2{color:#fff;font:600 1.05rem/1.3 var(--head,Arial,sans-serif);letter-spacing:-.01em;margin:0 0 .35rem}" +
    ".ck a{color:#fff}" +
    ".ck-bts{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}" +
    ".ck-bts button{flex:1 1 9rem;font:600 .9rem/1.2 var(--body,Arial,sans-serif);padding:.75rem 1rem;border-radius:.625rem;border:1px solid #ffffff33;background:#ffffff14;color:#fff;cursor:pointer}" +
    ".ck-bts button:hover{background:#ffffff26}" +
    ".ck-bts .ck-sim,.ck-bts .ck-nao{background:#fff;color:#14161f;border-color:#fff}" +
    ".ck-bts .ck-sim:hover,.ck-bts .ck-nao:hover{background:#e3e7ef}" +
    ".ck-op{display:grid;gap:.6rem;margin-top:.9rem;padding-top:.9rem;border-top:1px solid #ffffff1f}" +
    ".ck-op[hidden]{display:none}" +
    ".ck-op label{display:flex;gap:.6rem;align-items:flex-start;cursor:pointer}" +
    ".ck-op input{margin-top:.25rem;width:1.05rem;height:1.05rem;accent-color:#1546ff;flex:none}" +
    ".ck-op b{color:#fff;font-weight:600}" +
    ".ck-link{background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:none;cursor:pointer;text-align:left}" +
    ".ck-link:hover{text-decoration:underline}" +
    "@media (max-width:520px){.ck{left:.5rem;right:.5rem;bottom:.5rem;padding:1rem}.ck-bts button{flex-basis:100%}}" +
    "body.ck-aberto .wa-float{bottom:calc(var(--ck-h,0px) + 1.5rem)}";

  var caixa;
  function montar() {
    if (caixa) return caixa;
    caixa = document.createElement("div");
    caixa.className = "ck";
    caixa.id = "cookies";
    caixa.setAttribute("role", "dialog");
    caixa.setAttribute("aria-live", "polite");
    caixa.setAttribute("aria-labelledby", "ck-t");
    caixa.hidden = true;
    caixa.innerHTML =
      '<h2 id="ck-t">Cookies neste site</h2>' +
      '<p>Usamos cookies do Google só se aceitar, para medir os contactos que chegam pelos anúncios e melhorar o site. Pode recusar sem perder nada. <a href="/politica-de-privacidade#cookies">Saber mais</a></p>' +
      '<div class="ck-op" hidden>' +
        '<label><input type="checkbox" id="ck-est"><span><b>Estatísticas</b><br>Contar visitas e cliques, sem o identificar.</span></label>' +
        '<label><input type="checkbox" id="ck-pub"><span><b>Publicidade</b><br>Saber que contactos vieram de anúncios do Google.</span></label>' +
      '</div>' +
      '<div class="ck-bts">' +
        '<button type="button" class="ck-nao">Recusar</button>' +
        '<button type="button" class="ck-sim">Aceitar</button>' +
        '<button type="button" class="ck-cfg">Escolher</button>' +
      '</div>';
    document.body.appendChild(caixa);

    var op = caixa.querySelector(".ck-op"), cfg = caixa.querySelector(".ck-cfg");
    var est = caixa.querySelector("#ck-est"), pub = caixa.querySelector("#ck-pub");
    caixa.querySelector(".ck-sim").addEventListener("click", function () { fechar(guardar(true, true)); });
    caixa.querySelector(".ck-nao").addEventListener("click", function () { fechar(guardar(false, false)); });
    cfg.addEventListener("click", function () {
      if (op.hidden) { op.hidden = false; cfg.textContent = "Guardar escolha"; est.focus(); }
      else fechar(guardar(pub.checked, est.checked));
    });
    return caixa;
  }
  function abrir() {
    montar();
    var v = ler();
    caixa.querySelector("#ck-est").checked = !!(v && v.estatisticas);
    caixa.querySelector("#ck-pub").checked = !!(v && v.publicidade);
    caixa.hidden = false;
    document.body.classList.add("ck-aberto");
    document.documentElement.style.setProperty("--ck-h", caixa.offsetHeight + "px");
  }
  function fechar(v) {
    aplicar(v);
    caixa.hidden = true;
    caixa.querySelector(".ck-op").hidden = true;
    caixa.querySelector(".ck-cfg").textContent = "Escolher";
    document.body.classList.remove("ck-aberto");
  }
  window.alCookies = abrir;

  function iniciar() {
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    // ligação «Definições de cookies» no rodapé, ao lado da política de privacidade
    var pol = document.querySelector('footer a[href="/politica-de-privacidade"]');
    if (pol && pol.parentNode && pol.parentNode.tagName === "LI") {
      var li = document.createElement("li");
      li.innerHTML = '<button type="button" class="ck-link">Definições de cookies</button>';
      pol.parentNode.parentNode.insertBefore(li, pol.parentNode.nextSibling);
      li.firstChild.addEventListener("click", abrir);
    }
    document.querySelectorAll("[data-cookies]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); abrir(); });
    });
    if (!ler()) abrir();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
