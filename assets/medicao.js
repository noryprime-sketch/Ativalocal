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

  // Quem chega de um anúncio do Google (gclid no endereço; gbraid e wbraid no iPhone) diz que veio do anúncio.
  // Os botões do /menu-digital e do /criacao-de-sites trazem no HTML o texto de quem chega por outro caminho.
  function textoDeAnuncio(t) {
    if (t === "Olá! Queria saber mais sobre o menu digital.") return "Olá! Vi o vosso anúncio do menu digital e queria saber mais.";
    if (t === "Olá! Queria um orçamento para um site.") return "Olá! Vi o vosso anúncio sobre a criação de sites e queria um orçamento.";
    var m = /^Olá! Queria um orçamento (para o plano \S+\.)$/.exec(t);
    return m ? "Olá! Vi o vosso anúncio sobre a criação de sites e queria um orçamento " + m[1] : null;
  }
  function trocarTextosWhatsApp() {
    if (!/[?&](gclid|gbraid|wbraid)=/.test(location.search)) return;
    document.querySelectorAll('a[href^="https://wa.me/"]').forEach(function (a) {
      var u = new URL(a.href), novo = textoDeAnuncio(u.searchParams.get("text"));
      if (novo) a.href = u.origin + u.pathname + "?text=" + encodeURIComponent(novo);
    });
  }

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

  // 4. Aviso de cookies (na língua da página: pt, en ou fr)
  var LINGUA = (document.documentElement.lang || "pt").slice(0, 2);
  var TEXTOS = {
    pt: { titulo: "Cookies neste site", texto: "Usamos cookies do Google só se aceitar, para medir os contactos que chegam pelos anúncios e melhorar o site. Pode recusar sem perder nada.", saber: "Saber mais", politica: "/politica-de-privacidade",
          est: "Estatísticas", estTxt: "Contar visitas e cliques, sem o identificar.", pub: "Publicidade", pubTxt: "Saber que contactos vieram de anúncios do Google.",
          nao: "Recusar", sim: "Aceitar", cfg: "Escolher", guardar: "Guardar escolha", definicoes: "Definições de cookies" },
    en: { titulo: "Cookies on this site", texto: "We only use Google cookies if you accept, to measure the enquiries that come from our ads and improve the site. You can decline and lose nothing.", saber: "Learn more", politica: "/en/privacy-policy",
          est: "Statistics", estTxt: "Count visits and clicks, without identifying you.", pub: "Advertising", pubTxt: "Know which enquiries came from Google ads.",
          nao: "Decline", sim: "Accept", cfg: "Choose", guardar: "Save choice", definicoes: "Cookie settings" },
    fr: { titulo: "Cookies sur ce site", texto: "Nous n'utilisons les cookies de Google que si vous acceptez, pour mesurer les contacts venus de nos annonces et améliorer le site. Vous pouvez refuser sans rien perdre.", saber: "En savoir plus", politica: "/fr/politique-de-confidentialite",
          est: "Statistiques", estTxt: "Compter les visites et les clics, sans vous identifier.", pub: "Publicité", pubTxt: "Savoir quels contacts sont venus des annonces Google.",
          nao: "Refuser", sim: "Accepter", cfg: "Choisir", guardar: "Enregistrer mon choix", definicoes: "Paramètres des cookies" }
  };
  var T = TEXTOS[LINGUA] || TEXTOS.pt;

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
    "body.ck-aberto .wa-float{bottom:calc(var(--ck-h,0px) + 1.5rem)}" +
    // No telemóvel, o WhatsApp flutuante por cima do aviso caía no título e no texto do topo.
    // Com o aviso aberto, encaixa no canto de cima do próprio aviso, ao lado do título, que lhe guarda o lugar.
    "@media (max-width:520px){.ck h2{min-height:3rem;padding-right:3.75rem;display:flex;align-items:center}" +
    "body.ck-aberto .wa-float{z-index:61;right:1.25rem;bottom:calc(var(--ck-h,0px) - .25rem - 52px)}}";

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
      '<h2 id="ck-t">' + T.titulo + '</h2>' +
      '<p>' + T.texto + ' <a href="' + T.politica + '#cookies">' + T.saber + '</a></p>' +
      '<div class="ck-op" hidden>' +
        '<label><input type="checkbox" id="ck-est"><span><b>' + T.est + '</b><br>' + T.estTxt + '</span></label>' +
        '<label><input type="checkbox" id="ck-pub"><span><b>' + T.pub + '</b><br>' + T.pubTxt + '</span></label>' +
      '</div>' +
      '<div class="ck-bts">' +
        '<button type="button" class="ck-nao">' + T.nao + '</button>' +
        '<button type="button" class="ck-sim">' + T.sim + '</button>' +
        '<button type="button" class="ck-cfg">' + T.cfg + '</button>' +
      '</div>';
    document.body.appendChild(caixa);

    var op = caixa.querySelector(".ck-op"), cfg = caixa.querySelector(".ck-cfg");
    var est = caixa.querySelector("#ck-est"), pub = caixa.querySelector("#ck-pub");
    // a altura do aviso muda com «Escolher» e ao rodar o telemóvel: o WhatsApp acompanha-a
    if (window.ResizeObserver) new ResizeObserver(function () {
      if (!caixa.hidden) document.documentElement.style.setProperty("--ck-h", caixa.offsetHeight + "px");
    }).observe(caixa);
    caixa.querySelector(".ck-sim").addEventListener("click", function () { fechar(guardar(true, true)); });
    caixa.querySelector(".ck-nao").addEventListener("click", function () { fechar(guardar(false, false)); });
    cfg.addEventListener("click", function () {
      if (op.hidden) { op.hidden = false; cfg.textContent = T.guardar; est.focus(); }
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
    caixa.querySelector(".ck-cfg").textContent = T.cfg;
    document.body.classList.remove("ck-aberto");
  }
  window.alCookies = abrir;

  function iniciar() {
    trocarTextosWhatsApp();
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    // ligação «Definições de cookies» no rodapé, ao lado da política de privacidade
    var pol = document.querySelector('footer a[href="' + T.politica + '"]');
    if (pol && pol.parentNode && pol.parentNode.tagName === "LI") {
      var li = document.createElement("li");
      li.innerHTML = '<button type="button" class="ck-link">' + T.definicoes + '</button>';
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
