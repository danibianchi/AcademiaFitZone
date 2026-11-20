import { ErroDeNegocio } from './erro.js';

const DIA_EM_MS = 86_400_000;

// Datas do domínio usam somente dia, mês e ano. UTC evita variações de fuso
// e horário de verão ao calcular dias; não representa o horário do atendimento.
export function validarData(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroDeNegocio('DATA_INVALIDA', 'Informe uma data no formato AAAA-MM-DD.');
  }
  const data = new Date(`${valor}T00:00:00.000Z`);
  if (!Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw new ErroDeNegocio('DATA_INVALIDA', 'A data informada não existe.');
  }
  return data;
}

export function somarDias(data, quantidade) {
  const valor = validarData(data);
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0 || quantidade > 36500) {
    throw new ErroDeNegocio('DURACAO_INVALIDA', 'A duração deve ser um número inteiro de 1 a 36500 dias.');
  }
  valor.setUTCDate(valor.getUTCDate() + quantidade);
  const resultado = valor.toISOString().slice(0, 10);
  validarData(resultado);
  return resultado;
}

export function calcularDiasAtraso(vencimento, hoje) {
  return Math.max(0, Math.round((validarData(hoje) - validarData(vencimento)) / DIA_EM_MS));
}
