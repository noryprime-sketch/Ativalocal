/* Ativa Local em português, inglês e francês (decisão do Marx de 18-11-2026).
   O português é a fonte: as páginas em /en e /fr geram-se a partir dele com os dicionários de i18n/en e i18n/fr.
   Corre-se com: node --test i18n/construir.test.mjs   (o teste gera as páginas e confere tudo)
   Nunca editar à mão as pastas en/ e fr/: mudar o português ou o dicionário e voltar a gerar. */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";

export const DOMINIO = "https://www.ativalocal.com";
export const LINGUAS = ["en", "fr"];
const HREFLANG = { pt: "pt-PT", en: "en", fr: "fr" };
const OG_LOCALE = { pt: "pt_PT", en: "en_GB", fr: "fr_FR" };
const NOME_LINGUA = { pt: "Português", en: "English", fr: "Français" };
const ROTULO_SELETOR = { pt: "Língua", en: "Language", fr: "Langue" };

/* Páginas traduzidas: caminho em português → caminho em cada língua. "" é a página inicial. */
export const PAGINAS = {
  "": { en: "", fr: "" },
  "criacao-de-sites": { en: "website-design", fr: "creation-de-sites" },
  "menu-digital": { en: "digital-menu", fr: "menu-digital" },
  "servicos": { en: "services", fr: "services" },
  "servicos/lojas-online": { en: "services/online-stores", fr: "services/boutiques-en-ligne" },
  "servicos/seo-local": { en: "services/local-seo", fr: "services/seo-local" },
  "servicos/sistemas-de-marcacoes": { en: "services/booking-systems", fr: "services/systemes-de-reservation" },
  "setores": { en: "industries", fr: "secteurs" },
  "setores/restaurantes": { en: "industries/restaurants", fr: "secteurs/restaurants" },
  "setores/clinicas-dentarias": { en: "industries/dental-clinics", fr: "secteurs/cliniques-dentaires" },
  "setores/oficinas": { en: "industries/car-repair-garages", fr: "secteurs/garages-automobiles" },
  "setores/cabeleireiros-e-barbearias": { en: "industries/hair-salons-and-barbershops", fr: "secteurs/coiffeurs-et-barbiers" },
  "setores/construcao-e-remodelacoes": { en: "industries/construction-and-renovation", fr: "secteurs/construction-et-renovation" },
  "setores/alojamento-local": { en: "industries/holiday-rentals", fr: "secteurs/locations-saisonnieres" },
  "sobre": { en: "about", fr: "a-propos" },
  "politica-de-privacidade": { en: "privacy-policy", fr: "politique-de-confidentialite" },
};

const INLINE = new Set(["a", "strong", "em", "b", "i", "span", "br", "u", "small", "mark", "sup", "sub", "abbr", "time", "code", "s", "q", "cite", "wbr"]);
const RAW = new Set(["script", "style"]);
const ATRIBUTOS = ["alt", "title", "aria-label", "placeholder", "data-nome", "data-desc", "data-alg", "label"];
const META_TEXTO = /^(description|og:title|og:description|og:image:alt|twitter:title|twitter:description|twitter:image:alt)$/;
const JSON_TEXTO = new Set(["name", "description", "text", "serviceType", "headline", "alternateName", "slogan", "category", "jobTitle", "knowsAbout", "abstract"]);

const temLetras = (s) => /\p{L}/u.test(s);
export const normalizar = (s) => s.replace(/\s+/g, " ").trim();

