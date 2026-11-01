// Verificador gratuito "O seu site cumpre a lei?" da Ativa Local.
// Analisa só a página inicial pública de um site e devolve o resultado das verificações (nunca o HTML).
export const config = { runtime: "edge" };

const LIMITE_BYTES = 1_500_000;
const TEMPO_MS = 9000;

function resposta(corpo, estado = 200) {
  return new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function ipPrivado(host) {
  if (/^\[.*\]$/.test(host) || host.includes(":")) return true; // IPv6 literal: recusado
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function normalizar(entrada) {
  let t = String(entrada || "").trim();
  if (!t || t.length > 300) return null;
  if (!/^https?:\/\//i.test(t)) t = "https://" + t;
  let u;
  try { u = new URL(t); } catch { return null; }
  if (!["http:", "https:"].includes(u.protocol)) return null;
  if (u.port && !["80", "443"].includes(u.port)) return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || ipPrivado(host)) return null;
  return new URL(u.origin + "/");
}

async function obter(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TEMPO_MS);
  try {
    const r = await fetch(url, {
      redirect: "follow", signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; AtivaLocalVerificador/1.0; +https://www.ativalocal.com/ferramentas/verificador-site)", "accept": "text/html" },
    });
    const final = new URL(r.url || url);
    if (ipPrivado(final.hostname) || final.hostname === "localhost") throw new Error("destino");
    const leitor = r.body.getReader();
    const partes = []; let total = 0;
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.length;
      if (total > LIMITE_BYTES) { ctrl.abort(); break; }
      partes.push(value);
    }
    const bytes = new Uint8Array(Math.min(total, LIMITE_BYTES));
    let o = 0; for (const p of partes) { bytes.set(p.subarray(0, Math.min(p.length, bytes.length - o)), o); o += p.length; if (o >= bytes.length) break; }
    return { estado: r.status, final: final.href, html: new TextDecoder("utf-8").decode(bytes), cabecalhos: r.headers };
  } finally { clearTimeout(t); }
}

function texto(html) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
}

