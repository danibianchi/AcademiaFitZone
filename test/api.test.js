import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { criarAcademia } from '../src/application/academia.js';
import { criarHandler } from '../src/http/api.js';
import { criarRepositorioMemoria } from '../src/infrastructure/memoria.js';
import { criarRepositorioMysql, traduzirErroBanco } from '../src/infrastructure/mysql.js';
import { hojeEmSaoPaulo } from '../src/application/validacao.js';

const hoje = () => '2026-11-19';
const dadosPlano = { nome: 'Mensal', valor: '119.90', duracao_dias: 30 };
const dadosAluno = { nome: 'Aluno de teste', cpf: '52998224725', telefone: '00000000000', data_nascimento: '2000-01-01', id_plano: 1, data_inicio_plano: '2026-09-15', data_vencimento: '2026-10-15' };
async function fixture(t) {
  const repo = criarRepositorioMemoria();
  const academia = criarAcademia(repo, hoje);
  const server = createServer(criarHandler(academia, repo));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}`;
  const chamar = async (caminho, metodo = 'GET', corpo) => {
    const res = await fetch(url + caminho, { method: metodo, headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    return { status: res.status, dados: res.status === 204 ? null : await res.json() };
  };
  await chamar('/api/planos', 'POST', dadosPlano);
  await chamar('/api/alunos', 'POST', dadosAluno);
  return { chamar, academia, repo, url };
}

test('HTTP: cadastrar, bloquear, pagar e liberar, mantendo os dois históricos', async t => {
  const { chamar } = await fixture(t);
  const saude = await chamar('/api/saude');
  assert.equal(saude.dados.armazenamento, 'memoria');
  const bloqueado = await chamar('/api/alunos/1/checkins', 'POST', {});
  assert.equal(bloqueado.status, 201);
  assert.equal(bloqueado.dados.permitido, false);
  const pago = await chamar('/api/alunos/1/pagamentos', 'POST', { valor_pago: '119.90', hoje: '2040-01-01' });
  assert.equal(pago.status, 201);
  assert.equal(pago.dados.novo_vencimento, '2026-12-19');
  const liberado = await chamar('/api/alunos/1/checkins', 'POST', {});
  assert.equal(liberado.dados.permitido, true);
  const historico = await chamar('/api/alunos/1/checkins');
  assert.equal(historico.dados.length, 2);
  assert.equal((await chamar('/api/alunos/1/pagamentos')).dados.length, 1);
});

test('HTTP: erros de CPF, referências, valores e identificadores não geram alterações', async t => {
  const { chamar } = await fixture(t);
  assert.equal((await chamar('/api/alunos', 'POST', dadosAluno)).status, 409);
  assert.equal((await chamar('/api/alunos', 'POST', { ...dadosAluno, cpf: '123' })).status, 422);
  assert.equal((await chamar('/api/alunos', 'POST', { ...dadosAluno, telefone: 'com-texto' })).status, 422);
  assert.equal((await chamar('/api/alunos/999')).status, 404);
  assert.equal((await chamar('/api/alunos/1abc')).status, 422);
  assert.equal((await chamar('/api/alunos/1/pagamentos', 'POST', { valor_pago: '1.00' })).status, 422);
  assert.equal((await chamar('/api/alunos/1/pagamentos')).dados.length, 0);
  assert.equal((await chamar('/api/alunos/1')).dados.data_vencimento, '2026-10-15');
});

test('HTTP: cancelamento exige reativação, pagamento não reativa e edição não contorna regras', async t => {
  const { chamar } = await fixture(t);
  await chamar('/api/alunos/1/cancelamento', 'POST', {});
  await chamar('/api/alunos/1/pagamentos', 'POST', { valor_pago: 119.9 });
  await chamar('/api/alunos/1', 'PATCH', { status_matricula: 'ATIVO', data_vencimento: '2040-01-01' });
  assert.equal((await chamar('/api/alunos/1/checkins', 'POST', {})).dados.permitido, false);
  assert.equal((await chamar('/api/alunos/1/plano', 'POST', { id_plano: 1 })).status, 409);
  assert.equal((await chamar('/api/alunos/1/reativacao', 'POST', { id_plano: 1 })).status, 200);
  assert.equal((await chamar('/api/alunos/1/checkins', 'POST', {})).dados.permitido, true);
});

test('HTTP: edição, filtros, proteção de vínculos e exclusão sem histórico', async t => {
  const { chamar } = await fixture(t);
  await chamar('/api/alunos/1', 'PATCH', { nome: 'Aluno atualizado' });
  assert.equal((await chamar('/api/alunos?busca=atualizado&status=ATIVO')).dados.length, 1);
  assert.equal((await chamar('/api/alunos?status=OUTRO')).status, 422);
  assert.equal((await chamar('/api/planos/1', 'DELETE')).status, 409);
  assert.equal((await chamar('/api/alunos/1', 'DELETE')).status, 204);
  assert.equal((await chamar('/api/planos/1', 'DELETE')).status, 204);
});

test('HTTP: plano inativo rejeita vínculo e aluno com histórico não pode ser excluído', async t => {
  const { chamar } = await fixture(t);
  await chamar('/api/planos/1', 'PUT', { ...dadosPlano, ativo: false });
  assert.equal((await chamar('/api/alunos/1/plano', 'POST', { id_plano: 1 })).status, 422);
  await chamar('/api/alunos/1/checkins', 'POST', {});
  assert.equal((await chamar('/api/alunos/1', 'DELETE')).status, 409);
});

test('HTTP: JSON inválido, tamanho, método, rota e origem são tratados', async t => {
  const { chamar, url } = await fixture(t);
  assert.equal((await chamar('/inexistente')).status, 404);
  assert.equal((await chamar('/api/saude', 'DELETE')).status, 405);
  const bruto = (body, headers = { 'Content-Type': 'application/json' }) => fetch(url + '/api/planos', { method: 'POST', headers, body });
  assert.equal((await bruto('{')).status, 400);
  assert.equal((await bruto('[]')).status, 400);
  assert.equal((await bruto('{}', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await bruto(JSON.stringify({ nome: 'x'.repeat(17000) }))).status, 413);
  assert.equal((await bruto('{}', { Origin: 'https://externo.example', 'Content-Type': 'application/json' })).status, 403);
});

test('Pagamentos simultâneos usam o vencimento atualizado e preservam as duas renovações', async () => {
  const repo = criarRepositorioMemoria(); const academia = criarAcademia(repo, hoje);
  await academia.criarPlano(dadosPlano); await academia.criarAluno({ ...dadosAluno, data_vencimento: hoje() });
  await Promise.all([academia.pagar(1, { valor_pago: 119.9 }), academia.pagar(1, { valor_pago: 119.9 })]);
  assert.equal((await academia.consultarAluno(1)).data_vencimento, '2027-01-18');
  assert.equal((await academia.historico(1, 'pagamentos')).length, 2);
});

test('Falha após inserir pagamento reverte também o histórico em memória', async () => {
  const repo = criarRepositorioMemoria(); const academia = criarAcademia(repo, hoje);
  await academia.criarPlano(dadosPlano); await academia.criarAluno(dadosAluno);
  const comFalha = { ...repo, transacao: fn => repo.transacao(tx => fn({ ...tx, atualizarAluno: async () => { throw new Error('Falha simulada'); } })) };
  await assert.rejects(criarAcademia(comFalha, hoje).pagar(1, { valor_pago: 119.9 }));
  assert.equal((await academia.historico(1, 'pagamentos')).length, 0);
  assert.equal((await academia.consultarAluno(1)).data_vencimento, '2026-10-15');
});

test('Adaptador MySQL: usa bloqueio e parâmetros; commit só após todas as operações', async () => {
  const eventos = [];
  const conexao = {
    async beginTransaction() { eventos.push('begin'); },
    async execute(sql, valores) { eventos.push({ sql, valores }); return [[{ id_aluno: 1 }]]; },
    async commit() { eventos.push('commit'); }, async rollback() { eventos.push('rollback'); }, release() { eventos.push('release'); },
  };
  const repo = criarRepositorioMysql({ getConnection: async () => conexao });
  await repo.transacao(tx => tx.aluno(1));
  assert.deepEqual(eventos, ['begin', { sql: 'SELECT * FROM tb_alunos WHERE id_aluno = ? FOR UPDATE', valores: [1] }, 'commit', 'release']);
  eventos.length = 0;
  await assert.rejects(repo.transacao(async () => { throw Object.assign(new Error('duplicado'), { code: 'ER_DUP_ENTRY' }); }), e => e.codigo === 'CPF_DUPLICADO');
  assert.deepEqual(eventos, ['begin', 'rollback', 'release']);
  assert.equal(traduzirErroBanco({ code: 'ER_ROW_IS_REFERENCED_2' }).codigo, 'REGISTRO_VINCULADO');
});

test('Data operacional usa São Paulo perto da meia-noite UTC', () => {
  assert.equal(hojeEmSaoPaulo(new Date('2026-11-20T01:30:00Z')), '2026-11-19');
});
