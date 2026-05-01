const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ── RESUMO GERAL (Dashboard) ──────────────────────────────────────────────────
router.get('/resumo', async (req, res) => {
  try {
    const { unidade_id, ano = new Date().getFullYear() } = req.query;
    const cond = unidade_id ? `AND m.unidade_id = ${parseInt(unidade_id)}` : '';

    const [totais, porStatus, porTipo, proximos, militaresAtivos, naoGozados] = await Promise.all([
      db.query(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'em_andamento' THEN 1 ELSE 0 END) as em_andamento,
                SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                SUM(dias_total) as total_dias
         FROM afastamentos a JOIN militares m ON a.militar_id = m.id
         WHERE EXTRACT(YEAR FROM a.data_inicio) = $1 ${cond}`,
        [ano]
      ),
      db.query(
        `SELECT status, COUNT(*) as qtd FROM afastamentos a
         JOIN militares m ON a.militar_id = m.id
         WHERE EXTRACT(YEAR FROM a.data_inicio) = $1 ${cond}
         GROUP BY status ORDER BY qtd DESC`,
        [ano]
      ),
      db.query(
        `SELECT t.nome as tipo, COUNT(*) as qtd, SUM(a.dias_total) as total_dias
         FROM afastamentos a
         JOIN tipos_afastamento t ON a.tipo_id = t.id
         JOIN militares m ON a.militar_id = m.id
         WHERE EXTRACT(YEAR FROM a.data_inicio) = $1 ${cond}
         GROUP BY t.nome ORDER BY qtd DESC`,
        [ano]
      ),
      db.query(
        `SELECT a.id, a.data_inicio, a.data_fim, a.dias_total, a.status,
                m.nome as militar_nome, m.posto_graduacao,
                t.nome as tipo_nome, u.sigla as unidade_sigla
         FROM afastamentos a
         JOIN militares m ON a.militar_id = m.id
         JOIN unidades u ON m.unidade_id = u.id
         JOIN tipos_afastamento t ON a.tipo_id = t.id
         WHERE a.data_inicio >= CURRENT_DATE AND a.status IN ('aprovado','pendente') ${cond}
         ORDER BY a.data_inicio LIMIT 10`,
        []
      ),
      db.query(`SELECT COUNT(*) as total FROM militares m WHERE m.ativo = true`),
      db.query(
        `SELECT COUNT(*) as total FROM militares m
         WHERE m.ativo = true
           AND m.id NOT IN (
             SELECT militar_id FROM plano_ferias
             WHERE ano = $1 AND tipo_plano = 'ferias' AND periodo1_inicio IS NOT NULL
           )`,
        [ano]
      ),
    ]);

    res.json({
      totais: totais.rows[0],
      porStatus: porStatus.rows,
      porTipo: porTipo.rows,
      proximosAfastamentos: proximos.rows,
      militaresAtivos: militaresAtivos.rows[0].total,
      naoGozados: naoGozados.rows[0].total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SITUAÇÃO FÉRIAS (baseado em plano_ferias) ─────────────────────────────────
router.get('/ferias-situacao', async (req, res) => {
  try {
    const { ano = new Date().getFullYear() } = req.query;

    const [comFerias, semFerias] = await Promise.all([
      db.query(
        `SELECT m.id, m.nome, m.posto_graduacao, m.matricula,
                pf.periodo1_inicio, pf.periodo1_fim,
                pf.periodo2_inicio, pf.periodo2_fim,
                pf.divisao,
                CASE
                  WHEN (pf.periodo1_inicio <= CURRENT_DATE AND CURRENT_DATE <= pf.periodo1_fim)
                    OR (pf.periodo2_inicio IS NOT NULL AND pf.periodo2_inicio <= CURRENT_DATE AND CURRENT_DATE <= pf.periodo2_fim)
                    THEN 'em_gozo'
                  WHEN pf.periodo1_fim < CURRENT_DATE
                    THEN 'gozadas'
                  ELSE 'previstas'
                END as situacao
         FROM militares m
         JOIN plano_ferias pf ON pf.militar_id = m.id AND pf.ano = $1
         WHERE m.ativo = true AND pf.tipo_plano = 'ferias' AND pf.periodo1_inicio IS NOT NULL
         ORDER BY m.posto_graduacao, m.nome`,
        [ano]
      ),
      db.query(
        `SELECT m.id, m.nome, m.posto_graduacao, m.matricula
         FROM militares m
         WHERE m.ativo = true
           AND m.id NOT IN (
             SELECT militar_id FROM plano_ferias
             WHERE ano = $1 AND tipo_plano = 'ferias' AND periodo1_inicio IS NOT NULL
           )
         ORDER BY m.posto_graduacao, m.nome`,
        [ano]
      ),
    ]);

    res.json({ comFerias: comFerias.rows, semFerias: semFerias.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MENSAL (Dashboard gráfico de barras) ─────────────────────────────────────
router.get('/mensal', async (req, res) => {
  try {
    const { ano = new Date().getFullYear(), unidade_id } = req.query;
    const cond = unidade_id ? `AND m.unidade_id = ${parseInt(unidade_id)}` : '';

    const result = await db.query(
      `SELECT EXTRACT(MONTH FROM a.data_inicio)::int as mes,
              COUNT(*) as total, SUM(a.dias_total) as total_dias,
              SUM(CASE WHEN t.nome ILIKE '%férias%' THEN 1 ELSE 0 END) as ferias,
              SUM(CASE WHEN t.nome ILIKE '%saúde%' OR t.nome ILIKE '%lts%' THEN 1 ELSE 0 END) as lts,
              SUM(CASE WHEN t.nome ILIKE '%dispensa%' THEN 1 ELSE 0 END) as dispensas
       FROM afastamentos a
       JOIN militares m ON a.militar_id = m.id
       JOIN tipos_afastamento t ON a.tipo_id = t.id
       WHERE EXTRACT(YEAR FROM a.data_inicio) = $1 ${cond}
       GROUP BY mes ORDER BY mes`,
      [ano]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MAPA GERAL ────────────────────────────────────────────────────────────────
router.get('/mapa-geral', async (req, res) => {
  try {
    const { ano = new Date().getFullYear(), militar_id } = req.query;
    const milCond = militar_id ? `AND a.militar_id = ${parseInt(militar_id)}` : '';
    const milCondM = militar_id ? `AND m.id = ${parseInt(militar_id)}` : '';

    const [
      totais, porTipo, porStatus, porMes,
      militaresAtivos, militaresComFerias, militaresSemFerias,
      proximosMes, topMilitares,
    ] = await Promise.all([
      db.query(
        `SELECT COUNT(a.id) as total_afastamentos,
                COALESCE(SUM(a.dias_total), 0) as total_dias,
                AVG(a.dias_total)::numeric(5,1) as media_dias,
                MAX(a.dias_total) as max_dias,
                SUM(CASE WHEN a.status = 'concluido' THEN 1 ELSE 0 END) as concluidos,
                SUM(CASE WHEN a.status = 'em_andamento' THEN 1 ELSE 0 END) as em_andamento,
                SUM(CASE WHEN a.status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                SUM(CASE WHEN a.data_inicio > CURRENT_DATE THEN 1 ELSE 0 END) as futuros
         FROM afastamentos a
         JOIN militares m ON a.militar_id = m.id
         WHERE EXTRACT(YEAR FROM a.data_inicio) = $1 ${milCond}`,
        [ano]
      ),
      db.query(
        `SELECT t.nome as tipo, COUNT(a.id) as total,
                COALESCE(SUM(a.dias_total), 0) as total_dias,
                ROUND(COUNT(a.id)::numeric * 100 / NULLIF(
                  (SELECT COUNT(*) FROM afastamentos a2 JOIN militares m2 ON a2.militar_id = m2.id
                   WHERE EXTRACT(YEAR FROM a2.data_inicio) = $1 ${milCond}), 0), 1) as percentual
         FROM afastamentos a
         JOIN tipos_afastamento t ON a.tipo_id = t.id
         JOIN militares m ON a.militar_id = m.id
         WHERE EXTRACT(YEAR FROM a.data_inicio) = $1 ${milCond}
         GROUP BY t.nome ORDER BY total DESC`,
        [ano]
      ),
      db.query(
        `SELECT status, COUNT(*) as total FROM afastamentos a
         JOIN militares m ON a.militar_id = m.id
         WHERE EXTRACT(YEAR FROM a.data_inicio) = $1 ${milCond}
         GROUP BY status ORDER BY total DESC`,
        [ano]
      ),
      db.query(
        `SELECT EXTRACT(MONTH FROM a.data_inicio)::int as mes,
                COUNT(*) as total, COALESCE(SUM(a.dias_total), 0) as total_dias
         FROM afastamentos a JOIN militares m ON a.militar_id = m.id
         WHERE EXTRACT(YEAR FROM a.data_inicio) = $1 ${milCond}
         GROUP BY mes ORDER BY mes`,
        [ano]
      ),
      db.query(`SELECT COUNT(*) as total FROM militares WHERE ativo = true ${milCondM.replace('AND a.', 'AND ')}`),
      db.query(
        `SELECT COUNT(DISTINCT a.militar_id) as total
         FROM afastamentos a JOIN tipos_afastamento t ON a.tipo_id = t.id
         JOIN militares m ON a.militar_id = m.id
         WHERE EXTRACT(YEAR FROM a.data_inicio) = $1
           AND t.nome ILIKE '%férias%'
           AND a.status IN ('aprovado','em_andamento','concluido') ${milCond}`,
        [ano]
      ),
      db.query(
        `SELECT COUNT(*) as total FROM militares m
         WHERE m.ativo = true ${milCondM.replace('AND a.', 'AND ')}
           AND m.id NOT IN (
             SELECT DISTINCT a.militar_id FROM afastamentos a
             JOIN tipos_afastamento t ON a.tipo_id = t.id
             WHERE EXTRACT(YEAR FROM a.data_inicio) = $1
               AND t.nome ILIKE '%férias%'
               AND a.status IN ('aprovado','em_andamento','concluido')
           )`,
        [ano]
      ),
      db.query(
        `SELECT COUNT(*) as total FROM afastamentos a
         JOIN militares m ON a.militar_id = m.id
         WHERE a.data_inicio BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
           AND a.status NOT IN ('cancelado','reprovado') ${milCond}`,
        []
      ),
      db.query(
        `SELECT m.nome, m.posto_graduacao, COUNT(a.id) as total_afastamentos,
                COALESCE(SUM(a.dias_total), 0) as total_dias
         FROM militares m JOIN afastamentos a ON a.militar_id = m.id
         WHERE EXTRACT(YEAR FROM a.data_inicio) = $1
           AND a.status != 'cancelado' ${milCond}
         GROUP BY m.id, m.nome, m.posto_graduacao
         ORDER BY total_dias DESC LIMIT 5`,
        [ano]
      ),
    ]);

    res.json({
      totais: totais.rows[0],
      porTipo: porTipo.rows,
      porStatus: porStatus.rows,
      porMes: porMes.rows,
      militaresAtivos: parseInt(militaresAtivos.rows[0].total),
      militaresComFerias: parseInt(militaresComFerias.rows[0].total),
      militaresSemFerias: parseInt(militaresSemFerias.rows[0].total),
      proximosMes: parseInt(proximosMes.rows[0].total),
      topMilitares: topMilitares.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AFASTAMENTOS FUTUROS ──────────────────────────────────────────────────────
router.get('/futuros', async (req, res) => {
  try {
    const { dias = 90, tipo_id, militar_id } = req.query;
    const conds = [];
    const params = [parseInt(dias)];
    let idx = 2;

    if (tipo_id)    { conds.push(`a.tipo_id = $${idx++}`);    params.push(tipo_id); }
    if (militar_id) { conds.push(`a.militar_id = $${idx++}`); params.push(parseInt(militar_id)); }

    const extra = conds.length ? 'AND ' + conds.join(' AND ') : '';

    const result = await db.query(
      `SELECT a.id, a.data_inicio, a.data_fim, a.dias_total, a.status, a.motivo,
              m.nome as militar_nome, m.posto_graduacao, m.matricula,
              u.sigla as unidade_sigla, t.nome as tipo_nome,
              (a.data_inicio - CURRENT_DATE) as dias_para_inicio
       FROM afastamentos a
       JOIN militares m ON a.militar_id = m.id
       JOIN unidades u ON m.unidade_id = u.id
       JOIN tipos_afastamento t ON a.tipo_id = t.id
       WHERE a.data_inicio > CURRENT_DATE
         AND a.data_inicio <= CURRENT_DATE + $1
         AND a.status NOT IN ('cancelado','reprovado')
         ${extra}
       ORDER BY a.data_inicio`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── FÉRIAS NÃO GOZADAS ────────────────────────────────────────────────────────
router.get('/ferias-nao-gozadas', async (req, res) => {
  try {
    const { ano = new Date().getFullYear(), militar_id } = req.query;
    const milCond = militar_id ? `AND m.id = ${parseInt(militar_id)}` : '';

    const result = await db.query(
      `SELECT m.id as militar_id, m.nome, m.posto_graduacao, m.matricula,
              u.sigla as unidade_sigla, u.nome as unidade_nome,
              pf.periodo1_inicio, pf.periodo1_fim,
              pf.periodo2_inicio, pf.periodo2_fim,
              pf.dias_total as dias_planejados,
              CASE WHEN pf.id IS NOT NULL THEN true ELSE false END as tem_plano,
              COUNT(a.id) as afastamentos_ferias
       FROM militares m
       JOIN unidades u ON m.unidade_id = u.id
       LEFT JOIN plano_ferias pf ON pf.militar_id = m.id AND pf.ano = $1
       LEFT JOIN afastamentos a ON a.militar_id = m.id
         AND EXTRACT(YEAR FROM a.data_inicio) = $1
         AND a.status IN ('aprovado','em_andamento','concluido')
         AND a.tipo_id IN (SELECT id FROM tipos_afastamento WHERE nome ILIKE '%férias%')
       WHERE m.ativo = true ${milCond}
       GROUP BY m.id, m.nome, m.posto_graduacao, m.matricula,
                u.sigla, u.nome, pf.id, pf.periodo1_inicio, pf.periodo1_fim,
                pf.periodo2_inicio, pf.periodo2_fim, pf.dias_total
       HAVING COUNT(a.id) = 0
       ORDER BY m.posto_graduacao, m.nome`,
      [ano]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RELATÓRIO DETALHADO ───────────────────────────────────────────────────────
router.get('/afastamentos-detalhado', async (req, res) => {
  try {
    const { data_inicio, data_fim, ano, mes, militar_id, tipo_id, status } = req.query;
    const where = [];
    const params = [];
    let idx = 1;

    if (data_inicio) { where.push(`a.data_inicio >= $${idx++}`); params.push(data_inicio); }
    if (data_fim)    { where.push(`a.data_fim <= $${idx++}`);    params.push(data_fim); }
    if (ano)         { where.push(`EXTRACT(YEAR FROM a.data_inicio) = $${idx++}`);  params.push(parseInt(ano)); }
    if (mes)         { where.push(`EXTRACT(MONTH FROM a.data_inicio) = $${idx++}`); params.push(parseInt(mes)); }
    if (militar_id)  { where.push(`a.militar_id = $${idx++}`);  params.push(militar_id); }
    if (tipo_id)     { where.push(`a.tipo_id = $${idx++}`);     params.push(tipo_id); }
    if (status)      { where.push(`a.status = $${idx++}`);      params.push(status); }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT a.id, a.data_inicio, a.data_fim, a.dias_total, a.status, a.motivo,
              m.nome as militar_nome, m.posto_graduacao, m.matricula, m.cpf,
              u.nome as unidade_nome, u.sigla as unidade_sigla,
              t.nome as tipo_nome, a.created_at,
              a.termo_url, a.termo_url_assinado
       FROM afastamentos a
       JOIN militares m ON a.militar_id = m.id
       JOIN unidades u ON m.unidade_id = u.id
       JOIN tipos_afastamento t ON a.tipo_id = t.id
       ${whereStr} ORDER BY a.data_inicio DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POR UNIDADE ───────────────────────────────────────────────────────────────
router.get('/por-unidade', async (req, res) => {
  try {
    const { ano = new Date().getFullYear() } = req.query;
    const result = await db.query(
      `SELECT u.nome as unidade, u.sigla, COUNT(a.id) as total,
              COALESCE(SUM(a.dias_total), 0) as total_dias,
              COUNT(DISTINCT a.militar_id) as militares_afastados
       FROM unidades u
       LEFT JOIN militares m ON m.unidade_id = u.id
       LEFT JOIN afastamentos a ON a.militar_id = m.id AND EXTRACT(YEAR FROM a.data_inicio) = $1
       WHERE u.ativo = true
       GROUP BY u.id, u.nome, u.sigla ORDER BY total DESC`,
      [ano]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PLANO DE FÉRIAS ───────────────────────────────────────────────────────────
router.get('/plano-ferias/:ano', async (req, res) => {
  try {
    const { unidade_id } = req.query;
    const cond = unidade_id ? `AND m.unidade_id = ${parseInt(unidade_id)}` : '';

    const result = await db.query(
      `SELECT m.nome, m.posto_graduacao, m.matricula,
              u.nome as unidade_nome, u.sigla as unidade_sigla,
              pf.tipo_plano, pf.divisao,
              pf.periodo1_inicio, pf.periodo1_fim,
              pf.periodo2_inicio, pf.periodo2_fim,
              pf.dias_total
       FROM militares m
       JOIN unidades u ON m.unidade_id = u.id
       LEFT JOIN plano_ferias pf ON pf.militar_id = m.id AND pf.ano = $1
       WHERE m.ativo = true ${cond}
       ORDER BY u.nome, m.posto_graduacao, m.nome`,
      [req.params.ano]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
