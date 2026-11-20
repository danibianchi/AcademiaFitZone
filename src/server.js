import { createServer } from 'node:http';
import { criarAcademia } from './application/academia.js';
import { criarHandler } from './http/api.js';
import { criarRepositorioMemoria } from './infrastructure/memoria.js';
import { conectarMysql } from './infrastructure/mysql.js';
import { criarSite } from './http/site.js';
import { isIP } from 'node:net';
import { networkInterfaces } from 'node:os';

const demonstracao = process.argv.includes('--demo');
const host = process.argv.includes('--lan') ? '0.0.0.0' : process.env.HOST ?? '127.0.0.1';
const redeLocal = !['127.0.0.1', 'localhost', '::1'].includes(host);
const portaArgumento = process.argv.find(arg => arg.startsWith('--port='))?.slice(7);
const port = Number(portaArgumento ?? process.env.PORT ?? 3000);
if (host !== 'localhost' && !isIP(host)) throw new Error('HOST deve ser um endereço IP ou localhost.');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');

try {
  const repo = demonstracao ? criarRepositorioMemoria() : await conectarMysql();
  const academia = criarAcademia(repo);
  if (demonstracao) {
    for (const plano of [
      { nome: 'Mensal', valor: '119.90', duracao_dias: 30 },
      { nome: 'Trimestral', valor: '319.90', duracao_dias: 90 },
      { nome: 'Anual', valor: '1099.90', duracao_dias: 365 },
    ]) await academia.criarPlano(plano);
  }
  const handler = criarSite(criarHandler(academia, repo, { origemPermitida: process.env.APP_ORIGIN ?? '', redeLocal }), { redeLocal });
  let server;
  if (demonstracao) {
    server = createServer(handler);
    console.log('DEMONSTRAÇÃO EM MEMÓRIA: dados apagados ao reiniciar; use somente dados fictícios.');
  } else {
    const { default: express } = await import('express');
    const app = express();
    app.disable('x-powered-by');
    // O mesmo handler é exercitado nos testes HTTP com o servidor nativo.
    // Não usar express.json() aqui: o handler lê o corpo com limite próprio.
    app.use(handler);
    server = createServer(app);
  }
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('error', async error => {
    console.error('Não foi possível iniciar a API:', error.code ?? 'ERRO');
    await repo.fechar(); process.exitCode = 1;
  });
  server.listen(port, host, () => {
    console.log(`FitZone em http://${host === '::1' ? '[::1]' : host}:${port}/ (${repo.modo})`);
    if (redeLocal) {
      console.log(`Neste computador: http://127.0.0.1:${port}/`);
      try {
        for (const [nome, enderecos] of Object.entries(networkInterfaces())) {
          for (const endereco of enderecos ?? []) {
            if (endereco.family === 'IPv4' && !endereco.internal) console.log(`${nome}: http://${endereco.address}:${port}/`);
          }
        }
      } catch { console.log('Use o IP local deste computador para acessar pela rede.'); }
    }
  });
  const encerrar = () => server.close(async () => { await repo.fechar(); });
  process.once('SIGINT', encerrar); process.once('SIGTERM', encerrar);
} catch (error) {
  console.error(error.code === 'ERR_MODULE_NOT_FOUND'
    ? 'Dependências ausentes. Execute npm.cmd install e configure o MySQL; para demonstração use npm.cmd run start:demo.'
    : `Falha ao conectar ao MySQL (${error.code ?? error.message}). Confira o .env e o Docker Desktop.`);
  process.exitCode = 1;
}