/* ---------- leitura do HTML em pedaços ---------- */
export function pedacos(html) {
  const out = [];
  let i = 0;
  while (i < html.length) {
    if (html.startsWith("<!--", i)) {
      const f = html.indexOf("-->", i);
      const fim = f < 0 ? html.length : f + 3;
      out.push({ tipo: "outro", raw: html.slice(i, fim) });
      i = fim;
      continue;
    }
    if (html[i] === "<" && /[a-zA-Z\/!]/.test(html[i + 1] || "")) {
      let j = i + 1, aspas = null;
      while (j < html.length) {
        const c = html[j];
        if (aspas) { if (c === aspas) aspas = null; }
        else if (c === '"' || c === "'") aspas = c;
        else if (c === ">") break;
        j++;
      }
      const raw = html.slice(i, j + 1);
      const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/.exec(raw);
      if (!m) { out.push({ tipo: "outro", raw }); i = j + 1; continue; }
      const nome = m[2].toLowerCase();
      const t = { tipo: "tag", raw, nome, fecho: m[1] === "/" };
      out.push(t);
      i = j + 1;
      if (!t.fecho && RAW.has(nome)) {
        const f = html.toLowerCase().indexOf("</" + nome, i);
        const fim = f < 0 ? html.length : f;
        out.push({ tipo: "raw", raw: html.slice(i, fim), dono: t });
        i = fim;
      }
      continue;
    }
    let j = html.indexOf("<", i + 1);
    while (j >= 0 && !/[a-zA-Z\/!]/.test(html[j + 1] || "")) j = html.indexOf("<", j + 1);
    if (j < 0) j = html.length;
    out.push({ tipo: "texto", raw: html.slice(i, j) });
    i = j;
  }
  return out;
}

