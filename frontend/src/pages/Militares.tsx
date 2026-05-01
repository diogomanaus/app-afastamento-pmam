import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import type { Militar } from '../types';

export default function Militares() {
  const [militares, setMilitares] = useState<Militar[]>([]);
  const [q, setQ] = useState('');
  const [ativo, setAtivo] = useState('true');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    api.get('/militares', { params: { q, ativo, page, limit } })
      .then(r => { setMilitares(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [q, ativo, page]);

  async function toggleAtivo(m: Militar) {
    try {
      await api.patch(`/militares/${m.id}/ativo`, { ativo: !m.ativo });
      toast.success(`Militar ${!m.ativo ? 'ativado' : 'desativado'}`);
      setMilitares(prev => prev.map(x => x.id === m.id ? { ...x, ativo: !x.ativo } : x));
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      {/* Unidade fixa */}
      <div className="bg-pmam-blue text-white rounded-xl px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-pmam-gold font-semibold uppercase tracking-wide">Unidade</p>
          <p className="font-bold">Diretoria de Inativos da PMAM – DINATIV</p>
        </div>
        <p className="text-white/70 text-sm">{total} militar(es)</p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="input pl-9 w-full sm:w-72"
              placeholder="Buscar por nome, CPF ou matrícula..."
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <select className="input w-auto" value={ativo} onChange={e => { setAtivo(e.target.value); setPage(1); }}>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
        <Link to="/militares/novo" className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus size={16} /> Novo Militar
        </Link>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-pmam-blue text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Nome Completo</th>
                <th className="text-left px-4 py-3 font-semibold">Posto / Graduação</th>
                <th className="text-left px-4 py-3 font-semibold">CPF</th>
                <th className="text-left px-4 py-3 font-semibold">RG</th>
                <th className="text-left px-4 py-3 font-semibold">Matrícula</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-center px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              )}
              {!loading && militares.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum militar encontrado</td></tr>
              )}
              {militares.map((m, i) => (
                <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{m.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{m.posto_graduacao}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{m.cpf}</td>
                  <td className="px-4 py-3 text-gray-500">{m.rg ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.matricula ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link to={`/militares/${m.id}/editar`}
                        className="p-1.5 text-pmam-blue hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                        <Edit2 size={15} />
                      </Link>
                      <button onClick={() => toggleAtivo(m)}
                        className={`p-1.5 rounded-lg transition-colors ${m.ativo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={m.ativo ? 'Desativar' : 'Ativar'}>
                        {m.ativo ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </button>
                    </div>
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
