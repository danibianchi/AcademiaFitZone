import { ErroDeNegocio } from '../domain/erro.js';
import { validarData } from '../domain/datas.js';
import { validarCpf } from '../domain/cpf.js';
import { emCentavos } from '../domain/pagamento.js';

export function falhar(codigo, mensagem) { throw new ErroDeNegocio(codigo, mensagem); }

export function id(valor) {
  if (!/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor))) {
    falhar('ID_INVALIDO', 'Informe um identificador inteiro positivo.');
  }
  return Number(valor);
}

export function texto(valor, campo, limite) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > limite) {
    falhar('DADOS_INVALIDOS', `${campo} é obrigatório e deve ter até ${limite} caracteres.`);
  }
  return valor.trim();
}

export function dadosPlano(dados) {
  const duracao_dias = dados.duracao_dias;
  if (!Number.isSafeInteger(duracao_dias) || duracao_dias < 1 || duracao_dias > 36500) {
    falhar('DURACAO_INVALIDA', 'A duração deve ser um inteiro de 1 a 36500 dias.');
  }
  const ativo = dados.ativo ?? true;
  if (typeof ativo !== 'boolean') falhar('DADOS_INVALIDOS', 'ativo deve ser verdadeiro ou falso.');
  return {
    nome: texto(dados.nome, 'Nome do plano', 60),
    valor: (emCentavos(dados.valor) / 100).toFixed(2),
    duracao_dias, ativo,
  };
}

export function dadosAluno(dados, hoje) {
  const nascimento = dados.data_nascimento;
  validarData(nascimento);
  if (nascimento > hoje) falhar('DADOS_INVALIDOS', 'A data de nascimento não pode estar no futuro.');
  const inicio = dados.data_inicio_plano;
  const vencimento = dados.data_vencimento;
  validarData(inicio); validarData(vencimento);
  if (vencimento < inicio) falhar('DADOS_INVALIDOS', 'O vencimento não pode ser anterior ao início do plano.');
  return {
    nome: texto(dados.nome, 'Nome do aluno', 120),
    cpf: validarCpf(dados.cpf),
    telefone: texto(dados.telefone, 'Telefone', 20),
    data_nascimento: nascimento,
    id_plano: id(dados.id_plano),
    data_inicio_plano: inicio,
    data_vencimento: vencimento,
  };
}

export function hojeEmSaoPaulo(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(agora);
  const campo = tipo => partes.find(p => p.type === tipo).value;
  return `${campo('year')}-${campo('month')}-${campo('day')}`;
}
