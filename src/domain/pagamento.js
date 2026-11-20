import { somarDias, validarData } from './datas.js';
import { validarSituacaoMatricula } from './acesso.js';
import { ErroDeNegocio } from './erro.js';

// Os valores recebidos do banco podem ser strings DECIMAL. Usar centavos
// inteiros evita comparar números monetários por ponto flutuante.
export function emCentavos(valor) {
  if (!['string', 'number'].includes(typeof valor)) {
    throw new ErroDeNegocio('VALOR_INVALIDO', 'Informe um valor positivo com até duas casas decimais.');
  }
  const texto = String(valor);
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(texto)) {
    throw new ErroDeNegocio('VALOR_INVALIDO', 'Informe um valor positivo com até duas casas decimais.');
  }
  const [inteiro, decimal = ''] = texto.split('.');
  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
  if (centavos <= 0) throw new ErroDeNegocio('VALOR_INVALIDO', 'O valor deve ser maior que zero.');
  return centavos;
}

// Apenas calcular. A camada de persistência deverá gravar pagamento e
// vencimento em uma única transação, sem reativar matrícula cancelada.
export function prepararPagamento(aluno, plano, valor, hoje) {
  validarSituacaoMatricula(aluno.status_matricula);
  validarData(hoje);
  validarData(aluno.data_vencimento);
  if (aluno.id_plano !== plano.id_plano) {
    throw new ErroDeNegocio('PLANO_DIVERGENTE', 'O plano informado não é o plano vigente do aluno.');
  }
  const centavos = emCentavos(valor);
  if (centavos !== emCentavos(plano.valor)) {
    throw new ErroDeNegocio('VALOR_DIVERGENTE', 'O valor deve corresponder ao plano vigente.');
  }
  const base = hoje > aluno.data_vencimento ? hoje : aluno.data_vencimento;
  return {
    id_aluno: aluno.id_aluno,
    id_plano_vigente: plano.id_plano,
    valor_pago: (centavos / 100).toFixed(2),
    vencimento_anterior: aluno.data_vencimento,
    novo_vencimento: somarDias(base, plano.duracao_dias),
  };
}
