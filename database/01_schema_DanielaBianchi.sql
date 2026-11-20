-- ============================================================================
-- SCRIPT DDL E DML INICIAL — SISTEMA DE GESTÃO DE ACADEMIA (ACADEMIA FITZONE)
-- Aluna: Daniela Vanessa Bianchi
-- Disciplina: Laboratório de Engenharia de Software · 6º Semestre ADS · FATEC
-- ============================================================================

CREATE DATABASE IF NOT EXISTS db_academia_fitzone
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_academia_fitzone;

-- 1. Tabela de Planos (RF03, RF04)
CREATE TABLE IF NOT EXISTS tb_planos (
  id_plano INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(60) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  duracao_dias INT NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT chk_valor_plano CHECK (valor > 0),
  CONSTRAINT chk_duracao_plano CHECK (duracao_dias > 0)
) ENGINE=InnoDB;

-- 2. Tabela de Alunos (RF01, RF02, RF05, RF13, RF14, RN01, RN08, RN09)
CREATE TABLE IF NOT EXISTS tb_alunos (
  id_aluno INT AUTO_INCREMENT PRIMARY KEY,
  id_plano INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  cpf CHAR(11) NOT NULL UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  data_nascimento DATE NOT NULL,
  data_inicio_plano DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  status_matricula ENUM('ATIVO', 'CANCELADO') NOT NULL DEFAULT 'ATIVO',
  foto MEDIUMTEXT NULL,
  CONSTRAINT fk_alunos_plano FOREIGN KEY (id_plano)
    REFERENCES tb_planos(id_plano)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. Tabela de Pagamentos (RF09, RF11, RN05, RN10)
CREATE TABLE IF NOT EXISTS tb_pagamentos (
  id_pagamento INT AUTO_INCREMENT PRIMARY KEY,
  id_aluno INT NOT NULL,
  id_plano_vigente INT NOT NULL,
  data_pagamento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valor_pago DECIMAL(10,2) NOT NULL,
  vencimento_anterior DATE NOT NULL,
  novo_vencimento DATE NOT NULL,
  observacao VARCHAR(150) NULL,
  CONSTRAINT fk_pagamentos_aluno FOREIGN KEY (id_aluno)
    REFERENCES tb_alunos(id_aluno)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pagamentos_plano FOREIGN KEY (id_plano_vigente)
    REFERENCES tb_planos(id_plano)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Tabela de Check-ins / Frequência (RF06, RF07, RF08, RF10, RF12, RF15, RN02, RN03, RN04, RN06)
CREATE TABLE IF NOT EXISTS tb_checkins (
  id_checkin INT AUTO_INCREMENT PRIMARY KEY,
  id_aluno INT NOT NULL,
  data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  permitido TINYINT(1) NOT NULL,
  dias_atraso INT NOT NULL DEFAULT 0,
  alerta_emitido TINYINT(1) NOT NULL DEFAULT 0,
  motivo_bloqueio VARCHAR(120) NULL,
  CONSTRAINT fk_checkins_aluno FOREIGN KEY (id_aluno)
    REFERENCES tb_alunos(id_aluno)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- População Inicial (Seed) dos Planos Padrão da Academia FitZone
INSERT INTO tb_planos (nome, valor, duracao_dias, ativo) VALUES
  ('Plano Mensal', 119.90, 30, 1),
  ('Plano Trimestral', 319.90, 90, 1),
  ('Plano Anual', 1099.90, 365, 1);
