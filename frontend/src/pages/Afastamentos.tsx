import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, ChevronLeft, ChevronRight, Filter, Download, FileText, Paperclip } from 'lucide-react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import type { Afastamento, TipoAfastamento } from '../types';
import { format } from 'date-fns';

export default function Afastamentos() {
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [tipos, setTipos] = useState<TipoAfastamento[]>([]);
  const [status, setStatus] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [comDoc, setComDoc] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    api.get('/afastamentos/tipos').then(r => setTipos(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/afastamentos', {
      params: { status: status || undefined, tipo_id: tipoId || undefined, ano, page, limit },
    }).then(r => {
      let data = r.data.data;
      // Filtro local por documento
      if (comDoc === 'assinado') data = data.filter((a: Afastamento) => a.documento_assinado_url);
      else if (comDoc === 'pendente_doc') data = data.filter((a: Afastamento) => a.documento_gerado_url && !a.documento_assinado_url);
      else if (comDoc === 'sem_doc') data = data.filter((a: Afastamento) => !a.documento_gerado_url && !a.documento_assinado_url);
      setAfastamentos(data);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  }, [status, tipoId, ano, page, comDoc]);

  const pages = Math.ceil(total / limit);
  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-5">
      {/* Unidade fixa */}
      <div className="bg-pmam-blue text-white rounded-xl px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-pmam-gold font-semibold uppercase tracking-wide">Unidade</p>
          <p className="font-bold">Diretoria de Inativos da PMAM – DINATIV</p>
        </div>
        <Link to="/afastamentos/novo" className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
          <Plus size={15} /> Novo Afastamento
        </Link>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-pmam-blue">
          <Filter size={15} /> Filtros
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
            <option value="reprovado">Reprovado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select className="input" value={tipoId} onChange={e => { setTipoId(e.target.value); setPage(1); }}>
            <option value="">Todos os tipos</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <select className="input" value={ano} onChange={e => { setAno(e.target.value); setPage(1); }}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="input" value={comDoc} onChange={e => { setComDoc(e.target.value); setPage(1); }}>
            <option value="">Todos os documentos</option>
            <option value="assinado">✅ Com doc. assinado</option>
            <option value="pendente_doc">⏳ Gerado — aguardando assinatura</option>
            <option value="sem_doc">— Sem documento</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-pmam-blue text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Militar / Unidade</th>
                <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold">Início</th>
                <th className="text-left px-4 py-3 font-semibold">Fim</th>
                <th className="text-center px-4 py-3 font-semibold">Dias</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-center px-4 py-3 font-semibold"><Paperclip size={14} className="inline mr-1"/>Documento</th>
                <th className="text-center px-4 py-3 font-semibold">Ver</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              )}
              {!loading && afastamentos.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Nenhum afastamento encontrado</td></tr>
              )}
              {afastamentos.map((a, i) => (
                <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{a.militar_nome}</p>
                    <p className="text-xs text-gray-400">{a.posto_graduacao} · {a.unidade_sigla}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                    <p className="truncate text-xs">{a.tipo_nome}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {format(new Date(a.data_inicio.split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {format(new Date(a.data_fim.split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-pmam-blue">{a.dias_total}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      {a.documento_assinado_url && (
                        <a
                          href={a.documento_assinado_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Baixar documento assinado"
                          className="flex items-center gap-1 text-xs text-green-600 font-semibold hover:underline"
                        >
                          <Download size={12} /> Assinado
                        </a>
                      )}
                      {a.documento_gerado_url && !a.documento_assinado_url && (
                        <a
                          href={a.documento_gerado_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Baixar requerimento gerado"
                          className="flex items-center gap-1 text-xs text-amber-600 font-semibold hover:underline"
                        >
                          <FileText size={12} /> Gerado
                        </a>
                      )}
                      {!a.documento_gerado_url && !a.documento_assinado_url && (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/afastamentos/${a.id}`}
                      className="p-1.5 text-pmam-blue hover:bg-blue-50 rounded-lg transition-colors inline-block">
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Página {page} de {pages} · {total} registros</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
