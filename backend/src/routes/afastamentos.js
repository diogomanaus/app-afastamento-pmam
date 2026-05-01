const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireComandante } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Apenas arquivos PDF são aceitos'));
  },
});

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status, tipo_id, militar_id, unidade_id, ano, mes, page = 1, limit = 25 } = req.query;
    const where = [];
    const params = [];
    let idx = 1;

    // Militar só vê seus próprios afastamentos
    if (req.user.perfil === 'militar' && req.user.militar_id) {
      where.push(`a.militar_id = \${idx++}`); params.push(req.user.militar_id);
    }
    if (status) { where.push(`a.status = $${idx++}`); params.push(status); }
    if (tipo_id) { where.push(`a.tipo_id = $${idx++}`); params.push(tipo_id); }
    if (militar_id) { where.push(`a.militar_id = $${idx++}`); params.push(militar_id); }
    if (unidade_id) { where.push(`m.unidade_id = $${idx++}`); params.push(unidade_id); }
    if (ano) { where.push(`EXTRACT(YEAR FROM a.data_inicio) = $${idx++}`); params.push(ano); }
    if (mes) { where.push(`EXTRACT(MONTH FROM a.data_inicio) = $${idx++}`); params.push(mes); }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [data, count] = await Promise.all([
      db.query(
        `SELECT a.*, m.nome as militar_nome, m.posto_graduacao, m.cpf, m.matricula,
                u.nome as unidade_nome, u.sigla as unidade_sigla,
                t.nome as tipo_nome, us.nome as aprovado_por_nome
         FROM afastamentos a
         JOIN militares m ON a.militar_id = m.id
         JOIN unidades u ON m.unidade_id = u.id
         JOIN tipos_afastamento t ON a.tipo_id = t.id
         LEFT JOIN usuarios us ON a.aprovado_por = us.id
         ${whereStr} ORDER BY a.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(
        `SELECT COUNT(*) FROM afastamentos a
         JOIN militares m ON a.militar_id = m.id ${whereStr}`,
        params
      ),
    ]);

    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tipos', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tipos_afastamento WHERE ativo = true ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/calendario', async (req, res) => {
  try {
    const { mes, ano, unidade_id } = req.query;
    const conditions = ['a.status != \'cancelado\''];
    const params = [];
    let idx = 1;

    if (ano && mes) {
      conditions.push(`a.data_inicio <= $${idx++}::date AND a.data_fim >= $${idx++}::date`);
      const firstDay = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(ano), parseInt(mes), 0).toISOString().split('T')[0];
      params.push(lastDay, firstDay);
    }
    if (unidade_id) { conditions.push(`m.unidade_id = $${idx++}`); params.push(unidade_id); }

    const result = await db.query(
      `SELECT a.id, a.militar_id, a.data_inicio, a.data_fim, a.status, a.dias_total,
              m.nome as militar_nome, m.posto_graduacao, t.nome as tipo_nome, u.sigla as unidade_sigla
       FROM afastamentos a
       JOIN militares m ON a.militar_id = m.id
       JOIN tipos_afastamento t ON a.tipo_id = t.id
       JOIN unidades u ON m.unidade_id = u.id
       WHERE ${conditions.join(' AND ')} ORDER BY a.data_inicio`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, m.nome as militar_nome, m.posto_graduacao, m.cpf, m.rg, m.matricula,
              u.nome as unidade_nome, u.sigla as unidade_sigla,
              t.nome as tipo_nome, t.descricao as tipo_descricao, t.fundamentacao_legal,
              us.nome as aprovado_por_nome, uc.nome as created_by_nome
       FROM afastamentos a
       JOIN militares m ON a.militar_id = m.id
       JOIN unidades u ON m.unidade_id = u.id
       JOIN tipos_afastamento t ON a.tipo_id = t.id
       LEFT JOIN usuarios us ON a.aprovado_por = us.id
       LEFT JOIN usuarios uc ON a.created_by = uc.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Afastamento não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { militar_id, tipo_id, data_inicio, data_fim, motivo, observacoes, ferias_ano_base, ferias_ano_exercicio } = req.body;
  if (!militar_id || !tipo_id || !data_inicio || !data_fim) {
    return res.status(400).json({ error: 'Campos obrigatórios: militar, tipo, data início e data fim' });
  }
  if (new Date(data_inicio) > new Date(data_fim)) {
    return res.status(400).json({ error: 'Data de início não pode ser posterior à data de término' });
  }
  try {
    const result = await db.query(
      `INSERT INTO afastamentos (militar_id, tipo_id, data_inicio, data_fim, motivo, observacoes, ferias_ano_base, ferias_ano_exercicio, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [militar_id, tipo_id, data_inicio, data_fim, motivo, observacoes, ferias_ano_base || null, ferias_ano_exercicio || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { tipo_id, data_inicio, data_fim, motivo, observacoes, ferias_ano_base, ferias_ano_exercicio } = req.body;
  try {
    const result = await db.query(
      `UPDATE afastamentos SET
        tipo_id = COALESCE($1, tipo_id),
        data_inicio = COALESCE($2, data_inicio),
        data_fim = COALESCE($3, data_fim),
        motivo = COALESCE($4, motivo),
        observacoes = COALESCE($5, observacoes)
       WHERE id = $6 RETURNING *`,
      [tipo_id, data_inicio, data_fim, motivo, observacoes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Afastamento não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', requireComandante, async (req, res) => {
  const { status, observacoes } = req.body;
  const valid = ['pendente', 'aprovado', 'reprovado', 'em_andamento', 'concluido', 'cancelado'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  try {
    const result = await db.query(
      `UPDATE afastamentos SET status=$1, observacoes=COALESCE($2, observacoes),
        aprovado_por = CASE WHEN $1 IN ('aprovado','reprovado') THEN $3 ELSE aprovado_por END,
        aprovado_em = CASE WHEN $1 IN ('aprovado','reprovado') THEN NOW() ELSE aprovado_em END
       WHERE id=$4 RETURNING *`,
      [status, observacoes, req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Afastamento não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/gerar-documento', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, m.nome as militar_nome, m.posto_graduacao, m.cpf, m.rg, m.matricula,
              u.nome as unidade_nome, u.sigla as unidade_sigla,
              t.nome as tipo_nome, t.fundamentacao_legal
       FROM afastamentos a
       JOIN militares m ON a.militar_id = m.id
       JOIN unidades u ON m.unidade_id = u.id
       JOIN tipos_afastamento t ON a.tipo_id = t.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Afastamento não encontrado' });

    const af = result.rows[0];
    const filename = `requerimento_${String(af.id).padStart(6, '0')}_${Date.now()}.pdf`;
    const filepath = path.join(uploadDir, filename);

    await gerarPDF(af, filepath);

    const url = `/uploads/${filename}`;
    await db.query(
      'UPDATE afastamentos SET documento_gerado_url = $1 WHERE id = $2',
      [url, req.params.id]
    );

    res.json({ url, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/upload-assinado', upload.single('documento'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  try {
    const result = await db.query(
      `UPDATE afastamentos SET documento_assinado_url = $1, status = 'aprovado'
       WHERE id = $2 RETURNING *`,
      [`/uploads/${req.file.filename}`, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Afastamento não encontrado' });
    res.json({ url: `/uploads/${req.file.filename}`, afastamento: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function gerarPDF(af, filepath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const NAVY = '#1B3060';
    const GOLD = '#C8960C';
    const DARK = '#2D2D2D';
    const pw = doc.page.width;

    // Linha de cabeçalho superior
    doc.rect(60, 40, pw - 120, 5).fill(NAVY);
    doc.moveDown(0.5);

    // Brasão da PMAM
    const brasaoPath = path.join(__dirname, '../../brasao.jpeg');
    if (fs.existsSync(brasaoPath)) {
      doc.image(brasaoPath, pw / 2 - 40, 52, { width: 80, height: 80 });
    }

    doc.moveDown(5);

    // Cabeçalho institucional
    doc.fontSize(10).fillColor(NAVY).font('Helvetica-Bold')
      .text('ESTADO DO AMAZONAS', { align: 'center' })
      .text('SECRETARIA DE SEGURANÇA PÚBLICA', { align: 'center' })
      .text('POLÍCIA MILITAR DO ESTADO DO AMAZONAS', { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor(DARK)
      .text(af.unidade_nome, { align: 'center' });

    doc.moveDown(0.5);
    doc.rect(60, doc.y, pw - 120, 2).fill(GOLD);
    doc.moveDown(1);

    // Título
    doc.fontSize(13).fillColor(NAVY).font('Helvetica-Bold')
      .text('REQUERIMENTO DE AFASTAMENTO', { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor(DARK)
      .text(`Nº ${String(af.id).padStart(6, '0')}/${new Date().getFullYear()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Data e local
    const dtHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.fontSize(10).font('Helvetica').fillColor(DARK)
      .text(`Manaus/AM, ${dtHoje}`, { align: 'right' });
    doc.moveDown(1);

    // Destinatário
    doc.font('Helvetica').text('À')
      .font('Helvetica-Bold').text(`Sr. Comandante da ${af.unidade_nome}`)
      .font('Helvetica').text(`${af.unidade_sigla} – Polícia Militar do Estado do Amazonas`);
    doc.moveDown(1);

    // Apresentação
    const dtIni = new Date(af.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR');
    const dtFim = new Date(af.data_fim + 'T12:00:00').toLocaleDateString('pt-BR');
    const dias = af.dias_total;

    doc.font('Helvetica').fontSize(10)
      .text(
        `${af.militar_nome}, ${af.posto_graduacao} da Polícia Militar do Estado do Amazonas` +
        (af.matricula ? `, matrícula nº ${af.matricula}` : '') +
        `, inscrito(a) no CPF sob o nº ${af.cpf}` +
        (af.rg ? `, portador(a) do RG nº ${af.rg}` : '') +
        `, lotado(a) na ${af.unidade_nome}, vem, mui respeitosamente, à presença de Vossa Excelência ` +
        `requerer a concessão de ${af.tipo_nome.toUpperCase()}, no período de ${dtIni} a ${dtFim} ` +
        `(${dias} ${dias === 1 ? 'dia' : 'dias'} consecutivos), nos termos da legislação vigente, ` +
        `conforme exposto a seguir.`,
        { align: 'justify', lineGap: 4 }
      );
    doc.moveDown(1);

    // Seção I
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
      .text('I – DA FUNDAMENTAÇÃO LEGAL');
    doc.font('Helvetica').fillColor(DARK).moveDown(0.5);
    if (af.fundamentacao_legal) {
      doc.text(`Base legal: ${af.fundamentacao_legal}`, { align: 'justify' });
      doc.moveDown(0.5);
    }
    doc.text(getJustificativa(af.tipo_nome), { align: 'justify', lineGap: 4 });
    doc.moveDown(1);

    // Seção II – Motivo
    if (af.motivo) {
      doc.font('Helvetica-Bold').fillColor(NAVY).text('II – DO MOTIVO DECLARADO PELO REQUERENTE');
      doc.font('Helvetica').fillColor(DARK).moveDown(0.5);
      doc.text(af.motivo, { align: 'justify', lineGap: 4 });
      doc.moveDown(1);
    }

    // Seção III – Pedido
    const secNum = af.motivo ? 'III' : 'II';
    doc.font('Helvetica-Bold').fillColor(NAVY).text(`${secNum} – DO PEDIDO`);
    doc.font('Helvetica').fillColor(DARK).moveDown(0.5);
    doc.text(
      `Ante o exposto, solicita o(a) requerente que Vossa Excelência se digne de ` +
      `deferir o pedido de ${af.tipo_nome}, no período de ${dtIni} a ${dtFim} ` +
      `(${dias} ${dias === 1 ? 'dia' : 'dias'}), comprometendo-se o(a) requerente a ` +
      `apresentar toda a documentação necessária para a devida instrução do processo ` +
      `junto ao Setor de Pessoal desta Unidade, bem como a retornar ao serviço na ` +
      `data prevista, salvo por motivo devidamente justificado.`,
      { align: 'justify', lineGap: 4 }
    );
    doc.moveDown(2);

    // Encerramento
    doc.font('Helvetica').text('Nestes termos,', { align: 'center' });
    doc.text('Pede e espera deferimento.', { align: 'center' });
    doc.moveDown(2.5);
    doc.text(`Manaus/AM, ${dtHoje}`, { align: 'center' });
    doc.moveDown(3.5);

    // Assinatura
    const cx = pw / 2;
    doc.moveTo(cx - 110, doc.y).lineTo(cx + 110, doc.y).strokeColor(NAVY).stroke();
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fillColor(DARK).text(af.militar_nome.toUpperCase(), { align: 'center' });
    doc.font('Helvetica').text(af.posto_graduacao, { align: 'center' });
    if (af.matricula) doc.text(`Matrícula: ${af.matricula}`, { align: 'center' });
    doc.text(`CPF: ${af.cpf}`, { align: 'center' });

    // Rodapé
    doc.rect(60, doc.page.height - 55, pw - 120, 1.5).fill(GOLD);
    doc.fontSize(7).fillColor('#888888')
      .text(
        `Sistema de Controle de Afastamentos – PMAM  |  Documento gerado em: ${new Date().toLocaleString('pt-BR')}  |  Ref: AF-${String(af.id).padStart(6, '0')}`,
        60, doc.page.height - 45,
        { align: 'center', width: pw - 120 }
      );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

function getJustificativa(tipo) {
  const t = tipo.toLowerCase();
  if (t.includes('férias'))
    return 'As férias regulamentares constituem direito constitucional assegurado pelo Art. 7º, inciso XVII, da Constituição Federal de 1988 e pela legislação estadual pertinente. O período de afastamento é imprescindível para a manutenção da saúde física e psicológica do servidor militar, contribuindo para a preservação da capacidade operacional da Corporação e para a qualidade do serviço de segurança pública prestado à sociedade amazonense. O gozo regular das férias reduz riscos de esgotamento funcional e melhora o desempenho das atividades policiais.';
  if (t.includes('saúde') || t.includes('lts'))
    return 'A Licença para Tratamento de Saúde (LTS) é medida que se impõe diante da necessidade de acompanhamento médico e período de recuperação, conforme atestado médico em anexo. O deferimento é essencial para a plena recuperação do servidor militar, evitando agravamentos de saúde que poderiam resultar em afastamentos mais prolongados, e garantindo a segurança no desempenho das atividades operacionais, uma vez que a atividade policial exige plenas condições físicas e mentais do profissional.';
  if (t.includes('maternidade'))
    return 'A licença-maternidade é direito constitucional fundamental previsto no Art. 7º, inciso XVIII, da Constituição Federal de 1988, assegurado também pelo Art. 10, inciso II, alínea "b" do ADCT, e regulamentado pela legislação ordinária. A medida visa à proteção da maternidade, à saúde da genitora e ao desenvolvimento saudável do recém-nascido nos primeiros meses de vida, constituindo garantia irrenunciável do servidor público militar.';
  if (t.includes('paternidade'))
    return 'A licença-paternidade é direito constitucional previsto no Art. 7º, inciso XIX, combinado com o Art. 10, §1º do ADCT, da Constituição Federal de 1988. O benefício fundamenta-se no princípio constitucional da proteção à família e à criança, reconhecendo a importância da presença e do apoio paterno nos primeiros dias de vida do filho, período crucial para o vínculo afetivo e o desenvolvimento familiar.';
  if (t.includes('familiar') || t.includes('pessoa da família'))
    return 'O afastamento para acompanhamento de familiar enfermo justifica-se pela necessidade de prestação de cuidados indispensáveis ao cônjuge ou dependente em situação de saúde grave, conforme documentação médica em anexo. Trata-se de medida humanitária que concilia o exercício das responsabilidades funcionais com os valores constitucionais de proteção à família, previstos no Art. 226 da Constituição Federal.';
  if (t.includes('especial') || t.includes('prêmio'))
    return 'A licença especial e a licença prêmio constituem benefícios concedidos ao servidor militar como reconhecimento pelos anos de efetivo e dedicado serviço prestado à Corporação e à sociedade. Trata-se de direito adquirido mediante comprovação de tempo de serviço ininterrupto, previsto no Estatuto dos Policiais Militares do Estado do Amazonas como forma de valorização e reconhecimento profissional, promovendo o bem-estar e a saúde do servidor.';
  if (t.includes('curso') || t.includes('estudo') || t.includes('pesquisa'))
    return 'O afastamento para fins de capacitação, especialização ou pesquisa científica fundamenta-se no princípio constitucional da eficiência administrativa e no interesse público no aprimoramento profissional do servidor. O investimento na formação continuada do policial militar contribui diretamente para a melhoria da qualidade dos serviços prestados pela PMAM, para o desenvolvimento institucional da Corporação e para o cumprimento mais eficaz da missão constitucional de preservação da ordem pública.';
  if (t.includes('missão'))
    return 'O afastamento para cumprimento de missão especial decorre de necessidade operacional e institucional da Polícia Militar do Estado do Amazonas, visando ao cumprimento das atribuições constitucionais da Corporação. A missão designada reveste-se de relevância para a segurança pública do Estado, e sua execução exige o afastamento temporário do policial das atividades regulares da Unidade de origem, conforme determinação do Comando competente.';
  if (t.includes('acidente'))
    return 'O afastamento decorre de acidente sofrido em serviço, situação que impõe o afastamento compulsório do servidor militar das atividades funcionais para fins de tratamento e recuperação. A legislação aplicável assegura ao policial militar acidentado em razão do serviço o direito ao afastamento remunerado pelo tempo necessário à sua plena recuperação, sem prejuízo dos vencimentos e demais vantagens, reconhecendo o sacrifício do servidor em prol da segurança da coletividade.';
  if (t.includes('eleitoral'))
    return 'O afastamento eleitoral fundamenta-se nas disposições do Código Eleitoral e nas resoluções do Tribunal Superior Eleitoral vigentes, que asseguram ao servidor convocado para funções eleitorais o afastamento temporário de suas atividades funcionais sem prejuízo dos vencimentos. O exercício da função eleitoral constitui dever cívico e contribui para a higidez do processo democrático.';
  return 'O afastamento solicitado fundamenta-se na legislação aplicável aos servidores militares do Estado do Amazonas, sendo medida necessária e justificada pelas circunstâncias apresentadas. O requerente declara a veracidade das informações prestadas e compromete-se a apresentar toda a documentação necessária à instrução do pedido, retornando ao serviço na data prevista, salvo superveniência de fato devidamente comprovado que justifique eventual prorrogação.';
}

module.exports = router;
