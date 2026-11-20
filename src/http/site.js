import { readFile } from 'node:fs/promises';
import { hostPermitido } from './rede.js';

// Lista fechada: nunca transformar um caminho da requisição em arquivo local.
const arquivos = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/api.js', ['api.js', 'text/javascript; charset=utf-8']],
  ['/formatacao.js', ['formatacao.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/logo-fitzone.svg', ['assets/logo-fitzone.svg', 'image/svg+xml; charset=utf-8']],
  ['/favicon.svg', ['assets/favicon.svg', 'image/svg+xml; charset=utf-8']],
]);
const raiz = new URL('../../web/', import.meta.url);

export function criarSite(api, { redeLocal = false } = {}) {
  return async (req, res) => {
    if (!hostPermitido(req, redeLocal)) { res.writeHead(403); return res.end('Host não permitido.'); }
    const caminho = new URL(req.url, 'http://localhost').pathname;
    if (caminho.startsWith('/api/')) return api(req, res);
    const arquivo = arquivos.get(caminho);
    if (!arquivo) { res.writeHead(404); return res.end('Página não encontrada.'); }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
    try {
      const conteudo = await readFile(new URL(arquivo[0], raiz));
      res.writeHead(200, {
        'Content-Type': arquivo[1], 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      });
      res.end(req.method === 'HEAD' ? undefined : conteudo);
    } catch { res.writeHead(500); res.end('Não foi possível abrir a página.'); }
  };
}
