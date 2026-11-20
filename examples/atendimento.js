import { avaliarAcesso } from '../src/domain/acesso.js';
import { prepararPagamento } from '../src/domain/pagamento.js';

// Dados fictícios, sem CPF ou outros dados pessoais. Não há gravação em banco.
const hoje = '2026-11-19';
const plano = { id_plano: 1, nome: 'Mensal', valor: '119.90', duracao_dias: 30, ativo: true };
const aluno = { id_aluno: 1, id_plano: 1, status_matricula: 'ATIVO', data_vencimento: '2026-10-15' };

console.log('Antes do pagamento:', avaliarAcesso(aluno, hoje));
const pagamento = prepararPagamento(aluno, plano, '119.90', hoje);
console.log('Pagamento calculado:', pagamento);
const regularizado = { ...aluno, data_vencimento: pagamento.novo_vencimento };
console.log('Após a regularização:', avaliarAcesso(regularizado, hoje));
