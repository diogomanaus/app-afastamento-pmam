import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, FileText, Download, Save, CheckCircle, Info, Upload,
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface TermoData {
  id: number;
  militar_nome: string;
  posto_graduacao: string;
  rg: string;
  matricula?: string;
  unidade_nome: string;
  unidade_sigla: string;
  tipo_nome: string;
  data_inicio: string;
  data_fim: string;
  dias_total: number;
  status: string;
  // Campos do termo
  termo_numero?: string;
  termo_funcao?: string;
  termo_bi?: string;
  termo_periodo_aquisitivo?: string;
  termo_data_apresentacao?: string;
  termo_endereco?: string;
  termo_telefone?: string;
  termo_url?: string;
  termo_url_assinado?: string;
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function diaSemana(dateStr: string) {
  const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira',
                'Quinta-feira','Sexta-feira','Sábado'];
  const [y, m, d] = dateStr.split('-').map(Number);
  return dias[new Date(y, m - 1, d).getDay()];
}

function fmtBR(dateStr: string) {
  if (!dateStr) return '';
  const s = dateStr.split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

// Calcula data de apresentação (+1 dia útil) automaticamente
function proximoDia(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().split('T')[0];
}

// Gera período aquisitivo automaticamente a partir do ano
function periodoAquisitivo(dataInicio: string) {
  if (!dataInicio) return '';
  const ano = parseInt(dataInicio.split('-')[0]);
  return `${ano - 1} / ${ano}`;
}

export default function TermoAfastamento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dados, setDados] = useState<TermoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Campos do formulário
  const [numero, setNumero] = useState('');
  const [funcao, setFuncao] = useState('');
  const [bi, setBi] = useState('');
  const [periodoAquisit, setPeriodoAquisit] = useState('');
  const [dataApresentacao, setDataApresentacao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');

  // Upload do termo assinado
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get(`/termos/${id}`)
      .then(r => {
        const d = r.data;
        setDados(d);
        // Preencher campos com dados já salvos ou calcular defaults
        setNumero(d.termo_numero || '');
        setFuncao(d.termo_funcao || '');
        setBi(d.termo_bi || '');
        const dtIni = d.data_inicio?.split('T')[0] ?? '';
        setPeriodoAquisit(d.termo_periodo_aquisitivo || periodoAquisitivo(dtIni));
        const dtFim = d.data_fim?.split('T')[0] ?? '';
        setDataApresentacao(d.termo_data_apresentacao?.split('T')[0] || proximoDia(dtFim));
        setEndereco(d.termo_endereco || '');
        setTelefone(d.termo_telefone || '');
      })
      .catch(() => toast.error('Erro ao carregar dados do afastamento'))
      .finally(() => setLoading(false));
  }, [id]);

  async function salvarRascunho() {
    setSalvando(true);
    try {
      await api.post(`/termos/${id}/salvar`, {
        numero, funcao, bi,
        periodo_aquisitivo: periodoAquisit,
        data_apresentacao: dataApresentacao,
        endereco, telefone,
      });
      toast.success('Rascunho salvo!');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function gerarTermo() {
    if (!funcao || !bi || !periodoAquisit || !dataApresentacao || !endereco || !telefone) {
      return toast.error('Preencha todos os campos antes de gerar o Termo');
    }
    setGerando(true);
    try {
      const res = await api.post(`/termos/${id}/gerar`, {
        numero, funcao, bi,
        periodo_aquisitivo: periodoAquisit,
        data_apresentacao: dataApresentacao,
        endereco, telefone,
      });
      setDados(prev => prev ? { ...prev, termo_url: res.data.url } : prev);
      toast.success('Termo gerado com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao gerar o Termo');
    } finally {
      setGerando(false);
    }
  }

  async function handleUploadAssinado() {
    if (!uploadFile) return toast.error('Selecione o PDF assinado');
    const formData = new FormData();
    formData.append('termo', uploadFile);
    setUploading(true);
    try {
      const res = await api.post(`/termos/${id}/upload-assinado`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDados(prev => prev ? { ...prev, termo_url_assinado: res.data.url } : prev);
      setUploadFile(null);
      toast.success('Termo assinado enviado com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-pmam-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!dados) return <p className="text-gray-400 p-6">Afastamento não encontrado.</p>;

  const dtIni = dados.data_inicio?.split('T')[0] ?? '';
  const dtFim = dados.data_fim?.split('T')[0] ?? '';

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/afastamentos/${id}`}
          className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-pmam-blue" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-pmam-gold" />
            <h2 className="text-lg font-bold text-pmam-blue">
              Livro de Afastamento
            </h2>
          </div>
          <p className="text-xs text-gray-400">
            Termo de Início de Gozo — AF-{String(dados.id).padStart(6,'0')}
          </p>
        </div>
      </div>

      {/* Resumo do afastamento */}
      <div className="card border-l-4 border-l-pmam-blue bg-pmam-blue/5">
        <p className="text-xs text-pmam-blue font-bold uppercase tracking-wide mb-2">Afastamento Vinculado</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Militar</p>
            <p className="font-semibold text-gray-800">{dados.militar_nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Posto/Graduação</p>
            <p className="font-semibold text-gray-800">{dados.posto_graduacao}</p>
          </div>
          {dados.rg && (
            <div>
              <p className="text-xs text-gray-400">RG</p>
              <p className="font-semibold text-gray-800">{dados.rg}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">Tipo</p>
            <p className="font-semibold text-gray-800">{dados.tipo_nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Período</p>
            <p className="font-semibold text-gray-800">
              {fmtBR(dtIni)} → {fmtBR(dtFim)}
              <span className="text-pmam-blue ml-1">({dados.dias_total}d)</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Unidade</p>
            <p className="font-semibold text-gray-800">{dados.unidade_sigla}</p>
          </div>
        </div>
      </div>

      {/* Prévia do cabeçalho do documento */}
      <div className="card border border-gray-200 bg-gray-50">
        <div className="border-t-4 border-pmam-blue rounded-t-lg -mx-6 -mt-6 px-6 pt-4 pb-3 bg-white mb-4">
          <p className="text-center text-xs font-bold text-pmam-blue uppercase tracking-widest">
            POLÍCIA MILITAR DO ESTADO DO AMAZONAS
          </p>
          <p className="text-center text-xs text-gray-600">Diretoria de Pessoal Inativo – DPI</p>
          <div className="h-0.5 bg-pmam-gold mt-2" />
        </div>
        <p className="text-center text-sm font-bold text-pmam-blue">
          TERMO DE INÍCIO DE GOZO DE FÉRIAS
          {numero && ` Nº ${numero} – AJ/DPI`}
        </p>
        {dtIni && (
          <p className="text-center text-xs text-gray-500 mt-1">
            Início: {fmtBR(dtIni)} ({diaSemana(dtIni)}) · Fim: {fmtBR(dtFim)} ({diaSemana(dtFim)})
          </p>
        )}
      </div>

      {/* Formulário */}
      <div className="card">
        <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-5 pb-2 border-b border-gray-100">
          Dados do Termo
        </h3>

        <div className="space-y-5">
          {/* Seção 1 — Identificação */}
          <div>
            <p className="text-xs font-bold text-pmam-blue uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-pmam-blue text-white text-xs flex items-center justify-center font-bold">1</span>
              Identificação do Militar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
              <div className="sm:col-span-2">
                <label className="label">Nº do Termo (ex: 042/2026)</label>
                <input
                  className="input"
                  placeholder="Deixe em branco para gerar automaticamente"
                  value={numero}
                  onChange={e => setNumero(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  Se vazio, será gerado como {dados.id.toString().padStart(3,'0')}/{new Date().getFullYear()}
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Função / Cargo na Unidade *</label>
                <input
                  className="input"
                  placeholder="Ex: Secretário de Ajudância da DPI"
                  value={funcao}
                  onChange={e => setFuncao(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Seção 2 — Amparo Administrativo */}
          <div>
            <p className="text-xs font-bold text-pmam-blue uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-pmam-blue text-white text-xs flex items-center justify-center font-bold">2</span>
              Amparo Administrativo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
              <div className="sm:col-span-2">
                <label className="label">Publicação no BI/BG *</label>
                <input
                  className="input"
                  placeholder="Ex: Boletim Interno nº 078, de 15 de abril de 2026"
                  value={bi}
                  onChange={e => setBi(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Período Aquisitivo *</label>
                <input
                  className="input"
                  placeholder="Ex: 2025 / 2026"
                  value={periodoAquisit}
                  onChange={e => setPeriodoAquisit(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Seção 3 — Período de Gozo */}
          <div>
            <p className="text-xs font-bold text-pmam-blue uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-pmam-blue text-white text-xs flex items-center justify-center font-bold">3</span>
              Dados do Período de Gozo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
              {/* Início/Fim vêm do afastamento (somente leitura) */}
              <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Data de Início</label>
                  <div className="input bg-gray-50 cursor-not-allowed text-gray-600">
                    {dtIni ? `${fmtBR(dtIni)} — ${diaSemana(dtIni)}` : '—'}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Preenchido automaticamente</p>
                </div>
                <div>
                  <label className="label">Data de Término</label>
                  <div className="input bg-gray-50 cursor-not-allowed text-gray-600">
                    {dtFim ? `${fmtBR(dtFim)} — ${diaSemana(dtFim)}` : '—'}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Preenchido automaticamente</p>
                </div>
              </div>
              <div>
                <label className="label">Data de Apresentação Pronta *</label>
                <input
                  type="date"
                  className="input"
                  value={dataApresentacao}
                  onChange={e => setDataApresentacao(e.target.value)}
                />
                {dataApresentacao && (
                  <p className="text-xs text-pmam-blue mt-0.5 font-semibold">
                    {diaSemana(dataApresentacao)}, às 07:30h
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Seção 4 — Localização durante o gozo */}
          <div>
            <p className="text-xs font-bold text-pmam-blue uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-pmam-blue text-white text-xs flex items-center justify-center font-bold">4</span>
              Localização durante o Afastamento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
              <div className="sm:col-span-2">
                <label className="label">Endereço de Gozo *</label>
                <input
                  className="input"
                  placeholder="Ex: Rua das Orquídeas, nº 123, Bairro Adrianópolis, Manaus-AM"
                  value={endereco}
                  onChange={e => setEndereco(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Contato Telefônico *</label>
                <input
                  className="input"
                  placeholder="Ex: (92) 99999-9999"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Texto do compromisso (somente leitura) */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-700 mb-1 uppercase">Texto padrão do Termo de Compromisso e Ciência</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  <em>
                    "Declaro, na qualidade de militar em serviço ativo lotado na {dados.unidade_nome}, que dou início nesta data ao gozo de minhas férias regulamentares. Afirmo estar ciente das obrigações previstas no Estatuto dos Policiais Militares (Lei nº 1.154/75), comprometendo-me a retornar às minhas atividades funcionais na data estipulada neste termo. Declaro, ainda, que durante o afastamento poderei ser localizado no endereço e contato abaixo informados, para fins de eventual convocação extraordinária por necessidade do serviço ou imperativo de segurança pública."
                  </em>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={salvarRascunho}
            disabled={salvando}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Save size={15} />
            {salvando ? 'Salvando...' : 'Salvar Rascunho'}
          </button>

          <button
            onClick={gerarTermo}
            disabled={gerando}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <FileText size={15} />
            {gerando ? 'Gerando...' : 'Gerar Termo (PDF)'}
          </button>

          {dados.termo_url && (
            <a
              href={dados.termo_url}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex items-center gap-2 text-sm border-green-500 text-green-700 hover:bg-green-50"
            >
              <Download size={15} /> Baixar Termo
            </a>
          )}
        </div>

        {dados.termo_url && (
          <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle size={16} />
            <span className="font-semibold">Termo gerado — disponível para download</span>
          </div>
        )}
      </div>

      {/* Passo 3 — Envio do Termo Assinado */}
      {dados.termo_url && (
        <div className="card">
          <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-5 pb-2 border-b border-gray-100">
            Envio do Termo Assinado Digitalmente
          </h3>

          <div className="flex items-start gap-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              Após baixar o Termo, assine digitalmente pelo aplicativo <strong>Gov.br</strong> e envie o arquivo assinado abaixo para registro oficial na plataforma.
            </p>
          </div>

          {dados.termo_url_assinado ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 font-semibold">Termo assinado recebido e registrado</p>
              <a href={dados.termo_url_assinado} target="_blank" rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-pmam-blue text-xs hover:underline">
                <Download size={12} /> Ver arquivo
              </a>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-pmam-gold transition-colors bg-gray-50">
                <Upload size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500 truncate">
                  {uploadFile ? uploadFile.name : 'Clique para selecionar o PDF assinado...'}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                onClick={handleUploadAssinado}
                disabled={uploading || !uploadFile}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                <Upload size={15} />
                {uploading ? 'Enviando...' : 'Enviar Assinado'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Instruções */}
      <div className="card border border-pmam-blue/20 bg-pmam-blue/5">
        <p className="text-xs font-bold text-pmam-blue uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <BookOpen size={14} /> Como funciona o Livro de Afastamento
        </p>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Preencha os dados do Termo acima (função, publicação no BI/BG, período aquisitivo, endereço e contato).</li>
          <li>Clique em <strong>"Gerar Termo (PDF)"</strong> para gerar o documento oficial em ABNT.</li>
          <li>Baixe o PDF e assine digitalmente pelo aplicativo <strong>Gov.br</strong>.</li>
          <li>O documento assinado deverá ser entregue à Seção de Pessoal da DPI como registro do início do gozo.</li>
        </ol>
      </div>
    </div>
  );
}
