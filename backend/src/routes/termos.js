const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const multer = require('multer');

router.use(authenticate);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configuração do Multer para upload de termos assinados
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const id = req.params.id;
    cb(null, `termo_assinado_${String(id).padStart(6,'0')}_${Date.now()}.pdf`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Apenas arquivos PDF são aceitos'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Dias da semana em PT-BR
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
                     'quinta-feira', 'sexta-feira', 'sábado'];
const MESES_EXT = ['janeiro','fevereiro','março','abril','maio','junho',
                   'julho','agosto','setembro','outubro','novembro','dezembro'];

function diaSemana(dateStr) {
  // dateStr formato: YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return DIAS_SEMANA[dt.getDay()];
}

function fmtDateBR(dateStr) {
  if (!dateStr) return '';
  const s = dateStr.split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

function fmtDateExtenso(dateStr) {
  if (!dateStr) return '';
  const s = dateStr.split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  return `${String(d).padStart(2,'0')} de ${MESES_EXT[m-1]} de ${y}`;
}

// GET /api/termos/:id — busca dados do termo de um afastamento
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.militar_id, a.tipo_id, a.data_inicio, a.data_fim, a.dias_total, a.status,
              a.termo_numero, a.termo_funcao, a.termo_bi, a.termo_periodo_aquisitivo,
              a.termo_data_apresentacao, a.termo_endereco, a.termo_telefone, a.termo_url, a.termo_url_assinado,
              m.nome as militar_nome, m.posto_graduacao, m.rg, m.matricula, m.cpf,
              u.nome as unidade_nome, u.sigla as unidade_sigla,
              t.nome as tipo_nome
       FROM afastamentos a
       JOIN militares m ON a.militar_id = m.id
       JOIN unidades u ON m.unidade_id = u.id
       JOIN tipos_afastamento t ON a.tipo_id = t.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Afastamento não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/termos/:id/salvar — salva os dados do termo (sem gerar PDF)
router.post('/:id/salvar', async (req, res) => {
  const { funcao, bi, periodo_aquisitivo, data_apresentacao, endereco, telefone, numero } = req.body;
  try {
    await db.query(
      `UPDATE afastamentos SET
         termo_numero = COALESCE($1, termo_numero),
         termo_funcao = $2,
         termo_bi = $3,
         termo_periodo_aquisitivo = $4,
         termo_data_apresentacao = $5,
         termo_endereco = $6,
         termo_telefone = $7
       WHERE id = $8`,
      [numero || null, funcao || null, bi || null, periodo_aquisitivo || null,
       data_apresentacao || null, endereco || null, telefone || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/termos/:id/gerar — salva dados e gera o PDF do termo
router.post('/:id/gerar', async (req, res) => {
  const { funcao, bi, periodo_aquisitivo, data_apresentacao, endereco, telefone, numero } = req.body;

  if (!funcao || !bi || !periodo_aquisitivo || !data_apresentacao || !endereco || !telefone) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios para gerar o Termo' });
  }

  try {
    // Buscar dados do afastamento
    const result = await db.query(
      `SELECT a.id, a.data_inicio, a.data_fim, a.dias_total,
              m.nome as militar_nome, m.posto_graduacao, m.rg, m.matricula,
              u.nome as unidade_nome, u.sigla as unidade_sigla,
              t.nome as tipo_nome
       FROM afastamentos a
       JOIN militares m ON a.militar_id = m.id
       JOIN unidades u ON m.unidade_id = u.id
       JOIN tipos_afastamento t ON a.tipo_id = t.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Afastamento não encontrado' });

    const af = result.rows[0];

    // Gerar número automático se não fornecido
    const termoNum = numero && numero.trim()
      ? numero.trim()
      : `${String(af.id).padStart(3,'0')}/${new Date().getFullYear()}`;

    // Salvar dados no banco
    await db.query(
      `UPDATE afastamentos SET
         termo_numero = $1, termo_funcao = $2, termo_bi = $3,
         termo_periodo_aquisitivo = $4, termo_data_apresentacao = $5,
         termo_endereco = $6, termo_telefone = $7
       WHERE id = $8`,
      [termoNum, funcao, bi, periodo_aquisitivo,
       data_apresentacao, endereco, telefone, req.params.id]
    );

    // Gerar PDF
    const filename = `termo_${String(af.id).padStart(6,'0')}_${Date.now()}.pdf`;
    const filepath = path.join(uploadDir, filename);

    await gerarTermoPDF({
      af,
      termoNum,
      funcao,
      bi,
      periodo_aquisitivo,
      data_apresentacao,
      endereco,
      telefone,
    }, filepath);

    const url = `/uploads/${filename}`;
    await db.query('UPDATE afastamentos SET termo_url = $1 WHERE id = $2', [url, req.params.id]);

    res.json({ url, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function gerarTermoPDF(dados, filepath) {
  return new Promise((resolve, reject) => {
    const { af, termoNum, funcao, bi, periodo_aquisitivo, data_apresentacao, endereco, telefone } = dados;

    // ABNT A4: 595.28 x 841.89 pt
    // Margens ABNT: superior=3cm, esquerda=3cm, direita=2cm, inferior=2cm
    const MARGIN_TOP = 85;   // ~3cm
    const MARGIN_LEFT = 85;  // ~3cm
    const MARGIN_RIGHT = 57; // ~2cm
    const MARGIN_BOT = 57;   // ~2cm
    const PAGE_W = 595.28;
    const LINE_H = 20;       // 1.5 espaçamento ~= 18-20pt com fonte 12
    const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;

    const NAVY = '#1B3060';
    const GOLD = '#C8960C';
    const BLACK = '#000000';

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN_TOP, left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: MARGIN_BOT },
    });

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // ── CABEÇALHO INSTITUCIONAL ──────────────────────────────────────────
    const brasaoPath = path.join(__dirname, '../../brasao.jpeg');
    if (fs.existsSync(brasaoPath)) {
      doc.image(brasaoPath, PAGE_W / 2 - 35, MARGIN_TOP, { width: 70, height: 70 });
    }

    // Linha superior azul
    doc.rect(MARGIN_LEFT, MARGIN_TOP, CONTENT_W, 3).fill(NAVY);

    doc.y = MARGIN_TOP + 10;

    doc.font('Times-Bold').fontSize(11).fillColor(NAVY)
      .text('ESTADO DO AMAZONAS', MARGIN_LEFT, doc.y, { align: 'center', width: CONTENT_W });
    doc.font('Times-Bold').fontSize(11).fillColor(NAVY)
      .text('SECRETARIA DE SEGURANÇA PÚBLICA', MARGIN_LEFT, doc.y, { align: 'center', width: CONTENT_W });
    doc.font('Times-Bold').fontSize(11).fillColor(NAVY)
      .text('POLÍCIA MILITAR DO ESTADO DO AMAZONAS', MARGIN_LEFT, doc.y, { align: 'center', width: CONTENT_W });
    doc.font('Times-Roman').fontSize(10).fillColor(BLACK)
      .text('DIRETORIA DE PESSOAL INATIVO – DPI', MARGIN_LEFT, doc.y, { align: 'center', width: CONTENT_W });

    // Linha dourada separadora
    doc.moveDown(0.4);
    doc.rect(MARGIN_LEFT, doc.y, CONTENT_W, 2).fill(GOLD);
    doc.moveDown(1);

    // ── TÍTULO DO DOCUMENTO ──────────────────────────────────────────────
    doc.font('Times-Bold').fontSize(13).fillColor(NAVY)
      .text(`TERMO DE INÍCIO DE GOZO DE FÉRIAS Nº ${termoNum} – AJ/DPI`,
            MARGIN_LEFT, doc.y, { align: 'center', width: CONTENT_W });

    doc.moveDown(1.2);

    // ── SEÇÃO 1 ──────────────────────────────────────────────────────────
    secaoTitulo(doc, '1. IDENTIFICAÇÃO DO MILITAR', MARGIN_LEFT, CONTENT_W, NAVY);
    doc.moveDown(0.4);

    const dtIni = af.data_inicio ? af.data_inicio.split('T')[0] : '';

    campo(doc, 'NOME COMPLETO', af.militar_nome.toUpperCase(), MARGIN_LEFT + 10, CONTENT_W - 10);
    campo(doc, 'POSTO/GRADUAÇÃO', af.posto_graduacao, MARGIN_LEFT + 10, CONTENT_W - 10);
    if (af.rg) campo(doc, 'RG', af.rg, MARGIN_LEFT + 10, CONTENT_W - 10);
    campo(doc, 'FUNÇÃO', funcao, MARGIN_LEFT + 10, CONTENT_W - 10);

    doc.moveDown(0.8);

    // ── SEÇÃO 2 ──────────────────────────────────────────────────────────
    secaoTitulo(doc, '2. AMPARO ADMINISTRATIVO', MARGIN_LEFT, CONTENT_W, NAVY);
    doc.moveDown(0.4);

    campo(doc, 'PUBLICAÇÃO EM BI/BG', bi, MARGIN_LEFT + 10, CONTENT_W - 10);
    campo(doc, 'PERÍODO AQUISITIVO', periodo_aquisitivo, MARGIN_LEFT + 10, CONTENT_W - 10);

    doc.moveDown(0.8);

    // ── SEÇÃO 3 ──────────────────────────────────────────────────────────
    secaoTitulo(doc, '3. DADOS DO PERÍODO DE GOZO', MARGIN_LEFT, CONTENT_W, NAVY);
    doc.moveDown(0.4);

    const dtFimStr = af.data_fim ? af.data_fim.split('T')[0] : '';
    const dtApresStr = data_apresentacao;

    const dtIniBR = fmtDateBR(dtIni);
    const dtFimBR = fmtDateBR(dtFimStr);
    const dtApresBR = fmtDateBR(dtApresStr);

    const diaIni = dtIni ? diaSemana(dtIni) : '';
    const diaFim = dtFimStr ? diaSemana(dtFimStr) : '';
    const diaApres = dtApresStr ? diaSemana(dtApresStr) : '';

    campo(doc, 'DATA DE INÍCIO',
      `${dtIniBR}${diaIni ? ` (${diaIni.charAt(0).toUpperCase() + diaIni.slice(1)})` : ''}`,
      MARGIN_LEFT + 10, CONTENT_W - 10);
    campo(doc, 'DATA DE TÉRMINO',
      `${dtFimBR}${diaFim ? ` (${diaFim.charAt(0).toUpperCase() + diaFim.slice(1)})` : ''}`,
      MARGIN_LEFT + 10, CONTENT_W - 10);
    campo(doc, 'DATA DE APRESENTAÇÃO PRONTA',
      `${dtApresBR}${diaApres ? ` (${diaApres.charAt(0).toUpperCase() + diaApres.slice(1)})` : ''}, às 07:30h.`,
      MARGIN_LEFT + 10, CONTENT_W - 10);

    doc.moveDown(0.8);

    // ── SEÇÃO 4 ──────────────────────────────────────────────────────────
    secaoTitulo(doc, '4. TERMO DE COMPROMISSO E CIÊNCIA', MARGIN_LEFT, CONTENT_W, NAVY);
    doc.moveDown(0.6);

    const textoTermo =
      `Declaro, na qualidade de militar em serviço ativo lotado na ${af.unidade_nome || 'Diretoria de Pessoal Inativo (DPI)'}, ` +
      `que dou início nesta data ao gozo de minhas férias regulamentares. ` +
      `Afirmo estar ciente das obrigações previstas no Estatuto dos Policiais Militares ` +
      `(Lei nº 1.154/75), comprometendo-me a retornar às minhas atividades funcionais ` +
      `na data estipulada neste termo.`;

    const textoTermo2 =
      `Declaro, ainda, que durante o afastamento poderei ser localizado no endereço e ` +
      `contato abaixo informados, para fins de eventual convocação extraordinária por ` +
      `necessidade do serviço ou imperativo de segurança pública.`;

    doc.font('Times-Roman').fontSize(12).fillColor(BLACK)
      .text(textoTermo, MARGIN_LEFT, doc.y,
        { align: 'justify', width: CONTENT_W, lineGap: 5, indent: 36 });

    doc.moveDown(0.6);

    doc.font('Times-Roman').fontSize(12).fillColor(BLACK)
      .text(textoTermo2, MARGIN_LEFT, doc.y,
        { align: 'justify', width: CONTENT_W, lineGap: 5, indent: 36 });

    doc.moveDown(0.8);

    campo(doc, 'ENDEREÇO DE GOZO', endereco, MARGIN_LEFT + 10, CONTENT_W - 10);
    campo(doc, 'CONTATO TELEFÔNICO', telefone, MARGIN_LEFT + 10, CONTENT_W - 10);

    doc.moveDown(1.5);

    // ── ENCERRAMENTO E ASSINATURA ────────────────────────────────────────
    const dtHoje = dtIni
      ? `Manaus-AM, ${fmtDateExtenso(dtIni)}.`
      : `Manaus-AM, ${fmtDateExtenso(new Date().toISOString().split('T')[0])}.`;

    doc.font('Times-Roman').fontSize(12).fillColor(BLACK)
      .text(dtHoje, MARGIN_LEFT, doc.y, { align: 'center', width: CONTENT_W });

    doc.moveDown(2.5);

    // Linha de assinatura
    const sigX = PAGE_W / 2;
    doc.moveTo(sigX - 120, doc.y).lineTo(sigX + 120, doc.y).strokeColor(BLACK).lineWidth(0.5).stroke();
    doc.moveDown(0.3);

    doc.font('Times-Bold').fontSize(12).fillColor(BLACK)
      .text(af.militar_nome.toUpperCase(), MARGIN_LEFT, doc.y, { align: 'center', width: CONTENT_W });
    doc.font('Times-Roman').fontSize(12)
      .text(af.posto_graduacao, MARGIN_LEFT, doc.y, { align: 'center', width: CONTENT_W });
    doc.font('Times-Roman').fontSize(10).fillColor('#555555')
      .text('(Assinado Eletronicamente via Gov.br)', MARGIN_LEFT, doc.y,
        { align: 'center', width: CONTENT_W });

    // ── RODAPÉ ──────────────────────────────────────────────────────────
    const footY = doc.page.height - MARGIN_BOT - 20;
    doc.rect(MARGIN_LEFT, footY - 6, CONTENT_W, 1).fill(GOLD);
    doc.fontSize(7).fillColor('#888888')
      .text(
        `SCAF – Sistema de Controle de Afastamentos / PMAM  |  Termo nº ${termoNum}  |  Ref: AF-${String(af.id).padStart(6,'0')}  |  Gerado em: ${new Date().toLocaleString('pt-BR')}`,
        MARGIN_LEFT, footY,
        { align: 'center', width: CONTENT_W }
      );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// POST /api/termos/:id/upload-assinado — recebe o PDF do termo assinado pelo militar
router.post('/:id/upload-assinado', upload.single('termo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const url = `/uploads/${req.file.filename}`;
  try {
    await db.query(
      'UPDATE afastamentos SET termo_url_assinado = $1 WHERE id = $2',
      [url, req.params.id]
    );
    res.json({ ok: true, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function secaoTitulo(doc, texto, x, w, color) {
  doc.font('Times-Bold').fontSize(12).fillColor(color)
    .text(texto, x, doc.y, { width: w });
  // Sublinhado da seção
  const lineY = doc.y;
  doc.moveTo(x, lineY).lineTo(x + w, lineY).strokeColor(color).lineWidth(0.5).stroke();
}

function campo(doc, label, valor, x, w) {
  const texto = `${label}: `;
  doc.font('Times-Bold').fontSize(12).fillColor('#000000');
  const labelW = doc.widthOfString(texto);

  // Escreve label em negrito + valor normal na mesma linha
  doc.text(texto, x, doc.y, { continued: true, lineGap: 4 });
  doc.font('Times-Roman').text(valor || '—', { lineGap: 4, width: w - labelW });
}

module.exports = router;
