const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  try {
    const result = await db.query(
      `SELECT u.*, un.nome as unidade_nome FROM usuarios u
       LEFT JOIN unidades un ON u.unidade_id = un.id
       WHERE u.email = $1 AND u.ativo = true`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    await db.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, unidade_id: user.unidade_id, militar_id: user.militar_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        unidade_id: user.unidade_id,
        unidade_nome: user.unidade_nome,
        militar_id: user.militar_id ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.unidade_id, u.militar_id, un.nome as unidade_nome
       FROM usuarios u LEFT JOIN unidades un ON u.unidade_id = un.id WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/senha', authenticate, async (req, res) => {
  const { senha_atual, nova_senha } = req.body;
  if (!senha_atual || !nova_senha) return res.status(400).json({ error: 'Campos obrigatórios' });
  if (nova_senha.length < 6) return res.status(400).json({ error: 'Nova senha deve ter ao menos 6 caracteres' });

  try {
    const result = await db.query('SELECT senha FROM usuarios WHERE id = $1', [req.user.id]);
    const ok = await bcrypt.compare(senha_atual, result.rows[0].senha);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(nova_senha, 10);
    await db.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
