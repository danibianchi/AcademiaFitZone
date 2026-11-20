# Sistema de gestão da academia FitZone

Projeto de Daniela Vanessa Bianchi, da disciplina de Laboratório de Engenharia de Software da FATEC Indaiatuba.

O sistema proposto controla alunos, planos, pagamentos e check-ins. A primeira etapa implementa as regras de negócio, separadas da interface e do banco de dados.

## O que já funciona

- Validação dos dígitos do CPF e normalização da máscara.
- Avaliação de acesso: em dia, atraso de 1 a 30 dias, atraso superior a 30 dias e matrícula cancelada.
- Cálculo do pagamento e do novo vencimento, preservando dias restantes em pagamento antecipado.
- Troca de plano, cancelamento e reativação de matrícula.
- Testes automáticos e demonstração com dados fictícios.

Esta etapa ainda não possui telas, API HTTP ou gravação em banco. A validação de CPF verifica os dígitos, sem consultar situação cadastral ou titularidade. A unicidade do CPF deverá ser conferida na persistência, além da restrição UNIQUE do MySQL.

## Executar

É necessário Node.js 22.8 ou superior. Nesta etapa não há dependências externas nem necessidade de executar `npm install`.

Na pasta do projeto:

```powershell
npm.cmd test
npm.cmd run demo
```

Também é possível executar diretamente:

```powershell
node --test --test-isolation=none
node examples/atendimento.js
```

A demonstração usa a data fixa de 19/11/2026 para que os resultados possam ser repetidos. Ela não salva registros e não representa um teste da aplicação completa.

## Organização

```text
src/domain/    Regras de negócio e validações
test/          Testes das regras
examples/      Demonstração de atendimento
database/      Esquema SQL inicial
```

O SQL foi trazido da documentação revisada. Não foi executado nesta etapa. Ele cria `db_academia_fitzone`, quatro tabelas e três planos de exemplo. Use uma base de desenvolvimento: executar o script novamente pode duplicar os planos, pois o INSERT inicial não é idempotente.

## Próximas etapas

1. Criar a API em Node.js e Express e conectar ao MySQL com Prisma.
2. Gravar toda tentativa de check-in, inclusive as bloqueadas, antes de confirmar o resultado ao operador.
3. Gravar pagamento e alteração de vencimento na mesma transação, consultando o plano vigente com proteção contra operações simultâneas.
4. Criar as telas em React e TypeScript para alunos, planos, pagamentos e check-in.
5. Acrescentar históricos e relatórios, distinguindo acessos permitidos de tentativas bloqueadas.
6. Definir autenticação e permissões e realizar os testes de integração.

Referências para a próxima etapa: [Express](https://expressjs.com/en/starter/installing/), [Vite](https://vite.dev/guide/) e [Prisma com MySQL](https://www.prisma.io/docs/orm/overview/databases/mysql).

Não há promessa de desempenho ou disponibilidade medida nesta etapa. Os testes atuais verificam funções do domínio; não substituem os casos de teste de interface, API e banco previstos na documentação.

## Repositório

Destino: https://github.com/danibianchi/AcademiaFitZone

```powershell
git status
git log --oneline
git push -u origin main
```

O comando de envio requer acesso ao GitHub e autenticação da conta. Caso o repositório remoto já tenha arquivos, integrar esse histórico antes do primeiro envio; não usar envio forçado.
