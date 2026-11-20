<p align="center">
  <img src="docs/logo-fitzone.svg" alt="FitZone" width="560">
</p>

<h1 align="center">Sistema de gestão da academia FitZone</h1>

<p align="center">
  Projeto Integrador da disciplina de Laboratório de Engenharia de Software da FATEC Indaiatuba.
</p>

<p align="center">
  <a href="#sobre-o-projeto">Sobre</a> ·
  <a href="#executar-a-demonstração">Como executar</a> ·
  <a href="#funcionalidades">Funcionalidades</a> ·
  <a href="#tecnologias-e-organização">Tecnologias</a> ·
  <a href="#autoria-e-orientação">Autoria</a>
</p>

## Sobre o projeto

O FitZone reúne o atendimento da recepção em um sistema web: cadastro de alunos e planos, captura de foto pela webcam, registro de pagamentos, controle de entrada e consulta de históricos.

A interface utiliza tema escuro em preto e laranja, cabeçalho fixo que se compacta ao rolar a página, navegação fluida e uma ficha de atendimento para o aluno selecionado. O sistema aplica as regras de vencimento e matrícula antes de permitir o check-in e protege os dados sensíveis (LGPD) mascarando o CPF nas telas de exibição.

## Executar a demonstração

A demonstração funciona sem instalar dependências ou configurar banco de dados. É necessário **Node.js 22.16 ou superior**.

Para baixar e iniciar o projeto:

```powershell
git clone https://github.com/danibianchi/AcademiaFitZone.git
cd AcademiaFitZone
npm.cmd run start:demo
```

Depois, abrir **http://127.0.0.1:3000/** no navegador.

Se o projeto já estiver no computador, executar o comando dentro da pasta que contém o `package.json`. Na organização local da disciplina, essa pasta se chama `sistema-fitzone`.

A demonstração começa com três planos de exemplo e nenhum aluno. **Os registros ficam em memória e são apagados ao reiniciar o servidor.** Usar somente dados fictícios. Para encerrar, pressionar `Ctrl+C` no terminal.

### Primeiro atendimento

1. Em **Alunos** ou **+ Cadastrar aluno**, cadastrar um aluno fictício (com máscaras automáticas de CPF e telefone), capturar opcionalmente a **foto pela webcam** e conferir as datas de início e vencimento.
2. Em **Atendimento**, buscar pelo nome ou CPF e clicar no **card do aluno** para abrir a ficha.
3. Clicar em **Registrar check-in** para avaliar a entrada (*Check-in registrado* quando liberado ou *Tentativa registrada no histórico* quando bloqueado).
4. Para regularizar a mensalidade, usar **Registrar pagamento** e conferir o novo vencimento.
5. Fazer outro check-in para reavaliar o acesso ou abrir **Ver históricos** para consultar e filtrar os registros.

## Funcionalidades

| Área | Operações disponíveis |
| --- | --- |
| **Alunos** | Cadastrar e editar com máscaras numéricas (CPF e telefone), capturar foto pela webcam, buscar por nome ou CPF e filtrar pela situação da matrícula. |
| **Planos** | Cadastrar e editar nome, valor e duração; ativar ou desativar para novas matrículas. |
| **Check-in** | Avaliar o acesso, exibir identificação com foto e registrar entradas permitidas ou tentativas bloqueadas. |
| **Pagamentos** | Conferir o valor do plano, registrar o pagamento e calcular o novo vencimento. |
| **Matrículas** | Trocar de plano, cancelar e reativar a matrícula. |
| **Históricos** | Consultar pagamentos e entradas do aluno selecionado com barra de busca e filtro por tipo de registro. |

### Diferenciais de interface e segurança

- **Foto do aluno no ato pela webcam:** captura integrada ao cadastro e à edição sem sair do modal, exibindo o retrato na lista de atendimento, na ficha, na tabela de alunos e nos históricos.
- **Proteção de dados (LGPD):** o CPF do aluno cadastrado é exibido parcialmente mascarado (`***.XXX.XXX-**`) em todas as telas do sistema, preservando dados sensíveis na recepção.
- **Máscaras e validação numérica:** CPF (11 dígitos) e telefone (10 ou 11 dígitos) aplicam máscara automática durante a digitação e bloqueiam caracteres não numéricos tanto na interface quanto na API.
- **Navegação e usabilidade:** cards de atendimento 100% clicáveis, cabeçalho fixo compacto ao rolar a página, botão **Voltar** em todas as telas e transições suaves.

