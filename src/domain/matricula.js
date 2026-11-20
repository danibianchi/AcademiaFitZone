import { somarDias, validarData } from './datas.js';
import { validarSituacaoMatricula } from './acesso.js';
import { ErroDeNegocio } from './erro.js';

// RN01 e RN07: substituir o plano vigente, nunca criar dois vínculos ativos.
export function trocarPlano(aluno, plano, dataTroca) {
  validarSituacaoMatricula(aluno.status_matricula);
  if (aluno.status_matricula === 'CANCELADO') {
    throw new ErroDeNegocio('MATRICULA_CANCELADA', 'Use a reativação para uma matrícula cancelada.');
  }
  if (![true, 1].includes(plano.ativo)) {
    throw new ErroDeNegocio('PLANO_INATIVO', 'Selecione um plano ativo.');
  }
  validarData(dataTroca);
  return { ...aluno, id_plano: plano.id_plano, data_inicio_plano: dataTroca, data_vencimento: somarDias(dataTroca, plano.duracao_dias) };
}

export function cancelarMatricula(aluno) {
  validarSituacaoMatricula(aluno.status_matricula);
  return { ...aluno, status_matricula: 'CANCELADO' };
}

export function reativarMatricula(aluno, plano, hoje) {
  validarSituacaoMatricula(aluno.status_matricula);
  if (aluno.status_matricula !== 'CANCELADO') {
    throw new ErroDeNegocio('MATRICULA_JA_ATIVA', 'A matrícula já está ativa.');
  }
  return trocarPlano({ ...aluno, status_matricula: 'ATIVO' }, plano, hoje);
}
