# Ativa Local: site

Código de <https://www.ativalocal.com>. HTML, CSS e JS puros, sem build.

**Este repositório é a única cópia oficial do site.** O ramo `main` é o que está no ar: cada `git push` para `main` publica sozinho na Vercel, em cerca de um minuto.

## Como trabalhar

```bash
git pull                              # sempre antes de começar
# editar
git add -A
git commit -m "o que mudou"
git pull --rebase                     # traz o que o outro publicou entretanto
git push                              # publica
```

Se o `git push` for recusado, é porque o outro publicou primeiro. É assim que o trabalho de cada um fica protegido: corre `git pull --rebase` e depois `git push` outra vez.

## Nunca

- **`vercel deploy` ou `vercel --prod`.** Publicam a pasta de quem corre o comando por cima de tudo o que está no ar. Foi assim que o site perdeu páginas a 06-11-2026.
- **`git push --force`.** Apaga o trabalho do outro.
- **Editar uma cópia antiga ou descarregada.** Trabalha só numa pasta clonada daqui.
- **Pôr segredos aqui.** O repositório é público: nada de chaves, palavras-passe ou dados de clientes.

## Configuração, uma vez em cada computador

```bash
git clone https://github.com/noryprime-sketch/Ativalocal.git
cd Ativalocal
git config user.email noryprime@gmail.com
```

O autor do commit tem de ser `noryprime@gmail.com`. Com outro e-mail a Vercel não publica, e o erro passa despercebido.

## Regras do site

- **Preços:** nunca no site nem nos anúncios. O preço é à medida de cada cliente.
- **Demos:** os endereços em `demo.ativalocal.com` nunca mudam, porque já foram enviados a clientes.
- **Partes repetidas:** o cabeçalho e o rodapé estão escritos em cada página. Uma mudança partilhada mexe em todas.
- **`?v=` dos assets:** se mudares `assets/site.css`, `assets/site.js` ou `assets/verificador.js`, atualiza o `?v=` em todas as páginas. O valor são os 10 primeiros caracteres de:

  ```bash
  cat assets/site.css assets/site.js assets/verificador.js | shasum | cut -c1-10
  ```

- **Fins de linha:** quase todas as páginas usam CRLF; `criacao-de-sites.html` e `menu-digital.html` usam LF. Mantém o que cada ficheiro já tem.
