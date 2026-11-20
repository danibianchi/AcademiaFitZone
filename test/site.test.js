import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { once } from 'node:events';
import { criarSite } from '../src/http/site.js';
import { criarHandler } from '../src/http/api.js';
import { criarAcademia } from '../src/application/academia.js';
import { criarRepositorioMemoria } from '../src/infrastructure/memoria.js';
import { escapar, cpf, mascaraCpf, mascaraTelefone, telefone, somarDias } from '../web/formatacao.js';

test('Interface e API compartilham origem sem expor arquivos privados', async t => {
  const repo = criarRepositorioMemoria();
  const academia = criarAcademia(repo, () => '2026-11-19');
  const server = createServer(criarSite(criarHandler(academia, repo)));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const port = server.address().port;
  const origem = `http://127.0.0.1:${port}`;
  const pagina = await fetch(origem);
  assert.equal(pagina.status, 200);
  assert.match(await pagina.text(), /Gestão da academia/);
  assert.match(pagina.headers.get('content-security-policy'), /script-src 'self'/);
  for (const caminho of ['/app.js', '/styles.css', '/formatacao.js', '/api.js', '/logo-fitzone.svg']) assert.equal((await fetch(origem + caminho)).status, 200);
  for (const caminho of ['/.env', '/.git/config', '/package.json', '/src/server.js', '/%2e%2e/.env']) assert.equal((await fetch(origem + caminho)).status, 404);
  const plano = await fetch(origem + '/api/planos', { method: 'POST', headers: { Origin: origem, 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Mensal', valor: '119.90', duracao_dias: 30 }) });
  assert.equal(plano.status, 201);
  assert.equal((await (await fetch(origem + '/api/saude')).json()).data_operacional, '2026-11-19');
  const respostaHost = await new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: '/', headers: { Host: 'externo.example' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.end();
  });
  assert.equal(respostaHost, 403);
});

test('Textos de cadastro são escapados, CPF aplica máscara LGPD e formulários aplicam máscaras numéricas', () => {
  assert.equal(escapar('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(cpf('52998224725'), '***.982.247-**');
  assert.equal(mascaraCpf('abc52998224725999'), '529.982.247-25');
  assert.equal(mascaraTelefone('letras11987654321extra'), '(11) 98765-4321');
  assert.equal(mascaraTelefone('1134567890'), '(11) 3456-7890');
  assert.equal(telefone('11987654321'), '(11) 98765-4321');
  assert.equal(somarDias('2026-11-19', 30), '2026-12-19');
  assert.equal(somarDias('', 30), '');
});
