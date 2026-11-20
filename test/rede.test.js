import test from 'node:test';
import assert from 'node:assert/strict';
import { hostPermitido, mesmaOrigem } from '../src/http/rede.js';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { criarSite } from '../src/http/site.js';
import { criarHandler } from '../src/http/api.js';
import { criarAcademia } from '../src/application/academia.js';
import { criarRepositorioMemoria } from '../src/infrastructure/memoria.js';

const requisicao = (host, origin, localAddress = '192.168.0.116') => ({ headers: { host, origin }, socket: { localAddress, localPort: 3001 } });

test('Rede local aceita o IP da conexão e sua origem, mas não nomes externos', () => {
  const req = requisicao('192.168.0.116:3001', 'http://192.168.0.116:3001');
  assert.equal(hostPermitido(req), false);
  assert.equal(hostPermitido(req, true), true);
  assert.equal(mesmaOrigem(req, true), true);
  assert.equal(mesmaOrigem(requisicao('192.168.0.116:3001', 'http://externo.example'), true), false);
  assert.equal(hostPermitido(requisicao('externo.example:3001', 'http://externo.example:3001'), true), false);
  assert.equal(hostPermitido(requisicao('192.168.0.200:3001', ''), true), false);
  assert.equal(hostPermitido(requisicao('192.168.0.116:3001', '', '::ffff:192.168.0.116'), true), true);
});

test('Modo de rede mantém localhost e verifica a porta da conexão', () => {
  assert.equal(hostPermitido(requisicao('localhost:3001', ''), true), true);
  assert.equal(hostPermitido(requisicao('127.0.0.1:3001', '')), true);
  assert.equal(hostPermitido(requisicao('192.168.0.116:1234', ''), true), false);
  assert.equal(mesmaOrigem(requisicao('192.168.0.116:3001', 'http://192.168.0.116:3001.externo.example'), true), false);
});

test('Modo de rede atende a interface e grava pela mesma origem', async t => {
  const repo = criarRepositorioMemoria();
  const academia = criarAcademia(repo, () => '2026-11-19');
  const server = createServer(criarSite(criarHandler(academia, repo, { redeLocal: true }), { redeLocal: true }));
  server.listen(0, '0.0.0.0'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base)).status, 200);
  const resposta = await fetch(base + '/api/planos', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Mensal', valor: '119.90', duracao_dias: 30 }) });
  assert.equal(resposta.status, 201);
  assert.equal((await fetch(base + '/.env')).status, 404);
});
