import { ErroDeNegocio } from './erro.js';

export function validarCpf(valor) {
  // Aceitar somente CPF sem pontuação ou a máscara completa, sem remover letras.
  if (typeof valor !== 'string' || !/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(valor)) {
    throw new ErroDeNegocio('CPF_INVALIDO', 'Informe um CPF válido.');
  }
  const cpf = valor.replace(/[.-]/g, '');
  if (/^(\d)\1{10}$/.test(cpf)) {
    throw new ErroDeNegocio('CPF_INVALIDO', 'Informe um CPF válido.');
  }
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    const digito = resto === 10 ? 0 : resto;
    if (Number(cpf[tamanho]) !== digito) {
      throw new ErroDeNegocio('CPF_INVALIDO', 'Informe um CPF válido.');
    }
  }
  return cpf;
}