function analisar(pagina) {
  const h = pagina.html;
  const baixo = h.toLowerCase();
  const visivel = texto(h).toLowerCase();
  const robotsMeta = (h.match(/<meta[^>]+name=["']robots["'][^>]*>/i) || [""])[0].toLowerCase();
  const xRobots = (pagina.cabecalhos.get("x-robots-tag") || "").toLowerCase();
  const titulo = (h.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ""])[1].trim();
  const descricao = (h.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                     h.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [, ""])[1].trim();
  const temNif = /(nif|nipc|contribuinte|n\.?\s?º?\s?de\s?pessoa\s?coletiva)[^0-9]{0,20}\d{3}\s?\d{3}\s?\d{3}/i.test(visivel) ||
                 /\bpt\s?\d{9}\b/i.test(visivel);
  return [
    { grupo: "Obrigações legais", id: "livro", ok: /livroreclamacoes\.pt/.test(baixo) || /livro de reclama/.test(visivel),
      titulo: "Acesso ao Livro de Reclamações Eletrónico",
      ajuda: "Quem tem site e vende a consumidores deve dar acesso ao Livro de Reclamações Eletrónico, de forma visível.",
      artigo: "/blog/o-que-a-lei-obriga-a-ter-num-site" },
    { grupo: "Obrigações legais", id: "nif", ok: temNif, titulo: "Identificação da empresa (NIF ou NIPC)",
      ajuda: "O site deve identificar quem o explora: nome, morada, contactos e número de identificação fiscal ou de registo.",
      artigo: "/blog/o-que-a-lei-obriga-a-ter-num-site" },
    { grupo: "Obrigações legais", id: "privacidade", ok: /privacidade|privacy|dados pessoais|rgpd/.test(visivel),
      titulo: "Política de privacidade",
      ajuda: "Se o site recolhe dados pessoais (formulários, contactos, cookies), deve explicar como os trata, segundo o RGPD.",
      artigo: "/blog/o-que-a-lei-obriga-a-ter-num-site" },
    { grupo: "Obrigações legais", id: "ral", ok: /resolu[cç][aã]o alternativa|arbitragem|centro de arbitragem|\bral\b/.test(visivel),
      titulo: "Informação sobre resolução alternativa de litígios",
      ajuda: "Empresas vinculadas a um centro de arbitragem devem indicá-lo no site. Para quem vende a consumidores, é prudente fazê-lo sempre.",
      artigo: "/blog/o-que-a-lei-obriga-a-ter-num-site", aviso: true },
    { grupo: "Google e telemóvel", id: "https", ok: pagina.final.startsWith("https://"), titulo: "Ligação segura (HTTPS)",
      ajuda: "Sem HTTPS, os browsers mostram o site como não seguro e os visitantes desconfiam.",
      artigo: "/blog/porque-o-meu-negocio-nao-aparece-no-google" },
    { grupo: "Google e telemóvel", id: "movel", ok: /<meta[^>]+name=["']viewport["']/i.test(h), titulo: "Preparado para telemóvel",
      ajuda: "O Google avalia o site pela versão para telemóvel. Sem esta configuração, o site aparece minúsculo no ecrã.",
      artigo: "/blog/porque-o-meu-negocio-nao-aparece-no-google" },
    { grupo: "Google e telemóvel", id: "indexavel", ok: !/noindex/.test(robotsMeta) && !/noindex/.test(xRobots),
      titulo: "O Google pode mostrar o site",
      ajuda: "O site tem uma instrução que pede ao Google para não o mostrar nas pesquisas (noindex).",
      artigo: "/blog/porque-o-meu-negocio-nao-aparece-no-google" },
    { grupo: "Google e telemóvel", id: "titulo", ok: titulo.length >= 10 && descricao.length >= 50,
      titulo: "Título e descrição para o Google",
      ajuda: "O título e a descrição são o que aparece nos resultados de pesquisa. Devem dizer o que faz e onde.",
      artigo: "/blog/porque-o-meu-negocio-nao-aparece-no-google",
      detalhe: titulo ? `Título encontrado: "${titulo.slice(0, 90)}"` : "Não encontrámos título." },
    { grupo: "Google e telemóvel", id: "schema", ok: /application\/ld\+json/i.test(h), titulo: "Dados estruturados",
      ajuda: "Ajudam o Google e as inteligências artificiais a perceber quem é o negócio, onde está e o que faz.",
      artigo: "/servicos/seo-local", aviso: true },
    { grupo: "Contacto", id: "contacto", ok: /href=["'](tel:|mailto:|https?:\/\/(wa\.me|api\.whatsapp\.com))/i.test(h),
      titulo: "Contacto a um toque",
      ajuda: "Um botão para ligar, enviar email ou abrir o WhatsApp faz diferença em quem visita o site no telemóvel.",
      artigo: "/blog/site-ou-instagram-negocio-local" },
  ];
}

export default async function handler(req) {
  if (req.method !== "GET") return resposta({ erro: "Método não permitido." }, 405);
  const alvo = normalizar(new URL(req.url).searchParams.get("url"));
  if (!alvo) return resposta({ erro: "Escreva um endereço de site válido, por exemplo: omeunegocio.pt" }, 400);
  let pagina;
  try {
    pagina = await obter(alvo.href);
  } catch {
    return resposta({ erro: "Não conseguimos abrir esse site. Confirme o endereço e tente de novo." }, 502);
  }
  if (pagina.estado >= 400) return resposta({ erro: `O site respondeu com erro ${pagina.estado}. Confirme o endereço.` }, 502);
  const verificacoes = analisar(pagina);
  const falhas = verificacoes.filter(v => !v.ok && !v.aviso).length;
  return resposta({ endereco: pagina.final, falhas, total: verificacoes.length, verificacoes });
}
