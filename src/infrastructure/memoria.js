import { ErroDeNegocio } from '../domain/erro.js';

// Exclusivo para testes e demonstração. Reiniciar apaga os registros.
export function criarRepositorioMemoria() {
  let estado = { planos: [], alunos: [], pagamentos: [], checkins: [], sequencias: {} };
  let fila = Promise.resolve();
  const conflito = () => { throw new ErroDeNegocio('REGISTRO_VINCULADO', 'O cadastro possui vínculos. Use cancelamento ou desativação para preservar o histórico.'); };
  const copiar = structuredClone;
  return {
    modo: 'memoria',
    async ping() { return true; },
    async fechar() {},
    async listarPlanos() { await fila; return copiar(estado.planos); },
    async listarAlunos(busca, status) {
      await fila;
      const termo = busca.toLocaleLowerCase('pt-BR');
      return copiar(estado.alunos.filter(a => (!status || a.status_matricula === status)
        && (a.nome.toLocaleLowerCase('pt-BR').includes(termo) || a.cpf.includes(termo))).slice(0, 100));
    },
    async transacao(executar) {
      const tarefa = fila.then(async () => {
        const trabalho = copiar(estado);
        const inserir = (tabela, chave, dados) => {
          const numero = (trabalho.sequencias[tabela] ?? 0) + 1;
          trabalho.sequencias[tabela] = numero;
          const registro = { ...copiar(dados), [chave]: numero };
          trabalho[tabela].push(registro); return copiar(registro);
        };
        const atualizar = (tabela, chave, numero, dados) => {
          const indice = trabalho[tabela].findIndex(x => x[chave] === numero);
          trabalho[tabela][indice] = { ...trabalho[tabela][indice], ...copiar(dados), [chave]: numero };
          return copiar(trabalho[tabela][indice]);
        };
        const cpfUnico = (dados, numero) => {
          if (trabalho.alunos.some(a => a.cpf === dados.cpf && a.id_aluno !== numero)) {
            throw new ErroDeNegocio('CPF_DUPLICADO', 'Já existe um aluno com esse CPF.');
          }
        };
        const tx = {
          async aluno(numero) { return copiar(trabalho.alunos.find(a => a.id_aluno === numero)); },
          async plano(numero) { return copiar(trabalho.planos.find(p => p.id_plano === numero)); },
          async inserirPlano(dados) { return inserir('planos', 'id_plano', dados); },
          async atualizarPlano(numero, dados) { return atualizar('planos', 'id_plano', numero, dados); },
          async inserirAluno(dados) { cpfUnico(dados); return inserir('alunos', 'id_aluno', dados); },
          async atualizarAluno(numero, dados) { cpfUnico(dados, numero); return atualizar('alunos', 'id_aluno', numero, dados); },
          async inserirCheckin(dados) { return inserir('checkins', 'id_checkin', { ...dados, data_hora: new Date().toISOString() }); },
          async inserirPagamento(dados) { return inserir('pagamentos', 'id_pagamento', { ...dados, data_pagamento: new Date().toISOString() }); },
          async historico(numero, tipo) { return copiar(trabalho[tipo].filter(x => x.id_aluno === numero).reverse().slice(0, 100)); },
          async excluirAluno(numero) {
            if ([...trabalho.pagamentos, ...trabalho.checkins].some(x => x.id_aluno === numero)) conflito();
            trabalho.alunos = trabalho.alunos.filter(a => a.id_aluno !== numero);
          },
          async excluirPlano(numero) {
            if (trabalho.alunos.some(a => a.id_plano === numero) || trabalho.pagamentos.some(p => p.id_plano_vigente === numero)) conflito();
            trabalho.planos = trabalho.planos.filter(p => p.id_plano !== numero);
          },
        };
        const resultado = await executar(tx);
        estado = trabalho; // Só publicar as alterações se a operação inteira concluir.
        return resultado;
      });
      fila = tarefa.catch(() => {});
      return tarefa;
    },
  };
}
