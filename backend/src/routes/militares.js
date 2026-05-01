const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { q, unidade_id, ativo = 'true', page = 1, limit = 50 } = req.query;
    let where = [`m.ativo = ${ativo === 'true'}`];
    let params = [];
    let idx = 1;

    if (unidade_id) { where.push(`m.unidade_id = $${idx++}`); params.push(unidade_id); }
    if (q) {
      where.push(`(LOWER(m.nome) LIKE $${idx} OR m.cpf LIKE $${idx} OR m.matricula LIKE $${idx})`);
      params.push(`%${q.toLowerCase()}%`);
      idx++;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereStr = `WHERE ${where.join(' AND ')}`;

    const [data, count] = await Promise.all([
      db.query(
        `SELECT m.*, u.nome as unidade_nome, u.sigla as unidade_sigla
         FROM militares m LEFT JOIN unidades u ON m.unidade_id = u.id
         ${whereStr} ORDER BY m.posto_graduacao, m.nome
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(`SELECT COUNT(*) FROM militares m ${whereStr}`, params),
    ]);

    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*, u.nome as unidade_nome, u.sigla as unidade_sigla
       FROM militares m LEFT JOIN unidades u ON m.unidade_id = u.id
       WHERE m.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Militar não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nome, cpf, rg, matricula, posto_graduacao, unidade_id, email, telefone, data_ingresso, data_nascimento, sexo, observacoes } = req.body;
  if (!nome || !cpf || !posto_graduacao) {
    return res.status(400).json({ error: 'Nome, CPF e posto/graduação são obrigatórios' });
  }
  if (!rg || !rg.trim()) {
    return res.status(400).json({ error: 'RG é obrigatório' });
  }
  try {
    const cpfFormatado = cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const matriculaClean = matricula && matricula.trim() ? matricula.trim() : null;
    const rgClean = rg && rg.trim() ? rg.trim() : null;

    // Buscar unidade DINATIV automaticamente
    const unidadeRes = await db.query(`SELECT id FROM unidades WHERE sigla = 'DINATIV' LIMIT 1`);
    const unidadeId = unidadeRes.rows[0]?.id || unidade_id || null;

    const result = await db.query(
      `INSERT INTO militares (nome, cpf, rg, matricula, posto_graduacao, unidade_id, email, telefone, data_ingresso, data_nascimento, sexo, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [nome, cpfFormatado, rgClean, matriculaClean, posto_graduacao, unidadeId,
       email || null, telefone || null,
       data_ingresso || null, data_nascimento || null, sexo || null, observacoes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'CPF já cadastrado no sistema' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, rg, matricula, posto_graduacao, unidade_id, email, telefone, data_ingresso, data_nascimento, sexo, observacoes } = req.body;
  // Sanitizar matrícula: string vazia → null (evita conflito de UNIQUE)
  const matriculaClean = matricula && matricula.trim() ? matricula.trim() : null;
  const rgClean = rg && rg.trim() ? rg.trim() : null;
  try {
    const result = await db.query(
      `UPDATE militares SET
        nome = COALESCE($1, nome), rg = COALESCE($2, rg), matricula = $3,
        posto_graduacao = COALESCE($4, posto_graduacao), unidade_id = COALESCE($5, unidade_id),
        email = COALESCE($6, email), telefone = COALESCE($7, telefone),
        data_ingresso = COALESCE($8, data_ingresso), data_nascimento = COALESCE($9, data_nascimento),
        sexo = COALESCE($10, sexo), observacoes = COALESCE($11, observacoes)
       WHERE id = $12 RETURNING *`,
      [nome, rgClean, matriculaClean, posto_graduacao, unidade_id, email, telefone,
       data_ingresso || null, data_nascimento || null, sexo, observacoes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Militar não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/ativo', async (req, res) => {
  const { ativo } = req.body;
  try {
    await db.query('UPDATE militares SET ativo = $1 WHERE id = $2', [ativo, req.params.id]);
    res.json({ message: `Militar ${ativo ? 'ativado' : 'desativado'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── Gerenciar acesso do militar ao sistema ────────────────────────────────────
router.get('/:id/acesso', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, ativo, ultimo_acesso FROM usuarios WHERE militar_id = $1',
      [req.params.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/acesso', authenticate, requireAdmin, async (req, res) => {
  const { email, senha } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });
  if (senha && senha.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });

  try {
    const mil = await db.query('SELECT * FROM militares WHERE id = $1', [req.params.id]);
    if (!mil.rows.length) return res.status(404).json({ error: 'Militar não encontrado' });

    const existing = await db.query('SELECT id FROM usuarios WHERE militar_id = $1', [req.params.id]);

    if (existing.rows.length) {
      // Atualização: senha é opcional (só atualiza se fornecida)
      if (senha) {
        const hash = await bcrypt.hash(senha, 10);
        await db.query(
          'UPDATE usuarios SET email = $1, senha = $2, ativo = true WHERE militar_id = $3',
          [email.toLowerCase().trim(), hash, req.params.id]
        );
      } else {
        await db.query(
          'UPDATE usuarios SET email = $1, ativo = true WHERE militar_id = $2',
          [email.toLowerCase().trim(), req.params.id]
        );
      }
    } else {
      // Criação: senha é obrigatória
      if (!senha) return res.status(400).json({ error: 'Senha é obrigatória para criar o acesso' });
      const emailCheck = await db.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
      if (emailCheck.rows.length) return res.status(409).json({ error: 'E-mail já cadastrado no sistema' });
      const hash = await bcrypt.hash(senha, 10);
      await db.query(
        'INSERT INTO usuarios (nome, email, senha, perfil, militar_id, ativo) VALUES ($1, $2, $3, $4, $5, true)',
        [mil.rows[0].nome, email.toLowerCase().trim(), hash, 'militar', req.params.id]
      );
    }
    res.json({ ok: true, message: 'Acesso configurado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/acesso', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET ativo = false WHERE militar_id = $1', [req.params.id]);
    res.json({ ok: true, message: 'Acesso revogado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
