/* Gera /en e /fr a partir do português e confere o resultado.
   Correr a partir da raiz do site: node --test i18n/construir.test.mjs
   O que faltar traduzir fica em i18n/_falta-en.json e i18n/_falta-fr.json (por página). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { construir, PAGINAS, LINGUAS, DOMINIO, urlDe, lerDicionario, normalizar } from "./construir.mjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = construir(raiz);

for (const l of LINGUAS) {
  const porPagina = {};
  for (const [k, onde] of r.falta[l]) (porPagina[onde.split(" ")[0] || "index"] ||= []).push(k);
  writeFileSync(join(raiz, "i18n", `_falta-${l}.json`), JSON.stringify(porPagina, null, 1) + "\n");
}

test("nada fica por traduzir", () => {
  for (const l of LINGUAS) assert.equal(r.falta[l].size, 0, `${l}: ${r.falta[l].size} textos por traduzir (ver i18n/_falta-${l}.json)`);
});

test("as traduções guardam as mesmas etiquetas {n} e os mesmos números e telefones", () => {
  for (const l of LINGUAS) {
    for (const [k, v] of lerDicionario(raiz, l)) {
      const ph = (s) => (s.match(/\{\d+\}/g) || []).sort().join();
      assert.equal(ph(v), ph(k), `${l}: etiquetas diferentes em «${k}»`);
      const nums = (s) => (s.replace(/\{\d+\}/g, "").match(/\d+(?:(?:[.,:]|[   ](?=\d{3}(?!\d)))\d+)*/g) || []).map((n) => n.replace(/[.,:   ]/g, "")).sort().join("|");
      assert.equal(nums(v), nums(k), `${l}: números diferentes em «${k}» → «${v}»`);
    }
  }
});

test("cada página tem lang, canonical, hreflang (pt-PT, en, fr, x-default) e o seletor", () => {
  for (const g of r.gerados) {
    const h = g.html;
    assert.match(h, new RegExp(`<html lang="${g.lingua}"`), g.destino);
    assert.ok(h.includes(`<link rel="canonical" href="${urlDe(g.caminho, g.lingua)}">`), "canonical " + g.destino);
    for (const [hl, l] of [["pt-PT", "pt"], ["en", "en"], ["fr", "fr"], ["x-default", "pt"]])
      assert.ok(h.includes(`<link rel="alternate" hreflang="${hl}" href="${urlDe(g.caminho, l)}">`), `hreflang ${hl} em ${g.destino}`);
    assert.match(h, /<nav class="lang" aria-label="[^"]+"><a href="[^"]+" hreflang="pt-PT"/, "seletor " + g.destino);
    assert.match(h, new RegExp(`aria-current="true" title="[^"]+">${g.lingua.toUpperCase()}</a>`), "língua atual marcada " + g.destino);
    assert.equal((h.match(/<link rel="canonical"/g) || []).length, 1);
  }
});

test("as páginas traduzidas não levam a páginas em português que já têm tradução", () => {
  const pt = new Set(Object.keys(PAGINAS).filter(Boolean).map((c) => "/" + c));
  for (const g of r.gerados) {
    const semSeletor = g.html.replace(/<nav class="lang"[\s\S]*?<\/nav>/, "").replace(/<link rel="alternate"[^>]*>/g, "");
    for (const m of semSeletor.matchAll(/href="(\/[^"#?]*)/g)) {
      assert.ok(!pt.has(m[1].replace(/\/$/, "")), `${g.destino} liga a ${m[1]}`);
    }
  }
});

test("WhatsApp: mesmo número, texto já escrito na língua da página", () => {
  for (const g of r.gerados) {
    const links = [...g.html.matchAll(/href="https:\/\/wa\.me\/(\d+)\?text=([^"]*)"/g)];
    for (const [, num, txt] of links) {
      assert.equal(num, "351920234446", g.destino);
      const t = decodeURIComponent(txt);
      assert.ok(!/\b(Olá|Queria|orçamento|gostava)\b/i.test(t), `${g.destino}: texto do WhatsApp em português: ${t}`);
    }
  }
});

test("páginas das campanhas: endereço, título «Ativa Local», WhatsApp e medição continuam em português", () => {
  for (const c of ["index", "criacao-de-sites", "menu-digital"]) {
    const h = readFileSync(join(raiz, c + ".html"), "utf8");
    assert.match(h, /<html lang="pt-PT"/);
    assert.match(h, /<title>[^<]*Ativa Local<\/title>/);
    assert.ok(h.includes("https://wa.me/351920234446?text="), c);
    assert.ok(h.includes('<script src="/assets/medicao.js" defer></script>'), c);
    const can = c === "index" ? DOMINIO + "/" : `${DOMINIO}/${c}`;
    assert.ok(h.includes(`<link rel="canonical" href="${can}">`), c);
  }
  for (const g of r.gerados) {
    assert.match(g.html, /<title>[^<]*Ativa Local[^<]*<\/title>/, g.destino);
    assert.ok(g.html.includes('<script src="/assets/medicao.js" defer></script>'), g.destino);
  }
});

test("o sitemap tem as três línguas de cada página traduzida", () => {
  const xml = readFileSync(join(raiz, "sitemap.xml"), "utf8");
  for (const c of Object.keys(PAGINAS)) for (const l of ["pt", ...LINGUAS]) {
    assert.ok(xml.includes(`<loc>${urlDe(c, l)}</loc>`), `${c} ${l}`);
  }
  assert.ok(xml.includes("<loc>https://www.ativalocal.com/blog</loc>"), "o blogue continua no sitemap");
  assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
});

test("gerar outra vez não muda nada (idempotente)", () => {
  const de2 = construir(raiz, { escrever: false });
  assert.deepEqual(de2.ptMudadas, [], "o português mudou na 2.ª volta");
  for (const g of de2.gerados) assert.equal(readFileSync(g.destino, "utf8"), g.html, g.destino);
});
