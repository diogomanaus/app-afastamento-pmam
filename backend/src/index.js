require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./db');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/unidades',    require('./routes/unidades'));
app.use('/api/militares',   require('./routes/militares'));
app.use('/api/afastamentos',require('./routes/afastamentos'));
app.use('/api/plano-ferias',require('./routes/planoFerias'));
app.use('/api/relatorios',  require('./routes/relatorios'));
app.use('/api/usuarios',    require('./routes/usuarios'));
app.use('/api/termos',      require('./routes/termos'));

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' });
});

async function initSchema() {
  const fs = require('fs');
  const path = require('path');
  const sqlPath = path.join(__dirname, '../init.sql');
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.query(sql);
    console.log('✅ Schema inicializado');
  } else {
    console.warn('⚠️  init.sql não encontrado, pulando inicialização do schema');
  }
}

async function migrate() {
  // Colunas do plano_ferias
  await db.query(`ALTER TABLE plano_ferias ADD COLUMN IF NOT EXISTS mes_previsto INTEGER`);
  await db.query(`ALTER TABLE plano_ferias ADD COLUMN IF NOT EXISTS tipo_plano VARCHAR(30) DEFAULT 'ferias'`);
  await db.query(`ALTER TABLE plano_ferias ADD COLUMN IF NOT EXISTS divisao VARCHAR(10) DEFAULT '30'`);
  await db.query(`ALTER TABLE plano_ferias ADD COLUMN IF NOT EXISTS mes_periodo2 INTEGER`);
  await db.query(`ALTER TABLE plano_ferias ADD COLUMN IF NOT EXISTS dias INTEGER DEFAULT 30`);

  // Migrar constraint: (militar_id, ano) → (militar_id, ano, tipo_plano)
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plano_ferias_militar_id_ano_tipo_key'
      ) THEN
        BEGIN
          ALTER TABLE plano_ferias DROP CONSTRAINT plano_ferias_militar_id_ano_key;
        EXCEPTION WHEN undefined_object THEN NULL;
        END;
        ALTER TABLE plano_ferias
          ADD CONSTRAINT plano_ferias_militar_id_ano_tipo_key UNIQUE (militar_id, ano, tipo_plano);
      END IF;
    END $$;
  `);

  // Colunas do Termo de Início de Gozo (livro de afastamento)
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS termo_numero VARCHAR(30)`);
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS termo_funcao VARCHAR(200)`);
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS termo_bi VARCHAR(300)`);
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS termo_periodo_aquisitivo VARCHAR(30)`);
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS termo_data_apresentacao DATE`);
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS termo_endereco TEXT`);
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS termo_telefone VARCHAR(40)`);
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS termo_url VARCHAR(500)`);
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS termo_url_assinado VARCHAR(500)`);

  // Adicionar militar_id à tabela de usuários (link com militares)
  await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS militar_id INTEGER REFERENCES militares(id) ON DELETE SET NULL`);

  // Atualizar constraint de perfil para incluir 'militar'
  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;
      ALTER TABLE usuarios ADD CONSTRAINT usuarios_perfil_check
        CHECK (perfil IN ('admin', 'comandante', 'operador', 'militar'));
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);

  // Corrigir prazo da Dispensa do Serviço para 15 dias
  await db.query(`
    UPDATE tipos_afastamento
    SET prazo_maximo_dias = 15,
        descricao = 'Dispensa pontual de até 15 dias'
    WHERE nome = 'Dispensa do Serviço'
      AND prazo_maximo_dias < 15
  `);

  // Desativar tipos inativos
  await db.query(`
    UPDATE tipos_afastamento SET ativo = false
    WHERE nome IN (
      'Licença Prêmio',
      'Afastamento para Curso de Formação/Especialização',
      'Licença por Acidente em Serviço',
      'Afastamento para Estudo/Pesquisa',
      'Afastamento para Missão Especial',
      'Licença para Acompanhamento de Familiar Enfermo',
      'Licença por Motivo de Doença em Pessoa da Família',
      'Afastamento Eleitoral',
      'Licença para Tratar de Interesse Particular'
    )
  `);

  // Garantir UNIQUE constraint no nome dos tipos (evita duplicatas futuras)
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tipos_afastamento_nome_unique'
      ) THEN
        -- Remover duplicatas antes de criar constraint
        DELETE FROM tipos_afastamento
        WHERE id NOT IN (
          SELECT MIN(id) FROM tipos_afastamento GROUP BY nome
        );
        ALTER TABLE tipos_afastamento ADD CONSTRAINT tipos_afastamento_nome_unique UNIQUE (nome);
      END IF;
    END $$;
  `);

  // Inserir Luto e Núpcias apenas se não existirem (agora com UNIQUE funciona)
  await db.query(`
    INSERT INTO tipos_afastamento (nome, descricao, prazo_maximo_dias, requer_documento, fundamentacao_legal, ativo)
    VALUES
      ('Luto',   'Afastamento por falecimento de familiar', 5, false, 'LC 009/1982; Regulamento Interno PMAM', true),
      ('Núpcias','Afastamento por motivo de casamento',     8, false, 'LC 009/1982; Regulamento Interno PMAM', true)
    ON CONFLICT (nome) DO UPDATE SET ativo = true
  `);

  // Colunas para ano base e ano de exercício (férias)
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS ferias_ano_base INTEGER`);
  await db.query(`ALTER TABLE afastamentos ADD COLUMN IF NOT EXISTS ferias_ano_exercicio INTEGER`);

  // Garantir que a unidade DINATIV existe
  const { rows } = await db.query(`SELECT id FROM unidades WHERE sigla = 'DINATIV' LIMIT 1`);
  if (!rows.length) {
    await db.query(
      `INSERT INTO unidades (nome, sigla) VALUES ('Diretoria de Inativos da PMAM', 'DINATIV')
       ON CONFLICT (sigla) DO NOTHING`
    );
    console.log('✅ Unidade DINATIV criada');
  }
}

const PORT = process.env.PORT || 3001;

async function seedAdmin() {
  const bcrypt = require('bcryptjs');
  const adminEmail = (process.env.ADMIN_EMAIL || 'diogomanaus@gmail.com').toLowerCase().trim();
  const adminSenha = process.env.ADMIN_PASSWORD || 'admin@admin';
  const hash = await bcrypt.hash(adminSenha, 10);

  // Busca pelo email exato
  const { rows } = await db.query('SELECT id FROM usuarios WHERE email = $1', [adminEmail]);
  if (rows.length) {
    // Já existe — atualiza senha e perfil usando o id (evita tocar em outros registros)
    await db.query(
      'UPDATE usuarios SET senha = $1, perfil = $2, ativo = true WHERE id = $3',
      [hash, 'admin', rows[0].id]
    );
    console.log(`✅ Admin atualizado: ${adminEmail}`);
  } else {
    // Cria do zero
    await db.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, ativo)
       VALUES ('Administrador DINATIV', $1, $2, 'admin', true)`,
      [adminEmail, hash]
    );
    console.log(`✅ Admin criado: ${adminEmail}`);
  }
}

async function start() {
  await db.waitForDB();
  await initSchema();
  await migrate();
  await seedAdmin();
  app.listen(PORT, () => console.log(`🚀 Backend PMAM rodando na porta ${PORT}`));
}

start().catch(err => {
  console.error('Falha ao iniciar:', err.message);
  process.exit(1);
});
