import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarAcesso } from '../src/domain/acesso.js';
import { validarCpf } from '../src/domain/cpf.js';
import { calcularDiasAtraso, somarDias, validarData } from '../src/domain/datas.js';
import { emCentavos, prepararPagamento } from '../src/domain/pagamento.js';
import { cancelarMatricula, reativarMatricula, trocarPlano } from '../src/domain/matricula.js';

const hoje = '2026-11-19';
const plano = { id_plano: 1, valor: '119.90', duracao_dias: 30, ativo: true };
const aluno = { id_aluno: 1, id_plano: 1, data_vencimento: hoje, status_matricula: 'ATIVO' };
const erro = codigo => error => error.codigo === codigo;

for (const [vencimento, dias, permitido, alerta] of [
  ['2026-11-25', 0, true, false],
  ['2026-11-19', 0, true, false],
  ['2026-11-18', 1, true, true],
  ['2026-10-20', 30, true, true],
  ['2026-10-19', 31, false, false],
]) {
  test(`Check-in com vencimento em ${vencimento}: atraso ${dias}`, () => {
    const resultado = avaliarAcesso({ ...aluno, data_vencimento: vencimento }, hoje);
    assert.equal(resultado.dias_atraso, dias);
    assert.equal(resultado.permitido, permitido);
    assert.equal(resultado.alerta_emitido, alerta);
    assert.equal(resultado.motivo_bloqueio !== null, !permitido);
  });
}

test('Cancelamento bloqueia mesmo com vencimento futuro', () => {
  const resultado = avaliarAcesso({ ...aluno, status_matricula: 'CANCELADO', data_vencimento: '2026-12-19' }, hoje);
  assert.equal(resultado.permitido, false);
  assert.equal(resultado.motivo_bloqueio, 'Matrícula cancelada.');
});

test('Situação desconhecida não libera entrada', () => {
  assert.throws(() => avaliarAcesso({ ...aluno, status_matricula: 'OUTRO' }, hoje), erro('MATRICULA_INVALIDA'));
});

test('Pagamento em atraso parte de hoje e não altera os objetos recebidos', () => {
  const vencido = Object.freeze({ ...aluno, data_vencimento: '2026-10-15' });
  const resultado = prepararPagamento(vencido, Object.freeze(plano), '119.90', hoje);
  assert.equal(resultado.novo_vencimento, '2026-12-19');
  assert.equal(resultado.vencimento_anterior, '2026-10-15');
  assert.equal(resultado.id_plano_vigente, 1);
  assert.equal(vencido.data_vencimento, '2026-10-15');
});

test('Pagamento antecipado preserva os dias restantes', () => {
  const resultado = prepararPagamento({ ...aluno, data_vencimento: '2026-11-24' }, plano, 119.9, hoje);
  assert.equal(resultado.novo_vencimento, '2026-12-24');
  assert.equal(resultado.valor_pago, '119.90');
});

test('Pagamento no vencimento soma a duração a partir dessa data', () => {
  assert.equal(prepararPagamento(aluno, plano, 119.9, hoje).novo_vencimento, '2026-12-19');
});

test('Valor divergente e plano diferente são recusados', () => {
  assert.throws(() => prepararPagamento(aluno, plano, '90.00', hoje), erro('VALOR_DIVERGENTE'));
  assert.throws(() => prepararPagamento(aluno, { ...plano, id_plano: 2 }, '119.90', hoje), erro('PLANO_DIVERGENTE'));
});

test('Pagamento isolado não reativa matrícula cancelada', () => {
  const cancelado = cancelarMatricula(aluno);
  const pagamento = prepararPagamento(cancelado, plano, '119.90', hoje);
  const atualizado = { ...cancelado, data_vencimento: pagamento.novo_vencimento };
  assert.equal(atualizado.status_matricula, 'CANCELADO');
  assert.equal(avaliarAcesso(atualizado, hoje).permitido, false);
});

test('Troca substitui o plano e calcula o vencimento pela data da troca', () => {
  const trimestral = { ...plano, id_plano: 2, duracao_dias: 90 };
  const resultado = trocarPlano(Object.freeze(aluno), trimestral, hoje);
  assert.equal(resultado.id_plano, 2);
  assert.equal(resultado.data_inicio_plano, hoje);
  assert.equal(resultado.data_vencimento, '2027-02-17');
  assert.equal(aluno.id_plano, 1);
});

test('Reativação exige plano ativo e é distinta de troca', () => {
  const cancelado = cancelarMatricula(aluno);
  assert.throws(() => trocarPlano(cancelado, plano, hoje), erro('MATRICULA_CANCELADA'));
  assert.throws(() => reativarMatricula(cancelado, { ...plano, ativo: false }, hoje), erro('PLANO_INATIVO'));
  assert.throws(() => reativarMatricula(aluno, plano, hoje), erro('MATRICULA_JA_ATIVA'));
  assert.equal(reativarMatricula(cancelado, plano, hoje).status_matricula, 'ATIVO');
});

test('CPF normaliza máscara e valida os dois dígitos', () => {
  // Sequência sintética conhecida apenas para teste do algoritmo, sem cadastro real.
  assert.equal(validarCpf('529.982.247-25'), '52998224725');
  assert.equal(validarCpf('52998224725'), '52998224725');
  for (const cpf of ['11111111111', '52998224724', '52998224715', 'abc52998224725', '', null, 52998224725]) {
    assert.throws(() => validarCpf(cpf), erro('CPF_INVALIDO'));
  }
});

test('Valores monetários rejeitam negativos, casas extras e conversões ambíguas', () => {
  assert.equal(emCentavos('0.10'), 10);
  assert.equal(emCentavos('119.90'), 11990);
  for (const valor of ['0', '-1', '119,90', '119.901', '1e2', NaN, Infinity, null, true, '']) {
    assert.throws(() => emCentavos(valor), erro('VALOR_INVALIDO'));
  }
});

test('Datas respeitam ano bissexto e passagem de mês e ano', () => {
  assert.equal(somarDias('2024-02-28', 1), '2024-02-29');
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(calcularDiasAtraso('2024-02-28', '2024-03-01'), 2);
  for (const data of ['2026-02-29', '2026-02-30', '2026-13-01', '19/11/2026', '']) {
    assert.throws(() => validarData(data), erro('DATA_INVALIDA'));
  }
  for (const dias of [0, -1, 1.5, 40000]) {
    assert.throws(() => somarDias(hoje, dias), erro('DURACAO_INVALIDA'));
  }
});
