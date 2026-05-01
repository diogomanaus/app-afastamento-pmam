-- Sistema de Controle de Afastamentos - PMAM
-- Inicialização do banco de dados

CREATE TABLE IF NOT EXISTS unidades (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    sigla VARCHAR(30) NOT NULL UNIQUE,
    endereco VARCHAR(300),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL DEFAULT 'operador'
        CHECK (perfil IN ('admin', 'comandante', 'operador')),
    unidade_id INTEGER REFERENCES unidades(id),
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_acesso TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS militares (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    rg VARCHAR(30),
    matricula VARCHAR(20) UNIQUE,
    posto_graduacao VARCHAR(60) NOT NULL,
    unidade_id INTEGER REFERENCES unidades(id),
    email VARCHAR(200),
    telefone VARCHAR(20),
    data_ingresso DATE,
    data_nascimento DATE,
    sexo CHAR(1) CHECK (sexo IN ('M', 'F')),
    ativo BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipos_afastamento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    prazo_maximo_dias INTEGER,
    requer_documento BOOLEAN DEFAULT TRUE,
    fundamentacao_legal VARCHAR(400),
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS afastamentos (
    id SERIAL PRIMARY KEY,
    militar_id INTEGER NOT NULL REFERENCES militares(id),
    tipo_id INTEGER NOT NULL REFERENCES tipos_afastamento(id),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    dias_total INTEGER,
    motivo TEXT,
    observacoes TEXT,
    status VARCHAR(20) DEFAULT 'pendente'
        CHECK (status IN ('pendente','aprovado','reprovado','em_andamento','concluido','cancelado')),
    documento_gerado_url VARCHAR(500),
    documento_assinado_url VARCHAR(500),
    aprovado_por INTEGER REFERENCES usuarios(id),
    aprovado_em TIMESTAMP,
    created_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plano_ferias (
    id SERIAL PRIMARY KEY,
    militar_id INTEGER NOT NULL REFERENCES militares(id),
    ano INTEGER NOT NULL,
    tipo_plano VARCHAR(30) DEFAULT 'ferias',
    divisao VARCHAR(10) DEFAULT '30',
    periodo1_inicio DATE,
    periodo1_fim DATE,
    periodo2_inicio DATE,
    periodo2_fim DATE,
    dias_total INTEGER DEFAULT 30,
    observacoes TEXT,
    created_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(militar_id, ano, tipo_plano)
);

-- Trigger para calcular dias_total automaticamente
CREATE OR REPLACE FUNCTION calc_dias_afastamento()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dias_total := NEW.data_fim - NEW.data_inicio + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_dias_afastamento
    BEFORE INSERT OR UPDATE ON afastamentos
    FOR EACH ROW EXECUTE FUNCTION calc_dias_afastamento();

-- Trigger para atualizar updated_at em militares
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_militares_updated_at
    BEFORE UPDATE ON militares
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- Seed: Tipos de Afastamento
-- =============================================================
INSERT INTO tipos_afastamento (nome, descricao, prazo_maximo_dias, requer_documento, fundamentacao_legal) VALUES
('Férias Regulamentares', 'Férias anuais regulamentares do policial militar', 30, true, 'Art. 7º, XVII, CF/88; LC Estadual nº 009/1982'),
('Licença para Tratamento de Saúde (Próprio)', 'LTS para tratamento de saúde do próprio militar', 180, true, 'LC 009/1982, Art. 65; RHM/PMAM'),
('Licença para Acompanhamento de Familiar Enfermo', 'Afastamento para acompanhar cônjuge ou dependente enfermo', 30, true, 'LC 009/1982; Lei Estadual vigente'),
('Licença Maternidade', 'Licença para a militar gestante', 180, true, 'Art. 7º, XVIII, CF/88; Lei 8.112/90'),
('Licença Paternidade', 'Licença paternidade por nascimento de filho', 20, true, 'Art. 7º, XIX, CF/88; ADT art. 10, §1º'),
('Licença Especial', 'Licença especial por anos de efetivo serviço', 90, true, 'LC 009/1982, Art. 67'),
('Licença Prêmio', 'Licença prêmio por tempo de serviço ininterrupto', 30, true, 'LC 009/1982; RHM/PMAM'),
('Dispensa do Serviço', 'Dispensa pontual de até 24 horas', 1, false, 'Regulamento Interno PMAM'),
('Afastamento para Curso de Formação/Especialização', 'Afastamento para realização de curso policial ou de capacitação', NULL, true, 'LC 009/1982; Normas internas PMAM'),
('Afastamento para Missão Especial', 'Afastamento para cumprimento de missão especial designada', NULL, true, 'LC 009/1982; Portaria do Comando Geral'),
('Licença por Acidente em Serviço', 'LTS decorrente de acidente sofrido em serviço', NULL, true, 'LC 009/1982, Art. 66; Lei Federal aplicável'),
('Licença para Tratar de Interesse Particular', 'Afastamento sem remuneração para tratar interesses particulares', 730, true, 'LC 009/1982; Regulamento aplicável'),
('Afastamento para Estudo/Pesquisa', 'Afastamento para pós-graduação, mestrado, doutorado ou pesquisa', 365, true, 'LC 009/1982; Lei Federal de incentivo à educação'),
('Licença por Motivo de Doença em Pessoa da Família', 'Afastamento para tratamento de familiar com doença grave comprovada', 30, true, 'LC 009/1982; Portaria PMAM'),
('Afastamento Eleitoral', 'Afastamento para atividade junto à Justiça Eleitoral', NULL, true, 'Código Eleitoral; Res. TSE vigente')
ON CONFLICT DO NOTHING;

-- =============================================================
-- Seed: Unidades PMAM
-- =============================================================
INSERT INTO unidades (nome, sigla) VALUES
('Diretoria de Inativos da PMAM', 'DINATIV'),
('Comando Geral', 'CG/PMAM'),
('Estado-Maior Geral', 'EMG'),
('1º Batalhão de Polícia Militar', '1º BPM'),
('2º Batalhão de Polícia Militar', '2º BPM'),
('3º Batalhão de Polícia Militar', '3º BPM'),
('4º Batalhão de Polícia Militar', '4º BPM'),
('5º Batalhão de Polícia Militar', '5º BPM'),
('6º Batalhão de Polícia Militar', '6º BPM'),
('7º Batalhão de Polícia Militar', '7º BPM'),
('Batalhão de Operações Especiais', 'BOPE'),
('Batalhão de Policiamento de Choque', 'BPChq'),
('Batalhão de Polícia de Trânsito', 'BPTrân'),
('Batalhão de Polícia Ambiental', 'BPAmb'),
('Batalhão de Polícia Rodoviária', 'BPRv'),
('Companhia de Polícia Feminina', 'CPFem'),
('Companhia Independente de Patrulhamento Tático', 'CIPT'),
('Centro de Formação e Aperfeiçoamento de Praças', 'CFAP'),
('Academia de Polícia Militar do Amazonas', 'APM'),
('Quartel do Comando Geral', 'QCG'),
('Diretoria de Saúde', 'DS/PMAM'),
('Diretoria de Logística e Finanças', 'DLF'),
('Diretoria de Pessoal', 'DP/PMAM'),
('Diretoria de Tecnologia', 'DTI/PMAM')
ON CONFLICT DO NOTHING;
