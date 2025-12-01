-- ============================================================
-- 1. CRIAÇÃO DAS TABELAS (ESTRUTURA)
-- ============================================================

CREATE TABLE IF NOT EXISTS paciente (
  id_paciente INT AUTO_INCREMENT PRIMARY KEY,
  nome_completo VARCHAR(150) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  data_nascimento DATE,
  sexo VARCHAR(10),
  telefone VARCHAR(15),
  email VARCHAR(100),
  convenio VARCHAR(100),
  status VARCHAR(10) DEFAULT 'Ativo',
  data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profissional (
  id_profissional INT AUTO_INCREMENT PRIMARY KEY,
  nome_completo VARCHAR(150) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  especialidade VARCHAR(100), -- Usando 'especialidade' conforme seu código original
  email VARCHAR(100),
  telefone VARCHAR(15),
  status VARCHAR(10) DEFAULT 'Ativo'
);

CREATE TABLE IF NOT EXISTS unidade_saude (
  id_unidade INT AUTO_INCREMENT PRIMARY KEY,
  nome_unidade VARCHAR(150) NOT NULL,
  endereco VARCHAR(200),
  telefone VARCHAR(15),
  email VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome_usuario VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  papel VARCHAR(50),
  id_profissional INT NULL,
  ultimo_acesso DATETIME,
  FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional)
);

CREATE TABLE IF NOT EXISTS agendamento (
  id_agendamento INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT,
  id_profissional INT,
  data_hora DATETIME,
  status VARCHAR(50),
  historico_alteracao TEXT,
  data_alteracao DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional)
);

CREATE TABLE IF NOT EXISTS atendimento (
  id_atendimento INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT,
  id_profissional INT,
  tipo_atendimento VARCHAR(50),
  data_atendimento DATETIME,
  status VARCHAR(50),
  observacoes TEXT,
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional)
);

CREATE TABLE IF NOT EXISTS evolucao_medica (
  id_evolucao INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT,
  id_profissional INT,
  id_atendimento INT,
  data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  observacoes TEXT,
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional),
  FOREIGN KEY (id_atendimento) REFERENCES atendimento(id_atendimento)
);

CREATE TABLE IF NOT EXISTS fila_espera (
  id_fila INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT,
  id_profissional INT,
  prioridade VARCHAR(20),
  data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20),
  canal_notificacao VARCHAR(20),
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional)
);

CREATE TABLE IF NOT EXISTS preferencia_horario (
  id_preferencia INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT,
  data_hora_preferida DATETIME,
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente)
);

CREATE TABLE IF NOT EXISTS instrucao_pos_atendimento (
  id_instrucao INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT,
  id_profissional INT,
  id_atendimento INT,
  texto_instrucao TEXT,
  canal_envio VARCHAR(20),
  data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional),
  FOREIGN KEY (id_atendimento) REFERENCES atendimento(id_atendimento)
);

-- TABELA ATESTADOS (CORRIGIDA PARA O SEU CÓDIGO ATUAL)
-- Nome: atestados (Plural)
-- Coluna de texto: texto_atestado
CREATE TABLE IF NOT EXISTS atestados (
  id_atestado INT AUTO_INCREMENT PRIMARY KEY,
  id_atendimento INT,
  id_paciente INT,
  id_profissional INT,
  data_emissao DATETIME DEFAULT CURRENT_TIMESTAMP,
  dias_afastamento INT,
  cid VARCHAR(10) NULL,
  texto_atestado TEXT, 
  FOREIGN KEY (id_atendimento) REFERENCES atendimento(id_atendimento),
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional)
);

CREATE TABLE IF NOT EXISTS log_acesso (
  id_log INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT,
  acao VARCHAR(255),
  data_acao DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_origem VARCHAR(45),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS material_treinamento (
  id_material INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(150),
  categoria VARCHAR(100),
  url_arquivo VARCHAR(255),
  data_upload DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_treinamento_acesso (
  id_acesso_material INT AUTO_INCREMENT PRIMARY KEY,
  id_material INT,
  id_usuario INT,
  data_acesso DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_material) REFERENCES material_treinamento(id_material) ON DELETE CASCADE,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acesso_interunidades (
  id_acesso INT AUTO_INCREMENT PRIMARY KEY,
  id_profissional INT,
  id_paciente INT,
  id_unidade_origem INT,
  id_unidade_destino INT,
  data_acesso DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional),
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_unidade_origem) REFERENCES unidade_saude(id_unidade),
  FOREIGN KEY (id_unidade_destino) REFERENCES unidade_saude(id_unidade)
);

CREATE TABLE IF NOT EXISTS profissional_unidade (
  id_profissional_unidade INT AUTO_INCREMENT PRIMARY KEY,
  id_profissional INT NOT NULL,
  id_unidade INT NOT NULL,
  UNIQUE KEY unique_link (id_profissional, id_unidade),
  FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional) ON DELETE CASCADE,
  FOREIGN KEY (id_unidade) REFERENCES unidade_saude(id_unidade) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id_notificacao INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50),
  mensagem TEXT,
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
);