A exclusão física de alunos e planos só é permitida quando não existem vínculos a preservar. Cancelamento e desativação mantêm os históricos.

### Regras de acesso

| Situação do aluno | Decisão no check-in |
| --- | --- |
| Matrícula ativa e mensalidade em dia | Permitir a entrada. |
| Matrícula ativa com atraso de **1 a 30 dias** | Permitir a entrada com alerta. |
| Matrícula ativa com atraso **superior a 30 dias** | Bloquear a entrada. |
| Matrícula cancelada | Bloquear a entrada, independentemente do vencimento. |

O pagamento antecipado preserva os dias restantes do plano. O pagamento de uma matrícula cancelada **não reativa o cadastro**: é necessário usar a operação de reativação com um plano ativo.

O CPF é validado pelos dígitos verificadores e pela unicidade no cadastro. Não há consulta de titularidade ou situação cadastral.

## Tecnologias e organização

| Parte do sistema | Tecnologias |
| --- | --- |
| Interface | HTML, CSS e JavaScript, sem etapa de compilação. |
| API | Node.js; Express no modo com MySQL. |
| Persistência | MySQL com InnoDB e driver MySQL2. |
| Demonstração | Servidor HTTP nativo do Node.js e repositório em memória. |
| Testes | Executor nativo `node:test`. |

```text
src/
├── domain/          Regras de negócio
├── application/     Casos de uso e validações
├── infrastructure/  Adaptadores MySQL e memória
├── http/            Rotas, respostas e arquivos públicos
└── server.js        Inicialização do sistema
web/                 Interface e logo
database/            Esquema SQL inicial
test/                Testes automatizados
docs/                Materiais do repositório
```

No modo MySQL, o pagamento e a atualização do vencimento usam a mesma transação. As linhas do aluno e do plano vigente são consultadas com `FOR UPDATE`; se houver falha, as alterações são revertidas. O check-in registra a decisão antes de confirmar a operação ao usuário.

A implementação atual utiliza MySQL2 e JavaScript na interface. A arquitetura documental deverá ser alinhada a essas escolhas ao consolidar o projeto.

## Acessar pela rede local

Para iniciar a demonstração em todas as interfaces IPv4 do computador:

```powershell
npm.cmd run start:lan
```

O terminal mostra os endereços disponíveis. Em outro aparelho conectado à mesma rede, abrir `http://IP-DO-COMPUTADOR:3000/`.

Se a porta 3000 já estiver ocupada, escolher outra sem interromper a instância existente:

```powershell
npm.cmd run start:lan -- --port=3001
```

Nesse caso, acessar `http://IP-DO-COMPUTADOR:3001/`. Cada processo de demonstração tem seus próprios dados em memória. Para usar MySQL pela rede, executar `npm.cmd run start:mysql:lan`.

O modo de rede aceita os endereços das conexões recebidas pela máquina e mantém a verificação de origem das requisições. Os arquivos privados continuam fora das rotas públicas. O MySQL do Docker permanece publicado apenas no próprio computador.

Se o Windows bloquear conexões de outros aparelhos, executar uma vez em **PowerShell como administrador**, ajustando a porta se necessário:

```powershell
New-NetFirewallRule -Name 'FitZoneLAN3001' -DisplayName 'FitZone - Rede local (3001)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001 -RemoteAddress LocalSubnet -Profile Any -Program (Get-Command node.exe).Source
```

A regra permite somente clientes da sub-rede local na porta indicada para o Node.js. A aplicação ainda não tem login; usar em uma rede de confiança com dados fictícios.

> **Sobre o uso da webcam:** nos navegadores modernos, a captura de foto funciona diretamente em `http://127.0.0.1` ou `http://localhost`. Ao acessar por outro aparelho via IP na rede local, o navegador do cliente pode exigir HTTPS ou configuração de origem segura para liberar a câmera.

## Executar com MySQL

Este modo exige as dependências do projeto e o Docker Desktop em execução.

1. Instalar as bibliotecas com `npm.cmd install`.
2. Copiar `.env.example` para `.env`, caso ainda não exista uma configuração local.
3. Preencher `MYSQL_PASSWORD` e `MYSQL_ROOT_PASSWORD` com senhas distintas. O arquivo `.env` é ignorado pelo Git.
4. Iniciar o banco e o sistema:

```powershell
docker compose up -d --wait
npm.cmd start
```

