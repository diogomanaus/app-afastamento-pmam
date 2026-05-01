import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Upload, Download, CheckCircle, XCircle, Clock, Edit2, ExternalLink, BookOpen } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import type { Afastamento } from '../types';
import { format } from 'date-fns';

export default function AfastamentoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [af, setAf] = useState<Afastamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get(`/afastamentos/${id}`)
      .then(r => setAf(r.data))
      .catch(() => toast.error('Erro ao carregar afastamento'))
      .finally(() => setLoading(false));
  }, [id]);

  async function gerarDocumento() {
    setGerando(true);
    try {
      const res = await api.post(`/afastamentos/${id}/gerar-documento`);
      setAf(prev => prev ? { ...prev, documento_gerado_url: res.data.url } : prev);
      toast.success('Documento gerado! Clique em Baixar para salvar.');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao gerar documento');
    } finally {
      setGerando(false);
    }
  }

  async function handleUpload() {
    if (!uploadFile) return toast.error('Selecione um arquivo PDF');
    const formData = new FormData();
    formData.append('documento', uploadFile);
    setUploading(true);
    try {
      const res = await api.post(`/afastamentos/${id}/upload-assinado`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAf(prev => prev ? { ...prev, documento_assinado_url: res.data.url, status: 'aprovado' } : prev);
      setUploadFile(null);
      toast.success('Documento assinado enviado com sucesso!');
    } catch {
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  }

  async function updateStatus(status: string) {
    try {
      await api.patch(`/afastamentos/${id}/status`, { status });
      setAf(prev => prev ? { ...prev, status: status as any } : prev);
      toast.success('Status atualizado!');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-pmam-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!af) return <p className="text-gray-400 p-6">Afastamento não encontrado.</p>;

  const dtIni = format(new Date(af.data_inicio.split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy');
  const dtFim = format(new Date(af.data_fim.split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy');

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/afastamentos')}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} className="text-pmam-blue" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-pmam-blue">
              Afastamento #{String(af.id).padStart(6, '0')}
            </h2>
            <p className="text-xs text-gray-400">
              {af.created_at ? format(new Date(af.created_at), 'dd/MM/yyyy HH:mm') : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={af.status} />
          <Link to={`/afastamentos/${id}/editar`}
            className="p-2 text-pmam-blue hover:bg-blue-50 rounded-lg" title="Editar">
            <Edit2 size={16} />
          </Link>
        </div>
      </div>

      {/* Dados do militar */}
      <div className="card">
        <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
          Dados do Militar
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-400 font-medium">Nome Completo</p>
            <p className="font-semibold text-gray-800 mt-0.5">{af.militar_nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Posto / Graduação</p>
            <p className="font-semibold text-gray-800 mt-0.5">{af.posto_graduacao}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">CPF</p>
            <p className="font-semibold text-gray-800 mt-0.5 font-mono text-xs">{af.cpf}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">RG</p>
            <p className="font-semibold text-gray-800 mt-0.5">{af.rg ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Matrícula</p>
            <p className="font-semibold text-gray-800 mt-0.5">{af.matricula ?? '—'}</p>
          </div>
          <div className="sm:col-span-3">
            <p className="text-xs text-gray-400 font-medium">Unidade</p>
            <p className="font-semibold text-gray-800 mt-0.5">
              {af.unidade_sigla ? `${af.unidade_sigla} – ` : ''}{af.unidade_nome}
            </p>
          </div>
        </div>
      </div>

      {/* Dados do afastamento */}
      <div className="card">
        <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
          Detalhes do Afastamento
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-400 font-medium">Tipo</p>
            <p className="font-semibold text-gray-800 mt-0.5">{af.tipo_nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Data Início</p>
            <p className="font-semibold text-gray-800 mt-0.5">{dtIni}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Data Fim</p>
            <p className="font-semibold text-gray-800 mt-0.5">{dtFim}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total de Dias</p>
            <p className="text-2xl font-bold text-pmam-blue mt-0.5">{af.dias_total}</p>
          </div>
          {af.fundamentacao_legal && (
            <div className="sm:col-span-3">
              <p className="text-xs text-gray-400 font-medium">Base Legal</p>
              <p className="text-gray-600 mt-0.5 text-xs">{af.fundamentacao_legal}</p>
            </div>
          )}
        </div>
        {af.motivo && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-1">Motivo Declarado</p>
            <p className="text-gray-700 text-sm leading-relaxed">{af.motivo}</p>
          </div>
        )}
      </div>

      {/* Documento — só para: Férias, Licença Especial, Dispensa do Serviço */}
      {['Férias Regulamentares', 'Licença Especial', 'Dispensa do Serviço'].some(t => af.tipo_nome?.includes(t)) && <div className="card">
        <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-5 pb-2 border-b border-gray-100">
          Documento para Assinatura Digital
        </h3>

        {/* Passo 1 — Gerar PDF */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${af.documento_gerado_url ? 'bg-green-500 text-white' : 'bg-pmam-blue text-white'}`}>
              1
            </div>
            <p className="font-semibold text-sm text-gray-800">Gerar Requerimento (PDF)</p>
          </div>
          <div className="ml-9 flex flex-wrap gap-2">
            <button
              onClick={gerarDocumento}
              disabled={gerando}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <FileText size={15} />
              {gerando ? 'Gerando...' : 'Gerar PDF'}
            </button>
            {af.documento_gerado_url && (
              <a
                href={af.documento_gerado_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download size={15} /> Baixar documento
              </a>
            )}
          </div>
          {af.documento_gerado_url && (
            <p className="ml-9 mt-1 text-xs text-green-600 flex items-center gap-1">
              <CheckCircle size={12} /> Documento gerado — baixe para assinar
            </p>
          )}
        </div>

        {/* Passo 2 — Assinar */}
        <div className="mb-4 ml-0 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-pmam-gold text-white flex items-center justify-center text-xs font-bold">2</div>
            <p className="font-semibold text-sm text-gray-800">Assinar com o App Gov.br</p>
          </div>
          <p className="ml-9 text-xs text-gray-600 mb-2">
            Abra o PDF no app Gov.br e use a função <strong>Assinar Documento</strong> para assinar digitalmente.
          </p>
          <a
            href="https://www.gov.br/governodigital/pt-br/assinatura-eletronica"
            target="_blank" rel="noreferrer"
            className="ml-9 inline-flex items-center gap-1 text-pmam-blue text-xs hover:underline"
          >
            <ExternalLink size={12} /> Saiba como assinar pelo Gov.br
          </a>
        </div>

        {/* Passo 3 — Upload do assinado */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${af.documento_assinado_url ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
              3
            </div>
            <p className="font-semibold text-sm text-gray-800">Enviar Documento Assinado</p>
          </div>

          <div className="ml-9">
            {af.documento_assinado_url ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">Documento assinado recebido</p>
                <a href={af.documento_assinado_url} target="_blank" rel="noreferrer"
                  className="ml-auto text-pmam-blue text-xs hover:underline flex items-center gap-1">
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
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                  className="btn-primary flex items-center gap-2 whitespace-nowrap"
                >
                  <Upload size={15} />
                  {uploading ? 'Enviando...' : 'Enviar PDF'}
                </button>
              </div>
            )}
            <p className="mt-1.5 text-xs text-gray-400">
              Após enviar o documento assinado, o afastamento ficará registrado para controle.
            </p>
          </div>
        </div>
      </div>}

      {/* Livro de Afastamento (Termo de Início de Gozo) */}
      <div className="card border border-pmam-gold/40 bg-pmam-gold/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pmam-gold/20">
              <BookOpen size={20} className="text-pmam-gold" />
            </div>
            <div>
              <h3 className="font-bold text-pmam-blue text-sm">Livro de Afastamento</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Termo de Início de Gozo de Férias — documento oficial ABNT para assinatura digital
              </p>
            </div>
          </div>
          <Link
            to={`/afastamentos/${id}/termo`}
            className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap"
          >
            <BookOpen size={15} />
            {af.termo_url ? 'Ver Termo' : 'Preencher Termo'}
          </Link>
        </div>
        {af.termo_url && (
          <div className="mt-3 flex items-center gap-2 text-green-600 text-xs">
            <CheckCircle size={14} />
            <span className="font-semibold">Termo já gerado</span>
            <a href={af.termo_url} target="_blank" rel="noreferrer"
              className="ml-auto flex items-center gap-1 text-pmam-blue hover:underline">
              <Download size={12} /> Baixar Termo
            </a>
          </div>
        )}
      </div>

      {/* Controle de status */}
      <div className="card">
        <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
          Controle do Afastamento
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { s: 'aprovado',     label: 'Aprovado',      icon: <CheckCircle size={15}/>, cls: 'bg-green-600 hover:bg-green-700' },
            { s: 'em_andamento', label: 'Em Andamento',  icon: <Clock size={15}/>,       cls: 'bg-blue-600 hover:bg-blue-700' },
            { s: 'concluido',    label: 'Concluído',     icon: <CheckCircle size={15}/>, cls: 'bg-gray-600 hover:bg-gray-700' },
            { s: 'reprovado',    label: 'Reprovado',     icon: <XCircle size={15}/>,     cls: 'bg-red-600 hover:bg-red-700' },
            { s: 'cancelado',    label: 'Cancelado',     icon: <XCircle size={15}/>,     cls: 'bg-red-800 hover:bg-red-900' },
          ].map(({ s, label, icon, cls }) => (
            <button key={s}
              onClick={() => updateStatus(s)}
              disabled={af.status === s}
              className={`flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40 ${cls}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
        {af.aprovado_por_nome && (
          <p className="mt-3 text-xs text-gray-400">
            Por: <strong>{af.aprovado_por_nome}</strong>
            {af.aprovado_em && ` — ${format(new Date(af.aprovado_em), 'dd/MM/yyyy HH:mm')}`}
          </p>
        )}
      </div>
    </div>
  );
}
