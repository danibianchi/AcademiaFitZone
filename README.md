# Sistema de gestão da academia FitZone

Projeto de Daniela Vanessa Bianchi, da disciplina de Laboratório de Engenharia de Software da FATEC Indaiatuba.

O sistema controla alunos, planos, pagamentos e check-ins. Esta versão contém a API e as regras de negócio, com MySQL para persistência e memória para demonstração. As telas e os relatórios ainda serão construídos.

## Funcionalidades

- Cadastro, edição e consulta de alunos e planos.
- Validação dos dígitos do CPF e bloqueio de duplicidade.
- Busca por nome, CPF e situação da matrícula.
- Check-in em dia, com alerta de 1 a 30 dias de atraso ou bloqueado acima de 30 dias.
- Registro de todas as tentativas de check-in, inclusive bloqueadas.
- Pagamento com conferência de valor e cálculo do vencimento.
- Pagamento e atualização do vencimento na mesma transação.
- Troca de plano, cancelamento e reativação da matrícula.
- Históricos de pagamentos e check-ins.
- Exclusão física somente quando não existem vínculos a preservar.

Não há autenticação nesta versão. O servidor aceita apenas endereço de loopback e se destina ao desenvolvimento local com dados fictícios. O CPF é validado pelos dígitos, sem consultar titularidade ou situação cadastral.

## Demonstração sem banco

Requer Node.js 22.16 ou superior. A demonstração e os testes usam o servidor HTTP nativo do Node, sem instalação de dependências.

```powershell
npm.cmd test
npm.cmd run start:demo
```

Consultar http://127.0.0.1:3000/api/saude deve retornar armazenamento igual a memoria. O banco começa vazio e os dados são apagados ao encerrar. Para parar, pressionar Ctrl+C no terminal. Esse modo não comprova persistência no MySQL nem execução pelo Express.

## Executar com MySQL e Express

1. Instalar as bibliotecas com `npm.cmd install`.
2. Abrir o Docker Desktop.
3. Copiar `.env.example` para `.env` e preencher MYSQL_PASSWORD e MYSQL_ROOT_PASSWORD com senhas locais distintas. O `.env` é ignorado pelo Git.
4. Iniciar o banco e a API:

```powershell
docker compose up -d --wait
npm.cmd start
```

O MySQL usa a porta local 3307, o banco db_academia_fitzone e o usuário fitzone. O esquema e os três planos de exemplo são criados na primeira inicialização de um volume vazio. Depois, o volume mantém os dados. `docker compose stop` para o banco sem apagar o volume.

A API normal exige MySQL: não muda silenciosamente para memória quando há falha de conexão. A inicialização do MySQL e do Express ainda não foi comprovada nesta etapa: o ambiente bloqueou o download das bibliotecas e a inicialização do Docker. O lockfile será gerado quando a instalação for concluída.

Se usar MySQL instalado diretamente, executar database/01_schema_DanielaBianchi.sql uma vez em uma base de desenvolvimento e ajustar o .env. Executar novamente o INSERT inicial desse script pode duplicar os planos.

## Endpoints

Alterações com corpo devem enviar Content-Type application/json. Mesmo ações sem campos usam `{}`. Erros retornam os campos erro e mensagem.

| Método | Caminho | Operação |
| --- | --- | --- |
| GET | /api/saude | Verificar API e armazenamento |
| GET / POST | /api/planos | Listar ou cadastrar planos |
| PUT / DELETE | /api/planos/:id | Editar ou excluir plano |
| GET / POST | /api/alunos | Buscar ou cadastrar alunos |
| GET / PATCH / DELETE | /api/alunos/:id | Consultar, editar dados ou excluir aluno |
| POST | /api/alunos/:id/plano | Trocar plano vigente |
| POST | /api/alunos/:id/cancelamento | Cancelar matrícula |
| POST | /api/alunos/:id/reativacao | Reativar com um plano |
| GET / POST | /api/alunos/:id/checkins | Consultar tentativas ou realizar check-in |
| GET / POST | /api/alunos/:id/pagamentos | Consultar histórico ou registrar pagamento |

