import { avaliarAcesso } from '../domain/acesso.js';
import { prepararPagamento } from '../domain/pagamento.js';
import { cancelarMatricula, trocarPlano, reativarMatricula } from '../domain/matricula.js';
import { dadosPlano, dadosAluno, id, texto, falhar, hojeEmSaoPaulo } from './validacao.js';

export function criarAcademia(repositorio, hoje = hojeEmSaoPaulo) {
  async function alunoExistente(tx, numero) {
    const aluno = await tx.aluno(id(numero));
    if (!aluno) falhar('NAO_ENCONTRADO', 'Aluno não encontrado.');
    return aluno;
  }
  async function planoExistente(tx, numero, exigirAtivo = false) {
    const plano = await tx.plano(id(numero));
    if (!plano) falhar('NAO_ENCONTRADO', 'Plano não encontrado.');
    if (exigirAtivo && ![true, 1].includes(plano.ativo)) falhar('PLANO_INATIVO', 'Selecione um plano ativo.');
    return plano;
  }
  return {
    listarPlanos: () => repositorio.listarPlanos(),
    listarAlunos: async (busca = '', status = '') => {
      if (busca.length > 120) falhar('DADOS_INVALIDOS', 'Busca deve ter até 120 caracteres.');
      if (status && !['ATIVO', 'CANCELADO'].includes(status)) falhar('DADOS_INVALIDOS', 'Situação inválida.');
      const termo = busca.trim();
      return repositorio.listarAlunos(/^[\d.-]+$/.test(termo) ? termo.replace(/[.-]/g, '') : termo, status);
    },
    criarPlano: dados => repositorio.transacao(tx => tx.inserirPlano(dadosPlano(dados))),
    editarPlano: (numero, dados) => repositorio.transacao(async tx => {
      await planoExistente(tx, numero);
      return tx.atualizarPlano(id(numero), dadosPlano(dados));
    }),
    excluirPlano: numero => repositorio.transacao(async tx => {
      await planoExistente(tx, numero);
      await tx.excluirPlano(id(numero));
    }),
    criarAluno: dados => repositorio.transacao(async tx => {
      const entrada = dadosAluno(dados, hoje());
      await planoExistente(tx, entrada.id_plano, true);
      return tx.inserirAluno({ ...entrada, status_matricula: 'ATIVO' });
    }),
    consultarAluno: numero => repositorio.transacao(tx => alunoExistente(tx, numero)),
    editarAluno: (numero, dados) => repositorio.transacao(async tx => {
      const aluno = await alunoExistente(tx, numero);
      // Plano, vencimento e situação só mudam pelos fluxos próprios.
      const entrada = dadosAluno({ ...aluno, ...dados, id_plano: aluno.id_plano,
        data_inicio_plano: aluno.data_inicio_plano, data_vencimento: aluno.data_vencimento }, hoje());
      return tx.atualizarAluno(aluno.id_aluno, { ...entrada, status_matricula: aluno.status_matricula });
    }),
    excluirAluno: numero => repositorio.transacao(async tx => {
      const aluno = await alunoExistente(tx, numero);
      await tx.excluirAluno(aluno.id_aluno);
    }),
    cancelar: numero => repositorio.transacao(async tx => {
      const aluno = await alunoExistente(tx, numero);
      return tx.atualizarAluno(aluno.id_aluno, cancelarMatricula(aluno));
    }),
    alterarPlano: (numero, planoId, reativar = false) => repositorio.transacao(async tx => {
      const aluno = await alunoExistente(tx, numero);
      const plano = await planoExistente(tx, planoId, true);
      const atualizado = reativar ? reativarMatricula(aluno, plano, hoje()) : trocarPlano(aluno, plano, hoje());
      return tx.atualizarAluno(aluno.id_aluno, atualizado);
    }),
    checkin: numero => repositorio.transacao(async tx => {
      const aluno = await alunoExistente(tx, numero);
      const resultado = avaliarAcesso(aluno, hoje());
      return tx.inserirCheckin({ id_aluno: aluno.id_aluno, ...resultado });
    }),
    pagar: (numero, dados) => repositorio.transacao(async tx => {
      // A ordem de bloqueio é sempre aluno -> plano. O valor e a vigência
      // são lidos dentro da transação, nunca aceitos do navegador.
      const aluno = await alunoExistente(tx, numero);
      const plano = await planoExistente(tx, aluno.id_plano);
      const pagamento = prepararPagamento(aluno, plano, dados.valor_pago, hoje());
      const observacao = dados.observacao == null || dados.observacao === '' ? null : texto(dados.observacao, 'Observação', 150);
      const salvo = await tx.inserirPagamento({ ...pagamento, observacao });
      await tx.atualizarAluno(aluno.id_aluno, { ...aluno, data_vencimento: salvo.novo_vencimento });
      return salvo;
    }),
    historico: (numero, tipo) => repositorio.transacao(async tx => {
      const aluno = await alunoExistente(tx, numero);
      return tx.historico(aluno.id_aluno, tipo);
    }),
  };
}
