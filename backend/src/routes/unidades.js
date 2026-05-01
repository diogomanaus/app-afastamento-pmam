const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM unidades WHERE ativo = true ORDER BY nome'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM unidades WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Unidade não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { nome, sigla, endereco, telefone } = req.body;
  if (!nome || !sigla) return res.status(400).json({ error: 'Nome e sigla são obrigatórios' });
  try {
    const result = await db.query(
      'INSERT INTO unidades (nome, sigla, endereco, telefone) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, sigla.toUpperCase(), endereco, telefone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Sigla já cadastrada' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { nome, sigla, endereco, telefone } = req.body;
  try {
    const result = await db.query(
      `UPDATE unidades SET nome = COALESCE($1, nome), sigla = COALESCE($2, sigla),
       endereco = COALESCE($3, endereco), telefone = COALESCE($4, telefone)
       WHERE id = $5 RETURNING *`,
      [nome, sigla?.toUpperCase(), endereco, telefone, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Unidade não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('UPDATE unidades SET ativo = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Unidade desativada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
