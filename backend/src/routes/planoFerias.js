const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toISOString().split('T')[0];
}

function calcDias(inicio, fim) {
  if (!inicio || !fim) return 0;
  const diff = new Date(fim) - new Date(inicio);
  return Math.round(diff / 86400000) + 1;
}

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { ano = new Date().getFullYear() } = req.query;
    const result = await db.query(
      `SELECT pf.id, pf.militar_id, pf.ano, pf.tipo_plano, pf.divisao,
              pf.periodo1_inicio, pf.periodo1_fim,
              pf.periodo2_inicio, pf.periodo2_fim,
              pf.dias_total, pf.observacoes,
              m.nome, m.posto_graduacao, m.matricula, m.cpf
       FROM plano_ferias pf
       JOIN militares m ON pf.militar_id = m.id
       WHERE pf.ano = $1 AND m.ativo = true
       ORDER BY pf.tipo_plano DESC, pf.periodo1_inicio, m.posto_graduacao, m.nome`,
      [ano]
    );
    res.json(result.rows.map(r => ({
      ...r,
      periodo1_inicio: fmtDate(r.periodo1_inicio),
      periodo1_fim: fmtDate(r.periodo1_fim),
      periodo2_inicio: fmtDate(r.periodo2_inicio),
      periodo2_fim: fmtDate(r.periodo2_fim),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { militar_id, ano, tipo_plano = 'ferias', divisao,
          periodo1_inicio, periodo1_fim,
          periodo2_inicio, periodo2_fim,
          observacoes } = req.body;

  if (!militar_id || !ano || !periodo1_inicio || !periodo1_fim) {
    return res.status(400).json({ error: 'Militar, ano e datas do 1º período são obrigatórios' });
  }

  const dias1 = calcDias(periodo1_inicio, periodo1_fim);
  const dias2 = periodo2_inicio && periodo2_fim ? calcDias(periodo2_inicio, periodo2_fim) : 0;
  const diasTotal = dias1 + dias2;

  try {
    const result = await db.query(
      `INSERT INTO plano_ferias
         (militar_id, ano, tipo_plano, divisao,
          periodo1_inicio, periodo1_fim,
          periodo2_inicio, periodo2_fim,
          dias_total, observacoes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (militar_id, ano, tipo_plano) DO UPDATE
         SET divisao = $4,
             periodo1_inicio = $5, periodo1_fim = $6,
             periodo2_inicio = $7, periodo2_fim = $8,
             dias_total = $9, observacoes = $10,
             updated_at = NOW()
       RETURNING *`,
      [militar_id, ano, tipo_plano, divisao || null,
       periodo1_inicio, periodo1_fim,
       periodo2_inicio || null, periodo2_fim || null,
       diasTotal, observacoes || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { tipo_plano, divisao,
          periodo1_inicio, periodo1_fim,
          periodo2_inicio, periodo2_fim,
          observacoes } = req.body;

  const dias1 = calcDias(periodo1_inicio, periodo1_fim);
  const dias2 = periodo2_inicio && periodo2_fim ? calcDias(periodo2_inicio, periodo2_fim) : 0;
  const diasTotal = dias1 + dias2;

  try {
    const result = await db.query(
      `UPDATE plano_ferias SET
         tipo_plano = COALESCE($1, tipo_plano),
         divisao = $2,
         periodo1_inicio = COALESCE($3, periodo1_inicio),
         periodo1_fim = COALESCE($4, periodo1_fim),
         periodo2_inicio = $5,
         periodo2_fim = $6,
         dias_total = $7,
         observacoes = COALESCE($8, observacoes),
         updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [tipo_plano, divisao || null,
       periodo1_inicio, periodo1_fim,
       periodo2_inicio || null, periodo2_fim || null,
       diasTotal, observacoes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Plano não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM plano_ferias WHERE id = $1', [req.params.id]);
    res.json({ message: 'Removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
