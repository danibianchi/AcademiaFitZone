import { createServer } from 'node:http';
import { criarAcademia } from './application/academia.js';
import { criarHandler } from './http/api.js';
import { criarRepositorioMemoria } from './infrastructure/memoria.js';
import { conectarMysql } from './infrastructure/mysql.js';

const demonstracao = process.argv.includes('--demo');
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  throw new Error('Esta versão de desenvolvimento deve escutar somente em localhost.');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');

try {
  const repo = demonstracao ? criarRepositorioMemoria() : await conectarMysql();
  const handler = criarHandler(criarAcademia(repo), repo, { origemPermitida: process.env.APP_ORIGIN ?? '' });
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
  server.listen(port, host, () => console.log(`API FitZone em http://${host}:${port}/api/saude (${repo.modo})`));
  const encerrar = () => server.close(async () => { await repo.fechar(); });
  process.once('SIGINT', encerrar); process.once('SIGTERM', encerrar);
} catch (error) {
  console.error(error.code === 'ERR_MODULE_NOT_FOUND'
    ? 'Dependências ausentes. Execute npm.cmd install e configure o MySQL; para demonstração use npm.cmd run start:demo.'
    : `Falha ao conectar ao MySQL (${error.code ?? error.message}). Confira o .env e o Docker Desktop.`);
  process.exitCode = 1;
}
