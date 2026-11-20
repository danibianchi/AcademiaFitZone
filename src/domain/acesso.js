import { calcularDiasAtraso } from './datas.js';
import { ErroDeNegocio } from './erro.js';

export function validarSituacaoMatricula(status) {
  if (!['ATIVO', 'CANCELADO'].includes(status)) {
    throw new ErroDeNegocio('MATRICULA_INVALIDA', 'A situação da matrícula é inválida.');
  }
}

// RN02, RN03, RN04 e RN08. Quem chama deve salvar o resultado mesmo
// quando a entrada for negada (RN06), antes de confirmar ao operador.
export function avaliarAcesso(aluno, hoje) {
  validarSituacaoMatricula(aluno.status_matricula);
  const dias_atraso = calcularDiasAtraso(aluno.data_vencimento, hoje);
  if (aluno.status_matricula === 'CANCELADO') {
    return { permitido: false, dias_atraso, alerta_emitido: false, motivo_bloqueio: 'Matrícula cancelada.' };
  }
  if (dias_atraso > 30) {
    return { permitido: false, dias_atraso, alerta_emitido: false, motivo_bloqueio: 'Mensalidade com mais de 30 dias de atraso.' };
  }
  return { permitido: true, dias_atraso, alerta_emitido: dias_atraso > 0, motivo_bloqueio: null };
}
