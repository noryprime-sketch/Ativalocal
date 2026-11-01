(function(){
  var nav=document.getElementById("nav"),btn=nav&&nav.querySelector(".menu-btn");
  if(btn){
    btn.addEventListener("click",function(){
      var open=nav.classList.toggle("open");
      btn.setAttribute("aria-expanded",open);
      btn.setAttribute("aria-label",open?"Fechar menu":"Abrir menu");
    });
    nav.querySelectorAll(".nav-links a").forEach(function(a){a.addEventListener("click",function(){nav.classList.remove("open");btn.setAttribute("aria-expanded","false")})});
  }

  var sw=document.getElementById("modo"),lista=document.getElementById("planos-lista");
  if(sw&&lista){
    sw.addEventListener("click",function(){
      var mensal=sw.getAttribute("aria-checked")!=="true";
      sw.setAttribute("aria-checked",mensal);
      lista.setAttribute("data-mode",mensal?"mensal":"unico");
      document.getElementById("l-mensal").classList.toggle("on",mensal);
      document.getElementById("l-unico").classList.toggle("on",!mensal);
    });
  }

  var fils=document.querySelectorAll(".fil");
  fils.forEach(function(f){f.addEventListener("click",function(){
    var cat=f.getAttribute("data-cat");
    fils.forEach(function(x){x.classList.toggle("on",x===f)});
    document.querySelectorAll(".post-card[data-cat]").forEach(function(c){c.hidden=!!cat&&c.getAttribute("data-cat")!==cat});
  })});

  var reduz=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // o vídeo de fundo só carrega depois da página: não compete com o texto e as fontes
  var v=document.querySelector(".hero-bg video");
  if(v&&!reduz){
    var arrancar=function(){var s=v.querySelector("source[data-src]");if(!s)return;s.src=s.getAttribute("data-src");s.removeAttribute("data-src");v.load();var p=v.play();if(p&&p.catch)p.catch(function(){})};
    if(document.readyState==="complete")setTimeout(arrancar,300);else window.addEventListener("load",function(){setTimeout(arrancar,300)});
  }

  // imagens do carrossel: diferidas para não atrasar o título; depois do load carregam todas (as que estão fora do ecrã não podem esperar pela vez delas)
  var soltar=function(){document.querySelectorAll(".reel img[loading=lazy]").forEach(function(i){i.loading="eager"})};
  if(document.readyState==="complete")soltar();else window.addEventListener("load",soltar);
  var reel=document.querySelector(".reel");
  if(reel&&"IntersectionObserver" in window){
    new IntersectionObserver(function(en){reel.classList.toggle("parado",!en[0].isIntersecting)}).observe(reel);
  }

  var els=document.querySelectorAll(".rv");
  if(reduz||!("IntersectionObserver" in window)){els.forEach(function(e){e.classList.add("in")});return}
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting)return;
      var el=en.target,irmaos=el.parentElement?[].slice.call(el.parentElement.children).filter(function(c){return c.classList.contains("rv")}):[];
      el.style.transitionDelay=Math.min(irmaos.indexOf(el),5)*70+"ms";
      el.classList.add("in");io.unobserve(el);
    });
  },{rootMargin:"0px 0px -8% 0px",threshold:.08});
  els.forEach(function(e){io.observe(e)});
})();