| Configuração local | Valor |
| --- | --- |
| Aplicação | `http://127.0.0.1:3000/` |
| Porta do MySQL | `3307` |
| Banco de dados | `db_academia_fitzone` |
| Usuário da aplicação | `fitzone` |

O esquema e os planos de exemplo são criados na primeira inicialização de um volume vazio. O volume mantém os registros nas próximas execuções. Para parar o banco sem apagar os dados, usar `docker compose stop`.

A aplicação exige conexão com o MySQL nesse modo; uma falha não provoca troca automática para memória. **A execução com MySQL e Express ainda precisa ser validada no ambiente completo.** A instalação das dependências e a inicialização do Docker não puderam ser concluídas no ambiente usado até esta etapa. O `package-lock.json` será gerado quando a instalação for concluída.

<details>
<summary>Usar uma instalação própria do MySQL</summary>

Executar [database/01_schema_DanielaBianchi.sql](database/01_schema_DanielaBianchi.sql) uma vez em uma base de desenvolvimento e ajustar o `.env`.

Executar novamente o `INSERT` inicial desse script pode duplicar os planos de exemplo.

</details>

## Testes e estado do projeto

Para executar os testes:

```powershell
npm.cmd test
```

A suíte verifica regras de negócio, requisições HTTP, duplicidade de CPF, históricos, erros de entrada, renovação simultânea em memória e o contrato de transação do adaptador MySQL com uma conexão simulada. Também confere o acesso aos arquivos públicos da interface e o bloqueio de arquivos privados.

Esses testes não substituem a validação com um servidor MySQL real nem os testes de interação no navegador.

| Estado | Itens |
| --- | --- |
| **Implementado** | Telas de atendimento e cadastros, API, regras de negócio, históricos e modo de demonstração. |
| **Em validação** | Integração com MySQL/Express e testes de interação no navegador. |
| **Próximas etapas** | Relatórios, paginação e autenticação. |

Esta versão se destina ao desenvolvimento no próprio computador ou em uma rede local de confiança, com dados fictícios. Ainda não possui autenticação. Desempenho, disponibilidade e usabilidade não foram medidos.

## Referência da API

<details>
<summary>Consultar endpoints e convenções</summary>

Requisições de alteração com corpo devem enviar `Content-Type: application/json`. Ações sem campos usam `{}`. Respostas de erro contêm `erro` e `mensagem`.

| Método | Caminho | Operação |
| --- | --- | --- |
| `GET` | `/api/saude` | Verificar API e armazenamento. |
| `GET` / `POST` | `/api/planos` | Listar ou cadastrar planos. |
| `PUT` / `DELETE` | `/api/planos/:id` | Editar ou excluir plano. |
| `GET` / `POST` | `/api/alunos` | Buscar ou cadastrar alunos. |
| `GET` / `PATCH` / `DELETE` | `/api/alunos/:id` | Consultar, editar ou excluir aluno. |
| `POST` | `/api/alunos/:id/plano` | Trocar o plano vigente. |
| `POST` | `/api/alunos/:id/cancelamento` | Cancelar a matrícula. |
| `POST` | `/api/alunos/:id/reativacao` | Reativar a matrícula. |
| `GET` / `POST` | `/api/alunos/:id/checkins` | Consultar tentativas ou registrar check-in. |
| `GET` / `POST` | `/api/alunos/:id/pagamentos` | Consultar histórico ou registrar pagamento. |

Exemplo de busca: `/api/alunos?busca=nome-ou-cpf&status=ATIVO`.

A consulta retorna até 100 alunos. Os históricos retornam os últimos 100 registros em ordem decrescente. O plano usa `PUT` com todos os campos; o aluno usa `PATCH`. Situação, plano e vencimento só mudam pelas operações próprias.

Uma tentativa de check-in bloqueada retorna HTTP `201` porque o registro foi criado; o campo `permitido` informa a decisão de acesso.

A data operacional vem do servidor no fuso `America/Sao_Paulo`. Os horários gerados pela API são UTC. Datas de nascimento, início e vencimento usam `AAAA-MM-DD`.

</details>

## Referências técnicas

- [Express](https://expressjs.com/en/guide/error-handling/)
- [MySQL2](https://sidorares.github.io/node-mysql2/docs)
- [Docker Desktop](https://docs.docker.com/reference/cli/docker/desktop/start/)

## Autoria e orientação

**Daniela Bianchi**

Aluna do **3º semestre de Análise e Desenvolvimento de Sistemas**, na **FATEC Indaiatuba**.

**Professor:** Marlon.

**Disciplina:** Laboratório de Engenharia de Software.
