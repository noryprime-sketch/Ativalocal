(function(){
  var form=document.getElementById("verif-form"),campo=document.getElementById("verif-url"),res=document.getElementById("verif-res");
  if(!form)return;
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function wa(msg){return"https://wa.me/"+window.AL_WA+"?text="+encodeURIComponent(msg)}

  form.addEventListener("submit",function(e){
    e.preventDefault();
    var v=campo.value.trim();
    if(!v){campo.focus();return}
    var botao=form.querySelector("button");
    botao.disabled=true;botao.textContent="A verificar…";
    res.hidden=false;res.innerHTML='<p class="verif-load">A abrir o site e a fazer as verificações…</p>';
    res.scrollIntoView({behavior:"smooth",block:"start"});
    fetch("/api/verificar?url="+encodeURIComponent(v)).then(function(r){return r.json()}).then(function(d){
      if(d.erro){res.innerHTML='<p class="verif-erro">'+esc(d.erro)+'</p>';return}
      var grupos={};
      d.verificacoes.forEach(function(x){(grupos[x.grupo]=grupos[x.grupo]||[]).push(x)});
      var html='<div class="verif-top"><div><small>Site verificado</small><b>'+esc(d.endereco)+'</b></div>'+
        (d.falhas?'<span class="verif-nota mau">'+d.falhas+' '+(d.falhas==1?"ponto a rever":"pontos a rever")+'</span>'
                 :'<span class="verif-nota bom">Sem falhas nas verificações principais</span>')+'</div>';
      Object.keys(grupos).forEach(function(g){
        html+='<h2>'+esc(g)+'</h2><ul class="verif-itens">';
        grupos[g].forEach(function(x){
          var estado=x.ok?"ok":(x.aviso?"aviso":"falha");
          var rotulo=x.ok?"Encontrado":(x.aviso?"Recomendado":"Não encontrado");
          html+='<li class="'+estado+'"><span class="verif-ico" aria-hidden="true">'+(x.ok?"✓":(x.aviso?"!":"✕"))+'</span><div><b>'+esc(x.titulo)+
            '</b><span class="verif-rot">'+rotulo+'</span>'+(x.ok?"":'<p>'+esc(x.ajuda)+' <a href="'+esc(x.artigo)+'">Saber mais</a></p>')+
            (x.detalhe?'<p class="verif-det">'+esc(x.detalhe)+'</p>':"")+'</div></li>';
        });
        html+="</ul>";
      });
      var msg="Olá! Fiz a verificação do meu site ("+d.endereco+") e gostava de ajuda para corrigir o que falta.";
      html+='<div class="verif-cta"><p><b>Quer ajuda a corrigir?</b>Falamos consigo no WhatsApp e enviamos uma proposta gratuita.</p>'+
        '<a class="btn btn-blue" href="'+wa(msg)+'" target="_blank" rel="noopener">Falar no WhatsApp</a></div>'+
        '<p class="verif-legal">Verificação automática do código da página inicial. Alguns sites carregam o rodapé depois de a página abrir: se um ponto aparece como não encontrado mas o vê no seu site, confirme que está também no código da página inicial. Não substitui aconselhamento jurídico.</p>';
      res.innerHTML=html;
    }).catch(function(){
      res.innerHTML='<p class="verif-erro">Não foi possível fazer a verificação agora. Tente de novo dentro de momentos.</p>';
    }).then(function(){botao.disabled=false;botao.textContent="Verificar site"});
  });
})();
