import { ErroDeNegocio } from '../domain/erro.js';
import { mesmaOrigem } from './rede.js';

function normalizar(valor) {
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (!valor || typeof valor !== 'object') return valor;
  const copia = { ...valor };
  for (const chave of ['ativo', 'permitido', 'alerta_emitido']) {
    if (chave in copia) copia[chave] = Boolean(copia[chave]);
  }
  for (const chave of ['data_hora', 'data_pagamento']) {
    if (typeof copia[chave] === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(copia[chave])) {
      copia[chave] = copia[chave].replace(' ', 'T') + 'Z';
    }
  }
  return copia;
}

function responder(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(dados === undefined ? undefined : JSON.stringify(normalizar(dados)));
}

async function lerJson(req) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    const erro = new Error('Use Content-Type: application/json.'); erro.status = 415; throw erro;
  }
  return new Promise((resolve, reject) => {
    const partes = []; let tamanho = 0; let excedeu = false;
    req.on('data', parte => {
      tamanho += parte.length;
      if (tamanho > 16384) { excedeu = true; partes.length = 0; }
      else if (!excedeu) partes.push(parte);
    });
    req.once('error', reject);
    req.once('end', () => {
      if (excedeu) { const erro = new Error('Corpo da requisição excede 16 KB.'); erro.status = 413; return reject(erro); }
      try {
        const dados = JSON.parse(Buffer.concat(partes).toString('utf8'));
        if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error();
        resolve(dados);
      } catch { const erro = new Error('Envie um objeto JSON válido.'); erro.status = 400; reject(erro); }
    });
  });
}

export function criarHandler(academia, repositorio, { origemPermitida = '', redeLocal = false } = {}) {
  const rotas = [
    ['GET', /^\/api\/saude$/, async () => {
      try { await repositorio.ping(); } catch { const erro = new Error('Banco indisponível.'); erro.status = 503; throw erro; }
      return { status: 'ok', armazenamento: repositorio.modo, demonstracao: repositorio.modo === 'memoria', data_operacional: academia.dataOperacional() };
    }],
    ['GET', /^\/api\/planos$/, () => academia.listarPlanos()],
    ['POST', /^\/api\/planos$/, (m, b) => academia.criarPlano(b), 201],
    ['PUT', /^\/api\/planos\/([^/]+)$/, (m, b) => academia.editarPlano(m[1], b)],
    ['DELETE', /^\/api\/planos\/([^/]+)$/, m => academia.excluirPlano(m[1]), 204],
    ['GET', /^\/api\/alunos$/, (m, b, url) => academia.listarAlunos(url.searchParams.get('busca') ?? '', url.searchParams.get('status') ?? '')],
    ['POST', /^\/api\/alunos$/, (m, b) => academia.criarAluno(b), 201],
    ['GET', /^\/api\/alunos\/([^/]+)$/, m => academia.consultarAluno(m[1])],
    ['PATCH', /^\/api\/alunos\/([^/]+)$/, (m, b) => academia.editarAluno(m[1], b)],
    ['DELETE', /^\/api\/alunos\/([^/]+)$/, m => academia.excluirAluno(m[1]), 204],
    ['POST', /^\/api\/alunos\/([^/]+)\/cancelamento$/, m => academia.cancelar(m[1])],
    ['POST', /^\/api\/alunos\/([^/]+)\/plano$/, (m, b) => academia.alterarPlano(m[1], b.id_plano)],
    ['POST', /^\/api\/alunos\/([^/]+)\/reativacao$/, (m, b) => academia.alterarPlano(m[1], b.id_plano, true)],
    ['POST', /^\/api\/alunos\/([^/]+)\/checkins$/, m => academia.checkin(m[1]), 201],
    ['POST', /^\/api\/alunos\/([^/]+)\/pagamentos$/, (m, b) => academia.pagar(m[1], b), 201],
    ['GET', /^\/api\/alunos\/([^/]+)\/(pagamentos|checkins)$/, m => academia.historico(m[1], m[2])],
  ];
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.headers.origin) {
        if (!mesmaOrigem(req, redeLocal) && (!origemPermitida || req.headers.origin !== origemPermitida)) return responder(res, 403, { erro: 'ORIGEM_NAO_PERMITIDA', mensagem: 'Origem não permitida.' });
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Vary', 'Origin');
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          return responder(res, 204);
        }
      }
      const url = new URL(req.url, 'http://localhost');
      const rota = rotas.find(([metodo, regex]) => metodo === req.method && regex.test(url.pathname));
      if (!rota) {
        const metodos = rotas.filter(([, regex]) => regex.test(url.pathname)).map(([metodo]) => metodo);
        if (metodos.length) res.setHeader('Allow', metodos.join(', '));
        return responder(res, metodos.length ? 405 : 404, { erro: metodos.length ? 'METODO_NAO_PERMITIDO' : 'ROTA_NAO_ENCONTRADA', mensagem: metodos.length ? 'Método não permitido.' : 'Rota não encontrada.' });
      }
      const corpo = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await lerJson(req) : {};
      const resultado = await rota[2](url.pathname.match(rota[1]), corpo, url);
      responder(res, rota[3] ?? 200, resultado);
    } catch (error) {
      const conflito = ['CPF_DUPLICADO', 'REGISTRO_VINCULADO', 'MATRICULA_JA_ATIVA', 'MATRICULA_CANCELADA'].includes(error.codigo);
      const status = error instanceof ErroDeNegocio ? (error.codigo === 'NAO_ENCONTRADO' ? 404 : conflito ? 409 : 422) : error.status ?? 500;
      responder(res, status, { erro: error.codigo ?? (status >= 500 ? 'ERRO_INTERNO' : 'REQUISICAO_INVALIDA'), mensagem: status === 500 ? 'Não foi possível concluir a operação.' : error.message });
    }
  };
}
