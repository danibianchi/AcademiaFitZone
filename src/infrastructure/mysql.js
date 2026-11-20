import { ErroDeNegocio } from '../domain/erro.js';

export function traduzirErroBanco(error) {
  if (error.code === 'ER_DUP_ENTRY') return new ErroDeNegocio('CPF_DUPLICADO', 'Já existe um aluno com esse CPF.');
  if (['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2'].includes(error.code)) {
    return new ErroDeNegocio('REGISTRO_VINCULADO', 'O cadastro possui vínculos ou uma referência deixou de existir.');
  }
  return error;
}

export function criarRepositorioMysql(pool) {
  const executar = async (conexao, sql, parametros = []) => (await conexao.execute(sql, parametros))[0];
  function unidade(conexao) {
    const sql = (consulta, parametros) => executar(conexao, consulta, parametros);
    const aluno = async numero => (await sql('SELECT * FROM tb_alunos WHERE id_aluno = ? FOR UPDATE', [numero]))[0];
    const plano = async numero => (await sql('SELECT * FROM tb_planos WHERE id_plano = ? FOR UPDATE', [numero]))[0];
    return {
      aluno, plano,
      async inserirPlano(p) {
        const r = await sql('INSERT INTO tb_planos (nome, valor, duracao_dias, ativo) VALUES (?, ?, ?, ?)', [p.nome, p.valor, p.duracao_dias, p.ativo]);
        return plano(r.insertId);
      },
      async atualizarPlano(numero, p) {
        await sql('UPDATE tb_planos SET nome=?, valor=?, duracao_dias=?, ativo=? WHERE id_plano=?', [p.nome, p.valor, p.duracao_dias, p.ativo, numero]);
        return plano(numero);
      },
      async inserirAluno(a) {
        const r = await sql('INSERT INTO tb_alunos (nome, cpf, telefone, data_nascimento, id_plano, data_inicio_plano, data_vencimento, status_matricula) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [a.nome, a.cpf, a.telefone, a.data_nascimento, a.id_plano, a.data_inicio_plano, a.data_vencimento, a.status_matricula]);
        return aluno(r.insertId);
      },
      async atualizarAluno(numero, a) {
        await sql('UPDATE tb_alunos SET nome=?, cpf=?, telefone=?, data_nascimento=?, id_plano=?, data_inicio_plano=?, data_vencimento=?, status_matricula=? WHERE id_aluno=?', [a.nome, a.cpf, a.telefone, a.data_nascimento, a.id_plano, a.data_inicio_plano, a.data_vencimento, a.status_matricula, numero]);
        return aluno(numero);
      },
      async inserirPagamento(p) {
        const r = await sql('INSERT INTO tb_pagamentos (id_aluno, id_plano_vigente, valor_pago, vencimento_anterior, novo_vencimento, observacao, data_pagamento) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())', [p.id_aluno, p.id_plano_vigente, p.valor_pago, p.vencimento_anterior, p.novo_vencimento, p.observacao]);
        return (await sql('SELECT * FROM tb_pagamentos WHERE id_pagamento=?', [r.insertId]))[0];
      },
      async inserirCheckin(c) {
        const r = await sql('INSERT INTO tb_checkins (id_aluno, permitido, dias_atraso, alerta_emitido, motivo_bloqueio, data_hora) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())', [c.id_aluno, c.permitido, c.dias_atraso, c.alerta_emitido, c.motivo_bloqueio]);
        return (await sql('SELECT * FROM tb_checkins WHERE id_checkin=?', [r.insertId]))[0];
      },
      async historico(numero, tipo) {
        // Identificadores abaixo são constantes internas, nunca texto do usuário.
        const consulta = tipo === 'pagamentos'
          ? 'SELECT * FROM tb_pagamentos WHERE id_aluno=? ORDER BY id_pagamento DESC LIMIT 100'
          : 'SELECT * FROM tb_checkins WHERE id_aluno=? ORDER BY id_checkin DESC LIMIT 100';
        return sql(consulta, [numero]);
      },
      async excluirAluno(numero) { await sql('DELETE FROM tb_alunos WHERE id_aluno=?', [numero]); },
      async excluirPlano(numero) { await sql('DELETE FROM tb_planos WHERE id_plano=?', [numero]); },
    };
  }
  return {
    modo: 'mysql',
    async ping() { await pool.execute('SELECT 1'); return true; },
    async fechar() { await pool.end(); },
    async listarPlanos() { return executar(pool, 'SELECT * FROM tb_planos ORDER BY id_plano'); },
    async listarAlunos(busca, status) {
      return executar(pool, 'SELECT * FROM tb_alunos WHERE (LOCATE(?, nome)>0 OR LOCATE(?, cpf)>0) AND (?=\'\' OR status_matricula=?) ORDER BY nome LIMIT 100', [busca, busca, status, status]);
    },
    async transacao(operacao) {
      const conexao = await pool.getConnection();
      try {
        await conexao.beginTransaction();
        const resultado = await operacao(unidade(conexao));
        await conexao.commit();
        return resultado;
      } catch (error) {
        try { await conexao.rollback(); } catch { /* Preservar o erro original. */ }
        throw traduzirErroBanco(error);
      } finally { conexao.release(); }
    },
  };
}

export async function conectarMysql(env = process.env) {
  for (const campo of ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD']) {
    if (!env[campo]) throw new Error(`Preencha ${campo} no arquivo .env.`);
  }
  const { default: mysql } = await import('mysql2/promise');
  const pool = mysql.createPool({
    host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT ?? 3307),
    database: env.MYSQL_DATABASE, user: env.MYSQL_USER, password: env.MYSQL_PASSWORD,
    connectionLimit: 5, dateStrings: true, timezone: 'Z', charset: 'utf8mb4',
  });
  const repositorio = criarRepositorioMysql(pool);
  try {
    await repositorio.ping();
    // Verificar o esquema antes de aceitar atendimento.
    await pool.execute('SELECT id_aluno FROM tb_alunos LIMIT 0');
    return repositorio;
  } catch (error) { await pool.end(); throw error; }
}
