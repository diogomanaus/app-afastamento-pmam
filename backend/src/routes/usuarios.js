const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.ativo, u.ultimo_acesso, u.created_at,
              un.nome as unidade_nome
       FROM usuarios u LEFT JOIN unidades un ON u.unidade_id = un.id
       ORDER BY u.nome`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nome, email, senha, perfil, unidade_id } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  try {
    const hash = await bcrypt.hash(senha, 10);
    const result = await db.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, unidade_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, nome, email, perfil, unidade_id, created_at`,
      [nome, email.toLowerCase(), hash, perfil || 'operador', unidade_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'E-mail já cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, email, perfil, unidade_id, ativo, senha } = req.body;
  try {
    let senhaHash = undefined;
    if (senha) senhaHash = await bcrypt.hash(senha, 10);

    const result = await db.query(
      `UPDATE usuarios SET
        nome = COALESCE($1, nome),
        email = COALESCE($2, email),
        perfil = COALESCE($3, perfil),
        unidade_id = COALESCE($4, unidade_id),
        ativo = COALESCE($5, ativo),
        senha = COALESCE($6, senha)
       WHERE id = $7
       RETURNING id, nome, email, perfil, unidade_id, ativo`,
      [nome, email?.toLowerCase(), perfil, unidade_id || null, ativo, senhaHash || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET ativo = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Usuário desativado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