export function atributos(raw) {
  const r = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  const corpo = raw.replace(/^<\/?[a-zA-Z0-9-]+/, "").replace(/\/?>$/, "");
  let m;
  while ((m = re.exec(corpo))) r[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  return r;
}

function trocarAtributo(raw, nome, valor) {
  const re = new RegExp(`(\\s${nome.replace(/[-:]/g, "\\$&")}\\s*=\\s*)("[^"]*"|'[^']*')`, "i");
  return raw.replace(re, (_, a) => `${a}"${valor.replace(/"/g, "&quot;")}"`);
}

/* ---------- segmentos de texto (com as etiquetas em linha como {1}, {2}…) ---------- */
function segmentar(lista) {
  // devolve [{raw}|{seg:{chave, tags[], antes, depois}}]
  const out = [];
  let buf = [];
  const despejar = () => {
    if (!buf.length) return;
    const temTexto = buf.some((p) => p.tipo === "texto" && temLetras(p.raw));
    if (!temTexto) { buf.forEach((p) => out.push({ raw: p.raw, p })); buf = []; return; }
    // tira etiquetas e espaços das pontas
    let a = 0, b = buf.length - 1;
    const vazio = (p) => p.tipo === "tag" || (p.tipo === "texto" && !p.raw.trim());
    while (a <= b && vazio(buf[a])) a++;
    while (b >= a && vazio(buf[b])) b--;
    buf.slice(0, a).forEach((p) => out.push({ raw: p.raw, p }));
    const meio = buf.slice(a, b + 1);
    let texto = "", tags = [];
    for (const p of meio) {
      if (p.tipo === "tag") { tags.push(p.raw); texto += `{${tags.length}}`; }
      else texto += p.raw;
    }
    const antes = texto.match(/^\s*/)[0], depois = texto.match(/\s*$/)[0];
    out.push({ seg: { chave: normalizar(texto), tags, antes, depois } });
    buf.slice(b + 1).forEach((p) => out.push({ raw: p.raw, p }));
    buf = [];
  };
  for (const p of lista) {
    if (p.tipo === "texto" || (p.tipo === "tag" && INLINE.has(p.nome))) buf.push(p);
    else { despejar(); out.push({ raw: p.raw, p }); }
  }
  despejar();
  return out;
}

/* ---------- dicionários ---------- */
export function lerDicionario(raiz, lingua) {
  const pasta = join(raiz, "i18n", lingua);
  const d = new Map();
  if (!existsSync(pasta)) return d;
  for (const f of readdirSync(pasta).filter((x) => x.endsWith(".json")).sort()) {
    const obj = JSON.parse(readFileSync(join(pasta, f), "utf8"));
    for (const [k, v] of Object.entries(obj)) d.set(normalizar(k), v);
  }
  return d;
}

/* ---------- endereços ---------- */
export function urlDe(caminho, lingua) {
  const c = lingua === "pt" ? caminho : PAGINAS[caminho][lingua];
  const base = lingua === "pt" ? "" : "/" + lingua;
  if (!c) return DOMINIO + (base || "/");
  return DOMINIO + base + "/" + c;
}
function caminhoLocal(caminho, lingua) {
  return urlDe(caminho, lingua).slice(DOMINIO.length);
}

export function mapearUrl(url, lingua, chave) {
  let abs = false, u = url;
  if (u.startsWith(DOMINIO)) { abs = true; u = u.slice(DOMINIO.length) || "/"; }
  if (!u.startsWith("/") || u.startsWith("//")) return url;
  const m = /^([^?#]*)([?#].*)?$/.exec(u);
  const caminho = m[1].replace(/^\/+|\/+$/g, "").replace(/\.html$/, "").replace(/^index$/, "");
  const resto = m[2] || "";
  if (!(caminho in PAGINAS)) return url;
  if (abs && caminho === "" && chave !== "item" && (resto === "" || resto === "#organizacao" || resto === "#site")) return url;
  const novo = caminhoLocal(caminho, lingua);
  return (abs ? DOMINIO : "") + novo + resto;
}

/* ---------- tradução de uma página ---------- */
export function traduzir(html, caminho, lingua, dic, falta) {
  const pedir = (chave, onde) => {
    const k = normalizar(chave);
    if (!temLetras(k.replace(/\{\d+\}/g, ""))) return chave;
    if (dic.has(k)) return dic.get(k);
    if (!falta.has(k)) falta.set(k, onde);
    return chave;
  };
  html = html.replace(/<nav class="lang"[\s\S]*?<\/nav>/, "");
  const partes = segmentar(pedacos(html));
  let out = "";
  for (const parte of partes) {
    if (parte.seg) {
      const { chave, tags, antes, depois } = parte.seg;
      let t = pedir(chave, caminho);
      const usados = new Set();
      t = t.replace(/\{(\d+)\}/g, (_, n) => { usados.add(+n); return mapearTag(tags[n - 1] ?? "", lingua, pedir, caminho); });
      if (dic.has(chave) && usados.size !== tags.length) falta.set(chave, caminho + " (etiquetas {n} diferentes na tradução)");
      out += antes + t + depois;
      continue;
    }
    const p = parte.p;
    if (p && p.tipo === "tag") out += mapearTag(p.raw, lingua, pedir, caminho);
    else if (p && p.tipo === "raw" && p.dono && /application\/ld\+json/i.test(p.dono.raw)) out += traduzirJson(p.raw, lingua, pedir, caminho);
    else out += parte.raw;
  }
  return cabecalho(out, caminho, lingua);
}

function mapearTag(raw, lingua, pedir, caminho) {
  if (!raw || raw.startsWith("</")) return raw;
  const at = atributos(raw);
  let r = raw;
  for (const nome of ATRIBUTOS) {
    if (at[nome] && temLetras(at[nome])) r = trocarAtributo(r, nome, pedir(at[nome], caminho + " [" + nome + "]"));
  }
  if (/^<meta/i.test(raw)) {
    const qual = at.name || at.property || "";
    if (META_TEXTO.test(qual) && at.content) r = trocarAtributo(r, "content", pedir(at.content, caminho + " [" + qual + "]"));
    if (qual === "og:url") r = trocarAtributo(r, "content", mapearUrl(at.content, lingua));
    if (qual === "og:locale") r = trocarAtributo(r, "content", OG_LOCALE[lingua]);
  }
  if (at.href !== undefined) {
    let h = at.href;
    const wa = /^https:\/\/wa\.me\/(\d+)\?text=(.*)$/.exec(h);
    if (wa) {
      const txt = decodeURIComponent(wa[2]);
      h = `https://wa.me/${wa[1]}?text=` + encodeURIComponent(pedir(txt, caminho + " [whatsapp]")).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
    } else h = mapearUrl(h, lingua);
    if (h !== at.href) r = trocarAtributo(r, "href", h);
  }
  return r;
}

function traduzirJson(txt, lingua, pedir, caminho) {
  const dados = JSON.parse(txt);
  const andar = (v, chave) => {
    if (Array.isArray(v)) return v.map((x) => andar(x, chave));
    if (v && typeof v === "object") {
      const o = {};
      for (const [k, x] of Object.entries(v)) o[k] = andar(x, k);
      return o;
    }
    if (typeof v !== "string") return v;
    if (chave === "inLanguage") return HREFLANG[lingua];
    if (/^(url|@id|item)$/.test(chave)) return mapearUrl(v, lingua, chave);
    if (JSON_TEXTO.has(chave) && temLetras(v)) return pedir(v, caminho + " [json " + chave + "]");
    return v;
  };
  return JSON.stringify(andar(dados));
}

/* <html lang>, canonical e hreflang */
function blocoAlternativas(caminho, eol) {
  const linhas = [];
  for (const l of ["pt", ...LINGUAS]) linhas.push(`<link rel="alternate" hreflang="${HREFLANG[l]}" href="${urlDe(caminho, l)}">`);
  linhas.push(`<link rel="alternate" hreflang="x-default" href="${urlDe(caminho, "pt")}">`);
  return linhas.join(eol);
}
function cabecalho(html, caminho, lingua) {
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${HREFLANG[lingua]}"`);
  html = html.replace(/[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\r?\n/g, "");
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${urlDe(caminho, lingua)}">${eol}${blocoAlternativas(caminho, eol)}`);
  html = html.replace(/[ \t]*<meta property="og:locale:alternate" content="[^"]*">\r?\n/g, "");
  html = html.replace(/(<meta property="og:locale" content="[^"]*">)/, (m) => m + eol + ["pt", ...LINGUAS].filter((l) => l !== lingua).map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`).join(eol));
  return seletor(html, caminho, lingua);
}

/* seletor de língua: no topo, antes do botão do WhatsApp */
export function seletor(html, caminho, lingua, ptAtual) {
  html = html.replace(/<nav class="lang"[\s\S]*?<\/nav>/, "");
  const ligacoes = ["pt", ...LINGUAS].map((l) => {
    // página sem tradução (blogue, verificador): PT fica nela, EN e FR levam à página inicial dessa língua
    const destino = caminho === null ? (l === "pt" ? ptAtual : caminhoLocal("", l)) : caminhoLocal(caminho, l);
    const atual = l === lingua ? ' aria-current="true"' : "";
    return `<a href="${destino}" hreflang="${HREFLANG[l]}" lang="${HREFLANG[l]}"${atual} title="${NOME_LINGUA[l]}">${l.toUpperCase()}</a>`;
  }).join("");
  return html.replace(/(<div class="nav-right">)/, `$1<nav class="lang" aria-label="${ROTULO_SELETOR[lingua]}">${ligacoes}</nav>`);
}

/* ---------- construir tudo ---------- */
export function construir(raiz, { escrever = true } = {}) {
  const falta = { en: new Map(), fr: new Map() };
  const gerados = [];
  const dics = Object.fromEntries(LINGUAS.map((l) => [l, lerDicionario(raiz, l)]));
  const ficheiroPt = (c) => join(raiz, (c || "index") + ".html");

  for (const caminho of Object.keys(PAGINAS)) {
    const pt = readFileSync(ficheiroPt(caminho), "utf8");
    for (const l of LINGUAS) {
      const html = traduzir(pt, caminho, l, dics[l], falta[l]);
      const destino = join(raiz, l, (PAGINAS[caminho][l] || "index") + ".html");
      gerados.push({ caminho, lingua: l, destino, html });
      if (escrever) { mkdirSync(dirname(destino), { recursive: true }); writeFileSync(destino, html); }
    }
  }

  // português: seletor em todas as páginas; canonical e hreflang nas traduzidas
  const todasPt = listarHtml(raiz).filter((f) => !/^(en|fr|i18n|node_modules)\//.test(f));
  const ptMudadas = [];
  for (const rel of todasPt) {
    const f = join(raiz, rel);
    const antes = readFileSync(f, "utf8");
    const caminho = rel.replace(/\.html$/, "").replace(/^index$/, "");
    let html = antes;
    if (caminho in PAGINAS) {
      const eol = html.includes("\r\n") ? "\r\n" : "\n";
      html = html.replace(/[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\r?\n/g, "");
      html = html.replace(/(<link rel="canonical" href="[^"]*">)/, `$1${eol}${blocoAlternativas(caminho, eol)}`);
      html = html.replace(/[ \t]*<meta property="og:locale:alternate" content="[^"]*">\r?\n/g, "");
      html = html.replace(/(<meta property="og:locale" content="[^"]*">)/, (m) => m + eol + LINGUAS.map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`).join(eol));
      html = seletor(html, caminho, "pt");
    } else {
      html = seletor(html, null, "pt", "/" + caminho.replace(/^404$/, ""));
    }
    if (html !== antes) { ptMudadas.push(rel); if (escrever) writeFileSync(f, html); }
  }

  // ?v= dos assets (regra do README): 10 primeiros caracteres do sha1 de site.css + site.js + verificador.js
  const v = createHash("sha1").update(Buffer.concat(["site.css", "site.js", "verificador.js"].map((a) => readFileSync(join(raiz, "assets", a))))).digest("hex").slice(0, 10);
  for (const rel of listarHtml(raiz).filter((f) => !/^(i18n|node_modules)\//.test(f))) {
    const f = join(raiz, rel);
    const antes = readFileSync(f, "utf8");
    const html = antes.replace(/(\/assets\/(?:site\.css|site\.js|verificador\.js)\?v=)[0-9a-f]{10}/g, `$1${v}`);
    if (html !== antes && escrever) writeFileSync(f, html);
  }

  if (escrever) writeFileSync(join(raiz, "sitemap.xml"), sitemap(readFileSync(join(raiz, "sitemap.xml"), "utf8")));
  return { falta, gerados, ptMudadas, versao: v };
}

export function listarHtml(raiz, sub = "") {
  const out = [];
  for (const e of readdirSync(join(raiz, sub), { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const rel = sub ? sub + "/" + e.name : e.name;
    if (e.isDirectory()) { if (!["node_modules", "assets", "api", "i18n"].includes(e.name)) out.push(...listarHtml(raiz, rel)); }
    else if (e.name.endsWith(".html")) out.push(rel);
  }
  return out;
}

/* sitemap: as três línguas, cada uma com as alternativas */
export function sitemap(xml) {
  const entradas = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1].replace(/<xhtml:link[^>]*\/>/g, ""));
  const pt = entradas.filter((e) => !/<loc>https:\/\/www\.ativalocal\.com\/(en|fr)(\/|<)/.test(e));
  const out = [];
  for (const e of pt) {
    const loc = /<loc>([^<]*)<\/loc>/.exec(e)[1];
    const caminho = loc.slice(DOMINIO.length).replace(/^\/+|\/+$/g, "");
    if (!(caminho in PAGINAS)) { out.push(`<url>${e}</url>`); continue; }
    const alt = ["pt", ...LINGUAS].map((l) => `<xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${urlDe(caminho, l)}"/>`).join("") + `<xhtml:link rel="alternate" hreflang="x-default" href="${urlDe(caminho, "pt")}"/>`;
    out.push(`<url>${e.replace(/(<\/loc>)/, "$1" + alt)}</url>`);
    for (const l of LINGUAS) out.push(`<url>${e.replace(/<loc>[^<]*<\/loc>/, `<loc>${urlDe(caminho, l)}</loc>` + alt)}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${out.join("")}</urlset>\n`;
}
