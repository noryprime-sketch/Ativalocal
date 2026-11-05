/* Exemplos de cardápio (normal, com vídeo, em 3D) e de apps à medida. Nada carrega antes de estar à vista. */
(function(){
  var reduz=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lista=function(el,sel){return Array.prototype.slice.call(el.querySelectorAll(sel))};
  var aoVer=function(el,cb,margem){
    if(!("IntersectionObserver" in window)){cb(true);return}
    new IntersectionObserver(function(en){cb(en[0].isIntersecting)},{rootMargin:margem||"0px",threshold:.1}).observe(el);
  };
  var marcar=function(grupo,escolhido,atributo){grupo.forEach(function(b){b.setAttribute(atributo,b===escolhido?"true":"false")})};

  /* Cardápio normal: as secções da carta */
  var secoes=function(fone){
    var botoes=lista(fone,".cd-pills button"),listas=lista(fone,".cd-lista");
    botoes.forEach(function(b){b.addEventListener("click",function(){
      marcar(botoes,b,"aria-pressed");
      listas.forEach(function(l){l.hidden=l.getAttribute("data-sec")!==b.getAttribute("data-sec")});
    })});
  };

  /* Cardápio com vídeo: só carrega e toca enquanto está à vista */
  var video=function(fone){
    var v=fone.querySelector("video"),botoes=lista(fone,".cd-ths button"),aVista=false,posto=false;
    var nome=fone.querySelector(".cd-nome"),desc=fone.querySelector(".cd-desc"),alg=fone.querySelector(".cd-alg");
    var pede=function(){var p=v.play();if(p&&p.catch)p.catch(function(){})};
    var liga=function(){
      if(!posto){v.src=v.getAttribute("data-src");posto=true}
      if(!reduz)pede();
    };
    if(reduz)v.controls=true;
    aoVer(fone.querySelector(".cd-media"),function(ve){aVista=ve;if(ve)liga();else if(posto)v.pause()},"120px");
    botoes.forEach(function(b){b.addEventListener("click",function(){
      marcar(botoes,b,"aria-pressed");
      nome.textContent=b.getAttribute("data-nome");desc.textContent=b.getAttribute("data-desc");alg.textContent=b.getAttribute("data-alg");
      v.poster=b.getAttribute("data-cartaz");v.setAttribute("data-src",b.getAttribute("data-video"));
      posto=false;if(aVista)liga();
    })});
  };

  /* Cardápio em 3D: 41 fotogramas à volta do prato; o dedo escolhe qual se vê */
  var giro=function(fone){
    var N=41,LADO=600,PASTA="/assets/img/cardapios/3d/";
    var cv=fone.querySelector("canvas"),ctx=cv.getContext("2d"),cartaz=fone.querySelector(".cd-cartaz"),dica=fone.querySelector(".cd-dica");
    var botoes=lista(fone,".cd-ths button"),nome=fone.querySelector(".cd-nome"),desc=fone.querySelector(".cd-desc"),alg=fone.querySelector(".cd-alg");
    var pasta=cv.getAttribute("data-pasta"),fotos={},pos=.5,alvo=.5,fase=0,ve=false,raf=0,agarrado=false,xIni=0,alvoIni=0,mexeu=-1e4,visto=-1,sujo=true,antes=0;
    var url=function(p,i){return PASTA+p+"/"+("0"+(i+1)).slice(-2)+".webp"};
    var limita=function(x){return Math.max(0,Math.min(1,x))};
    var carrega=function(p){
      if(fotos[p])return;
      var l=fotos[p]=new Array(N),pede=function(i){
        if(l[i])return;
        var im=new Image();im.onload=function(){sujo=true};im.src=url(p,i);l[i]=im;
      },i;
      for(i=0;i<N;i+=5)pede(i); /* primeiro alguns, para rodar logo; depois os restantes */
      for(i=0;i<N;i++)pede(i);
    };
    var pinta=function(){
      var l=fotos[pasta],i=Math.round(pos*(N-1)),d,a,b;
      if(!l||(i===visto&&!sujo))return;
      for(d=0;d<N;d++){
        a=l[i-d];b=l[i+d];
        if(a&&a.complete&&a.naturalWidth){ctx.drawImage(a,0,0,LADO,LADO);break}
        if(b&&b.complete&&b.naturalWidth){ctx.drawImage(b,0,0,LADO,LADO);break}
      }
      visto=i;sujo=false;
      cv.setAttribute("aria-valuenow",Math.round(pos*100));
    };
    var passo=function(t){
      if(!ve){raf=0;return}
      raf=requestAnimationFrame(passo);
      var dt=Math.min(t-antes,50);antes=t;
      if(!agarrado&&!reduz&&t-mexeu>2600){fase+=dt*2*Math.PI/8000;alvo=(Math.sin(fase)+1)/2}
      pos+=(alvo-pos)*.2;
      pinta();
    };
    var anda=function(){if(!raf&&ve){antes=performance.now();raf=requestAnimationFrame(passo)}};
    aoVer(cv,function(v){ve=v;if(v){carrega(pasta);anda()}},"200px");
    var tocou=function(){mexeu=performance.now();dica.classList.add("fora")};
    cv.addEventListener("pointerdown",function(e){
      agarrado=true;xIni=e.clientX;alvoIni=alvo;tocou();cv.classList.add("agarra");
      if(cv.setPointerCapture)cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove",function(e){if(agarrado)alvo=limita(alvoIni+(e.clientX-xIni)/cv.clientWidth*1.15)});
    var solta=function(){
      if(!agarrado)return;
      agarrado=false;cv.classList.remove("agarra");tocou();fase=Math.asin(alvo*2-1);
    };
    cv.addEventListener("pointerup",solta);
    cv.addEventListener("pointercancel",solta);
    cv.addEventListener("keydown",function(e){
      var d=e.key==="ArrowRight"?.06:e.key==="ArrowLeft"?-.06:0;
      if(!d)return;
      e.preventDefault();alvo=limita(alvo+d);tocou();fase=Math.asin(alvo*2-1);
    });
    botoes.forEach(function(b){b.addEventListener("click",function(){
      marcar(botoes,b,"aria-pressed");
      pasta=b.getAttribute("data-pasta");
      nome.textContent=b.getAttribute("data-nome");desc.textContent=b.getAttribute("data-desc");alg.textContent=b.getAttribute("data-alg");
      ctx.clearRect(0,0,LADO,LADO);cartaz.src=url(pasta,Math.round(pos*(N-1)));
      visto=-1;sujo=true;carrega(pasta);
    })});
  };

  /* Separadores do telemóvel; o painel abre no vídeo, que é o que mais se nota */
  lista(document,".cd").forEach(function(cd){
    var abas=lista(cd,".cd-tabs button"),fones=lista(cd,".cd-fone");
    var mostra=function(tipo){
      abas.forEach(function(a){
        var sim=a.getAttribute("data-tipo")===tipo;
        a.setAttribute("aria-selected",sim?"true":"false");a.tabIndex=sim?0:-1;
      });
      fones.forEach(function(f){f.classList.toggle("on",f.getAttribute("data-tipo")===tipo)});
    };
    abas.forEach(function(a,i){
      a.addEventListener("click",function(){mostra(a.getAttribute("data-tipo"))});
      a.addEventListener("keydown",function(e){
        var d=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0;
        if(!d)return;
        e.preventDefault();
        var o=abas[(i+d+abas.length)%abas.length];mostra(o.getAttribute("data-tipo"));o.focus();
      });
    });
    mostra("video");
    fones.forEach(function(f){
      var t=f.getAttribute("data-tipo");
      if(t==="normal")secoes(f);else if(t==="video")video(f);else if(t==="d3")giro(f);
    });
  });

  /* Apps à medida: o mesmo telemóvel para vários negócios */
  var APPS={
    oficina:{real:1,cor:"#FF5733",topo:"#0A1C2D",ic:1,nome:"TorqueOne",sub:"Feita por nós · dados de exemplo",tit:"Folhas de obra",nums:[["3","Em curso"],["2","Prontos"]],linhas:[["Renault Clio","Revisão","Em curso"],["Seat Ibiza","Travões","Falta peça"],["Peugeot 208","Diagnóstico","Pronto"],["Fiat 500","Pneus","Por aprovar"]],bt:"Nova folha de obra"},
    clinica:{cor:"#0b7f76",l:"C",nome:"Clínica Exemplo",tit:"Consultas de hoje",nums:[["8","Marcadas"],["2","Por confirmar"]],linhas:[["09:30 · Ana R.","Consulta","Confirmada"],["11:00 · João M.","Limpeza","Confirmada"],["15:00 · Rita S.","Avaliação","Por confirmar"],["16:30 · Pedro L.","Consulta","Confirmada"]],bt:"Nova marcação"},
    restaurante:{cor:"#b4532a",l:"R",nome:"Restaurante Exemplo",tit:"Pedidos",nums:[["5","A preparar"],["3","Para levar"]],linhas:[["Mesa 4","2 pratos","A preparar"],["Mesa 7","4 pratos","Servido"],["Para levar","Rui S.","Pronto"],["Mesa 2","3 pratos","A preparar"]],bt:"Novo pedido"},
    barbearia:{cor:"#14161f",l:"B",nome:"Barbearia Exemplo",tit:"Agenda de hoje",nums:[["12","Marcações"],["3","Barbeiros"]],linhas:[["10:00 · Tiago","Corte e barba","Confirmada"],["10:45 · Miguel","Corte","Confirmada"],["11:30 · André","Barba","Por confirmar"],["12:15 · Rui","Corte","Confirmada"]],bt:"Nova marcação"},
    obras:{cor:"#a15c00",l:"O",nome:"Obras Exemplo",tit:"Obras em curso",nums:[["4","Em curso"],["2","Orçamentos"]],linhas:[["Cozinha","Remodelação","60 %"],["Casa de banho","Remodelação","30 %"],["Fachada","Pintura","Orçamento"],["Telhado","Reparação","Por começar"]],bt:"Novo orçamento"},
    loja:{cor:"#6d3bd1",l:"L",nome:"Loja Exemplo",tit:"Encomendas",nums:[["6","Para enviar"],["2","Para recolher"]],linhas:[["N.º 1048","2 artigos","Paga"],["N.º 1049","1 artigo","Enviada"],["N.º 1050","3 artigos","Entregue"],["N.º 1051","1 artigo","Paga"]],bt:"Nova encomenda"}
  };
  var SEMANA=[42,64,50,86,60,100,34];
  var ap=document.querySelector(".ap-palco");
  if(ap){
    var botoes=lista(ap,".ap-tipos button"),ecra=ap.querySelector(".ap-ecra"),corpo=ap.querySelector(".ap-corpo");
    var campo=function(n){return ap.querySelector("[data-ap="+n+"]")},preso=false,vendo=false,atual=0,relogio=0;
    /* Gravação da app no exemplo Oficina: só toca com o exemplo escolhido e a secção à vista */
    var gravacao=ap.querySelector(".ap-grava video"),posta=false;
    var dados=function(i){return APPS[botoes[i].getAttribute("data-app")]};
    var toca=function(){
      if(!posta)return;
      if(vendo&&!document.hidden&&dados(atual).real){var p=gravacao.play();if(p&&p.catch)p.catch(function(){})}
      else gravacao.pause();
    };
    var escreve=function(d,i){
      ecra.classList.toggle("ap-real",!!d.real);
      ecra.style.setProperty("--cor",d.cor);ecra.style.setProperty("--topo",d.topo||d.cor);
      var lg=campo("logo");lg.textContent=d.ic?"":d.l;lg.classList.toggle("ic-t",!!d.ic);
      campo("nome").textContent=d.nome;campo("sub").textContent=d.sub||"Exemplo ilustrativo";campo("tit").textContent=d.tit;campo("bt").textContent=d.bt;
      lista(campo("nums"),"div").forEach(function(c,i){c.children[0].textContent=d.nums[i][0];c.children[1].textContent=d.nums[i][1]});
      lista(campo("sem"),"i").forEach(function(c,k){c.style.height=SEMANA[(k+i*2)%7]+"%"});
      lista(campo("lista"),"li").forEach(function(c,i){c.children[0].textContent=d.linhas[i][0];c.children[1].textContent=d.linhas[i][1];c.children[2].textContent=d.linhas[i][2]});
    };
    var mostra=function(i){
      atual=i;marcar(botoes,botoes[i],"aria-pressed");
      var d=dados(i);
      if(posta&&d.real)gravacao.currentTime=0;
      toca();
      if(reduz){escreve(d,i);return}
      corpo.classList.add("troca");
      setTimeout(function(){escreve(d,i);corpo.classList.remove("troca")},200);
    };
    /* Passa ao exemplo seguinte: na Oficina depois de uma volta inteira ao vídeo, nos outros ao fim de 3,4 s */
    var seguinte=function(){
      clearTimeout(relogio);
      if(!vendo||preso)return;
      var vai=dados(atual).real&&posta&&!gravacao.paused&&gravacao.duration;
      relogio=setTimeout(function(){if(vendo&&!document.hidden)mostra((atual+1)%botoes.length);seguinte()},vai?(gravacao.duration-gravacao.currentTime)*1000:3400);
    };
    botoes.forEach(function(b,i){b.addEventListener("click",function(){preso=true;clearTimeout(relogio);mostra(i)})});
    if(!reduz){
      aoVer(ap,function(v){vendo=v;toca();seguinte()});
      document.addEventListener("visibilitychange",function(){toca();seguinte()});
      if(!(navigator.connection&&navigator.connection.saveData))aoVer(ap,function(v){
        if(!v||posta)return;
        posta=true;
        ["mp4","webm"].forEach(function(t){var s=document.createElement("source");s.src=gravacao.getAttribute("data-"+t);s.type="video/"+t;gravacao.appendChild(s)});
        gravacao.preload="auto";gravacao.addEventListener("loadedmetadata",seguinte);gravacao.load();toca();
      },"400px");
    }
  }
})();