Busca: `/api/alunos?busca=nome-ou-cpf&status=ATIVO`. A consulta retorna até 100 alunos; os históricos retornam os últimos 100 registros em ordem decrescente. Ainda não há paginação. Plano usa PUT com todos os campos. Aluno usa PATCH; situação, plano e vencimento só mudam pelos fluxos próprios.

Check-in bloqueado retorna HTTP 201 porque a tentativa foi registrada; permitido informa a decisão. A data operacional vem do servidor no fuso America/Sao_Paulo. Horários gerados pela API são UTC; datas de nascimento, início e vencimento usam AAAA-MM-DD.

### Atendimento em PowerShell

No modo de demonstração, criar primeiro o plano e o aluno. Os dados abaixo são fictícios; o CPF é uma sequência de teste do algoritmo.

```powershell
$baseFitzone = 'http://127.0.0.1:3000/api'
$planoFitzone = Invoke-RestMethod "$baseFitzone/planos" -Method Post -ContentType 'application/json' -Body (@{
  nome = 'Mensal'; valor = '119.90'; duracao_dias = 30
} | ConvertTo-Json)
$alunoFitzone = Invoke-RestMethod "$baseFitzone/alunos" -Method Post -ContentType 'application/json' -Body (@{
  nome = 'Aluno de teste'; cpf = '52998224725'; telefone = '00000000000'
  data_nascimento = '2000-01-01'; id_plano = $planoFitzone.id_plano
  data_inicio_plano = '2026-09-15'; data_vencimento = '2026-10-15'
} | ConvertTo-Json)
$alunoIdFitzone = $alunoFitzone.id_aluno
Invoke-RestMethod "$baseFitzone/alunos/$alunoIdFitzone/checkins" -Method Post -ContentType 'application/json' -Body '{}'
Invoke-RestMethod "$baseFitzone/alunos/$alunoIdFitzone/pagamentos" -Method Post -ContentType 'application/json' -Body '{"valor_pago":"119.90"}'
Invoke-RestMethod "$baseFitzone/alunos/$alunoIdFitzone/checkins" -Method Post -ContentType 'application/json' -Body '{}'
Invoke-RestMethod "$baseFitzone/alunos/$alunoIdFitzone/checkins"
```

## Organização e decisões

```text
src/domain/          Regras de negócio
src/application/     Casos de uso e limites transacionais
src/infrastructure/  MySQL e memória
src/http/            Rotas, JSON e respostas
src/server.js        Inicialização
```

A proposta documental previa Prisma. Nesta implementação inicial foi escolhido MySQL2 com SQL parametrizado para deixar explícitas as consultas, transações e bloqueios. Express continua como servidor normal. O handler HTTP é exercitado nos testes com o servidor nativo do Node. Essa escolha deverá ser refletida na arquitetura documental ao consolidar a implementação.

O pagamento consulta aluno e plano vigente na mesma transação, bloqueando as linhas com FOR UPDATE. Ele grava o lançamento e o vencimento juntos e reverte em caso de erro. O check-in grava a decisão antes da confirmação. Pagamentos mantêm o valor pago e os vencimentos; a referência ao plano não preserva todas as alterações históricas do cadastro do plano.

Referências: [Express](https://expressjs.com/en/guide/error-handling/), [MySQL2](https://sidorares.github.io/node-mysql2/docs) e [Docker Desktop](https://docs.docker.com/reference/cli/docker/desktop/start/).

## Validação e próximos passos

Os testes verificam domínio, HTTP, erros, duplicidade, históricos, renovação simultânea em memória e contrato de commit/rollback com uma conexão MySQL simulada. Não substituem testes contra MySQL real ou contra a inicialização pelo Express.

Faltam validar o banco real, adicionar telas React/TypeScript, relatórios, paginação e autenticação. Desempenho, disponibilidade e usabilidade ainda não foram medidos.

Repositório: https://github.com/danibianchi/AcademiaFitZone
